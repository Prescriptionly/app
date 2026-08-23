import { Router } from 'express';
import multer from 'multer';
import { documentController } from './document.controller';
import { requireAuth, verifyCsrf } from '../auth/auth.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => documentController.getDocuments(req, res, next));
router.get('/:id', (req, res, next) => documentController.getDocumentById(req, res, next));
router.get('/version/:versionId/download', (req, res, next) => documentController.downloadVersion(req, res, next));
router.post('/upload', upload.single('file'), verifyCsrf, (req, res, next) => documentController.uploadDocument(req, res, next));
router.post('/:id/archive', verifyCsrf, (req, res, next) => documentController.archiveDocument(req, res, next));
router.delete('/:id', verifyCsrf, (req, res, next) => documentController.deleteDocument(req, res, next));

export const documentRoutes = router;
