import { prisma } from '../../infrastructure/database/prisma';
import { patientService } from '../patients/patient.service';

export type TimelineProvenance = 'DOCTOR_PRESCRIBED' | 'PATIENT_REPORTED' | 'AI_EXTRACTED_DRAFT' | 'SYSTEM_GENERATED';

export interface TimelineEntry {
  id: string;
  type: 'DOCUMENT' | 'PRESCRIPTION' | 'TREATMENT' | 'MEDICATION_EVENT' | 'SYMPTOM' | 'HEALTH_SUMMARY';
  provenance: TimelineProvenance;
  title: string;
  subtitle?: string | null;
  timestamp: Date;
  isApproximateTime: boolean;
  category?: string | null;
  status?: string | null;
  details: Record<string, unknown>;
}

export class TimelineService {
  async getTimeline(
    patientProfileId: string,
    accountId: string,
    filters?: {
      provenance?: TimelineProvenance;
      type?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<TimelineEntry[]> {
    await patientService.getProfileById(patientProfileId, accountId);

    const entries: TimelineEntry[] = [];

    // 1. Documents
    const documents = await prisma.document.findMany({
      where: { patientProfileId, deletedAt: null },
      include: {
        versions: {
          take: 1,
          orderBy: { versionNumber: 'desc' },
          include: { extractions: { take: 1, orderBy: { createdAt: 'desc' } } },
        },
      },
    });

    for (const doc of documents) {
      const v = doc.versions[0];
      const ext = v?.extractions[0];
      entries.push({
        id: `doc_${doc.id}`,
        type: 'DOCUMENT',
        provenance: ext?.isConfirmed ? 'DOCTOR_PRESCRIBED' : 'AI_EXTRACTED_DRAFT',
        title: `Uploaded Document: ${doc.title}`,
        subtitle: `Category: ${doc.category} • Version ${v?.versionNumber || 1}`,
        timestamp: doc.createdAt,
        isApproximateTime: false,
        category: doc.category,
        status: doc.status,
        details: {
          documentId: doc.id,
          fileName: v?.fileName,
          fileSizeBytes: v?.fileSizeBytes,
          extractionStatus: ext?.status,
        },
      });
    }

    // 2. Prescriptions
    const prescriptions = await prisma.prescription.findMany({
      where: { patientProfileId, deletedAt: null },
      include: {
        items: {
          include: { dosageInstructions: true },
        },
      },
    });

    for (const rx of prescriptions) {
      const medList = rx.items.map((i) => `${i.enteredMedicationName} ${i.strength || ''}`).join(', ');
      entries.push({
        id: `rx_${rx.id}`,
        type: 'PRESCRIPTION',
        provenance: 'DOCTOR_PRESCRIBED',
        title: `Doctor Prescription (${rx.items.length} meds)`,
        subtitle: rx.prescriberName ? `Prescribed by ${rx.prescriberName} at ${rx.clinicName || 'Clinic'}` : 'Medical Prescription',
        timestamp: rx.prescribedDate,
        isApproximateTime: false,
        category: 'PRESCRIPTION',
        status: rx.status,
        details: {
          prescriptionId: rx.id,
          prescriberName: rx.prescriberName,
          clinicName: rx.clinicName,
          medications: medList,
          itemCount: rx.items.length,
        },
      });
    }

    // 3. Medication Events (Patient Reality)
    const events = await prisma.medicationEvent.findMany({
      where: { patientProfileId },
      include: { treatment: true },
    });

    for (const ev of events) {
      entries.push({
        id: `ev_${ev.id}`,
        type: 'MEDICATION_EVENT',
        provenance: 'PATIENT_REPORTED',
        title: `${ev.action}: ${ev.medicationName} (${ev.quantity} ${ev.unit})`,
        subtitle: ev.isStandalone ? 'Ad-hoc / Standalone (OTC)' : 'Logged Treatment Dose',
        timestamp: ev.eventTimestamp,
        isApproximateTime: ev.isApproximateTime,
        category: 'MEDICATION_EVENT',
        status: ev.action,
        details: {
          eventId: ev.id,
          action: ev.action,
          quantity: ev.quantity.toNumber(),
          unit: ev.unit,
          notes: ev.notes,
          correctionNotes: ev.correctionNotes,
          recordedAt: ev.recordedAt,
        },
      });
    }

    // 4. Symptoms (Phase 2)
    const symptoms = await prisma.symptom.findMany({
      where: { patientProfileId },
      include: { treatment: true },
    });

    for (const s of symptoms) {
      entries.push({
        id: `sym_${s.id}`,
        type: 'SYMPTOM',
        provenance: 'PATIENT_REPORTED',
        title: `Reported Symptom: ${s.name} (${s.severity})`,
        subtitle: s.treatment ? `Associated with ${s.treatment.customMedicationName || 'Treatment'}` : 'Standalone Observation',
        timestamp: s.startedAt,
        isApproximateTime: s.isApproximate,
        category: 'SYMPTOM',
        status: s.severity,
        details: {
          symptomId: s.id,
          severity: s.severity,
          notes: s.notes,
        },
      });
    }

    // Sort descending by timestamp
    let filtered = entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.provenance) {
      filtered = filtered.filter((e) => e.provenance === filters.provenance);
    }
    if (filters?.type) {
      filtered = filtered.filter((e) => e.type === filters.type);
    }
    if (filters?.startDate) {
      const start = new Date(filters.startDate).getTime();
      filtered = filtered.filter((e) => e.timestamp.getTime() >= start);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate).getTime();
      filtered = filtered.filter((e) => e.timestamp.getTime() <= end);
    }

    return filtered;
  }
}

export const timelineService = new TimelineService();
