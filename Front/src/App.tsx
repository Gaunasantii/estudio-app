import { useState, useEffect } from 'react';
import type { ReactNode, FormEvent } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  ShieldCheck,
  Bell,
  Clock,
  Palette,
  CalendarCheck,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import api from './api/axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { User as AuthUser } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './pages/DashboardLayout';
import Dashboard from './pages/Dashboard';
import SubjectsPage from './pages/SubjectsPage';
import ExamsPage from './pages/ExamsPage';

const POMODORO_DURATION_OPTIONS = [15, 25, 30, 45, 50, 60];

function getInitialPomodoroMinutes(): number {
  const stored = Number(localStorage.getItem('pomodoroMinutes'));
  return Number.isFinite(stored) && stored > 0 ? stored : 25;
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

function ProfileView() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState<string>(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('El nombre no puede estar vacío.');
      return;
    }

    if (newPassword && !currentPassword) {
      setErrorMessage('Debés ingresar tu contraseña actual para definir una nueva contraseña.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: {
        name: string;
        currentPassword?: string;
        newPassword?: string;
      } = { name: trimmedName };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const response = await api.put<{ user: AuthUser; message?: string }>(
        '/auth/profile',
        payload
      );

      updateUser(response.data.user);
      setCurrentPassword('');
      setNewPassword('');
      setSuccessMessage(response.data.message || 'Perfil actualizado correctamente.');
    } catch (err: unknown) {
      const maybeAxiosError = err as { response?: { data?: { message?: string } } };
      setErrorMessage(
        maybeAxiosError.response?.data?.message || 'No se pudo actualizar el perfil.'
      );
    } finally {
      setSubmitting(false);
    }
  };

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
            <p className="text-sm text-slate-500">Información personal y seguridad de tu cuenta académica</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-semibold text-slate-500 uppercase mb-1.5"
              >
                Nombre
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase mb-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Correo electrónico</span>
              </label>
              <input
                id="profile-email"
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Cambiar contraseña <span className="text-xs font-normal text-slate-400">(opcional)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="profile-current-password"
                  className="block text-xs font-semibold text-slate-500 uppercase mb-1.5"
                >
                  Contraseña actual
                </label>
                <input
                  id="profile-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-new-password"
                  className="block text-xs font-semibold text-slate-500 uppercase mb-1.5"
                >
                  Nueva contraseña
                </label>
                <input
                  id="profile-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-emerald-700">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Sesión activa y sincronizada con tu cuenta de EstudioApp.</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold transition cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Guardando...' : 'Guardar cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsView() {
  const [includeWeekend, setIncludeWeekend] = useState<boolean>(() => {
    return localStorage.getItem('includeWeekendInSchedule') === 'true';
  });

  const [pomodoroMinutes, setPomodoroMinutes] = useState<number>(() =>
    getInitialPomodoroMinutes()
  );

  const handleToggleWeekend = (checked: boolean) => {
    setIncludeWeekend(checked);
    localStorage.setItem('includeWeekendInSchedule', String(checked));
    window.dispatchEvent(
      new CustomEvent('weekend-preference-change', { detail: checked })
    );
  };

  const handlePomodoroMinutesChange = (minutes: number) => {
    setPomodoroMinutes(minutes);
    localStorage.setItem('pomodoroMinutes', String(minutes));
    window.dispatchEvent(
      new CustomEvent('pomodoro-minutes-change', { detail: minutes })
    );
  };

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
          <label
            htmlFor="include-weekend-checkbox"
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <CalendarCheck className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Incluir Sábado y Domingo en el horario semanal
                </p>
                <p className="text-xs text-slate-500">
                  {includeWeekend
                    ? 'Mostrando de Lunes a Domingo en el Dashboard'
                    : 'Mostrando de Lunes a Viernes en el Dashboard'}
                </p>
              </div>
            </div>
            <input
              id="include-weekend-checkbox"
              type="checkbox"
              checked={includeWeekend}
              onChange={(e) => handleToggleWeekend(e.target.checked)}
              className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
            />
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <label
                  htmlFor="pomodoro-minutes-select"
                  className="text-sm font-semibold text-slate-900 block"
                >
                  Duración de Pomodoro
                </label>
                <p className="text-xs text-slate-500">
                  Bloque de enfoque predeterminado ({pomodoroMinutes} min)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                id="pomodoro-minutes-select"
                value={pomodoroMinutes}
                onChange={(e) => handlePomodoroMinutesChange(Number(e.target.value))}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {POMODORO_DURATION_OPTIONS.map((mins) => (
                  <option key={mins} value={mins}>
                    {mins} min
                  </option>
                ))}
              </select>
            </div>
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
            <Route path="materias" element={<SubjectsPage />} />
            <Route path="examenes" element={<ExamsPage />} />
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
