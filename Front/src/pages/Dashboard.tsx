import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { FormEvent } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
  Clock,
  Flame,
  CalendarClock,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  CalendarCheck,
  Plus,
  Sparkles,
  Save,
  X,
  Trash2,
  Loader2,
  AlertCircle,
  BarChart3,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import type {
  Subject,
  ClassSchedule,
  Exam,
  StudyMethod,
  StudyStatsResponse,
  DashboardOutletContext,
} from '../types/academic';

const POMODORO_DEFAULT_SECONDS = 25 * 60;

const DAY_LABELS: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
};

const DAY_FULL_LABELS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

const DAY_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

const DEFAULT_TIMELINE_HOURS = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
];

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function diffCalendarDays(dateKeyA: string, dateKeyB: string): number {
  const [yA, mA, dA] = dateKeyA.split('-').map(Number);
  const [yB, mB, dB] = dateKeyB.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  return Math.round((utcA - utcB) / (1000 * 60 * 60 * 24));
}

function computeStreakInfo(stats: StudyStatsResponse | null): {
  currentStreak: number;
  restDaysAvailable: number;
  daysSinceLastStudy: number | null;
} {
  if (!stats) {
    return { currentStreak: 0, restDaysAvailable: 2, daysSinceLastStudy: null };
  }

  const activeDates = (stats.heatmap || [])
    .filter((entry) => entry.totalSeconds > 0 || entry.sessionsCount > 0)
    .map((entry) => entry.date)
    .sort((a, b) => b.localeCompare(a));

  if (activeDates.length === 0) {
    return {
      currentStreak: stats.currentStreak ?? 0,
      restDaysAvailable: stats.restDaysAvailable ?? 2,
      daysSinceLastStudy: null,
    };
  }

  const todayKey = formatDateKey(new Date());
  const daysSinceLast = Math.max(0, diffCalendarDays(todayKey, activeDates[0]));

  if (daysSinceLast > 2) {
    return {
      currentStreak: stats.currentStreak ?? 0,
      restDaysAvailable: 0,
      daysSinceLastStudy: daysSinceLast,
    };
  }

  let computedStreak = 1;
  for (let i = 0; i < activeDates.length - 1; i++) {
    const gapDays = diffCalendarDays(activeDates[i], activeDates[i + 1]) - 1;
    if (gapDays <= 2) {
      computedStreak += 1;
    } else {
      break;
    }
  }

  const currentStreak = stats.currentStreak ?? computedStreak;
  const restDaysAvailable =
    stats.restDaysAvailable ?? (currentStreak > 0 ? Math.max(0, 2 - daysSinceLast) : 2);

  return {
    currentStreak,
    restDaysAvailable,
    daysSinceLastStudy: daysSinceLast,
  };
}

function formatTotalHours(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0 h';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} h`;
  if (mins > 0) return `${mins} min`;
  return `${totalSeconds} s`;
}

function parseHour(timeStr: string): number {
  const [h] = (timeStr || '08:00').split(':').map(Number);
  return Number.isFinite(h) ? h : 8;
}

