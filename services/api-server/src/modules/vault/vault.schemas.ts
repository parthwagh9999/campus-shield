import { z } from 'zod';

// ─── Student Profile (the plaintext payload stored encrypted in students_vault) ───

export const StudentProfileSchema = z.object({
  fullName: z.string().min(1),
  photoUrl: z.string().url().optional(),
  dormBuilding: z.string().min(1).optional(),
  roomNumber: z.string().optional(),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        relationship: z.string().min(1),
      }),
    )
    .min(1),
  medicalNotes: z.string().optional(),
});

export type StudentProfile = z.infer<typeof StudentProfileSchema>;

// ─── Unlocked profile returned after identity reveal ───

export const UnlockedProfileSchema = StudentProfileSchema.extend({
  studentId: z.string().uuid(),
  universityEmail: z.string().email(),
});

export type UnlockedProfile = z.infer<typeof UnlockedProfileSchema>;

// ─── Audit log row (returned from GET /panel/audit-logs) ───

export const AuditLogSchema = z.object({
  id: z.number().int(),
  tripToken: z.string().uuid(),
  studentId: z.string().uuid().nullable(),
  triggerReason: z.enum([
    'SOS',
    'COERCION',
    'PERIMETER_BREACH',
    'MISSED_RETURN',
    'MISSED_CHECKIN',
    'LOW_BATTERY',
    'STAFF_OVERRIDE',
  ]),
  unlockedBy: z.string(),
  details: z.record(z.unknown()).nullable(),
  unlockedAt: z.string().datetime({ offset: true }),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// ─── Query params for audit-log listing ───

export const AuditLogQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .default('50')
    .transform(Number)
    .pipe(z.number().int().min(1).max(500)),
  offset: z
    .string()
    .optional()
    .default('0')
    .transform(Number)
    .pipe(z.number().int().min(0)),
  triggerReason: z
    .enum([
      'SOS',
      'COERCION',
      'PERIMETER_BREACH',
      'MISSED_RETURN',
      'MISSED_CHECKIN',
      'LOW_BATTERY',
      'STAFF_OVERRIDE',
    ])
    .optional(),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
