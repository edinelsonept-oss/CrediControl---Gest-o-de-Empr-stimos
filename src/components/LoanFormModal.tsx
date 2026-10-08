import React, { useState, useEffect } from 'react';
import { X, Banknote, Calculator, Calendar, DollarSign, UserCheck, CheckCircle2, MapPin, Route as RouteIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Client, PaymentFrequency } from '../types';
import {
  calculateLoanTotals,
  formatCurrency,
  getTodayIso,
  getDateOffsetIso,
  generateInstallmentSchedule,
  LOAN_PRESETS,
  parseAndFormatCurrencyInput,
  formatCurrencyOnBlur,
  parseAndFormatPercentageInput,
} from '../utils/calculations';
import { SuccessModal } from './SuccessModal';

const AVAILABLE_ROUTES = [
  'Rota 1 - Centro / Comercial',
  'Rota 2 - Praia do Atalaia & Orla',
  'Rota 3 - Porto Grande & Bairros',
  'Rota 4 - Maçarico & Beira Mar',
  'Rota 5 - Zona Norte / Periferia',
];

interface LoanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoanFormModal: React.FC<LoanFormModalProps> = ({ isOpen, onClose }) => {
  const { clients, settings, addLoan, setIsClientModalOpen } = useApp();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [principalAmount, setPrincipalAmount] = useState<number>(1000);
  const [principalInputStr, setPrincipalInputStr] = useState<string>('1.000,00');
  const [interestRatePercent, setInterestRatePercent] = useState<number>(settings.defaultInterestRate || 30);
  const [interestRateInputStr, setInterestRateInputStr] = useState<string>(String(settings.defaultInterestRate || 30));
  const [loanDate, setLoanDate] = useState<string>(getTodayIso());
  const [dueDate, setDueDate] = useState<string>(getDateOffsetIso(30));
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('diaria');
  const [installmentsCount, setInstallmentsCount] = useState<number>(30);
  const [collectionRoute, setCollectionRoute] = useState<string>(AVAILABLE_ROUTES[0]);
  const [collectionMode, setCollectionMode] = useState<'cobranca_externa_rota' | 'cobranca_balcao_pix'>('cobranca_externa_rota');
  const [dailyFineAmount, setDailyFineAmount] = useState<number>(settings.defaultDailyFine || 20);
  const [dailyFineInputStr, setDailyFineInputStr] = useState<string>('20,00');
  const [notes, setNotes] = useState<string>('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Sync default client if list available
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  // Sync settings defaults and reset on open
  useEffect(() => {
    if (isOpen) {
      const defaultFine = settings.defaultDailyFine || 20;
      const defaultRate = settings.defaultInterestRate || 30;
      setInterestRatePercent(defaultRate);
      setInterestRateInputStr(String(defaultRate));
      setDailyFineAmount(defaultFine);
      setDailyFineInputStr(formatCurrencyOnBlur(defaultFine));
      setPrincipalAmount(1000);
      setPrincipalInputStr(formatCurrencyOnBlur(1000));
      // Default to Diário / Rota
      setPaymentFrequency('diaria');
      setInstallmentsCount(30);
      setDueDate(getDateOffsetIso(30));
      setCollectionRoute(AVAILABLE_ROUTES[0]);
      setCollectionMode('cobranca_externa_rota');
    }
  }, [settings, isOpen]);

  // Handle principal amount change as user types
  const handlePrincipalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const { display, numeric } = parseAndFormatCurrencyInput(rawVal);
    setPrincipalInputStr(display);
    setPrincipalAmount(numeric);
  };

  const handlePrincipalBlur = () => {
    if (principalAmount > 0) {
      setPrincipalInputStr(formatCurrencyOnBlur(principalAmount));
    } else {
      setPrincipalInputStr('');
    }
  };

