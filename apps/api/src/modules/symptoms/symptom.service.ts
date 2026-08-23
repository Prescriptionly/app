import { prisma } from '../../infrastructure/database/prisma';
import { patientService } from '../patients/patient.service';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { Symptom, SymptomSeverity } from '@prisma/client';

export class SymptomService {
  async getSymptoms(patientProfileId: string, accountId: string): Promise<Symptom[]> {
    await patientService.getProfileById(patientProfileId, accountId);
    return prisma.symptom.findMany({
      where: { patientProfileId },
      include: { treatment: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async createSymptom(
    patientProfileId: string,
    accountId: string,
    data: {
      treatmentId?: string | null;
      name: string;
      severity: SymptomSeverity;
      startedAt: string;
      endedAt?: string | null;
      isApproximate?: boolean;
      notes?: string | null;
    }
  ): Promise<Symptom> {
    await patientService.getProfileById(patientProfileId, accountId);

    return prisma.$transaction(async (tx) => {
      const symptom = await tx.symptom.create({
        data: {
          patientProfileId,
          treatmentId: data.treatmentId || null,
          name: data.name.trim(),
          severity: data.severity,
          startedAt: new Date(data.startedAt),
          endedAt: data.endedAt ? new Date(data.endedAt) : null,
          isApproximate: data.isApproximate ?? false,
          notes: data.notes?.trim() || null,
        },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          patientProfileId,
          action: 'SYMPTOM_REPORTED',
          entityType: 'Symptom',
          entityId: symptom.id,
          metadataJson: JSON.stringify({ name: data.name, severity: data.severity }),
        },
      });

      return symptom;
    });
  }

  async deleteSymptom(symptomId: string, accountId: string): Promise<void> {
    const symptom = await prisma.symptom.findUnique({
      where: { id: symptomId },
      include: { patientProfile: true },
    });

    if (!symptom) throw new NotFoundError('Symptom not found');
    if (symptom.patientProfile.accountId !== accountId) throw new ForbiddenError('Access denied');

    await prisma.symptom.delete({ where: { id: symptomId } });
  }
}

export const symptomService = new SymptomService();
