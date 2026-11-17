import { useState } from 'react';
import { ArrowDown, ArrowUp, Edit3, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { DayOfWeek, DayPlan, Exercise, ScheduledItem } from '../types/workout';
import { DAY_NAMES_FULL, DAY_NAMES_SHORT, ORDERED_WEEK_DAYS, formatKg } from '../utils/validation';
import { ExerciseImage } from './ExerciseImage';

interface ScheduleViewProps {
  selectedDay: DayOfWeek;
  onSelectDay: (day: DayOfWeek) => void;
  dayPlans: DayPlan[];
  scheduledItems: ScheduledItem[];
  exercisesMap: Map<string, Exercise>;
  onUpdateDayPlan: (dayPlan: DayPlan) => void;
  onMoveItem: (itemId: string, direction: 'up' | 'down') => void;
  onRemoveItem: (itemId: string) => void;
  onOpenAddModal: (day: DayOfWeek) => void;
  onOpenEditModal: (item: ScheduledItem) => void;
  onOpenDetail: (exercise: Exercise) => void;
  onResetToDefaultABCDE: () => void;
}

export function ScheduleView({
  selectedDay,
  onSelectDay,
  dayPlans,
  scheduledItems,
  exercisesMap,
  onUpdateDayPlan,
  onMoveItem,
  onRemoveItem,
  onOpenAddModal,
  onOpenEditModal,
  onOpenDetail,
  onResetToDefaultABCDE,
}: ScheduleViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  const activePlan = dayPlans.find((d) => d.dayOfWeek === selectedDay) || {
    dayOfWeek: selectedDay,
    label: 'Treino',
    isRestDay: false,
  };

  const dayItems = scheduledItems
    .filter((i) => i.dayOfWeek === selectedDay)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Agenda semanal ABCDE</h1>
          <p className="text-sm text-slate-400">
            Configure os dias da semana, metas obrigatórias de séries, repetições e carga.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-[44px] px-3 rounded-xl border border-white/15 text-xs text-slate-300 hover:bg-white/5 whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetToDefaultABCDE();
                  setConfirmReset(false);
                }}
                className="min-h-[44px] px-3.5 rounded-xl bg-amber-500 text-[#090D14] text-xs font-semibold whitespace-nowrap"
              >
                Confirmar padrão ABCDE
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="min-h-[44px] px-3.5 rounded-xl bg-[#121824] border border-white/10 text-xs font-medium text-slate-300 hover:text-white hover:border-white/25 flex items-center gap-2 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#A3E635]" />
              <span>Restaurar padrão ABCDE</span>
            </button>
          )}
        </div>
      </div>

      {/* Day Tabs */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {ORDERED_WEEK_DAYS.map((day) => {
          const plan = dayPlans.find((d) => d.dayOfWeek === day);
          const count = scheduledItems.filter((i) => i.dayOfWeek === day).length;
          const active = day === selectedDay;

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`min-h-[56px] py-2 px-1 rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? 'bg-[#A3E635] border-[#A3E635] text-[#090D14]'
                  : 'bg-[#121824] border-white/10 text-slate-300 hover:bg-[#1A2233]'
              }`}
            >
              <span className="text-xs font-semibold">{DAY_NAMES_SHORT[day]}</span>
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  active ? 'text-[#090D14]/80' : 'text-slate-400'
                }`}
              >
                {plan?.isRestDay && count === 0 ? 'Folga' : `${count} ex.`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Day Plan Header & Config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <section className="p-4 rounded-2xl bg-[#121824] border border-white/10 space-y-4">
          <div>
            <p className="text-xs text-[#A3E635] font-medium mb-1">{DAY_NAMES_FULL[selectedDay]}</p>
            <label htmlFor="day-label-input" className="block text-xs text-slate-400 mb-1.5">
              Título / Foco do treino
            </label>
            <input
              id="day-label-input"
              type="text"
              value={activePlan.label}
              onChange={(e) =>
                onUpdateDayPlan({
                  ...activePlan,
                  label: e.target.value,
                })
              }
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#090D14] border border-white/15 text-sm text-white focus:outline-none focus:border-[#A3E635]"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t border-white/10">
            <div>
              <p className="text-sm font-medium text-white">Dia de descanso</p>
              <p className="text-xs text-slate-400">Oculta botão de adicionar na tela Hoje</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={activePlan.isRestDay}
              onClick={() =>
                onUpdateDayPlan({
                  ...activePlan,
                  isRestDay: !activePlan.isRestDay,
                })
              }
              className={`min-h-[32px] w-14 rounded-full p-1 transition-colors flex items-center ${
                activePlan.isRestDay ? 'bg-[#A3E635] justify-end' : 'bg-[#090D14] border border-white/20 justify-start'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full ${
                  activePlan.isRestDay ? 'bg-[#090D14]' : 'bg-slate-400'
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenAddModal(selectedDay)}
            className="w-full min-h-[48px] px-4 rounded-xl bg-[#A3E635] text-[#090D14] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#b5f24b] transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Adicionar exercício do catálogo</span>
          </button>
        </section>

        {/* Scheduled Items List */}
        <section className="lg:col-span-2 space-y-3">
          {dayItems.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#121824] border border-white/10 text-center space-y-3">
              <p className="text-sm text-slate-300">
                Nenhum exercício configurado para {DAY_NAMES_FULL[selectedDay]}.
              </p>
              <button
                type="button"
                onClick={() => onOpenAddModal(selectedDay)}
                className="min-h-[44px] px-5 rounded-xl bg-[#1A2233] border border-white/10 text-sm font-medium text-white hover:border-[#A3E635]/50 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-[#A3E635]" />
                <span>Escolher exercício</span>
              </button>
            </div>
          ) : (
            dayItems.map((item, idx) => {
              const ex = exercisesMap.get(item.exerciseId);
              if (!ex) return null;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#121824] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(ex)}
                      className="shrink-0 rounded-xl overflow-hidden border border-white/10"
                      aria-label={`Ver ficha de ${ex.name}`}
                    >
                      <ExerciseImage src={ex.imagePath} alt={ex.name} aspectClass="w-20 h-14" />
                    </button>

                    <div className="min-w-0 space-y-1">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(ex)}
                        className="text-left block w-full"
                      >
                        <h3 className="text-sm sm:text-base font-semibold text-white hover:text-[#A3E635] truncate">
                          {idx + 1}. {ex.name}
                        </h3>
                      </button>
                      <p className="text-xs text-slate-400 truncate">
                        {ex.primaryMuscle} · {ex.equipment}
                      </p>
                      <p className="text-xs font-mono text-[#A3E635] tabular-nums">
                        {item.targetSets} séries × {item.targetReps} reps · {formatKg(item.targetLoadKg)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(item.id, 'up')}
                      aria-label="Mover exercício para cima"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#090D14] border border-white/10 text-slate-300 disabled:opacity-30 hover:text-white"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === dayItems.length - 1}
                      onClick={() => onMoveItem(item.id, 'down')}
                      aria-label="Mover exercício para baixo"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#090D14] border border-white/10 text-slate-300 disabled:opacity-30 hover:text-white"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(item)}
                      aria-label="Editar séries, repetições e carga"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#090D14] border border-white/10 text-slate-200 hover:border-[#A3E635]/50 hover:text-[#A3E635]"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      aria-label="Remover exercício do dia"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#090D14] border border-white/10 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
