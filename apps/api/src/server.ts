import { createApp } from './app/app';
import { env } from './config/env';
import { logger } from './shared/logging/logger';
import { dbQueue } from './infrastructure/queue/db-queue';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Prescriptionly API server listening on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);

  // Start background queue processing within modular monolith
  dbQueue.startWorkerLoop(4000);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
