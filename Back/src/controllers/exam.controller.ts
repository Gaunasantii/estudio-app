import { Request, Response } from 'express';
import { examService, ExamError } from '../services/exam.service';

export class ExamController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { subjectId, title, examDate, targetHours, isCompleted, score } = req.body;

      if (!subjectId || !title || typeof title !== 'string' || !title.trim() || !examDate) {
        res.status(400).json({ message: 'Los campos subjectId, title y examDate son obligatorios' });
        return;
      }

      const exam = await examService.create(req.user.id, {
        subjectId,
        title,
        examDate,
        targetHours,
        isCompleted,
        score,
      });

      res.status(201).json(exam);
    } catch (error) {
      if (error instanceof ExamError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in ExamController.create:', error);
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

      const exams = await examService.findAllByUser(req.user.id, {
        subjectId: typeof subjectId === 'string' ? subjectId : undefined,
        isCompleted:
          isCompleted === 'true' ? true : isCompleted === 'false' ? false : undefined,
      });

      res.status(200).json(exams);
    } catch (error) {
      if (error instanceof ExamError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in ExamController.findAll:', error);
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
      const exam = await examService.findById(id, req.user.id);
      res.status(200).json(exam);
    } catch (error) {
      if (error instanceof ExamError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in ExamController.findById:', error);
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
      const { subjectId, title, examDate, targetHours, isCompleted, score } = req.body;

      if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
        res.status(400).json({ message: 'El campo title no puede estar vacío' });
        return;
      }

      const exam = await examService.update(id, req.user.id, {
        subjectId,
        title,
        examDate,
        targetHours,
        isCompleted,
        score,
      });

      res.status(200).json(exam);
    } catch (error) {
      if (error instanceof ExamError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in ExamController.update:', error);
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
      await examService.delete(id, req.user.id);
      res.status(200).json({ message: 'Examen eliminado correctamente' });
    } catch (error) {
      if (error instanceof ExamError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in ExamController.delete:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

export const examController = new ExamController();
