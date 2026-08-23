import { Request, Response, NextFunction } from 'express';
import { timelineService, TimelineProvenance } from './timeline.service';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error';

export class TimelineController {
  async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const patientProfileId = req.query.patientProfileId as string;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const provenance = req.query.provenance as TimelineProvenance | undefined;
      const type = req.query.type as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const timeline = await timelineService.getTimeline(patientProfileId, req.account.id, {
        provenance,
        type,
        startDate,
        endDate,
      });

      sendSuccess(res, timeline);
    } catch (error) {
      next(error);
    }
  }
}

export const timelineController = new TimelineController();