  const handleInterestRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const { display, numeric } = parseAndFormatPercentageInput(rawVal);
    setInterestRateInputStr(display);
    setInterestRatePercent(numeric);
  };

  const handleDailyFineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const { display, numeric } = parseAndFormatCurrencyInput(rawVal);
    setDailyFineInputStr(display);
    setDailyFineAmount(numeric);
  };

  const handleDailyFineBlur = () => {
    if (dailyFineAmount > 0) {
      setDailyFineInputStr(formatCurrencyOnBlur(dailyFineAmount));
    } else {
      setDailyFineInputStr('0,00');
    }
  };

  // Handle frequency changes
  const handleFrequencyChange = (freq: PaymentFrequency) => {
    setPaymentFrequency(freq);
    if (freq === 'diaria') {
      const count = installmentsCount > 1 ? installmentsCount : 30;
      setInstallmentsCount(count);
      setDueDate(getDateOffsetIso(count));
    } else if (freq === 'pagamento_unico_30') {
      setInstallmentsCount(1);
      setDueDate(getDateOffsetIso(30));
    } else {
      setInstallmentsCount(3);
      setDueDate(getDateOffsetIso(90));
    }
  };

  const handleInstallmentsCountChange = (count: number) => {
    const safeCount = Math.max(1, Math.min(count, 365));
    setInstallmentsCount(safeCount);
    if (paymentFrequency === 'diaria') {
      setDueDate(getDateOffsetIso(safeCount));
    } else if (paymentFrequency === 'parcelado') {
      setDueDate(getDateOffsetIso(safeCount * 30));
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
      collectionRoute: paymentFrequency === 'diaria' || collectionMode === 'cobranca_externa_rota' ? collectionRoute : undefined,
      collectionMode,
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
                  onClick={() => {
                    setPrincipalAmount(preset.principal);
                    setPrincipalInputStr(formatCurrencyOnBlur(preset.principal));
                  }}
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
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0,00"
                  value={principalInputStr}
                  onChange={handlePrincipalChange}
                  onBlur={handlePrincipalBlur}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl pl-10 pr-4 py-2.5 text-base font-extrabold text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Taxa de Juros (%) *</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0"
                  value={interestRateInputStr}
                  onChange={handleInterestRateChange}
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

          {/* Payment Frequency / Schedule & Route Controls */}
          <div className="space-y-4 bg-neutral-900/70 p-4 rounded-2xl border border-neutral-800">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-neutral-200">
                  Modalidade / Cronograma de Pagamento *
                </label>
                <span className="text-[11px] font-semibold text-[#8BCF00]">
                  {paymentFrequency === 'diaria'
                    ? 'Cobrança diária (Seg-Sáb/Rotas)'
                    : paymentFrequency === 'pagamento_unico_30'
                    ? 'Vencimento integral'
                    : 'Parcelamento mensal'}
                </span>
              </div>

              {/* Distinct Schedule / Type Button Selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleFrequencyChange('diaria')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentFrequency === 'diaria'
                      ? 'bg-[#8BCF00]/15 border-[#8BCF00] text-white shadow-sm ring-1 ring-[#8BCF00]'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-extrabold uppercase tracking-wide">Diário</span>
                    <span className={`w-2 h-2 rounded-full ${paymentFrequency === 'diaria' ? 'bg-[#8BCF00]' : 'bg-neutral-600'}`} />
                  </div>
                  <span className="text-[11px] font-medium text-neutral-300">Cobrança Diária & Rota</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFrequencyChange('pagamento_unico_30')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentFrequency === 'pagamento_unico_30'
                      ? 'bg-[#8BCF00]/15 border-[#8BCF00] text-white shadow-sm ring-1 ring-[#8BCF00]'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-extrabold uppercase tracking-wide">Pagamento Único</span>
                    <span className={`w-2 h-2 rounded-full ${paymentFrequency === 'pagamento_unico_30' ? 'bg-[#8BCF00]' : 'bg-neutral-600'}`} />
                  </div>
                  <span className="text-[11px] font-medium text-neutral-300">Até 30 dias corrida</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFrequencyChange('parcelado')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentFrequency === 'parcelado'
                      ? 'bg-[#8BCF00]/15 border-[#8BCF00] text-white shadow-sm ring-1 ring-[#8BCF00]'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-extrabold uppercase tracking-wide">Parcelado</span>
                    <span className={`w-2 h-2 rounded-full ${paymentFrequency === 'parcelado' ? 'bg-[#8BCF00]' : 'bg-neutral-600'}`} />
                  </div>
                  <span className="text-[11px] font-medium text-neutral-300">Mensal Personalizado</span>
                </button>
              </div>

              {/* Accessible Form Select for Standard Tests & Automation */}
              <div className="mt-2.5">
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Seletor de Frequência de Pagamento / Tipo:
                </label>
                <select
                  value={paymentFrequency}
                  onChange={(e) => handleFrequencyChange(e.target.value as PaymentFrequency)}
                  aria-label="Tipo e cronograma de pagamento"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                >
                  <option value="diaria">Diário (Cobrança Diária em Rota)</option>
                  <option value="pagamento_unico_30">Pagamento Único (até 30 dias)</option>
                  <option value="parcelado">Parcelado (Mensal Personalizado)</option>
                </select>
              </div>
            </div>

            {/* Route Selection and Mode (Visible & Active for Diário or Route-based workflow) */}
            <div className="pt-2 border-t border-neutral-800/80">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
                    <RouteIcon className="w-3.5 h-3.5 text-[#8BCF00]" /> Rota de Cobrança / Setor
                  </label>
                  <select
                    value={collectionRoute}
                    onChange={(e) => setCollectionRoute(e.target.value)}
                    aria-label="Rota de cobrança"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  >
                    {AVAILABLE_ROUTES.map((route) => (
                      <option key={route} value={route}>
                        {route}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    {paymentFrequency === 'diaria'
                      ? 'Rota atribuída aos cobradores para visita presencial diária'
                      : 'Setor geográfico de atendimento'}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#8BCF00]" /> Modalidade de Recolhimento
                  </label>
                  <select
                    value={collectionMode}
                    onChange={(e) => setCollectionMode(e.target.value as any)}
                    aria-label="Modalidade de recolhimento"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="cobranca_externa_rota">Cobrança Externa em Rota (Presencial)</option>
                    <option value="cobranca_balcao_pix">Balcão / PIX Remoto Direto</option>
                  </select>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    Define o fluxo operacional da cobrança
                  </span>
                </div>
              </div>
            </div>

            {/* Installments & Dates tied to mode */}
            <div className="pt-2 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {paymentFrequency === 'diaria' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Número de Dias / Parcelas Diárias *
                    </label>
                    <span className="text-[11px] font-bold text-[#8BCF00] font-mono">
                      {formatCurrency(totals.totalOriginalAmount / (installmentsCount || 1))}/dia
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={installmentsCount}
                    onChange={(e) => handleInstallmentsCountChange(parseInt(e.target.value) || 1)}
                    aria-label="Quantidade de parcelas diárias"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none"
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    Ex: 20 dias, 26 dias úteis ou 30 dias corridos
                  </span>
                </div>
              ) : paymentFrequency === 'parcelado' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Quantidade de Parcelas Mensais *
                    </label>
                    <span className="text-[11px] font-bold text-[#8BCF00] font-mono">
                      {formatCurrency(totals.totalOriginalAmount / (installmentsCount || 1))}/mês
                    </span>
                  </div>
                  <input
                    type="number"
                    min="2"
                    max="24"
                    value={installmentsCount}
                    onChange={(e) => handleInstallmentsCountChange(parseInt(e.target.value) || 2)}
                    aria-label="Quantidade de parcelas mensais"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none"
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    Divisão em parcelas com vencimento a cada 30 dias
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Parcelas da Modalidade
                  </label>
                  <input
                    type="text"
                    disabled
                    value="1 Parcela Única (Pagamento Integral)"
                    className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-400 outline-none cursor-not-allowed"
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    Amortização em um único pagamento no vencimento
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Data do Empréstimo</label>
                <input
                  type="date"
                  value={loanDate}
                  onChange={(e) => setLoanDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Data de Vencimento Final *</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
                <span className="text-[10px] text-neutral-400 mt-0.5 block">
                  {paymentFrequency === 'diaria'
                    ? `Vencimento da última parcela (${installmentsCount}º dia)`
                    : 'Data limite para liquidação'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Multa Diária por Atraso (R$/dia)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-bold">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={dailyFineInputStr}
                    onChange={handleDailyFineChange}
                    onBlur={handleDailyFineBlur}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#FF3B30] font-bold outline-none"
                  />
                </div>
                <span className="text-[10px] text-neutral-400 mt-1 block">Padrão: R$ 20,00 por dia após o vencimento</span>
              </div>
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
