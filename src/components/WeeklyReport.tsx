/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Printer, 
  Award, 
  Dumbbell, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight,
  TrendingDown,
  Layers,
  ChevronLeft
} from 'lucide-react';
import { WorkoutHistory, Exercise } from '../types';

interface WeeklyReportProps {
  history: WorkoutHistory[];
  availableExercises: Exercise[];
  onClose?: () => void;
}

interface WeekGroup {
  weekKey: string;
  label: string;
  startDate: Date;
  endDate: Date;
  workouts: WorkoutHistory[];
  totalVolume: number;
  totalSets: number;
  totalDurationMs: number;
  // Map of exerciseId -> max load completed in this week
  exerciseMaxLoad: { [exerciseId: string]: { weight: number; reps: number | string } };
  cycleWeeksAnnotated: number[];
}

export default function WeeklyReport({
  history,
  availableExercises,
  onClose
}: WeeklyReportProps) {
  const [groupingType, setGroupingType] = useState<'calendar' | 'cycle'>('calendar');
  const [expandedWeekKey, setExpandedWeekKey] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  // Map to find exercise human name
  const getExerciseName = (exId: string): string => {
    const found = availableExercises.find(e => e.id === exId);
    if (found) return found.name;
    // Fallback and formatting
    return exId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // 1. Group workouts and compute weekly aggregates
  const weeklyData = useMemo(() => {
    if (!history || history.length === 0) return [];

    const sortedHistory = [...history].sort((a, b) => a.startTime - b.startTime);
    const groups: { [key: string]: WeekGroup } = {};

    sortedHistory.forEach(workout => {
      let weekKey = '';
      let label = '';
      let weekStart = new Date();
      let weekEnd = new Date();

      if (groupingType === 'cycle' && workout.cycleWeek) {
        weekKey = `cycle-week-${workout.cycleWeek}`;
        label = `Semana do Bloco ${workout.cycleWeek}`;
        
        // Find rough date range for this cycle week based on workouts in it
        const sameWeekWorkouts = sortedHistory.filter(w => w.cycleWeek === workout.cycleWeek);
        const minTime = Math.min(...sameWeekWorkouts.map(w => w.startTime));
        const maxTime = Math.max(...sameWeekWorkouts.map(w => w.startTime));
        weekStart = new Date(minTime);
        weekEnd = new Date(maxTime);
      } else {
        // Default Calendar Week grouping (Monday to Sunday)
        const date = new Date(workout.startTime);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        // Standard ISO-like format for key sorting
        const year = monday.getFullYear();
        // Calculate week number
        const tempDate = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
        tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

        weekKey = `${year}-W${String(weekNo).padStart(2, '0')}`;
        
        const startStr = monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const endStr = sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        label = `Semana de ${startStr} a ${endStr}`;
        weekStart = monday;
        weekEnd = sunday;
      }

      if (!groups[weekKey]) {
        groups[weekKey] = {
          weekKey,
          label,
          startDate: weekStart,
          endDate: weekEnd,
          workouts: [],
          totalVolume: 0,
          totalSets: 0,
          totalDurationMs: 0,
          exerciseMaxLoad: {},
          cycleWeeksAnnotated: []
        };
      }

      groups[weekKey].workouts.push(workout);
      groups[weekKey].totalDurationMs += workout.durationMs;

      if (workout.cycleWeek && !groups[weekKey].cycleWeeksAnnotated.includes(workout.cycleWeek)) {
        groups[weekKey].cycleWeeksAnnotated.push(workout.cycleWeek);
      }

      // Compute volume and maximum loads
      (workout.exercises || []).forEach(ex => {
        let maxWeightForExThisWorkout = 0;
        let maxRepsForExThisWorkout: string | number = 0;

        (ex.sets || []).forEach(set => {
          if (set.completed || groupingType === 'calendar' || groupingType === 'cycle') { // count completed or all registered historical sets
            const weight = set.weight || 0;
            const reps = typeof set.reps === 'number' ? set.reps : parseInt(String(set.reps || '0')) || 0;
            
            // Increment sets and workout volume
            groups[weekKey].totalSets += 1;
            groups[weekKey].totalVolume += (weight * reps);

            if (weight > maxWeightForExThisWorkout) {
              maxWeightForExThisWorkout = weight;
              maxRepsForExThisWorkout = set.reps || reps;
            }
          }
        });

        // Set weekly maximum
        if (maxWeightForExThisWorkout > 0) {
          const existingMax = groups[weekKey].exerciseMaxLoad[ex.exerciseId]?.weight || 0;
          if (maxWeightForExThisWorkout > existingMax) {
            groups[weekKey].exerciseMaxLoad[ex.exerciseId] = {
              weight: maxWeightForExThisWorkout,
              reps: maxRepsForExThisWorkout
            };
          }
        }
      });
    });

    // Sort weeks chronologically
    return Object.values(groups).sort((a, b) => {
      if (groupingType === 'cycle') {
        const aNum = parseInt(a.weekKey.replace('cycle-week-', '')) || 0;
        const bNum = parseInt(b.weekKey.replace('cycle-week-', '')) || 0;
        return aNum - bNum;
      }
      return a.startDate.getTime() - b.endDate.getTime();
    });
  }, [history, groupingType]);

  // Expand the latest week by default
  React.useEffect(() => {
    if (weeklyData.length > 0 && !expandedWeekKey) {
      setExpandedWeekKey(weeklyData[weeklyData.length - 1].weekKey);
    }
  }, [weeklyData, expandedWeekKey]);

  // 2. Compute Week-over-Week overload evolutions
  const weeklyEvolutions = useMemo(() => {
    const evolutions: { 
      [weekKey: string]: {
        volumeDeltaPct: number;
        overloads: Array<{
          exerciseId: string;
          currentWeight: number;
          previousWeight: number;
          reps: string | number;
          diff: number;
        }>;
      } 
    } = {};

    for (let i = 0; i < weeklyData.length; i++) {
      const current = weeklyData[i];
      const previous = i > 0 ? weeklyData[i - 1] : null;
      const overloadsList = [];

      // Volume delta
      let volumeDeltaPct = 0;
      if (previous && previous.totalVolume > 0) {
        volumeDeltaPct = Math.round(((current.totalVolume - previous.totalVolume) / previous.totalVolume) * 100);
      }

      // Check load increases for each exercise performed this week compared to previous week
      if (previous) {
        Object.keys(current.exerciseMaxLoad).forEach(exId => {
          const currentMax = current.exerciseMaxLoad[exId];
          const previousMax = previous.exerciseMaxLoad[exId];

          if (previousMax && currentMax.weight > previousMax.weight) {
            overloadsList.push({
              exerciseId: exId,
              currentWeight: currentMax.weight,
              previousWeight: previousMax.weight,
              reps: currentMax.reps,
              diff: currentMax.weight - previousMax.weight
            });
          }
        });
      }

      evolutions[current.weekKey] = {
        volumeDeltaPct,
        overloads: overloadsList
      };
    }

    return evolutions;
  }, [weeklyData]);

  // Total summary aggregates
  const totalSummary = useMemo(() => {
    if (!history || history.length === 0) return { totalVolume: 0, totalWorkouts: 0, avgWorkoutTimeMin: 0, totalPRs: 0 };
    
    let totalVol = 0;
    history.forEach(w => {
      (w.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(s => {
          const wVal = s.weight || 0;
          const rVal = typeof s.reps === 'number' ? s.reps : parseInt(String(s.reps || '0')) || 0;
          totalVol += (wVal * rVal);
        });
      });
    });

    const durationsStr = history.map(w => w.durationMs);
    const totalDurationMs = durationsStr.reduce((acc, curr) => acc + curr, 0);
    const avgDurationMin = history.length > 0 ? Math.round((totalDurationMs / history.length) / 60000) : 0;

    // Total overload/progression milestones found
    let totalPRs = 0;
    Object.keys(weeklyEvolutions).forEach(key => {
      const evt = weeklyEvolutions[key];
      if (evt) {
        totalPRs += evt.overloads.length;
      }
    });

    return {
      totalVolume: totalVol,
      totalWorkouts: history.length,
      avgWorkoutTimeMin: avgDurationMin,
      totalPRs
    };
  }, [history, weeklyEvolutions]);

  const handlePrint = () => {
    try {
      setPrintError(null);
      window.print();
    } catch (err) {
      console.warn("Print failed or was blocked inside sandbox:", err);
      setPrintError(
        "A impressão não é permitida diretamente de dentro do painel integrado (Preview) por restrições de segurança do iframe. Por favor, clique no botão de 'Abrir em nova aba' (no topo superior direito do painel do AI Studio) para abrir e imprimir o relatório em tela cheia com sucesso!"
      );
    }
  };

  if (!history || history.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-10 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-white font-bold text-base">Sem dados históricos disponíveis</h3>
        <p className="text-slate-400 text-xs max-w-sm mx-auto">
          Complete algumas sessões de treino para podermos computar o volume totalizado de cargas e emitir seu relatório semanal de evolução.
        </p>
      </div>
    );
  }

  return (
    <div id="weekly-progression-report" className="space-y-6 print:p-0 print:bg-white print:text-black">
      
      {/* 1. DOCUMENT/REPORT HEADER (Designed for screen & print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-850 print:border-slate-300">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-[#a3e635] bg-lime-500/10 border border-lime-500/25 uppercase px-2 py-0.5 rounded-sm print:bg-slate-100 print:text-black print:border-slate-300">
              MÉTRICAS DE CONSTÂNCIA E CARGA
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight print:text-black">
            Relatório de Evolução HevyFit
          </h2>
          <p className="text-xs text-slate-400 print:text-slate-600">
            Acompanhamento semanal de sobrecarga progressiva, volume mecânico acumulado e progressos no bloco de treino.
          </p>
        </div>
        
        {/* Buttons (hidded in screen printer) */}
        <div className="flex items-center gap-2.5 print:hidden">
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-850 shrink-0">
            <button
              type="button"
              id="btn-grouping-calendar"
              onClick={() => {
                setGroupingType('calendar');
                setExpandedWeekKey(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                groupingType === 'calendar' 
                  ? 'bg-slate-800 text-white font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Calendário
            </button>
            <button
              type="button"
              id="btn-grouping-cycle"
              onClick={() => {
                setGroupingType('cycle');
                setExpandedWeekKey(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                groupingType === 'cycle' 
                  ? 'bg-slate-800 text-white font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ciclo Ativo
            </button>
          </div>

          <button
            type="button"
            id="btn-trigger-print"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 hover:border-slate-700 text-slate-200 text-xs font-bold border border-slate-800 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {printError && (
        <div className="bg-amber-500/10 border-2 border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 text-amber-300 text-xs text-left">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold uppercase font-mono tracking-wider text-[11px] text-amber-400">Impressão Bloqueada no Preview</h4>
            <p className="font-medium text-[11px] leading-relaxed text-amber-200/90">{printError}</p>
          </div>
        </div>
      )}

      {/* 2. OVERALL KPIs (Top summary card row) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850/60 print:bg-white print:border-slate-300">
          <span className="text-[10px] text-slate-500 font-mono block">SESSÕES TOTAIS</span>
          <p className="text-2xl font-black text-white font-mono mt-1 print:text-black">
            {totalSummary.totalWorkouts} <span className="text-xs font-normal text-slate-400">treinos</span>
          </p>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850/60 print:bg-white print:border-slate-300">
          <span className="text-[10px] text-slate-500 font-mono block">VOLUME TOTALIZADO</span>
          <p className="text-2xl font-black text-white font-mono mt-1 print:text-black">
            {totalSummary.totalVolume.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">kg</span>
          </p>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850/60 print:bg-white print:border-slate-300">
          <span className="text-[10px] text-slate-500 font-mono block">DURAÇÃO MÉDIA</span>
          <p className="text-2xl font-black text-white font-mono mt-1 print:text-black">
            {totalSummary.avgWorkoutTimeMin} <span className="text-xs font-normal text-slate-400">min</span>
          </p>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850/60 print:bg-white print:border-slate-300">
          <span className="text-[10px] text-slate-500 font-mono block">PEAK OVERLOADS</span>
          <p className="text-2xl font-black text-[#a3e635] font-mono mt-1 print:text-black">
            +{totalSummary.totalPRs} <span className="text-xs font-normal text-slate-400">incrementos</span>
          </p>
        </div>
      </div>

      {/* 3. PRINT ONLY DESCRIPTIVE HEADER */}
      <div className="hidden print:block bg-slate-50 border border-slate-200 p-4 rounded-lg mb-4 text-xs">
        <p className="font-bold mb-1">Dossier Gerado pelo Sistema de Treinos HevyFit</p>
        <p className="text-slate-600">Este relatório compila os dados históricos de treino salvos para o usuário logado para acompanhamento analítico. Análise de volume mecânico = séries x repetições x carga. Foco em sobrecarga progressiva.</p>
      </div>

      {/* 4. CHRONOLOGICAL WEEKS REPORT PANEL */}
      <div className="space-y-4 print:space-y-6">
        <h3 className="text-sm font-bold text-slate-300 font-mono tracking-wider uppercase border-b border-slate-850 pb-2 print:border-slate-300 print:text-black">
          Linha do Tempo de Sobrecarga (Semana a Semana)
        </h3>

        {weeklyData.length === 0 ? (
          <div className="text-center p-8 bg-slate-900/50 rounded-2xl border border-slate-850/40">
            <span className="text-xs text-slate-400 font-mono">Não foi possível computar agrupamentos de treino</span>
          </div>
        ) : (
          weeklyData.slice().reverse().map((week, index) => {
            const isExpanded = expandedWeekKey === week.weekKey;
            const evolution = weeklyEvolutions[week.weekKey] || { volumeDeltaPct: 0, overloads: [] };
            const workoutsCount = week.workouts.length;
            const avgDurationStr = Math.round((week.totalDurationMs / workoutsCount) / 60000);

            return (
              <div 
                key={week.weekKey} 
                className={`bg-slate-900 border transition-all rounded-2xl overflow-hidden print:border-slate-300 print:bg-white ${
                  isExpanded 
                    ? 'border-slate-700 shadow-xl shadow-black/30' 
                    : 'border-slate-850 hover:border-slate-800'
                }`}
              >
                {/* Week Header Selector Card */}
                <div 
                  id={`week-report-header-${week.weekKey}`}
                  onClick={() => setExpandedWeekKey(isExpanded ? null : week.weekKey)}
                  className="p-5 flex items-center justify-between cursor-pointer select-none print:cursor-default"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono tracking-wide flex items-center gap-1.5 uppercase font-bold">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {week.label}
                      {week.cycleWeeksAnnotated.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-lime-500/10 text-[#a3e635] rounded-sm text-[9px] border border-lime-500/10">
                          Semana do Bloco {week.cycleWeeksAnnotated.join(', ')}
                        </span>
                      )}
                    </span>
                    <h4 className="text-base font-black text-white tracking-tight print:text-black">
                      {week.label.includes('emana do Bloco') ? week.label : `Evolução Semanal - ${week.weekKey}`}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono pt-1">
                      <span>Completed: <strong className="text-white font-mono print:text-black">{workoutsCount} treinos</strong></span>
                      <span>•</span>
                      <span>Vol: <strong className="text-white font-mono print:text-black">{week.totalVolume.toLocaleString('pt-BR')} kg</strong></span>
                      {index < weeklyData.length - 1 && (
                        <>
                          <span>•</span>
                          <span className={`flex items-center gap-0.5 font-bold ${
                            evolution.volumeDeltaPct >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {evolution.volumeDeltaPct >= 0 ? '▲' : '▼'}{Math.abs(evolution.volumeDeltaPct)}% vol
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Toggle status indicator */}
                  <div className="flex items-center gap-3 print:hidden">
                    {evolution.overloads.length > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 rounded-lg text-[10px] font-bold">
                        <Award className="w-3 h-3 fill-current" />
                        <span>{evolution.overloads.length} Overloads</span>
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-lg bg-slate-950/80 hover:bg-slate-950 flex items-center justify-center border border-slate-850 text-slate-400 hover:text-white transition">
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </div>

                {/* Expanded/Report Details (Open by Default or Toggle) */}
                {(isExpanded || (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('print').matches)) && (
                  <div className="border-t border-slate-850 p-6 space-y-6 bg-slate-950/20 print:border-slate-300 print:bg-white print:p-0">
                    
                    {/* Part A: Metrics Dashboard for this specific week */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
                      
                      {/* Metric 1: Workout details executed */}
                      <div className="bg-slate-900 border border-slate-850 rounded-xl p-4.5 print:border-slate-300 print:bg-white">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">Sessões Concluídas</span>
                        <div className="mt-2 space-y-2">
                          {week.workouts.map(w => (
                            <div key={w.id} className="flex justify-between items-center text-xs">
                              <span className="text-slate-300 font-medium truncate max-w-[120px]">{w.name}</span>
                              <span className="text-slate-500 font-mono text-[10px]">{new Date(w.startTime).toLocaleDateString('pt-BR', { weekday: 'short' })} • {Math.round(w.durationMs / 60000)}m</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Metric 2: Progressive Overloads this week */}
                      <div className="bg-slate-900 border border-slate-850 rounded-xl p-4.5 print:border-slate-300 print:bg-white">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">Recordes Hevy de Cargas</span>
                        <div className="mt-2 space-y-1.5">
                          {evolution.overloads.length > 0 ? (
                            evolution.overloads.map((ov, oIdx) => (
                              <div key={oIdx} className="text-xs flex items-center justify-between">
                                <span className="text-slate-300 truncate max-w-[110px] font-medium">{getExerciseName(ov.exerciseId)}</span>
                                <span className="text-emerald-400 font-black font-mono text-[10px] bg-emerald-500/10 px-1 rounded">+{ov.diff}kg 📈</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-500 italic mt-4">
                              Nenhuma carga máxima foi superada em relação à semana de treino anterior.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Metric 3: Volume and density ratios */}
                      <div className="bg-slate-900 border border-slate-850 rounded-xl p-4.5 print:border-slate-300 print:bg-white">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">Densidade do Treino</span>
                        <div className="mt-2 text-xs space-y-2">
                          <div className="flex justify-between border-b border-slate-850/60 pb-1.5">
                            <span className="text-slate-400">Total de séries feitas</span>
                            <span className="font-bold text-white font-mono print:text-black">{week.totalSets} reps sets</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-850/60 pb-1.5">
                            <span className="text-slate-400">Tempo total de esforço</span>
                            <span className="font-bold text-white font-mono print:text-black">{Math.round(week.totalDurationMs / 60000)} minutos</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Volume por minuto</span>
                            <span className="font-bold text-white font-mono print:text-black">
                              {week.totalDurationMs > 0 ? Math.round(week.totalVolume / (week.totalDurationMs / 60000)) : 0} kg/min
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Part B: Full load max chart list */}
                    <div className="space-y-3">
                      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Cargas Máximas Alcançadas nesta Semana vs Período Anterior
                      </h5>

                      <div className="bg-slate-950 border border-slate-850/80 rounded-xl overflow-hidden print:border-slate-300">
                        <table className="w-full text-left text-xs text-slate-300 print:text-black">
                          <thead className="bg-slate-900 border-b border-slate-850 font-mono text-[10px] text-slate-400 uppercase print:bg-slate-100 print:border-slate-300">
                            <tr>
                              <th className="px-4 py-2.5 font-bold">Exercício Realizado</th>
                              <th className="px-4 py-2.5 font-bold text-center">Carga Alvo Máxima</th>
                              <th className="px-4 py-2.5 font-bold text-center">Repetições</th>
                              <th className="px-4 py-2.5 font-bold text-right">Comparativo Semanal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850/40 print:divide-slate-200">
                            {Object.keys(week.exerciseMaxLoad).map(exId => {
                              const loader = week.exerciseMaxLoad[exId];
                              const evo = evolution.overloads.find(o => o.exerciseId === exId);
                              const prevWeek = index > 0 ? weeklyData[index - 1] : null;
                              const prevVal = prevWeek?.exerciseMaxLoad[exId]?.weight || 0;

                              return (
                                <tr key={exId} className="hover:bg-slate-900/40 transition">
                                  <td className="px-4 py-3 font-semibold text-white print:text-black">
                                    {getExerciseName(exId)}
                                  </td>
                                  <td className="px-4 py-3 text-center font-bold font-mono">
                                    {loader.weight} kg
                                  </td>
                                  <td className="px-4 py-3 text-center text-slate-400 font-mono print:text-black">
                                    {loader.reps} reps
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {prevVal === 0 ? (
                                      <span className="text-[10px] text-slate-500 font-medium">Fase Inicial / Estável</span>
                                    ) : loader.weight > prevVal ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                        📈 +{(loader.weight - prevVal).toFixed(1)} kg
                                      </span>
                                    ) : loader.weight < prevVal ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 font-mono">
                                        📉 {(loader.weight - prevVal).toFixed(1)} kg
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 text-[10px] font-mono">＝ Estável ({prevVal}kg)</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Part C: Insights commentary */}
                    <div className="p-3 bg-slate-905 border border-slate-850 rounded-xl text-xs text-slate-300 italic flex gap-2 items-center print:border-slate-300 print:text-black">
                      <span className="text-base shrink-0">💡</span>
                      <p>
                        {evolution.overloads.length > 0 ? (
                          <>
                            Excelente evolução de volume físico! A sobrecarga progressiva foi bem-sucedida em <strong className="text-white print:text-black">{evolution.overloads.length} exercícios</strong> principais. Lembre-se de manter a cadência de descida controlada.
                          </>
                        ) : (
                          <>
                            Esta semana focou em consolidação e fixação das cargas ou regeneração muscular. Priorize manter o número de séries consistentes no próximo microciclo do HevyFit.
                          </>
                        )}
                      </p>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. RECOMMENDATIONS FOOTER PANEL */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 space-y-4 print:border-slate-300 print:bg-white">
        <h4 className="font-bold text-white text-base flex items-center gap-2 print:text-black">
          <Award className="w-5 h-5 text-[#a3e635]" />
          Orientações Práticas HevyFit de Sobrecarga
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 print:text-black">
          <div className="space-y-1.5">
            <h5 className="font-bold text-white font-sans print:text-black">1. Dobra de Resistência Mecânica (Overload)</h5>
            <p className="text-slate-400 print:text-slate-600 leading-relaxed text-[11px]">
              Se a carga máxima de um exercício permaneceu estável por 2 semanas mas você completou a meta superior de repetições (ex: 12 reps), aumente a carga em 2% na próxima sessão e reduza as repetições temporariamente para 8.
            </p>
          </div>

          <div className="space-y-1.5">
            <h5 className="font-bold text-white font-sans print:text-black">2. Volume e Descanso Sistemático</h5>
            <p className="text-slate-400 print:text-slate-600 leading-relaxed text-[11px]">
              O volume acumulado de treino varia de acordo com as semanas do bloco. Nas semanas de pico (semana 6 a 7 de 8), é comum o volume acumulado subir 20% antes de entrar em fase de Deload regenerativo.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
