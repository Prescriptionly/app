import { Request, Response, NextFunction } from 'express';
import { privacyService } from './privacy.service';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error';

export class PrivacyController {
  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const logs = await privacyService.getAuditLogs(req.account.id);
      sendSuccess(res, logs);
    } catch (error) {
      next(error);
    }
  }

  async getConsents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const consents = await privacyService.getConsents(req.account.id);
      sendSuccess(res, consents);
    } catch (error) {
      next(error);
    }
  }

  async recordConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const { consentType, granted } = req.body;
      if (!consentType) throw new ValidationError('consentType is required');

      const consent = await privacyService.recordConsent(
        req.account.id,
        consentType,
        granted ?? true,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, consent, 201);
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      await privacyService.requestAccountDeletion(req.account.id);
      sendSuccess(res, { message: 'Account and associated profiles have been successfully deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const privacyController = new PrivacyController();
