/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Dumbbell,
  Trophy,
  History,
  Activity,
  TrendingUp,
  Scale,
  Calendar,
  Settings,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  Menu,
  X,
  Sparkles,
  Info,
  Lock,
  Edit,
  Timer,
  Target,
  MoreHorizontal,
  LogOut,
  CheckCircle2,
  User,
  Footprints,
  ChevronDown
} from 'lucide-react';
import { ActiveWorkout, Exercise, SetType, TrainingCycle, WeightEntry, WorkoutHistory, WorkoutRoutine, StandardWorkout, StandardExercise, ExerciseWorkoutState, getCycleCurrentWeek, RunLog, TafWorkoutDef } from './types';
import { TEXTS } from './texts';
import {
  INITIAL_EXERCISES,
  INITIAL_ROUTINES,
  INITIAL_WEIGHT_HISTORY,
  INITIAL_HISTORY
} from './repositories/mockExercises';

import Dashboard from './components/Dashboard';
import WorkoutLog from './components/WorkoutLog';
import ExerciseProgression from './components/ExerciseProgression';
import WeightTracker from './components/WeightTracker';
import CycleSettings from './components/CycleSettings';
import RestTimerOverlay from './components/RestTimerOverlay';
import Login from './components/Login';
import AdminView from './components/AdminView';
import WeeklyReport from './components/WeeklyReport';
import RunningTracker from './components/RunningTracker';
import TafPlanView from './components/TafPlanView';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, logOut, db } from './lib/firebase';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import {
  handleFirestoreError,
  OperationType,
  saveRunLog,
  deleteRunLog
} from './lib/firebaseSync';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Auth and Guest States
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const savedLocalUser = localStorage.getItem('hevyfit_local_user');
    if (savedLocalUser) {
      try {
        return JSON.parse(savedLocalUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('hevyfit_is_guest') === 'true';
  });

  // Navigation with URL pathname/hash synchronization
  const [activeTab, setActiveTab ] = useState<string>(() => {
    const rawPath = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
    const rawHash = window.location.hash.replace(/^#\/?/g, '').toLowerCase();
    
    // Normalize path/hash 'treinar' to 'train', 'corrida' to 'running', 'taf' to 'taf_plan'
    const normalizeTab = (val: string) => {
      if (val === 'treinar') return 'train';
      if (val === 'corrida') return 'running';
      if (val === 'taf' || val === 'plano-taf' || val === 'planotaf') return 'taf_plan';
      return val;
    };

    const path = normalizeTab(rawPath);
    const hash = normalizeTab(rawHash);

    const validTabs = [
      'dashboard',
      'train',
      'history',
      'running',
      'taf_plan',
      'exercises',
      'weight',
      'cycle',
      'admin'
    ];
    if (validTabs.includes(path)) {
      return path;
    }
    if (hash && validTabs.includes(hash)) {
      return hash;
    }
    return 'dashboard';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  // Sync activeTab with URL & perform admin security validation
  useEffect(() => {
    const validTabs = [
      'dashboard',
      'train',
      'history',
      'running',
      'taf_plan',
      'exercises',
      'weight',
      'cycle',
      'admin'
    ];

    // Auth security guard for admin panel
    if (!authLoading) {
      const isAdminAccount = currentUser && currentUser.email === 'glaydson.rodrigues30@gmail.com';
      if (activeTab === 'admin' && !isAdminAccount) {
        setActiveTab('dashboard');
        return;
      }
    }

    if (validTabs.includes(activeTab)) {
      const path = activeTab === 'dashboard' ? '/' : `/${activeTab}`;
      if (window.location.pathname !== path) {
        try {
          window.history.pushState({ tab: activeTab }, '', path);
        } catch (e) {
          console.warn('Navigation state could not be pushed to history (sandboxed iframe constraints):', e);
        }
      }
    }
  }, [activeTab, currentUser, authLoading]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const rawPath = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
      const rawHash = window.location.hash.replace(/^#\/?/g, '').toLowerCase();
      
      const normalizeTab = (val: string) => {
        if (val === 'treinar') return 'train';
        if (val === 'corrida') return 'running';
        if (val === 'taf' || val === 'plano-taf' || val === 'planotaf') return 'taf_plan';
        return val;
      };

      const path = normalizeTab(rawPath);
      const hash = normalizeTab(rawHash);

      const validTabs = [
        'dashboard',
        'train',
        'history',
        'running',
        'taf_plan',
        'exercises',
        'weight',
        'cycle',
        'admin'
      ];
      if (validTabs.includes(path)) {
        setActiveTab(path);
      } else if (hash && validTabs.includes(hash)) {
        setActiveTab(hash);
      } else {
        setActiveTab('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Persistence States
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [currentCycle, setCurrentCycle] = useState<TrainingCycle | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [standardWorkouts, setStandardWorkouts] = useState<StandardWorkout[]>([]);
  const [runs, setRuns] = useState<RunLog[]>(() => {
    try {
      const saved = localStorage.getItem('hevyfit_runs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [pendingTafRun, setPendingTafRun] = useState<Partial<RunLog> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Delete confirm state for workouts history
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);
  const [workoutToDelete, setWorkoutToDelete] = useState<WorkoutHistory | null>(null);
  const [expandedWorkoutIds, setExpandedWorkoutIds] = useState<Record<string, boolean>>({});

  // Edit states for workouts history
  const [editingWorkout, setEditingWorkout] = useState<WorkoutHistory | null>(null);
  const [editWorkoutName, setEditWorkoutName] = useState('');
  const [editWorkoutDateStr, setEditWorkoutDateStr] = useState('');
  const [editWorkoutDurationMins, setEditWorkoutDurationMins] = useState(0);
  const [editWorkoutComments, setEditWorkoutComments] = useState('');

  // Inline edit states for workout history sessions (sets, weights, reps)
  const [inlineEditingWorkoutId, setInlineEditingWorkoutId] = useState<string | null>(null);
  const [inlineEditingExercises, setInlineEditingExercises] = useState<ExerciseWorkoutState[]>([]);
  const [historySubTab, setHistorySubTab] = useState<'feed' | 'report'>('feed');

  // Rest Timer States - managed globally to stay active while exploring other tabs
  const [timerTotal, setTimerTotal] = useState(90);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  // Audio context ref for playing rest timer sound
  const timerAudioCtxRef = useRef<AudioContext | null>(null);

  const playRestTimerSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn('AudioContext not supported');
        return;
      }
      if (!timerAudioCtxRef.current) {
        timerAudioCtxRef.current = new AudioCtx();
      }
      const ctx = timerAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // Play a beautiful dual-tone chime (e.g., electronic gym bell chime)
      const now = ctx.currentTime;
      playTone(523.25, now, 0.4);       // C5 Note
      playTone(659.25, now + 0.15, 0.5); // E5 Note
      playTone(783.99, now + 0.3, 0.6);  // G5 Note
    } catch (e) {
      console.warn('Fábrica de áudio não inicializou ou falhou:', e);
    }
  };

  // Workout complete splash celebration metrics
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastFinishedWorkoutStats, setLastFinishedWorkoutStats] = useState<{
    name: string;
    durationMins: number;
    volume: number;
    sets: number;
  } | null>(null);

  // 1. Initial State Loading from Firebase, with offline memory fallback
  useEffect(() => {
    // Connect to Firebase Authentication
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthLoading(true);

        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = snap.data();
            console.log("Firebase dados:", data);

            if (data.workouts !== undefined) {
              setHistory(data.workouts);
            } else if (data.history !== undefined) {
              setHistory(data.history);
            }
            if (data.routines !== undefined) {
              setRoutines(data.routines);
            }
            if (data.weightHistory !== undefined) {
              setWeightHistory(data.weightHistory);
            } else if (data.weights !== undefined) {
              setWeightHistory(data.weights);
            }
            if (data.currentCycle !== undefined) {
              setCurrentCycle(data.currentCycle);
            }
            if (data.exercises !== undefined) {
              setExercises(data.exercises);
            }
            if (data.activeWorkout !== undefined) {
              setActiveWorkout(data.activeWorkout);
            }
            if (data.standardWorkouts !== undefined) {
              setStandardWorkouts(data.standardWorkouts);
            }
            if (data.runs !== undefined) {
              setRuns(data.runs);
              localStorage.setItem('hevyfit_runs', JSON.stringify(data.runs));
            }

            // Always update basic info to keep admin user list current
            await setDoc(userDocRef, {
              displayName: user.displayName || 'Sem nome',
              email: user.email || '',
              photoURL: user.photoURL || '',
              lastSeen: new Date().toISOString()
            }, { merge: true });

          } else {
            // First time login - initialize with initial templates
            const initialUserData = {
              userId: user.uid,
              displayName: user.displayName || 'Sem nome',
              email: user.email || '',
              photoURL: user.photoURL || '',
              createdAt: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
              workouts: INITIAL_HISTORY,
              history: INITIAL_HISTORY,
              routines: INITIAL_ROUTINES,
              weightHistory: INITIAL_WEIGHT_HISTORY,
              weights: INITIAL_WEIGHT_HISTORY,
              currentCycle: {
                id: 'cycle_default',
                name: 'Block de Hipertrofia do Inverno',
                durationWeeks: 8,
                currentWeek: 2,
                startDate: Date.now() - 10 * 24 * 60 * 60 * 1000,
                endDate: Date.now() - 10 * 24 * 60 * 60 * 1000 + 8 * 7 * 24 * 60 * 60 * 1000,
                targetFocus: 'Ganho de Massa Muscular',
                goalWeight: 78.5
              },
              exercises: INITIAL_EXERCISES,
              activeWorkout: null,
              standardWorkouts: []
            };

            await setDoc(userDocRef, initialUserData, { merge: true });
            console.log("Firebase dados inicializados:", initialUserData);

            setHistory(INITIAL_HISTORY);
            setRoutines(INITIAL_ROUTINES);
            setWeightHistory(INITIAL_WEIGHT_HISTORY);
            setCurrentCycle(initialUserData.currentCycle);
            setExercises(INITIAL_EXERCISES);
            setActiveWorkout(null);
            setStandardWorkouts([]);
          }
        } catch (error) {
          console.error('Error during initial Firebase load:', error);
        } finally {
          setCurrentUser(user);
          setIsGuest(false);
          setAuthLoading(false);
          setIsLoaded(true);
        }
      } else {
        // If not authenticated via Firebase, check if user has local bypass session or guest mode
        const savedLocalUser = localStorage.getItem('hevyfit_local_user');
        if (savedLocalUser) {
          try {
            setCurrentUser(JSON.parse(savedLocalUser));
            setIsGuest(false);
          } catch (e) {
            setCurrentUser(null);
          }
        } else if (localStorage.getItem('hevyfit_is_guest') === 'true') {
          setIsGuest(true);
          setCurrentUser(null);
        } else {
          setCurrentUser(null);
          setIsGuest(false);
        }
        setAuthLoading(false);
        setIsLoaded(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Set default guest or local memory data when offline or local mode is active
  useEffect(() => {
    if ((!currentUser && isGuest) || (currentUser && !auth.currentUser)) {
      if (history.length === 0) setHistory(INITIAL_HISTORY);
      if (weightHistory.length === 0) setWeightHistory(INITIAL_WEIGHT_HISTORY);
      if (!currentCycle) {
        setCurrentCycle({
          id: 'cycle_default',
          name: 'Block de Hipertrofia do Inverno',
          durationWeeks: 8,
          currentWeek: 2,
          startDate: Date.now() - 10 * 24 * 60 * 60 * 1000,
          endDate: Date.now() - 10 * 24 * 60 * 60 * 1000 + 8 * 7 * 24 * 60 * 60 * 1000,
          targetFocus: 'Ganho de Massa Muscular',
          goalWeight: 78.5
        });
      }
      if (exercises.length === 0) setExercises(INITIAL_EXERCISES);
      if (routines.length === 0) setRoutines(INITIAL_ROUTINES);
      setActiveWorkout(null);
    }
  }, [currentUser, isGuest]);

  // Real-time Firestore synchronization for authenticated Firebase users
  useEffect(() => {
    if (!currentUser || !auth.currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Firebase dados:", data);

        if (data.workouts !== undefined) {
          setHistory(data.workouts);
        } else if (data.history !== undefined) {
          setHistory(data.history);
        }

        if (data.routines !== undefined) {
          setRoutines(data.routines);
        }

        if (data.weightHistory !== undefined) {
          setWeightHistory(data.weightHistory);
        } else if (data.weights !== undefined) {
          setWeightHistory(data.weights);
        }

        if (data.currentCycle !== undefined) {
          setCurrentCycle(data.currentCycle as TrainingCycle | null);
        }

        if (data.exercises !== undefined) {
          setExercises(data.exercises);
        }

        if (data.activeWorkout !== undefined) {
          setActiveWorkout(data.activeWorkout as ActiveWorkout | null);
        }

        if (data.standardWorkouts !== undefined) {
          setStandardWorkouts(data.standardWorkouts as StandardWorkout[]);
        }

        if (data.runs !== undefined) {
          setRuns(data.runs as RunLog[]);
          localStorage.setItem('hevyfit_runs', JSON.stringify(data.runs));
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
    });

    return () => unsubUser();
  }, [currentUser]);

  // 3. Global Rest Timer Countdown interval tick hook
  useEffect(() => {
    let timerInterval: any = null;
    if (isTimerActive && timerRemaining > 0) {
      timerInterval = setInterval(() => {
        setTimerRemaining(prev => {
          if (prev <= 1) {
            setIsTimerActive(false);
            playRestTimerSound();
            return 0; // Trigger completion
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isTimerActive, timerRemaining]);

  // Actions for Active Workout recording
  const handleStartWorkout = async (
    name: string,
    routineExercises?: WorkoutRoutine['exercises']
  ) => {
    const formattedExercises = routineExercises
      ? routineExercises.map((e, idx) => ({
          exerciseId: e.exerciseId,
          restTimer: e.restTimer,
          progressionNotes: e.progressionNotes,
          observations: e.observations,
          sets: e.sets.map((s, sIdx) => ({
            id: `set_${Date.now()}_${idx}_${sIdx}`,
            weight: s.weight,
            reps: s.reps,
            completed: false,
            type: s.type
          }))
        }))
      : [];

    const newActiveWorkout: ActiveWorkout = {
      id: 'active_' + Date.now(),
      name,
      startTime: Date.now(),
      exercises: formattedExercises
    };

    setActiveWorkout(newActiveWorkout);
    setActiveTab('train'); // Switch to Train tab immediately

    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          activeWorkout: newActiveWorkout
        }, { merge: true });
      } catch (error) {
        console.error('Error starting active workout in Firebase:', error);
      }
    }
  };

  const handleCancelWorkout = async () => {
    setActiveWorkout(null);
    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          activeWorkout: null
        }, { merge: true });
      } catch (error) {
        console.error('Error canceling active workout in Firebase:', error);
      }
    }
  };

  const handleFinishWorkout = async (comments: string) => {
    if (!activeWorkout) return;

    // Filter sets that are completed
    const exercisesProcessed = activeWorkout.exercises.map(ex => {
      return {
        ...ex,
        sets: ex.sets.filter(s => s.completed)
      };
    }).filter(ex => ex.sets.length > 0);

    if (exercisesProcessed.length === 0) {
      alert('Aviso: Você deve marcar pelo menos uma série como concluída para salvar seu treino!');
      return;
    }

    const durationMs = Date.now() - activeWorkout.startTime;

    // Save actual completed session
    const completedHistoryEntry: WorkoutHistory = {
      id: 'hist_' + Date.now(),
      name: activeWorkout.name,
      startTime: activeWorkout.startTime,
      endTime: Date.now(),
      durationMs,
      exercises: exercisesProcessed,
      comments,
      cycleId: currentCycle?.id || undefined,
      cycleWeek: currentCycle ? getCycleCurrentWeek(currentCycle) : undefined
    };

    const updatedHistory = [...history, completedHistoryEntry];
    setHistory(updatedHistory);

    // Save to Firestore if user is authenticated
    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          workouts: updatedHistory,
          history: updatedHistory,
          activeWorkout: null
        }, { merge: true });
      } catch (error) {
        console.error('Error saving workout history to Firebase:', error);
      }
    }

    // Calculate details for finished display celebration
    const durationMins = Math.round(durationMs / 60000);
    const setsCompletedCount = exercisesProcessed.reduce((acc, curr) => acc + curr.sets.length, 0);
    const volumeAccum = exercisesProcessed.reduce((acc, curr) => {
      return acc + curr.sets.reduce((sum, s) => sum + ((s.weight || 0) * (s.reps || 0)), 0);
    }, 0);

    setLastFinishedWorkoutStats({
      name: activeWorkout.name,
      durationMins,
      volume: volumeAccum,
      sets: setsCompletedCount
    });

    // Clear active container
    setActiveWorkout(null);
    setShowCelebration(true);

    // Navigate to history logs
    setActiveTab('historico');
  };

  // Workout History Edition Handlers
  const handleStartEditWorkout = (workout: WorkoutHistory) => {
    setEditingWorkout(workout);
    setEditWorkoutName(workout.name);
    
    // Convert startTime to YYYY-MM-DDTHH:mm in local time representation
    const date = new Date(workout.startTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    setEditWorkoutDateStr(`${year}-${month}-${day}T${hours}:${minutes}`);
    
    setEditWorkoutDurationMins(Math.round(workout.durationMs / 60000));
    setEditWorkoutComments(workout.comments || '');
  };

  const handleSaveEditWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkout) return;

    const newStartTime = new Date(editWorkoutDateStr).getTime();
    if (isNaN(newStartTime)) {
      alert('Por favor, informe uma data e hora válidas.');
      return;
    }

    const newDurationMs = editWorkoutDurationMins * 60000;
    const newEndTime = newStartTime + newDurationMs;

    const updatedHistory = history.map((w) => {
      if (w.id === editingWorkout.id) {
        return {
          ...w,
          name: editWorkoutName.trim() || w.name,
          startTime: newStartTime,
          endTime: newEndTime,
          durationMs: newDurationMs,
          comments: editWorkoutComments.trim()
        };
      }
      return w;
    });

    setHistory(updatedHistory);

    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          workouts: updatedHistory,
          history: updatedHistory
        }, { merge: true });
        console.log("Firebase: Edição de histórico salva com sucesso!");
      } catch (error) {
        console.error('Error saving edited workout in Firebase:', error);
      }
    }

    setEditingWorkout(null);
  };

  const handleSaveInlineEditWorkout = async (workoutId: string) => {
    if (!currentUser && !isGuest) {
      alert('Faça login ou continue como visitante para salvar modificações.');
      return;
    }

    const updatedHistory = history.map((w) => {
      if (w.id === workoutId) {
        const processedExercises = inlineEditingExercises.map(ex => {
          return {
            ...ex,
            sets: ex.sets.map(s => {
              const parsedWeight = s.weight === null || isNaN(Number(s.weight)) ? null : Number(s.weight);
              let cleanReps: string | number = s.reps ?? '0';
              if (typeof s.reps === 'string' && !isNaN(Number(s.reps)) && s.reps.trim() !== '') {
                cleanReps = Number(s.reps);
              }
              return {
                ...s,
                weight: parsedWeight,
                reps: cleanReps,
                completed: true
              };
            })
          };
        });

        return {
          ...w,
          exercises: processedExercises
        };
      }
      return w;
    });

    setHistory(updatedHistory);

    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          workouts: updatedHistory,
          history: updatedHistory
        }, { merge: true });

        const targetWorkout = updatedHistory.find(w => w.id === workoutId);
        if (targetWorkout) {
          const ref = doc(db, 'users', currentUser.uid, 'history', workoutId);
          await setDoc(ref, targetWorkout, { merge: true });
        }

        console.log("Firebase: Edição de séries e cargas salva com sucesso!");
      } catch (error) {
        console.error('Error saving inline edited session in Firebase:', error);
        handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}/history/${workoutId}`);
      }
    }

    setInlineEditingWorkoutId(null);
    setInlineEditingExercises([]);
  };

  // Rest Timer Controller functions
  const handleTriggerRestTimer = (seconds: number) => {
    setTimerTotal(seconds);
    setTimerRemaining(seconds);
    setIsTimerActive(true);
    setShowTimer(true);
  };

  const handleToggleTimerActive = () => {
    setIsTimerActive(prev => !prev);
  };

  const handleResetTimer = () => {
    setTimerRemaining(timerTotal);
    setIsTimerActive(true);
  };

  const handleAdjustTimerValue = (seconds: number) => {
    setTimerRemaining(prev => {
      const next = prev + seconds;
      return next <= 0 ? 0 : next;
    });
  };

  // Weight entry manipulations
  const handleAddWeight = async (weight: number, note: string, customTimestamp?: number) => {
    const entry: WeightEntry = {
      id: 'weight_' + Date.now(),
      weight,
      timestamp: customTimestamp || Date.now(),
      note: note || undefined
    };
    const updated = [...weightHistory, entry];
    setWeightHistory(updated);

    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          weightHistory: updated,
          weights: updated
        }, { merge: true });
      } catch (error) {
        console.error('Error saving weight history to Firebase:', error);
      }
    }
  };

  const handleUpdateWeight = async (id: string, weight: number, note: string, timestamp: number) => {
    const updated = weightHistory.map(w => {
      if (w.id === id) {
        return {
          ...w,
          weight,
          timestamp,
          note: note || undefined
        };
      }
      return w;
    });
    setWeightHistory(updated);

    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          weightHistory: updated,
          weights: updated
        }, { merge: true });
      } catch (error) {
        console.error('Error updating weight in Firebase:', error);
      }
    }
  };

  const handleDeleteWeight = async (id: string) => {
    const updated = weightHistory.filter(w => w.id !== id);
    setWeightHistory(updated);

    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          weightHistory: updated,
          weights: updated
        }, { merge: true });
      } catch (error) {
        console.error('Error deleting weight from Firebase:', error);
      }
    }
  };

  // Exercise database manipulations
  const handleAddExercise = async (newEx: Exercise) => {
    const updated = [...exercises, newEx];
    setExercises(updated);
    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          exercises: updated
        }, { merge: true });
      } catch (error) {
        console.error('Error saving custom exercise to Firebase:', error);
      }
    }
  };

  const handleUpdateExercise = async (updatedEx: Exercise) => {
    const updated = exercises.map(e => e.id === updatedEx.id ? updatedEx : e);
    setExercises(updated);
    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          exercises: updated
        }, { merge: true });
      } catch (error) {
        console.error('Error updating custom exercise in Firebase:', error);
      }
    }
  };

  const handleDeleteExercise = async (id: string) => {
    const updated = exercises.filter(e => e.id !== id);
    setExercises(updated);
    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          exercises: updated
        }, { merge: true });
      } catch (error) {
        console.error('Error deleting custom exercise in Firebase:', error);
      }
    }
  };

  const handleAddStandardWorkout = async (newWorkout: StandardWorkout) => {
    const updated = [...standardWorkouts, newWorkout];
    setStandardWorkouts(updated);
    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          standardWorkouts: updated
        }, { merge: true });
      } catch (error) {
        console.error('Error saving standardized workout to Firebase:', error);
      }
    }
  };

  const handleDeleteStandardWorkout = async (id: string) => {
    const updated = standardWorkouts.filter(w => w.id !== id);
    setStandardWorkouts(updated);
    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          standardWorkouts: updated
        }, { merge: true });
      } catch (error) {
        console.error('Error deleting standardized workout in Firebase:', error);
      }
    }
  };

  // Treadmill Run Handlers
  const handleSaveRun = async (newRun: RunLog) => {
    const updated = [newRun, ...runs.filter(r => r.id !== newRun.id)];
    setRuns(updated);
    localStorage.setItem('hevyfit_runs', JSON.stringify(updated));

    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          runs: updated
        }, { merge: true });
        await saveRunLog(currentUser.uid, newRun);
      } catch (error) {
        console.error('Error saving run session to Firebase:', error);
      }
    }
  };

  const handleDeleteRun = async (runId: string) => {
    const updated = runs.filter(r => r.id !== runId);
    setRuns(updated);
    localStorage.setItem('hevyfit_runs', JSON.stringify(updated));

    if (currentUser && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          runs: updated
        }, { merge: true });
        await deleteRunLog(currentUser.uid, runId);
      } catch (error) {
        console.error('Error deleting run session from Firebase:', error);
      }
    }
  };

  const handleStartRunFromTaf = (workout: TafWorkoutDef, weekNumber: number) => {
    setPendingTafRun({
      type: workout.type,
      durationMinutes: workout.suggestedDurationMinutes,
      distanceKm: workout.suggestedDistanceKm || (workout.suggestedDurationMinutes > 0 ? Number((workout.suggestedDurationMinutes * (workout.suggestedSpeedMin / 60)).toFixed(2)) : 2.5),
      inclinePct: 1.0,
      rpe: workout.intensityLabel === 'Simulado' ? 9 : workout.intensityLabel === 'Leve' ? 5 : 7,
      notes: `${workout.title} (${weekNumber > 0 ? `Semana ${weekNumber}` : 'Teste Pré-Plano'}) • Aquecimento: ${workout.warmup} • Inclinação: 1% na esteira • Volta à calma: ${workout.cooldown}`,
      intervals: workout.intervals,
      tafWeekNumber: weekNumber > 0 ? weekNumber : undefined
    });
    setActiveTab('running');
  };

  // Logout handler
  const handleLogoutClick = async () => {
    try {
      if (auth.currentUser) {
        await logOut();
      }
    } catch (e) {
      console.error('Falha ao deslogar:', e);
    } finally {
      setCurrentUser(null);
      setIsGuest(false);
      localStorage.removeItem('hevyfit_is_guest');
      localStorage.removeItem('hevyfit_local_user');
      localStorage.removeItem('hevyfit_runs');
      // Reset to original mock memory loads
      setHistory(INITIAL_HISTORY);
      setWeightHistory(INITIAL_WEIGHT_HISTORY);
      setRuns([]);
      setCurrentCycle({
        id: 'cycle_default',
        name: 'Block de Hipertrofia do Inverno',
        durationWeeks: 8,
        currentWeek: 2,
        startDate: Date.now() - 10 * 24 * 60 * 60 * 1000,
        endDate: Date.now() - 10 * 24 * 60 * 60 * 1000 + 8 * 7 * 24 * 60 * 60 * 1000,
        targetFocus: 'Ganho de Massa Muscular',
        goalWeight: 78.5
      });
      setRoutines(INITIAL_ROUTINES);
      setActiveWorkout(null);
      setActiveTab('dashboard');
    }
  };

  // Human durations convert
  const formatDurationStr = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0E0F13] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 bg-gradient-to-br from-[#7C6CFF] to-[#6A5BF0] rounded-2xl flex items-center justify-center shadow-lg shadow-[#7C6CFF]/20">
          <Dumbbell className="w-6 h-6 text-white stroke-[2.2] animate-spin" style={{ animationDuration: '2.5s' }} />
        </div>
        <p className="text-sm text-[#9AA1AD] font-medium tracking-wide animate-pulse">Carregando HevyFit...</p>
      </div>
    );
  }

  if (!currentUser && !isGuest) {
    return (
      <Login
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsGuest(false);
          setActiveTab('dashboard');
        }}
        onContinueOffline={() => {
          setIsGuest(true);
          setCurrentUser(null);
          localStorage.setItem('hevyfit_is_guest', 'true');
          localStorage.removeItem('hevyfit_local_user');
          setActiveTab('dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0F13] text-[#F2F3F5] flex flex-col font-sans lg:pl-[240px] xl:pl-[260px]">
      
      {/* DESKTOP FIXED LEFT SIDEBAR (>= 1024px) */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] xl:w-[260px] bg-[#15171C] border-r border-[rgba(255,255,255,0.07)] p-5 flex-col justify-between z-30 select-none">
        <div className="space-y-6">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#7C6CFF] to-[#6A5BF0] flex items-center justify-center text-white shadow-sm shrink-0">
              <Dumbbell className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-[#F2F3F5] tracking-tight leading-none">
                HevyFit
              </h1>
              <span className="text-[11px] text-[#6B7280] block mt-0.5">
                Treino &amp; Progressão
              </span>
            </div>
          </div>

          {/* Group 1: Principais (Hoje, Treinar, Corrida, Plano) */}
          <nav className="space-y-1">
            <span className="text-[11px] text-[#6B7280] font-medium px-3 block mb-1">
              Principal
            </span>
            {[
              { id: 'dashboard', label: 'Hoje', icon: Calendar },
              { id: 'train', label: 'Treinar', icon: Dumbbell, hasBadge: Boolean(activeWorkout) },
              { id: 'running', label: 'Corrida', icon: Timer },
              { id: 'taf_plan', label: 'Plano', icon: Target },
            ].map((tab) => {
              const Icon = tab.icon;
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`desktop-nav-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[14px] text-[14px] font-medium transition cursor-pointer ${
                    isTabActive
                      ? 'bg-[#1C1F26] text-[#7C6CFF] shadow-sm'
                      : 'text-[#9AA1AD] hover:text-[#F2F3F5] hover:bg-[#1C1F26]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 stroke-[1.8] ${isTabActive ? 'text-[#7C6CFF]' : 'text-[#6B7280]'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.hasBadge && (
                    <span className="w-2 h-2 rounded-full bg-[#7C6CFF] animate-pulse" title="Treino em andamento" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="border-t border-[rgba(255,255,255,0.07)]" />

          {/* Group 2: Ferramentas (Histórico, Exercícios, Peso, Ciclo, Admin) */}
          <nav className="space-y-1">
            <span className="text-[11px] text-[#6B7280] font-medium px-3 block mb-1">
              Mais ferramentas
            </span>
            {[
              { id: 'history', label: 'Histórico', icon: History },
              { id: 'exercises', label: 'Exercícios', icon: TrendingUp },
              { id: 'weight', label: 'Peso corporal', icon: Scale },
              { id: 'cycle', label: 'Ciclo', icon: Activity },
              ...(currentUser && currentUser.email === 'glaydson.rodrigues30@gmail.com'
                ? [{ id: 'admin', label: 'Admin', icon: Lock }]
                : [])
            ].map((tab) => {
              const Icon = tab.icon;
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`desktop-subnav-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-[14px] text-[13px] font-medium transition cursor-pointer ${
                    isTabActive
                      ? 'bg-[#1C1F26] text-[#7C6CFF]'
                      : 'text-[#9AA1AD] hover:text-[#F2F3F5] hover:bg-[#1C1F26]/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 stroke-[1.75] ${isTabActive ? 'text-[#7C6CFF]' : 'text-[#6B7280]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Desktop Profile / Logout Card */}
        <div className="pt-4 border-t border-[rgba(255,255,255,0.07)]">
          {currentUser ? (
            <div className="flex items-center justify-between p-2.5 rounded-[16px] bg-[#1C1F26]/60 border border-[rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-2.5 min-w-0 pr-1">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Atleta'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-[rgba(255,255,255,0.1)] shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#7C6CFF]/20 text-[#7C6CFF] font-semibold flex items-center justify-center text-[12px] shrink-0">
                    {(currentUser.displayName || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#F2F3F5] truncate leading-tight">
                    {currentUser.displayName || 'Atleta'}
                  </p>
                  <p className="text-[11px] text-[#6B7280] truncate leading-none mt-0.5">
                    {currentUser.email}
                  </p>
                </div>
              </div>
              <button
                id="btn-desktop-logout"
                type="button"
                onClick={handleLogoutClick}
                className="p-1.5 text-[#6B7280] hover:text-[#FF6B6B] hover:bg-[#15171C] rounded-[8px] transition cursor-pointer"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-[16px] bg-[#1C1F26]/60 border border-[rgba(255,255,255,0.04)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5B84B]" />
                <span className="text-[11px] text-[#F5B84B] font-medium">Modo Convidado</span>
              </div>
              <button
                id="btn-desktop-login"
                type="button"
                onClick={() => {
                  setIsGuest(false);
                  localStorage.removeItem('hevyfit_is_guest');
                }}
                className="w-full py-1.5 rounded-[10px] bg-[#7C6CFF] hover:bg-[#8E80FF] text-[#F2F3F5] text-[12px] font-medium transition cursor-pointer"
              >
                Sincronizar Conta
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE TOP BAR (< 1024px) */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#0E0F13]/90 backdrop-blur-md border-b border-[rgba(255,255,255,0.07)] px-4 py-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#7C6CFF] to-[#6A5BF0] flex items-center justify-center text-white shadow-sm shrink-0">
            <Dumbbell className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="font-semibold text-[17px] text-[#F2F3F5] tracking-tight">
            HevyFit
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMoreSheetOpen(true)}
          className="flex items-center gap-2 p-1 pl-2 rounded-full bg-[#15171C] border border-[rgba(255,255,255,0.07)] text-[#9AA1AD] hover:text-[#F2F3F5] transition cursor-pointer"
        >
          <span className="text-[12px] font-medium pr-1 text-[#F2F3F5]">
            {currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'Menu'}
          </span>
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt="Avatar"
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#7C6CFF]/20 text-[#7C6CFF] text-[11px] font-semibold flex items-center justify-center">
              {(currentUser?.displayName || 'A').charAt(0).toUpperCase()}
            </div>
          )}
        </button>
      </header>

      {/* MOBILE FIXED BOTTOM TAB BAR (< 1024px) */}
      <nav
        aria-label="Navegação inferior"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#15171C]/95 backdrop-blur-md border-t border-[rgba(255,255,255,0.07)] grid grid-cols-5 items-center px-1 pt-1.5 pb-[max(env(safe-area-inset-bottom),8px)] select-none"
      >
        {[
          { id: 'dashboard', label: 'Hoje', icon: Calendar },
          { id: 'train', label: 'Treinar', icon: Dumbbell, hasBadge: Boolean(activeWorkout) },
          { id: 'running', label: 'Corrida', icon: Timer },
          { id: 'taf_plan', label: 'Plano', icon: Target },
          { id: 'more', label: 'Mais', icon: Menu, isAction: true },
        ].map((item) => {
          const Icon = item.icon;
          const isTabActive = !item.isAction && activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-tab-${item.id}`}
              type="button"
              onClick={() => {
                if (item.isAction) {
                  setMoreSheetOpen(true);
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-[12px] relative transition-colors cursor-pointer ${
                isTabActive ? 'text-[#7C6CFF]' : 'text-[#9AA1AD] hover:text-[#F2F3F5]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 stroke-[1.8] ${isTabActive ? 'text-[#7C6CFF]' : 'text-[#9AA1AD]'}`} />
                {item.hasBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#7C6CFF] animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] font-medium tracking-tight mt-1 ${isTabActive ? 'text-[#7C6CFF] font-semibold' : 'text-[#9AA1AD]'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* MOBILE BOTTOM SHEET FOR "MAIS" */}
      <AnimatePresence>
        {moreSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm lg:hidden">
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full bg-[#15171C] border-t border-[rgba(255,255,255,0.07)] rounded-t-[24px] p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              {/* Grab handle */}
              <div className="w-10 h-1.5 bg-[#6B7280]/40 rounded-full mx-auto" />

              {/* User Identity inside Sheet */}
              <div className="p-3.5 rounded-[18px] bg-[#1C1F26] border border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                {currentUser ? (
                  <div className="flex items-center gap-3 min-w-0">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Avatar"
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full border border-[rgba(255,255,255,0.1)] shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#7C6CFF]/20 text-[#7C6CFF] font-semibold flex items-center justify-center text-[14px] shrink-0">
                        {(currentUser.displayName || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <p className="text-[14px] font-semibold text-[#F2F3F5] truncate">
                        {currentUser.displayName || 'Atleta'}
                      </p>
                      <p className="text-[12px] text-[#9AA1AD] truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-left">
                    <span className="text-[12px] font-medium text-[#F5B84B] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F5B84B]" />
                      Modo Convidado / Offline
                    </span>
                    <p className="text-[11px] text-[#6B7280]">
                      Seus dados estão salvos no navegador.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setMoreSheetOpen(false)}
                  className="p-2 text-[#9AA1AD] hover:text-[#F2F3F5] rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sheet Navigation List */}
              <div className="space-y-1">
                {[
                  { id: 'history', label: 'Histórico de treinos', icon: History },
                  { id: 'exercises', label: 'Exercícios', icon: TrendingUp },
                  { id: 'weight', label: 'Peso corporal', icon: Scale },
                  { id: 'cycle', label: 'Ciclo de treino', icon: Activity },
                  ...(currentUser && currentUser.email === 'glaydson.rodrigues30@gmail.com'
                    ? [{ id: 'admin', label: 'Painel Admin', icon: Lock }]
                    : [])
                ].map((item) => {
                  const Icon = item.icon;
                  const isTabActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMoreSheetOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-3.5 rounded-[16px] text-[14px] font-medium transition cursor-pointer ${
                        isTabActive
                          ? 'bg-[#1C1F26] text-[#7C6CFF]'
                          : 'text-[#F2F3F5] hover:bg-[#1C1F26]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 stroke-[1.75] ${isTabActive ? 'text-[#7C6CFF]' : 'text-[#9AA1AD]'}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                    </button>
                  );
                })}
              </div>

              {/* Action: Sair or Sincronizar */}
              <div className="pt-2 border-t border-[rgba(255,255,255,0.07)]">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreSheetOpen(false);
                      handleLogoutClick();
                    }}
                    className="w-full min-h-[48px] rounded-[14px] bg-[#1C1F26] hover:bg-[#222630] text-[#FF6B6B] text-[14px] font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair da conta</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsGuest(false);
                      localStorage.removeItem('hevyfit_is_guest');
                      setMoreSheetOpen(false);
                    }}
                    className="w-full min-h-[48px] rounded-[14px] bg-[#7C6CFF] hover:bg-[#8E80FF] text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>Entrar / Sincronizar conta</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRIMARY CONTENT AREA PANEL */}
      <main className="flex-grow max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28 lg:pb-12">
        
        {/* Render switcher active subview tab */}
        {activeTab === 'dashboard' && (
          <Dashboard
            history={history}
            weightHistory={weightHistory}
            currentCycle={currentCycle}
            routines={routines}
            runs={runs}
            activeWorkout={activeWorkout}
            currentUser={currentUser}
            onNavigate={(tab) => setActiveTab(tab)}
            onStartWorkout={handleStartWorkout}
            onStartEmptyWorkout={() => handleStartWorkout('Treino Avulso')}
            onAddWeight={handleAddWeight}
            onStartRunFromTaf={handleStartRunFromTaf}
            onCancelActiveWorkout={handleCancelWorkout}
          />
        )}

        {activeTab === 'train' && (
          <WorkoutLog
            activeWorkout={activeWorkout}
            history={history}
            onStartWorkout={handleStartWorkout}
            onCancelWorkout={handleCancelWorkout}
            onFinishWorkout={handleFinishWorkout}
            onUpdateActiveWorkout={async (w) => {
              setActiveWorkout(w);
              if (currentUser && auth.currentUser) {
                try {
                  await setDoc(doc(db, 'users', currentUser.uid), {
                    activeWorkout: w
                  }, { merge: true });
                } catch (error) {
                  console.error('Error auto-saving active workout:', error);
                }
              }
            }}
            onTriggerRestTimer={handleTriggerRestTimer}
            availableExercises={exercises}
            onAddExercise={handleAddExercise}
            onUpdateExercise={handleUpdateExercise}
            routines={routines}
            onAddRoutine={async (newRoutine) => {
              const updated = [...routines, newRoutine];
              setRoutines(updated);
              if (currentUser && auth.currentUser) {
                try {
                  await setDoc(doc(db, 'users', currentUser.uid), {
                    routines: updated
                  }, { merge: true });
                } catch (error) {
                  console.error('Error saving routine to Firebase:', error);
                }
              }
            }}
            onUpdateRoutine={async (updatedRoutine) => {
              const updated = routines.map(r => r.id === updatedRoutine.id ? updatedRoutine : r);
              setRoutines(updated);
              if (currentUser && auth.currentUser) {
                try {
                  await setDoc(doc(db, 'users', currentUser.uid), {
                    routines: updated
                  }, { merge: true });
                } catch (error) {
                  console.error('Error updating routine in Firebase:', error);
                }
              }
            }}
            onDeleteRoutine={async (id) => {
              const updated = routines.filter(r => r.id !== id);
              setRoutines(updated);
              if (currentUser && auth.currentUser) {
                try {
                  await setDoc(doc(db, 'users', currentUser.uid), {
                    routines: updated
                  }, { merge: true });
                } catch (error) {
                  console.error('Error deleting routine from Firebase:', error);
                }
              }
            }}
          />
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Histórico de Treinos</h2>
                <p className="text-xs text-slate-400">Suas sessões de treino passadas com os logs estilo Hevy.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-850">
                  <button
                    type="button"
                    id="btn-history-subtab-feed"
                    onClick={() => setHistorySubTab('feed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      historySubTab === 'feed'
                        ? 'bg-slate-850 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Feed de Treinos
                  </button>
                  <button
                    type="button"
                    id="btn-history-subtab-report"
                    onClick={() => setHistorySubTab('report')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-all ${
                      historySubTab === 'report'
                        ? 'bg-[#7C6CFF] text-white font-medium shadow-sm shadow-[#7C6CFF]/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Progresso Semanal</span>
                  </button>
                </div>
                <span className="hidden sm:inline-block text-xs text-slate-500 font-mono font-bold bg-slate-900 border border-slate-850 px-2.5 py-1.5 rounded-xl">
                  {history.length} sessões
                </span>
              </div>
            </div>

            {historySubTab === 'report' ? (
              <WeeklyReport history={history} availableExercises={exercises} />
            ) : history.length === 0 ? (
              <div className="text-center p-12 bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] flex flex-col items-center">
                <History className="w-12 h-12 text-[#9AA1AD]/40 mb-3" />
                <span className="text-[15px] font-semibold text-[#F2F3F5]">Nenhum treino no feed</span>
                <span className="text-[13px] text-[#9AA1AD] max-w-xs mt-1 leading-relaxed">
                  Sua lista está vazia. Assim que você finalizar um treino, os logs de séries e cargas aparecerão aqui.
                </span>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const getWeekStartTimestamp = (timestamp: number) => {
                    const d = new Date(timestamp);
                    const day = d.getDay();
                    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                    const monday = new Date(d);
                    monday.setDate(diff);
                    monday.setHours(0, 0, 0, 0);
                    return monday.getTime();
                  };

                  const formatWeekLabel = (mondayTimestamp: number) => {
                    const now = new Date();
                    const currentMonday = getWeekStartTimestamp(now.getTime());
                    const lastMonday = currentMonday - 7 * 24 * 60 * 60 * 1000;

                    if (mondayTimestamp === currentMonday) {
                      return 'Esta semana';
                    }
                    if (mondayTimestamp === lastMonday) {
                      return 'Semana passada';
                    }

                    const monday = new Date(mondayTimestamp);
                    const sunday = new Date(mondayTimestamp + 6 * 24 * 60 * 60 * 1000);
                    const startStr = monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    const endStr = sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    return `Semana de ${startStr} a ${endStr}`;
                  };

                  const calculateWorkoutVolume = (w: WorkoutHistory) => {
                    return w.exercises.reduce((total, ex) => {
                      return total + ex.sets.reduce((setTotal, s) => {
                        const weight = typeof s.weight === 'number' ? s.weight : 0;
                        const reps = typeof s.reps === 'number' ? s.reps : parseInt(String(s.reps || 0), 10) || 0;
                        return setTotal + (weight * reps);
                      }, 0);
                    }, 0);
                  };

                  const groups: { weekStart: number; label: string; workouts: WorkoutHistory[] }[] = [];
                  const sorted = [...history].sort((a, b) => b.startTime - a.startTime);

                  sorted.forEach(workout => {
                    const weekStart = getWeekStartTimestamp(workout.startTime);
                    let group = groups.find(g => g.weekStart === weekStart);
                    if (!group) {
                      group = {
                        weekStart,
                        label: formatWeekLabel(weekStart),
                        workouts: []
                      };
                      groups.push(group);
                    }
                    group.workouts.push(workout);
                  });

                  return groups.map((group) => (
                    <div key={group.weekStart} className="space-y-3">
                      {/* Week Header */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#7C6CFF]" />
                          <h3 className="text-[13px] font-semibold text-[#F2F3F5] tracking-wide">
                            {group.label}
                          </h3>
                        </div>
                        <span className="text-[12px] text-[#9AA1AD] tabular-nums">
                          {group.workouts.length} {group.workouts.length === 1 ? 'treino' : 'treinos'}
                        </span>
                      </div>

                      {/* Workouts in this week */}
                      <div className="space-y-3">
                        {group.workouts.map((workout) => {
                          const durationStr = formatDurationStr(workout.durationMs);
                          const totalSetsCount = workout.exercises.reduce((acc, curr) => acc + curr.sets.length, 0);
                          const totalVolume = calculateWorkoutVolume(workout);
                          const isExpanded = !!expandedWorkoutIds[workout.id];
                          const isInlineEditing = inlineEditingWorkoutId === workout.id;

                          return (
                            <div
                              key={workout.id}
                              className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-4 sm:p-5 hover:border-[rgba(255,255,255,0.12)] transition"
                            >
                              {/* Header clickable to expand/collapse */}
                              <div
                                onClick={() => {
                                  if (!isInlineEditing) {
                                    setExpandedWorkoutIds(prev => ({ ...prev, [workout.id]: !prev[workout.id] }));
                                  }
                                }}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <span className="text-[12px] text-[#9AA1AD] block lowercase">
                                      {new Date(workout.startTime).toLocaleDateString('pt-BR', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long'
                                      })}
                                    </span>
                                    <h4 className="font-semibold text-[#F2F3F5] text-[16px]">{workout.name}</h4>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {workout.cycleWeek && (
                                      <span className="px-2 py-0.5 bg-[#7C6CFF]/10 border border-[#7C6CFF]/20 text-[#7C6CFF] rounded-md text-[11px] font-medium">
                                        Semana {workout.cycleWeek}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                                      className="w-8 h-8 rounded-full bg-[#1C1F26] flex items-center justify-center text-[#9AA1AD] hover:text-[#F2F3F5] transition shrink-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="w-4 h-4 rotate-180 transition-transform" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 transition-transform" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Clean metrics badges */}
                                <div className="flex flex-wrap items-center gap-2 pt-3 text-[12px] text-[#9AA1AD] tabular-nums">
                                  <span className="px-2.5 py-1 rounded-[10px] bg-[#1C1F26] text-[#F2F3F5] font-medium flex items-center gap-1.5">
                                    <span>⏱️</span>
                                    <span>{durationStr}</span>
                                  </span>
                                  <span className="px-2.5 py-1 rounded-[10px] bg-[#1C1F26] text-[#F2F3F5] font-medium flex items-center gap-1.5">
                                    <span>🏋️</span>
                                    <span>{totalVolume > 0 ? `${totalVolume.toLocaleString('pt-BR')} kg` : '0 kg'}</span>
                                  </span>
                                  <span className="px-2.5 py-1 rounded-[10px] bg-[#1C1F26] text-[#9AA1AD] flex items-center gap-1.5">
                                    <span>{totalSetsCount} séries</span>
                                  </span>
                                </div>
                              </div>

                              {/* Expandable workout detail */}
                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] space-y-3">
                                  {workout.comments && (
                                    <div className="text-[13px] bg-[#1C1F26] p-3 rounded-[12px] border border-[rgba(255,255,255,0.05)] text-[#9AA1AD] italic">
                                      "{workout.comments}"
                                    </div>
                                  )}

                                  {/* List of exercise markers */}
                                  <div className="space-y-2.5">
                                    {workout.exercises.map((ex, exIdx) => {
                                      const details = exercises.find(e => e.id === ex.exerciseId);
                                      const currentEditEx = inlineEditingExercises.find(e => e.exerciseId === ex.exerciseId);

                                      return (
                                        <div key={exIdx} className="bg-[#1C1F26]/70 p-3 rounded-[14px] border border-[rgba(255,255,255,0.04)] space-y-2">
                                          <span className="text-[13px] text-[#F2F3F5] font-semibold block">
                                            {(details?.name || ex.exerciseId) || 'Sem nome'}
                                          </span>

                                          <div className="flex flex-wrap gap-2 pt-0.5">
                                            {isInlineEditing && currentEditEx ? (
                                              currentEditEx.sets.map((s, sIdx) => (
                                                <div
                                                  key={sIdx}
                                                  className="px-2 py-1 bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[10px] text-[#F2F3F5] tabular-nums text-[12px] flex items-center gap-1.5"
                                                >
                                                  <span className="text-[#6B7280] font-medium">#{sIdx + 1}</span>
                                                  <div className="flex items-center gap-1">
                                                    <input
                                                      type="number"
                                                      step="any"
                                                      value={s.weight !== null ? s.weight : ''}
                                                      onChange={(e) => {
                                                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                                        const updated = [...inlineEditingExercises];
                                                        const exToUpdate = updated.find(u => u.exerciseId === ex.exerciseId);
                                                        if (exToUpdate) {
                                                          exToUpdate.sets[sIdx].weight = val;
                                                        }
                                                        setInlineEditingExercises(updated);
                                                      }}
                                                      className="w-11 bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded text-center text-[12px] text-[#F2F3F5] focus:outline-none focus:border-[#7C6CFF] p-0.5"
                                                      placeholder="0"
                                                    />
                                                    <span className="text-[#6B7280] text-[10px]">kg</span>
                                                    <span className="text-[#9AA1AD] font-medium">×</span>
                                                    <input
                                                      type="text"
                                                      value={s.reps ?? ''}
                                                      onChange={(e) => {
                                                        const updated = [...inlineEditingExercises];
                                                        const exToUpdate = updated.find(u => u.exerciseId === ex.exerciseId);
                                                        if (exToUpdate) {
                                                          exToUpdate.sets[sIdx].reps = e.target.value;
                                                        }
                                                        setInlineEditingExercises(updated);
                                                      }}
                                                      className="w-9 bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded text-center text-[12px] text-[#F2F3F5] focus:outline-none focus:border-[#7C6CFF] p-0.5"
                                                      placeholder="0"
                                                    />
                                                  </div>
                                                  {s.type === 'Aquecimento' && <span className="text-[#F5B84B] text-[9px] uppercase font-bold leading-none">Aq.</span>}
                                                  {s.type === 'Adaptação' && <span className="text-sky-400 text-[9px] uppercase font-bold leading-none">Ad.</span>}
                                                  {s.type === 'Trabalho' && <span className="text-[#7C6CFF] text-[9px] uppercase font-bold leading-none">Tr.</span>}
                                                </div>
                                              ))
                                            ) : (
                                              ex.sets.map((s, sIdx) => (
                                                <div
                                                  key={sIdx}
                                                  className="px-2.5 py-1 bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[10px] text-[#F2F3F5] tabular-nums text-[12px] flex items-center gap-1.5"
                                                >
                                                  <span className="text-[#6B7280] font-medium">#{sIdx + 1}</span>
                                                  <span>{s.weight}kg × {s.reps}</span>
                                                  {s.type === 'Aquecimento' && <span className="text-[#F5B84B] text-[9px] uppercase font-bold leading-none">Aq.</span>}
                                                  {s.type === 'Adaptação' && <span className="text-sky-400 text-[9px] uppercase font-bold leading-none">Ad.</span>}
                                                  {s.type === 'Trabalho' && <span className="text-[#7C6CFF] text-[9px] uppercase font-bold leading-none">Tr.</span>}
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Actions Row */}
                                  <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {isInlineEditing ? (
                                        <>
                                          <button
                                            id={`btn-save-inline-edit-${workout.id}`}
                                            onClick={() => handleSaveInlineEditWorkout(workout.id)}
                                            className="flex items-center gap-1 text-[11px] bg-[#7C6CFF] hover:bg-[#8E80FF] text-white font-medium py-1.5 px-3 rounded-[10px] transition cursor-pointer"
                                          >
                                            <span>Salvar alterações</span>
                                          </button>
                                          <button
                                            id={`btn-cancel-inline-edit-${workout.id}`}
                                            onClick={() => {
                                              setInlineEditingWorkoutId(null);
                                              setInlineEditingExercises([]);
                                            }}
                                            className="flex items-center gap-1 text-[11px] bg-[#1C1F26] hover:bg-[#252a35] text-[#9AA1AD] hover:text-[#F2F3F5] font-medium py-1.5 px-3 rounded-[10px] transition cursor-pointer"
                                          >
                                            <span>Cancelar</span>
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            id={`btn-edit-history-direct-${workout.id}`}
                                            onClick={() => {
                                              setInlineEditingWorkoutId(workout.id);
                                              setInlineEditingExercises(JSON.parse(JSON.stringify(workout.exercises)));
                                            }}
                                            className="flex items-center gap-1.5 text-[12px] text-[#7C6CFF] hover:text-[#8E80FF] font-medium py-1.5 px-2.5 rounded-[10px] hover:bg-[#1C1F26] transition cursor-pointer"
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                            <span>Editar Treino</span>
                                          </button>
                                          <button
                                            id={`btn-edit-history-${workout.id}`}
                                            onClick={() => handleStartEditWorkout(workout)}
                                            className="flex items-center gap-1.5 text-[12px] text-[#9AA1AD] hover:text-[#F2F3F5] font-medium py-1.5 px-2.5 rounded-[10px] hover:bg-[#1C1F26] transition cursor-pointer"
                                          >
                                            <span>Campos / Data</span>
                                          </button>
                                        </>
                                      )}
                                    </div>

                                    <button
                                      id={`btn-delete-history-${workout.id}`}
                                      onClick={() => setWorkoutToDelete(workout)}
                                      className="flex items-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#FF6B6B] font-medium transition-colors py-1.5 px-2.5 rounded-[10px] hover:bg-[#FF6B6B]/10 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Excluir Treino</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'running' && (
          <RunningTracker
            runs={runs}
            onSaveRun={handleSaveRun}
            onDeleteRun={handleDeleteRun}
            onNavigateToTafPlan={() => setActiveTab('taf_plan')}
            initialPrefill={pendingTafRun}
            onClearPrefill={() => setPendingTafRun(null)}
          />
        )}

        {activeTab === 'taf_plan' && (
          <TafPlanView
            runs={runs}
            onStartRunFromTaf={handleStartRunFromTaf}
            onNavigateToRuns={() => setActiveTab('running')}
          />
        )}

        {activeTab === 'exercises' && (
          <ExerciseProgression
            history={history}
            availableExercises={exercises}
            onAddExercise={handleAddExercise}
            onUpdateExercise={handleUpdateExercise}
            onDeleteExercise={handleDeleteExercise}
            standardWorkouts={standardWorkouts}
            onAddStandardWorkout={handleAddStandardWorkout}
            onDeleteStandardWorkout={handleDeleteStandardWorkout}
          />
        )}

        {activeTab === 'weight' && (
          <WeightTracker
            weightHistory={weightHistory}
            onAddWeight={handleAddWeight}
            onUpdateWeight={handleUpdateWeight}
            onDeleteWeight={handleDeleteWeight}
            goalWeight={currentCycle?.goalWeight}
          />
        )}

        {activeTab === 'cycle' && (
          <CycleSettings
            currentCycle={currentCycle}
            onSaveCycle={async (cycle) => {
              setCurrentCycle(cycle);
              if (currentUser && auth.currentUser) {
                try {
                  await setDoc(doc(db, 'users', currentUser.uid), {
                    currentCycle: cycle
                  }, { merge: true });
                } catch (error) {
                  console.error('Error saving cycle to Firebase:', error);
                }
              }
            }}
            onRestartCycle={async () => {
              setCurrentCycle(null);
              if (currentUser && auth.currentUser) {
                try {
                  await setDoc(doc(db, 'users', currentUser.uid), {
                    currentCycle: null
                  }, { merge: true });
                } catch (error) {
                  console.error('Error resetting cycle in Firebase:', error);
                }
              }
            }}
          />
        )}

        {activeTab === 'admin' && currentUser?.email === 'glaydson.rodrigues30@gmail.com' && (
          <AdminView
            currentUser={currentUser}
            availableExercises={exercises}
          />
        )}

      </main>

      {/* Floating Global Rest Timer countdown box */}
      <AnimatePresence>
        {showTimer && timerRemaining > 0 && (
          <RestTimerOverlay
            timerRemaining={timerRemaining}
            timerTotal={timerTotal}
            isTimerActive={isTimerActive}
            onClose={() => setShowTimer(false)}
            onToggleActive={handleToggleTimerActive}
            onReset={handleResetTimer}
            onAdjustTime={handleAdjustTimerValue}
          />
        )}
      </AnimatePresence>

      {/* FULL SCREEN CELEBRATION MODAL ON SUCCESSFUL FINISH */}
      <AnimatePresence>
        {showCelebration && lastFinishedWorkoutStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-hidden align-middle">
            <motion.div
              id="celebration-box"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm text-center relative p-8 bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[24px] shadow-2xl relative"
            >
              <div className="absolute top-0 inset-x-0 flex justify-center -translate-y-12">
                <div className="w-22 h-22 bg-gradient-to-br from-[#7C6CFF] to-[#6A5BF0] rounded-full flex items-center justify-center text-white font-bold border-6 border-[#15171C] shadow-xl shadow-[#7C6CFF]/30">
                  <Trophy className="w-9 h-9 animate-bounce" />
                </div>
              </div>

              <div className="space-y-1.5 pt-12">
                <div className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#7C6CFF]">
                  <Sparkles className="w-4 h-4" />
                  <span>Treino Concluído!</span>
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-[20px] text-[#F2F3F5] truncate">{lastFinishedWorkoutStats.name}</h4>
                <p className="text-[13px] text-[#9AA1AD] max-w-xs mx-auto">Parabéns por registrar mais uma sessão de treinos. Sua constância gera grandes resultados!</p>
              </div>

              <div className="grid grid-cols-3 gap-2 py-4 my-4 border-y border-[rgba(255,255,255,0.07)] bg-[#1C1F26] p-3 rounded-[16px]">
                <div>
                  <span className="text-[11px] text-[#6B7280] font-medium block">Duração</span>
                  <p className="font-semibold tabular-nums text-[#F2F3F5] text-[16px]">{lastFinishedWorkoutStats.durationMins} min</p>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B7280] font-medium block">Volume</span>
                  <p className="font-semibold tabular-nums text-[#7C6CFF] text-[16px]">{lastFinishedWorkoutStats.volume} kg</p>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B7280] font-medium block">Séries</span>
                  <p className="font-semibold tabular-nums text-[#F2F3F5] text-[16px]">{lastFinishedWorkoutStats.sets}</p>
                </div>
              </div>

              <button
                id="btn-close-celebration"
                onClick={() => {
                  setShowCelebration(false);
                  setLastFinishedWorkoutStats(null);
                }}
                className="w-full min-h-[48px] bg-gradient-to-r from-[#7C6CFF] to-[#6A5BF0] hover:from-[#8E80FF] hover:to-[#7C6CFF] rounded-[14px] text-white font-semibold text-[14px] transition cursor-pointer shadow-lg shadow-[#7C6CFF]/20"
              >
                Concluir e Voltar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PARA EDITAR TREINO DO HISTÓRICO (INCLUINDO ALTERAR A DATA RETROATIVA) */}
      <AnimatePresence>
        {editingWorkout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div
              id="edit-workout-modal"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[20px] p-6 w-full max-w-md shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.07)] pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#7C6CFF]" />
                  <h3 className="font-semibold text-[#F2F3F5] text-[16px]">Editar Sessão de Treino</h3>
                </div>
                <button
                  id="btn-close-edit-modal"
                  onClick={() => setEditingWorkout(null)}
                  className="text-[#9AA1AD] hover:text-[#F2F3F5] p-1.5 rounded-[8px] hover:bg-[#1C1F26] transition cursor-pointer"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditWorkout} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#9AA1AD] mb-1.5">
                    Nome do Treino
                  </label>
                  <input
                    id="edit-workout-name"
                    type="text"
                    value={editWorkoutName}
                    onChange={(e) => setEditWorkoutName(e.target.value)}
                    className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3.5 py-2.5 text-[14px] text-[#F2F3F5] focus:outline-none focus:border-[#7C6CFF]"
                    placeholder="Nome do Treino"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#9AA1AD] mb-1.5">
                    Data e Hora do Treino
                  </label>
                  <input
                    id="edit-workout-date"
                    type="datetime-local"
                    value={editWorkoutDateStr}
                    onChange={(e) => setEditWorkoutDateStr(e.target.value)}
                    className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3.5 py-2.5 text-[14px] text-[#F2F3F5] focus:outline-none focus:border-[#7C6CFF] font-mono"
                    required
                  />
                  <p className="text-[11px] text-[#6B7280] mt-1">
                    Ajuste este campo para alterar a data deste treino para o passado (registro retroativo).
                  </p>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#9AA1AD] mb-1.5">
                    Duração em Minutos
                  </label>
                  <input
                    id="edit-workout-duration"
                    type="number"
                    min="1"
                    max="1440"
                    value={editWorkoutDurationMins}
                    onChange={(e) => setEditWorkoutDurationMins(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3.5 py-2.5 text-[14px] text-[#F2F3F5] focus:outline-none focus:border-[#7C6CFF] tabular-nums"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#9AA1AD] mb-1.5">
                    Comentários / Notas (Opcional)
                  </label>
                  <textarea
                    id="edit-workout-comments"
                    value={editWorkoutComments}
                    onChange={(e) => setEditWorkoutComments(e.target.value)}
                    className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3.5 py-2.5 text-[14px] text-[#F2F3F5] focus:outline-none focus:border-[#7C6CFF] h-20 resize-none"
                    placeholder="Notas ou comentários sobre o desempenho no treino..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    id="btn-cancel-edit-form"
                    type="button"
                    onClick={() => setEditingWorkout(null)}
                    className="min-h-[48px] bg-[#1C1F26] hover:bg-[#252a35] text-[#9AA1AD] hover:text-[#F2F3F5] font-medium rounded-[14px] text-[13px] transition cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    id="btn-save-edit-form"
                    type="submit"
                    className="min-h-[48px] bg-gradient-to-r from-[#7C6CFF] to-[#6A5BF0] hover:from-[#8E80FF] hover:to-[#7C6CFF] text-white font-medium rounded-[14px] text-[13px] transition cursor-pointer shadow-md shadow-[#7C6CFF]/20"
                  >
                    Salvar Ajustes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PARA CONFIRMAR EXCLUSÃO DE TREINO */}
      <AnimatePresence>
        {workoutToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              id="delete-workout-modal"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[20px] max-w-sm w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="space-y-1.5">
                <h4 className="text-[17px] font-semibold text-[#F2F3F5]">Excluir treino?</h4>
                <p className="text-[13px] text-[#9AA1AD] leading-relaxed">
                  Tem certeza de que deseja excluir o treino <strong className="text-[#F2F3F5] font-medium">{workoutToDelete.name}</strong>? Essa ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  id="btn-cancel-delete-modal"
                  onClick={() => setWorkoutToDelete(null)}
                  className="min-h-[44px] px-4 rounded-[12px] bg-[#1C1F26] text-[#F2F3F5] text-[13px] font-medium hover:bg-[#252a35] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-modal"
                  onClick={async () => {
                    const idToDelete = workoutToDelete.id;
                    const updated = history.filter(w => w.id !== idToDelete);
                    setHistory(updated);
                    if (currentUser && auth.currentUser) {
                      try {
                        await setDoc(doc(db, 'users', currentUser.uid), {
                          workouts: updated,
                          history: updated
                        }, { merge: true });
                      } catch (error) {
                        console.error('Error deleting workout in Firebase:', error);
                      }
                    }
                    setWorkoutToDelete(null);
                  }}
                  className="min-h-[44px] px-4 rounded-[12px] bg-[#FF6B6B] hover:bg-[#ff5252] text-white text-[13px] font-semibold transition cursor-pointer shadow-sm shadow-[#FF6B6B]/20"
                >
                  Sim, excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
