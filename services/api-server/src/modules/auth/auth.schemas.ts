import { z } from 'zod';
import { StudentProfileSchema } from '../vault/vault.schemas.js';

export const StudentRegisterSchema = z.object({
  universityEmail: z.string().email().endsWith('.edu', { message: 'Must be a valid university email' }).or(z.string().email()),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }).optional().default('SecureHighlander2026!'),
  profile: StudentProfileSchema,
  checkinIntervalHours: z.number().int().min(12).max(168).default(48),
});

export type StudentRegisterInput = z.infer<typeof StudentRegisterSchema>;

export const StudentLoginSchema = z.object({
  universityEmail: z.string().email(),
  password: z.string(),
});

export type StudentLoginInput = z.infer<typeof StudentLoginSchema>;

export const StudentFactorsSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 numeric digits' }),
  pattern: z.string().min(3, { message: 'Pattern must have at least 3 nodes' }),
  passphrase: z.string().min(4, { message: 'Passphrase must be at least 4 characters' }),
  expectedOrder: z
    .tuple([z.number().int().min(0).max(2), z.number().int().min(0).max(2), z.number().int().min(0).max(2)])
    .refine(
      (arr) => new Set(arr).size === 3,
      { message: 'expectedOrder must contain unique indices 0, 1, and 2' }
    ),
});

export type StudentFactorsInput = z.infer<typeof StudentFactorsSchema>;

export const StaffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpCode: z.string().optional(),
});

export type StaffLoginInput = z.infer<typeof StaffLoginSchema>;
