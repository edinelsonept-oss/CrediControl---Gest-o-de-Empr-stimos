import { Loan, Client, SystemSettings } from '../types';
import { formatCurrency, formatDate, getLoanFinancialSummary } from './calculations';

export function generateWhatsAppMessage(
  client: Client,
  loan: Loan,
  settings: SystemSettings,
  messageType: 'lembrete_3_dias' | 'lembrete_1_dia' | 'vencimento_hoje' | 'cobranca_atraso'
): string {
  const summary = getLoanFinancialSummary(loan, undefined, settings.defaultDailyFine);
  const firstName = client.fullName.split(' ')[0];

  if (messageType === 'cobranca_atraso') {
    return `Olá ${firstName}, seu pagamento no valor original de ${formatCurrency(summary.totalOriginalAmount)} está em ATRASO de ${summary.delayDays} dia(s).

⚠️ *Aviso de Multa*: Há uma multa diária acumulada de *${formatCurrency(summary.fineAmount)}* (${formatCurrency(loan.dailyFineAmount || settings.defaultDailyFine)}/dia).

💰 *Valor Atualizado*: *${formatCurrency(summary.remainingBalance)}*

Por favor, entre em contato para regularização e envio do comprovante Pix.
_ ${settings.companyName}_`;
  }

  if (messageType === 'vencimento_hoje') {
    return `Olá ${firstName}! Lembrando que o seu pagamento no valor de *${formatCurrency(summary.remainingBalance)}* VENCE HOJE (${formatDate(loan.dueDate)}).

Evite a incidência da multa diária de ${formatCurrency(loan.dailyFineAmount || settings.defaultDailyFine)} efetuando o pagamento até o fim do dia.

Dúvidas ou envio do comprovante, fale conosco!
_ ${settings.companyName}_`;
  }

  if (messageType === 'lembrete_1_dia') {
    return `Olá ${firstName}! Seu pagamento no valor de *${formatCurrency(summary.remainingBalance)}* vence AMANHÃ (${formatDate(loan.dueDate)}).

Evite multas por atraso e mantenha seu compromisso em dia.

_ ${settings.companyName}_`;
  }

  // 3 dias
  return `Olá ${firstName}! Tudo bem? Passando para lembrar que seu parcelamento no valor de *${formatCurrency(summary.remainingBalance)}* vence em 3 dias (${formatDate(loan.dueDate)}).

Tenha um ótimo dia!
_ ${settings.companyName}_`;
}

export function openWhatsAppChat(phoneOrWhatsapp: string, textMessage: string) {
  const cleanPhone = phoneOrWhatsapp.replace(/\D/g, '');
  // Format with country code 55 if not present
  const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
  const encodedText = encodeURIComponent(textMessage);
  const url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
