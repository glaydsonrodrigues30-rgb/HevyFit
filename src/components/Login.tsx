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
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail
} from 'firebase/auth';
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
  const [loadingReset, setLoadingReset] = useState(false);
  const [resetStatus, setResetStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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

  // Google OAuth via Popup (primary in top window) with Redirect fallback
  const handleGoogleSignIn = async () => {
    setErrorDetails(null);
    setResetStatus(null);
    setLoadingGoogle(true);

    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

    // (2) If running inside an iframe (e.g. AI Studio preview), use redirect fallback directly
    if (isInIframe) {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (error: any) {
        console.error('Google Redirect Error in iframe:', error);
        setLoadingGoogle(false);
        handleAuthError(error, 'google');
      }
      return;
    }

    // (1) In main window (window.self === window.top), use signInWithPopup as primary
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // (5) On popup success, clean local cache and call onLoginSuccess
      if (result && result.user) {
        localStorage.removeItem('hevyfit_local_user');
        localStorage.removeItem('hevyfit_is_guest');
        onLoginSuccess(result.user);
      }
    } catch (error: any) {
      const errorCode = error?.code || '';

      // (3) If user closed the popup or cancelled, silently stop loading without error
      if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/cancelled-popup-request'
      ) {
        setLoadingGoogle(false);
        return;
      }

      // (2) If popup blocked or unsupported, fallback to redirect
      if (
        errorCode === 'auth/popup-blocked' ||
        errorCode === 'auth/operation-not-supported-in-this-environment' ||
        errorCode === 'auth/web-storage-unsupported'
      ) {
        console.warn('Popup blocked or unsupported, falling back to redirect:', errorCode);
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError: any) {
          console.error('Google Redirect fallback error:', redirectError);
          setLoadingGoogle(false);
          handleAuthError(redirectError, 'google');
        }
        return;
      }

      // Other errors (e.g. unauthorized-domain, invalid-credential, etc.)
      console.error('Google Sign-In Error:', error);
      setLoadingGoogle(false);
      handleAuthError(error, 'google');
    }
  };

  // Password reset helper via sendPasswordResetEmail
  const handleForgotPassword = async () => {
    setErrorDetails(null);
    setResetStatus(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setResetStatus({
        type: 'error',
        message: 'Por favor, digite seu e-mail no campo acima para receber o link de redefinição.'
      });
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setResetStatus({
        type: 'error',
        message: 'Por favor, informe um endereço de e-mail válido.'
      });
      return;
    }

    setLoadingReset(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetStatus({
        type: 'success',
        message: 'Enviamos um link de redefinição para o seu e-mail!'
      });
    } catch (error: any) {
      console.warn('Password reset error:', error);
      const errCode = error?.code || '';
      if (errCode === 'auth/user-not-found') {
        setResetStatus({
          type: 'error',
          message: 'Nenhum usuário cadastrado com este e-mail.'
        });
      } else if (errCode === 'auth/invalid-email') {
        setResetStatus({
          type: 'error',
          message: 'E-mail inválido. Verifique o endereço digitado.'
        });
      } else if (errCode === 'auth/too-many-requests') {
        setResetStatus({
          type: 'error',
          message: 'Muitas tentativas. Aguarde alguns instantes e tente novamente.'
        });
      } else {
        setResetStatus({
          type: 'error',
          message: 'Não foi possível enviar o e-mail de redefinição. Verifique o e-mail ou tente novamente mais tarde.'
        });
      }
    } finally {
      setLoadingReset(false);
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
    <div className="min-h-screen bg-[#0E0F13] text-[#F2F3F5] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-[#7C6CFF]/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        id="login-container-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[24px] p-6 sm:p-7 shadow-2xl relative z-10 flex flex-col items-center"
      >
        
        {/* Brand Icon Header */}
        <div className="w-12 h-12 bg-gradient-to-br from-[#7C6CFF] to-[#6A5BF0] rounded-[16px] flex items-center justify-center shadow-lg shadow-[#7C6CFF]/25 mb-3.5">
          <Dumbbell className="w-6 h-6 text-white stroke-[2.2]" />
        </div>

        <div className="text-center space-y-1 mb-5">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#F2F3F5]">
            HevyFit
          </h1>
          <p className="text-[13px] text-[#9AA1AD] max-w-xs mx-auto">
            Treino de musculação &amp; corrida TAF
          </p>
        </div>

        {/* In-screen Visual Warning Banner */}
        <AnimatePresence>
          {errorDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full mb-4 text-left overflow-hidden"
            >
              <div className="w-full p-3.5 bg-[#1C1F26] border border-[#F5B84B]/40 rounded-[16px] text-[12px] text-[#F5B84B] flex flex-col gap-2.5 shadow-lg">
                <div className="flex gap-2 items-start">
                  <ShieldAlert className="w-4 h-4 text-[#F5B84B] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="font-semibold text-[#F5B84B] text-[12px]">
                      {errorDetails.title}
                    </h4>
                    <p className="text-[11px] text-[#9AA1AD] leading-relaxed">
                      {errorDetails.message}
                    </p>
                  </div>
                </div>

                {/* Instructions for Authorized Domains if needed */}
                {errorDetails.isDomainError && (
                  <div className="bg-[#15171C] p-2.5 rounded-[12px] border border-[rgba(255,255,255,0.06)] text-[11px] space-y-2">
                    <div className="text-[#F2F3F5] font-medium flex items-center justify-between">
                      <span>Adicionar domínio no Console:</span>
                      <a
                        href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7C6CFF] hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Abrir Console</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 bg-[#1C1F26] px-2.5 py-1.5 rounded-[8px] border border-[rgba(255,255,255,0.06)]">
                      <span className="font-mono text-[#7C6CFF] text-[10px] break-all select-all flex-1">
                        {currentHostname || 'domínio-atual'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyHostname}
                        className="text-[#9AA1AD] hover:text-[#F2F3F5] p-1 rounded transition"
                        title="Copiar domínio"
                      >
                        {copiedDomain ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {errorDetails.canBypass && (
                  <button
                    id="btn-bypass-local-login"
                    type="button"
                    onClick={() => handleLocalBypass(email)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#7C6CFF] hover:bg-[#8E80FF] text-white rounded-[10px] font-medium text-[12px] transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Continuar via Modo Convidado</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Checking Google Redirect status notification */}
        {checkingRedirect && (
          <div className="w-full mb-3 py-2 px-3 bg-[#1C1F26] rounded-[12px] border border-[rgba(255,255,255,0.06)] text-[12px] text-[#9AA1AD] flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-[#7C6CFF] animate-spin" />
            <span>Verificando retorno do Google...</span>
          </div>
        )}

        {/* PRIMARY GOOGLE SIGN-IN BUTTON */}
        <div className="w-full space-y-3">
          <button
            id="btn-google-sign-in"
            type="button"
            disabled={loadingGoogle || loadingEmail || checkingRedirect}
            onClick={handleGoogleSignIn}
            className={`w-full min-h-[48px] flex items-center justify-center gap-3 px-4 rounded-[14px] font-semibold text-[14px] transition duration-150 border cursor-pointer ${
              loadingGoogle
                ? 'bg-[#1C1F26] text-[#6B7280] border-[rgba(255,255,255,0.06)] cursor-not-allowed'
                : 'bg-white hover:bg-slate-100 text-[#0E0F13] border-transparent shadow-md active:scale-98'
            }`}
          >
            {loadingGoogle ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0E0F13] border-t-transparent rounded-full animate-spin" />
                <span>Conectando com o Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Entrar com o Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-[rgba(255,255,255,0.06)] w-full" />
            <span className="bg-[#15171C] px-3 text-[11px] text-[#6B7280] whitespace-nowrap">
              ou com e-mail e senha
            </span>
            <div className="border-t border-[rgba(255,255,255,0.06)] w-full" />
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="w-full flex rounded-[12px] bg-[#1C1F26] p-1 border border-[rgba(255,255,255,0.06)] mb-3.5">
          <button
            id="tab-login-mode"
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorDetails(null);
              setResetStatus(null);
            }}
            className={`flex-1 py-1.5 rounded-[10px] text-[12px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              !isSignUp
                ? 'bg-[#15171C] text-[#F2F3F5] shadow-sm font-semibold'
                : 'text-[#9AA1AD] hover:text-[#F2F3F5]'
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
              setResetStatus(null);
            }}
            className={`flex-1 py-1.5 rounded-[10px] text-[12px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              isSignUp
                ? 'bg-[#15171C] text-[#F2F3F5] shadow-sm font-semibold'
                : 'text-[#9AA1AD] hover:text-[#F2F3F5]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar Conta</span>
          </button>
        </div>

        {/* Email & Password Authentication Form */}
        <form onSubmit={handleAuthSubmit} className="w-full space-y-3">
          <div className="space-y-1 text-left">
            <label htmlFor="login-email" className="block text-[12px] font-medium text-[#9AA1AD]">
              E-mail
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B7280]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (resetStatus) setResetStatus(null);
                }}
                placeholder="seu.email@exemplo.com"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] text-[13px] text-[#F2F3F5] placeholder-[#6B7280] focus:outline-none focus:border-[#7C6CFF] transition"
              />
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="login-password" className="block text-[12px] font-medium text-[#9AA1AD]">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B7280]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                required
                className="w-full pl-9 pr-9 py-2.5 bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-[12px] text-[13px] text-[#F2F3F5] placeholder-[#6B7280] focus:outline-none focus:border-[#7C6CFF] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B7280] hover:text-[#9AA1AD] transition"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Link Esqueci minha senha */}
            {!isSignUp && (
              <div className="flex justify-end pt-1">
                <button
                  id="btn-forgot-password"
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loadingReset || loadingEmail || loadingGoogle}
                  className="text-[11px] text-[#7C6CFF] hover:underline font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {loadingReset ? 'Enviando link...' : 'Esqueci minha senha'}
                </button>
              </div>
            )}
          </div>

          {/* Feedback de envio de redefinição de senha */}
          <AnimatePresence>
            {!isSignUp && resetStatus && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={`p-2.5 rounded-[12px] text-[12px] border flex items-start gap-2 text-left ${
                  resetStatus.type === 'success'
                    ? 'bg-[#4ADE80]/15 border-[#4ADE80]/30 text-[#4ADE80]'
                    : 'bg-[#F5B84B]/15 border-[#F5B84B]/30 text-[#F5B84B]'
                }`}
              >
                {resetStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span className="leading-snug">{resetStatus.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            id="btn-email-submit"
            type="submit"
            disabled={loadingEmail || loadingGoogle}
            className={`w-full min-h-[48px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-[14px] font-semibold text-[14px] transition duration-150 shadow-md shadow-[#7C6CFF]/20 cursor-pointer ${
              loadingEmail
                ? 'bg-[#1C1F26] text-[#6B7280] cursor-not-allowed'
                : 'bg-gradient-to-r from-[#7C6CFF] to-[#6A5BF0] hover:from-[#8E80FF] hover:to-[#7C6CFF] text-white active:scale-98'
            }`}
          >
            {loadingEmail ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

        {/* Fallback / Modo Convidado como link secundário */}
        <div className="w-full mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)] text-center space-y-2">
          <button
            id="btn-offline-mode"
            type="button"
            disabled={loadingEmail || loadingGoogle}
            onClick={onContinueOffline}
            className="w-full py-2 text-[#9AA1AD] hover:text-[#F2F3F5] text-[13px] font-medium transition cursor-pointer"
          >
            Continuar como Convidado (Modo Offline)
          </button>
        </div>

      </motion.div>
    </div>
  );
}
