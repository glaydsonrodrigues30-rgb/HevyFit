/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Award, RefreshCcw, Save, ShieldAlert, Zap } from 'lucide-react';
import { TrainingCycle } from '../types';

interface CycleSettingsProps {
  currentCycle: TrainingCycle | null;
  onSaveCycle: (cycle: TrainingCycle) => void;
  onRestartCycle: () => void;
}

export default function CycleSettings({
  currentCycle,
  onSaveCycle,
  onRestartCycle
}: CycleSettingsProps) {
  // Local form state
  const [name, setName] = useState(currentCycle?.name || 'Ciclo de Hipertrofia Básica');
  const [durationWeeks, setDurationWeeks] = useState(currentCycle?.durationWeeks || 8);
  const [currentWeek, setCurrentWeek] = useState(currentCycle?.currentWeek || 1);
  const [goalWeight, setGoalWeight] = useState(currentCycle?.goalWeight ? String(currentCycle.goalWeight) : '');
  const [targetFocus, setTargetFocus] = useState(currentCycle?.targetFocus || 'Força & Massa Magra');

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cycleData: TrainingCycle = {
      id: currentCycle?.id || 'cycle_' + Date.now(),
      name,
      durationWeeks: Number(durationWeeks),
      currentWeek: Number(currentWeek),
      startDate: currentCycle?.startDate || Date.now(),
      goalWeight: goalWeight === '' ? null : parseFloat(goalWeight),
      targetFocus
    };
    onSaveCycle(cycleData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleStartBlank = () => {
    setName('Novo Bloco de Treino');
    setDurationWeeks(6);
    setCurrentWeek(1);
    setGoalWeight('');
    setTargetFocus('Foco em Definição');
  };

  return (
    <div id="cycle-settings-view" className="max-w-2xl mx-auto space-y-6 text-white">
      
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-lime-400">
          <Zap className="w-5 h-5 fill-current" />
          <h2 className="text-lg font-bold">Gerenciador de Ciclo (Periodização)</h2>
        </div>
        <p className="text-xs text-slate-450 leading-relaxed">
          Periodizar o treino em ciclos de 4 a 12 semanas ajuda a planejar sobrecargas de volume, semanas de regeneração (deload) e manter o foco nos objetivos estratégicos (como ganho de peso, queima de gordura ou progressão pura de força).
        </p>
      </div>

      {/* Main Cycle configuration form */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-slate-850 pb-2">Configurar Ciclo Ativo</h3>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 block font-semibold">Nome do Ciclo / Bloco</label>
            <input
              id="input-cycle-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Projeto Verão; Foco Pernas..."
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-sm text-white focus:border-lime-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target Focus */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 block font-semibold">Foco Estratégico</label>
              <input
                id="input-cycle-focus"
                type="text"
                value={targetFocus}
                onChange={(e) => setTargetFocus(e.target.value)}
                placeholder="ex: Hipertrofia Braços; Queima de Gordura"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-sm text-white focus:border-lime-500 outline-none"
              />
            </div>

            {/* Goal Weight */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 block font-semibold">Meta de Peso Corporal (Opcional)</label>
              <div className="relative">
                <input
                  id="input-cycle-goal-weight"
                  type="number"
                  step="0.1"
                  value={goalWeight}
                  onChange={(e) => setGoalWeight(e.target.value)}
                  placeholder="ex: 75.0"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-sm text-white focus:border-lime-500 outline-none font-mono"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">kg</span>
              </div>
            </div>
          </div>

          {/* Duration Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            {/* Duration Weeks */}
            <div className="space-y-2 bg-slate-950 p-3.5 border border-slate-850 rounded-xl">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Duração do Bloco:</span>
                <span className="text-white font-bold font-mono text-sm">{durationWeeks} semanas</span>
              </div>
              <input
                id="range-cycle-duration"
                type="range"
                min="1"
                max="24"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-lime-400"
              />
            </div>

            {/* Current Week select */}
            <div className="space-y-2 bg-slate-950 p-3.5 border border-slate-850 rounded-xl">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Semana Atual:</span>
                <span className="text-lime-400 font-bold font-mono text-sm">Semana {currentWeek}</span>
              </div>
              <input
                id="range-cycle-current-week"
                type="range"
                min="1"
                max={durationWeeks}
                value={currentWeek}
                onChange={(e) => setCurrentWeek(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-lime-400"
              />
            </div>

          </div>

          {/* Action Row */}
          <div className="flex flex-wrap gap-3 pt-3">
            <button
              id="btn-save-cycle"
              type="submit"
              className="flex-1 min-w-[150px] flex items-center justify-center gap-2 bg-lime-500 hover:bg-lime-600 font-bold font-sans py-2.5 rounded-xl text-slate-950 text-xs transition shadow-lg shadow-lime-500/10"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>

            <button
               id="btn-restart-cycle-prompt"
               type="button"
               onClick={() => {
                 if(window.confirm('Tem certeza de que deseja reiniciar o ciclo e redefinir as semanas?')) {
                   onRestartCycle();
                   handleStartBlank();
                 }
               }}
               className="px-4 py-2 bg-slate-950 hover:bg-red-500/10 text-red-400 border border-slate-850 hover:border-red-500/25 rounded-xl text-xs font-semibold transition"
            >
              Excluir / Reiniciar
            </button>
          </div>

          {saveSuccess && (
            <div className="text-center p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs border border-emerald-500/15 animate-fade-in">
              Configurações de ciclo salvas e atualizadas com sucesso! 🎯
            </div>
          )}

        </form>
      </div>

    </div>
  );
}
