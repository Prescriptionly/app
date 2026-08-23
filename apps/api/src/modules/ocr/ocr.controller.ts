import { Request, Response, NextFunction } from 'express';
import { ocrService } from './ocr.service';
import { confirmExtractionSchema } from './ocr.schema';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class OcrController {
  async getExtraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const extraction = await ocrService.getExtraction(req.params.id as string, req.account.id);
      sendSuccess(res, extraction);
    } catch (error) {
      next(error);
    }
  }

  async triggerProcess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const versionId = req.params.versionId as string;
      await ocrService.processExtractionDraft(versionId);
      sendSuccess(res, { message: 'OCR processing completed' });
    } catch (error) {
      next(error);
    }
  }

  async confirmExtraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const data = confirmExtractionSchema.parse(req.body);
      const prescription = await ocrService.confirmExtraction(data.extractionId, req.account.id, {
        prescriberName: data.prescriberName,
        clinicName: data.clinicName,
        prescribedDate: data.prescribedDate,
        notes: data.notes,
        medications: data.medications,
      });

      sendSuccess(res, prescription, 201);
    } catch (error) {
      next(error);
    }
  }
}

export const ocrController = new OcrController();
