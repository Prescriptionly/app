import { prisma } from '../../infrastructure/database/prisma';
import { patientService } from '../patients/patient.service';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { DosageForm, FrequencyPeriod, Prisma } from '@prisma/client';

export class PrescriptionService {
  async getPrescriptions(patientProfileId: string, accountId: string) {
    await patientService.getProfileById(patientProfileId, accountId);

    return prisma.prescription.findMany({
      where: { patientProfileId, deletedAt: null },
      include: {
        sourceDocument: {
          include: {
            versions: {
              take: 1,
              orderBy: { versionNumber: 'desc' },
            },
          },
        },
        items: {
          include: {
            medicationConcept: true,
            dosageInstructions: true,
            treatments: true,
          },
        },
      },
      orderBy: { prescribedDate: 'desc' },
    });
  }

  async getPrescriptionById(prescriptionId: string, accountId: string) {
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patientProfile: true,
        sourceDocument: {
          include: {
            versions: {
              take: 1,
              orderBy: { versionNumber: 'desc' },
            },
          },
        },
        items: {
          include: {
            medicationConcept: true,
            dosageInstructions: true,
            treatments: {
              include: {
                schedules: true,
              },
            },
          },
        },
      },
    });

    if (!prescription || prescription.deletedAt) {
      throw new NotFoundError('Prescription not found');
    }

    if (prescription.patientProfile.accountId !== accountId) {
      throw new ForbiddenError('Access denied');
    }

    return prescription;
  }

  async createPrescription(
    patientProfileId: string,
    accountId: string,
    data: {
      sourceDocumentId?: string | null;
      prescriberName?: string | null;
      clinicName?: string | null;
      prescribedDate: string;
      notes?: string | null;
      items: Array<{
        medicationConceptId?: string | null;
        enteredMedicationName: string;
        form: DosageForm;
        strength?: string | null;
        originalInstructionText: string;
        doseQuantity: number;
        doseUnit: string;
        route?: string | null;
        frequencyCount: number;
        frequencyPeriod: FrequencyPeriod;
        timingDetails?: string | null;
        isPrn: boolean;
        prnReason?: string | null;
        durationDays?: number | null;
      }>;
    }
  ) {
    await patientService.getProfileById(patientProfileId, accountId);

    const parsedDate = new Date(data.prescribedDate);

    return prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.create({
        data: {
          patientProfileId,
          sourceDocumentId: data.sourceDocumentId || null,
          prescriberName: data.prescriberName?.trim() || null,
          clinicName: data.clinicName?.trim() || null,
          prescribedDate: parsedDate,
          notes: data.notes?.trim() || null,
          status: 'ACTIVE',
        },
      });

      for (const itemData of data.items) {
        let conceptId = itemData.medicationConceptId || null;

        if (!conceptId) {
          let concept = await tx.medicationConcept.findFirst({
            where: { name: itemData.enteredMedicationName.trim() },
          });

          if (!concept) {
            concept = await tx.medicationConcept.create({
              data: {
                name: itemData.enteredMedicationName.trim(),
                form: itemData.form,
                defaultStrength: itemData.strength?.trim() || null,
                isCustom: true,
              },
            });
          }
          conceptId = concept.id;
        }

        const item = await tx.prescriptionItem.create({
          data: {
            prescriptionId: prescription.id,
            medicationConceptId: conceptId,
            enteredMedicationName: itemData.enteredMedicationName.trim(),
            form: itemData.form,
            strength: itemData.strength?.trim() || null,
            originalInstructionText: itemData.originalInstructionText.trim(),
            normalizationStatus: 'CONFIRMED',
          },
        });

        await tx.dosageInstruction.create({
          data: {
            prescriptionItemId: item.id,
            doseQuantity: new Prisma.Decimal(itemData.doseQuantity),
            doseUnit: itemData.doseUnit,
            route: itemData.route?.trim() || null,
            frequencyCount: itemData.frequencyCount,
            frequencyPeriod: itemData.frequencyPeriod,
            timingDetails: itemData.timingDetails?.trim() || null,
            isPrn: itemData.isPrn,
            prnReason: itemData.prnReason?.trim() || null,
            durationDays: itemData.durationDays || null,
          },
        });

        // Initialize treatment course
        const treatment = await tx.treatment.create({
          data: {
            patientProfileId,
            prescriptionItemId: item.id,
            customMedicationName: itemData.enteredMedicationName.trim(),
            status: 'ACTIVE',
            startDate: parsedDate,
            notes: 'Created with prescription',
          },
        });

        if (!itemData.isPrn) {
          const times: string[] = [];
          if (itemData.frequencyCount === 1) times.push('08:00');
          else if (itemData.frequencyCount === 2) times.push('08:00', '20:00');
          else if (itemData.frequencyCount === 3) times.push('08:00', '14:00', '20:00');
          else if (itemData.frequencyCount === 4) times.push('08:00', '12:00', '16:00', '20:00');
          else times.push('08:00');

          await tx.treatmentSchedule.create({
            data: {
              treatmentId: treatment.id,
              intervalDays: 1,
              timesOfDayJson: JSON.stringify(times),
              startDate: parsedDate,
              endDate: itemData.durationDays
                ? new Date(parsedDate.getTime() + itemData.durationDays * 24 * 60 * 60 * 1000)
                : null,
            },
          });
        }
      }

      await tx.auditEvent.create({
        data: {
          accountId,
          patientProfileId,
          action: 'PRESCRIPTION_CREATED',
          entityType: 'Prescription',
          entityId: prescription.id,
          metadataJson: JSON.stringify({ itemCount: data.items.length }),
        },
      });

      return prescription;
    });
  }

  async deletePrescription(prescriptionId: string, accountId: string): Promise<void> {
    await this.getPrescriptionById(prescriptionId, accountId);

    await prisma.$transaction(async (tx) => {
      await tx.prescription.update({
        where: { id: prescriptionId },
        data: { deletedAt: new Date(), status: 'CANCELLED' },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          action: 'PRESCRIPTION_CANCELLED',
          entityType: 'Prescription',
          entityId: prescriptionId,
        },
      });
    });
  }
}

export const prescriptionService = new PrescriptionService();
