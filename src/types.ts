/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SetType = 'Aquecimento' | 'Adaptação' | 'Trabalho';

export interface SetState {
  id: string;
  weight: number | null; // null if empty to let user type it
  reps: string | number | null;  // Supported range / interval strings (e.g., "8 - 10") or simple numbers
  completed: boolean;
  type: SetType;
}

export interface ExerciseWorkoutState {
  exerciseId: string;
  sets: SetState[];
  notes?: string;
  restTimer?: number;
  progressionNotes?: string;
  observations?: string;
}

export interface ActiveWorkout {
  id: string;
  name: string;
  startTime: number;
  exercises: ExerciseWorkoutState[];
}

export interface WorkoutHistory {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  exercises: ExerciseWorkoutState[];
  comments?: string;
  cycleId?: string;
  cycleWeek?: number;
}

export interface WeightEntry {
  id: string;
  weight: number;
  timestamp: number;
  note?: string;
}

export interface TrainingCycle {
  id: string;
  name: string;
  durationWeeks: number;
  currentWeek?: number;
  startDate: number;
  endDate?: number;
  goalWeight?: number | null;
  targetFocus?: string;
}

export function getCycleCurrentWeek(cycle: { startDate: number; durationWeeks: number } | null | undefined): number {
  if (!cycle) return 1;
  const today = new Date();
  const start = new Date(cycle.startDate);
  const diffDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const calculatedWeek = Math.floor(diffDays / 7) + 1;
  return Math.max(1, Math.min(calculatedWeek, cycle.durationWeeks));
}

export interface Exercise {
  id: string;
  name: string;
  category: 'Força' | 'Hipertrofia' | 'Cardio' | 'Calistenia';
  targetMuscle: string;
  equipment: string;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  description: string;
  dayOfWeek?: number | null;
  exercises: {
    exerciseId: string;
    sets: {
      weight: number;
      reps: string | number;
      type: SetType;
    }[];
    restTimer?: number;
    progressionNotes?: string;
    observations?: string;
  }[];
}

export interface StandardExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: number;
  rest: number;
  notes: string;
}

export interface StandardWorkout {
  id: string;
  name: string;
  exercises: StandardExercise[];
}

export interface UserDocProfile {
  userId: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: string;
  currentCycle?: TrainingCycle | null;
  lastSeen?: string;
}

export type RunType =
  | 'A leve/continuo'
  | 'B fartlek ou trote-caminhada'
  | 'C moderado ou tiros'
  | 'Simulado 12 min'
  | 'Teste';

export interface RunInterval {
  id: string;
  order: number;
  label?: string; // e.g. "Tiro 1", "Trote 2m", "Fartlek forte"
  distanceMeters?: number; // e.g. 400, 800, 1000
  speedKmh?: number; // e.g. 11.0
  durationSeconds?: number; // e.g. 131
  durationFormatted?: string; // e.g. "2:11"
  restSeconds?: number; // e.g. 90
  restType?: 'trote' | 'caminhada' | 'parado';
  notes?: string;
}

export interface RunLog {
  id: string;
  date: string; // ISO format or YYYY-MM-DD
  timestamp: number;
  type: RunType;
  durationMinutes: number;
  distanceKm: number;
  inclinePct: number; // default 1.0%
  rpe: number; // 1 to 10
  speedKmh: number; // km/h
  paceFormatted: string; // e.g. "5:27/km"
  paceSecondsPerKm: number; // seconds per km
  intervals?: RunInterval[];
  notes?: string;
  tafTargetAchieved?: boolean; // True if >= 2.2km in 12 min or pace <= 5:27/km
  tafWeekNumber?: number; // 1 to 17
  createdAt?: string;
}

// Pace / Speed calculation helpers
export function speedKmhToPace(speedKmh: number): { formatted: string; totalSeconds: number; minutes: number; seconds: number } {
  if (!speedKmh || speedKmh <= 0) {
    return { formatted: '--:--/km', totalSeconds: 0, minutes: 0, seconds: 0 };
  }
  const paceMinutesDecimal = 60 / speedKmh;
  const totalSeconds = Math.round(paceMinutesDecimal * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  return { formatted, totalSeconds, minutes, seconds };
}

export function paceToSpeedKmh(minutes: number, seconds: number): number {
  const totalSeconds = minutes * 60 + seconds;
  if (totalSeconds <= 0) return 0;
  return Number(((3600 / totalSeconds)).toFixed(2));
}

export function calculateRunStats(durationMinutes: number, distanceKm: number) {
  if (durationMinutes <= 0 || distanceKm <= 0) {
    return {
      speedKmh: 0,
      paceFormatted: '--:--/km',
      paceSecondsPerKm: 0,
    };
  }
  const speedKmh = Number(((distanceKm / durationMinutes) * 60).toFixed(2));
  const pace = speedKmhToPace(speedKmh);
  return {
    speedKmh,
    paceFormatted: pace.formatted,
    paceSecondsPerKm: pace.totalSeconds,
  };
}

export interface TafWorkoutDef {
  key: 'A' | 'B' | 'C' | 'Teste';
  title: string;
  dayOfWeek: number; // 1 = Monday, 3 = Wednesday, 6 = Saturday (ou dia do teste)
  dayName: string; // 'Segunda-feira' | 'Quarta-feira' | 'Sábado' | 'Hoje'
  type: RunType;
  suggestedDurationMinutes: number;
  suggestedDistanceKm?: number;
  suggestedSpeedRange: string; // e.g. "7 a 8,5 km/h"
  suggestedSpeedMin: number;
  suggestedSpeedMax: number;
  targetPaceFormatted: string; // e.g. "5:27/km"
  intensityLabel: 'Leve' | 'Moderado' | 'Ritmo-alvo' | 'Acima do alvo' | 'Simulado' | 'Descanso / Taper';
  warmup: string; // "5 min caminhando + 3 a 5 min de trote"
  cooldown: string; // "5 min de caminhada / volta à calma"
  incline: string; // "1% de inclinação"
  description: string;
  intervals?: RunInterval[];
  isTafSimulation?: boolean;
}

export interface TafWeekDef {
  weekNumber: number;
  phaseNumber: 1 | 2 | 3 | 4;
  phaseName: 'Base' | 'Resistência' | 'Ritmo-alvo' | 'Específico e pico';
  phaseGoals: string;
  startDate: string; // e.g. "16/11/2026"
  endDate: string; // e.g. "22/11/2026"
  workouts: {
    A: TafWorkoutDef;
    B: TafWorkoutDef;
    C: TafWorkoutDef;
  };
}



