/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exercise, WorkoutRoutine, WorkoutHistory } from '../types';

export const INITIAL_EXERCISES: Exercise[] = [
  // Peito (Chest)
  { id: 'bench_press', name: 'Supino Reto com Barra', category: 'Hipertrofia', targetMuscle: 'Peito', equipment: 'Barra' },
  { id: 'incline_dumbbells', name: 'Supino Inclinado com Halteres', category: 'Hipertrofia', targetMuscle: 'Peito', equipment: 'Halteres' },
  { id: 'chest_fly', name: 'Crucifixo Máquina (Peck Deck)', category: 'Hipertrofia', targetMuscle: 'Peito', equipment: 'Máquina' },
  { id: 'cable_crossover', name: 'Crossover Polia Média', category: 'Hipertrofia', targetMuscle: 'Peito', equipment: 'Cabo' },
  
  // Costas (Back)
  { id: 'deadlift', name: 'Levantamento Terra', category: 'Força', targetMuscle: 'Costas / Pernas', equipment: 'Barra' },
  { id: 'lat_pulldown', name: 'Puxada Aberta na Polia', category: 'Hipertrofia', targetMuscle: 'Costas', equipment: 'Cabo' },
  { id: 'barbell_row', name: 'Remada Curvada com Barra', category: 'Hipertrofia', targetMuscle: 'Costas', equipment: 'Barra' },
  { id: 'pull_up', name: 'Barra Fixa', category: 'Calistenia', targetMuscle: 'Costas', equipment: 'Peso Corporal' },
  { id: 'cable_row', name: 'Remada Baixa Triângulo', category: 'Hipertrofia', targetMuscle: 'Costas', equipment: 'Cabo' },

  // Pernas (Legs)
  { id: 'squat_barbell', name: 'Agachamento Livre com Barra', category: 'Força', targetMuscle: 'Quadríceps', equipment: 'Barra' },
  { id: 'leg_press', name: 'Leg Press 45º', category: 'Hipertrofia', targetMuscle: 'Quadríceps', equipment: 'Máquina' },
  { id: 'leg_extension', name: 'Cadeira Extensora', category: 'Hipertrofia', targetMuscle: 'Quadríceps', equipment: 'Máquina' },
  { id: 'leg_curl', name: 'Mesa Flexora', category: 'Hipertrofia', targetMuscle: 'Posterior de Coxa', equipment: 'Máquina' },
  { id: 'calf_raises', name: 'Gêmeos em Pé', category: 'Hipertrofia', targetMuscle: 'Panturrilhas', equipment: 'Máquina' },

  // Ombros (Shoulders)
  { id: 'overhead_press', name: 'Desenvolvimento Militar Barra', category: 'Força', targetMuscle: 'Ombros', equipment: 'Barra' },
  { id: 'lateral_raise', name: 'Elevação Lateral Halteres', category: 'Hipertrofia', targetMuscle: 'Ombros', equipment: 'Halteres' },
  { id: 'face_pull', name: 'Face Pull na Polia', category: 'Hipertrofia', targetMuscle: 'Ombros Posterior', equipment: 'Cabo' },

  // Braços (Arms)
  { id: 'barbell_curl', name: 'Rosca Direta com Barra W', category: 'Hipertrofia', targetMuscle: 'Bíceps', equipment: 'Barra' },
  { id: 'hammer_curl', name: 'Rosca Martelo Halteres', category: 'Hipertrofia', targetMuscle: 'Bíceps', equipment: 'Halteres' },
  { id: 'tricep_pushdown', name: 'Tríceps Corda Polia', category: 'Hipertrofia', targetMuscle: 'Tríceps', equipment: 'Cabo' },
  { id: 'skull_crusher', name: 'Tríceps Testa Barra H', category: 'Hipertrofia', targetMuscle: 'Tríceps', equipment: 'Barra' },

  // Core (Abs)
  { id: 'plank', name: 'Prancha Isométrica', category: 'Calistenia', targetMuscle: 'Abdômen', equipment: 'Peso Corporal' },
  { id: 'ab_crunch', name: 'Abdominal Supra Máquina', category: 'Hipertrofia', targetMuscle: 'Abdômen', equipment: 'Máquina' }
];

