import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import {
  CalendarCheck,
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Award,
  Loader2,
  AlertCircle,
  X,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import api from '../api/axios';
import type { Exam, Subject } from '../types/academic';

type ExamFilter = 'ALL' | 'PENDING' | 'COMPLETED';

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

function getExamDaysLeft(isoDate: string): number {
  const todayKey = formatDateKey(new Date());
  const examKey = formatDateKey(new Date(isoDate));
  return diffCalendarDays(examKey, todayKey);
}

function toInputDateValue(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (isNaN(parsed.getTime())) return '';
  return formatDateKey(parsed);
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<ExamFilter>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');

  // Estado del modal de Alta / Modificación
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [subjectIdInput, setSubjectIdInput] = useState<string>('');
  const [titleInput, setTitleInput] = useState<string>('');
  const [examDateInput, setExamDateInput] = useState<string>('');
  const [targetHoursInput, setTargetHoursInput] = useState<string>('');
  const [isCompletedInput, setIsCompletedInput] = useState<boolean>(false);
  const [scoreInput, setScoreInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Estado para carga rápida de nota (score)
  const [scoreModalExam, setScoreModalExam] = useState<Exam | null>(null);
  const [quickScoreValue, setQuickScoreValue] = useState<string>('');
  const [quickScoreCompleted, setQuickScoreCompleted] = useState<boolean>(true);
  const [savingQuickScore, setSavingQuickScore] = useState<boolean>(false);
  const [quickScoreError, setQuickScoreError] = useState<string | null>(null);

  // Estado de cambio rápido de completado
  const [togglingExamId, setTogglingExamId] = useState<string | null>(null);

  // Estado de confirmación de Baja
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [examsRes, subjectsRes] = await Promise.all([
        api.get<Exam[]>('/exams'),
        api.get<Subject[]>('/subjects').catch(() => ({ data: [] as Subject[] })),
      ]);

      const fetchedExams = Array.isArray(examsRes.data) ? examsRes.data : [];
      const fetchedSubjects = Array.isArray(subjectsRes.data) ? subjectsRes.data : [];

      setExams(fetchedExams);
      setSubjects(fetchedSubjects);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'No se pudieron cargar los exámenes.');
      } else {
        setError('Error al conectar con el servidor.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const resolveSubject = useCallback(
    (subjRef: Exam['subject']): Subject | null => {
      if (typeof subjRef === 'object' && subjRef !== null) {
        return subjRef;
      }
      return subjects.find((s) => s.id === subjRef) || null;
    },
    [subjects]
  );

  // Contadores y métricas
  const pendingCount = useMemo(
    () => exams.filter((e) => !e.isCompleted).length,
    [exams]
  );

  const completedCount = useMemo(
    () => exams.filter((e) => e.isCompleted).length,
    [exams]
  );

  const averageScore = useMemo(() => {
    const scored = exams.filter(
      (e) => typeof e.score === 'number' && !isNaN(e.score)
    );
    if (scored.length === 0) return null;
    const sum = scored.reduce((acc, item) => acc + (item.score ?? 0), 0);
    return (sum / scored.length).toFixed(1);
  }, [exams]);

  // Lista filtrada
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      if (statusFilter === 'PENDING' && exam.isCompleted) return false;
      if (statusFilter === 'COMPLETED' && !exam.isCompleted) return false;

      if (subjectFilter !== 'ALL') {
        const subj = resolveSubject(exam.subject);
        const subjId = subj?.id ?? (typeof exam.subject === 'string' ? exam.subject : '');
        if (subjId !== subjectFilter) return false;
      }

      return true;
    });
  }, [exams, statusFilter, subjectFilter, resolveSubject]);

  // Abrir modal de Alta
  const openCreateModal = () => {
    setEditingExam(null);
    setSubjectIdInput(subjects[0]?.id || '');
    setTitleInput('');
    setExamDateInput(formatDateKey(new Date()));
    setTargetHoursInput('');
    setIsCompletedInput(false);
    setScoreInput('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Abrir modal de Modificación
  const openEditModal = (exam: Exam) => {
    const subj = resolveSubject(exam.subject);
    const subjId = subj?.id ?? (typeof exam.subject === 'string' ? exam.subject : '');

    setEditingExam(exam);
    setSubjectIdInput(subjId || subjects[0]?.id || '');
    setTitleInput(exam.title);
    setExamDateInput(toInputDateValue(exam.examDate));
    setTargetHoursInput(
      typeof exam.targetHours === 'number' ? String(exam.targetHours) : ''
    );
    setIsCompletedInput(Boolean(exam.isCompleted));
    setScoreInput(typeof exam.score === 'number' ? String(exam.score) : '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingExam(null);
    setFormError(null);
  };

  // Alta (POST /api/exams) y Modificación (PUT /api/exams/:id)
  const handleSubmitExam = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!subjectIdInput) {
      setFormError('Seleccioná una materia para el examen.');
      return;
    }
    if (!titleInput.trim()) {
      setFormError('El título del examen es obligatorio.');
      return;
    }
    if (!examDateInput) {
      setFormError('La fecha del examen es obligatoria.');
      return;
    }

    const parsedTargetHours =
      targetHoursInput.trim() !== '' ? Number(targetHoursInput) : undefined;
    if (
      parsedTargetHours !== undefined &&
      (isNaN(parsedTargetHours) || parsedTargetHours < 0)
    ) {
      setFormError('Las horas objetivo deben ser un número positivo.');
      return;
    }

    const parsedScore = scoreInput.trim() !== '' ? Number(scoreInput) : undefined;
    if (
      parsedScore !== undefined &&
      (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100)
    ) {
      setFormError('Ingresá una nota válida (entre 0 y 100).');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const isoDate = new Date(`${examDateInput}T12:00:00`).toISOString();

      if (editingExam) {
        await api.put<Exam>(`/exams/${editingExam.id}`, {
          subjectId: subjectIdInput,
          title: titleInput.trim(),
          examDate: isoDate,
          targetHours: parsedTargetHours !== undefined ? parsedTargetHours : null,
          isCompleted: isCompletedInput,
          score: parsedScore !== undefined ? parsedScore : null,
        });
      } else {
        await api.post<Exam>('/exams', {
          subjectId: subjectIdInput,
          title: titleInput.trim(),
          examDate: isoDate,
          targetHours: parsedTargetHours,
          isCompleted: isCompletedInput,
          score: parsedScore,
        });
      }

      setIsModalOpen(false);
      setEditingExam(null);
      await fetchData();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setFormError(
          err.response?.data?.message || 'No se pudo guardar el examen.'
        );
      } else {
        setFormError('Error al guardar el examen.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Alternar estado Pendiente / Completado rápido (PUT /api/exams/:id)
  const handleToggleCompleted = async (exam: Exam) => {
    setTogglingExamId(exam.id);
    try {
      await api.put<Exam>(`/exams/${exam.id}`, {
        isCompleted: !exam.isCompleted,
      });
      await fetchData();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'No se pudo actualizar el examen.');
      } else {
        setError('Error al actualizar el estado del examen.');
      }
    } finally {
      setTogglingExamId(null);
    }
  };

  // Abrir modal rápido de carga de nota
  const openQuickScoreModal = (exam: Exam) => {
    setScoreModalExam(exam);
    setQuickScoreValue(typeof exam.score === 'number' ? String(exam.score) : '');
    setQuickScoreCompleted(true);
    setQuickScoreError(null);
  };

  const handleSaveQuickScore = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scoreModalExam) return;

    const trimmed = quickScoreValue.trim();
    const numericScore = trimmed === '' ? null : Number(trimmed);

    if (
      numericScore !== null &&
      (isNaN(numericScore) || numericScore < 0 || numericScore > 100)
    ) {
      setQuickScoreError('Ingresá una calificación válida (por ejemplo, de 1 a 10).');
      return;
    }

    setSavingQuickScore(true);
    setQuickScoreError(null);

    try {
      await api.put<Exam>(`/exams/${scoreModalExam.id}`, {
        score: numericScore,
        isCompleted: quickScoreCompleted,
      });
      setScoreModalExam(null);
      await fetchData();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setQuickScoreError(
          err.response?.data?.message || 'No se pudo guardar la nota.'
        );
      } else {
        setQuickScoreError('Error al registrar la calificación.');
      }
    } finally {
      setSavingQuickScore(false);
    }
  };

  // Baja de examen con confirmación (DELETE /api/exams/:id)
  const handleConfirmDelete = async () => {
    if (!examToDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await api.delete(`/exams/${examToDelete.id}`);
      setExamToDelete(null);
      await fetchData();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setDeleteError(
          err.response?.data?.message || 'No se pudo eliminar el examen.'
        );
      } else {
        setDeleteError('Error al eliminar el examen.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const renderDaysRemainingBadge = (exam: Exam) => {
    const daysLeft = getExamDaysLeft(exam.examDate);

    if (exam.isCompleted) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completado</span>
        </span>
      );
    }

    if (daysLeft === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <CalendarClock className="w-3.5 h-3.5" />
          <span>¡Rinde hoy!</span>
        </span>
      );
    }

    if (daysLeft > 0) {
      const isUrgent = daysLeft <= 7;
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isUrgent
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>
            {daysLeft === 1 ? 'Falta 1 día' : `Faltan ${daysLeft} días`}
          </span>
        </span>
      );
    }

    const daysPast = Math.abs(daysLeft);
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <CalendarClock className="w-3.5 h-3.5" />
        <span>
          {daysPast === 1 ? 'Pasó hace 1 día' : `Pasó hace ${daysPast} días`}
        </span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Calendario de Evaluaciones</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Mis Exámenes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Planificá tus parciales, finales y entregas, controlá los días restantes y registrá tus notas.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Examen</span>
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pendientes
            </p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{pendingCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Evaluaciones por rendir</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarClock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Aprobados / Completados
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Instancias finalizadas</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Promedio General
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {averageScore !== null ? averageScore : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Sobre exámenes calificados</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({exams.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'COMPLETED'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aprobados / Completados ({completedCount})
          </button>
        </div>

        {/* Filtro por materia */}
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label="Filtrar por materia"
            className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todas las materias</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mensaje de error general */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="px-3 py-1.5 rounded-xl bg-white border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Listado de exámenes */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Cargando tus exámenes...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {exams.length === 0
              ? 'Todavía no tenés exámenes agendados'
              : 'No hay exámenes para el filtro seleccionado'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {exams.length === 0
              ? 'Agendá tus próximas fechas de parciales o finales para llevar el seguimiento de días restantes y calificaciones.'
              : 'Probá seleccionando otra pestaña de estado o mostrando todas las materias.'}
          </p>
          {exams.length === 0 && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar primer examen</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExams.map((exam) => {
            const subj = resolveSubject(exam.subject);
            const subjColor = subj?.color || '#4F46E5';
            const formattedDate = new Date(exam.examDate).toLocaleDateString('es-AR', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={exam.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Cabecera con materia y badge de días restantes */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: subjColor }}
                      />
                      <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
                        {subj?.name || 'Materia'}
                      </span>
                    </div>

                    {renderDaysRemainingBadge(exam)}
                  </div>

                  {/* Título y fecha */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {exam.title}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">
                        Fecha: {formattedDate}
                        {typeof exam.targetHours === 'number' && exam.targetHours > 0
                          ? ` • Meta: ${exam.targetHours}h de estudio`
                          : ''}
                      </p>
                    </div>

                    {/* Indicador / Botón de Nota (score) */}
                    <button
                      type="button"
                      onClick={() => openQuickScoreModal(exam)}
                      title="Cargar o modificar nota"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold border transition cursor-pointer shrink-0 ${
                        typeof exam.score === 'number'
                          ? exam.score >= 4
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-indigo-50/70 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                      }`}
                    >
                      <Award className="w-4 h-4" />
                      <span>
                        {typeof exam.score === 'number'
                          ? `Nota: ${exam.score}`
                          : 'Cargar nota'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Pie de tarjeta con acciones */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={togglingExamId === exam.id}
                    onClick={() => void handleToggleCompleted(exam)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                      exam.isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {togglingExamId === exam.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {exam.isCompleted
                        ? 'Marcar como pendiente'
                        : 'Marcar como completado'}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(exam)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-semibold transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setExamToDelete(exam);
                      }}
                      aria-label={`Eliminar ${exam.title}`}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Alta y Modificación de Examen */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={closeModal}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingExam ? 'Editar Examen' : 'Nuevo Examen'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {subjects.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
                <p className="font-semibold">No tenés materias registradas</p>
                <p>
                  Para agendar un examen necesitás crear al menos una materia primero en la sección de Materias.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitExam} className="space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="exam-subject"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Materia
                  </label>
                  <select
                    id="exam-subject"
                    required
                    value={subjectIdInput}
                    onChange={(e) => setSubjectIdInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="exam-title"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Título / Instancia
                  </label>
                  <input
                    id="exam-title"
                    type="text"
                    required
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Ej. Primer Parcial / Examen Final"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="exam-date"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Fecha del examen
                    </label>
                    <input
                      id="exam-date"
                      type="date"
                      required
                      value={examDateInput}
                      onChange={(e) => setExamDateInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="exam-target-hours"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Horas objetivo (opcional)
                    </label>
                    <input
                      id="exam-target-hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={targetHoursInput}
                      onChange={(e) => setTargetHoursInput(e.target.value)}
                      placeholder="Ej. 20"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label
                      htmlFor="exam-score"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Nota obtenida (score)
                    </label>
                    <input
                      id="exam-score"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={scoreInput}
                      onChange={(e) => {
                        setScoreInput(e.target.value);
                        if (e.target.value.trim() !== '') {
                          setIsCompletedInput(true);
                        }
                      }}
                      placeholder="Ej. 8.5"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="pt-4">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCompletedInput}
                        onChange={(e) => setIsCompletedInput(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        Examen completado
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{editingExam ? 'Guardar cambios' : 'Agendar examen'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO: Carga de Nota (score) */}
      {scoreModalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => {
              if (!savingQuickScore) setScoreModalExam(null);
            }}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cargar Nota</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">
                    {scoreModalExam.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScoreModalExam(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickScore} className="space-y-4">
              {quickScoreError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quickScoreError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="quick-score-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Calificación obtenida
                </label>
                <input
                  id="quick-score-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  autoFocus
                  value={quickScoreValue}
                  onChange={(e) => setQuickScoreValue(e.target.value)}
                  placeholder="Ej. 9"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quickScoreCompleted}
                  onChange={(e) => setQuickScoreCompleted(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Marcar examen como completado
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={savingQuickScore}
                  onClick={() => setScoreModalExam(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingQuickScore}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold transition cursor-pointer"
                >
                  {savingQuickScore && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Guardar nota</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Baja */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => {
              if (!deleting) setExamToDelete(null);
            }}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Eliminar examen
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ¿Estás seguro de que querés eliminar{' '}
                  <span className="font-semibold text-slate-800">
                    "{examToDelete.title}"
                  </span>
                  ? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setExamToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-semibold transition cursor-pointer"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Sí, eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
