import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart3,
  Clock,
  Calendar,
  TrendingUp,
  BookOpen,
  Loader2,
  AlertCircle,
  Sparkles,
  Activity,
} from 'lucide-react';
import api from '../api/axios';
import type { Subject, StudySession } from '../types/academic';

type SubjectPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

const PERIOD_TABS: { id: SubjectPeriod; label: string; description: string }[] = [
  { id: 'DAY', label: 'Día', description: 'Hoy' },
  { id: 'WEEK', label: 'Semana', description: 'Semana actual' },
  { id: 'MONTH', label: 'Mes', description: 'Mes actual' },
  { id: 'YEAR', label: 'Año', description: 'Año actual' },
];

/**
 * Formatea una cantidad de segundos en horas y segundos ("Xh Ys") para el eje Y
 * y etiquetas de gráficos de rendimiento.
 */
function formatHoursAndSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const remainingSeconds = safeSeconds % 3600;
  return `${hours}h ${remainingSeconds}s`;
}

/**
 * Formatea una duración legible combinando horas, minutos y segundos.
 */
function formatReadableDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  if (safeSeconds === 0) return '0h 0s';
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

/**
 * Formatea una duración exacta en formato "Xh Ym Zs" (ej. "2h 15m 30s").
 */
function formatExactDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Formatea una fecha en formato "dd/mm/yyyy".
 */
function formatDateDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

type HeatmapIntensity = 0 | 1 | 2 | 3 | 4;

interface HeatmapDayCell {
  dateKey: string;
  formattedDate: string;
  isCurrentYear: boolean;
  isToday: boolean;
  totalSeconds: number;
  sessionsCount: number;
  intensity: HeatmapIntensity;
}

const HEATMAP_LEVEL_CLASSES: Record<HeatmapIntensity, string> = {
  0: 'bg-slate-200/75 border-slate-300/60 hover:ring-slate-400 dark:bg-slate-800/70 dark:border-white/[0.07] dark:hover:ring-slate-500',
  1: 'bg-emerald-200 border-emerald-300/80 hover:ring-emerald-400 dark:bg-emerald-900/75 dark:border-emerald-700/60 dark:hover:ring-emerald-500',
  2: 'bg-emerald-400 border-emerald-500/80 hover:ring-emerald-500 dark:bg-emerald-600/85 dark:border-emerald-500/70 dark:hover:ring-emerald-400',
  3: 'bg-emerald-500 border-emerald-600/80 hover:ring-emerald-600 dark:bg-emerald-500 dark:border-emerald-400/80 dark:hover:ring-emerald-300',
  4: 'bg-emerald-700 border-emerald-800/80 hover:ring-emerald-800 dark:bg-emerald-400 dark:border-emerald-300 dark:hover:ring-indigo-400 dark:shadow-[0_0_8px_rgba(52,211,153,0.35)]',
};

const HEATMAP_MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const HEATMAP_DAY_ROWS = [
  { index: 0, label: 'Lun' },
  { index: 1, label: 'Mar' },
  { index: 2, label: 'Mié' },
  { index: 3, label: 'Jue' },
  { index: 4, label: 'Vie' },
  { index: 5, label: 'Sáb' },
  { index: 6, label: 'Dom' },
];

/**
 * Obtiene el lunes a las 00:00:00.000 de la semana correspondiente a la fecha dada.
 */
function getStartOfISOWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 (Dom) a 6 (Sáb)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Obtiene el domingo a las 23:59:59.999 de la semana que inicia en `weekStart`.
 */