export const INITIAL_ROUTINES: WorkoutRoutine[] = [
  {
    id: 'routine_a',
    name: 'Treino A - Peito, Ombros e Tríceps',
    description: 'Foco em empurrar (Push Day) para desenvolvimento do tronco superior.',
    exercises: [
      {
        exerciseId: 'bench_press',
        sets: [
          { weight: 60, reps: 10, type: 'Trabalho' },
          { weight: 60, reps: 10, type: 'Trabalho' },
          { weight: 70, reps: 8, type: 'Trabalho' },
          { weight: 70, reps: 8, type: 'Trabalho' }
        ],
        restTimer: 120,
        progressionNotes: 'Subir para 75kg se completar as 8 repetições com boa forma na última série.',
        observations: 'Manter escápulas retraídas e barra descendo até a linha do mamilo.'
      },
      {
        exerciseId: 'incline_dumbbells',
        sets: [
          { weight: 24, reps: 10, type: 'Trabalho' },
          { weight: 24, reps: 10, type: 'Trabalho' },
          { weight: 24, reps: 8, type: 'Trabalho' }
        ],
        restTimer: 90,
        progressionNotes: 'Buscar fazer 3x10 reps com halter de 24kg antes de subir para de 26kg.',
        observations: 'Inclinação do banco em 30º para maximizar o trabalho de porção clavicular do peito.'
      },
      {
        exerciseId: 'lateral_raise',
        sets: [
          { weight: 10, reps: 12, type: 'Trabalho' },
          { weight: 10, reps: 12, type: 'Trabalho' },
          { weight: 8, reps: 15, type: 'Trabalho' }
        ],
        restTimer: 60,
        progressionNotes: 'Focar na cadência lenta e qualidade de movimento antes de subir peso.',
        observations: 'Elevar os braços ligeiramente para frente na linha escapular (plano escapular).'
      },
      {
        exerciseId: 'tricep_pushdown',
        sets: [
          { weight: 25, reps: 12, type: 'Trabalho' },
          { weight: 25, reps: 12, type: 'Trabalho' },
          { weight: 20, reps: 15, type: 'Trabalho' }
        ],
        restTimer: 60,
        observations: 'Não mexer o cotovelo durante a execução, esmagar o tríceps na descida.'
      }
    ]
  },
  {
    id: 'routine_b',
    name: 'Treino B - Costas, Tríbices & Bíceps',
    description: 'Foco em puxar (Pull Day) completo para largura de costas e braços.',
    exercises: [
      {
        exerciseId: 'pull_up',
        sets: [
          { weight: 0, reps: 8, type: 'Trabalho' },
          { weight: 0, reps: 8, type: 'Trabalho' },
          { weight: 0, reps: 6, type: 'Trabalho' }
        ],
        restTimer: 120,
        progressionNotes: 'Tentar adicionar 1 repetição a mais no total acumulado do treino.',
        observations: 'Foco na descida controlada (excêntrica de 3 segundos).'
      },
      {
        exerciseId: 'barbell_row',
        sets: [
          { weight: 50, reps: 10, type: 'Trabalho' },
          { weight: 55, reps: 10, type: 'Trabalho' },
          { weight: 60, reps: 8, type: 'Trabalho' }
        ],
        restTimer: 90,
        observations: 'Manter coluna neutra e puxar em direção ao umbigo.'
      },
      {
        exerciseId: 'barbell_curl',
        sets: [
          { weight: 30, reps: 10, type: 'Trabalho' },
          { weight: 30, reps: 10, type: 'Trabalho' },
          { weight: 25, reps: 12, type: 'Trabalho' }
        ],
        restTimer: 75,
        observations: 'Evitar roubar com a lombar, cotovelos colados ao lado do corpo.'
      },
      {
        exerciseId: 'hammer_curl',
        sets: [
          { weight: 14, reps: 12, type: 'Trabalho' },
          { weight: 14, reps: 12, type: 'Trabalho' }
        ],
        restTimer: 60
      }
    ]
  },
  {
    id: 'routine_c',
    name: 'Treino C - Pernas Completo',
    description: 'Treino intenso focado na musculatura de membros inferiores.',
    exercises: [
      {
        exerciseId: 'squat_barbell',
        sets: [
          { weight: 80, reps: 10, type: 'Trabalho' },
          { weight: 90, reps: 8, type: 'Trabalho' },
          { weight: 100, reps: 6, type: 'Trabalho' },
          { weight: 60, reps: 12, type: 'Aquecimento' }
        ],
        restTimer: 150,
        progressionNotes: 'Adicionar 2kg de cada lado na próxima semana mantendo a amplitude.',
        observations: 'Desbancar o quadril para trás mantendo calcanhares bem firmes no chão.'
      },
      {
        exerciseId: 'leg_press',
        sets: [
          { weight: 200, reps: 12, type: 'Trabalho' },
          { weight: 220, reps: 10, type: 'Trabalho' },
          { weight: 240, reps: 10, type: 'Trabalho' }
        ],
        restTimer: 120,
        observations: 'Garantir que os joelhos não entrem para dentro (valgo dinâmico) durante a subida.'
      },
      {
        exerciseId: 'leg_curl',
        sets: [
          { weight: 45, reps: 12, type: 'Trabalho' },
          { weight: 45, reps: 12, type: 'Trabalho' }
        ],
        restTimer: 75
      },
      {
        exerciseId: 'calf_raises',
        sets: [
          { weight: 60, reps: 15, type: 'Trabalho' },
          { weight: 60, reps: 15, type: 'Trabalho' },
          { weight: 60, reps: 15, type: 'Trabalho' }
        ],
        restTimer: 60,
        progressionNotes: 'Alcançar 15 repetições completas em todas as séries antes de progredir carga.',
        observations: 'Fazer o alongamento total na parte inferior e contração total no topo de 1s.'
      }
    ]
  }
];

