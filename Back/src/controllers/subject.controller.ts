import { Request, Response } from 'express';
import { subjectService, SubjectError } from '../services/subject.service';

export class SubjectController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { name, color, isCurrentlyTaking } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ message: 'El campo name es obligatorio' });
        return;
      }

      const subject = await subjectService.create(req.user.id, {
        name,
        color,
        isCurrentlyTaking,
      });

      res.status(201).json(subject);
    } catch (error) {
      if (error instanceof SubjectError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in SubjectController.create:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async findAll(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const subjects = await subjectService.findAllByUser(req.user.id);
      res.status(200).json(subjects);
    } catch (error) {
      if (error instanceof SubjectError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in SubjectController.findAll:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { id } = req.params;
      const subject = await subjectService.findById(id, req.user.id);
      res.status(200).json(subject);
    } catch (error) {
      if (error instanceof SubjectError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in SubjectController.findById:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { id } = req.params;
      const { name, color, isCurrentlyTaking } = req.body;

      if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        res.status(400).json({ message: 'El campo name no puede estar vacío' });
        return;
      }

      const subject = await subjectService.update(id, req.user.id, {
        name,
        color,
        isCurrentlyTaking,
      });

      res.status(200).json(subject);
    } catch (error) {
      if (error instanceof SubjectError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in SubjectController.update:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { id } = req.params;
      await subjectService.delete(id, req.user.id);
      res.status(200).json({ message: 'Materia eliminada correctamente' });
    } catch (error) {
      if (error instanceof SubjectError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in SubjectController.delete:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

export const subjectController = new SubjectController();
