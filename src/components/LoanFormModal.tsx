import React, { useState, useEffect } from 'react';
import { X, Banknote, Calculator, Calendar, DollarSign, UserCheck, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Client, PaymentFrequency } from '../types';
import {
  calculateLoanTotals,
  formatCurrency,
  getTodayIso,
  getDateOffsetIso,
  generateInstallmentSchedule,
  LOAN_PRESETS,
} from '../utils/calculations';
import { SuccessModal } from './SuccessModal';

interface LoanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoanFormModal: React.FC<LoanFormModalProps> = ({ isOpen, onClose }) => {
  const { clients, settings, addLoan, setIsClientModalOpen } = useApp();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [principalAmount, setPrincipalAmount] = useState<number>(1000);
  const [interestRatePercent, setInterestRatePercent] = useState<number>(settings.defaultInterestRate || 30);
  const [loanDate, setLoanDate] = useState<string>(getTodayIso());
  const [dueDate, setDueDate] = useState<string>(getDateOffsetIso(30));
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('pagamento_unico_30');
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [dailyFineAmount, setDailyFineAmount] = useState<number>(settings.defaultDailyFine || 20);
  const [notes, setNotes] = useState<string>('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Sync default client if list available
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  // Sync settings defaults
  useEffect(() => {
    setInterestRatePercent(settings.defaultInterestRate || 30);
    setDailyFineAmount(settings.defaultDailyFine || 20);
  }, [settings, isOpen]);

  // Handle frequency changes
  const handleFrequencyChange = (freq: PaymentFrequency) => {
    setPaymentFrequency(freq);
    if (freq === 'diaria') {
      setInstallmentsCount(30);
      setDueDate(getDateOffsetIso(30));
    } else if (freq === 'pagamento_unico_30') {
      setInstallmentsCount(1);
      setDueDate(getDateOffsetIso(30));
    } else {
      setInstallmentsCount(3);
      setDueDate(getDateOffsetIso(30));
    }
  };

  const totals = calculateLoanTotals(principalAmount, interestRatePercent);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find((c) => c.id === selectedClientId);

    if (!selectedClient) {
      alert('Por favor, selecione um cliente válido.');
      return;
    }

    if (principalAmount <= 0) {
      alert('O valor emprestado deve ser maior que zero.');
      return;
    }

    const generatedInstallments = generateInstallmentSchedule(
      `temp_${Date.now()}`,
      totals.totalOriginalAmount,
      installmentsCount,
      dueDate,
      paymentFrequency
    );

    addLoan({
      clientId: selectedClient.id,
      clientName: selectedClient.fullName,
      clientPhone: selectedClient.phone,
      clientWhatsapp: selectedClient.whatsapp,
      principalAmount: totals.principal,
      interestRatePercent: totals.interestRatePercent,
      interestAmount: totals.interestAmount,
      totalOriginalAmount: totals.totalOriginalAmount,
      loanDate,
      dueDate,
      paymentFrequency,
      installmentsCount,
      dailyFineAmount,
      installments: generatedInstallments,
      status: 'em_dia',
      notes,
    });

    setIsSuccessModalOpen(true);
  };

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1C1C1C] border border-neutral-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8BCF00] text-black flex items-center justify-center font-bold">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">Cadastrar Novo Empréstimo</h3>
              <p className="text-xs text-neutral-400">Cálculo automático de juros (30%) e multa diária</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Client Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-neutral-300">Selecione o Cliente *</label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setIsClientModalOpen(true);
                }}
                className="text-xs text-[#8BCF00] hover:underline font-semibold cursor-pointer"
              >
                + Cadastrar Novo Cliente
              </button>
            </div>
            {clients.length === 0 ? (
              <p className="text-xs text-[#FF3B30]">Nenhum cliente cadastrado ainda. Cadastre um cliente primeiro.</p>
            ) : (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} - CPF: {c.cpf} ({c.phone})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quick Preset Value Buttons */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-2">
              Valores Rápidos Pré-configurados (Exemplos de Juros 30%):
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {LOAN_PRESETS.map((preset) => (
                <button
                  key={preset.principal}
                  type="button"
                  onClick={() => setPrincipalAmount(preset.principal)}
                  className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    principalAmount === preset.principal
                      ? 'bg-[#8BCF00] text-black border-[#8BCF00] shadow-sm'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  R${preset.principal}
                </button>
              ))}
            </div>
          </div>

          {/* Principal & Interest inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Valor Emprestado (R$) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-bold">R$</span>
                <input
                  type="number"
                  min="1"
                  step="10"
                  required
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl pl-10 pr-4 py-2.5 text-base font-extrabold text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Taxa de Juros (%) *</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={interestRatePercent}
                  onChange={(e) => setInterestRatePercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-base font-extrabold text-[#8BCF00] outline-none"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Automatic Calculation Highlight Card */}
          <div className="bg-gradient-to-r from-neutral-900 via-[#192403] to-neutral-900 p-4 rounded-2xl border border-[#8BCF00]/30 shadow-inner flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-[#8BCF00] uppercase tracking-wider flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5" /> Resultado do Cálculo Automático:
              </span>
              <p className="text-sm text-neutral-300">
                Valor Inicial: <strong>{formatCurrency(totals.principal)}</strong> + Juros ({totals.interestRatePercent}%):{' '}
                <strong className="text-emerald-400">{formatCurrency(totals.interestAmount)}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 uppercase block">Valor Final a Pagar</span>
              <span className="text-xl font-extrabold text-[#8BCF00] font-['Outfit']">
                {formatCurrency(totals.totalOriginalAmount)}
              </span>
            </div>
          </div>

          {/* Payment Frequency & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Forma de Pagamento</label>
              <select
                value={paymentFrequency}
                onChange={(e) => handleFrequencyChange(e.target.value as PaymentFrequency)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
              >
                <option value="pagamento_unico_30">Pagamento Único (até 30 dias)</option>
                <option value="diaria">Cobrança Diária</option>
                <option value="parcelado">Parcelado (Personalizado)</option>
              </select>
            </div>

            {paymentFrequency === 'parcelado' ? (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Quantidade de Parcelas</label>
                <input
                  type="number"
                  min="2"
                  max="24"
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 2)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Data do Empréstimo</label>
                <input
                  type="date"
                  value={loanDate}
                  onChange={(e) => setLoanDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Data de Vencimento Final *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Multa Diária por Atraso (R$/dia)</label>
              <input
                type="number"
                min="0"
                step="5"
                value={dailyFineAmount}
                onChange={(e) => setDailyFineAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-[#FF3B30] font-bold outline-none"
              />
              <span className="text-[10px] text-neutral-400">Padrão: R$ 20,00 por dia após o vencimento</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Observações do Contrato</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Termos específicos ou combinados com o cliente..."
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl p-3 text-sm text-white outline-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#8BCF00] hover:bg-[#9DE000] text-black text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-[#8BCF00]/20 transition-all cursor-pointer"
            >
              Criar Empréstimo ({formatCurrency(totals.totalOriginalAmount)})
            </button>
          </div>
        </form>
      </div>
    </div>

    <SuccessModal
      isOpen={isSuccessModalOpen}
      onClose={handleSuccessClose}
      title="Empréstimo Registrado"
      message="EMPRÉSTIMO CONCLUÍDO COM SUCESSO"
      buttonLabel="OK / CONCLUIR"
    />
    </>
  );
};
