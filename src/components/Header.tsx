import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  Plus,
  UserPlus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/calculations';
import { generateWhatsAppMessage, openWhatsAppChat } from '../utils/whatsapp';

interface HeaderProps {
  setIsMobileOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setIsMobileOpen }) => {
  const {
    searchQuery,
    setSearchQuery,
    notifications,
    setIsLoanModalOpen,
    setIsClientModalOpen,
    clients,
    loans,
    settings,
    setSelectedLoanDetail,
    setActiveTab,
  } = useApp();

  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  const overdueNotifications = notifications.filter((n) => n.type === 'overdue');
  const dueTodayNotifications = notifications.filter((n) => n.type === 'due_today');

  const handleOpenNotificationLoan = (loanId: string) => {
    const foundLoan = loans.find((l) => l.id === loanId);
    if (foundLoan) {
      setSelectedLoanDetail(foundLoan);
      setActiveTab('loans');
    }
    setIsNotifDropdownOpen(false);
  };

  const handleWhatsAppReminder = (n: typeof notifications[0]) => {
    const client = clients.find((c) => c.id === n.clientId);
    const loan = loans.find((l) => l.id === n.loanId);
    if (!client || !loan) return;

    let msgType: 'lembrete_3_dias' | 'lembrete_1_dia' | 'vencimento_hoje' | 'cobranca_atraso' = 'cobranca_atraso';
    if (n.type === 'due_today') msgType = 'vencimento_hoje';
    else if (n.type === 'due_tomorrow') msgType = 'lembrete_1_dia';

    const msg = generateWhatsAppMessage(client, loan, settings, msgType);
    openWhatsAppChat(n.clientWhatsapp || client.whatsapp, msg);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#171717]/90 dark:bg-[#121212]/90 backdrop-blur-md border-b border-neutral-800 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Left side: Mobile menu & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Global Search input */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, CPF, telefone..."
            className="w-full bg-neutral-900/90 dark:bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] text-white placeholder-neutral-500 text-sm rounded-xl pl-10 pr-4 py-2 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right side: Quick actions & Notification dropdown */}
      <div className="flex items-center gap-2.5">
        {/* Quick Add Client */}
        <button
          onClick={() => setIsClientModalOpen(true)}
          className="hidden sm:flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs px-3 py-2 rounded-xl transition-all border border-neutral-700 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5 text-[#8BCF00]" />
          <span>Cadastrar Cliente</span>
        </button>

        {/* Quick New Loan */}
        <button
          onClick={() => setIsLoanModalOpen(true)}
          className="flex items-center gap-1.5 bg-[#8BCF00] hover:bg-[#9DE000] text-black font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="hidden sm:inline">Novo Empréstimo</span>
          <span className="sm:hidden">Novo</span>
        </button>

        {/* Notifications Dropdown Container */}
        <div className="relative">
          <button
            onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
            className="relative p-2 text-neutral-300 hover:text-white rounded-xl hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-700 cursor-pointer"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B30] text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-bounce shadow-md">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#1C1C1C] border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-3.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#8BCF00]" />
                  <h3 className="text-sm font-bold text-white">Central de Cobranças</h3>
                </div>
                <span className="text-xs bg-[#FF3B30]/20 text-[#FF3B30] px-2 py-0.5 rounded-full font-semibold">
                  {notifications.length} Alerta(s)
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-neutral-800/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-neutral-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-[#8BCF00] mx-auto mb-2 opacity-70" />
                    Nenhum empréstimo em atraso ou vencendo hoje!
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-3.5 hover:bg-neutral-800/50 transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 cursor-pointer" onClick={() => handleOpenNotificationLoan(n.loanId)}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {n.type === 'overdue' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#FF3B30]/20 text-[#FF3B30]">
                              <AlertTriangle className="w-3 h-3" /> ATRASADO ({n.delayDays}d)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                              <Clock className="w-3 h-3" /> VENCIMENTO HOJE
                            </span>
                          )}
                          <span className="text-xs text-neutral-400">{formatDate(n.dueDate)}</span>
                        </div>
                        <p className="text-sm font-semibold text-white leading-tight">{n.clientName}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Saldo devedor:{' '}
                          <span className="font-bold text-[#8BCF00]">{formatCurrency(n.amountDue)}</span>
                          {n.fineAmount > 0 && (
                            <span className="text-[#FF3B30] text-[11px] block">
                              + Multa acum: {formatCurrency(n.fineAmount)}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* WhatsApp Button */}
                      <button
                        onClick={() => handleWhatsAppReminder(n)}
                        title="Enviar cobrança via WhatsApp"
                        className="bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-black p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-neutral-900 border-t border-neutral-800 text-center">
                <button
                  onClick={() => {
                    setActiveTab('loans');
                    setIsNotifDropdownOpen(false);
                  }}
                  className="text-xs text-[#8BCF00] hover:underline font-semibold cursor-pointer"
                >
                  Ver todos os empréstimos &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
