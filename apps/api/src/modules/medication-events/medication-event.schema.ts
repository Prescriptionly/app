import { z } from 'zod';

export const logMedicationEventSchema = z.object({
  patientProfileId: z.string().uuid(),
  treatmentId: z.string().uuid().optional().nullable(),
  expectedDoseId: z.string().uuid().optional().nullable(),
  medicationName: z.string().min(1, 'Medication name is required').max(200),
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
  quantity: z.number().positive('Quantity must be greater than 0').default(1),
  unit: z.string().default('dose'),
  action: z.enum([
    'TAKEN',
    'ADMINISTERED',
    'APPLIED',
    'USED',
    'SKIPPED',
    'PARTIAL',
    'OTHER',
  ]).default('TAKEN'),
  eventTimestamp: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/)),
  isApproximateTime: z.boolean().default(false),
  notes: z.string().max(2000).optional().nullable(),
  isStandalone: z.boolean().default(false),
});

export const correctMedicationEventSchema = z.object({
  quantity: z.number().positive().optional(),
  action: z.enum([
    'TAKEN',
    'ADMINISTERED',
    'APPLIED',
    'USED',
    'SKIPPED',
    'PARTIAL',
    'OTHER',
  ]).optional(),
  eventTimestamp: z.string().datetime().optional(),
  isApproximateTime: z.boolean().optional(),
  correctionNotes: z.string().min(1, 'Correction note is required to maintain traceable clinical history').max(2000),
});
