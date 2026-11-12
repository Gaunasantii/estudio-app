import { FilterQuery } from '@mikro-orm/core';
import { orm } from '../app';
import { Exam } from '../entities/Exam';
import { Subject } from '../entities/Subject';

export interface CreateExamDTO {
  subjectId: string;
  title: string;
  examDate: Date | string;
  targetHours?: number;
  isCompleted?: boolean;
  score?: number;
}

export interface UpdateExamDTO {
  subjectId?: string;
  title?: string;
  examDate?: Date | string;
  targetHours?: number | null;
  isCompleted?: boolean;
  score?: number | null;
}

export interface ExamFilterDTO {
  subjectId?: string;
  isCompleted?: boolean;
}

export class ExamError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ExamError';
  }
}

export class ExamService {
  private parseDate(value: Date | string, fieldName: string): Date {
    const parsed = value instanceof Date ? value : new Date(value);
    if (isNaN(parsed.getTime())) {
      throw new ExamError(400, `Fecha inválida para ${fieldName}`);
    }
    return parsed;
  }

  async create(userId: string, data: CreateExamDTO): Promise<Exam> {
    const subjectRepository = orm.em.getRepository(Subject);
    const subject = await subjectRepository.findOne({
      id: data.subjectId,
      user: userId,
    });

    if (!subject) {
      throw new ExamError(404, 'Materia no encontrada o no pertenece al usuario');
    }

    const examDate = this.parseDate(data.examDate, 'examDate');

    const exam = new Exam();
    exam.subject = subject;
    exam.title = data.title.trim();
    exam.examDate = examDate;

    if (data.targetHours !== undefined) {
      exam.targetHours = data.targetHours;
    }
    if (data.isCompleted !== undefined) {
      exam.isCompleted = data.isCompleted;
    }
    if (data.score !== undefined) {
      exam.score = data.score;
    }

    await orm.em.persistAndFlush(exam);
    return exam;
  }

  async findAllByUser(userId: string, filters?: ExamFilterDTO): Promise<Exam[]> {
    const examRepository = orm.em.getRepository(Exam);
    const where: FilterQuery<Exam> = {
      subject: filters?.subjectId
        ? { id: filters.subjectId, user: userId }
        : { user: userId },
    };

    if (filters?.isCompleted !== undefined) {
      where.isCompleted = filters.isCompleted;
    }

    return examRepository.find(where, {
      populate: ['subject'],
      orderBy: { examDate: 'ASC' },
    });
  }

  async findById(id: string, userId: string): Promise<Exam> {
    const examRepository = orm.em.getRepository(Exam);
    const exam = await examRepository.findOne(
      { id, subject: { user: userId } },
      { populate: ['subject'] }
    );

    if (!exam) {
      throw new ExamError(404, 'Examen no encontrado');
    }

    return exam;
  }

  async update(id: string, userId: string, data: UpdateExamDTO): Promise<Exam> {
    const exam = await this.findById(id, userId);

    if (data.subjectId !== undefined) {
      const subjectRepository = orm.em.getRepository(Subject);
      const subject = await subjectRepository.findOne({
        id: data.subjectId,
        user: userId,
      });

      if (!subject) {
        throw new ExamError(404, 'Materia no encontrada o no pertenece al usuario');
      }
      exam.subject = subject;
    }

    if (data.title !== undefined) {
      exam.title = data.title.trim();
    }

    if (data.examDate !== undefined) {
      exam.examDate = this.parseDate(data.examDate, 'examDate');
    }

    if (data.targetHours !== undefined) {
      exam.targetHours = data.targetHours === null ? undefined : data.targetHours;
    }

    if (data.isCompleted !== undefined) {
      exam.isCompleted = data.isCompleted;
    }

    if (data.score !== undefined) {
      exam.score = data.score === null ? undefined : data.score;
    }

    await orm.em.flush();
    return exam;
  }

  async delete(id: string, userId: string): Promise<void> {
    const exam = await this.findById(id, userId);
    await orm.em.removeAndFlush(exam);
  }
}

export const examService = new ExamService();
