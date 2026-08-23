import { Router } from 'express';
import { summaryController } from './summary.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => summaryController.getSummaries(req, res, next));
router.post('/generate', verifyCsrf, (req, res, next) => summaryController.generateSummary(req, res, next));

export const summaryRoutes = router;
