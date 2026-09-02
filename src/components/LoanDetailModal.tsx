import React, { useState } from 'react';
import {
  X,
  Banknote,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Printer,
  MessageSquare,
  Clock,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Loan } from '../types';
import { formatCurrency, formatDate, getLoanFinancialSummary } from '../utils/calculations';
import { generatePaymentReceiptPdf } from '../utils/pdfExport';
import { generateWhatsAppMessage, openWhatsAppChat } from '../utils/whatsapp';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface LoanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
}

export const LoanDetailModal: React.FC<LoanDetailModalProps> = ({ isOpen, onClose, loan }) => {
  const { clients, settings, deleteLoan, setIsPaymentModalOpen, setActiveLoanForPayment } = useApp();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  if (!isOpen || !loan) return null;

  const summary = getLoanFinancialSummary(loan, undefined, settings.defaultDailyFine);
  const client = clients.find((c) => c.id === loan.clientId);

  const progressPercent = Math.min(
    100,
    Math.round((summary.totalPaid / summary.updatedTotalAmount) * 100)
  );

  const handleOpenPayment = () => {
    setActiveLoanForPayment(loan);
    setIsPaymentModalOpen(true);
  };

  const handleWhatsApp = () => {
    if (!client) return;
    const msgType = summary.isOverdue ? 'cobranca_atraso' : loan.dueDate === getLoanFinancialSummary(loan).totalOriginalAmount ? 'vencimento_hoje' : 'lembrete_1_dia';
    const msg = generateWhatsAppMessage(client, loan, settings, msgType);
    openWhatsAppChat(client.whatsapp, msg);
  };

  const handleConfirmDelete = () => {
    deleteLoan(loan.id);
    setIsDeleteConfirmOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1C1C1C] border border-neutral-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8BCF00] text-black flex items-center justify-center font-bold">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">Detalhes do Contrato</h3>
              <p className="text-xs text-neutral-400">ID: {loan.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Client & Status Hero */}
          <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Cliente Tomador</span>
              <h4 className="text-xl font-bold text-white font-['Outfit']">{loan.clientName}</h4>
              <p className="text-xs text-neutral-400">{loan.clientPhone}</p>
            </div>

            <div className="flex items-center gap-2">
              {summary.isPaid ? (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  QUITADO 🔵
                </span>
              ) : summary.isOverdue ? (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30 animate-pulse">
                  EM ATRASO ({summary.delayDays} Dias) 🔴
                </span>
              ) : (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#8BCF00]/20 text-[#8BCF00] border border-[#8BCF00]/30">
                  EM DIA 🟢
                </span>
              )}
            </div>
          </div>

          {/* Payment Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-neutral-300">Progresso do Pagamento</span>
              <span className="text-[#8BCF00]">{progressPercent}% Concluído</span>
            </div>
            <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-neutral-800">
              <div
                className="h-full bg-gradient-to-r from-[#8BCF00] to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-900 p-3.5 rounded-2xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold">Valor Emprestado</span>
              <p className="text-base font-bold text-white mt-1">{formatCurrency(loan.principalAmount)}</p>
            </div>

            <div className="bg-neutral-900 p-3.5 rounded-2xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold">Juros ({loan.interestRatePercent}%)</span>
              <p className="text-base font-bold text-emerald-400 mt-1">+{formatCurrency(loan.interestAmount)}</p>
            </div>

            <div className="bg-neutral-900 p-3.5 rounded-2xl border border-neutral-800">
              <span className="text-[10px] text-[#FF3B30] uppercase font-semibold">Multa Diária (R$20/d)</span>
              <p className="text-base font-bold text-[#FF3B30] mt-1">
                {summary.fineAmount > 0 ? `+${formatCurrency(summary.fineAmount)}` : 'R$ 0,00'}
              </p>
            </div>

            <div className="bg-neutral-900 p-3.5 rounded-2xl border border-neutral-800">
              <span className="text-[10px] text-[#8BCF00] uppercase font-semibold">Saldo Devedor Restante</span>
              <p className="text-base font-extrabold text-[#8BCF00] mt-1">{formatCurrency(summary.remainingBalance)}</p>
            </div>
          </div>

          {/* Dates & Frequencies */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-300 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
            <div>
              <span className="text-neutral-400 block">Data do Contrato:</span>
              <strong className="text-white text-sm">{formatDate(loan.loanDate)}</strong>
            </div>
            <div>
              <span className="text-neutral-400 block">Data de Vencimento:</span>
              <strong className="text-white text-sm">{formatDate(loan.dueDate)}</strong>
            </div>
            <div>
              <span className="text-neutral-400 block">Forma de Pagamento:</span>
              <strong className="text-white text-sm capitalize">{loan.paymentFrequency.replace(/_/g, ' ')}</strong>
            </div>
          </div>

          {/* Historical Payments Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white font-['Outfit']">Histórico de Pagamentos Recebidos</h4>

            {loan.payments?.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">Nenhum pagamento registrado ainda.</p>
            ) : (
              <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-2xl overflow-hidden">
                {loan.payments.map((p) => (
                  <div key={p.id} className="p-3 bg-neutral-900 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{formatCurrency(p.amount)}</p>
                      <p className="text-neutral-400">
                        {p.date} via <span className="uppercase font-semibold">{p.paymentMethod}</span> ({p.registeredBy})
                      </p>
                      {p.note && <p className="text-[11px] text-neutral-400 italic mt-0.5">Obs: {p.note}</p>}
                    </div>

                    {client && (
                      <button
                        onClick={() => generatePaymentReceiptPdf(p, loan, client, settings)}
                        className="flex items-center gap-1 text-[11px] text-[#8BCF00] hover:underline font-semibold cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" /> Recibo PDF
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="text-xs text-[#FF3B30] hover:bg-[#FF3B30]/10 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#FF3B30]/30"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir Contrato
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleWhatsApp}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <MessageSquare className="w-4 h-4 fill-black" /> Enviar no WhatsApp
              </button>

              {!summary.isPaid && (
                <button
                  onClick={handleOpenPayment}
                  className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-lg shadow-[#8BCF00]/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" /> Registrar Pagamento
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
