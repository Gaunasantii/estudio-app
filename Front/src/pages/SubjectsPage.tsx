import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
  BookOpen,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Palette,
  Loader2,
  AlertCircle,
  X,
  Sparkles,
  Calendar,
} from 'lucide-react';
import api from '../api/axios';
import type { Subject, ClassSchedule, DashboardOutletContext } from '../types/academic';

interface SubjectWithSchedules extends Subject {
  schedules?: ClassSchedule[];
}

const PRESET_COLORS = [
  { hex: '#4F46E5', label: 'Índigo' },
  { hex: '#2563EB', label: 'Azul' },
  { hex: '#06B6D4', label: 'Cian' },
  { hex: '#10B981', label: 'Esmeralda' },
  { hex: '#F59E0B', label: 'Ámbar' },
  { hex: '#F43F5E', label: 'Rosa' },
  { hex: '#8B5CF6', label: 'Violeta' },
  { hex: '#EC4899', label: 'Magenta' },
];

type StatusFilter = 'ALL' | 'TAKING' | 'INACTIVE';

export default function SubjectsPage() {
  const outletContext = useOutletContext<DashboardOutletContext | undefined>();

  const [subjects, setSubjects] = useState<SubjectWithSchedules[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Buscador y filtro
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Estado del modal de Alta / Modificación
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<SubjectWithSchedules | null>(null);
  const [nameInput, setNameInput] = useState<string>('');
  const [colorInput, setColorInput] = useState<string>(PRESET_COLORS[0].hex);
  const [isCurrentlyTakingInput, setIsCurrentlyTakingInput] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Estado de cambio rápido de cursada
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Estado del modal de confirmación de Baja
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectWithSchedules | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<SubjectWithSchedules[]>('/subjects');
      setSubjects(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'No se pudieron cargar las materias.');
      } else {
        setError('Error al conectar con el servidor.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);

  const syncGlobalAcademicData = async () => {
    if (outletContext?.refreshAcademicData) {
      await outletContext.refreshAcademicData();
    }
  };

  // Filtrado por buscador y estado
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSearch = subject.name
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'TAKING') return subject.isCurrentlyTaking;
      if (statusFilter === 'INACTIVE') return !subject.isCurrentlyTaking;
      return true;
    });
  }, [subjects, searchQuery, statusFilter]);

  const takingCount = useMemo(
    () => subjects.filter((s) => s.isCurrentlyTaking).length,
    [subjects]
  );

  const inactiveCount = useMemo(
    () => subjects.filter((s) => !s.isCurrentlyTaking).length,
    [subjects]
  );

  // Abrir modal para Crear
  const openCreateModal = () => {
    setEditingSubject(null);
    setNameInput('');
    setColorInput(PRESET_COLORS[0].hex);
    setIsCurrentlyTakingInput(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Abrir modal para Editar
  const openEditModal = (subject: SubjectWithSchedules) => {
    setEditingSubject(subject);
    setNameInput(subject.name);
    setColorInput(subject.color || PRESET_COLORS[0].hex);
    setIsCurrentlyTakingInput(subject.isCurrentlyTaking);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingSubject(null);
    setFormError(null);
  };

  // Alta (POST /api/subjects) o Modificación (PUT /api/subjects/:id)
  const handleSubmitSubject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setFormError('El nombre de la materia es obligatorio.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name: trimmedName,
        color: colorInput,
        isCurrentlyTaking: isCurrentlyTakingInput,
      };

      if (editingSubject) {
        await api.put<SubjectWithSchedules>(`/subjects/${editingSubject.id}`, payload);
      } else {
        await api.post<SubjectWithSchedules>('/subjects', payload);
      }

      setIsModalOpen(false);
      setEditingSubject(null);
      await Promise.all([fetchSubjects(), syncGlobalAcademicData()]);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setFormError(
          err.response?.data?.message || 'No se pudo guardar la materia.'
        );
      } else {
        setFormError('Ocurrió un error al guardar la materia.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Cambio rápido de estado de cursada (PUT /api/subjects/:id)
  const handleToggleTaking = async (subject: SubjectWithSchedules) => {
    setTogglingId(subject.id);
    try {
      await api.put<SubjectWithSchedules>(`/subjects/${subject.id}`, {
        name: subject.name,
        color: subject.color,
        isCurrentlyTaking: !subject.isCurrentlyTaking,
      });
      await Promise.all([fetchSubjects(), syncGlobalAcademicData()]);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'No se pudo actualizar el estado.');
      } else {
        setError('Error al actualizar el estado de la materia.');
      }
    } finally {
      setTogglingId(null);
    }
  };

  // Confirmar Baja (DELETE /api/subjects/:id)
  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await api.delete(`/subjects/${subjectToDelete.id}`);
      setSubjectToDelete(null);
      await Promise.all([fetchSubjects(), syncGlobalAcademicData()]);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setDeleteError(
          err.response?.data?.message || 'No se pudo eliminar la materia.'
        );
      } else {
        setDeleteError('Error al eliminar la materia.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gestión Académica</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Mis Materias
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administrá tus asignaturas, colores identificadores y estado de cursada actual.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Materia</span>
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Registradas
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{subjects.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Materias en tu plan</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cursando Ahora
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{takingCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Materias activas este cuatrimestre</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pausadas / Finalizadas
            </p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{inactiveCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Fuera de cursada actual</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar materia por nombre..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({subjects.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('TAKING')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'TAKING'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cursando ({takingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'INACTIVE'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inactivas ({inactiveCount})
          </button>
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
            onClick={() => void fetchSubjects()}
            className="px-3 py-1.5 rounded-xl bg-white border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Listado de materias */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Cargando tus materias...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {subjects.length === 0
              ? 'Todavía no cargaste ninguna materia'
              : 'No se encontraron materias con ese criterio'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {subjects.length === 0
              ? 'Creá tu primera asignatura con un color identificador para asociarla a tus sesiones de estudio y exámenes.'
              : 'Probá cambiando el texto de búsqueda o el filtro de estado de cursada.'}
          </p>
          {subjects.length === 0 && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Crear primera materia</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((subject) => {
            const subjectColor = subject.color || '#4F46E5';
            const schedulesCount = Array.isArray(subject.schedules)
              ? subject.schedules.length
              : 0;

            return (
              <div
                key={subject.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-4 h-11 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: subjectColor }}
                      />
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-slate-900 truncate">
                          {subject.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-mono">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: subjectColor }}
                            />
                            {subjectColor.toUpperCase()}
                          </span>
                          {schedulesCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                              • <Calendar className="w-3 h-3" /> {schedulesCount}{' '}
                              {schedulesCount === 1 ? 'horario' : 'horarios'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botón de estado de cursada */}
                    <button
                      type="button"
                      disabled={togglingId === subject.id}
                      onClick={() => void handleToggleTaking(subject)}
                      title="Cambiar estado de cursada"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer shrink-0 ${
                        subject.isCurrentlyTaking
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {togglingId === subject.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : subject.isCurrentlyTaking ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{subject.isCurrentlyTaking ? 'Cursando' : 'Inactiva'}</span>
                    </button>
                  </div>
                </div>

                {/* Pie de tarjeta con acciones */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">
                    {subject.createdAt
                      ? `Creada el ${new Date(subject.createdAt).toLocaleDateString('es-AR')}`
                      : 'Asignatura registrada'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(subject)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-semibold transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setSubjectToDelete(subject);
                      }}
                      aria-label={`Eliminar ${subject.name}`}
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

      {/* MODAL: Alta y Modificación de Materia */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={closeModal}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingSubject ? 'Editar Materia' : 'Nueva Materia'}
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

            <form onSubmit={handleSubmitSubject} className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="subject-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Nombre de la materia
                </label>
                <input
                  id="subject-name"
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Ej. Algoritmos y Estructuras de Datos"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Selector de color identificador */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Color identificador</span>
                </label>

                <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setColorInput(preset.hex)}
                      title={preset.label}
                      aria-label={`Seleccionar color ${preset.label}`}
                      className={`w-7 h-7 rounded-full transition cursor-pointer ${
                        colorInput.toLowerCase() === preset.hex.toLowerCase()
                          ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    />
                  ))}

                  <div className="ml-auto flex items-center gap-2 pl-2 border-l border-slate-200">
                    <input
                      type="color"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      aria-label="Selector de color personalizado"
                      className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer bg-white p-0.5"
                    />
                    <span className="text-xs font-mono text-slate-600">
                      {colorInput.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Estado de cursada (isCurrentlyTaking) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Cursando actualmente
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Activá esta opción si estás cursando la materia este período
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isCurrentlyTakingInput}
                  onClick={() => setIsCurrentlyTakingInput((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    isCurrentlyTakingInput ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      isCurrentlyTakingInput ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
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
                  disabled={submitting || !nameInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold transition cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingSubject ? 'Guardar cambios' : 'Crear materia'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Baja */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => {
              if (!deleting) setSubjectToDelete(null);
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
                  Eliminar materia
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ¿Estás seguro de que querés eliminar{' '}
                  <span className="font-semibold text-slate-800">
                    "{subjectToDelete.name}"
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
                onClick={() => setSubjectToDelete(null)}
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
