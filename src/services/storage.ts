import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { createDefaultScheduleItems, DEFAULT_DAY_PLANS, DEFAULT_EXERCISES, MUSCLE_GROUPS } from '../data/catalog';
import { AppDataState, BackupPayload, DayOfWeek, DayPlan, Exercise, ScheduledItem, WorkoutLog } from '../types/workout';
import { formatDateBR, generateId } from '../utils/validation';

const DB_NAME = 'forjafit_local_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const STATE_KEY = 'main';
const LOCAL_STORAGE_FALLBACK_KEY = 'forjafit_state_v1';

export function createInitialAppState(): AppDataState {
  return {
    dayPlans: DEFAULT_DAY_PLANS.map((p) => ({ ...p })),
    scheduledItems: createDefaultScheduleItems(),
    customExercises: [],
    logs: [],
    updatedAt: new Date().toISOString(),
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function loadAppState(): Promise<AppDataState> {
  try {
    const db = await openDatabase();
    const loaded = await new Promise<AppDataState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve(req.result as AppDataState | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (loaded && Array.isArray(loaded.dayPlans) && Array.isArray(loaded.scheduledItems)) {
      return sanitizeAppState(loaded);
    }
  } catch {
    // Fallback to localStorage below
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppDataState;
      if (parsed && Array.isArray(parsed.dayPlans)) {
        return sanitizeAppState(parsed);
      }
    }
  } catch {
    // Ignore parse failures and seed fresh
  }

  const initial = createInitialAppState();
  await saveAppState(initial);
  return initial;
}

export async function saveAppState(state: AppDataState): Promise<void> {
  const nextState: AppDataState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(nextState));
  } catch {
    // Quota might be tight if large custom images exist; IndexedDB handles larger payloads
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(nextState, STATE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Fallback already written to localStorage
  }
}

function sanitizeAppState(raw: Partial<AppDataState>): AppDataState {
  const baseDays = new Map<DayOfWeek, DayPlan>();
  for (const dp of DEFAULT_DAY_PLANS) {
    baseDays.set(dp.dayOfWeek, { ...dp });
  }
  if (Array.isArray(raw.dayPlans)) {
    for (const dp of raw.dayPlans) {
      if (dp && typeof dp.dayOfWeek === 'number' && dp.dayOfWeek >= 0 && dp.dayOfWeek <= 6) {
        baseDays.set(dp.dayOfWeek as DayOfWeek, {
          dayOfWeek: dp.dayOfWeek as DayOfWeek,
          label: String(dp.label || 'Treino'),
          isRestDay: Boolean(dp.isRestDay),
        });
      }
    }
  }

  const scheduledItems: ScheduledItem[] = Array.isArray(raw.scheduledItems)
    ? raw.scheduledItems
        .filter(
          (item) =>
            item &&
            typeof item.exerciseId === 'string' &&
            typeof item.dayOfWeek === 'number' &&
            Number.isFinite(Number(item.targetSets)) &&
            Number(item.targetSets) >= 1 &&
            Number.isFinite(Number(item.targetReps)) &&
            Number(item.targetReps) >= 1 &&
            Number.isFinite(Number(item.targetLoadKg)) &&
            Number(item.targetLoadKg) >= 0
        )
        .map((item, index) => ({
          id: String(item.id || generateId('sch')),
          dayOfWeek: item.dayOfWeek as DayOfWeek,
          exerciseId: item.exerciseId,
          targetSets: Math.round(Number(item.targetSets)),
          targetReps: Math.round(Number(item.targetReps)),
          targetLoadKg: Math.round(Number(item.targetLoadKg) * 10) / 10,
          order: typeof item.order === 'number' ? item.order : index,
        }))
    : createDefaultScheduleItems();

  const customExercises: Exercise[] = Array.isArray(raw.customExercises)
    ? raw.customExercises
        .filter((ex) => ex && typeof ex.id === 'string' && typeof ex.name === 'string')
        .map((ex) => ({
          ...ex,
          isCustom: true,
        }))
    : [];

  const logs: WorkoutLog[] = Array.isArray(raw.logs)
    ? raw.logs
        .filter(
          (log) =>
            log &&
            typeof log.date === 'string' &&
            typeof log.exerciseId === 'string' &&
            Number(log.sets) >= 1 &&
            Number(log.reps) >= 1 &&
            Number(log.loadKg) >= 0
        )
        .map((log) => {
          const sets = Math.round(Number(log.sets));
          const reps = Math.round(Number(log.reps));
          const loadKg = Math.round(Number(log.loadKg) * 10) / 10;
          return {
            id: String(log.id || generateId('log')),
            date: log.date,
            dayOfWeek: (typeof log.dayOfWeek === 'number' ? log.dayOfWeek : 1) as DayOfWeek,
            scheduledItemId: log.scheduledItemId,
            exerciseId: log.exerciseId,
            muscleGroupId: log.muscleGroupId || 'peitoral',
            sets,
            reps,
            loadKg,
            volumeKg: Math.round(sets * reps * loadKg * 10) / 10,
            completedAt: log.completedAt || new Date().toISOString(),
          };
        })
    : [];

  return {
    dayPlans: Array.from(baseDays.values()),
    scheduledItems,
    customExercises,
    logs,
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function buildBackupPayload(state: AppDataState): BackupPayload {
  return {
    schemaVersion: 1,
    app: 'ForjaFit Agenda',
    exportedAt: new Date().toISOString(),
    dayPlans: state.dayPlans,
    scheduledItems: state.scheduledItems,
    customExercises: state.customExercises,
    logs: state.logs,
  };
}

export function parseAndValidateBackupJSON(jsonText: string): {
  valid: boolean;
  error?: string;
  payload?: BackupPayload;
} {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'O arquivo não contém um objeto JSON válido.' };
    }
    if (!Array.isArray(parsed.scheduledItems) && !Array.isArray(parsed.logs) && !Array.isArray(parsed.dayPlans)) {
      return {
        valid: false,
        error: 'Estrutura incompatível: o JSON deve conter agenda (dayPlans/scheduledItems) ou registros (logs).',
      };
    }

    const sanitized = sanitizeAppState(parsed);
    const payload: BackupPayload = {
      schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1,
      app: String(parsed.app || 'ForjaFit Agenda'),
      exportedAt: String(parsed.exportedAt || new Date().toISOString()),
      dayPlans: sanitized.dayPlans,
      scheduledItems: sanitized.scheduledItems,
      customExercises: sanitized.customExercises,
      logs: sanitized.logs,
    };

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Erro ao interpretar o JSON. Verifique se o conteúdo está completo e bem formatado.' };
  }
}

