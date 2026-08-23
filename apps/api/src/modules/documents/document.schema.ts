import { z } from 'zod';

export const createDocumentSchema = z.object({
  patientProfileId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(200),
  category: z.enum([
    'PRESCRIPTION',
    'LAB_REPORT',
    'IMAGING_REPORT',
    'DISCHARGE_SUMMARY',
    'DOCTOR_LETTER',
    'OTHER',
  ]).default('OTHER'),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.enum([
    'PRESCRIPTION',
    'LAB_REPORT',
    'IMAGING_REPORT',
    'DISCHARGE_SUMMARY',
    'DOCTOR_LETTER',
    'OTHER',
  ]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).optional(),
});
