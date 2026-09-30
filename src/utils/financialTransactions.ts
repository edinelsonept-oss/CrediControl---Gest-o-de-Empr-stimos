/**
 * Financial Transactions Engine
 * Enforces ACID consistency, race condition prevention, and atomic audits
 * using Firestore runTransaction.
 */

import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loan, PaymentRecord, UserProfile, AuditLog } from '../types';
import { getTodayIso } from './calculations';
import { validatePayment, scrubSensitiveFields } from './securityValidator';

export interface PaymentTransactionResult {
  success: boolean;
  error?: string;
  updatedLoan?: Loan;
  paymentRecord?: PaymentRecord;
}

/**
 * Atomically executes a payment against a loan in Firestore.
 * Prevents race conditions and double-payments by reading the loan inside the transaction.
 */
export async function executeAtomicPayment(
  loanId: string,
  amount: number,
  paymentMethod: 'pix' | 'dinheiro' | 'transferencia' | 'cartao',
  user: UserProfile,
  fallbackLoan: Loan,
  note?: string
): Promise<PaymentTransactionResult> {
  const today = getTodayIso();
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // If Firestore is available, execute inside runTransaction
  if (db) {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const loanRef = doc(db, 'loans', loanId);
        const loanDoc = await transaction.get(loanRef);

        const currentLoan: Loan = loanDoc.exists()
          ? (loanDoc.data() as Loan)
          : fallbackLoan;

        if (!currentLoan) {
          throw new Error(`Contrato de empréstimo ${loanId} não encontrado.`);
        }

        const existingPayments = currentLoan.payments || [];
        const totalPaidSoFar = existingPayments.reduce((s, p) => s + p.amount, 0);
        const remainingDue = Math.max(0, currentLoan.totalOriginalAmount - totalPaidSoFar);

        // Security & Financial Validation
        const valResult = validatePayment(currentLoan, amount, paymentMethod, remainingDue);
        if (!valResult.isValid) {
          throw new Error(valResult.errors.join(' '));
        }

        const validAmount = valResult.sanitizedData!.amount;

        const newPaymentRecord: PaymentRecord = {
          id: paymentId,
          loanId,
          amount: validAmount,
          date: today,
          paymentMethod: valResult.sanitizedData!.paymentMethod,
          note: note ? note.trim().slice(0, 200) : undefined,
          registeredBy: user.name,
        };

        const updatedPayments = [...existingPayments, newPaymentRecord];
        const newTotalPaid = totalPaidSoFar + validAmount;
        const isFullyPaid = newTotalPaid >= currentLoan.totalOriginalAmount - 0.05;

        // Update installments statuses
        let remainingPaidAllocation = newTotalPaid;
        const updatedInstallments = (currentLoan.installments || []).map((inst) => {
          if (remainingPaidAllocation >= inst.amount) {
            remainingPaidAllocation -= inst.amount;
            return {
              ...inst,
              paidAmount: inst.amount,
              paidDate: inst.paidDate || today,
              status: 'paga' as const,
              delayDays: 0,
              fineAmount: 0,
            };
          } else if (remainingPaidAllocation > 0) {
            const partial = remainingPaidAllocation;
            remainingPaidAllocation = 0;
            return {
              ...inst,
              paidAmount: partial,
              status: inst.status,
            };
          }
          return inst;
        });

        const updatedLoan: Loan = {
          ...currentLoan,
          payments: updatedPayments,
          installments: updatedInstallments,
          status: isFullyPaid ? 'quitado' : currentLoan.status === 'quitado' ? 'em_dia' : currentLoan.status,
        };

        // 1. Write the updated loan document
        transaction.set(loanRef, updatedLoan);

        // 2. Atomically write the audit log entry in the SAME transaction
        const auditRef = doc(db, 'audit_logs', `audit_${paymentId}`);
        const auditEntry: AuditLog = {
          id: `audit_${paymentId}`,
          action: 'REGISTER_PAYMENT',
          entityType: 'payment',
          entityId: paymentId,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          timestamp: new Date().toISOString(),
          details: scrubSensitiveFields({
            loanId,
            clientId: currentLoan.clientId,
            clientName: currentLoan.clientName,
            amount: validAmount,
            paymentMethod,
            isFullyPaid,
            remainingDue: Math.max(0, currentLoan.totalOriginalAmount - newTotalPaid),
          }),
        };
        transaction.set(auditRef, auditEntry);

        return {
          updatedLoan,
          paymentRecord: newPaymentRecord,
        };
      });

      return {
        success: true,
        updatedLoan: result.updatedLoan,
        paymentRecord: result.paymentRecord,
      };
    } catch (txErr: any) {
      console.warn('Firestore transaction failed, falling back to local consistency:', txErr.message);
      return {
        success: false,
        error: txErr.message || 'Erro ao processar transação financeira.',
      };
    }
  }

  // Fallback for offline mode with local consistency validation
  const existingPayments = fallbackLoan.payments || [];
  const totalPaidSoFar = existingPayments.reduce((s, p) => s + p.amount, 0);
  const remainingDue = Math.max(0, fallbackLoan.totalOriginalAmount - totalPaidSoFar);

  const valResult = validatePayment(fallbackLoan, amount, paymentMethod, remainingDue);
  if (!valResult.isValid) {
    return {
      success: false,
      error: valResult.errors.join(' '),
    };
  }

  const newPaymentRecord: PaymentRecord = {
    id: paymentId,
    loanId,
    amount: valResult.sanitizedData!.amount,
    date: today,
    paymentMethod: valResult.sanitizedData!.paymentMethod,
    note,
    registeredBy: user.name,
  };

  const updatedPayments = [...existingPayments, newPaymentRecord];
  const newTotalPaid = totalPaidSoFar + newPaymentRecord.amount;
  const isFullyPaid = newTotalPaid >= fallbackLoan.totalOriginalAmount - 0.05;

  const updatedLoan: Loan = {
    ...fallbackLoan,
    payments: updatedPayments,
    status: isFullyPaid ? 'quitado' : fallbackLoan.status,
  };

  return {
    success: true,
    updatedLoan,
    paymentRecord: newPaymentRecord,
  };
}
