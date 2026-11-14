import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { studySessionService } from './study-session.service';

vi.mock('../app', () => ({
  orm: {
    em: {
      getRepository: vi.fn(),
      persistAndFlush: vi.fn(),
      flush: vi.fn(),
      removeAndFlush: vi.fn(),
    },
  },
}));

describe('StudySessionService - getHeatmapStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('debería calcular la racha correctamente para días consecutivos de estudio', async () => {
    // Fijamos la fecha actual en 2026-05-10 a las 14:00:00
    vi.setSystemTime(new Date(2026, 4, 10, 14, 0, 0));

    const mockSessions = [
      {
        startTime: new Date(2026, 4, 8, 10, 0, 0),
        durationSeconds: 3600,
      },
      {
        startTime: new Date(2026, 4, 9, 11, 0, 0),
        durationSeconds: 1800,
      },
      {
        startTime: new Date(2026, 4, 10, 9, 30, 0),
        durationSeconds: 3600,
      },
    ];

    vi.spyOn(studySessionService, 'findAllByUser').mockResolvedValue(mockSessions as any);

    const stats = await studySessionService.getHeatmapStats('user-1');

    expect(stats.currentStreak).toBe(3);
    expect(stats.bestStreak).toBe(3);
    expect(stats.restDaysUsed).toBe(0);
    expect(stats.totalSessions).toBe(3);
    expect(stats.totalSeconds).toBe(9000);
    expect(stats.totalHours).toBe(2.5);
    expect(stats.heatmap).toHaveLength(3);
  });

  it('debería mantener currentStreak y reflejar restDaysUsed = 1 tras 1 día de descanso', async () => {
    // Estudió el 8 y el 9 de mayo, hoy es 10 de mayo (1 día sin estudio)
    vi.setSystemTime(new Date(2026, 4, 10, 14, 0, 0));

    const mockSessions = [
      {
        startTime: new Date(2026, 4, 8, 10, 0, 0),
        durationSeconds: 3600,
      },
      {
        startTime: new Date(2026, 4, 9, 11, 0, 0),
        durationSeconds: 3600,
      },
    ];

    vi.spyOn(studySessionService, 'findAllByUser').mockResolvedValue(mockSessions as any);

    const stats = await studySessionService.getHeatmapStats('user-1');

    expect(stats.currentStreak).toBe(2);
    expect(stats.bestStreak).toBe(2);
    expect(stats.restDaysUsed).toBe(1);
  });

  it('debería mantener currentStreak y reflejar restDaysUsed = 2 tras 2 días de descanso', async () => {
    // Estudió el 8 y el 9 de mayo, hoy es 11 de mayo (2 días sin estudio: 10 y 11)
    vi.setSystemTime(new Date(2026, 4, 11, 14, 0, 0));

    const mockSessions = [
      {
        startTime: new Date(2026, 4, 8, 10, 0, 0),
        durationSeconds: 3600,
      },
      {
        startTime: new Date(2026, 4, 9, 11, 0, 0),
        durationSeconds: 3600,
      },
    ];

    vi.spyOn(studySessionService, 'findAllByUser').mockResolvedValue(mockSessions as any);

    const stats = await studySessionService.getHeatmapStats('user-1');

    expect(stats.currentStreak).toBe(2);
    expect(stats.bestStreak).toBe(2);
    expect(stats.restDaysUsed).toBe(2);
  });

  it('debería perder la racha al 3° día consecutivo sin estudio', async () => {
    // Estudió el 8 y el 9 de mayo, hoy es 12 de mayo (3 días consecutivos sin estudio: 10, 11, 12)
    vi.setSystemTime(new Date(2026, 4, 12, 14, 0, 0));

    const mockSessions = [
      {
        startTime: new Date(2026, 4, 8, 10, 0, 0),
        durationSeconds: 3600,
      },
      {
        startTime: new Date(2026, 4, 9, 11, 0, 0),
        durationSeconds: 3600,
      },
    ];

    vi.spyOn(studySessionService, 'findAllByUser').mockResolvedValue(mockSessions as any);

    const stats = await studySessionService.getHeatmapStats('user-1');

    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(2);
    expect(stats.restDaysUsed).toBe(0);
  });

  it('debería perder la racha al acumular 3 faltas en una ventana móvil de 7 días', async () => {
    // Estudió: 1, 2, 4, 6 de mayo. Faltas: 3, 5, 7 de mayo (3 faltas en 7 días)
    vi.setSystemTime(new Date(2026, 4, 7, 14, 0, 0));

    const mockSessions = [
      { startTime: new Date(2026, 4, 1, 10, 0, 0), durationSeconds: 3600 },
      { startTime: new Date(2026, 4, 2, 10, 0, 0), durationSeconds: 3600 },
      { startTime: new Date(2026, 4, 4, 10, 0, 0), durationSeconds: 3600 },
      { startTime: new Date(2026, 4, 6, 10, 0, 0), durationSeconds: 3600 },
    ];

    vi.spyOn(studySessionService, 'findAllByUser').mockResolvedValue(mockSessions as any);

    const stats = await studySessionService.getHeatmapStats('user-1');

    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(4);
    expect(stats.restDaysUsed).toBe(0);
  });

  it('debería reiniciar la racha tras perderla al volver a estudiar', async () => {
    // Estudió 8 y 9 de mayo, perdió la racha el 12 de mayo, y vuelve a estudiar el 13 de mayo
    vi.setSystemTime(new Date(2026, 4, 13, 14, 0, 0));

    const mockSessions = [
      { startTime: new Date(2026, 4, 8, 10, 0, 0), durationSeconds: 3600 },
      { startTime: new Date(2026, 4, 9, 11, 0, 0), durationSeconds: 3600 },
      { startTime: new Date(2026, 4, 13, 9, 0, 0), durationSeconds: 3600 },
    ];

    vi.spyOn(studySessionService, 'findAllByUser').mockResolvedValue(mockSessions as any);

    const stats = await studySessionService.getHeatmapStats('user-1');

    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(2);
    expect(stats.restDaysUsed).toBe(0);
  });
});
