export type UserRole = 'admin' | 'employee';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  roleTitle?: string;
}

export interface EmployeeUser {
  id: string;
  name: string;
  email: string;
  password: string; // Senha cadastrada pelo administrador
  role: 'employee';
  roleTitle: string; // Ex: 'Cobrador(a)', 'Operador(a) Financeiro', 'Atendente'
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  createdByName: string; // Ex: 'Edinelson (Admin)'
  avatarUrl?: string;
}

export interface ClientDocument {
  id: string;
  type: 'comprovante_residencia' | 'rg_cnh' | 'foto_residencia' | 'localizacao_mapa' | 'selfie' | 'contrato_assinado' | 'outro';
  name: string;
  url: string; // base64 or file blob URL / preview URL
  fileType: 'image' | 'pdf';
  uploadedAt: string;
  notes?: string;
}

export interface ClientLocation {
  lat: number;
  lng: number;
  addressFormatted: string;
}

export interface Client {
  id: string;
  fullName: string;
  cpf: string;
  rg: string;
  birthDate: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    complement?: string;
  };
  location: ClientLocation;
  documents: ClientDocument[];
  photoUrl?: string;
  notes?: string;
  createdAt: string;
}

export type PaymentFrequency = 'diaria' | 'pagamento_unico_30' | 'parcelado';

export interface Installment {
  id: string;
  number: number; // e.g. 1, 2, 3
  dueDate: string; // YYYY-MM-DD
  amount: number; // Total scheduled for this installment
  paidAmount: number;
  paidDate?: string;
  status: 'em_dia' | 'atrasada' | 'paga' | 'proxima';
  delayDays: number;
  fineAmount: number;
}

export interface PaymentRecord {
  id: string;
  loanId: string;
  installmentId?: string;
  amount: number;
  date: string;
  paymentMethod: 'pix' | 'dinheiro' | 'transferencia' | 'cartao';
  note?: string;
  registeredBy: string;
}

export interface Loan {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientWhatsapp: string;
  principalAmount: number; // e.g., 1000
  interestRatePercent: number; // e.g., 30
  interestAmount: number; // e.g., 300
  totalOriginalAmount: number; // e.g., 1300
  loanDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  paymentFrequency: PaymentFrequency;
  installmentsCount: number;
  dailyFineAmount: number; // default R$ 20.00 / day
  installments: Installment[];
  payments: PaymentRecord[];
  status: 'em_dia' | 'proximo_vencimento' | 'em_atraso' | 'quitado';
  notes?: string;
  createdAt: string;
}

export interface SystemSettings {
  defaultInterestRate: number; // default 30%
  defaultDailyFine: number; // default 20.00
  reminderDaysBefore: number[]; // e.g. [3, 1, 0]
  companyName: string;
  companyLogoUrl?: string;
  companyPhone: string;
  companyWhatsapp: string;
  companyAddress: string;
  companyCnpj?: string;
  theme: 'dark' | 'light';
}

export interface NotificationAlert {
  id: string;
  loanId: string;
  clientId: string;
  clientName: string;
  clientWhatsapp: string;
  type: 'due_today' | 'due_tomorrow' | 'due_3_days' | 'overdue';
  dueDate: string;
  amountDue: number;
  delayDays: number;
  fineAmount: number;
  createdAt: string;
}

export type FilterStatus = 'todos' | 'em_dia' | 'proximo' | 'em_atraso' | 'quitado' | 'vencendo_hoje' | 'vencendo_amanha';
