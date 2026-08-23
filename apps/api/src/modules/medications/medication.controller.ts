import { Request, Response, NextFunction } from 'express';
import { medicationService } from './medication.service';
import { createMedicationConceptSchema } from './medication.schema';
import { sendSuccess } from '../../shared/http/response';
import { DosageForm } from '@prisma/client';

export class MedicationController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query.q as string | undefined;
      const form = req.query.form as DosageForm | undefined;
      const results = await medicationService.search(q, form);
      sendSuccess(res, results);
    } catch (error) {
      next(error);
    }
  }

  async createCustom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createMedicationConceptSchema.parse(req.body);
      const created = await medicationService.createCustom(data);
      sendSuccess(res, created, 201);
    } catch (error) {
      next(error);
    }
  }
}

export const medicationController = new MedicationController();
