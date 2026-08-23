import { Request, Response, NextFunction } from 'express';
import { documentService } from './document.service';
import { createDocumentSchema, updateDocumentSchema } from './document.schema';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error';
import { DocumentCategory, DocumentStatus } from '@prisma/client';

export class DocumentController {
  async getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const patientProfileId = req.query.patientProfileId as string;
      if (!patientProfileId) {
        throw new ValidationError('patientProfileId query parameter is required');
      }

      const category = req.query.category as DocumentCategory | undefined;
      const status = req.query.status as DocumentStatus | undefined;
      const search = req.query.search as string | undefined;

      const docs = await documentService.getDocuments(patientProfileId, req.account.id, {
        category,
        status,
        search,
      });

      sendSuccess(res, docs);
    } catch (error) {
      next(error);
    }
  }

  async getDocumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const doc = await documentService.getDocumentById(req.params.id as string, req.account.id);
      sendSuccess(res, doc);
    } catch (error) {
      next(error);
    }
  }

  async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      const data = createDocumentSchema.parse(req.body);
      const doc = await documentService.uploadDocument(data.patientProfileId, req.account.id, req.file, {
        title: data.title,
        category: data.category,
        notes: data.notes,
      });

      sendSuccess(res, doc, 201);
    } catch (error) {
      next(error);
    }
  }

  async downloadVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const info = await documentService.getDownloadStream(req.params.versionId as string, req.account.id);
      res.setHeader('Content-Type', info.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${info.fileName}"`);
      res.sendFile(info.filePath);
    } catch (error) {
      next(error);
    }
  }

  async archiveDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const doc = await documentService.archiveDocument(req.params.id as string, req.account.id);
      sendSuccess(res, doc);
    } catch (error) {
      next(error);
    }
  }

  async deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      await documentService.deleteDocument(req.params.id as string, req.account.id);
      sendSuccess(res, { message: 'Document deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const documentController = new DocumentController();
