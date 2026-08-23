import { Router } from 'express';
import { medicationController } from './medication.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/search', (req, res, next) => medicationController.search(req, res, next));
router.post('/custom', verifyCsrf, (req, res, next) => medicationController.createCustom(req, res, next));

export const medicationRoutes = router;
