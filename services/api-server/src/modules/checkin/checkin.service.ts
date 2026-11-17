import argon2 from 'argon2';
import type { Pool } from 'pg';
import { CheckinOutcome, type CheckinResult } from './checkin.schemas.js';
import type { VaultService } from '../vault/vault.service.js';
import { broadcastAlert } from '../../ws/broadcaster.js';
import { createLogger } from '../../config/logger.js';
import { randomUUID } from 'node:crypto';

const log = createLogger('checkin-service');

export class CheckinService {
  constructor(
    private readonly db: Pool,
    private readonly vaultService: VaultService,
  ) {}

  /**
   * Verify the 3-Password Ordered Anti-Coercion inputs:
   *
   * 1. Load stored hashes (hash_pin, hash_pattern, hash_passphrase) and expected_order.
   * 2. Try each input against all 3 factor hashes.
   * 3. If any input fails to match or duplicate factor matched => INVALID_TYPO.
   * 4. If all 3 match AND matched order === expected_order => APPROVED_SAFE.
   * 5. If all 3 match AND matched order !== expected_order => SILENT_COERCION.
   *    Trigger identity unlock, create Priority-1 ALERT_COERCION, broadcast to panel.
   */
  async verifyCheckin(
    studentId: string,
    inputs: [string, string, string],
  ): Promise<CheckinResult> {
    const factorRes = await this.db.query<{
      hash_pin: string;
      hash_pattern: string;
      hash_passphrase: string;
      expected_order: number[];
    }>(
      'SELECT hash_pin, hash_pattern, hash_passphrase, expected_order FROM student_auth_factors WHERE student_id = $1',
      [studentId],
    );

    if (factorRes.rows.length === 0) {
      log.warn('No auth factors configured for student', { studentId });
      return { outcome: CheckinOutcome.INVALID_TYPO };
    }

    const { hash_pin, hash_pattern, hash_passphrase, expected_order } = factorRes.rows[0];

    // Determine the factor type for each input:
    // 0 = PIN, 1 = Pattern, 2 = Passphrase
    const matchedIndices: number[] = [];

    for (const input of inputs) {
      let matchedFactor = -1;

      // Try PIN
      try {
        if (await argon2.verify(hash_pin, input)) {
          matchedFactor = 0;
        }
      } catch {
        // ignore verify errors
      }

      // Try Pattern
      if (matchedFactor === -1) {
        try {
          if (await argon2.verify(hash_pattern, input)) {
            matchedFactor = 1;
          }
        } catch {
          // ignore
        }
      }

      // Try Passphrase
      if (matchedFactor === -1) {
        try {
          if (await argon2.verify(hash_passphrase, input)) {
            matchedFactor = 2;
          }
        } catch {
          // ignore
        }
      }

      if (matchedFactor === -1) {
        // Honest typo or unrecognized password
        log.info('Checkin rejected: invalid factor / typo', { studentId });
        return { outcome: CheckinOutcome.INVALID_TYPO };
      }

      matchedIndices.push(matchedFactor);
    }

    // Verify all 3 factors are distinct (e.g., student didn't enter PIN twice)
    if (new Set(matchedIndices).size !== 3) {
      log.info('Checkin rejected: duplicate factor types entered', { studentId });
      return { outcome: CheckinOutcome.INVALID_TYPO };
    }

    // Check whether the entered order matches expected_order
    const orderMatches =
      matchedIndices[0] === expected_order[0] &&
      matchedIndices[1] === expected_order[1] &&
      matchedIndices[2] === expected_order[2];

    if (orderMatches) {
      // Normal safe check-in: reset deadline
      await this.resetCheckinTimer(studentId);
      log.info('Checkin APPROVED_SAFE', { studentId });
      return { outcome: CheckinOutcome.APPROVED_SAFE };
    }

    // Coercion detected! All 3 passwords valid, but entered in WRONG ORDER.
    log.warn('CRITICAL: SILENT_COERCION triggered by wrong factor order', {
      studentId,
      enteredOrder: matchedIndices,
      expectedOrder: expected_order,
    });

    const alertId = await this.triggerCoercionAlert(studentId);
    return { outcome: CheckinOutcome.SILENT_COERCION, alertId };
  }

