import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { sendSuccess } from '../../shared/http/response';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class NotificationsController {
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      const list = await notificationsService.getNotifications(req.account.id);
      sendSuccess(res, list);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      await notificationsService.markAsRead(req.params.id as string, req.account.id);
      sendSuccess(res, { message: 'Notification marked as read' });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.account?.id) throw new UnauthorizedError();
      await notificationsService.markAllAsRead(req.account.id);
      sendSuccess(res, { message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();