function getEndOfISOWeek(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatShortDayMonth(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  return `${day} ${monthNames[date.getMonth()]}`;
}

function extractSessionSubjectId(session: StudySession): string {
  if (!session.subject) return '';
  if (typeof session.subject === 'string') return session.subject;
  if (typeof session.subject === 'object' && 'id' in session.subject && session.subject.id) {
    return session.subject.id;
  }
  const maybeMongo = session.subject as { _id?: string };
  return maybeMongo._id || '';
}

export default function StatsPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selector de período del Bloque 2 (por defecto: Semana actual)
  const [selectedPeriod, setSelectedPeriod] = useState<SubjectPeriod>('WEEK');

  // Selector de año del Bloque 3 (por defecto: Año actual)
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [hoveredHeatmapDay, setHoveredHeatmapDay] = useState<HeatmapDayCell | null>(null);

  const fetchStatsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, subjectsRes] = await Promise.all([
        api.get<StudySession[]>('/sessions'),
        api.get<Subject[]>('/subjects'),
      ]);

      setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
      setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(
          err.response?.data?.message ||
            'No se pudieron cargar los datos de estadísticas.'
        );
      } else {
        setError('Error al conectar con el servidor para obtener las estadísticas.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Consumir GET /api/sessions y GET /api/subjects una sola vez al montar
  useEffect(() => {
    void fetchStatsData();
  }, [fetchStatsData]);

  // =========================================================================
  // BLOQUE 1: Rendimiento en las últimas 12 semanas (suma de todas las materias)
  // =========================================================================
  const last12WeeksData = useMemo(() => {
    const now = new Date();
    const currentWeekStart = getStartOfISOWeek(now);

    const weeks = Array.from({ length: 12 }, (_, idx) => {
      const weeksAgo = 11 - idx;
      const start = new Date(currentWeekStart);
      start.setDate(start.getDate() - weeksAgo * 7);
      start.setHours(0, 0, 0, 0);

      const end = getEndOfISOWeek(start);

      return {
        index: idx,
        weeksAgo,
        isCurrentWeek: weeksAgo === 0,
        start,
        end,
        shortLabel: formatShortDayMonth(start),
        rangeLabel: `${formatShortDayMonth(start)} - ${formatShortDayMonth(end)}`,
        totalSeconds: 0,
        sessionsCount: 0,
      };
    });

    for (const session of sessions) {
      const duration = Math.max(0, Number(session.durationSeconds) || 0);
      if (duration <= 0 || !session.startTime) continue;

      const sessionTime = new Date(session.startTime).getTime();
      if (Number.isNaN(sessionTime)) continue;

      for (const week of weeks) {
        if (
          sessionTime >= week.start.getTime() &&
          sessionTime <= week.end.getTime()
        ) {
          week.totalSeconds += duration;
          week.sessionsCount += 1;
          break;
        }
      }
    }

    const rawMaxSeconds = Math.max(...weeks.map((w) => w.totalSeconds), 0);
    // Escala superior limpia para el eje Y en horas y segundos
    const yAxisMaxSeconds =
      rawMaxSeconds === 0
        ? 3600
        : rawMaxSeconds < 60
          ? 60
          : rawMaxSeconds < 3600
            ? Math.ceil(rawMaxSeconds / 60) * 60
            : Math.ceil(rawMaxSeconds / 900) * 900;

    const yAxisTicks = [
      yAxisMaxSeconds,
      Math.round(yAxisMaxSeconds * 0.75),
      Math.round(yAxisMaxSeconds * 0.5),
      Math.round(yAxisMaxSeconds * 0.25),
      0,
    ];

    const total12WeeksSeconds = weeks.reduce((acc, w) => acc + w.totalSeconds, 0);

    return {
      weeks: weeks.map((w) => ({
        ...w,
        heightPercent:
          w.totalSeconds > 0
            ? Math.min(100, Math.max(6, Math.round((w.totalSeconds / yAxisMaxSeconds) * 100)))
            : 0,
      })),
      yAxisMaxSeconds,
      yAxisTicks,
      total12WeeksSeconds,
    };
  }, [sessions]);

  // =========================================================================
  // BLOQUE 2: Rendimiento y Horas por Materia filtrado por Día, Semana, Mes, Año
  // =========================================================================
  const subjectStatsByPeriod = useMemo(() => {
    const now = new Date();

    let periodStart: Date;
    let periodEnd: Date;
    let periodSubtitle: string;

    if (selectedPeriod === 'DAY') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      periodSubtitle = `Hoy (${now.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
      })})`;
    } else if (selectedPeriod === 'WEEK') {
      periodStart = getStartOfISOWeek(now);
      periodEnd = getEndOfISOWeek(periodStart);
      periodSubtitle = `Semana actual (${formatShortDayMonth(periodStart)} al ${formatShortDayMonth(
        periodEnd
      )})`;
    } else if (selectedPeriod === 'MONTH') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthLabel = now.toLocaleDateString('es-AR', {
        month: 'long',
        year: 'numeric',
      });
      periodSubtitle = `Mes actual (${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)})`;
    } else {
      periodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      periodSubtitle = `Año actual (${now.getFullYear()})`;
    }

    const secondsBySubjectId: Record<string, number> = {};
    const sessionsCountBySubjectId: Record<string, number> = {};

    for (const subj of subjects) {
      secondsBySubjectId[subj.id] = 0;
      sessionsCountBySubjectId[subj.id] = 0;
    }

    const startMs = periodStart.getTime();
    const endMs = periodEnd.getTime();

    for (const session of sessions) {
      const duration = Math.max(0, Number(session.durationSeconds) || 0);
      if (duration <= 0 || !session.startTime) continue;

      const sessionMs = new Date(session.startTime).getTime();
      if (Number.isNaN(sessionMs) || sessionMs < startMs || sessionMs > endMs) {
        continue;
      }

      const subjId = extractSessionSubjectId(session);
      if (!subjId) continue;

      secondsBySubjectId[subjId] = (secondsBySubjectId[subjId] || 0) + duration;
      sessionsCountBySubjectId[subjId] = (sessionsCountBySubjectId[subjId] || 0) + 1;
    }

    const items = subjects.map((subj) => {
      const totalSeconds = secondsBySubjectId[subj.id] || 0;
      const sessionsCount = sessionsCountBySubjectId[subj.id] || 0;
      return {
        id: subj.id,
        name: subj.name,
        color: subj.color || '#4F46E5',
        totalSeconds,
        sessionsCount,
        hoursDecimal: Number((totalSeconds / 3600).toFixed(2)),
      };
    });

    const maxSubjectSeconds = Math.max(...items.map((item) => item.totalSeconds), 0);
    const yAxisMax =
      maxSubjectSeconds === 0
        ? 3600
        : maxSubjectSeconds < 60
          ? 60
          : maxSubjectSeconds < 3600
            ? Math.ceil(maxSubjectSeconds / 60) * 60
            : Math.ceil(maxSubjectSeconds / 900) * 900;

    const totalPeriodSeconds = items.reduce((acc, item) => acc + item.totalSeconds, 0);

    return {
      periodSubtitle,
      totalPeriodSeconds,
      yAxisMax,
      items: items.map((item) => ({
        ...item,
        heightPercent:
          item.totalSeconds > 0
            ? Math.min(100, Math.max(8, Math.round((item.totalSeconds / yAxisMax) * 100)))
            : 0,
      })),
    };
  }, [subjects, sessions, selectedPeriod]);

  // =========================================================================
  // BLOQUE 3: Calendario Heatmap Anual estilo GitHub
  // =========================================================================
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set<number>([currentYear, currentYear - 1, currentYear - 2]);

    for (const session of sessions) {
      if (!session.startTime) continue;
      const d = new Date(session.startTime);
      if (!Number.isNaN(d.getTime())) {
        yearSet.add(d.getFullYear());
      }
    }

    return Array.from(yearSet).sort((a, b) => b - a);
  }, [sessions]);

  const annualHeatmapData = useMemo(() => {
    const dailyStats = new Map<string, { seconds: number; count: number }>();

    for (const session of sessions) {
      const duration = Math.max(0, Number(session.durationSeconds) || 0);
      if (duration <= 0 || !session.startTime) continue;

      const d = new Date(session.startTime);
      if (Number.isNaN(d.getTime()) || d.getFullYear() !== selectedYear) continue;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const prev = dailyStats.get(key) || { seconds: 0, count: 0 };
      dailyStats.set(key, {
        seconds: prev.seconds + duration,
        count: prev.count + 1,
      });
    }

    let totalYearSeconds = 0;
    let activeDaysCount = 0;
    let maxDaySeconds = 0;

    for (const entry of dailyStats.values()) {
      if (entry.seconds > 0) {
        totalYearSeconds += entry.seconds;
        activeDaysCount += 1;
        if (entry.seconds > maxDaySeconds) {
          maxDaySeconds = entry.seconds;
        }
      }
    }

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')}`;

    const jan1 = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
    const dec31 = new Date(selectedYear, 11, 31, 0, 0, 0, 0);
    const gridStart = getStartOfISOWeek(jan1);
    const gridEnd = getEndOfISOWeek(getStartOfISOWeek(dec31));

    const weeks: {
      weekIndex: number;
      monthLabel: string | null;
      days: HeatmapDayCell[];
    }[] = [];

    const seenMonths = new Set<number>();
    const cursor = new Date(gridStart);
    let weekIndex = 0;

    while (cursor.getTime() <= gridEnd.getTime()) {
      const days: HeatmapDayCell[] = [];
      let monthLabel: string | null = null;

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const cellDate = new Date(
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate() + dayOffset
        );
        const isCurrentYear = cellDate.getFullYear() === selectedYear;

        if (isCurrentYear) {
          const m = cellDate.getMonth();
          if ((cellDate.getDate() === 1 || (weekIndex === 0 && m === 0)) && !seenMonths.has(m)) {
            seenMonths.add(m);
            monthLabel = HEATMAP_MONTH_LABELS[m];
          }
        }

        const dateKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(cellDate.getDate()).padStart(2, '0')}`;
        const stat = isCurrentYear ? dailyStats.get(dateKey) : undefined;
        const totalSeconds = stat ? stat.seconds : 0;
        const sessionsCount = stat ? stat.count : 0;

        let intensity: HeatmapIntensity = 0;
        if (totalSeconds > 0 && maxDaySeconds > 0) {
          const level = Math.ceil((totalSeconds / maxDaySeconds) * 4);
          intensity = Math.min(4, Math.max(1, level)) as HeatmapIntensity;
        }

        days.push({
          dateKey,
          formattedDate: formatDateDDMMYYYY(cellDate),
          isCurrentYear,
          isToday: isCurrentYear && dateKey === todayKey,
          totalSeconds,
          sessionsCount,
          intensity,
        });
      }

      weeks.push({
        weekIndex,
        monthLabel,
        days,
      });

      cursor.setDate(cursor.getDate() + 7);
      weekIndex += 1;
    }

    return {
      weeks,
      totalYearSeconds,
      activeDaysCount,
      maxDaySeconds,
    };
  }, [sessions, selectedYear]);

  return (
    <div className="space-y-6 pb-8">
      {/* Encabezado de la página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Métricas y Rendimiento</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Estadísticas de Estudio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analizá tu evolución en las últimas 12 semanas, el desglose por materia y tu constancia anual.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="bg-white dark:bg-[#111827]/95 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] px-4 py-2.5 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Sesiones Registradas
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {sessions.length} {sessions.length === 1 ? 'sesión' : 'sesiones'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje de error si falla la carga */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/25 text-red-700 dark:text-rose-300 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void fetchStatsData()}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0B111E] border border-red-200 dark:border-rose-500/30 text-xs font-semibold text-red-700 dark:text-rose-300 hover:bg-red-100 dark:hover:bg-rose-500/20 transition cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-[#111827]/95 rounded-3xl border border-slate-200/80 dark:border-white/[0.07] p-14 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 shadow-xs">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm font-medium">Calculando métricas de estudio...</p>
        </div>
      ) : (
        <>
          {/* =================================================================== */}
          {/* BLOQUE 1 — RENDIMIENTO (12 SEMANAS)                                 */}
          {/* =================================================================== */}
          <section
            aria-label="Rendimiento últimas 12 semanas"
            className="bg-white dark:bg-[#111827]/95 rounded-3xl border border-slate-200/80 dark:border-white/[0.07] p-5 sm:p-6 shadow-xs space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Rendimiento (Últimas 12 Semanas)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tiempo total estudiado por semana sumando todas las materias (eje Y en horas y segundos)
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#0B111E] dark:border dark:border-white/[0.07] text-slate-700 dark:text-slate-300 text-xs font-semibold self-start sm:self-auto">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>
                  Acumulado 12 sem.: {formatHoursAndSeconds(last12WeeksData.total12WeeksSeconds)}
                </span>
              </div>
            </div>

            {/* Contenedor del gráfico de 12 barras con eje Y en horas y segundos */}
            <div className="rounded-2xl bg-slate-50/80 dark:bg-[#0B111E] border border-slate-100 dark:border-white/[0.07] p-4 sm:p-5">
              <div className="grid grid-cols-[76px_1fr] sm:grid-cols-[92px_1fr] gap-3">
                {/* Eje Y formateado en horas y segundos */}
                <div
                  aria-label="Eje Y en horas y segundos"
                  className="h-56 flex flex-col justify-between text-right pr-2 border-r border-slate-200/80 dark:border-white/[0.07] select-none"
                >
                  {last12WeeksData.yAxisTicks.map((tickValue, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 leading-none"
                    >
                      {formatHoursAndSeconds(tickValue)}
                    </span>
                  ))}
                </div>

                {/* Área de las 12 barras */}
                <div className="relative h-56 flex items-end justify-between gap-1.5 sm:gap-3 border-b border-slate-200/80 dark:border-white/[0.07] pb-2 px-1">
                  {/* Líneas guía horizontales */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-2"
                  >
                    {last12WeeksData.yAxisTicks.map((_, idx) => (
                      <div
                        key={idx}
                        className="w-full border-t border-dashed border-slate-200/70 dark:border-white/[0.06]"
                      />
                    ))}
                  </div>

                  {last12WeeksData.weeks.map((week) => (
                    <div
                      key={week.index}
                      className="relative z-10 flex-1 h-full flex flex-col items-center justify-end group min-w-0"
                    >
                      {/* Etiqueta superior con valor en horas y segundos */}
                      <span
                        className={`text-[10px] font-mono font-semibold mb-1 whitespace-nowrap transition ${
                          week.totalSeconds > 0
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {formatHoursAndSeconds(week.totalSeconds)}
                      </span>

                      <div className="w-full max-w-11 h-full bg-slate-200/60 dark:bg-slate-800/70 rounded-t-xl flex items-end overflow-hidden p-0.5">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            week.totalSeconds > 0
                              ? week.isCurrentWeek
                                ? 'bg-indigo-600 group-hover:bg-indigo-700 dark:bg-emerald-500 dark:group-hover:bg-emerald-400 dark:shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                                : 'bg-indigo-500/85 group-hover:bg-indigo-600 dark:bg-indigo-500 dark:group-hover:bg-indigo-400 dark:shadow-[0_0_10px_rgba(99,102,241,0.25)]'
                              : 'bg-transparent'
                          }`}
                          style={{
                            height: `${week.heightPercent}%`,
                          }}
                          title={`Semana ${week.rangeLabel}: ${formatHoursAndSeconds(
                            week.totalSeconds
                          )} (${formatReadableDuration(week.totalSeconds)})`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Etiquetas del eje X (12 semanas) */}
              <div className="grid grid-cols-[76px_1fr] sm:grid-cols-[92px_1fr] gap-3 pt-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right pr-2">
                  Semana
                </div>
                <div className="flex items-center justify-between gap-1.5 sm:gap-3 px-1">
                  {last12WeeksData.weeks.map((week) => (
                    <div
                      key={week.index}
                      className="flex-1 min-w-0 text-center"
                      title={`Semana del ${week.rangeLabel}`}
                    >
                      <p
                        className={`text-[10px] sm:text-[11px] truncate ${
                          week.isCurrentWeek
                            ? 'font-bold text-indigo-600 dark:text-indigo-400'
                            : 'font-medium text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {week.shortLabel}
                      </p>
                      {week.isCurrentWeek && (
                        <span className="inline-block text-[9px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 px-1.5 py-0.2 rounded-full">
                          Actual
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================== */}
          {/* BLOQUE 2 — RENDIMIENTO Y HORAS POR MATERIA CON SELECTOR DE PERÍODO  */}
          {/* =================================================================== */}
          <section
            aria-label="Rendimiento y Horas por Materia"
            className="bg-white dark:bg-[#111827]/95 rounded-3xl border border-slate-200/80 dark:border-white/[0.07] p-5 sm:p-6 shadow-xs space-y-5"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Rendimiento y Horas por Materia
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {subjectStatsByPeriod.periodSubtitle} • Total:{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {formatReadableDuration(subjectStatsByPeriod.totalPeriodSeconds)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Selector de pestañas: Día, Semana (por defecto), Mes, Año */}
              <div
                role="tablist"
                aria-label="Filtrar rendimiento por período"
                className="inline-flex rounded-2xl bg-slate-100 dark:bg-[#0B111E] dark:border dark:border-white/[0.07] p-1 self-start md:self-auto"
              >
                {PERIOD_TABS.map((tab) => {
                  const isActive = selectedPeriod === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSelectedPeriod(tab.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {subjectStatsByPeriod.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.07] dark:bg-[#0B111E]/50 p-10 flex flex-col items-center justify-center text-center gap-2">
                <BookOpen className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No hay materias registradas todavía
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  Creá tus asignaturas en la sección Materias y registrá sesiones de estudio para visualizar el desglose por período.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50/80 dark:bg-[#0B111E] border border-slate-100 dark:border-white/[0.07] p-4 sm:p-5 space-y-3">
                <div className="h-56 flex items-end justify-around gap-3 border-b border-slate-200/80 dark:border-white/[0.07] pb-2 px-2">
                  {subjectStatsByPeriod.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex-1 max-w-24 h-full flex flex-col items-center justify-end group min-w-0"
                    >
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                        {formatReadableDuration(item.totalSeconds)}
                      </span>
                      <div className="w-full max-w-12 h-full bg-slate-200/60 dark:bg-slate-800/70 rounded-t-xl flex items-end overflow-hidden p-0.5">
                        <div
                          className="w-full rounded-t-lg transition-all duration-500"
                          style={{
                            height: `${item.heightPercent}%`,
                            backgroundColor:
                              item.totalSeconds > 0 ? item.color : 'transparent',
                          }}
                          title={`${item.name}: ${formatHoursAndSeconds(
                            item.totalSeconds
                          )} (${item.sessionsCount} ${
                            item.sessionsCount === 1 ? 'sesión' : 'sesiones'
                          })`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Etiquetas de materias debajo de las barras */}
                <div className="flex items-center justify-around gap-3 pt-1 px-2">
                  {subjectStatsByPeriod.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex-1 max-w-24 flex flex-col items-center min-w-0"
                    >
                      <div className="flex items-center justify-center gap-1.5 max-w-full">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span
                          className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
                          title={item.name}
                        >
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {item.sessionsCount}{' '}
                        {item.sessionsCount === 1 ? 'sesión' : 'sesiones'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* =================================================================== */}
          {/* BLOQUE 3 — CALENDARIO DE ACTIVIDAD (ESTILO GITHUB)                  */}
          {/* =================================================================== */}
          <section
            aria-label="Actividad Anual"
            className="bg-white dark:bg-[#111827]/95 rounded-3xl border border-slate-200/80 dark:border-white/[0.07] p-5 sm:p-6 shadow-xs space-y-5"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Actividad Anual
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mapa de calor de constancia diaria de estudio durante el año{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {selectedYear}
                    </span>
                  </p>
                </div>
              </div>

              {/* Resumen anual + Selector de año arriba a la derecha */}
              <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                  <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    {annualHeatmapData.activeDaysCount}{' '}
                    {annualHeatmapData.activeDaysCount === 1 ? 'día activo' : 'días activos'}
                  </span>
                  <span className="text-emerald-300 dark:text-emerald-600">•</span>
                  <span>
                    Acumulado: {formatExactDuration(annualHeatmapData.totalYearSeconds)}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-[#0B111E] dark:border dark:border-white/[0.07] rounded-2xl p-1">
                  <label htmlFor="heatmap-year-select" className="sr-only">
                    Seleccionar año
                  </label>
                  <select
                    id="heatmap-year-select"
                    aria-label="Seleccionar año"
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(Number(e.target.value));
                      setHoveredHeatmapDay(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-100 text-xs font-bold shadow-2xs border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Calendario Heatmap Anual estilo GitHub */}
            <div
              data-testid="github-heatmap"
              className="rounded-2xl bg-slate-50/80 dark:bg-[#0B111E] border border-slate-100 dark:border-white/[0.07] p-4 sm:p-5 space-y-4"
            >
              <div className="overflow-x-auto pb-2">
                <div className="inline-flex flex-col min-w-max gap-1.5">
                  {/* Fila superior: Etiquetas de meses alineadas con las columnas de semanas */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 shrink-0" aria-hidden="true" />
                    <div className="flex items-center gap-1">
                      {annualHeatmapData.weeks.map((week) => (
                        <div
                          key={`month-col-${week.weekIndex}`}
                          className="w-3.5 h-4 relative select-none"
                        >
                          {week.monthLabel && (
                            <span className="absolute left-0 top-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {week.monthLabel}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cuerpo del Heatmap: Etiquetas Lunes-Domingo en filas y Semanas en columnas */}
                  <div className="flex items-start gap-2">
                    {/* Etiquetas de días de la semana (Lunes a Domingo) */}
                    <div
                      aria-label="Días de la semana"
                      className="w-8 shrink-0 flex flex-col gap-1 select-none"
                    >
                      {HEATMAP_DAY_ROWS.map((row) => (
                        <div
                          key={row.index}
                          className="h-3.5 flex items-center justify-end pr-1 text-[10px] font-medium text-slate-400 leading-none"
                        >
                          {row.label}
                        </div>
                      ))}
                    </div>

                    {/* Grilla de semanas en columnas (cada columna tiene 7 celdas: Lun a Dom) */}
                    <div
                      role="grid"
                      aria-label={`Mapa de calor de estudio del año ${selectedYear}`}
                      className="flex items-start gap-1"
                      onMouseLeave={() => setHoveredHeatmapDay(null)}
                    >
                      {annualHeatmapData.weeks.map((week) => (
                        <div
                          key={`week-${week.weekIndex}`}
                          role="row"
                          className="flex flex-col gap-1"
                        >
                          {week.days.map((day) => {
                            if (!day.isCurrentYear) {
                              return (
                                <div
                                  key={day.dateKey}
                                  aria-hidden="true"
                                  className="w-3.5 h-3.5 rounded-[3px] bg-transparent pointer-events-none"
                                />
                              );
                            }

                            const tooltipText = `${day.formattedDate}${
                              day.isToday ? ' (Hoy)' : ''
                            } — ${formatExactDuration(day.totalSeconds)}`;

                            return (
                              <div
                                key={day.dateKey}
                                role="gridcell"
                                tabIndex={0}
                                aria-current={day.isToday ? 'date' : undefined}
                                aria-label={tooltipText}
                                title={tooltipText}
                                onMouseEnter={() => setHoveredHeatmapDay(day)}
                                onFocus={() => setHoveredHeatmapDay(day)}
                                onBlur={() => setHoveredHeatmapDay(null)}
                                className={`group/cell relative w-3.5 h-3.5 rounded-[3px] border transition-transform duration-150 hover:scale-125 hover:z-20 hover:ring-2 cursor-pointer ${
                                  HEATMAP_LEVEL_CLASSES[day.intensity]
                                } ${
                                  day.isToday
                                    ? 'ring-2 ring-indigo-600 ring-offset-1 dark:ring-indigo-400 dark:ring-offset-[#0B111E] z-10'
                                    : ''
                                }`}
                              >
                                {/* Tooltip flotante al hacer hover sobre la celda */}
                                <div
                                  role="tooltip"
                                  className="pointer-events-none invisible opacity-0 group-hover/cell:visible group-hover/cell:opacity-100 group-focus/cell:visible group-focus/cell:opacity-100 transition-opacity duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 dark:border dark:border-white/10 text-white text-[11px] font-medium whitespace-nowrap shadow-lg"
                                >
                                  <span className="font-bold text-emerald-300">
                                    {day.formattedDate}
                                    {day.isToday ? ' (Hoy)' : ''}
                                  </span>
                                  <span className="mx-1.5 text-slate-400">•</span>
                                  <span className="font-mono">
                                    {formatExactDuration(day.totalSeconds)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie del Heatmap: detalle interactivo del día en hover + leyenda Menos -> Más */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-white/[0.07] text-xs text-slate-500 dark:text-slate-400">
                <div className="min-h-5 flex items-center gap-2">
                  {hoveredHeatmapDay ? (
                    <div className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {hoveredHeatmapDay.formattedDate}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatExactDuration(hoveredHeatmapDay.totalSeconds)}
                      </span>
                      <span className="text-slate-400">
                        ({hoveredHeatmapDay.sessionsCount}{' '}
                        {hoveredHeatmapDay.sessionsCount === 1 ? 'sesión' : 'sesiones'})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Pasá el cursor sobre cualquier día para ver la fecha (dd/mm/yyyy) y duración exacta (Xh Ym Zs).
                    </span>
                  )}
                </div>

                {/* Leyenda de los 5 niveles de intensidad: Menos -> Más */}
                <div
                  aria-label="Leyenda de intensidad de actividad"
                  className="inline-flex items-center gap-1.5 self-end sm:self-auto select-none"
                >
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-0.5">
                    Menos
                  </span>
                  {([0, 1, 2, 3, 4] as HeatmapIntensity[]).map((level) => (
                    <span
                      key={level}
                      className={`w-3.5 h-3.5 rounded-[3px] border ${HEATMAP_LEVEL_CLASSES[level]}`}
                      title={
                        level === 0
                          ? 'Nivel 0: Sin actividad (0h 0m 0s)'
                          : `Nivel ${level} de intensidad`
                      }
                    />
                  ))}
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 ml-0.5">
                    Más
                  </span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
