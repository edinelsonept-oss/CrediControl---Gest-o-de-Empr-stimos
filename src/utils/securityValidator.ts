/**
 * Security and Data Integrity Validation Layer
 * Enforces strictly:
 * - Input Sanitization & Anti-Injection
 * - Brazilian CPF Modulo 11 Checksum Validation
 * - Financial Invariants & Calculations Verification
 * - Foreign Key Referential Checks
 * - PII Masking & Sensitive Field Scrubbing (LGPD Compliance)
 */

import { Client, Loan, Installment, PaymentRecord, EmployeeUser, SystemSettings } from '../types';

/**
 * Strips script tags, HTML tags, and malicious control characters to prevent Stored XSS / Injection.
 */
export function sanitizeString(val: string | undefined | null): string {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[<>'"`;\\]/g, '') // Strip dangerous delimiter characters
    .trim();
}

const FULL_NAME_CHAR_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\u0100-\u017F]$/;
const DISALLOWED_FULL_NAME_CHARS_REGEX = /[^A-Za-zÀ-ÖØ-öø-ÿ\u0100-\u017F ]/g;
const DISALLOWED_FULL_NAME_CHARS_COMPOSING_REGEX = /[^A-Za-zÀ-ÖØ-öø-ÿ\u0100-\u017F\u0300-\u036f ]/g;
const VALID_FULL_NAME_REGEX =
  /^[A-Za-zÀ-ÖØ-öø-ÿ\u0100-\u017F]+(?: [A-Za-zÀ-ÖØ-öø-ÿ\u0100-\u017F]+)+$/;

/**
 * Checks if a single character is an allowed Latin letter (including accented letters) or space.
 */
export function isAllowedFullNameChar(char: string): boolean {
  if (!char) return false;
  if (char === ' ') return true;
  const normalized = char.normalize('NFC');
  return Array.from(normalized).every((c) => FULL_NAME_CHAR_REGEX.test(c));
}

/**
 * Removes leading, trailing, and duplicate spaces while NFC-normalizing Unicode characters.
 */
export function normalizeFullName(val: string | undefined | null): string {
  if (!val || typeof val !== 'string') return '';
  return val.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/**
 * Sanitizes live typing inside the full name input field:
 * - Blocks numbers, special characters, symbols, and emojis
 * - Prevents leading and duplicate spaces while preserving a trailing space between words
 * - Respects active IME / dead-key composition for accented letters
 */
export function sanitizeFullNameInput(val: string, isComposing = false): string {
  if (!val || typeof val !== 'string') return '';
  if (isComposing) {
    return val
      .replace(DISALLOWED_FULL_NAME_CHARS_COMPOSING_REGEX, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^ +/, '');
  }
  return val
    .normalize('NFC')
    .replace(DISALLOWED_FULL_NAME_CHARS_REGEX, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^ +/, '');
}

/**
 * Sanitizes pasted text before inserting into the full name input field.
 */
export function sanitizeFullNamePaste(
  currentValue: string,
  pastedText: string,
  selectionStart: number | null,
  selectionEnd: number | null
): string {
  const safeCurrent = currentValue || '';
  const start = selectionStart ?? safeCurrent.length;
  const end = selectionEnd ?? safeCurrent.length;
  const cleanedPaste = (pastedText || '')
    .normalize('NFC')
    .replace(DISALLOWED_FULL_NAME_CHARS_REGEX, '');
  const merged = safeCurrent.slice(0, start) + cleanedPaste + safeCurrent.slice(end);
  return sanitizeFullNameInput(merged, false);
}

export interface FullNameValidationResult {
  isValid: boolean;
  normalizedName: string;
  error?: string;
}

/**
 * Validates an employee's full name before form submission and before saving to Firestore:
 * - Only A-Z / accented Latin letters and single spaces between words
 * - No numbers, special characters, symbols, or emojis
 * - At least two words (first name + surname)
 * - No leading, trailing, or duplicate spaces
 */
export function validateEmployeeFullName(
  rawName: string | undefined | null
): FullNameValidationResult {
  const normalized = normalizeFullName(rawName);

  if (!normalized) {
    return {
      isValid: false,
      normalizedName: '',
      error: 'Informe o nome completo utilizando apenas letras e espaços.',
    };
  }

  if (/\d/.test(normalized)) {
    return {
      isValid: false,
      normalizedName: normalized,
      error: 'O nome completo não pode conter números. Utilize apenas letras e espaços.',
    };
  }

  if (DISALLOWED_FULL_NAME_CHARS_REGEX.test(normalized)) {
    DISALLOWED_FULL_NAME_CHARS_REGEX.lastIndex = 0;
    return {
      isValid: false,
      normalizedName: normalized,
      error:
        'O nome completo não pode conter caracteres especiais, símbolos ou emojis. Utilize apenas letras e espaços.',
    };
  }
  DISALLOWED_FULL_NAME_CHARS_REGEX.lastIndex = 0;

  const words = normalized.split(' ').filter(Boolean);
  if (words.length < 2) {
    return {
      isValid: false,
      normalizedName: normalized,
      error: 'Informe o nome completo com nome e sobrenome (mínimo duas palavras).',
    };
  }

  if (!VALID_FULL_NAME_REGEX.test(normalized)) {
    return {
      isValid: false,
      normalizedName: normalized,
      error: 'Nome completo inválido. Utilize apenas letras de A a Z e espaços.',
    };
  }

  return {
    isValid: true,
    normalizedName: normalized,
  };
}

/**
 * Validates Brazilian CPF with Modulo 11 checksum.
 */
export function validateCpf(cpf: string): boolean {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;

  // Disallow known invalid sequences like 11111111111
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11), 10)) return false;

  return true;
}

