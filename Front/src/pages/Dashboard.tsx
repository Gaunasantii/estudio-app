import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { FormEvent } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
  Clock,
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

const DAY_FULL_LABELS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

const ALL_WEEK_DAYS = [
  { dayOfWeek: 1, short: 'Lun', label: 'Lunes' },
  { dayOfWeek: 2, short: 'Mar', label: 'Martes' },
  { dayOfWeek: 3, short: 'Mié', label: 'Miércoles' },
  { dayOfWeek: 4, short: 'Jue', label: 'Jueves' },
  { dayOfWeek: 5, short: 'Vie', label: 'Viernes' },
  { dayOfWeek: 6, short: 'Sáb', label: 'Sábado' },
  { dayOfWeek: 7, short: 'Dom', label: 'Domingo' },
];

const DAY_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

const TIMELINE_START_HOUR = 7;
const TIMELINE_END_HOUR = 22;
const TIMELINE_HOURS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
  (_, idx) => TIMELINE_START_HOUR + idx
);
const TIMELINE_TOTAL_SPAN_HOURS = TIMELINE_HOURS.length; // 16 bloques horarios (07:00 a 22:00+)

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

function formatTotalHours(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0 h';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} h`;
  if (mins > 0) return `${mins} min`;
  return `${totalSeconds} s`;
}

function parseTimeToDecimalHours(timeStr: string): number {
  const parts = (timeStr || '08:00').split(':').map(Number);
  const hours = Number.isFinite(parts[0]) ? parts[0] : 8;
  const minutes = Number.isFinite(parts[1]) ? parts[1] : 0;
  return hours + minutes / 60;
}

