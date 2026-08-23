import { Router } from 'express';
import { exportController } from './export.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => exportController.getJobs(req, res, next));
router.get('/:id/download', (req, res, next) => exportController.download(req, res, next));
router.post('/', verifyCsrf, (req, res, next) => exportController.createJob(req, res, next));

export const exportRoutes = router;
