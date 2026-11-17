import { z } from 'zod';
import { StudentProfileSchema } from '../vault/vault.schemas.js';

export const CreateStudentSchema = z.object({
  universityEmail: z.string().email(),
  password: z.string().min(8).optional().default('TempPass2026!'),
  profile: StudentProfileSchema,
  checkinIntervalHours: z.number().int().min(12).max(168).default(48),
});

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;

export const UpdateStudentSchema = z.object({
  universityEmail: z.string().email().optional(),
  profile: StudentProfileSchema.partial().optional(),
  checkinIntervalHours: z.number().int().min(12).max(168).optional(),
});

export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;

export const ListStudentsQuerySchema = z.object({
  search: z.string().optional(),
  dorm: z.string().optional(),
  status: z.enum(['ALL', 'SAFE', 'OVERDUE', 'ACTIVE_TRIP']).optional().default('ALL'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListStudentsQuery = z.infer<typeof ListStudentsQuerySchema>;

export const BulkImportStudentsSchema = z.object({
  students: z.array(CreateStudentSchema).min(1).max(500),
});

export type BulkImportStudentsInput = z.infer<typeof BulkImportStudentsSchema>;

export interface StudentListItem {
  studentId: string;
  universityEmail: string;
  fullName: string;
  dormBuilding?: string;
  roomNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalNotes?: string;
  checkinIntervalHours: number;
  nextCheckinDue: string | null;
  status: 'SAFE' | 'OVERDUE' | 'ACTIVE_TRIP';
  factorsConfigured: boolean;
  createdAt: string;
}
