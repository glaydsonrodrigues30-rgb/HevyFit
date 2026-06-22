/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Play, 
  Scale, 
  TrendingUp, 
  ChevronRight, 
  CalendarDays, 
  Dumbbell, 
  History,
  CheckCircle2,
  TrendingDown
} from 'lucide-react';
import { WorkoutHistory, WeightEntry, TrainingCycle, getCycleCurrentWeek, WorkoutRoutine } from '../types';

interface DashboardProps {
  history: WorkoutHistory[];
  weightHistory: WeightEntry[];
  currentCycle: TrainingCycle | null;
  routines: WorkoutRoutine[];
  onNavigate: (tab: string) => void;
  onStartWorkout: (name: string, exercises?: WorkoutRoutine['exercises']) => void;
  onStartEmptyWorkout: () => void;
  onAddWeight: (weight: number, note: string) => void;
}

export default function Dashboard({
  history,
  weightHistory,
  currentCycle,
  routines,
  onNavigate,
  onStartWorkout,
  onStartEmptyWorkout,
  onAddWeight,
}: DashboardProps) {
  // Try to pre-select today's routine based on dayOfWeek, otherwise default to first routine
  const todayDayIndex = new Date().getDay();
  const todayRoutine = routines.find(r => r.dayOfWeek === todayDayIndex);
  
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(
    todayRoutine?.id || (routines.length > 0 ? routines[0].id : 'custom')
  );
  
  const [quickWeight, setQuickWeight] = useState('');
  const [showWeightSuccess, setShowWeightSuccess] = useState(false);

  // Cycle auto tracking calculations
  const dynamicWeek = currentCycle ? getCycleCurrentWeek(currentCycle) : 1;
  const remainingWeeks = currentCycle ? Math.max(0, currentCycle.durationWeeks - dynamicWeek) : 0;
  const progressPct = currentCycle ? Math.round((dynamicWeek / currentCycle.durationWeeks) * 100) : 0;

  // Selected routine object
  const selectedRoutine = routines.find(r => r.id === selectedRoutineId);

  // Statistics calculation
  const latestWorkout = history.length > 0 ? history[history.length - 1] : null;

  // Weight entries
  const latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : null;
  const initialWeight = weightHistory.length > 0 ? weightHistory[0].weight : null;
  const weightChange = latestWeight && initialWeight ? latestWeight - initialWeight : 0;

  const handleStartSelected = () => {
    if (selectedRoutine && selectedRoutineId !== 'custom') {
      onStartWorkout(selectedRoutine.name, selectedRoutine.exercises);
    } else {
      onStartEmptyWorkout();
    }
  };

  const handleQuickWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = parseFloat(quickWeight);
    if (!isNaN(weightVal) && weightVal > 0) {
      onAddWeight(weightVal, 'Anotação rápida');
      setQuickWeight('');
      setShowWeightSuccess(true);
      setTimeout(() => setShowWeightSuccess(false), 3000);
    }
  };

  // Day of the week display
  const getTodayFullDate = () => {
    const days = [
      'DOMINGO',
      'SEGUNDA-FEIRA',
      'TERÇA-FEIRA',
      'QUARTA-FEIRA',
      'QUINTA-FEIRA',
      'SEXTA-FEIRA',
      'SÁBADO'
    ];
    const today = new Date();
    const formattedDate = today.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return `${days[today.getDay()]} • ${formattedDate.toUpperCase()}`;
  };

  // Human-friendly date formatting
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Phase computation
  const getPhaseInfo = (week: number, duration: number) => {
    if (week === 1) {
      return { 
        name: "Fase de Adaptação Anatômica", 
        icon: "🌱", 
        color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        desc: "Foco total na execução correta dos movimentos e recondicionamento articular." 
      };
    }
    if (week >= duration) {
      return { 
        name: "Fase de Deload & Supercompensação", 
        icon: "🧘", 
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        desc: "Treino regenerativo e recuperação ativa para consolidar os ganhos de força." 
      };
    }
    if (week <= Math.ceil(duration * 0.4)) {
      return { 
        name: "Fase de Base & Acumulação V2", 
        icon: "📈", 
        color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
        desc: "Crescimento contínuo de volume mecânico e aumento progressivo de séries." 
      };
    }
    return { 
      name: "Fase de Sobrecarga Progressiva", 
      icon: "🔥", 
      color: "text-lime-400 bg-lime-500/10 border-lime-500/20",
      desc: "Busca constante por sobrecarga física: foco em mais reps ou cargas elevadas." 
    };
  };

  const phase = currentCycle ? getPhaseInfo(dynamicWeek, currentCycle.durationWeeks) : null;

  return (
    <div id="dashboard-view" className="space-y-6">
      
      {/* Top Header Label */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center justify-between border-b border-slate-900 pb-3">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#a3e635] font-extrabold uppercase">
            {getTodayFullDate()}
          </span>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            PAINEL DE DECISÃO DIÁRIA
          </h1>
        </div>
        <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse"></span>
          Conectado ao Cloud
        </span>
      </div>

      {/* Main Execution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left/Main Column: HOJE (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* SEÇÃO "HOJE" CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-black/40">
            {/* Ambient Background Accent */}
            <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-12 -translate-y-12">
              <Dumbbell className="w-80 h-80 text-[#a3e635]" />
            </div>

            <div className="flex flex-col gap-4 relative z-10">
              
              {/* Card Title Header */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-[#a3e635] uppercase font-mono px-2 py-0.5 bg-lime-500/10 rounded-sm border border-lime-500/10">
                    EXCLUSIVO DIÁRIO
                  </span>
                  <h2 className="text-xl font-bold text-white tracking-tight mt-1">
                    Qual treino faremos hoje?
                  </h2>
                </div>
                {todayRoutine && (
                  <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-semibold uppercase px-2 py-1 rounded-md tracking-wider">
                    📅 Recomendado para Hoje
                  </span>
                )}
              </div>

              {/* ROUTINE SELECTION ROW/PILLS */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-2">
                {routines.map((routine) => {
                  const isSelected = selectedRoutineId === routine.id;
                  const isToday = routine.dayOfWeek === todayDayIndex;
                  return (
                    <button
                      key={routine.id}
                      type="button"
                      id={`pill-routine-${routine.id}`}
                      onClick={() => setSelectedRoutineId(routine.id)}
                      className={`text-left sm:text-center px-4 py-3 rounded-xl transition-all duration-200 border text-xs font-semibold ${
                        isSelected 
                          ? 'bg-[#a3e635] text-slate-950 border-[#a3e635] shadow-lg shadow-lime-500/10 scale-[1.02]' 
                          : 'bg-slate-950/80 hover:bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="truncate font-bold">
                        {routine.name.split('-')[0].trim()}
                      </div>
                      <div className={`text-[10px] font-mono mt-0.5 truncate ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                        {routine.exercises.length} Exs {isToday && '• Hoje'}
                      </div>
                    </button>
                  );
                })}
                
                {/* Fallback custom option */}
                <button
                  type="button"
                  id="pill-routine-custom"
                  onClick={() => setSelectedRoutineId('custom')}
                  className={`text-left sm:text-center px-4 py-3 rounded-xl transition-all duration-200 border text-xs font-semibold ${
                    selectedRoutineId === 'custom' 
                      ? 'bg-[#a3e635] text-slate-950 border-[#a3e635] shadow-lg shadow-lime-500/10 scale-[1.02]' 
                      : 'bg-slate-950/80 hover:bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold">Treino Avulso</div>
                  <div className={`text-[10px] font-mono mt-0.5 ${selectedRoutineId === 'custom' ? 'text-slate-800' : 'text-slate-500'}`}>
                    Sem modelo
                  </div>
                </button>
              </div>

              {/* Detail Preview parameters */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850/60 mt-1 min-h-[48px] flex items-center justify-between text-xs">
                {selectedRoutineId !== 'custom' && selectedRoutine ? (
                  <div className="space-y-1">
                    <p className="text-slate-300 font-medium">
                      <span className="font-bold text-white">{selectedRoutine.name}</span>
                    </p>
                    <p className="text-slate-400 text-[11px] italic">
                      {selectedRoutine.description || "Inicie para começar o rastreio HevyFit."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-slate-300 font-medium font-mono text-[11px]">
                      🏋️ Começar treino livre sem exercícios pré-definidos. Melhores cargas em tempo real!
                    </p>
                  </div>
                )}
                {selectedRoutineId !== 'custom' && selectedRoutine && (
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block font-mono">Duração Aproximada</span>
                    <span className="text-white font-bold font-mono">~ 55 min</span>
                  </div>
                )}
              </div>

              {/* CENTRAL MASIVE OR GLOWING BUTTON */}
              <div className="pt-2 text-center">
                <button
                  id="dashboard-btn-start-training"
                  type="button"
                  onClick={handleStartSelected}
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-lime-500 to-emerald-400 hover:from-lime-400 hover:to-emerald-300 font-black text-slate-950 text-base md:text-lg tracking-wide uppercase transition-all duration-300 shadow-xl shadow-lime-500/10 hover:shadow-lime-500/25 active:scale-[0.98] select-none flex items-center justify-center gap-3 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/15 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <Play className="w-5 h-5 fill-current shrink-0" />
                  <span>INICIAR TREINO AGORA</span>
                </button>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">
                  Sessão ativa rastreará cargas, repetições máximas e tempo sob tensão.
                </p>
              </div>

            </div>
          </div>

          {/* ACTIVE BLOCK/CYCLE WIDGET */}
          {currentCycle && phase ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block tracking-wider">
                    PROGRESSÃO DO BLOCO EM CURSO
                  </span>
                  <h3 className="font-bold text-white text-base">
                    {currentCycle.name}
                  </h3>
                </div>
                
                {/* Dynamically Styled Phase Badge */}
                <div className={`px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5 ${phase.color}`}>
                  <span>{phase.icon}</span>
                  <span>{phase.name}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-y border-slate-850 py-4 my-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-mono block">SEMANA ATUAL</span>
                  <p className="text-xl font-bold text-white font-mono">
                    Semana {dynamicWeek} <span className="text-xs text-slate-400 font-normal">de {currentCycle.durationWeeks}</span>
                  </p>
                </div>
                
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-mono block">SEMANAS RESTANTES</span>
                  <p className="text-xl font-bold text-[#a3e635] font-mono">
                    {remainingWeeks} {remainingWeeks === 1 ? 'semana' : 'semanas'}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-mono block">FOCO DO CICLO</span>
                  <p className="text-sm font-bold text-slate-200 truncate">
                    {currentCycle.targetFocus || 'Geral'}
                  </p>
                </div>
              </div>

              {/* Progress Bar Timeline */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Progresso Geral do Ciclo</span>
                  <span className="font-mono text-white font-semibold">{progressPct}%</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="bg-gradient-to-r from-lime-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  ℹ️ {phase.desc}
                </p>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 border-dashed rounded-2xl p-6 text-center space-y-3">
              <p className="text-xs text-slate-400">
                Você não possui um ciclo ativo para acompanhar as fases de sobreatribuição e volume HevyFit.
              </p>
              <button
                id="btn-navigate-create-cycle"
                onClick={() => onNavigate('cycle')}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-[#a3e635] hover:bg-lime-400 rounded-lg transition"
              >
                Configurar Ciclo
              </button>
            </div>
          )}

        </div>

        {/* Right Column: Weight, Activity (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* SIMPLIFIED BODY WEIGHT (Peso + Variação) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-rose-400" />
                <h3 className="font-bold text-white text-sm">Peso Corporal</h3>
              </div>
              <button
                 id="dashboard-btn-navigate-weight"
                 onClick={() => onNavigate('weight')}
                 className="text-[10px] text-rose-400 hover:underline font-mono"
              >
                Ver diário→
              </button>
            </div>

            {/* WEIGHT DISPLAY & DELTA */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-mono uppercase block">Último Peso</span>
                <p className="text-3xl font-black text-white font-mono tracking-tight">
                  {latestWeight ? `${latestWeight.toFixed(1)}` : '--'} <span className="text-base font-normal text-slate-400">kg</span>
                </p>
              </div>
              
              {latestWeight && weightHistory.length > 0 && (
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Variação</span>
                  <div className={`flex items-center justify-end gap-1 font-mono text-sm font-black ${
                    weightChange < 0 ? 'text-emerald-400' : weightChange > 0 ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {weightChange < 0 ? <TrendingDown className="w-4 h-4" /> : weightChange > 0 ? <TrendingUp className="w-4 h-4" /> : null}
                    <span>
                      {weightChange > 0 ? `+${weightChange.toFixed(1)}` : `${weightChange.toFixed(1)}`} kg
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK WEIGHT LOGGER INLINE */}
            <form onSubmit={handleQuickWeightSubmit} className="space-y-2 pt-1">
              <div className="relative">
                <input
                  id="input-quick-weight"
                  type="number"
                  step="0.1"
                  min="20"
                  max="300"
                  value={quickWeight}
                  onChange={(e) => setQuickWeight(e.target.value)}
                  placeholder="Novo peso kg (ex: 80.5)"
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-rose-500 focus:bg-slate-950 text-white rounded-xl py-2 px-3 text-xs outline-none font-mono transition"
                  required
                />
                <button
                  id="btn-quick-weight-submit"
                  type="submit"
                  className="absolute right-1 top-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition"
                >
                  Reg
                </button>
              </div>

              {showWeightSuccess && (
                <div className="text-center py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] border border-emerald-500/15 font-semibold">
                  Peso atualizado! ⚖️
                </div>
              )}
            </form>

          </div>

          {/* SIMPLIFIED HISTORY (Single last Workout) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#a3e635]" />
                <h3 className="font-bold text-white text-sm">Último Treino</h3>
              </div>
              <button
                id="btn-navigate-history"
                onClick={() => onNavigate('history')}
                className="text-[10px] text-[#a3e635] hover:underline font-mono"
              >
                Ver todos
              </button>
            </div>

            {latestWorkout ? (
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3 hover:bg-slate-950/80 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-semibold text-slate-500 font-mono uppercase">
                      {formatDate(latestWorkout.startTime)}
                    </span>
                    <h4 className="font-bold text-white text-xs truncate max-w-[150px]">
                      {latestWorkout.name}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-semibold">
                    ⏱️ {Math.round(latestWorkout.durationMs / 60000)} min
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-850 pt-2 font-mono">
                  <span>Exercícios:</span>
                  <span className="text-white font-bold">{latestWorkout.exercises.length}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {latestWorkout.exercises.slice(0, 3).map((ex, idx) => (
                    <span
                      key={idx}
                      style={{ fontSize: '9px' }}
                      className="px-1.5 py-0.5 bg-slate-900 text-slate-300 border border-slate-800 rounded uppercase font-bold"
                    >
                      {ex.exerciseId.replaceAll('_', ' ').split(' ').slice(0, 2).join(' ')}
                    </span>
                  ))}
                  {latestWorkout.exercises.length > 3 && (
                    <span style={{ fontSize: '9px' }} className="px-1.5 py-0.5 bg-slate-900 text-slate-400 border border-slate-850 rounded font-bold">
                      +{latestWorkout.exercises.length - 3}
                    </span>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center p-6 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-[11px] text-slate-500 font-mono">Nenhum treino no HevyFit ainda!</span>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
