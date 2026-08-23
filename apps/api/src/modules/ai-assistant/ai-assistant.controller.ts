import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error';
import { sendSuccess } from '../../shared/http/response';
import { aiAssistantService } from './ai-assistant.service';

export class AiAssistantController {
  async ask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const { documentId, question } = req.body;
      if (!documentId || !question) {
        throw new ValidationError('documentId and question are required');
      }

      const response = await aiAssistantService.askDocument(documentId, req.account.id, question);
      sendSuccess(res, response);
    } catch (error) {
      next(error);
    }
  }
}

export const aiAssistantController = new AiAssistantController();