function formatTimeHHMM(timeStr: string): string {
  const parts = (timeStr || '').split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return timeStr;
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

  // Preferencia de Sábado y Domingo leída desde localStorage (por defecto false = Lunes a Viernes)
  const [includeWeekend, setIncludeWeekend] = useState<boolean>(() => {
    return localStorage.getItem('includeWeekendInSchedule') === 'true';
  });

  useEffect(() => {
    const syncPreference = () => {
      setIncludeWeekend(localStorage.getItem('includeWeekendInSchedule') === 'true');
    };

    window.addEventListener('weekend-preference-change', syncPreference);
    window.addEventListener('storage', syncPreference);
    return () => {
      window.removeEventListener('weekend-preference-change', syncPreference);
      window.removeEventListener('storage', syncPreference);
    };
  }, []);

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
        setTimerFeedback('¡Sesión guardada!');
        await Promise.all([
          fetchDashboardData(),
          outletCtx?.refreshAcademicData ? outletCtx.refreshAcademicData() : Promise.resolve(),
        ]);
      } catch (err: unknown) {
        if (axios.isAxiosError<{ message?: string }>(err)) {
          setTimerFeedback(err.response?.data?.message || 'Error al registrar la sesión.');
        } else {
          setTimerFeedback('No se pudo guardar la sesión.');
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
      percentOfMax: item.seconds > 0 ? Math.max(10, Math.round((item.seconds / maxSeconds) * 100)) : 0,
    }));
  }, [subjects, statsBySubject, outletCtx?.subjectSecondsMap]);

  const totalStudiedSeconds = useMemo(() => {
    if (stats?.totalSeconds && stats.totalSeconds > 0) {
      return stats.totalSeconds;
    }
    return subjectChartData.reduce((acc, item) => acc + item.seconds, 0);
  }, [stats, subjectChartData]);

  // Días visibles según el checkbox de Ajustes (Lunes a Viernes por defecto, o Lunes a Domingo)
  const visibleWeekDays = useMemo(() => {
    return includeWeekend ? ALL_WEEK_DAYS : ALL_WEEK_DAYS.slice(0, 5);
  }, [includeWeekend]);

  // Agrupar horarios por día de la semana (1 = Lunes ... 7 = Domingo)
  const schedulesByDay = useMemo(() => {
    const map: Record<number, ClassSchedule[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
    };
    for (const item of schedules) {
      const day = Number(item.dayOfWeek);
      if (map[day]) {
        map[day].push(item);
      }
    }
    for (const day of Object.keys(map)) {
      map[Number(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [schedules]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[1.05fr_1.15fr_1.25fr] h-full min-h-0 gap-4">
      {/* FILA 1, COLUMNA 1 (lg:col-span-4): RESUMEN DE ACTIVIDAD */}
      <section
        aria-label="Resumen de Actividad"
        className="lg:col-span-4 lg:col-start-1 lg:row-start-1 bg-white rounded-3xl border border-slate-200/80 p-4 xl:p-5 shadow-xs flex flex-col justify-between min-h-0 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-2 min-h-0">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Resumen de Actividad</span>
            </div>
            <h1 className="text-lg xl:text-xl font-bold text-slate-900 tracking-tight truncate">
              Hola, {user?.name?.split(' ')[0] || 'Estudiante'}
            </h1>
            <p className="text-xs text-slate-500 truncate">
              Tu progreso académico en tiempo real.
            </p>
          </div>
        </div>

        {/* Grilla de métricas en 2 columnas: Tiempo Estudiado y Próximo Examen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5 mt-2 border-t border-slate-100 min-h-0">
          {/* Tiempo Estudiado */}
          <div className="rounded-2xl bg-slate-50/80 border border-slate-100 p-3 flex items-center justify-between gap-2 min-h-0">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                Tiempo Estudiado
              </p>
              <p className="text-base xl:text-lg font-bold text-slate-900 leading-tight mt-0.5 truncate">
                {formatTotalHours(totalStudiedSeconds)}
              </p>
              <p className="text-[11px] text-indigo-600 font-medium truncate">
                {stats?.totalSessions || 0}{' '}
                {stats?.totalSessions === 1 ? 'sesión' : 'sesiones'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          {/* Próximo Examen */}
          <div className="rounded-2xl bg-slate-50/80 border border-slate-100 p-3 flex items-center justify-between gap-2 min-h-0">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                Próximo Examen
              </p>
              <p className="text-base xl:text-lg font-bold text-slate-900 leading-tight mt-0.5 truncate">
                {nextExam
                  ? nextExamDays === 0
                    ? '¡Es hoy!'
                    : `En ${nextExamDays} ${nextExamDays === 1 ? 'día' : 'días'}`
                  : 'Sin fechas'}
              </p>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {nextExam ? nextExam.title : 'Libre 30 días'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* FILA 1, COLUMNA 2 (lg:col-span-4): MÉTODO DE ESTUDIO */}
      <section
        aria-label="Método de Estudio"
        className="lg:col-span-4 lg:col-start-5 lg:row-start-1 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white rounded-3xl p-4 xl:p-5 shadow-md flex flex-col justify-between min-h-0 overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200 truncate">
            Método de Estudio
          </span>
          <div className="inline-flex rounded-xl bg-white/10 p-0.5 backdrop-blur-xs shrink-0">
            <button
              type="button"
              onClick={() => handleMethodChange('POMODORO')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                studyMethod === 'POMODORO'
                  ? 'bg-white text-indigo-900 shadow-2xs'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              Pomodoro
            </button>
            <button
              type="button"
              onClick={() => handleMethodChange('CHRONOMETER')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                studyMethod === 'CHRONOMETER'
                  ? 'bg-white text-indigo-900 shadow-2xs'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              Cronómetro
            </button>
          </div>
        </div>

        {/* Reloj compacto + Selector de materia */}
        <div className="flex items-center justify-between gap-3 my-1 min-h-0">
          <div className="shrink-0">
            <div className="text-2xl xl:text-3xl font-mono font-bold tracking-tight leading-none">
              {formatTimerClock(seconds)}
            </div>
            <p className="text-[10px] text-indigo-200 mt-1">
              {timerFeedback ||
                (studyMethod === 'POMODORO' ? 'Bloque 25 min' : 'Tiempo libre')}
            </p>
          </div>

          <div className="flex-1 min-w-0">
            <label htmlFor="timer-subject" className="sr-only">
              Materia de la sesión
            </label>
            {subjects.length === 0 ? (
              <button
                type="button"
                onClick={() => outletCtx?.openSubjectsDrawer()}
                className="w-full py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-dashed border-white/30 text-[11px] text-indigo-100 font-medium transition cursor-pointer truncate"
              >
                + Crear materia
              </button>
            ) : (
              <select
                id="timer-subject"
                value={activeSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-white/40 truncate"
              >
                {subjects.map((subj) => (
                  <option key={subj.id} value={subj.id} className="text-slate-900">
                    {subj.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Controles del temporizador */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={subjects.length === 0 || savingSession}
            onClick={() => {
              setTimerFeedback(null);
              setIsRunning((prev) => !prev);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white text-indigo-700 font-semibold text-xs hover:bg-indigo-50 disabled:opacity-50 transition shadow-2xs cursor-pointer"
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Iniciar</span>
              </>
            )}
          </button>

          {elapsedSeconds > 0 && (
            <button
              type="button"
              disabled={savingSession || !activeSubjectId}
              onClick={() => void saveStudySession(elapsedSeconds)}
              className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs transition cursor-pointer shadow-2xs"
            >
              {savingSession ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Guardar</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetTimer}
            title="Reiniciar"
            aria-label="Reiniciar temporizador"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* FILA 2, COLUMNAS 1 Y 2 UNIDAS (lg:col-span-8): RENDIMIENTO Y HORAS POR MATERIA */}
      <section
        aria-label="Gráfico de rendimiento por materia"
        className="lg:col-span-8 lg:col-start-1 lg:row-start-2 bg-white rounded-3xl border border-slate-200/80 p-4 xl:p-5 shadow-xs flex flex-col justify-between min-h-0 overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm xl:text-base font-bold text-slate-900 truncate">
                Rendimiento y Horas por Materia
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                Tiempo de estudio acumulado por asignatura
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold shrink-0">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Total: {formatTotalHours(totalStudiedSeconds)}</span>
          </span>
        </div>

        {loadingData ? (
          <div className="flex-1 min-h-0 flex items-center justify-center text-slate-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Cargando estadísticas...</span>
          </div>
        ) : subjectChartData.length === 0 ? (
          <div className="flex-1 min-h-0 px-4 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <BarChart3 className="w-6 h-6 text-slate-300 mb-1" />
            <p className="text-xs font-semibold text-slate-700">
              Sin datos de materias para graficar
            </p>
            <p className="text-[11px] text-slate-500">
              Creá tus materias y registrá sesiones con el temporizador.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col justify-end rounded-2xl bg-slate-50/70 border border-slate-100 px-3 pt-2 pb-1.5">
            <div className="flex-1 min-h-0 flex items-end justify-around gap-3 border-b border-slate-200/80 pb-1.5">
              {subjectChartData.map((item) => (
                <div
                  key={item.id}
                  className="flex-1 max-w-20 h-full min-h-0 flex flex-col items-center justify-end"
                >
                  <span className="text-[10px] font-bold text-slate-700 mb-1 whitespace-nowrap">
                    {item.formatted}
                  </span>
                  <div className="w-full max-w-11 bg-slate-200/60 rounded-t-xl flex-1 min-h-0 flex items-end overflow-hidden p-0.5">
                    <div
                      className="w-full rounded-t-lg transition-all duration-500"
                      style={{
                        height: `${Math.max(item.percentOfMax, 8)}%`,
                        backgroundColor: item.color,
                      }}
                      title={`${item.name}: ${item.formatted} (${item.hours} h)`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-around gap-3 pt-1.5 shrink-0">
              {subjectChartData.map((item) => (
                <div
                  key={item.id}
                  className="flex-1 max-w-20 flex items-center justify-center gap-1 min-w-0"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <p
                    className="text-[11px] font-semibold text-slate-700 truncate"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* FILAS 1 Y 2 UNIDAS, COLUMNA 3 (lg:col-span-4 lg:row-span-2): PRÓXIMOS EXÁMENES */}
      <section
        aria-label="Próximos Exámenes"
        className="lg:col-span-4 lg:row-span-2 lg:col-start-9 lg:row-start-1 bg-white rounded-3xl border border-slate-200/80 p-4 xl:p-5 shadow-xs flex flex-col min-h-0 overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm xl:text-base font-bold text-slate-900 truncate">
                Próximos Exámenes
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                Pendientes en los próximos 30 días
              </p>
            </div>
          </div>

          <Link
            to="/examenes"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition shrink-0"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingData ? (
          <div className="flex-1 min-h-0 flex items-center justify-center text-slate-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Cargando exámenes...</span>
          </div>
        ) : upcomingExams30Days.length === 0 ? (
          <div className="flex-1 min-h-0 px-4 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-1">
            <CalendarCheck className="w-7 h-7 text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">
              Sin exámenes en los próximos 30 días
            </p>
            <p className="text-[11px] text-slate-500">
              Tus evaluaciones cercanas aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
            {upcomingExams30Days.map((exam) => {
              const subj = resolveSubject(exam.subject);
              const daysLeft = getExamDaysLeft(exam.examDate);
              const formattedDate = new Date(exam.examDate).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'short',
              });

              return (
                <div
                  key={exam.id}
                  className="flex items-center justify-between gap-2.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: subj?.color || '#4F46E5' }}
                      />
                      <span className="text-[11px] font-semibold text-slate-600 truncate">
                        {subj?.name || 'Materia'}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        • {formattedDate}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                      {exam.title}
                    </h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 ${
                      daysLeft <= 3
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : daysLeft <= 10
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}
                  >
                    <CalendarClock className="w-3 h-3" />
                    <span>
                      {daysLeft === 0
                        ? 'Hoy'
                        : daysLeft === 1
                        ? '1 día'
                        : `${daysLeft} días`}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FILA 3 COMPLETA (lg:col-span-12): HORARIO SEMANAL HORIZONTAL */}
      <section
        aria-label="Horario Semanal"
        className="lg:col-span-12 lg:col-start-1 lg:row-start-3 bg-white rounded-3xl border border-slate-200/80 p-4 xl:p-5 shadow-xs flex flex-col min-h-0"
      >
        {/* Cabecera del Horario Semanal */}
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm xl:text-base font-bold text-slate-900 truncate">
                Horario Semanal
              </h2>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-semibold">
                {includeWeekend ? 'Lunes a Domingo' : 'Lunes a Viernes'} • 07:00 a 22:00
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setScheduleError(null);
              setIsScheduleModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer shrink-0 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Agregar</span>
          </button>
        </div>

        {loadingData ? (
          <div className="flex-1 min-h-0 flex items-center justify-center text-slate-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Cargando horario semanal...</span>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Encabezado horizontal de horas (07:00 a 22:00 de izquierda a derecha) */}
            <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[72px_1fr] gap-2 pb-1 border-b border-slate-200/80 shrink-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 pl-1">
                Día
              </div>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${TIMELINE_TOTAL_SPAN_HOURS}, minmax(0, 1fr))`,
                }}
              >
                {TIMELINE_HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="text-[10px] font-mono font-medium text-slate-400 text-left pl-0.5 truncate select-none"
                  >
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Filas por cada día de la semana */}
            <div
              className="flex-1 min-h-0 grid divide-y divide-slate-100"
              style={{
                gridTemplateRows: `repeat(${visibleWeekDays.length}, minmax(0, 1fr))`,
              }}
            >
              {visibleWeekDays.map((dayRow) => {
                const daySchedules = schedulesByDay[dayRow.dayOfWeek] || [];

                return (
                  <div
                    key={dayRow.dayOfWeek}
                    className="grid grid-cols-[56px_1fr] sm:grid-cols-[72px_1fr] gap-2 items-center min-h-0"
                  >
                    {/* Etiqueta del día a la izquierda */}
                    <div className="flex items-center gap-1.5 pl-1 min-w-0">
                      <span
                        className={`text-xs font-bold truncate ${
                          daySchedules.length > 0 ? 'text-slate-900' : 'text-slate-400'
                        }`}
                        title={dayRow.label}
                      >
                        {dayRow.short}
                      </span>
                    </div>

                    {/* Carril horizontal de 07:00 a 22:00 */}
                    <div className="relative h-full w-full min-h-[22px]">
                      {/* Líneas guía verticales suaves por hora */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 grid"
                        style={{
                          gridTemplateColumns: `repeat(${TIMELINE_TOTAL_SPAN_HOURS}, minmax(0, 1fr))`,
                        }}
                      >
                        {TIMELINE_HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="border-l border-slate-100 h-full"
                          />
                        ))}
                      </div>

                      {/* Barras horizontales redondeadas por clase */}
                      {daySchedules.map((item) => {
                        const subj = resolveSubject(item.subject);
                        const color = subj?.color || '#4F46E5';
                        const subjectName = subj?.name || 'Materia';

                        const rawStart = parseTimeToDecimalHours(item.startTime);
                        const rawEnd = parseTimeToDecimalHours(item.endTime);

                        const clampedStart = Math.max(
                          TIMELINE_START_HOUR,
                          Math.min(TIMELINE_END_HOUR + 0.75, rawStart)
                        );
                        const clampedEnd = Math.max(
                          clampedStart + 0.5,
                          Math.min(TIMELINE_END_HOUR + 1, rawEnd)
                        );

                        const leftPercent =
                          ((clampedStart - TIMELINE_START_HOUR) /
                            TIMELINE_TOTAL_SPAN_HOURS) *
                          100;
                        const widthPercent = Math.max(
                          3.5,
                          ((clampedEnd - clampedStart) / TIMELINE_TOTAL_SPAN_HOURS) *
                            100
                        );

                        const startFormatted = formatTimeHHMM(item.startTime);
                        const endFormatted = formatTimeHHMM(item.endTime);

                        return (
                          <div
                            key={item.id}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                            className="group/bar absolute inset-y-1 z-10 hover:z-40"
                          >
                            {/* Barra horizontal redondeada */}
                            <div
                              style={{ backgroundColor: color }}
                              className="w-full h-full rounded-xl px-2 flex items-center justify-between gap-1 shadow-2xs cursor-pointer overflow-hidden transition-transform duration-150 group-hover/bar:scale-[1.02] group-hover/bar:ring-2 group-hover/bar:ring-slate-900/15"
                            >
                              <span className="text-[11px] font-bold text-white truncate select-none">
                                {subjectName}
                              </span>
                            </div>

                            {/* Tooltip flotante hacia arriba (bottom-full mb-2) para no cortarse abajo */}
                            <div className="invisible opacity-0 pointer-events-none group-hover/bar:visible group-hover/bar:opacity-100 group-hover/bar:pointer-events-auto transition-all duration-150 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-56 after:content-[''] after:absolute after:top-full after:inset-x-0 after:h-3">
                              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-3 text-left space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: color }}
                                    />
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {subjectName}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleDeleteSchedule(item.id);
                                    }}
                                    aria-label={`Eliminar horario de ${subjectName}`}
                                    title="Eliminar horario"
                                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="space-y-1 text-[11px] text-slate-600">
                                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>
                                      {DAY_FULL_LABELS[item.dayOfWeek] ||
                                        `Día ${item.dayOfWeek}`}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 font-mono text-slate-600">
                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>
                                      {startFormatted} - {endFormatted}
                                    </span>
                                  </div>

                                  {item.classroom && (
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{item.classroom}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

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
