import { Router } from 'express';
import { timelineController } from './timeline.controller';
import { requireAuth } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => timelineController.getTimeline(req, res, next));

export const timelineRoutes = router;
