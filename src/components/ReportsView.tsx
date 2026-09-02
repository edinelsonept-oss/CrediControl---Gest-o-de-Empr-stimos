import React from 'react';
import {
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Download,
  Users,
  Banknote,
  DollarSign,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, getLoanFinancialSummary } from '../utils/calculations';
import { exportClientsPdf, exportLoansPdf } from '../utils/pdfExport';
import { exportClientsExcel, exportLoansExcel, exportFinancialSummaryExcel } from '../utils/excelExport';

export const ReportsView: React.FC = () => {
  const { clients, loans, settings } = useApp();

  const overdueLoans = loans.filter(
    (l) => getLoanFinancialSummary(l, undefined, settings.defaultDailyFine).isOverdue
  );

  const paidLoans = loans.filter(
    (l) => getLoanFinancialSummary(l, undefined, settings.defaultDailyFine).isPaid
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
            <FileBarChart className="w-7 h-7 text-[#8BCF00]" /> Relatórios Financeiros & Exportação
          </h2>
          <p className="text-neutral-400 text-sm mt-0.5">
            Gere relatórios impressos em PDF ou planilhas do Excel (XLSX) em 1 clique.
          </p>
        </div>
      </div>

      {/* Grid of Report Generators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Relatório de Clientes */}
        <div className="bg-[#1C1C1C] border border-neutral-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-['Outfit']">Relatório de Clientes</h3>
              <p className="text-xs text-neutral-400">{clients.length} clientes cadastrados</p>
            </div>
          </div>
          <p className="text-xs text-neutral-300">
            Lista completa com CPF, RG, telefones, endereços e total de documentos anexados.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => exportClientsPdf(clients, settings)}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold py-2.5 rounded-xl border border-neutral-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#FF3B30]" /> PDF
            </button>
            <button
              onClick={() => exportClientsExcel(clients)}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold py-2.5 rounded-xl border border-neutral-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Excel
            </button>
          </div>
        </div>

        {/* 2. Relatório de Empréstimos Geral */}
        <div className="bg-[#1C1C1C] border border-neutral-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#8BCF00]/10 text-[#8BCF00] flex items-center justify-center">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-['Outfit']">Relatório de Empréstimos</h3>
              <p className="text-xs text-neutral-400">{loans.length} contratos ativos/históricos</p>
            </div>
          </div>
          <p className="text-xs text-neutral-300">
            Resumo detalhado com principal, juros de 30%, vencimento e saldo devedor.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => exportLoansPdf(loans, settings, 'Relatorio_Geral_Emprestimos')}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold py-2.5 rounded-xl border border-neutral-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#FF3B30]" /> PDF
            </button>
            <button
              onClick={() => exportLoansExcel(loans, settings, 'Geral')}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold py-2.5 rounded-xl border border-neutral-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Excel
            </button>
          </div>
        </div>

        {/* 3. Relatório de Clientes Inadimplentes */}
        <div className="bg-[#1C1C1C] border border-[#FF3B30]/40 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-4 bg-gradient-to-b from-[#FF3B30]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FF3B30]/20 text-[#FF3B30] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-[#FF3B30] text-base font-['Outfit']">Relatório de Inadimplência</h3>
              <p className="text-xs text-neutral-400">{overdueLoans.length} contratos em atraso</p>
            </div>
          </div>
          <p className="text-xs text-neutral-300">
            Lista focada em cobrança: dias de atraso, multas acumuladas de R$20/dia e total a cobrar.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => exportLoansPdf(overdueLoans, settings, 'Relatorio_Inadimplencia_Atraso')}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold py-2.5 rounded-xl border border-neutral-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#FF3B30]" /> PDF
            </button>
            <button
              onClick={() => exportLoansExcel(overdueLoans, settings, 'Inadimplentes')}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold py-2.5 rounded-xl border border-neutral-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Excel
            </button>
          </div>
        </div>

        {/* 4. Resumo Financeiro e Lucro Mensal */}
        <div className="bg-[#1C1C1C] border border-neutral-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-['Outfit']">Lucro Mensal & DRE</h3>
              <p className="text-xs text-neutral-400">DRE do credor</p>
            </div>
          </div>
          <p className="text-xs text-neutral-300">
            Resumo consolidado de capital investido, juros obtidos, multas arrecadadas e balanço.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => exportFinancialSummaryExcel(loans, settings)}
              className="w-full bg-[#8BCF00] hover:bg-[#9DE000] text-black text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" /> Baixar Planilha Consolidada (Excel)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
