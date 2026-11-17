import type { FastifyInstance } from 'fastify';
import { CheckinVerifyBodySchema, CheckinOutcome } from './checkin.schemas.js';
import type { CheckinService } from './checkin.service.js';
import { createLogger } from '../../config/logger.js';

const log = createLogger('checkin-routes');

export async function checkinRoutes(
  app: FastifyInstance,
  opts: { checkinService: CheckinService },
): Promise<void> {
  const { checkinService } = opts;

  // -------------------------------------------------------------
  // POST /api/v1/checkin/verify
  // -------------------------------------------------------------
  app.post(
    '/api/v1/checkin/verify',
    { preHandler: [app.studentAuth] },
    async (request, reply) => {
      const parsed = CheckinVerifyBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { inputs } = parsed.data;
      const studentId = request.user.sub;

      try {
        const result = await checkinService.verifyCheckin(studentId, inputs);

        if (result.outcome === CheckinOutcome.INVALID_TYPO) {
          // Typo or wrong credentials — return 401 so student can retry
          return reply.code(401).send({ error: 'Wrong password, please try again' });
        }

        // Both APPROVED_SAFE and SILENT_COERCION return HTTP 200 with { status: "APPROVED" }
        // This is zero-leakage by design so an attacker watching the screen sees "Approved"
        return reply.code(200).send({ status: 'APPROVED' });
      } catch (err) {
        log.error('Checkin verify error', { studentId, error: (err as Error).message });
        return reply.code(500).send({ error: 'Check-in verification failed' });
      }
    },
  );
}
