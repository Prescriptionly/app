import { Request, Response, NextFunction } from 'express';
import { exportService } from './export.service';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error';
import { ExportFormat } from '@prisma/client';

export class ExportController {
  async createJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const { patientProfileId, format, filterScope } = req.body;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const job = await exportService.createExportJob(
        patientProfileId,
        req.account.id,
        (format as ExportFormat) || 'PDF',
        filterScope
      );
      sendSuccess(res, job, 201);
    } catch (error) {
      next(error);
    }
  }

  async getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const patientProfileId = req.query.patientProfileId as string;
      if (!patientProfileId) throw new ValidationError('patientProfileId is required');

      const jobs = await exportService.getJobs(patientProfileId, req.account.id);
      sendSuccess(res, jobs);
    } catch (error) {
      next(error);
    }
  }

  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const fileInfo = await exportService.downloadExport(req.params.id as string, req.account.id);
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
      res.sendFile(fileInfo.filePath);
    } catch (error) {
      next(error);
    }
  }
}

export const exportController = new ExportController();
