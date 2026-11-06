/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  Plus, 
  Minus, 
  Calendar, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  TrendingDown, 
  TrendingUp, 
  Target 
} from 'lucide-react';
import { WeightEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface WeightTrackerProps {
  weightHistory: WeightEntry[];
  onAddWeight: (weight: number, note: string, timestamp?: number) => void;
  onUpdateWeight: (id: string, weight: number, note: string, timestamp: number) => void;
  onDeleteWeight: (id: string) => void;
  goalWeight: number | null | undefined;
}

export default function WeightTracker({
  weightHistory = [],
  onAddWeight,
  onUpdateWeight,
  onDeleteWeight,
  goalWeight
}: WeightTrackerProps) {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : 75.0;

  // New weight form state
  const [newWeight, setNewWeight] = useState<number>(latestWeight);
  const [note, setNote] = useState('');
  const [customDate, setCustomDate] = useState(getTodayString());
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');

  // Delete modal state
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);

  // Sorted entries chronologically
  const sortedEntries = useMemo(() => {
    return [...weightHistory].sort((a, b) => a.timestamp - b.timestamp);
  }, [weightHistory]);

  const currentWeight = sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1].weight : null;
  const initialWeight = sortedEntries.length > 0 ? sortedEntries[0].weight : null;
  const totalChange = currentWeight && initialWeight ? Number((currentWeight - initialWeight).toFixed(1)) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWeight > 0) {
      const parsedDate = new Date(`${customDate}T12:00:00`);
      onAddWeight(Number(newWeight.toFixed(1)), note.trim(), parsedDate.getTime());
      setNote('');
      setCustomDate(getTodayString());
      setShowAdvancedFields(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const wVal = parseFloat(editWeight);
    if (!isNaN(wVal) && wVal > 0 && editDate) {
      const parsedDate = new Date(`${editDate}T12:00:00`);
      onUpdateWeight(editingEntry.id, wVal, editNote.trim(), parsedDate.getTime());
      setEditingEntry(null);
    }
  };

  // Render Clean Smooth SVG Weight Chart
  const renderCleanChart = () => {
    if (sortedEntries.length < 2) {
      return (
        <div className="h-40 flex flex-col items-center justify-center p-4 bg-[#15171C] rounded-[20px] border border-[rgba(255,255,255,0.07)] text-center space-y-1">
          <Scale className="w-8 h-8 text-[#6B7280]" />
          <p className="text-[13px] font-medium text-[#F2F3F5]">Gráfico em construção</p>
          <p className="text-[11px] text-[#9AA1AD]">Adicione pelo menos 2 registros de peso para visualizar a curva de evolução.</p>
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const padX = 40;
    const padY = 24;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    const weightsArr = sortedEntries.map(e => e.weight);
    let minW = Math.min(...weightsArr) - 0.8;
    let maxW = Math.max(...weightsArr) + 0.8;
    if (goalWeight) {
      minW = Math.min(minW, goalWeight - 0.8);
      maxW = Math.max(maxW, goalWeight + 0.8);
    }
    const rangeW = maxW - minW || 1;

    const minT = sortedEntries[0].timestamp;
    const maxT = sortedEntries[sortedEntries.length - 1].timestamp;
    const rangeT = maxT - minT || 1;

    const coords = sortedEntries.map(e => ({
      x: padX + ((e.timestamp - minT) / rangeT) * chartW,
      y: padY + chartH - ((e.weight - minW) / rangeW) * chartH,
      weight: e.weight,
      dateStr: new Date(e.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }));

    // Smooth bezier curve path
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const mx = (p0.x + p1.x) / 2;
      pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${height - padY} Z`;

    return (
      <div className="p-5 rounded-[20px] bg-[#15171C] border border-[rgba(255,255,255,0.07)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-[#F2F3F5]">
              Evolução de Peso Corporal
            </h3>
            <span className="text-[11px] text-[#9AA1AD]">
              Variação: {totalChange > 0 ? `+${totalChange}` : totalChange} kg desde o primeiro registro
            </span>
          </div>

          {goalWeight && (
            <span className="text-[11px] font-semibold text-[#7C6CFF] bg-[#7C6CFF]/15 px-2.5 py-1 rounded-full border border-[#7C6CFF]/30">
              Meta: {goalWeight} kg
            </span>
          )}
        </div>

        <div className="relative pt-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            <defs>
              <linearGradient id="weight-smooth-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C6CFF" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#7C6CFF" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle soft boundary guides (no heavy dark grid) */}
            <line
              x1={padX}
              y1={padY}
              x2={width - padX}
              y2={padY}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4 4"
            />
            <text x={padX - 8} y={padY + 4} textAnchor="end" className="fill-[#6B7280] text-[9px] font-mono">
              {maxW.toFixed(0)}kg
            </text>

            <line
              x1={padX}
              y1={height - padY}
              x2={width - padX}
              y2={height - padY}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4 4"
            />
            <text x={padX - 8} y={height - padY + 4} textAnchor="end" className="fill-[#6B7280] text-[9px] font-mono">
              {minW.toFixed(0)}kg
            </text>

            {/* Target Weight dashed line if set */}
            {goalWeight && goalWeight >= minW && goalWeight <= maxW && (
              <line
                x1={padX}
                y1={padY + chartH - ((goalWeight - minW) / rangeW) * chartH}
                x2={width - padX}
                y2={padY + chartH - ((goalWeight - minW) / rangeW) * chartH}
                stroke="#7C6CFF"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.6"
              />
            )}

            {/* Gradient fill below curve */}
            <path d={areaD} fill="url(#weight-smooth-grad)" />

            {/* Smooth main line */}
            <path d={pathD} fill="none" stroke="#7C6CFF" strokeWidth="2.5" strokeLinecap="round" />

            {/* Points */}
            {coords.map((c, i) => (
              <g key={i}>
                <circle cx={c.x} cy={c.y} r="3.5" fill="#7C6CFF" stroke="#15171C" strokeWidth="1.5" />
                {(i === 0 || i === coords.length - 1 || coords.length <= 6) && (
                  <text x={c.x} y={c.y - 7} textAnchor="middle" className="fill-[#F2F3F5] text-[9px] font-mono font-medium">
                    {c.weight}
                  </text>
                )}
                {(i === 0 || i === coords.length - 1) && (
                  <text x={c.x} y={height - padY + 14} textAnchor="middle" className="fill-[#6B7280] text-[9px] font-mono">
                    {c.dateStr}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div id="weight-tracker-view" className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-semibold text-[#F2F3F5] tracking-tight">
            Peso corporal
          </h1>
          <p className="text-[14px] text-[#9AA1AD] mt-0.5">
            Registre suas pesagens e acompanhe a oscilação na curva.
          </p>
        </div>

        {currentWeight && (
          <div className="p-3 px-4 rounded-[16px] bg-[#15171C] border border-[rgba(255,255,255,0.07)] flex items-center gap-3 self-start sm:self-auto">
            <div>
              <span className="text-[11px] text-[#6B7280] font-medium block">Peso atual</span>
              <p className="text-[20px] font-semibold text-[#F2F3F5] tabular-nums leading-tight">
                {currentWeight} <span className="text-[13px] font-normal text-[#9AA1AD]">kg</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 1. CAMPO GRANDE PARA REGISTRAR PESO */}
      <section className="p-6 rounded-[24px] bg-[#15171C] border border-[rgba(255,255,255,0.08)] shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] bg-[#7C6CFF]/15 text-[#7C6CFF] flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-[13px] font-semibold text-[#F2F3F5]">
            Nova Pesagem
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Big Weight Stepper Input */}
          <div className="p-4 rounded-[20px] bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setNewWeight(prev => Math.max(30, Number((prev - 0.2).toFixed(1))))}
              className="w-12 h-12 rounded-[14px] bg-[#15171C] border border-[rgba(255,255,255,0.08)] text-[#F2F3F5] flex items-center justify-center hover:bg-[#222630] transition cursor-pointer shrink-0"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="flex items-baseline justify-center gap-1.5 flex-1 text-center">
              <input
                id="big-weight-input"
                type="number"
                step="0.1"
                min="30"
                max="250"
                value={newWeight || ''}
                onChange={(e) => setNewWeight(parseFloat(e.target.value) || 0)}
                className="w-32 text-center text-[36px] sm:text-[40px] font-semibold text-[#F2F3F5] bg-transparent outline-none tabular-nums"
                required
              />
              <span className="text-[18px] font-medium text-[#9AA1AD]">kg</span>
            </div>

            <button
              type="button"
              onClick={() => setNewWeight(prev => Number((prev + 0.2).toFixed(1)))}
              className="w-12 h-12 rounded-[14px] bg-[#15171C] border border-[rgba(255,255,255,0.08)] text-[#F2F3F5] flex items-center justify-center hover:bg-[#222630] transition cursor-pointer shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Toggle advanced fields (date and note) */}
          <div className="flex items-center justify-between text-[12px]">
            <button
              type="button"
              onClick={() => setShowAdvancedFields(!showAdvancedFields)}
              className="text-[#9AA1AD] hover:text-[#F2F3F5] transition cursor-pointer"
            >
              {showAdvancedFields ? 'Ocultar data e notas' : '+ Alterar data ou adicionar notas'}
            </button>

            <span className="text-[#6B7280]">
              Data: {new Date(customDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>

          {showAdvancedFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-medium text-[#9AA1AD] block mb-1">Data</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2 text-[13px] text-[#F2F3F5] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#9AA1AD] block mb-1">Nota</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ex: Em jejum ao acordar"
                  className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2 text-[13px] text-[#F2F3F5] outline-none"
                />
              </div>
            </div>
          )}

          <button
            id="btn-submit-weight"
            type="submit"
            className="w-full min-h-[48px] rounded-[14px] bg-gradient-to-r from-[#7C6CFF] to-[#6A5BF0] hover:from-[#8E80FF] hover:to-[#7C6CFF] text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-md shadow-[#7C6CFF]/20"
          >
            {saveSuccess ? (
              <>
                <Check className="w-5 h-5" />
                <span>Peso registrado!</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 stroke-[2.2]" />
                <span>Salvar peso ({newWeight} kg)</span>
              </>
            )}
          </button>
        </form>
      </section>

      {/* 2. GRÁFICO LIMPO (LINHA SUAVE, SEM GRADE PESADA) */}
      {renderCleanChart()}

      {/* 3. LISTA DE PESAGENS ABAIXO */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[#F2F3F5]">
            Histórico de Pesagens
          </h3>
          <span className="text-[12px] text-[#6B7280] tabular-nums">
            {weightHistory.length} registros
          </span>
        </div>

        {weightHistory.length === 0 ? (
          <div className="p-8 rounded-[20px] bg-[#15171C] border border-[rgba(255,255,255,0.07)] text-center space-y-2">
            <Scale className="w-8 h-8 text-[#6B7280] mx-auto" />
            <p className="text-[14px] font-medium text-[#F2F3F5]">Nenhum registro ainda</p>
            <p className="text-[12px] text-[#9AA1AD]">Use o campo acima para salvar seu peso atual.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...weightHistory].reverse().map((entry, idx, arr) => {
              const prev = arr[idx + 1];
              const diff = prev ? Number((entry.weight - prev.weight).toFixed(1)) : null;

              return (
                <div
                  key={entry.id}
                  className="p-3.5 sm:p-4 rounded-[16px] bg-[#15171C] border border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[#1C1F26] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#7C6CFF] shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-semibold text-[#F2F3F5] tabular-nums">
                          {entry.weight} kg
                        </span>
                        {diff !== null && (
                          <span
                            className={`text-[11px] font-medium tabular-nums ${
                              diff > 0 ? 'text-[#F5B84B]' : diff < 0 ? 'text-[#4ADE80]' : 'text-[#6B7280]'
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff} kg
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#9AA1AD]">
                        {new Date(entry.timestamp).toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}
                        {entry.note && ` • "${entry.note}"`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEntry(entry);
                        setEditWeight(String(entry.weight));
                        setEditNote(entry.note || '');
                        const d = new Date(entry.timestamp);
                        setEditDate(d.toISOString().split('T')[0]);
                      }}
                      className="p-2 text-[#9AA1AD] hover:text-[#F2F3F5] rounded-[8px] hover:bg-[#1C1F26] transition cursor-pointer"
                      title="Editar pesagem"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryToDeleteId(entry.id)}
                      className="p-2 text-[#6B7280] hover:text-[#FF6B6B] rounded-[8px] hover:bg-[#1C1F26] transition cursor-pointer"
                      title="Excluir pesagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[20px] p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3">
                <h4 className="text-[16px] font-semibold text-[#F2F3F5]">Editar Pesagem</h4>
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="p-1 text-[#9AA1AD] hover:text-[#F2F3F5]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-[#9AA1AD] block mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="250"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2 text-[14px] text-[#F2F3F5] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#9AA1AD] block mb-1">Data</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2 text-[14px] text-[#F2F3F5] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#9AA1AD] block mb-1">Nota</label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3 py-2 text-[14px] text-[#F2F3F5] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingEntry(null)}
                    className="min-h-[44px] rounded-[12px] bg-[#1C1F26] hover:bg-[#252a35] text-[#9AA1AD] text-[13px] font-medium transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] rounded-[12px] bg-[#7C6CFF] hover:bg-[#8E80FF] text-white text-[13px] font-semibold transition cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IN-APP DELETE MODAL */}
      <AnimatePresence>
        {entryToDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[20px] p-5 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#FF6B6B]/15 text-[#FF6B6B] flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-[#F2F3F5]">Excluir pesagem?</h4>
                <p className="text-[13px] text-[#9AA1AD] mt-1">Este registro será removido do seu histórico de peso.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEntryToDeleteId(null)}
                  className="min-h-[44px] rounded-[12px] bg-[#1C1F26] hover:bg-[#252a35] text-[#9AA1AD] text-[13px] font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteWeight(entryToDeleteId);
                    setEntryToDeleteId(null);
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
