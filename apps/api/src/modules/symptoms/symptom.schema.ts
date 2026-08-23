import { z } from 'zod';

export const createSymptomSchema = z.object({
  patientProfileId: z.string().uuid(),
  treatmentId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Symptom name is required').max(200),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'CRITICAL']).default('MILD'),
  startedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  endedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
  isApproximate: z.boolean().default(false),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateSymptomSchema = createSymptomSchema.partial();
