import { z } from 'zod';

export const createTreatmentSchema = z.object({
  patientProfileId: z.string().uuid(),
  prescriptionItemId: z.string().uuid().optional().nullable(),
  customMedicationName: z.string().min(1).max(200).optional().nullable(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateTreatmentStatusSchema = z.object({
  status: z.enum(['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'DISCONTINUED']),
  stopReason: z.string().max(500).optional().nullable(),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
