import { orm } from '../app';
import { ClassSchedule } from '../entities/ClassSchedule';
import { Subject } from '../entities/Subject';
import { DayOfWeek } from '../enums/day-of-week.enum';

export interface CreateClassScheduleDTO {
  subjectId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  classroom?: string;
}

export interface UpdateClassScheduleDTO {
  subjectId?: string;
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  classroom?: string;
}

export class ClassScheduleError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ClassScheduleError';
  }
}

export class ClassScheduleService {
  private isValidDayOfWeek(day: unknown): day is DayOfWeek {
    return typeof day === 'number' && day >= DayOfWeek.MONDAY && day <= DayOfWeek.SUNDAY;
  }

  async create(userId: string, data: CreateClassScheduleDTO): Promise<ClassSchedule> {
    if (!this.isValidDayOfWeek(Number(data.dayOfWeek))) {
      throw new ClassScheduleError(400, 'El día de la semana (dayOfWeek) debe ser un valor entre 1 (Lunes) y 7 (Domingo)');
    }

    const subjectRepository = orm.em.getRepository(Subject);
    const subject = await subjectRepository.findOne({ id: data.subjectId, user: userId });

    if (!subject) {
      throw new ClassScheduleError(404, 'Materia no encontrada o no pertenece al usuario');
    }

    const schedule = new ClassSchedule();
    schedule.subject = subject;
    schedule.dayOfWeek = Number(data.dayOfWeek) as DayOfWeek;
    schedule.startTime = data.startTime;
    schedule.endTime = data.endTime;
    if (data.classroom !== undefined) {
      schedule.classroom = data.classroom;
    }

    await orm.em.persistAndFlush(schedule);
    return schedule;
  }

  async findAllByUser(userId: string, subjectId?: string): Promise<ClassSchedule[]> {
    const scheduleRepository = orm.em.getRepository(ClassSchedule);
    const filter = subjectId
      ? { subject: { id: subjectId, user: userId } }
      : { subject: { user: userId } };

    return scheduleRepository.find(filter, {
      populate: ['subject'],
      orderBy: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async findBySubject(subjectId: string, userId: string): Promise<ClassSchedule[]> {
    const subjectRepository = orm.em.getRepository(Subject);
    const subject = await subjectRepository.findOne({ id: subjectId, user: userId });

    if (!subject) {
      throw new ClassScheduleError(404, 'Materia no encontrada o no pertenece al usuario');
    }

    const scheduleRepository = orm.em.getRepository(ClassSchedule);
    return scheduleRepository.find(
      { subject: subjectId },
      { populate: ['subject'], orderBy: { dayOfWeek: 'ASC', startTime: 'ASC' } }
    );
  }

  async findById(id: string, userId: string): Promise<ClassSchedule> {
    const scheduleRepository = orm.em.getRepository(ClassSchedule);
    const schedule = await scheduleRepository.findOne(
      { id, subject: { user: userId } },
      { populate: ['subject'] }
    );

    if (!schedule) {
      throw new ClassScheduleError(404, 'Horario de cursado no encontrado');
    }

    return schedule;
  }

  async update(id: string, userId: string, data: UpdateClassScheduleDTO): Promise<ClassSchedule> {
    const schedule = await this.findById(id, userId);

    if (data.subjectId !== undefined) {
      const subjectRepository = orm.em.getRepository(Subject);
      const subject = await subjectRepository.findOne({ id: data.subjectId, user: userId });
      if (!subject) {
        throw new ClassScheduleError(404, 'Materia no encontrada o no pertenece al usuario');
      }
      schedule.subject = subject;
    }

    if (data.dayOfWeek !== undefined) {
      if (!this.isValidDayOfWeek(Number(data.dayOfWeek))) {
        throw new ClassScheduleError(400, 'El día de la semana (dayOfWeek) debe ser un valor entre 1 (Lunes) y 7 (Domingo)');
      }
      schedule.dayOfWeek = Number(data.dayOfWeek) as DayOfWeek;
    }

    if (data.startTime !== undefined) {
      schedule.startTime = data.startTime;
    }

    if (data.endTime !== undefined) {
      schedule.endTime = data.endTime;
    }

    if (data.classroom !== undefined) {
      schedule.classroom = data.classroom;
    }

    await orm.em.flush();
    return schedule;
  }

  async delete(id: string, userId: string): Promise<void> {
    const schedule = await this.findById(id, userId);
    await orm.em.removeAndFlush(schedule);
  }
}

export const classScheduleService = new ClassScheduleService();