export default function Dashboard() {
  const { user } = useAuth();
  const outletCtx = useOutletContext<DashboardOutletContext | undefined>();

  const [localSubjects, setLocalSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState<StudyStatsResponse | null>(null);
  const [statsBySubject, setStatsBySubject] = useState<Record<string, number>>({});
  const [loadingData, setLoadingData] = useState(true);

  // Filtro de día en la línea de tiempo (0 = Todos los días)
  const [selectedTimelineDay, setSelectedTimelineDay] = useState<number>(0);

  // Estado del temporizador (Pomodoro / Cronómetro)
  const [studyMethod, setStudyMethod] = useState<StudyMethod>('POMODORO');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [seconds, setSeconds] = useState<number>(POMODORO_DEFAULT_SECONDS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [savingSession, setSavingSession] = useState<boolean>(false);
  const [timerFeedback, setTimerFeedback] = useState<string | null>(null);
  const autoSaveTriggeredRef = useRef<boolean>(false);

  // Estado del modal de Horarios (POST /api/schedules)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleSubjectId, setScheduleSubjectId] = useState('');
  const [scheduleDay, setScheduleDay] = useState<number>(1);
  const [scheduleStartTime, setScheduleStartTime] = useState('08:00');
  const [scheduleEndTime, setScheduleEndTime] = useState('10:00');
  const [scheduleClassroom, setScheduleClassroom] = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Combinar materias del contexto del layout y de GET /api/subjects
  const subjects = useMemo(() => {
    if (outletCtx?.subjects && outletCtx.subjects.length > 0) {
      return outletCtx.subjects;
    }
    return localSubjects;
  }, [outletCtx?.subjects, localSubjects]);

  const activeSubjectId = useMemo(() => {
    if (selectedSubjectId && subjects.some((s) => s.id === selectedSubjectId)) {
      return selectedSubjectId;
    }
    return subjects[0]?.id || '';
  }, [subjects, selectedSubjectId]);

  const activeScheduleSubjectId = useMemo(() => {
    if (scheduleSubjectId && subjects.some((s) => s.id === scheduleSubjectId)) {
      return scheduleSubjectId;
    }
    return subjects[0]?.id || '';
  }, [subjects, scheduleSubjectId]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [subjectsRes, schedulesRes, examsRes, statsRes] = await Promise.all([
        api.get<Subject[]>('/subjects').catch(() => ({ data: [] as Subject[] })),
        api.get<ClassSchedule[]>('/schedules').catch(() => ({ data: [] as ClassSchedule[] })),
        api.get<Exam[]>('/exams').catch(() => ({ data: [] as Exam[] })),
        api
          .get<StudyStatsResponse>('/sessions/stats')
          .catch(() => ({ data: null as StudyStatsResponse | null })),
      ]);

      const fetchedSubjects = Array.isArray(subjectsRes.data) ? subjectsRes.data : [];
      setLocalSubjects(fetchedSubjects);
      setSchedules(Array.isArray(schedulesRes.data) ? schedulesRes.data : []);
      setExams(Array.isArray(examsRes.data) ? examsRes.data : []);
      setStats(statsRes.data);

      // Consultar estadísticas por materia desde GET /api/sessions/stats?subjectId=...
      if (fetchedSubjects.length > 0) {
        const perSubjectEntries = await Promise.all(
          fetchedSubjects.map(async (subj) => {
            try {
              const res = await api.get<StudyStatsResponse>('/sessions/stats', {
                params: { subjectId: subj.id },
              });
              return [subj.id, res.data?.totalSeconds ?? 0] as const;
            } catch {
              return [subj.id, subj.totalSeconds ?? 0] as const;
            }
          })
        );
        setStatsBySubject(Object.fromEntries(perSubjectEntries));
      } else {
        setStatsBySubject({});
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const elapsedSeconds =
    studyMethod === 'POMODORO'
      ? Math.max(0, POMODORO_DEFAULT_SECONDS - seconds)
      : seconds;

  const saveStudySession = useCallback(
    async (durationToSave: number) => {
      if (!activeSubjectId || durationToSave <= 0) return;

      setSavingSession(true);
      setTimerFeedback(null);

      try {
        const end = new Date();
        const start = new Date(end.getTime() - durationToSave * 1000);

        await api.post('/sessions', {
          subjectId: activeSubjectId,
          method: studyMethod,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          durationSeconds: durationToSave,
        });

        setIsRunning(false);
        setSeconds(studyMethod === 'POMODORO' ? POMODORO_DEFAULT_SECONDS : 0);
        setTimerFeedback('¡Sesión guardada y métricas actualizadas!');
        await Promise.all([
          fetchDashboardData(),
          outletCtx?.refreshAcademicData ? outletCtx.refreshAcademicData() : Promise.resolve(),
        ]);
      } catch (err: unknown) {
        if (axios.isAxiosError<{ message?: string }>(err)) {
          setTimerFeedback(err.response?.data?.message || 'Error al registrar la sesión.');
        } else {
          setTimerFeedback('No se pudo guardar la sesión de estudio.');
        }
      } finally {
        setSavingSession(false);
        autoSaveTriggeredRef.current = false;
      }
    },
    [activeSubjectId, studyMethod, fetchDashboardData, outletCtx]
  );

  // Tick del temporizador
  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setSeconds((prev) => {
        if (studyMethod === 'POMODORO') {
          if (prev <= 1) {
            setIsRunning(false);
            if (!autoSaveTriggeredRef.current) {
              autoSaveTriggeredRef.current = true;
              void saveStudySession(POMODORO_DEFAULT_SECONDS);
            }
            return 0;
          }
          return prev - 1;
        }
        return prev + 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, studyMethod, saveStudySession]);

  const handleMethodChange = (method: StudyMethod) => {
    setIsRunning(false);
    setTimerFeedback(null);
    setStudyMethod(method);
    setSeconds(method === 'POMODORO' ? POMODORO_DEFAULT_SECONDS : 0);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimerFeedback(null);
    setSeconds(studyMethod === 'POMODORO' ? POMODORO_DEFAULT_SECONDS : 0);
  };

  const formatTimerClock = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Alta de Horario (POST /api/schedules)
  const handleCreateSchedule = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeScheduleSubjectId) return;

    setScheduleError(null);
    setSubmittingSchedule(true);

    try {
      await api.post('/schedules', {
        subjectId: activeScheduleSubjectId,
        dayOfWeek: Number(scheduleDay),
        startTime: scheduleStartTime,
        endTime: scheduleEndTime,
        classroom: scheduleClassroom.trim() || undefined,
      });

      setScheduleClassroom('');
      setIsScheduleModalOpen(false);
      await fetchDashboardData();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setScheduleError(err.response?.data?.message || 'No se pudo guardar el horario.');
      } else {
        setScheduleError('Error al guardar el horario.');
      }
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await api.delete(`/schedules/${id}`);
      await fetchDashboardData();
    } catch {
      // Ignorar si falla borrado
    }
  };

  // Cálculos de métricas y rachas
  const { currentStreak, restDaysAvailable } = computeStreakInfo(stats);

  const getStreakWarningText = () => {
    if (currentStreak <= 0) {
      return 'Estudiá hoy para iniciar tu racha';
    }
    if (restDaysAvailable === 2) {
      return '2 días de descanso disponibles';
    }
    if (restDaysAvailable === 1) {
      return '1 día de descanso disponible';
    }
    return '¡Estudiá hoy para mantener tu racha!';
  };

  const resolveSubject = (subjRef: Exam['subject'] | ClassSchedule['subject']) => {
    if (typeof subjRef === 'object' && subjRef !== null) {
      return subjRef;
    }
    return subjects.find((s) => s.id === subjRef) || null;
  };

  const getExamDaysLeft = (isoDate: string): number => {
    const todayKey = formatDateKey(new Date());
    const examKey = formatDateKey(new Date(isoDate));
    return diffCalendarDays(examKey, todayKey);
  };

  // Filtrado estricto: exámenes pendientes cuya examDate esté entre hoy (0) y los próximos 30 días (<= 30)
  const upcomingExams30Days = useMemo(() => {
    return exams
      .filter((exam) => {
        if (exam.isCompleted) return false;
        const daysLeft = getExamDaysLeft(exam.examDate);
        return daysLeft >= 0 && daysLeft <= 30;
      })
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
  }, [exams]);

  const nextExam = upcomingExams30Days[0] || null;
  const nextExamDays = nextExam ? getExamDaysLeft(nextExam.examDate) : null;

  // Datos para el gráfico de barras de rendimiento por materia (GET /api/sessions/stats)
  const subjectChartData = useMemo(() => {
    const items = subjects.map((subj) => {
      const secs =
        statsBySubject[subj.id] ??
        outletCtx?.subjectSecondsMap?.[subj.id] ??
        subj.totalSeconds ??
        0;
      const hours = Number((secs / 3600).toFixed(1));
      return {
        id: subj.id,
        name: subj.name,
        color: subj.color || '#4F46E5',
        seconds: secs,
        hours,
        formatted: formatTotalHours(secs),
      };
    });

    const maxSeconds = Math.max(...items.map((i) => i.seconds), 3600);
    return items.map((item) => ({
      ...item,
      percentOfMax: item.seconds > 0 ? Math.max(8, Math.round((item.seconds / maxSeconds) * 100)) : 0,
    }));
  }, [subjects, statsBySubject, outletCtx?.subjectSecondsMap]);

  const totalStudiedSeconds = useMemo(() => {
    if (stats?.totalSeconds && stats.totalSeconds > 0) {
      return stats.totalSeconds;
    }
    return subjectChartData.reduce((acc, item) => acc + item.seconds, 0);
  }, [stats, subjectChartData]);

  // Horarios filtrados y organizados por hora para la línea de tiempo
  const filteredSchedules = useMemo(() => {
    const list =
      selectedTimelineDay === 0
        ? schedules
        : schedules.filter((item) => Number(item.dayOfWeek) === selectedTimelineDay);

    return [...list].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [schedules, selectedTimelineDay]);

  const timelineHours = useMemo(() => {
    const hourSet = new Set<number>(DEFAULT_TIMELINE_HOURS);
    for (const sched of schedules) {
      const startH = parseHour(sched.startTime);
      const endH = parseHour(sched.endTime);
      hourSet.add(startH);
      if (endH >= startH && endH <= 23) {
        for (let h = startH; h <= endH; h++) {
          hourSet.add(h);
        }
      }
    }
    return Array.from(hourSet).sort((a, b) => a - b);
  }, [schedules]);

  const schedulesByStartHour = useMemo(() => {
    const map: Record<number, ClassSchedule[]> = {};
    for (const item of filteredSchedules) {
      const hour = parseHour(item.startTime);
      if (!map[hour]) {
        map[hour] = [];
      }
      map[hour].push(item);
    }
    return map;
  }, [filteredSchedules]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* COLUMNA IZQUIERDA / CENTRO (lg:col-span-8) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* 1. BANNER DE BIENVENIDA CON RESUMEN DE ACTIVIDAD */}
        <section
          aria-label="Banner de bienvenida y resumen de actividad"
          className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Resumen de Actividad</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Hola, {user?.name?.split(' ')[0] || 'Estudiante'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Seguí tu ritmo de estudio, rendimiento por materia y próximas fechas clave.
              </p>
            </div>
          </div>

          {/* Tarjetas de resumen de actividad */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            {/* Tiempo Total Estudiado */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Tiempo Estudiado
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {formatTotalHours(totalStudiedSeconds)}
                </p>
                <p className="text-xs text-indigo-600 font-medium mt-0.5">
                  {stats?.totalSessions || 0}{' '}
                  {stats?.totalSessions === 1 ? 'sesión registrada' : 'sesiones registradas'}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Racha Activa */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Racha Activa
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {currentStreak} {currentStreak === 1 ? 'día' : 'días'}
                </p>
                <p
                  className={`text-xs font-medium mt-0.5 truncate ${
                    currentStreak > 0 && restDaysAvailable === 0
                      ? 'text-rose-600'
                      : currentStreak > 0 && restDaysAvailable === 1
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {getStreakWarningText()}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
            </div>

            {/* Próximo Examen (30 días) */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Próximo Examen
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {nextExam
                    ? nextExamDays === 0
                      ? '¡Es hoy!'
                      : `En ${nextExamDays} ${nextExamDays === 1 ? 'día' : 'días'}`
                    : 'Sin fechas'}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {nextExam ? nextExam.title : 'Sin exámenes en 30 días'}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
            </div>
          </div>
        </section>

        {/* 2. MÉTODO DE ESTUDIO (CRONÓMETRO Y POMODORO CONECTADO A GET /api/subjects Y POST /api/sessions) */}
        <section
          aria-label="Método de Estudio"
          className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-md"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                  Método de Estudio
                </span>
                <div className="inline-flex rounded-2xl bg-white/10 p-1 backdrop-blur-xs">
                  <button
                    type="button"
                    onClick={() => handleMethodChange('POMODORO')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      studyMethod === 'POMODORO'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-indigo-100 hover:text-white'
                    }`}
                  >
                    Pomodoro
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMethodChange('CHRONOMETER')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      studyMethod === 'CHRONOMETER'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-indigo-100 hover:text-white'
                    }`}
                  >
                    Cronómetro
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="timer-subject"
                  className="block text-xs font-medium text-indigo-200 mb-1.5"
                >
                  Materia de la sesión
                </label>
                {subjects.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => outletCtx?.openSubjectsDrawer()}
                    className="w-full py-2.5 px-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-dashed border-white/30 text-xs text-indigo-100 font-medium transition cursor-pointer text-left"
                  >
                    + Creá una materia desde el panel superior para registrar sesiones
                  </button>
                ) : (
                  <select
                    id="timer-subject"
                    value={activeSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full rounded-2xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  >
                    {subjects.map((subj) => (
                      <option key={subj.id} value={subj.id} className="text-slate-900">
                        {subj.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {timerFeedback && (
                <p className="text-xs text-indigo-100 bg-white/10 rounded-2xl px-3.5 py-2.5">
                  {timerFeedback}
                </p>
              )}
            </div>

            {/* Reloj y controles */}
            <div className="flex flex-col items-center justify-center md:min-w-64 bg-white/5 border border-white/10 rounded-3xl p-5">
              <div className="text-5xl sm:text-6xl font-mono font-bold tracking-tight">
                {formatTimerClock(seconds)}
              </div>
              <p className="text-xs text-indigo-200 mt-1.5 mb-4">
                {studyMethod === 'POMODORO'
                  ? 'Enfoque de 25 minutos'
                  : 'Tiempo libre continuo'}
              </p>

              <div className="flex items-center gap-2.5 w-full">
                <button
                  type="button"
                  disabled={subjects.length === 0 || savingSession}
                  onClick={() => {
                    setTimerFeedback(null);
                    setIsRunning((prev) => !prev);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 disabled:opacity-50 transition shadow-sm cursor-pointer"
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Iniciar</span>
                    </>
                  )}
                </button>

                {elapsedSeconds > 0 && (
                  <button
                    type="button"
                    disabled={savingSession || !activeSubjectId}
                    onClick={() => void saveStudySession(elapsedSeconds)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm transition cursor-pointer shadow-sm"
                  >
                    {savingSession ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Guardar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetTimer}
                  title="Reiniciar"
                  aria-label="Reiniciar temporizador"
                  className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. GRÁFICO DE BARRAS DE RENDIMIENTO / HORAS ESTUDIADAS POR MATERIA (GET /api/sessions/stats) */}
        <section
          aria-label="Gráfico de rendimiento por materia"
          className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Rendimiento y Horas por Materia
                </h2>
                <p className="text-xs text-slate-500">
                  Distribución de tiempo de estudio registrado en tus sesiones
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Total: {formatTotalHours(totalStudiedSeconds)}</span>
            </span>
          </div>

          {loadingData ? (
            <div className="py-12 flex items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Cargando estadísticas de estudio...</span>
            </div>
          ) : subjectChartData.length === 0 ? (
            <div className="py-10 px-4 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
              <BarChart3 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                Sin datos de materias para graficar
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Agregá tus materias desde el botón superior y registrá sesiones con el Pomodoro o Cronómetro.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Gráfico de columnas verticales */}
              <div className="pt-4 pb-2 px-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                <div className="h-44 flex items-end justify-around gap-3 sm:gap-5 border-b border-slate-200/80 pb-3">
                  {subjectChartData.map((item) => (
                    <div
                      key={item.id}
                      className="flex-1 max-w-20 h-full flex flex-col items-center justify-end group"
                    >
                      <span className="text-[11px] font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                        {item.formatted}
                      </span>
                      <div className="w-full max-w-12 bg-slate-200/60 rounded-t-2xl h-32 flex items-end overflow-hidden p-0.5">
                        <div
                          className="w-full rounded-t-xl transition-all duration-500"
                          style={{
                            height: `${Math.max(item.percentOfMax, 6)}%`,
                            backgroundColor: item.color,
                          }}
                          title={`${item.name}: ${item.formatted}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Etiquetas del eje X */}
                <div className="flex items-start justify-around gap-3 sm:gap-5 pt-2.5">
                  {subjectChartData.map((item) => (
                    <div key={item.id} className="flex-1 max-w-20 text-center min-w-0">
                      <p
                        className="text-xs font-semibold text-slate-700 truncate"
                        title={item.name}
                      >
                        {item.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Barras horizontales comparativas de detalle */}
              <div className="space-y-3">
                {subjectChartData.map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-800 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-700 shrink-0">
                        {item.formatted} ({item.hours} h)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentOfMax}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 4. PRÓXIMOS EXÁMENES (SOLO PRÓXIMOS 30 DÍAS + ENLACE 'Ver todos' HACIA /examenes) */}
        <section
          aria-label="Próximos Exámenes"
          className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Próximos Exámenes</h2>
                <p className="text-xs text-slate-500">
                  Exámenes pendientes en los próximos 30 días
                </p>
              </div>
            </div>

            <Link
              to="/examenes"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingData ? (
            <div className="py-10 flex items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Cargando próximos exámenes...</span>
            </div>
          ) : upcomingExams30Days.length === 0 ? (
            <div className="py-10 px-4 rounded-2xl border border-dashed border-slate-200 text-center space-y-1.5">
              <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                No tenés exámenes pendientes en los próximos 30 días
              </p>
              <p className="text-xs text-slate-500">
                Tus evaluaciones cercanas aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingExams30Days.map((exam) => {
                const subj = resolveSubject(exam.subject);
                const daysLeft = getExamDaysLeft(exam.examDate);
                const formattedDate = new Date(exam.examDate).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: subj?.color || '#4F46E5' }}
                        />
                        <span className="text-xs font-semibold text-slate-600 truncate">
                          {subj?.name || 'Materia'}
                        </span>
                        <span className="text-xs text-slate-400">• {formattedDate}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">
                        {exam.title}
                      </h3>
                    </div>

                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                          daysLeft <= 3
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : daysLeft <= 10
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>
                          {daysLeft === 0
                            ? '¡Es hoy!'
                            : daysLeft === 1
                            ? 'Falta 1 día'
                            : `Faltan ${daysLeft} días`}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* COLUMNA DERECHA DE LARGO COMPLETO (lg:col-span-4, h-full) */}
      <div className="lg:col-span-4 h-full">
        <aside
          aria-label="Calendario y Horarios de Cursada"
          className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs h-full flex flex-col justify-between"
        >
          <div className="flex flex-col flex-1">
            {/* Cabecera del Calendario / Horarios */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Horarios de Cursada</h2>
                  <p className="text-xs text-slate-500">Agenda y línea de tiempo por horas</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setScheduleError(null);
                  setIsScheduleModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer shrink-0 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </div>

            {/* Selector de día de la semana */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTimelineDay(0)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  selectedTimelineDay === 0
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setSelectedTimelineDay(d.value)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                    selectedTimelineDay === d.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {DAY_LABELS[d.value]}
                </button>
              ))}
            </div>

            {/* Línea de tiempo por horas */}
            {loadingData ? (
              <div className="flex-1 py-16 flex items-center justify-center text-slate-400 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Cargando línea de tiempo...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-1">
                {filteredSchedules.length === 0 && (
                  <div className="mb-4 p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-700">
                      {selectedTimelineDay === 0
                        ? 'Sin horarios de cursada cargados'
                        : `Sin clases registradas los ${DAY_FULL_LABELS[selectedTimelineDay]}`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Usá el botón "+ Agregar" para agendar tus bloques de cursada.
                    </p>
                  </div>
                )}

                <div className="relative">
                  {timelineHours.map((hour) => {
                    const hourLabel = `${String(hour).padStart(2, '0')}:00`;
                    const blocks = schedulesByStartHour[hour] || [];

                    return (
                      <div
                        key={hour}
                        className="grid grid-cols-[52px_1fr] gap-3 group min-h-12"
                      >
                        {/* Hora en el eje vertical */}
                        <div className="text-right pr-1 pt-1">
                          <span className="text-[11px] font-mono font-semibold text-slate-400">
                            {hourLabel}
                          </span>
                        </div>

                        {/* Carril de línea de tiempo */}
                        <div className="relative border-l-2 border-slate-100 pl-4 pb-3 pt-0.5">
                          {/* Punto indicador en la línea */}
                          <span
                            className={`absolute -left-[5px] top-2 w-2 h-2 rounded-full ${
                              blocks.length > 0
                                ? 'bg-indigo-600 ring-4 ring-indigo-50'
                                : 'bg-slate-200'
                            }`}
                          />

                          {blocks.length === 0 ? (
                            <div className="h-6 border-b border-dashed border-slate-100/80" />
                          ) : (
                            <div className="space-y-2.5">
                              {blocks.map((item) => {
                                const subj = resolveSubject(item.subject);
                                const color = subj?.color || '#4F46E5';

                                return (
                                  <div
                                    key={item.id}
                                    className="rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs transition hover:shadow-xs"
                                    style={{
                                      borderLeftWidth: '5px',
                                      borderLeftColor: color,
                                      backgroundColor: `${color}10`,
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span
                                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-white"
                                            style={{ backgroundColor: color }}
                                          >
                                            {DAY_LABELS[item.dayOfWeek] || `Día ${item.dayOfWeek}`}
                                          </span>
                                          <span className="text-xs font-mono font-semibold text-slate-700">
                                            {item.startTime} - {item.endTime}
                                          </span>
                                        </div>

                                        <h3 className="text-sm font-bold text-slate-900 mt-1.5 truncate">
                                          {subj?.name || 'Materia'}
                                        </h3>

                                        {item.classroom && (
                                          <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="truncate">{item.classroom}</span>
                                          </div>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => void handleDeleteSchedule(item.id)}
                                        aria-label="Eliminar horario"
                                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-white/80 transition cursor-pointer shrink-0"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Pie de la agenda con botón rápido */}
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setScheduleError(null);
                setIsScheduleModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 text-xs font-semibold text-slate-600 hover:text-indigo-700 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo bloque horario</span>
            </button>
          </div>
        </aside>
      </div>

      {/* MODAL: Alta de Horario (POST /api/schedules) */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsScheduleModalOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Nuevo Horario de Cursada</h3>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {subjects.length === 0 ? (
              <div className="space-y-4 text-center py-4">
                <p className="text-sm text-slate-600">
                  Primero necesitás crear al menos una materia para asignarle un horario.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsScheduleModalOpen(false);
                    outletCtx?.openSubjectsDrawer();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer"
                >
                  Ir a crear materia
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                {scheduleError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{scheduleError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Materia
                  </label>
                  <select
                    required
                    value={activeScheduleSubjectId}
                    onChange={(e) => setScheduleSubjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Día de la semana
                  </label>
                  <select
                    required
                    value={scheduleDay}
                    onChange={(e) => setScheduleDay(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {DAY_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hora inicio
                    </label>
                    <input
                      type="time"
                      required
                      value={scheduleStartTime}
                      onChange={(e) => setScheduleStartTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hora fin
                    </label>
                    <input
                      type="time"
                      required
                      value={scheduleEndTime}
                      onChange={(e) => setScheduleEndTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aula / Comisión (opcional)
                  </label>
                  <input
                    type="text"
                    value={scheduleClassroom}
                    onChange={(e) => setScheduleClassroom(e.target.value)}
                    placeholder="Ej. Aula 304 / Lab 2"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSchedule}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    {submittingSchedule && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Guardar horario</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
