/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Clipboard, Dumbbell, Trash2, Plus, Check, Undo, Search, Filter, X, ChevronDown, Award, Edit, Printer } from 'lucide-react';
import { ActiveWorkout, Exercise, ExerciseWorkoutState, SetState, SetType, WorkoutHistory, WorkoutRoutine } from '../types';
import { INITIAL_EXERCISES } from '../repositories/mockExercises';
import { motion, AnimatePresence } from 'motion/react';

export const DAYS_OF_WEEK_LABELS: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
  0: 'Domingo',
};

interface WorkoutLogProps {
  activeWorkout: ActiveWorkout | null;
  history: WorkoutHistory[];
  onStartWorkout: (name: string, routineExercises?: WorkoutRoutine['exercises']) => void;
  onCancelWorkout: () => void;
  onFinishWorkout: (comments: string) => void;
  onUpdateActiveWorkout: (workout: ActiveWorkout) => void;
  onTriggerRestTimer: (seconds: number) => void;
  availableExercises: Exercise[];
  routines: WorkoutRoutine[];
  onAddRoutine?: (routine: WorkoutRoutine) => void;
  onUpdateRoutine?: (routine: WorkoutRoutine) => void;
  onDeleteRoutine?: (id: string) => void;
  onAddExercise?: (exercise: Exercise) => void;
  onUpdateExercise?: (exercise: Exercise) => void;
}

