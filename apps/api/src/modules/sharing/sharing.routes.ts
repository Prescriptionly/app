import { Router } from 'express';
import { sharingController } from './sharing.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

// Public shared view endpoint
router.get('/view/:token', (req, res, next) => sharingController.viewSharedWallet(req, res, next));

// Protected sharing management endpoints
router.get('/', requireAuth, (req, res, next) => sharingController.getGrants(req, res, next));
router.post('/', requireAuth, verifyCsrf, (req, res, next) => sharingController.createGrant(req, res, next));
router.post('/:id/revoke', requireAuth, verifyCsrf, (req, res, next) => sharingController.revokeGrant(req, res, next));

export const sharingRoutes = router;
