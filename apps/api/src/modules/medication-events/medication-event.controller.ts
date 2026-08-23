import { Request, Response, NextFunction } from 'express';
import { medicationEventService } from './medication-event.service';
import { logMedicationEventSchema, correctMedicationEventSchema } from './medication-event.schema';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error';
import { MedicationAction } from '@prisma/client';

export class MedicationEventController {
  async logEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const data = logMedicationEventSchema.parse(req.body);
      const event = await medicationEventService.logEvent(data.patientProfileId, req.account.id, data);
      sendSuccess(res, event, 201);
    } catch (error) {
      next(error);
    }
  }

  async correctEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const data = correctMedicationEventSchema.parse(req.body);
      const updated = await medicationEventService.correctEvent(req.params.id as string, req.account.id, data);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }

  async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const patientProfileId = req.query.patientProfileId as string;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const treatmentId = req.query.treatmentId as string | undefined;
      const action = req.query.action as MedicationAction | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const events = await medicationEventService.getEvents(patientProfileId, req.account.id, {
        treatmentId,
        action,
        startDate,
        endDate,
      });

      sendSuccess(res, events);
    } catch (error) {
      next(error);
    }
  }

  async getPrescribedVsActual(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const patientProfileId = req.query.patientProfileId as string;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const dateStr = req.query.date as string | undefined;
      const result = await medicationEventService.getPrescribedVsActual(patientProfileId, req.account.id, dateStr);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const medicationEventController = new MedicationEventController();
