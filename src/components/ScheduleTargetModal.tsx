import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Search, X } from 'lucide-react';
import { MUSCLE_GROUPS } from '../data/catalog';
import { DayOfWeek, Exercise, MandatoryFieldErrors, ScheduledItem } from '../types/workout';
import { DAY_NAMES_FULL, validateMandatoryWorkoutFields } from '../utils/validation';
import { ExerciseImage } from './ExerciseImage';

interface ScheduleTargetModalProps {
  isOpen: boolean;
  dayOfWeek: DayOfWeek;
  exercises: Exercise[];
  editingItem?: ScheduledItem | null;
  onClose: () => void;
  onSave: (payload: {
    editingId?: string;
    dayOfWeek: DayOfWeek;
    exerciseId: string;
    targetSets: number;
    targetReps: number;
    targetLoadKg: number;
  }) => void;
}

export function ScheduleTargetModal({
  isOpen,
  dayOfWeek,
  exercises,
  editingItem,
  onClose,
  onSave,
}: ScheduleTargetModalProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [loadKg, setLoadKg] = useState('20');
  const [errors, setErrors] = useState<MandatoryFieldErrors & { exerciseId?: string }>({});

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setExerciseId(editingItem.exerciseId);
        setSets(String(editingItem.targetSets));
        setReps(String(editingItem.targetReps));
        setLoadKg(String(editingItem.targetLoadKg));
      } else {
        setExerciseId(exercises[0]?.id || '');
        setSets('3');
        setReps('10');
        setLoadKg('20');
        setSelectedGroup('all');
        setSearch('');
      }
      setErrors({});
    }
  }, [isOpen, editingItem, exercises]);

  if (!isOpen) return null;

  const filteredExercises = exercises.filter((ex) => {
    const matchesGroup = selectedGroup === 'all' || ex.muscleGroupId === selectedGroup;
    const q = search.trim().toLowerCase();
    const matchesQuery =
      !q ||
      ex.name.toLowerCase().includes(q) ||
      ex.primaryMuscle.toLowerCase().includes(q) ||
      ex.equipment.toLowerCase().includes(q);
    return matchesGroup && matchesQuery;
  });

  const selectedExercise = exercises.find((e) => e.id === exerciseId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseId) {
      setErrors({ exerciseId: 'Selecione um exercício do catálogo.' });
      return;
    }
    const res = validateMandatoryWorkoutFields({ sets, reps, loadKg });
    if (!res.valid || !res.parsed) {
      setErrors(res.errors);
      return;
    }

    onSave({
      editingId: editingItem?.id,
      dayOfWeek,
      exerciseId,
      targetSets: res.parsed.sets,
      targetReps: res.parsed.reps,
      targetLoadKg: res.parsed.loadKg,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
    >
      <div className="w-full md:max-w-xl bg-[#121824] border-t md:border border-white/10 rounded-t-3xl md:rounded-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="md:hidden w-10 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 shrink-0" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <p className="text-xs text-[#A3E635] font-medium">{DAY_NAMES_FULL[dayOfWeek]}</p>
            <h2 id="schedule-modal-title" className="text-lg font-bold text-white">
              {editingItem ? 'Editar metas do exercício' : 'Adicionar exercício ao dia'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-4">
          {!editingItem && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar exercício ou equipamento..."
                    className="w-full min-h-[44px] pl-10 pr-3 rounded-xl bg-[#090D14] border border-white/15 text-sm text-white focus:outline-none focus:border-[#A3E635]"
                  />
                </div>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="min-h-[44px] px-3 rounded-xl bg-[#090D14] border border-white/15 text-sm text-white focus:outline-none focus:border-[#A3E635]"
                >
                  <option value="all">Todos os grupos</option>
                  {MUSCLE_GROUPS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.shortName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-[#090D14] divide-y divide-white/5">
                {filteredExercises.length === 0 ? (
                  <p className="p-4 text-xs text-slate-400 text-center">Nenhum exercício encontrado.</p>
                ) : (
                  filteredExercises.map((ex) => {
                    const active = ex.id === exerciseId;
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => {
                          setExerciseId(ex.id);
                          setErrors((p) => ({ ...p, exerciseId: undefined }));
                        }}
                        className={`w-full min-h-[54px] px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                          active ? 'bg-[#A3E635]/15' : 'hover:bg-white/5'
                        }`}
                      >
                        <ExerciseImage
                          src={ex.imagePath}
                          alt={ex.name}
                          aspectClass="w-14 h-10 shrink-0"
                          className="rounded-lg border border-white/10"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${active ? 'text-[#A3E635]' : 'text-white'}`}>
                            {ex.code} · {ex.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {ex.primaryMuscle} · {ex.equipment}
                          </p>
                        </div>
                        {active && <Check className="w-4 h-4 text-[#A3E635] shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
              {errors.exerciseId && (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.exerciseId}</span>
                </p>
              )}
            </div>
          )}

          {selectedExercise && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#090D14] border border-white/10">
              <ExerciseImage
                src={selectedExercise.imagePath}
                alt={selectedExercise.name}
                aspectClass="w-16 h-12 shrink-0"
                className="rounded-lg border border-white/10"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{selectedExercise.name}</p>
                <p className="text-xs text-slate-400 truncate">
                  {selectedExercise.primaryMuscle} · {selectedExercise.equipment}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="sch-sets" className="block text-xs font-medium text-slate-300 mb-1">
                Séries <span className="text-red-400">*</span>
              </label>
              <input
                id="sch-sets"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                required
                value={sets}
                onChange={(e) => {
                  setSets(e.target.value);
                  setErrors((p) => ({ ...p, sets: undefined }));
                }}
                className="w-full min-h-[46px] px-3 rounded-xl bg-[#090D14] border border-white/15 text-base font-mono text-white tabular-nums focus:outline-none focus:border-[#A3E635]"
              />
            </div>
            <div>
              <label htmlFor="sch-reps" className="block text-xs font-medium text-slate-300 mb-1">
                Repetições <span className="text-red-400">*</span>
              </label>
              <input
                id="sch-reps"
                type="number"
                inputMode="numeric"
                min={1}
                max={500}
                required
                value={reps}
                onChange={(e) => {
                  setReps(e.target.value);
                  setErrors((p) => ({ ...p, reps: undefined }));
                }}
                className="w-full min-h-[46px] px-3 rounded-xl bg-[#090D14] border border-white/15 text-base font-mono text-white tabular-nums focus:outline-none focus:border-[#A3E635]"
              />
            </div>
            <div>
              <label htmlFor="sch-load" className="block text-xs font-medium text-slate-300 mb-1">
                Carga (kg) <span className="text-red-400">*</span>
              </label>
              <input
                id="sch-load"
                type="number"
                inputMode="decimal"
                step="0.5"
                min={0}
                max={1000}
                required
                value={loadKg}
                onChange={(e) => {
                  setLoadKg(e.target.value);
                  setErrors((p) => ({ ...p, loadKg: undefined }));
                }}
                className="w-full min-h-[46px] px-3 rounded-xl bg-[#090D14] border border-white/15 text-base font-mono text-white tabular-nums focus:outline-none focus:border-[#A3E635]"
              />
            </div>
          </div>

          {(errors.sets || errors.reps || errors.loadKg) && (
            <p className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.sets || errors.reps || errors.loadKg}</span>
            </p>
          )}

          <div className="pt-1 pb-safe flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-4 rounded-xl border border-white/15 text-sm text-slate-300 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[48px] px-5 rounded-xl bg-[#A3E635] text-[#090D14] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#b5f24b]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{editingItem ? 'Salvar alterações' : 'Adicionar à agenda'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
