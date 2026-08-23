import { Request, Response, NextFunction } from 'express';
import { sharingService } from './sharing.service';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error';

export class SharingController {
  async createGrant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const { patientProfileId, recipientLabel, allowedCategories, expiresInHours, dateStart, dateEnd } = req.body;
      if (!patientProfileId || !recipientLabel || !allowedCategories) {
        throw new ValidationError('patientProfileId, recipientLabel, and allowedCategories are required');
      }

      const result = await sharingService.createShareGrant(patientProfileId, req.account.id, {
        recipientLabel,
        allowedCategories,
        expiresInHours,
        dateStart,
        dateEnd,
      });

      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async getGrants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const patientProfileId = req.query.patientProfileId as string;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const grants = await sharingService.getShareGrants(patientProfileId, req.account.id);
      sendSuccess(res, grants);
    } catch (error) {
      next(error);
    }
  }

  async revokeGrant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const updated = await sharingService.revokeShareGrant(req.params.id as string, req.account.id);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }

  async viewSharedWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token as string;
      if (!token) throw new ValidationError('Share token is required');

      const data = await sharingService.accessSharedWallet(token);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }
}

export const sharingController = new SharingController();
