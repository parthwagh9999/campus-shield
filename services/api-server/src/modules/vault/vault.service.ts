import crypto from 'node:crypto';
import type { Pool } from 'pg';
import type { StudentProfile, UnlockedProfile } from './vault.schemas.js';

// ─── Constants ───
const AES_ALGORITHM = 'aes-256-gcm' as const;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

/**
 * Identity Vault service.
 *
 * All student PII is stored encrypted at rest using AES-256-GCM.
 * Decryption (identity "unlock") is an audited, irreversible action
 * that writes to the immutable `unlock_audit_logs` table.
 */
export class VaultService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly db: Pool) {
    const hex = process.env.VAULT_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
      throw new Error(
        'VAULT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
    }
    this.encryptionKey = Buffer.from(hex, 'hex');
  }

  // ────────────────────────────────────────────────────────────
  //  Low-level AES-256-GCM helpers
  // ────────────────────────────────────────────────────────────

  /**
   * Encrypt an arbitrary buffer of plaintext.
   * Returns a single Buffer: [IV (12 B) | authTag (16 B) | ciphertext].
   */
  private encrypt(plaintext: Buffer): Buffer {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(AES_ALGORITHM, this.encryptionKey, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag(); // 16 bytes by default for GCM

    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt a buffer previously produced by {@link encrypt}.
   * Throws if the auth tag verification fails (tampered data).
   */
  private decrypt(packed: Buffer): Buffer {
    if (packed.length < IV_BYTES + AUTH_TAG_BYTES) {
      throw new Error('Encrypted payload too short — expected at least 28 bytes (iv + authTag).');
    }

    const iv = packed.subarray(0, IV_BYTES);
    const authTag = packed.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
    const ciphertext = packed.subarray(IV_BYTES + AUTH_TAG_BYTES);

    const decipher = crypto.createDecipheriv(AES_ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  // ────────────────────────────────────────────────────────────
  //  Public API — Profile encryption
  // ────────────────────────────────────────────────────────────

  /**
   * AES-256-GCM encrypt a JSON student profile.
   * Returns iv + authTag + ciphertext as a single Buffer.
   */
  async encryptProfile(profile: StudentProfile): Promise<Buffer> {
    const plaintext = Buffer.from(JSON.stringify(profile), 'utf-8');
    return this.encrypt(plaintext);
  }

  /**
   * Decrypt and JSON-parse an encrypted profile buffer.
   * Verifies the GCM auth tag before returning.
   */
  async decryptProfile(encrypted: Buffer): Promise<StudentProfile> {
    const plaintext = this.decrypt(encrypted);
    return JSON.parse(plaintext.toString('utf-8')) as StudentProfile;
  }

  // ────────────────────────────────────────────────────────────
  //  Public API — Student-ref encryption (for active_trips)
  // ────────────────────────────────────────────────────────────

  /**
   * Encrypt a student_id UUID for anonymous storage in `active_trips.encrypted_student_ref`.
   */
  async encryptStudentRef(studentId: string): Promise<Buffer> {
    return this.encrypt(Buffer.from(studentId, 'utf-8'));
  }

  /**
   * Decrypt `active_trips.encrypted_student_ref` back to a student_id UUID string.
   */
  async decryptStudentRef(encrypted: Buffer): Promise<string> {
    return this.decrypt(encrypted).toString('utf-8');
  }

  // ────────────────────────────────────────────────────────────
  //  Public API — Identity unlock (audited)
  // ────────────────────────────────────────────────────────────

  /**
   * Perform a full identity unlock:
   *
   * 1. Read `encrypted_student_ref` from `active_trips` for the given trip token.
   * 2. Decrypt it to obtain `student_id`.
   * 3. Read `encrypted_profile` and `university_email` from `students_vault`.
   * 4. Decrypt the profile.
   * 5. Write an immutable row to `unlock_audit_logs`.
   * 6. Update the matching alert in `alerts` with the decrypted profile & student_id.
   * 7. Return the full unlocked profile.
   *
   * All database operations run inside a single transaction.
   */
  async unlockIdentity(
    tripToken: string,
    triggerReason: string,
    unlockedBy: string,
  ): Promise<UnlockedProfile> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // 1. Fetch encrypted student ref from active_trips
      const tripRow = await client.query<{ encrypted_student_ref: Buffer }>(
        'SELECT encrypted_student_ref FROM active_trips WHERE trip_token = $1',
        [tripToken],
      );

      if (tripRow.rows.length === 0) {
        throw new Error(`Active trip not found for token ${tripToken}`);
      }

      // 2. Decrypt student_id
      const studentId = await this.decryptStudentRef(tripRow.rows[0].encrypted_student_ref);

      // 3. Fetch encrypted profile + email from vault
      const vaultRow = await client.query<{
        encrypted_profile: Buffer;
        university_email: string;
      }>(
        'SELECT encrypted_profile, university_email FROM students_vault WHERE student_id = $1',
        [studentId],
      );

      if (vaultRow.rows.length === 0) {
        throw new Error(`Student not found in vault for id ${studentId}`);
      }

      // 4. Decrypt profile
      const profile = await this.decryptProfile(vaultRow.rows[0].encrypted_profile);

      const unlockedProfile: UnlockedProfile = {
        ...profile,
        studentId,
        universityEmail: vaultRow.rows[0].university_email,
      };

      // 5. Write immutable audit log
      await client.query(
        `INSERT INTO unlock_audit_logs (trip_token, student_id, trigger_reason, unlocked_by, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          tripToken,
          studentId,
          triggerReason,
          unlockedBy,
          JSON.stringify({
            universityEmail: unlockedProfile.universityEmail,
            timestamp: new Date().toISOString(),
          }),
        ],
      );

      // 6. Update alerts with decrypted profile
      await client.query(
        `UPDATE alerts
         SET student_id = $1,
             decrypted_profile = $2,
             status = CASE WHEN status = 'OPEN' THEN 'ACKNOWLEDGED' ELSE status END
         WHERE trip_token = $3
           AND student_id IS NULL`,
        [studentId, JSON.stringify(unlockedProfile), tripToken],
      );

      await client.query('COMMIT');

      return unlockedProfile;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ────────────────────────────────────────────────────────────
  //  Audit log queries
  // ────────────────────────────────────────────────────────────

  /**
   * Retrieve audit logs with optional filtering by trigger_reason.
   */
  async getAuditLogs(opts: {
    limit: number;
    offset: number;
    triggerReason?: string;
  }): Promise<{
    logs: Array<{
      id: number;
      tripToken: string;
      studentId: string | null;
      triggerReason: string;
      unlockedBy: string;
      details: Record<string, unknown> | null;
      unlockedAt: string;
    }>;
    total: number;
  }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (opts.triggerReason) {
      conditions.push(`trigger_reason = $${paramIdx++}`);
      params.push(opts.triggerReason);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [logsResult, countResult] = await Promise.all([
      this.db.query(
        `SELECT id, trip_token, student_id, trigger_reason, unlocked_by, details, unlocked_at
         FROM unlock_audit_logs
         ${whereClause}
         ORDER BY unlocked_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        [...params, opts.limit, opts.offset],
      ),
      this.db.query(
        `SELECT COUNT(*)::int AS total FROM unlock_audit_logs ${whereClause}`,
        params,
      ),
    ]);

    return {
      logs: logsResult.rows.map((row: Record<string, unknown>) => ({
        id: row.id as number,
        tripToken: row.trip_token as string,
        studentId: (row.student_id as string) ?? null,
        triggerReason: row.trigger_reason as string,
        unlockedBy: row.unlocked_by as string,
        details: (row.details as Record<string, unknown>) ?? null,
        unlockedAt: (row.unlocked_at as Date).toISOString(),
      })),
      total: countResult.rows[0].total as number,
    };
  }
}
