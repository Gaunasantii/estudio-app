import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  BarChart3,
  CalendarCheck,
  Calendar,
  Flame,
  Sun,
  Moon,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Play,
  BookOpen,
} from 'lucide-react';
import { FokusIcon, FokusLogo } from '../components/FokusLogo';
import { getSavedTheme, initTheme, toggleTheme, type ThemeMode } from '../utils/theme';

const FEATURES = [
  {
    title: 'Bloques Pomodoro y Cronómetro',
    description:
      'Alterná entre sesiones de enfoque estructuradas con alerta sonora o tiempo libre por materia y tipo de actividad (Teoría, Práctica, TP o Parcial).',
    icon: Clock,
    badge: 'Enfoque profundo',
    accentClass:
      'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-400/20',
  },
  {
    title: 'Estadísticas de Rendimiento',
    description:
      'Visualizá tu evolución en las últimas 12 semanas, el desglose de horas por asignatura y tu mapa de calor anual de constancia diaria.',
    icon: BarChart3,
    badge: 'Métricas reales',
    accentClass:
      'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-400/20',
  },
  {
    title: 'Seguimiento de Exámenes',
    description:
      'Controlá cuántos días faltan para tus próximos parciales y finales, definí objetivos de horas de preparación y registrá tus notas y promedio.',
    icon: CalendarCheck,
    badge: 'Evaluaciones al día',
    accentClass:
      'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/20',
  },
  {
    title: 'Horario Semanal Interactivo',
    description:
      'Organizá tus cursadas de lunes a viernes o fin de semana en una línea de tiempo clara con colores por materia, aulas y comisiones.',
    icon: Calendar,
    badge: 'Agenda visual',
    accentClass:
      'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/20',
  },
];

