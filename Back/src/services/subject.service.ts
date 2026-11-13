import { orm } from '../app';
import { Subject } from '../entities/Subject';
import { User } from '../entities/User';

export interface CreateSubjectDTO {
  name: string;
  color?: string;
  isCurrentlyTaking?: boolean;
}

export interface UpdateSubjectDTO {
  name?: string;
  color?: string;
  isCurrentlyTaking?: boolean;
}

export class SubjectError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'SubjectError';
  }
}

export class SubjectService {
  async create(userId: string, data: CreateSubjectDTO): Promise<Subject> {
    const userRepository = orm.em.getRepository(User);
    const user = await userRepository.findOne({ id: userId });

    if (!user) {
      throw new SubjectError(404, 'Usuario no encontrado');
    }

    const subject = new Subject();
    subject.name = data.name.trim();
    if (data.color !== undefined) {
      subject.color = data.color;
    }
    if (data.isCurrentlyTaking !== undefined) {
      subject.isCurrentlyTaking = data.isCurrentlyTaking;
    }
    subject.user = user;

    await orm.em.persistAndFlush(subject);
    return subject;
  }

  async findAllByUser(userId: string): Promise<Subject[]> {
    const subjectRepository = orm.em.getRepository(Subject);
    return subjectRepository.find(
      { user: userId },
      { populate: ['schedules'], orderBy: { createdAt: 'DESC' } }
    );
  }

  async findById(id: string, userId: string): Promise<Subject> {
    const subjectRepository = orm.em.getRepository(Subject);
    const subject = await subjectRepository.findOne(
      { id, user: userId },
      { populate: ['schedules'] }
    );

    if (!subject) {
      throw new SubjectError(404, 'Materia no encontrada');
    }

    return subject;
  }

  async update(id: string, userId: string, data: UpdateSubjectDTO): Promise<Subject> {
    const subject = await this.findById(id, userId);

    if (data.name !== undefined) {
      subject.name = data.name.trim();
    }
    if (data.color !== undefined) {
      subject.color = data.color;
    }
    if (data.isCurrentlyTaking !== undefined) {
      subject.isCurrentlyTaking = data.isCurrentlyTaking;
    }

    await orm.em.flush();
    return subject;
  }

  async delete(id: string, userId: string): Promise<void> {
    const subjectRepository = orm.em.getRepository(Subject);
    const subject = await subjectRepository.findOne(
      { id, user: userId },
      { populate: ['studySessions', 'exams', 'schedules', 'goals'] }
    );

    if (!subject) {
      throw new SubjectError(404, 'Materia no encontrada');
    }

    orm.em.remove(subject.studySessions.getItems());
    orm.em.remove(subject.exams.getItems());
    orm.em.remove(subject.schedules.getItems());
    orm.em.remove(subject.goals.getItems());

    await orm.em.removeAndFlush(subject);
  }
}

export const subjectService = new SubjectService();
