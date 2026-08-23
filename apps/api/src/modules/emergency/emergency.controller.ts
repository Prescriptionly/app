import { Request, Response, NextFunction } from 'express';
import { emergencyService } from './emergency.service';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error';

export class EmergencyController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const patientProfileId = req.query.patientProfileId as string;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const profile = await emergencyService.getEmergencyProfile(patientProfileId, req.account.id);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const { patientProfileId, emergencyContacts, selectedAllergies, selectedMedicationIds, medicalNotes, isEnabled } = req.body;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const profile = await emergencyService.updateEmergencyProfile(patientProfileId, req.account.id, {
        emergencyContacts,
        selectedAllergies,
        selectedMedicationIds,
        medicalNotes,
        isEnabled,
      });

      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async getPublicCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token as string;
      const card = await emergencyService.getPublicEmergencyCard(token);
      sendSuccess(res, card);
    } catch (error) {
      next(error);
    }
  }
}

export const emergencyController = new EmergencyController();
