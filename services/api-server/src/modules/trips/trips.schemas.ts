import { z } from 'zod';

// ---------------------------------------------------------------------------
// GeoJSON primitives
// ---------------------------------------------------------------------------

/** A GeoJSON Position: [longitude, latitude] */
const positionSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

/**
 * Linear ring – at least 4 positions where the first and last are identical.
 * Validated structurally; winding order is left to PostGIS.
 */
const linearRingSchema = z
  .array(positionSchema)
  .min(4)
  .refine(
    (ring) => {
      const first = ring[0];
      const last = ring[ring.length - 1];
      return first[0] === last[0] && first[1] === last[1];
    },
    { message: 'A polygon ring must be closed (first position === last position)' },
  );

/** GeoJSON Polygon */
export const geoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(linearRingSchema).min(1),
});

/** GeoJSON Point */
export const geoJsonPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: positionSchema,
});

// ---------------------------------------------------------------------------
// Trip route bodies
// ---------------------------------------------------------------------------

export const startTripBodySchema = z.object({
  perimeter: geoJsonPolygonSchema,
  destination: geoJsonPointSchema,
  returnDeadline: z
    .string()
    .datetime({ message: 'returnDeadline must be a valid ISO-8601 datetime string' })
    .refine((d) => new Date(d).getTime() > Date.now(), {
      message: 'returnDeadline must be in the future',
    }),
});

export const pingBodySchema = z.object({
  tripToken: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  batteryPct: z.number().int().min(0).max(100),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().min(0).optional(),
});

export const sosBodySchema = z.object({
  tripToken: z.string().uuid(),
});

export const endTripBodySchema = z.object({
  tripToken: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Staff panel
// ---------------------------------------------------------------------------

export const resolveAlertBodySchema = z.object({
  resolutionNote: z.string().min(1).max(2000),
});

export const resolveAlertParamsSchema = z.object({
  tripToken: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Response types (inferred)
// ---------------------------------------------------------------------------

export type StartTripBody = z.infer<typeof startTripBodySchema>;
export type PingBody = z.infer<typeof pingBodySchema>;
export type SOSBody = z.infer<typeof sosBodySchema>;
export type EndTripBody = z.infer<typeof endTripBodySchema>;
export type ResolveAlertBody = z.infer<typeof resolveAlertBodySchema>;
export type ResolveAlertParams = z.infer<typeof resolveAlertParamsSchema>;

// ---------------------------------------------------------------------------
// Shared domain types
// ---------------------------------------------------------------------------

export interface PingResult {
  insidePerimeter: boolean;
  tripStatus: string;
}

export interface AnonymizedTrip {
  tripToken: string;
  lat: number;
  lng: number;
  status: string;
  batteryPct: number | null;
  updatedAt: string;
}

export interface AlertRow {
  alertId: string;
  tripToken: string;
  studentId: string | null;
  alertType: string;
  priority: number;
  status: string;
  decryptedProfile: Record<string, unknown> | null;
  lastKnownCoords: { lat: number; lng: number } | null;
  nearestPolice: Record<string, unknown>[] | null;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}
