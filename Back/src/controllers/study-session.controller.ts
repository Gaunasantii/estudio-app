import { Request, Response } from 'express';
import { studySessionService, StudySessionError } from '../services/study-session.service';
import { StudyMethod } from '../enums/study-method.enum';
import { ActivityType } from '../enums/activity-type.enum';

export class StudySessionController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { subjectId, method, activityType, startTime, endTime, durationSeconds, notes } = req.body;

      if (!subjectId || !method || !startTime) {
        res.status(400).json({ message: 'Los campos subjectId, method y startTime son obligatorios' });
        return;
      }

      const session = await studySessionService.create(req.user.id, {
        subjectId,
        method,
        activityType,
        startTime,
        endTime,
        durationSeconds,
        notes,
      });

      res.status(201).json(session);
    } catch (error) {
      if (error instanceof StudySessionError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in StudySessionController.create:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async findAll(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { subjectId, from, to, startDate, endDate, method, activityType } = req.query;

      const sessions = await studySessionService.findAllByUser(req.user.id, {
        subjectId: typeof subjectId === 'string' ? subjectId : undefined,
        from: typeof from === 'string' ? from : typeof startDate === 'string' ? startDate : undefined,
        to: typeof to === 'string' ? to : typeof endDate === 'string' ? endDate : undefined,
        method: typeof method === 'string' ? (method as StudyMethod) : undefined,
        activityType: typeof activityType === 'string' ? (activityType as ActivityType) : undefined,
      });

      res.status(200).json(sessions);
    } catch (error) {
      if (error instanceof StudySessionError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in StudySessionController.findAll:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async getHeatmapStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { from, to, startDate, endDate, subjectId } = req.query;

      const stats = await studySessionService.getHeatmapStats(req.user.id, {
        from: typeof from === 'string' ? from : typeof startDate === 'string' ? startDate : undefined,
        to: typeof to === 'string' ? to : typeof endDate === 'string' ? endDate : undefined,
        subjectId: typeof subjectId === 'string' ? subjectId : undefined,
      });

      res.status(200).json(stats);
    } catch (error) {
      if (error instanceof StudySessionError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in StudySessionController.getHeatmapStats:', error);
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
      const session = await studySessionService.findById(id, req.user.id);
      res.status(200).json(session);
    } catch (error) {
      if (error instanceof StudySessionError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in StudySessionController.findById:', error);
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
      const { subjectId, method, activityType, startTime, endTime, durationSeconds, notes } = req.body;

      const session = await studySessionService.update(id, req.user.id, {
        subjectId,
        method,
        activityType,
        startTime,
        endTime,
        durationSeconds,
        notes,
      });

      res.status(200).json(session);
    } catch (error) {
      if (error instanceof StudySessionError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in StudySessionController.update:', error);
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
      await studySessionService.delete(id, req.user.id);
      res.status(200).json({ message: 'Sesión de estudio eliminada correctamente' });
    } catch (error) {
      if (error instanceof StudySessionError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in StudySessionController.delete:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

export const studySessionController = new StudySessionController();
