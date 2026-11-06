/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Trophy, History, Dumbbell, TrendingUp, Calendar, ArrowRight, Plus, Edit, Trash2, X } from 'lucide-react';
import { Exercise, WorkoutHistory, StandardWorkout, StandardExercise } from '../types';
import { INITIAL_EXERCISES } from '../repositories/mockExercises';
import { motion, AnimatePresence } from 'motion/react';
import { TEXTS } from '../texts';

interface ExerciseProgressionProps {
  history: WorkoutHistory[];
  availableExercises: Exercise[];
  onAddExercise?: (exercise: Exercise) => void;
  onUpdateExercise?: (exercise: Exercise) => void;
  onDeleteExercise?: (id: string) => void;
  standardWorkouts?: StandardWorkout[];
  onAddStandardWorkout?: (newWorkout: StandardWorkout) => void;
  onDeleteStandardWorkout?: (id: string) => void;
}

export default function ExerciseProgression({
  history,
  availableExercises = INITIAL_EXERCISES,
  onAddExercise,
  onUpdateExercise,
  onDeleteExercise,
  standardWorkouts = [],
  onAddStandardWorkout,
  onDeleteStandardWorkout
}: ExerciseProgressionProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('bench_press');
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('Todos');

  // Quick/Safe Exercise Logger states (Rule #1, #2, #3, #5)
  const [tempExercises, setTempExercises] = useState<StandardExercise[]>([]);
  const [workoutName, setWorkoutName] = useState('');

  const [quickName, setQuickName] = useState('');
  const [quickSets, setQuickSets] = useState('');
  const [quickReps, setQuickReps] = useState('');
  const [quickWeight, setQuickWeight] = useState('');
  const [quickRest, setQuickRest] = useState('');

  const handleAddQuickExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const name = quickName.trim();
    const sets = quickSets;
    const reps = quickReps;
    const weight = quickWeight;
    const rest = quickRest;

    // Rule 1: VALIDAR CAMPOS (OBRIGATÓRIO)
    if (!name || !sets || !reps) {
      alert("Preencha os dados do exercício");
      return;
    }

    // Rule 2: GARANTIR FORMATO DO OBJETO
    const newExercise: StandardExercise = {
      id: 'ex_' + Date.now().toString(),
      name: name || "",
      sets: Number(sets),
      reps: String(reps),
      weight: Number(weight || 0),
      rest: Number(rest || 60),
      notes: ''
    };

    // Rule 3: ATUALIZAR ESTADO CORRETAMENTE (Usar setTempExercises(prev => [...prev, newExercise]))
    try {
      setTempExercises(prev => [...prev, newExercise]);
      
      // Clear inputs
      setQuickName('');
      setQuickSets('');
      setQuickReps('');
      setQuickWeight('');
      setQuickRest('');
    } catch (error) {
      // Rule 5: LOGAR ERROS
      console.error("Erro ao adicionar exercício temporário:", newExercise, error);
    }
  };

  const handleSaveStandardWorkout = () => {
    const trimmedName = workoutName.trim();
    if (!trimmedName || tempExercises.length === 0) return;

    const newWorkout: StandardWorkout = {
      id: 'workout_' + Date.now().toString(),
      name: trimmedName,
      exercises: tempExercises
    };

    if (onAddStandardWorkout) {
      onAddStandardWorkout(newWorkout);
    }
    setTempExercises([]);
    setWorkoutName('');
  };

  // Modal and form states
  const [showExerciseFormModal, setShowExerciseFormModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset confirmation state when selected exercise changes
  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [selectedExerciseId]);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Força' | 'Hipertrofia' | 'Cardio' | 'Calistenia'>('Hipertrofia');
  const [formMuscle, setFormMuscle] = useState('Peito');
  const [formEquipment, setFormEquipment] = useState('Halteres');

  // Pre-populate form when editing starts
  useEffect(() => {
    if (editingExercise) {
      setFormName(editingExercise.name);
      setFormCategory(editingExercise.category);
      setFormMuscle(editingExercise.targetMuscle);
      setFormEquipment(editingExercise.equipment);
    } else {
      setFormName('');
      setFormCategory('Hipertrofia');
      setFormMuscle('Peito');
      setFormEquipment('Halteres');
    }
  }, [editingExercise, showExerciseFormModal]);

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

  const handleSaveExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Por favor, informe o nome do exercício.');
      return;
    }

    if (editingExercise) {
      const updated: Exercise = {
        ...editingExercise,
        name: formName.trim(),
        category: formCategory,
        targetMuscle: formMuscle,
        equipment: formEquipment
      };
      onUpdateExercise?.(updated);
    } else {
      const newEx: Exercise = {
        id: 'ex_' + Date.now(),
        name: formName.trim(),
        category: formCategory,
        targetMuscle: formMuscle,
        equipment: formEquipment
      };
      onAddExercise?.(newEx);
      setSelectedExerciseId(newEx.id);
    }

    setShowExerciseFormModal(false);
    setEditingExercise(null);
  };

  // Find selected exercise details
  const selectedExDetails = availableExercises.find(e => e.id === selectedExerciseId) || availableExercises[0];

  // List of unique target muscles for filters
  const muscles = ['Todos', ...Array.from(new Set(availableExercises.map(e => e.targetMuscle)))];

  // Exercises filtered list
  const filteredExercises = availableExercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = muscleFilter === 'Todos' || e.targetMuscle === muscleFilter;
    return matchesSearch && matchesMuscle;
  });

  // Extract progression points for the selected exercise across completed history
  const getExerciseHistoryPoints = (exerciseId: string) => {
    const points: { date: number; maxWeight: number; maxReps: number; volume: number; dateStr: string }[] = [];

    // Sort history chronologically
    const chronologicalHistory = [...history].sort((a, b) => a.startTime - b.startTime);

    // Helper to extract numeric value from reps (including ranges "8 - 10") safely
    const parseReps = (val: string | number | null | undefined): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return val;
      const str = String(val).trim();
      if (!str) return 0;
      const parts = str.split(/[-–—/]/);
      if (parts.length > 1) {
        const lastVal = parseFloat(parts[parts.length - 1].trim());
        return isNaN(lastVal) ? (parseFloat(parts[0].trim()) || 0) : lastVal;
      }
      return parseFloat(str) || 0;
    };

    chronologicalHistory.forEach(workout => {
      const activeExMatches = workout.exercises.find(e => e.exerciseId === exerciseId);
      if (typeof activeExMatches !== 'undefined') {
        const completedSets = activeExMatches.sets.filter(s => s.completed);
        if (completedSets.length > 0) {
          // Find max weight recorded
          const weights = completedSets.map(s => s.weight || 0);
          const maxWeight = Math.max(...weights);

          // Find max reps recorded
          const reps = completedSets.map(s => parseReps(s.reps));
          const maxReps = Math.max(...reps);

          // Calculate volume for this exercise in this session
          const volume = completedSets.reduce((sum, s) => sum + ((s.weight || 0) * parseReps(s.reps)), 0);

          points.push({
            date: workout.startTime,
            dateStr: new Date(workout.startTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            maxWeight,
            maxReps,
            volume
          });
        }
      }
    });

    return points;
  };

  const points = getExerciseHistoryPoints(selectedExerciseId);

  // Stats calculation
  const personalRecordWeight = points.length > 0 ? Math.max(...points.map(p => p.maxWeight)) : 0;
  const personalRecordVolume = points.length > 0 ? Math.max(...points.map(p => p.volume)) : 0;
  const personalRecordReps = points.length > 0 ? Math.max(...points.map(p => p.maxReps)) : 0;

  // Custom SVG Area Chart renderer
  const renderSVGChart = () => {
    if (points.length < 2) {
      return (
        <div className="h-44 flex flex-col items-center justify-center bg-slate-950 rounded-xl border border-slate-850 p-4 text-center">
          <TrendingUp className="w-8 h-8 text-slate-700 mb-2" />
          <span className="text-xs text-slate-400 font-medium">Histórico insuficiente para gráficos</span>
          <span className="text-[10px] text-slate-500 mt-1 max-w-xs">Complete pelo menos 2 treinos que contenham este exercício para gerar a curva de evolução de cargas.</span>
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const weights = points.map(p => p.maxWeight);
    const minW = Math.max(0, Math.min(...weights) - 5);
    const maxW = Math.max(...weights) + 5;
    const rangeW = maxW - minW === 0 ? 1 : maxW - minW;

    // Map indexes to X coordinates, weight to Y coordinates
    const coords = points.map((p, idx) => {
      const x = paddingLeft + (idx / (points.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((p.maxWeight - minW) / rangeW) * chartHeight;
      return { x, y, weight: p.maxWeight, date: p.dateStr };
    });

    // Create Path String
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i].x} ${coords[i].y}`;
    }

    // Create Area Fill String
    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingBottom} L ${coords[0].x} ${height - paddingBottom} Z`;

    return (
      <div className="bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] p-4 rounded-[16px] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-[#9AA1AD]">Evolução de Carga Máxima (kg)</span>
          <span className="text-[11px] text-[#7C6CFF] font-semibold bg-[#7C6CFF]/15 px-2.5 py-0.5 rounded-full border border-[#7C6CFF]/25">
            Séries Concluídas
          </span>
        </div>

        <div className="relative pt-1">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C6CFF" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#7C6CFF" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0, 0.5, 1].map((val, idx) => {
              const yVal = paddingTop + val * chartHeight;
              const labelW = Math.round(maxW - val * rangeW);
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={yVal}
                    x2={width - paddingRight}
                    y2={yVal}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={yVal + 4}
                    className="fill-[#6B7280] text-[9px] font-mono text-right"
                    textAnchor="end"
                  >
                    {labelW}kg
                  </text>
                </g>
              );
            })}

            {/* Area under curve */}
            <path d={areaD} fill="url(#chart-grad)" />

            {/* Main Path Line */}
            <path d={pathD} fill="none" stroke="#7C6CFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Circle Markers & Text */}
            {coords.map((c, idx) => (
              <g key={idx}>
                {/* Horizontal time label */}
                <text
                  x={c.x}
                  y={height - paddingBottom + 16}
                  className="fill-[#6B7280] text-[9px] font-mono"
                  textAnchor="middle"
                >
                  {c.date}
                </text>

                {/* Outer pulsing ring for record */}
                {c.weight === personalRecordWeight && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="7"
                    className="fill-none stroke-[#7C6CFF] opacity-60 animate-ping"
                    strokeWidth="1"
                  />
                )}

                {/* Inner marker */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r="4"
                  className={c.weight === personalRecordWeight ? 'fill-[#7C6CFF] stroke-[#15171C]' : 'fill-[#F2F3F5] stroke-[#15171C]'}
                  strokeWidth="2"
                />

                {/* Small indicator label above dot */}
                <text
                  x={c.x}
                  y={c.y - 8}
                  className="fill-slate-350 text-[9px] font-mono font-bold"
                  textAnchor="middle"
                >
                  {c.weight}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div id="exercise-progression-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Exercise Selection Sidebar (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Search and Filters panel */}
        <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] p-4 rounded-[20px] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#F2F3F5] text-[15px]">Exercícios</h3>
            <button
              id="btn-create-exercise"
              onClick={() => {
                setEditingExercise(null);
                setShowExerciseFormModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#7C6CFF]/15 hover:bg-[#7C6CFF]/25 text-[#7C6CFF] text-[12px] font-semibold transition active:scale-95 border border-[#7C6CFF]/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Criar</span>
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6B7280]" />
            <input
              id="sidebar-search-exercise"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou músculo..."
              className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] pl-9 pr-4 py-2 text-[#F2F3F5] text-[13px] outline-none focus:border-[#7C6CFF]"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {muscles.map((m) => (
              <button
                key={m}
                onClick={() => setMuscleFilter(m)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition shrink-0 cursor-pointer ${
                  muscleFilter === m
                    ? 'bg-[#7C6CFF] text-white shadow-sm font-semibold'
                    : 'bg-[#1C1F26] text-[#9AA1AD] hover:text-[#F2F3F5] border border-[rgba(255,255,255,0.06)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable list of exercise items */}
        <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-2 max-h-[60vh] overflow-y-auto space-y-1">
          {filteredExercises.map((ex) => {
            const isSelected = ex.id === selectedExerciseId;
            const pointsCount = getExerciseHistoryPoints(ex.id).length;

            return (
              <button
                key={ex.id}
                id={`sidebar-select-exercise-${ex.id}`}
                onClick={() => setSelectedExerciseId(ex.id)}
                className={`w-full text-left p-2.5 rounded-[14px] flex items-center justify-between transition cursor-pointer border ${
                  isSelected
                    ? 'bg-[#1C1F26] border-[#7C6CFF]/40 text-[#F2F3F5]'
                    : 'border-transparent text-[#9AA1AD] hover:bg-[#1C1F26]/60 hover:text-[#F2F3F5]'
                }`}
              >
                <div className="space-y-0.5 truncate">
                  <span className={`font-semibold text-[13px] truncate block ${isSelected ? 'text-[#7C6CFF]' : 'text-[#F2F3F5]'}`}>
                    {ex.name || "Sem nome"}
                  </span>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                    <span className="px-1 bg-slate-950 border border-slate-850 rounded text-[8px]">{ex.targetMuscle}</span>
                    <span>{ex.equipment}</span>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  {pointsCount > 0 ? (
                    <span className="text-[9px] text-slate-400 font-mono bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded">
                      {pointsCount} reg
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-600 font-medium">Sem log</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick/Safe Exercise Form */}
        <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-4.5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.07)] pb-2.5">
            <span className="text-sm">⚡</span>
            <h4 className="font-semibold text-[#F2F3F5] text-[13px] tracking-wide">Adicionar Exercício Rápido</h4>
          </div>

          <form onSubmit={handleAddQuickExercise} className="space-y-3 text-[13px]">
            <div className="space-y-1">
              <label htmlFor="exercise-form-input-name" className="text-[11px] text-[#9AA1AD] font-medium block">Nome do Exercício</label>
              <input
                id="exercise-form-input-name"
                type="text"
                placeholder="Ex: Elevação Lateral, Tríceps Pulley"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2 text-[#F2F3F5] placeholder-[#9AA1AD]/50 outline-none focus:border-[#7C6CFF] text-[13px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="exercise-form-input-sets" className="text-[11px] text-[#9AA1AD] font-medium block">Séries</label>
                <input
                  id="exercise-form-input-sets"
                  type="number"
                  placeholder="Ex: 4"
                  value={quickSets}
                  onChange={(e) => setQuickSets(e.target.value)}
                  className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2 text-[#F2F3F5] placeholder-[#9AA1AD]/50 outline-none focus:border-[#7C6CFF] text-[13px] tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="exercise-form-input-reps" className="text-[11px] text-[#9AA1AD] font-medium block">Reps</label>
                <input
                  id="exercise-form-input-reps"
                  type="text"
                  placeholder="Ex: 12"
                  value={quickReps}
                  onChange={(e) => setQuickReps(e.target.value)}
                  className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2 text-[#F2F3F5] placeholder-[#9AA1AD]/50 outline-none focus:border-[#7C6CFF] text-[13px] tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="exercise-form-input-weight" className="text-[11px] text-[#9AA1AD] font-medium block">Carga (kg)</label>
                <input
                  id="exercise-form-input-weight"
                  type="number"
                  placeholder="Ex: 14"
                  value={quickWeight}
                  onChange={(e) => setQuickWeight(e.target.value)}
                  className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2 text-[#F2F3F5] placeholder-[#9AA1AD]/50 outline-none focus:border-[#7C6CFF] text-[13px] tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="exercise-form-input-rest" className="text-[11px] text-[#9AA1AD] font-medium block">Descanso (s)</label>
                <input
                  id="exercise-form-input-rest"
                  type="number"
                  placeholder="Ex: 60"
                  value={quickRest}
                  onChange={(e) => setQuickRest(e.target.value)}
                  className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2 text-[#F2F3F5] placeholder-[#9AA1AD]/50 outline-none focus:border-[#7C6CFF] text-[13px] tabular-nums"
                />
              </div>
            </div>

            <button
              id="btn-submit-quick-exercise"
              type="submit"
              className="w-full min-h-[44px] bg-gradient-to-r from-[#7C6CFF] to-[#6A5BF0] hover:from-[#8E80FF] hover:to-[#7C6CFF] text-white font-medium py-2.5 rounded-[12px] transition shadow-sm shadow-[#7C6CFF]/20 text-center text-[13px] cursor-pointer"
            >
              Adicionar ao Treino
            </button>
          </form>

          {/* Draft exercises and saving standard workouts */}
          {tempExercises.length > 0 && (
            <div className="space-y-3 border-t border-[rgba(255,255,255,0.07)] pt-3">
              <span className="text-[11px] text-[#9AA1AD] font-medium block">Exercícios no rascunho:</span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {tempExercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="bg-[#1C1F26] border border-[rgba(255,255,255,0.05)] p-2.5 rounded-[12px] flex items-center justify-between text-xs"
                  >
                    <div className="truncate">
                      <span className="font-semibold text-[#F2F3F5] block truncate text-[12px]">
                        {exercise.name || 'Sem nome'}
                      </span>
                      <span className="text-[11px] text-[#9AA1AD] tabular-nums">
                        {exercise.sets} série(s) × {exercise.reps} reps | {exercise.weight}kg | {exercise.rest}s
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTempExercises(prev => prev.filter(w => w.id !== exercise.id))}
                      className="text-[#9AA1AD] hover:text-[#FF6B6B] p-1 flex-shrink-0 cursor-pointer transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Form to save standard workout template */}
              <div className="bg-[#1C1F26] p-3 rounded-[14px] border border-[rgba(255,255,255,0.05)] space-y-2.5 mt-2">
                <label htmlFor="temp-workout-name-input" className="text-[11px] text-[#9AA1AD] font-medium block">Nome do Treino Padronizado</label>
                <input
                  id="temp-workout-name-input"
                  type="text"
                  placeholder="Ex: Treino A - Superior"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  className="w-full bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[10px] px-2.5 py-1.5 text-[#F2F3F5] text-xs outline-none focus:border-[#7C6CFF]"
                />
                <button
                  id="btn-save-temp-workout"
                  type="button"
                  onClick={handleSaveStandardWorkout}
                  disabled={!workoutName.trim()}
                  className="w-full min-h-[38px] text-white bg-gradient-to-r from-[#7C6CFF] to-[#6A5BF0] hover:from-[#8E80FF] hover:to-[#7C6CFF] disabled:opacity-40 rounded-[10px] font-medium text-[11px] transition cursor-pointer"
                >
                  Salvar Treino Completo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Saved standardized workouts directly fetched from Firestore */}
        {standardWorkouts.length > 0 && (
          <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-4.5 mt-4 space-y-3">
            <div className="flex items-center gap-1.5 border-b border-[rgba(255,255,255,0.07)] pb-2">
              <span className="text-[#4ADE80] text-xs font-bold">✓</span>
              <h4 className="font-semibold text-[#F2F3F5] text-[13px] tracking-wide">Treinos Padronizados</h4>
            </div>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {standardWorkouts.map((workout) => (
                <div key={workout.id} className="bg-[#1C1F26] border border-[rgba(255,255,255,0.05)] p-3 rounded-[14px] space-y-2 hover:border-[rgba(255,255,255,0.1)] transition">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#7C6CFF] text-[13px] truncate">{workout.name}</span>
                    <button
                      id={`btn-delete-standard-workout-${workout.id}`}
                      onClick={() => onDeleteStandardWorkout && onDeleteStandardWorkout(workout.id)}
                      className="text-[#9AA1AD] hover:text-[#FF6B6B] p-0.5 transition cursor-pointer"
                      title="Excluir treino"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {workout.exercises.map((ex, idx) => (
                      <div key={ex.id} className="text-[11px] text-[#9AA1AD] flex justify-between gap-1 items-center">
                        <span className="truncate">{idx + 1}. {ex.name || 'Sem nome'}</span>
                        <span className="text-[#F2F3F5] shrink-0 font-medium tabular-nums">{ex.sets}s × {ex.reps} | {ex.weight}kg | {ex.rest}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Exercise statistics Details & progression charts (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {selectedExDetails ? (
          <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-5 space-y-6">
            
            {/* Header description */}
            <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.07)] pb-4">
              <div className="space-y-1">
                <span className="text-[11px] text-[#7C6CFF] font-medium tracking-wide">
                  {selectedExDetails.category} • {selectedExDetails.equipment}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-[#F2F3F5]">{selectedExDetails.name}</h3>
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-1.5 bg-[#1C1F26] p-1.5 rounded-[10px] border border-[rgba(255,255,255,0.08)] text-xs shadow-inner">
                      <span className="text-[11px] text-[#FF6B6B] font-medium px-1">Excluir?</span>
                      <button
                        id="btn-confirm-delete-exercise"
                        onClick={() => {
                          onDeleteExercise?.(selectedExDetails.id);
                          const remaining = availableExercises.filter(e => e.id !== selectedExDetails.id);
                          if (remaining.length > 0) {
                            setSelectedExerciseId(remaining[0].id);
                          }
                          setShowDeleteConfirm(false);
                        }}
                        className="px-2.5 py-1 bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-medium rounded-[8px] text-[11px] transition cursor-pointer"
                      >
                        Sim
                      </button>
                      <button
                        id="btn-cancel-delete-exercise"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2.5 py-1 bg-[#15171C] hover:bg-[#252a35] text-[#9AA1AD] font-medium rounded-[8px] text-[11px] transition cursor-pointer"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        id="btn-edit-exercise-trigger"
                        onClick={() => {
                          setEditingExercise(selectedExDetails);
                          setShowExerciseFormModal(true);
                        }}
                        className="p-1.5 hover:bg-[#1C1F26] text-[#9AA1AD] hover:text-[#7C6CFF] rounded-[8px] transition cursor-pointer"
                        title="Editar Exercício"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        id="btn-delete-exercise-trigger"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-1.5 hover:bg-[#FF6B6B]/10 text-[#6B7280] hover:text-[#FF6B6B] rounded-[8px] transition cursor-pointer"
                        title="Excluir Exercício"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                <span className="text-[13px] text-[#9AA1AD] block">Músculo principal acionado: <strong className="text-[#F2F3F5] font-medium">{selectedExDetails.targetMuscle}</strong></span>
              </div>
              <div className="w-12 h-12 bg-[#1C1F26] border border-[rgba(255,255,255,0.07)] rounded-[14px] flex items-center justify-center text-[#7C6CFF] text-lg">
                🏋️
              </div>
            </div>

            {/* Stats Record KPIs Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Record Weight */}
              <div className="bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] p-3.5 rounded-[14px] text-center space-y-1">
                <div className="flex justify-center text-[#F5B84B]">
                  <Trophy className="w-4 h-4 fill-current" />
                </div>
                <span className="text-[11px] text-[#9AA1AD] block font-medium">Carga Recorde</span>
                <p id="stat-record-weight" className="text-base sm:text-lg font-semibold text-[#F2F3F5] tabular-nums">
                  {personalRecordWeight > 0 ? `${personalRecordWeight} kg` : '--'}
                </p>
              </div>

              {/* Record Volume */}
              <div className="bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] p-3.5 rounded-[14px] text-center space-y-1">
                <div className="flex justify-center text-[#7C6CFF]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-[11px] text-[#9AA1AD] block font-medium">Volume Recorde</span>
                <p id="stat-record-volume" className="text-base sm:text-lg font-semibold text-[#F2F3F5] tabular-nums">
                  {personalRecordVolume > 0 ? `${personalRecordVolume} kg` : '--'}
                </p>
              </div>

              {/* Record Reps */}
              <div className="bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] p-3.5 rounded-[14px] text-center space-y-1">
                <div className="flex justify-center text-[#2DD4BF]">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <span className="text-[11px] text-[#9AA1AD] block font-medium">Max Reps</span>
                <p id="stat-record-reps" className="text-base sm:text-lg font-semibold text-[#F2F3F5] tabular-nums">
                  {personalRecordReps > 0 ? `${personalRecordReps} reps` : '--'}
                </p>
              </div>
            </div>

            {/* Progression Chart widget of the exercise */}
            {renderSVGChart()}

            {/* Session Logs listing */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#F2F3F5]">
                <History className="w-4 h-4 text-[#7C6CFF]" />
                <h4 className="font-semibold text-[14px]">Diário de Cargas Registradas</h4>
              </div>

              {points.length === 0 ? (
                <div className="p-6 bg-[#1C1F26]/50 rounded-[14px] border border-[rgba(255,255,255,0.05)] text-center text-[13px] text-[#9AA1AD] italic">
                  Você ainda não possui treinos salvos com esse exercício.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {points.slice().reverse().map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-[#1C1F26] hover:bg-[#222630] border border-[rgba(255,255,255,0.05)] p-3 rounded-[12px] flex items-center justify-between text-xs transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-3.5 h-3.5 text-[#9AA1AD]" />
                        <span className="text-[#9AA1AD] font-medium">{new Date(p.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      
                      <div className="flex gap-4 tabular-nums">
                        <div className="text-right">
                          <span className="text-[#6B7280] text-[10px] block">Carga de topo</span>
                          <span className="text-[#F2F3F5] font-semibold">{p.maxWeight} kg</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#6B7280] text-[10px] block">Volume total</span>
                          <span className="text-[#7C6CFF] font-semibold">{p.volume} kg</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#6B7280] text-[10px] block">Max Reps</span>
                          <span className="text-[#F2F3F5] font-semibold">{p.maxReps}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-10 text-center flex flex-col items-center justify-center space-y-3 text-[#F2F3F5]">
            <span className="text-2xl">🔍</span>
            <span className="text-[15px] font-semibold">Nenhum exercício selecionado</span>
            <span className="text-[13px] text-[#9AA1AD] max-w-sm">Navegue na lista ao lado e selecione qual exercício você deseja analisar.</span>
          </div>
        )}
      </div>

      {/* EXERCISE FORM MODAL OVERLAY */}
      <AnimatePresence>
        {showExerciseFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              id="exercise-form-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden p-6 text-[#F2F3F5] space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[10px] bg-[#7C6CFF]/15 text-[#7C6CFF] flex items-center justify-center text-sm font-bold">
                    🏋️
                  </div>
                  <h3 className="font-semibold text-[#F2F3F5] text-base">
                    {editingExercise ? 'Editar Exercício' : 'Novo Exercício'}
                  </h3>
                </div>
                <button
                  id="btn-close-exercise-modal"
                  onClick={() => {
                    setShowExerciseFormModal(false);
                    setEditingExercise(null);
                  }}
                  className="p-1.5 text-[#9AA1AD] hover:text-[#F2F3F5] rounded-[8px] hover:bg-[#1C1F26] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveExercise} className="space-y-4 text-xs">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[12px] text-[#9AA1AD] font-medium block">Nome do Exercício</label>
                  <input
                    id="exercise-form-name"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Supino Reto com Halteres, Leg Press 45"
                    className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2.5 text-[#F2F3F5] outline-none focus:border-[#7C6CFF] text-[13px]"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[12px] text-[#9AA1AD] font-medium block">Categoria</label>
                  <select
                    id="exercise-form-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2.5 text-[#F2F3F5] outline-none focus:border-[#7C6CFF] text-[13px]"
                  >
                    <option value="Hipertrofia">Hipertrofia</option>
                    <option value="Força">Força</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Calistenia">Calistenia</option>
                  </select>
                </div>

                {/* Target Muscle */}
                <div className="space-y-1">
                  <label className="text-[12px] text-[#9AA1AD] font-medium block">Músculo Alvo principal</label>
                  <select
                    id="exercise-form-muscle"
                    value={formMuscle}
                    onChange={(e) => setFormMuscle(e.target.value)}
                    className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2.5 text-[#F2F3F5] outline-none focus:border-[#7C6CFF] text-[13px]"
                  >
                    {TARGET_MUSCLES_OPTIONS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Equipment */}
                <div className="space-y-1">
                  <label className="text-[12px] text-[#9AA1AD] font-medium block">Equipamento</label>
                  <select
                    id="exercise-form-equipment"
                    value={formEquipment}
                    onChange={(e) => setFormEquipment(e.target.value)}
                    className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2.5 text-[#F2F3F5] outline-none focus:border-[#7C6CFF] text-[13px]"
                  >
                    {EQUIPMENT_OPTIONS.map(eq => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>

                {/* Save actions */}
                <div className="flex gap-3 pt-3 border-t border-[rgba(255,255,255,0.07)]">
                  <button
                    id="btn-cancel-save-exercise"
                    type="button"
                    onClick={() => {
                      setShowExerciseFormModal(false);
                      setEditingExercise(null);
                    }}
                    className="flex-1 min-h-[44px] rounded-[12px] bg-[#1C1F26] border border-[rgba(255,255,255,0.07)] text-[#9AA1AD] hover:text-[#F2F3F5] transition font-medium text-[13px] text-center cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-submit-save-exercise"
                    type="submit"
                    className="flex-1 min-h-[44px] rounded-[12px] bg-gradient-to-r from-[#7C6CFF] to-[#6A5BF0] hover:from-[#8E80FF] hover:to-[#7C6CFF] text-white transition font-medium text-[13px] text-center shadow-md shadow-[#7C6CFF]/20 cursor-pointer"
                  >
                    Salvar Exercício
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
