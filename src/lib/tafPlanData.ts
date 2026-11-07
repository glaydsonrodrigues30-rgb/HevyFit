import { useSyncExternalStore } from 'react';
import { TafWeekDef, TafWorkoutDef, RunType, RunInterval, RunGoal, RunPlanConfig } from '../types';

// ============================================================================
// CONSTANTES DE DATAS DO PLANO TAF (FÁCIL EDIÇÃO)
// ============================================================================
// 1. Início do plano (Semana 1, sempre uma segunda-feira): 09/11/2026.
// A esteira chega em 10/11/2026: na Semana 1 só há adaptação e o teste inicial (sábado 14/11).
export const TAF_PLAN_START_DATE = '2026-11-09';

// 2. Data da prova do TAF (provisória: sábado 31/07/2027, fim de julho). Ajuste aqui quando souber a data oficial.
export const TAF_EXAM_DATE = '2027-07-31';

// Aliases para compatibilidade
export const TAF_START_DATE_STR = TAF_PLAN_START_DATE;
export const TAF_END_DATE_STR = TAF_EXAM_DATE;

export const TAF_TARGET_METERS = 2200; // 2200 metros
export const TAF_TARGET_MINUTES = 12; // 12 minutos
export const TAF_TARGET_SPEED_KMH = 11.0; // 11 km/h
export const TAF_TARGET_PACE_STR = '5:27/km'; // 5:27 min/km

// Treino de teste diagnóstico para o período de pré-início (hoje até 08/11/2026)
export const TAF_PRE_TEST_WORKOUT: TafWorkoutDef = {
  key: 'Teste',
  title: 'Teste Inicial de 12 Minutos (Esteira)',
  dayOfWeek: 1,
  dayName: 'Hoje',
  type: 'Teste',
  suggestedDurationMinutes: 12,
  suggestedDistanceKm: 2.2,
  suggestedSpeedRange: '11,0 km/h (5:27/km)',
  suggestedSpeedMin: 11.0,
  suggestedSpeedMax: 11.0,
  targetPaceFormatted: '5:27/km',
  intensityLabel: 'Simulado',
  warmup: '5 min caminhando + 3 a 5 min de trote suave',
  cooldown: '5 min de caminhada / volta à calma',
  incline: '1% de inclinação na esteira',
  description: 'Teste diagnóstico pré-plano de 12 minutos para calibrar seu ritmo e registrar sua distância base atual.',
  isTafSimulation: true
};

export const SPEED_REFERENCE_TABLE = [
  { speed: 7.0, pace: '8:34/km', zone: 'Caminhada Rápida / Aquecimento', note: 'Z1 - Regenerativo' },
  { speed: 7.5, pace: '8:00/km', zone: 'Trote Leve Inicial', note: 'Z1 - Base inicial' },
  { speed: 8.0, pace: '7:30/km', zone: 'Trote Contínuo Leve', note: 'Z2 - Construção aeróbica' },
  { speed: 8.5, pace: '7:03/km', zone: 'Leve Superior', note: 'Z2 - Ritmo de rodagem' },
  { speed: 9.0, pace: '6:40/km', zone: 'Moderado Base', note: 'Z3 - Ritmo constante' },
  { speed: 9.5, pace: '6:18/km', zone: 'Moderado Firme', note: 'Z3 - Limiar aeróbico' },
  { speed: 10.0, pace: '6:00/km', zone: 'Moderado Alto', note: 'Z3/Z4 - Ritmo de transição' },
  { speed: 10.5, pace: '5:43/km', zone: 'Sub-alvo TAF', note: 'Z4 - Próximo do alvo' },
  { speed: 11.0, pace: '5:27/km', zone: '🎯 RITMO-ALVO TAF (2.200 m em 12 min)', note: 'Z4/Z5 - Meta oficial' },
  { speed: 11.5, pace: '5:13/km', zone: 'Acima do Alvo TAF', note: 'Z5 - Tiros de segurança' },
  { speed: 12.0, pace: '5:00/km', zone: 'Fartlek Forte / Tiros', note: 'Z5 - Fartlek intenso' },
  { speed: 12.5, pace: '4:48/km', zone: 'Tiros Curtos 400m', note: 'Z5 - Potência anaeróbia' },
  { speed: 12.8, pace: '4:41/km', zone: 'Pico de Velocidade Esteira', note: 'Z5 - Velocidade máxima controlada' },
];

// ============================================================================
// ESTRUTURA DO PLANO: 38 SEMANAS EM 7 FASES
// REGRA DOS VIZINHOS: segunda (A) e quarta (B) são SEMPRE corridas contínuas.
// Todo trabalho intervalado (trote/caminhada, fartlek, tiros) e todos os
// simulados de 12 min acontecem SOMENTE no sábado (C).
// ============================================================================
const TOTAL_WEEKS = 38;

