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
  FileText,
  Download,
  Eye,
  Shield,
  History,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Loan, Installment } from '../types';
import { formatCurrency, formatDate, getLoanFinancialSummary } from '../utils/calculations';
import { generatePaymentReceiptPdf, generatePromissoryNotePdf } from '../utils/pdfExport';
import { generateWhatsAppMessage, openWhatsAppChat } from '../utils/whatsapp';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface LoanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
}

export const LoanDetailModal: React.FC<LoanDetailModalProps> = ({ isOpen, onClose, loan }) => {
  const { clients, settings, deleteLoan, auditLogs, setIsPaymentModalOpen, setActiveLoanForPayment } = useApp();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  if (!isOpen || !loan) return null;

  const summary = getLoanFinancialSummary(loan, undefined, settings.defaultDailyFine);
  const client = clients.find((c) => c.id === loan.clientId);

  // Filter audit logs specific to this loan
  const contractAuditLogs = (auditLogs || []).filter(
    (log) => log.entityId === loan.id || log.details?.loanId === loan.id
  );

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

  const handleDownloadPromissoryNote = () => {
    if (!client) return;
    generatePromissoryNotePdf(loan, client, settings);
  };

  const handleConfirmDelete = () => {
    deleteLoan(loan.id);
    setIsDeleteConfirmOpen(false);
    onClose();
  };

  // Determine installments list (fallback to 1 installment if array empty)
  const installmentsList: Installment[] = (loan.installments && loan.installments.length > 0)
    ? loan.installments
    : [
        {
          id: `${loan.id}_inst_1`,
          number: 1,
          dueDate: loan.dueDate,
          amount: loan.totalOriginalAmount,
          paidAmount: summary.totalPaid,
          status: summary.isPaid ? 'paga' : summary.isOverdue ? 'atrasada' : 'em_dia',
          delayDays: summary.delayDays,
          fineAmount: summary.fineAmount,
        },
      ];

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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-neutral-300 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
            <div>
              <span className="text-neutral-400 block">Data do Contrato:</span>
              <strong className="text-white text-sm">{formatDate(loan.loanDate)}</strong>
            </div>
            <div>
              <span className="text-neutral-400 block">Data de Vencimento:</span>
              <strong className="text-white text-sm">{formatDate(loan.dueDate)}</strong>
            </div>
            <div>
              <span className="text-neutral-400 block">Forma / Cronograma:</span>
              <strong className="text-white text-sm">
                {loan.paymentFrequency === 'diaria'
                  ? `Diário (${loan.installmentsCount || loan.installments?.length || 30} dias)`
                  : loan.paymentFrequency === 'pagamento_unico_30'
                  ? 'Pagamento Único (30 dias)'
                  : `Parcelado (${loan.installmentsCount || loan.installments?.length || 1}x)`}
              </strong>
            </div>
            <div>
              <span className="text-neutral-400 block">Rota / Recolhimento:</span>
              <strong className="text-[#8BCF00] text-sm">
                {loan.collectionRoute || (loan.paymentFrequency === 'diaria' ? 'Rota Diária Geral' : 'Balcão / PIX')}
              </strong>
            </div>
          </div>

          {/* Document / Contract Download & Promissory Note */}
          <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#8BCF00]/20 text-[#8BCF00] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-['Outfit']">Documento do Contrato & Nota Promissória</h4>
                <p className="text-xs text-neutral-400">Título executivo extrajudicial com cláusulas de juros e mora</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPromissoryNote}
                className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                title="Visualizar e Baixar Documento PDF do Contrato"
                aria-label="Visualizar Documento PDF"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Visualizar / Baixar Documento PDF</span>
              </button>
            </div>
          </div>

          {/* Repayment Installment Schedule Table (Cronograma de Parcelas) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#8BCF00]" />
                Cronograma de Parcelas do Empréstimo ({installmentsList.length} parcelas)
              </h4>
              <span className="text-xs text-neutral-400">
                {installmentsList.filter((i) => i.status === 'paga').length} de {installmentsList.length} pagas
              </span>
            </div>

            <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-900/50">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="text-[11px] uppercase bg-neutral-900 text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Nº Parcela</th>
                      <th className="py-2.5 px-3 font-semibold">Data Vencimento</th>
                      <th className="py-2.5 px-3 font-semibold">Valor da Parcela</th>
                      <th className="py-2.5 px-3 font-semibold">Valor Pago</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Situação / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {installmentsList.map((inst) => {
                      const isPaid = inst.status === 'paga';
                      const isOverdue = inst.status === 'atrasada' || (!isPaid && inst.dueDate < (new Date().toISOString().split('T')[0]));

                      return (
                        <tr key={inst.id} className="hover:bg-neutral-800/30 transition-colors">
                          <td className="py-3 px-3 font-bold text-white">
                            Parcela {inst.number} de {installmentsList.length}
                          </td>
                          <td className="py-3 px-3 font-medium text-neutral-200">
                            {formatDate(inst.dueDate)}
                          </td>
                          <td className="py-3 px-3 font-extrabold text-[#8BCF00]">
                            {formatCurrency(inst.amount)}
                          </td>
                          <td className="py-3 px-3 text-neutral-300">
                            {isPaid ? formatCurrency(inst.paidAmount || inst.amount) : formatCurrency(inst.paidAmount || 0)}
                            {inst.paidDate && (
                              <span className="block text-[10px] text-neutral-500">em {formatDate(inst.paidDate)}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                Paga 🔵
                              </span>
                            ) : isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30 animate-pulse">
                                Em Atraso 🔴
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8BCF00]/20 text-[#8BCF00] border border-[#8BCF00]/30">
                                A Vencer 🟢
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Contract Audit Trail & History Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
                <History className="w-4 h-4 text-[#8BCF00]" />
                Histórico de Auditoria do Contrato (Audit History)
              </h4>
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[#8BCF00]" /> Trilha imutável
              </span>
            </div>

            {contractAuditLogs.length === 0 ? (
              <div className="bg-neutral-900 p-3.5 rounded-2xl border border-neutral-800 text-xs text-neutral-400 space-y-1">
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>Ação: Criação do Contrato (CREATE_LOAN)</span>
                  <span className="text-neutral-400 font-normal">{formatDate(loan.loanDate || loan.createdAt)}</span>
                </div>
                <p>Usuário: Administrador do Sistema</p>
                <p className="text-[11px] text-neutral-500 font-mono">
                  Registro original registrado na emissão do contrato.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {contractAuditLogs.map((log) => (
                  <div key={log.id} className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-xs text-neutral-300">
                    <div className="flex items-center justify-between font-bold text-white mb-1">
                      <span className="text-[#8BCF00] font-mono">{log.action}</span>
                      <span className="text-[11px] text-neutral-400 font-normal">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Executor: <strong className="text-neutral-200">{log.userName}</strong> ({log.userRole === 'admin' ? 'Administrador' : 'Colaborador'})
                    </div>
                    {log.details && (
                      <div className="text-[10px] text-neutral-500 font-mono mt-1 truncate">
                        {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
