import { z } from 'zod';

// ─── Check-in verification request body ───

export const CheckinVerifyBodySchema = z.object({
  inputs: z
    .tuple([z.string().min(1), z.string().min(1), z.string().min(1)])
    .describe(
      'Ordered triple of authentication factors: each element is the raw PIN, pattern, or passphrase the student entered.',
    ),
});

export type CheckinVerifyBody = z.infer<typeof CheckinVerifyBodySchema>;

// ─── Check-in verification result (internal, never sent raw to client) ───

export enum CheckinOutcome {
  /** All factors matched and ordering is correct — the student is safe. */
  APPROVED_SAFE = 'APPROVED_SAFE',

  /** All factors matched but ordering is wrong — coercion detected, silent escalation. */
  SILENT_COERCION = 'SILENT_COERCION',

  /** At least one factor did not match any stored hash — typo or wrong credentials. */
  INVALID_TYPO = 'INVALID_TYPO',
}

export interface CheckinResult {
  outcome: CheckinOutcome;
  /** Populated only when outcome is SILENT_COERCION. */
  alertId?: string;
}

// ─── BullMQ job payloads ───

export const CheckinReminderJobSchema = z.object({
  studentId: z.string().uuid(),
  reminderType: z.enum(['4_HOUR', '1_HOUR']),
  reminderId: z.number().int(),
});

export type CheckinReminderJob = z.infer<typeof CheckinReminderJobSchema>;

export const MissedCheckinJobSchema = z.object({
  studentId: z.string().uuid(),
});

export type MissedCheckinJob = z.infer<typeof MissedCheckinJobSchema>;
