import { DosageForm, FrequencyPeriod, Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/app-error';

export interface ExtractedMedicationCandidate {
  enteredName: string;
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
  confidence: number;
  warningFlags: string[];
}

export class OcrService {
  async processExtractionDraft(documentVersionId: string): Promise<void> {
    const version = await prisma.documentVersion.findUnique({
      where: { id: documentVersionId },
      include: {
        document: true,
        extractions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!version) return;

    let extraction = version.extractions[0];
    if (!extraction) {
      extraction = await prisma.documentExtraction.create({
        data: {
          documentVersionId,
          status: 'PROCESSING',
        },
      });
    } else {
      await prisma.documentExtraction.update({
        where: { id: extraction.id },
        data: { status: 'PROCESSING' },
      });
    }

    try {
      // Mock / Rule-based OCR extractor for demo & test resilience
      const mockRawText = `
        Clinic: Metro Health Clinic
        Prescriber: Dr. Sarah Jenkins, MD
        Date: ${new Date().toISOString().split('T')[0]}
        
        Rx:
        1. Metformin 500mg - Take 1 tablet twice daily with meals.
        2. Amoxicillin 0.5g - 1 capsule every 8 hours for 7 days.
        3. Paracetamol 500mg - 1-2 tablets every 6 hours PRN for fever.
      `;

      const candidates: ExtractedMedicationCandidate[] = [
        {
          enteredName: 'Metformin',
          form: 'TABLET',
          strength: '500 mg',
          originalInstructionText: 'Take 1 tablet twice daily with meals.',
          doseQuantity: 1,
          doseUnit: 'tablet',
          route: 'Oral',
          frequencyCount: 2,
          frequencyPeriod: 'DAY',
          timingDetails: 'With meals',
          isPrn: false,
          durationDays: 30,
          confidence: 0.96,
          warningFlags: [],
        },
        {
          enteredName: 'Amoxicillin',
          form: 'CAPSULE',
          strength: '500 mg',
          originalInstructionText: '1 capsule every 8 hours for 7 days.',
          doseQuantity: 1,
          doseUnit: 'capsule',
          route: 'Oral',
          frequencyCount: 3,
          frequencyPeriod: 'DAY',
          timingDetails: 'Every 8 hours',
          isPrn: false,
          durationDays: 7,
          confidence: 0.74,
          warningFlags: [
            'POTENTIAL_DECIMAL_AMBIGUITY: Strength was read as "0.5g / 500mg". Please verify the decimal point.',
          ],
        },
        {
          enteredName: 'Paracetamol',
          form: 'TABLET',
          strength: '500 mg',
          originalInstructionText: '1-2 tablets every 6 hours PRN for fever.',
          doseQuantity: 1,
          doseUnit: 'tablet',
          route: 'Oral',
          frequencyCount: 4,
          frequencyPeriod: 'AS_NEEDED',
          timingDetails: 'Every 6 hours',
          isPrn: true,
          prnReason: 'Fever or mild pain',
          durationDays: 5,
          confidence: 0.91,
          warningFlags: [],
        },
      ];

      const rawExtracted = {
        prescriberName: 'Dr. Sarah Jenkins, MD',
        clinicName: 'Metro Health Clinic',
        prescribedDate: new Date().toISOString().split('T')[0],
        medications: candidates,
      };

      const confidenceScores = {
        overall: 0.87,
        fields: {
          prescriberName: 0.95,
          clinicName: 0.92,
          prescribedDate: 0.98,
          medications: candidates.map((c) => ({ name: c.enteredName, confidence: c.confidence })),
        },
      };

      await prisma.documentExtraction.update({
        where: { id: extraction.id },
        data: {
          status: 'EXTRACTED',
          ocrText: mockRawText,
          confidenceScoresJson: JSON.stringify(confidenceScores),
          rawExtractedJson: JSON.stringify(rawExtracted),
        },
      });
    } catch (err) {
      await prisma.documentExtraction.update({
        where: { id: extraction.id },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'OCR extraction failed',
        },
      });
    }
  }

  async getExtraction(extractionId: string, accountId: string) {
    const extraction = await prisma.documentExtraction.findUnique({
      where: { id: extractionId },
      include: {
        documentVersion: {
          include: {
            document: {
              include: { patientProfile: true },
            },
          },
        },
      },
    });

    if (!extraction) {
      throw new NotFoundError('Extraction record not found');
    }

    if (extraction.documentVersion.document.patientProfile.accountId !== accountId) {
      throw new ForbiddenError('Access denied');
    }

    return extraction;
  }

  async confirmExtraction(
    extractionId: string,
    accountId: string,
    data: {
      prescriberName?: string | null;
      clinicName?: string | null;
      prescribedDate: string;
      notes?: string | null;
      medications: ExtractedMedicationCandidate[];
    }
  ) {
    const extraction = await this.getExtraction(extractionId, accountId);

    if (extraction.isConfirmed) {
      throw new ValidationError('This extraction has already been confirmed and structured.');
    }

    const patientProfileId = extraction.documentVersion.document.patientProfileId;
    const documentId = extraction.documentVersion.documentId;
    const parsedDate = new Date(data.prescribedDate);

    return prisma.$transaction(async (tx) => {
      // 1. Create Prescription record
      const prescription = await tx.prescription.create({
        data: {
          patientProfileId,
          sourceDocumentId: documentId,
          prescriberName: data.prescriberName?.trim() || null,
          clinicName: data.clinicName?.trim() || null,
          prescribedDate: parsedDate,
          notes: data.notes?.trim() || null,
          status: 'ACTIVE',
        },
      });

      // 2. Create PrescriptionItems and DosageInstructions
      for (const med of data.medications) {
        // Try finding existing concept or create custom fallback
        let concept = await tx.medicationConcept.findFirst({
          where: { name: med.enteredName.trim() },
        });

        if (!concept) {
          concept = await tx.medicationConcept.create({
            data: {
              name: med.enteredName.trim(),
              form: med.form,
              defaultStrength: med.strength?.trim() || null,
              isCustom: true,
            },
          });
        }

        const item = await tx.prescriptionItem.create({
          data: {
            prescriptionId: prescription.id,
            medicationConceptId: concept.id,
            enteredMedicationName: med.enteredName.trim(),
            form: med.form,
            strength: med.strength?.trim() || null,
            originalInstructionText: med.originalInstructionText.trim(),
            normalizationStatus: 'CONFIRMED',
          },
        });

        await tx.dosageInstruction.create({
          data: {
            prescriptionItemId: item.id,
            doseQuantity: new Prisma.Decimal(med.doseQuantity),
            doseUnit: med.doseUnit,
            route: med.route?.trim() || null,
            frequencyCount: med.frequencyCount,
            frequencyPeriod: med.frequencyPeriod,
            timingDetails: med.timingDetails?.trim() || null,
            isPrn: med.isPrn,
            prnReason: med.prnReason?.trim() || null,
            durationDays: med.durationDays || null,
          },
        });

        // Create initial active treatment course
        const treatment = await tx.treatment.create({
          data: {
            patientProfileId,
            prescriptionItemId: item.id,
            customMedicationName: med.enteredName.trim(),
            status: 'ACTIVE',
            startDate: parsedDate,
            notes: 'Initialized from verified prescription extraction',
          },
        });

        // Initialize treatment schedule if regular daily dosage
        if (!med.isPrn) {
          const times: string[] = [];
          if (med.frequencyCount === 1) times.push('08:00');
          else if (med.frequencyCount === 2) times.push('08:00', '20:00');
          else if (med.frequencyCount === 3) times.push('08:00', '14:00', '20:00');
          else if (med.frequencyCount === 4) times.push('08:00', '12:00', '16:00', '20:00');
          else times.push('08:00');

          await tx.treatmentSchedule.create({
            data: {
              treatmentId: treatment.id,
              intervalDays: 1,
              timesOfDayJson: JSON.stringify(times),
              startDate: parsedDate,
              endDate: med.durationDays
                ? new Date(parsedDate.getTime() + med.durationDays * 24 * 60 * 60 * 1000)
                : null,
            },
          });
        }
      }

      // 3. Mark Extraction as CONFIRMED with user changes preserved in verifiedJson
      await tx.documentExtraction.update({
        where: { id: extractionId },
        data: {
          status: 'CONFIRMED',
          isConfirmed: true,
          confirmedAt: new Date(),
          confirmedByAccountId: accountId,
          verifiedJson: JSON.stringify(data),
        },
      });

      // 4. Record Audit Event
      await tx.auditEvent.create({
        data: {
          accountId,
          patientProfileId,
          action: 'OCR_EXTRACTION_CONFIRMED',
          entityType: 'Prescription',
          entityId: prescription.id,
          metadataJson: JSON.stringify({
            documentId,
            medicationCount: data.medications.length,
          }),
        },
      });

      return prescription;
    });
  }
}

export const ocrService = new OcrService();
