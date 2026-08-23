import { z } from 'zod';

export const candidateMedicationSchema = z.object({
  enteredName: z.string().min(1),
  form: z.enum([
    'TABLET',
    'CAPSULE',
    'SYRUP',
    'INJECTION',
    'CREAM',
    'OINTMENT',
    'INHALER',
    'DROPS',
    'PATCH',
    'POWDER',
    'OTHER',
  ]).default('TABLET'),
  strength: z.string().optional().nullable(),
  originalInstructionText: z.string().min(1),
  doseQuantity: z.number().positive().default(1),
  doseUnit: z.string().default('tablet'),
  route: z.string().optional().nullable(),
  frequencyCount: z.number().int().positive().default(1),
  frequencyPeriod: z.enum(['DAY', 'WEEK', 'MONTH', 'AS_NEEDED']).default('DAY'),
  timingDetails: z.string().optional().nullable(),
  isPrn: z.boolean().default(false),
  prnReason: z.string().optional().nullable(),
  durationDays: z.number().int().positive().optional().nullable(),
  confidence: z.number().min(0).max(1).default(0.85),
  warningFlags: z.array(z.string()).default([]),
});

export const confirmExtractionSchema = z.object({
  extractionId: z.string().uuid(),
  prescriberName: z.string().optional().nullable(),
  clinicName: z.string().optional().nullable(),
  prescribedDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  notes: z.string().optional().nullable(),
  medications: z.array(candidateMedicationSchema).min(1, 'At least one medication is required'),
});
