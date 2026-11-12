import { FilterQuery } from '@mikro-orm/core';
import { orm } from '../app';
import { Goal } from '../entities/Goal';
import { Subject } from '../entities/Subject';
import { User } from '../entities/User';

export interface CreateGoalDTO {
  title: string;
  subjectId?: string;
  isCompleted?: boolean;
  dueDate?: Date | string;
}

export interface UpdateGoalDTO {
  title?: string;
  subjectId?: string | null;
  isCompleted?: boolean;
  dueDate?: Date | string | null;
}

export interface GoalFilterDTO {
  subjectId?: string;
  isCompleted?: boolean;
}

export class GoalError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'GoalError';
  }
}

export class GoalService {
  private parseDate(value: Date | string, fieldName: string): Date {
    const parsed = value instanceof Date ? value : new Date(value);
    if (isNaN(parsed.getTime())) {
      throw new GoalError(400, `Fecha inválida para ${fieldName}`);
    }
    return parsed;
  }

  async create(userId: string, data: CreateGoalDTO): Promise<Goal> {
    const userRepository = orm.em.getRepository(User);
    const user = await userRepository.findOne({ id: userId });

    if (!user) {
      throw new GoalError(404, 'Usuario no encontrado');
    }

    const goal = new Goal();
    goal.user = user;
    goal.title = data.title.trim();

    if (data.subjectId) {
      const subjectRepository = orm.em.getRepository(Subject);
      const subject = await subjectRepository.findOne({
        id: data.subjectId,
        user: userId,
      });

      if (!subject) {
        throw new GoalError(404, 'Materia no encontrada o no pertenece al usuario');
      }
      goal.subject = subject;
    }

    if (data.isCompleted !== undefined) {
      goal.isCompleted = data.isCompleted;
    }

    if (data.dueDate !== undefined && data.dueDate !== null) {
      goal.dueDate = this.parseDate(data.dueDate, 'dueDate');
    }

    await orm.em.persistAndFlush(goal);
    return goal;
  }

  async findAllByUser(userId: string, filters?: GoalFilterDTO): Promise<Goal[]> {
    const goalRepository = orm.em.getRepository(Goal);
    const where: FilterQuery<Goal> = {
      user: userId,
    };

    if (filters?.subjectId) {
      where.subject = { id: filters.subjectId, user: userId };
    }

    if (filters?.isCompleted !== undefined) {
      where.isCompleted = filters.isCompleted;
    }

    return goalRepository.find(where, {
      populate: ['subject'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, userId: string): Promise<Goal> {
    const goalRepository = orm.em.getRepository(Goal);
    const goal = await goalRepository.findOne(
      { id, user: userId },
      { populate: ['subject'] }
    );

    if (!goal) {
      throw new GoalError(404, 'Objetivo no encontrado');
    }

    return goal;
  }

  async update(id: string, userId: string, data: UpdateGoalDTO): Promise<Goal> {
    const goal = await this.findById(id, userId);

    if (data.title !== undefined) {
      goal.title = data.title.trim();
    }

    if (data.subjectId !== undefined) {
      if (data.subjectId === null) {
        goal.subject = undefined;
      } else {
        const subjectRepository = orm.em.getRepository(Subject);
        const subject = await subjectRepository.findOne({
          id: data.subjectId,
          user: userId,
        });

        if (!subject) {
          throw new GoalError(404, 'Materia no encontrada o no pertenece al usuario');
        }
        goal.subject = subject;
      }
    }

    if (data.isCompleted !== undefined) {
      goal.isCompleted = data.isCompleted;
    }

    if (data.dueDate !== undefined) {
      goal.dueDate = data.dueDate === null ? undefined : this.parseDate(data.dueDate, 'dueDate');
    }

    await orm.em.flush();
    return goal;
  }

  async delete(id: string, userId: string): Promise<void> {
    const goal = await this.findById(id, userId);
    await orm.em.removeAndFlush(goal);
  }
}

export const goalService = new GoalService();
