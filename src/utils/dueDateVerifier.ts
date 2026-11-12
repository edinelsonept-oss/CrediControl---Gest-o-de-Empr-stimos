import { Loan, Client, Installment } from '../types';
import { getLoanFinancialSummary, getTodayIso } from './calculations';

export interface DueLoanItem {
  loan: Loan;
  client?: Client;
  summary: ReturnType<typeof getLoanFinancialSummary>;
  amountDueToday: number;
  isMainDueToday: boolean;
  dueInstallments: Installment[];
}

export interface DueDateVerificationResult {
  hasLoansDueToday: boolean;
  loansDueTodayCount: number;
  totalAmountDueToday: number;
  loansDueToday: DueLoanItem[];
  verificationTimestamp: string;
  checkedCount: number;
}

/**
 * Verifies all loans to check which ones mature on the current date (today).
 * Checks both main contract due dates and individual installment schedules.
 */
export function verifyLoansDueToday(
  loans: Loan[],
  clients: Client[] = [],
  todayIso: string = getTodayIso(),
  defaultDailyFine: number = 20
): DueDateVerificationResult {
  const resultLoans: DueLoanItem[] = [];
  let totalAmountDue = 0;

  loans.forEach((loan) => {
    const summary = getLoanFinancialSummary(loan, todayIso, defaultDailyFine);

    // If loan is already paid in full, skip it
    if (summary.isPaid || summary.remainingBalance <= 0) {
      return;
    }

    const isMainDueToday = loan.dueDate === todayIso;

    // Check if any open installment matures today
    const dueInstallments = (loan.installments || []).filter(
      (inst) => inst.dueDate === todayIso && inst.status !== 'paga'
    );

    const hasInstallmentDueToday = dueInstallments.length > 0;

    if (isMainDueToday || hasInstallmentDueToday) {
      // Calculate amount due today
      let amountDue = 0;
      if (hasInstallmentDueToday) {
        amountDue = dueInstallments.reduce(
          (sum, inst) => sum + Math.max(0, inst.amount - (inst.paidAmount || 0)),
          0
        );
      } else {
        amountDue = summary.remainingBalance;
      }

      totalAmountDue += amountDue;

      const client = clients.find((c) => c.id === loan.clientId);

      resultLoans.push({
        loan,
        client,
        summary,
        amountDueToday: amountDue,
        isMainDueToday,
        dueInstallments,
      });
    }
  });

  return {
    hasLoansDueToday: resultLoans.length > 0,
    loansDueTodayCount: resultLoans.length,
    totalAmountDueToday: totalAmountDue,
    loansDueToday: resultLoans,
    verificationTimestamp: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    checkedCount: loans.length,
  };
}
