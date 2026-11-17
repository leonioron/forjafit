import { useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, CalendarCheck2, CalendarDays, Download } from 'lucide-react';
import { CatalogView } from './components/CatalogView';
import { CompleteWorkoutSheet } from './components/CompleteWorkoutSheet';
import { CustomExerciseModal } from './components/CustomExerciseModal';
import { ExerciseDetailModal } from './components/ExerciseDetailModal';
import { ReportsView } from './components/ReportsView';
import { ScheduleTargetModal } from './components/ScheduleTargetModal';
import { ScheduleView } from './components/ScheduleView';
import { TodayView } from './components/TodayView';
import { createDefaultScheduleItems, DEFAULT_DAY_PLANS, DEFAULT_EXERCISES } from './data/catalog';
import {
  buildBackupPayload,
  createInitialAppState,
  loadAppState,
  mergeAppStates,
  saveAppState,
  triggerFileDownload,
} from './services/storage';
import {
  AppDataState,
  BackupPayload,
  DayOfWeek,
  DayPlan,
  Exercise,
  ScheduledItem,
  TabId,
  WorkoutLog,
} from './types/workout';
import { generateId, getDayOfWeekFromISO, getTodayISO } from './utils/validation';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [selectedDateISO, setSelectedDateISO] = useState<string>(getTodayISO);
  const [scheduleDay, setScheduleDay] = useState<DayOfWeek>(() => getDayOfWeekFromISO(getTodayISO()));
  const [appState, setAppState] = useState<AppDataState>(createInitialAppState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Modals & sheets state
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [completeTarget, setCompleteTarget] = useState<{
    item: ScheduledItem;
    exercise: Exercise;
    existingLog?: WorkoutLog;
  } | null>(null);
  const [scheduleModalState, setScheduleModalState] = useState<{
    open: boolean;
    day: DayOfWeek;
    editingItem?: ScheduledItem | null;
  }>({ open: false, day: 1, editingItem: null });
  const [isCustomExerciseOpen, setIsCustomExerciseOpen] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadAppState().then((loaded) => {
      if (mounted) {
        setAppState(loaded);
        setIsLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 3200);
  };

  const updateAndPersist = (updater: (prev: AppDataState) => AppDataState) => {
    setAppState((prev) => {
      const next = updater(prev);
      void saveAppState(next);
      return next;
    });
  };

  const allExercises = useMemo(
    () => [...DEFAULT_EXERCISES, ...appState.customExercises],
    [appState.customExercises]
  );

  const exercisesMap = useMemo(
    () => new Map(allExercises.map((e) => [e.id, e])),
    [allExercises]
  );

  // Handlers
  const handleConfirmCompletion = (values: { sets: number; reps: number; loadKg: number }) => {
    if (!completeTarget) return;
    const { item, exercise, existingLog } = completeTarget;
    const volumeKg = Math.round(values.sets * values.reps * values.loadKg * 10) / 10;

    updateAndPersist((prev) => {
      if (existingLog) {
        return {
          ...prev,
          logs: prev.logs.map((l) =>
            l.id === existingLog.id
              ? {
                  ...l,
                  sets: values.sets,
                  reps: values.reps,
                  loadKg: values.loadKg,
                  volumeKg,
                  completedAt: new Date().toISOString(),
                }
              : l
          ),
        };
      }

      const newLog: WorkoutLog = {
        id: generateId('log'),
        date: selectedDateISO,
        dayOfWeek: getDayOfWeekFromISO(selectedDateISO),
        scheduledItemId: item.id,
        exerciseId: exercise.id,
        muscleGroupId: exercise.muscleGroupId,
        sets: values.sets,
        reps: values.reps,
        loadKg: values.loadKg,
        volumeKg,
        completedAt: new Date().toISOString(),
      };

      return {
        ...prev,
        logs: [newLog, ...prev.logs],
      };
    });

    setCompleteTarget(null);
    showToast(existingLog ? 'Registro atualizado.' : 'Exercício marcado como concluído.');
  };

  const handleRemoveCompletion = (logId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      logs: prev.logs.filter((l) => l.id !== logId),
    }));
    setCompleteTarget(null);
    showToast('Conclusão desmarcada.');
  };

  const handleUpdateDayPlan = (updated: DayPlan) => {
    updateAndPersist((prev) => ({
      ...prev,
      dayPlans: prev.dayPlans.map((d) => (d.dayOfWeek === updated.dayOfWeek ? updated : d)),
    }));
  };

  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    updateAndPersist((prev) => {
      const target = prev.scheduledItems.find((i) => i.id === itemId);
      if (!target) return prev;

      const dayItems = prev.scheduledItems
        .filter((i) => i.dayOfWeek === target.dayOfWeek)
        .sort((a, b) => a.order - b.order);

      const idx = dayItems.findIndex((i) => i.id === itemId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= dayItems.length) return prev;

      const copy = [...dayItems];
      const [moved] = copy.splice(idx, 1);
      copy.splice(swapIdx, 0, moved);

      const orderMap = new Map(copy.map((item, i) => [item.id, i]));
      return {
        ...prev,
        scheduledItems: prev.scheduledItems.map((i) =>
          orderMap.has(i.id) ? { ...i, order: orderMap.get(i.id)! } : i
        ),
      };
    });
  };

  const handleRemoveScheduledItem = (itemId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      scheduledItems: prev.scheduledItems.filter((i) => i.id !== itemId),
    }));
    showToast('Exercício removido do dia.');
  };

  const handleSaveScheduledTarget = (payload: {
    editingId?: string;
    dayOfWeek: DayOfWeek;
    exerciseId: string;
    targetSets: number;
    targetReps: number;
    targetLoadKg: number;
  }) => {
    updateAndPersist((prev) => {
      if (payload.editingId) {
        return {
          ...prev,
          scheduledItems: prev.scheduledItems.map((item) =>
            item.id === payload.editingId
              ? {
                  ...item,
                  targetSets: payload.targetSets,
                  targetReps: payload.targetReps,
                  targetLoadKg: payload.targetLoadKg,
                }
              : item
          ),
        };
      }

      const dayItems = prev.scheduledItems.filter((i) => i.dayOfWeek === payload.dayOfWeek);
      const nextOrder = dayItems.length > 0 ? Math.max(...dayItems.map((i) => i.order)) + 1 : 0;

      const newItem: ScheduledItem = {
        id: generateId('sch'),
        dayOfWeek: payload.dayOfWeek,
        exerciseId: payload.exerciseId,
        targetSets: payload.targetSets,
        targetReps: payload.targetReps,
        targetLoadKg: payload.targetLoadKg,
        order: nextOrder,
      };

      return {
        ...prev,
        dayPlans: prev.dayPlans.map((dp) =>
          dp.dayOfWeek === payload.dayOfWeek ? { ...dp, isRestDay: false } : dp
        ),
        scheduledItems: [...prev.scheduledItems, newItem],
      };
    });
    showToast(payload.editingId ? 'Metas atualizadas.' : 'Exercício adicionado à agenda.');
  };

  const handleResetToDefaultABCDE = () => {
    updateAndPersist((prev) => ({
      ...prev,
      dayPlans: DEFAULT_DAY_PLANS.map((d) => ({ ...d })),
      scheduledItems: createDefaultScheduleItems(),
    }));
    showToast('Divisão semanal padrão ABCDE restaurada.');
  };

  const handleCreateCustomExercise = (exercise: Exercise) => {
    updateAndPersist((prev) => ({
      ...prev,
      customExercises: [exercise, ...prev.customExercises],
    }));
    showToast('Exercício personalizado adicionado ao catálogo.');
  };

  const handleDeleteLog = (logId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      logs: prev.logs.filter((l) => l.id !== logId),
    }));
    showToast('Registro excluído do histórico.');
  };

  const handleImportBackup = (payload: BackupPayload, mode: 'merge' | 'replace') => {
    updateAndPersist((prev) => {
      if (mode === 'replace') {
        return {
          dayPlans: payload.dayPlans,
          scheduledItems: payload.scheduledItems,
          customExercises: payload.customExercises,
          logs: payload.logs,
          updatedAt: new Date().toISOString(),
        };
      }
      return mergeAppStates(prev, payload);
    });
    showToast(mode === 'replace' ? 'Backup restaurado.' : 'Dados mesclados com sucesso.');
  };

  const handleQuickExportJSON = () => {
    const payload = buildBackupPayload(appState);
    triggerFileDownload(JSON.stringify(payload, null, 2), `forjafit-backup-${getTodayISO()}.json`, 'application/json');
    showToast('Backup JSON baixado.');
  };

  const navItems: { id: TabId; label: string; icon: typeof CalendarCheck2 }[] = [
    { id: 'today', label: 'Hoje', icon: CalendarCheck2 },
    { id: 'schedule', label: 'Agenda', icon: CalendarDays },
    { id: 'catalog', label: 'Catálogo', icon: BookOpen },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#090D14] text-slate-100 flex flex-col">
      {/* Compact Header — 3 zones on desktop, compact 52px bar on mobile */}
      <header className="sticky top-0 z-30 bg-[#090D14]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-13 md:h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className="font-display text-lg md:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            ForjaFit
          </button>

          <nav className="hidden md:flex items-center gap-6" aria-label="Navegação principal">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'text-[#A3E635] border-[#A3E635]'
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleQuickExportJSON}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#121824] border border-white/10 text-xs font-semibold text-white hover:border-[#A3E635]/50 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-[#A3E635]" />
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-24 md:pb-12">
        {!isLoaded ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-16 rounded-2xl bg-[#121824]" />
            <div className="h-40 rounded-2xl bg-[#121824]" />
          </div>
        ) : (
          <>
            {activeTab === 'today' && (
              <TodayView
                selectedDateISO={selectedDateISO}
                onSelectDateISO={setSelectedDateISO}
                dayPlans={appState.dayPlans}
                scheduledItems={appState.scheduledItems}
                exercisesMap={exercisesMap}
                logs={appState.logs}
                onOpenComplete={(item, exercise, existingLog) =>
                  setCompleteTarget({ item, exercise, existingLog })
                }
                onOpenDetail={(ex) => setDetailExercise(ex)}
                onGoToSchedule={(day) => {
                  setScheduleDay(day);
                  setActiveTab('schedule');
                }}
                onQuickAddExercise={(day) =>
                  setScheduleModalState({ open: true, day, editingItem: null })
                }
              />
            )}

            {activeTab === 'schedule' && (
              <ScheduleView
                selectedDay={scheduleDay}
                onSelectDay={setScheduleDay}
                dayPlans={appState.dayPlans}
                scheduledItems={appState.scheduledItems}
                exercisesMap={exercisesMap}
                onUpdateDayPlan={handleUpdateDayPlan}
                onMoveItem={handleMoveItem}
                onRemoveItem={handleRemoveScheduledItem}
                onOpenAddModal={(day) =>
                  setScheduleModalState({ open: true, day, editingItem: null })
                }
                onOpenEditModal={(item) =>
                  setScheduleModalState({ open: true, day: item.dayOfWeek, editingItem: item })
                }
                onOpenDetail={(ex) => setDetailExercise(ex)}
                onResetToDefaultABCDE={handleResetToDefaultABCDE}
              />
            )}

            {activeTab === 'catalog' && (
              <CatalogView
                exercises={allExercises}
                onSelectExercise={(ex) => setDetailExercise(ex)}
                onOpenNewExerciseModal={() => setIsCustomExerciseOpen(true)}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                state={appState}
                exercises={allExercises}
                exercisesMap={exercisesMap}
                onDeleteLog={handleDeleteLog}
                onImportBackup={handleImportBackup}
                onNotify={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation for Mobile / Android WebView (≤15% viewport height) */}
      <nav
        aria-label="Navegação inferior"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090D14]/95 backdrop-blur-md border-t border-white/10 pb-safe"
      >
        <div className="grid grid-cols-4 h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-[#A3E635]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals & Bottom Sheets */}
      <CompleteWorkoutSheet
        isOpen={Boolean(completeTarget)}
        exercise={completeTarget?.exercise || null}
        dateISO={selectedDateISO}
        defaultSets={completeTarget?.item.targetSets ?? 3}
        defaultReps={completeTarget?.item.targetReps ?? 10}
        defaultLoadKg={completeTarget?.item.targetLoadKg ?? 20}
        existingLog={completeTarget?.existingLog}
        onClose={() => setCompleteTarget(null)}
        onConfirm={handleConfirmCompletion}
        onRemoveCompletion={handleRemoveCompletion}
      />

      <ExerciseDetailModal
        exercise={detailExercise}
        defaultDayOfWeek={getDayOfWeekFromISO(selectedDateISO)}
        onClose={() => setDetailExercise(null)}
        onAddToSchedule={handleSaveScheduledTarget}
      />

      <ScheduleTargetModal
        isOpen={scheduleModalState.open}
        dayOfWeek={scheduleModalState.day}
        exercises={allExercises}
        editingItem={scheduleModalState.editingItem}
        onClose={() => setScheduleModalState((prev) => ({ ...prev, open: false }))}
        onSave={handleSaveScheduledTarget}
      />

      <CustomExerciseModal
        isOpen={isCustomExerciseOpen}
        onClose={() => setIsCustomExerciseOpen(false)}
        onCreate={handleCreateCustomExercise}
      />

      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#A3E635] text-[#090D14] text-xs font-semibold shadow-lg whitespace-nowrap"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
