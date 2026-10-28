import { TafWeekDef, TafWorkoutDef, RunType, RunInterval } from '../types';

// ============================================================================
// CONSTANTES DE DATAS DO PLANO TAF (FÁCIL EDIÇÃO)
// ============================================================================
// 1. Data de início oficial do plano de 17 semanas (Semana 1):
//    A esteira chega em 10/11/2026, início oficial na segunda-feira 16/11/2026.
export const TAF_PLAN_START_DATE = '2026-11-16';

// 2. Data oficial da prova do TAF (permite ajuste posterior independente):
//    Por enquanto definido para 14/03/2027 (último dia do plano de 17 semanas).
export const TAF_EXAM_DATE = '2027-03-14';

// Aliases para compatibilidade
export const TAF_START_DATE_STR = TAF_PLAN_START_DATE;
export const TAF_END_DATE_STR = TAF_EXAM_DATE;

export const TAF_TARGET_METERS = 2200;          // 2200 metros
export const TAF_TARGET_MINUTES = 12;           // 12 minutos
export const TAF_TARGET_SPEED_KMH = 11.0;       // 11 km/h
export const TAF_TARGET_PACE_STR = '5:27/km';   // 5:27 min/km

// Treino de teste diagnóstico para o período de pré-início (hoje até 15/11/2026)
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

export const TAF_PHASES_INFO = [
  {
    phase: 1,
    name: 'Base Aeróbica',
    weeks: 'Semanas 1 a 5 (16/11/2026 - 20/12/2026)',
    goal: 'Construção de resistência cardiovascular, adaptação musculoarticular e fortalecimento sem impacto excessivo.',
    intensity: 'Leve (7 a 8,5 km/h)',
    color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400',
    accent: 'text-blue-400'
  },
  {
    phase: 2,
    name: 'Resistência & Variação',
    weeks: 'Semanas 6 a 9 (21/12/2026 - 17/01/2027)',
    goal: 'Elevação do limiar anaeróbio, tolerância ao lactato com fartleks e ganho de capacidade com ritmo moderado.',
    intensity: 'Moderado (9 a 10 km/h) e Fartlek (11-12 km/h / 8 km/h)',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    accent: 'text-emerald-400'
  },
  {
    phase: 3,
    name: 'Ritmo-Alvo TAF',
    weeks: 'Semanas 10 a 13 (18/01/2027 - 14/02/2027)',
    goal: 'Adaptação neuromuscular estrita aos 11 km/h (5:27/km) através de intervalos de 400m e 800m com recuperação ativa.',
    intensity: 'Ritmo-alvo (11 km/h = 5:27/km)',
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400',
    accent: 'text-amber-400'
  },
  {
    phase: 4,
    name: 'Específico, Simulados e Pico',
    weeks: 'Semanas 14 a 17 (15/02/2027 - 14/03/2027)',
    goal: 'Tiros longos de 1000m, simulados reais de 12 minutos atingindo ou superando os 2.200m e semana 17 de polimento (taper).',
    intensity: 'Ritmo-alvo & Simulados (11 a 12,8 km/h)',
    color: 'from-lime-500/20 to-emerald-500/10 border-lime-500/30 text-lime-400',
    accent: 'text-lime-400'
  }
];

// Helper to generate intervals for interval sessions
function makeIntervals(count: number, distanceM: number, speedKmh: number, restSeconds: number, restType: 'trote' | 'caminhada' | 'parado' = 'trote'): RunInterval[] {
  const intervals: RunInterval[] = [];
  const durationSeconds = Math.round((distanceM / (speedKmh * 1000 / 3600)));
  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const durationFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  for (let i = 1; i <= count; i++) {
    intervals.push({
      id: `interval-${i}-${Date.now()}`,
      order: i,
      label: `Tiro ${i}`,
      distanceMeters: distanceM,
      speedKmh,
      durationSeconds,
      durationFormatted,
      restSeconds,
      restType,
      notes: `${distanceM}m a ${speedKmh} km/h • Descanso ${restSeconds}s em ${restType}`
    });
  }
  return intervals;
}

