import { Worker, type Job } from 'bullmq';
import type { Pool } from 'pg';
import { redis } from '../../db/redis.js';
import type { VaultService } from '../vault/vault.service.js';
import { broadcastAlert } from '../../ws/broadcaster.js';
import { createLogger } from '../../config/logger.js';
import { randomUUID } from 'node:crypto';

const log = createLogger('checkin-worker');

export function initCheckinWorker(db: Pool, vaultService: VaultService): Worker | null {
  try {
    const worker = new Worker(
      'checkin-queue',
      async (job: Job) => {
        log.info('Processing checkin job', { jobName: job.name, data: job.data });

        if (job.name === 'checkin-reminder') {
          const { studentId, reminderType } = job.data as { studentId: string; reminderType: string };
          // Check if student still needs to check in
          const res = await db.query<{ next_checkin_due: Date }>(
            'SELECT next_checkin_due FROM students_vault WHERE student_id = $1',
            [studentId],
          );
          if (res.rows.length > 0 && res.rows[0].next_checkin_due > new Date()) {
            log.info(`Sending ${reminderType} reminder to student`, { studentId });
            // In production, dispatch push notification via APNs / FCM / Expo
          }
        }

        if (job.name === 'missed-checkin') {
          const { studentId } = job.data as { studentId: string };
          const res = await db.query<{ next_checkin_due: Date; university_email: string; encrypted_profile: Buffer }>(
            'SELECT next_checkin_due, university_email, encrypted_profile FROM students_vault WHERE student_id = $1',
            [studentId],
          );

          if (res.rows.length > 0 && res.rows[0].next_checkin_due <= new Date()) {
            log.warn('Student missed checkin deadline! Escalating to Welfare Check', { studentId });

            const client = await db.connect();
            try {
              await client.query('BEGIN');

              const profile = await vaultService.decryptProfile(res.rows[0].encrypted_profile);
              const unlocked = {
                ...profile,
                studentId,
                universityEmail: res.rows[0].university_email,
              };

              const tripToken = randomUUID();
              const encRef = await vaultService.encryptStudentRef(studentId);

              await client.query(
                `INSERT INTO active_trips (trip_token, encrypted_student_ref, status, alert_type)
                 VALUES ($1, $2, 'ALERT_MISSED_CHECKIN', 'MISSED_CHECKIN')`,
                [tripToken, encRef],
              );

              await client.query(
                `INSERT INTO unlock_audit_logs (trip_token, student_id, trigger_reason, unlocked_by, details)
                 VALUES ($1, $2, 'MISSED_CHECKIN', 'SYSTEM', $3)`,
                [
                  tripToken,
                  studentId,
                  JSON.stringify({
                    reason: 'Periodic check-in missed deadline',
                    missedAt: new Date().toISOString(),
                  }),
                ],
              );

              const alertRes = await client.query<{ alert_id: string }>(
                `INSERT INTO alerts (trip_token, student_id, alert_type, priority, status, decrypted_profile)
                 VALUES ($1, $2, 'MISSED_CHECKIN', 2, 'OPEN', $3)
                 RETURNING alert_id`,
                [tripToken, studentId, JSON.stringify(unlocked)],
              );

              await client.query('COMMIT');

              broadcastAlert({
                alertId: alertRes.rows[0].alert_id,
                tripToken,
                alertType: 'MISSED_CHECKIN',
                priority: 2,
                status: 'OPEN',
                decryptedProfile: unlocked as Record<string, unknown>,
                lastKnownCoords: null,
                nearestPolice: null,
                createdAt: new Date().toISOString(),
              });
            } catch (err) {
              await client.query('ROLLBACK');
              throw err;
            } finally {
              client.release();
            }
          }
        }
      },
      { connection: redis },
    );

    worker.on('failed', (job, err) => {
      log.error('Checkin worker job failed', { jobId: job?.id, error: err.message });
    });

    return worker;
  } catch (err) {
    log.warn('Could not initialize BullMQ checkin worker (Redis may be offline)', {
      error: (err as Error).message,
    });
    return null;
  }
}
