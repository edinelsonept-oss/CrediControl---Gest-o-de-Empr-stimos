import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Send,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Shield,
  DollarSign,
  Phone,
  CheckCircle2,
  BellRing,
} from 'lucide-react';
import { Loan, SystemSettings } from '../types';
import { DueDateVerificationResult, DueLoanItem } from '../utils/dueDateVerifier';
import { formatCurrency, formatDate, getTodayIso } from '../utils/calculations';
import { generateWhatsAppMessage, openWhatsAppChat } from '../utils/whatsapp';

interface DueDateAlertBannerProps {
  verification: DueDateVerificationResult;
  settings: SystemSettings;
  onSelectLoan: (loan: Loan) => void;
  onReverify?: () => void;
}

export const DueDateAlertBanner: React.FC<DueDateAlertBannerProps> = ({
  verification,
  settings,
  onSelectLoan,
  onReverify,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(verification.verificationTimestamp);

  const today = getTodayIso();

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onReverify) {
      onReverify();
    }
    setTimeout(() => {
      setLastCheckTime(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setIsRefreshing(false);
    }, 450);
  };

  const handleWhatsAppClick = (item: DueLoanItem) => {
    if (!item.client) return;
    const msg = generateWhatsAppMessage(item.client, item.loan, settings, 'vencimento_hoje');
    openWhatsAppChat(item.client.whatsapp || item.loan.clientWhatsapp || item.client.phone, msg);
  };

  // If there are no loans due today, we do not show the intrusive alert banner
  if (!verification.hasLoansDueToday) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-[#181818] to-neutral-900 p-5 sm:p-6 shadow-2xl shadow-amber-500/10 font-['Plus_Jakarta_Sans',sans-serif] animate-fadeIn">
      {/* Decorative background glow */}
      <div className="absolute -right-16 -top-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-[#8BCF00]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Alert Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <BellRing className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              ALERTA DE VENCIMENTO DO DIA • PAINEL ADMINISTRADOR
            </span>

            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-400" />
              Verificado às {lastCheckTime}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] flex items-center gap-2 flex-wrap">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            <span>
              {verification.loansDueTodayCount} {verification.loansDueTodayCount === 1 ? 'Empréstimo' : 'Empréstimos'} com Vencimento HOJE ({formatDate(today)})
            </span>
          </h3>

          <p className="text-xs sm:text-sm text-neutral-300 max-w-3xl">
            Atenção, Administrador: Identificamos contratos de clientes com vencimento na data de hoje.
            Realize a cobrança preventiva via WhatsApp para evitar a incidência de multa diária (R$ {settings.defaultDailyFine},00/dia) a partir de amanhã.
          </p>
        </div>

        {/* Highlight Card: Total to Collect Today & Action Controls */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="bg-neutral-900/90 border border-amber-500/30 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                Total a Receber Hoje
              </span>
              <span className="text-lg sm:text-xl font-black text-[#8BCF00] font-['Outfit']">
                {formatCurrency(verification.totalAmountDueToday)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              title="Executar verificação de datas agora"
              className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Verificar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-95"
            >
              <span>{isExpanded ? 'Recolher Lista' : `Ver Clientes (${verification.loansDueTodayCount})`}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4 stroke-[3]" /> : <ChevronDown className="w-4 h-4 stroke-[3]" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded List of Due Contracts Today */}
      {isExpanded && (
        <div className="mt-4 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold px-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Contratos que vencem até o final do dia ({formatDate(today)}):
            </span>
            <span className="text-amber-400 font-bold">
              {verification.loansDueTodayCount} {verification.loansDueTodayCount === 1 ? 'cliente prioritário' : 'clientes prioritários'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {verification.loansDueToday.map((item) => {
              const { loan, client, amountDueToday, dueInstallments } = item;
              const hasInstallmentInfo = dueInstallments.length > 0;

              return (
                <div
                  key={loan.id}
                  className="bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all shadow-md space-y-3 group"
                >
                  {/* Client Info Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm font-['Outfit'] truncate group-hover:text-amber-400 transition-colors">
                        {loan.clientName}
                      </h4>
                      <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-neutral-500" />
                        <span>{loan.clientPhone || client?.phone || 'Telefone não informado'}</span>
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                      Vence Hoje
                    </span>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-neutral-950/80 rounded-xl p-2.5 border border-neutral-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Valor a receber hoje:</span>
                      <strong className="text-sm font-extrabold text-[#8BCF00]">
                        {formatCurrency(amountDueToday)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800">
                      <span>Total do contrato:</span>
                      <span className="font-medium text-neutral-300">
                        {formatCurrency(loan.totalOriginalAmount)}
                      </span>
                    </div>

                    {hasInstallmentInfo && (
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>Parcela:</span>
                        <span className="text-amber-400 font-semibold">
                          {dueInstallments.map((inst) => `Parcela ${inst.number}`).join(', ')}
                        </span>
                      </div>
                    )}

                    {loan.collectionRoute && (
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>Rota de Cobrança:</span>
                        <span className="text-neutral-300 font-medium truncate max-w-[150px]">
                          {loan.collectionRoute}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleWhatsAppClick(item)}
                      className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold text-xs py-2 px-3 rounded-xl transition-all shadow-md shadow-[#25D366]/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Cobrar WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectLoan(loan)}
                      className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 rounded-xl transition-all cursor-pointer text-xs font-semibold flex items-center gap-1"
                      title="Ver detalhes completos do empréstimo"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
