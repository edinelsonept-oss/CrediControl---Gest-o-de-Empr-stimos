import React, { useState } from 'react';
import { X, CheckCircle2, Receipt, DollarSign } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Loan } from '../types';
import { formatCurrency, getLoanFinancialSummary, getTodayIso } from '../utils/calculations';
import { generatePaymentReceiptPdf } from '../utils/pdfExport';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, loan }) => {
  const { clients, settings, registerPayment } = useApp();

  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'transferencia' | 'cartao'>('pix');
  const [note, setNote] = useState<string>('');

  React.useEffect(() => {
    if (loan) {
      const summary = getLoanFinancialSummary(loan, undefined, settings.defaultDailyFine);
      setAmount(summary.remainingBalance);
      setNote('');
      setPaymentMethod('pix');
    }
  }, [loan, settings.defaultDailyFine]);

  if (!isOpen || !loan) return null;

  const summary = getLoanFinancialSummary(loan, undefined, settings.defaultDailyFine);
  const client = clients.find((c) => c.id === loan.clientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Informe um valor de pagamento válido.');
      return;
    }

    const paymentRecord = registerPayment(loan.id, amount, paymentMethod, note);

    if (paymentRecord && client) {
      if (window.confirm('Pagamento registrado com sucesso! Deseja gerar o comprovante em PDF agora?')) {
        generatePaymentReceiptPdf(paymentRecord, loan, client, settings);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1C1C1C] border border-neutral-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8BCF00]/20 text-[#8BCF00] flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">Registrar Pagamento</h3>
              <p className="text-xs text-neutral-400">Cliente: {loan.clientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Summary Box */}
          <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 space-y-1.5 text-xs text-neutral-300">
            <div className="flex justify-between">
              <span>Valor Total Original:</span>
              <span>{formatCurrency(loan.totalOriginalAmount)}</span>
            </div>
            {summary.fineAmount > 0 && (
              <div className="flex justify-between text-[#FF3B30]">
                <span>Multa por Atraso ({summary.delayDays}d):</span>
                <span>+ {formatCurrency(summary.fineAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-white text-sm pt-1.5 border-t border-neutral-800">
              <span>Saldo Devedor Restante:</span>
              <span className="text-[#8BCF00]">{formatCurrency(summary.remainingBalance)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Valor a Pagar (R$) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">R$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl pl-10 pr-4 py-2.5 text-lg font-extrabold text-white outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setAmount(summary.remainingBalance)}
              className="text-[11px] text-[#8BCF00] hover:underline font-semibold mt-1"
            >
              Quitar Total ({formatCurrency(summary.remainingBalance)})
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Forma de Pagamento</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
            >
              <option value="pix">Pix (Transferência Instantânea)</option>
              <option value="dinheiro">Dinheiro Espécie</option>
              <option value="transferencia">TED / DOC / Transferência</option>
              <option value="cartao">Cartão de Crédito/Débito</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Observação / Comprovante</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Pix efetuado com chave celular..."
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-neutral-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-[#8BCF00]/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              Confirmar Pagamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
