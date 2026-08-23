import { z } from 'zod';

export const createPrescriptionItemSchema = z.object({
  medicationConceptId: z.string().uuid().optional().nullable(),
  enteredMedicationName: z.string().min(1, 'Medication name is required').max(200),
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
  strength: z.string().max(100).optional().nullable(),
  originalInstructionText: z.string().min(1, 'Instruction text is required'),
  doseQuantity: z.number().positive().default(1),
  doseUnit: z.string().default('tablet'),
  route: z.string().max(100).optional().nullable(),
  frequencyCount: z.number().int().positive().default(1),
  frequencyPeriod: z.enum(['DAY', 'WEEK', 'MONTH', 'AS_NEEDED']).default('DAY'),
  timingDetails: z.string().max(200).optional().nullable(),
  isPrn: z.boolean().default(false),
  prnReason: z.string().max(200).optional().nullable(),
  durationDays: z.number().int().positive().optional().nullable(),
});

export const createPrescriptionSchema = z.object({
  patientProfileId: z.string().uuid(),
  sourceDocumentId: z.string().uuid().optional().nullable(),
  prescriberName: z.string().max(200).optional().nullable(),
  clinicName: z.string().max(200).optional().nullable(),
  prescribedDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(createPrescriptionItemSchema).min(1, 'At least one prescription item is required'),
});

export const updatePrescriptionSchema = z.object({
  prescriberName: z.string().max(200).optional().nullable(),
  clinicName: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
});
