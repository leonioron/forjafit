import { DayOfWeek, MandatoryFieldErrors, MandatoryWorkoutFields } from '../types/workout';

export const DAY_NAMES_FULL: Record<DayOfWeek, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
  0: 'Domingo',
};

export const DAY_NAMES_SHORT: Record<DayOfWeek, string> = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
  0: 'Dom',
};

export const ORDERED_WEEK_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

export function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayISO(): string {
  return toLocalISODate(new Date());
}

export function parseLocalISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

export function getDayOfWeekFromISO(iso: string): DayOfWeek {
  return parseLocalISODate(iso).getDay() as DayOfWeek;
}

export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatShortDateBR(iso: string): string {
  const [, m, d] = iso.split('-');
  if (!m || !d) return iso;
  return `${d}/${m}`;
}

/**
 * Returns the 7 dates (Mon -> Sun) for the week containing referenceISO
 */
export function getWeekDatesForISO(referenceISO: string): { dateISO: string; dayOfWeek: DayOfWeek; dayNum: string; shortDay: string }[] {
  const ref = parseLocalISODate(referenceISO);
  const currentDay = ref.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);

  return ORDERED_WEEK_DAYS.map((dayOfWeek, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dateISO = toLocalISODate(d);
    return {
      dateISO,
      dayOfWeek,
      dayNum: String(d.getDate()).padStart(2, '0'),
      shortDay: DAY_NAMES_SHORT[dayOfWeek],
    };
  });
}

export function validateMandatoryWorkoutFields(
  fields: MandatoryWorkoutFields
): { valid: boolean; errors: MandatoryFieldErrors; parsed?: { sets: number; reps: number; loadKg: number } } {
  const errors: MandatoryFieldErrors = {};

  const setsTrim = fields.sets.trim();
  const repsTrim = fields.reps.trim();
  const loadTrim = fields.loadKg.trim().replace(',', '.');

  const setsNum = Number(setsTrim);
  if (!setsTrim || !Number.isFinite(setsNum) || !Number.isInteger(setsNum) || setsNum < 1 || setsNum > 50) {
    errors.sets = 'Obrigatório: informe um número inteiro entre 1 e 50 séries.';
  }

  const repsNum = Number(repsTrim);
  if (!repsTrim || !Number.isFinite(repsNum) || !Number.isInteger(repsNum) || repsNum < 1 || repsNum > 500) {
    errors.reps = 'Obrigatório: informe um número inteiro entre 1 e 500 repetições.';
  }

  const loadNum = loadTrim === '' ? 0 : Number(loadTrim);
  if (loadTrim !== '' && (!Number.isFinite(loadNum) || loadNum < 0 || loadNum > 1000)) {
    errors.loadKg = 'Informe um valor válido entre 0 e 1000 kg.';
  }

  const valid = !errors.sets && !errors.reps && !errors.loadKg;
  if (!valid) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    parsed: {
      sets: setsNum,
      reps: repsNum,
      loadKg: Math.round(loadNum * 10) / 10,
    },
  };
}

export function formatKg(value: number): string {
  if (Number.isInteger(value)) return `${value} kg`;
  return `${value.toFixed(1).replace('.', ',')} kg`;
}

export function formatVolumeKg(value: number): string {
  return `${Math.round(value).toLocaleString('pt-BR')} kg`;
}

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
