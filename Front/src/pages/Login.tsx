import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, LogIn, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FokusIcon } from '../components/FokusLogo';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Credenciales inválidas. Intentá nuevamente.');
      } else {
        setError('Ocurrió un error inesperado al iniciar sesión.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-[#090D16] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,rgba(99,102,241,0.16),rgba(139,92,246,0.08)_45%,transparent_75%)] dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,rgba(99,102,241,0.25),rgba(139,92,246,0.14)_45%,transparent_75%)]"
      />

      <div className="relative w-full max-w-md space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al inicio</span>
        </Link>

        <div className="bg-white dark:bg-[#111827]/95 rounded-3xl shadow-lg border border-slate-200/80 dark:border-white/[0.07] p-6 sm:p-8 transition-all duration-300">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center mb-3 shadow-sm">
              <FokusIcon className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Bienvenido a Fokus
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Iniciá sesión para organizar tus materias y sesiones de enfoque
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/25 text-red-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="estudiante@universidad.edu"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0B111E] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0B111E] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800/50 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Ingresando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
            ¿No tenés una cuenta?{' '}
            <Link
              to="/register"
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-all duration-300"
            >
              Registrate acá
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
