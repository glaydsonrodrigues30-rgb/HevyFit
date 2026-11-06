/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Activity, Save, RefreshCw, Check, AlertCircle, Calendar } from 'lucide-react';
import { TrainingCycle, getCycleCurrentWeek } from '../types';
import { motion, AnimatePresence } from 'motion/react';

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
  const [name, setName] = useState(currentCycle?.name || 'Bloco de Treino');
  const [durationWeeks, setDurationWeeks] = useState(currentCycle?.durationWeeks || 8);
  const [goalWeight, setGoalWeight] = useState(currentCycle?.goalWeight ? String(currentCycle.goalWeight) : '');
  const [targetFocus, setTargetFocus] = useState(currentCycle?.targetFocus || 'Hipertrofia & Força');

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // Compute currentWeek and progress automatically
  const sDate = currentCycle?.startDate || Date.now();
  const currentWeek = getCycleCurrentWeek({ startDate: sDate, durationWeeks });
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentWeek / durationWeeks) * 100)));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cycleStartDate = currentCycle?.startDate || Date.now();
    const computedEndDate = cycleStartDate + (Number(durationWeeks) * 7 * 24 * 60 * 60 * 1000);

    const cycleData: TrainingCycle = {
      id: currentCycle?.id || 'cycle_' + Date.now(),
      name,
      durationWeeks: Number(durationWeeks),
      startDate: cycleStartDate,
      endDate: computedEndDate,
      goalWeight: goalWeight === '' ? null : parseFloat(goalWeight),
      targetFocus
    };
    onSaveCycle(cycleData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleStartBlank = () => {
    setName('Novo Bloco de Treino');
    setDurationWeeks(8);
    setGoalWeight('');
    setTargetFocus('Hipertrofia & Força');
  };

  return (
    <div id="cycle-settings-view" className="space-y-6 max-w-2xl mx-auto">

      {/* HEADER */}
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-semibold text-[#F2F3F5] tracking-tight">
          Ciclo de treino
        </h1>
        <p className="text-[14px] text-[#9AA1AD] mt-0.5">
          Periodize seus blocos de treino para controlar volume, força e deloads.
        </p>
      </div>

      {/* 1. CARTÃO DE PROGRESSO DO CICLO SIMPLES */}
      <section className="p-5 sm:p-6 rounded-[20px] bg-[#15171C] border border-[rgba(255,255,255,0.07)] space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#7C6CFF]/15 text-[#7C6CFF] flex items-center justify-center">
              <Activity className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[12px] font-semibold text-[#7C6CFF] uppercase tracking-wide">
              Ciclo ativo
            </span>
          </div>

          <span className="text-[12px] font-medium text-[#9AA1AD]">
            Semana {currentWeek} de {durationWeeks}
          </span>
        </div>

        <div>
          <h2 className="text-[20px] font-semibold text-[#F2F3F5] tracking-tight">
            {name || 'Bloco sem nome'}
          </h2>
          <p className="text-[13px] text-[#9AA1AD] mt-0.5">
            Foco: <span className="text-[#F2F3F5] font-medium">{targetFocus}</span>
            {goalWeight ? ` • Meta de peso: ${goalWeight} kg` : ''}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2.5 rounded-full bg-[#1C1F26] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7C6CFF] to-[#6A5BF0] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#6B7280]">
            <span>Início: {new Date(sDate).toLocaleDateString('pt-BR')}</span>
            <span className="tabular-nums">{progressPercent}% do bloco percorrido</span>
          </div>
        </div>
      </section>

      {/* 2. FORMULÁRIO ORGANIZADO */}
      <section className="p-6 rounded-[24px] bg-[#15171C] border border-[rgba(255,255,255,0.08)] shadow-sm space-y-5">
        <h3 className="text-[16px] font-semibold text-[#F2F3F5]">
          Ajustar Parâmetros do Ciclo
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-[#9AA1AD] block mb-1.5">
              Nome do Bloco
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Bloco de Força; Preparatório..."
              className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[14px] px-3.5 py-2.5 text-[14px] text-[#F2F3F5] focus:outline-none focus:border-[#7C6CFF]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-[#9AA1AD] block mb-1.5">
                Duração (semanas)
              </label>
              <div className="flex items-center gap-1.5">
                {[4, 6, 8, 12].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setDurationWeeks(w)}
                    className={`flex-1 min-h-[40px] rounded-[10px] text-[13px] font-medium transition cursor-pointer border ${
                      durationWeeks === w
                        ? 'bg-[#7C6CFF] border-[#7C6CFF] text-white'
                        : 'bg-[#1C1F26] border-[rgba(255,255,255,0.06)] text-[#9AA1AD]'
                    }`}
                  >
                    {w} sem
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#9AA1AD] block mb-1.5">
                Meta de peso (opcional, kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={goalWeight}
                onChange={(e) => setGoalWeight(e.target.value)}
                placeholder="ex: 78.5"
                className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[14px] px-3.5 py-2.5 text-[14px] text-[#F2F3F5] focus:outline-none focus:border-[#7C6CFF] tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#9AA1AD] block mb-1.5">
              Foco do Treinamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['Hipertrofia & Força', 'Ganho de Volume', 'Definição / Corte', 'Resistência Geral', 'Preparação TAF'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTargetFocus(f)}
                  className={`p-2.5 rounded-[12px] text-[12px] font-medium transition cursor-pointer text-left border ${
                    targetFocus === f
                      ? 'bg-[#7C6CFF]/15 border-[#7C6CFF] text-[#7C6CFF]'
                      : 'bg-[#1C1F26] border-[rgba(255,255,255,0.06)] text-[#9AA1AD]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              id="btn-save-cycle"
              type="submit"
              className="w-full sm:flex-1 min-h-[48px] rounded-[14px] bg-gradient-to-r from-[#7C6CFF] to-[#6A5BF0] hover:from-[#8E80FF] hover:to-[#7C6CFF] text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-md shadow-[#7C6CFF]/20"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Ciclo atualizado!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar alterações</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowRestartConfirm(true)}
              className="w-full sm:w-auto min-h-[48px] px-4 rounded-[14px] bg-[#1C1F26] hover:bg-[#252a35] text-[#FF6B6B] text-[13px] font-medium transition cursor-pointer"
            >
              Reiniciar ciclo
            </button>
          </div>
        </form>
      </section>

      {/* CONFIRM RESTART MODAL */}
      <AnimatePresence>
        {showRestartConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[20px] p-5 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#FF6B6B]/15 text-[#FF6B6B] flex items-center justify-center mx-auto">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-[17px] font-semibold text-[#F2F3F5]">Reiniciar ciclo atual?</h4>
                <p className="text-[13px] text-[#9AA1AD] mt-1">
                  A contagem de semanas começará novamente a partir de hoje. Nenhum treino do histórico será apagado.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestartConfirm(false)}
                  className="min-h-[44px] rounded-[12px] bg-[#1C1F26] hover:bg-[#222630] text-[#9AA1AD] text-[13px] font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRestartCycle();
                    handleStartBlank();
                    setShowRestartConfirm(false);
                  }}
                  className="min-h-[44px] rounded-[12px] bg-[#FF6B6B] hover:bg-[#ff5252] text-white text-[13px] font-semibold transition cursor-pointer"
                >
                  Reiniciar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
