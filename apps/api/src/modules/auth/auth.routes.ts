import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth, verifyCsrf } from './auth.middleware';

const router = Router();

// Public auth routes
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.post('/verify-email', (req, res, next) => authController.verifyEmail(req, res, next));
router.post('/forgot-password', (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));

// Protected auth routes (requires valid session & CSRF verification on mutations)
router.get('/me', requireAuth, (req, res, next) => authController.getMe(req, res, next));
router.post('/logout-all', requireAuth, verifyCsrf, (req, res, next) => authController.logoutAll(req, res, next));
router.post('/change-password', requireAuth, verifyCsrf, (req, res, next) => authController.changePassword(req, res, next));
router.post('/change-email', requireAuth, verifyCsrf, (req, res, next) => authController.changeEmail(req, res, next));

export const authRoutes = router;
