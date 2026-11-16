import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Menu,
  X,
  Settings,
  LogOut,
  BookOpen,
  LayoutDashboard,
  CalendarCheck,
  Flame,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getSavedAvatarId, findAvatarById } from '../utils/avatars';
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
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/materias', label: 'Materias', icon: BookOpen, end: false },
  { to: '/examenes', label: 'Exámenes', icon: CalendarCheck, end: false },
  { to: '/ajustes', label: 'Ajustes', icon: Settings, end: false },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboardRoot = location.pathname === '/';

  // Estado de barra lateral: cerrada por defecto en desktop y drawer en móvil
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(() =>
    getSavedAvatarId()
  );

  useEffect(() => {
    const syncAvatar = () => setSelectedAvatarId(getSavedAvatarId());
    window.addEventListener('avatar-change', syncAvatar);
    window.addEventListener('storage', syncAvatar);
    return () => {
      window.removeEventListener('avatar-change', syncAvatar);
      window.removeEventListener('storage', syncAvatar);
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
    <div className="flex flex-col h-full bg-[#4A6CF7] bg-indigo-600 text-white select-none">
      {/* Logo y control de colapso */}
      <div
        className={`h-16 px-4 flex items-center border-b border-white/15 ${
          collapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="flex items-center gap-3 overflow-hidden rounded-xl hover:opacity-90 transition cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0 shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-white truncate">
              EstudioApp
            </span>
          )}
        </button>

        {isMobile && (
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-label="Cerrar menú lateral"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
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
              `flex items-center gap-3 rounded-xl text-sm font-medium transition ${
                collapsed ? 'justify-center px-2.5 py-3' : 'px-3.5 py-2.5'
              } ${
                isActive
                  ? 'bg-white text-indigo-600 font-semibold shadow-sm'
                  : 'text-white/85 hover:bg-white/15 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Mi Perfil y Cerrar Sesión fijados abajo de todo */}
      <div className="p-3 border-t border-white/15 mt-auto space-y-1.5">
        {user && (
          <NavLink
            to="/perfil"
            onClick={() => {
              if (isMobile) setIsMobileDrawerOpen(false);
            }}
            title={collapsed ? 'Mi Perfil' : undefined}
            aria-label="Mi Perfil"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl text-sm font-medium transition ${
                collapsed ? 'justify-center px-2.5 py-2.5' : 'px-3 py-2'
              } ${
                isActive
                  ? 'bg-white text-indigo-600 font-semibold shadow-sm'
                  : 'text-white/85 hover:bg-white/15 hover:text-white'
              }`
            }
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0 border border-white/30">
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
          className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium text-white/90 hover:bg-white/15 hover:text-white transition cursor-pointer ${
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
    <div className="fixed inset-0 overflow-hidden bg-slate-100/70 flex">
      {/* Barra lateral izquierda en Desktop (colapsable / expandible) */}
      <aside
        aria-label="Navegación principal"
        className={`hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out shadow-lg z-30 h-full ${
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
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
        {/* Header superior limpio (sin ícono de materias, con indicador minimalista de Racha) */}
        <header className="sticky top-0 z-20 h-14 shrink-0 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Botón hamburguesa para abrir el drawer en móvil */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Abrir menú de navegación"
              className="md:hidden p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-5">
            {/* Botón de Estadísticas a la izquierda del contador de racha */}
            <NavLink
              to="/estadisticas"
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
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
              className={`inline-flex items-center gap-1.5 font-bold text-base select-none ${
                currentStreak > 0 ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              <Flame
                className={`w-5 h-5 ${
                  currentStreak > 0
                    ? 'text-red-500 fill-red-500'
                    : 'text-slate-400'
                }`}
              />
              <span>{currentStreak}</span>
            </div>
          </div>
        </header>

        {/* Contenido principal */}
        <main
          className={`flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 ${
            isDashboardRoot
              ? 'py-3 lg:py-4 overflow-hidden'
              : 'py-6 sm:py-8 overflow-y-auto'
          }`}
        >
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}
