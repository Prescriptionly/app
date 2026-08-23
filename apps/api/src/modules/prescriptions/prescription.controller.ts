import { Request, Response, NextFunction } from 'express';
import { prescriptionService } from './prescription.service';
import { createPrescriptionSchema, updatePrescriptionSchema } from './prescription.schema';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error';

export class PrescriptionController {
  async getPrescriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const patientProfileId = req.query.patientProfileId as string;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const prescriptions = await prescriptionService.getPrescriptions(patientProfileId, req.account.id);
      sendSuccess(res, prescriptions);
    } catch (error) {
      next(error);
    }
  }

  async getPrescriptionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const prescription = await prescriptionService.getPrescriptionById(req.params.id as string, req.account.id);
      sendSuccess(res, prescription);
    } catch (error) {
      next(error);
    }
  }

  async createPrescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const data = createPrescriptionSchema.parse(req.body);
      const prescription = await prescriptionService.createPrescription(data.patientProfileId, req.account.id, data);
      sendSuccess(res, prescription, 201);
    } catch (error) {
      next(error);
    }
  }

  async deletePrescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      await prescriptionService.deletePrescription(req.params.id as string, req.account.id);
      sendSuccess(res, { message: 'Prescription cancelled' });
    } catch (error) {
      next(error);
    }
  }
}

export const prescriptionController = new PrescriptionController();
