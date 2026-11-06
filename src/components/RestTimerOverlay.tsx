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
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn('AudioContext not supported');
        return;
      }
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
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
      className="fixed bottom-6 right-6 z-50 w-72 bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[20px] shadow-2xl overflow-hidden p-4 text-[#F2F3F5]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7C6CFF] uppercase tracking-wider">
          <Bell className="w-3.5 h-3.5" />
          <span>Descanso Ativo</span>
        </div>
        <button
          id="btn-close-timer"
          onClick={onClose}
          className="text-[#9AA1AD] hover:text-[#F2F3F5] p-1 rounded-[8px] hover:bg-[#1C1F26] transition cursor-pointer"
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
            className="stroke-[#1C1F26] fill-none"
            strokeWidth="6"
          />
          {/* Animated active progress circle */}
          <circle
            cx="56"
            cy="56"
            r="48"
            className="stroke-[#7C6CFF] fill-none transition-all duration-1000 ease-linear"
            strokeWidth="6"
            strokeDasharray={2 * Math.PI * 48}
            strokeDashoffset={2 * Math.PI * 48 * (1 - percentage / 100)}
            strokeLinecap="round"
          />
        </svg>

        {/* Time Text display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold tabular-nums tracking-tight ${timerRemaining === 0 ? 'text-[#FF6B6B] animate-bounce' : 'text-[#F2F3F5]'}`}>
            {formatTime(timerRemaining)}
          </span>
          <span className="text-[11px] text-[#9AA1AD] tabular-nums">
            de {formatTime(timerTotal)}
          </span>
        </div>
      </div>

      {/* Adjust buttons */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          id="btn-adjust-minus"
          onClick={() => onAdjustTime(-15)}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-[#9AA1AD] hover:text-[#F2F3F5] bg-[#1C1F26] hover:bg-[#252a35] rounded-[8px] transition cursor-pointer"
          title="Menos 15 segundos"
        >
          <Minus className="w-3 h-3" /> 15s
        </button>
        <button
          id="btn-adjust-plus"
          onClick={() => onAdjustTime(15)}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-[#9AA1AD] hover:text-[#F2F3F5] bg-[#1C1F26] hover:bg-[#252a35] rounded-[8px] transition cursor-pointer"
          title="Mais 15 segundos"
        >
          <Plus className="w-3 h-3" /> 15s
        </button>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-3">
        <button
          id="btn-reset-timer"
          onClick={onReset}
          className="p-2 text-[#9AA1AD] hover:text-[#F2F3F5] hover:bg-[#1C1F26] rounded-[10px] transition cursor-pointer"
          title="Reiniciar"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          id="btn-toggle-timer"
          onClick={onToggleActive}
          className={`flex-1 mx-3 flex items-center justify-center gap-2 py-2 rounded-[12px] text-[13px] font-medium transition cursor-pointer ${
            isTimerActive
              ? 'bg-[#F5B84B] hover:bg-[#e0a43b] text-slate-950 font-semibold'
              : 'bg-gradient-to-r from-[#7C6CFF] to-[#6A5BF0] hover:from-[#8E80FF] hover:to-[#7C6CFF] text-white shadow-sm shadow-[#7C6CFF]/20'
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
          className="p-2 text-[#9AA1AD] hover:text-[#7C6CFF] hover:bg-[#1C1F26] rounded-[10px] transition cursor-pointer"
          title="Testar Som"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
