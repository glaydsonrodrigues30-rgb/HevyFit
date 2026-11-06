import React, { useState, useMemo } from 'react';
import {
  Target,
  Award,
  Calendar,
  Clock,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  Timer,
  Layers,
  ArrowRight
} from 'lucide-react';
import { TafWeekDef, TafWorkoutDef, RunLog } from '../types';
import {
  TAF_WEEKS,
  TAF_PHASES_INFO,
  TAF_TARGET_METERS,
  TAF_TARGET_MINUTES,
  TAF_TARGET_SPEED_KMH,
  TAF_TARGET_PACE_STR,
  TAF_PRE_TEST_WORKOUT,
  getTafCurrentStatus
} from '../lib/tafPlanData';
import { motion, AnimatePresence } from 'motion/react';

interface TafPlanViewProps {
  runs?: RunLog[];
  onStartRunFromTaf: (workout: TafWorkoutDef, weekNumber: number) => void;
  onNavigateToRuns: () => void;
}

export default function TafPlanView({
  runs = [],
  onStartRunFromTaf,
  onNavigateToRuns
}: TafPlanViewProps) {
  const currentStatus = useMemo(() => getTafCurrentStatus(), []);

  // Today day of week: 0 = Dom, 1 = Seg, ..., 6 = Sab
  const todayDay = useMemo(() => new Date().getDay(), []);

  // Expanded workouts in 'Esta semana'
  const [expandedWorkoutKey, setExpandedWorkoutKey] = useState<string | null>(null);

  // Expanded Phase in 'Todas as semanas' (null = all collapsed, or number 1..4)
  const [expandedPhaseNumber, setExpandedPhaseNumber] = useState<number | null>(null);

  // Selected week to inspect (defaults to current or week 1)
  const activeWeekNumber = currentStatus.currentWeekNumber > 0 ? currentStatus.currentWeekNumber : 1;
  const activeWeek = useMemo(() => {
    return TAF_WEEKS.find(w => w.weekNumber === activeWeekNumber) || TAF_WEEKS[0];
  }, [activeWeekNumber]);

  // Check if a specific workout key was completed this week
  const isWorkoutCompleted = (workoutKey: 'A' | 'B' | 'C', week: TafWeekDef) => {
    return runs.some(r => {
      if (r.tafWeekNumber && r.tafWeekNumber === week.weekNumber) {
        if (workoutKey === 'A' && r.type === 'A leve/continuo') return true;
        if (workoutKey === 'B' && r.type === 'B fartlek ou trote-caminhada') return true;
        if (workoutKey === 'C' && (r.type === 'C moderado ou tiros' || r.type === 'Simulado 12 min')) return true;
      }
      return false;
    });
  };

  const getIntensityBadge = (label: TafWorkoutDef['intensityLabel']) => {
    switch (label) {
      case 'Leve':
        return 'bg-blue-500/10 border-blue-500/25 text-blue-400';
      case 'Moderado':
        return 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400';
      case 'Ritmo-alvo':
        return 'bg-[#2DD4BF]/15 border-[#2DD4BF]/30 text-[#2DD4BF] font-semibold';
      case 'Acima do alvo':
        return 'bg-[#F5B84B]/15 border-[#F5B84B]/30 text-[#F5B84B] font-semibold';
      case 'Simulado':
        return 'bg-[#7C6CFF]/15 border-[#7C6CFF]/30 text-[#7C6CFF] font-semibold';
      case 'Descanso / Taper':
        return 'bg-purple-500/10 border-purple-500/25 text-purple-400';
      default:
        return 'bg-[#1C1F26] text-[#9AA1AD]';
    }
  };

  return (
    <div id="taf-plan-view" className="space-y-6">

      {/* 1. TOPO: CARTÃO ENXUTO COM STATUS, PROGRESSO E CONTAGEM REGRESSIVA */}
      <section className="p-5 sm:p-6 rounded-[20px] bg-[#15171C] border border-[rgba(255,255,255,0.07)] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-[#2DD4BF]/15 text-[#2DD4BF] flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-[12px] font-semibold text-[#2DD4BF] uppercase tracking-wide">
                Plano TAF de 17 Semanas
              </span>
            </div>

            <h1 className="text-[22px] sm:text-[24px] font-semibold text-[#F2F3F5] tracking-tight">
              {currentStatus.isBeforeStart ? (
                <>O plano começa em 16/11 <span className="text-[15px] font-normal text-[#9AA1AD]">(faltam {currentStatus.daysUntilStart} dias)</span></>
              ) : (
                <>Semana {currentStatus.currentWeekNumber} de 17 • {activeWeek.phaseName}</>
              )}
            </h1>
          </div>

          {/* Contagem regressiva até a prova */}
          <div className="p-3 rounded-[14px] bg-[#1C1F26] border border-[rgba(255,255,255,0.05)] self-start sm:self-auto text-left sm:text-right">
            <span className="text-[11px] text-[#6B7280] font-medium block">
              Contagem regressiva
            </span>
            <p className="text-[18px] font-semibold text-[#F2F3F5] tabular-nums mt-0.5">
              {currentStatus.daysUntilTaf} dias <span className="text-[12px] text-[#2DD4BF] font-normal">até a prova</span>
            </p>
          </div>
        </div>

        {/* Barra de Progresso Enxuta */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[12px] text-[#9AA1AD]">
            <span>Período: {currentStatus.startDateFormatted} até {currentStatus.examDateFormatted}</span>
            <span className="tabular-nums font-medium text-[#F2F3F5]">
              {currentStatus.isBeforeStart ? 'Pré-início' : `${currentStatus.progressPercent}% concluído`}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#1C1F26] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2DD4BF] to-[#7C6CFF] transition-all duration-300"
              style={{ width: `${Math.max(4, currentStatus.progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Meta da Prova Banner Discreto */}
        <div className="p-3 rounded-[14px] bg-[#1C1F26]/60 border border-[rgba(255,255,255,0.04)] flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <span className="text-[#9AA1AD] flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#2DD4BF]" />
            <span>Meta Oficial: <strong>2.200 m</strong> em 12 minutos na esteira (1% inclinação)</span>
          </span>
          <span className="font-mono text-[#2DD4BF] font-semibold">
            11,0 km/h • 5:27/km
          </span>
        </div>
      </section>

      {/* 2. 'ESTA SEMANA': TRÊS LINHAS (SEGUNDA A, QUARTA B, SÁBADO C) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-[#F2F3F5]">
            Esta semana {currentStatus.isBeforeStart ? '(Semana 1 • Base)' : `(Semana ${currentStatus.currentWeekNumber})`}
          </h2>
          <span className="text-[12px] text-[#9AA1AD]">
            {activeWeek.startDate} a {activeWeek.endDate}
          </span>
        </div>

        <div className="space-y-2.5">
          {(['A', 'B', 'C'] as const).map((key) => {
            const workout = activeWeek.workouts[key];
            const isToday = (key === 'A' && todayDay === 1) || (key === 'B' && todayDay === 3) || (key === 'C' && todayDay === 6);
            const isCompleted = isWorkoutCompleted(key, activeWeek);
            const isExpanded = expandedWorkoutKey === key;

            return (
              <div
                key={key}
                className={`rounded-[18px] transition-all border ${
                  isToday
                    ? 'bg-[#1C1F26] border-[#2DD4BF]/50 shadow-sm'
                    : 'bg-[#15171C] border-[rgba(255,255,255,0.07)]'
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedWorkoutKey(isExpanded ? null : key)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-[10px] flex items-center justify-center font-semibold text-[13px] shrink-0 border ${
                        isCompleted
                          ? 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30'
                          : isToday
                          ? 'bg-[#2DD4BF]/15 text-[#2DD4BF] border-[#2DD4BF]/30'
                          : 'bg-[#1C1F26] text-[#9AA1AD] border-[rgba(255,255,255,0.06)]'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5 stroke-[2.2]" /> : key}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-[#F2F3F5] truncate">
                          {workout.title}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-semibold text-[#2DD4BF] bg-[#2DD4BF]/15 px-2 py-0.5 rounded-full shrink-0">
                            Hoje
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#9AA1AD] mt-0.5">
                        <span>{workout.dayName}</span>
                        <span>•</span>
                        <span className="tabular-nums">{workout.suggestedDurationMinutes} min</span>
                        <span>•</span>
                        <span>{workout.suggestedSpeedRange}</span>
                        <span className={`text-[10px] px-2 py-0.2 rounded-full border ${getIntensityBadge(workout.intensityLabel)}`}>
                          {workout.intensityLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Botão Registrar na linha de hoje */}
                    {isToday && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartRunFromTaf(workout, activeWeek.weekNumber);
                        }}
                        className="min-h-[38px] px-3.5 rounded-[10px] bg-[#2DD4BF] hover:bg-[#20b8a5] text-[#0E0F13] text-[12px] font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                      >
                        <Timer className="w-3.5 h-3.5" />
                        <span>Registrar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      aria-label="Expandir passo a passo"
                      className="p-1 text-[#9AA1AD] hover:text-[#F2F3F5] transition"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Passo a passo expandido */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4 pt-1 border-t border-[rgba(255,255,255,0.05)] space-y-2.5 text-[12px]"
                    >
                      <p className="text-[#9AA1AD] leading-relaxed pt-1">
                        {workout.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[#9AA1AD]">
                        <div className="p-2.5 rounded-[12px] bg-[#15171C]">
                          <span className="text-[#6B7280] block font-medium text-[10px]">Aquecimento</span>
                          <span className="text-[#F2F3F5]">{workout.warmup}</span>
                        </div>
                        <div className="p-2.5 rounded-[12px] bg-[#15171C]">
                          <span className="text-[#6B7280] block font-medium text-[10px]">Esteira</span>
                          <span className="text-[#F2F3F5]">{workout.incline}</span>
                        </div>
                        <div className="p-2.5 rounded-[12px] bg-[#15171C]">
                          <span className="text-[#6B7280] block font-medium text-[10px]">Volta à calma</span>
                          <span className="text-[#F2F3F5]">{workout.cooldown}</span>
                        </div>
                      </div>

                      {/* Lista de tiros se houver */}
                      {workout.intervals && workout.intervals.length > 0 && (
                        <div className="p-2.5 rounded-[12px] bg-[#15171C] space-y-1">
                          <span className="text-[#2DD4BF] font-semibold text-[11px] block">
                            Blocos / Tiros do Treino:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {workout.intervals.map((int, idx) => (
                              <span key={int.id || idx} className="px-2 py-0.5 rounded bg-[#1C1F26] text-[#F2F3F5] font-mono text-[11px]">
                                {int.label}: {int.speedKmh ? `${int.speedKmh} km/h` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isToday && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => onStartRunFromTaf(workout, activeWeek.weekNumber)}
                            className="px-3.5 py-1.5 rounded-[10px] bg-[#1C1F26] hover:bg-[#252a35] text-[#2DD4BF] text-[12px] font-medium transition cursor-pointer"
                          >
                            Registrar esta corrida
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. 'TODAS AS SEMANAS': ACORDEÃO POR FASE (FASES 1 A 4) */}
      <section className="space-y-3">
        <h2 className="text-[17px] font-semibold text-[#F2F3F5]">
          Todas as semanas por fase
        </h2>

        <div className="space-y-2">
          {TAF_PHASES_INFO.map((phase) => {
            const isPhaseExpanded = expandedPhaseNumber === phase.phase;
            const phaseWeeks = TAF_WEEKS.filter(w => w.phaseNumber === phase.phase);

            return (
              <div
                key={phase.phase}
                className="rounded-[18px] bg-[#15171C] border border-[rgba(255,255,255,0.07)] overflow-hidden"
              >
                {/* Phase header trigger */}
                <button
                  type="button"
                  onClick={() => setExpandedPhaseNumber(isPhaseExpanded ? null : phase.phase)}
                  className="w-full p-4 flex items-center justify-between text-left transition cursor-pointer hover:bg-[#1C1F26]/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-[8px] bg-[#1C1F26] text-[#2DD4BF] font-semibold text-[13px] flex items-center justify-center">
                      F{phase.phase}
                    </span>
                    <div>
                      <h3 className="text-[14px] font-semibold text-[#F2F3F5]">
                        Fase {phase.phase}: {phase.name}
                      </h3>
                      <p className="text-[12px] text-[#9AA1AD]">
                        {phase.weeks} • {phaseWeeks[0]?.startDate} a {phaseWeeks[phaseWeeks.length - 1]?.endDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#6B7280]">
                      {phaseWeeks.length} semanas
                    </span>
                    {isPhaseExpanded ? <ChevronUp className="w-4 h-4 text-[#9AA1AD]" /> : <ChevronDown className="w-4 h-4 text-[#9AA1AD]" />}
                  </div>
                </button>

                {/* Phase weeks list inside accordion */}
                <AnimatePresence>
                  {isPhaseExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4 pt-1 border-t border-[rgba(255,255,255,0.05)] space-y-2"
                    >
                      <p className="text-[12px] text-[#9AA1AD] italic pt-1 mb-2">
                        Meta: {phase.goal}
                      </p>

                      <div className="space-y-1.5">
                        {phaseWeeks.map((week) => (
                          <div
                            key={week.weekNumber}
                            className="p-3 rounded-[12px] bg-[#1C1F26]/60 border border-[rgba(255,255,255,0.04)] text-[12px] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-semibold text-[#F2F3F5]">
                                Semana {week.weekNumber}
                              </span>
                              <span className="text-[#6B7280] ml-2">
                                ({week.startDate} a {week.endDate})
                              </span>
                              <p className="text-[11px] text-[#9AA1AD] mt-0.5">
                                A: {week.workouts.A.suggestedDurationMinutes}m • B: {week.workouts.B.suggestedDurationMinutes}m • C: {week.workouts.C.suggestedDurationMinutes}m ({week.workouts.C.intensityLabel})
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => onStartRunFromTaf(week.workouts.A, week.weekNumber)}
                              className="text-[11px] font-medium text-[#2DD4BF] hover:underline self-start sm:self-auto"
                            >
                              Ver treino A
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
