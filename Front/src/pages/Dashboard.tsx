import { useState, useEffect } from 'react';
import {
  Clock,
  Flame,
  Target,
  CalendarClock,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Calendar,
  CalendarCheck,
  Plus,
  CheckCircle2,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type StudyMode = 'pomodoro' | 'cronometro';

interface SubjectItem {
  id: string;
  name: string;
  professor: string;
  weeklyHours: number;
  targetHours: number;
  color: string;
  badgeBg: string;
}

interface ScheduleItem {
  id: string;
  day: string;
  time: string;
  subject: string;
  room: string;
  colorDot: string;
}

interface ExamItem {
  id: string;
  subject: string;
  title: string;
  date: string;
  daysLeft: number;
  type: 'Parcial' | 'Final' | 'Entrega';
}

const INITIAL_SUBJECTS: SubjectItem[] = [
  {
    id: '1',
    name: 'Análisis Matemático II',
    professor: 'Dr. Martín Gómez',
    weeklyHours: 6.5,
    targetHours: 8,
    color: 'bg-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: '2',
    name: 'Algoritmos y Estructuras de Datos',
    professor: 'Ing. Laura Pérez',
    weeklyHours: 5,
    targetHours: 6,
    color: 'bg-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: '3',
    name: 'Arquitectura de Computadoras',
    professor: 'Lic. Carlos Ruiz',
    weeklyHours: 3,
    targetHours: 5,
    color: 'bg-amber-500',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: '4',
    name: 'Ingeniería de Software',
    professor: 'Mg. Sofía Torres',
    weeklyHours: 4,
    targetHours: 4,
    color: 'bg-rose-500',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
];

const INITIAL_SCHEDULE: ScheduleItem[] = [
  {
    id: 's1',
    day: 'Lun',
    time: '08:30 - 11:30',
    subject: 'Análisis Matemático II',
    room: 'Aula 304',
    colorDot: 'bg-indigo-600',
  },
  {
    id: 's2',
    day: 'Mar',
    time: '14:00 - 17:00',
    subject: 'Algoritmos y Estructuras de Datos',
    room: 'Lab 2',
    colorDot: 'bg-emerald-600',
  },
  {
    id: 's3',
    day: 'Mié',
    time: '10:00 - 12:30',
    subject: 'Arquitectura de Computadoras',
    room: 'Aula 112',
    colorDot: 'bg-amber-500',
  },
  {
    id: 's4',
    day: 'Jue',
    time: '18:00 - 21:00',
    subject: 'Ingeniería de Software',
    room: 'Aula Magna',
    colorDot: 'bg-rose-500',
  },
];

const INITIAL_EXAMS: ExamItem[] = [
  {
    id: 'e1',
    subject: 'Análisis Matemático II',
    title: '1° Parcial — Integrales Múltiples',
    date: '18 Nov 2026',
    daysLeft: 6,
    type: 'Parcial',
  },
  {
    id: 'e2',
    subject: 'Algoritmos y Estructuras de Datos',
    title: 'Entrega TP Árboles Balanceados',
    date: '23 Nov 2026',
    daysLeft: 11,
    type: 'Entrega',
  },
  {
    id: 'e3',
    subject: 'Arquitectura de Computadoras',
    title: '2° Parcial — Memoria Caché y Pipeline',
    date: '02 Dic 2026',
    daysLeft: 20,
    type: 'Parcial',
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  const [studyMode, setStudyMode] = useState<StudyMode>('pomodoro');
  const [selectedSubject, setSelectedSubject] = useState<string>(INITIAL_SUBJECTS[0].id);
  const [seconds, setSeconds] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setSeconds((prev) => {
        if (studyMode === 'pomodoro') {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        }
        return prev + 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, studyMode]);

  const handleModeChange = (mode: StudyMode) => {
    setIsRunning(false);
    setStudyMode(mode);
    setSeconds(mode === 'pomodoro' ? 25 * 60 : 0);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(studyMode === 'pomodoro' ? 25 * 60 : 0);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Encabezado de bienvenida */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hola, {user?.name?.split(' ')[0] || 'Estudiante'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Todo tu espacio académico centralizado en un solo lugar.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium self-start sm:self-auto">
          <Sparkles className="w-4 h-4" />
          <span>Cuatrimestre en curso</span>
        </div>
      </div>

      {/* BENTO GRID PRINCIPAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* BLOQUE 1: Contadores / Métricas (ocupa las 12 columnas arriba en 4 mini-cards) */}
        <section
          aria-label="Contadores y Métricas"
          className="md:col-span-2 lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Estudio Semanal
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">18.5 h</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">+2.5 h vs. semana pasada</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Racha Activa
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">7 días</p>
              <p className="text-xs text-amber-600 font-medium mt-1">¡Mejor marca del mes!</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Metas Cumplidas
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">80%</p>
              <p className="text-xs text-slate-500 mt-1">18.5 / 23 h objetivo</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Próximo Examen
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">En 6 días</p>
              <p className="text-xs text-rose-600 font-medium mt-1 truncate">
                Análisis Matemático II
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <CalendarClock className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* BLOQUE 2: Método de Estudio (Cronómetro / Pomodoro) */}
        <section className="md:col-span-1 lg:col-span-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                Método de Estudio
              </span>
              <div className="inline-flex rounded-xl bg-white/10 p-1 backdrop-blur-xs">
                <button
                  type="button"
                  onClick={() => handleModeChange('pomodoro')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    studyMode === 'pomodoro'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-indigo-100 hover:text-white'
                  }`}
                >
                  Pomodoro
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('cronometro')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    studyMode === 'cronometro'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-indigo-100 hover:text-white'
                  }`}
                >
                  Cronómetro
                </button>
              </div>
            </div>

            <div className="my-6 text-center">
              <div className="text-6xl sm:text-7xl font-mono font-bold tracking-tight">
                {formatTime(seconds)}
              </div>
              <p className="text-xs text-indigo-200 mt-2">
                {studyMode === 'pomodoro'
                  ? 'Bloque de enfoque de 25 minutos'
                  : 'Registro de tiempo libre continuo'}
              </p>
            </div>

            <div className="mb-5">
              <label
                htmlFor="timer-subject"
                className="block text-xs font-medium text-indigo-200 mb-1.5"
              >
                Materia activa
              </label>
              <select
                id="timer-subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                {INITIAL_SUBJECTS.map((subj) => (
                  <option key={subj.id} value={subj.id} className="text-slate-900">
                    {subj.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRunning((prev) => !prev)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition shadow-sm cursor-pointer"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pausar sesión</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Iniciar sesión</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reiniciar"
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* BLOQUE 3: Materias y Progreso Semanal */}
        <section className="md:col-span-1 lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Materias</h2>
                  <p className="text-xs text-slate-500">Progreso de horas semanales por cátedra</p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva materia</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {INITIAL_SUBJECTS.map((subj) => {
                const progress = Math.min(100, Math.round((subj.weeklyHours / subj.targetHours) * 100));
                return (
                  <div
                    key={subj.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${subj.badgeBg}`}
                        >
                          {subj.weeklyHours} / {subj.targetHours} h
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-2">{subj.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{subj.professor}</p>
                      </div>
                      <GraduationCap className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                    </div>
                    <div className="mt-3">
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${subj.color}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* BLOQUE 4: Calendario / Horarios de Cursada */}
        <section className="md:col-span-1 lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Calendario y Horarios</h2>
                <p className="text-xs text-slate-500">Bloques semanales de cursada y estudio</p>
              </div>
            </div>
            <span className="text-xs font-medium text-slate-400">Semana actual</span>
          </div>

          <div className="space-y-3">
            {INITIAL_SCHEDULE.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex flex-col items-center justify-center font-bold text-xs shrink-0">
                    <span>{item.day}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.colorDot}`} />
                      <h3 className="text-sm font-semibold text-slate-900">{item.subject}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{item.time}</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                  {item.room}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* BLOQUE 5: Lista de Exámenes */}
        <section className="md:col-span-1 lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Lista de Exámenes</h2>
                <p className="text-xs text-slate-500">Próximos parciales, finales y entregas</p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar</span>
            </button>
          </div>

          <div className="space-y-3">
            {INITIAL_EXAMS.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                      {exam.type}
                    </span>
                    <span className="text-xs text-slate-400">{exam.date}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mt-1 truncate">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">{exam.subject}</p>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold ${
                      exam.daysLeft <= 7
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Faltan {exam.daysLeft}d
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
