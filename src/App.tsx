/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Lock
} from 'lucide-react';
import { ActiveWorkout, Exercise, SetType, TrainingCycle, WeightEntry, WorkoutHistory, WorkoutRoutine, StandardWorkout, StandardExercise } from './types';
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
import { onAuthStateChanged } from 'firebase/auth';
import { auth, logOut, db } from './lib/firebase';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import {
  handleFirestoreError,
  OperationType
} from './lib/firebaseSync';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Auth and Guest States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Navigation with URL pathname/hash synchronization
  const [activeTab, setActiveTab] = useState<string>(() => {
    const path = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
    const hash = window.location.hash.replace(/^#\/?/g, '').toLowerCase();
    const validTabs = [
      'dashboard',
      'train',
      'history',
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

  // Sync activeTab with URL & perform admin security validation
  useEffect(() => {
    const validTabs = [
      'dashboard',
      'train',
      'history',
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
        window.history.pushState({ tab: activeTab }, '', path);
      }
    }
  }, [activeTab, currentUser, authLoading]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
      const hash = window.location.hash.replace(/^#\/?/g, '').toLowerCase();
      const validTabs = [
        'dashboard',
        'train',
        'history',
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
  const [isLoaded, setIsLoaded] = useState(false);

  // Delete confirm state for workouts history
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);

  // Rest Timer States - managed globally to stay active while exploring other tabs
  const [timerTotal, setTimerTotal] = useState(90);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

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
                targetFocus: 'Ganho de Massa Muscular',
                goalWeight: 78.5
              },
              exercises: INITIAL_EXERCISES,
              activeWorkout: null,
              standardWorkouts: []
            };

            await setDoc(userDocRef, initialUserData);
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
        setCurrentUser(null);
        setAuthLoading(false);
        setIsLoaded(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Set default guest memory data when offline mode is requested
  useEffect(() => {
    if (!currentUser && isGuest) {
      setHistory(INITIAL_HISTORY);
      setWeightHistory(INITIAL_WEIGHT_HISTORY);
      setCurrentCycle({
        id: 'cycle_default',
        name: 'Block de Hipertrofia do Inverno',
        durationWeeks: 8,
        currentWeek: 2,
        startDate: Date.now() - 10 * 24 * 60 * 60 * 1000,
        targetFocus: 'Ganho de Massa Muscular',
        goalWeight: 78.5
      });
      setExercises(INITIAL_EXERCISES);
      setRoutines(INITIAL_ROUTINES);
      setActiveWorkout(null);
    }
  }, [currentUser, isGuest]);

  // Real-time Firestore synchronization for unified server data across all devices
  useEffect(() => {
    if (!currentUser) return;

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
    setActiveTab('treinar'); // Switch to Train tab immediately

    if (currentUser) {
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
    if (currentUser) {
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
      cycleWeek: currentCycle?.currentWeek || undefined
    };

    const updatedHistory = [...history, completedHistoryEntry];
    setHistory(updatedHistory);

    // Save to Firestore if user is authenticated
    if (currentUser) {
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

    if (currentUser) {
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

    if (currentUser) {
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

    if (currentUser) {
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
    if (currentUser) {
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
    if (currentUser) {
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
    if (currentUser) {
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
    if (currentUser) {
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
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          standardWorkouts: updated
        }, { merge: true });
      } catch (error) {
        console.error('Error deleting standardized workout in Firebase:', error);
      }
    }
  };

  // Logout handler
  const handleLogoutClick = async () => {
    try {
      await logOut();
      setCurrentUser(null);
      setIsGuest(false);
      localStorage.removeItem('hevyfit_is_guest');
      // Reset to original mock memory loads
      setHistory(INITIAL_HISTORY);
      setWeightHistory(INITIAL_WEIGHT_HISTORY);
      setCurrentCycle({
        id: 'cycle_default',
        name: 'Block de Hipertrofia do Inverno',
        durationWeeks: 8,
        currentWeek: 2,
        startDate: Date.now() - 10 * 24 * 60 * 60 * 1000,
        targetFocus: 'Ganho de Massa Muscular',
        goalWeight: 78.5
      });
      setRoutines(INITIAL_ROUTINES);
      setActiveWorkout(null);
    } catch (e) {
      console.error('Falha ao deslogar:', e);
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-2xl flex items-center justify-center border border-lime-400/20 shadow-xl shadow-lime-500/10">
          <Dumbbell className="w-6 h-6 text-slate-950 stroke-[2.5] animate-spin" style={{ animationDuration: '2.5s' }} />
        </div>
        <p className="text-xs text-slate-400 font-mono tracking-wider font-bold uppercase animate-pulse">Carregando HevyFit...</p>
      </div>
    );
  }

  if (!currentUser && !isGuest) {
    return (
      <Login
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
        onContinueOffline={() => {
          setIsGuest(true);
          localStorage.setItem('hevyfit_is_guest', 'true');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Main Navigation Bar panel */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 py-4 flex items-center justify-between">
        
        {/* Brand identity logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-lime-500/10">
            <Dumbbell className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-widest font-mono">
              HEVY<span className="text-lime-400 font-sans">FIT</span>
            </h1>
            <span className="text-[9px] text-slate-550 block font-mono">Personal Workout Log</span>
          </div>
        </div>

        {/* Global Workout status info pill */}
        {activeWorkout && activeTab !== 'train' && (
          <button
            id="global-active-workout-header-pill"
            onClick={() => setActiveTab('train')}
            className="flex items-center gap-2 bg-lime-500/10 border border-lime-500/20 px-3 py-1.5 rounded-full hover:bg-lime-500/15 transition animate-pulse duration-1000 select-none cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-lime-400" />
            <span className="text-[11px] font-semibold text-lime-300">Treino em Andamento...</span>
          </button>
        )}

        {/* Desktop inline Menu navigation triggers */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { id: 'dashboard', label: TEXTS.dashboard, icon: Activity },
            { id: 'train', label: TEXTS.train, icon: Dumbbell },
            { id: 'history', label: TEXTS.history, icon: History },
            { id: 'exercises', label: TEXTS.exercises, icon: TrendingUp },
            { id: 'weight', label: TEXTS.weight, icon: Scale },
            { id: 'cycle', label: TEXTS.cycle, icon: Calendar },
            ...(currentUser && currentUser.email === 'glaydson.rodrigues30@gmail.com'
              ? [{ id: 'admin', label: TEXTS.admin || 'Admin', icon: Lock }]
              : [])
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-trigger-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isTabActive
                    ? 'bg-slate-900 border border-slate-800 text-lime-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile / Logout section */}
        <div className="hidden md:flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2.5 border-l border-slate-800 pl-4 py-1">
              <img
                src={currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80'}
                alt={currentUser.displayName || 'User'}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full border border-slate-800"
              />
              <div className="max-w-[120px] text-left leading-tight">
                <p className="text-[10px] font-bold text-white truncate leading-none">{currentUser.displayName || 'Atleta'}</p>
                <button
                  id="btn-desktop-logout"
                  onClick={handleLogoutClick}
                  className="text-[9px] font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-wider block mt-1"
                >
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 border-l border-slate-800 pl-4 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <div className="text-left leading-tight">
                <span className="text-[9px] font-bold text-amber-500 block leading-none">Modo Convidado</span>
                <button
                  id="btn-desktop-login"
                  onClick={() => {
                    setIsGuest(false);
                    localStorage.removeItem('hevyfit_is_guest');
                  }}
                  className="text-[9px] font-bold text-lime-400 hover:text-lime-300 transition-colors uppercase tracking-wider block mt-1"
                >
                  Sincronizar Conta
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile menu trigger hamburger */}
        <button
          id="btn-mobile-menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 hover:bg-slate-900 rounded-xl transition text-slate-400 hover:text-white animate-fade-in"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer menu list */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-drawer-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-slate-900 bg-slate-950 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2">
              {[
                { id: 'dashboard', label: TEXTS.dashboard, icon: Activity },
                { id: 'train', label: TEXTS.train, icon: Dumbbell },
                { id: 'history', label: TEXTS.history, icon: History },
                { id: 'exercises', label: TEXTS.exercises, icon: TrendingUp },
                { id: 'weight', label: TEXTS.weight, icon: Scale },
                { id: 'cycle', label: TEXTS.cycle, icon: Calendar },
                ...(currentUser && currentUser.email === 'glaydson.rodrigues30@gmail.com'
                  ? [{ id: 'admin', label: TEXTS.admin || 'Admin', icon: Lock }]
                  : [])
              ].map((tab) => {
                const Icon = tab.icon;
                const isTabActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`mobile-tab-trigger-${tab.id}`}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold transition ${
                      isTabActive
                        ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              {/* Mobile profile sync/status bar */}
              <div className="pt-2.5 mt-1.5 border-t border-slate-900">
                {currentUser ? (
                  <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-850/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80'}
                        alt={currentUser.displayName || 'User'}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full border border-slate-800"
                      />
                      <div className="text-left min-w-0 leading-tight">
                        <p className="text-[11px] font-bold text-white truncate">{currentUser.displayName || 'Atleta'}</p>
                        <p className="text-[9px] text-slate-500 truncate">{currentUser.email}</p>
                      </div>
                    </div>
                    <button
                      id="btn-mobile-logout"
                      onClick={() => {
                        handleLogoutClick();
                        setMobileMenuOpen(false);
                      }}
                      className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500 text-red-400 font-bold rounded-lg text-[9px] uppercase transition"
                    >
                      Sair
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-850/50">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <div className="text-left leading-tight">
                        <span className="text-[10px] font-bold text-amber-500">Acesso offline</span>
                        <p className="text-[8px] text-slate-500">Dados salvos no navegador</p>
                      </div>
                    </div>
                    <button
                      id="btn-mobile-login"
                      onClick={() => {
                        setIsGuest(false);
                        localStorage.removeItem('hevyfit_is_guest');
                        setMobileMenuOpen(false);
                      }}
                      className="px-2.5 py-1 bg-lime-500 text-slate-950 font-bold rounded-lg text-[9px] uppercase transition"
                    >
                      Entrar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary content area panel */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 pb-24">
        
        {/* Render switcher active subview tab */}
        {activeTab === 'dashboard' && (
          <Dashboard
            history={history}
            weightHistory={weightHistory}
            currentCycle={currentCycle}
            onNavigate={(tab) => setActiveTab(tab)}
            onStartEmptyWorkout={() => handleStartWorkout('Treino Avulso')}
            onAddWeight={handleAddWeight}
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
              if (currentUser) {
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
              if (currentUser) {
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
              if (currentUser) {
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
              if (currentUser) {
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Histórico de Treinos</h2>
                <p className="text-xs text-slate-400">Suas sessões de treino passadas com os logs estilo Hevy.</p>
              </div>
              <span className="text-xs text-slate-500 font-mono font-bold bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-md">
                {history.length} sessões registradas
              </span>
            </div>

            {history.length === 0 ? (
              <div className="text-center p-12 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col items-center">
                <History className="w-12 h-12 text-slate-700 mb-2" />
                <span className="text-sm font-semibold text-white">Nenhum treino no feed</span>
                <span className="text-xs text-slate-500 max-w-xs mt-1">Sua lista está vazia. Assim que você finalizar um treino, os logs de séries e cargas aparecerão aqui.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {[...history].reverse().map((workout) => {
                  const durationStr = formatDurationStr(workout.durationMs);
                  const totalSetsCount = workout.exercises.reduce((acc, curr) => acc + curr.sets.length, 0);

                  return (
                    <div
                      key={workout.id}
                      className="bg-slate-900 border border-slate-850 rounded-2xl p-5 hover:border-slate-800 transition"
                    >
                      {/* Workout header card */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-850 pb-3 gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-mono tracking-wider font-bold block uppercase">
                            {new Date(workout.startTime).toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                          <h3 className="font-bold text-white text-base font-sans">{workout.name}</h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono pt-1 md:pt-0">
                          <span>⏱️ {durationStr}</span>
                          <span>•</span>
                          <span>🏋️ {totalSetsCount} séries</span>
                          {workout.cycleWeek && (
                            <span className="px-2 py-0.5 bg-lime-500/10 border border-lime-500/15 text-lime-400 rounded-md text-[10px] uppercase font-bold">
                              Semana {workout.cycleWeek} do Bloco
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Workout comment context if exists */}
                      {workout.comments && (
                        <div className="my-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850/50 text-slate-350 italic">
                          " {workout.comments} "
                        </div>
                      )}

                      {/* List of exercise markers */}
                      <div className="space-y-3 mt-4">
                        {workout.exercises.map((ex, exIdx) => {
                          const details = exercises.find(e => e.id === ex.exerciseId);
                          return (
                            <div key={exIdx} className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/40 space-y-2">
                              <span className="text-xs text-slate-200 font-bold block">
                                {(details?.name || ex.exerciseId) || "Sem nome"}
                              </span>
                              
                              {/* Series logs listing in line */}
                              <div className="flex flex-wrap gap-2 pt-0.5">
                                {ex.sets.map((s, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="px-2.5 py-1 bg-slate-900 border border-slate-850 rounded-lg text-slate-300 font-mono text-[10px] flex items-center gap-1.5"
                                  >
                                    <span className="text-slate-500 font-bold">#{sIdx + 1}</span>
                                    <span>{s.weight}kg × {s.reps}</span>
                                    {s.type === 'Aquecimento' && <span className="text-amber-500 text-[8px] uppercase font-bold leading-none">Aq.</span>}
                                    {s.type === 'Adaptação' && <span className="text-sky-400 text-[8px] uppercase font-bold leading-none">Ad.</span>}
                                    {s.type === 'Trabalho' && <span className="text-lime-400 text-[8px] uppercase font-bold leading-none">Tr.</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Historical delete */}
                      <div className="flex justify-end pt-3 mt-2 border-t border-slate-850/30">
                        {deletingWorkoutId === workout.id ? (
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                              Confirmar exclusão?
                            </span>
                            <button
                              id={`btn-confirm-delete-${workout.id}`}
                              onClick={async () => {
                                const updated = history.filter(w => w.id !== workout.id);
                                setHistory(updated);
                                if (currentUser) {
                                  try {
                                    await setDoc(doc(db, 'users', currentUser.uid), {
                                      workouts: updated,
                                      history: updated
                                    }, { merge: true });
                                  } catch (error) {
                                    console.error('Error deleting workout in Firebase:', error);
                                  }
                                }
                                setDeletingWorkoutId(null);
                              }}
                              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 font-bold rounded-lg text-[10px] uppercase transition"
                            >
                              Sim, excluir
                            </button>
                            <button
                              id={`btn-cancel-delete-${workout.id}`}
                              onClick={() => setDeletingWorkoutId(null)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] uppercase transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`btn-delete-history-${workout.id}`}
                            onClick={() => setDeletingWorkoutId(workout.id)}
                            className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-red-400 font-bold uppercase tracking-wider transition-colors py-1 px-2 rounded hover:bg-slate-900"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir Treino</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
              if (currentUser) {
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
              if (currentUser) {
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 overflow-hidden align-middle">
            <motion.div
              id="celebration-box"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm text-center relative p-8 bg-slate-900 border border-slate-850 rounded-3xl shadow-2xl relative"
            >
              <div className="absolute top-0 inset-x-0 flex justify-center -translate-y-12">
                <div className="w-24 h-24 bg-gradient-to-br from-lime-400 to-emerald-400 rounded-full flex items-center justify-center text-slate-950 font-bold border-8 border-slate-950 shadow-xl shadow-lime-500/25">
                  <Trophy className="w-10 h-10 animate-bounce" />
                </div>
              </div>

              <div className="space-y-1 pt-12">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-lime-400 uppercase tracking-widest font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Treino Concluído!</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-bold text-xl text-white font-sans truncate">{lastFinishedWorkoutStats.name}</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">Parabéns por registrar mais uma sessão de treinos. Sua evolução contínua gera grandes resultados!</p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 py-5 my-4 border-y border-slate-850 bg-slate-950/40 p-3 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Duração</span>
                  <p className="font-bold font-mono text-white text-base">{lastFinishedWorkoutStats.durationMins} min</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Volume</span>
                  <p className="font-bold font-mono text-lime-400 text-base">{lastFinishedWorkoutStats.volume} kg</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Séries</span>
                  <p className="font-bold font-mono text-white text-base">{lastFinishedWorkoutStats.sets}</p>
                </div>
              </div>

              <button
                id="btn-close-celebration"
                onClick={() => {
                  setShowCelebration(false);
                  setLastFinishedWorkoutStats(null);
                }}
                className="w-full py-3 bg-lime-500 hover:bg-lime-600 rounded-2xl text-slate-950 font-bold font-sans text-xs transition"
              >
                Concluir e Voltar ao Diário
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
