import { Request, Response, NextFunction } from 'express';
import { treatmentService } from './treatment.service';
import { createTreatmentSchema, updateTreatmentStatusSchema } from './treatment.schema';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error';
import { TreatmentStatus } from '@prisma/client';

export class TreatmentController {
  async getTreatments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const patientProfileId = req.query.patientProfileId as string;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const status = req.query.status as TreatmentStatus | undefined;
      const treatments = await treatmentService.getTreatments(patientProfileId, req.account.id, status);
      sendSuccess(res, treatments);
    } catch (error) {
      next(error);
    }
  }

  async getTreatmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const treatment = await treatmentService.getTreatmentById(req.params.id as string, req.account.id);
      sendSuccess(res, treatment);
    } catch (error) {
      next(error);
    }
  }

  async createTreatment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const data = createTreatmentSchema.parse(req.body);
      const treatment = await treatmentService.createTreatment(data.patientProfileId, req.account.id, data);
      sendSuccess(res, treatment, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const data = updateTreatmentStatusSchema.parse(req.body);
      const updated = await treatmentService.updateStatus(req.params.id as string, req.account.id, data);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }
}

export const treatmentController = new TreatmentController();
