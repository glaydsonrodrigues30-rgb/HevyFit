import React, { useMemo, useState } from 'react';
import { X, Plus, Copy, Trash2, Save, RotateCcw, Sparkles, Flag, Calendar, AlertCircle } from 'lucide-react';
import { RunPlanConfig, RunType, TafWorkoutDef } from '../types';
import {
  DAY_NAMES,
  buildDefaultTafPlan,
  buildIntervals,
  buildStarterPlan,
  goalPaceStr,
  goalSpeedKmh,
  isoDate,
  normalizePlan,
  paceStr
} from '../lib/tafPlanData';

interface RunPlanEditorProps {
  plan: RunPlanConfig;
  onSave: (plan: RunPlanConfig) => void;
  onClose: () => void;
}

const inputCls =
  'w-full min-h-[44px] px-3 rounded-[12px] bg-[#1C1F26] border border-[rgba(255,255,255,0.07)] text-[#F2F3F5] text-[14px] outline-none focus:border-[#2DD4BF] transition';
const labelCls = 'text-[12px] font-medium text-[#9AA1AD] block mb-1';
const btnGhost =
  'min-h-[40px] px-3.5 rounded-[12px] bg-[#1C1F26] hover:bg-[#252a35] border border-[rgba(255,255,255,0.07)] text-[#F2F3F5] text-[13px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer';

const TYPE_OPTIONS: { id: RunType; label: string }[] = [
  { id: 'A leve/continuo', label: 'Contínuo leve' },
  { id: 'B fartlek ou trote-caminhada', label: 'Fartlek ou trote/caminhada' },
  { id: 'C moderado ou tiros', label: 'Moderado ou tiros' },
  { id: 'Simulado 12 min', label: 'Simulado da meta' },
  { id: 'Teste', label: 'Teste' }
];

const INTENSITIES: TafWorkoutDef['intensityLabel'][] = [
  'Leve',
  'Moderado',
  'Ritmo-alvo',
  'Acima do alvo',
  'Simulado',
  'Descanso / Taper'
];

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

const fmtKmh = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

