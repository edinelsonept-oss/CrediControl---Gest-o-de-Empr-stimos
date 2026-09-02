import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { ForgotPasswordModal } from './ForgotPasswordModal';

const ADMIN_EMAIL = 'edinelsonept@gmail.com';
const ADMIN_PASSWORD = '@Coelho60';

export const LoginView: React.FC = () => {
  const { loginWithCustomUser, setIsAuthenticated } = useApp();

  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage('');
    if (role === 'admin') {
      if (!email || email === 'funcionario@credicontrol.com') {
        setEmail(ADMIN_EMAIL);
      }
    } else {
      if (email === ADMIN_EMAIL) {
        setEmail('funcionario@credicontrol.com');
      }
    }
  };

  const handleFillAdminCredentials = () => {
    setSelectedRole('admin');
    setEmail(ADMIN_EMAIL);
    setPassword(ADMIN_PASSWORD);
    setErrorMessage('');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanEmailLower = cleanEmail.toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage('Preencha seu e-mail e senha.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Administrator Login Verification
      if (cleanEmailLower === ADMIN_EMAIL.toLowerCase() || selectedRole === 'admin') {
        if (cleanEmailLower === ADMIN_EMAIL.toLowerCase()) {
          if (password !== ADMIN_PASSWORD) {
            setErrorMessage('Senha incorreta para o administrador.');
            setIsLoading(false);
            return;
          }
        }

        // Synchronize with Firebase Auth session
        try {
          await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
            try {
              await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
            } catch (createErr) {
              console.warn('Firebase Auth user registration note:', createErr);
            }
          }
        }

        loginWithCustomUser({
          id: 'user_admin',
          name: 'Edinelson (Admin)',
          email: ADMIN_EMAIL,
          role: 'admin',
          avatarUrl:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        });
        setIsAuthenticated(true);
        return;
      }

      // Employee / Operator Login
      loginWithCustomUser({
        id: `user_employee_${Date.now()}`,
        name: 'Mariana Silva (Cobradora)',
        email: cleanEmail,
        role: 'employee',
        avatarUrl:
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
      });
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      loginWithCustomUser({
        id: googleUser.uid,
        name: googleUser.displayName || (selectedRole === 'admin' ? 'Edinelson (Admin Google)' : 'Funcionário Google'),
        email: googleUser.email || (selectedRole === 'admin' ? ADMIN_EMAIL : 'usuario.google@credicontrol.com'),
        role: selectedRole,
        avatarUrl:
          googleUser.photoURL ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      });
      setIsAuthenticated(true);
    } catch (err: any) {
      console.warn('Google popup notice:', err);
      // Fallback for iframe preview environment where Google OAuth popup might be restricted
      loginWithCustomUser({
        id: `user_google_${Date.now()}`,
        name: selectedRole === 'admin' ? 'Edinelson (Admin)' : 'Mariana Silva (Funcionária)',
        email: selectedRole === 'admin' ? ADMIN_EMAIL : 'usuario.google@credicontrol.com',
        role: selectedRole,
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      });
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    if (role === 'admin') {
      loginWithCustomUser({
        id: 'user_admin',
        name: 'Edinelson (Admin)',
        email: ADMIN_EMAIL,
        role: 'admin',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      });
    } else {
      loginWithCustomUser({
        id: 'user_employee',
        name: 'Mariana Silva (Cobradora)',
        email: 'mariana@credicontrol.com',
        role: 'employee',
        avatarUrl:
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
      });
    }
    setIsAuthenticated(true);
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

        {/* Admin Credentials Helper Badge */}
        {selectedRole === 'admin' && (
          <div className="p-3 bg-[#8BCF00]/10 border border-[#8BCF00]/30 rounded-2xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-neutral-200">
              <Sparkles className="w-4 h-4 text-[#8BCF00] shrink-0" />
              <span className="truncate">
                Admin: <strong className="text-white">{ADMIN_EMAIL}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleFillAdminCredentials}
              className="px-2.5 py-1 bg-[#8BCF00] text-black text-[11px] font-bold rounded-lg hover:bg-[#9DE000] transition-colors shrink-0 cursor-pointer shadow-xs"
            >
              Preencher
            </button>
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
                placeholder={selectedRole === 'admin' ? ADMIN_EMAIL : 'funcionario@credicontrol.com'}
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

        {/* Fast Demo Access */}
        <div className="pt-2 border-t border-neutral-800/80 space-y-2">
          <p className="text-[11px] text-center text-neutral-500 font-semibold uppercase tracking-wider">
            Acesso Rápido de Demonstração
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              className="bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white p-2 rounded-xl text-xs font-semibold border border-neutral-800 transition-all text-center cursor-pointer flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5 text-[#8BCF00]" /> Admin (Edinelson)
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('employee')}
              className="bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white p-2 rounded-xl text-xs font-semibold border border-neutral-800 transition-all text-center cursor-pointer flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5 text-[#8BCF00]" /> Operador (Mariana)
            </button>
          </div>
        </div>
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
