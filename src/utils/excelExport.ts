import * as XLSX from 'xlsx';
import { Client, Loan, SystemSettings } from '../types';
import { getLoanFinancialSummary } from './calculations';

export function exportClientsExcel(clients: Client[]) {
  const data = clients.map((c) => ({
    'ID Cliente': c.id,
    'Nome Completo': c.fullName,
    CPF: c.cpf,
    RG: c.rg,
    Telefone: c.phone,
    WhatsApp: c.whatsapp,
    Email: c.email,
    CEP: c.address.cep,
    Rua: c.address.street,
    Número: c.address.number,
    Bairro: c.address.neighborhood,
    Cidade: c.address.city,
    Estado: c.address.state,
    'Qtd Documentos': c.documents?.length || 0,
    'Data de Cadastro': c.createdAt,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

  XLSX.writeFile(workbook, `Clientes_CrediControl_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportLoansExcel(loans: Loan[], settings: SystemSettings, filenameSuffix: string = 'Geral') {
  const data = loans.map((l) => {
    const summary = getLoanFinancialSummary(l, undefined, settings.defaultDailyFine);
    return {
      'ID Empréstimo': l.id,
      'Nome do Cliente': l.clientName,
      Telefone: l.clientPhone,
      'Valor Emprestado (R$)': l.principalAmount,
      'Taxa Juros (%)': l.interestRatePercent,
      'Valor Juros (R$)': l.interestAmount,
      'Valor Total Original (R$)': l.totalOriginalAmount,
      'Multa Atraso Acumulada (R$)': summary.fineAmount,
      'Dias Atraso': summary.delayDays,
      'Valor Atualizado (R$)': summary.updatedTotalAmount,
      'Total Pago (R$)': summary.totalPaid,
      'Saldo Devedor (R$)': summary.remainingBalance,
      'Lucro Obtido (R$)': summary.profitObtained,
      'Data Empréstimo': l.loanDate,
      'Data Vencimento': l.dueDate,
      'Forma Pagamento': l.paymentFrequency,
      Status: l.status,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Empréstimos');

  XLSX.writeFile(workbook, `Emprestimos_${filenameSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportFinancialSummaryExcel(loans: Loan[], settings: SystemSettings) {
  let totalLoaned = 0;
  let totalInterestForecast = 0;
  let totalFinesAccrued = 0;
  let totalReceived = 0;
  let totalProfitRealized = 0;
  let totalOverdueBalance = 0;

  loans.forEach((l) => {
    const summary = getLoanFinancialSummary(l, undefined, settings.defaultDailyFine);
    totalLoaned += l.principalAmount;
    totalInterestForecast += l.interestAmount;
    totalFinesAccrued += summary.fineAmount;
    totalReceived += summary.totalPaid;
    totalProfitRealized += summary.profitObtained;
    if (summary.isOverdue) {
      totalOverdueBalance += summary.remainingBalance;
    }
  });

  const summaryData = [
    { Indicador: 'Total Emprestado (Capital)', Valor: totalLoaned },
    { Indicador: 'Lucro Previsto (Juros)', Valor: totalInterestForecast },
    { Indicador: 'Multas por Atraso Acumuladas', Valor: totalFinesAccrued },
    { Indicador: 'Total em Atraso (Inadimplência)', Valor: totalOverdueBalance },
    { Indicador: 'Total Recebido (Pagamentos)', Valor: totalReceived },
    { Indicador: 'Lucro Realizado', Valor: totalProfitRealized },
  ];

  const worksheet = XLSX.utils.json_to_sheet(summaryData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumo Financeiro');

  XLSX.writeFile(workbook, `Relatorio_Financeiro_Mensal_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
