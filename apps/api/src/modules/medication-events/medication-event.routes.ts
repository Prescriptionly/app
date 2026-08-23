import { Router } from 'express';
import { medicationEventController } from './medication-event.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => medicationEventController.getEvents(req, res, next));
router.get('/prescribed-vs-actual', (req, res, next) => medicationEventController.getPrescribedVsActual(req, res, next));
router.post('/', verifyCsrf, (req, res, next) => medicationEventController.logEvent(req, res, next));
router.patch('/:id/correct', verifyCsrf, (req, res, next) => medicationEventController.correctEvent(req, res, next));

export const medicationEventRoutes = router;
