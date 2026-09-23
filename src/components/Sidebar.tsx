import React from 'react';
import {
  LayoutDashboard,
  Users,
  Banknote,
  FileBarChart,
  MapPin,
  Settings,
  Shield,
  Sun,
  Moon,
  PlusCircle,
  X,
  CreditCard,
  Building2,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    settings,
    toggleTheme,
    setIsLoanModalOpen,
    setIsClientModalOpen,
    notifications,
    logout,
  } = useApp();

  const overdueCount = notifications.filter((n) => n.type === 'overdue').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clientes', icon: Users },
    {
      id: 'loans',
      label: 'Empréstimos',
      icon: Banknote,
      badge: overdueCount > 0 ? `${overdueCount} em atraso` : undefined,
    },
    { id: 'reports', label: 'Relatórios PDF/Excel', icon: FileBarChart },
    { id: 'map', label: 'Mapa de Clientes', icon: MapPin },
    ...(currentUser.role === 'admin'
      ? [{ id: 'employees', label: 'Funcionários & Acessos', icon: UserCheck }]
      : []),
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#171717] dark:bg-[#121212] border-r border-neutral-800 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header / Branding */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-[#8BCF00] text-black flex items-center justify-center font-extrabold text-xl shadow-[0_0_15px_rgba(139,207,0,0.3)]">
              $
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-white flex items-center gap-1.5 font-['Outfit']">
                CrediControl
              </h1>
              <p className="text-xs text-neutral-400 font-medium">Gestão de Empréstimos</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => {
              setIsLoanModalOpen(true);
              setIsMobileOpen(false);
            }}
            className="w-full bg-[#8BCF00] hover:bg-[#9DE000] text-black font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-sm cursor-pointer active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            Novo Empréstimo
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#8BCF00]/15 text-[#8BCF00] border-l-4 border-[#8BCF00]'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#8BCF00]' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF3B30] text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Footer Controls */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/40 space-y-3">
          {/* User Role Switcher */}
          <div className="bg-neutral-800/70 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover border border-[#8BCF00]/40 shrink-0"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                <p className="text-[11px] text-[#8BCF00] capitalize flex items-center gap-1">
                  <Shield className="w-3 h-3" /> {currentUser.role === 'admin' ? 'Administrador' : 'Funcionário'}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sair do sistema"
              className="p-2 text-neutral-400 hover:text-[#FF3B30] hover:bg-[#FF3B30]/15 rounded-lg transition-all cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Theme & Settings summary */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 cursor-pointer"
            >
              {settings.theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" /> Modo Claro
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-400" /> Modo Escuro
                </>
              )}
            </button>
            <span className="text-[10px] text-neutral-500">v2.4.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};