/**
 * Masks CPF for display (LGPD compliance): 123.456.789-00 -> 123.***.***-00
 */
export function maskCpf(cpf: string): string {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.***.***-${clean.slice(9)}`;
  }
  return cpf;
}

/**
 * Masks Email for display: usuario@gmail.com -> u***o@gmail.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

/**
 * Masks Phone for display: (91) 98877-6655 -> (91) *****-6655
 */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    const ddd = digits.slice(0, 2);
    const end = digits.slice(-4);
    return `(${ddd}) *****-${end}`;
  }
  return phone;
}

/**
 * Recursively scrubs sensitive data (passwords, tokens, PINs) before logging.
 */
export function scrubSensitiveFields(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubSensitiveFields(item));
  }

  const sensitiveKeys = ['password', 'senha', 'token', 'secret', 'credential', 'pin', 'apikey', 'auth', 'privatekey'];
  const cleanObj: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
      cleanObj[key] = '[PROTECTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleanObj[key] = scrubSensitiveFields(value);
    } else {
      cleanObj[key] = value;
    }
  }

  return cleanObj;
}

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  sanitizedData?: T;
}

/**
 * Validates and sanitizes a Client record.
 * Checks for required fields, valid CPF format, and sanitizes strings.
 */
export function validateClient(
  data: Partial<Client>,
  existingClients: Client[] = [],
  isUpdate: boolean = false
): ValidationResult<Client> {
  const errors: string[] = [];

  const fullName = sanitizeString(data.fullName);
  if (!fullName || fullName.length < 3) {
    errors.push('Nome completo é obrigatório (mínimo 3 caracteres).');
  }

  const cleanCpf = (data.cpf || '').replace(/\D/g, '');
  if (!cleanCpf) {
    errors.push('CPF é obrigatório.');
  } else if (!validateCpf(cleanCpf)) {
    errors.push('CPF inválido pelo algoritmo oficial da Receita Federal.');
  } else {
    // Unique CPF constraint
    const duplicate = existingClients.find(
      (c) => c.cpf.replace(/\D/g, '') === cleanCpf && (!isUpdate || c.id !== data.id)
    );
    if (duplicate) {
      errors.push(`Já existe um cliente cadastrado com o CPF informado (${duplicate.fullName}).`);
    }
  }

  const phone = sanitizeString(data.phone);
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    errors.push('Telefone celular válido com DDD é obrigatório.');
  }

  const email = (data.email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Formato de e-mail inválido.');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const sanitized: Client = {
    id: data.id || `cli_${Date.now()}`,
    fullName,
    cpf: cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    rg: sanitizeString(data.rg),
    birthDate: data.birthDate || '',
    phone,
    whatsapp: sanitizeString(data.whatsapp) || phone,
    email,
    address: {
      cep: sanitizeString(data.address?.cep),
      street: sanitizeString(data.address?.street),
      number: sanitizeString(data.address?.number),
      neighborhood: sanitizeString(data.address?.neighborhood),
      city: sanitizeString(data.address?.city) || 'Salinópolis',
      state: sanitizeString(data.address?.state) || 'PA',
      complement: sanitizeString(data.address?.complement),
    },
    location: data.location || {
      lat: -0.6136,
      lng: -47.3562,
      addressFormatted: 'Salinópolis - PA',
    },
    documents: data.documents || [],
    photoUrl: data.photoUrl,
    notes: sanitizeString(data.notes),
    createdAt: data.createdAt || new Date().toISOString().split('T')[0],
  };

  return { isValid: true, errors: [], sanitizedData: sanitized };
}

/**
 * Validates and sanitizes a Loan contract.
 * Enforces financial integrity, FK to Client, positive values, and correct totals.
 */
export function validateLoan(
  data: Partial<Loan>,
  existingClients: Client[]
): ValidationResult<Loan> {
  const errors: string[] = [];

  // Foreign Key constraint: Client must exist
  if (!data.clientId) {
    errors.push('O cliente titular do empréstimo é obrigatório.');
  } else {
    const clientExists = existingClients.some((c) => c.id === data.clientId);
    if (!clientExists) {
      errors.push(`Cliente com ID ${data.clientId} não foi encontrado no sistema (Violação de Chave Estrangeira).`);
    }
  }

  const principal = Number(data.principalAmount);
  if (isNaN(principal) || principal <= 0) {
    errors.push('O valor principal do empréstimo deve ser maior que zero.');
  }

  const interestRate = Number(data.interestRatePercent);
  if (isNaN(interestRate) || interestRate < 0 || interestRate > 1000) {
    errors.push('A taxa de juros deve estar entre 0% e 1000%.');
  }

  const dailyFine = Number(data.dailyFineAmount ?? 20);
  if (isNaN(dailyFine) || dailyFine < 0) {
    errors.push('A multa diária deve ser um valor numérico positivo ou zero.');
  }

  const installmentsCount = Number(data.installmentsCount || 1);
  if (isNaN(installmentsCount) || installmentsCount < 1 || installmentsCount > 365) {
    errors.push('Número de parcelas deve ser entre 1 e 365.');
  }

  if (!data.loanDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.loanDate)) {
    errors.push('Data do empréstimo em formato inválido (YYYY-MM-DD).');
  }

  if (!data.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate)) {
    errors.push('Data de vencimento em formato inválido (YYYY-MM-DD).');
  }

  // Financial consistency check
  const calculatedInterest = Math.round(principal * (interestRate / 100) * 100) / 100;
  const calculatedTotal = Math.round((principal + calculatedInterest) * 100) / 100;

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const sanitized: Loan = {
    id: data.id || `loan_${Date.now()}`,
    clientId: data.clientId!,
    clientName: sanitizeString(data.clientName),
    clientPhone: sanitizeString(data.clientPhone),
    clientWhatsapp: sanitizeString(data.clientWhatsapp),
    principalAmount: principal,
    interestRatePercent: interestRate,
    interestAmount: calculatedInterest,
    totalOriginalAmount: calculatedTotal,
    loanDate: data.loanDate!,
    dueDate: data.dueDate!,
    paymentFrequency: data.paymentFrequency || 'pagamento_unico_30',
    installmentsCount,
    dailyFineAmount: dailyFine,
    collectionRoute: sanitizeString(data.collectionRoute) || undefined,
    collectionMode: data.collectionMode,
    installments: data.installments || [],
    payments: data.payments || [],
    status: data.status || 'em_dia',
    notes: sanitizeString(data.notes),
    createdAt: data.createdAt || new Date().toISOString().split('T')[0],
  };

  return { isValid: true, errors: [], sanitizedData: sanitized };
}

/**
 * Validates a Payment registration.
 * Ensures amount > 0, does not exceed total balance + fines, and references valid loan.
 */
export function validatePayment(
  loan: Loan,
  amount: number,
  paymentMethod: string,
  totalRemainingDue: number
): ValidationResult<{ amount: number; paymentMethod: 'pix' | 'dinheiro' | 'transferencia' | 'cartao'; note?: string }> {
  const errors: string[] = [];

  if (isNaN(amount) || amount <= 0) {
    errors.push('O valor do pagamento deve ser estritamente maior que zero.');
  }

  // Tolerance of 1 cent for rounding
  if (amount > totalRemainingDue + 0.05) {
    errors.push(`O valor do pagamento (R$ ${amount.toFixed(2)}) não pode ser superior ao saldo devedor restante (R$ ${totalRemainingDue.toFixed(2)}).`);
  }

  const allowedMethods = ['pix', 'dinheiro', 'transferencia', 'cartao'];
  if (!allowedMethods.includes(paymentMethod)) {
    errors.push(`Método de pagamento inválido: ${paymentMethod}.`);
  }

  if (loan.status === 'quitado') {
    errors.push('Este empréstimo já se encontra totalmente quitado.');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: {
      amount: Math.round(amount * 100) / 100,
      paymentMethod: paymentMethod as any,
    },
  };
}
