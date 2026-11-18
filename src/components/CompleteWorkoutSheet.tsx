import React, { useEffect, useState } from 'react';
import { Check, Minus, Plus, X, AlertCircle, Trash2 } from 'lucide-react';
import { Exercise, MandatoryFieldErrors, WorkoutLog } from '../types/workout';
import { formatDateBR, validateMandatoryWorkoutFields } from '../utils/validation';
import { ExerciseImage } from './ExerciseImage';

interface CompleteWorkoutSheetProps {
  isOpen: boolean;
  exercise: Exercise | null;
  dateISO: string;
  defaultSets: number;
  defaultReps: number;
  defaultLoadKg: number;
  existingLog?: WorkoutLog | null;
  onClose: () => void;
  onConfirm: (values: { sets: number; reps: number; loadKg: number }) => void;
  onRemoveCompletion?: (logId: string) => void;
}

export function CompleteWorkoutSheet({
  isOpen,
  exercise,
  dateISO,
  defaultSets,
  defaultReps,
  defaultLoadKg,
  existingLog,
  onClose,
  onConfirm,
  onRemoveCompletion,
}: CompleteWorkoutSheetProps) {
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [loadKg, setLoadKg] = useState('');
  const [errors, setErrors] = useState<MandatoryFieldErrors>({});

  useEffect(() => {
    if (isOpen && exercise) {
      setSets(String(existingLog ? existingLog.sets : defaultSets));
      setReps(String(existingLog ? existingLog.reps : defaultReps));
      const initialLoad = existingLog ? existingLog.loadKg : defaultLoadKg;
      setLoadKg(initialLoad > 0 ? String(initialLoad) : '');
      setErrors({});
    }
  }, [isOpen, exercise, defaultSets, defaultReps, defaultLoadKg, existingLog]);

  if (!isOpen || !exercise) return null;

  const stepValue = (
    current: string,
    delta: number,
    min: number,
    max: number,
    allowDecimal: boolean,
    setter: (v: string) => void
  ) => {
    const parsed = Number(current.replace(',', '.'));
    const base = current.trim() !== '' && Number.isFinite(parsed) ? parsed : min;
    const next = Math.max(min, Math.min(max, base + delta));
    setter(allowDecimal ? String(Math.round(next * 10) / 10) : String(Math.round(next)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateMandatoryWorkoutFields({ sets, reps, loadKg });
    if (!res.valid || !res.parsed) {
      setErrors(res.errors);
      return;
    }
    onConfirm(res.parsed);
  };

  return (
    <div
      className="fixed inset-0 z-50 pt-safe-top flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm overflow-x-clip"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-sheet-title"
    >
      <div className="w-full max-w-full md:max-w-lg min-w-0 bg-[#121824] border-t md:border border-white/10 rounded-t-3xl md:rounded-2xl max-h-full flex flex-col overflow-hidden">
        <div className="md:hidden w-10 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 shrink-0" />

        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-white/10 shrink-0 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-[#A3E635] tabular-nums truncate">
              {existingLog ? 'Editar registro' : 'Registrar conclusão'} · {formatDateBR(dateISO)}
            </p>
            <h2 id="complete-sheet-title" className="text-base sm:text-lg font-bold text-white truncate">
              {exercise.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto overflow-x-hidden px-4 sm:px-5 py-4 space-y-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <ExerciseImage
              src={exercise.imagePath}
              alt={exercise.name}
              aspectClass="w-20 h-14 sm:w-24 sm:h-16 shrink-0"
              className="rounded-xl border border-white/10"
            />
            <div className="min-w-0 flex-1 text-xs text-slate-400 space-y-1">
              <p className="text-slate-200 font-medium truncate">{exercise.primaryMuscle}</p>
              <p className="truncate">{exercise.equipment}</p>
              <p className="text-slate-400">Informe séries e repetições para registrar.</p>
            </div>
          </div>

          {/* Séries */}
          <div className="min-w-0">
            <label htmlFor="log-sets" className="block text-sm font-medium text-slate-200 mb-1.5">
              Séries executadas <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2 w-full min-w-0">
              <button
                type="button"
                onClick={() => stepValue(sets, -1, 1, 50, false, setSets)}
                aria-label="Diminuir séries"
                className="min-h-[46px] min-w-[46px] shrink-0 flex items-center justify-center rounded-xl bg-[#1A2233] border border-white/10 text-slate-200 active:scale-95 transition-transform"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                id="log-sets"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                required
                value={sets}
                onChange={(e) => {
                  setSets(e.target.value);
                  if (errors.sets) setErrors((prev) => ({ ...prev, sets: undefined }));
                }}
                className="flex-1 min-w-0 w-0 min-h-[46px] px-3 rounded-xl bg-[#090D14] border border-white/15 text-center text-lg font-mono font-semibold text-white tabular-nums focus:outline-none focus:border-[#A3E635]"
              />
              <button
                type="button"
                onClick={() => stepValue(sets, 1, 1, 50, false, setSets)}
                aria-label="Aumentar séries"
                className="min-h-[46px] min-w-[46px] shrink-0 flex items-center justify-center rounded-xl bg-[#1A2233] border border-white/10 text-slate-200 active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {errors.sets && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.sets}</span>
              </p>
            )}
          </div>

          {/* Repetições */}
          <div className="min-w-0">
            <label htmlFor="log-reps" className="block text-sm font-medium text-slate-200 mb-1.5">
              Repetições por série <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2 w-full min-w-0">
              <button
                type="button"
                onClick={() => stepValue(reps, -1, 1, 500, false, setReps)}
                aria-label="Diminuir repetições"
                className="min-h-[46px] min-w-[46px] shrink-0 flex items-center justify-center rounded-xl bg-[#1A2233] border border-white/10 text-slate-200 active:scale-95 transition-transform"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                id="log-reps"
                type="number"
                inputMode="numeric"
                min={1}
                max={500}
                required
                value={reps}
                onChange={(e) => {
                  setReps(e.target.value);
                  if (errors.reps) setErrors((prev) => ({ ...prev, reps: undefined }));
                }}
                className="flex-1 min-w-0 w-0 min-h-[46px] px-3 rounded-xl bg-[#090D14] border border-white/15 text-center text-lg font-mono font-semibold text-white tabular-nums focus:outline-none focus:border-[#A3E635]"
              />
              <button
                type="button"
                onClick={() => stepValue(reps, 1, 1, 500, false, setReps)}
                aria-label="Aumentar repetições"
                className="min-h-[46px] min-w-[46px] shrink-0 flex items-center justify-center rounded-xl bg-[#1A2233] border border-white/10 text-slate-200 active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {errors.reps && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.reps}</span>
              </p>
            )}
          </div>

          {/* Carga (kg) — opcional */}
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor="log-load" className="text-sm font-medium text-slate-200 truncate">
                Carga utilizada (kg)
              </label>
              <span className="text-xs text-slate-400 shrink-0">Opcional</span>
            </div>
            <div className="flex items-center gap-2 w-full min-w-0">
              <button
                type="button"
                onClick={() => stepValue(loadKg, -2.5, 0, 1000, true, setLoadKg)}
                aria-label="Diminuir carga em 2,5 kg"
                className="min-h-[46px] min-w-[46px] shrink-0 flex items-center justify-center rounded-xl bg-[#1A2233] border border-white/10 text-slate-200 active:scale-95 transition-transform"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                id="log-load"
                type="number"
                inputMode="decimal"
                step="0.5"
                min={0}
                max={1000}
                placeholder="0"
                value={loadKg}
                onChange={(e) => {
                  setLoadKg(e.target.value);
                  if (errors.loadKg) setErrors((prev) => ({ ...prev, loadKg: undefined }));
                }}
                className="flex-1 min-w-0 w-0 min-h-[46px] px-3 rounded-xl bg-[#090D14] border border-white/15 text-center text-lg font-mono font-semibold text-white placeholder:text-slate-600 tabular-nums focus:outline-none focus:border-[#A3E635]"
              />
              <button
                type="button"
                onClick={() => stepValue(loadKg, 2.5, 0, 1000, true, setLoadKg)}
                aria-label="Aumentar carga em 2,5 kg"
                className="min-h-[46px] min-w-[46px] shrink-0 flex items-center justify-center rounded-xl bg-[#1A2233] border border-white/10 text-slate-200 active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {errors.loadKg && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.loadKg}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2 pb-safe">
            {existingLog && onRemoveCompletion && (
              <button
                type="button"
                onClick={() => onRemoveCompletion(existingLog.id)}
                className="min-h-[48px] px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 font-medium text-sm flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Desmarcar</span>
              </button>
            )}
            <button
              type="submit"
              className="flex-1 min-h-[48px] px-5 rounded-xl bg-[#A3E635] text-[#090D14] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#b5f24b] active:scale-[0.98] transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{existingLog ? 'Atualizar registro' : 'Marcar como concluído'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
