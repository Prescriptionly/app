import { Router } from 'express';
import { treatmentController } from './treatment.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => treatmentController.getTreatments(req, res, next));
router.get('/:id', (req, res, next) => treatmentController.getTreatmentById(req, res, next));
router.post('/', verifyCsrf, (req, res, next) => treatmentController.createTreatment(req, res, next));
router.patch('/:id/status', verifyCsrf, (req, res, next) => treatmentController.updateStatus(req, res, next));

export const treatmentRoutes = router;
