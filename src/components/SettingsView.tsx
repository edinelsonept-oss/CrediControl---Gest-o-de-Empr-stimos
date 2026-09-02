import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Percent,
  AlertTriangle,
  RotateCcw,
  Save,
  CheckCircle2,
  ShieldAlert,
  Download,
  Upload,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetToSampleData, currentUser } = useApp();

  const [defaultInterestRate, setDefaultInterestRate] = useState<number>(settings.defaultInterestRate);
  const [defaultDailyFine, setDefaultDailyFine] = useState<number>(settings.defaultDailyFine);
  const [companyName, setCompanyName] = useState<string>(settings.companyName);
  const [companyPhone, setCompanyPhone] = useState<string>(settings.companyPhone);
  const [companyWhatsapp, setCompanyWhatsapp] = useState<string>(settings.companyWhatsapp);
  const [companyAddress, setCompanyAddress] = useState<string>(settings.companyAddress);
  const [companyCnpj, setCompanyCnpj] = useState<string>(settings.companyCnpj || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      defaultInterestRate,
      defaultDailyFine,
      companyName,
      companyPhone,
      companyWhatsapp,
      companyAddress,
      companyCnpj,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleBackupExport = () => {
    const backupData = {
      clients: JSON.parse(localStorage.getItem('credicontrol_loan_app_v1_clients') || '[]'),
      loans: JSON.parse(localStorage.getItem('credicontrol_loan_app_v1_loans') || '[]'),
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_CrediControl_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-[#8BCF00]" /> Configurações do Sistema & Parâmetros
        </h2>
        <p className="text-neutral-400 text-sm mt-0.5">
          Ajuste as taxas de juros padrão, valor da multa diária por atraso e dados da empresa financeira.
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-[#8BCF00]/20 text-[#8BCF00] p-4 rounded-2xl border border-[#8BCF00]/40 flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5" /> Configurações salvas com sucesso!
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Loan Financial Parameters */}
        <div className="bg-[#1C1C1C] border border-neutral-800 p-6 rounded-3xl shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
            <Percent className="w-5 h-5 text-[#8BCF00]" /> Regras Financeiras do Credor
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Taxa de Juros Padrão (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={currentUser.role !== 'admin'}
                  value={defaultInterestRate}
                  onChange={(e) => setDefaultInterestRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-base font-extrabold text-[#8BCF00] outline-none disabled:opacity-50"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">%</span>
              </div>
              <span className="text-[11px] text-neutral-400 mt-1 block">Padrão configurado: 30%</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Multa Diária por Atraso (R$/dia)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">R$</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  disabled={currentUser.role !== 'admin'}
                  value={defaultDailyFine}
                  onChange={(e) => setDefaultDailyFine(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl pl-10 pr-4 py-2.5 text-base font-extrabold text-[#FF3B30] outline-none disabled:opacity-50"
                />
              </div>
              <span className="text-[11px] text-neutral-400 mt-1 block">Padrão: R$ 20,00 por dia (inicia no 1º dia após vencimento)</span>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-[#1C1C1C] border border-neutral-800 p-6 rounded-3xl shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#8BCF00]" /> Dados do Credor / Empresa Financeira
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Nome da Empresa / Credor</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">CNPJ / CPF</label>
              <input
                type="text"
                value={companyCnpj}
                onChange={(e) => setCompanyCnpj(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Telefone Principal</label>
              <input
                type="text"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">WhatsApp para Cobranças</label>
              <input
                type="text"
                value={companyWhatsapp}
                onChange={(e) => setCompanyWhatsapp(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Endereço Comercial</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-[#8BCF00]/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Salvar Configurações
            </button>
          </div>
        </div>

        {/* Database & Backup Options */}
        <div className="bg-[#1C1C1C] border border-neutral-800 p-6 rounded-3xl shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
            <Download className="w-5 h-5 text-[#8BCF00]" /> Backup & Restauração de Dados
          </h3>
          <p className="text-xs text-neutral-400">
            Faça download do arquivo de backup de segurança em tempo real com todos os clientes e empréstimos.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleBackupExport}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-neutral-700 flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#8BCF00]" /> Baixar Backup JSON em Nuvem
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Deseja restaurar os dados de demonstração originais? Essa ação substituirá os registros atuais.')) {
                  resetToSampleData();
                  alert('Dados demonstrativos restaurados com sucesso!');
                }
              }}
              className="bg-[#FF3B30]/15 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Restaurar Dados de Exemplo
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
