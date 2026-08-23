import { prisma } from '../../infrastructure/database/prisma';
import { patientService } from '../patients/patient.service';
import { SummaryType } from '@prisma/client';

export class SummaryService {
  async generateSummary(
    patientProfileId: string,
    accountId: string,
    summaryType: SummaryType = 'PATIENT'
  ) {
    const profile = await patientService.getProfileById(patientProfileId, accountId);

    // Fetch confirmed data
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
      orderBy: { prescribedDate: 'desc' },
    });

    const treatments = await prisma.treatment.findMany({
      where: { patientProfileId, status: 'ACTIVE' },
      include: {
        prescriptionItem: {
          include: { dosageInstructions: true },
        },
      },
    });

    const recentEvents = await prisma.medicationEvent.findMany({
      where: { patientProfileId },
      take: 10,
      orderBy: { eventTimestamp: 'desc' },
    });

    const symptoms = await prisma.symptom.findMany({
      where: { patientProfileId },
      take: 5,
      orderBy: { startedAt: 'desc' },
    });

    let markdown = '';
    const title = summaryType === 'PATIENT' ? `Health Summary for ${profile.displayName}` : `Clinical Summary: ${profile.displayName}`;

    if (summaryType === 'PATIENT') {
      markdown = `# ${title}
*Generated on ${new Date().toLocaleDateString()}*

## Active Treatments (${treatments.length})
${
  treatments.length === 0
    ? 'No active treatments currently recorded.'
    : treatments
        .map((t) => {
          const name = t.prescriptionItem?.enteredMedicationName || t.customMedicationName;
          const inst = t.prescriptionItem?.dosageInstructions[0];
          return `- **${name}**: ${inst ? `${inst.doseQuantity} ${inst.doseUnit} (${inst.frequencyCount}x/${inst.frequencyPeriod})` : 'Active'}`;
        })
        .join('\n')
}

## Recent Doctor Prescriptions (${prescriptions.length})
${
  prescriptions.length === 0
    ? 'No prescriptions recorded.'
    : prescriptions
        .map((p) => `- ${p.prescribedDate.toISOString().split('T')[0]}: ${p.prescriberName || 'Doctor'} (${p.items.length} medications)`)
        .join('\n')
}

## Recent Logged Medication Doses
${
  recentEvents.length === 0
    ? 'No doses logged yet.'
    : recentEvents
        .map((e) => `- ${e.eventTimestamp.toISOString().split('T')[0]}: ${e.action} **${e.medicationName}** (${e.quantity} ${e.unit})`)
        .join('\n')
}

## Reported Symptoms
${
  symptoms.length === 0
    ? 'No symptoms reported.'
    : symptoms
        .map((s) => `- ${s.startedAt.toISOString().split('T')[0]}: **${s.name}** [Severity: ${s.severity}]`)
        .join('\n')
}

---
*Disclaimer: Generated from your confirmed wallet entries. Does not replace professional medical advice.*
`;
    } else {
      markdown = `# ${title}
**Demographics**: DOB: ${profile.dateOfBirth ? profile.dateOfBirth.toISOString().split('T')[0] : 'Not specified'} | Gender: ${profile.gender} | Blood: ${profile.bloodGroup || 'Unknown'} | Timezone: ${profile.timezone}

## Active Medication Regimen
${
  treatments.length === 0
    ? 'None active.'
    : treatments
        .map((t) => {
          const item = t.prescriptionItem;
          const inst = item?.dosageInstructions[0];
          return `* **${item?.enteredMedicationName || t.customMedicationName}** (${item?.form || 'TABLET'})
  - Structured Dose: ${inst ? `${inst.doseQuantity} ${inst.doseUnit}, Freq: ${inst.frequencyCount}/${inst.frequencyPeriod}, PRN: ${inst.isPrn}` : 'Unspecified'}
  - Original Rx Text: "${item?.originalInstructionText || 'N/A'}"
  - Course Start: ${t.startDate.toISOString().split('T')[0]}`;
        })
        .join('\n')
}

## Historical Prescriptions
${
  prescriptions.length === 0
    ? 'None on record.'
    : prescriptions
        .map((p) => `* **${p.prescribedDate.toISOString().split('T')[0]}** | Provider: ${p.prescriberName || 'N/A'} (${p.clinicName || 'N/A'})
  - Items: ${p.items.map((i) => `${i.enteredMedicationName} ${i.strength || ''}`).join(', ')}`)
        .join('\n')
}

## Patient Reported Adherence Events (Last 10)
${
  recentEvents.length === 0
    ? 'No patient events recorded.'
    : recentEvents
        .map((e) => `* ${e.eventTimestamp.toISOString()} | Action: ${e.action} | Drug: ${e.medicationName} | Quantity: ${e.quantity} ${e.unit} | Approx: ${e.isApproximateTime}`)
        .join('\n')
}
`;
    }

    const summary = await prisma.healthSummary.create({
      data: {
        patientProfileId,
        summaryType,
        title,
        contentMarkdown: markdown,
        provenanceJson: JSON.stringify({
          treatmentCount: treatments.length,
          prescriptionCount: prescriptions.length,
          eventCount: recentEvents.length,
          generatedAt: new Date().toISOString(),
        }),
      },
    });

    return summary;
  }

  async getSummaries(patientProfileId: string, accountId: string) {
    await patientService.getProfileById(patientProfileId, accountId);
    return prisma.healthSummary.findMany({
      where: { patientProfileId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const summaryService = new SummaryService();