export default function WorkoutLog({
  activeWorkout,
  history,
  onStartWorkout,
  onCancelWorkout,
  onFinishWorkout,
  onUpdateActiveWorkout,
  onTriggerRestTimer,
  availableExercises = INITIAL_EXERCISES,
  routines,
  onAddRoutine,
  onUpdateRoutine,
  onDeleteRoutine,
  onAddExercise,
  onUpdateExercise
}: WorkoutLogProps) {
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('Todos');
  const [workoutDurationStr, setWorkoutDurationStr] = useState('00:00');
  const [workoutComments, setWorkoutComments] = useState('');
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Set rest timer duration preference in seconds
  const [restPreference, setRestPreference] = useState(90); // 1:30 is standard

  // Routine Form States
  const [showRoutineFormModal, setShowRoutineFormModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(null);
  const [routineFormName, setRoutineFormName] = useState('');
  const [routineFormDescription, setRoutineFormDescription] = useState('');
  const [routineFormDayOfWeek, setRoutineFormDayOfWeek] = useState<number | null>(null);
  const [routineFormExercises, setRoutineFormExercises] = useState<WorkoutRoutine['exercises']>([]);

  // Sub-modal to select exercise inside routine creator
  const [showAddExerciseToRoutineModal, setShowAddExerciseToRoutineModal] = useState(false);
  const [routineExerciseSearch, setRoutineExerciseSearch] = useState('');

  // Inline Exercise Form State (inside Routine Creator/Editor picker)
  const [showInlineExerciseModal, setShowInlineExerciseModal] = useState(false);
  const [inlineExerciseName, setInlineExerciseName] = useState('');
  const [inlineExerciseCategory, setInlineExerciseCategory] = useState<'Força' | 'Hipertrofia' | 'Cardio' | 'Calistenia'>('Hipertrofia');
  const [inlineExerciseMuscle, setInlineExerciseMuscle] = useState('Peito');
  const [inlineExerciseEquipment, setInlineExerciseEquipment] = useState('Halteres');

  // Routine Delete State
  const [deletingRoutineId, setDeletingRoutineId] = useState<string | null>(null);

  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Exercise Rename States
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingExerciseName, setEditingExerciseName] = useState('');

  const TARGET_MUSCLES_OPTIONS = [
    'Peito',
    'Costas',
    'Pernas',
    'Ombros',
    'Bíceps',
    'Tríceps',
    'Abs',
    'Glúteos',
    'Quadríceps',
    'Posterior',
    'Panturrilha',
    'Trapézio',
    'Antebraço',
    'Cardio',
    'Corpo Inteiro'
  ];

  const EQUIPMENT_OPTIONS = [
    'Barra',
    'Halteres',
    'Polia',
    'Máquina',
    'Peso Corporal',
    'Elástico',
    'Outro'
  ];

  const handleShowInlineExerciseCreator = (preFilledName = '') => {
    setInlineExerciseName(preFilledName || routineExerciseSearch);
    setInlineExerciseCategory('Hipertrofia');
    setInlineExerciseMuscle('Peito');
    setInlineExerciseEquipment('Halteres');
    setShowInlineExerciseModal(true);
  };

  const handleSaveInlineExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineExerciseName.trim()) {
      alert('Por favor, informe o nome do exercício.');
      return;
    }

    const newEx: Exercise = {
      id: 'ex_' + Date.now(),
      name: inlineExerciseName.trim(),
      category: inlineExerciseCategory,
      targetMuscle: inlineExerciseMuscle,
      equipment: inlineExerciseEquipment
    };

    onAddExercise?.(newEx);

    // Auto-select the newly created exercise in the routine!
    handleAddExerciseToRoutine(newEx);

    // Close exercise creator modal and the picker!
    setShowInlineExerciseModal(false);
    setShowAddExerciseToRoutineModal(false);
    setRoutineExerciseSearch('');
  };

  const handleSaveExerciseNameEdit = (exerciseId: string) => {
    if (!editingExerciseName.trim()) {
      alert('O nome do exercício não pode ser vazio.');
      return;
    }
    const exDetails = availableExercises.find(e => e.id === exerciseId);
    if (exDetails) {
      onUpdateExercise?.({
        ...exDetails,
        name: editingExerciseName.trim()
      });
    }
    setEditingExerciseId(null);
    setEditingExerciseName('');
  };

  const handleCreateRoutineTrigger = () => {
    setEditingRoutine(null);
    setRoutineFormName('');
    setRoutineFormDescription('');
    setRoutineFormDayOfWeek(null);
    setRoutineFormExercises([]);
    setShowRoutineFormModal(true);
  };

  const handleEditRoutineTrigger = (routine: WorkoutRoutine) => {
    setEditingRoutine(routine);
    setRoutineFormName(routine.name);
    setRoutineFormDescription(routine.description);
    setRoutineFormDayOfWeek(routine.dayOfWeek !== undefined ? routine.dayOfWeek : null);
    setRoutineFormExercises(JSON.parse(JSON.stringify(routine.exercises))); // Deep clone
    setShowRoutineFormModal(true);
  };

  const handleAddExerciseToRoutine = (exercise: Exercise) => {
    const alreadyExists = routineFormExercises.some(e => e.exerciseId === exercise.id);
    if (alreadyExists) return;

    const newRoutineExercise = {
      exerciseId: exercise.id,
      sets: [
        {
          weight: 0,
          reps: 10,
          type: 'Trabalho' as SetType
        }
      ],
      restTimer: 90,
      progressionNotes: '',
      observations: ''
    };

    setRoutineFormExercises(prev => [...prev, newRoutineExercise]);
    setShowAddExerciseToRoutineModal(false);
    setRoutineExerciseSearch('');
  };

  const handleUpdateRoutineExerciseField = (exerciseId: string, field: 'restTimer' | 'progressionNotes' | 'observations', value: any) => {
    setRoutineFormExercises(prev => prev.map(ex => {
      if (ex.exerciseId === exerciseId) {
        return { ...ex, [field]: value };
      }
      return ex;
    }));
  };

  const handleRemoveExerciseFromRoutine = (exerciseId: string) => {
    setRoutineFormExercises(prev => prev.filter(e => e.exerciseId !== exerciseId));
  };

  const handleAddSetToRoutineExercise = (exerciseId: string) => {
    setRoutineFormExercises(prev => prev.map(ex => {
      if (ex.exerciseId === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              weight: lastSet ? lastSet.weight : 0,
              reps: lastSet ? lastSet.reps : 10,
              type: 'Trabalho' as SetType
            }
          ]
        };
      }
      return ex;
    }));
  };

  const handleRemoveSetFromRoutineExercise = (exerciseId: string, setIndex: number) => {
    setRoutineFormExercises(prev => prev.map(ex => {
      if (ex.exerciseId === exerciseId) {
        if (ex.sets.length <= 1) return ex; // Keep at least one
        return {
          ...ex,
          sets: ex.sets.filter((_, idx) => idx !== setIndex)
        };
      }
      return ex;
    }));
  };

  const handleUpdateRoutineSetField = (exerciseId: string, setIndex: number, field: 'weight' | 'reps' | 'type', value: any) => {
    setRoutineFormExercises(prev => prev.map(ex => {
      if (ex.exerciseId === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map((s, idx) => {
            if (idx === setIndex) {
              return { ...s, [field]: value };
            }
            return s;
          })
        };
      }
      return ex;
    }));
  };

  const handleSaveRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineFormName.trim()) {
      alert('Por favor, defina um nome para a rotina.');
      return;
    }
    if (routineFormExercises.length === 0) {
      alert('Selecione pelo menos um exercício para compor sua rotina.');
      return;
    }

    if (editingRoutine) {
      const updated: WorkoutRoutine = {
        ...editingRoutine,
        name: routineFormName.trim(),
        description: routineFormDescription.trim(),
        dayOfWeek: routineFormDayOfWeek,
        exercises: routineFormExercises
      };
      onUpdateRoutine?.(updated);
    } else {
      const newRoutine: WorkoutRoutine = {
        id: 'routine_' + Date.now(),
        name: routineFormName.trim(),
        description: routineFormDescription.trim(),
        dayOfWeek: routineFormDayOfWeek,
        exercises: routineFormExercises
      };
      onAddRoutine?.(newRoutine);
    }

    setShowRoutineFormModal(false);
    setEditingRoutine(null);
  };

  // List of unique muscle groups for the exercise modal filter
  const muscleGroups = ['Todos', ...Array.from(new Set(availableExercises.map(e => e.targetMuscle)))];

  // Update stopwatch timer for active workout
  useEffect(() => {
    if (!activeWorkout) return;
    
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - activeWorkout.startTime;
      const totalSecs = Math.floor(elapsedMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      setWorkoutDurationStr(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout]);

  // Helper: Find the previous performance for a given exercise set index in history
  const getPreviousPerformance = (exerciseId: string, setIndex: number): { weight: number; reps: string | number } | null => {
    // Look from newest history to oldest
    const relevantWorkouts = [...history].sort((a, b) => b.startTime - a.startTime);
    for (const workout of relevantWorkouts) {
      const matchedEx = workout.exercises.find(e => e.exerciseId === exerciseId);
      if (typeof matchedEx !== 'undefined') {
        const completedSets = matchedEx.sets.filter(s => s.completed);
        const setAtIdx = completedSets[setIndex] || completedSets[completedSets.length - 1]; // Fallback to last set if index is greater
        if (setAtIdx && setAtIdx.weight !== null && setAtIdx.reps !== null) {
          return { weight: setAtIdx.weight, reps: setAtIdx.reps };
        }
      }
    }
    return null;
  };

  const handleCreateEmptyWorkout = () => {
    onStartWorkout('Treino Avulso');
    setWorkoutComments('');
    setShowFinishConfirm(false);
  };

  const handleStartRoutine = (routine: WorkoutRoutine) => {
    onStartWorkout(routine.name, routine.exercises);
    setWorkoutComments('');
    setShowFinishConfirm(false);
  };

  const handleAddExerciseToWorkout = (exercise: Exercise) => {
    if (!activeWorkout) return;

    // Check if exercise is already added
    const alreadyExists = activeWorkout.exercises.some(e => e.exerciseId === exercise.id);
    if (alreadyExists) return;

    const newExerciseState: ExerciseWorkoutState = {
      exerciseId: exercise.id,
      sets: [
        {
          id: `set_${Date.now()}_1`,
          weight: null,
          reps: null,
          completed: false,
          type: 'Trabalho'
        }
      ]
    };

    const updatedWorkout = {
      ...activeWorkout,
      exercises: [...activeWorkout.exercises, newExerciseState]
    };

    onUpdateActiveWorkout(updatedWorkout);
    setShowExerciseModal(false);
    setExerciseSearch('');
  };

  const handleRemoveExercise = (exerciseId: string) => {
    if (!activeWorkout) return;
    const updatedExercises = activeWorkout.exercises.filter(e => e.exerciseId !== exerciseId);
    onUpdateActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    });
  };

  const handleAddSet = (exerciseId: string) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map(ex => {
      if (ex.exerciseId === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: SetState = {
          id: `set_${Date.now()}_${ex.sets.length + 1}`,
          weight: lastSet ? lastSet.weight : null,
          reps: lastSet ? lastSet.reps : null,
          completed: false,
          type: 'Trabalho'
        };
        return {
          ...ex,
          sets: [...ex.sets, newSet]
        };
      }
      return ex;
    });

    onUpdateActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    });
  };

  const handleRemoveSet = (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map(ex => {
      if (ex.exerciseId === exerciseId) {
        // Keep at least one set
        if (ex.sets.length <= 1) return ex;
        return {
          ...ex,
          sets: ex.sets.filter(s => s.id !== setId)
        };
      }
      return ex;
    });

    onUpdateActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    });
  };

  const handleUpdateSetType = (exerciseId: string, setId: string, newType: SetType) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map(ex => {
      if (ex.exerciseId === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id === setId) {
              return { ...s, type: newType };
            }
            return s;
          })
        };
      }
      return ex;
    });

    onUpdateActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    });
  };

  const handleSetFieldChange = (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => {
    if (!activeWorkout) return;

    const finalVal = field === 'reps'
      ? (value === '' ? null : value)
      : (value === '' ? null : parseFloat(value));

    const updatedExercises = activeWorkout.exercises.map(ex => {
      if (ex.exerciseId === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id === setId) {
              return { ...s, [field]: finalVal };
            }
            return s;
          })
        };
      }
      return ex;
    });

    onUpdateActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    });
  };

  const handleToggleSetCompleted = (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;

    let justCompleted = false;

    const updatedExercises = activeWorkout.exercises.map(ex => {
      if (ex.exerciseId === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id === setId) {
              const targetStatus = !s.completed;
              if (targetStatus === true) {
                justCompleted = true; // Was checked
              }
              return { ...s, completed: targetStatus };
            }
            return s;
          })
        };
      }
      return ex;
    });

    onUpdateActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    });

    // If a set was successfully completed, automatically launch the floating/dynamic rest timer
    if (justCompleted) {
      const exerciseState = activeWorkout.exercises.find(e => e.exerciseId === exerciseId);
      const timerToUse = (exerciseState && exerciseState.restTimer) ? exerciseState.restTimer : restPreference;
      onTriggerRestTimer(timerToUse);
    }
  };

  const handlePredefinedWeightsAndRepsFill = (exerciseId: string) => {
    // Autocompletes empty fields with historic values
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map(ex => {
      if (ex.exerciseId === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map((s, idx) => {
            const hist = getPreviousPerformance(exerciseId, idx);
            if (hist && s.weight === null && s.reps === null) {
              return { ...s, weight: hist.weight, reps: hist.reps } as SetState;
            }
            return s;
          })
        };
      }
      return ex;
    });

    onUpdateActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    });
  };

  // Filter exercises on search & category
  const filteredExercises = availableExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) || 
                          ex.targetMuscle.toLowerCase().includes(exerciseSearch.toLowerCase());
    const matchesMuscle = selectedMuscleFilter === 'Todos' || ex.targetMuscle === selectedMuscleFilter;
    return matchesSearch && matchesMuscle;
  });

  return (
    <div id="workout-log-view" className="space-y-6">
      <AnimatePresence mode="wait">
        {!activeWorkout ? (
          /* View A: NO ACTIVE WORKOUT - Choice of routines */
          <motion.div
            key="routines-selection"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Action Bar Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Começar Treino</h2>
                <p className="text-xs text-slate-400">Selecione uma de suas rotinas abaixo ou inicie um treino personalizado vazio.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  id="btn-print-weekly-sheet"
                  onClick={() => setShowPrintModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-sky-400 font-bold font-sans text-sm transition active:scale-95 shrink-0"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span>Imprimir Ficha</span>
                </button>
                <button
                  id="btn-create-routine"
                  onClick={handleCreateRoutineTrigger}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-lime-400 font-bold font-sans text-sm transition active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
                  <span>Nova Rotina</span>
                </button>
                <button
                  id="btn-start-custom-workout"
                  onClick={handleCreateEmptyWorkout}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 font-bold text-slate-950 font-sans text-sm shadow-md transition active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0 stroke-[3px]" />
                  <span>Iniciar Treino Vazio</span>
                </button>
              </div>
            </div>

            {/* Routines Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {routines.map((routine) => {
                const totalSets = routine.exercises.reduce((acc, c) => acc + c.sets.length, 0);
                
                return (
                  <div
                    key={routine.id}
                    className="bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between group transition-all hover:shadow-xl hover:shadow-lime-500/5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-lime-400 group-hover:bg-lime-400 group-hover:text-slate-950 transition">
                          <Clipboard className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-wider bg-slate-950 px-2 py-1 rounded-md border border-slate-850">
                          {routine.exercises.length} exerc. • {totalSets} séries
                        </span>
                      </div>
 
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-white text-base leading-tight truncate mr-2">{routine.name}</h3>
                          <div className="flex gap-1.5 shrink-0 items-center">
                            {deletingRoutineId === routine.id ? (
                              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850">
                                <button
                                  id={`btn-confirm-delete-routine-${routine.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteRoutine?.(routine.id);
                                    setDeletingRoutineId(null);
                                  }}
                                  className="px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded text-[9px] uppercase tracking-wider transition"
                                >
                                  Sim
                                </button>
                                <button
                                  id={`btn-cancel-delete-routine-${routine.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingRoutineId(null);
                                  }}
                                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-[9px] uppercase tracking-wider transition"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  id={`btn-edit-routine-${routine.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditRoutineTrigger(routine);
                                  }}
                                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-lime-400 rounded transition"
                                  title="Editar Rotina"
                                >
                                  <Edit className="w-3.5 h-3.5 animate-none" />
                                </button>
                                <button
                                  id={`btn-delete-routine-${routine.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingRoutineId(routine.id);
                                  }}
                                  className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition"
                                  title="Excluir Rotina"
                                >
                                  <Trash2 className="w-3.5 h-3.5 animate-none" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{routine.description}</p>
                        {routine.dayOfWeek !== undefined && routine.dayOfWeek !== null && (
                          <div className="flex items-center gap-1.5 mt-2 bg-lime-500/10 border border-lime-500/20 px-2.5 py-1 rounded-xl w-fit">
                            <span className="w-1.5 h-1.5 bg-lime-400 rounded-full animate-pulse"></span>
                            <span className="text-[10px] text-lime-400 font-bold uppercase tracking-wider font-mono">
                              {DAYS_OF_WEEK_LABELS[routine.dayOfWeek]}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Exercises Mini List */}
                      <div className="pt-2 border-t border-slate-850/80 space-y-1 text-left">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block">Exercícios inclusos:</span>
                        <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                          {routine.exercises.map((item, id) => {
                            const exName = availableExercises.find(e => e.id === item.exerciseId)?.name || "Sem nome";
                            return (
                              <div key={id} className="text-[11px] text-slate-300 flex flex-col gap-0.5 border-b border-slate-850/30 pb-1 last:border-0 last:pb-0">
                                <div className="flex justify-between items-center">
                                  <span className="truncate pr-2 font-medium text-slate-200 text-left">• {exName}</span>
                                  <span className="text-slate-500 shrink-0 font-semibold text-[10px] flex items-center gap-1">
                                    {item.sets.length}x <span className="text-slate-600 font-normal">|</span> {item.restTimer || 90}s⏱️
                                  </span>
                                </div>
                                {(item.progressionNotes || item.observations) && (
                                  <div className="pl-3.5 flex flex-wrap gap-1 text-[9px]">
                                    {item.progressionNotes && <span className="text-lime-500 bg-lime-500/10 px-1 rounded truncate max-w-[130px]" title={item.progressionNotes}>📈 {item.progressionNotes}</span>}
                                    {item.observations && <span className="text-sky-400 bg-sky-500/10 px-1 rounded truncate max-w-[130px]" title={item.observations}>📝 {item.observations}</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      id={`btn-start-routine-${routine.id}`}
                      onClick={() => handleStartRoutine(routine)}
                      className="w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-950 hover:bg-lime-500 text-slate-300 hover:text-slate-950 text-xs font-bold transition border border-slate-850 hover:border-lime-500 active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Iniciar Esta Rotina</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick tips */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-start gap-3">
              <span className="text-base">ℹ️</span>
              <div className="text-xs text-slate-400 space-y-1 leading-relaxed">
                <p className="font-semibold text-slate-300">Como funciona o log estilo Hevy?</p>
                <p>Ao iniciar o treino, configure as cargas e reps para cada série. À medida que completar as séries, clique no botão de <strong>Check (Concluído)</strong> para registrar as marcas e dar início ao temporizador de descanso automático. Depois de terminar todos os exercícios, clique em <strong>Finalizar</strong>.</p>
              </div>
            </div>
          </motion.div>
        ) : (
          /* View B: ACTIVE WORKOUT RECORDER */
          <motion.div
            key="active-workout-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Active Header Panel */}
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse" />
                  <input
                    id="input-active-workout-name"
                    type="text"
                    value={activeWorkout.name}
                    onChange={(e) => onUpdateActiveWorkout({ ...activeWorkout, name: e.target.value })}
                    className="font-bold text-white text-lg bg-transparent border-b border-transparent hover:border-slate-700 focus:border-lime-500 focus:outline-none transition pb-0.5 tracking-tight font-sans"
                    title="Clique para editar o título do seu treino"
                  />
                </div>
                
                <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                  <span className="font-mono">⏱️ Tempo decorrido: <strong className="text-lime-400 font-bold">{workoutDurationStr}</strong></span>
                  <span>🏋️ Exercícios: <strong className="text-white">{activeWorkout.exercises.length}</strong></span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Descanso Automático:</span>
                    <select
                      id="select-rest-preference"
                      value={restPreference}
                      onChange={(e) => setRestPreference(parseInt(e.target.value))}
                      className="bg-slate-950 border border-slate-850 rounded px-1.5 py-0.5 text-xs text-white outline-none focus:border-lime-500"
                    >
                      <option value="30">30 seg</option>
                      <option value="60">1 min</option>
                      <option value="90">1:30 min</option>
                      <option value="120">2 min</option>
                      <option value="180">3 min</option>
                      <option value="240">4 min</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Top Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-cancel-workout"
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 bg-slate-950 hover:bg-red-500/10 text-red-400 border border-slate-850 hover:border-red-500/25 rounded-xl text-xs font-semibold transition active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  id="btn-trigger-finish"
                  onClick={() => setShowFinishConfirm(true)}
                  className="px-5 py-2 bg-lime-500 hover:bg-lime-600 text-slate-950 rounded-xl text-xs font-bold font-sans transition shadow-lg shadow-lime-500/10 active:scale-95"
                >
                  Finalizar Treino
                </button>
              </div>
            </div>

            {/* Exercises List in current workout */}
            <div className="space-y-4">
              {activeWorkout.exercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl text-center space-y-4">
                  <Dumbbell className="w-12 h-12 text-slate-600 animate-bounce" />
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-sm">Seu treino está vazio</h3>
                    <p className="text-xs text-slate-400 max-w-xs">Adicione pelo menos um de seus exercícios na catalogação para começar o registro das marcas.</p>
                  </div>
                  <button
                    id="btn-add-first-exercise"
                    onClick={() => setShowExerciseModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-lime-500 text-slate-950 hover:bg-lime-600 rounded-lg text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                    <span>Adicionar Exercício</span>
                  </button>
                </div>
              ) : (
                activeWorkout.exercises.map((item, exIdx) => {
                  const details = availableExercises.find(e => e.id === item.exerciseId);
                  const isHistAvailable = history.some(w => w.exercises.some(e => e.exerciseId === item.exerciseId));

                  return (
                    <div
                      key={item.exerciseId}
                      className="bg-slate-900 border border-slate-850 rounded-2xl p-4 space-y-3 hover:border-slate-800 transition"
                    >
                      {/* Exercise card header */}
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                        <div className="space-y-0.5 text-left">
                          <h4 className="font-bold text-white text-sm flex items-center gap-2">
                            <span className="text-lime-400 font-mono">#{exIdx + 1}</span>
                            {details?.name || "Sem nome"}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-1">
                            <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-850 font-semibold">{details?.targetMuscle}</span>
                            <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-850">{details?.equipment}</span>
                            
                            {/* Exercise-specific Rest Timer input */}
                            <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">
                              <span>⏱️ Descanso:</span>
                              <input
                                type="number"
                                min="5"
                                max="600"
                                value={item.restTimer === undefined || item.restTimer === null ? 90 : item.restTimer}
                                onChange={(e) => {
                                  const newVal = parseInt(e.target.value, 10) || 90;
                                  onUpdateActiveWorkout({
                                    ...activeWorkout,
                                    exercises: activeWorkout.exercises.map(ex => 
                                      ex.exerciseId === item.exerciseId ? { ...ex, restTimer: newVal } : ex
                                    )
                                  });
                                }}
                                className="bg-transparent border-none text-lime-400 hover:text-lime-300 font-bold w-10 text-center font-mono outline-none"
                                title="Tempo de descanso personalizado para este exercício"
                              />
                              <span>s</span>
                            </div>

                            {isHistAvailable && (
                              <button
                                type="button"
                                onClick={() => handlePredefinedWeightsAndRepsFill(item.exerciseId)}
                                className="text-[9px] text-lime-400 hover:underline flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-950 rounded border border-slate-850 transition"
                                title="Preenche as caixas de texto com os valores do último treino"
                              >
                                ⚡ Autocompletar Anterior
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          id={`btn-remove-exercise-${item.exerciseId}`}
                          onClick={() => handleRemoveExercise(item.exerciseId)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-950 rounded-lg transition"
                          title="Remover exercício do treino"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Progression & Observations orientational fields */}
                      {(item.progressionNotes || item.observations) && (
                        <div className="bg-slate-950/55 rounded-xl border border-slate-850 p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-left">
                          {item.progressionNotes && (
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-lime-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                📈 Progressão Definida
                              </span>
                              <p className="text-slate-300 font-medium whitespace-pre-wrap">{item.progressionNotes}</p>
                            </div>
                          )}
                          {item.observations && (
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                📝 Observações / Dicas
                              </span>
                              <p className="text-slate-350 font-medium whitespace-pre-wrap">{item.observations}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sets Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[320px]">
                          <thead>
                            <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-850">
                              <th className="py-2 pr-2 w-14 text-center">Série</th>
                              <th className="py-2 px-2 w-28 text-center">Tipo</th>
                              <th className="py-2 px-2 w-32 text-center">Anterior</th>
                              <th className="py-2 px-2 w-28 text-center">Carga (kg)</th>
                              <th className="py-2 px-2 w-24 text-center">Reps</th>
                              <th className="py-2 pl-2 w-16 text-center">Status</th>
                              <th className="py-2 w-10 text-center"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.sets.map((s, idx) => {
                              const prev = getPreviousPerformance(item.exerciseId, idx);
                              
                              return (
                                <tr
                                  key={s.id}
                                  className={`border-b border-slate-850/40 transition-colors ${
                                    s.completed ? 'bg-lime-500/5' : 'hover:bg-slate-950/20'
                                  }`}
                                >
                                  {/* Set index count */}
                                  <td className="py-1.5 pr-2 font-mono font-bold text-center text-slate-200">
                                    {idx + 1}
                                  </td>
                                  
                                  {/* Set Type Dropdown */}
                                  <td className="py-1.5 px-2">
                                    <div className="flex justify-center">
                                      <select
                                        id={`select-set-type-${s.id}`}
                                        value={s.type}
                                        onChange={(e) => handleUpdateSetType(item.exerciseId, s.id, e.target.value as SetType)}
                                        className="bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-300 font-semibold rounded px-1.5 py-1 text-center text-[10px] uppercase outline-none focus:border-lime-500 cursor-pointer"
                                      >
                                        <option value="Aquecimento">Aquecimento</option>
                                        <option value="Adaptação">Adaptação</option>
                                        <option value="Trabalho">Trabalho</option>
                                      </select>
                                    </div>
                                  </td>

                                  {/* Previous performance display */}
                                  <td className="py-1.5 px-2 text-center text-slate-500 font-mono tracking-tight text-[11px]">
                                    {prev ? `${prev.weight}kg × ${prev.reps}` : '--'}
                                  </td>

                                  {/* Weight Input */}
                                  <td className="py-1.5 px-2 text-center">
                                    <input
                                      id={`input-weight-${s.id}`}
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      placeholder="kg"
                                      value={s.weight === null ? '' : s.weight}
                                      onChange={(e) => handleSetFieldChange(item.exerciseId, s.id, 'weight', e.target.value)}
                                      disabled={s.completed}
                                      className="w-20 bg-slate-950 border border-slate-850 disabled:bg-slate-900 disabled:text-slate-400 font-semibold font-mono text-center text-white py-1.5 rounded-lg outline-none focus:border-lime-500"
                                    />
                                  </td>

                                  {/* Reps Input */}
                                  <td className="py-1.5 px-2 text-center">
                                    <input
                                      id={`input-reps-${s.id}`}
                                      type="text"
                                      placeholder="reps"
                                      value={s.reps === null ? '' : s.reps}
                                      onChange={(e) => handleSetFieldChange(item.exerciseId, s.id, 'reps', e.target.value)}
                                      disabled={s.completed}
                                      className="w-16 bg-slate-950 border border-slate-850 disabled:bg-slate-900 disabled:text-slate-400 font-semibold font-mono text-center text-white py-1.5 rounded-lg outline-none focus:border-lime-500"
                                    />
                                  </td>

                                  {/* Checked complete status */}
                                  <td className="py-1.5 px-2 text-center">
                                    <div className="flex justify-center">
                                      <button
                                        id={`btn-toggle-set-${s.id}`}
                                        type="button"
                                        onClick={() => handleToggleSetCompleted(item.exerciseId, s.id)}
                                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                                          s.completed
                                            ? 'bg-lime-500 text-slate-950 shadow-md shadow-lime-500/25 border border-lime-500'
                                            : 'bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        {s.completed ? (
                                          <Check className="w-4 h-4 stroke-[3px]" />
                                        ) : (
                                          <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                        )}
                                      </button>
                                    </div>
                                  </td>

                                  {/* Remove set button */}
                                  <td className="py-1.5 text-center">
                                    <button
                                      id={`btn-remove-set-${s.id}`}
                                      onClick={() => handleRemoveSet(item.exerciseId, s.id)}
                                      disabled={item.sets.length <= 1}
                                      className="text-slate-600 hover:text-red-400 hover:bg-slate-950 disabled:opacity-20 p-1 rounded transition"
                                      title="Remover série"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Add Set button */}
                      <button
                        id={`btn-add-set-${item.exerciseId}`}
                        onClick={() => handleAddSet(item.exerciseId)}
                        className="w-full py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Série</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Action panel at the bottom of the exercises catalog */}
            <div className="flex gap-3 justify-center items-center pt-3">
              <button
                id="btn-trigger-add-exercise-modal"
                onClick={() => setShowExerciseModal(true)}
                className="flex items-center gap-1.5 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-lime-400 hover:text-lime-300 rounded-2xl font-bold font-sans text-sm transition shadow-lg"
              >
                <Plus className="w-4 h-4 stroke-[3.5px]" />
                <span>Adicionar Exercício</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: EXERCISE CHOOSER CATALOG */}
      <AnimatePresence>
        {showExerciseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <motion.div
              id="exercise-modal-panel"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden text-white"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-850 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">Selecione o Exercício</h3>
                  <p className="text-[11px] text-slate-400">Escolha da lista para incluir no treino atual</p>
                </div>
                <button
                  id="btn-close-exercise-modal"
                  onClick={() => setShowExerciseModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filtering Controls */}
              <div className="p-4 bg-slate-950/40 border-b border-slate-850 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    id="input-search-exercise"
                    type="text"
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Buscar por nome ou músculo..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-white text-sm outline-none focus:border-lime-500 font-sans"
                  />
                  {exerciseSearch && (
                    <button
                      onClick={() => setExerciseSearch('')}
                      className="absolute right-3 top-3 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Muscle Quick Tags Selector */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {muscleGroups.map((muscle) => (
                    <button
                      key={muscle}
                      type="button"
                      onClick={() => setSelectedMuscleFilter(muscle)}
                      className={`px-3 py-1 bg-slate-950 rounded-full text-xs font-semibold whitespace-nowrap border shrink-0 transition ${
                        selectedMuscleFilter === muscle
                          ? 'bg-lime-500 border-lime-500 text-slate-950'
                          : 'border-slate-850 text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {muscle}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercise Items List Container */}
              <div className="p-2 space-y-1 overflow-y-auto max-h-[40vh] bg-slate-950/20">
                {filteredExercises.length === 0 ? (
                  <div className="text-center py-10">
                    <span className="text-xs text-slate-500 italic">Nenhum exercício encontrado para a busca.</span>
                  </div>
                ) : (
                  filteredExercises.map((ex) => {
                    const isAdded = activeWorkout?.exercises.some(e => e.exerciseId === ex.id);

                    return (
                      <button
                        key={ex.id}
                        id={`btn-select-exercise-item-${ex.id}`}
                        onClick={() => handleAddExerciseToWorkout(ex)}
                        disabled={isAdded}
                        className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition ${
                          isAdded
                            ? 'bg-slate-900/50 border-slate-850/40 opacity-40 cursor-not-allowed'
                            : 'bg-slate-900 border-slate-850 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-white text-sm block">{ex.name}</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span className="px-1 bg-slate-950 border border-slate-850 rounded">{ex.targetMuscle}</span>
                            <span>•</span>
                            <span>{ex.equipment}</span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isAdded ? (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                              Incluso
                            </span>
                          ) : (
                            <span className="text-[10px] text-lime-400 font-bold bg-lime-500/10 px-2 py-0.5 rounded border border-lime-500/15 group-hover:bg-lime-500 group-hover:text-slate-950 transition">
                              Adicionar
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM FINISH WORKOUT DIALOG OVERLAY */}
      <AnimatePresence>
        {showFinishConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              id="finish-workout-confirm-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-white space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-lime-500/15 rounded-xl flex items-center justify-center text-lime-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg font-sans">Finalizar Treino</h3>
                  <p className="text-xs text-slate-400">Sua sessão de hoje está pronta para ser salva no diário.</p>
                </div>
              </div>

              {/* Session comments / notes */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs text-slate-300 font-semibold block">Notas e Sentimento sobre o Treino</label>
                <textarea
                  id="textarea-workout-comments"
                  rows={3}
                  value={workoutComments}
                  onChange={(e) => setWorkoutComments(e.target.value)}
                  placeholder="ex: Foco total, aumentei 2kg no agachamento reto na última série. Rendimento fantástico!"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-lime-500"
                />
              </div>

              {/* Completed statistics brief */}
              <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Métricas Registradas</span>
                
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tempo de Duração:</span>
                  <span className="font-mono text-white font-bold">{workoutDurationStr}</span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-sans">Séries Ativas Realizadas:</span>
                  <span className="font-mono text-lime-400 font-extrabold">
                    {activeWorkout?.exercises.reduce((acc, curr) => acc + curr.sets.filter(s => s.completed).length, 0) || 0}
                  </span>
                </div>
              </div>

              {/* Botões do modal */}
              <div className="flex gap-3 pt-2">
                <button
                  id="btn-confirm-cancel-finish"
                  type="button"
                  onClick={() => setShowFinishConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-950 border border-slate-850 text-slate-300 hover:text-white transition text-xs font-semibold"
                >
                  Voltar
                </button>
                <button
                  id="btn-confirm-save-workout"
                  type="button"
                  onClick={() => {
                    onFinishWorkout(workoutComments);
                    setShowFinishConfirm(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 transition text-xs font-bold font-sans shadow-lg shadow-lime-500/10"
                >
                  Confirmar e Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM CANCEL WORKOUT DIALOG OVERLAY */}
      <AnimatePresence>
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              id="cancel-workout-confirm-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-white space-y-4 font-sans"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center text-red-400 shrink-0">
                  <X className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">Cancelar Treino</h3>
                  <p className="text-xs text-slate-400">Tem certeza de que deseja cancelar o treino atual?</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Todo o progresso registrado nesta sessão será permanentemente perdido. Esta ação não poderá ser desfeita.
                </p>
              </div>

              {/* Botões do modal */}
              <div className="flex gap-3 pt-2">
                <button
                  id="btn-confirm-cancel-no"
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-slate-300 hover:text-white transition text-xs font-semibold"
                >
                  Continuar Treinando
                </button>
                <button
                  id="btn-confirm-cancel-yes"
                  type="button"
                  onClick={() => {
                    onCancelWorkout();
                    setShowCancelConfirm(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white transition text-xs font-bold shadow-lg shadow-red-500/10"
                >
                  Sim, Cancelar Treino
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ROUTINE FORM REGISTRATION/EDIT MODAL OVERLAY */}
      <AnimatePresence>
        {showRoutineFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 md:p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div
              id="routine-form-modal"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-white font-sans flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-850 p-5 shrink-0 bg-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-lime-500/10 text-lime-400 flex items-center justify-center">
                    <Clipboard className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {editingRoutine ? 'Editar Rotina' : 'Nova Rotina de Treino'}
                  </h3>
                </div>
                <button
                  id="btn-close-routine-modal"
                  type="button"
                  onClick={() => {
                    setShowRoutineFormModal(false);
                    setEditingRoutine(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSaveRoutine} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                {/* Nome, descrição e Dia da Semana */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-bold block uppercase">Nome da Rotina</label>
                    <input
                      id="routine-form-name"
                      type="text"
                      required
                      value={routineFormName}
                      onChange={(e) => setRoutineFormName(e.target.value)}
                      placeholder="Ex: Treino A - Peito, Ombros e Tríceps"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-550 outline-none focus:border-lime-500 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-bold block uppercase">Descrição</label>
                    <input
                      id="routine-form-description"
                      type="text"
                      value={routineFormDescription}
                      onChange={(e) => setRoutineFormDescription(e.target.value)}
                      placeholder="Ex: Foco nos exercícios básicos com progressão"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-550 outline-none focus:border-lime-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-bold block uppercase">Dia da Semana (Agendar)</label>
                    <select
                      id="routine-form-day"
                      value={routineFormDayOfWeek === null ? "" : routineFormDayOfWeek}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRoutineFormDayOfWeek(val === "" ? null : Number(val));
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-550 outline-none focus:border-lime-500 text-xs font-semibold"
                    >
                      <option value="">Sem dia específico</option>
                      <option value="1">Segunda-feira</option>
                      <option value="2">Terça-feira</option>
                      <option value="3">Quarta-feira</option>
                      <option value="4">Quinta-feira</option>
                      <option value="5">Sexta-feira</option>
                      <option value="6">Sábado</option>
                      <option value="0">Domingo</option>
                    </select>
                  </div>
                </div>

                {/* Routine Exercises Header */}
                <div className="border-t border-slate-850 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                      Exercícios inclusos ({routineFormExercises.length})
                    </span>
                    <button
                      id="btn-add-exercise-to-routine-trigger"
                      type="button"
                      onClick={() => setShowAddExerciseToRoutineModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-lime-500/10 hover:bg-lime-500/25 text-lime-400 transition font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Adicionar Exercício</span>
                    </button>
                  </div>

                  {/* Empty State */}
                  {routineFormExercises.length === 0 && (
                    <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center space-y-2 bg-slate-950/20">
                      <Dumbbell className="w-8 h-8 text-slate-700 mx-auto" strokeWidth="1.5" />
                      <p className="text-slate-400 font-medium">Nenhum exercício adicionado ainda</p>
                      <p className="text-[10px] text-slate-500">Adicione exercícios para modelar as séries e repetições padrão da rotina.</p>
                    </div>
                  )}

                  {/* List of routine exercises */}
                  <div className="space-y-4">
                    {routineFormExercises.map((item, id) => {
                      const exDetails = availableExercises.find(e => e.id === item.exerciseId);
                      const isEditingName = editingExerciseId === item.exerciseId;
                      return (
                        <div key={item.exerciseId} className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                            <div className="space-y-1 flex-grow mr-2">
                              {isEditingName ? (
                                <div className="flex items-center gap-1.5 w-full">
                                  <input
                                    type="text"
                                    value={editingExerciseName}
                                    onChange={(e) => setEditingExerciseName(e.target.value)}
                                    placeholder="Nome do exercício"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveExerciseNameEdit(item.exerciseId);
                                      } else if (e.key === 'Escape') {
                                        setEditingExerciseId(null);
                                      }
                                    }}
                                    className="bg-slate-900 border border-lime-500 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-650 outline-none w-full max-w-[240px] font-bold"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveExerciseNameEdit(item.exerciseId)}
                                    className="p-1 bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 rounded-md transition"
                                    title="Salvar"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingExerciseId(null)}
                                    className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-md transition"
                                    title="Cancelar"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] text-white font-bold block">{exDetails?.name || "Sem nome"}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingExerciseId(item.exerciseId);
                                      setEditingExerciseName(exDetails?.name || '');
                                    }}
                                    className="text-slate-500 hover:text-lime-400 p-0.5 rounded transition"
                                    title="Editar nome"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              <span className="text-[9px] text-slate-500 font-mono tracking-wide block">{exDetails?.targetMuscle} • {exDetails?.equipment}</span>
                            </div>
                            <button
                              id={`btn-remove-exercise-from-routine-${item.exerciseId}`}
                              type="button"
                              onClick={() => handleRemoveExerciseFromRoutine(item.exerciseId)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition"
                              title="Remover exercício da rotina"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Sets table */}
                          <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 text-center uppercase tracking-wider">
                              <div className="col-span-2 text-left">Série</div>
                              <div className="col-span-4">Carga (kg)</div>
                              <div className="col-span-4">Repetições</div>
                              <div className="col-span-2">Tipo</div>
                            </div>

                            {item.sets.map((s, idx) => (
                              <div key={idx} className="grid grid-cols-12 gap-2 items-center text-center font-mono">
                                <div className="col-span-2 text-left flex items-center gap-1">
                                  <span className="text-slate-450 font-bold text-xs">#{idx + 1}</span>
                                  <button
                                    id={`btn-remove-set-routine-${item.exerciseId}-${idx}`}
                                    type="button"
                                    onClick={() => handleRemoveSetFromRoutineExercise(item.exerciseId, idx)}
                                    className="text-sm font-light text-slate-500 hover:text-red-400 leading-none h-4 w-4 rounded hover:bg-slate-900 transition flex items-center justify-center font-sans"
                                    title="Excluir série"
                                  >
                                    ×
                                  </button>
                                </div>
                                <div className="col-span-4">
                                  <input
                                    type="number"
                                    step="any"
                                    required
                                    min="0"
                                    value={s.weight === 0 ? '' : s.weight}
                                    onChange={(e) => handleUpdateRoutineSetField(item.exerciseId, idx, 'weight', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-center text-xs text-white placeholder-slate-600 outline-none focus:border-lime-500/50 focus:bg-slate-950 font-bold"
                                  />
                                </div>
                                <div className="col-span-4">
                                  <input
                                    type="text"
                                    required
                                    value={s.reps === 0 || s.reps === undefined || s.reps === null ? '' : s.reps}
                                    onChange={(e) => handleUpdateRoutineSetField(item.exerciseId, idx, 'reps', e.target.value)}
                                    placeholder="10"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-center text-xs text-white placeholder-slate-600 outline-none focus:border-lime-500/50 focus:bg-slate-950 font-bold"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <select
                                    value={s.type}
                                    onChange={(e) => handleUpdateRoutineSetField(item.exerciseId, idx, 'type', e.target.value as SetType)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-1 text-center text-[10px] text-slate-300 outline-none focus:border-lime-500/50 font-sans"
                                  >
                                    <option value="Aquecimento">Aqc</option>
                                    <option value="Adaptação">Adp</option>
                                    <option value="Trabalho">Trb</option>
                                  </select>
                                </div>
                              </div>
                            ))}

                            <button
                              id={`btn-add-set-routine-${item.exerciseId}`}
                              type="button"
                              onClick={() => handleAddSetToRoutineExercise(item.exerciseId)}
                              className="text-[10px] text-lime-400/90 hover:text-lime-400 font-bold flex items-center gap-1 transition-all pt-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Adicionar Série</span>
                            </button>

                            {/* Custom Rest Timer and Notes/Observations fields */}
                            <div className="pt-3 mt-3 border-t border-slate-900 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">⏱️ Descanso do Exercício:</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="5"
                                  max="600"
                                  placeholder="90"
                                  value={item.restTimer === undefined || item.restTimer === null ? 90 : item.restTimer}
                                  onChange={(e) => handleUpdateRoutineExerciseField(item.exerciseId, 'restTimer', parseInt(e.target.value, 10) || 90)}
                                  className="w-16 bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-center text-xs text-white outline-none focus:border-lime-500 font-bold font-mono"
                                />
                                <span className="text-[10px] text-slate-500 font-semibold uppercase">segundos</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-900/60 text-left">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">📈 Progressão de Carga</label>
                                <textarea
                                  value={item.progressionNotes || ''}
                                  onChange={(e) => handleUpdateRoutineExerciseField(item.exerciseId, 'progressionNotes', e.target.value)}
                                  placeholder="Ex: aumentar 2kg após bater 10 reps em todas séries"
                                  rows={2}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-lime-500/50 resize-none leading-relaxed font-sans"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">📝 Observações</label>
                                <textarea
                                  value={item.observations || ''}
                                  onChange={(e) => handleUpdateRoutineExerciseField(item.exerciseId, 'observations', e.target.value)}
                                  placeholder="Ex: alongamento total embaixo, pico de contração 1s"
                                  rows={2}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-lime-500/50 resize-none leading-relaxed font-sans"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Save actions */}
                <div className="flex gap-4 pt-4 border-t border-slate-850 shrink-0">
                  <button
                    id="btn-cancel-save-routine"
                    type="button"
                    onClick={() => {
                      setShowRoutineFormModal(false);
                      setEditingRoutine(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-slate-300 hover:text-white transition font-semibold text-center hover:bg-slate-900 text-xs text-sans"
                  >
                    Descartar Alterações
                  </button>
                  <button
                    id="btn-submit-save-routine"
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 transition font-bold text-center shadow-lg shadow-lime-500/10 text-xs text-sans"
                  >
                    Salvar Rotina de Treino
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETACHED EXERCISE SEARCH PICKER MODAL FOR ROUTINE DESIGN */}
      <AnimatePresence>
        {showAddExerciseToRoutineModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
            <motion.div
              id="routine-exercise-picker-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-white space-y-4 font-sans flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-850 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-lime-400 scale-125">💪</span>
                  <h3 className="font-bold text-white text-base">Pesquisar Exercício</h3>
                </div>
                <button
                  id="btn-close-routine-picker-modal"
                  type="button"
                  onClick={() => {
                    setShowAddExerciseToRoutineModal(false);
                    setRoutineExerciseSearch('');
                  }}
                  className="p-1 text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search field */}
              <div className="relative shrink-0 text-xs">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  id="routine-picker-search-input"
                  type="text"
                  value={routineExerciseSearch}
                  onChange={(e) => setRoutineExerciseSearch(e.target.value)}
                  placeholder="Nome do exercício ou músculo..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-white outline-none focus:border-lime-500 text-xs"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-[11px] shrink-0 px-1">
                <span className="text-slate-500 font-medium">Selecione ou busque na lista:</span>
                <button
                  id="btn-picker-create-custom-exercise-top"
                  type="button"
                  onClick={() => handleShowInlineExerciseCreator()}
                  className="text-lime-400 font-bold hover:underline py-0.5 flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>Novo Exercício</span>
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto space-y-1.5 p-1 pr-1 border border-slate-850/50 bg-slate-950/20 rounded-xl max-h-[40vh] scrollbar-none">
                {(() => {
                  const filtered = availableExercises.filter(e => {
                    if (!routineExerciseSearch) return true;
                    return e.name.toLowerCase().includes(routineExerciseSearch.toLowerCase()) ||
                           e.targetMuscle.toLowerCase().includes(routineExerciseSearch.toLowerCase());
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8 px-4 space-y-3">
                        <p className="text-slate-400 font-sans text-xs">Exercício "{routineExerciseSearch}" não encontrado.</p>
                        <button
                          id="btn-picker-create-custom-exercise-inline"
                          type="button"
                          onClick={() => handleShowInlineExerciseCreator(routineExerciseSearch)}
                          className="px-4 py-2 bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/20 rounded-xl text-xs font-bold transition active:scale-95 mx-auto"
                        >
                          Criar "{routineExerciseSearch}" Agora
                        </button>
                      </div>
                    );
                  }

                  return filtered.map(ex => {
                    const isAlreadyAdded = routineFormExercises.some(item => item.exerciseId === ex.id);
                    return (
                      <button
                        key={ex.id}
                        id={`btn-picker-select-exercise-${ex.id}`}
                        type="button"
                        disabled={isAlreadyAdded}
                        onClick={() => handleAddExerciseToRoutine(ex)}
                        className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between border transition text-xs ${
                          isAlreadyAdded
                            ? 'opacity-40 border-transparent bg-transparent text-slate-500 cursor-not-allowed'
                            : 'border-slate-850/50 hover:border-lime-500 bg-slate-950/40 hover:bg-slate-950 text-white'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-200 block">{ex.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{ex.targetMuscle} • {ex.equipment}</span>
                        </div>
                        {isAlreadyAdded ? (
                          <span className="text-[10px] text-lime-400 bg-lime-500/10 px-2 py-0.5 rounded border border-lime-500/10 font-bold font-sans uppercase">Incluso</span>
                        ) : (
                          <span className="text-[10px] text-lime-400 font-bold uppercase hover:text-white">+ Adicionar</span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INLINE EXERCISE FORM OVERLAY */}
      <AnimatePresence>
        {showInlineExerciseModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div
              id="inline-exercise-form-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-white space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-lime-500/10 text-lime-400 flex items-center justify-center text-sm font-bold">
                    🏋️
                  </div>
                  <h3 className="font-bold text-white text-base">Novo Exercício Customizado</h3>
                </div>
                <button
                  id="btn-close-inline-exercise-modal"
                  type="button"
                  onClick={() => setShowInlineExerciseModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveInlineExercise} className="space-y-4 text-xs">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold block">Nome do Exercício</label>
                  <input
                    id="inline-exercise-form-name"
                    type="text"
                    required
                    value={inlineExerciseName}
                    onChange={(e) => setInlineExerciseName(e.target.value)}
                    placeholder="Ex: Supino Reto com Halteres"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-lime-500 text-xs"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold block">Categoria</label>
                  <select
                    id="inline-exercise-form-category"
                    value={inlineExerciseCategory}
                    onChange={(e) => setInlineExerciseCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-lime-500 text-xs"
                  >
                    <option value="Hipertrofia">Hipertrofia</option>
                    <option value="Força">Força</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Calistenia">Calistenia</option>
                  </select>
                </div>

                {/* Target Muscle */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold block">Músculo Alvo principal</label>
                  <select
                    id="inline-exercise-form-muscle"
                    value={inlineExerciseMuscle}
                    onChange={(e) => setInlineExerciseMuscle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-lime-500 text-xs animate-none"
                  >
                    {TARGET_MUSCLES_OPTIONS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Equipment */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold block">Equipamento</label>
                  <select
                    id="inline-exercise-form-equipment"
                    value={inlineExerciseEquipment}
                    onChange={(e) => setInlineExerciseEquipment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-lime-500 text-xs animate-none"
                  >
                    {EQUIPMENT_OPTIONS.map(eq => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>

                {/* Save actions */}
                <div className="flex gap-3 pt-3 border-t border-slate-850">
                  <button
                    id="btn-cancel-save-inline-exercise"
                    type="button"
                    onClick={() => setShowInlineExerciseModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-slate-300 hover:text-white transition font-semibold text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-submit-save-inline-exercise"
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 transition font-bold text-center shadow-lg shadow-lime-500/10"
                  >
                    Criar e Adicionar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE VISUALIZAÇÃO E IMPRESSÃO DA FICHA SEMANAL */}
      <AnimatePresence>
        {showPrintModal && (
          <div id="print-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
            {/* Dynamic CSS styles for clean printing with absolute print containment */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                html, body {
                  background: white !important;
                  color: black !important;
                  overflow: visible !important;
                  height: auto !important;
                  min-height: 0 !important;
                }
                /* Hide all on-screen content */
                body * {
                  visibility: hidden !important;
                }
                /* Make the print container and its ancestors visible and non-clipping */
                #root,
                #print-modal-backdrop,
                #print-preview-modal,
                #print-modal-body,
                #print-area,
                #print-area * {
                  visibility: visible !important;
                }
                /* Reset root container to prevent any clipping, scroll restrictions or blank margins */
                #root {
                  position: static !important;
                  height: auto !important;
                  min-height: 0 !important;
                  overflow: visible !important;
                  display: block !important;
                }
                /* Pull the modal backdrop to the absolute top of page 1 to eliminate blank pages */
                #print-modal-backdrop {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  background: white !important;
                  backdrop-filter: none !important;
                  display: block !important;
                }
                #print-preview-modal {
                  position: relative !important;
                  width: 100% !important;
                  height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                  background: white !important;
                  border: none !important;
                  box-shadow: none !important;
                  display: block !important;
                  transform: none !important;
                }
                #print-modal-body {
                  position: relative !important;
                  width: 100% !important;
                  height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                  padding: 0 !important;
                  background: transparent !important;
                  display: block !important;
                }
                #print-area {
                  position: relative !important;
                  width: 100% !important;
                  height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                  margin: 0 !important;
                  padding: 1.5cm !important;
                  background: white !important;
                  color: black !important;
                  display: block !important;
                }
                /* Hide elements inside modal container that are not #print-area */
                #print-modal-backdrop > :not(#print-preview-modal),
                #print-preview-modal > :not(#print-modal-body),
                #print-modal-body > :not(#print-area) {
                  display: none !important;
                }
                /* Hide anything marked no-print */
                .no-print {
                  display: none !important;
                }
              }
            `}} />

            <motion.div
              id="print-preview-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] text-white"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-850 p-5 bg-slate-900/80 sticky top-0 z-10 shrink-0 font-sans">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base font-sans">Imprimir Ficha Completa</h3>
                    <p className="text-[11px] text-slate-400">Visualização prévia do gabarito físico para impressão.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-trigger-print"
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs uppercase tracking-wider font-mono shadow-md transition active:scale-95"
                  >
                    <Printer className="w-4 h-4 text-slate-950" />
                    <span>Imprimir Agora</span>
                  </button>
                  <button
                    id="btn-close-print-modal"
                    onClick={() => setShowPrintModal(false)}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Scrollable visual preview */}
              <div id="print-modal-body" className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
                <div className="text-center mb-5 no-print">
                  <span className="text-[11px] bg-slate-900 border border-slate-850 text-slate-300 px-3 py-1.5 rounded-full inline-block font-medium">
                    💡 <strong>Dica:</strong> Na tela de impressão, ative a opção <strong>"Imprimir cores de fundo" / "Imprimir gráficos de fundo"</strong> para um visual perfeito.
                  </span>
                </div>

                {/* VISUAL & PRINT CONTROLLER SHEET (The print area targeted by ID) */}
                <div
                  id="print-area"
                  className="bg-white text-black p-8 rounded-2xl shadow-xl max-w-[210mm] mx-auto font-sans"
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                >
                  {/* Sheet Header */}
                  <div className="border-b-4 border-black pb-4 mb-6 flex justify-between items-start text-left">
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-black flex items-center gap-2 uppercase font-mono">
                        🏋️‍♂️ Ficha de Treino Semanal
                      </h1>
                      <p className="text-[11px] text-slate-700 font-medium">Sistema HevyFit • Acompanhamento Físico do Aluno</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2 py-1 rounded-md uppercase font-mono tracking-wider">
                        Rotina de Atividades
                      </span>
                    </div>
                  </div>

                  {/* Header Form Fields for writing on paper */}
                  <div className="grid grid-cols-4 gap-4 border border-black/80 rounded-lg p-4 bg-slate-50/50 mb-6 text-left">
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-700 block text-left">Atleta / Aluno</label>
                      <div className="border-b border-black text-xs font-semibold h-6 flex items-end text-black uppercase">
                        ______________________________________________________
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-700 block text-left">Data de Início</label>
                      <div className="border-b border-black text-xs font-mono h-6 flex items-end">
                        ____ / ____ / ________
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-700 block text-left">Peso Atual</label>
                      <div className="border-b border-black text-xs font-mono h-6 flex items-end">
                        __________ kg
                      </div>
                    </div>
                  </div>

                  {/* DETAILED DAYS PLAN LIST */}
                  <div className="space-y-8">
                    {[
                      { key: 1, label: 'Segunda-feira' },
                      { key: 2, label: 'Terça-feira' },
                      { key: 3, label: 'Quarta-feira' },
                      { key: 4, label: 'Quinta-feira' },
                      { key: 5, label: 'Sexta-feira' },
                      { key: 6, label: 'Sábado' },
                      { key: 0, label: 'Domingo' },
                    ].map((day) => {
                      const dayRoutines = routines.filter(r => r.dayOfWeek === day.key);
                      if (dayRoutines.length === 0) return null;

                      return (
                        <div key={day.key} className="break-inside-avoid space-y-4 text-left">
                          <h2 className="text-sm font-extrabold uppercase tracking-widest text-[11px] text-white bg-black px-3 py-1.5 rounded-md inline-block font-mono">
                            📅 {day.label}
                          </h2>
                          
                          {dayRoutines.map((routine) => (
                            <div key={routine.id} className="border-2 border-black/15 rounded-xl p-4 space-y-3 bg-white">
                              <div className="border-b-2 border-black/10 pb-2 flex justify-between items-start">
                                <div>
                                  <h3 className="text-base font-black text-black uppercase">{routine.name}</h3>
                                  <p className="text-xs text-slate-600 font-medium italic mt-0.5">{routine.description || "Sem descrição"}</p>
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 font-mono bg-slate-100 border border-slate-300 px-2 py-1 rounded">
                                  {routine.exercises.length} Exercícios
                                </span>
                              </div>

                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="border-b-2 border-black text-slate-700">
                                    <th className="py-2 font-bold w-1/3">Exercício</th>
                                    <th className="py-2 font-bold w-1/6">Grupo Alvo</th>
                                    <th className="py-2 font-bold w-1/12 text-center">Séries</th>
                                    <th className="py-2 font-bold w-1/4">Estrutura de Cargas</th>
                                    <th className="py-2 font-bold text-center w-1/12">⏱️ Rest</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {routine.exercises.map((item, idx) => {
                                    const exDetails = availableExercises.find(e => e.id === item.exerciseId);
                                    const warmupSets = item.sets.filter(s => s.type === 'Aquecimento').length;
                                    const adaptationSets = item.sets.filter(s => s.type === 'Adaptação').length;
                                    const workSets = item.sets.filter(s => s.type === 'Trabalho').length;
                                    
                                    const detailParts = [];
                                    if (warmupSets > 0) detailParts.push(`${warmupSets}x Aquecimento`);
                                    if (adaptationSets > 0) detailParts.push(`${adaptationSets}x Adaptação`);
                                    if (workSets > 0) detailParts.push(`${workSets}x Trabalho`);
                                    const structureStr = detailParts.join(' / ');

                                    return (
                                      <tr key={idx} className="border-b border-slate-200">
                                        <td className="py-3 font-semibold text-black">
                                          <div>{exDetails?.name || "Exercício"}</div>
                                          {item.observations && (
                                            <p className="text-[10px] text-slate-500 font-normal italic">Obs: {item.observations}</p>
                                          )}
                                        </td>
                                        <td className="py-3 text-slate-700">{exDetails?.targetMuscle || "Musculatura"}</td>
                                        <td className="py-3 text-center font-bold text-black">{item.sets.length}</td>
                                        <td className="py-3 text-slate-700 font-medium">
                                          <div>{structureStr}</div>
                                          <div className="text-[10px] text-slate-500 mt-0.5">
                                            {item.sets.map((s, sIdx) => (
                                              <span key={sIdx} className="inline-block mr-2 text-[9px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-bold font-mono">
                                                S{sIdx+1}: {s.weight ? `${s.weight}kg` : "___kg"} x {s.reps || "___"}r
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="py-3 text-center font-mono font-bold text-slate-700 bg-slate-50/50">{item.restTimer || 90}s</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>

                              <div className="pt-2">
                                <label className="text-[10px] font-bold text-slate-800 uppercase block tracking-wider mb-2 text-left">
                                  ✍️ Registro de Treino do Dia (Cargas e Repetições Reais)
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {routine.exercises.slice(0, 4).map((ex, exIdx) => {
                                    const exName = availableExercises.find(e => e.id === ex.exerciseId)?.name || 'Exercício';
                                    return (
                                      <div key={exIdx} className="border border-slate-300 rounded p-1.5 bg-slate-50/30 text-[10px]">
                                        <span className="font-bold block truncate text-slate-800">{exName}</span>
                                        <div className="space-y-1 mt-1 font-mono text-[9px] text-slate-500">
                                          {ex.sets.map((_, sIdx) => (
                                            <div key={sIdx} className="flex justify-between items-center">
                                              <span>Série {sIdx+1}:</span>
                                              <span>_______ kg x _______ reps</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {/* OTHER UNLINKED ROUTINES */}
                    {(() => {
                      const unlinkedRoutines = routines.filter(r => r.dayOfWeek === null || r.dayOfWeek === undefined);
                      if (unlinkedRoutines.length === 0) return null;

                      return (
                        <div className="break-inside-avoid space-y-4 text-left">
                          <h2 className="text-sm font-extrabold uppercase tracking-widest text-[11px] text-slate-800 bg-slate-200 px-3 py-1.5 rounded-md inline-block font-mono">
                            🔄 Outras Rotinas (Sem dia fixo)
                          </h2>

                          {unlinkedRoutines.map((routine) => (
                            <div key={routine.id} className="border-2 border-black/15 rounded-xl p-4 space-y-3 bg-white">
                              <div className="border-b-2 border-black/10 pb-2 flex justify-between items-start">
                                <div>
                                  <h3 className="text-base font-black text-black uppercase">{routine.name}</h3>
                                  <p className="text-xs text-slate-600 font-medium italic mt-0.5">{routine.description || "Sem descrição"}</p>
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 font-mono bg-slate-100 border border-slate-300 px-2 py-1 rounded">
                                  {routine.exercises.length} Exercícios
                                </span>
                              </div>

                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="border-b-2 border-black text-slate-700">
                                    <th className="py-2 font-bold w-1/3">Exercício</th>
                                    <th className="py-2 font-bold w-1/6">Grupo Alvo</th>
                                    <th className="py-2 font-bold w-1/12 text-center">Séries</th>
                                    <th className="py-2 font-bold w-1/4">Estrutura de Cargas</th>
                                    <th className="py-2 font-bold text-center w-1/12">⏱️ Rest</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {routine.exercises.map((item, idx) => {
                                    const exDetails = availableExercises.find(e => e.id === item.exerciseId);
                                    const warmupSets = item.sets.filter(s => s.type === 'Aquecimento').length;
                                    const adaptationSets = item.sets.filter(s => s.type === 'Adaptação').length;
                                    const workSets = item.sets.filter(s => s.type === 'Trabalho').length;
                                    
                                    const detailParts = [];
                                    if (warmupSets > 0) detailParts.push(`${warmupSets}x Aquecimento`);
                                    if (adaptationSets > 0) detailParts.push(`${adaptationSets}x Adaptação`);
                                    if (workSets > 0) detailParts.push(`${workSets}x Trabalho`);
                                    const structureStr = detailParts.join(' / ');

                                    return (
                                      <tr key={idx} className="border-b border-slate-200">
                                        <td className="py-3 font-semibold text-black">
                                          <div>{exDetails?.name || "Exercício"}</div>
                                          {item.observations && (
                                            <p className="text-[10px] text-slate-500 font-normal italic">Obs: {item.observations}</p>
                                          )}
                                        </td>
                                        <td className="py-3 text-slate-700">{exDetails?.targetMuscle || "Musculatura"}</td>
                                        <td className="py-3 text-center font-bold text-black">{item.sets.length}</td>
                                        <td className="py-3 text-slate-700 font-medium">
                                          <div>{structureStr}</div>
                                          <div className="text-[10px] text-slate-500 mt-0.5">
                                            {item.sets.map((s, sIdx) => (
                                              <span key={sIdx} className="inline-block mr-2 text-[9px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-bold font-mono">
                                                S{sIdx+1}: {s.weight ? `${s.weight}kg` : "___kg"} x {s.reps || "___"}r
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="py-3 text-center font-mono font-bold text-slate-700 bg-slate-50/50">{item.restTimer || 90}s</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* General observations area */}
                  <div className="border-t-2 border-black mt-8 pt-4 text-left">
                    <label className="text-[10px] font-bold text-black uppercase tracking-wider block mb-2 text-left">Anotações Gerais & Observações da Semana</label>
                    <div className="border border-slate-300 rounded-lg h-24 bg-slate-50/10 p-3 text-slate-500 text-xs">
                      Escreva aqui suas impressões gerais, dores físicas, necessidade de alteração de cargas ou metas alcançadas na semana...
                    </div>
                  </div>

                  <div className="mt-6 text-center text-[9px] text-slate-500 border-t border-slate-200 pt-2 font-mono flex justify-between">
                    <span>Ficha gerada em {new Date().toLocaleDateString('pt-BR')}</span>
                    <span>Progresso estilo HevyFit</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
