import { Worker, type Job } from 'bullmq';
import type { Pool } from 'pg';
import { redis } from '../../db/redis.js';
import type { VaultService } from '../vault/vault.service.js';
import { broadcastAlert } from '../../ws/broadcaster.js';
import { createLogger } from '../../config/logger.js';

const log = createLogger('trips-worker');

export function initTripsWorker(db: Pool, vaultService: VaultService): Worker | null {
  try {
    const worker = new Worker(
      'trips-queue',
      async (job: Job) => {
        log.info('Processing trip job', { jobName: job.name, data: job.data });

        if (job.name === 'grace-expired') {
          const { tripToken, alertType } = job.data as { tripToken: string; alertType: string };

          // Check if trip is still in GRACE_PERIOD
          const tripRes = await db.query<{ status: string }>(
            'SELECT status FROM active_trips WHERE trip_token = $1',
            [tripToken],
          );

          if (tripRes.rows.length > 0 && tripRes.rows[0].status === 'GRACE_PERIOD') {
            log.warn('Grace period expired unconfirmed! Escalating to full alert', { tripToken });

            const finalStatus =
              alertType === 'PERIMETER_BREACH' ? 'ALERT_PERIMETER_BREACH' : 'ALERT_MISSED_RETURN';

            await db.query(
              `UPDATE active_trips SET status = $1, updated_at = now() WHERE trip_token = $2`,
              [finalStatus, tripToken],
            );

            // Create alert record
            const alertRes = await db.query<{ alert_id: string }>(
              `INSERT INTO alerts (trip_token, alert_type, priority, status)
               VALUES ($1, $2, 2, 'OPEN')
               RETURNING alert_id`,
              [tripToken, alertType],
            );

            // Unlock student identity
            const unlocked = await vaultService.unlockIdentity(tripToken, alertType, 'SYSTEM');

            broadcastAlert({
              alertId: alertRes.rows[0].alert_id,
              tripToken,
              alertType,
              priority: 2,
              status: 'OPEN',
              decryptedProfile: unlocked as Record<string, unknown>,
              lastKnownCoords: null,
              nearestPolice: null,
              createdAt: new Date().toISOString(),
            });
          }
        }

        if (job.name === 'return-deadline') {
          const { tripToken } = job.data as { tripToken: string };

          const tripRes = await db.query<{ status: string }>(
            'SELECT status FROM active_trips WHERE trip_token = $1',
            [tripToken],
          );

          if (tripRes.rows.length > 0 && tripRes.rows[0].status === 'ACTIVE') {
            log.warn('Return deadline reached, entering 60s grace period', { tripToken });

            await db.query(
              `UPDATE active_trips
               SET status = 'GRACE_PERIOD',
                   alert_type = 'MISSED_RETURN',
                   grace_expires_at = now() + INTERVAL '60 seconds',
                   updated_at = now()
               WHERE trip_token = $1`,
              [tripToken],
            );
          }
        }
      },
      { connection: redis },
    );

    worker.on('failed', (job, err) => {
      log.error('Trips worker job failed', { jobId: job?.id, error: err.message });
    });

    return worker;
  } catch (err) {
    log.warn('Could not initialize BullMQ trips worker (Redis may be offline)', {
      error: (err as Error).message,
    });
    return null;
  }
}
