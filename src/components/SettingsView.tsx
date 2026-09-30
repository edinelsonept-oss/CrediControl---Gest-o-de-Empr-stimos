import React, { useState, useRef } from 'react';
import {
  Settings,
  Building2,
  Percent,
  AlertTriangle,
  RotateCcw,
  Save,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Download,
  Upload,
  UserCheck,
  UserPlus,
  Lock,
  History,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  parseAndFormatCurrencyInput,
  formatCurrencyOnBlur,
  parseAndFormatPercentageInput,
} from '../utils/calculations';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetToSampleData,
    currentUser,
    employees,
    setActiveTab,
    auditLogs,
    downloadBackup,
    restoreBackupFromFile,
  } = useApp();

  const [defaultInterestRate, setDefaultInterestRate] = useState<number>(settings.defaultInterestRate);
  const [interestRateInputStr, setInterestRateInputStr] = useState<string>(String(settings.defaultInterestRate));
  const [defaultDailyFine, setDefaultDailyFine] = useState<number>(settings.defaultDailyFine);
  const [dailyFineInputStr, setDailyFineInputStr] = useState<string>(formatCurrencyOnBlur(settings.defaultDailyFine));
  const [companyName, setCompanyName] = useState<string>(settings.companyName);
  const [companyPhone, setCompanyPhone] = useState<string>(settings.companyPhone);
  const [companyWhatsapp, setCompanyWhatsapp] = useState<string>(settings.companyWhatsapp);
  const [companyAddress, setCompanyAddress] = useState<string>(settings.companyAddress);
  const [companyCnpj, setCompanyCnpj] = useState<string>(settings.companyCnpj || '');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync if settings change externally
  React.useEffect(() => {
    setDefaultInterestRate(settings.defaultInterestRate);
    setInterestRateInputStr(String(settings.defaultInterestRate));
    setDefaultDailyFine(settings.defaultDailyFine);
    setDailyFineInputStr(formatCurrencyOnBlur(settings.defaultDailyFine));
  }, [settings.defaultInterestRate, settings.defaultDailyFine]);

  const handleInterestRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const { display, numeric } = parseAndFormatPercentageInput(rawVal);
    setInterestRateInputStr(display);
    setDefaultInterestRate(numeric);
  };

  const handleDailyFineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const { display, numeric } = parseAndFormatCurrencyInput(rawVal);
    setDailyFineInputStr(display);
    setDefaultDailyFine(numeric);
  };

  const handleDailyFineBlur = () => {
    if (defaultDailyFine > 0) {
      setDailyFineInputStr(formatCurrencyOnBlur(defaultDailyFine));
    } else {
      setDailyFineInputStr('0,00');
    }
  };

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

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await restoreBackupFromFile(text);
      if (res.success) {
        setRestoreMessage({ type: 'success', text: res.message });
      } else {
        setRestoreMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setRestoreMessage({ type: 'error', text: 'Falha ao ler o arquivo de backup.' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setRestoreMessage(null), 6000);
    }
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
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  disabled={currentUser.role !== 'admin'}
                  value={interestRateInputStr}
                  onChange={handleInterestRateChange}
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
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  disabled={currentUser.role !== 'admin'}
                  value={dailyFineInputStr}
                  onChange={handleDailyFineChange}
                  onBlur={handleDailyFineBlur}
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

        {/* Employee Accounts Management Block */}
        {currentUser.role === 'admin' && (
          <div className="bg-[#1C1C1C] border border-neutral-800 p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#8BCF00]" /> Acessos & Logins dos Funcionários
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  O funcionário só consegue logar se você (Administrador) criar o usuário dele. Atualmente há{' '}
                  <strong className="text-white">{employees.length} funcionário(s) cadastrado(s)</strong> (
                  <span className="text-emerald-400 font-semibold">
                    {employees.filter((e) => e.status === 'active').length} ativos
                  </span>
                  ).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('employees')}
                className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" /> Gerenciar Funcionários & Senhas
              </button>
            </div>
          </div>
        )}

        {/* Database & Backup Options */}
        <div className="bg-[#1C1C1C] border border-neutral-800 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Download className="w-5 h-5 text-[#8BCF00]" /> Backup & Restauração de Dados
            </h3>
            <span className="text-[11px] font-mono bg-[#8BCF00]/10 text-[#8BCF00] border border-[#8BCF00]/30 px-2.5 py-0.5 rounded-full font-bold">
              Checksum SHA-256
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Exporte backups criptograficamente assinados com verificação de integridade e restaure bases de dados completas com segurança.
          </p>

          {restoreMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                restoreMessage.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/15 border border-red-500/30 text-red-300'
              }`}
            >
              {restoreMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{restoreMessage.text}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={downloadBackup}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-neutral-700 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-[#8BCF00]" /> Baixar Backup Seguro (JSON)
            </button>

            {currentUser.role === 'admin' && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileRestore}
                  accept=".json,application/json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-neutral-700 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-[#8BCF00]" /> Restaurar Arquivo de Backup
                </button>
              </>
            )}

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

        {/* Security Audit Trail Viewer */}
        <div className="bg-[#1C1C1C] border border-neutral-800 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#8BCF00]" />
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">Trilha de Auditoria Imutável</h3>
                <p className="text-xs text-neutral-400">
                  Registro de ações críticas, transações financeiras e acessos ({auditLogs.length} eventos registrados)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAuditLogs(!showAuditLogs)}
              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 rounded-xl border border-neutral-700 transition-colors cursor-pointer"
            >
              {showAuditLogs ? 'Ocultar Logs' : 'Ver Logs Recentes'}
            </button>
          </div>

          {showAuditLogs && (
            <div className="space-y-2 pt-2">
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-3 text-center">Nenhum evento registrado ainda.</p>
                ) : (
                  auditLogs.slice(0, 30).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800/80 text-xs flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#8BCF00]">{log.action}</span>
                          <span className="text-neutral-500">•</span>
                          <span className="text-neutral-400">{log.entityType} ({log.entityId})</span>
                        </div>
                        <p className="text-neutral-300 text-[11px]">
                          Usuário: <span className="font-semibold text-white">{log.userName}</span> ({log.userRole})
                        </p>
                        {log.details && (
                          <pre className="text-[10px] text-neutral-400 font-mono overflow-x-auto bg-neutral-900/60 p-1.5 rounded-lg border border-neutral-800">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Security & RBAC Status */}
        <div className="bg-[#1C1C1C] border border-neutral-800 p-6 rounded-3xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#8BCF00]" /> Segurança do Banco de Dados & Menor Privilégio
            </h3>
            <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Proteção Ativa
            </span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            O CrediControl implementa o princípio do menor privilégio. Todas as alterações passam pela camada de autorização, validação de integridade financeira e transações atômicas ACID.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800/80 flex items-center gap-2.5">
              <FileCheck className="w-4 h-4 text-[#8BCF00] shrink-0" />
              <span className="text-neutral-300">Validação CPF Módulo 11 & Sanitização XSS/NoSQL</span>
            </div>
            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800/80 flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[#8BCF00] shrink-0" />
              <span className="text-neutral-300">RBAC: Apenas Admin pode excluir clientes e empréstimos</span>
            </div>
            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800/80 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#8BCF00] shrink-0" />
              <span className="text-neutral-300">Transações Atômicas ACID via Firestore runTransaction</span>
            </div>
            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800/80 flex items-center gap-2.5">
              <History className="w-4 h-4 text-[#8BCF00] shrink-0" />
              <span className="text-neutral-300">Coleção audit_logs Imutável e Protegida contra Exclusão</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
