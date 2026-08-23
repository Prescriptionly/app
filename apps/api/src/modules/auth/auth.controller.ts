import { Request, Response, NextFunction } from 'express';
import { authService, SESSION_EXPIRY_DAYS } from './auth.service';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  changeEmailSchema,
} from './auth.schema';
import { sendSuccess } from '../../shared/http/response';
import { env } from '../../config/env';
import { SESSION_COOKIE_NAME } from './auth.middleware';

function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none',
    path: '/',
    expires: expiresAt,
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none',
    path: '/',
  });
}

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = registerSchema.parse(req.body);
      const result = await authService.register({
        ...data,
        ip: req.ip,
      });

      sendSuccess(
        res,
        {
          account: result.account,
          verificationToken: env.NODE_ENV !== 'production' ? result.verificationToken : undefined,
          message: 'Registration successful',
        },
        201
      );
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login({
        ...data,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      setSessionCookie(res, result.sessionToken, result.expiresAt);

      sendSuccess(res, {
        account: result.account,
        csrfToken: result.csrfToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
      if (rawToken && typeof rawToken === 'string') {
        await authService.logout(rawToken);
      }
      clearSessionCookie(res);
      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.account?.id) {
        await authService.logoutAll(req.account.id);
      }
      clearSessionCookie(res);
      sendSuccess(res, { message: 'All sessions revoked' });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) {
        return;
      }
      const account = await authService.getMe(req.account.id);
      sendSuccess(res, {
        account,
        csrfToken: req.session?.csrfToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = verifyEmailSchema.parse(req.body);
      await authService.verifyEmail(token);
      sendSuccess(res, { message: 'Email successfully verified' });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(email);
      sendSuccess(res, {
        message: 'If an account exists, a reset link has been dispatched',
        resetToken: env.NODE_ENV !== 'production' ? result?.resetToken : undefined,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      await authService.resetPassword(token, newPassword);
      clearSessionCookie(res);
      sendSuccess(res, { message: 'Password reset successfully. Please sign in with your new password.' });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) return;
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      await authService.changePassword(req.account.id, currentPassword, newPassword);
      sendSuccess(res, { message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async changeEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) return;
      const { currentPassword, newEmail } = changeEmailSchema.parse(req.body);
      const result = await authService.changeEmail(req.account.id, currentPassword, newEmail);
      sendSuccess(res, {
        message: 'Verification link sent to new email address',
        verificationToken: env.NODE_ENV !== 'production' ? result.verificationToken : undefined,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
