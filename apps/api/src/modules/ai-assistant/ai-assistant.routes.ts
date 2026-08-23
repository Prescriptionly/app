import { Router } from 'express';
import { aiAssistantController } from './ai-assistant.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/ask', verifyCsrf, (req, res, next) => aiAssistantController.ask(req, res, next));

export const aiAssistantRoutes = router;