function speedTexts(vMin: number, vMax: number) {
  const lo = Math.min(vMin, vMax);
  const hi = Math.max(vMin, vMax);
  if (!(lo > 0)) return { range: '--', pace: '--' };
  if (lo === hi) return { range: `${fmtKmh(lo)} km/h`, pace: paceStr(lo) };
  return { range: `${fmtKmh(lo)} a ${fmtKmh(hi)} km/h`, pace: `${paceStr(hi).replace('/km', '')} a ${paceStr(lo)}` };
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function Num({
  value,
  onChange,
  step = 1,
  min = 0
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={inputCls}
    />
  );
}

export default function RunPlanEditor({ plan, onSave, onClose }: RunPlanEditorProps) {
  const [draft, setDraft] = useState<RunPlanConfig>(() => normalizePlan(clone(plan)));
  const [tab, setTab] = useState<'meta' | 'semanas' | 'novo'>('meta');
  const [weekIdx, setWeekIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'reset' | 'remove' | 'discard'>(null);
  const [newPhaseName, setNewPhaseName] = useState('Nova fase');
  const [copyFrom, setCopyFrom] = useState(1);
  const [copyTo, setCopyTo] = useState(1);
  const [gen, setGen] = useState({ count: 4, dist: 400, kmh: 11, rest: 90, restType: 'trote' as 'trote' | 'caminhada' | 'parado' });
  const [starter, setStarter] = useState({
    name: 'Minha meta',
    dist: 5000,
    min: 30,
    exam: '',
    start: (() => {
      const d = new Date();
      d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7));
      return isoDate(d);
    })(),
    weeks: 12
  });

  const baseline = useMemo(() => JSON.stringify(normalizePlan(clone(plan))), [plan]);
  const dirty = JSON.stringify(draft) !== baseline;

  const safeIdx = Math.min(weekIdx, draft.weeks.length - 1);
  const week = draft.weeks[safeIdx];
  const goal = draft.goal;
  const goalKmh = goalSpeedKmh(goal);

  // Aplica uma alteração em cópia do plano e normaliza (datas, numeração e fases)
  const commit = (fn: (d: RunPlanConfig) => void) => {
    setDraft((prev) => {
      const next = clone(prev);
      fn(next);
      return normalizePlan(next);
    });
    setError(null);
  };

  const patchWorkout = (key: 'A' | 'B' | 'C', patch: Partial<TafWorkoutDef>) => {
    commit((d) => {
      const w = d.weeks[safeIdx].workouts[key];
      d.weeks[safeIdx].workouts[key] = { ...w, ...patch };
    });
  };

  const onSpeedChange = (key: 'A' | 'B' | 'C', vMin: number, vMax: number) => {
    const w = week.workouts[key];
    const t = speedTexts(vMin, vMax);
    const mid = (Math.min(vMin, vMax) + Math.max(vMin, vMax)) / 2;
    const patch: Partial<TafWorkoutDef> = {
      suggestedSpeedMin: vMin,
      suggestedSpeedMax: vMax,
      suggestedSpeedRange: t.range,
      targetPaceFormatted: t.pace
    };
    if (!w.isTafSimulation && !(w.intervals && w.intervals.length > 0)) {
      patch.suggestedDistanceKm = Number(((w.suggestedDurationMinutes * mid) / 60).toFixed(2));
    }
    patchWorkout(key, patch);
  };

  const onDurationChange = (key: 'A' | 'B' | 'C', minutes: number) => {
    const w = week.workouts[key];
    const mid = (w.suggestedSpeedMin + w.suggestedSpeedMax) / 2;
    const patch: Partial<TafWorkoutDef> = { suggestedDurationMinutes: minutes };
    if (!w.isTafSimulation && !(w.intervals && w.intervals.length > 0)) {
      patch.suggestedDistanceKm = Number(((minutes * mid) / 60).toFixed(2));
    }
    patchWorkout(key, patch);
  };

  const onTypeChange = (key: 'A' | 'B' | 'C', type: RunType) => {
    if (type === 'Simulado 12 min' || type === 'Teste') {
      const t = speedTexts(goalKmh, goalKmh);
      patchWorkout(key, {
        type,
        isTafSimulation: true,
        intensityLabel: 'Simulado',
        suggestedDurationMinutes: goal.minutes,
        suggestedDistanceKm: goal.distanceMeters / 1000,
        suggestedSpeedMin: Number(goalKmh.toFixed(1)),
        suggestedSpeedMax: Number((goalKmh * 1.1).toFixed(1)),
        suggestedSpeedRange: t.range,
        targetPaceFormatted: t.pace,
        intervals: undefined
      });
    } else {
      patchWorkout(key, { type, isTafSimulation: undefined });
    }
  };

  const generateIntervals = (key: 'A' | 'B' | 'C') => {
    const list = buildIntervals(gen.count, gen.dist, gen.kmh, gen.rest, gen.restType);
    patchWorkout(key, {
      intervals: list.length > 0 ? list : undefined,
      suggestedDistanceKm: Number(((gen.count * gen.dist) / 1000).toFixed(2))
    });
  };

  const addWeekAtEnd = () => {
    commit((d) => {
      const last = clone(d.weeks[d.weeks.length - 1]);
      d.weeks.push(last);
    });
    setWeekIdx(draft.weeks.length);
  };

  const duplicateWeek = () => {
    commit((d) => {
      d.weeks.splice(safeIdx + 1, 0, clone(d.weeks[safeIdx]));
    });
    setWeekIdx(safeIdx + 1);
  };

  const removeWeek = () => {
    commit((d) => {
      if (d.weeks.length > 1) d.weeks.splice(safeIdx, 1);
    });
    setWeekIdx(Math.max(0, safeIdx - 1));
    setConfirm(null);
  };

  const renamePhase = (name: string) => {
    commit((d) => {
      const no = d.weeks[safeIdx].phaseNumber;
      d.weeks.forEach((w) => {
        if (w.phaseNumber === no) w.phaseName = name;
      });
    });
  };

  const setPhaseGoals = (text: string) => {
    commit((d) => {
      const no = d.weeks[safeIdx].phaseNumber;
      d.weeks.forEach((w) => {
        if (w.phaseNumber === no) w.phaseGoals = text;
      });
    });
  };

  const startNewPhaseHere = () => {
    const name = newPhaseName.trim() || 'Nova fase';
    commit((d) => {
      const no = d.weeks[safeIdx].phaseNumber;
      for (let i = safeIdx; i < d.weeks.length; i++) {
        if (d.weeks[i].phaseNumber === no) d.weeks[i].phaseName = name;
      }
    });
  };

  const copyWeekRange = () => {
    const from = Math.min(Math.max(1, copyFrom), draft.weeks.length) - 1;
    const to = Math.min(Math.max(1, copyTo), draft.weeks.length) - 1;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    commit((d) => {
      const src = clone(d.weeks[safeIdx].workouts);
      for (let i = lo; i <= hi; i++) {
        if (i === safeIdx) continue;
        d.weeks[i].workouts = clone(src);
      }
    });
  };

  const createStarter = () => {
    if (!(starter.dist > 0) || !(starter.min > 0)) {
      setError('Informe distância e tempo da meta maiores que zero.');
      return;
    }
    const start = starter.start || isoDate(new Date());
    const exam =
      starter.exam ||
      (() => {
        const d = new Date(start + 'T00:00:00');
        d.setDate(d.getDate() + Math.max(1, starter.weeks) * 7 - 1);
        return isoDate(d);
      })();
    const next = buildStarterPlan(
      { name: starter.name.trim() || 'Minha meta', distanceMeters: starter.dist, minutes: starter.min, examDate: exam },
      start,
      starter.weeks
    );
    setDraft(next);
    setWeekIdx(0);
    setTab('semanas');
    setError(null);
  };

  const handleSave = () => {
    const g = draft.goal;
    if (!(g.distanceMeters > 0) || !(g.minutes > 0)) {
      setError('A meta precisa ter distância e tempo maiores que zero.');
      setTab('meta');
      return;
    }
    if (draft.weeks.length === 0) {
      setError('O plano precisa ter ao menos uma semana.');
      return;
    }
    const clean = normalizePlan({
      ...draft,
      name: draft.name.trim() || `Plano: ${g.name.trim() || 'Minha meta'}`,
      goal: { ...g, name: g.name.trim() || 'Minha meta' },
      weeks: draft.weeks.map((w) => ({ ...w, phaseName: w.phaseName.trim() || 'Fase' })),
      updatedAt: Date.now()
    });
    onSave(clean);
  };

  const requestClose = () => {
    if (dirty) setConfirm('discard');
    else onClose();
  };

  const tabBtn = (id: 'meta' | 'semanas' | 'novo', label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-4 min-h-[40px] rounded-full text-[13px] font-medium transition cursor-pointer ${
        tab === id
          ? 'bg-[#2DD4BF] text-[#0E0F13] font-semibold'
          : 'bg-[#1C1F26] text-[#9AA1AD] hover:text-[#F2F3F5] border border-[rgba(255,255,255,0.06)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#0E0F13] overflow-y-auto" role="dialog" aria-label="Editar plano de corrida">
      <div className="max-w-3xl mx-auto px-4 pb-28 pt-4 space-y-5">
        {/* Cabeçalho */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-[#0E0F13]/95 backdrop-blur border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[18px] font-semibold text-[#F2F3F5] truncate">Editar plano de corrida</h1>
            <p className="text-[12px] text-[#9AA1AD] truncate">
              {draft.weeks.length} semanas • {goal.name}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={requestClose} className={btnGhost} aria-label="Fechar editor">
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Fechar</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[40px] px-4 rounded-[12px] bg-[#2DD4BF] hover:bg-[#20b8a5] text-[#0E0F13] text-[13px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar plano
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabBtn('meta', 'Meta e datas')}
          {tabBtn('semanas', 'Semanas e treinos')}
          {tabBtn('novo', 'Novo plano')}
        </div>

        {error && (
          <div className="p-3 rounded-[12px] bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 text-[#FF6B6B] text-[13px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ABA: META */}
        {tab === 'meta' && (
          <section className="p-5 rounded-[20px] bg-[#15171C] border border-[rgba(255,255,255,0.07)] space-y-4">
            <div className="flex items-center gap-2 text-[#2DD4BF]">
              <Flag className="w-4 h-4" />
              <h2 className="text-[15px] font-semibold text-[#F2F3F5]">Meta geral</h2>
            </div>
            <Field label="Nome do plano">
              <input className={inputCls} value={draft.name} onChange={(e) => commit((d) => { d.name = e.target.value; })} />
            </Field>
            <Field label="Nome da meta (ex.: TAF Polícia Civil, 10 km)">
              <input className={inputCls} value={goal.name} onChange={(e) => commit((d) => { d.goal.name = e.target.value; })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Distância da meta (m)">
                <Num value={goal.distanceMeters} step={50} onChange={(n) => commit((d) => { d.goal.distanceMeters = n; })} />
              </Field>
              <Field label="Tempo da meta (min)">
                <Num value={goal.minutes} step={1} onChange={(n) => commit((d) => { d.goal.minutes = n; })} />
              </Field>
            </div>
            <div className="p-3 rounded-[12px] bg-[#1C1F26] text-[13px] text-[#9AA1AD]">
              Velocidade necessária:{' '}
              <strong className="text-[#2DD4BF] tabular-nums">
                {goalKmh > 0 ? `${fmtKmh(goalKmh)} km/h • ${goalPaceStr(goal)}` : '--'}
              </strong>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Início do plano (vira segunda-feira)">
                <input
                  type="date"
                  className={inputCls}
                  value={draft.startDate}
                  onChange={(e) => e.target.value && commit((d) => { d.startDate = e.target.value; })}
                />
              </Field>
              <Field label="Data da prova ou da meta">
                <input
                  type="date"
                  className={inputCls}
                  value={goal.examDate}
                  onChange={(e) => commit((d) => { d.goal.examDate = e.target.value; })}
                />
              </Field>
            </div>
            <p className="text-[12px] text-[#6B7280] flex items-start gap-1.5">
              <Calendar className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                As datas de todas as semanas são recalculadas sozinhas a partir do início. Semana 1 começa em {draft.weeks[0]?.startDate}.
              </span>
            </p>
          </section>
        )}

        {/* ABA: SEMANAS */}
        {tab === 'semanas' && week && (
          <section className="space-y-4">
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
              {draft.weeks.map((w, i) => {
                const hasSim = [w.workouts.A, w.workouts.B, w.workouts.C].some((x) => x.isTafSimulation);
                return (
                  <button
                    key={`${w.weekNumber}-${i}`}
                    type="button"
                    onClick={() => setWeekIdx(i)}
                    className={`shrink-0 min-w-[44px] min-h-[40px] px-2.5 rounded-[10px] text-[12px] font-medium tabular-nums transition cursor-pointer border ${
                      i === safeIdx
                        ? 'bg-[#2DD4BF] text-[#0E0F13] border-[#2DD4BF] font-semibold'
                        : hasSim
                        ? 'bg-[#7C6CFF]/15 text-[#7C6CFF] border-[#7C6CFF]/30'
                        : 'bg-[#1C1F26] text-[#9AA1AD] border-[rgba(255,255,255,0.06)]'
                    }`}
                    title={hasSim ? 'Semana com simulado ou teste' : undefined}
                  >
                    S{w.weekNumber}
                  </button>
                );
              })}
            </div>

            <div className="p-5 rounded-[20px] bg-[#15171C] border border-[rgba(255,255,255,0.07)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-[16px] font-semibold text-[#F2F3F5]">
                    Semana {week.weekNumber} • {week.phaseName}
                  </h2>
                  <p className="text-[12px] text-[#9AA1AD]">
                    {week.startDate} a {week.endDate}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={duplicateWeek} className={btnGhost}>
                    <Copy className="w-3.5 h-3.5" /> Duplicar
                  </button>
                  <button type="button" onClick={addWeekAtEnd} className={btnGhost}>
                    <Plus className="w-3.5 h-3.5" /> Semana no fim
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm('remove')}
                    disabled={draft.weeks.length <= 1}
                    className={`${btnGhost} text-[#FF6B6B] disabled:opacity-40`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                </div>
              </div>

              {(() => {
                const days = (['A', 'B', 'C'] as const)
                  .filter((k) => week.workouts[k].suggestedDurationMinutes > 0)
                  .map((k) => week.workouts[k].dayOfWeek);
                return new Set(days).size < days.length ? (
                  <p className="text-[12px] text-[#F5B84B] flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Dois treinos estão no mesmo dia da semana. O app mostra só o primeiro nesse dia.</span>
                  </p>
                ) : null;
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nome da fase (vale para toda a fase)">
                  <input className={inputCls} value={week.phaseName} onChange={(e) => renamePhase(e.target.value)} />
                </Field>
                <Field label="Começar uma nova fase a partir desta semana">
                  <div className="flex gap-2">
                    <input className={inputCls} value={newPhaseName} onChange={(e) => setNewPhaseName(e.target.value)} />
                    <button type="button" onClick={startNewPhaseHere} className={`${btnGhost} shrink-0`}>
                      Criar
                    </button>
                  </div>
                </Field>
              </div>
              <Field label="Objetivo da fase">
                <textarea
                  className={`${inputCls} py-2 min-h-[64px]`}
                  value={week.phaseGoals}
                  onChange={(e) => setPhaseGoals(e.target.value)}
                />
              </Field>

              <div className="p-3 rounded-[12px] bg-[#1C1F26] space-y-2">
                <span className={labelCls}>Copiar os 3 treinos desta semana para outras semanas</span>
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#9AA1AD]">
                  <span>da semana</span>
                  <div className="w-20">
                    <Num value={copyFrom} onChange={(n) => setCopyFrom(n)} min={1} />
                  </div>
                  <span>até</span>
                  <div className="w-20">
                    <Num value={copyTo} onChange={(n) => setCopyTo(n)} min={1} />
                  </div>
                  <button type="button" onClick={copyWeekRange} className={btnGhost}>
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </button>
                </div>
              </div>
            </div>

            {(['A', 'B', 'C'] as const).map((k) => {
              const w = week.workouts[k];
              const hasIntervals = !!(w.intervals && w.intervals.length > 0);
              return (
                <div key={k} className="p-5 rounded-[20px] bg-[#15171C] border border-[rgba(255,255,255,0.07)] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-8 h-8 rounded-[10px] bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold text-[13px] flex items-center justify-center shrink-0">
                        {k}
                      </span>
                      <h3 className="text-[14px] font-semibold text-[#F2F3F5] truncate">{w.title}</h3>
                    </div>
                    <span className="text-[11px] text-[#6B7280] shrink-0">
                      {w.suggestedDurationMinutes > 0 ? `${DAY_NAMES[w.dayOfWeek]}` : 'Sem corrida'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Dia da semana">
                      <select
                        className={inputCls}
                        value={w.dayOfWeek}
                        onChange={(e) => patchWorkout(k, { dayOfWeek: Number(e.target.value) })}
                      >
                        {DAY_ORDER.map((d) => (
                          <option key={d} value={d}>
                            {DAY_NAMES[d]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Duração (min, 0 = sem corrida)">
                      <Num value={w.suggestedDurationMinutes} onChange={(n) => onDurationChange(k, n)} />
                    </Field>
                    <Field label="Tipo">
                      <select className={inputCls} value={w.type} onChange={(e) => onTypeChange(k, e.target.value as RunType)}>
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id === 'Simulado 12 min' ? `Simulado de ${goal.minutes} min` : t.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Intensidade">
                      <select
                        className={inputCls}
                        value={w.intensityLabel}
                        onChange={(e) => patchWorkout(k, { intensityLabel: e.target.value as TafWorkoutDef['intensityLabel'] })}
                      >
                        {INTENSITIES.map((i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Título do treino">
                    <input className={inputCls} value={w.title} onChange={(e) => patchWorkout(k, { title: e.target.value })} />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Velocidade mínima (km/h)">
                      <Num value={w.suggestedSpeedMin} step={0.5} onChange={(n) => onSpeedChange(k, n, w.suggestedSpeedMax)} />
                    </Field>
                    <Field label="Velocidade máxima (km/h)">
                      <Num value={w.suggestedSpeedMax} step={0.5} onChange={(n) => onSpeedChange(k, w.suggestedSpeedMin, n)} />
                    </Field>
                  </div>
                  <p className="text-[12px] text-[#6B7280]">
                    Aparece como: {w.suggestedSpeedRange} • ritmo {w.targetPaceFormatted} • distância sugerida{' '}
                    {(w.suggestedDistanceKm ?? 0).toFixed(1).replace('.', ',')} km
                  </p>

                  <Field label="Descrição">
                    <textarea
                      className={`${inputCls} py-2 min-h-[72px]`}
                      value={w.description}
                      onChange={(e) => patchWorkout(k, { description: e.target.value })}
                    />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Aquecimento">
                      <input className={inputCls} value={w.warmup} onChange={(e) => patchWorkout(k, { warmup: e.target.value })} />
                    </Field>
                    <Field label="Volta à calma">
                      <input className={inputCls} value={w.cooldown} onChange={(e) => patchWorkout(k, { cooldown: e.target.value })} />
                    </Field>
                  </div>

                  <div className="p-3 rounded-[12px] bg-[#1C1F26] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`${labelCls} mb-0`}>
                        Tiros do treino: {hasIntervals ? `${w.intervals!.length} blocos` : 'nenhum'}
                      </span>
                      {hasIntervals && (
                        <button
                          type="button"
                          onClick={() => patchWorkout(k, { intervals: undefined })}
                          className="text-[12px] text-[#FF6B6B] hover:underline cursor-pointer"
                        >
                          Remover tiros
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <Field label="Quantidade">
                        <Num value={gen.count} onChange={(n) => setGen({ ...gen, count: Math.round(n) })} min={1} />
                      </Field>
                      <Field label="Distância (m)">
                        <Num value={gen.dist} step={100} onChange={(n) => setGen({ ...gen, dist: n })} min={50} />
                      </Field>
                      <Field label="Velocidade (km/h)">
                        <Num value={gen.kmh} step={0.5} onChange={(n) => setGen({ ...gen, kmh: n })} min={1} />
                      </Field>
                      <Field label="Descanso (s)">
                        <Num value={gen.rest} step={10} onChange={(n) => setGen({ ...gen, rest: n })} />
                      </Field>
                      <Field label="Descanso em">
                        <select
                          className={inputCls}
                          value={gen.restType}
                          onChange={(e) => setGen({ ...gen, restType: e.target.value as 'trote' | 'caminhada' | 'parado' })}
                        >
                          <option value="trote">Trote</option>
                          <option value="caminhada">Caminhada</option>
                          <option value="parado">Parado</option>
                        </select>
                      </Field>
                    </div>
                    <button type="button" onClick={() => generateIntervals(k)} className={btnGhost}>
                      <Sparkles className="w-3.5 h-3.5" /> {hasIntervals ? 'Refazer tiros com estes valores' : 'Criar tiros com estes valores'}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ABA: NOVO PLANO */}
        {tab === 'novo' && (
          <section className="p-5 rounded-[20px] bg-[#15171C] border border-[rgba(255,255,255,0.07)] space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2DD4BF]" />
              <h2 className="text-[15px] font-semibold text-[#F2F3F5]">Criar um plano novo</h2>
            </div>
            <p className="text-[13px] text-[#9AA1AD] leading-relaxed">
              Cria um modelo simples de 3 corridas por semana para a meta que você escolher. Depois ajuste cada semana na aba Semanas e treinos. O plano atual só é substituído quando você tocar em Salvar plano.
            </p>
            <Field label="Nome da meta">
              <input className={inputCls} value={starter.name} onChange={(e) => setStarter({ ...starter, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Distância (m)">
                <Num value={starter.dist} step={500} onChange={(n) => setStarter({ ...starter, dist: n })} />
              </Field>
              <Field label="Tempo (min)">
                <Num value={starter.min} onChange={(n) => setStarter({ ...starter, min: n })} />
              </Field>
              <Field label="Início">
                <input type="date" className={inputCls} value={starter.start} onChange={(e) => setStarter({ ...starter, start: e.target.value })} />
              </Field>
              <Field label="Quantas semanas">
                <Num value={starter.weeks} onChange={(n) => setStarter({ ...starter, weeks: Math.round(n) })} min={1} />
              </Field>
            </div>
            <Field label="Data da prova ou da meta (vazio = fim do plano)">
              <input type="date" className={inputCls} value={starter.exam} onChange={(e) => setStarter({ ...starter, exam: e.target.value })} />
            </Field>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={createStarter}
                className="min-h-[44px] px-5 rounded-[12px] bg-[#2DD4BF] hover:bg-[#20b8a5] text-[#0E0F13] text-[13px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Criar plano modelo
              </button>
              <button type="button" onClick={() => setConfirm('reset')} className={btnGhost}>
                <RotateCcw className="w-3.5 h-3.5" /> Voltar ao plano TAF padrão
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Confirmações dentro do app */}
      {confirm && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[20px] p-5 space-y-4 text-center">
            <h3 className="text-[16px] font-semibold text-[#F2F3F5]">
              {confirm === 'reset' && 'Voltar ao plano TAF padrão?'}
              {confirm === 'remove' && `Remover a semana ${week?.weekNumber}?`}
              {confirm === 'discard' && 'Descartar as alterações?'}
            </h3>
            <p className="text-[13px] text-[#9AA1AD] leading-relaxed">
              {confirm === 'reset' && 'O rascunho atual será trocado pelo plano padrão de 38 semanas. Nada é salvo até você tocar em Salvar plano.'}
              {confirm === 'remove' && 'Os treinos desta semana serão apagados do rascunho e as datas seguintes se ajustam.'}
              {confirm === 'discard' && 'Você mexeu no plano e não salvou. Se fechar agora, as alterações são perdidas.'}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirm(null)} className={`${btnGhost} flex-1`}>
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm === 'reset') {
                    setDraft(buildDefaultTafPlan());
                    setWeekIdx(0);
                    setConfirm(null);
                    setTab('meta');
                  } else if (confirm === 'remove') {
                    removeWeek();
                  } else {
                    onClose();
                  }
                }}
                className="flex-1 min-h-[40px] rounded-[12px] bg-[#FF6B6B] hover:bg-[#e85a5a] text-[#0E0F13] text-[13px] font-semibold cursor-pointer transition"
              >
                {confirm === 'discard' ? 'Descartar' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
