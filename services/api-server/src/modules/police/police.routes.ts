import type { FastifyInstance } from 'fastify';
import { nearestPoliceQuerySchema } from './police.schemas.js';
import { findNearestPoliceStation } from './police.service.js';
import { createLogger } from '../../config/logger.js';

const log = createLogger('police-routes');

/**
 * Register police-related routes.
 *
 * All routes in this module are staff-only and require a valid staff JWT
 * supplied via the `staffAuth` pre-handler (must be registered on the
 * Fastify instance before this plugin is loaded).
 */
export async function policeRoutes(app: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // GET /api/v1/panel/police/nearest?lat=X&lng=Y&radiusKm=Z
  // -----------------------------------------------------------------------
  app.get(
    '/api/v1/panel/police/nearest',
    {
      preHandler: [app.staffAuth],
    },
    async (request, reply) => {
      const parsed = nearestPoliceQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { lat, lng, radiusKm } = parsed.data;

      try {
        const stations = await findNearestPoliceStation(lat, lng, radiusKm);
        return reply.send({ stations });
      } catch (err) {
        log.error('Failed to fetch nearest police stations', {
          lat,
          lng,
          error: (err as Error).message,
        });
        return reply.status(502).send({
          error: 'Failed to query Overpass API',
          message: (err as Error).message,
        });
      }
    },
  );
}
