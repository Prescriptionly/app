import { prisma } from '../../infrastructure/database/prisma';
import { patientService } from '../patients/patient.service';
import { generateSecureToken, hashToken } from '../auth/auth.security';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export class EmergencyService {
  async getEmergencyProfile(patientProfileId: string, accountId: string) {
    await patientService.getProfileById(patientProfileId, accountId);

    let profile = await prisma.emergencyProfile.findUnique({
      where: { patientProfileId },
    });

    if (!profile) {
      const rawToken = generateSecureToken(24);
      profile = await prisma.emergencyProfile.create({
        data: {
          patientProfileId,
          tokenHash: rawToken,
          emergencyContactsJson: JSON.stringify([]),
          selectedAllergiesJson: JSON.stringify(['None recorded']),
          selectedMedicationIdsJson: JSON.stringify([]),
          medicalNotes: '',
          isEnabled: true,
        },
      });
    }

    return profile;
  }

  async updateEmergencyProfile(
    patientProfileId: string,
    accountId: string,
    data: {
      emergencyContacts?: EmergencyContact[];
      selectedAllergies?: string[];
      selectedMedicationIds?: string[];
      medicalNotes?: string | null;
      isEnabled?: boolean;
    }
  ) {
    await patientService.getProfileById(patientProfileId, accountId);

    let profile = await prisma.emergencyProfile.findUnique({
      where: { patientProfileId },
    });

    const tokenHash = profile ? profile.tokenHash : generateSecureToken(24);

    profile = await prisma.emergencyProfile.upsert({
      where: { patientProfileId },
      create: {
        patientProfileId,
        tokenHash,
        emergencyContactsJson: JSON.stringify(data.emergencyContacts || []),
        selectedAllergiesJson: JSON.stringify(data.selectedAllergies || []),
        selectedMedicationIdsJson: JSON.stringify(data.selectedMedicationIds || []),
        medicalNotes: data.medicalNotes?.trim() || null,
        isEnabled: data.isEnabled ?? true,
      },
      update: {
        emergencyContactsJson: data.emergencyContacts ? JSON.stringify(data.emergencyContacts) : undefined,
        selectedAllergiesJson: data.selectedAllergies ? JSON.stringify(data.selectedAllergies) : undefined,
        selectedMedicationIdsJson: data.selectedMedicationIds ? JSON.stringify(data.selectedMedicationIds) : undefined,
        medicalNotes: data.medicalNotes !== undefined ? (data.medicalNotes?.trim() || null) : undefined,
        isEnabled: data.isEnabled,
      },
    });

    await prisma.auditEvent.create({
      data: {
        accountId,
        patientProfileId,
        action: 'EMERGENCY_PROFILE_UPDATED',
        entityType: 'EmergencyProfile',
        entityId: profile.id,
      },
    });

    return profile;
  }

  async getPublicEmergencyCard(token: string) {
    const profile = await prisma.emergencyProfile.findUnique({
      where: { tokenHash: token },
      include: { patientProfile: true },
    });

    if (!profile || !profile.isEnabled || profile.patientProfile.deletedAt) {
      throw new NotFoundError('Emergency card not found or has been disabled');
    }

    const contacts: EmergencyContact[] = JSON.parse(profile.emergencyContactsJson || '[]');
    const allergies: string[] = JSON.parse(profile.selectedAllergiesJson || '[]');
    const medIds: string[] = JSON.parse(profile.selectedMedicationIdsJson || '[]');

    let medications: Array<{ name: string; dose?: string }> = [];
    if (medIds.length > 0) {
      const treatments = await prisma.treatment.findMany({
        where: { id: { in: medIds } },
        include: {
          prescriptionItem: { include: { dosageInstructions: true } },
        },
      });
      medications = treatments.map((t) => ({
        name: t.prescriptionItem?.enteredMedicationName || t.customMedicationName || 'Medication',
        dose: t.prescriptionItem?.dosageInstructions[0]
          ? `${t.prescriptionItem.dosageInstructions[0].doseQuantity} ${t.prescriptionItem.dosageInstructions[0].doseUnit}`
          : undefined,
      }));
    }

    return {
      displayName: profile.patientProfile.displayName,
      bloodGroup: profile.patientProfile.bloodGroup || 'Unknown',
      dateOfBirth: profile.patientProfile.dateOfBirth,
      gender: profile.patientProfile.gender,
      emergencyContacts: contacts,
      allergies,
      medications,
      medicalNotes: profile.medicalNotes,
      disclaimer: 'This emergency card contains only the limited dataset explicitly chosen by the patient.',
    };
  }
}

export const emergencyService = new EmergencyService();
