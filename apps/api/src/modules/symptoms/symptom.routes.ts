import { Router } from 'express';
import { symptomController } from './symptom.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => symptomController.getSymptoms(req, res, next));
router.post('/', verifyCsrf, (req, res, next) => symptomController.createSymptom(req, res, next));
router.delete('/:id', verifyCsrf, (req, res, next) => symptomController.deleteSymptom(req, res, next));

export const symptomRoutes = router;
