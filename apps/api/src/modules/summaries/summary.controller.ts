import { Request, Response, NextFunction } from 'express';
import { summaryService } from './summary.service';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error';
import { SummaryType } from '@prisma/client';

export class SummaryController {
  async generateSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const { patientProfileId, summaryType } = req.body;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const summary = await summaryService.generateSummary(patientProfileId, req.account.id, summaryType as SummaryType);
      sendSuccess(res, summary, 201);
    } catch (error) {
      next(error);
    }
  }

  async getSummaries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const patientProfileId = req.query.patientProfileId as string;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const summaries = await summaryService.getSummaries(patientProfileId, req.account.id);
      sendSuccess(res, summaries);
    } catch (error) {
      next(error);
    }
  }
}

export const summaryController = new SummaryController();
