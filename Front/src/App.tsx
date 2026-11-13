import { useState, useEffect, useCallback } from 'react';
import type { ReactNode, FormEvent } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useOutletContext,
} from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  User,
  Mail,
  ShieldCheck,
  Bell,
  Clock,
  Palette,
  BookOpen,
  CalendarCheck,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './api/axios';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './pages/DashboardLayout';
import Dashboard from './pages/Dashboard';
import type { DashboardOutletContext, Exam, Subject } from './types/academic';

const PRESET_COLORS = [
  '#4F46E5',
  '#10B981',
  '#F59E0B',
  '#F43F5E',
  '#06B6D4',
  '#8B5CF6',
];

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0 min estudiados';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m acumulados`;
  if (hours > 0) return `${hours}h acumuladas`;
  if (mins > 0) return `${mins} min acumulados`;
  return `${totalSeconds}s acumulados`;
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100/70 text-slate-600">
        Cargando sesión...
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100/70 text-slate-600">
        Cargando...
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

function MateriasView() {
  const {
    subjects,
    subjectSecondsMap,
    loadingSubjects,
    refreshAcademicData,
  } = useOutletContext<DashboardOutletContext>();

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setSubmitting(true);
    try {
      await api.post<Subject>('/subjects', {
        name: name.trim(),
        color,
        isCurrentlyTaking: true,
      });
      setName('');
      await refreshAcademicData();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'No se pudo crear la materia.');
      } else {
        setError('Error al crear la materia.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setDeletingId(id);
    try {
      await api.delete(`/subjects/${id}`);
      await refreshAcademicData();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'No se pudo eliminar la materia.');
      } else {
        setError('Error al eliminar la materia.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Materias</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Administrá tus asignaturas y consultá el tiempo total de estudio acumulado.
        </p>
      </div>

      {/* Formulario rápido para crear materia */}
      <form
        onSubmit={handleCreate}
        className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4"
      >
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Agregar Nueva Materia
        </h2>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la materia (ej. Análisis Matemático II)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={`w-6 h-6 rounded-full transition cursor-pointer ${
                    color === c
                      ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold transition cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Crear</span>
            </button>
          </div>
        </div>
      </form>

      {/* Lista de materias */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        {loadingSubjects ? (
          <div className="py-12 flex items-center justify-center text-slate-400 text-sm gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Cargando materias...</span>
          </div>
        ) : subjects.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              Todavía no tenés materias registradas
            </p>
            <p className="text-xs text-slate-500">
              Creá tu primera materia con el formulario superior.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects.map((subj) => {
              const secs = subjectSecondsMap[subj.id] ?? subj.totalSeconds ?? 0;
              return (
                <div
                  key={subj.id}
                  className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-4 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: subj.color || '#4F46E5' }}
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {subj.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDuration(secs)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDelete(subj.id)}
                    disabled={deletingId === subj.id}
                    aria-label={`Eliminar ${subj.name}`}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === subj.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ExamenesView() {
  const { subjects } = useOutletContext<DashboardOutletContext>();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [examDate, setExamDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Exam[]>('/exams');
      setExams(Array.isArray(res.data) ? res.data : []);
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    if (subjects.length > 0 && (!subjectId || !subjects.some((s) => s.id === subjectId))) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects, subjectId]);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!subjectId || !title.trim() || !examDate) return;

    setError(null);
    setSubmitting(true);
    try {
      await api.post('/exams', {
        subjectId,
        title: title.trim(),
        examDate: new Date(`${examDate}T12:00:00`).toISOString(),
      });
      setTitle('');
      setExamDate('');
      await fetchExams();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'No se pudo agendar el examen.');
      } else {
        setError('Error al agendar el examen.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/exams/${id}`);
      await fetchExams();
    } catch {
      // Ignorar si falla borrado
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exámenes</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Planificá tus fechas de parciales, finales y entregas académicas.
        </p>
      </div>

      {/* Formulario para agendar examen */}
      <form
        onSubmit={handleCreate}
        className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4"
      >
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Agendar Nuevo Examen
        </h2>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {subjects.length === 0 ? (
          <p className="text-xs text-slate-500">
            Primero creá al menos una materia en la pestaña{' '}
            <Link to="/materias" className="text-indigo-600 font-semibold underline">
              Materias
            </Link>{' '}
            para poder agendar exámenes.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              required
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. 1° Parcial"
              className="sm:col-span-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex gap-2">
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold transition cursor-pointer shrink-0"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Listado de exámenes */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        {loading ? (
          <div className="py-12 flex items-center justify-center text-slate-400 text-sm gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Cargando exámenes...</span>
          </div>
        ) : exams.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Sin exámenes agendados</p>
            <p className="text-xs text-slate-500">
              Tus próximas fechas de evaluación aparecerán acá.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => {
              const subj =
                typeof exam.subject === 'object' && exam.subject !== null
                  ? exam.subject
                  : subjects.find((s) => s.id === exam.subject);
              const formattedDate = new Date(exam.examDate).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={exam.id}
                  className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: subj?.color || '#4F46E5' }}
                      />
                      <span className="text-xs font-medium text-slate-500">
                        {subj?.name || 'Materia'}
                      </span>
                      <span className="text-xs text-slate-400">• {formattedDate}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">
                      {exam.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Agendado
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDelete(exam.id)}
                      aria-label="Eliminar examen"
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
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
}

function ProfileView() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al Dashboard</span>
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Mi Perfil</h1>
            <p className="text-sm text-slate-500">Información personal de tu cuenta académica</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50">
            <p className="text-xs font-medium text-slate-400 uppercase">Nombre</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {user?.name || 'Estudiante'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase">
              <Mail className="w-3.5 h-3.5" />
              <span>Correo electrónico</span>
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {user?.email || 'Sin correo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Sesión activa y sincronizada con tu cuenta de EstudioApp.</span>
        </div>
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al Dashboard</span>
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Ajustes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configurá tus preferencias de estudio y notificaciones
          </p>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Duración de Pomodoro</p>
                <p className="text-xs text-slate-500">Bloque de enfoque predeterminado</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
              25 min
            </span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Recordatorios de exámenes</p>
                <p className="text-xs text-slate-500">Alertas previas a fechas de parciales</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              Activado
            </span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Diseño de interfaz</p>
                <p className="text-xs text-slate-500">Vista Bento Grid con Sidebar Azul Cobalto</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
              Claro
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Rutas privadas con DashboardLayout */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="materias" element={<MateriasView />} />
            <Route path="examenes" element={<ExamenesView />} />
            <Route path="perfil" element={<ProfileView />} />
            <Route path="ajustes" element={<SettingsView />} />
          </Route>

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
