import React, { useEffect, useState } from 'react';
import { CalendarPlus, Check, AlertCircle, X, Layers, Info } from 'lucide-react';
import { MUSCLE_GROUPS } from '../data/catalog';
import { DayOfWeek, Exercise, MandatoryFieldErrors } from '../types/workout';
import { DAY_NAMES_FULL, ORDERED_WEEK_DAYS, validateMandatoryWorkoutFields } from '../utils/validation';
import { ExerciseImage } from './ExerciseImage';

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  defaultDayOfWeek: DayOfWeek;
  onClose: () => void;
  onAddToSchedule: (payload: {
    dayOfWeek: DayOfWeek;
    exerciseId: string;
    targetSets: number;
    targetReps: number;
    targetLoadKg: number;
  }) => void;
}

export function ExerciseDetailModal({
  exercise,
  defaultDayOfWeek,
  onClose,
  onAddToSchedule,
}: ExerciseDetailModalProps) {
  const [imageMode, setImageMode] = useState<'execution' | 'anatomy'>('execution');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(defaultDayOfWeek);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [loadKg, setLoadKg] = useState('20');
  const [errors, setErrors] = useState<MandatoryFieldErrors>({});

  useEffect(() => {
    if (exercise) {
      setImageMode('execution');
      setShowScheduleForm(false);
      setDayOfWeek(defaultDayOfWeek);
      setSets('3');
      setReps('10');
      setLoadKg('20');
      setErrors({});
    }
  }, [exercise, defaultDayOfWeek]);

  if (!exercise) return null;

  const muscleGroup = MUSCLE_GROUPS.find((g) => g.id === exercise.muscleGroupId);

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateMandatoryWorkoutFields({ sets, reps, loadKg });
    if (!res.valid || !res.parsed) {
      setErrors(res.errors);
      return;
    }
    onAddToSchedule({
      dayOfWeek,
      exerciseId: exercise.id,
      targetSets: res.parsed.sets,
      targetReps: res.parsed.reps,
      targetLoadKg: res.parsed.loadKg,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 pt-[max(32px,env(safe-area-inset-top))] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm overflow-x-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div className="w-full max-w-full md:max-w-2xl min-w-0 bg-[#121824] border-t md:border border-white/10 rounded-t-3xl md:rounded-2xl max-h-full flex flex-col overflow-hidden">
        <div className="md:hidden w-10 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 shrink-0" />

        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-white/10 shrink-0 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400 truncate">
              {exercise.code} · {muscleGroup?.name || exercise.muscleGroupId}
            </p>
            <h2 id="detail-modal-title" className="text-base sm:text-lg md:text-xl font-bold text-white truncate">
              {exercise.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden px-4 sm:px-5 py-4 space-y-5 min-w-0">
          {/* Image switch: Execution photo vs Group Anatomy diagram */}
          <div className="space-y-2.5">
            {muscleGroup && (
              <div className="inline-flex items-center gap-1 p-1 bg-[#090D14] border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => setImageMode('execution')}
                  className={`min-h-[38px] px-3 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    imageMode === 'execution'
                      ? 'bg-[#1A2233] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Foto de execução
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('anatomy')}
                  className={`min-h-[38px] px-3 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    imageMode === 'anatomy'
                      ? 'bg-[#1A2233] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Anatomia do grupo</span>
                </button>
              </div>
            )}

            <ExerciseImage
              src={
                imageMode === 'anatomy' && muscleGroup
                  ? muscleGroup.anatomyImagePath
                  : exercise.imagePath
              }
              alt={
                imageMode === 'anatomy' && muscleGroup
                  ? `Anatomia ${muscleGroup.name}`
                  : exercise.name
              }
              aspectClass="aspect-[16/10]"
              className="w-full rounded-xl border border-white/10"
            />
          </div>

          {/* Clean unboxed technical specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 border-y border-white/10">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Músculo principal</p>
              <p className="text-sm font-medium text-white">{exercise.primaryMuscle}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Músculos secundários</p>
              <p className="text-sm font-medium text-slate-200">{exercise.secondaryMuscles}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Equipamento</p>
              <p className="text-sm font-medium text-slate-200">{exercise.equipment}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Execução</h3>
              <p className="text-sm leading-relaxed text-slate-300">{exercise.execution}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090D14] border border-white/10 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#A3E635] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#A3E635] mb-0.5">Dica técnica</p>
                <p className="text-sm leading-relaxed text-slate-300">{exercise.tip}</p>
              </div>
            </div>
          </div>

          {showScheduleForm && (
            <form
              onSubmit={handleScheduleSubmit}
              className="p-4 rounded-xl bg-[#090D14] border border-[#A3E635]/40 space-y-4"
            >
              <h3 className="text-sm font-semibold text-white">Configurar na agenda semanal</h3>

              <div>
                <label htmlFor="detail-day" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Dia da semana <span className="text-red-400">*</span>
                </label>
                <select
                  id="detail-day"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value) as DayOfWeek)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[#121824] border border-white/15 text-sm text-white focus:outline-none focus:border-[#A3E635]"
                >
                  {ORDERED_WEEK_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {DAY_NAMES_FULL[d]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5 min-w-0">
                <div className="min-w-0">
                  <label htmlFor="detail-sets" className="block text-xs font-medium text-slate-300 mb-1 truncate">
                    Séries <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="detail-sets"
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
                    className="w-full min-w-0 min-h-[44px] px-2.5 rounded-xl bg-[#121824] border border-white/15 text-sm font-mono text-white tabular-nums focus:outline-none focus:border-[#A3E635]"
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="detail-reps" className="block text-xs font-medium text-slate-300 mb-1 truncate">
                    Reps <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="detail-reps"
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
                    className="w-full min-w-0 min-h-[44px] px-2.5 rounded-xl bg-[#121824] border border-white/15 text-sm font-mono text-white tabular-nums focus:outline-none focus:border-[#A3E635]"
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="detail-load" className="block text-xs font-medium text-slate-300 mb-1 truncate">
                    Carga (kg)
                  </label>
                  <input
                    id="detail-load"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={0}
                    max={1000}
                    placeholder="0"
                    value={loadKg}
                    onChange={(e) => {
                      setLoadKg(e.target.value);
                      setErrors((p) => ({ ...p, loadKg: undefined }));
                    }}
                    className="w-full min-w-0 min-h-[44px] px-2.5 rounded-xl bg-[#121824] border border-white/15 text-sm font-mono text-white placeholder:text-slate-600 tabular-nums focus:outline-none focus:border-[#A3E635]"
                  />
                </div>
              </div>

              {(errors.sets || errors.reps || errors.loadKg) && (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.sets || errors.reps || errors.loadKg}</span>
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="min-h-[44px] px-4 rounded-xl border border-white/15 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#A3E635] text-[#090D14] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#b5f24b] transition-colors"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirmar na agenda</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {!showScheduleForm && (
          <div className="px-5 py-3.5 border-t border-white/10 bg-[#121824] pb-safe shrink-0">
            <button
              type="button"
              onClick={() => setShowScheduleForm(true)}
              className="w-full min-h-[48px] px-5 rounded-xl bg-[#A3E635] text-[#090D14] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#b5f24b] active:scale-[0.98] transition-all"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Adicionar à agenda semanal</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
