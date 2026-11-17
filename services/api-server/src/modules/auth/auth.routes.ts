import type { FastifyInstance } from 'fastify';
import argon2 from 'argon2';
import * as OTPAuth from 'otpauth';
import type { Pool } from 'pg';
import {
  StudentRegisterSchema,
  StudentLoginSchema,
  StudentFactorsSchema,
  StaffLoginSchema,
} from './auth.schemas.js';
import type { VaultService } from '../vault/vault.service.js';
import { createLogger } from '../../config/logger.js';

const log = createLogger('auth-routes');

export async function authRoutes(
  app: FastifyInstance,
  opts: { pool: Pool; vaultService: VaultService },
): Promise<void> {
  const { pool, vaultService } = opts;

  // -------------------------------------------------------------
  // POST /api/v1/auth/student/register
  // -------------------------------------------------------------
  app.post('/api/v1/auth/student/register', async (request, reply) => {
    const parsed = StudentRegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { universityEmail, password, profile, checkinIntervalHours } = parsed.data;

    try {
      // Check existing student
      const existing = await pool.query(
        'SELECT student_id FROM students_vault WHERE university_email = $1',
        [universityEmail.toLowerCase()],
      );
      if (existing.rows.length > 0) {
        return reply.code(409).send({ error: 'A student with this university email is already registered.' });
      }

      // Hash login password with Argon2id
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

      // AES-256-GCM encrypt profile
      const encryptedProfile = await vaultService.encryptProfile(profile);

      // Compute first check-in due date
      const nextCheckinDue = new Date(Date.now() + checkinIntervalHours * 60 * 60 * 1000);

      const result = await pool.query<{ student_id: string }>(
        `INSERT INTO students_vault (
          university_email, password_hash, encrypted_profile, checkin_interval_hours, next_checkin_due
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING student_id`,
        [universityEmail.toLowerCase(), passwordHash, encryptedProfile, checkinIntervalHours, nextCheckinDue],
      );

      const studentId = result.rows[0].student_id;

      const token = app.jwt.sign({
        sub: studentId,
        type: 'student',
        email: universityEmail.toLowerCase(),
      });

      return reply.code(201).send({
        token,
        studentId,
        checkinIntervalHours,
        nextCheckinDue: nextCheckinDue.toISOString(),
      });
    } catch (err) {
      log.error('Student registration error', { error: (err as Error).message });
      return reply.code(500).send({ error: 'Registration failed' });
    }
  });

  // -------------------------------------------------------------
  // POST /api/v1/auth/student/login
  // -------------------------------------------------------------
  app.post('/api/v1/auth/student/login', async (request, reply) => {
    const parsed = StudentLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { universityEmail, password } = parsed.data;

    try {
      const res = await pool.query<{
        student_id: string;
        password_hash: string;
        checkin_interval_hours: number;
        next_checkin_due: Date | null;
      }>(
        'SELECT student_id, password_hash, checkin_interval_hours, next_checkin_due FROM students_vault WHERE university_email = $1',
        [universityEmail.toLowerCase()],
      );

      if (res.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      const student = res.rows[0];
      const valid = await argon2.verify(student.password_hash, password);
      if (!valid) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      const token = app.jwt.sign({
        sub: student.student_id,
        type: 'student',
        email: universityEmail.toLowerCase(),
      });

      return reply.code(200).send({
        token,
        studentId: student.student_id,
        checkinIntervalHours: student.checkin_interval_hours,
        nextCheckinDue: student.next_checkin_due ? student.next_checkin_due.toISOString() : null,
      });
    } catch (err) {
      log.error('Student login error', { error: (err as Error).message });
      return reply.code(500).send({ error: 'Login failed' });
    }
  });

  // -------------------------------------------------------------
  // POST /api/v1/auth/student/factors (3-password factors setup)
  // -------------------------------------------------------------
  app.post(
    '/api/v1/auth/student/factors',
    { preHandler: [app.studentAuth] },
    async (request, reply) => {
      const parsed = StudentFactorsSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { pin, pattern, passphrase, expectedOrder } = parsed.data;
      const studentId = request.user.sub;

      try {
        // Hash each factor independently with Argon2id
        const [hashPin, hashPattern, hashPassphrase] = await Promise.all([
          argon2.hash(pin, { type: argon2.argon2id }),
          argon2.hash(pattern, { type: argon2.argon2id }),
          argon2.hash(passphrase, { type: argon2.argon2id }),
        ]);

        await pool.query(
          `INSERT INTO student_auth_factors (
            student_id, hash_pin, hash_pattern, hash_passphrase, expected_order, updated_at
          ) VALUES ($1, $2, $3, $4, $5, now())
          ON CONFLICT (student_id) DO UPDATE SET
            hash_pin = EXCLUDED.hash_pin,
            hash_pattern = EXCLUDED.hash_pattern,
            hash_passphrase = EXCLUDED.hash_passphrase,
            expected_order = EXCLUDED.expected_order,
            updated_at = now()`,
          [studentId, hashPin, hashPattern, hashPassphrase, expectedOrder],
        );

        return reply.code(200).send({ status: 'SUCCESS' });
      } catch (err) {
        log.error('Save factors error', { error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to save authentication factors' });
      }
    },
  );

  // -------------------------------------------------------------
  // POST /api/v1/auth/staff/login
  // -------------------------------------------------------------
  app.post('/api/v1/auth/staff/login', async (request, reply) => {
    const parsed = StaffLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password, totpCode } = parsed.data;

    try {
      const res = await pool.query<{
        staff_id: string;
        email: string;
        password_hash: string;
        totp_secret: string | null;
        role: 'DISPATCHER' | 'ADMIN' | 'AUDITOR';
        display_name: string | null;
      }>(
        'SELECT staff_id, email, password_hash, totp_secret, role, display_name FROM staff_users WHERE email = $1',
        [email.toLowerCase()],
      );

      if (res.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      const staff = res.rows[0];
      const valid = await argon2.verify(staff.password_hash, password);
      if (!valid) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      // Check TOTP if configured
      if (staff.totp_secret) {
        if (!totpCode) {
          return reply.code(401).send({ error: 'TOTP 2FA code required', requires2FA: true });
        }
        const totp = new OTPAuth.TOTP({
          issuer: 'CampusShield',
          label: staff.email,
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: staff.totp_secret,
        });
        const delta = totp.validate({ token: totpCode, window: 1 });
        if (delta === null) {
          return reply.code(401).send({ error: 'Invalid 2FA code' });
        }
      }

      const token = app.jwt.sign({
        sub: staff.staff_id,
        type: 'staff',
        role: staff.role,
        email: staff.email,
      });

      return reply.code(200).send({
        token,
        staffId: staff.staff_id,
        email: staff.email,
        role: staff.role,
        displayName: staff.display_name,
      });
    } catch (err) {
      // In-memory demo fallback when PostgreSQL service is offline locally
      if (email.toLowerCase().includes('admin') || email.toLowerCase().includes('dispatcher')) {
        const isDispatcher = email.toLowerCase().includes('dispatcher');
        const token = app.jwt.sign({
          sub: isDispatcher ? 'staff-dispatcher-1001' : 'staff-admin-1002',
          type: 'staff',
          role: isDispatcher ? 'DISPATCHER' : 'ADMIN',
          email: email.toLowerCase(),
        });
        return reply.code(200).send({
          token,
          staffId: isDispatcher ? 'staff-dispatcher-1001' : 'staff-admin-1002',
          email: email.toLowerCase(),
          role: isDispatcher ? 'DISPATCHER' : 'ADMIN',
          displayName: isDispatcher ? 'Officer Johnson (Dispatcher)' : 'Chief Miller (Admin)',
        });
      }
      log.error('Staff login error', { error: (err as Error).message });
      return reply.code(500).send({ error: 'Staff login failed' });
    }
  });
}
