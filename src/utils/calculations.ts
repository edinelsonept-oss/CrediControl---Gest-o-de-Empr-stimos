import { Loan, Installment } from '../types';

/**
 * Format currency to Brazilian Real (R$)
 */
export function formatCurrency(value: number): string {
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format date from ISO (YYYY-MM-DD) to Brazilian format (DD/MM/YYYY)
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

/**
 * Get current date ISO string (YYYY-MM-DD)
 */
export function getTodayIso(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date N days from now (YYYY-MM-DD)
 */
export function getDateOffsetIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate difference in days between two ISO dates (date2 - date1)
 */
export function getDaysDifference(date1Str: string, date2Str: string): number {
  const d1 = new Date(date1Str.split('T')[0]);
  const d2 = new Date(date2Str.split('T')[0]);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate interest amount and total for a loan based on principal and percentage.
 * Example: R$ 100 with 30% -> R$ 130
 */
export function calculateLoanTotals(principal: number, interestRatePercent: number = 30) {
  const safePrincipal = Math.max(0, principal || 0);
  const interestAmount = (safePrincipal * interestRatePercent) / 100;
  const totalOriginalAmount = safePrincipal + interestAmount;
  return {
    principal: safePrincipal,
    interestRatePercent,
    interestAmount,
    totalOriginalAmount,
  };
}

/**
 * Preset examples defined in specs
 */
export const LOAN_PRESETS = [
  { principal: 100, result30: 130 },
  { principal: 200, result30: 260 },
  { principal: 300, result30: 390 },
  { principal: 500, result30: 650 },
  { principal: 700, result30: 910 },
  { principal: 1000, result30: 1300 },
  { principal: 1500, result30: 1950 },
  { principal: 2000, result30: 2600 },
];

/**
 * Calculates current delay days and accumulated fine for a loan/due date.
 * Rule: R$ 20.00 per day starting on day 1 after due date.
 * Example: Due date 2026-08-01, Today 2026-08-03 -> 2 days delay -> R$ 40 fine.
 */
export function calculateDelayAndFine(dueDateIso: string, dailyFineRate: number = 20, todayIso: string = getTodayIso()) {
  const daysDiff = getDaysDifference(dueDateIso, todayIso);
  const delayDays = Math.max(0, daysDiff);
  const fineAmount = delayDays * dailyFineRate;
  return {
    delayDays,
    fineAmount,
  };
}

/**
 * Calculates full financial status of a loan dynamically.
 */
export function getLoanFinancialSummary(loan: Loan, todayIso: string = getTodayIso(), defaultDailyFine: number = 20) {
  const dailyFineRate = loan.dailyFineAmount ?? defaultDailyFine;
  const totalPaid = (loan.payments || []).reduce((sum, p) => sum + p.amount, 0);

  let totalDelayDays = 0;
  let totalFineAccrued = 0;

  // Check if loan is completely paid
  if (totalPaid >= loan.totalOriginalAmount) {
    const remainingBalance = 0;
    const isPaid = true;
    return {
      totalOriginalAmount: loan.totalOriginalAmount,
      totalPaid,
      remainingBalance,
      delayDays: 0,
      fineAmount: 0,
      updatedTotalAmount: loan.totalOriginalAmount,
      isOverdue: false,
      isPaid,
      status: 'quitado' as const,
      profitObtained: totalPaid - loan.principalAmount,
    };
  }

  // Calculate delay fine based on main due date or open installments
  if (loan.dueDate && getDaysDifference(loan.dueDate, todayIso) > 0) {
    const { delayDays, fineAmount } = calculateDelayAndFine(loan.dueDate, dailyFineRate, todayIso);
    totalDelayDays = delayDays;
    totalFineAccrued = fineAmount;
  }

  const updatedTotalAmount = loan.totalOriginalAmount + totalFineAccrued;
  const remainingBalance = Math.max(0, updatedTotalAmount - totalPaid);
  const isOverdue = totalDelayDays > 0 && remainingBalance > 0;
  const profitObtained = Math.max(0, totalPaid - loan.principalAmount);

  const status = isOverdue ? ('em_atraso' as const) : ('em_dia' as const);

  return {
    totalOriginalAmount: loan.totalOriginalAmount,
    totalPaid,
    remainingBalance,
    delayDays: totalDelayDays,
    fineAmount: totalFineAccrued,
    updatedTotalAmount,
    isOverdue,
    isPaid: false,
    status,
    profitObtained,
  };
}

/**
 * Format CPF: 000.000.000-00
 */
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Format Telefone / WhatsApp: (00) 90000-0000
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

/**
 * Generate installment schedule automatically
 */
export function generateInstallmentSchedule(
  loanId: string,
  totalAmount: number,
  count: number,
  firstDueDate: string,
  frequency: 'diaria' | 'pagamento_unico_30' | 'parcelado'
): Installment[] {
  const installments: Installment[] = [];
  const baseDate = new Date(firstDueDate.split('T')[0]);
  const amountPerInstallment = Math.round((totalAmount / count) * 100) / 100;
  let runningTotal = 0;

  for (let i = 1; i <= count; i++) {
    const dueDate = new Date(baseDate);
    if (frequency === 'diaria') {
      dueDate.setDate(baseDate.getDate() + (i - 1));
    } else if (frequency === 'pagamento_unico_30') {
      // 30 days
      dueDate.setDate(baseDate.getDate() + 30);
    } else {
      // Monthly installments
      dueDate.setMonth(baseDate.getMonth() + (i - 1));
    }

    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    const dueDateIso = `${year}-${month}-${day}`;

    // Fix rounding on last installment
    const currentAmount = i === count ? Math.round((totalAmount - runningTotal) * 100) / 100 : amountPerInstallment;
    runningTotal += currentAmount;

    installments.push({
      id: `${loanId}_inst_${i}`,
      number: i,
      dueDate: dueDateIso,
      amount: currentAmount,
      paidAmount: 0,
      status: 'em_dia',
      delayDays: 0,
      fineAmount: 0,
    });
  }

  return installments;
}
