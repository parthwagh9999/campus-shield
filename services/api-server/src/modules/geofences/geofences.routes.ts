import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

export interface CampusGeofence {
  id: string;
  name: string;
  category: 'CAMPUS_PERIMETER' | 'SAFE_CORRIDOR' | 'DORM_QUAD' | 'HIGH_ALERT_ZONE';
  color: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  description: string;
  active: boolean;
  alertOnExit: boolean;
}

const mockGeofences: CampusGeofence[] = [
  {
    id: 'gf-01',
    name: 'UCR Main Campus Boundary',
    category: 'CAMPUS_PERIMETER',
    color: '#003B5C',
    centerLat: 33.9737,
    centerLng: -117.3281,
    radiusMeters: 1750,
    description: 'UC Riverside campus property perimeter monitored 24/7 by UCPD dispatch.',
    active: true,
    alertOnExit: false,
  },
  {
    id: 'gf-02',
    name: 'Highlander HUB & Bell Tower Safe Walk Corridor',
    category: 'SAFE_CORRIDOR',
    color: '#FFB81C',
    centerLat: 33.9733,
    centerLng: -117.3280,
    radiusMeters: 550,
    description: 'High-density blue-light phone corridor spanning Highlander Union Building, Rivera Library, and the Bell Tower.',
    active: true,
    alertOnExit: false,
  },
  {
    id: 'gf-03',
    name: 'Aberdeen-Inverness, Dundee & Lothian Dorm Quad',
    category: 'DORM_QUAD',
    color: '#8b5cf6',
    centerLat: 33.9715,
    centerLng: -117.3225,
    radiusMeters: 750,
    description: 'Highlander student housing perimeter with resident advisors and safety patrols.',
    active: true,
    alertOnExit: false,
  },
  {
    id: 'gf-04',
    name: 'University Village & Canyon Crest Commercial District',
    category: 'SAFE_CORRIDOR',
    color: '#10b981',
    centerLat: 33.9765,
    centerLng: -117.3395,
    radiusMeters: 1100,
    description: 'UV student shopping plaza, movie theatre, and campus bus transit center.',
    active: true,
    alertOnExit: false,
  },
];

const CreateGeofenceSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['CAMPUS_PERIMETER', 'SAFE_CORRIDOR', 'DORM_QUAD', 'HIGH_ALERT_ZONE']),
  color: z.string().default('#3b82f6'),
  centerLat: z.number(),
  centerLng: z.number(),
  radiusMeters: z.number().positive(),
  description: z.string().default(''),
  alertOnExit: z.boolean().default(false),
});

export async function geofencesRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/panel/geofences
  app.get('/api/v1/panel/geofences', { preHandler: [app.staffAuth] }, async () => {
    return { geofences: mockGeofences };
  });

  // POST /api/v1/panel/geofences
  app.post('/api/v1/panel/geofences', { preHandler: [app.staffAuth] }, async (request, reply) => {
    const parsed = CreateGeofenceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation failed', details: parsed.error.format() });
    }

    const newGeofence: CampusGeofence = {
      id: `gf-${randomUUID().slice(0, 8)}`,
      ...parsed.data,
      active: true,
    };
    mockGeofences.push(newGeofence);
    return reply.code(201).send({ geofence: newGeofence });
  });

  // DELETE /api/v1/panel/geofences/:id
  app.delete('/api/v1/panel/geofences/:id', { preHandler: [app.staffAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const index = mockGeofences.findIndex((g) => g.id === id);
    if (index !== -1) {
      mockGeofences.splice(index, 1);
    }
    return reply.code(200).send({ status: 'DELETED' });
  });
}