// Semanas de simulado de 12 min (sempre sábado) e a meta de distância de cada um (km)
const SIMULADO_META_KM: Record<number, number> = {
  1: 2.2, // teste inicial (14/11/2026)
  4: 2.2, 7: 2.2, 10: 2.2, 13: 2.2, 16: 2.2, 18: 2.2,
  21: 2.2, 24: 2.2,
  27: 2.25, 29: 2.25, 31: 2.25,
  33: 2.3, 35: 2.3
};

const PHASE_RANGES: Array<[number, number]> = [
  [1, 6], [7, 10], [11, 14], [15, 18], [19, 26], [27, 34], [35, 38]
];

const PHASE_NAMES = ['Base', 'Resistência', 'Ritmo-alvo', 'Específico', 'Construção', 'Superação', 'Pico e polimento'];

const pad2 = (n: number) => n.toString().padStart(2, '0');

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
}

function fmt(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Helpers de construção dos treinos
// ---------------------------------------------------------------------------
export const paceStr = (kmh: number): string => {
  if (!(kmh > 0)) return '--';
  const totalSec = Math.round(3600 / kmh);
  return `${Math.floor(totalSec / 60)}:${pad2(totalSec % 60)}/km`;
};

const metersFmt = (km: number) => `${Math.round(km * 1000).toLocaleString('pt-BR')} m`;

type DayKey = 'A' | 'B' | 'C';
const DAY_INFO: Record<DayKey, { n: number; name: string }> = {
  A: { n: 1, name: 'Segunda-feira' },
  B: { n: 3, name: 'Quarta-feira' },
  C: { n: 6, name: 'Sábado' }
};

interface BaseOpts {
  key: DayKey;
  title: string;
  type: RunType;
  dur: number;
  km: number;
  range: string;
  vMin: number;
  vMax: number;
  pace: string;
  label: TafWorkoutDef['intensityLabel'];
  desc: string;
  warmup?: string;
  cooldown?: string;
  intervals?: RunInterval[];
  sim?: boolean;
}

function wk(o: BaseOpts): TafWorkoutDef {
  return {
    key: o.key,
    title: o.title,
    dayOfWeek: DAY_INFO[o.key].n,
    dayName: DAY_INFO[o.key].name,
    type: o.type,
    suggestedDurationMinutes: o.dur,
    suggestedDistanceKm: o.km,
    suggestedSpeedRange: o.range,
    suggestedSpeedMin: o.vMin,
    suggestedSpeedMax: o.vMax,
    targetPaceFormatted: o.pace,
    intensityLabel: o.label,
    warmup: o.warmup ?? '5 min caminhando + 3 a 5 min de trote suave',
    cooldown: o.cooldown ?? '5 min de caminhada / volta à calma',
    incline: '1% de inclinação na esteira',
    description: o.desc,
    intervals: o.intervals,
    isTafSimulation: o.sim
  };
}

// Corrida contínua leve (segunda e quarta)
function leve(key: DayKey, min: number): TafWorkoutDef {
  return wk({
    key,
    title: `Corrida ${key}: Contínuo Leve ${min} min`,
    type: 'A leve/continuo',
    dur: min,
    km: Number((min * (7.6 / 60)).toFixed(2)),
    range: '7,0 a 8,5 km/h',
    vMin: 7.0,
    vMax: 8.5,
    pace: '7:03 a 8:34/km',
    label: 'Leve',
    desc: `Corrida contínua e confortável, sem tiros, por ${min} minutos. Mantenha a respiração estável.`
  });
}

// Corrida contínua moderada / ritmo firme (segunda)
function moderado(key: DayKey, min: number, vMin: number, vMax: number): TafWorkoutDef {
  const mid = (vMin + vMax) / 2;
  return wk({
    key,
    title: `Corrida ${key}: Contínuo Moderado ${min} min`,
    type: 'C moderado ou tiros',
    dur: min,
    km: Number((min * (mid / 60)).toFixed(2)),
    range: `${vMin.toString().replace('.', ',')} a ${vMax.toString().replace('.', ',')} km/h`,
    vMin,
    vMax,
    pace: `${paceStr(vMax).replace('/km', '')} a ${paceStr(vMin)}`,
    label: 'Moderado',
    desc: `Ritmo contínuo e sustentado por ${min} minutos a ${vMin.toString().replace('.', ',')} - ${vMax.toString().replace('.', ',')} km/h, sem tiros. Foco em cadência e respiração.`
  });
}

// Simulado / teste de 12 minutos (sábado)
function simulado(week: number): TafWorkoutDef {
  const meta = SIMULADO_META_KM[week];
  const metaKmh = Number((meta / (12 / 60)).toFixed(2));
  const isTest = week === 1;
  return wk({
    key: 'C',
    title: isTest ? 'Corrida C: 🏁 TESTE INICIAL 12 MIN (Linha de base)' : `Corrida C: 🏆 SIMULADO 12 MIN (Semana ${week})`,
    type: isTest ? 'Teste' : 'Simulado 12 min',
    dur: 12,
    km: meta,
    range: isTest ? 'Ritmo máximo sustentável (9,0 a 12,0 km/h)' : '11,0 a 12,5 km/h',
    vMin: isTest ? 9.0 : 11.0,
    vMax: 12.8,
    pace: isTest ? 'Ritmo sustentável' : `${paceStr(metaKmh)} ou mais rápido`,
    label: 'Simulado',
    desc: isTest
      ? 'TESTE INICIAL: corra 12 minutos no maior ritmo que conseguir sustentar e registre a distância. Ela é a linha de base para a progressão das metas dos próximos simulados. Meta final: 2.200 m.'
      : `SIMULADO DE 12 MINUTOS: corra no maior ritmo sustentável. Meta desta semana: ${metersFmt(meta)} (${metaKmh.toString().replace('.', ',')} km/h). Meta final da prova: 2.200 m, com margem até 2.300 m.`,
    warmup: '5 min caminhando + 5 min de trote progressivo + pequenos estirões',
    cooldown: '5 min de caminhada leve de volta à calma',
    sim: true
  });
}

// Trote/caminhada intervalado (sábado, fase 1)
function trote(jog: number, walk: number, reps: number): TafWorkoutDef {
  const intervals: RunInterval[] = [];
  for (let i = 1; i <= reps; i++) {
    intervals.push({
      id: `b-block-${i}`,
      order: i,
      label: `Bloco ${i}: ${jog}m trote / ${walk}m caminhada`,
      durationSeconds: (jog + walk) * 60,
      durationFormatted: `${jog + walk}:00`,
      speedKmh: 8.0,
      restSeconds: walk * 60,
      restType: 'caminhada',
      notes: `${jog} min trote (7,5 a 8,5 km/h) + ${walk} min caminhada (5,5 a 6,0 km/h)`
    });
  }
  return wk({
    key: 'C',
    title: `Corrida C: Trote-Caminhada (${jog} min trote / ${walk} min cam x${reps})`,
    type: 'B fartlek ou trote-caminhada',
    dur: (jog + walk) * reps,
    km: Number((reps * (jog * 8 + walk * 5.8) / 60).toFixed(1)),
    range: 'Trote 7,5 a 8,5 km/h | Cam 5,5 a 6,0 km/h',
    vMin: 7.5,
    vMax: 8.5,
    pace: '7:03 a 8:00/km (trote)',
    label: 'Leve',
    desc: `Sábado: ${reps} repetições de (${jog} minutos de trote a ~8 km/h + ${walk} minuto de caminhada recuperativa).`,
    intervals
  });
}

// Fartlek (sábado, fase 2): 1 min forte / 2 min leve x8
function fartlek(): TafWorkoutDef {
  const intervals: RunInterval[] = [];
  for (let i = 1; i <= 8; i++) {
    intervals.push({
      id: `fartlek-${i}`,
      order: i,
      label: `Fartlek ${i}: 1m forte / 2m leve`,
      durationSeconds: 180,
      durationFormatted: '3:00',
      speedKmh: 11.5,
      restSeconds: 120,
      restType: 'trote',
      notes: '1 min forte a 11,0-12,0 km/h + 2 min trote leve de recuperação a 8,0 km/h'
    });
  }
  return wk({
    key: 'C',
    title: 'Corrida C: Fartlek (1 min forte / 2 min leve x8)',
    type: 'B fartlek ou trote-caminhada',
    dur: 24,
    km: 3.7,
    range: 'Forte: 11 a 12 km/h | Leve: 8 km/h',
    vMin: 8.0,
    vMax: 12.0,
    pace: '5:00 a 5:27/km (nos blocos fortes)',
    label: 'Acima do alvo',
    desc: 'Sábado: 8 séries alternando 1 minuto na velocidade do TAF (11,0 a 12,0 km/h) com 2 minutos de trote regenerativo a 8 km/h.',
    warmup: '5 min caminhando + 3 a 5 min de trote progressivo',
    intervals
  });
}

// Gera a lista de tiros (usada pelo plano padrão e pelo editor do app)
export function buildIntervals(count: number, distM: number, kmh: number, restSec: number, restType: 'trote' | 'caminhada' | 'parado'): RunInterval[] {
  const intervals: RunInterval[] = [];
  if (!(kmh > 0) || !(distM > 0)) return intervals;
  const durSec = Math.round(distM / (kmh * 1000 / 3600));
  const durFmt = `${Math.floor(durSec / 60)}:${pad2(durSec % 60)}`;
  for (let i = 1; i <= count; i++) {
    intervals.push({
      id: `interval-${i}-${Date.now()}-${i}`,
      order: i,
      label: `Tiro ${i}`,
      distanceMeters: distM,
      speedKmh: kmh,
      durationSeconds: durSec,
      durationFormatted: durFmt,
      restSeconds: restSec,
      restType,
      notes: `${distM}m a ${kmh} km/h • Descanso ${restSec}s em ${restType}`
    });
  }
  return intervals;
}

// Tiros (sábado, fases 3 a 7)
function tiros(count: number, distM: number, kmh: number, restSec: number, restType: 'trote' | 'caminhada'): TafWorkoutDef {
  const intervals = buildIntervals(count, distM, kmh, restSec, restType);
  const durSec = Math.round(distM / (kmh * 1000 / 3600));
  const durFmt = `${Math.floor(durSec / 60)}:${pad2(durSec % 60)}`;
  const totalMin = Math.round((count * durSec + (count - 1) * restSec) / 60) + 4;
  const kmhText = kmh.toString().replace('.', ',');
  const onTarget = kmh <= 11.0;
  return wk({
    key: 'C',
    title: `Corrida C: ${count} Tiros de ${distM.toLocaleString('pt-BR')} m a ${kmhText} km/h`,
    type: 'C moderado ou tiros',
    dur: totalMin,
    km: Number((count * distM / 1000).toFixed(2)),
    range: `${kmhText} km/h`,
    vMin: kmh,
    vMax: kmh,
    pace: onTarget ? `${paceStr(kmh)} (Ritmo TAF)` : `${paceStr(kmh)} (acima do alvo)`,
    label: onTarget ? 'Ritmo-alvo' : 'Acima do alvo',
    desc: `Sábado: ${count} tiros de ${distM} m a ${kmhText} km/h (${durFmt.replace(':', ' min e ')} s por tiro), com ${restSec >= 120 ? Math.round(restSec / 60) + ' minutos' : restSec + ' segundos'} de descanso em ${restType}.`,
    intervals
  });
}

// ---------------------------------------------------------------------------
// Sessão do sábado (C) para uma semana, já respeitando simulados e fases
// ---------------------------------------------------------------------------
const TIROS_1000: Record<number, number> = { 15: 3, 19: 4, 20: 4, 22: 5, 23: 5, 25: 5, 26: 4 };

function saturday(w: number): TafWorkoutDef {
  if (SIMULADO_META_KM[w]) return simulado(w);

  if (w <= 6) {
    const p = w - 1; // semanas 2..6 => p 1..5
    return p <= 2 ? trote(2, 1, 8) : trote(3, 1, 6);
  }
  if (w <= 10) return fartlek();
  if (w <= 14) {
    if (w === 11) return tiros(5, 400, 11.0, 90, 'trote');
    if (w === 12) return tiros(4, 800, 11.0, 120, 'caminhada');
    return tiros(6, 400, 11.0, 90, 'trote'); // semana 14
  }
  if (w <= 18) {
    if (w === 15) return tiros(3, 1000, 11.0, 180, 'caminhada');
    return tiros(4, 800, 11.0, 120, 'caminhada'); // semana 17
  }
  if (w <= 26) return tiros(TIROS_1000[w], 1000, 11.0, 180, 'caminhada');
  if (w <= 34) {
    if (w === 28) return tiros(6, 400, 12.0, 90, 'trote');
    if (w === 30) return tiros(4, 800, 11.5, 120, 'caminhada');
    if (w === 32) return tiros(3, 1000, 11.5, 180, 'caminhada');
    return tiros(5, 400, 12.0, 90, 'trote'); // semana 34
  }
  // Fase 7
  if (w === 36) return tiros(4, 400, 11.5, 90, 'trote');
  if (w === 37) {
    return wk({
      key: 'C',
      title: 'Corrida C: Simulado Curto 6 min (opcional)',
      type: 'C moderado ou tiros',
      dur: 6,
      km: 1.15,
      range: '11,5 km/h',
      vMin: 11.5,
      vMax: 11.5,
      pace: `${paceStr(11.5)}`,
      label: 'Ritmo-alvo',
      desc: 'Polimento: 6 minutos a 11,5 km/h só para manter o ritmo vivo. Opcional. Se estiver cansado, faça só 15 min leves.'
    });
  }
  // Semana 38: prova (data provisória)
  return wk({
    key: 'C',
    title: 'Sábado: 🎯 PROVA DO TAF (data provisória)',
    type: 'Simulado 12 min',
    dur: 12,
    km: 2.3,
    range: '11,0 a 12,5 km/h',
    vMin: 11.0,
    vMax: 12.8,
    pace: '5:27/km ou mais rápido',
    label: 'Simulado',
    desc: 'Dia da prova: 2.200 m em 12 minutos. A data de 31/07/2027 é provisória; se for outra, ajuste TAF_EXAM_DATE em src/lib/tafPlanData.ts. Dormir bem, hidratar e comer leve.',
    sim: true
  });
}

// ---------------------------------------------------------------------------
// Segunda (A) e quarta (B): SEMPRE contínuas
// ---------------------------------------------------------------------------
function monday(w: number): TafWorkoutDef {
  if (w === 1) {
    return wk({
      key: 'A',
      title: 'Corrida A: Caminhada Rápida 25 min',
      type: 'A leve/continuo',
      dur: 25,
      km: 2.3,
      range: '5,5 a 6,5 km/h',
      vMin: 5.5,
      vMax: 6.5,
      pace: '9:14 a 10:55/km',
      label: 'Leve',
      desc: 'Semana de adaptação. A esteira chega em 10/11: se ainda não chegou, faça uma caminhada rápida na rua por 25 minutos.',
      warmup: '5 min de caminhada leve',
      cooldown: '5 min de caminhada leve'
    });
  }
  if (w <= 6) return leve('A', w - 1 <= 2 ? 20 : 25);
  if (w <= 10) return moderado('A', 30, 9.0, 10.0);
  if (w <= 14) return moderado('A', w <= 12 ? 25 : 30, 9.5, 10.5);
  if (w <= 18) return moderado('A', 30, 9.5, 10.0);
  if (w <= 22) return moderado('A', 30, 10.0, 10.5);
  if (w <= 34) return moderado('A', 35, 10.0, 10.5);
  if (w === 35) return moderado('A', 25, 9.5, 10.0);
  if (w === 36) return leve('A', 20);
  return leve('A', 15); // semanas 37 e 38
}

function wednesday(w: number): TafWorkoutDef {
  if (w === 1) return leve('B', 15);
  if (w <= 6) return leve('B', w - 1 <= 2 ? 20 : 25);
  if (w <= 10) return leve('B', 35);
  if (w <= 14) return leve('B', 30);
  if (w <= 18) return leve('B', 20);
  if (w <= 22) return leve('B', 30);
  if (w <= 34) return leve('B', w <= 26 ? 35 : 30);
  if (w === 35) return leve('B', 25);
  if (w === 36) return leve('B', 20);
  if (w === 37) return leve('B', 15);
  return leve('B', 10); // semana 38 (prova no sábado)
}

// ---------------------------------------------------------------------------
// Geração das 38 semanas
// ---------------------------------------------------------------------------
const PHASE_GOALS = [
  'Semana 1 de adaptação e teste inicial; depois base aeróbica e adaptação musculoarticular sem sobrecarga mecânica.',
  'Expansão do limiar anaeróbio e resistência à fadiga: contínuas moderadas e fartlek aos sábados.',
  'Familiarização com a velocidade da prova, 11 km/h (5:27/km), com tiros de 400 m e 800 m aos sábados.',
  'Tiros de 1000 m e simulados de 12 min aos sábados, com meta de chegar aos 2.200 m.',
  'Tiros longos e simulado a cada 3 semanas para consolidar os 2.200 m com folga.',
  'Simulado a cada 2 semanas e tiros acima do alvo, buscando 2.250 a 2.300 m.',
  'Último simulado completo, corte de volume e polimento para a prova.'
];

export function buildDefaultWeeks(): TafWeekDef[] {
  const weeks: TafWeekDef[] = [];
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const phaseIdx = PHASE_RANGES.findIndex(([a, b]) => w >= a && w <= b);
    weeks.push({
      weekNumber: w,
      phaseNumber: phaseIdx + 1,
      phaseName: PHASE_NAMES[phaseIdx],
      phaseGoals: PHASE_GOALS[phaseIdx],
      startDate: '',
      endDate: '',
      workouts: { A: monday(w), B: wednesday(w), C: saturday(w) }
    });
  }
  return weeks;
}

