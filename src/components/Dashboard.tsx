/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Scale, 
  Dumbbell, 
  History,
  CheckCircle2, 
  Timer, 
  ArrowRight,
  ChevronRight,
  X,
  Plus,
  Flame,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { 
  WorkoutHistory, 
  WeightEntry, 
  TrainingCycle, 
  WorkoutRoutine, 
  TafWorkoutDef, 
  RunLog,
  ActiveWorkout 
} from '../types';
import { getTodayTafWorkout, getTafCurrentStatus, useActivePlan, buildPreTest } from '../lib/tafPlanData';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  history: WorkoutHistory[];
  weightHistory: WeightEntry[];
  currentCycle: TrainingCycle | null;
  routines: WorkoutRoutine[];
  runs?: RunLog[];
  activeWorkout?: ActiveWorkout | null;
  currentUser?: any;
  onNavigate: (tab: string) => void;
  onStartWorkout: (name: string, exercises?: WorkoutRoutine['exercises']) => void;
  onStartEmptyWorkout: () => void;
  onAddWeight: (weight: number, note: string) => void;
  onStartRunFromTaf?: (workout: TafWorkoutDef, weekNumber: number) => void;
  onCancelActiveWorkout?: () => void;
}

export default function Dashboard({
  history = [],
  weightHistory = [],
  currentCycle,
  routines = [],
  runs = [],
  activeWorkout = null,
  currentUser = null,
  onNavigate,
  onStartWorkout,
  onStartEmptyWorkout,
  onAddWeight,
  onStartRunFromTaf,
  onCancelActiveWorkout,
}: DashboardProps) {
  // Routine switch modal
  const [showRoutinePickerModal, setShowRoutinePickerModal] = useState(false);
  // Discard workout confirm modal (in-app, no window.confirm)
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  // Day plan inspection modal
  const [selectedDayPlan, setSelectedDayPlan] = useState<{
    fullLabel: string;
    dateStr: string;
    routine: WorkoutRoutine | null;
    isRunDay: boolean;
    runInfo: string;
  } | null>(null);

  // Quick weight input
  const [quickWeight, setQuickWeight] = useState('');
  const [weightSuccess, setWeightSuccess] = useState(false);

  // Current date details
  const today = useMemo(() => new Date(), []);
  const todayDayIndex = today.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sab

  // User first name
  const userFirstName = useMemo(() => {
    if (!currentUser?.displayName) return 'atleta';
    const first = currentUser.displayName.trim().split(' ')[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  }, [currentUser]);

  // Today formatted by full locale in lowercase (e.g. "sexta-feira, 6 de novembro")
  const todayFormattedDate = useMemo(() => {
    return today.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).toLowerCase();
  }, [today]);

  // TAF running workout status for today
  const runPlan = useActivePlan();
  const todayTaf = useMemo(() => getTodayTafWorkout(new Date(), runPlan), [runPlan]);

  // Today scheduled routine based on dayOfWeek (1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab, 0=Dom)
  const todayRoutine = useMemo(() => {
    return routines.find(r => r.dayOfWeek === todayDayIndex) || null;
  }, [routines, todayDayIndex]);

  // Check if a workout has already been completed today
  const todayCompletedWorkout = useMemo(() => {
    const todayStr = today.toDateString();
    return history.find(w => new Date(w.startTime).toDateString() === todayStr) || null;
  }, [history, today]);

  // Check if a run was logged today
  const todayCompletedRun = useMemo(() => {
    const todayStr = today.toDateString();
    return runs.find(r => new Date(r.timestamp || r.date).toDateString() === todayStr) || null;
  }, [runs, today]);

  // Week Strip Calculation (Segunda a Domingo)
  const weekStrip = useMemo(() => {
    const diffToMonday = todayDayIndex === 0 ? -6 : 1 - todayDayIndex;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const fullLabels = [
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
      'Domingo'
    ];

    return [0, 1, 2, 3, 4, 5, 6].map(offset => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + offset);
      const dayOfWeek = d.getDay(); // 1=Seg..6=Sab, 0=Dom
      const dateStr = d.toDateString();

      // Check if workout was completed on this date
      const hasWorkoutDone = history.some(w => new Date(w.startTime).toDateString() === dateStr);
      // Check if routine is scheduled for this day
      const scheduledRoutine = routines.find(r => r.dayOfWeek === dayOfWeek) || null;
      const hasWorkoutPlanned = Boolean(scheduledRoutine);

      // Check if run was completed on this date
      const hasRunDone = runs.some(r => new Date(r.timestamp || r.date).toDateString() === dateStr);
      // Corrida planejada vem do plano editável (dia da semana de cada treino da semana do plano)
      const planStatus = getTafCurrentStatus(d, runPlan);
      const plannedRun = !planStatus.isBeforeStart && !planStatus.isAfterEnd
        ? [planStatus.currentWeek.workouts.A, planStatus.currentWeek.workouts.B, planStatus.currentWeek.workouts.C]
            .find(w => w.suggestedDurationMinutes > 0 && w.dayOfWeek === dayOfWeek) || null
        : null;
      const hasRunPlanned = Boolean(plannedRun);
      const runInfo = plannedRun ? plannedRun.title : 'Sem corrida planejada';

      return {
        date: d,
        dayOfWeek,
        label: labels[offset],
        fullLabel: fullLabels[offset],
        dayNumber: d.getDate(),
        isToday: dateStr === today.toDateString(),
        hasWorkoutDone,
        hasWorkoutPlanned,
        hasRunDone,
        hasRunPlanned,
        scheduledRoutine,
        runInfo
      };
    });
  }, [today, todayDayIndex, history, routines, runs, runPlan]);

  // Weekly progress chip (e.g. "3 de 5 treinos esta semana")
  const weeklyStats = useMemo(() => {
    const diffToMonday = todayDayIndex === 0 ? -6 : 1 - todayDayIndex;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const workoutsThisWeek = history.filter(
      w => w.startTime >= monday.getTime() && w.startTime <= sunday.getTime()
    );
    const runsThisWeek = runs.filter(
      r => {
        const t = r.timestamp || new Date(r.date).getTime();
        return t >= monday.getTime() && t <= sunday.getTime();
      }
    );

    const totalVolumeThisWeek = workoutsThisWeek.reduce((sum, w) => {
      return sum + w.exercises.reduce((exSum, ex) => {
        return exSum + ex.sets.reduce((sSum, s) => sSum + ((s.weight || 0) * (Number(s.reps) || 0)), 0);
      }, 0);
    }, 0);

    const plannedWorkoutsCount = Math.max(
      3,
      routines.filter(r => r.dayOfWeek !== undefined && r.dayOfWeek !== null && r.dayOfWeek !== 0).length || 5
    );

    return {
      workoutsCount: workoutsThisWeek.length,
      plannedCount: plannedWorkoutsCount,
      runsCount: runsThisWeek.length,
      totalVolumeKg: Math.round(totalVolumeThisWeek),
      totalKmRun: runsThisWeek.reduce((acc, r) => acc + (r.distanceKm || 0), 0)
    };
  }, [today, todayDayIndex, history, runs, routines]);

  // Weight summary
  const latestWeightEntry = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
  const previousWeightEntry = weightHistory.length > 1 ? weightHistory[weightHistory.length - 2] : null;
  const weightDiff = latestWeightEntry && previousWeightEntry
    ? (latestWeightEntry.weight - previousWeightEntry.weight)
    : null;

  // Last workout summary
  const latestFinishedWorkout = history.length > 0 ? history[history.length - 1] : null;

  // Elapsed time for active workout
  const activeWorkoutDuration = useMemo(() => {
    if (!activeWorkout?.startTime) return '00:00';
    const diffSec = Math.max(0, Math.floor((Date.now() - activeWorkout.startTime) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [activeWorkout]);

  // Handle quick weight form
  const handleQuickWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(quickWeight.replace(',', '.'));
    if (!isNaN(val) && val > 20 && val < 300) {
      onAddWeight(val, 'Registro diário');
      setQuickWeight('');
      setWeightSuccess(true);
      setTimeout(() => setWeightSuccess(false), 2500);
    }
  };

  return (
    <div id="hoje-view" className="space-y-6 pb-6">
      
      {/* 1. CABEÇALHO */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-semibold text-[#F2F3F5] tracking-tight leading-tight">
            Olá, {userFirstName}
          </h1>
          <p className="text-[14px] text-[#9AA1AD] mt-0.5">
            {todayFormattedDate}
          </p>
        </div>

        {/* Chip discreto: X de Y treinos esta semana */}
        <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-[#15171C] border border-[rgba(255,255,255,0.07)] text-[13px] text-[#9AA1AD]">
          <span className="w-2 h-2 rounded-full bg-[#7C6CFF]" />
          <span className="tabular-nums font-medium text-[#F2F3F5]">
            {weeklyStats.workoutsCount} de {weeklyStats.plannedCount}
          </span>
          <span className="text-[#6B7280]">treinos na semana</span>
        </div>
      </header>

      {/* 2. FAIXA DA SEMANA (Segunda a Domingo) */}
      <section aria-label="Semana atual">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekStrip.map((day) => {
            return (
              <button
                key={day.label}
                type="button"
                onClick={() => {
                  setSelectedDayPlan({
                    fullLabel: day.fullLabel,
                    dateStr: day.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }),
                    routine: day.scheduledRoutine,
                    isRunDay: day.hasRunPlanned,
                    runInfo: day.runInfo
                  });
                }}
                className={`flex flex-col items-center justify-between py-2.5 px-1 rounded-[16px] transition-all duration-150 min-h-[72px] sm:min-h-[80px] border cursor-pointer ${
                  day.isToday
                    ? 'bg-[#1C1F26] border-[#7C6CFF]/60 text-[#F2F3F5] shadow-sm'
                    : 'bg-[#15171C] hover:bg-[#1C1F26] border-[rgba(255,255,255,0.07)] text-[#9AA1AD]'
                }`}
                title={`Ver plano de ${day.fullLabel}`}
              >
                <span className={`text-[11px] font-medium ${day.isToday ? 'text-[#7C6CFF]' : 'text-[#6B7280]'}`}>
                  {day.label}
                </span>

                <span className={`text-[16px] sm:text-[18px] font-semibold tabular-nums my-0.5 ${day.isToday ? 'text-[#F2F3F5]' : 'text-[#9AA1AD]'}`}>
                  {day.dayNumber}
                </span>

                {/* Pontos: violeta para musculação, água para corrida */}
                <div className="flex items-center gap-1 h-2">
                  {/* Musculação dot */}
                  {day.hasWorkoutDone ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7C6CFF]" title="Musculação concluída" />
                  ) : day.hasWorkoutPlanned ? (
                    <span className="w-1.5 h-1.5 rounded-full border border-[#7C6CFF] bg-transparent" title="Musculação planejada" />
                  ) : null}

                  {/* Corrida dot */}
                  {day.hasRunDone ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" title="Corrida concluída" />
                  ) : day.hasRunPlanned ? (
                    <span className="w-1.5 h-1.5 rounded-full border border-[#2DD4BF] bg-transparent" title="Corrida planejada" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. SEU DIA (No máximo 2 cartões: Musculação e Corrida) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-[#F2F3F5] tracking-tight">
            Seu dia
          </h2>
          <span className="text-[12px] text-[#6B7280]">
            Foco de hoje
          </span>
        </div>

        {/* (a) CARTÃO DE MUSCULAÇÃO */}
        {activeWorkout ? (
          /* ESTADO 1: TREINO EM ANDAMENTO */
          <div className="bg-[#15171C] border border-[#7C6CFF]/40 rounded-[20px] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#7C6CFF] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#7C6CFF] animate-pulse" />
                Treino em andamento
              </span>
              <span className="text-[13px] text-[#9AA1AD] tabular-nums font-medium">
                ⏱️ {activeWorkoutDuration} decorridos
              </span>
            </div>

            <div>
              <h3 className="text-[20px] sm:text-[22px] font-semibold text-[#F2F3F5] tracking-tight">
                {activeWorkout.name}
              </h3>
              <p className="text-[14px] text-[#9AA1AD] mt-0.5">
                {activeWorkout.exercises.length} exercícios na sessão
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                id="btn-resume-active-workout"
                type="button"
                onClick={() => onNavigate('train')}
                className="flex-1 min-h-[48px] rounded-[14px] bg-gradient-to-r from-[#7C6CFF] to-[#6A5BF0] hover:from-[#8E80FF] hover:to-[#7C6CFF] text-[#F2F3F5] font-semibold text-[15px] flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Retomar treino</span>
              </button>

              <button
                id="btn-discard-active-workout"
                type="button"
                onClick={() => setShowDiscardModal(true)}
                className="min-h-[48px] px-4 rounded-[14px] bg-[#1C1F26] hover:bg-[#222630] border border-[rgba(255,255,255,0.07)] text-[#FF6B6B] hover:text-[#FF8080] font-medium text-[14px] transition active:scale-[0.99] cursor-pointer"
              >
                Descartar
              </button>
            </div>
          </div>
        ) : todayCompletedWorkout ? (
          /* ESTADO 2: TREINO JÁ CONCLUÍDO HOJE */
          <div className="bg-[#15171C] border border-[#4ADE80]/30 rounded-[20px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#4ADE80] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 stroke-[2]" />
                Treino concluído hoje
              </span>
              <span className="text-[13px] text-[#9AA1AD] tabular-nums">
                {Math.round(todayCompletedWorkout.durationMs / 60000)} min
              </span>
            </div>

            <div>
              <h3 className="text-[20px] font-semibold text-[#F2F3F5] tracking-tight">
                {todayCompletedWorkout.name}
              </h3>
              <p className="text-[14px] text-[#9AA1AD] mt-0.5">
                {todayCompletedWorkout.exercises.reduce((acc, e) => acc + e.sets.length, 0)} séries finalizadas com sucesso.
              </p>
            </div>

            <div className="pt-2 border-t border-[rgba(255,255,255,0.07)] flex items-center justify-between">
              <span className="text-[13px] text-[#6B7280]">Descanso merecido!</span>
              <button
                type="button"
                onClick={() => setShowRoutinePickerModal(true)}
                className="text-[13px] text-[#7C6CFF] hover:text-[#8E80FF] font-medium transition cursor-pointer"
              >
                Fazer outro treino →
              </button>
            </div>
          </div>
        ) : todayDayIndex === 0 || !todayRoutine ? (
          /* ESTADO 3: DIA DE DESCANSO OU SEM ROTINA */
          <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#9AA1AD] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 stroke-[1.75]" />
                Dia de descanso
              </span>
              <span className="text-[12px] text-[#6B7280]">Recuperação</span>
            </div>

            <div>
              <h3 className="text-[20px] font-semibold text-[#F2F3F5] tracking-tight">
                Recuperação também é treino
              </h3>
              <p className="text-[14px] text-[#9AA1AD] mt-0.5">
                Aproveite para dormir bem, hidratar-se e restaurar as fibras musculares para a semana.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowRoutinePickerModal(true)}
                className="text-[14px] text-[#7C6CFF] hover:text-[#8E80FF] font-medium transition inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Escolher um treino mesmo assim</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ESTADO 4: ROTINA PLANEJADA PARA HOJE */
          <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] hover:border-[#7C6CFF]/30 rounded-[20px] p-5 space-y-4 transition">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#7C6CFF] flex items-center gap-1.5">
                <Dumbbell className="w-4 h-4 stroke-[1.75]" />
                Treino de hoje
              </span>
              <button
                type="button"
                onClick={() => setShowRoutinePickerModal(true)}
                className="text-[13px] text-[#9AA1AD] hover:text-[#F2F3F5] transition cursor-pointer"
              >
                Trocar treino
              </button>
            </div>

            <div>
              <h3 className="text-[20px] sm:text-[22px] font-semibold text-[#F2F3F5] tracking-tight">
                {todayRoutine.name}
              </h3>
              {todayRoutine.description && (
                <p className="text-[14px] text-[#9AA1AD] mt-0.5 line-clamp-1">
                  {todayRoutine.description}
                </p>
              )}
              <p className="text-[13px] text-[#6B7280] mt-1 tabular-nums">
                {todayRoutine.exercises.length} exercícios · cerca de {Math.round(todayRoutine.exercises.length * 8)} min
              </p>
            </div>

            {/* Prévia dos 3 primeiros exercícios */}
            {todayRoutine.exercises.length > 0 && (
              <div className="space-y-1.5 pt-3 border-t border-[rgba(255,255,255,0.07)] text-[13px] text-[#9AA1AD]">
                {todayRoutine.exercises.slice(0, 3).map((ex, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="truncate pr-2 text-[#F2F3F5]">
                      • {ex.exerciseId.replace(/^ex_/, '').replace(/_/g, ' ')}
                    </span>
                    <span className="text-[#6B7280] text-[12px] tabular-nums shrink-0">
                      {ex.sets.length} séries
                    </span>
                  </div>
                ))}
                {todayRoutine.exercises.length > 3 && (
                  <span className="text-[12px] text-[#6B7280] block pt-0.5">
                    + {todayRoutine.exercises.length - 3} outros exercícios
                  </span>
                )}
              </div>
            )}

            {/* UM BOTÃO PRIMÁRIO OBVIO */}
            <button
              id="btn-start-today-workout"
              type="button"
              onClick={() => onStartWorkout(todayRoutine.name, todayRoutine.exercises)}
              className="w-full min-h-[48px] rounded-[14px] bg-gradient-to-r from-[#7C6CFF] to-[#6A5BF0] hover:from-[#8E80FF] hover:to-[#7C6CFF] text-[#F2F3F5] font-semibold text-[15px] flex items-center justify-center gap-2 transition active:scale-[0.99] shadow-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Começar treino</span>
            </button>
          </div>
        )}

        {/* (b) CARTÃO DE CORRIDA (cor água #2DD4BF) */}
        {todayCompletedRun ? (
          /* Corrida já concluída hoje */
          <div className="bg-[#15171C] border border-[#2DD4BF]/30 rounded-[20px] p-4 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#2DD4BF]/10 text-[#2DD4BF] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[11px] text-[#2DD4BF] font-medium block">Corrida concluída</span>
                <p className="text-[14px] font-semibold text-[#F2F3F5]">
                  {todayCompletedRun.distanceKm} km em {todayCompletedRun.durationMinutes} min
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('running')}
              className="text-[13px] text-[#9AA1AD] hover:text-[#2DD4BF] transition cursor-pointer"
            >
              Ver detalhes →
            </button>
          </div>
        ) : todayTaf.isBeforeStart ? (
          /* Pré-início do plano TAF (antes do início do plano) */
          <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] hover:border-[#2DD4BF]/30 rounded-[20px] p-5 space-y-3 transition">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#2DD4BF] flex items-center gap-1.5">
                <Timer className="w-4 h-4 stroke-[1.75]" />
                Corrida · Plano TAF
              </span>
              <span className="text-[12px] text-[#9AA1AD] tabular-nums">
                Início em {todayTaf.status.startDateFormatted.slice(0, 5)} ({todayTaf.status.daysUntilStart} dias)
              </span>
            </div>

            <div>
              <h3 className="text-[17px] font-semibold text-[#F2F3F5] tracking-tight">
                O plano de corrida começa em {todayTaf.status.startDateFormatted.slice(0, 5)}
              </h3>
              <p className="text-[14px] text-[#9AA1AD] mt-0.5 leading-relaxed">
                Antes do início oficial, faça o teste inicial de {runPlan.goal.minutes} minutos na esteira para calibrar seu ritmo base.
              </p>
            </div>

            <button
              id="btn-start-taf-pre-test"
              type="button"
              onClick={() => {
                if (onStartRunFromTaf) {
                  onStartRunFromTaf(buildPreTest(runPlan.goal), 0);
                } else {
                  onNavigate('running');
                }
              }}
              className="w-full min-h-[48px] rounded-[14px] bg-[#1C1F26] hover:bg-[#222630] border border-[#2DD4BF]/30 hover:border-[#2DD4BF]/60 text-[#2DD4BF] font-semibold text-[14px] flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Fazer teste inicial ({runPlan.goal.minutes} min)</span>
            </button>
          </div>
        ) : todayTaf.isRunDay && todayTaf.todayWorkout ? (
          /* Dia de corrida durante o plano */
          <div className="bg-[#15171C] border border-[#2DD4BF]/30 rounded-[20px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#2DD4BF] flex items-center gap-1.5">
                <Timer className="w-4 h-4 stroke-[1.75]" />
                Corrida de hoje · {todayTaf.todayWorkout.key}
              </span>
              <span className="text-[12px] text-[#9AA1AD]">
                Semana {todayTaf.status.currentWeekNumber}
              </span>
            </div>

            <div>
              <h3 className="text-[18px] font-semibold text-[#F2F3F5] tracking-tight">
                {todayTaf.todayWorkout.title}
              </h3>
              <p className="text-[14px] text-[#9AA1AD] mt-0.5">
                {todayTaf.todayWorkout.suggestedDurationMinutes} min · {todayTaf.todayWorkout.suggestedSpeedRange}
              </p>
            </div>

            <button
              id="btn-register-today-run"
              type="button"
              onClick={() => {
                if (onStartRunFromTaf && todayTaf.todayWorkout) {
                  onStartRunFromTaf(todayTaf.todayWorkout, todayTaf.status.currentWeekNumber);
                } else {
                  onNavigate('running');
                }
              }}
              className="w-full min-h-[48px] rounded-[14px] bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0E0F13] font-semibold text-[14px] flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Registrar corrida</span>
            </button>
          </div>
        ) : (
          /* Linha discreta para dias sem corrida */
          <div className="py-2 px-2 text-[13px] text-[#6B7280] flex items-center gap-2">
            <Timer className="w-4 h-4 stroke-[1.75] text-[#6B7280]" />
            <span>Sem corrida hoje</span>
            {todayTaf.nextWorkout && (
              <span className="text-[12px] text-[#6B7280]">
                · Próxima: {todayTaf.nextWorkout.dayText}
              </span>
            )}
          </div>
        )}
      </section>

      {/* 4. SEÇÃO "ESTA SEMANA" */}
      <section className="space-y-3 pt-2">
        <h2 className="text-[17px] font-semibold text-[#F2F3F5] tracking-tight">
          Esta semana
        </h2>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Card 1: Treinos */}
          <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[18px] p-4 text-center sm:text-left">
            <span className="text-[12px] text-[#9AA1AD] block">Treinos</span>
            <p className="text-[20px] font-semibold text-[#F2F3F5] tabular-nums mt-0.5">
              {weeklyStats.workoutsCount}
            </p>
            <span className="text-[11px] text-[#6B7280]">
              de {weeklyStats.plannedCount} metas
            </span>
          </div>

          {/* Card 2: Corridas */}
          <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[18px] p-4 text-center sm:text-left">
            <span className="text-[12px] text-[#9AA1AD] block">Corridas</span>
            <p className="text-[20px] font-semibold text-[#2DD4BF] tabular-nums mt-0.5">
              {weeklyStats.runsCount}
            </p>
            <span className="text-[11px] text-[#6B7280] tabular-nums">
              {weeklyStats.totalKmRun.toFixed(1)} km total
            </span>
          </div>

          {/* Card 3: Carga total */}
          <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[18px] p-4 text-center sm:text-left">
            <span className="text-[12px] text-[#9AA1AD] block">Volume</span>
            <p className="text-[20px] font-semibold text-[#F2F3F5] tabular-nums mt-0.5">
              {weeklyStats.totalVolumeKg > 1000 ? `${(weeklyStats.totalVolumeKg / 1000).toFixed(1)}t` : `${weeklyStats.totalVolumeKg}kg`}
            </p>
            <span className="text-[11px] text-[#6B7280]">
              carga acumulada
            </span>
          </div>
        </div>
      </section>

      {/* 5. CARTÕES COMPACTOS: PESO CORPORAL E ÚLTIMO TREINO */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Cartão compacto de Peso Corporal */}
        <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#9AA1AD] flex items-center gap-1.5">
              <Scale className="w-4 h-4 stroke-[1.75]" />
              Peso corporal
            </span>
            <button
              type="button"
              onClick={() => onNavigate('weight')}
              className="text-[12px] text-[#7C6CFF] hover:text-[#8E80FF] transition cursor-pointer"
            >
              Histórico →
            </button>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-semibold text-[#F2F3F5] tabular-nums">
              {latestWeightEntry ? `${latestWeightEntry.weight} kg` : '--'}
            </span>
            {weightDiff !== null && (
              <span className={`text-[13px] font-medium tabular-nums ${weightDiff <= 0 ? 'text-[#4ADE80]' : 'text-[#FF6B6B]'}`}>
                {weightDiff > 0 ? `+${weightDiff.toFixed(1)}` : weightDiff.toFixed(1)} kg
              </span>
            )}
          </div>

          {/* Registro rápido de peso */}
          <form onSubmit={handleQuickWeight} className="flex gap-2 pt-1">
            <input
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="Novo peso (kg)"
              value={quickWeight}
              onChange={(e) => setQuickWeight(e.target.value)}
              className="flex-1 min-h-[40px] px-3 bg-[#1C1F26] border border-[rgba(255,255,255,0.07)] rounded-[12px] text-[14px] text-[#F2F3F5] placeholder-[#6B7280] outline-none focus:border-[#7C6CFF] tabular-nums"
            />
            <button
              type="submit"
              disabled={!quickWeight}
              className="min-h-[40px] px-3.5 rounded-[12px] bg-[#1C1F26] hover:bg-[#222630] disabled:opacity-40 border border-[rgba(255,255,255,0.07)] text-[#F2F3F5] text-[13px] font-medium transition cursor-pointer"
            >
              Salvar
            </button>
          </form>

          {weightSuccess && (
            <p className="text-[12px] text-[#4ADE80] font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" /> Peso registrado!
            </p>
          )}
        </div>

        {/* Cartão compacto de Último Treino */}
        <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#9AA1AD] flex items-center gap-1.5">
                <History className="w-4 h-4 stroke-[1.75]" />
                Último treino
              </span>
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="text-[12px] text-[#7C6CFF] hover:text-[#8E80FF] transition cursor-pointer"
              >
                Feed →
              </button>
            </div>

            {latestFinishedWorkout ? (
              <div className="mt-3 space-y-1">
                <h4 className="text-[17px] font-semibold text-[#F2F3F5]">
                  {latestFinishedWorkout.name}
                </h4>
                <p className="text-[13px] text-[#9AA1AD] tabular-nums">
                  {new Date(latestFinishedWorkout.startTime).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'short'
                  })} · {Math.round(latestFinishedWorkout.durationMs / 60000)} min · {latestFinishedWorkout.exercises.reduce((a, e) => a + e.sets.length, 0)} séries
                </p>
              </div>
            ) : (
              <p className="text-[14px] text-[#6B7280] mt-3">
                Nenhum treino registrado ainda.
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-[rgba(255,255,255,0.07)]">
            <button
              type="button"
              onClick={() => onNavigate('train')}
              className="text-[13px] text-[#9AA1AD] hover:text-[#F2F3F5] font-medium flex items-center justify-between w-full transition cursor-pointer"
            >
              <span>Ver todas as rotinas</span>
              <ChevronRight className="w-4 h-4 text-[#6B7280]" />
            </button>
          </div>
        </div>
      </section>

      {/* MODAL: TROCAR TREINO / ESCOLHER ROTINA */}
      <AnimatePresence>
        {showRoutinePickerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] pb-3">
                <h3 className="text-[18px] font-semibold text-[#F2F3F5]">
                  Escolha o treino de hoje
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRoutinePickerModal(false)}
                  className="p-1 text-[#9AA1AD] hover:text-[#F2F3F5] rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
                {routines.map((routine) => (
                  <button
                    key={routine.id}
                    type="button"
                    onClick={() => {
                      setShowRoutinePickerModal(false);
                      onStartWorkout(routine.name, routine.exercises);
                    }}
                    className="w-full text-left p-3.5 rounded-[16px] bg-[#1C1F26] hover:bg-[#222630] border border-[rgba(255,255,255,0.07)] transition group flex items-center justify-between cursor-pointer"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <h4 className="text-[15px] font-semibold text-[#F2F3F5] truncate group-hover:text-[#7C6CFF] transition">
                        {routine.name}
                      </h4>
                      <p className="text-[12px] text-[#9AA1AD] truncate">
                        {routine.description || `${routine.exercises.length} exercícios`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#F2F3F5] shrink-0" />
                  </button>
                ))}

                {/* Opção de treino avulso */}
                <button
                  type="button"
                  onClick={() => {
                    setShowRoutinePickerModal(false);
                    onStartEmptyWorkout();
                  }}
                  className="w-full text-left p-3.5 rounded-[16px] border border-dashed border-[rgba(255,255,255,0.12)] hover:border-[#7C6CFF] text-[#9AA1AD] hover:text-[#F2F3F5] transition flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[14px] font-medium">+ Iniciar treino vazio (avulso)</span>
                  <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DESCARTAR TREINO EM ANDAMENTO (sem window.confirm) */}
      <AnimatePresence>
        {showDiscardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#15171C] border border-[#FF6B6B]/30 rounded-[20px] p-5 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#FF6B6B]/10 text-[#FF6B6B] flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 stroke-[2]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-[18px] font-semibold text-[#F2F3F5]">
                  Descartar treino em andamento?
                </h3>
                <p className="text-[13px] text-[#9AA1AD] leading-relaxed">
                  Todo o progresso registrado nesta sessão será perdido. Esta ação não pode ser desfeita.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardModal(false);
                    onCancelActiveWorkout?.();
                  }}
                  className="w-full min-h-[48px] rounded-[14px] bg-[#FF6B6B] hover:bg-[#FF8080] text-[#0E0F13] font-semibold text-[14px] transition cursor-pointer"
                >
                  Sim, descartar treino
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscardModal(false)}
                  className="w-full min-h-[44px] rounded-[14px] bg-[#1C1F26] hover:bg-[#222630] text-[#F2F3F5] font-medium text-[14px] transition cursor-pointer"
                >
                  Continuar treinando
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: VISUALIZAR PLANO DO DIA (SOMENTE LEITURA) */}
      <AnimatePresence>
        {selectedDayPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] pb-3">
                <div>
                  <h3 className="text-[18px] font-semibold text-[#F2F3F5]">
                    {selectedDayPlan.fullLabel}
                  </h3>
                  <p className="text-[12px] text-[#9AA1AD]">{selectedDayPlan.dateStr}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayPlan(null)}
                  className="p-1 text-[#9AA1AD] hover:text-[#F2F3F5] rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Musculação */}
                <div className="p-3.5 rounded-[16px] bg-[#1C1F26] border border-[rgba(255,255,255,0.07)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[#7C6CFF] flex items-center gap-1.5">
                      <Dumbbell className="w-4 h-4 stroke-[1.75]" />
                      Musculação
                    </span>
                  </div>
                  {selectedDayPlan.routine ? (
                    <div>
                      <h4 className="text-[15px] font-semibold text-[#F2F3F5]">
                        {selectedDayPlan.routine.name}
                      </h4>
                      <p className="text-[13px] text-[#9AA1AD] mt-0.5">
                        {selectedDayPlan.routine.description}
                      </p>
                      <p className="text-[12px] text-[#6B7280] mt-1 tabular-nums">
                        {selectedDayPlan.routine.exercises.length} exercícios programados
                      </p>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#6B7280]">
                      Descanso de musculação programado.
                    </p>
                  )}
                </div>

                {/* Corrida */}
                <div className="p-3.5 rounded-[16px] bg-[#1C1F26] border border-[rgba(255,255,255,0.07)] space-y-2">
                  <span className="text-[12px] font-medium text-[#2DD4BF] flex items-center gap-1.5">
                    <Timer className="w-4 h-4 stroke-[1.75]" />
                    Corrida (Plano TAF)
                  </span>
                  <p className="text-[14px] text-[#F2F3F5] font-medium">
                    {selectedDayPlan.runInfo}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayPlan(null)}
                className="w-full min-h-[44px] rounded-[14px] bg-[#1C1F26] hover:bg-[#222630] text-[#F2F3F5] font-medium text-[14px] transition cursor-pointer"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
