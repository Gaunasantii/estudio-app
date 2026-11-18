import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Settings,
  LogOut,
  BookOpen,
  LayoutDashboard,
  CalendarCheck,
  Flame,
  BarChart3,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getSavedAvatarId, findAvatarById } from '../utils/avatars';
import { getSavedTheme, initTheme, toggleTheme, type ThemeMode } from '../utils/theme';
import { FokusIcon } from '../components/FokusLogo';
import type {
  Subject,
  StudySession,
  StudyStatsResponse,
  DashboardOutletContext,
} from '../types/academic';

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

function extractCurrentStreak(stats: StudyStatsResponse | null): number {
  if (!stats) return 0;
  if (typeof stats.currentStreak === 'number') {
    return stats.currentStreak;
  }

  const activeDates = (stats.heatmap || [])
    .filter((entry) => entry.totalSeconds > 0 || entry.sessionsCount > 0)
    .map((entry) => entry.date)
    .sort((a, b) => b.localeCompare(a));

  if (activeDates.length === 0) return 0;

  const todayKey = formatDateKey(new Date());
  const daysSinceLast = Math.max(0, diffCalendarDays(todayKey, activeDates[0]));
  if (daysSinceLast > 2) return 0;

  let streak = 1;
  for (let i = 0; i < activeDates.length - 1; i++) {
    const gapDays = diffCalendarDays(activeDates[i], activeDates[i + 1]) - 1;
    if (gapDays <= 2) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/materias', label: 'Materias', icon: BookOpen, end: false },
  { to: '/examenes', label: 'Exámenes', icon: CalendarCheck, end: false },
  { to: '/ajustes', label: 'Ajustes', icon: Settings, end: false },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboardRoot = location.pathname === '/dashboard';

  // Estado de barra lateral: cerrada por defecto en desktop y drawer en móvil
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(() =>
    getSavedAvatarId()
  );
  const [theme, setTheme] = useState<ThemeMode>(() => initTheme());

  useEffect(() => {
    const syncAvatar = () => setSelectedAvatarId(getSavedAvatarId());
    const syncTheme = () => setTheme(getSavedTheme());
    window.addEventListener('avatar-change', syncAvatar);
    window.addEventListener('theme-change', syncTheme);
    window.addEventListener('storage', syncAvatar);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('avatar-change', syncAvatar);
      window.removeEventListener('theme-change', syncTheme);
      window.removeEventListener('storage', syncAvatar);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  const selectedAvatar = findAvatarById(selectedAvatarId);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectSecondsMap, setSubjectSecondsMap] = useState<Record<string, number>>({});
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [currentStreak, setCurrentStreak] = useState<number>(0);

  const refreshAcademicData = useCallback(async () => {
    setLoadingSubjects(true);
    try {
      const [subjectsRes, sessionsRes, statsRes] = await Promise.all([
        api.get<Subject[]>('/subjects').catch(() => ({ data: [] as Subject[] })),
        api.get<StudySession[]>('/sessions').catch(() => ({ data: [] as StudySession[] })),
        api
          .get<StudyStatsResponse>('/sessions/stats')
          .catch(() => ({ data: null as StudyStatsResponse | null })),
      ]);

      const fetchedSubjects = Array.isArray(subjectsRes.data) ? subjectsRes.data : [];
      const fetchedSessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];

      const secondsBySubject: Record<string, number> = {};
      for (const subj of fetchedSubjects) {
        secondsBySubject[subj.id] =
          typeof subj.totalSeconds === 'number' ? subj.totalSeconds : 0;
      }

      for (const session of fetchedSessions) {
        const subjId =
          typeof session.subject === 'string'
            ? session.subject
            : session.subject?.id;
        if (subjId) {
          secondsBySubject[subjId] =
            (secondsBySubject[subjId] || 0) + Math.max(0, session.durationSeconds || 0);
        }
      }

      setSubjects(fetchedSubjects);
      setSubjectSecondsMap(secondsBySubject);
      setCurrentStreak(extractCurrentStreak(statsRes.data));
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    void refreshAcademicData();
  }, [refreshAcademicData]);

  const handleLogout = () => {
    setIsMobileDrawerOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const outletContext: DashboardOutletContext = {
    subjects,
    subjectSecondsMap,
    loadingSubjects,
    refreshAcademicData,
    openSubjectsDrawer: () => navigate('/materias'),
  };

  const renderSidebarContent = (collapsed: boolean, isMobile = false) => (
    <div className="flex flex-col h-full bg-[#4A6CF7] bg-indigo-600 dark:bg-gradient-to-b dark:from-[#1B254B] dark:via-[#151D3B] dark:to-[#0F152B] dark:border-r dark:border-indigo-400/15 text-white select-none transition-colors duration-300">
      {/* Logo de Fokus y control de colapso */}
      <div
        className={`h-16 px-4 flex items-center border-b border-white/15 dark:border-white/[0.07] ${
          collapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="flex items-center gap-3 overflow-hidden rounded-xl hover:opacity-90 transition-all duration-300 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/15 dark:bg-indigo-500/20 dark:border dark:border-indigo-400/25 text-white dark:text-indigo-200 flex items-center justify-center shrink-0 shadow-xs">
            <FokusIcon className="w-5 h-5" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-white dark:text-slate-100 truncate">
              Fokus
            </span>
          )}
        </button>

        {isMobile && (
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-label="Cerrar menú lateral"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Opciones de navegación: Dashboard, Materias, Exámenes y Ajustes */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => {
              if (isMobile) setIsMobileDrawerOpen(false);
            }}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                collapsed ? 'justify-center px-2.5 py-3' : 'px-3.5 py-2.5'
              } ${
                isActive
                  ? 'bg-white text-indigo-600 font-semibold shadow-sm dark:bg-indigo-500/20 dark:text-indigo-200 dark:border dark:border-indigo-400/30'
                  : 'text-white/85 hover:bg-white/15 hover:text-white dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Mi Perfil y Cerrar Sesión fijados abajo de todo */}
      <div className="p-3 border-t border-white/15 dark:border-white/[0.07] mt-auto space-y-1.5">
        {user && (
          <NavLink
            to="/perfil"
            onClick={() => {
              if (isMobile) setIsMobileDrawerOpen(false);
            }}
            title={collapsed ? 'Mi Perfil' : undefined}
            aria-label="Mi Perfil"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                collapsed ? 'justify-center px-2.5 py-2.5' : 'px-3 py-2'
              } ${
                isActive
                  ? 'bg-white text-indigo-600 font-semibold shadow-sm dark:bg-indigo-500/20 dark:text-indigo-200 dark:border dark:border-indigo-400/30'
                  : 'text-white/85 hover:bg-white/15 hover:text-white dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white'
              }`
            }
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200 font-bold text-xs flex items-center justify-center shrink-0 border border-white/30 dark:border-indigo-400/30">
              {selectedAvatar ? (
                <img
                  src={selectedAvatar.src}
                  alt={selectedAvatar.label}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            {!collapsed && <span className="truncate">Mi Perfil</span>}
          </NavLink>
        )}

        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Cerrar Sesión' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium text-white/90 hover:bg-white/15 hover:text-white dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white transition-all duration-300 cursor-pointer ${
            collapsed ? 'justify-center px-2.5 py-3' : 'px-3.5 py-2.5'
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="truncate">Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-y-auto lg:h-screen lg:overflow-hidden bg-slate-100/70 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors duration-300 flex">
      {/* Barra lateral izquierda en Desktop (colapsable / expandible) */}
      <aside
        aria-label="Navegación principal"
        className={`hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out shadow-lg z-30 md:sticky md:top-0 md:h-screen lg:h-full ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebarContent(isSidebarCollapsed, false)}
      </aside>

      {/* Drawer en Móvil */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <aside
            aria-label="Menú móvil"
            className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl"
          >
            {renderSidebarContent(false, true)}
          </aside>
        </div>
      )}

      {/* Contenedor derecho: Header superior + Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header superior limpio (con toggle de tema, Estadísticas e indicador minimalista de Racha) */}
        <header className="sticky top-0 z-20 h-14 shrink-0 bg-white/90 dark:bg-[#0D1322]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.07] px-4 sm:px-8 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-2.5">
            {/* Botón hamburguesa para abrir el drawer en móvil */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Abrir menú de navegación"
              className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111827] hover:bg-slate-100 dark:hover:bg-[#1B254B]/60 text-slate-700 dark:text-slate-200 transition-all duration-300 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="md:hidden inline-flex items-center gap-2 select-none">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0">
                <FokusIcon className="w-4 h-4" />
              </div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Fokus
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Botón compacto de Modo Noche / Día a la izquierda de Estadísticas */}
            <button
              type="button"
              onClick={() => setTheme(toggleTheme())}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111827]/95 text-slate-600 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-100 hover:border-indigo-200 dark:hover:border-indigo-400/30 shadow-2xs transition-all duration-300 cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Botón de Estadísticas a la izquierda del contador de racha */}
            <NavLink
              to="/estadisticas"
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-400/30'
                    : 'bg-white dark:bg-[#111827]/95 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/[0.08] hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-200 hover:border-indigo-200 dark:hover:border-indigo-400/30'
                }`
              }
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Estadísticas</span>
            </NavLink>

            {/* Indicador de Racha minimalista: únicamente Flame + número de días */}
            <div
              title={
                currentStreak > 0
                  ? `Racha activa: ${currentStreak} días`
                  : 'Racha aún no activada (0 días)'
              }
              className={`inline-flex items-center gap-1.5 font-bold text-base tabular-nums select-none ${
                currentStreak > 0
                  ? 'text-red-500 dark:text-rose-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Flame
                className={`w-5 h-5 ${
                  currentStreak > 0
                    ? 'text-red-500 fill-red-500 dark:text-rose-400 dark:fill-rose-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span>{currentStreak}</span>
            </div>
          </div>
        </header>

        {/* Contenido principal */}
        <main
          className={`flex-1 lg:min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 ${
            isDashboardRoot
              ? 'py-4 lg:py-4 overflow-y-auto lg:overflow-hidden'
              : 'py-6 sm:py-8 overflow-y-auto'
          }`}
        >
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}
