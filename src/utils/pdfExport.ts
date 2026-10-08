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

/**
 * Generates and downloads the official Promissory Note / Loan Contract PDF (Nota Promissória e Contrato)
 */
export function generatePromissoryNotePdf(loan: Loan, client: Client, settings: SystemSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const summary = getLoanFinancialSummary(loan, undefined, settings.defaultDailyFine);

  // Border frame
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277);

  // Header Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(settings.companyName.toUpperCase(), 105, 22, { align: 'center' });

  doc.setFontSize(12);
  doc.text('NOTA PROMISSÓRIA & CONTRATO DE MÚTUO FINANCEIRO', 105, 30, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Nº do Contrato: ${loan.id}   |   Emissão: ${formatDate(loan.loanDate)}   |   Vencimento Final: ${formatDate(loan.dueDate)}`, 105, 36, { align: 'center' });

  doc.setLineWidth(0.3);
  doc.line(15, 40, 195, 40);

  // Value Box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(15, 44, 180, 18, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(`VALOR NOMINAL: ${formatCurrency(loan.totalOriginalAmount)}`, 20, 52);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`(Principal: ${formatCurrency(loan.principalAmount)} + Juros Acordados: ${formatCurrency(loan.interestAmount)} a ${loan.interestRatePercent}%)`, 20, 58);

  // Promissory Note Text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  const legalText = `No dia ${formatDate(loan.dueDate)}, pagarei por esta única via de NOTA PROMISSÓRIA à ${settings.companyName.toUpperCase()}, inscrita sob o CNPJ ${settings.companyCnpj || 'sob registro local'}, ou à sua ordem, a quantia estipulada de ${formatCurrency(loan.totalOriginalAmount)}, em moeda corrente deste país.`;
  const splitLegal = doc.splitTextToSize(legalText, 175);
  doc.text(splitLegal, 18, 70);

  // Client Details Box
  doc.setFont('helvetica', 'bold');
  doc.text('QUALIFICAÇÃO DO DEVEDOR / EMITENTE:', 18, 88);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nome Completo: ${client.fullName}`, 18, 94);
  doc.text(`CPF: ${client.cpf}   |   RG: ${client.rg || 'Não informado'}   |   Telefone: ${client.phone}`, 18, 100);
  doc.text(`Endereço: ${client.address.street}, Nº ${client.address.number} - ${client.address.neighborhood}, ${client.address.city}/${client.address.state} (CEP: ${client.address.cep})`, 18, 106);

  // Loan Schedule Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CRONOGRAMA DE PAGAMENTO / PARCELAS:', 18, 118);

  const installments = loan.installments && loan.installments.length > 0
    ? loan.installments
    : [{ id: '1', number: 1, dueDate: loan.dueDate, amount: loan.totalOriginalAmount, paidAmount: 0, status: 'em_dia' as const, delayDays: 0, fineAmount: 0 }];

  const tableBody = installments.map((inst) => [
    `Parcela ${inst.number}/${installments.length}`,
    formatDate(inst.dueDate),
    formatCurrency(inst.amount),
    inst.status === 'paga' ? 'Paga' : inst.status === 'atrasada' ? 'Em Atraso' : 'A Vencer',
  ]);

  autoTable(doc, {
    startY: 122,
    head: [['Parcela', 'Vencimento', 'Valor', 'Situação']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8 },
    margin: { left: 18, right: 18 },
  });

  const lastY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 180;

  // Penalty Clause
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`CLÁUSULA DE MORA: O atraso na liquidação de qualquer parcela acarretará multa moratória de ${formatCurrency(loan.dailyFineAmount || 20)} por dia de atraso, calculada até a data da efetiva quitação.`, 18, lastY, { maxWidth: 175 });

  // Signatures
  const sigY = Math.min(250, lastY + 30);
  doc.line(25, sigY, 95, sigY);
  doc.line(115, sigY, 185, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(client.fullName.toUpperCase(), 60, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitente (CPF: ${client.cpf})`, 60, sigY + 9, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(settings.companyName.toUpperCase(), 150, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Credor / Beneficiário', 150, sigY + 9, { align: 'center' });

  doc.save(`Nota_Promissoria_${client.fullName.replace(/\s+/g, '_')}_${loan.id}.pdf`);
}

