import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { sendSuccess } from '../../shared/http/response';

export class AdminController {
  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await adminService.getSystemMetrics();
      sendSuccess(res, metrics);
    } catch (error) {
      next(error);
    }
  }

  async getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | undefined;
      const jobs = await adminService.getBackgroundJobs(status);
      sendSuccess(res, jobs);
    } catch (error) {
      next(error);
    }
  }

  async retryJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await adminService.retryJob(req.params.id as string);
      sendSuccess(res, job);
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
