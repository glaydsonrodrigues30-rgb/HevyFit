/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Trophy, History, Dumbbell, TrendingUp, Calendar, ArrowRight, Plus, Edit, Trash2, X } from 'lucide-react';
import { Exercise, WorkoutHistory } from '../types';
import { INITIAL_EXERCISES } from '../repositories/mockExercises';
import { motion, AnimatePresence } from 'motion/react';

interface ExerciseProgressionProps {
  history: WorkoutHistory[];
  availableExercises: Exercise[];
  onAddExercise?: (exercise: Exercise) => void;
  onUpdateExercise?: (exercise: Exercise) => void;
  onDeleteExercise?: (id: string) => void;
}

export default function ExerciseProgression({
  history,
  availableExercises = INITIAL_EXERCISES,
  onAddExercise,
  onUpdateExercise,
  onDeleteExercise
}: ExerciseProgressionProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('bench_press');
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('Todos');

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
      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Curva de Carga Máxima Coletada (kg)</span>
          <span className="text-[10px] text-lime-400 font-bold bg-lime-500/10 px-2 py-0.5 rounded border border-lime-500/15">Séries Concluídas</span>
        </div>

        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#84cc16" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#84cc16" stopOpacity="0.0" />
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
                    className="stroke-slate-900"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={yVal + 4}
                    className="fill-slate-500 text-[10px] font-mono text-right"
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
            <path d={pathD} fill="none" className="stroke-lime-500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Circle Markers & Text */}
            {coords.map((c, idx) => (
              <g key={idx}>
                {/* Horizontal time label */}
                <text
                  x={c.x}
                  y={height - paddingBottom + 16}
                  className="fill-slate-500 text-[9px] font-mono"
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
                    className="fill-none stroke-lime-400 opacity-60 animate-ping"
                    strokeWidth="1"
                  />
                )}

                {/* Inner marker */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r="4"
                  className={`${c.weight === personalRecordWeight ? 'fill-lime-400 stroke-slate-950' : 'fill-slate-200 stroke-slate-950'}`}
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
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Exercícios Catalogados</h3>
            <button
              id="btn-create-exercise"
              onClick={() => {
                setEditingExercise(null);
                setShowExerciseFormModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 text-xs font-semibold transition active:scale-95 border border-lime-500/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Criar</span>
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              id="sidebar-search-exercise"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar braços, agachamento..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-white text-xs outline-none focus:border-lime-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {muscles.map((m) => (
              <button
                key={m}
                onClick={() => setMuscleFilter(m)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition shrink-0 ${
                  muscleFilter === m
                    ? 'bg-lime-500 border-lime-500 text-slate-950'
                    : 'border-slate-850 text-slate-400 hover:text-white hover:bg-slate-950'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable list of exercise items */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-2 max-h-[60vh] overflow-y-auto space-y-1">
          {filteredExercises.map((ex) => {
            const isSelected = ex.id === selectedExerciseId;
            const pointsCount = getExerciseHistoryPoints(ex.id).length;

            return (
              <button
                key={ex.id}
                id={`sidebar-select-exercise-${ex.id}`}
                onClick={() => setSelectedExerciseId(ex.id)}
                className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between border transition ${
                  isSelected
                    ? 'bg-lime-500/10 border-lime-500/50 text-white'
                    : 'bg-slate-950/20 border-transparent text-slate-400 hover:bg-slate-950 hover:text-white'
                }`}
              >
                <div className="space-y-0.5 truncate">
                  <span className={`font-bold text-xs truncate block ${isSelected ? 'text-lime-400' : 'text-slate-200'}`}>
                    {ex.name}
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
      </div>

      {/* Exercise statistics Details & progression charts (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {selectedExDetails ? (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-6">
            
            {/* Header description */}
            <div className="flex items-start justify-between border-b border-slate-850 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] text-lime-400 uppercase font-bold tracking-widest font-mono">
                  {selectedExDetails.category} • {selectedExDetails.equipment}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-white font-sans">{selectedExDetails.name}</h3>
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-850 text-xs shadow-inner">
                      <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider px-1">Excluir?</span>
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
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-[9px] uppercase tracking-wider transition"
                      >
                        Sim
                      </button>
                      <button
                        id="btn-cancel-delete-exercise"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[9px] uppercase tracking-wider transition"
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
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-lime-400 rounded transition"
                        title="Editar Exercício"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        id="btn-delete-exercise-trigger"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition"
                        title="Excluir Exercício"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                <span className="text-xs text-slate-450 block">Músculo principal acionado: <strong className="text-slate-300 font-semibold">{selectedExDetails.targetMuscle}</strong></span>
              </div>
              <div className="w-12 h-12 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-center text-lime-400 text-lg">
                🏋️
              </div>
            </div>

            {/* Stats Record KPIs Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Record Weight */}
              <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-center space-y-1">
                <div className="flex justify-center text-amber-400">
                  <Trophy className="w-4 h-4 fill-current" />
                </div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Carga Recorde</span>
                <p id="stat-record-weight" className="text-lg font-bold font-mono text-white">
                  {personalRecordWeight > 0 ? `${personalRecordWeight} kg` : '--'}
                </p>
              </div>

              {/* Record Volume */}
              <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-center space-y-1">
                <div className="flex justify-center text-cyan-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Volume Recorde</span>
                <p id="stat-record-volume" className="text-lg font-bold font-mono text-white">
                  {personalRecordVolume > 0 ? `${personalRecordVolume} kg` : '--'}
                </p>
              </div>

              {/* Record Reps */}
              <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-center space-y-1">
                <div className="flex justify-center text-rose-450">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Max Reps</span>
                <p id="stat-record-reps" className="text-lg font-bold font-mono text-white">
                  {personalRecordReps > 0 ? `${personalRecordReps} reps` : '--'}
                </p>
              </div>
            </div>

            {/* Progression Chart widget of the exercise */}
            {renderSVGChart()}

            {/* Session Logs listing */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-slate-300">
                <History className="w-4 h-4 text-lime-400" />
                <h4 className="font-bold text-sm">Diário de Cargas Registradas</h4>
              </div>

              {points.length === 0 ? (
                <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-850 text-center text-xs text-slate-500 italic">
                  Você ainda não possui treinos salvos com esse exercício. Comece a monitorar no log estilo Hevy!
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {points.slice().reverse().map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 hover:bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center justify-between text-xs transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-400 font-semibold">{new Date(p.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      
                      <div className="flex gap-4 font-mono">
                        <div className="text-right">
                          <span className="text-slate-500 text-[10px] block uppercase">Carga de topo</span>
                          <span className="text-white font-bold">{p.maxWeight} kg</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 text-[10px] block uppercase">Volume total</span>
                          <span className="text-lime-400 font-bold">{p.volume} kg</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 text-[10px] block uppercase">Max Reps</span>
                          <span className="text-white font-bold">{p.maxReps}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-3 text-white">
            <span className="text-2xl">🔍</span>
            <span className="text-sm font-semibold">Nenhum exercício selecionado</span>
            <span className="text-xs text-slate-450 max-w-sm">Navegue na barra lateral e selecione qual exercício você deseja analisar e ver as métricas e evolução de performance.</span>
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
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-white space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-lime-500/10 text-lime-400 flex items-center justify-center text-sm font-bold">
                    🏋️
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {editingExercise ? 'Editar Exercício' : 'Novo Exercício'}
                  </h3>
                </div>
                <button
                  id="btn-close-exercise-modal"
                  onClick={() => {
                    setShowExerciseFormModal(false);
                    setEditingExercise(null);
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveExercise} className="space-y-4 text-xs">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold block">Nome do Exercício</label>
                  <input
                    id="exercise-form-name"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Supino Reto com Halteres, Leg Press 45"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-lime-500 text-xs"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold block">Categoria</label>
                  <select
                    id="exercise-form-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
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
                    id="exercise-form-muscle"
                    value={formMuscle}
                    onChange={(e) => setFormMuscle(e.target.value)}
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
                    id="exercise-form-equipment"
                    value={formEquipment}
                    onChange={(e) => setFormEquipment(e.target.value)}
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
                    id="btn-cancel-save-exercise"
                    type="button"
                    onClick={() => {
                      setShowExerciseFormModal(false);
                      setEditingExercise(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-slate-300 hover:text-white transition font-semibold text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-submit-save-exercise"
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 transition font-bold text-center shadow-lg shadow-lime-500/10"
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