export default function LandingPage() {
  const [theme, setTheme] = useState<ThemeMode>(() => initTheme());

  useEffect(() => {
    const syncTheme = () => setTheme(getSavedTheme());
    window.addEventListener('theme-change', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('theme-change', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  const previewRadius = 46;
  const previewCircumference = 2 * Math.PI * previewRadius;
  const previewProgress = 0.72;
  const previewDashoffset = previewCircumference * (1 - previewProgress);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden">
      {/* Barra superior fija (sticky top-0 backdrop-blur) */}
      <header className="sticky top-0 z-40 h-16 bg-white/80 dark:bg-[#090D16]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.07] transition-all duration-300">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
          <Link
            to="/"
            aria-label="Inicio de Fokus"
            className="inline-flex items-center gap-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 hover:opacity-90"
          >
            <FokusLogo
              badgeClassName="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm"
              textClassName="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Toggle de modo claro/oscuro */}
            <button
              type="button"
              onClick={() => setTheme(toggleTheme())}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-slate-600 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-100 hover:border-indigo-200 dark:hover:border-indigo-400/30 shadow-2xs transition-all duration-300 cursor-pointer shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <Link
              to="/login"
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all duration-300"
            >
              Iniciar sesión
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center justify-center px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md hover:shadow-indigo-500/20 transition-all duration-300"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION CON BRILLO AMBIENTAL SUTIL (radial-gradient índigo/violeta) */}
        <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.18),rgba(139,92,246,0.10)_45%,transparent_75%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.28),rgba(139,92,246,0.16)_45%,transparent_75%)]"
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Columna izquierda: Mensaje principal y CTAs */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/90 dark:bg-indigo-500/15 border border-indigo-200/70 dark:border-indigo-400/25 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Plataforma de estudio y alto rendimiento universitario</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.12]">
                  Enfocá cada sesión.{' '}
                  <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-300 bg-clip-text text-transparent">
                    Dominá tu cursada con Fokus.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Centralizá tus bloques de estudio <strong>Pomodoro y Cronómetro</strong>,
                  analizá tus <strong>estadísticas de rendimiento</strong>, anticipá cada fecha con
                  el <strong>seguimiento de exámenes</strong> y organizá tu{' '}
                  <strong>horario semanal</strong> en una interfaz rápida y libre de distracciones.
                </p>

                {/* Botones de llamado a la acción */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold shadow-md hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <span>Empezar a estudiar ahora</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white dark:bg-[#111827] hover:bg-slate-100 dark:hover:bg-[#1B254B]/60 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-white/[0.1] text-sm sm:text-base font-semibold shadow-2xs hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <span>Crear cuenta gratis</span>
                  </Link>
                </div>

                {/* Indicadores rápidos de confianza */}
                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Pomodoro configurable y Cronómetro libre</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Historial y racha diaria automática</span>
                  </span>
                </div>
              </div>

              {/* Columna derecha: Vista previa interactiva de la tarjeta de enfoque de Fokus */}
              <div className="lg:col-span-5">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Resplandor ambiental detrás de la tarjeta */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.28),rgba(139,92,246,0.12)_55%,transparent_75%)] blur-xl"
                  />

                  <div className="relative rounded-3xl bg-white/95 dark:bg-[#111827]/95 border border-slate-200/90 dark:border-white/[0.08] p-5 sm:p-6 shadow-xl space-y-4 transition-all duration-300">
                    {/* Barra superior simulada del Dashboard */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/[0.07]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                          <FokusIcon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Panel Fokus
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                          En sesión activa
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 dark:text-rose-400 tabular-nums">
                          <Flame className="w-4 h-4 fill-current" />
                          <span>14d</span>
                        </span>
                      </div>
                    </div>

                    {/* Tarjeta de Temporizador de muestra con brillo radial y anillo SVG animado */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 dark:from-[#1B254B] dark:via-[#151D3B] dark:to-[#0B111E] border border-indigo-400/25 p-4 text-white shadow-md">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(167,139,250,0.28),transparent_65%)]"
                      />

                      <div className="relative flex items-center justify-between gap-4">
                        {/* Anillo circular SVG con efecto de pulso suave */}
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center shrink-0">
                          <span
                            aria-hidden="true"
                            className="absolute inset-1 rounded-full bg-indigo-400/20 animate-pulse"
                          />
                          <svg
                            className="w-full h-full -rotate-90"
                            viewBox="0 0 108 108"
                            aria-hidden="true"
                          >
                            <circle
                              cx="54"
                              cy="54"
                              r={previewRadius}
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="transparent"
                              className="text-white/15"
                            />
                            <circle
                              cx="54"
                              cy="54"
                              r={previewRadius}
                              stroke="url(#hero-timer-grad)"
                              strokeWidth="6"
                              strokeLinecap="round"
                              fill="transparent"
                              strokeDasharray={previewCircumference}
                              strokeDashoffset={previewDashoffset}
                              className="transition-all duration-500"
                            />
                            <defs>
                              <linearGradient id="hero-timer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#A5B4FC" />
                                <stop offset="100%" stopColor="#C4B5FD" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-lg sm:text-xl font-mono font-bold tracking-tight tabular-nums leading-none">
                              18:00
                            </span>
                            <span className="text-[10px] text-indigo-200 mt-1 font-medium">
                              Pomodoro
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-2.5">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-200">
                              Materia activa
                            </span>
                            <p className="text-sm font-bold text-white truncate">
                              Análisis Matemático II
                            </p>
                            <p className="text-xs text-indigo-200/90 truncate">
                              Práctica • Guía de integrales
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              to="/login"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-semibold shadow-2xs transition-all duration-300"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Probar temporizador</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mini métricas inferiores */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 dark:bg-[#0B111E] border border-slate-100 dark:border-white/[0.06] p-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Esta semana</span>
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                          16h 45m
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          +24% vs. semana anterior
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 dark:bg-[#0B111E] border border-slate-100 dark:border-white/[0.06] p-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Próximo parcial</span>
                          <CalendarCheck className="w-3.5 h-3.5 text-rose-500" />
                        </div>
                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                          En 5 días
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Física I • 85% objetivo
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN DE FUNCIONALIDADES PRINCIPALES */}
        <section className="py-14 sm:py-20 border-t border-slate-200/70 dark:border-white/[0.06] bg-white/60 dark:bg-[#0B111E]/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                Todo tu cuatrimestre en un solo lugar
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Diseñado para transformar tus horas de estudio en resultados
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Fokus integra las cuatro herramientas esenciales que necesitás para planificar tu
                cursada, sostener el hábito diario y llegar preparado a cada examen.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="group rounded-3xl bg-white dark:bg-[#111827]/95 border border-slate-200/80 dark:border-white/[0.07] p-6 sm:p-7 shadow-xs hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-400/25 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${feature.accentClass}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-[#0B111E] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.06]">
                          {feature.badge}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-all duration-300"
                      >
                        <span>Acceder a esta herramienta</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* LLAMADO A LA ACCIÓN FINAL */}
        <section className="py-14 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 dark:from-[#1B254B] dark:via-[#151D3B] dark:to-[#0F152B] border border-indigo-400/20 p-8 sm:p-12 text-center text-white shadow-xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.32),transparent_60%)]"
              />
              <div className="relative max-w-2xl mx-auto space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto">
                  <FokusIcon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  ¿Listo para llevar tu estudio al siguiente nivel?
                </h2>
                <p className="text-sm sm:text-base text-indigo-100/90">
                  Iniciá sesión en tu cuenta o registrate en segundos para empezar a medir tus
                  bloques de enfoque y organizar tu semana académica.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 text-sm font-bold shadow-sm transition-all duration-300"
                  >
                    <span>Iniciar sesión</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm font-semibold transition-all duration-300"
                  >
                    <span>Crear cuenta</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Pie de página */}
      <footer className="border-t border-slate-200/80 dark:border-white/[0.07] py-6 bg-white/50 dark:bg-[#090D16]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <FokusLogo
            badgeClassName="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white"
            iconClassName="w-4 h-4"
            textClassName="text-sm font-bold text-slate-800 dark:text-slate-200"
          />
          <p className="text-center sm:text-right">
            Fokus • Plataforma de enfoque, horarios, exámenes y rendimiento académico.
          </p>
        </div>
      </footer>
    </div>
  );
}
