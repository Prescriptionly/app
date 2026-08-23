import { Router } from 'express';
import { prescriptionController } from './prescription.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => prescriptionController.getPrescriptions(req, res, next));
router.get('/:id', (req, res, next) => prescriptionController.getPrescriptionById(req, res, next));
router.post('/', verifyCsrf, (req, res, next) => prescriptionController.createPrescription(req, res, next));
router.delete('/:id', verifyCsrf, (req, res, next) => prescriptionController.deletePrescription(req, res, next));

export const prescriptionRoutes = router;
