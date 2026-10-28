import React, { useState, useMemo } from 'react';
import {
  Timer,
  Play,
  Plus,
  Trash2,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  Target,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle
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
  getTafCurrentStatus
} from '../lib/tafPlanData';

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
  // Form visibility state
  const [showForm, setShowForm] = useState<boolean>(() => !!initialPrefill);

  // Converter visibility
  const [showConverter, setShowConverter] = useState(false);

  // History filter
  const [filterType, setFilterType] = useState<string>('all');

  // Form Fields
  const [runDate, setRunDate] = useState<string>(() => {
    if (initialPrefill?.date) return initialPrefill.date;
    const now = new Date();
    // format as YYYY-MM-DD
    return now.toISOString().split('T')[0];
  });

  const [runType, setRunType] = useState<RunType>(() => {
    return (initialPrefill?.type as RunType) || 'A leve/continuo';
  });

  const [durationMinutes, setDurationMinutes] = useState<string>(() => {
    return initialPrefill?.durationMinutes ? String(initialPrefill.durationMinutes) : '20';
  });

  const [distanceKm, setDistanceKm] = useState<string>(() => {
    return initialPrefill?.distanceKm ? String(initialPrefill.distanceKm) : '2.5';
  });

  const [inclinePct, setInclinePct] = useState<number>(() => {
    return initialPrefill?.inclinePct ?? 1.0;
  });

  const [rpe, setRpe] = useState<number>(() => {
    return initialPrefill?.rpe ?? 6;
  });

  const [notes, setNotes] = useState<string>(() => {
    return initialPrefill?.notes || '';
  });

  // Intervals list for fartlek / interval sessions
  const [intervals, setIntervals] = useState<RunInterval[]>(() => {
    return initialPrefill?.intervals || [];
  });

  // Converter state
  const [converterSpeed, setConverterSpeed] = useState<string>('11.0');
  const [converterPaceMins, setConverterPaceMins] = useState<string>('5');
  const [converterPaceSecs, setConverterPaceSecs] = useState<string>('27');

  // React to prefill changes (e.g. user clicked "Iniciar corrida" from TAF Plan)
  React.useEffect(() => {
    if (initialPrefill) {
      if (initialPrefill.date) setRunDate(initialPrefill.date);
      if (initialPrefill.type) setRunType(initialPrefill.type as RunType);
      if (initialPrefill.durationMinutes) setDurationMinutes(String(initialPrefill.durationMinutes));
      if (initialPrefill.distanceKm) setDistanceKm(String(initialPrefill.distanceKm));
      if (initialPrefill.inclinePct !== undefined) setInclinePct(initialPrefill.inclinePct);
      if (initialPrefill.rpe !== undefined) setRpe(initialPrefill.rpe);
      if (initialPrefill.notes !== undefined) setNotes(initialPrefill.notes);
      if (initialPrefill.intervals) setIntervals(initialPrefill.intervals);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [initialPrefill]);

  // Automatic calculation of stats based on duration and distance
  const numDuration = parseFloat(durationMinutes) || 0;
  const numDistance = parseFloat(distanceKm) || 0;
  const calculatedStats = useMemo(() => {
    return calculateRunStats(numDuration, numDistance);
  }, [numDuration, numDistance]);

  // Check if current run reaches TAF target:
  // For 12-min simulation: distance >= 2.2km
  // Or overall pace <= 5:27/km (327 seconds/km) with duration >= 12min
  const isTafTargetAchieved = useMemo(() => {
    if (runType === 'Simulado 12 min') {
      return numDistance >= 2.2;
    }
    return calculatedStats.paceSecondsPerKm > 0 && calculatedStats.paceSecondsPerKm <= 327 && numDuration >= 12;
  }, [runType, numDistance, calculatedStats.paceSecondsPerKm, numDuration]);

  // Overall Statistics from history
  const stats = useMemo(() => {
    const totalRuns = runs.length;
    const totalDistance = runs.reduce((acc, r) => acc + (r.distanceKm || 0), 0);
    const totalDuration = runs.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);
    const simulations = runs.filter(r => r.type === 'Simulado 12 min' || r.durationMinutes === 12);

    let bestSimulationDistance = 0;
    let bestSimulationPace = '--:--/km';

    simulations.forEach(sim => {
      if (sim.distanceKm > bestSimulationDistance) {
        bestSimulationDistance = sim.distanceKm;
        bestSimulationPace = sim.paceFormatted;
      }
    });

    const averagePaceSecs = totalDistance > 0 ? Math.round((totalDuration * 60) / totalDistance) : 0;
    const avgPaceMins = Math.floor(averagePaceSecs / 60);
    const avgPaceRemainingSecs = averagePaceSecs % 60;
    const averagePaceFormatted = averagePaceSecs > 0
      ? `${avgPaceMins}:${avgPaceRemainingSecs.toString().padStart(2, '0')}/km`
      : '--:--/km';

    return {
      totalRuns,
      totalDistance: Number(totalDistance.toFixed(1)),
      totalDurationHours: (totalDuration / 60).toFixed(1),
      simulationsCount: simulations.length,
      bestSimulationDistance: Number(bestSimulationDistance.toFixed(2)),
      bestSimulationMeters: Math.round(bestSimulationDistance * 1000),
      bestSimulationPace,
      averagePaceFormatted
    };
  }, [runs]);

  // Filtered runs for history list
  const filteredRuns = useMemo(() => {
    if (filterType === 'all') return runs;
    if (filterType === 'simulado') return runs.filter(r => r.type === 'Simulado 12 min');
    if (filterType === 'tiros') return runs.filter(r => r.type === 'C moderado ou tiros' || (r.intervals && r.intervals.length > 0));
    if (filterType === 'continuo') return runs.filter(r => r.type === 'A leve/continuo' || r.type === 'B fartlek ou trote-caminhada');
    return runs;
  }, [runs, filterType]);

  // 12-Min Simulation tests sorted chronologically for graph/evolution
  const simulationRuns = useMemo(() => {
    return runs
      .filter(r => r.type === 'Simulado 12 min' || (r.durationMinutes === 12 && r.distanceKm > 0))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [runs]);

  // Add interval row
  const handleAddInterval = () => {
    const nextOrder = intervals.length + 1;
    setIntervals([
      ...intervals,
      {
        id: `interval-${Date.now()}-${nextOrder}`,
        order: nextOrder,
        label: `Tiro ${nextOrder}`,
        distanceMeters: 400,
        speedKmh: 11.0,
        durationSeconds: 131,
        durationFormatted: '2:11',
        restSeconds: 90,
        restType: 'trote',
        notes: ''
      }
    ]);
  };

  const handleRemoveInterval = (id: string) => {
    setIntervals(intervals.filter(i => i.id !== id));
  };

  const handleUpdateInterval = (id: string, updates: Partial<RunInterval>) => {
    setIntervals(intervals.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, ...updates };
      // Recalculate duration if distance and speed change
      if (updates.distanceMeters !== undefined || updates.speedKmh !== undefined) {
        const dist = updated.distanceMeters || 400;
        const spd = updated.speedKmh || 11.0;
        if (spd > 0) {
          const totalSecs = Math.round(dist / (spd * 1000 / 3600));
          updated.durationSeconds = totalSecs;
          const m = Math.floor(totalSecs / 60);
          const s = totalSecs % 60;
          updated.durationFormatted = `${m}:${s.toString().padStart(2, '0')}`;
        }
      }
      return updated;
    }));
  };

  // Quick interval templates
  const loadIntervalTemplate = (templateType: '400m' | '800m' | '1000m' | 'fartlek') => {
    if (templateType === '400m') {
      const newInts: RunInterval[] = [];
      for (let i = 1; i <= 5; i++) {
        newInts.push({
          id: `int-400-${i}-${Date.now()}`,
          order: i,
          label: `Tiro ${i} (400m)`,
          distanceMeters: 400,
          speedKmh: 11.0,
          durationSeconds: 131,
          durationFormatted: '2:11',
          restSeconds: 90,
          restType: 'trote',
          notes: '400m a 11 km/h (Ritmo TAF)'
        });
      }
      setIntervals(newInts);
      setRunType('C moderado ou tiros');
      setDurationMinutes('22');
      setDistanceKm('2.0');
    } else if (templateType === '800m') {
      const newInts: RunInterval[] = [];
      for (let i = 1; i <= 4; i++) {
        newInts.push({
          id: `int-800-${i}-${Date.now()}`,
          order: i,
          label: `Tiro ${i} (800m)`,
          distanceMeters: 800,
          speedKmh: 11.0,
          durationSeconds: 262,
          durationFormatted: '4:22',
          restSeconds: 120,
          restType: 'caminhada',
          notes: '800m a 11 km/h (Ritmo TAF)'
        });
      }
      setIntervals(newInts);
      setRunType('C moderado ou tiros');
      setDurationMinutes('28');
      setDistanceKm('3.2');
    } else if (templateType === '1000m') {
      const newInts: RunInterval[] = [];
      for (let i = 1; i <= 3; i++) {
        newInts.push({
          id: `int-1000-${i}-${Date.now()}`,
          order: i,
          label: `Tiro ${i} (1.000m)`,
          distanceMeters: 1000,
          speedKmh: 11.0,
          durationSeconds: 327,
          durationFormatted: '5:27',
          restSeconds: 180,
          restType: 'caminhada',
          notes: '1.000m a 11 km/h (Ritmo TAF)'
        });
      }
      setIntervals(newInts);
      setRunType('C moderado ou tiros');
      setDurationMinutes('26');
      setDistanceKm('3.0');
    } else if (templateType === 'fartlek') {
      const newInts: RunInterval[] = [];
      for (let i = 1; i <= 8; i++) {
        newInts.push({
          id: `int-fartlek-${i}-${Date.now()}`,
          order: i,
          label: `Fartlek ${i} (1m forte / 2m leve)`,
          distanceMeters: 450,
          speedKmh: 11.5,
          durationSeconds: 180,
          durationFormatted: '3:00',
          restSeconds: 120,
          restType: 'trote',
          notes: '1 min a 11.5 km/h + 2 min a 8 km/h'
        });
      }
      setIntervals(newInts);
      setRunType('B fartlek ou trote-caminhada');
      setDurationMinutes('24');
      setDistanceKm('3.7');
    }
  };

  // Submit Run Form
  const handleSubmitRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (numDuration <= 0 || numDistance <= 0) return;

    const dateObj = new Date(`${runDate}T12:00:00`);
    const newRun: RunLog = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: runDate,
      timestamp: dateObj.getTime(),
      type: runType,
      durationMinutes: numDuration,
      distanceKm: numDistance,
      inclinePct,
      rpe,
      speedKmh: calculatedStats.speedKmh,
      paceFormatted: calculatedStats.paceFormatted,
      paceSecondsPerKm: calculatedStats.paceSecondsPerKm,
      intervals: intervals.length > 0 ? intervals : undefined,
      notes: notes.trim(),
      tafTargetAchieved: isTafTargetAchieved,
      createdAt: new Date().toISOString()
    };

    onSaveRun(newRun);

    // Reset or close form
    if (onClearPrefill) onClearPrefill();
    setShowForm(false);
    setNotes('');
    setIntervals([]);
  };

  // Interactive Converter Handlers
  const handleConverterSpeedChange = (valStr: string) => {
    setConverterSpeed(valStr);
    const spd = parseFloat(valStr);
    if (!isNaN(spd) && spd > 0) {
      const p = speedKmhToPace(spd);
      setConverterPaceMins(String(p.minutes));
      setConverterPaceSecs(String(p.seconds));
    }
  };

  const handleConverterPaceChange = (mStr: string, sStr: string) => {
    setConverterPaceMins(mStr);
    setConverterPaceSecs(sStr);
    const m = parseInt(mStr) || 0;
    const s = parseInt(sStr) || 0;
    const spd = paceToSpeedKmh(m, s);
    if (spd > 0) {
      setConverterSpeed(String(spd));
    }
  };

  // RPE Rating Description
  const getRpeDescription = (val: number) => {
    if (val <= 2) return 'Muito fácil / Regenerativo (Z1)';
    if (val <= 4) return 'Fácil / Trote de base (Z2)';
    if (val <= 6) return 'Moderado / Esforço sustentável (Z3)';
    if (val <= 8) return 'Duro / Ritmo forte do TAF (Z4)';
    if (val === 9) return 'Muito duro / Limite de acidose (Z5)';
    return 'Exaustão Máxima / Simulado a todo vapor (Z5+)';
  };

  const currentTafStatus = getTafCurrentStatus();

  return (
    <div id="running-tracker-view" className="space-y-6">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-widest text-lime-400 font-extrabold uppercase bg-lime-500/10 border border-lime-500/20 px-2 py-0.5 rounded">
              ESTEIRA & TAF 12 MIN
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Meta: 2.200 m em 12 min (11 km/h • 5:27/km)
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Timer className="w-6 h-6 text-lime-400 stroke-[2.5]" />
            REGISTRO DE CORRIDA
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-toggle-converter"
            onClick={() => setShowConverter(!showConverter)}
            className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Conversor km/h ⇄ min/km</span>
            {showConverter ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            id="btn-goto-taf-plan"
            onClick={onNavigateToTafPlan}
            className="px-3 py-2 rounded-xl border border-lime-500/30 bg-lime-500/10 hover:bg-lime-500/20 text-lime-300 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Target className="w-3.5 h-3.5 text-lime-400" />
            <span>Ver Plano TAF 17 Semanas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            id="btn-toggle-run-form"
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-lime-500/10 transition active:scale-95"
          >
            {showForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
            <span>{showForm ? 'Fechar Formulário' : 'Registrar Corrida'}</span>
          </button>
        </div>
      </div>

      {/* QUICK SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4">
          <span className="text-[10px] text-slate-500 font-mono uppercase block font-bold">Total Corridas</span>
          <p className="text-2xl font-black text-white font-mono mt-1">
            {stats.totalRuns} <span className="text-xs text-slate-400 font-normal">sessões</span>
          </p>
          <span className="text-[10px] text-slate-400 font-mono">
            {stats.totalDistance} km acumulados
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4">
          <span className="text-[10px] text-slate-500 font-mono uppercase block font-bold">Ritmo Médio Geral</span>
          <p className="text-2xl font-black text-white font-mono mt-1">
            {stats.averagePaceFormatted}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">
            {stats.totalDurationHours} horas de esteira
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-lime-400 font-mono uppercase block font-bold">Melhor Simulado 12m</span>
            <Award className="w-4 h-4 text-lime-400" />
          </div>
          <p className="text-2xl font-black text-lime-400 font-mono mt-1">
            {stats.bestSimulationMeters > 0 ? `${stats.bestSimulationMeters} m` : '--'}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">
            {stats.bestSimulationMeters >= 2200 ? (
              <span className="text-emerald-400 font-bold">🏆 Meta TAF Atingida!</span>
            ) : stats.bestSimulationMeters > 0 ? (
              <span className="text-amber-400">Faltam {2200 - stats.bestSimulationMeters} m p/ meta</span>
            ) : (
              'Nenhum simulado feito'
            )}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4">
          <span className="text-[10px] text-slate-500 font-mono uppercase block font-bold">Alvo do TAF</span>
          <p className="text-2xl font-black text-white font-mono mt-1">
            2.200 m
          </p>
          <span className="text-[10px] text-slate-400 font-mono">
            Em 12 min (5:27/km • 11 km/h)
          </span>
        </div>
      </div>

      {/* CONVERSOR KM/H PARA MIN/KM (EXPANSÍVEL) */}
      {showConverter && (
        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white text-base">Conversor Esteira: Velocidade (km/h) ⇄ Ritmo (min/km)</h3>
            </div>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-mono px-2 py-0.5 rounded border border-cyan-500/20">
              Cálculo Exato
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Interactive inputs */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 block">Digite a Velocidade na Esteira:</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.1"
                  min="4"
                  max="25"
                  value={converterSpeed}
                  onChange={(e) => handleConverterSpeedChange(e.target.value)}
                  className="w-28 bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xl px-3 py-2 rounded-xl outline-none focus:border-cyan-400"
                />
                <span className="text-sm font-mono text-slate-400 font-bold">km/h</span>
                <span className="text-slate-600 font-mono font-bold">➔</span>
                <div className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 rounded-xl font-mono text-cyan-300 font-black text-lg">
                  {speedKmhToPace(parseFloat(converterSpeed) || 0).formatted}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-850">
                <span className="text-xs font-bold text-slate-300 block mb-1.5">Ou digite o Ritmo desejado:</span>
                <div className="flex items-center gap-2 font-mono">
                  <input
                    type="number"
                    min="2"
                    max="15"
                    value={converterPaceMins}
                    onChange={(e) => handleConverterPaceChange(e.target.value, converterPaceSecs)}
                    className="w-14 bg-slate-900 border border-slate-700 text-white font-mono font-bold text-center py-1.5 rounded-lg text-sm"
                  />
                  <span className="text-slate-400 font-bold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={converterPaceSecs}
                    onChange={(e) => handleConverterPaceChange(converterPaceMins, e.target.value)}
                    className="w-14 bg-slate-900 border border-slate-700 text-white font-mono font-bold text-center py-1.5 rounded-lg text-sm"
                  />
                  <span className="text-xs text-slate-400 font-bold">/km</span>
                  <span className="text-slate-600 font-bold ml-1">➔</span>
                  <span className="text-sm font-bold text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                    {paceToSpeedKmh(parseInt(converterPaceMins) || 0, parseInt(converterPaceSecs) || 0)} km/h
                  </span>
                </div>
              </div>
            </div>

            {/* Quick reference table */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300 block mb-2 font-mono uppercase tracking-wider">
                Tabela Rápida de Velocidades do TAF
              </span>
              <div className="max-h-44 overflow-y-auto space-y-1 pr-1 text-xs font-mono">
                {SPEED_REFERENCE_TABLE.map((item, idx) => {
                  const isTafGoal = item.speed === 11.0;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-1.5 rounded-lg transition ${
                        isTafGoal
                          ? 'bg-lime-500/20 border border-lime-500/40 text-lime-300 font-bold shadow-sm'
                          : 'hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      <span className="font-bold text-white">{item.speed.toFixed(1)} km/h</span>
                      <span className={isTafGoal ? 'text-lime-400 font-black' : 'text-slate-300'}>{item.pace}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{item.zone}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE REGISTRO DE CORRIDA */}
      {showForm && (
        <form
          id="run-logger-form"
          onSubmit={handleSubmitRun}
          className="bg-slate-900 border border-lime-500/30 rounded-2xl p-6 shadow-2xl space-y-5 relative"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center">
                <Flame className="w-4 h-4 text-lime-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Nova Sessão na Esteira</h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Preencha os dados da esteira para calcular ritmo, velocidade e checar o TAF.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>

          {/* Type and Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase font-mono tracking-wider mb-1.5">
                Tipo de Treino
              </label>
              <select
                id="select-run-type"
                value={runType}
                onChange={(e) => setRunType(e.target.value as RunType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 font-sans"
              >
                <option value="A leve/continuo">Corrida A: Leve / Contínuo (Base)</option>
                <option value="B fartlek ou trote-caminhada">Corrida B: Fartlek ou Trote-Caminhada</option>
                <option value="C moderado ou tiros">Corrida C: Moderado ou Tiros (400m / 800m / 1000m)</option>
                <option value="Simulado 12 min">🏆 Simulado Oficial 12 min (Meta 2.200 m)</option>
                <option value="Teste">Teste / Outro Treino de Corrida</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase font-mono tracking-wider mb-1.5">
                Data do Treino
              </label>
              <input
                id="input-run-date"
                type="date"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 font-mono"
                required
              />
            </div>
          </div>

          {/* Duration, Distance, Incline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase font-mono tracking-wider mb-1.5">
                Duração (minutos)
              </label>
              <input
                id="input-run-duration"
                type="number"
                step="0.5"
                min="1"
                max="180"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="Ex: 20"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase font-mono tracking-wider mb-1.5">
                Distância (km)
              </label>
              <input
                id="input-run-distance"
                type="number"
                step="0.01"
                min="0.1"
                max="50"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="Ex: 2.50"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase font-mono tracking-wider mb-1.5">
                Inclinação na Esteira (%)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="input-run-incline"
                  type="number"
                  step="0.5"
                  min="0"
                  max="15"
                  value={inclinePct}
                  onChange={(e) => setInclinePct(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 font-mono font-bold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setInclinePct(1.0)}
                  className={`px-2.5 py-2.5 rounded-xl border text-xs font-mono font-bold shrink-0 transition ${
                    inclinePct === 1.0 ? 'bg-lime-500/20 border-lime-500/40 text-lime-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                  title="1% é o padrão recomendado para simular a esteira"
                >
                  1%
                </button>
              </div>
            </div>
          </div>

          {/* DYNAMIC CALCULATED RESULTS BADGE */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold block">Velocidade Média</span>
              <p className="text-2xl font-black text-white font-mono">
                {calculatedStats.speedKmh > 0 ? `${calculatedStats.speedKmh} km/h` : '--'}
              </p>
              <span className="text-[10px] text-slate-400 font-mono">Cálculo: distância / tempo</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold block">Ritmo Médio (Pace)</span>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-black font-mono text-cyan-300">
                  {calculatedStats.paceFormatted}
                </p>
                {calculatedStats.paceSecondsPerKm > 0 && calculatedStats.paceSecondsPerKm <= 327 && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    ✓ No Alvo TAF
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Meta: ≤ 5:27/km</span>
            </div>

            {/* TAF Status indicator */}
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-850">
              <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-lime-400" />
                Desempenho no TAF (2.200 m / 12 min)
              </span>
              {numDuration === 12 || runType === 'Simulado 12 min' ? (
                numDistance >= 2.2 ? (
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Aprovado no Simulado! (+{Math.round((numDistance - 2.2) * 1000)} m) 🏆</span>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Faltam {Math.round((2.2 - numDistance) * 1000)} m para os 2.200 m ({Math.round((numDistance / 2.2) * 100)}%)</span>
                  </div>
                )
              ) : (
                <div className="text-[11px] text-slate-400">
                  Ritmo estimado para 12 min: <span className="font-bold text-white font-mono">{((calculatedStats.speedKmh * 12) / 60).toFixed(2)} km</span>
                </div>
              )}
            </div>
          </div>

          {/* RPE (Esforço Percebido 1-10) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
                Esforço Percebido (RPE 1 a 10): <span className="text-lime-400 font-black text-sm">{rpe}</span>
              </label>
              <span className="text-xs font-semibold text-slate-300 font-mono">
                {getRpeDescription(rpe)}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={rpe}
              onChange={(e) => setRpe(parseInt(e.target.value))}
              className="w-full accent-lime-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
              <span>1 (Leve)</span>
              <span>5 (Moderado)</span>
              <span>8 (Ritmo TAF)</span>
              <span>10 (Exaustão)</span>
            </div>
          </div>

          {/* LISTA DE TIROS / INTERVALOS (PARA TREINOS INTERVALADOS) */}
          <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2.5">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-lime-400" />
                  Lista de Tiros / Intervalos ({intervals.length} repetições)
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Opcional para treinos intervalados (400m, 800m, 1000m ou Fartlek)
                </span>
              </div>

              {/* Template quick buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => loadIntervalTemplate('400m')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-850 text-slate-300 text-[10px] font-mono border border-slate-800"
                >
                  +5x 400m (11 km/h)
                </button>
                <button
                  type="button"
                  onClick={() => loadIntervalTemplate('800m')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-850 text-slate-300 text-[10px] font-mono border border-slate-800"
                >
                  +4x 800m (11 km/h)
                </button>
                <button
                  type="button"
                  onClick={() => loadIntervalTemplate('1000m')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-850 text-slate-300 text-[10px] font-mono border border-slate-800"
                >
                  +3x 1.000m (11 km/h)
                </button>
                <button
                  type="button"
                  onClick={() => loadIntervalTemplate('fartlek')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-850 text-slate-300 text-[10px] font-mono border border-slate-800"
                >
                  +8x Fartlek
                </button>
                <button
                  type="button"
                  onClick={handleAddInterval}
                  className="px-2.5 py-1 rounded bg-lime-500/20 hover:bg-lime-500/30 text-lime-300 text-[10px] font-bold border border-lime-500/30 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Adicionar Tiro
                </button>
              </div>
            </div>

            {intervals.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {intervals.map((int, idx) => (
                  <div
                    key={int.id}
                    className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-850 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-slate-800 text-lime-400 font-bold flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={int.label || `Tiro ${idx + 1}`}
                        onChange={(e) => handleUpdateInterval(int.id, { label: e.target.value })}
                        className="bg-slate-950 border border-slate-800 text-white px-2 py-1 rounded w-28 text-[11px]"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">Dist:</span>
                        <input
                          type="number"
                          value={int.distanceMeters || 400}
                          onChange={(e) => handleUpdateInterval(int.id, { distanceMeters: parseInt(e.target.value) || 0 })}
                          className="bg-slate-950 border border-slate-800 text-white px-2 py-1 rounded w-16 text-[11px] text-center"
                        />
                        <span className="text-[10px] text-slate-500">m</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">Vel:</span>
                        <input
                          type="number"
                          step="0.1"
                          value={int.speedKmh || 11.0}
                          onChange={(e) => handleUpdateInterval(int.id, { speedKmh: parseFloat(e.target.value) || 0 })}
                          className="bg-slate-950 border border-slate-800 text-white px-2 py-1 rounded w-16 text-[11px] text-center"
                        />
                        <span className="text-[10px] text-slate-500">km/h</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">Descanso:</span>
                        <input
                          type="number"
                          value={int.restSeconds || 90}
                          onChange={(e) => handleUpdateInterval(int.id, { restSeconds: parseInt(e.target.value) || 0 })}
                          className="bg-slate-950 border border-slate-800 text-white px-2 py-1 rounded w-14 text-[11px] text-center"
                        />
                        <span className="text-[10px] text-slate-500">s</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveInterval(int.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[11px] text-slate-500 py-2 font-mono">
                Nenhum tiro adicionado. Para treinos contínuos ou simulado direto, não é necessário adicionar tiros.
              </p>
            )}
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase font-mono tracking-wider mb-1.5">
              Observações / Sensações na Esteira
            </label>
            <textarea
              id="textarea-run-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Aquecimento de 5 min caminhando + 3 min trote; 1% de inclinação na esteira; pernas responderam bem aos 11 km/h..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 font-sans resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition"
            >
              Cancelar
            </button>
            <button
              id="btn-save-run-session"
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-lime-500/10 transition active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar Corrida</span>
            </button>
          </div>
        </form>
      )}

      {/* GRÁFICO E EVOLUÇÃO DOS SIMULADOS DE 12 MINUTOS */}
      {simulationRuns.length > 0 && (
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-lime-400 bg-lime-500/10 border border-lime-500/20 px-2 py-0.5 rounded">
                  EVOLUÇÃO DOS SIMULADOS DE 12 MIN
                </span>
                <span className="text-xs text-white font-bold">Meta Oficial: 2.200 m (11,0 km/h)</span>
              </div>
              <h3 className="text-sm md:text-base font-bold text-white mt-1">
                Progressão de Distância e Ritmo nos Testes Oficiais
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {simulationRuns.length} {simulationRuns.length === 1 ? 'simulado registrado' : 'simulados registrados'}
            </span>
          </div>

          {/* Visual Bars for Simulations */}
          <div className="space-y-3 pt-2">
            {simulationRuns.map((sim, index) => {
              const distanceMeters = Math.round(sim.distanceKm * 1000);
              const pctOfTarget = Math.min(130, Math.round((distanceMeters / 2200) * 100));
              const passed = distanceMeters >= 2200;

              return (
                <div key={sim.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[11px]">
                        #{index + 1} • {new Date(sim.timestamp).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-white font-bold font-mono">
                        {distanceMeters} m
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({sim.paceFormatted})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {passed ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3 h-3" />
                          Aprovado (+{distanceMeters - 2200}m)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
                          Faltam {2200 - distanceMeters}m ({pctOfTarget}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visual Bar with 2200m mark */}
                  <div className="relative w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
                    {/* 2200m target vertical line marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                      style={{ left: '77%' }} // approx 2200 / 2850 scale
                      title="Meta 2.200m (100%)"
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        passed
                          ? 'bg-gradient-to-r from-lime-500 to-emerald-400'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      }`}
                      style={{ width: `${Math.min(100, (distanceMeters / 2600) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HISTÓRICO DE CORRIDAS */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-lime-400" />
            <h3 className="font-bold text-white text-base">Histórico de Corridas</h3>
          </div>

          {/* Filter pills */}
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-850 text-xs font-semibold">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'simulado', label: 'Simulados 12m' },
              { id: 'tiros', label: 'Tiros' },
              { id: 'continuo', label: 'Contínuos' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1 rounded-lg transition ${
                  filterType === f.id
                    ? 'bg-lime-500/20 text-lime-300 font-bold border border-lime-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredRuns.length === 0 ? (
          <div className="text-center p-12 bg-slate-950 rounded-xl border border-slate-850 space-y-2">
            <Timer className="w-10 h-10 text-slate-700 mx-auto" />
            <span className="text-sm font-semibold text-white block">Nenhuma corrida encontrada</span>
            <span className="text-xs text-slate-500 block max-w-sm mx-auto">
              {filterType === 'all'
                ? 'Registre seu primeiro treino na esteira ou selecione um treino do Plano TAF de 17 semanas!'
                : 'Nenhuma corrida corresponde ao filtro selecionado.'}
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {[...filteredRuns].reverse().map((run) => {
              const isSimulado = run.type === 'Simulado 12 min';
              const isTargetReached = run.tafTargetAchieved;

              return (
                <div
                  key={run.id}
                  className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-4 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850/60 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                          {new Date(`${run.date}T12:00:00`).toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${
                          isSimulado
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-lime-500/10 border-lime-500/20 text-lime-400'
                        }`}>
                          {run.type}
                        </span>
                        {isTargetReached && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                            🎯 Alvo TAF
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Deseja excluir este registro de corrida?')) {
                            onDeleteRun(run.id);
                          }
                        }}
                        className="text-slate-600 hover:text-red-400 p-1 transition"
                        title="Excluir corrida"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] text-slate-500 uppercase block font-bold">Distância</span>
                      <span className="text-white font-black text-sm">{run.distanceKm.toFixed(2)} km</span>
                      <span className="text-[9px] text-slate-500 block">({Math.round(run.distanceKm * 1000)} m)</span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] text-slate-500 uppercase block font-bold">Duração</span>
                      <span className="text-white font-black text-sm">{run.durationMinutes} min</span>
                      <span className="text-[9px] text-slate-500 block">Tempo na esteira</span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] text-slate-500 uppercase block font-bold">Ritmo Médio</span>
                      <span className="text-cyan-400 font-black text-sm">{run.paceFormatted}</span>
                      <span className="text-[9px] text-slate-500 block">{run.speedKmh.toFixed(1)} km/h</span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] text-slate-500 uppercase block font-bold">Inclinação & RPE</span>
                      <span className="text-white font-black text-sm">{run.inclinePct}% inc</span>
                      <span className="text-[9px] text-slate-500 block">Esforço {run.rpe}/10</span>
                    </div>
                  </div>

                  {/* Intervals summary if present */}
                  {run.intervals && run.intervals.length > 0 && (
                    <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850/60 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 font-mono block">
                        Tiros Registrados ({run.intervals.length} repetições):
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {run.intervals.map((int, i) => (
                          <span
                            key={int.id || i}
                            className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded font-mono"
                          >
                            {int.label || `#${i+1}`}: {int.distanceMeters ? `${int.distanceMeters}m` : ''} {int.speedKmh ? `@ ${int.speedKmh} km/h` : ''} ({int.durationFormatted || `${int.durationSeconds}s`})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {run.notes && (
                    <p className="text-xs text-slate-400 italic bg-slate-900/30 p-2 rounded border border-slate-850/40">
                      “{run.notes}”
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
