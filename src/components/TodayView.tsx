import { Calendar, Check, CheckCircle2, Coffee } from 'lucide-react';
import { DayPlan, Exercise, ScheduledItem, WorkoutLog } from '../types/workout';
import {
  DAY_NAMES_FULL,
  formatDateBR,
  formatKg,
  getDayOfWeekFromISO,
  getTodayISO,
  getWeekDatesForISO,
} from '../utils/validation';
import { ExerciseImage } from './ExerciseImage';

interface TodayViewProps {
  selectedDateISO: string;
  onSelectDateISO: (iso: string) => void;
  dayPlans: DayPlan[];
  scheduledItems: ScheduledItem[];
  exercisesMap: Map<string, Exercise>;
  logs: WorkoutLog[];
  onOpenComplete: (item: ScheduledItem, exercise: Exercise, existingLog?: WorkoutLog) => void;
  onOpenDetail: (exercise: Exercise) => void;
}

export function TodayView({
  selectedDateISO,
  onSelectDateISO,
  dayPlans,
  scheduledItems,
  exercisesMap,
  logs,
  onOpenComplete,
  onOpenDetail,
}: TodayViewProps) {
  const todayISO = getTodayISO();
  const activeDayOfWeek = getDayOfWeekFromISO(selectedDateISO);
  const weekDays = getWeekDatesForISO(selectedDateISO);

  const dayPlan = dayPlans.find((d) => d.dayOfWeek === activeDayOfWeek) || {
    dayOfWeek: activeDayOfWeek,
    label: 'Treino',
    isRestDay: false,
  };

  const dayItems = scheduledItems
    .filter((item) => item.dayOfWeek === activeDayOfWeek)
    .sort((a, b) => a.order - b.order);

  const dayLogs = logs.filter((l) => l.date === selectedDateISO);
  const findLogForItem = (item: ScheduledItem): WorkoutLog | undefined => {
    return (
      dayLogs.find((l) => l.scheduledItemId === item.id) ||
      dayLogs.find((l) => l.exerciseId === item.exerciseId)
    );
  };

  const completedCount = dayItems.filter((item) => Boolean(findLogForItem(item))).length;
  const totalCount = dayItems.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // SVG progress ring geometry
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* Horizontal Week Scroller + Date Picker */}
      <section aria-label="Calendário semanal" className="space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2.5 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400 truncate">
              {selectedDateISO === todayISO ? 'Hoje' : DAY_NAMES_FULL[activeDayOfWeek]} ·{' '}
              <span className="font-mono tabular-nums">{formatDateBR(selectedDateISO)}</span>
            </p>
            <h1 className="text-lg sm:text-2xl font-bold text-white truncate">{dayPlan.label}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedDateISO !== todayISO && (
              <button
                type="button"
                onClick={() => onSelectDateISO(todayISO)}
                className="min-h-[44px] px-3 rounded-xl bg-[#121824] border border-white/10 text-xs font-medium text-[#A3E635] hover:bg-[#1A2233] transition-colors whitespace-nowrap"
              >
                Hoje
              </button>
            )}
            <label className="relative min-h-[44px] min-w-[44px] px-2.5 sm:px-3 rounded-xl bg-[#121824] border border-white/10 flex items-center justify-center gap-2 text-xs font-medium text-slate-200 hover:bg-[#1A2233] cursor-pointer transition-colors">
              <Calendar className="w-4 h-4 text-[#A3E635]" />
              <span className="hidden sm:inline whitespace-nowrap">Escolher data</span>
              <input
                type="date"
                value={selectedDateISO}
                onChange={(e) => {
                  if (e.target.value) onSelectDateISO(e.target.value);
                }}
                aria-label="Selecionar data do treino"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full min-w-0">
          {weekDays.map((wd) => {
            const isSelected = wd.dateISO === selectedDateISO;
            const isToday = wd.dateISO === todayISO;
            const hasLogs = logs.some((l) => l.date === wd.dateISO);
            return (
              <button
                key={wd.dateISO}
                type="button"
                onClick={() => onSelectDateISO(wd.dateISO)}
                className={`min-w-0 min-h-[54px] py-2 px-0.5 sm:px-1 rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-[#A3E635] border-[#A3E635] text-[#090D14]'
                    : 'bg-[#121824] border-white/10 text-slate-300 hover:bg-[#1A2233]'
                }`}
              >
                <span
                  className={`text-[10px] sm:text-[11px] font-medium truncate max-w-full ${
                    isSelected ? 'text-[#090D14]/80' : 'text-slate-400'
                  }`}
                >
                  {wd.shortDay}
                </span>
                <span className="text-xs sm:text-sm font-mono font-bold tabular-nums">{wd.dayNum}</span>
                <span className="h-1.5 flex items-center">
                  {hasLogs ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-[#090D14]' : 'bg-[#A3E635]'
                      }`}
                    />
                  ) : isToday ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-[#090D14]/50' : 'bg-slate-500'
                      }`}
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Progress Summary Card */}
      <section aria-label="Resumo do dia" className="min-w-0">
        <div className="p-4 rounded-2xl bg-[#121824] border border-white/10 flex items-center justify-between gap-4 min-w-0">
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-slate-400">Progresso do dia</p>
            <p className="text-2xl font-mono font-bold text-white tabular-nums">
              {completedCount}/{totalCount}
              <span className="text-sm font-sans font-normal text-slate-400 ml-1.5">concluídos</span>
            </p>
            <p className="text-xs text-slate-400">
              {totalCount === 0
                ? 'Dia sem exercícios agendados'
                : completedCount === totalCount
                  ? 'Treino completo finalizado'
                  : `Faltam ${totalCount - completedCount} exercício(s)`}
            </p>
          </div>
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="5"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="#A3E635"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            </svg>
            <span className="absolute text-xs font-mono font-bold text-white tabular-nums">
              {progressPct}%
            </span>
          </div>
        </div>
      </section>

      {/* Exercises List */}
      <section aria-label="Lista de exercícios do dia" className="space-y-3 min-w-0">
        <h2 className="text-base font-semibold text-white">Exercícios programados</h2>

        {dayPlan.isRestDay && dayItems.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#121824] border border-white/10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1A2233] flex items-center justify-center mx-auto text-[#A3E635]">
              <Coffee className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-semibold text-white">Dia de recuperação</h3>
              <p className="text-sm text-slate-400">
                Este dia está marcado como descanso. Para configurar exercícios nele, acesse a aba Agenda.
              </p>
            </div>
          </div>
        ) : dayItems.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#121824] border border-white/10 text-center space-y-1">
            <p className="text-sm text-slate-300">
              Nenhum exercício agendado para {DAY_NAMES_FULL[activeDayOfWeek]}.
            </p>
            <p className="text-xs text-slate-400">
              Acesse a aba Agenda para montar ou editar a programação deste dia.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
            {dayItems.map((item) => {
              const ex = exercisesMap.get(item.exerciseId);
              if (!ex) return null;
              const log = findLogForItem(item);
              const isDone = Boolean(log);

              return (
                <article
                  key={item.id}
                  className={`min-w-0 w-full overflow-hidden rounded-2xl border p-3.5 transition-colors flex flex-col justify-between gap-3 ${
                    isDone
                      ? 'bg-[#121E18] border-emerald-500/35'
                      : 'bg-[#121824] border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(ex)}
                      className="shrink-0 rounded-xl overflow-hidden border border-white/10 focus-visible:outline-2 focus-visible:outline-[#A3E635]"
                      aria-label={`Ver foto e execução de ${ex.name}`}
                    >
                      <ExerciseImage
                        src={ex.imagePath}
                        alt={ex.name}
                        aspectClass="w-20 h-16 sm:w-28 sm:h-20"
                      />
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(ex)}
                        className="text-left group block w-full min-w-0"
                      >
                        <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-[#A3E635] transition-colors leading-snug break-words">
                          {ex.name}
                        </h3>
                      </button>

                      <p className="text-xs text-slate-400 truncate">
                        {ex.primaryMuscle} · {ex.equipment}
                      </p>

                      <p className="text-xs font-mono tabular-nums text-slate-200 truncate">
                        {isDone && log ? (
                          <span className="text-emerald-400">
                            Executado: {log.sets}×{log.reps}
                            {log.loadKg > 0 ? ` · ${formatKg(log.loadKg)}` : ''}
                          </span>
                        ) : (
                          <span>
                            Meta: {item.targetSets}×{item.targetReps}
                            {item.targetLoadKg > 0 ? ` · ${formatKg(item.targetLoadKg)}` : ''}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(ex)}
                      className="min-h-[44px] px-3 rounded-xl bg-[#090D14] border border-white/10 text-xs font-medium text-slate-300 hover:text-white hover:border-white/20 transition-colors shrink-0 whitespace-nowrap"
                    >
                      Execução
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenComplete(item, ex, log)}
                      className={`flex-1 min-w-0 min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                        isDone
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-[#A3E635] text-[#090D14] hover:bg-[#b5f24b]'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span className="truncate">Concluído · Editar</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
                          <span className="truncate">Concluir exercício</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
