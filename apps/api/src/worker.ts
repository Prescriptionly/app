import { dbQueue } from './infrastructure/queue/db-queue';
import { logger } from './shared/logging/logger';

logger.info('🚀 Prescriptionly Standalone Worker starting...');
dbQueue.startWorkerLoop(2000);
