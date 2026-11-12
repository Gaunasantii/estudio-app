import { Router } from 'express';
import { subjectController } from '../controllers/subject.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', (req, res) => subjectController.create(req, res));
router.get('/', (req, res) => subjectController.findAll(req, res));
router.get('/:id', (req, res) => subjectController.findById(req, res));
router.put('/:id', (req, res) => subjectController.update(req, res));
router.delete('/:id', (req, res) => subjectController.delete(req, res));

export default router;
