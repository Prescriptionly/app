import { prisma } from '../../infrastructure/database/prisma';
import { patientService } from '../patients/patient.service';
import { storage } from '../../infrastructure/storage/local-disk-storage';
import PDFDocument from 'pdfkit';
import { ExportFormat, JobStatus } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../shared/errors/app-error';

export class ExportService {
  async createExportJob(
    patientProfileId: string,
    accountId: string,
    format: ExportFormat = 'PDF',
    filterScope?: Record<string, unknown>
  ) {
    const profile = await patientService.getProfileById(patientProfileId, accountId);

    const job = await prisma.exportJob.create({
      data: {
        patientProfileId,
        format,
        status: 'PROCESSING',
        filterScopeJson: filterScope ? JSON.stringify(filterScope) : null,
      },
    });

    try {
      if (format === 'JSON') {
        const payload = await this.generateJsonExport(patientProfileId, accountId);
        const buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
        const fileName = `prescriptionly-export-${profile.displayName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
        const stored = await storage.saveBuffer(buffer, fileName, 'application/json');

        await prisma.exportJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            storageKey: stored.storageKey,
            completedAt: new Date(),
          },
        });
      } else {
        // PDF Export
        const buffer = await this.generatePdfExport(patientProfileId, accountId);
        const fileName = `prescriptionly-report-${profile.displayName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;
        const stored = await storage.saveBuffer(buffer, fileName, 'application/pdf');

        await prisma.exportJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            storageKey: stored.storageKey,
            completedAt: new Date(),
          },
        });
      }

      await prisma.auditEvent.create({
        data: {
          accountId,
          patientProfileId,
          action: 'EXPORT_GENERATED',
          entityType: 'ExportJob',
          entityId: job.id,
          metadataJson: JSON.stringify({ format }),
        },
      });

