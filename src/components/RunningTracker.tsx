import React, { useState, useMemo, useEffect } from 'react';
import {
  Timer,
  Plus,
  Trash2,
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  ArrowRight,
  Target,
  Activity,
  CheckCircle2,
  X,
  AlertCircle,
  Minus,
  Calendar,
  Flame,
  ChevronRight
} from 'lucide-react';
import {
  RunLog,
  RunType,
  RunInterval,
  speedKmhToPace,
  paceToSpeedKmh,
  calculateRunStats
} from '../types';
import {
  TAF_TARGET_METERS,
  TAF_TARGET_MINUTES,
  TAF_TARGET_SPEED_KMH,
  TAF_TARGET_PACE_STR,
  SPEED_REFERENCE_TABLE,
  getTafCurrentStatus,
  getTodayTafWorkout,
  TAF_PRE_TEST_WORKOUT
} from '../lib/tafPlanData';
import { motion, AnimatePresence } from 'motion/react';

interface RunningTrackerProps {
  runs: RunLog[];
  onSaveRun: (run: RunLog) => void;
  onDeleteRun: (runId: string) => void;
  onNavigateToTafPlan: () => void;
  initialPrefill?: Partial<RunLog> | null;
  onClearPrefill?: () => void;
}

export default function RunningTracker({
  runs,
  onSaveRun,
  onDeleteRun,
  onNavigateToTafPlan,
  initialPrefill,
  onClearPrefill
}: RunningTrackerProps) {
  // Today's TAF workout calculation
  const todayTaf = useMemo(() => getTodayTafWorkout(), []);
  const currentTafStatus = useMemo(() => getTafCurrentStatus(), []);

  // Form visibility state (modal / bottom sheet)
  const [showFormModal, setShowFormModal] = useState<boolean>(() => !!initialPrefill);

  // Accordion for "Mais detalhes"
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Converter visibility inside details
  const [showConverter, setShowConverter] = useState(false);

  // Run detail modal (when clicking an item in history)
  const [selectedRunDetail, setSelectedRunDetail] = useState<RunLog | null>(null);

  // In-app delete confirmation modal
  const [runToDeleteId, setRunToDeleteId] = useState<string | null>(null);

  // Validation message
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form Fields
  const [runDate, setRunDate] = useState<string>(() => {
    if (initialPrefill?.date) return initialPrefill.date;
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });

  const [selectedChipType, setSelectedChipType] = useState<string>(() => {
    if (initialPrefill?.type) return initialPrefill.type;
    if (todayTaf.isBeforeStart) return 'Simulado 12 min';
    if (todayTaf.todayWorkout?.type) return todayTaf.todayWorkout.type;
    return 'A leve/continuo';
  });

  const [durationMinutes, setDurationMinutes] = useState<number>(() => {
    if (initialPrefill?.durationMinutes) return initialPrefill.durationMinutes;
    if (todayTaf.isBeforeStart) return 12;
    if (todayTaf.todayWorkout?.suggestedDurationMinutes) return todayTaf.todayWorkout.suggestedDurationMinutes;
    return 20;
  });

  // User request: Distance must NOT come pre-filled (empty by default)
  const [distanceKm, setDistanceKm] = useState<string>('');

  const [inclinePct, setInclinePct] = useState<number>(() => {
    return initialPrefill?.inclinePct ?? 1.0;
  });

  // "Como foi?": 3 chips: Leve (3), Moderada (6), Forte (9)
  const [rpe, setRpe] = useState<number>(() => {
    return initialPrefill?.rpe ?? 6;
  });

  const [notes, setNotes] = useState<string>(() => {
    return initialPrefill?.notes || '';
  });

  // Intervals list
  const [intervals, setIntervals] = useState<RunInterval[]>(() => {
    return initialPrefill?.intervals || [];
  });

  // Converter state
  const [converterSpeed, setConverterSpeed] = useState<string>('11.0');
  const [converterPaceMins, setConverterPaceMins] = useState<string>('5');
  const [converterPaceSecs, setConverterPaceSecs] = useState<string>('27');

  // React to initialPrefill changes
  useEffect(() => {
    if (initialPrefill) {
      if (initialPrefill.date) setRunDate(initialPrefill.date);
      if (initialPrefill.type) setSelectedChipType(initialPrefill.type);
      if (initialPrefill.durationMinutes) setDurationMinutes(initialPrefill.durationMinutes);
      // Distance is never pre-filled as requested
      setDistanceKm('');
      if (initialPrefill.inclinePct !== undefined) setInclinePct(initialPrefill.inclinePct);
      if (initialPrefill.rpe !== undefined) setRpe(initialPrefill.rpe);
      if (initialPrefill.notes !== undefined) setNotes(initialPrefill.notes);
      if (initialPrefill.intervals) setIntervals(initialPrefill.intervals);
      setShowFormModal(true);
    }
  }, [initialPrefill]);

  // Numeric distance calculation (returns 0 if empty or invalid)
  const parsedDistance = useMemo(() => {
    const sanitized = String(distanceKm).replace(',', '.').trim();
    const val = parseFloat(sanitized);
    return isNaN(val) || val <= 0 ? 0 : val;
  }, [distanceKm]);

  // Live stats calculation (calculated only when duration and distance are valid)
  const calculatedStats = useMemo(() => {
    if (durationMinutes <= 0 || parsedDistance <= 0) {
      return { speedKmh: 0, paceFormatted: '--:--', paceSecondsPerKm: 0 };
    }
    return calculateRunStats(durationMinutes, parsedDistance);
  }, [durationMinutes, parsedDistance]);

  // Simulation distance in meters
  const distanceMeters = useMemo(() => {
    return Math.round(parsedDistance * 1000);
  }, [parsedDistance]);

  // Is TAF Target Achieved (only evaluated when distance is filled)
  const isTargetAchieved = useMemo(() => {
    if (parsedDistance <= 0 || durationMinutes <= 0) return false;
    if (selectedChipType === 'Simulado 12 min') {
      return distanceMeters >= 2200;
    }
    return calculatedStats.paceSecondsPerKm > 0 && calculatedStats.paceSecondsPerKm <= 327 && durationMinutes >= 12;
  }, [selectedChipType, distanceMeters, calculatedStats.paceSecondsPerKm, durationMinutes, parsedDistance]);

  // Validation flag: Duration and Distance must both be greater than 0
  const isFormValid = durationMinutes > 0 && parsedDistance > 0;

  // Open form with prefill helper (Distance is intentionally kept empty)
  const handleOpenRegister = (typeOverride?: string, durOverride?: number, _distOverride?: number, noteOverride?: string, intervalsOverride?: RunInterval[]) => {
    setValidationError(null);
    setShowMoreDetails(false);

    if (typeOverride) setSelectedChipType(typeOverride);
    if (durOverride !== undefined) setDurationMinutes(durOverride);
    setDistanceKm('');
    if (noteOverride !== undefined) setNotes(noteOverride);
    if (intervalsOverride !== undefined) setIntervals(intervalsOverride);

    setShowFormModal(true);
  };

  // Add plan intervals into current run
  const handleAddPlanIntervals = () => {
    if (todayTaf.todayWorkout?.intervals && todayTaf.todayWorkout.intervals.length > 0) {
      setIntervals(todayTaf.todayWorkout.intervals);
    }
  };

  // Save Run Handler
  const handleSaveRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setValidationError('Informe uma duração e distância maiores que zero.');
      return;
    }

    // Map chip to RunType union
    let finalType: RunType = 'A leve/continuo';
    if (selectedChipType === 'Simulado 12 min') finalType = 'Simulado 12 min';
    else if (selectedChipType === 'Teste') finalType = 'Teste';
    else if (selectedChipType === 'B fartlek ou trote-caminhada') finalType = 'B fartlek ou trote-caminhada';
    else if (selectedChipType === 'C moderado ou tiros') finalType = 'C moderado ou tiros';
    else finalType = 'A leve/continuo';

    const timestamp = new Date(`${runDate}T12:00:00`).getTime() || Date.now();

    const newRun: RunLog = {
      id: initialPrefill?.id || `run_${Date.now()}`,
      date: runDate,
      timestamp,
      type: finalType,
      durationMinutes: Number(durationMinutes),
      distanceKm: Number(parsedDistance),
      inclinePct: Number(inclinePct),
      rpe: Number(rpe),
      speedKmh: calculatedStats.speedKmh,
      paceFormatted: calculatedStats.paceFormatted,
      paceSecondsPerKm: calculatedStats.paceSecondsPerKm,
      intervals: intervals.length > 0 ? intervals : undefined,
      notes: notes.trim() || undefined,
      tafTargetAchieved: isTargetAchieved,
      tafWeekNumber: currentTafStatus.currentWeekNumber > 0 ? currentTafStatus.currentWeekNumber : undefined,
      createdAt: new Date().toISOString()
    };

    onSaveRun(newRun);
    onClearPrefill?.();
    setShowFormModal(false);
  };

  // Converter Handlers
  const handleConverterSpeedChange = (val: string) => {
    setConverterSpeed(val);
    const num = parseFloat(val);
    if (num > 0) {
      const p = speedKmhToPace(num);
      setConverterPaceMins(String(p.minutes));
      setConverterPaceSecs(String(p.seconds));
    }
  };

  const handleConverterPaceChange = (minsStr: string, secsStr: string) => {
    const mins = parseInt(minsStr, 10) || 0;
    const secs = parseInt(secsStr, 10) || 0;
    setConverterPaceMins(minsStr);
    setConverterPaceSecs(secsStr);
    const speed = paceToSpeedKmh(mins, secs);
    setConverterSpeed(speed.toFixed(1));
  };

  // 3 Month Stats
  const monthStats = useMemo(() => {
    const now = new Date();
    const currM = now.getMonth();
    const currY = now.getFullYear();

    const monthRuns = runs.filter(r => {
      const d = new Date(r.timestamp || r.date);
      return d.getMonth() === currM && d.getFullYear() === currY;
    });

    const totalRuns = monthRuns.length;
    const totalKm = monthRuns.reduce((acc, r) => acc + (r.distanceKm || 0), 0);

    const allSimulations = runs.filter(r => r.type === 'Simulado 12 min' || r.durationMinutes === 12);
    let bestSimMeters = 0;
    allSimulations.forEach(s => {
      const m = Math.round((s.distanceKm || 0) * 1000);
      if (m > bestSimMeters) bestSimMeters = m;
    });

    return {
      runsCount: totalRuns,
      km: totalKm.toFixed(1),
      bestSimMeters
    };
  }, [runs]);

  // Simulation runs for progression chart (requires >= 2 simulations)
  const simulationRuns = useMemo(() => {
    return runs
      .filter(r => r.type === 'Simulado 12 min' || (r.durationMinutes === 12 && r.distanceKm > 1.5))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [runs]);

  return (
    <div id="running-tracker-view" className="space-y-6">

      {/* 1. TOP BANNER / HERO CARD: CORRIDA DE HOJE */}
      <section className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#2DD4BF]/15 text-[#2DD4BF] flex items-center justify-center">
              <Timer className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[12px] font-semibold text-[#2DD4BF] uppercase tracking-wide">
              Corrida de hoje
            </span>
          </div>

          <button
            type="button"
            onClick={onNavigateToTafPlan}
            className="text-[12px] text-[#9AA1AD] hover:text-[#2DD4BF] flex items-center gap-1 transition cursor-pointer"
          >
            <span>Ver Plano TAF</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content based on TAF schedule */}
        {todayTaf.isBeforeStart ? (
          // Pre-start: Teste Inicial 12 min
          <div className="space-y-3">
            <div>
              <h2 className="text-[20px] font-semibold text-[#F2F3F5] tracking-tight">
                Teste Inicial: 12 min na esteira
              </h2>
              <p className="text-[14px] text-[#9AA1AD] mt-1 leading-relaxed">
                O plano oficial começa em 16/11 (faltam {todayTaf.status.daysUntilStart} dias). Faça o teste de 12 min para calibrar seu ritmo de largada.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#9AA1AD]">
              <span className="px-2.5 py-1 rounded-[8px] bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] tabular-nums">
                ⏱️ 12 minutos
              </span>
              <span className="px-2.5 py-1 rounded-[8px] bg-[#1C1F26] border border-[rgba(255,255,255,0.06)]">
                📐 1% de inclinação
              </span>
              <span className="px-2.5 py-1 rounded-[8px] bg-[#1C1F26] border border-[rgba(255,255,255,0.06)]">
                🎯 Meta: 2.200 m (11 km/h)
              </span>
            </div>

            <button
              id="btn-start-initial-test"
              type="button"
              onClick={() => handleOpenRegister('Simulado 12 min', 12, undefined, 'Teste inicial de 12 minutos na esteira com 1%')}
              className="w-full sm:w-auto min-h-[48px] px-6 rounded-[14px] bg-[#2DD4BF] hover:bg-[#20b8a5] text-[#0E0F13] font-semibold text-[14px] flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-md shadow-[#2DD4BF]/20"
            >
              <Award className="w-4 h-4 stroke-[2.5]" />
              <span>Fazer teste inicial</span>
            </button>
          </div>
        ) : todayTaf.isRunDay && todayTaf.todayWorkout ? (
          // Today has scheduled run
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#2DD4BF] bg-[#2DD4BF]/15 border border-[#2DD4BF]/30 px-2 py-0.5 rounded-full">
                  {todayTaf.todayWorkout.intensityLabel}
                </span>
                <span className="text-[12px] text-[#9AA1AD]">
                  Semana {todayTaf.status.currentWeekNumber}
                </span>
              </div>
              <h2 className="text-[20px] font-semibold text-[#F2F3F5] tracking-tight mt-1">
                {todayTaf.todayWorkout.title}
              </h2>
              <p className="text-[14px] text-[#9AA1AD] mt-1 leading-relaxed">
                Esteira a {todayTaf.todayWorkout.suggestedSpeedRange} • {todayTaf.todayWorkout.suggestedDurationMinutes} min • 1% de inclinação
              </p>
            </div>

            <button
              id="btn-register-today-run"
              type="button"
              onClick={() => handleOpenRegister(
                todayTaf.todayWorkout?.type,
                todayTaf.todayWorkout?.suggestedDurationMinutes,
                undefined,
                `${todayTaf.todayWorkout?.title} • Aquecimento: ${todayTaf.todayWorkout?.warmup}`,
                todayTaf.todayWorkout?.intervals
              )}
              className="w-full sm:w-auto min-h-[48px] px-6 rounded-[14px] bg-[#2DD4BF] hover:bg-[#20b8a5] text-[#0E0F13] font-semibold text-[14px] flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-md shadow-[#2DD4BF]/20"
            >
              <Timer className="w-4 h-4 stroke-[2.5]" />
              <span>Registrar corrida</span>
            </button>
          </div>
        ) : (
          // Non-run day
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <p className="text-[14px] font-medium text-[#F2F3F5]">
                Sem corrida hoje
              </p>
              <p className="text-[12px] text-[#9AA1AD] mt-0.5">
                {todayTaf.nextWorkout ? `Próxima corrida: ${todayTaf.nextWorkout.dayText} (${todayTaf.nextWorkout.workout.title})` : 'Dia dedicado à musculação ou recuperação.'}
              </p>
            </div>

            <button
              id="btn-register-free-run"
              type="button"
              onClick={() => handleOpenRegister('A leve/continuo', 20, undefined, 'Corrida livre')}
              className="min-h-[44px] px-4 rounded-[12px] bg-[#1C1F26] hover:bg-[#222630] border border-[rgba(255,255,255,0.08)] text-[#F2F3F5] text-[13px] font-medium transition cursor-pointer self-start sm:self-auto"
            >
              Registrar corrida livre
            </button>
          </div>
        )}
      </section>

      {/* 2. TRÊS NÚMEROS DO MÊS */}
      <section className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-[18px] bg-[#15171C] border border-[rgba(255,255,255,0.07)]">
          <span className="text-[11px] text-[#6B7280] font-medium block">Corridas no mês</span>
          <p className="text-[20px] sm:text-[22px] font-semibold text-[#F2F3F5] tabular-nums mt-0.5">
            {monthStats.runsCount}
          </p>
          <span className="text-[10px] text-[#9AA1AD]">sessões</span>
        </div>

        <div className="p-4 rounded-[18px] bg-[#15171C] border border-[rgba(255,255,255,0.07)]">
          <span className="text-[11px] text-[#6B7280] font-medium block">Distância no mês</span>
          <p className="text-[20px] sm:text-[22px] font-semibold text-[#2DD4BF] tabular-nums mt-0.5">
            {monthStats.km} <span className="text-[12px] text-[#9AA1AD] font-normal">km</span>
          </p>
          <span className="text-[10px] text-[#9AA1AD]">na esteira</span>
        </div>

        <div className="p-4 rounded-[18px] bg-[#15171C] border border-[rgba(255,255,255,0.07)]">
          <span className="text-[11px] text-[#6B7280] font-medium block">Melhor simulado</span>
          <p className="text-[20px] sm:text-[22px] font-semibold text-[#F2F3F5] tabular-nums mt-0.5">
            {monthStats.bestSimMeters > 0 ? `${monthStats.bestSimMeters}m` : '--'}
          </p>
          <span className="text-[10px] text-[#9AA1AD]">
            {monthStats.bestSimMeters >= 2200 ? '🏆 Meta batida' : 'Meta: 2.200m'}
          </span>
        </div>
      </section>

      {/* 3. GRÁFICO DE EVOLUÇÃO DOS SIMULADOS 12 MIN (Apenas se houver >= 2 simulados) */}
      {simulationRuns.length >= 2 && (
        <section className="p-5 rounded-[20px] bg-[#15171C] border border-[rgba(255,255,255,0.07)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#2DD4BF]" />
                <h3 className="text-[15px] font-semibold text-[#F2F3F5]">
                  Evolução nos Simulados de 12 min
                </h3>
              </div>
              <p className="text-[12px] text-[#9AA1AD] mt-0.5">
                Meta do TAF: 2.200 m (11,0 km/h • 5:27/km)
              </p>
            </div>
            <span className="text-[11px] font-medium text-[#9AA1AD] tabular-nums">
              {simulationRuns.length} testes
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {simulationRuns.map((sim, idx) => {
              const m = Math.round(sim.distanceKm * 1000);
              const passed = m >= 2200;
              const pct = Math.min(100, Math.round((m / 2600) * 100));

              return (
                <div key={sim.id} className="p-3 rounded-[14px] bg-[#1C1F26] border border-[rgba(255,255,255,0.04)] space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#6B7280] font-medium">#{idx + 1}</span>
                      <span className="text-[#9AA1AD]">
                        {new Date(sim.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                      <span className="font-semibold text-[#F2F3F5] tabular-nums">
                        {m} m
                      </span>
                      <span className="text-[#6B7280] tabular-nums">
                        ({sim.paceFormatted})
                      </span>
                    </div>

                    <div>
                      {passed ? (
                        <span className="text-[11px] font-semibold text-[#4ADE80] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>+{m - 2200} m</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-[#F5B84B]">
                          faltam {2200 - m} m
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="relative w-full h-2 rounded-full bg-[#15171C] overflow-hidden">
                    {/* 2200m vertical mark */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10"
                      style={{ left: `${(2200 / 2600) * 100}%` }}
                      title="Meta 2.200m"
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        passed ? 'bg-[#2DD4BF]' : 'bg-[#F5B84B]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. HISTÓRICO DE CORRIDAS (LISTA SIMPLES) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[#F2F3F5]">
            Histórico de Corridas
          </h3>
          <span className="text-[12px] text-[#6B7280] tabular-nums">
            {runs.length} {runs.length === 1 ? 'corrida' : 'corridas'}
          </span>
        </div>

        {runs.length === 0 ? (
          <div className="p-8 rounded-[20px] bg-[#15171C] border border-[rgba(255,255,255,0.07)] text-center space-y-2">
            <Timer className="w-8 h-8 text-[#6B7280] mx-auto" />
            <p className="text-[14px] font-medium text-[#F2F3F5]">Nenhuma corrida registrada</p>
            <p className="text-[12px] text-[#9AA1AD]">Toque no botão acima para registrar sua primeira sessão de esteira.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...runs].reverse().map((run) => {
              const runDateObj = new Date(run.timestamp || run.date);
              const formattedDate = runDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              const isSim = run.type === 'Simulado 12 min';

              return (
                <div
                  key={run.id}
                  onClick={() => setSelectedRunDetail(run)}
                  className="p-3.5 sm:p-4 rounded-[16px] bg-[#15171C] hover:bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] transition flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[10px] bg-[#1C1F26] border border-[rgba(255,255,255,0.07)] flex items-center justify-center text-[#2DD4BF] shrink-0">
                      <Timer className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-[#F2F3F5] truncate">
                          {run.type}
                        </span>
                        {isSim && run.distanceKm >= 2.2 && (
                          <span className="text-[10px] font-semibold text-[#4ADE80] bg-[#4ADE80]/15 px-1.5 py-0.5 rounded-full">
                            Meta OK
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#9AA1AD] truncate">
                        {formattedDate} • {run.durationMinutes} min • {run.inclinePct}% inc
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-semibold text-[#F2F3F5] tabular-nums">
                      {run.distanceKm.toFixed(2)} km
                    </p>
                    <p className="text-[11px] text-[#2DD4BF] tabular-nums font-mono">
                      {run.paceFormatted}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. MODAL / BOTTOM SHEET DE REGISTRO (TELA CURTA E LIMPA) */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/75 backdrop-blur-sm p-0 lg:p-4">
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full lg:max-w-lg bg-[#15171C] border-t lg:border border-[rgba(255,255,255,0.08)] rounded-t-[24px] lg:rounded-[24px] max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-1 border-b border-[rgba(255,255,255,0.06)]">
                <div>
                  <h3 className="text-[18px] font-semibold text-[#F2F3F5] tracking-tight">
                    Registrar Corrida
                  </h3>
                  <span className="text-[12px] text-[#9AA1AD]">
                    Esteira • Inclinação de 1%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="p-1.5 rounded-full text-[#9AA1AD] hover:text-[#F2F3F5] hover:bg-[#1C1F26] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Validation alert if any */}
              {validationError && (
                <div className="p-3 rounded-[12px] bg-[#FF6B6B]/15 border border-[#FF6B6B]/30 text-[#FF6B6B] text-[13px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <form onSubmit={handleSaveRun} className="space-y-4">
                {/* (a) Chips de tipo */}
                <div className="space-y-1.5">
                  <span className="text-[12px] font-medium text-[#9AA1AD] block">
                    Tipo de treino
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'A leve/continuo', label: 'Corrida A (Leve)' },
                      { id: 'B fartlek ou trote-caminhada', label: 'Corrida B (Fartlek)' },
                      { id: 'C moderado ou tiros', label: 'Corrida C (Tiros)' },
                      { id: 'Simulado 12 min', label: 'Simulado 12 min' },
                      { id: 'Teste', label: 'Teste' },
                    ].map((chip) => {
                      const isSel = selectedChipType === chip.id;
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => {
                            setSelectedChipType(chip.id);
                            if (chip.id === 'Simulado 12 min') {
                              setDurationMinutes(12);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition cursor-pointer ${
                            isSel
                              ? 'bg-[#2DD4BF] text-[#0E0F13] font-semibold shadow-sm'
                              : 'bg-[#1C1F26] text-[#9AA1AD] hover:text-[#F2F3F5] border border-[rgba(255,255,255,0.06)]'
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* (b) Dois campos grandes lado a lado: Tempo (min) e Distância (km) */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Tempo */}
                  <div className="p-3.5 rounded-[16px] bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] space-y-2">
                    <span className="text-[12px] font-medium text-[#9AA1AD] block">
                      Tempo (min)
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => setDurationMinutes(prev => Math.max(1, prev - 1))}
                        className="w-9 h-9 rounded-[10px] bg-[#15171C] border border-[rgba(255,255,255,0.08)] text-[#F2F3F5] flex items-center justify-center hover:bg-[#252a35] transition cursor-pointer shrink-0"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="240"
                        step="1"
                        inputMode="numeric"
                        value={durationMinutes || ''}
                        onChange={(e) => setDurationMinutes(parseFloat(e.target.value) || 0)}
                        className="w-full text-center text-[22px] font-semibold text-[#F2F3F5] bg-transparent outline-none tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => setDurationMinutes(prev => prev + 1)}
                        className="w-9 h-9 rounded-[10px] bg-[#15171C] border border-[rgba(255,255,255,0.08)] text-[#F2F3F5] flex items-center justify-center hover:bg-[#252a35] transition cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Distância */}
                  <div className="p-3.5 rounded-[16px] bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] space-y-2">
                    <span className="text-[12px] font-medium text-[#9AA1AD] block">
                      Distância (km)
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => setDistanceKm(prev => Math.max(0.1, Number((prev - 0.1).toFixed(2))))}
                        className="w-9 h-9 rounded-[10px] bg-[#15171C] border border-[rgba(255,255,255,0.08)] text-[#F2F3F5] flex items-center justify-center hover:bg-[#252a35] transition cursor-pointer shrink-0"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="0.1"
                        max="50"
                        step="0.01"
                        inputMode="decimal"
                        value={distanceKm || ''}
                        onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
                        className="w-full text-center text-[22px] font-semibold text-[#F2F3F5] bg-transparent outline-none tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => setDistanceKm(prev => Number((prev + 0.1).toFixed(2)))}
                        className="w-9 h-9 rounded-[10px] bg-[#15171C] border border-[rgba(255,255,255,0.08)] text-[#F2F3F5] flex items-center justify-center hover:bg-[#252a35] transition cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* (c) Resultado ao vivo em destaque */}
                <div className="p-3.5 rounded-[16px] bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#6B7280] block font-medium">Ritmo & Velocidade</span>
                    <p className="text-[15px] font-semibold text-[#2DD4BF] tabular-nums font-mono mt-0.5">
                      Ritmo {calculatedStats.paceFormatted} • {calculatedStats.speedKmh.toFixed(1)} km/h
                    </p>
                  </div>

                  {selectedChipType === 'Simulado 12 min' && (
                    <div className="text-right">
                      <span className="text-[11px] text-[#6B7280] block font-medium">Meta 2.200 m</span>
                      {distanceMeters >= 2200 ? (
                        <span className="text-[13px] font-semibold text-[#4ADE80] tabular-nums">
                          {distanceMeters} m (Aprovado!)
                        </span>
                      ) : (
                        <span className="text-[13px] font-semibold text-[#F5B84B] tabular-nums">
                          faltam {2200 - distanceMeters} m
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* (d) 'Como foi?' com 3 chips grandes: Leve (3), Moderada (6), Forte (9) */}
                <div className="space-y-1.5">
                  <span className="text-[12px] font-medium text-[#9AA1AD] block">
                    Como foi o esforço?
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 3, label: 'Leve', sub: 'Respiração fácil' },
                      { val: 6, label: 'Moderada', sub: 'Sustentável' },
                      { val: 9, label: 'Forte', sub: 'Ritmo de prova' },
                    ].map((chip) => {
                      const isSel = rpe === chip.val;
                      return (
                        <button
                          key={chip.val}
                          type="button"
                          onClick={() => setRpe(chip.val)}
                          className={`p-2.5 rounded-[14px] text-center transition cursor-pointer border ${
                            isSel
                              ? 'bg-[#2DD4BF]/15 border-[#2DD4BF] text-[#2DD4BF]'
                              : 'bg-[#1C1F26] border-[rgba(255,255,255,0.06)] text-[#9AA1AD] hover:text-[#F2F3F5]'
                          }`}
                        >
                          <span className="text-[13px] font-semibold block">{chip.label}</span>
                          <span className="text-[10px] block opacity-80 mt-0.5">{chip.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* (e) Botão grande Salvar corrida */}
                <button
                  id="btn-save-run-record"
                  type="submit"
                  className="w-full min-h-[48px] rounded-[14px] bg-[#2DD4BF] hover:bg-[#20b8a5] text-[#0E0F13] text-[15px] font-semibold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-md shadow-[#2DD4BF]/20"
                >
                  <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                  <span>Salvar corrida</span>
                </button>

                {/* (f) 'Mais detalhes' recolhido por padrão */}
                <div className="pt-2 border-t border-[rgba(255,255,255,0.06)]">
                  <button
                    type="button"
                    onClick={() => setShowMoreDetails(!showMoreDetails)}
                    className="w-full flex items-center justify-between py-2 text-[13px] text-[#9AA1AD] hover:text-[#F2F3F5] transition cursor-pointer"
                  >
                    <span>Mais detalhes (inclinação, tiros, data, notas)</span>
                    {showMoreDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showMoreDetails && (
                    <div className="pt-3 space-y-3">
                      {/* Data & Inclinação */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-[#9AA1AD] block mb-1">
                            Data do treino
                          </label>
                          <input
                            type="date"
                            value={runDate}
                            onChange={(e) => setRunDate(e.target.value)}
                            className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2 text-[13px] text-[#F2F3F5] outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-[#9AA1AD] block mb-1">
                            Inclinação (%)
                          </label>
                          <div className="flex items-center gap-1.5">
                            {[0, 1.0, 1.5, 2.0].map((inc) => (
                              <button
                                key={inc}
                                type="button"
                                onClick={() => setInclinePct(inc)}
                                className={`flex-1 py-2 rounded-[10px] text-[12px] font-medium transition cursor-pointer border ${
                                  inclinePct === inc
                                    ? 'bg-[#2DD4BF]/20 border-[#2DD4BF] text-[#2DD4BF]'
                                    : 'bg-[#1C1F26] border-[rgba(255,255,255,0.06)] text-[#9AA1AD]'
                                }`}
                              >
                                {inc}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Observações */}
                      <div>
                        <label className="text-[11px] font-medium text-[#9AA1AD] block mb-1">
                          Observações
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={2}
                          placeholder="Sensações na esteira, respiração, frequência cardíaca..."
                          className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2 text-[13px] text-[#F2F3F5] outline-none resize-none"
                        />
                      </div>

                      {/* Lista de tiros intervalados */}
                      <div className="p-3 rounded-[14px] bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-medium text-[#F2F3F5]">
                            Tiros Intervalados ({intervals.length})
                          </span>
                          {todayTaf.todayWorkout?.intervals && todayTaf.todayWorkout.intervals.length > 0 && (
                            <button
                              type="button"
                              onClick={handleAddPlanIntervals}
                              className="text-[11px] font-medium text-[#2DD4BF] hover:underline"
                            >
                              + Adicionar tiros do plano
                            </button>
                          )}
                        </div>

                        {intervals.length > 0 && (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {intervals.map((int, i) => (
                              <div
                                key={int.id || i}
                                className="p-2 rounded-[10px] bg-[#15171C] border border-[rgba(255,255,255,0.05)] text-[11px] flex items-center justify-between text-[#9AA1AD]"
                              >
                                <span className="text-[#F2F3F5] font-medium">{int.label || `Tiro ${i + 1}`}</span>
                                <span className="tabular-nums">
                                  {int.distanceMeters ? `${int.distanceMeters}m ` : ''}
                                  {int.speedKmh ? `@ ${int.speedKmh} km/h ` : ''}
                                  ({int.durationFormatted || `${int.durationSeconds}s`})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Conversor km/h para min/km embutido */}
                      <div className="p-3 rounded-[14px] bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowConverter(!showConverter)}
                          className="w-full flex items-center justify-between text-[12px] font-medium text-[#9AA1AD] hover:text-[#F2F3F5]"
                        >
                          <span>Conversor Esteira (km/h ⇄ min/km)</span>
                          {showConverter ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {showConverter && (
                          <div className="pt-2 flex items-center justify-between gap-3 text-[12px]">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.1"
                                min="4"
                                max="25"
                                value={converterSpeed}
                                onChange={(e) => handleConverterSpeedChange(e.target.value)}
                                className="w-16 bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-2 py-1 text-center font-mono text-[#F2F3F5]"
                              />
                              <span className="text-[#6B7280]">km/h</span>
                            </div>
                            <span className="text-[#6B7280]">➔</span>
                            <div className="px-2.5 py-1 rounded-[8px] bg-[#2DD4BF]/15 text-[#2DD4BF] font-mono font-semibold">
                              {speedKmhToPace(parseFloat(converterSpeed) || 0).formatted}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. MODAL DE DETALHES DE UMA CORRIDA DO HISTÓRICO */}
      <AnimatePresence>
        {selectedRunDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[24px] p-6 space-y-4 shadow-2xl relative text-left"
            >
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[10px] bg-[#2DD4BF]/15 text-[#2DD4BF] flex items-center justify-center">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-semibold text-[#F2F3F5]">
                      {selectedRunDetail.type}
                    </h4>
                    <span className="text-[12px] text-[#9AA1AD]">
                      {new Date(selectedRunDetail.timestamp || selectedRunDetail.date).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRunDetail(null)}
                  className="p-1.5 text-[#9AA1AD] hover:text-[#F2F3F5] rounded-full hover:bg-[#1C1F26]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid metrics */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-[14px] bg-[#1C1F26]">
                  <span className="text-[11px] text-[#6B7280] block">Distância</span>
                  <p className="text-[18px] font-semibold text-[#F2F3F5] tabular-nums mt-0.5">
                    {selectedRunDetail.distanceKm.toFixed(2)} km
                  </p>
                  <span className="text-[10px] text-[#9AA1AD]">({Math.round(selectedRunDetail.distanceKm * 1000)} m)</span>
                </div>

                <div className="p-3 rounded-[14px] bg-[#1C1F26]">
                  <span className="text-[11px] text-[#6B7280] block">Duração</span>
                  <p className="text-[18px] font-semibold text-[#F2F3F5] tabular-nums mt-0.5">
                    {selectedRunDetail.durationMinutes} min
                  </p>
                  <span className="text-[10px] text-[#9AA1AD]">Tempo de esteira</span>
                </div>

                <div className="p-3 rounded-[14px] bg-[#1C1F26]">
                  <span className="text-[11px] text-[#6B7280] block">Ritmo Médio</span>
                  <p className="text-[18px] font-semibold text-[#2DD4BF] tabular-nums font-mono mt-0.5">
                    {selectedRunDetail.paceFormatted}
                  </p>
                  <span className="text-[10px] text-[#9AA1AD]">{selectedRunDetail.speedKmh.toFixed(1)} km/h</span>
                </div>

                <div className="p-3 rounded-[14px] bg-[#1C1F26]">
                  <span className="text-[11px] text-[#6B7280] block">Inclinação & Esforço</span>
                  <p className="text-[18px] font-semibold text-[#F2F3F5] tabular-nums mt-0.5">
                    {selectedRunDetail.inclinePct}% inc
                  </p>
                  <span className="text-[10px] text-[#9AA1AD]">RPE {selectedRunDetail.rpe}/10</span>
                </div>
              </div>

              {/* Intervals if present */}
              {selectedRunDetail.intervals && selectedRunDetail.intervals.length > 0 && (
                <div className="p-3 rounded-[14px] bg-[#1C1F26] space-y-1.5">
                  <span className="text-[11px] font-medium text-[#9AA1AD] block">
                    Tiros ({selectedRunDetail.intervals.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {selectedRunDetail.intervals.map((int, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-[8px] bg-[#15171C] text-[#F2F3F5]">
                        {int.label || `#${i+1}`}: {int.distanceMeters ? `${int.distanceMeters}m ` : ''}{int.speedKmh ? `@${int.speedKmh}km/h ` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRunDetail.notes && (
                <div className="p-3 rounded-[14px] bg-[#1C1F26] text-[13px] text-[#9AA1AD] italic">
                  "{selectedRunDetail.notes}"
                </div>
              )}

              {/* Action: Excluir */}
              <div className="pt-2 border-t border-[rgba(255,255,255,0.06)] flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedRunDetail.id;
                    setSelectedRunDetail(null);
                    setRunToDeleteId(id);
                  }}
                  className="px-3 py-2 text-[12px] font-semibold text-[#FF6B6B] hover:bg-[#FF6B6B]/10 rounded-[10px] transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir corrida</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRunDetail(null)}
                  className="px-4 py-2 text-[13px] font-medium text-[#9AA1AD] hover:text-[#F2F3F5] transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. IN-APP MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (SEM WINDOW.CONFIRM) */}
      <AnimatePresence>
        {runToDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[20px] p-5 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#FF6B6B]/15 text-[#FF6B6B] flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 stroke-[2]" />
              </div>

              <div>
                <h4 className="text-[17px] font-semibold text-[#F2F3F5]">
                  Excluir registro de corrida?
                </h4>
                <p className="text-[13px] text-[#9AA1AD] mt-1">
                  Esta ação não pode ser desfeita e removerá a corrida do seu histórico.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRunToDeleteId(null)}
                  className="min-h-[44px] rounded-[12px] bg-[#1C1F26] hover:bg-[#222630] text-[#9AA1AD] hover:text-[#F2F3F5] text-[13px] font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (runToDeleteId) {
                      onDeleteRun(runToDeleteId);
                      setRunToDeleteId(null);
                    }
                  }}
                  className="min-h-[44px] rounded-[12px] bg-[#FF6B6B] hover:bg-[#ff5252] text-white text-[13px] font-semibold transition cursor-pointer"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
