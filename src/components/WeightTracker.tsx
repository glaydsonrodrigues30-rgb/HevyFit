/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Scale, Plus, Calendar, Trash2, TrendingDown, RefreshCw, Edit2, X } from 'lucide-react';
import { WeightEntry } from '../types';

interface WeightTrackerProps {
  weightHistory: WeightEntry[];
  onAddWeight: (weight: number, note: string, timestamp?: number) => void;
  onUpdateWeight: (id: string, weight: number, note: string, timestamp: number) => void;
  onDeleteWeight: (id: string) => void;
  goalWeight: number | null | undefined;
}

export default function WeightTracker({
  weightHistory,
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

  const timestampToDateString = (ts: number) => {
    const d = new Date(ts);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [newWeight, setNewWeight] = useState('');
  const [note, setNote] = useState('');
  const [customDate, setCustomDate] = useState(getTodayString());

  // Edit logic states
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = parseFloat(newWeight);
    if (!isNaN(weightVal) && weightVal > 0) {
      const parsedDate = new Date(customDate + 'T12:00:00');
      onAddWeight(weightVal, note, parsedDate.getTime());
      setNewWeight('');
      setNote('');
      setCustomDate(getTodayString());
    }
  };

  const handleEditClick = (entry: WeightEntry) => {
    setEditingEntry(entry);
    setEditWeight(entry.weight.toString());
    setEditNote(entry.note || '');
    setEditDate(timestampToDateString(entry.timestamp));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const weightVal = parseFloat(editWeight);
    if (!isNaN(weightVal) && weightVal > 0 && editDate) {
      const parsedDate = new Date(editDate + 'T12:00:00');
      onUpdateWeight(editingEntry.id, weightVal, editNote, parsedDate.getTime());
      setEditingEntry(null);
    }
  };

  // Stats
  const latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : null;
  const initialWeight = weightHistory.length > 0 ? weightHistory[0].weight : null;
  const weightChange = latestWeight && initialWeight ? latestWeight - initialWeight : 0;
  
  // Weights array
  const weights = weightHistory.map(w => w.weight);
  const minWeightOccurred = weights.length > 0 ? Math.min(...weights) : 0;
  const maxWeightOccurred = weights.length > 0 ? Math.max(...weights) : 0;

  // Render a lovely SVG trends chart of bodyweight
  const renderTrendsSVG = () => {
    if (weightHistory.length < 2) {
      return (
        <div className="h-44 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-xl border border-slate-850 text-center">
          <Scale className="w-8 h-8 text-rose-500/40 mb-2" />
          <span className="text-xs text-slate-400 font-semibold">Logs ou Histórico de peso reduzido</span>
          <span className="text-[10px] text-slate-500 mt-1 max-w-xs">Adicione pelo menos 2 registros de peso em dias diferentes para podermos estimar o gráfico de tendências de peso corporal.</span>
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // We sort chronological entries
    const sortedEntries = [...weightHistory].sort((a,b) => a.timestamp - b.timestamp);

    const minWeight = Math.min(...weights) - 1;
    const maxWeight = Math.max(...weights) + 1;
    const rangeWeight = maxWeight - minWeight === 0 ? 1 : maxWeight - minWeight;

    const minTime = sortedEntries[0].timestamp;
    const maxTime = sortedEntries[sortedEntries.length - 1].timestamp;
    const rangeTime = maxTime - minTime === 0 ? 1 : maxTime - minTime;

    // Plot coordinates
    const coords = sortedEntries.map((entry) => {
      const x = paddingLeft + ((entry.timestamp - minTime) / rangeTime) * chartWidth;
      const y = paddingTop + chartHeight - ((entry.weight - minWeight) / rangeWeight) * chartHeight;
      return {
        x,
        y,
        weight: entry.weight,
        dateStr: new Date(entry.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      };
    });

    let lineD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      lineD += ` L ${coords[i].x} ${coords[i].y}`;
    }

    const fillD = `${lineD} L ${coords[coords.length - 1].x} ${height - paddingBottom} L ${coords[0].x} ${height - paddingBottom} Z`;

    return (
      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Curva de Variação de Peso Corporal (kg)</span>
          {goalWeight && (
            <span className="text-[10px] text-rose-450 font-semibold font-mono">
              Meta de Peso: {goalWeight} kg
            </span>
          )}
        </div>

        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="weight-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid line levels */}
            {[0, 0.5, 1].map((val, idx) => {
              const yVal = paddingTop + val * chartHeight;
              const lvlWeight = Math.round(maxWeight - val * rangeWeight);
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={yVal}
                    x2={width - paddingRight}
                    y2={yVal}
                    className="stroke-slate-900"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={yVal + 3}
                    className="fill-slate-500 text-[10px] font-mono text-right"
                    textAnchor="end"
                  >
                    {lvlWeight}kg
                  </text>
                </g>
              );
            })}

            {/* Area */}
            <path d={fillD} fill="url(#weight-grad)" />

            {/* Main Weight trend path Line */}
            <path d={lineD} fill="none" className="stroke-rose-500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Target weight line if exists */}
            {goalWeight && goalWeight >= minWeight && goalWeight <= maxWeight && (
              <line
                x1={paddingLeft}
                y1={paddingTop + chartHeight - ((goalWeight - minWeight) / rangeWeight) * chartHeight}
                x2={width - paddingRight}
                y2={paddingTop + chartHeight - ((goalWeight - minWeight) / rangeWeight) * chartHeight}
                className="stroke-amber-500/40"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}

            {/* Circle markers */}
            {coords.map((c, idx) => (
              <g key={idx}>
                {/* Horizontal date labels */}
                {idx === 0 || idx === coords.length - 1 || idx === Math.floor(coords.length / 2) ? (
                  <text
                    x={c.x}
                    y={height - paddingBottom + 16}
                    className="fill-slate-500 text-[9px] font-mono"
                    textAnchor="middle"
                  >
                    {c.dateStr}
                  </text>
                ) : null}

                {/* Weights on markers */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r="3.5"
                  className="fill-rose-500 stroke-slate-950"
                  strokeWidth="1.5"
                />

                <text
                  x={c.x}
                  y={c.y - 8}
                  className="fill-slate-400 text-[9px] font-mono"
                  textAnchor="middle"
                >
                  {c.weight}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div id="weight-tracker-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Sidebar logger & stats (5 cols) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Logger widgets */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-rose-450" />
              <h3 className="font-bold text-white text-base">Registrar Peso</h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Medição de Peso (kg)</label>
              <div className="relative">
                <input
                  id="log-input-weight"
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="ex: 78.6"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2 px-3 text-white text-sm outline-none font-mono"
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">kg</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Nota ou Contexto (opcional)</label>
              <input
                id="log-input-weight-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ex: Peso de manhã em jejum"
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2 px-3 text-white text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Data de Registro</label>
              <input
                id="log-input-weight-date"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2 px-3 text-white text-sm outline-none font-mono"
                required
              />
            </div>

            <button
              id="btn-save-weight-tracker"
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 font-bold text-white text-xs transition shadow-lg shadow-rose-500/15"
            >
              Salvar Peso no Diário
            </button>
          </form>
        </div>

        {/* Quick stats summarizing progression */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4">
          <h4 className="font-bold text-white text-sm">Resumo da Balança</h4>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-850">
              <span className="text-slate-400">Peso Inicial:</span>
              <span className="font-mono text-white font-bold">{initialWeight ? `${initialWeight.toFixed(1)} kg` : '--'}</span>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-850">
              <span className="text-slate-400">Peso Atual:</span>
              <span className="font-mono text-white font-bold">{latestWeight ? `${latestWeight.toFixed(1)} kg` : '--'}</span>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-850">
              <span className="text-slate-400">Variação Líquida:</span>
              <span className={`font-mono font-bold ${weightChange < 0 ? 'text-emerald-400' : weightChange > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {weightChange > 0 ? `+${weightChange.toFixed(1)}` : `${weightChange.toFixed(1)}`} kg
              </span>
            </div>

            {goalWeight ? (
              <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-slate-400">Meta do Ciclo:</span>
                <span className="font-mono text-lime-400 font-bold">{goalWeight.toFixed(1)} kg</span>
              </div>
            ) : null}
          </div>
        </div>

      </div>

      {/* Main timeline graph & entries list (8 cols) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Trend line widget */}
        {renderTrendsSVG()}

        {/* Logs weight list history */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-850">
            <h4 className="font-bold text-white text-sm">Diário Completo de Pesagem</h4>
            <span className="text-xs text-slate-500 font-mono">{weightHistory.length} registros</span>
          </div>

          {weightHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 italic bg-slate-950 rounded-xl">
              Nenhum registro de peso inserido na conta. Use o formulário à esquerda para adicionar primeiro.
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {[...weightHistory].reverse().map((entry) => (
                <div
                  key={entry.id}
                  className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-between hover:bg-slate-900/40 transition text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-450 shrink-0 font-bold font-mono">
                      ⚖️
                    </div>
                    <div>
                      <span className="font-bold text-white block text-sm font-mono">{entry.weight?.toFixed(1)} kg</span>
                      <span className="text-slate-500 text-[10px] block mt-0.5">
                        {entry.note || 'Sem observações'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(entry.timestamp).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
                    </div>

                    <button
                      id={`btn-edit-weight-${entry.id}`}
                      onClick={() => handleEditClick(entry)}
                      className="text-slate-600 hover:text-amber-400 p-1.5 hover:bg-slate-900 rounded transition"
                      title="Editar medição"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      id={`btn-delete-weight-${entry.id}`}
                      onClick={() => onDeleteWeight(entry.id)}
                      className="text-slate-600 hover:text-red-400 p-1.5 hover:bg-slate-900 rounded transition"
                      title="Excluir medição"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div
            id="edit-weight-modal"
            className="bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-white space-y-4 font-sans animate-none"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-white text-base">Editar Registro de Peso</h3>
              </div>
              <button
                id="btn-close-edit-weight"
                onClick={() => setEditingEntry(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition animate-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Medição de Peso (kg)</label>
                <div className="relative">
                  <input
                    id="edit-input-weight"
                    type="number"
                    step="0.1"
                    min="30"
                    max="250"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3 text-white text-sm outline-none font-mono"
                    required
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">kg</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Nota ou Contexto (opcional)</label>
                <input
                  id="edit-input-weight-note"
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3 text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Data de Registro</label>
                <input
                  id="edit-input-weight-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3 text-white text-sm outline-none font-mono"
                  required
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-850">
                <button
                  id="btn-cancel-edit-weight"
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-slate-300 hover:text-white transition font-semibold text-center"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-edit-weight"
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 font-bold text-white transition text-center"
                >
                  Confirmar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