// Generate the 17 weeks
export function generate17WeeksTafPlan(): TafWeekDef[] {
  const weeks: TafWeekDef[] = [];
  const [sYear, sMonth, sDay] = TAF_PLAN_START_DATE.split('-').map(Number);
  const startDate = new Date(sYear, sMonth - 1, sDay, 0, 0, 0);

  const pad = (n: number) => n.toString().padStart(2, '0');

  for (let w = 1; w <= 17; w++) {
    const weekStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + (w - 1) * 7);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);

    const startStr = `${pad(weekStart.getDate())}/${pad(weekStart.getMonth() + 1)}/${weekStart.getFullYear()}`;
    const endStr = `${pad(weekEnd.getDate())}/${pad(weekEnd.getMonth() + 1)}/${weekEnd.getFullYear()}`;

    let phaseNumber: 1 | 2 | 3 | 4 = 1;
    let phaseName: 'Base' | 'Resistência' | 'Ritmo-alvo' | 'Específico e pico' = 'Base';
    let phaseGoals = '';

    if (w <= 5) {
      phaseNumber = 1;
      phaseName = 'Base';
      phaseGoals = 'Construção de base aeróbica e adaptação musculoarticular sem sobrecarga mecânica.';
    } else if (w <= 9) {
      phaseNumber = 2;
      phaseName = 'Resistência';
      phaseGoals = 'Expansão do limiar anaeróbio, tolerância a acidose e resistência à fadiga.';
    } else if (w <= 13) {
      phaseNumber = 3;
      phaseName = 'Ritmo-alvo';
      phaseGoals = 'Familiarização neuromotora com a velocidade da prova: 11 km/h (5:27/km).';
    } else {
      phaseNumber = 4;
      phaseName = 'Específico e pico';
      phaseGoals = 'Tiros de 1.000m, simulados oficiais de 12 min (meta 2.200m) e polimento (taper).';
    }

    let workoutA: TafWorkoutDef;
    let workoutB: TafWorkoutDef;
    let workoutC: TafWorkoutDef;

    // FASE 1 (Semanas 1 a 5)
    if (w <= 5) {
      const durA = w <= 2 ? 20 : 25;
      workoutA = {
        key: 'A',
        title: `Corrida A: Contínuo Leve ${durA} min`,
        dayOfWeek: 1,
        dayName: 'Segunda-feira',
        type: 'A leve/continuo',
        suggestedDurationMinutes: durA,
        suggestedDistanceKm: Number((durA * (7.5 / 60)).toFixed(2)),
        suggestedSpeedRange: '7,0 a 8,5 km/h',
        suggestedSpeedMin: 7.0,
        suggestedSpeedMax: 8.5,
        targetPaceFormatted: '7:03 a 8:34/km',
        intensityLabel: 'Leve',
        warmup: '5 min caminhando + 3 a 5 min de trote suave',
        cooldown: '5 min de caminhada / volta à calma',
        incline: '1% de inclinação na esteira',
        description: `Corrida contínua e confortável em ritmo regenerativo e base. Mantenha a respiração estável durante todos os ${durA} minutos.`
      };

      if (w <= 2) {
        // Trote 2 min / caminhada 1 min x8 (total 24 min)
        const bIntervals: RunInterval[] = [];
        for (let i = 1; i <= 8; i++) {
          bIntervals.push({
            id: `b-block-${i}`,
            order: i,
            label: `Bloco ${i}: 2m trote / 1m caminhada`,
            durationSeconds: 180,
            durationFormatted: '3:00',
            speedKmh: 8.0,
            restSeconds: 60,
            restType: 'caminhada',
            notes: '2 min trote (7,5 a 8,5 km/h) + 1 min caminhada (5,5 a 6,0 km/h)'
          });
        }
        workoutB = {
          key: 'B',
          title: 'Corrida B: Trote-Caminhada (2 min trote / 1 min cam x8)',
          dayOfWeek: 3,
          dayName: 'Quarta-feira',
          type: 'B fartlek ou trote-caminhada',
          suggestedDurationMinutes: 24,
          suggestedDistanceKm: 2.8,
          suggestedSpeedRange: 'Trote 7,5 a 8,5 km/h | Cam 5,5 a 6,0 km/h',
          suggestedSpeedMin: 7.5,
          suggestedSpeedMax: 8.5,
          targetPaceFormatted: '7:03 a 8:00/km (trote)',
          intensityLabel: 'Leve',
          warmup: '5 min caminhando + 3 min de trote leve',
          cooldown: '5 min de caminhada / volta à calma',
          incline: '1% de inclinação na esteira',
          description: 'Alternância controlada de trote e caminhada: 8 repetições de (2 minutos de trote a ~8 km/h + 1 minuto de caminhada recuperativa).',
          intervals: bIntervals
        };
      } else {
        // Trote 3 min / caminhada 1 min x6 (total 24 min)
        const bIntervals: RunInterval[] = [];
        for (let i = 1; i <= 6; i++) {
          bIntervals.push({
            id: `b-block-${i}`,
            order: i,
            label: `Bloco ${i}: 3m trote / 1m caminhada`,
            durationSeconds: 240,
            durationFormatted: '4:00',
            speedKmh: 8.0,
            restSeconds: 60,
            restType: 'caminhada',
            notes: '3 min trote (7,5 a 8,5 km/h) + 1 min caminhada (5,5 a 6,0 km/h)'
          });
        }
        workoutB = {
          key: 'B',
          title: 'Corrida B: Trote-Caminhada (3 min trote / 1 min cam x6)',
          dayOfWeek: 3,
          dayName: 'Quarta-feira',
          type: 'B fartlek ou trote-caminhada',
          suggestedDurationMinutes: 24,
          suggestedDistanceKm: 3.0,
          suggestedSpeedRange: 'Trote 7,5 a 8,5 km/h | Cam 5,5 a 6,0 km/h',
          suggestedSpeedMin: 7.5,
          suggestedSpeedMax: 8.5,
          targetPaceFormatted: '7:03 a 8:00/km (trote)',
          intensityLabel: 'Leve',
          warmup: '5 min caminhando + 3 a 5 min de trote leve',
          cooldown: '5 min de caminhada / volta à calma',
          incline: '1% de inclinação na esteira',
          description: 'Evolução da base: 6 repetições de (3 minutos de trote contínuo a 8 km/h + 1 minuto de caminhada para estabilização cardíaca).',
          intervals: bIntervals
        };
      }

      const durC = w <= 2 ? 25 : 30;
      workoutC = {
        key: 'C',
        title: `Corrida C: Contínuo Leve ${durC} min`,
        dayOfWeek: 6,
        dayName: 'Sábado',
        type: 'A leve/continuo',
        suggestedDurationMinutes: durC,
        suggestedDistanceKm: Number((durC * (7.8 / 60)).toFixed(2)),
        suggestedSpeedRange: '7,0 a 8,5 km/h',
        suggestedSpeedMin: 7.0,
        suggestedSpeedMax: 8.5,
        targetPaceFormatted: '7:03 a 8:34/km',
        intensityLabel: 'Leve',
        warmup: '5 min caminhando + 3 a 5 min de trote',
        cooldown: '5 min de caminhada / volta à calma',
        incline: '1% de inclinação na esteira',
        description: `Longão de base da semana. Corrida contínua sem interrupções por ${durC} minutos em ritmo confortável.`
      };
    }

    // FASE 2 (Semanas 6 a 9)
    else if (w <= 9) {
      workoutA = {
        key: 'A',
        title: 'Corrida A: Contínuo Moderado 30 min',
        dayOfWeek: 1,
        dayName: 'Segunda-feira',
        type: 'C moderado ou tiros',
        suggestedDurationMinutes: 30,
        suggestedDistanceKm: 4.6,
        suggestedSpeedRange: '9,0 a 10,0 km/h',
        suggestedSpeedMin: 9.0,
        suggestedSpeedMax: 10.0,
        targetPaceFormatted: '6:00 a 6:40/km',
        intensityLabel: 'Moderado',
        warmup: '5 min caminhando + 3 a 5 min de trote',
        cooldown: '5 min de caminhada / volta à calma',
        incline: '1% de inclinação na esteira',
        description: 'Treino de ritmo moderado e sustentado por 30 minutos constantes a 9,0 - 10,0 km/h. Exige foco na cadência e controle respiratório.'
      };

      // Fartlek 1 min forte (11 a 12 km/h) / 2 min leve (8 km/h) x8 (total 24 min)
      const fartlekIntervals: RunInterval[] = [];
      for (let i = 1; i <= 8; i++) {
        fartlekIntervals.push({
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

      workoutB = {
        key: 'B',
        title: 'Corrida B: Fartlek (1 min forte / 2 min leve x8)',
        dayOfWeek: 3,
        dayName: 'Quarta-feira',
        type: 'B fartlek ou trote-caminhada',
        suggestedDurationMinutes: 24,
        suggestedDistanceKm: 3.7,
        suggestedSpeedRange: 'Forte: 11 a 12 km/h | Leve: 8 km/h',
        suggestedSpeedMin: 8.0,
        suggestedSpeedMax: 12.0,
        targetPaceFormatted: '5:00 a 5:27/km (nos blocos fortes)',
        intensityLabel: 'Acima do alvo',
        warmup: '5 min caminhando + 3 a 5 min de trote progressivo',
        cooldown: '5 min de caminhada / volta à calma',
        incline: '1% de inclinação na esteira',
        description: 'Variação dinâmica de ritmo: 8 séries alternando 1 minuto em velocidade do TAF (11,0 a 12,0 km/h) com 2 minutos em trote regenerativo a 8 km/h.',
        intervals: fartlekIntervals
      };

      workoutC = {
        key: 'C',
        title: 'Corrida C: Contínuo Leve 35 min',
        dayOfWeek: 6,
        dayName: 'Sábado',
        type: 'A leve/continuo',
        suggestedDurationMinutes: 35,
        suggestedDistanceKm: 4.8,
        suggestedSpeedRange: '7,5 a 8,5 km/h',
        suggestedSpeedMin: 7.5,
        suggestedSpeedMax: 8.5,
        targetPaceFormatted: '7:03 a 8:00/km',
        intensityLabel: 'Leve',
        warmup: '5 min caminhando + 3 a 5 min de trote',
        cooldown: '5 min de caminhada / volta à calma',
        incline: '1% de inclinação na esteira',
        description: 'Longão de resistência da semana: 35 minutos contínuos na esteira para consolidar volume aeróbico e recuperação muscular.'
      };
    }

    // FASE 3 (Semanas 10 a 13)
    else if (w <= 13) {
      const tiros400Count = w <= 11 ? 5 : 6;
      const tiros400Intervals = makeIntervals(tiros400Count, 400, 11.0, 90, 'trote');

      workoutA = {
        key: 'A',
        title: `Corrida A: ${tiros400Count} Tiros de 400 m a 11 km/h`,
        dayOfWeek: 1,
        dayName: 'Segunda-feira',
        type: 'C moderado ou tiros',
        suggestedDurationMinutes: tiros400Count * 4,
        suggestedDistanceKm: Number((tiros400Count * 0.4).toFixed(2)),
        suggestedSpeedRange: '11,0 km/h cravado',
        suggestedSpeedMin: 11.0,
        suggestedSpeedMax: 11.0,
        targetPaceFormatted: '5:27/km (Ritmo TAF)',
        intensityLabel: 'Ritmo-alvo',
        warmup: '5 min caminhando + 3 a 5 min de trote progressivo',
        cooldown: '5 min de caminhada / volta à calma',
        incline: '1% de inclinação na esteira',
        description: `${tiros400Count} repetições de 400 metros na velocidade exata do TAF (11,0 km/h = 2 min e 11 s por tiro). Intervalo de 90 segundos em trote leve entre cada tiro.`,
        intervals: tiros400Intervals
      };

      workoutB = {
        key: 'B',
        title: 'Corrida B: Contínuo Leve 30 min',
        dayOfWeek: 3,
        dayName: 'Quarta-feira',
        type: 'A leve/continuo',
        suggestedDurationMinutes: 30,
        suggestedDistanceKm: 4.0,
        suggestedSpeedRange: '7,5 a 8,5 km/h',
        suggestedSpeedMin: 7.5,
        suggestedSpeedMax: 8.5,
        targetPaceFormatted: '7:03 a 8:00/km',
        intensityLabel: 'Leve',
        warmup: '5 min caminhando + 3 a 5 min de trote',
        cooldown: '5 min de caminhada / volta à calma',
        incline: '1% de inclinação na esteira',
        description: 'Corrida contínua de recuperação ativa e manutenção da base aeróbica entre as sessões de tiros.'
      };

      const tiros800Intervals = makeIntervals(4, 800, 11.0, 120, 'caminhada');
      workoutC = {
        key: 'C',
        title: 'Corrida C: 4 Tiros de 800 m a 11 km/h',
        dayOfWeek: 6,
        dayName: 'Sábado',
        type: 'C moderado ou tiros',
        suggestedDurationMinutes: 28,
        suggestedDistanceKm: 3.2,
        suggestedSpeedRange: '11,0 km/h cravado',
        suggestedSpeedMin: 11.0,
        suggestedSpeedMax: 11.0,
        targetPaceFormatted: '5:27/km (Ritmo TAF)',
        intensityLabel: 'Ritmo-alvo',
        warmup: '5 min caminhando + 3 a 5 min de trote',
        cooldown: '5 min de caminhada / volta à calma',
        incline: '1% de inclinação na esteira',
        description: '4 tiros longos de 800 m a 11,0 km/h (4 min e 22 s por repetição) com 2 minutos de recuperação em caminhada ou trote leve.',
        intervals: tiros800Intervals
      };
    }

    // FASE 4 (Semanas 14 a 17)
    else {
      if (w === 17) {
        // Semana 17: TAPER
        workoutA = {
          key: 'A',
          title: 'Corrida A: Polimento Leve 15 min',
          dayOfWeek: 1,
          dayName: 'Segunda-feira',
          type: 'A leve/continuo',
          suggestedDurationMinutes: 15,
          suggestedDistanceKm: 1.9,
          suggestedSpeedRange: '7,0 a 8,0 km/h',
          suggestedSpeedMin: 7.0,
          suggestedSpeedMax: 8.0,
          targetPaceFormatted: '7:30 a 8:34/km',
          intensityLabel: 'Descanso / Taper',
          warmup: '5 min caminhando + 3 min trote suave',
          cooldown: '5 min caminhando',
          incline: '1% de inclinação na esteira',
          description: 'Semana de Polimento (Taper): apenas 15 minutos em trote regenerativo leve para manter ativação neuromuscular e poupar glicogênio muscular.'
        };

        workoutB = {
          key: 'B',
          title: 'Corrida B: Polimento Leve 15 min',
          dayOfWeek: 3,
          dayName: 'Quarta-feira',
          type: 'A leve/continuo',
          suggestedDurationMinutes: 15,
          suggestedDistanceKm: 1.9,
          suggestedSpeedRange: '7,0 a 8,0 km/h',
          suggestedSpeedMin: 7.0,
          suggestedSpeedMax: 8.0,
          targetPaceFormatted: '7:30 a 8:34/km',
          intensityLabel: 'Descanso / Taper',
          warmup: '5 min caminhando + 3 min trote suave',
          cooldown: '5 min caminhando',
          incline: '1% de inclinação na esteira',
          description: 'Última corrida leve antes da prova do TAF. 15 minutos confortáveis. Hidratação, sono e descanso prioritários!'
        };

        workoutC = {
          key: 'C',
          title: 'Sábado: Descanso Pré-TAF (Sem Corrida)',
          dayOfWeek: 6,
          dayName: 'Sábado',
          type: 'Teste',
          suggestedDurationMinutes: 0,
          suggestedDistanceKm: 0,
          suggestedSpeedRange: '0 km/h',
          suggestedSpeedMin: 0,
          suggestedSpeedMax: 0,
          targetPaceFormatted: 'Descanso Total',
          intensityLabel: 'Descanso / Taper',
          warmup: 'Alongamento leve e mobilidade',
          cooldown: 'Relaxamento muscular',
          incline: '0%',
          description: 'Descanso total pré-prova. Alimentação equilibrada, hidratação e sono profundo para o dia da prova de 2.200 m em 12 minutos!'
        };
      } else {
        // Semanas 14, 15, 16
        const tiros1000Intervals = makeIntervals(3, 1000, 11.0, 180, 'caminhada');
        workoutA = {
          key: 'A',
          title: 'Corrida A: 3 Tiros de 1.000 m a 11 km/h',
          dayOfWeek: 1,
          dayName: 'Segunda-feira',
          type: 'C moderado ou tiros',
          suggestedDurationMinutes: 26,
          suggestedDistanceKm: 3.0,
          suggestedSpeedRange: '11,0 km/h',
          suggestedSpeedMin: 11.0,
          suggestedSpeedMax: 11.0,
          targetPaceFormatted: '5:27/km (Ritmo TAF)',
          intensityLabel: 'Ritmo-alvo',
          warmup: '5 min caminhando + 3 a 5 min de trote',
          cooldown: '5 min de caminhada / volta à calma',
          incline: '1% de inclinação na esteira',
          description: '3 repetições de 1.000 metros (5 min e 27 s por tiro) cravados a 11 km/h com 3 minutos de descanso em caminhada.',
          intervals: tiros1000Intervals
        };

        workoutB = {
          key: 'B',
          title: 'Corrida B: Contínuo Leve 20 min',
          dayOfWeek: 3,
          dayName: 'Quarta-feira',
          type: 'A leve/continuo',
          suggestedDurationMinutes: 20,
          suggestedDistanceKm: 2.7,
          suggestedSpeedRange: '7,5 a 8,5 km/h',
          suggestedSpeedMin: 7.5,
          suggestedSpeedMax: 8.5,
          targetPaceFormatted: '7:03 a 8:00/km',
          intensityLabel: 'Leve',
          warmup: '5 min caminhando + 3 a 5 min de trote',
          cooldown: '5 min de caminhada / volta à calma',
          incline: '1% de inclinação na esteira',
          description: 'Rodagem leve de 20 minutos para soltar a musculatura e recuperar entre as sessões de alta intensidade.'
        };

        if (w === 15) {
          // Semana 15: 4x800m
          const tiros800Intervals = makeIntervals(4, 800, 11.0, 120, 'caminhada');
          workoutC = {
            key: 'C',
            title: 'Corrida C: 4 Tiros de 800 m a 11 km/h',
            dayOfWeek: 6,
            dayName: 'Sábado',
            type: 'C moderado ou tiros',
            suggestedDurationMinutes: 28,
            suggestedDistanceKm: 3.2,
            suggestedSpeedRange: '11,0 km/h',
            suggestedSpeedMin: 11.0,
            suggestedSpeedMax: 11.0,
            targetPaceFormatted: '5:27/km (Ritmo TAF)',
            intensityLabel: 'Ritmo-alvo',
            warmup: '5 min caminhando + 3 a 5 min de trote',
            cooldown: '5 min de caminhada / volta à calma',
            incline: '1% de inclinação na esteira',
            description: 'Sessão intervalada de 4 tiros de 800 m a 11 km/h com 2 minutos de recuperação antes do simulado da semana seguinte.',
            intervals: tiros800Intervals
          };
        } else {
          // Semanas 14 e 16: SIMULADO OFICIAL 12 MIN
          workoutC = {
            key: 'C',
            title: `Corrida C: 🏆 SIMULADO OFICIAL 12 MIN (Semana ${w})`,
            dayOfWeek: 6,
            dayName: 'Sábado',
            type: 'Simulado 12 min',
            suggestedDurationMinutes: 12,
            suggestedDistanceKm: 2.2,
            suggestedSpeedRange: '11,0 a 12,5 km/h',
            suggestedSpeedMin: 11.0,
            suggestedSpeedMax: 12.8,
            targetPaceFormatted: '5:27/km ou mais rápido',
            intensityLabel: 'Simulado',
            warmup: '5 min caminhando + 5 min de trote progressivo + pequenos estirões',
            cooldown: '5 min de caminhada leve de volta à calma',
            incline: '1% de inclinação na esteira',
            description: 'SIMULADO OFICIAL DE 12 MINUTOS: Corra no maior ritmo sustentável possível durante 12 minutos. O objetivo mínimo é atingir 2.200 metros (11,0 km/h cravados).',
            isTafSimulation: true
          };
        }
      }
    }

    weeks.push({
      weekNumber: w,
      phaseNumber,
      phaseName,
      phaseGoals,
      startDate: startStr,
      endDate: endStr,
      workouts: {
        A: workoutA,
        B: workoutB,
        C: workoutC
      }
    });
  }

  return weeks;
}

export const TAF_WEEKS = generate17WeeksTafPlan();

/**
 * Calculates current TAF status, current week (1-17), phase and countdown.
 */
export function getTafCurrentStatus(currentDate = new Date()) {
  const [sYear, sMonth, sDay] = TAF_PLAN_START_DATE.split('-').map(Number);
  const startDate = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);

  const [eYear, eMonth, eDay] = TAF_EXAM_DATE.split('-').map(Number);
  const examDate = new Date(eYear, eMonth - 1, eDay, 0, 0, 0, 0);
  const examEnd = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

  // Normaliza data de hoje para meia-noite local para cálculo exato de dias
  const todayMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0, 0);
  const now = todayMidnight.getTime();

  const isBeforeStart = now < startDate.getTime();
  const isAfterEnd = now > examEnd.getTime();

  // Dias até o início do plano (Semana 1)
  const msUntilStart = startDate.getTime() - now;
  const daysUntilStart = Math.max(0, Math.ceil(msUntilStart / (1000 * 60 * 60 * 24)));

  // Dias até a prova oficial do TAF
  const msUntilExam = examDate.getTime() - now;
  const daysUntilTaf = Math.max(0, Math.ceil(msUntilExam / (1000 * 60 * 60 * 24)));

  let currentWeekNumber = 1;
  let progressPercent = 0;

  if (isBeforeStart) {
    currentWeekNumber = 0; // Antes de 16/11/2026: plano ainda não começou
    progressPercent = 0;
  } else if (isAfterEnd) {
    currentWeekNumber = 17;
    progressPercent = 100;
  } else {
    const diffDays = Math.floor((now - startDate.getTime()) / (1000 * 60 * 60 * 24));
    currentWeekNumber = Math.min(17, Math.max(1, Math.floor(diffDays / 7) + 1));
    progressPercent = Math.min(100, Math.round((currentWeekNumber / 17) * 100));
  }

  // Semana para exibição / fallback (Semana 1 se pré-início)
  const displayWeekNumber = currentWeekNumber > 0 ? currentWeekNumber : 1;
  const currentWeek = TAF_WEEKS.find(w => w.weekNumber === displayWeekNumber) || TAF_WEEKS[0];

  const pad = (n: number) => n.toString().padStart(2, '0');
  const startDateFormatted = `${pad(startDate.getDate())}/${pad(startDate.getMonth() + 1)}/${startDate.getFullYear()}`;
  const examDateFormatted = `${pad(examDate.getDate())}/${pad(examDate.getMonth() + 1)}/${examDate.getFullYear()}`;

  return {
    isBeforeStart,
    isAfterEnd,
    currentWeekNumber, // 0 se antes de 16/11/2026, 1..17 durante o plano
    displayWeekNumber,
    currentWeek,
    progressPercent,
    daysUntilTaf,
    daysUntilStart,
    startDateFormatted,
    examDateFormatted,
    phaseNumber: currentWeek.phaseNumber,
    phaseName: currentWeek.phaseName,
    phaseGoals: currentWeek.phaseGoals,
    phaseInfo: TAF_PHASES_INFO[currentWeek.phaseNumber - 1]
  };
}

