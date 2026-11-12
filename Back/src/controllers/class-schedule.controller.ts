import { Request, Response } from 'express';
import { classScheduleService, ClassScheduleError } from '../services/class-schedule.service';

export class ClassScheduleController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { subjectId, dayOfWeek, startTime, endTime, classroom } = req.body;

      if (!subjectId || dayOfWeek === undefined || !startTime || !endTime) {
        res.status(400).json({
          message: 'Los campos subjectId, dayOfWeek, startTime y endTime son obligatorios',
        });
        return;
      }

      const schedule = await classScheduleService.create(req.user.id, {
        subjectId,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        classroom,
      });

      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof ClassScheduleError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in ClassScheduleController.create:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async findAll(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : undefined;
      const schedules = await classScheduleService.findAllByUser(req.user.id, subjectId);
      res.status(200).json(schedules);
    } catch (error) {
      if (error instanceof ClassScheduleError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in ClassScheduleController.findAll:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async findBySubject(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { subjectId } = req.params;
      const schedules = await classScheduleService.findBySubject(subjectId, req.user.id);
      res.status(200).json(schedules);
    } catch (error) {
      if (error instanceof ClassScheduleError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in ClassScheduleController.findBySubject:', error);
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
      const schedule = await classScheduleService.findById(id, req.user.id);
      res.status(200).json(schedule);
    } catch (error) {
      if (error instanceof ClassScheduleError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in ClassScheduleController.findById:', error);
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
      const { subjectId, dayOfWeek, startTime, endTime, classroom } = req.body;

      const schedule = await classScheduleService.update(id, req.user.id, {
        subjectId,
        dayOfWeek: dayOfWeek !== undefined ? Number(dayOfWeek) : undefined,
        startTime,
        endTime,
        classroom,
      });

      res.status(200).json(schedule);
    } catch (error) {
      if (error instanceof ClassScheduleError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in ClassScheduleController.update:', error);
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
      await classScheduleService.delete(id, req.user.id);
      res.status(200).json({ message: 'Horario de cursado eliminado correctamente' });
    } catch (error) {
      if (error instanceof ClassScheduleError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in ClassScheduleController.delete:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

export const classScheduleController = new ClassScheduleController();
