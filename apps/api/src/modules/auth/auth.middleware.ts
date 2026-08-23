import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { CsrfError, ForbiddenError, UnauthorizedError } from '../../shared/errors/app-error';
import { Account, Session } from '@prisma/client';

export const SESSION_COOKIE_NAME = 'prescriptionly_session';
export const CSRF_HEADER_NAME = 'x-csrf-token';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      account?: Account;
      session?: Session;
    }
  }
}

export async function authenticateOptional(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (rawToken && typeof rawToken === 'string') {
      const result = await authService.validateSession(rawToken);
      if (result) {
        req.account = result.account;
        req.session = result.session;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (!rawToken || typeof rawToken !== 'string') {
      throw new UnauthorizedError('Authentication required');
    }

    const result = await authService.validateSession(rawToken);
    if (!result) {
      throw new UnauthorizedError('Session expired or invalid');
    }

    req.account = result.account;
    req.session = result.session;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.account?.isAdmin) {
    throw new ForbiddenError('Administrative access required');
  }
  next();
}

export function verifyCsrf(req: Request, _res: Response, next: NextFunction): void {
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (safeMethods.has(req.method)) {
    return next();
  }

  // Exempt public auth endpoints that create sessions
  const publicMutations = ['/api/v1/auth/register', '/api/v1/auth/login', '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password', '/api/v1/auth/verify-email'];
  if (publicMutations.some((route) => req.originalUrl.startsWith(route))) {
    return next();
  }

  const clientCsrf = req.headers[CSRF_HEADER_NAME] || req.headers['x-csrf-token'];
  if (!clientCsrf || typeof clientCsrf !== 'string' || !req.session?.csrfToken) {
    throw new CsrfError('Missing CSRF token');
  }

  if (clientCsrf !== req.session.csrfToken) {
    throw new CsrfError('Invalid CSRF token');
  }

  next();
}
