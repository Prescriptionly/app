import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireAuth, requireAdmin, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/metrics', (req, res, next) => adminController.getMetrics(req, res, next));
router.get('/jobs', (req, res, next) => adminController.getJobs(req, res, next));
router.post('/jobs/:id/retry', verifyCsrf, (req, res, next) => adminController.retryJob(req, res, next));

export const adminRoutes = router;