export const DEFAULT_TAF_GOAL: RunGoal = {
  name: 'TAF Polícia Civil',
  distanceMeters: TAF_TARGET_METERS,
  minutes: TAF_TARGET_MINUTES,
  examDate: TAF_EXAM_DATE
};

export function buildDefaultTafPlan(): RunPlanConfig {
  return normalizePlan({
    name: 'Plano TAF: corrida de 12 min',
    goal: { ...DEFAULT_TAF_GOAL },
    startDate: TAF_PLAN_START_DATE,
    weeks: buildDefaultWeeks(),
    updatedAt: 0
  });
}

// ---------------------------------------------------------------------------
// Plano novo (modelo simples) para uma meta qualquer. Depois é só editar no app.
// ---------------------------------------------------------------------------
export function buildStarterPlan(goal: RunGoal, startDate: string, totalWeeks: number): RunPlanConfig {
  const n = Math.max(1, Math.min(60, Math.round(totalWeeks)));
  const weeks: TafWeekDef[] = [];
  const baseMin = Math.max(15, Math.round(goal.minutes * 0.6));
  const goalKmh = goalSpeedKmh(goal) || 8;
  // Corridas de base: de 62% a 78% da velocidade da meta
  const lo = Math.max(4, Math.round(goalKmh * 0.62 * 2) / 2);
  const hi = Math.max(lo + 0.5, Math.round(goalKmh * 0.78 * 2) / 2);
  const txt = (v: number) => String(v).replace('.', ',');
  const mk = (key: DayKey, dur: number, label: string): TafWorkoutDef => ({
    ...leve(key, dur),
    title: `Corrida ${key}: ${label} ${dur} min`,
    suggestedSpeedMin: lo,
    suggestedSpeedMax: hi,
    suggestedSpeedRange: `${txt(lo)} a ${txt(hi)} km/h`,
    targetPaceFormatted: `${paceStr(hi).replace('/km', '')} a ${paceStr(lo)}`,
    suggestedDistanceKm: Number(((dur * (lo + hi)) / 2 / 60).toFixed(2))
  });
  const sim = (): TafWorkoutDef => ({
    ...mk('C', goal.minutes, 'Simulado'),
    title: `Corrida C: 🏆 SIMULADO ${goal.minutes} MIN`,
    type: 'Simulado 12 min',
    isTafSimulation: true,
    intensityLabel: 'Simulado',
    suggestedDurationMinutes: goal.minutes,
    suggestedDistanceKm: goal.distanceMeters / 1000,
    suggestedSpeedMin: Number(goalKmh.toFixed(1)),
    suggestedSpeedMax: Number((goalKmh * 1.1).toFixed(1)),
    suggestedSpeedRange: `${txt(Number(goalKmh.toFixed(1)))} km/h ou mais`,
    targetPaceFormatted: `${paceStr(goalKmh)} ou mais rápido`,
    warmup: '5 min caminhando + 5 min de trote progressivo + pequenos estirões',
    description: `Simulado da meta: ${metersLabel(goal.distanceMeters)} em ${goal.minutes} minutos. Corra no maior ritmo sustentável.`
  });
  for (let w = 1; w <= n; w++) {
    const grow = Math.min(15, Math.floor((w - 1) / 2) * 2);
    const phaseName = w <= Math.ceil(n * 0.5) ? 'Base' : w <= Math.ceil(n * 0.85) ? 'Construção' : 'Pico';
    weeks.push({
      weekNumber: w,
      phaseNumber: 1,
      phaseName,
      phaseGoals: 'Descreva o objetivo desta fase.',
      startDate: '',
      endDate: '',
      workouts: {
        A: mk('A', baseMin + grow, 'Contínuo'),
        B: mk('B', baseMin + grow + 5, 'Contínuo'),
        C: w === n || (w % 4 === 0 && w < n - 1) ? sim() : mk('C', baseMin + grow + 10, 'Longo')
      }
    });
  }
  return normalizePlan({ name: `Plano: ${goal.name}`, goal, startDate, weeks, updatedAt: Date.now() });
}

