import { FilterQuery } from '@mikro-orm/core';
import { orm } from '../app';
import { StudySession } from '../entities/StudySession';
import { Subject } from '../entities/Subject';
import { StudyMethod } from '../enums/study-method.enum';
import { ActivityType } from '../enums/activity-type.enum';

export interface CreateStudySessionDTO {
  subjectId: string;
  method: StudyMethod;
  activityType?: ActivityType;
  startTime: Date | string;
  endTime?: Date | string;
  durationSeconds?: number;
  notes?: string;
}

export interface UpdateStudySessionDTO {
  subjectId?: string;
  method?: StudyMethod;
  activityType?: ActivityType;
  startTime?: Date | string;
  endTime?: Date | string | null;
  durationSeconds?: number;
  notes?: string | null;
}

export interface StudySessionFilterDTO {
  subjectId?: string;
  from?: string;
  to?: string;
  method?: StudyMethod;
  activityType?: ActivityType;
}

export interface HeatmapEntry {
  date: string;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  sessionsCount: number;
}

export interface StudyHeatmapStatsResponse {
  heatmap: HeatmapEntry[];
  byDate: Record<string, HeatmapEntry>;
  totalSeconds: number;
  totalHours: number;
  totalSessions: number;
  currentStreak: number;
  bestStreak: number;
  restDaysUsed: number;
}

export class StudySessionError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'StudySessionError';
  }
}

export class StudySessionService {
  private parseDate(value: Date | string, fieldName: string): Date {
    const parsed = value instanceof Date ? value : new Date(value);
    if (isNaN(parsed.getTime())) {
      throw new StudySessionError(400, `Fecha inválida para ${fieldName}`);
    }
    return parsed;
  }

  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDateKeyToNoon(dateKey: string): Date {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  }

  private calculateStreakStats(studiedDates: Set<string>): {
    currentStreak: number;
    bestStreak: number;
    restDaysUsed: number;
  } {
    if (studiedDates.size === 0) {
      return { currentStreak: 0, bestStreak: 0, restDaysUsed: 0 };
    }

    const sortedDates = Array.from(studiedDates).sort((a, b) => a.localeCompare(b));
    const firstDate = this.parseDateKeyToNoon(sortedDates[0]);
    const lastStudiedDate = this.parseDateKeyToNoon(sortedDates[sortedDates.length - 1]);
    const todayKey = this.formatDateKey(new Date());
    const todayDate = this.parseDateKeyToNoon(todayKey);
    const endDate = todayDate > lastStudiedDate ? todayDate : lastStudiedDate;

    let activeStreak = 0;
    let bestStreak = 0;
    let consecutiveMisses = 0;
    let streakStartDate: Date | null = null;

    let currentStreak = 0;
    let restDaysUsed = 0;

    for (
      let cursor = new Date(firstDate.getTime());
      cursor <= endDate;
      cursor = this.addDays(cursor, 1)
    ) {
      const cursorKey = this.formatDateKey(cursor);
      const studiedToday = studiedDates.has(cursorKey);

      if (studiedToday) {
        if (activeStreak === 0) {
          activeStreak = 1;
          streakStartDate = new Date(cursor.getTime());
        } else {
          activeStreak += 1;
        }
        consecutiveMisses = 0;
        if (activeStreak > bestStreak) {
          bestStreak = activeStreak;
        }
      } else if (activeStreak > 0 && streakStartDate) {
        consecutiveMisses += 1;

        const windowStartCandidate = this.addDays(cursor, -6);
        const windowStart =
          windowStartCandidate > streakStartDate ? windowStartCandidate : streakStartDate;

        let missesInWindow = 0;
        for (
          let d = new Date(windowStart.getTime());
          d <= cursor;
          d = this.addDays(d, 1)
        ) {
          if (!studiedDates.has(this.formatDateKey(d))) {
            missesInWindow += 1;
          }
        }

        if (consecutiveMisses >= 3 || missesInWindow >= 3) {
          activeStreak = 0;
          consecutiveMisses = 0;
          streakStartDate = null;
        }
      }

      if (cursorKey === todayKey) {
        currentStreak = activeStreak;
        restDaysUsed = activeStreak > 0 ? Math.min(2, consecutiveMisses) : 0;
      }
    }

    if (todayDate < firstDate) {
      currentStreak = 0;
      restDaysUsed = 0;
    }

    return {
      currentStreak,
      bestStreak,
      restDaysUsed,
    };
  }

  async create(userId: string, data: CreateStudySessionDTO): Promise<StudySession> {
    const subjectRepository = orm.em.getRepository(Subject);
    const subject = await subjectRepository.findOne({
      id: data.subjectId,
      user: userId,
    });

    if (!subject) {
      throw new StudySessionError(404, 'Materia no encontrada o no pertenece al usuario');
    }

    if (!Object.values(StudyMethod).includes(data.method)) {
      throw new StudySessionError(400, 'Método de estudio inválido');
    }

    if (data.activityType !== undefined && !Object.values(ActivityType).includes(data.activityType)) {
      throw new StudySessionError(400, 'Tipo de actividad inválido');
    }

    const startTime = this.parseDate(data.startTime, 'startTime');
    let endTime: Date | undefined;

    if (data.endTime !== undefined && data.endTime !== null) {
      endTime = this.parseDate(data.endTime, 'endTime');
      if (endTime < startTime) {
        throw new StudySessionError(400, 'endTime no puede ser anterior a startTime');
      }
    }

    let durationSeconds = data.durationSeconds;
    if (durationSeconds === undefined) {
      if (endTime) {
        durationSeconds = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
      } else {
        durationSeconds = 0;
      }
    }

    if (durationSeconds < 0) {
      throw new StudySessionError(400, 'durationSeconds no puede ser negativo');
    }

    const session = new StudySession();
    session.subject = subject;
    session.method = data.method;
    session.activityType = data.activityType ?? ActivityType.PRACTICE;
    session.startTime = startTime;
    session.endTime = endTime;
    session.durationSeconds = durationSeconds;
    if (data.notes !== undefined) {
      session.notes = data.notes;
    }

    await orm.em.persistAndFlush(session);
    return session;
  }

