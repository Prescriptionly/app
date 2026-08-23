import { Request, Response, NextFunction } from 'express';
import { symptomService } from './symptom.service';
import { createSymptomSchema } from './symptom.schema';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error';

export class SymptomController {
  async getSymptoms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const patientProfileId = req.query.patientProfileId as string;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const symptoms = await symptomService.getSymptoms(patientProfileId, req.account.id);
      sendSuccess(res, symptoms);
    } catch (error) {
      next(error);
    }
  }

  async createSymptom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const data = createSymptomSchema.parse(req.body);
      const symptom = await symptomService.createSymptom(data.patientProfileId, req.account.id, data);
      sendSuccess(res, symptom, 201);
    } catch (error) {
      next(error);
    }
  }

  async deleteSymptom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      await symptomService.deleteSymptom(req.params.id as string, req.account.id);
      sendSuccess(res, { message: 'Symptom deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const symptomController = new SymptomController();
