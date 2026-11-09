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
} from 'lucide-react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserPopupRedirectResolver,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { logAuditEvent } from '../utils/auditLogger';
import { ADMIN_EMAIL } from '../config/env';

export const LoginView: React.FC = () => {
  const {
    loginWithCustomUser,
    setIsAuthenticated,
    employees,
    authenticateEmployee,
    isEmployeeEmailAllowed,
  } = useApp();

  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage('');
    setUnauthorizedDomain(null);
    setEmail('');
    setPassword('');
  };


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

    try {
      // 1. Administrator Login Verification
      if (selectedRole === 'admin') {
        if (cleanEmailLower !== ADMIN_EMAIL.toLowerCase()) {
          setErrorMessage(`Acesso negado: O e-mail "${cleanEmail}" não possui autorização de Administrador principal.`);
          setIsLoading(false);
          return;
        }

        const storedAdminPass = typeof window !== 'undefined' ? localStorage.getItem('credicontrol_admin_password') : null;
        const isMasterPassword = password === '@Coelho60' || (storedAdminPass !== null && password === storedAdminPass);

        try {
          await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
        } catch (fbErr: any) {
          const fbCode = fbErr?.code || '';
          if (
            fbCode === 'auth/user-not-found' ||
            fbCode === 'auth/invalid-credential' ||
            fbCode === 'auth/user-disabled' ||
            fbCode === 'auth/operation-not-allowed'
          ) {
            if (isMasterPassword) {
              try {
                await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, password);
              } catch (createErr: any) {
                console.info('Firebase auth auto-create note:', createErr?.message);
              }
            } else {
              setErrorMessage('Senha incorreta para o administrador principal.');
              setIsLoading(false);
              return;
            }
          } else if (fbCode === 'auth/wrong-password') {
            if (!isMasterPassword) {
              setErrorMessage('Senha incorreta para o administrador principal.');
              setIsLoading(false);
              return;
            }
          } else {
            console.warn('Firebase admin sign in warning:', fbErr.message);
            if (!isMasterPassword) {
              setErrorMessage('Credenciais incorretas ou falha de autenticação.');
              setIsLoading(false);
              return;
            }
          }
        }

        const adminUser = {
          id: auth.currentUser?.uid || 'user_admin',
          name: 'Edinelson (Admin)',
          email: ADMIN_EMAIL,
          role: 'admin' as const,
          avatarUrl:
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


      // 2. Employee Login Verification (Must be created and enabled by Administrator)
      const authResult = authenticateEmployee(cleanEmail, password);

      if (!authResult.success) {
        setErrorMessage(
          authResult.message ||
            'Acesso negado: O login de funcionário precisa ser criado pelo administrador.'
        );
        setIsLoading(false);
        return;
      }

      if (authResult.user) {
        loginWithCustomUser(authResult.user);
        await logAuditEvent(authResult.user, 'AUTH_LOGIN', 'auth', cleanEmail, {
          method: 'employee_credentials',
          role: 'employee',
        });
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  // Process redirect result if redirected back from Google sign-in
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
          const check = isEmployeeEmailAllowed(userGoogleEmail);
          if (!check.allowed) {
            await auth.signOut();
            setErrorMessage(
              check.message ||
                `Acesso não autorizado: O e-mail Google "${userGoogleEmail}" não foi cadastrado pelo administrador como funcionário.`
            );
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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');

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
        // If popup is blocked by the browser or unsupported in this frame, fallback to redirect
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
      } else {
        // Must be an admin-created employee email
        const check = isEmployeeEmailAllowed(userGoogleEmail);
        if (!check.allowed) {
          await auth.signOut();
          setErrorMessage(
            check.message ||
              `Acesso não autorizado: O e-mail Google "${userGoogleEmail}" não foi cadastrado pelo administrador como funcionário.`
          );
          setIsLoading(false);
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
          method: 'google_popup',
          role: 'employee',
        });
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      console.warn('Google login error notice:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMessage('Autenticação com Google cancelada. Por favor tente novamente ou use e-mail e senha.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMessage('O pop-up de login foi bloqueado pelo navegador. Por favor, autorize pop-ups para esta página ou use e-mail e senha.');
      } else if (code === 'auth/unauthorized-domain') {
        const detectedDomain = typeof window !== 'undefined' ? window.location.hostname : '';
        const fallbackDomain = detectedDomain || 'ais-dev-ziroypgzcmdvzmmmdghmie-476116610932.us-east1.run.app';
        setUnauthorizedDomain(fallbackDomain);
        setErrorMessage(
          `Domínio não autorizado no Firebase Authentication (${fallbackDomain}). Você pode entrar com E-mail e Senha abaixo, ou adicionar este domínio nas configurações do Firebase Console.`
        );
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMessage('O login com Google não está ativado no Firebase Console (Authentication > Sign-in method). Ative o provedor Google.');
      } else {
        setErrorMessage(
          err?.message || 'Erro ao realizar login com Google. Utilize seu e-mail e senha cadastrados.'
        );
      }
    } finally {
      setIsLoading(false);
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

        {/* Employee Admin-Created Helper Badge */}
        {selectedRole === 'employee' && (
          <div className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-2xl flex items-start gap-2.5 text-xs">
            <User className="w-4 h-4 text-[#8BCF00] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <p className="font-bold text-white text-xs">
                Login criado pelo Administrador
              </p>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Funcionários utilizam o e-mail e senha cadastrados pelo Administrador na aba de Funcionários.
              </p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

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
                  title="Copiar domínio para área de transferência"
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
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
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

        {/* Divider */}
        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-neutral-800 w-full" />
          <span className="bg-[#181818] px-3 text-[11px] text-neutral-500 font-bold uppercase tracking-wider">
            OU
          </span>
        </div>

        {/* Google Login Button */}
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
          <span>Logar com o Google</span>
        </button>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={email}
      />
    </div>
  );
};
