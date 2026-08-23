import { prisma } from '../../infrastructure/database/prisma';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { Gender, PatientProfile } from '@prisma/client';

export class PatientService {
  async getProfilesForAccount(accountId: string): Promise<PatientProfile[]> {
    return prisma.patientProfile.findMany({
      where: { accountId, deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getPrimaryProfile(accountId: string): Promise<PatientProfile> {
    let profile = await prisma.patientProfile.findFirst({
      where: { accountId, isPrimary: true, deletedAt: null },
    });

    if (!profile) {
      profile = await prisma.patientProfile.findFirst({
        where: { accountId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!profile) {
      // Create a fallback primary profile
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      profile = await prisma.patientProfile.create({
        data: {
          accountId,
          displayName: account?.email.split('@')[0] || 'My Profile',
          isPrimary: true,
        },
      });
    }

    return profile;
  }

  async getProfileById(profileId: string, accountId: string): Promise<PatientProfile> {
    const profile = await prisma.patientProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile || profile.deletedAt) {
      throw new NotFoundError('Patient profile not found');
    }

    if (profile.accountId !== accountId) {
      throw new ForbiddenError('You do not have access to this patient profile');
    }

    return profile;
  }

  async createProfile(
    accountId: string,
    data: {
      displayName: string;
      dateOfBirth?: string | null;
      isDobApproximate?: boolean;
      gender?: Gender;
      bloodGroup?: string | null;
      emergencyNotes?: string | null;
      language?: string;
      timezone?: string;
      isPrimary?: boolean;
    }
  ): Promise<PatientProfile> {
    const dob = data.dateOfBirth ? new Date(data.dateOfBirth) : null;

    return prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        // Demote previous primary profile
        await tx.patientProfile.updateMany({
          where: { accountId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const profile = await tx.patientProfile.create({
        data: {
          accountId,
          displayName: data.displayName.trim(),
          dateOfBirth: dob,
          isDobApproximate: data.isDobApproximate ?? false,
          gender: data.gender ?? 'UNKNOWN',
          bloodGroup: data.bloodGroup?.trim() || null,
          emergencyNotes: data.emergencyNotes?.trim() || null,
          language: data.language || 'en',
          timezone: data.timezone || 'UTC',
          isPrimary: data.isPrimary ?? false,
        },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          patientProfileId: profile.id,
          action: 'PROFILE_CREATED',
          entityType: 'PatientProfile',
          entityId: profile.id,
        },
      });

      return profile;
    });
  }

  async updateProfile(
    profileId: string,
    accountId: string,
    data: {
      displayName?: string;
      dateOfBirth?: string | null;
      isDobApproximate?: boolean;
      gender?: Gender;
      bloodGroup?: string | null;
      emergencyNotes?: string | null;
      language?: string;
      timezone?: string;
      isPrimary?: boolean;
    }
  ): Promise<PatientProfile> {
    await this.getProfileById(profileId, accountId);

    const dob = data.dateOfBirth !== undefined ? (data.dateOfBirth ? new Date(data.dateOfBirth) : null) : undefined;

    return prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.patientProfile.updateMany({
          where: { accountId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const updated = await tx.patientProfile.update({
        where: { id: profileId },
        data: {
          displayName: data.displayName?.trim(),
          dateOfBirth: dob,
          isDobApproximate: data.isDobApproximate,
          gender: data.gender,
          bloodGroup: data.bloodGroup !== undefined ? (data.bloodGroup?.trim() || null) : undefined,
          emergencyNotes: data.emergencyNotes !== undefined ? (data.emergencyNotes?.trim() || null) : undefined,
          language: data.language,
          timezone: data.timezone,
          isPrimary: data.isPrimary,
        },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          patientProfileId: profileId,
          action: 'PROFILE_UPDATED',
          entityType: 'PatientProfile',
          entityId: profileId,
        },
      });

      return updated;
    });
  }

  async deleteProfile(profileId: string, accountId: string): Promise<void> {
    await this.getProfileById(profileId, accountId);

    await prisma.$transaction(async (tx) => {
      await tx.patientProfile.update({
        where: { id: profileId },
        data: { deletedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          patientProfileId: profileId,
          action: 'PROFILE_SOFT_DELETED',
          entityType: 'PatientProfile',
          entityId: profileId,
        },
      });
    });
  }
}

export const patientService = new PatientService();
