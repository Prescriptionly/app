import { z } from 'zod';

export const createProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100),
  dateOfBirth: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()),
  isDobApproximate: z.boolean().default(false),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).default('UNKNOWN'),
  bloodGroup: z.string().max(10).optional().nullable(),
  emergencyNotes: z.string().max(2000).optional().nullable(),
  language: z.string().max(10).default('en'),
  timezone: z.string().max(50).default('UTC'),
  isPrimary: z.boolean().default(false),
});

export const updateProfileSchema = createProfileSchema.partial();