      return prisma.exportJob.findUnique({ where: { id: job.id } });
    } catch (err) {
      await prisma.exportJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Export failed',
        },
      });
      throw err;
    }
  }

  async generateJsonExport(patientProfileId: string, accountId: string) {
    const profile = await patientService.getProfileById(patientProfileId, accountId);
    const prescriptions = await prisma.prescription.findMany({
      where: { patientProfileId, deletedAt: null },
      include: {
        items: {
          include: {
            medicationConcept: true,
            dosageInstructions: true,
          },
        },
      },
    });

    const treatments = await prisma.treatment.findMany({
      where: { patientProfileId },
      include: {
        prescriptionItem: true,
      },
    });

    const events = await prisma.medicationEvent.findMany({
      where: { patientProfileId },
    });

    const symptoms = await prisma.symptom.findMany({
      where: { patientProfileId },
    });

    return {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      exporter: 'Prescriptionly Canonical Exporter',
      patient: {
        id: profile.id,
        displayName: profile.displayName,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        bloodGroup: profile.bloodGroup,
        timezone: profile.timezone,
      },
      prescriptions: prescriptions.map((p) => ({
        id: p.id,
        prescriberName: p.prescriberName,
        clinicName: p.clinicName,
        prescribedDate: p.prescribedDate,
        notes: p.notes,
        items: p.items.map((i) => ({
          medicationName: i.enteredMedicationName,
          form: i.form,
          strength: i.strength,
          originalInstructionText: i.originalInstructionText,
          dosage: i.dosageInstructions[0] || null,
        })),
      })),
      treatments: treatments.map((t) => ({
        id: t.id,
        medicationName: t.prescriptionItem?.enteredMedicationName || t.customMedicationName,
        status: t.status,
        startDate: t.startDate,
        endDate: t.endDate,
        stopReason: t.stopReason,
      })),
      medicationEvents: events.map((e) => ({
        id: e.id,
        medicationName: e.medicationName,
        action: e.action,
        quantity: e.quantity.toNumber(),
        unit: e.unit,
        eventTimestamp: e.eventTimestamp,
        isApproximateTime: e.isApproximateTime,
        recordedAt: e.recordedAt,
        correctionNotes: e.correctionNotes,
      })),
      symptoms: symptoms.map((s) => ({
        id: s.id,
        name: s.name,
        severity: s.severity,
        startedAt: s.startedAt,
        notes: s.notes,
      })),
    };
  }

  async generatePdfExport(patientProfileId: string, accountId: string): Promise<Buffer> {
    const profile = await patientService.getProfileById(patientProfileId, accountId);
    const treatments = await prisma.treatment.findMany({
      where: { patientProfileId, status: 'ACTIVE' },
      include: {
        prescriptionItem: { include: { dosageInstructions: true } },
      },
    });

    const prescriptions = await prisma.prescription.findMany({
      where: { patientProfileId, deletedAt: null },
      include: { items: { include: { dosageInstructions: true } } },
      take: 10,
      orderBy: { prescribedDate: 'desc' },
    });

    const events = await prisma.medicationEvent.findMany({
      where: { patientProfileId },
      take: 15,
      orderBy: { eventTimestamp: 'desc' },
    });

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header
      doc.fontSize(22).fillColor('#0284c7').text('Prescriptionly Medical Wallet Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#64748b').text(`Generated on ${new Date().toUTCString()}`, { align: 'center' });
      doc.moveDown(1.5);

      // Patient Demographics
      doc.fontSize(14).fillColor('#0f172a').text('Patient Information');
      doc.fontSize(10).fillColor('#334155');
      doc.text(`Name: ${profile.displayName}`);
      doc.text(`Date of Birth: ${profile.dateOfBirth ? profile.dateOfBirth.toISOString().split('T')[0] : 'N/A'}`);
      doc.text(`Gender: ${profile.gender} | Blood Group: ${profile.bloodGroup || 'Unknown'}`);
      doc.text(`Timezone: ${profile.timezone}`);
      doc.moveDown(1);

      // Active Treatments
      doc.fontSize(14).fillColor('#0f172a').text(`Active Medication Regimen (${treatments.length})`);
      doc.moveDown(0.5);
      if (treatments.length === 0) {
        doc.fontSize(10).fillColor('#64748b').text('No active treatments on record.');
      } else {
        treatments.forEach((t) => {
          const item = t.prescriptionItem;
          const inst = item?.dosageInstructions[0];
          doc.fontSize(11).fillColor('#0f172a').text(`• ${item?.enteredMedicationName || t.customMedicationName || 'Medication'}`);
          doc.fontSize(9).fillColor('#475569');
          if (inst) {
            doc.text(`  Dose: ${inst.doseQuantity} ${inst.doseUnit} (${inst.frequencyCount}x/${inst.frequencyPeriod})`);
          }
          if (item?.originalInstructionText) {
            doc.text(`  Original Prescription: "${item.originalInstructionText}"`);
          }
          doc.moveDown(0.3);
        });
      }
      doc.moveDown(1);

      // Prescriptions
      doc.fontSize(14).fillColor('#0f172a').text(`Doctor Prescriptions (${prescriptions.length})`);
      doc.moveDown(0.5);
      if (prescriptions.length === 0) {
        doc.fontSize(10).fillColor('#64748b').text('No prescriptions recorded.');
      } else {
        prescriptions.forEach((p) => {
          doc.fontSize(10).fillColor('#0f172a').text(`• ${p.prescribedDate.toISOString().split('T')[0]} — Prescriber: ${p.prescriberName || 'Doctor'} (${p.clinicName || 'Clinic'})`);
          p.items.forEach((item) => {
            doc.fontSize(9).fillColor('#475569').text(`    - ${item.enteredMedicationName} (${item.form}) ${item.strength || ''}`);
          });
          doc.moveDown(0.3);
        });
      }
      doc.moveDown(1);

      // Actual Medication Events
      doc.fontSize(14).fillColor('#0f172a').text(`Recent Patient-Reported Events (${events.length})`);
      doc.moveDown(0.5);
      if (events.length === 0) {
        doc.fontSize(10).fillColor('#64748b').text('No medication events logged.');
      } else {
        events.forEach((e) => {
          doc.fontSize(9).fillColor('#334155').text(
            `• ${e.eventTimestamp.toISOString().split('T')[0]} - [${e.action}] ${e.medicationName} (${e.quantity} ${e.unit})${e.correctionNotes ? ` *Corrected: ${e.correctionNotes}` : ''}`
          );
        });
      }
      doc.moveDown(1.5);

      // Disclaimer
      doc.fontSize(8).fillColor('#94a3b8').text(
        'Notice: This document contains patient-managed personal health wallet data. Prescribed information and patient-reported actual events remain distinct. It does not constitute medical certification or diagnosis.',
        { align: 'center' }
      );

      doc.end();
    });
  }

  async getJobs(patientProfileId: string, accountId: string) {
    await patientService.getProfileById(patientProfileId, accountId);
    return prisma.exportJob.findMany({
      where: { patientProfileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async downloadExport(jobId: string, accountId: string) {
    const job = await prisma.exportJob.findUnique({
      where: { id: jobId },
      include: { patientProfile: true },
    });

    if (!job || !job.storageKey) throw new NotFoundError('Export file not found');
    if (job.patientProfile.accountId !== accountId) throw new ForbiddenError('Access denied');

    const filePath = storage.getFilePath(job.storageKey);
    const mimeType = job.format === 'JSON' ? 'application/json' : 'application/pdf';
    const ext = job.format === 'JSON' ? 'json' : 'pdf';
    return {
      filePath,
      fileName: `prescriptionly-export-${job.id}.${ext}`,
      mimeType,
    };
  }
}

export const exportService = new ExportService();
