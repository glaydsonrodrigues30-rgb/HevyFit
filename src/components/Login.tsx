import React, { useState } from 'react';
import { Dumbbell, Sparkles, Activity, Clock, Award, ShieldAlert, ArrowRight } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onContinueOffline: () => void;
}

export default function Login({ onLoginSuccess, onContinueOffline }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onLoginSuccess(user);
      } else {
        setErrorMsg('Não foi possível obter os dados do usuário do Google.');
      }
    } catch (error: any) {
      console.error(error);
      if (error && error.code === 'auth/popup-blocked') {
        setErrorMsg('O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site.');
      } else {
        setErrorMsg('Ocorreu um erro ao fazer login com o Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-lime-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        id="login-container-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-slate-900 border border-slate-850/80 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 flex flex-col items-center"
      >
        
        {/* Animated Brand Header */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          className="w-16 h-16 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-lime-500/10 mb-5 border border-lime-400/20"
        >
          <Dumbbell className="w-8 h-8 text-slate-950 stroke-[2.5]" />
        </motion.div>

        <div className="text-center space-y-1.5 mb-8">
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-lime-400" />
            <span className="text-[10px] md:text-xs text-lime-400 font-bold uppercase tracking-widest font-mono">HevyFit Ecosystem</span>
            <Sparkles className="w-4 h-4 text-lime-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-widest text-white font-mono">
            HEVY<span className="text-lime-400 font-sans">FIT</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            O diário de treino definitivo para quem busca progressão constante e alta performance.
          </p>
        </div>

        {/* Feature List (Highlighting key capabilities including the user's requested features) */}
        <div className="w-full space-y-3.5 mb-8 bg-slate-950/40 p-4 rounded-2xl border border-slate-850/50">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-lime-500/10 flex items-center justify-center text-lime-400 shrink-0 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">Timers de Descanso por Exercício</h3>
              <p className="text-[11px] text-slate-400 leading-normal">Defina e monitore tempos de descanso automáticos personalizados para cada movimento.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">Modo Progressão & Dicas</h3>
              <p className="text-[11px] text-slate-400 leading-normal">Adicione metas de progressão e observações específicas livres direto em suas rotinas.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Award className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">Sincronização em Nuvem Direta</h3>
              <p className="text-[11px] text-slate-400 leading-normal">Salve suas rotinas, histórico de peso e logs em tempo real na nuvem do Google.</p>
            </div>
          </div>
        </div>

        {/* Error Message banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full mb-5 text-left p-3.5 bg-red-950/35 border border-red-900/30 rounded-xl text-xs text-red-300 flex gap-2.5 items-start"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="w-full space-y-3.5">
          <button
            id="btn-google-sign-in"
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className={`w-full flex items-center justify-center gap-3 py-3 px-5 rounded-2xl font-bold font-sans text-xs transition duration-200 shadow-md ${
              loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-white hover:bg-slate-100 text-slate-900 hover:scale-[1.02] active:scale-95'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-500 border-t-slate-700 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.5 1.635l2.437-2.435C17.37 1.625 14.935 1 12.24 1 6.58 1 2 5.58 2 11s4.58 10 10.24 10c5.918 0 9.873-4.164 9.873-10 0-.61-.054-1.2-.16-1.715H12.24z"
                />
              </svg>
            )}
            <span>{loading ? 'Acessando conta...' : 'Entrar com o Google'}</span>
          </button>

          <button
            id="btn-offline-mode"
            type="button"
            disabled={loading}
            onClick={onContinueOffline}
            className="w-full flex items-center justify-center gap-1.5 py-3 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-2xl text-xs font-bold transition active:scale-95 border border-dashed border-slate-800 hover:border-slate-700"
          >
            <span>Ver Modo Convidado / Offline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Footer info lock */}
        <div className="mt-8 text-[10px] text-slate-500 font-medium">
          Privacidade assegurada com a criptografia oficial Google Firebase.
        </div>

      </motion.div>
    </div>
  );
}
