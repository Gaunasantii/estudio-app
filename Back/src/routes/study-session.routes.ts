import { Router } from 'express';
import { studySessionController } from '../controllers/study-session.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', (req, res) => studySessionController.create(req, res));
router.get('/', (req, res) => studySessionController.findAll(req, res));
router.get('/heatmap', (req, res) => studySessionController.getHeatmapStats(req, res));
router.get('/stats', (req, res) => studySessionController.getHeatmapStats(req, res));
router.get('/:id', (req, res) => studySessionController.findById(req, res));
router.put('/:id', (req, res) => studySessionController.update(req, res));
router.delete('/:id', (req, res) => studySessionController.delete(req, res));

export default router;