  async findAllByUser(userId: string, filters?: StudySessionFilterDTO): Promise<StudySession[]> {
    const sessionRepository = orm.em.getRepository(StudySession);
    const where: FilterQuery<StudySession> = {
      subject: filters?.subjectId
        ? { id: filters.subjectId, user: userId }
        : { user: userId },
    };

    if (filters?.method) {
      where.method = filters.method;
    }

    if (filters?.activityType) {
      where.activityType = filters.activityType;
    }

    if (filters?.from || filters?.to) {
      const startTimeFilter: Record<string, Date> = {};
      if (filters.from) {
        startTimeFilter.$gte = this.parseDate(filters.from, 'from');
      }
      if (filters.to) {
        startTimeFilter.$lte = this.parseDate(filters.to, 'to');
      }
      where.startTime = startTimeFilter;
    }

    return sessionRepository.find(where, {
      populate: ['subject'],
      orderBy: { startTime: 'DESC' },
    });
  }

  async findById(id: string, userId: string): Promise<StudySession> {
    const sessionRepository = orm.em.getRepository(StudySession);
    const session = await sessionRepository.findOne(
      { id, subject: { user: userId } },
      { populate: ['subject'] }
    );

    if (!session) {
      throw new StudySessionError(404, 'Sesión de estudio no encontrada');
    }

    return session;
  }

  async update(id: string, userId: string, data: UpdateStudySessionDTO): Promise<StudySession> {
    const session = await this.findById(id, userId);

    if (data.subjectId !== undefined) {
      const subjectRepository = orm.em.getRepository(Subject);
      const subject = await subjectRepository.findOne({
        id: data.subjectId,
        user: userId,
      });

      if (!subject) {
        throw new StudySessionError(404, 'Materia no encontrada o no pertenece al usuario');
      }
      session.subject = subject;
    }

    if (data.method !== undefined) {
      if (!Object.values(StudyMethod).includes(data.method)) {
        throw new StudySessionError(400, 'Método de estudio inválido');
      }
      session.method = data.method;
    }

    if (data.activityType !== undefined) {
      if (!Object.values(ActivityType).includes(data.activityType)) {
        throw new StudySessionError(400, 'Tipo de actividad inválido');
      }
      session.activityType = data.activityType;
    }

    if (data.startTime !== undefined) {
      session.startTime = this.parseDate(data.startTime, 'startTime');
    }

    if (data.endTime !== undefined) {
      session.endTime = data.endTime === null ? undefined : this.parseDate(data.endTime, 'endTime');
    }

    if (session.endTime && session.endTime < session.startTime) {
      throw new StudySessionError(400, 'endTime no puede ser anterior a startTime');
    }

    if (data.durationSeconds !== undefined) {
      if (data.durationSeconds < 0) {
        throw new StudySessionError(400, 'durationSeconds no puede ser negativo');
      }
      session.durationSeconds = data.durationSeconds;
    } else if ((data.startTime !== undefined || data.endTime !== undefined) && session.endTime) {
      session.durationSeconds = Math.max(
        0,
        Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
      );
    }

    if (data.notes !== undefined) {
      session.notes = data.notes === null ? undefined : data.notes;
    }

    await orm.em.flush();
    return session;
  }

  async delete(id: string, userId: string): Promise<void> {
    const session = await this.findById(id, userId);
    await orm.em.removeAndFlush(session);
  }

  async getHeatmapStats(
    userId: string,
    filters?: { from?: string; to?: string; subjectId?: string }
  ): Promise<StudyHeatmapStatsResponse> {
    const sessions = await this.findAllByUser(userId, {
      from: filters?.from,
      to: filters?.to,
      subjectId: filters?.subjectId,
    });

    const byDate: Record<string, HeatmapEntry> = {};
    let totalSeconds = 0;

    for (const session of sessions) {
      const dateKey = this.formatDateKey(new Date(session.startTime));
      const seconds = Math.max(0, session.durationSeconds || 0);
      totalSeconds += seconds;

      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: dateKey,
          totalSeconds: 0,
          totalMinutes: 0,
          totalHours: 0,
          sessionsCount: 0,
        };
      }

      byDate[dateKey].totalSeconds += seconds;
      byDate[dateKey].sessionsCount += 1;
      byDate[dateKey].totalMinutes = Number((byDate[dateKey].totalSeconds / 60).toFixed(2));
      byDate[dateKey].totalHours = Number((byDate[dateKey].totalSeconds / 3600).toFixed(2));
    }

    const heatmap = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    const { currentStreak, bestStreak, restDaysUsed } = this.calculateStreakStats(
      new Set(Object.keys(byDate))
    );

    return {
      heatmap,
      byDate,
      totalSeconds,
      totalHours: Number((totalSeconds / 3600).toFixed(2)),
      totalSessions: sessions.length,
      currentStreak,
      bestStreak,
      restDaysUsed,
    };
  }
}

export const studySessionService = new StudySessionService();
