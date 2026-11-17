import { z } from 'zod';

// ---------------------------------------------------------------------------
// Nearest-police query params
// ---------------------------------------------------------------------------

export const nearestPoliceQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.5).max(50).optional().default(10),
});

export type NearestPoliceQuery = z.infer<typeof nearestPoliceQuerySchema>;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface PoliceStation {
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  phone?: string;
  address?: string;
}

export interface StudentProfile {
  name?: string;
  photo?: string;
  dorm?: string;
  emergencyContacts?: Array<{ name: string; phone: string; relation?: string }>;
  medicalNotes?: string;
  [key: string]: unknown;
}

export interface Alert {
  alertId: string;
  tripToken: string;
  studentId: string | null;
  alertType: string;
  priority: number;
  status: string;
  lastKnownCoords: { lat: number; lng: number } | null;
  nearestPolice: PoliceStation[] | null;
  createdAt: string;
}
