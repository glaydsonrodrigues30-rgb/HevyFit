import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { WorkoutHistory, WorkoutRoutine, WeightEntry, TrainingCycle, Exercise } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Syncs current localStorage data to Firestore for a new user,
 * avoiding data loss when they log in for the first time.
 */
export const syncLocalToFirebase = async (
  userId: string,
  localData: {
    history: WorkoutHistory[];
    routines: WorkoutRoutine[];
    weights: WeightEntry[];
    cycle: TrainingCycle | null;
  }
) => {
  const userPath = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    let userSnap;
    try {
      userSnap = await getDoc(userDocRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, userPath);
    }

    // Only migrate if user document doesn't exist yet (first-time login)
    if (userSnap && !userSnap.exists()) {
      const batch = writeBatch(db);

      // Create main user profile
      batch.set(userDocRef, {
        userId,
        createdAt: new Date().toISOString(),
        currentCycle: localData.cycle
      }, { merge: true });

      // Copy routines
      localData.routines.forEach((routine) => {
        const ref = doc(collection(db, 'users', userId, 'routines'), routine.id);
        batch.set(ref, routine);
      });

      // Copy weight history
      localData.weights.forEach((w) => {
        const ref = doc(collection(db, 'users', userId, 'weights'), w.id);
        batch.set(ref, w);
      });

      // Copy workout history
      localData.history.forEach((workout) => {
        const ref = doc(collection(db, 'users', userId, 'history'), workout.id);
        batch.set(ref, workout);
      });

      try {
        await batch.commit();
        console.log('Successfully completed first-time sync from localStorage to Firestore!');
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `${userPath}/batch`);
      }
    }
  } catch (error) {
    console.error('Error during automatic data synchronization:', error);
    throw error;
  }
};

/**
 * Loads all data for a specific user from Firestore.
 */
export const loadUserDataFromFirestore = async (userId: string) => {
  const userPath = `users/${userId}`;
  try {
    // 1. User outline & Cycle
    const userDocRef = doc(db, 'users', userId);
    let userSnap;
    try {
      userSnap = await getDoc(userDocRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, userPath);
    }
    const currentCycle = (userSnap && userSnap.exists()) ? (userSnap.data().currentCycle as TrainingCycle | null) : null;

    // 2. Workout History
    const historyPath = `users/${userId}/history`;
    let historySnap;
    try {
      historySnap = await getDocs(collection(db, 'users', userId, 'history'));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, historyPath);
    }
    const history: WorkoutHistory[] = [];
    if (historySnap) {
      historySnap.forEach((doc) => {
        history.push(doc.data() as WorkoutHistory);
      });
    }
    // Sort chronologically ascending
    history.sort((a, b) => a.startTime - b.startTime);

    // 3. Custom Routines
    const routinesPath = `users/${userId}/routines`;
    let routinesSnap;
    try {
      routinesSnap = await getDocs(collection(db, 'users', userId, 'routines'));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, routinesPath);
    }
    const routines: WorkoutRoutine[] = [];
    if (routinesSnap) {
      routinesSnap.forEach((doc) => {
        routines.push(doc.data() as WorkoutRoutine);
      });
    }

    // 4. Weight history
    const weightsPath = `users/${userId}/weights`;
    let weightsSnap;
    try {
      weightsSnap = await getDocs(collection(db, 'users', userId, 'weights'));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, weightsPath);
    }
    const weights: WeightEntry[] = [];
    if (weightsSnap) {
      weightsSnap.forEach((doc) => {
        weights.push(doc.data() as WeightEntry);
      });
    }
    weights.sort((a, b) => a.timestamp - b.timestamp);

    return {
      currentCycle,
      history,
      routines,
      weights
    };
  } catch (error) {
    console.error('Error loading Firestore data:', error);
    throw error;
  }
};

/**
 * Saves or updates user document (including training cycle configuration).
 */
export const saveUserCycle = async (userId: string, cycle: TrainingCycle | null) => {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { currentCycle: cycle }, { merge: true });
  } catch (error) {
    console.error('Error saving training cycle:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Saves a logged workout session.
 */
export const saveWorkoutSession = async (userId: string, workout: WorkoutHistory) => {
  const path = `users/${userId}/history/${workout.id}`;
  try {
    const ref = doc(db, 'users', userId, 'history', workout.id);
    await setDoc(ref, workout);
  } catch (error) {
    console.error('Error saving workout session:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Deletes a logged workout session.
 */
export const deleteWorkoutSession = async (userId: string, workoutId: string) => {
  const path = `users/${userId}/history/${workoutId}`;
  try {
    const ref = doc(db, 'users', userId, 'history', workoutId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting workout session:', error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

/**
 * Saves a training routine template.
 */
export const saveRoutineTemplate = async (userId: string, routine: WorkoutRoutine) => {
  const path = `users/${userId}/routines/${routine.id}`;
  try {
    const ref = doc(db, 'users', userId, 'routines', routine.id);
    await setDoc(ref, routine);
  } catch (error) {
    console.error('Error saving routine template:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Deletes a routine template.
 */
export const deleteRoutineTemplate = async (userId: string, routineId: string) => {
  const path = `users/${userId}/routines/${routineId}`;
  try {
    const ref = doc(db, 'users', userId, 'routines', routineId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting routine template:', error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

/**
 * Saves weight tracking progress.
 */
export const saveWeightProgress = async (userId: string, weight: WeightEntry) => {
  const path = `users/${userId}/weights/${weight.id}`;
  try {
    const ref = doc(db, 'users', userId, 'weights', weight.id);
    await setDoc(ref, weight);
  } catch (error) {
    console.error('Error saving weight entry:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Deletes weight tracking progress.
 */
export const deleteWeightProgress = async (userId: string, weightId: string) => {
  const path = `users/${userId}/weights/${weightId}`;
  try {
    const ref = doc(db, 'users', userId, 'weights', weightId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting weight entry:', error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

/**
 * Saves or updates a custom exercise definition in Firestore.
 */
export const saveCustomExercise = async (userId: string, exercise: Exercise) => {
  const path = `users/${userId}/exercises/${exercise.id}`;
  try {
    const ref = doc(db, 'users', userId, 'exercises', exercise.id);
    await setDoc(ref, exercise);
  } catch (error) {
    console.error('Error saving custom exercise:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Deletes a custom exercise definition from Firestore.
 */
export const deleteCustomExercise = async (userId: string, exerciseId: string) => {
  const path = `users/${userId}/exercises/${exerciseId}`;
  try {
    const ref = doc(db, 'users', userId, 'exercises', exerciseId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting custom exercise:', error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

