import { prisma } from '../../infrastructure/database/prisma';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error';

export class PrivacyService {
  async getAuditLogs(accountId: string) {
    return prisma.auditEvent.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async recordConsent(accountId: string, consentType: string, granted: boolean, ip?: string, userAgent?: string) {
    return prisma.securityConsent.create({
      data: {
        accountId,
        consentType,
        granted,
        ipAddress: ip,
        userAgent,
      },
    });
  }

  async getConsents(accountId: string) {
    return prisma.securityConsent.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestAccountDeletion(accountId: string) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundError('Account not found');

    return prisma.$transaction(async (tx) => {
      // Soft-delete account and mark status as DELETED
      await tx.account.update({
        where: { id: accountId },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
        },
      });

      // Soft-delete patient profiles
      await tx.patientProfile.updateMany({
        where: { accountId },
        data: { deletedAt: new Date() },
      });

      // Revoke all sessions
      await tx.session.updateMany({
        where: { accountId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      // Retain audit event for security & accountability
      await tx.auditEvent.create({
        data: {
          accountId,
          action: 'ACCOUNT_DELETED_BY_USER',
          entityType: 'Account',
          entityId: accountId,
        },
      });
    });
  }
}

export const privacyService = new PrivacyService();
