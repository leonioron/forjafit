export type TabId = 'today' | 'schedule' | 'catalog' | 'reports';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Domingo, 1 = Segunda ... 6 = Sábado

export interface MuscleGroup {
  id: string;
  order: number;
  name: string;
  shortName: string;
  description: string;
  subMuscles: string[];
  anatomyImagePath: string;
}

export interface Exercise {
  id: string;
  code: string;
  muscleGroupId: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string;
  equipment: string;
  execution: string;
  tip: string;
  imagePath: string;
  isCustom?: boolean;
}

export interface DayPlan {
  dayOfWeek: DayOfWeek;
  label: string;
  isRestDay: boolean;
}

export interface ScheduledItem {
  id: string;
  dayOfWeek: DayOfWeek;
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  targetLoadKg: number;
  order: number;
}

export interface WorkoutLog {
  id: string;
  date: string; // YYYY-MM-DD local
  dayOfWeek: DayOfWeek;
  scheduledItemId?: string;
  exerciseId: string;
  muscleGroupId: string;
  sets: number;
  reps: number;
  loadKg: number;
  volumeKg: number;
  completedAt: string; // ISO timestamp
}

export interface MandatoryWorkoutFields {
  sets: string;
  reps: string;
  loadKg: string;
}

export interface MandatoryFieldErrors {
  sets?: string;
  reps?: string;
  loadKg?: string;
}

export interface AppDataState {
  dayPlans: DayPlan[];
  scheduledItems: ScheduledItem[];
  customExercises: Exercise[];
  logs: WorkoutLog[];
  updatedAt: string;
}

export interface BackupPayload {
  schemaVersion: number;
  app: string;
  exportedAt: string;
  dayPlans: DayPlan[];
  scheduledItems: ScheduledItem[];
  customExercises: Exercise[];
  logs: WorkoutLog[];
}