export function mergeAppStates(current: AppDataState, incoming: BackupPayload): AppDataState {
  const customMap = new Map<string, Exercise>();
  for (const ex of current.customExercises) customMap.set(ex.id, ex);
  for (const ex of incoming.customExercises) customMap.set(ex.id, ex);

  const scheduleMap = new Map<string, ScheduledItem>();
  for (const item of current.scheduledItems) scheduleMap.set(item.id, item);
  for (const item of incoming.scheduledItems) scheduleMap.set(item.id, item);

  const logMap = new Map<string, WorkoutLog>();
  for (const log of current.logs) logMap.set(log.id, log);
  for (const log of incoming.logs) logMap.set(log.id, log);

  return {
    dayPlans: incoming.dayPlans.length > 0 ? incoming.dayPlans : current.dayPlans,
    scheduledItems: Array.from(scheduleMap.values()),
    customExercises: Array.from(customMap.values()),
    logs: Array.from(logMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
    updatedAt: new Date().toISOString(),
  };
}

export function generateCSVReport(state: AppDataState): string {
  const allExercises = [...DEFAULT_EXERCISES, ...state.customExercises];
  const exMap = new Map(allExercises.map((e) => [e.id, e]));
  const groupMap = new Map(MUSCLE_GROUPS.map((g) => [g.id, g.name]));

  const headers = [
    'Data',
    'Grupo Muscular',
    'Codigo',
    'Exercicio',
    'Equipamento',
    'Series',
    'Repeticoes',
    'Carga (kg)',
    'Volume Total (kg)',
    'Concluido em',
  ];

  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [...state.logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((log) => {
      const ex = exMap.get(log.exerciseId);
      const groupName = groupMap.get(log.muscleGroupId) || ex?.muscleGroupId || log.muscleGroupId;
      return [
        formatDateBR(log.date),
        groupName,
        ex?.code || '-',
        ex?.name || log.exerciseId,
        ex?.equipment || '-',
        log.sets,
        log.reps,
        String(log.loadKg).replace('.', ','),
        String(log.volumeKg).replace('.', ','),
        new Date(log.completedAt).toLocaleString('pt-BR'),
      ]
        .map(escapeCell)
        .join(';');
    });

  // BOM for Excel/Android compatibility with Portuguese accents
  return '\uFEFF' + [headers.join(';'), ...rows].join('\n');
}

export async function triggerFileDownload(
  content: string,
  filename: string,
  mimeType: string
): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: filename,
        text: `Arquivo exportado pelo ForjaFit Agenda: ${filename}`,
        url: writeResult.uri,
        dialogTitle: 'Salvar ou compartilhar backup',
      });
      return true;
    } catch {
      return false;
    }
  }

  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch {
    return false;
  }
}
