import { prisma } from '../../infrastructure/database/prisma';
import { patientService } from '../patients/patient.service';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { DosageForm, MedicationAction, Prisma } from '@prisma/client';

export class MedicationEventService {
  async logEvent(
    patientProfileId: string,
    accountId: string,
    data: {
      treatmentId?: string | null;
      expectedDoseId?: string | null;
      medicationName: string;
      form: DosageForm;
      quantity: number;
      unit: string;
      action: MedicationAction;
      eventTimestamp: string;
      isApproximateTime?: boolean;
      notes?: string | null;
      isStandalone?: boolean;
    }
  ) {
    await patientService.getProfileById(patientProfileId, accountId);

    const eventDate = new Date(data.eventTimestamp);

    return prisma.$transaction(async (tx) => {
      // If linked to an expected dose, update that dose's status
      if (data.expectedDoseId) {
        await tx.expectedDose.update({
          where: { id: data.expectedDoseId },
          data: {
            status: data.action === 'SKIPPED' ? 'SKIPPED' : 'LOGGED',
          },
        });
      }

      const event = await tx.medicationEvent.create({
        data: {
          patientProfileId,
          treatmentId: data.treatmentId || null,
          expectedDoseId: data.expectedDoseId || null,
          medicationName: data.medicationName.trim(),
          form: data.form,
          quantity: new Prisma.Decimal(data.quantity),
          unit: data.unit,
          action: data.action,
          eventTimestamp: eventDate,
          isApproximateTime: data.isApproximateTime ?? false,
          notes: data.notes?.trim() || null,
          isStandalone: data.isStandalone ?? (!data.treatmentId),
        },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          patientProfileId,
          action: 'MEDICATION_EVENT_LOGGED',
          entityType: 'MedicationEvent',
          entityId: event.id,
          metadataJson: JSON.stringify({
            medicationName: data.medicationName,
            action: data.action,
            quantity: data.quantity,
            isStandalone: data.isStandalone,
          }),
        },
      });

      return event;
    });
  }

  async correctEvent(
    eventId: string,
    accountId: string,
    data: {
      quantity?: number;
      action?: MedicationAction;
      eventTimestamp?: string;
      isApproximateTime?: boolean;
      correctionNotes: string;
    }
  ) {
    const existing = await prisma.medicationEvent.findUnique({
      where: { id: eventId },
      include: { patientProfile: true },
    });

    if (!existing) throw new NotFoundError('Medication event not found');
    if (existing.patientProfile.accountId !== accountId) throw new ForbiddenError('Access denied');

    const previousSnapshot = {
      quantity: existing.quantity.toNumber(),
      action: existing.action,
      eventTimestamp: existing.eventTimestamp,
      notes: existing.notes,
    };

    return prisma.$transaction(async (tx) => {
      const updated = await tx.medicationEvent.update({
        where: { id: eventId },
        data: {
          quantity: data.quantity ? new Prisma.Decimal(data.quantity) : undefined,
          action: data.action,
          eventTimestamp: data.eventTimestamp ? new Date(data.eventTimestamp) : undefined,
          isApproximateTime: data.isApproximateTime,
          correctionNotes: data.correctionNotes.trim(),
        },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          patientProfileId: existing.patientProfileId,
          action: 'MEDICATION_EVENT_CORRECTED',
          entityType: 'MedicationEvent',
          entityId: eventId,
          metadataJson: JSON.stringify({
            previous: previousSnapshot,
            correctionReason: data.correctionNotes,
          }),
        },
      });

      return updated;
    });
  }

  async getEvents(
    patientProfileId: string,
    accountId: string,
    filters?: {
      treatmentId?: string;
      startDate?: string;
      endDate?: string;
      action?: MedicationAction;
    }
  ) {
    await patientService.getProfileById(patientProfileId, accountId);

    const where: Record<string, unknown> = { patientProfileId };

    if (filters?.treatmentId) {
      where.treatmentId = filters.treatmentId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.startDate || filters?.endDate) {
      where.eventTimestamp = {};
      if (filters.startDate) {
        (where.eventTimestamp as Record<string, unknown>).gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (where.eventTimestamp as Record<string, unknown>).lte = new Date(filters.endDate);
      }
    }

    return prisma.medicationEvent.findMany({
      where,
      include: {
        treatment: {
          include: {
            prescriptionItem: true,
          },
        },
      },
      orderBy: { eventTimestamp: 'desc' },
    });
  }

  async getPrescribedVsActual(patientProfileId: string, accountId: string, targetDateStr?: string) {
    await patientService.getProfileById(patientProfileId, accountId);

    const baseDate = targetDateStr ? new Date(targetDateStr) : new Date();
    const dayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59, 999);

    // 1. Get active treatments with schedules
    const treatments = await prisma.treatment.findMany({
      where: {
        patientProfileId,
        status: 'ACTIVE',
      },
      include: {
        prescriptionItem: {
          include: {
            dosageInstructions: true,
          },
        },
        schedules: true,
      },
    });

    // 2. Get actual medication events logged for today
    const events = await prisma.medicationEvent.findMany({
      where: {
        patientProfileId,
        eventTimestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: { eventTimestamp: 'asc' },
    });

    // 3. Build prescribed items list vs actual consumption list
    const prescribedItems = treatments.map((t) => {
      const item = t.prescriptionItem;
      const instruction = item?.dosageInstructions[0];
      return {
        treatmentId: t.id,
        medicationName: item?.enteredMedicationName || t.customMedicationName || 'Unknown Medication',
        form: item?.form || 'TABLET',
        prescribedDailyDose: instruction
          ? `${instruction.doseQuantity} ${instruction.doseUnit} x ${instruction.frequencyCount} / ${instruction.frequencyPeriod}`
          : 'As directed',
        isPrn: instruction?.isPrn ?? false,
        instructionText: item?.originalInstructionText || 'Follow doctor directions',
      };
    });

    return {
      date: dayStart.toISOString().split('T')[0],
      prescribedCount: prescribedItems.length,
      loggedEventsCount: events.length,
      prescribedItems,
      actualEvents: events,
    };
  }
}

export const medicationEventService = new MedicationEventService();
