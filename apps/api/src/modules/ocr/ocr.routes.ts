import { Router } from 'express';
import { ocrController } from './ocr.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/:id', (req, res, next) => ocrController.getExtraction(req, res, next));
router.post('/process/:versionId', verifyCsrf, (req, res, next) => ocrController.triggerProcess(req, res, next));
router.post('/confirm', verifyCsrf, (req, res, next) => ocrController.confirmExtraction(req, res, next));

export const ocrRoutes = router;
