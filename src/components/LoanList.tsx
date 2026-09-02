import React, { useState } from 'react';
import {
  Banknote,
  Search,
  Plus,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  ChevronRight,
  DollarSign,
  Calendar,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FilterStatus, Loan } from '../types';
import { formatCurrency, formatDate, getLoanFinancialSummary, getTodayIso, getDateOffsetIso } from '../utils/calculations';
import { generateWhatsAppMessage, openWhatsAppChat } from '../utils/whatsapp';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export const LoanList: React.FC = () => {
  const {
    loans,
    clients,
    settings,
    deleteLoan,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    setIsLoanModalOpen,
    setSelectedLoanDetail,
    setActiveLoanForPayment,
    setIsPaymentModalOpen,
  } = useApp();

  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

  const today = getTodayIso();
  const tomorrow = getDateOffsetIso(1);

  // Filter loans
  const filteredLoans = loans.filter((loan) => {
    // Search query
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      loan.clientName.toLowerCase().includes(q) ||
      loan.clientPhone.includes(q) ||
      loan.clientWhatsapp.includes(q);

    if (!matchesSearch) return false;

    const summary = getLoanFinancialSummary(loan, today, settings.defaultDailyFine);

    if (filterStatus === 'todos') return true;
    if (filterStatus === 'em_dia') return summary.status === 'em_dia' && !summary.isPaid && !summary.isOverdue;
    if (filterStatus === 'em_atraso') return summary.isOverdue;
    if (filterStatus === 'quitado') return summary.isPaid;
    if (filterStatus === 'vencendo_hoje') return loan.dueDate === today && !summary.isPaid;
    if (filterStatus === 'vencendo_amanha') return loan.dueDate === tomorrow && !summary.isPaid;

    return true;
  });

  const handleWhatsApp = (loan: Loan, e: React.MouseEvent) => {
    e.stopPropagation();
    const client = clients.find((c) => c.id === loan.clientId);
    if (!client) return;
    const summary = getLoanFinancialSummary(loan, today, settings.defaultDailyFine);
    const msgType = summary.isOverdue ? 'cobranca_atraso' : loan.dueDate === today ? 'vencimento_hoje' : 'lembrete_1_dia';
    const msg = generateWhatsAppMessage(client, loan, settings, msgType);
    openWhatsAppChat(client.whatsapp, msg);
  };

  const handleRegisterPaymentClick = (loan: Loan, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveLoanForPayment(loan);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
            <Banknote className="w-7 h-7 text-[#8BCF00]" /> Gestão de Empréstimos & Contratos
          </h2>
          <p className="text-neutral-400 text-sm mt-0.5">
            Controle de vencimentos, parcelas, juros automáticos de 30% e multas por atraso (R$ 20/dia).
          </p>
        </div>
        <button
          onClick={() => setIsLoanModalOpen(true)}
          className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-bold text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-[#8BCF00]/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Novo Empréstimo
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1C1C1C] p-4 rounded-2xl border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente ou telefone..."
            className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] text-white placeholder-neutral-500 text-sm rounded-xl pl-10 pr-4 py-2 outline-none transition-all"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs text-neutral-400 font-semibold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#8BCF00]" /> Status:
          </span>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'em_dia', label: '🟢 Em Dia' },
            { id: 'em_atraso', label: '🔴 Em Atraso' },
            { id: 'vencendo_hoje', label: '🟡 Vence Hoje' },
            { id: 'vencendo_amanha', label: '🔵 Vence Amanhã' },
            { id: 'quitado', label: '🔵 Quitados' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as FilterStatus)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-[#8BCF00] text-black font-bold shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Table View */}
      <div className="bg-[#1C1C1C] rounded-3xl border border-neutral-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="text-xs uppercase bg-neutral-900/90 text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="py-4 px-4 font-semibold">Cliente Tomador</th>
                <th className="py-4 px-4 font-semibold">Valor Emprestado</th>
                <th className="py-4 px-4 font-semibold">Juros (30%)</th>
                <th className="py-4 px-4 font-semibold">Vencimento</th>
                <th className="py-4 px-4 font-semibold text-center">Atraso</th>
                <th className="py-4 px-4 font-semibold text-right">Multa Acumulada</th>
                <th className="py-4 px-4 font-semibold text-right">Saldo Devedor</th>
                <th className="py-4 px-4 font-semibold text-center">Status</th>
                <th className="py-4 px-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <Banknote className="w-10 h-10 text-neutral-600 mx-auto mb-2 opacity-50" />
                    Nenhum contrato encontrado com os critérios de busca.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const summary = getLoanFinancialSummary(loan, today, settings.defaultDailyFine);

                  return (
                    <tr
                      key={loan.id}
                      onClick={() => setSelectedLoanDetail(loan)}
                      className="hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-4 font-bold text-white group-hover:text-[#8BCF00] transition-colors">
                        {loan.clientName}
                        <span className="block text-xs font-normal text-neutral-400">{loan.clientPhone}</span>
                      </td>

                      <td className="py-4 px-4 font-semibold text-white">{formatCurrency(loan.principalAmount)}</td>

                      <td className="py-4 px-4 text-xs text-neutral-400">
                        {loan.interestRatePercent}% ({formatCurrency(loan.interestAmount)})
                      </td>

                      <td className="py-4 px-4 text-xs font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          {formatDate(loan.dueDate)}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {summary.isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-[#FF3B30]/20 text-[#FF3B30]">
                            {summary.delayDays} dia(s)
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-500">-</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right font-medium text-[#FF3B30]">
                        {summary.fineAmount > 0 ? formatCurrency(summary.fineAmount) : '-'}
                      </td>

                      <td className="py-4 px-4 text-right font-extrabold text-[#8BCF00] text-base">
                        {formatCurrency(summary.remainingBalance)}
                      </td>

                      <td className="py-4 px-4 text-center">
                        {summary.isPaid ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Quitado 🔵
                          </span>
                        ) : summary.isOverdue ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30 animate-pulse">
                            Em Atraso 🔴
                          </span>
                        ) : loan.dueDate === today ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Vence Hoje 🟡
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#8BCF00]/20 text-[#8BCF00] border border-[#8BCF00]/30">
                            Em Dia 🟢
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => handleWhatsApp(loan, e)}
                            className="bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-black p-2 rounded-xl transition-all cursor-pointer"
                            title="Cobrar por WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {!summary.isPaid && (
                            <button
                              onClick={(e) => handleRegisterPaymentClick(loan, e)}
                              className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-bold text-xs px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1"
                              title="Registrar Pagamento"
                            >
                              <DollarSign className="w-3.5 h-3.5" /> Pagar
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLoanToDelete(loan);
                            }}
                            className="bg-[#FF3B30]/15 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white p-2 rounded-xl transition-all cursor-pointer"
                            title="Excluir Empréstimo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!loanToDelete}
        onClose={() => setLoanToDelete(null)}
        onConfirm={() => {
          if (loanToDelete) {
            deleteLoan(loanToDelete.id);
            setLoanToDelete(null);
          }
        }}
      />
    </div>
  );
};
