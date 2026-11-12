import { Router } from 'express';
import { classScheduleController } from '../controllers/class-schedule.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', (req, res) => classScheduleController.create(req, res));
router.get('/', (req, res) => classScheduleController.findAll(req, res));
router.get('/subject/:subjectId', (req, res) => classScheduleController.findBySubject(req, res));
router.get('/:id', (req, res) => classScheduleController.findById(req, res));
router.put('/:id', (req, res) => classScheduleController.update(req, res));
router.delete('/:id', (req, res) => classScheduleController.delete(req, res));

export default router;
