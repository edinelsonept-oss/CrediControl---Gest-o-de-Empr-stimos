import { Loan, Installment, PaymentRecord } from '../types';

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
 * Parses and formats currency input string as the user types.
 * Eliminates unwanted leading zeros (e.g. '020000' -> '20.000').
 * Supports numbers and strings, optional comma decimals.
 * Returns both the formatted display string and the accurate numeric value.
 */
export function parseAndFormatCurrencyInput(input: string | number): {
  display: string;
  numeric: number;
} {
  if (typeof input === 'number') {
    if (isNaN(input) || input === 0) return { display: '', numeric: 0 };
    return {
      display: input.toLocaleString('pt-BR', {
        minimumFractionDigits: Number.isInteger(input) ? 0 : 2,
        maximumFractionDigits: 2,
      }),
      numeric: input,
    };
  }

  if (!input || typeof input !== 'string') {
    return { display: '', numeric: 0 };
  }

  let str = input.trim();
  // If dot was used as decimal separator (e.g. from pasted code or float string without comma)
  if (!str.includes(',') && str.includes('.')) {
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      str = parts[0] + ',' + parts[1];
    }
  }

  // Strip all non-digit and non-comma characters
  let clean = str.replace(/[^\d,]/g, '');

  // Keep at most one comma
  const firstComma = clean.indexOf(',');
  if (firstComma !== -1) {
    clean = clean.slice(0, firstComma + 1) + clean.slice(firstComma + 1).replace(/,/g, '');
  }

  const parts = clean.split(',');
  let intPart = parts[0] || '';

  // Crucial: Strip leading zeros! '020000' -> '20000', '00' -> '0', '0' -> '0'
  intPart = intPart.replace(/^0+(?=\d)/, '');

  if (parts.length > 1) {
    const decPart = parts[1].slice(0, 2);
    const rawNumber = parseFloat((intPart || '0') + '.' + decPart) || 0;
    const formattedInt = intPart ? parseInt(intPart, 10).toLocaleString('pt-BR') : '0';
    return {
      display: formattedInt + ',' + decPart,
      numeric: rawNumber,
    };
  } else {
    if (!intPart) {
      return { display: '', numeric: 0 };
    }
    const numeric = parseInt(intPart, 10) || 0;
    return {
      display: numeric.toLocaleString('pt-BR'),
      numeric,
    };
  }
}

/**
 * Formats a numeric value when input loses focus (onBlur) to standard BRL with 2 decimal places.
 * Example: 20000 -> "20.000,00"
 */
export function formatCurrencyOnBlur(numeric: number): string {
  if (isNaN(numeric) || numeric <= 0) return '';
  return numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parses and formats percentage input string without unwanted leading zeros.
 * E.g. '030' -> '30', '2.5' -> '2,5'
 */
export function parseAndFormatPercentageInput(input: string | number): {
  display: string;
  numeric: number;
} {
  if (typeof input === 'number') {
    if (isNaN(input)) return { display: '0', numeric: 0 };
    return {
      display: input.toLocaleString('pt-BR', {
        maximumFractionDigits: 2,
      }),
      numeric: input,
    };
  }

  if (!input || typeof input !== 'string') {
    return { display: '', numeric: 0 };
  }

  let clean = input.replace(/[^\d,\.]/g, '').replace(/\./g, ',');
  const commaIdx = clean.indexOf(',');
  if (commaIdx !== -1) {
    clean = clean.slice(0, commaIdx + 1) + clean.slice(commaIdx + 1).replace(/,/g, '');
  }

  const parts = clean.split(',');
  let intPart = parts[0] || '';
  intPart = intPart.replace(/^0+(?=\d)/, '');

  if (parts.length > 1) {
    const dec = parts[1].slice(0, 2);
    const num = parseFloat((intPart || '0') + '.' + dec) || 0;
    return {
      display: (intPart || '0') + ',' + dec,
      numeric: num,
    };
  } else {
    if (!intPart) return { display: '', numeric: 0 };
    const num = parseInt(intPart, 10) || 0;
    return {
      display: intPart,
      numeric: num,
    };
  }
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

/**
 * Monthly financial record structure for Dashboard and financial reporting.
 */
export interface MonthlyFinancialRecord {
  key: string; // 'YYYY-MM'
  name: string; // 'Jan', 'Fev', 'Mar', etc.
  fullName: string; // 'Março de 2026'
  emprestado: number; // Total principal effectively loaned in this month
  recebido: number; // Total amount effectively received/paid in this month
  lucro: number; // Profit realized in this month (payments exceeding loan principal)
}

/**
 * Parses YYYY-MM safely from ISO date string without any timezone shift.
 */
export function parseYearMonth(dateStr?: string | null): { year: number; month: number; key: string } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim().split('T')[0].split(' ')[0];
  const parts = clean.split('-');
  if (parts.length >= 2) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
      return {
        year,
        month,
        key: `${year}-${String(month).padStart(2, '0')}`,
      };
    }
  }
  return null;
}

