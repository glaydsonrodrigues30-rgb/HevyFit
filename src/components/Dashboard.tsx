/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Dumbbell, Trophy, Flame, Scale, ChevronRight, Activity, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { WorkoutHistory, WeightEntry, TrainingCycle } from '../types';
import { motion } from 'motion/react';

interface DashboardProps {
  history: WorkoutHistory[];
  weightHistory: WeightEntry[];
  currentCycle: TrainingCycle | null;
  onNavigate: (tab: string) => void;
  onStartEmptyWorkout: () => void;
  onAddWeight: (weight: number, note: string) => void;
}

export default function Dashboard({
  history,
  weightHistory,
  currentCycle,
  onNavigate,
  onStartEmptyWorkout,
  onAddWeight,
}: DashboardProps) {
  const [quickWeight, setQuickWeight] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [showWeightSuccess, setShowWeightSuccess] = useState(false);

  // Statistics calculation
  const totalWorkouts = history.length;
  
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

  // Total volume calculation (weight * reps * sets)
  const totalVolume = history.reduce((sum, workout) => {
    return sum + workout.exercises.reduce((exSum, exercise) => {
      return exSum + exercise.sets.reduce((setSum, s) => {
        if (s.completed && s.weight && s.reps) {
          return setSum + (s.weight * parseReps(s.reps));
        }
        return setSum;
      }, 0);
    }, 0);
  }, 0);

  // Get current streak (days with consecutive workouts)
  const calculateStreak = () => {
    if (history.length === 0) return 0;
    
    // Parse unique dates when workouts occurred
    const dates = history.map(w => {
      const d = new Date(w.startTime);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }).sort((a,b) => b - a); // descending order
    
    const uniqueDates = Array.from(new Set(dates));
    
    let streak = 0;
    let today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    let expectedTime = today.getTime();
    
    // Check if user has trained today or yesterday to maintain active streak
    const firstWorkoutTime = uniqueDates[0];
    const diffDaysFromToday = Math.floor((expectedTime - firstWorkoutTime) / (24 * 60 * 60 * 1000));
    
    if (diffDaysFromToday > 1) {
      return 0; // Streak broken
    }
    
    let currentCheckTime = firstWorkoutTime;
    streak = 1;
    
    for (let i = 1; i < uniqueDates.length; i++) {
      const diff = Math.floor((currentCheckTime - uniqueDates[i]) / (24 * 60 * 60 * 1000));
      if (diff === 1) {
        streak++;
        currentCheckTime = uniqueDates[i];
      } else if (diff > 1) {
        break; // Streak broken further back
      }
    }
    
    return streak;
  };

  const currentStreak = calculateStreak();

  // Weight stats
  const latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : null;
  const initialWeight = weightHistory.length > 0 ? weightHistory[0].weight : null;
  const weightChange = latestWeight && initialWeight ? latestWeight - initialWeight : 0;

  // Workout frequencies in the last 7 days
  const getWeeklyWorkoutMatrix = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const now = new Date();
    const result = [];
    
    // Generate last 7 days starting from 6 days ago
    for (let i = 6; i >= 0; i--) {
      const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const isLogged = history.some(w => {
        const d = new Date(w.startTime);
        return d.getDate() === checkDate.getDate() &&
               d.getMonth() === checkDate.getMonth() &&
               d.getFullYear() === checkDate.getFullYear();
      });
      result.push({
        label: days[checkDate.getDay()],
        active: isLogged,
        dayOfMonth: checkDate.getDate()
      });
    }
    return result;
  };

  const weeklyMatrix = getWeeklyWorkoutMatrix();

  const handleQuickWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = parseFloat(quickWeight);
    if (!isNaN(weightVal) && weightVal > 0) {
      onAddWeight(weightVal, quickNote || 'Registro Rápido');
      setQuickWeight('');
      setQuickNote('');
      setShowWeightSuccess(true);
      setTimeout(() => setShowWeightSuccess(false), 3000);
    }
  };

  // Human-friendly date formatting
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div id="dashboard-view" className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-5 -translate-y-5">
          <Dumbbell className="w-48 h-48 text-lime-500" />
        </div>
        <div className="space-y-1 z-10">
          <h2 id="welcome-title" className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">
            Olá, <span className="text-lime-400">Atleta</span>! 👋
          </h2>
          <p className="text-slate-400 text-sm max-w-lg">
            Seu progresso está atualizado. Pronto para superar as marcas do treino anterior com o acompanhamento HevyFit?
          </p>
        </div>
        <div className="mt-4 md:mt-0 z-10 flex gap-3">
          <button
            id="dashboard-btn-start-training"
            onClick={onStartEmptyWorkout}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-lime-500 hover:bg-lime-600 font-semibold text-slate-950 transition-all font-sans text-sm shadow-lg shadow-lime-500/10 hover:shadow-lime-500/20 active:scale-95"
          >
            <Dumbbell className="w-4 h-4 fill-current" />
            <span>Iniciar Treino</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Treinos Registrados</span>
            <p id="kpi-workouts-count" className="text-2xl font-extrabold text-white font-sans">
              {totalWorkouts}
            </p>
          </div>
          <div className="w-10 h-10 bg-lime-500/10 rounded-xl flex items-center justify-center text-lime-400">
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Volume Acumulado</span>
            <p id="kpi-total-volume" className="text-2xl font-extrabold text-white font-sans">
              {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume} kg`}
            </p>
          </div>
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Streak Consecutivo</span>
            <p id="kpi-streak" className="text-2xl font-extrabold text-white font-sans">
              {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}
            </p>
          </div>
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5 fill-current" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Peso Corporal</span>
            <p id="kpi-weight" className="text-2xl font-extrabold text-white font-sans">
              {latestWeight ? `${latestWeight.toFixed(1)} kg` : '--'}
            </p>
          </div>
          <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400">
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Sections: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Progress trackers & summaries */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Consistency Tracking */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-lime-400" />
                <h3 className="font-semibold text-white text-base">Consistência da Semana</h3>
              </div>
              <span className="text-xs text-slate-400">Últimos 7 dias</span>
            </div>

            {/* 7 Day Blocks resembling GitHub style but adapted as premium app workout checkoff */}
            <div className="grid grid-cols-7 gap-3">
              {weeklyMatrix.map((day, ix) => (
                <div
                  key={ix}
                  className="flex flex-col items-center gap-2 bg-slate-950 border border-slate-850 p-2.5 rounded-xl"
                  title={`${day.dayOfMonth}: ${day.active ? 'Treinado' : 'Sem treino'}`}
                >
                  <span className="text-xs text-slate-400 font-semibold">{day.label}</span>
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      day.active
                        ? 'bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 shadow-md shadow-lime-500/15'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {day.dayOfMonth}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Legend / Tip */}
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-850">
              <AlertCircle className="w-3.5 h-3.5 text-lime-400 shrink-0" />
              <span>Marcar sets concluídos aciona o timer de descanso automático. Muito bom para manter o foco!</span>
            </div>
          </div>

          {/* Active Cycle Progress */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-lime-400" />
                <h3 className="font-semibold text-white text-base">Ciclo Atual de Treino</h3>
              </div>
              <button
                id="btn-navigate-cycle"
                onClick={() => onNavigate('cycle')}
                className="text-xs text-lime-400 hover:underline flex items-center gap-0.5"
              >
                <span>Configurar Ciclo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {currentCycle ? (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <span className="text-lg font-bold text-white block">{currentCycle.name}</span>
                    <span className="text-xs text-slate-400">
                      Foco do Ciclo: <span className="text-slate-300 font-medium">{currentCycle.targetFocus || 'Geral'}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-lime-400 block">
                      Semana {currentCycle.currentWeek} de {currentCycle.durationWeeks}
                    </span>
                    <span className="text-xs text-slate-500">
                      Iniciado em: {new Date(currentCycle.startDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Week Progression Timeline */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Início do Bloco</span>
                    <span>Progresso: {Math.round((currentCycle.currentWeek / currentCycle.durationWeeks) * 100)}%</span>
                    <span>Fim</span>
                  </div>
                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                    <div
                      className="bg-gradient-to-r from-lime-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(currentCycle.currentWeek / currentCycle.durationWeeks) * 100}%` }}
                    />
                  </div>
                </div>

                {currentCycle.goalWeight && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center justify-between text-xs text-slate-300">
                    <span>Meta de peso para fim do ciclo:</span>
                    <span className="font-mono font-bold text-white text-sm">{currentCycle.goalWeight} kg</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center space-y-3">
                <p className="text-xs text-slate-400 max-w-sm">
                  Você não possui um ciclo de treino ou bloco ativo. Configure um ciclo para acompanhar suas semanas de sobrecarga progressiva de volume.
                </p>
                <button
                  id="dashboard-btn-create-cycle"
                  onClick={() => onNavigate('cycle')}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-lime-500 hover:bg-lime-600 rounded-lg transition"
                >
                  Criar Primeiro Ciclo
                </button>
              </div>
            )}
          </div>

          {/* Recent Workouts List */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-base">Atividades Recentes</h3>
              <button
                id="btn-navigate-history"
                onClick={() => onNavigate('history')}
                className="text-xs text-lime-400 hover:underline flex items-center gap-0.5"
              >
                <span>Ver Todos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center p-6 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-xs text-slate-500">Nenhum treino concluído ainda. Vamos começar hoje!</span>
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(-3).reverse().map((workout) => {
                  const durationMins = Math.round(workout.durationMs / 60000);
                  const setsCount = workout.exercises.reduce((acc, curr) => acc + curr.sets.filter(s => s.completed).length, 0);

                  return (
                    <div
                      key={workout.id}
                      className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between hover:bg-slate-900/40 transition"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500 block uppercase font-mono">
                          {formatDate(workout.startTime)}
                        </span>
                        <h4 className="font-bold text-white text-sm">{workout.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                          <span>⏱️ {durationMins} min</span>
                          <span>🏋️ {setsCount} séries conclúidas</span>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <span className="text-xs text-slate-500 block">Séries Realizadas</span>
                        <div className="flex gap-1.5 justify-end">
                          {workout.exercises.slice(0, 3).map((ex, idx) => (
                            <span
                              key={idx}
                              style={{fontSize: '9px'}}
                              className="px-1.5 py-0.5 bg-slate-900 text-slate-300 border border-slate-800 rounded font-bold uppercase shrink-0"
                              title={ex.exerciseId}
                            >
                              {ex.exerciseId.slice(0, 5)}
                            </span>
                          ))}
                          {workout.exercises.length > 3 && (
                            <span style={{fontSize: '9px'}} className="px-1 py-0.5 bg-slate-900 text-slate-400 border border-slate-800 rounded font-bold shrink-0">
                              +{workout.exercises.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (4 cols): Quick logger Panel container */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Track Weight Widget */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-rose-400" />
              <h3 className="font-semibold text-white text-base">Registrar Peso Rápido</h3>
            </div>

            <form onSubmit={handleQuickWeightSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Peso Corporal (kg)</label>
                <div className="relative">
                  <input
                    id="input-quick-weight"
                    type="number"
                    step="0.1"
                    min="20"
                    max="300"
                    value={quickWeight}
                    onChange={(e) => setQuickWeight(e.target.value)}
                    placeholder="ex: 80.5"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2 px-3 text-white text-sm outline-none font-mono tracking-tight"
                    required
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">kg</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Observação rápida</label>
                <input
                  id="input-quick-weight-note"
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="ex: Peso em jejum"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2 px-3 text-white text-sm outline-none"
                />
              </div>

              <button
                id="btn-quick-weight-submit"
                type="submit"
                className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 font-bold py-2.5 rounded-xl text-xs text-white transition shadow-lg shadow-rose-500/10 active:scale-95"
              >
                Registrar Peso
              </button>

              {showWeightSuccess && (
                <div className="text-center p-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs border border-emerald-500/15 animate-fade-in">
                  Peso adicionado com sucesso! ⚖️
                </div>
              )}
            </form>

            {/* Quick Summary of weight progress */}
            {weightHistory.length > 0 && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2">
                <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Histórico de Variação</span>
                
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Peso Inicial:</span>
                  <span className="font-mono text-slate-300">{initialWeight?.toFixed(1)} kg</span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Peso Atual:</span>
                  <span className="font-mono text-white font-bold">{latestWeight?.toFixed(1)} kg</span>
                </div>

                <div className="flex justify-between text-xs pt-1 border-t border-slate-850">
                  <span className="text-slate-400">Diferença Total:</span>
                  <span className={`font-mono font-bold ${weightChange < 0 ? 'text-emerald-400' : weightChange > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {weightChange > 0 ? `+${weightChange.toFixed(1)}` : `${weightChange.toFixed(1)}`} kg
                  </span>
                </div>
              </div>
            )}
            
            <button
               id="dashboard-btn-navigate-weight"
               onClick={() => onNavigate('weight')}
               className="w-full text-center text-xs text-rose-400 hover:underline pt-1 block"
            >
              Ver diário completo de peso →
            </button>
          </div>

          {/* Quick tips about Hevy tracking */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-white text-sm">Dicas do Personal 💡</h3>
            <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <p>
                1. <strong>Sobrecarga Progressiva:</strong> Tente aumentar a carga em pelo menos 1kg ou realizar 1 repetição a mais do que o registrado no treino anterior.
              </p>
              <p>
                2. <strong>Tipos de Série:</strong> Use os tipos <em>Aquecimento</em>, <em>Adaptação</em> e <em>Trabalho</em> para organizar e registrar suas séries com precisão.
              </p>
              <p>
                3. <strong>Foco no descanso:</strong> Dores tardias? Descanse entre 90s a 120s para manter as fontes de ATP recarregadas.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
