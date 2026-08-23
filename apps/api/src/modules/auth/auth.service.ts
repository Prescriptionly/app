import { prisma } from '../../infrastructure/database/prisma';
import { hashPassword, verifyPassword, generateSecureToken, hashToken } from './auth.security';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../shared/errors/app-error';
import { Account, Session } from '@prisma/client';

export const SESSION_EXPIRY_DAYS = 30;

export interface AuthResult {
  account: {
    id: string;
    email: string;
    isVerified: boolean;
    status: string;
    isAdmin: boolean;
  };
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
}

export class AuthService {
  async register(data: { email: string; password: string; displayName?: string; ip?: string }): Promise<{
    account: { id: string; email: string };
    verificationToken: string;
  }> {
    const existing = await prisma.account.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(data.password);
    const normalizedEmail = data.email.toLowerCase().trim();

    const account = await prisma.$transaction(async (tx) => {
      const acc = await tx.account.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          status: 'ACTIVE', // Auto-active for friendly local dev, while tracking isVerified
          isVerified: true,
        },
      });

      // Automatically initialize primary patient profile
      await tx.patientProfile.create({
        data: {
          accountId: acc.id,
          displayName: data.displayName?.trim() || normalizedEmail.split('@')[0] || 'My Profile',
          isPrimary: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          accountId: acc.id,
          action: 'AUTH_REGISTER',
          entityType: 'Account',
          entityId: acc.id,
          ipAddress: data.ip,
        },
      });

      return acc;
    });

    const verificationToken = generateSecureToken();
    const tokenHash = hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        accountId: account.id,
        tokenHash,
        targetEmail: normalizedEmail,
        expiresAt,
      },
    });

    return {
      account: {
        id: account.id,
        email: account.email,
      },
      verificationToken,
    };
  }

  async login(data: { email: string; password: string; ip?: string; userAgent?: string }): Promise<AuthResult> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const account = await prisma.account.findUnique({
      where: { email: normalizedEmail },
    });

    if (!account) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (account.status === 'SUSPENDED' || account.status === 'DELETED') {
      throw new UnauthorizedError('Account is unavailable');
    }

    const isValid = await verifyPassword(data.password, account.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const rawSessionToken = generateSecureToken(32);
    const csrfToken = generateSecureToken(24);
    const tokenHash = hashToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        accountId: account.id,
        tokenHash,
        csrfToken,
        ipAddress: data.ip,
        userAgent: data.userAgent,
        expiresAt,
      },
    });

    await prisma.auditEvent.create({
      data: {
        accountId: account.id,
        action: 'AUTH_LOGIN',
        entityType: 'Session',
        ipAddress: data.ip,
      },
    });

    return {
      account: {
        id: account.id,
        email: account.email,
        isVerified: account.isVerified,
        status: account.status,
        isAdmin: account.isAdmin,
      },
      sessionToken: rawSessionToken,
      csrfToken,
      expiresAt,
    };
  }

  async validateSession(rawToken: string): Promise<{ account: Account; session: Session } | null> {
    const tokenHash = hashToken(rawToken);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { account: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }

    if (session.account.status === 'SUSPENDED' || session.account.status === 'DELETED') {
      return null;
    }

    // Touch lastActiveAt asynchronously
    prisma.session
      .update({
        where: { id: session.id },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => {});

    return { account: session.account, session };
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(accountId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getMe(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        isVerified: true,
        status: true,
        isAdmin: true,
        createdAt: true,
        patientProfiles: {
          where: { deletedAt: null },
          select: {
            id: true,
            displayName: true,
            dateOfBirth: true,
            isDobApproximate: true,
            gender: true,
            bloodGroup: true,
            language: true,
            timezone: true,
            isPrimary: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundError('Account not found');
    }

    return account;
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { account: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new ValidationError('Invalid or expired verification token');
    }

    await prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      await tx.account.update({
        where: { id: record.accountId },
        data: {
          isVerified: true,
          status: 'ACTIVE',
          email: record.targetEmail,
          pendingNewEmail: null,
        },
      });

      await tx.auditEvent.create({
        data: {
          accountId: record.accountId,
          action: 'AUTH_EMAIL_VERIFIED',
          entityType: 'Account',
          entityId: record.accountId,
        },
      });
    });
  }

  async forgotPassword(email: string): Promise<{ resetToken: string } | null> {
    const account = await prisma.account.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!account || account.status === 'DELETED') {
      return null;
    }

    const resetToken = generateSecureToken();
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        accountId: account.id,
        tokenHash,
        expiresAt,
      },
    });

    return { resetToken };
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      await tx.account.update({
        where: { id: resetRecord.accountId },
        data: { passwordHash },
      });

      // Revoke all existing sessions for security
      await tx.session.updateMany({
        where: { accountId: resetRecord.accountId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          accountId: resetRecord.accountId,
          action: 'AUTH_PASSWORD_RESET',
          entityType: 'Account',
          entityId: resetRecord.accountId,
        },
      });
    });
  }

  async changePassword(accountId: string, currentPassword: string, newPassword: string): Promise<void> {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundError('Account not found');

    const isValid = await verifyPassword(currentPassword, account.passwordHash);
    if (!isValid) throw new UnauthorizedError('Current password is incorrect');

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: accountId },
        data: { passwordHash },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          action: 'AUTH_PASSWORD_CHANGED',
          entityType: 'Account',
          entityId: accountId,
        },
      });
    });
  }

  async changeEmail(accountId: string, currentPassword: string, newEmail: string): Promise<{ verificationToken: string }> {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundError('Account not found');

    const isValid = await verifyPassword(currentPassword, account.passwordHash);
    if (!isValid) throw new UnauthorizedError('Current password is incorrect');

    const normalized = newEmail.toLowerCase().trim();
    const existing = await prisma.account.findUnique({ where: { email: normalized } });
    if (existing) throw new ConflictError('Email is already in use by another account');

    const verificationToken = generateSecureToken();
    const tokenHash = hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: accountId },
        data: { pendingNewEmail: normalized },
      });

      await tx.emailVerificationToken.create({
        data: {
          accountId,
          tokenHash,
          targetEmail: normalized,
          expiresAt,
        },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          action: 'AUTH_EMAIL_CHANGE_REQUESTED',
          entityType: 'Account',
          entityId: accountId,
        },
      });
    });

    return { verificationToken };
  }
}

export const authService = new AuthService();
