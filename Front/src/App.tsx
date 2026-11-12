import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, ShieldCheck, Bell, Clock, Palette } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './pages/DashboardLayout';
import Dashboard from './pages/Dashboard';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Cargando...
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
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
                <p className="text-xs text-slate-500">Vista Bento Grid compacta</p>
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

          {/* Ruta privada principal: aterriza directo en el Dashboard unificado */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
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
