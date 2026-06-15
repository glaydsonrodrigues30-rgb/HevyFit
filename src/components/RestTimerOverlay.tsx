/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Plus, Minus, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RestTimerProps {
  timerRemaining: number;
  timerTotal: number;
  isTimerActive: boolean;
  onClose: () => void;
  onToggleActive: () => void;
  onReset: () => void;
  onAdjustTime: (seconds: number) => void;
}

export default function RestTimerOverlay({
  timerRemaining,
  timerTotal,
  isTimerActive,
  onClose,
  onToggleActive,
  onReset,
  onAdjustTime
}: RestTimerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sound notification when timer finishes
  const playAlertSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // high note (A5)
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.15); // slide up
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio feedback failed or not supported in this frame:', e);
    }
  };

  useEffect(() => {
    if (timerRemaining === 0 && isTimerActive) {
      playAlertSound();
    }
  }, [timerRemaining, isTimerActive]);

  const percentage = timerTotal > 0 ? (timerRemaining / timerTotal) * 100 : 0;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      id="rest-timer-overlay"
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-4 text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-lime-400 uppercase tracking-widest">
          <Bell className="w-3.5 h-3.5 animate-pulse" />
          <span>Descanso Ativo</span>
        </div>
        <button
          id="btn-close-timer"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Circle / Time Remaining */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <svg className="w-28 h-28 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="56"
            cy="56"
            r="48"
            className="stroke-slate-800 fill-none"
            strokeWidth="6"
          />
          {/* Animated active progress circle */}
          <circle
            cx="56"
            cy="56"
            r="48"
            className="stroke-lime-500 fill-none transition-all duration-1000 ease-linear"
            strokeWidth="6"
            strokeDasharray={2 * Math.PI * 48}
            strokeDashoffset={2 * Math.PI * 48 * (1 - percentage / 100)}
            strokeLinecap="round"
          />
        </svg>

        {/* Time Text display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold font-mono tracking-tight ${timerRemaining === 0 ? 'text-red-400 animate-bounce' : 'text-white'}`}>
            {formatTime(timerRemaining)}
          </span>
          <span className="text-[10px] text-slate-400">
            de {formatTime(timerTotal)}
          </span>
        </div>
      </div>

      {/* Adjust buttons */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          id="btn-adjust-minus"
          onClick={() => onAdjustTime(-15)}
          className="flex items-center gap-0.5 px-2 py-1 text-xs text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          title="Menos 15 segundos"
        >
          <Minus className="w-3 h-3" /> 15s
        </button>
        <button
          id="btn-adjust-plus"
          onClick={() => onAdjustTime(15)}
          className="flex items-center gap-0.5 px-2 py-1 text-xs text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          title="Mais 15 segundos"
        >
          <Plus className="w-3 h-3" /> 15s
        </button>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between border-t border-slate-850 pt-3">
        <button
          id="btn-reset-timer"
          onClick={onReset}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          title="Reiniciar"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          id="btn-toggle-timer"
          onClick={onToggleActive}
          className={`flex-1 mx-3 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition ${
            isTimerActive ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' : 'bg-lime-500 hover:bg-lime-600 text-slate-950'
          }`}
        >
          {isTimerActive ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pausar</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar</span>
            </>
          )}
        </button>

        <button
          id="btn-test-sound"
          onClick={playAlertSound}
          className="p-2 text-slate-400 hover:text-lime-400 hover:bg-slate-800 rounded-xl transition"
          title="Testar Som"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
