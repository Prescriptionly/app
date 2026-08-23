import { Router } from 'express';
import { privacyController } from './privacy.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/audit-log', (req, res, next) => privacyController.getAuditLogs(req, res, next));
router.get('/consents', (req, res, next) => privacyController.getConsents(req, res, next));
router.post('/consent', verifyCsrf, (req, res, next) => privacyController.recordConsent(req, res, next));
router.post('/delete-account', verifyCsrf, (req, res, next) => privacyController.deleteAccount(req, res, next));

export const privacyRoutes = router;
