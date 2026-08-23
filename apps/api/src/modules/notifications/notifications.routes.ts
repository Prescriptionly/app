import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => notificationsController.getNotifications(req, res, next));
router.post('/:id/read', verifyCsrf, (req, res, next) => notificationsController.markAsRead(req, res, next));
router.post('/read-all', verifyCsrf, (req, res, next) => notificationsController.markAllAsRead(req, res, next));

export const notificationsRoutes = router;
