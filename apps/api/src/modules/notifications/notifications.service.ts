import { prisma } from '../../infrastructure/database/prisma';
import { NotificationType } from '@prisma/client';

export class NotificationsService {
  async getNotifications(accountId: string) {
    return prisma.notification.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, accountId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, accountId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(accountId: string) {
    return prisma.notification.updateMany({
      where: { accountId, isRead: false },
      data: { isRead: true },
    });
  }

  async createNotification(
    accountId: string,
    title: string,
    message: string,
    type: NotificationType = 'SYSTEM',
    linkUrl?: string
  ) {
    return prisma.notification.create({
      data: {
        accountId,
        title,
        message,
        type,
        linkUrl,
      },
    });
  }
}

export const notificationsService = new NotificationsService();
