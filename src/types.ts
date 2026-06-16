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
  currentWeek: number;
  startDate: number;
  goalWeight?: number | null;
  targetFocus?: string;
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


