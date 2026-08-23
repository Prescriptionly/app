import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError } from '../../shared/errors/app-error';

export class AdminService {
  async getSystemMetrics() {
    const [accountCount, documentCount, prescriptionCount, eventCount, pendingJobsCount, failedJobsCount] =
      await Promise.all([
        prisma.account.count({ where: { deletedAt: null } }),
        prisma.document.count({ where: { deletedAt: null } }),
        prisma.prescription.count({ where: { deletedAt: null } }),
        prisma.medicationEvent.count(),
        prisma.backgroundJob.count({ where: { status: 'PENDING' } }),
        prisma.backgroundJob.count({ where: { status: 'FAILED' } }),
      ]);

    return {
      accounts: accountCount,
      documents: documentCount,
      prescriptions: prescriptionCount,
      events: eventCount,
      queue: {
        pending: pendingJobsCount,
        failed: failedJobsCount,
      },
      systemHealth: 'OPERATIONAL',
      timestamp: new Date().toISOString(),
    };
  }

  async getBackgroundJobs(status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED') {
    return prisma.backgroundJob.findMany({
      where: status ? { status } : undefined,
      select: {
        id: true,
        jobType: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        scheduledAt: true,
        lockedAt: true,
        completedAt: true,
        lastError: true,
        deduplicationKey: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async retryJob(jobId: string) {
    const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundError('Job not found');

    return prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        attempts: 0,
        lastError: null,
        scheduledAt: new Date(),
      },
    });
  }
}

export const adminService = new AdminService();
