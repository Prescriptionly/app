import { z } from 'zod';

export const createMedicationConceptSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  genericName: z.string().max(200).optional().nullable(),
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
  defaultStrength: z.string().max(100).optional().nullable(),
  defaultRoute: z.string().max(100).optional().nullable(),
  code: z.string().max(50).optional().nullable(),
});
