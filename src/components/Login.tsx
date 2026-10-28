import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Sparkles,
  Activity,
  Clock,
  Award,
  ShieldAlert,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  CheckCircle2,
  WifiOff,
  ExternalLink,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithGoogleRedirect,
  signInWithEmail,
  signUpWithEmail
} from '../lib/firebase';
import { getRedirectResult, signInWithRedirect } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { motion, AnimatePresence } from 'motion/react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onContinueOffline: () => void;
}

export default function Login({ onLoginSuccess, onContinueOffline }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [checkingRedirect, setCheckingRedirect] = useState(true);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const [errorDetails, setErrorDetails] = useState<{
    code?: string;
    title: string;
    message: string;
    isDomainError?: boolean;
    canBypass?: boolean;
  } | null>(null);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  // Process Google OAuth Redirect Return
  useEffect(() => {
    let isMounted = true;

    getRedirectResult(auth)
      .then((result) => {
        if (!isMounted) return;
        if (result && result.user) {
          localStorage.removeItem('hevyfit_local_user');
          localStorage.removeItem('hevyfit_is_guest');
          onLoginSuccess(result.user);
        }
      })
      .catch((error: any) => {
        if (!isMounted) return;
        console.warn('Google Redirect Auth Result Error:', error);
        handleAuthError(error, 'google');
      })
      .finally(() => {
        if (isMounted) {
          setCheckingRedirect(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [onLoginSuccess]);

  // Handler for mapping auth errors to friendly user instructions
  const handleAuthError = (error: any, origin: 'google' | 'email') => {
    const errCode = error?.code || '';
    const rawMsg = error?.message || String(error);

    if (errCode === 'auth/unauthorized-domain') {
      setErrorDetails({
        code: errCode,
        title: 'Domínio Não Autorizado no Firebase',
        message: `O domínio atual desta aplicação (${currentHostname}) precisa ser adicionado na lista de "Domínios Autorizados" nas configurações do Firebase Authentication para permitir o Google OAuth.`,
        isDomainError: true,
        canBypass: true
      });
      return;
    }

    if (errCode === 'auth/invalid-credential') {
      setErrorDetails({
        code: errCode,
        title: 'Credencial Inválida ou Expirada',
        message: origin === 'google'
          ? 'A solicitação OAuth do Google não foi autorizada. Verifique se o domínio de preview está autorizado no Firebase Console ou use o login por e-mail.'
          : 'E-mail ou senha incorretos. Verifique suas credenciais ou crie uma nova conta.',
        isDomainError: origin === 'google',
        canBypass: true
      });
      return;
    }

    if (errCode === 'auth/operation-not-allowed') {
      setErrorDetails({
        code: errCode,
        title: 'Provedor Desativado no Firebase',
        message: origin === 'google'
          ? 'O provedor de login do Google não está ativado no Firebase Authentication. Ative-o na aba "Sign-in method".'
          : 'O login por E-mail/Senha não está ativado no Firebase Authentication.',
        isDomainError: false,
        canBypass: true
      });
      return;
    }

    if (errCode === 'auth/wrong-password') {
      setErrorDetails({
        code: errCode,
        title: 'Senha Incorreta',
        message: 'A senha informada está incorreta para este e-mail.',
        canBypass: true
      });
      return;
    }

    if (errCode === 'auth/user-not-found') {
      setErrorDetails({
        code: errCode,
        title: 'Usuário Não Encontrado',
        message: 'Nenhum usuário cadastrado com este e-mail. Clique na aba "Criar Conta" ou use o bypass local.',
        canBypass: true
      });
      return;
    }

    if (errCode === 'auth/email-already-in-use') {
      setErrorDetails({
        code: errCode,
        title: 'E-mail Já Cadastrado',
        message: 'Este e-mail já possui conta. Alterne para a aba "Entrar" e informe sua senha.',
        canBypass: true
      });
      return;
    }

    if (errCode === 'auth/network-request-failed') {
      setErrorDetails({
        code: errCode,
        title: 'Falha de Conexão',
        message: 'Não foi possível conectar aos servidores do Firebase. Acesse pelo Modo Local ou Convidado.',
        canBypass: true
      });
      return;
    }

    // Generic friendly message
    setErrorDetails({
      code: errCode,
      title: 'Aviso de Autenticação',
      message: origin === 'google'
        ? `Falha ao processar login com Google (${errCode || rawMsg}). Se estiver em ambiente de teste, autorize o domínio no Firebase Console.`
        : `Erro ao autenticar (${errCode || rawMsg}).`,
      isDomainError: origin === 'google' && (rawMsg.includes('domain') || errCode.includes('domain')),
      canBypass: true
    });
  };

  // Google OAuth via Redirect (no popups)
  const handleGoogleRedirect = async () => {
    setErrorDetails(null);
    setLoadingGoogle(true);
    try {
      // Direct redirect without popup
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      console.error('Failed to trigger Google redirect:', error);
      setLoadingGoogle(false);
      handleAuthError(error, 'google');
    }
  };

  // Local bypass helper: validates credentials locally and opens Dashboard directly
  const handleLocalBypass = (targetEmail?: string) => {
    const cleanEmail = (targetEmail || email).trim() || 'atleta@hevyfit.app';
    const localUser = {
      uid: 'local_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'guest_user',
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0],
      isLocal: true
    };
    localStorage.setItem('hevyfit_local_user', JSON.stringify(localUser));
    localStorage.removeItem('hevyfit_is_guest');
    onLoginSuccess(localUser);
  };

  // Standard Email & Password Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetails(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorDetails({
        title: 'Formato Inválido',
        message: 'Por favor, insira um e-mail válido (ex: seuemail@dominio.com).',
        canBypass: false
      });
      return;
    }

    if (!password || password.length < 6) {
      setErrorDetails({
        title: 'Senha Curta',
        message: 'A senha deve conter no mínimo 6 caracteres.',
        canBypass: false
      });
      return;
    }

    setLoadingEmail(true);
    try {
      let user;
      if (isSignUp) {
        user = await signUpWithEmail(cleanEmail, password);
      } else {
        user = await signInWithEmail(cleanEmail, password);
      }

      if (user) {
        localStorage.removeItem('hevyfit_local_user');
        localStorage.removeItem('hevyfit_is_guest');
        onLoginSuccess(user);
      } else {
        handleLocalBypass(cleanEmail);
      }
    } catch (error: any) {
      console.warn('Email Auth attempt failed:', error);
      handleAuthError(error, 'email');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleCopyHostname = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
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
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-slate-900 border border-slate-850/80 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 flex flex-col items-center"
      >
        
        {/* Animated Brand Header */}
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          className="w-14 h-14 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-lime-500/10 mb-4 border border-lime-400/20"
        >
          <Dumbbell className="w-7 h-7 text-slate-950 stroke-[2.5]" />
        </motion.div>

        <div className="text-center space-y-1 mb-6">
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-lime-400" />
            <span className="text-[10px] text-lime-400 font-bold uppercase tracking-widest font-mono">HevyFit Ecosystem</span>
            <Sparkles className="w-3.5 h-3.5 text-lime-400" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-widest text-white font-mono">
            HEVY<span className="text-lime-400 font-sans">FIT</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            Acesso ao Diário de Treino & Progressão
          </p>
        </div>

        {/* Feature Highlights Pill */}
        <div className="w-full grid grid-cols-3 gap-2 mb-6 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850/50 text-center">
          <div className="flex flex-col items-center gap-1 p-1">
            <Clock className="w-4 h-4 text-lime-400" />
            <span className="text-[10px] font-bold text-slate-300">Timers</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-1 border-x border-slate-800/60">
            <Activity className="w-4 h-4 text-sky-400" />
            <span className="text-[10px] font-bold text-slate-300">Cargas</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-1">
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-slate-300">Histórico</span>
          </div>
        </div>

        {/* In-screen Visual Warning Banner */}
        <AnimatePresence>
          {errorDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full mb-5 text-left overflow-hidden"
            >
              <div className="w-full p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl text-xs text-amber-200 flex flex-col gap-3 shadow-lg">
                <div className="flex gap-2.5 items-start">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-amber-300 text-[11px] uppercase tracking-wider">
                      {errorDetails.title}
                    </h4>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      {errorDetails.message}
                    </p>
                  </div>
                </div>

                {/* Instructions for Authorized Domains if needed */}
                {errorDetails.isDomainError && (
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/30 text-[11px] space-y-2">
                    <div className="text-slate-300 font-semibold flex items-center justify-between">
                      <span>Como resolver no Firebase Console:</span>
                      <a
                        href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lime-400 hover:text-lime-300 underline inline-flex items-center gap-1 text-[10px]"
                      >
                        <span>Abrir Console</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <ol className="list-decimal list-inside text-slate-400 space-y-1 text-[10.5px]">
                      <li>Acesse <strong>Authentication &gt; Configurações</strong>.</li>
                      <li>Localize a seção <strong>Domínios Autorizados</strong>.</li>
                      <li>Clique em <strong>Adicionar domínio</strong> e cole:</li>
                    </ol>
                    <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-700">
                      <span className="font-mono text-lime-400 text-[10px] break-all select-all flex-1">
                        {currentHostname || 'domínio-atual'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyHostname}
                        className="text-slate-400 hover:text-white p-1 rounded transition"
                        title="Copiar domínio"
                      >
                        {copiedDomain ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {errorDetails.canBypass && (
                  <button
                    id="btn-bypass-local-login"
                    type="button"
                    onClick={() => handleLocalBypass(email)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-lime-500 hover:bg-lime-400 text-slate-950 rounded-xl font-bold text-xs transition shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Continuar via Modo Convidado / Bypass Local</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Checking Google Redirect status notification */}
        {checkingRedirect && (
          <div className="w-full mb-4 py-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-lime-400 animate-spin" />
            <span>Verificando retorno do Google...</span>
          </div>
        )}

        {/* PRIMARY GOOGLE SIGN-IN BUTTON (VIA REDIRECT - NO POPUP) */}
        <div className="w-full space-y-3">
          <button
            id="btn-google-sign-in"
            type="button"
            disabled={loadingGoogle || loadingEmail || checkingRedirect}
            onClick={handleGoogleRedirect}
            className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl font-bold text-xs transition-all duration-200 border ${
              loadingGoogle
                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-200 shadow-lg hover:shadow-xl active:scale-[0.99]'
            }`}
          >
            {loadingGoogle ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Redirecionando para o Google...</span>
              </>
            ) : (
              <>
                {/* Official Google Vector Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Entrar com o Google</span>
              </>
            )}
          </button>

          {/* Divider between Google and Email Form */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold tracking-widest text-slate-500 whitespace-nowrap">
              ou acesse com e-mail e senha
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>
        </div>

        {/* Mode Switcher Tabs: Entrar vs Cadastrar */}
        <div className="w-full flex rounded-xl bg-slate-950/60 p-1 border border-slate-800 mb-4">
          <button
            id="tab-login-mode"
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorDetails(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              !isSignUp
                ? 'bg-lime-500 text-slate-950 shadow-md shadow-lime-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
          <button
            id="tab-signup-mode"
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorDetails(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              isSignUp
                ? 'bg-lime-500 text-slate-950 shadow-md shadow-lime-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar Conta</span>
          </button>
        </div>

        {/* Email & Password Authentication Form */}
        <form onSubmit={handleAuthSubmit} className="w-full space-y-3">
          <div className="space-y-1 text-left">
            <label htmlFor="login-email" className="block text-[11px] font-semibold text-slate-300">
              E-mail
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
                className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-400 transition"
              />
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="login-password" className="block text-[11px] font-semibold text-slate-300">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                required
                className="w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Primary Form Submit Button */}
          <button
            id="btn-email-submit"
            type="submit"
            disabled={loadingEmail || loadingGoogle}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition duration-150 shadow-md ${
              loadingEmail
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-lime-500 hover:bg-lime-400 text-slate-950 hover:shadow-lime-500/20 active:scale-[0.99]'
            }`}
          >
            {loadingEmail ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                <span>{isSignUp ? 'Cadastrar e Acessar' : 'Entrar com E-mail e Senha'}</span>
              </>
            )}
          </button>
        </form>

        {/* Fallback / Modo Convidado Actions */}
        <div className="w-full mt-4 pt-3.5 border-t border-slate-850 space-y-2">
          <button
            id="btn-local-quick-access"
            type="button"
            disabled={loadingEmail || loadingGoogle}
            onClick={() => handleLocalBypass(email)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition border border-slate-800"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
            <span>Validar Acesso Localmente (Bypass Imediato)</span>
          </button>

          <button
            id="btn-offline-mode"
            type="button"
            disabled={loadingEmail || loadingGoogle}
            onClick={onContinueOffline}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 hover:bg-slate-950 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition border border-dashed border-slate-800 hover:border-slate-700"
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Ver Modo Convidado / Offline</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        {/* Footer info lock */}
        <div className="mt-4 text-[10px] text-slate-500 font-medium">
          Sistema protegido por Firebase Auth e Firestore.
        </div>

      </motion.div>
    </div>
  );
}