export const INITIAL_WEIGHT_HISTORY = [
  { id: '1', weight: 81.2, timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000, note: 'Peso inicial da semana' },
  { id: '2', weight: 80.8, timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000, note: 'Após treino em jejum' },
  { id: '3', weight: 80.5, timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, note: 'Mantendo boa alimentação' },
  { id: '4', weight: 80.2, timestamp: Date.now(), note: 'Peso oficial de hoje' }
];

export const INITIAL_HISTORY: WorkoutHistory[] = [
  {
    id: 'hist_1',
    name: 'Treino A - Peito, Ombros e Tríceps',
    startTime: Date.now() - 5 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000,
    durationMs: 45 * 60 * 1000,
    comments: 'Evolução excelente de carga no supino reto, sentindo pump incrível!',
    cycleId: 'cycle_default',
    cycleWeek: 1,
    exercises: [
      {
        exerciseId: 'bench_press',
        sets: [
          { id: 's1', weight: 60, reps: 10, completed: true, type: 'Trabalho' },
          { id: 's2', weight: 60, reps: 10, completed: true, type: 'Trabalho' },
          { id: 's3', weight: 70, reps: 8, completed: true, type: 'Trabalho' },
          { id: 's4', weight: 70, reps: 7, completed: true, type: 'Trabalho' }
        ]
      },
      {
        exerciseId: 'lateral_raise',
        sets: [
          { id: 's5', weight: 10, reps: 12, completed: true, type: 'Trabalho' },
          { id: 's6', weight: 10, reps: 12, completed: true, type: 'Trabalho' }
        ]
      }
    ]
  },
  {
    id: 'hist_2',
    name: 'Treino B - Costas, Tríbices & Bíceps',
    startTime: Date.now() - 3 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 3 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000,
    durationMs: 50 * 60 * 1000,
    comments: 'Foquei na cadência (excêntrica lenta). Costas completamente destruídas.',
    cycleId: 'cycle_default',
    cycleWeek: 1,
    exercises: [
      {
        exerciseId: 'pull_up',
        sets: [
          { id: 's7', weight: 0, reps: 8, completed: true, type: 'Trabalho' },
          { id: 's8', weight: 0, reps: 7, completed: true, type: 'Trabalho' }
        ]
      },
      {
        exerciseId: 'barbell_row',
        sets: [
          { id: 's9', weight: 50, reps: 10, completed: true, type: 'Trabalho' },
          { id: 's10', weight: 55, reps: 10, completed: true, type: 'Trabalho' }
        ]
      },
      {
        exerciseId: 'barbell_curl',
        sets: [
          { id: 's11', weight: 30, reps: 10, completed: true, type: 'Trabalho' },
          { id: 's12', weight: 30, reps: 8, completed: true, type: 'Trabalho' }
        ]
      }
    ]
  },
  {
    id: 'hist_3',
    name: 'Treino C - Pernas Completo',
    startTime: Date.now() - 1 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
    durationMs: 60 * 60 * 1000,
    comments: 'Aumentei 10kg no agachamento! Foco total nas pernas.',
    cycleId: 'cycle_default',
    cycleWeek: 1,
    exercises: [
      {
        exerciseId: 'squat_barbell',
        sets: [
          { id: 's13', weight: 80, reps: 10, completed: true, type: 'Trabalho' },
          { id: 's14', weight: 90, reps: 8, completed: true, type: 'Trabalho' },
          { id: 's15', weight: 100, reps: 6, completed: true, type: 'Trabalho' }
        ]
      },
      {
        exerciseId: 'leg_press',
        sets: [
          { id: 's16', weight: 200, reps: 12, completed: true, type: 'Trabalho' },
          { id: 's17', weight: 220, reps: 10, completed: true, type: 'Trabalho' }
        ]
      }
    ]
  }
];
