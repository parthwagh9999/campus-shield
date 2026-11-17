import type { FastifyInstance } from 'fastify';
import {
  startTripBodySchema,
  pingBodySchema,
  sosBodySchema,
  endTripBodySchema,
  resolveAlertBodySchema,
  resolveAlertParamsSchema,
} from './trips.schemas.js';
import type { TripsService } from './trips.service.js';
import { createLogger } from '../../config/logger.js';

const log = createLogger('trips-routes');

export async function tripsRoutes(
  app: FastifyInstance,
  opts: { tripsService: TripsService },
): Promise<void> {
  const { tripsService } = opts;

  // -------------------------------------------------------------
  // POST /api/v1/trips/start (Student)
  // -------------------------------------------------------------
  app.post(
    '/api/v1/trips/start',
    { preHandler: [app.studentAuth] },
    async (request, reply) => {
      const parsed = startTripBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const studentId = request.user.sub;
      try {
        const tripToken = await tripsService.startTrip(studentId, parsed.data);
        return reply.code(201).send({ tripToken });
      } catch (err) {
        log.error('Start trip error', { error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to start trip' });
      }
    },
  );

  // -------------------------------------------------------------
  // POST /api/v1/trips/ping (Student)
  // -------------------------------------------------------------
  app.post(
    '/api/v1/trips/ping',
    { preHandler: [app.studentAuth] },
    async (request, reply) => {
      const parsed = pingBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { tripToken, lat, lng, batteryPct, speed, heading, accuracy } = parsed.data;

      try {
        const result = await tripsService.recordPing(
          tripToken,
          lat,
          lng,
          batteryPct,
          speed,
          heading,
          accuracy,
        );
        return reply.code(200).send(result);
      } catch (err) {
        log.error('Record ping error', { tripToken, error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to record location ping' });
      }
    },
  );

  // -------------------------------------------------------------
  // POST /api/v1/trips/sos (Student)
  // -------------------------------------------------------------
  app.post(
    '/api/v1/trips/sos',
    { preHandler: [app.studentAuth] },
    async (request, reply) => {
      const parsed = sosBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { tripToken } = parsed.data;

      try {
        const alertId = await tripsService.triggerSOS(tripToken);
        return reply.code(200).send({ status: 'ALERT_DISPATCHED', alertId });
      } catch (err) {
        log.error('SOS trigger error', { tripToken, error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to trigger SOS' });
      }
    },
  );

  // -------------------------------------------------------------
  // POST /api/v1/trips/end (Student)
  // -------------------------------------------------------------
  app.post(
    '/api/v1/trips/end',
    { preHandler: [app.studentAuth] },
    async (request, reply) => {
      const parsed = endTripBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { tripToken } = parsed.data;

      try {
        await tripsService.endTrip(tripToken);
        return reply.code(200).send({ status: 'TRIP_ENDED' });
      } catch (err) {
        log.error('End trip error', { tripToken, error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to end trip' });
      }
    },
  );

  // -------------------------------------------------------------
  // GET /api/v1/panel/trips/active (Staff Only - Anonymized)
  // -------------------------------------------------------------
  app.get(
    '/api/v1/panel/trips/active',
    { preHandler: [app.staffAuth] },
    async (_request, reply) => {
      try {
        const trips = await tripsService.getActiveTripsAnonymized();
        return reply.code(200).send({ trips });
      } catch (err) {
        log.error('Get active trips error', { error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to fetch active trips' });
      }
    },
  );

  // -------------------------------------------------------------
  // GET /api/v1/panel/alerts (Staff Only)
  // -------------------------------------------------------------
  app.get(
    '/api/v1/panel/alerts',
    { preHandler: [app.staffAuth] },
    async (_request, reply) => {
      try {
        const alerts = await tripsService.getAlerts();
        return reply.code(200).send({ alerts });
      } catch (err) {
        log.error('Get alerts error', { error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to fetch alerts' });
      }
    },
  );

  // -------------------------------------------------------------
  // POST /api/v1/panel/alerts/:alertId/unseal (Staff Only - Password Gated)
  // -------------------------------------------------------------
  app.post(
    '/api/v1/panel/alerts/:alertId/unseal',
    { preHandler: [app.staffAuth] },
    async (request, reply) => {
      const { password } = (request.body as { password?: string }) || {};

      // Require valid staff password to decrypt/unseal the student profile
      if (!password || password !== 'CampusShield2026!') {
        return reply.code(401).send({ error: 'Invalid staff password. Identity unseal unauthorized.' });
      }

      return reply.code(200).send({
        status: 'UNSEALED',
        officer: request.user.email,
        unsealedAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------
  // GET /api/v1/panel/trips/:tripToken/path (Staff Only)
  // -------------------------------------------------------------
  app.get(
    '/api/v1/panel/trips/:tripToken/path',
    { preHandler: [app.staffAuth] },
    async (request, reply) => {
      const { tripToken } = request.params as { tripToken: string };
      if (!tripToken) {
        return reply.code(400).send({ error: 'Missing tripToken parameter' });
      }

      try {
        const pathData = await tripsService.getTripDayPath(tripToken);
        return reply.code(200).send({ path: pathData });
      } catch (err) {
        log.error('Get trip day path error', { tripToken, error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to retrieve trip trajectory path' });
      }
    },
  );

  // -------------------------------------------------------------
  // POST /api/v1/panel/alerts/:tripToken/resolve (Staff Only)
  // -------------------------------------------------------------
  app.post(
    '/api/v1/panel/alerts/:tripToken/resolve',
    { preHandler: [app.staffAuth] },
    async (request, reply) => {
      const paramsParsed = resolveAlertParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({ error: 'Invalid tripToken' });
      }

      const bodyParsed = resolveAlertBodySchema.safeParse(request.body);
      if (!bodyParsed.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: bodyParsed.error.flatten().fieldErrors,
        });
      }

      const { tripToken } = paramsParsed.data;
      const { resolutionNote } = bodyParsed.data;
      const staffId = request.user.sub;

      try {
        await tripsService.resolveAlert(tripToken, resolutionNote, staffId);
        return reply.code(200).send({ status: 'RESOLVED' });
      } catch (err) {
        log.error('Resolve alert error', { tripToken, error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to resolve alert' });
      }
    },
  );
}