/**
 * Generates monthly financial aggregates (Emprestado, Recebido, Lucro)
 * from real system loans and payments, grouped strictly by month.
 *
 * Rules:
 * - "Emprestado": sum of principal amounts of loans granted in that month.
 * - "Recebido": sum of payment amounts actually received in that month.
 * - "Lucro": realized profit according to the system's rule (payments exceeding principal).
 * - Months without activity will have 0 (R$ 0,00).
 * - Timezone-safe: parsed directly from date strings.
 */
export function getMonthlyFinancialData(
  loans: Loan[],
  monthCount: number = 7,
  todayIso: string = getTodayIso()
): MonthlyFinancialRecord[] {
  const [currYearStr, currMonthStr] = (todayIso || getTodayIso()).split('-');
  const currYear = parseInt(currYearStr, 10) || new Date().getFullYear();
  const currMonth = parseInt(currMonthStr, 10) || (new Date().getMonth() + 1);

  const monthNamesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthNamesFull = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const monthlyMap = new Map<string, MonthlyFinancialRecord>();
  const orderedList: MonthlyFinancialRecord[] = [];

  // 1. Build ordered sequence of continuous months ending in current month
  for (let i = monthCount - 1; i >= 0; i--) {
    let m = currMonth - i;
    let y = currYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const name = monthNamesShort[m - 1];
    const fullName = `${monthNamesFull[m - 1]} de ${y}`;

    const record: MonthlyFinancialRecord = {
      key,
      name,
      fullName,
      emprestado: 0,
      recebido: 0,
      lucro: 0,
    };

    monthlyMap.set(key, record);
    orderedList.push(record);
  }

  // 2. Sum "Emprestado" based on loan grant date (loanDate or createdAt)
  loans.forEach((loan) => {
    const dateStr = loan.loanDate || loan.createdAt;
    const ym = parseYearMonth(dateStr);
    if (ym && monthlyMap.has(ym.key)) {
      const record = monthlyMap.get(ym.key)!;
      record.emprestado += Number(loan.principalAmount) || 0;
    }
  });

  // 3. Sum "Recebido" and calculate realized "Lucro" based on payment dates
  loans.forEach((loan) => {
    const principal = Number(loan.principalAmount) || 0;
    // Chronologically order payments to accurately calculate profit realized
    const sortedPayments = [...(loan.payments || [])].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

    let accumulatedPaidBefore = 0;

    sortedPayments.forEach((payment) => {
      const paymentAmount = Number(payment.amount) || 0;
      const accumulatedPaidAfter = accumulatedPaidBefore + paymentAmount;

      // Realized profit: portion of payment exceeding the principal capital
      const profitBefore = Math.max(0, accumulatedPaidBefore - principal);
      const profitAfter = Math.max(0, accumulatedPaidAfter - principal);
      const profitFromThisPayment = Math.max(0, profitAfter - profitBefore);

      accumulatedPaidBefore = accumulatedPaidAfter;

      const ym = parseYearMonth(payment.date);
      if (ym && monthlyMap.has(ym.key)) {
        const record = monthlyMap.get(ym.key)!;
        record.recebido += paymentAmount;
        record.lucro += profitFromThisPayment;
      }
    });
  });

  return orderedList;
}

