import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, Loan, PaymentRecord, SystemSettings } from '../types';
import { formatCurrency, formatDate, getLoanFinancialSummary } from './calculations';

export function exportClientsPdf(clients: Client[], settings: SystemSettings) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(settings.companyName || 'CrediControl - Relatório de Clientes', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 26);
  doc.text(`Total de Clientes: ${clients.length}`, 14, 31);

  const tableData = clients.map((c) => [
    c.fullName,
    c.cpf,
    c.phone,
    `${c.address.city}/${c.address.state}`,
    c.documents ? `${c.documents.length} doc(s)` : '0 doc',
    formatDate(c.createdAt),
  ]);

  autoTable(doc, {
    startY: 36,
    head: [['Nome Completo', 'CPF', 'Telefone', 'Cidade/UF', 'Documentos', 'Data Cadastro']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [139, 207, 0], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9 },
  });

  doc.save(`Relatorio_Clientes_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportLoansPdf(loans: Loan[], settings: SystemSettings, title: string = 'Relatório Geral de Empréstimos') {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(`${settings.companyName} - ${title}`, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Data da Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 26);
  doc.text(`Quantidade de Registros: ${loans.length}`, 14, 31);

  const tableData = loans.map((l) => {
    const summary = getLoanFinancialSummary(l, undefined, settings.defaultDailyFine);
    let statusText = 'Em dia';
    if (summary.isPaid) statusText = 'Quitado';
    else if (summary.isOverdue) statusText = `Em Atraso (${summary.delayDays}d)`;

    return [
      l.clientName,
      formatCurrency(l.principalAmount),
      `${l.interestRatePercent}% (${formatCurrency(l.interestAmount)})`,
      formatCurrency(summary.updatedTotalAmount),
      formatCurrency(summary.totalPaid),
      formatCurrency(summary.remainingBalance),
      formatDate(l.dueDate),
      statusText,
    ];
  });

  autoTable(doc, {
    startY: 36,
    head: [['Cliente', 'Valor Emprestado', 'Juros', 'Total + Multa', 'Total Pago', 'Saldo Devedor', 'Vencimento', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [18, 18, 18], textColor: [139, 207, 0], fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function generatePaymentReceiptPdf(payment: PaymentRecord, loan: Loan, client: Client, settings: SystemSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 150], // Receipt thermal size format
  });

  const summary = getLoanFinancialSummary(loan, undefined, settings.defaultDailyFine);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.companyName.toUpperCase(), 40, 10, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('COMPROVANTE DE PAGAMENTO', 40, 15, { align: 'center' });
  doc.text('----------------------------------------------------', 40, 18, { align: 'center' });

  doc.setFontSize(8);
  doc.text(`Recibo Nº: ${payment.id}`, 5, 24);
  doc.text(`Data/Hora: ${payment.date} `, 5, 29);
  doc.text(`Operador: ${payment.registeredBy}`, 5, 34);

  doc.text('----------------------------------------------------', 40, 38, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE:', 5, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${client.fullName}`, 5, 49);
  doc.text(`CPF: ${client.cpf}`, 5, 54);

  doc.text('----------------------------------------------------', 40, 58, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text('DETALHES DO PAGAMENTO:', 5, 64);
  doc.setFont('helvetica', 'normal');
  doc.text(`Valor Pago: ${formatCurrency(payment.amount)}`, 5, 69);
  doc.text(`Forma: ${payment.paymentMethod.toUpperCase()}`, 5, 74);
  if (payment.note) {
    doc.text(`Obs: ${payment.note}`, 5, 79);
  }

  doc.text('----------------------------------------------------', 40, 84, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO DO EMPRÉSTIMO:', 5, 90);
  doc.setFont('helvetica', 'normal');
  doc.text(`Valor Original: ${formatCurrency(loan.totalOriginalAmount)}`, 5, 95);
  doc.text(`Total Pago Acumulado: ${formatCurrency(summary.totalPaid)}`, 5, 100);
  doc.text(`Saldo Devedor Restante: ${formatCurrency(summary.remainingBalance)}`, 5, 105);

  doc.setFontSize(7);
  doc.text('Obrigado pela preferência e pontualidade!', 40, 120, { align: 'center' });

  doc.save(`Recibo_Pagamento_${payment.id}.pdf`);
}
