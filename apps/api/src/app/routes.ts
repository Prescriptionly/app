import { Router } from 'express';
import { prisma } from '../infrastructure/database/prisma';
import { authRoutes } from '../modules/auth/auth.routes';
import { patientRoutes } from '../modules/patients/patient.routes';
import { documentRoutes } from '../modules/documents/document.routes';
import { ocrRoutes } from '../modules/ocr/ocr.routes';
import { medicationRoutes } from '../modules/medications/medication.routes';
import { prescriptionRoutes } from '../modules/prescriptions/prescription.routes';
import { treatmentRoutes } from '../modules/treatments/treatment.routes';
import { medicationEventRoutes } from '../modules/medication-events/medication-event.routes';
import { timelineRoutes } from '../modules/timeline/timeline.routes';
import { symptomRoutes } from '../modules/symptoms/symptom.routes';
import { aiAssistantRoutes } from '../modules/ai-assistant/ai-assistant.routes';
import { summaryRoutes } from '../modules/summaries/summary.routes';
import { exportRoutes } from '../modules/exports/export.routes';
import { sharingRoutes } from '../modules/sharing/sharing.routes';
import { emergencyRoutes } from '../modules/emergency/emergency.routes';
import { notificationsRoutes } from '../modules/notifications/notifications.routes';
import { privacyRoutes } from '../modules/privacy/privacy.routes';
import { adminRoutes } from '../modules/admin/admin.routes';
import { sendSuccess } from '../shared/http/response';

const router = Router();

// Health and Readiness
router.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/health/ready', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, {
      status: 'READY',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Mount module routers under /api/v1
const v1 = Router();
v1.use('/auth', authRoutes);
v1.use('/patients', patientRoutes);
v1.use('/documents', documentRoutes);
v1.use('/ocr', ocrRoutes);
v1.use('/medications', medicationRoutes);
v1.use('/prescriptions', prescriptionRoutes);
v1.use('/treatments', treatmentRoutes);
v1.use('/medication-events', medicationEventRoutes);
v1.use('/timeline', timelineRoutes);
v1.use('/symptoms', symptomRoutes);
v1.use('/ai-assistant', aiAssistantRoutes);
v1.use('/summaries', summaryRoutes);
v1.use('/exports', exportRoutes);
v1.use('/sharing', sharingRoutes);
v1.use('/emergency', emergencyRoutes);
v1.use('/notifications', notificationsRoutes);
v1.use('/privacy', privacyRoutes);
v1.use('/admin', adminRoutes);

router.use('/api/v1', v1);

export const appRouter = router;