/**
 * Returns today's workout if today is Monday (A), Wednesday (B) or Saturday (C),
 * otherwise returns null or next workout info.
 */
export function getTodayTafWorkout(currentDate = new Date()) {
  const status = getTafCurrentStatus(currentDate);
  const dayOfWeek = currentDate.getDay(); // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
  const week = status.currentWeek;

  // Se estiver antes do início do plano, não há corrida oficial do plano hoje
  if (status.isBeforeStart) {
    return {
      isRunDay: false,
      isBeforeStart: true,
      todayWorkout: null,
      nextWorkout: {
        workout: week.workouts.A,
        dayText: `Segunda-feira (${status.startDateFormatted})`
      },
      dayOfWeek,
      status
    };
  }

  let todayWorkout: TafWorkoutDef | null = null;
  let nextWorkout: { workout: TafWorkoutDef; dayText: string } | null = null;

  if (dayOfWeek === 1) {
    todayWorkout = week.workouts.A;
  } else if (dayOfWeek === 3) {
    todayWorkout = week.workouts.B;
  } else if (dayOfWeek === 6) {
    todayWorkout = week.workouts.C;
  }

  // Determine next workout
  if (dayOfWeek === 0) { // Domingo -> Segunda (A)
    nextWorkout = { workout: week.workouts.A, dayText: 'Segunda-feira' };
  } else if (dayOfWeek === 1) { // Segunda -> Quarta (B)
    nextWorkout = { workout: week.workouts.B, dayText: 'Quarta-feira' };
  } else if (dayOfWeek === 2) { // Terça -> Quarta (B)
    nextWorkout = { workout: week.workouts.B, dayText: 'Quarta-feira' };
  } else if (dayOfWeek === 3) { // Quarta -> Sábado (C)
    nextWorkout = { workout: week.workouts.C, dayText: 'Sábado' };
  } else if (dayOfWeek === 4 || dayOfWeek === 5) { // Quinta/Sexta -> Sábado (C)
    nextWorkout = { workout: week.workouts.C, dayText: 'Sábado' };
  } else if (dayOfWeek === 6) { // Sábado -> Próxima Segunda (A)
    const nextWeekNumber = Math.min(17, week.weekNumber + 1);
    const nextWeek = TAF_WEEKS.find(w => w.weekNumber === nextWeekNumber) || week;
    nextWorkout = { workout: nextWeek.workouts.A, dayText: 'Segunda-feira' };
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
