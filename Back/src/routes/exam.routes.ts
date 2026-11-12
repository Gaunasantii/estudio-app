import { Router } from 'express';
import { examController } from '../controllers/exam.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', (req, res) => examController.create(req, res));
router.get('/', (req, res) => examController.findAll(req, res));
router.get('/:id', (req, res) => examController.findById(req, res));
router.put('/:id', (req, res) => examController.update(req, res));
router.delete('/:id', (req, res) => examController.delete(req, res));

export default router;
