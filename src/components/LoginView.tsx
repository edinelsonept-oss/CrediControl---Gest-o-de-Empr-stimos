import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  UserPlus,
  Phone,
  FileText,
  MapPin,
  Building,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserPopupRedirectResolver,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { UserRole, EmployeeUser } from '../types';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { EmployeeStatusModal } from './EmployeeStatusModal';
import { GoogleComplementaryModal } from './GoogleComplementaryModal';
import { logAuditEvent } from '../utils/auditLogger';
import { ADMIN_EMAIL } from '../config/env';

export const LoginView: React.FC = () => {
  const {
    loginWithCustomUser,
    setIsAuthenticated,
    employees,
    authenticateEmployee,
    isEmployeeEmailAllowed,
    registerEmployeeApplication,
    employeeNotifications,
    markNotificationAsRead,
    suspendedSessionAlert,
    clearSuspendedSessionAlert,
  } = useApp();

  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state (for Employee self-registration with Email/Password)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('Salinópolis');
  const [regBirthDate, setRegBirthDate] = useState('');

  // Modals & Banners state
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Employee status modal
  const [statusModalEmployee, setStatusModalEmployee] = useState<EmployeeUser | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Google complementary modal
  const [googleModalData, setGoogleModalData] = useState<{
    name: string;
    email: string;
    avatarUrl?: string;
  } | null>(null);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage('');
    setUnauthorizedDomain(null);
    setSuccessBanner(null);
    setEmail('');
    setPassword('');
    setAuthMode('login');
  };

  const showSuccess = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  // 1. Process redirect result if redirected back from Google sign-in
  useEffect(() => {
    getRedirectResult(auth, browserPopupRedirectResolver)
      .then(async (result) => {
        if (!result || !result.user) return;
        const googleUser = result.user;
        const userGoogleEmail = (googleUser.email || '').toLowerCase();

        if (selectedRole === 'admin') {
          if (userGoogleEmail !== ADMIN_EMAIL.toLowerCase()) {
            await auth.signOut();
            setErrorMessage(
              `Acesso negado: O e-mail Google "${userGoogleEmail}" não é o e-mail do Administrador (${ADMIN_EMAIL}).`
            );
            return;
          }

          const adminUser = {
            id: googleUser.uid,
            name: googleUser.displayName || 'Edinelson (Admin)',
            email: ADMIN_EMAIL,
            role: 'admin' as const,
            avatarUrl:
              googleUser.photoURL ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          };
          loginWithCustomUser(adminUser);
          await logAuditEvent(adminUser, 'AUTH_LOGIN', 'auth', ADMIN_EMAIL, {
            method: 'google_redirect',
            role: 'admin',
          });
          setIsAuthenticated(true);
        } else {
          // Employee Check
          const check = isEmployeeEmailAllowed(userGoogleEmail);
          if (!check.allowed) {
            if (check.message === 'PENDING' || check.message === 'DENIED' || check.message === 'SUSPENDED') {
              setStatusModalEmployee(check.employee || null);
              setIsStatusModalOpen(true);
              return;
            }

            // New registration with Google!
            setGoogleModalData({
              name: googleUser.displayName || 'Colaborador',
              email: userGoogleEmail,
              avatarUrl: googleUser.photoURL || undefined,
            });
            return;
          }

          const emp = check.employee!;
          const empUser = {
            id: emp.id,
            name: emp.name,
            email: emp.email,
            role: 'employee' as const,
            roleTitle: emp.roleTitle,
            avatarUrl:
              googleUser.photoURL ||
              emp.avatarUrl ||
              'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
          };
          loginWithCustomUser(empUser);
          await logAuditEvent(empUser, 'AUTH_LOGIN', 'auth', emp.email, {
            method: 'google_redirect',
            role: 'employee',
          });
          setIsAuthenticated(true);
        }
      })
      .catch((err) => {
        console.warn('Google redirect result check note:', err);
      });
  }, [selectedRole]);

  // 2. Handle Email Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanEmailLower = cleanEmail.toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage('Preencha seu e-mail e senha de acesso.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessBanner(null);

    try {
      // Administrator Login Verification
      if (selectedRole === 'admin') {
        if (cleanEmailLower !== ADMIN_EMAIL.toLowerCase()) {
          setErrorMessage(`Acesso negado: O e-mail "${cleanEmail}" não possui autorização de Administrador principal.`);
          setIsLoading(false);
          return;
        }

        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
        } catch (fbErr: any) {
          const fbCode = fbErr?.code || '';
          if (fbCode === 'auth/wrong-password' || fbCode === 'auth/invalid-credential') {
            setErrorMessage('Senha incorreta para o administrador principal.');
          } else if (fbCode === 'auth/user-not-found') {
            setErrorMessage('Conta de administrador não encontrada no Firebase Authentication. Cadastre-a no Firebase Console ou utilize a recuperação de senha.');
          } else if (fbCode === 'auth/user-disabled') {
            setErrorMessage('Esta conta de administrador foi desativada no Firebase Authentication.');
          } else if (fbCode === 'auth/too-many-requests') {
            setErrorMessage('Muitas tentativas malsucedidas de acesso. Aguarde alguns minutos ou redefina sua senha.');
          } else if (fbCode === 'auth/network-request-failed') {
            setErrorMessage('Falha de conexão com os servidores de autenticação do Firebase. Verifique sua rede.');
          } else {
            setErrorMessage(fbErr?.message || 'Falha de autenticação no Firebase.');
          }
          setIsLoading(false);
          return;
        }

        const fbUser = userCredential.user;
        const adminUser = {
          id: fbUser.uid,
          name: fbUser.displayName || 'Edinelson (Admin)',
          email: ADMIN_EMAIL,
          role: 'admin' as const,
          avatarUrl:
            fbUser.photoURL ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        };

        loginWithCustomUser(adminUser);
        await logAuditEvent(adminUser, 'AUTH_LOGIN', 'auth', ADMIN_EMAIL, {
          method: 'email_password',
          role: 'admin',
        });
        setIsAuthenticated(true);
        return;
      }

      // Employee Login Verification with Status Check (Requirement 7)
      const authResult = authenticateEmployee(cleanEmail, password);

      if (!authResult.success) {
        if (authResult.message === 'PENDING') {
          setStatusModalEmployee(authResult.employee || null);
          setIsStatusModalOpen(true);
          setIsLoading(false);
          return;
        }

        if (authResult.message === 'DENIED') {
          setStatusModalEmployee(authResult.employee || null);
          setIsStatusModalOpen(true);
          setIsLoading(false);
          return;
        }

        if (authResult.message === 'SUSPENDED') {
          setStatusModalEmployee(authResult.employee || null);
          setIsStatusModalOpen(true);
          setIsLoading(false);
          return;
        }

        setErrorMessage(
          authResult.message || 'Credenciais de funcionário inválidas.'
        );
        setIsLoading(false);
        return;
      }

      // Status is APROVADO! Liberar acesso e exibir mensagem de autorização (Requirement 7)
      if (authResult.user) {
        loginWithCustomUser(authResult.user);
        await logAuditEvent(authResult.user, 'AUTH_LOGIN', 'auth', cleanEmail, {
          method: 'employee_credentials',
          role: 'employee',
        });
        showSuccess('Bem-vindo ao CrediControl! Seu acesso está autorizado.');
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Employee Self-Registration (E-mail and Senha)
  const handleEmployeeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPassword = regPassword.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      setErrorMessage('Preencha seu nome completo, e-mail e senha.');
      return;
    }

    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      setErrorMessage(`O e-mail ${ADMIN_EMAIL} é reservado ao Administrador.`);
      return;
    }

    if (cleanPassword.length < 4) {
      setErrorMessage('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerEmployeeApplication({
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        phone: regPhone.trim() || 'Não informado',
        cpf: regCpf.trim() || 'Não informado',
        address: regAddress.trim() || 'Não informado',
        city: regCity.trim() || 'Salinópolis',
        birthDate: regBirthDate.trim() || 'Não informado',
        registrationMethod: 'email_password',
      });

      if (!res.success) {
        setErrorMessage(res.message);
        setIsLoading(false);
        return;
      }

      setStatusModalEmployee(res.employee);
      setIsStatusModalOpen(true);
      setAuthMode('login');
      setEmail(cleanEmail);
      setPassword('');
      showSuccess('Solicitação de cadastro enviada com sucesso! Aguardando aprovação do administrador.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao registrar cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle Google Login & Registration
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessBanner(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
      });

      let result;
      try {
        result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      } catch (popupErr: any) {
        const popupCode = popupErr?.code || '';
        if (
          popupCode === 'auth/popup-blocked' ||
          popupCode === 'auth/operation-not-supported-in-this-environment'
        ) {
          console.info('Tentando fallback para signInWithRedirect...');
          await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
          return;
        }
        throw popupErr;
      }

      const googleUser = result.user;
      const userGoogleEmail = (googleUser.email || '').toLowerCase();

      // Administrator
      if (selectedRole === 'admin') {
        if (userGoogleEmail && userGoogleEmail !== ADMIN_EMAIL.toLowerCase()) {
          await auth.signOut();
          setErrorMessage(
            `Acesso negado: O e-mail Google "${userGoogleEmail}" não é o e-mail do Administrador (${ADMIN_EMAIL}).`
          );
          setIsLoading(false);
          return;
        }

        const adminUser = {
          id: googleUser.uid,
          name: googleUser.displayName || 'Edinelson (Admin)',
          email: ADMIN_EMAIL,
          role: 'admin' as const,
          avatarUrl:
            googleUser.photoURL ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        };

        loginWithCustomUser(adminUser);
        await logAuditEvent(adminUser, 'AUTH_LOGIN', 'auth', ADMIN_EMAIL, {
          method: 'google_popup',
          role: 'admin',
        });
        setIsAuthenticated(true);
        return;
      }

      // Employee Mode
      const check = isEmployeeEmailAllowed(userGoogleEmail);

      // Existing employee with non-approved status
      if (!check.allowed) {
        if (check.message === 'PENDING' || check.message === 'DENIED' || check.message === 'SUSPENDED') {
          setStatusModalEmployee(check.employee || null);
          setIsStatusModalOpen(true);
          setIsLoading(false);
          return;
        }

        // New employee registration with Google! Open complementary modal
        setGoogleModalData({
          name: googleUser.displayName || 'Colaborador',
          email: userGoogleEmail,
          avatarUrl: googleUser.photoURL || undefined,
        });
        setIsLoading(false);
        return;
      }

      // Approved Employee
      const emp = check.employee!;
      const empUser = {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: 'employee' as const,
        roleTitle: emp.roleTitle,
        avatarUrl:
          googleUser.photoURL ||
          emp.avatarUrl ||
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
      };
      loginWithCustomUser(empUser);
      await logAuditEvent(empUser, 'AUTH_LOGIN', 'auth', emp.email, {
        method: 'google_popup',
        role: 'employee',
      });
      showSuccess('Bem-vindo ao CrediControl! Seu acesso está autorizado.');
      setIsAuthenticated(true);
    } catch (err: any) {
      console.warn('Google login error notice:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMessage('Autenticação com Google cancelada.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMessage('O pop-up de login foi bloqueado pelo navegador. Autorize pop-ups ou acesse com e-mail e senha.');
      } else if (code === 'auth/unauthorized-domain') {
        const detectedDomain = typeof window !== 'undefined' ? window.location.hostname : '';
        const fallbackDomain = detectedDomain || 'ais-dev-ziroypgzcmdvzmmmdghmie-476116610932.us-east1.run.app';
        setUnauthorizedDomain(fallbackDomain);
        setErrorMessage(
          `Domínio não autorizado no Firebase Authentication (${fallbackDomain}). Você pode entrar com E-mail e Senha abaixo, ou adicionar este domínio nas configurações do Firebase Console.`
        );
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMessage('O login com Google não está ativado no Firebase Console (Authentication > Sign-in method).');
      } else {
        setErrorMessage(
          err?.message || 'Erro ao realizar login com Google. Utilize seu e-mail e senha cadastrados.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Submit Google Complementary Registration
  const handleGoogleComplementarySubmit = async (data: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    address: string;
    city: string;
    birthDate: string;
    avatarUrl?: string;
  }) => {
    const res = await registerEmployeeApplication({
      ...data,
      registrationMethod: 'google',
    });

    if (res.success) {
      setStatusModalEmployee(res.employee);
      setIsStatusModalOpen(true);
      showSuccess('Cadastro realizado via Google com sucesso! Aguardando autorização do Administrador.');
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white flex items-center justify-center p-4 relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#8BCF00]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#181818] border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#8BCF00] text-black font-extrabold text-2xl shadow-[0_0_20px_rgba(139,207,0,0.35)] mb-1">
            $
          </div>
          <h1 className="text-2xl font-bold font-['Outfit'] text-white tracking-tight">
            CrediControl
          </h1>
          <p className="text-xs text-neutral-400 font-medium">
            Painel de Controle Financeiro & Empréstimos
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedRole === 'admin'
                ? 'bg-[#8BCF00] text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Administrador</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('employee')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedRole === 'employee'
                ? 'bg-[#8BCF00] text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Funcionário</span>
          </button>
        </div>

        {/* Employee Sub-Mode Tabs: Entrar vs Cadastrar-se */}
        {selectedRole === 'employee' && (
          <div className="flex items-center justify-center gap-2 bg-neutral-900/60 p-1 rounded-xl border border-neutral-800/80 text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Já tenho cadastro
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-[#8BCF00]/20 text-[#8BCF00] border border-[#8BCF00]/30 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Quero me cadastrar
            </button>
          </div>
        )}

        {/* Success Banner */}
        {successBanner && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Unauthorized Domain Alert */}
        {unauthorizedDomain && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2.5 text-xs animate-fadeIn">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-left">
                <p className="font-bold text-amber-300 text-xs">
                  Como autorizar este domínio no Firebase:
                </p>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  1. Copie o endereço abaixo.<br />
                  2. Acesse o <strong>Firebase Console &gt; Authentication &gt; Configurações &gt; Domínios autorizados</strong>.<br />
                  3. Clique em <strong>Adicionar domínio</strong> e cole o endereço.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-neutral-900/90 p-2 rounded-xl border border-neutral-800">
              <code className="text-[#8BCF00] font-mono text-[11px] flex-1 truncate select-all px-1">
                {unauthorizedDomain}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(unauthorizedDomain);
                  setCopiedDomain(true);
                  setTimeout(() => setCopiedDomain(false), 2000);
                }}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold rounded-lg text-white transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedDomain ? <Check className="w-3.5 h-3.5 text-[#8BCF00]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDomain ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-0.5 text-[11px]">
              <a
                href="https://console.firebase.google.com/project/credicontrol-53d11/authentication/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8BCF00] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>Abrir Firebase Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-neutral-400">
                Ou acesse com <strong>E-mail e Senha</strong>
              </span>
            </div>
          </div>
        )}

        {/* LOGIN FORM (Admin or Employee Login) */}
        {authMode === 'login' && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                E-mail do {selectedRole === 'admin' ? 'Administrador' : 'Funcionário'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === 'admin' ? 'admin@credicontrol.com' : 'funcionario@credicontrol.com'}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300">Senha</label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-xs text-[#8BCF00] hover:underline font-medium cursor-pointer"
                >
                  Esqueci a senha
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold py-3 rounded-xl text-sm transition-all shadow-lg shadow-[#8BCF00]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <span>Entrar como {selectedRole === 'admin' ? 'Administrador' : 'Funcionário'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* REGISTRATION FORM (Employee Self-Registration with Email/Password) */}
        {selectedRole === 'employee' && authMode === 'register' && (
          <form onSubmit={handleEmployeeRegistration} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Nome Completo *</label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Ex: Carlos Oliveira"
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">E-mail *</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="carlos@exemplo.com"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">Senha de Acesso *</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="(91) 98888-0000"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">CPF</label>
                <input
                  type="text"
                  value={regCpf}
                  onChange={(e) => setRegCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Endereço Completo</label>
              <input
                type="text"
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                placeholder="Rua, número, bairro..."
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">Cidade</label>
                <input
                  type="text"
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                  placeholder="Salinópolis"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">Data de Nascimento</label>
                <input
                  type="date"
                  value={regBirthDate}
                  onChange={(e) => setRegBirthDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 pt-1 leading-relaxed">
              Ao enviar, seu cadastro entrará em análise e você será notificado assim que o Administrador decidir.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold py-3 rounded-xl text-xs transition-all shadow-lg shadow-[#8BCF00]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isLoading ? 'Registrando...' : 'Enviar Solicitação de Cadastro'}</span>
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-neutral-800 w-full" />
          <span className="bg-[#181818] px-3 text-[11px] text-neutral-500 font-bold uppercase tracking-wider">
            OU
          </span>
        </div>

        {/* Google Login / Sign-up Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
          <span>
            {selectedRole === 'employee' && authMode === 'register'
              ? 'Cadastrar com o Google'
              : 'Entrar com o Google'}
          </span>
        </button>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={email}
      />

      {/* Employee Status Modal (Pending, Denied, Suspended) */}
      <EmployeeStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setStatusModalEmployee(null);
        }}
        employee={statusModalEmployee}
        notifications={employeeNotifications}
        onMarkAsRead={markNotificationAsRead}
      />

      {/* Real-time Session Suspended / Revoked Modal */}
      {suspendedSessionAlert && (
        <EmployeeStatusModal
          isOpen={true}
          onClose={clearSuspendedSessionAlert}
          statusOverride={suspendedSessionAlert.type}
          customTitle={suspendedSessionAlert.title}
          customMessage={suspendedSessionAlert.message}
          customReason={suspendedSessionAlert.reason}
          notifications={employeeNotifications}
          onMarkAsRead={markNotificationAsRead}
        />
      )}

      {/* Google Complementary Information Modal */}
      {googleModalData && (
        <GoogleComplementaryModal
          isOpen={!!googleModalData}
          onClose={() => setGoogleModalData(null)}
          googleData={googleModalData}
          onSubmit={handleGoogleComplementarySubmit}
        />
      )}
    </div>
  );
};
