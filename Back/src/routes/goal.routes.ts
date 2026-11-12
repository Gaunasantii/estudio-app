import { Router } from 'express';
import { goalController } from '../controllers/goal.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', (req, res) => goalController.create(req, res));
router.get('/', (req, res) => goalController.findAll(req, res));
router.get('/:id', (req, res) => goalController.findById(req, res));
router.put('/:id', (req, res) => goalController.update(req, res));
router.delete('/:id', (req, res) => goalController.delete(req, res));

export default router;
