import { Request, Response, NextFunction } from 'express';
import { patientService } from './patient.service';
import { createProfileSchema, updateProfileSchema } from './patient.schema';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class PatientController {
  async getProfiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const profiles = await patientService.getProfilesForAccount(req.account.id);
      sendSuccess(res, profiles);
    } catch (error) {
      next(error);
    }
  }

  async getPrimaryProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const profile = await patientService.getPrimaryProfile(req.account.id);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async getProfileById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const profile = await patientService.getProfileById(req.params.id as string, req.account.id);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async createProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const data = createProfileSchema.parse(req.body);
      const profile = await patientService.createProfile(req.account.id, data);
      sendSuccess(res, profile, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const data = updateProfileSchema.parse(req.body);
      const profile = await patientService.updateProfile(req.params.id as string, req.account.id, data);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async deleteProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      await patientService.deleteProfile(req.params.id as string, req.account.id);
      sendSuccess(res, { message: 'Patient profile deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const patientController = new PatientController();
