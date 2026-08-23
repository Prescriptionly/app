import { prisma } from '../database/prisma';
import { ocrService } from '../../modules/ocr/ocr.service';
import { logger } from '../../shared/logging/logger';
import { BackgroundJob, BackgroundJobType } from '@prisma/client';

export class DbQueue {
  private isProcessing = false;

  async enqueue(
    jobType: BackgroundJobType,
    payload: Record<string, unknown>,
    patientProfileId?: string,
    deduplicationKey?: string
  ): Promise<BackgroundJob> {
    if (deduplicationKey) {
      const existing = await prisma.backgroundJob.findUnique({
        where: { deduplicationKey },
      });
      if (existing && existing.status !== 'FAILED') {
        return existing;
      }
    }

    return prisma.backgroundJob.create({
      data: {
        jobType,
        payloadJson: JSON.stringify(payload),
        patientProfileId: patientProfileId || null,
        deduplicationKey: deduplicationKey || null,
        status: 'PENDING',
      },
    });
  }

  async processNextJob(): Promise<boolean> {
    if (this.isProcessing) return false;
    this.isProcessing = true;

    try {
      // Atomic claim of oldest pending job
      const candidate = await prisma.backgroundJob.findFirst({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: new Date() },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      if (!candidate) {
        this.isProcessing = false;
        return false;
      }

      // Lock job
      const lockedJob = await prisma.backgroundJob.updateMany({
        where: { id: candidate.id, status: 'PENDING' },
        data: {
          status: 'PROCESSING',
          lockedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      if (lockedJob.count === 0) {
        this.isProcessing = false;
        return false;
      }

      logger.info(`[Worker] Processing job ${candidate.id} (${candidate.jobType}) attempt ${candidate.attempts + 1}`);

      const payload = JSON.parse(candidate.payloadJson);
      await this.executeJob(candidate.jobType, payload);

      await prisma.backgroundJob.update({
        where: { id: candidate.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      logger.info(`[Worker] Job ${candidate.id} completed successfully`);
      this.isProcessing = false;
      return true;
    } catch (error) {
      logger.error('[Worker] Job processing error', error);
      this.isProcessing = false;
      return false;
    }
  }

  private async executeJob(type: BackgroundJobType, payload: Record<string, unknown>): Promise<void> {
    switch (type) {
      case 'OCR_PROCESSING':
        if (payload.documentVersionId && typeof payload.documentVersionId === 'string') {
          await ocrService.processExtractionDraft(payload.documentVersionId);
        }
        break;
      case 'DATA_CLEANUP':
        logger.info('[Worker] Executing scheduled data retention cleanup');
        break;
      default:
        logger.info(`[Worker] Executed generic job ${type}`);
    }
  }

  startWorkerLoop(intervalMs = 3000): NodeJS.Timeout {
    logger.info('[Worker] Background queue worker loop initialized');
    return setInterval(async () => {
      try {
        await this.processNextJob();
      } catch (err) {
        logger.error('[Worker] Error in background worker loop', err);
      }
    }, intervalMs);
  }
}

export const dbQueue = new DbQueue();
