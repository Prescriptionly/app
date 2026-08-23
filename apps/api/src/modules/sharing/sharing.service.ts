import { prisma } from '../../infrastructure/database/prisma';
import { patientService } from '../patients/patient.service';
import { generateSecureToken, hashToken } from '../auth/auth.security';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/app-error';

export class SharingService {
  async createShareGrant(
    patientProfileId: string,
    accountId: string,
    data: {
      recipientLabel: string;
      allowedCategories: string[];
      expiresInHours?: number;
      dateStart?: string;
      dateEnd?: string;
    }
  ) {
    await patientService.getProfileById(patientProfileId, accountId);

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const hours = data.expiresInHours || 48;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const grant = await prisma.shareGrant.create({
      data: {
        patientProfileId,
        tokenHash,
        recipientLabel: data.recipientLabel.trim(),
        allowedCategoriesJson: JSON.stringify(data.allowedCategories),
        dateStart: data.dateStart ? new Date(data.dateStart) : null,
        dateEnd: data.dateEnd ? new Date(data.dateEnd) : null,
        expiresAt,
      },
    });

    await prisma.auditEvent.create({
      data: {
        accountId,
        patientProfileId,
        action: 'SHARE_GRANT_CREATED',
        entityType: 'ShareGrant',
        entityId: grant.id,
        metadataJson: JSON.stringify({
          recipient: data.recipientLabel,
          categories: data.allowedCategories,
          expiresAt,
        }),
      },
    });

    return {
      grant,
      shareToken: rawToken,
      shareUrl: `/shared/${rawToken}`,
    };
  }

  async getShareGrants(patientProfileId: string, accountId: string) {
    await patientService.getProfileById(patientProfileId, accountId);
    return prisma.shareGrant.findMany({
      where: { patientProfileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeShareGrant(grantId: string, accountId: string) {
    const grant = await prisma.shareGrant.findUnique({
      where: { id: grantId },
      include: { patientProfile: true },
    });

    if (!grant) throw new NotFoundError('Share grant not found');
    if (grant.patientProfile.accountId !== accountId) throw new ForbiddenError('Access denied');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.shareGrant.update({
        where: { id: grantId },
        data: { revokedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          patientProfileId: grant.patientProfileId,
          action: 'SHARE_GRANT_REVOKED',
          entityType: 'ShareGrant',
          entityId: grantId,
        },
      });

      return updated;
    });
  }

  async accessSharedWallet(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const grant = await prisma.shareGrant.findUnique({
      where: { tokenHash },
      include: { patientProfile: true },
    });

    if (!grant || grant.revokedAt || grant.expiresAt < new Date()) {
      throw new ForbiddenError('This shared link is invalid, expired, or has been revoked');
    }

    // Touch accessCount asynchronously
    prisma.shareGrant
      .update({
        where: { id: grant.id },
        data: {
          accessCount: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      })
      .catch(() => {});

    const allowedCategories: string[] = JSON.parse(grant.allowedCategoriesJson || '[]');
    const result: Record<string, unknown> = {
      patient: {
        displayName: grant.patientProfile.displayName,
        gender: grant.patientProfile.gender,
        timezone: grant.patientProfile.timezone,
      },
      recipientLabel: grant.recipientLabel,
      expiresAt: grant.expiresAt,
    };

    if (allowedCategories.includes('MEDICATIONS') || allowedCategories.includes('CURRENT_MEDICATIONS')) {
      result.activeTreatments = await prisma.treatment.findMany({
        where: { patientProfileId: grant.patientProfileId, status: 'ACTIVE' },
        include: {
          prescriptionItem: { include: { dosageInstructions: true } },
        },
      });
    }

    if (allowedCategories.includes('HISTORY') || allowedCategories.includes('MEDICATION_HISTORY')) {
      result.recentEvents = await prisma.medicationEvent.findMany({
        where: { patientProfileId: grant.patientProfileId },
        take: 20,
        orderBy: { eventTimestamp: 'desc' },
      });
    }

    if (allowedCategories.includes('DOCUMENTS')) {
      result.documents = await prisma.document.findMany({
        where: { patientProfileId: grant.patientProfileId, status: 'ACTIVE', deletedAt: null },
        select: {
          id: true,
          title: true,
          category: true,
          createdAt: true,
        },
      });
    }

    return result;
  }
}

export const sharingService = new SharingService();
