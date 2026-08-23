import { Router } from 'express';
import { patientController } from './patient.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => patientController.getProfiles(req, res, next));
router.get('/primary', (req, res, next) => patientController.getPrimaryProfile(req, res, next));
router.get('/:id', (req, res, next) => patientController.getProfileById(req, res, next));
router.post('/', verifyCsrf, (req, res, next) => patientController.createProfile(req, res, next));
router.patch('/:id', verifyCsrf, (req, res, next) => patientController.updateProfile(req, res, next));
router.delete('/:id', verifyCsrf, (req, res, next) => patientController.deleteProfile(req, res, next));

export const patientRoutes = router;