  /**
   * Reset the student's next checkin deadline.
   */
  async resetCheckinTimer(studentId: string): Promise<Date> {
    const res = await this.db.query<{ checkin_interval_hours: number }>(
      'SELECT checkin_interval_hours FROM students_vault WHERE student_id = $1',
      [studentId],
    );
    const hours = res.rows[0]?.checkin_interval_hours ?? 48;
    const nextDue = new Date(Date.now() + hours * 60 * 60 * 1000);

    await this.db.query(
      'UPDATE students_vault SET next_checkin_due = $1, updated_at = now() WHERE student_id = $2',
      [nextDue, studentId],
    );

    return nextDue;
  }

  /**
   * Handle silent coercion alert generation, identity unlock, and broadcasting.
   */
  private async triggerCoercionAlert(studentId: string): Promise<string> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 1. Check if there is an active trip for this student
      // If not, create an emergency trip container
      const encRef = await this.vaultService.encryptStudentRef(studentId);
      let tripToken: string = randomUUID();

      const existingTrip = await client.query<{ trip_token: string }>(
        `SELECT trip_token FROM active_trips
         WHERE status IN ('ACTIVE', 'GRACE_PERIOD')
         ORDER BY created_at DESC LIMIT 1`,
      );

      // Check if existing trip belongs to this student
      let foundExisting = false;
      for (const row of existingTrip.rows) {
        try {
          const tripRow = await client.query<{ encrypted_student_ref: Buffer }>(
            'SELECT encrypted_student_ref FROM active_trips WHERE trip_token = $1',
            [row.trip_token],
          );
          if (tripRow.rows.length > 0) {
            const decId = await this.vaultService.decryptStudentRef(tripRow.rows[0].encrypted_student_ref);
            if (decId === studentId) {
              tripToken = row.trip_token;
              foundExisting = true;
              break;
            }
          }
        } catch {
          // continue
        }
      }

      if (!foundExisting) {
        await client.query(
          `INSERT INTO active_trips (trip_token, encrypted_student_ref, status, alert_type)
           VALUES ($1, $2, 'ALERT_COERCION', 'COERCION')`,
          [tripToken, encRef],
        );
      } else {
        await client.query(
          `UPDATE active_trips SET status = 'ALERT_COERCION', alert_type = 'COERCION', updated_at = now()
           WHERE trip_token = $1`,
          [tripToken],
        );
      }

      // 2. Fetch student profile from vault
      const vaultRes = await client.query<{
        encrypted_profile: Buffer;
        university_email: string;
      }>(
        'SELECT encrypted_profile, university_email FROM students_vault WHERE student_id = $1',
        [studentId],
      );

      if (vaultRes.rows.length === 0) {
        throw new Error(`Student ${studentId} not found in vault`);
      }

      const profile = await this.vaultService.decryptProfile(vaultRes.rows[0].encrypted_profile);
      const unlockedProfile = {
        ...profile,
        studentId,
        universityEmail: vaultRes.rows[0].university_email,
      };

      // 3. Insert into unlock_audit_logs (immutable)
      await client.query(
        `INSERT INTO unlock_audit_logs (trip_token, student_id, trigger_reason, unlocked_by, details)
         VALUES ($1, $2, 'COERCION', 'SYSTEM', $3)`,
        [
          tripToken,
          studentId,
          JSON.stringify({
            reason: '3-Password factor wrong order entered',
            timestamp: new Date().toISOString(),
          }),
        ],
      );

      // 4. Create Priority-1 ALERT in alerts table
      const alertRes = await client.query<{ alert_id: string }>(
        `INSERT INTO alerts (
          trip_token, student_id, alert_type, priority, status, decrypted_profile
        ) VALUES ($1, $2, 'COERCION', 1, 'OPEN', $3)
        RETURNING alert_id`,
        [tripToken, studentId, JSON.stringify(unlockedProfile)],
      );

      const alertId = alertRes.rows[0].alert_id;

      await client.query('COMMIT');

      // 5. Broadcast to WebSocket
      broadcastAlert({
        alertId,
        tripToken,
        alertType: 'COERCION',
        priority: 1,
        status: 'OPEN',
        decryptedProfile: unlockedProfile as Record<string, unknown>,
        lastKnownCoords: null,
        nearestPolice: null,
        createdAt: new Date().toISOString(),
      });

      return alertId;
    } catch (err) {
      await client.query('ROLLBACK');
      log.error('Failed to trigger coercion alert', { error: (err as Error).message });
      throw err;
    } finally {
      client.release();
    }
  }
}
