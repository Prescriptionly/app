import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from '../config/env';
import { requestLogger } from '../shared/middleware/request-logger';
import { errorHandler } from '../shared/middleware/error-handler';
import { appRouter } from './routes';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [env.APP_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLogger);

  // Routes
  app.use(appRouter);

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
