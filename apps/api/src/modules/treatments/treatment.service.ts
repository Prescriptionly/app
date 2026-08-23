import { prisma } from '../../infrastructure/database/prisma';
import { patientService } from '../patients/patient.service';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/app-error';
import { Treatment, TreatmentStatus } from '@prisma/client';

export class TreatmentService {
  async getTreatments(patientProfileId: string, accountId: string, status?: TreatmentStatus): Promise<Treatment[]> {
    await patientService.getProfileById(patientProfileId, accountId);

    const where: Record<string, unknown> = { patientProfileId };
    if (status) where.status = status;

    return prisma.treatment.findMany({
      where,
      include: {
        prescriptionItem: {
          include: {
            medicationConcept: true,
            dosageInstructions: true,
            prescription: true,
          },
        },
        schedules: {
          include: {
            expectedDoses: {
              take: 5,
              orderBy: { expectedTimestamp: 'desc' },
            },
          },
        },
        medicationEvents: {
          take: 5,
          orderBy: { eventTimestamp: 'desc' },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getTreatmentById(treatmentId: string, accountId: string) {
    const treatment = await prisma.treatment.findUnique({
      where: { id: treatmentId },
      include: {
        patientProfile: true,
        prescriptionItem: {
          include: {
            medicationConcept: true,
            dosageInstructions: true,
            prescription: true,
          },
        },
        schedules: {
          include: {
            expectedDoses: {
              orderBy: { expectedTimestamp: 'asc' },
            },
          },
        },
        medicationEvents: {
          orderBy: { eventTimestamp: 'desc' },
        },
      },
    });

    if (!treatment) throw new NotFoundError('Treatment not found');
    if (treatment.patientProfile.accountId !== accountId) throw new ForbiddenError('Access denied');

    return treatment;
  }

  async createTreatment(
    patientProfileId: string,
    accountId: string,
    data: {
      prescriptionItemId?: string | null;
      customMedicationName?: string | null;
      startDate: string;
      endDate?: string | null;
      notes?: string | null;
    }
  ) {
    await patientService.getProfileById(patientProfileId, accountId);

    if (!data.prescriptionItemId && !data.customMedicationName) {
      throw new ValidationError('Either prescription item or medication name must be specified');
    }

    return prisma.$transaction(async (tx) => {
      const treatment = await tx.treatment.create({
        data: {
          patientProfileId,
          prescriptionItemId: data.prescriptionItemId || null,
          customMedicationName: data.customMedicationName?.trim() || null,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          notes: data.notes?.trim() || null,
          status: 'ACTIVE',
        },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          patientProfileId,
          action: 'TREATMENT_STARTED',
          entityType: 'Treatment',
          entityId: treatment.id,
        },
      });

      return treatment;
    });
  }

  async updateStatus(
    treatmentId: string,
    accountId: string,
    data: {
      status: TreatmentStatus;
      stopReason?: string | null;
      endDate?: string | null;
      notes?: string | null;
    }
  ) {
    const treatment = await this.getTreatmentById(treatmentId, accountId);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.treatment.update({
        where: { id: treatmentId },
        data: {
          status: data.status,
          stopReason: data.stopReason?.trim() || null,
          endDate: data.endDate ? new Date(data.endDate) : (data.status === 'COMPLETED' || data.status === 'DISCONTINUED' ? new Date() : undefined),
          notes: data.notes !== undefined ? (data.notes?.trim() || null) : undefined,
        },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          patientProfileId: treatment.patientProfileId,
          action: `TREATMENT_STATUS_${data.status}`,
          entityType: 'Treatment',
          entityId: treatmentId,
          metadataJson: JSON.stringify({ stopReason: data.stopReason }),
        },
      });

      return updated;
    });
  }
}

export const treatmentService = new TreatmentService();
