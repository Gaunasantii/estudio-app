import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './pages/DashboardLayout';

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

function SectionPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="text-slate-600 mt-1">{description}</p>
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-8 text-slate-500 text-sm">
        Módulo de {title.toLowerCase()} listo para integrar.
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

          {/* Rutas privadas */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route
              index
              element={
                <SectionPlaceholder
                  title="Dashboard"
                  description="Resumen general de tu progreso de estudio, objetivos y actividad reciente."
                />
              }
            />
            <Route
              path="materias"
              element={
                <SectionPlaceholder
                  title="Materias"
                  description="Administrá tus materias, horarios de cursada y objetivos semanales."
                />
              }
            />
            <Route
              path="cronometro"
              element={
                <SectionPlaceholder
                  title="Cronómetro"
                  description="Registrá tus sesiones de estudio con Pomodoro o temporizador libre."
                />
              }
            />
            <Route
              path="examenes"
              element={
                <SectionPlaceholder
                  title="Exámenes"
                  description="Planificá fechas de parciales, finales y entregas importantes."
                />
              }
            />
          </Route>

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
