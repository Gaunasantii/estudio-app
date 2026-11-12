import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Menu,
  X,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const closeDrawer = () => setIsDrawerOpen(false);

  const handleNavigate = (path: string) => {
    closeDrawer();
    navigate(path);
  };

  const handleLogout = () => {
    closeDrawer();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header superior limpio */}
      <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:bg-indigo-700 transition">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">EstudioApp</span>
        </Link>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-800 leading-tight">
                {user.name}
              </span>
              <span className="text-xs text-slate-500 leading-tight">{user.email}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Abrir menú de usuario"
            className="inline-flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/*Contenido principal */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <Outlet />
      </main>

      {/* Overlay y Drawer deslizante a la derecha */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <aside
              aria-label="Menú de cuenta"
              className="w-80 max-w-sm bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between p-6"
            >
              <div>
                {/* Cabecera del drawer */}
                <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {user?.name || 'Mi Cuenta'}
                    </p>
                    {user?.email && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closeDrawer}
                    aria-label="Cerrar menú"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Únicamente las opciones solicitadas: Mi Perfil, Ajustes y Cerrar Sesión */}
                <nav className="mt-6 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleNavigate('/perfil')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition cursor-pointer ${
                      location.pathname === '/perfil'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-5 h-5" />
                    <span>Mi Perfil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('/ajustes')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition cursor-pointer ${
                      location.pathname === '/ajustes'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Ajustes</span>
                  </button>
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
