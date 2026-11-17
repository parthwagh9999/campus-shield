import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export interface UniversitySettings {
  universityName: string;
  universityShortName: string;
  primaryColor: string;
  accentColor: string;
  themePreset: string;
  campusPolicePhone: string;
  studentEscortPhone: string;
  counselingHotline: string;
  defaultCheckinIntervalHours: number;
  gracePeriodSeconds: number;
  lowBatteryThresholdPct: number;
  require2FAForStaff: boolean;
}

let universitySettings: UniversitySettings = {
  universityName: 'University of California, Riverside',
  universityShortName: 'UCR',
  primaryColor: '#003B5C', // Official UCR Blue
  accentColor: '#FFB81C',  // Official UCR Highlander Gold
  themePreset: 'ucr',
  campusPolicePhone: '(951) 827-5222',
  studentEscortPhone: '(951) 827-3772',
  counselingHotline: '(951) 827-5531',
  defaultCheckinIntervalHours: 48,
  gracePeriodSeconds: 60,
  lowBatteryThresholdPct: 5,
  require2FAForStaff: false,
};

const UpdateSettingsSchema = z.object({
  universityName: z.string().optional(),
  universityShortName: z.string().optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  themePreset: z.string().optional(),
  campusPolicePhone: z.string().optional(),
  studentEscortPhone: z.string().optional(),
  counselingHotline: z.string().optional(),
  defaultCheckinIntervalHours: z.number().int().min(12).max(168).optional(),
  gracePeriodSeconds: z.number().int().min(30).max(300).optional(),
  lowBatteryThresholdPct: z.number().int().min(1).max(20).optional(),
  require2FAForStaff: z.boolean().optional(),
});

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/panel/settings
  app.get('/api/v1/panel/settings', async () => {
    return { settings: universitySettings };
  });

  // PUT /api/v1/panel/settings
  app.put('/api/v1/panel/settings', { preHandler: [app.staffAuth] }, async (request, reply) => {
    const parsed = UpdateSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation failed', details: parsed.error.format() });
    }

    universitySettings = {
      ...universitySettings,
      ...parsed.data,
    };

    return reply.code(200).send({ settings: universitySettings });
  });
}
