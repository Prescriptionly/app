import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { logger } from '../logging/logger';
import { sendError } from '../http/response';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[AppError] ${err.message}`, err, { path: req.path, method: req.method });
    } else {
      logger.warn(`[AppWarning] ${err.message}`, { path: req.path, method: req.method, code: err.code });
    }
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  if (err instanceof ZodError) {
    logger.warn(`[ValidationError] Schema validation failed`, { path: req.path, issues: err.issues });
    sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', err.issues);
    return;
  }

  logger.error(`[UnhandledError] ${err.message}`, err, { path: req.path, method: req.method });
  sendError(res, 'An unexpected server error occurred', 500, 'INTERNAL_SERVER_ERROR');
}