// ---------------------------------------------------------------------------
// Utilitários de plano
// ---------------------------------------------------------------------------
export const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export const isoDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Move qualquer data para a segunda-feira da mesma semana. */
export function snapToMonday(iso: string): string {
  const d = parseIso(iso);
  const back = (d.getDay() + 6) % 7;
  return isoDate(addDays(d, -back));
}

export function goalSpeedKmh(goal: RunGoal): number {
  if (!goal.minutes || !goal.distanceMeters) return 0;
  return goal.distanceMeters / 1000 / (goal.minutes / 60);
}

export function goalPaceStr(goal: RunGoal): string {
  const v = goalSpeedKmh(goal);
  return v > 0 ? paceStr(v) : '--';
}

export const metersLabel = (m: number) => `${Math.round(m).toLocaleString('pt-BR')} m`;

/** Data (YYYY-MM-DD) em que o treino de um dia da semana cai dentro da semana N. */
export function workoutDateIso(plan: RunPlanConfig, weekNumber: number, dayOfWeek: number): string {
  const start = parseIso(plan.startDate);
  return isoDate(addDays(start, (weekNumber - 1) * 7 + ((dayOfWeek + 6) % 7)));
}

export function buildPreTest(goal: RunGoal): TafWorkoutDef {
  const v = goalSpeedKmh(goal);
  return {
    ...TAF_PRE_TEST_WORKOUT,
    title: `Teste Inicial de ${goal.minutes} Minutos (Esteira)`,
    suggestedDurationMinutes: goal.minutes,
    suggestedDistanceKm: goal.distanceMeters / 1000,
    suggestedSpeedRange: `${v.toFixed(1).replace('.', ',')} km/h (${paceStr(v)})`,
    suggestedSpeedMin: Number(v.toFixed(1)),
    suggestedSpeedMax: Number(v.toFixed(1)),
    targetPaceFormatted: paceStr(v),
    description: `Teste diagnóstico de ${goal.minutes} minutos para calibrar seu ritmo e registrar sua distância atual.`
  };
}

