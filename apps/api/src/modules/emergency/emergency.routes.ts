import { Router } from 'express';
import { emergencyController } from './emergency.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

// Public emergency card access
router.get('/public/:token', (req, res, next) => emergencyController.getPublicCard(req, res, next));

// Protected profile settings
router.get('/', requireAuth, (req, res, next) => emergencyController.getProfile(req, res, next));
router.post('/update', requireAuth, verifyCsrf, (req, res, next) => emergencyController.updateProfile(req, res, next));

export const emergencyRoutes = router;
