import { Request, Response } from 'express';
import { goalService, GoalError } from '../services/goal.service';

export class GoalController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { title, subjectId, isCompleted, dueDate } = req.body;

      if (!title || typeof title !== 'string' || !title.trim()) {
        res.status(400).json({ message: 'El campo title es obligatorio' });
        return;
      }

      const goal = await goalService.create(req.user.id, {
        title,
        subjectId,
        isCompleted,
        dueDate,
      });

      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof GoalError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in GoalController.create:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async findAll(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { subjectId, isCompleted } = req.query;

      const goals = await goalService.findAllByUser(req.user.id, {
        subjectId: typeof subjectId === 'string' ? subjectId : undefined,
        isCompleted:
          isCompleted === 'true' ? true : isCompleted === 'false' ? false : undefined,
      });

      res.status(200).json(goals);
    } catch (error) {
      if (error instanceof GoalError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in GoalController.findAll:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const id = String(req.params.id);
      const goal = await goalService.findById(id, req.user.id);
      res.status(200).json(goal);
    } catch (error) {
      if (error instanceof GoalError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in GoalController.findById:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const id = String(req.params.id);
      const { title, subjectId, isCompleted, dueDate } = req.body;

      if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
        res.status(400).json({ message: 'El campo title no puede estar vacío' });
        return;
      }

      const goal = await goalService.update(id, req.user.id, {
        title,
        subjectId,
        isCompleted,
        dueDate,
      });

      res.status(200).json(goal);
    } catch (error) {
      if (error instanceof GoalError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in GoalController.update:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const id = String(req.params.id);
      await goalService.delete(id, req.user.id);
      res.status(200).json({ message: 'Objetivo eliminado correctamente' });
    } catch (error) {
      if (error instanceof GoalError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in GoalController.delete:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

export const goalController = new GoalController();