/** Recalcula números/datas das semanas e agrupa fases consecutivas de mesmo nome. */
export function normalizePlan(plan: RunPlanConfig): RunPlanConfig {
  const start = parseIso(snapToMonday(plan.startDate));
  let phaseNo = 0;
  let lastName: string | null = null;
  const weeks = plan.weeks.map((wk, i) => {
    if (wk.phaseName !== lastName) {
      phaseNo++;
      lastName = wk.phaseName;
    }
    const ws = addDays(start, i * 7);
    const fix = (k: DayKey): TafWorkoutDef => {
      const w = wk.workouts[k];
      return { ...w, key: k, dayName: DAY_NAMES[w.dayOfWeek] ?? w.dayName };
    };
    return {
      ...wk,
      weekNumber: i + 1,
      phaseNumber: phaseNo,
      startDate: fmt(ws),
      endDate: fmt(addDays(ws, 6)),
      workouts: { A: fix('A'), B: fix('B'), C: fix('C') }
    };
  });
  return { ...plan, startDate: isoDate(start), weeks };
}

const PHASE_COLORS = [
  { color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400', accent: 'text-blue-400' },
  { color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400', accent: 'text-emerald-400' },
  { color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400', accent: 'text-amber-400' },
  { color: 'from-violet-500/20 to-indigo-500/10 border-violet-500/30 text-violet-400', accent: 'text-violet-400' },
  { color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400', accent: 'text-rose-400' },
  { color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-400', accent: 'text-sky-400' }
];

export interface PhaseInfo {
  phase: number;
  name: string;
  weeks: string;
  goal: string;
  intensity: string;
  color: string;
  accent: string;
}

export function derivePhases(plan: RunPlanConfig): PhaseInfo[] {
  const out: PhaseInfo[] = [];
  plan.weeks.forEach((wk) => {
    const last = out[out.length - 1];
    if (!last || last.phase !== wk.phaseNumber) {
      const c = PHASE_COLORS[(wk.phaseNumber - 1) % PHASE_COLORS.length];
      out.push({
        phase: wk.phaseNumber,
        name: wk.phaseName,
        weeks: '',
        goal: wk.phaseGoals,
        intensity: '',
        color: c.color,
        accent: c.accent
      });
    }
    const cur = out[out.length - 1];
    const group = plan.weeks.filter(x => x.phaseNumber === wk.phaseNumber);
    cur.weeks = group.length === 1
      ? `Semana ${group[0].weekNumber}`
      : `Semanas ${group[0].weekNumber} a ${group[group.length - 1].weekNumber}`;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Plano ativo (editável): padrão TAF até o usuário salvar o próprio plano
// ---------------------------------------------------------------------------
const PLAN_STORAGE_KEY = 'hevyfit_run_plan';

function loadStoredPlan(): RunPlanConfig | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PLAN_STORAGE_KEY) : null;
    if (!raw) return null;
    const p = JSON.parse(raw) as RunPlanConfig;
    return p && Array.isArray(p.weeks) && p.weeks.length > 0 && p.goal ? normalizePlan(p) : null;
  } catch {
    return null;
  }
}

let activePlan: RunPlanConfig = loadStoredPlan() ?? buildDefaultTafPlan();
const listeners = new Set<() => void>();

export function setActivePlan(plan: RunPlanConfig | null) {
  const valid = !!plan && Array.isArray(plan.weeks) && plan.weeks.length > 0 && !!plan.goal;
  activePlan = valid ? normalizePlan(plan as RunPlanConfig) : buildDefaultTafPlan();
  try {
    if (valid) localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(activePlan));
    else localStorage.removeItem(PLAN_STORAGE_KEY);
  } catch {
    /* sem armazenamento local: segue só em memória */
  }
  listeners.forEach(l => l());
}

export function getActivePlan(): RunPlanConfig {
  return activePlan;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Hook: devolve o plano ativo e re-renderiza quando ele muda. */
export function useActivePlan(): RunPlanConfig {
  return useSyncExternalStore(subscribe, getActivePlan, getActivePlan);
}

const runnable = (week: TafWeekDef): TafWorkoutDef[] =>
  [week.workouts.A, week.workouts.B, week.workouts.C]
    .filter(w => w.suggestedDurationMinutes > 0)
    .sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7));

/**
 * Calcula o status do plano: semana atual, fase e contagem regressiva.
 */
export function getTafCurrentStatus(currentDate = new Date(), plan: RunPlanConfig = activePlan) {
  const total = plan.weeks.length;
  const startDate = parseIso(plan.startDate);
  const lastWeekEnd = addDays(startDate, total * 7 - 1);
  const examDate = plan.goal.examDate ? parseIso(plan.goal.examDate) : lastWeekEnd;
  const examEnd = new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate(), 23, 59, 59, 999);

  const todayMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0, 0);
  const now = todayMidnight.getTime();
  const DAY_MS = 1000 * 60 * 60 * 24;

  const isBeforeStart = now < startDate.getTime();
  const isAfterEnd = now > Math.max(examEnd.getTime(), lastWeekEnd.getTime() + DAY_MS - 1);

  const daysUntilStart = Math.max(0, Math.ceil((startDate.getTime() - now) / DAY_MS));
  const daysUntilTaf = Math.max(0, Math.ceil((examDate.getTime() - now) / DAY_MS));

  let currentWeekNumber = 1;
  let progressPercent = 0;

  if (isBeforeStart) {
    currentWeekNumber = 0;
  } else if (isAfterEnd) {
    currentWeekNumber = total;
    progressPercent = 100;
  } else {
    const diffDays = Math.floor((now - startDate.getTime()) / DAY_MS);
    currentWeekNumber = Math.min(total, Math.max(1, Math.floor(diffDays / 7) + 1));
    progressPercent = Math.min(100, Math.round((currentWeekNumber / total) * 100));
  }

  const displayWeekNumber = currentWeekNumber > 0 ? currentWeekNumber : 1;
  const currentWeek = plan.weeks.find(w => w.weekNumber === displayWeekNumber) || plan.weeks[0];
  const phases = derivePhases(plan);

  return {
    isBeforeStart,
    isAfterEnd,
    currentWeekNumber, // 0 antes do início, 1..N durante o plano
    displayWeekNumber,
    totalWeeks: total,
    currentWeek,
    progressPercent,
    daysUntilTaf,
    daysUntilStart,
    startDateFormatted: fmt(startDate),
    examDateFormatted: fmt(examDate),
    phaseNumber: currentWeek.phaseNumber,
    phaseName: currentWeek.phaseName,
    phaseGoals: currentWeek.phaseGoals,
    phaseInfo: phases.find(p => p.phase === currentWeek.phaseNumber) || phases[0]
  };
}

/**
 * Retorna o treino de hoje (pelo dia da semana de cada treino) e o próximo treino.
 */
export function getTodayTafWorkout(currentDate = new Date(), plan: RunPlanConfig = activePlan) {
  const status = getTafCurrentStatus(currentDate, plan);
  const dayOfWeek = currentDate.getDay();
  const week = status.currentWeek;

  if (status.isBeforeStart) {
    const first = runnable(plan.weeks[0])[0] || plan.weeks[0].workouts.A;
    const firstDate = addDays(parseIso(plan.startDate), (first.dayOfWeek + 6) % 7);
    return {
      isRunDay: false,
      isBeforeStart: true,
      todayWorkout: null as TafWorkoutDef | null,
      nextWorkout: {
        workout: first,
        dayText: `${DAY_NAMES[first.dayOfWeek]} (${fmt(firstDate)})`
      },
      dayOfWeek,
      status
    };
  }

  const todayWorkout: TafWorkoutDef | null = status.isAfterEnd
    ? null
    : runnable(week).find(w => w.dayOfWeek === dayOfWeek) || null;

  let nextWorkout: { workout: TafWorkoutDef; dayText: string } | null = null;
  for (let i = 1; i <= 21 && !nextWorkout; i++) {
    const d = addDays(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()), i);
    const s = getTafCurrentStatus(d, plan);
    if (s.isBeforeStart || s.isAfterEnd) continue;
    const wo = runnable(s.currentWeek).find(w => w.dayOfWeek === d.getDay());
    if (wo) nextWorkout = { workout: wo, dayText: i === 1 ? 'Amanhã' : DAY_NAMES[d.getDay()] };
  }

  return {
    isRunDay: todayWorkout !== null,
    isBeforeStart: false,
    todayWorkout,
    nextWorkout,
    dayOfWeek,
    status
  };
}
