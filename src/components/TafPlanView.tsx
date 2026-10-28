import React, { useState } from 'react';
import {
  Target,
  Award,
  Calendar,
  Clock,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  Flame,
  ChevronRight,
  ChevronLeft,
  Info,
  ArrowRight,
  TrendingUp,
  Layers,
  Sparkles
} from 'lucide-react';
import { TafWeekDef, TafWorkoutDef } from '../types';
import {
  TAF_WEEKS,
  TAF_PHASES_INFO,
  TAF_TARGET_METERS,
  TAF_TARGET_MINUTES,
  TAF_TARGET_SPEED_KMH,
  TAF_TARGET_PACE_STR,
  TAF_START_DATE_STR,
  TAF_END_DATE_STR,
  getTafCurrentStatus
} from '../lib/tafPlanData';

interface TafPlanViewProps {
  onStartRunFromTaf: (workout: TafWorkoutDef, weekNumber: number) => void;
  onNavigateToRuns: () => void;
}

export default function TafPlanView({
  onStartRunFromTaf,
  onNavigateToRuns
}: TafPlanViewProps) {
  const currentStatus = getTafCurrentStatus();

  // Current selected week state (defaults to calculated current week)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(currentStatus.currentWeekNumber);

  // Selected week object
  const selectedWeek = TAF_WEEKS.find(w => w.weekNumber === selectedWeekNumber) || TAF_WEEKS[0];
  const selectedPhaseInfo = TAF_PHASES_INFO[selectedWeek.phaseNumber - 1];

  // Intensity color badges helper
  const getIntensityBadge = (label: TafWorkoutDef['intensityLabel']) => {
    switch (label) {
      case 'Leve':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'Moderado':
        return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400';
      case 'Ritmo-alvo':
        return 'bg-lime-500/20 border-lime-500/40 text-lime-400 font-bold';
      case 'Acima do alvo':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold';
      case 'Simulado':
        return 'bg-gradient-to-r from-amber-500/20 to-lime-500/20 border-lime-500/40 text-lime-300 font-black';
      case 'Descanso / Taper':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div id="taf-plan-view" className="space-y-6">

      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-widest text-lime-400 font-extrabold uppercase bg-lime-500/10 border border-lime-500/20 px-2 py-0.5 rounded">
              PROGRAMAÇÃO OFICIAL • 17 SEMANAS
            </span>
            <span className="text-xs text-slate-400 font-mono">
              02/11/2026 até 28/02/2027
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-lime-400 stroke-[2.5]" />
            PLANO TAF DE 17 SEMANAS
          </h1>
        </div>

        <button
          type="button"
          onClick={onNavigateToRuns}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-bold flex items-center gap-2 transition self-start md:self-auto"
        >
          <Clock className="w-3.5 h-3.5 text-lime-400" />
          <span>Ver Diário de Corridas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* COUNTDOWN & TARGET BANNER HERO CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-lime-500/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 opacity-5 pointer-events-none transform translate-x-12 -translate-y-6">
          <Award className="w-72 h-72 text-lime-400" />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left: Target and Status (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/20 text-xs font-mono font-bold text-lime-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>META DA PROVA: 2.200 METROS EM 12 MINUTOS</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Velocidade-Alvo: <span className="text-lime-400">11,0 km/h</span> • Ritmo: <span className="text-cyan-300">5:27/km</span>
            </h2>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-xl">
              Plano periodizado em 4 fases na esteira com 1% de inclinação. Corridas fixas na <strong className="text-white">Segunda (A)</strong>, <strong className="text-white">Quarta (B)</strong> e <strong className="text-white">Sábado (C)</strong>. Terça, quinta, sexta e domingo são dedicados à musculação HevyFit ou descanso.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono">
              <span className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
                ⏱️ Aquecimento: 5m cam + 3-5m trote
              </span>
              <span className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
                📐 Inclinação: 1% na esteira
              </span>
              <span className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
                🧘 Volta à calma: 5 min
              </span>
            </div>
          </div>

          {/* Right: Countdown Counter Widget (5 cols) */}
          <div className="lg:col-span-5 bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                CONTAGEM REGRESSIVA ATÉ A PROVA
              </span>
              <span className="text-[10px] text-lime-400 font-mono font-bold">28/02/2027</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 font-mono block">DIAS RESTANTES</span>
                <p className="text-3xl font-black text-lime-400 font-mono">
                  {currentStatus.daysUntilTaf}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">dias para a prova</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 font-mono block">SEMANA ATUAL</span>
                <p className="text-3xl font-black text-white font-mono">
                  {currentStatus.currentWeekNumber} <span className="text-xs text-slate-400 font-normal">/ 17</span>
                </p>
                <span className="text-[10px] text-cyan-400 font-mono font-bold">
                  {currentStatus.phaseName}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Progresso do Plano:</span>
                <span className="text-white font-bold">{Math.round((currentStatus.currentWeekNumber / 17) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-lime-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((currentStatus.currentWeekNumber / 17) * 100)}%` }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* AS 4 FASES DO PLANO TAF (CARDS DE RESUMO) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Estrutura das 4 Fases de Preparação
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Clique em uma semana abaixo para abrir os treinos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {TAF_PHASES_INFO.map((p) => {
            const isCurrentPhase = currentStatus.phaseNumber === p.phase;
            return (
              <div
                key={p.phase}
                className={`rounded-2xl p-4 border transition ${
                  isCurrentPhase
                    ? 'bg-slate-900 border-lime-500/40 shadow-lg shadow-lime-500/5'
                    : 'bg-slate-950/80 border-slate-850 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${p.color}`}>
                    Fase {p.phase}: {p.name}
                  </span>
                  {isCurrentPhase && (
                    <span className="text-[9px] bg-lime-500 text-slate-950 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                      Atual
                    </span>
                  )}
                </div>

                <p className="text-xs font-mono text-slate-400 mb-1.5 font-bold">
                  {p.weeks.split('(')[0].trim()}
                </p>

                <p className="text-[11px] text-slate-300 leading-snug line-clamp-3">
                  {p.goal}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-850/60 text-[10px] font-mono text-slate-400">
                  <span className="text-slate-500">Velocidades:</span> <span className="font-bold text-slate-200">{p.intensity}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SELETOR INTERATIVO DE SEMANAS (1 A 17) */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-lime-400" />
            <h3 className="font-bold text-white text-sm">Selecione a Semana do Treino (1 a 17):</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedWeekNumber <= 1}
              onClick={() => setSelectedWeekNumber(prev => Math.max(1, prev - 1))}
              className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-lime-400 px-2">
              Semana {selectedWeekNumber}
            </span>
            <button
              type="button"
              disabled={selectedWeekNumber >= 17}
              onClick={() => setSelectedWeekNumber(prev => Math.min(17, prev + 1))}
              className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal scrollable week pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {TAF_WEEKS.map((w) => {
            const isSelected = selectedWeekNumber === w.weekNumber;
            const isCurrent = currentStatus.currentWeekNumber === w.weekNumber;
            return (
              <button
                key={w.weekNumber}
                type="button"
                onClick={() => setSelectedWeekNumber(w.weekNumber)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-mono font-bold transition border flex flex-col items-center ${
                  isSelected
                    ? 'bg-lime-500 text-slate-950 border-lime-400 shadow-md shadow-lime-500/20 scale-105'
                    : isCurrent
                    ? 'bg-slate-950 text-lime-400 border-lime-500/40 hover:bg-slate-850'
                    : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>SEM {w.weekNumber}</span>
                <span className={`text-[9px] font-normal ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                  {isCurrent ? '• Atual' : `Fase ${w.phaseNumber}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DETALHES DA SEMANA SELECIONADA */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 space-y-6 shadow-xl">
        
        {/* Week Title & Goals Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-850 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${selectedPhaseInfo.color}`}>
                FASE {selectedWeek.phaseNumber}: {selectedWeek.phaseName.toUpperCase()}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {selectedWeek.startDate} a {selectedWeek.endDate}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight mt-1">
              Programação da Semana {selectedWeek.weekNumber} de 17
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              🎯 <strong className="text-lime-400 font-mono">Foco:</strong> {selectedWeek.phaseGoals}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-850">
            <span className="text-lime-400 font-bold">3 Corridas Fixas:</span>
            <span>Seg (A) • Qua (B) • Sáb (C)</span>
          </div>
        </div>

        {/* OS 3 TREINOS DA SEMANA: CORRIDA A, B E C */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* CORRIDA A (SEGUNDA-FEIRA) */}
          <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  📅 SEGUNDA-FEIRA
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${getIntensityBadge(selectedWeek.workouts.A.intensityLabel)}`}>
                  {selectedWeek.workouts.A.intensityLabel}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">
                  {selectedWeek.workouts.A.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {selectedWeek.workouts.A.description}
                </p>
              </div>

              {/* Speeds and metrics */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Velocidade Sugerida:</span>
                  <span className="text-white font-bold">{selectedWeek.workouts.A.suggestedSpeedRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ritmo Estimado:</span>
                  <span className="text-cyan-300 font-bold">{selectedWeek.workouts.A.targetPaceFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duração / Distância:</span>
                  <span className="text-lime-400 font-bold">
                    {selectedWeek.workouts.A.suggestedDurationMinutes} min • ~{selectedWeek.workouts.A.suggestedDistanceKm} km
                  </span>
                </div>
              </div>

              {/* Intervals preview if any */}
              {selectedWeek.workouts.A.intervals && selectedWeek.workouts.A.intervals.length > 0 && (
                <div className="bg-slate-900/30 p-2.5 rounded-lg border border-slate-850/60 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 font-mono block">
                    Intervalos ({selectedWeek.workouts.A.intervals.length} tiros):
                  </span>
                  <p className="text-[10px] font-mono text-slate-300">
                    {selectedWeek.workouts.A.intervals[0].notes}
                  </p>
                </div>
              )}

              {/* Warmup & cooldown notes */}
              <div className="text-[10px] font-mono text-slate-500 space-y-1">
                <p>• {selectedWeek.workouts.A.warmup}</p>
                <p>• {selectedWeek.workouts.A.incline}</p>
                <p>• {selectedWeek.workouts.A.cooldown}</p>
              </div>
            </div>

            <button
              type="button"
              id="btn-start-run-a"
              onClick={() => onStartRunFromTaf(selectedWeek.workouts.A, selectedWeek.weekNumber)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-lime-500/10 active:scale-98 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar Corrida A</span>
            </button>
          </div>

          {/* CORRIDA B (QUARTA-FEIRA) */}
          <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  📅 QUARTA-FEIRA
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${getIntensityBadge(selectedWeek.workouts.B.intensityLabel)}`}>
                  {selectedWeek.workouts.B.intensityLabel}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">
                  {selectedWeek.workouts.B.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {selectedWeek.workouts.B.description}
                </p>
              </div>

              {/* Speeds and metrics */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Velocidade Sugerida:</span>
                  <span className="text-white font-bold">{selectedWeek.workouts.B.suggestedSpeedRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ritmo Estimado:</span>
                  <span className="text-cyan-300 font-bold">{selectedWeek.workouts.B.targetPaceFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duração / Distância:</span>
                  <span className="text-lime-400 font-bold">
                    {selectedWeek.workouts.B.suggestedDurationMinutes} min • ~{selectedWeek.workouts.B.suggestedDistanceKm} km
                  </span>
                </div>
              </div>

              {/* Intervals preview if any */}
              {selectedWeek.workouts.B.intervals && selectedWeek.workouts.B.intervals.length > 0 && (
                <div className="bg-slate-900/30 p-2.5 rounded-lg border border-slate-850/60 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 font-mono block">
                    Intervalos ({selectedWeek.workouts.B.intervals.length} repetições):
                  </span>
                  <p className="text-[10px] font-mono text-slate-300">
                    {selectedWeek.workouts.B.intervals[0].notes}
                  </p>
                </div>
              )}

              {/* Warmup & cooldown notes */}
              <div className="text-[10px] font-mono text-slate-500 space-y-1">
                <p>• {selectedWeek.workouts.B.warmup}</p>
                <p>• {selectedWeek.workouts.B.incline}</p>
                <p>• {selectedWeek.workouts.B.cooldown}</p>
              </div>
            </div>

            <button
              type="button"
              id="btn-start-run-b"
              onClick={() => onStartRunFromTaf(selectedWeek.workouts.B, selectedWeek.weekNumber)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-lime-500/10 active:scale-98 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar Corrida B</span>
            </button>
          </div>

          {/* CORRIDA C (SÁBADO) */}
          <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  📅 SÁBADO
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${getIntensityBadge(selectedWeek.workouts.C.intensityLabel)}`}>
                  {selectedWeek.workouts.C.intensityLabel}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                  {selectedWeek.workouts.C.isTafSimulation && <Award className="w-4 h-4 text-amber-400" />}
                  {selectedWeek.workouts.C.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {selectedWeek.workouts.C.description}
                </p>
              </div>

              {/* Speeds and metrics */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Velocidade Sugerida:</span>
                  <span className="text-white font-bold">{selectedWeek.workouts.C.suggestedSpeedRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ritmo Estimado:</span>
                  <span className="text-cyan-300 font-bold">{selectedWeek.workouts.C.targetPaceFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duração / Distância:</span>
                  <span className="text-lime-400 font-bold">
                    {selectedWeek.workouts.C.suggestedDurationMinutes} min • ~{selectedWeek.workouts.C.suggestedDistanceKm} km
                  </span>
                </div>
              </div>

              {/* Intervals preview if any */}
              {selectedWeek.workouts.C.intervals && selectedWeek.workouts.C.intervals.length > 0 && (
                <div className="bg-slate-900/30 p-2.5 rounded-lg border border-slate-850/60 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 font-mono block">
                    Intervalos ({selectedWeek.workouts.C.intervals.length} repetições):
                  </span>
                  <p className="text-[10px] font-mono text-slate-300">
                    {selectedWeek.workouts.C.intervals[0].notes}
                  </p>
                </div>
              )}

              {/* Warmup & cooldown notes */}
              <div className="text-[10px] font-mono text-slate-500 space-y-1">
                <p>• {selectedWeek.workouts.C.warmup}</p>
                <p>• {selectedWeek.workouts.C.incline}</p>
                <p>• {selectedWeek.workouts.C.cooldown}</p>
              </div>
            </div>

            {selectedWeek.workouts.C.suggestedDurationMinutes > 0 ? (
              <button
                type="button"
                id="btn-start-run-c"
                onClick={() => onStartRunFromTaf(selectedWeek.workouts.C, selectedWeek.weekNumber)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-lime-500/10 active:scale-98 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar Corrida C</span>
              </button>
            ) : (
              <div className="text-center py-2 text-xs font-mono text-purple-400 bg-purple-500/10 rounded-xl border border-purple-500/20">
                Dia de Descanso Total Pré-TAF
              </div>
            )}
          </div>

        </div>

        {/* REST OF DAYS NOTICE */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <p className="text-slate-300">
              <strong className="text-white">Terça, Quinta, Sexta e Domingo:</strong> Dias sem corrida. Mantenha os treinos de musculação no HevyFit e priorize a recuperação muscular e articular.
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-500 shrink-0">
            Frequência ideal: 3x corrida / semana
          </span>
        </div>

      </div>

    </div>
  );
}
