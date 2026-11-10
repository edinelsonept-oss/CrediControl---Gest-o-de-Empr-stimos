import React, { useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  FileText,
  MapPin,
  Building,
  Calendar,
  Clock,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  CreditCard,
  History,
  ArrowLeft,
} from 'lucide-react';
import { EmployeeUser } from '../types';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeUser | null;
  onApprove?: (id: string) => void;
  onDeny?: (id: string) => void;
  onSuspend?: (id: string) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  isOpen,
  onClose,
  employee,
  onApprove,
  onDeny,
  onSuspend,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !employee) return null;

  const isPending = employee.status === 'pending';
  const isApproved = employee.status === 'approved' || employee.status === 'active';
  const isDenied = employee.status === 'denied';
  const isSuspended = employee.status === 'suspended' || employee.status === 'inactive';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181818] border border-neutral-800 rounded-3xl p-6 sm:p-7 w-full max-w-xl shadow-2xl space-y-6 animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Navigation Top Bar with prominent "← VOLTAR" button */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 text-xs font-bold text-neutral-200 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-[#8BCF00] px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 group shrink-0"
            title="Voltar para a lista de funcionários"
          >
            <ArrowLeft className="w-4 h-4 text-[#8BCF00] transition-transform group-hover:-translate-x-1" />
            <span className="tracking-wide">← VOLTAR</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-4 h-4 text-[#8BCF00] shrink-0 hidden sm:block" />
            <h3 className="text-sm font-bold text-white font-['Outfit'] truncate hidden sm:block">
              Ficha Cadastral do Funcionário
            </h3>
            <button
              type="button"
              onClick={onClose}
              title="Fechar (Esc)"
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Card Summary */}
        <div className="flex items-center gap-4 bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl">
          <img
            src={
              employee.avatarUrl ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
            }
            alt={employee.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-neutral-700 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-lg font-bold text-white font-['Outfit'] truncate">
                {employee.name}
              </h4>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                  isPending
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : isApproved
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : isDenied
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                }`}
              >
                {isPending && 'Pendente de Aprovação'}
                {isApproved && 'Aprovado'}
                {isDenied && 'Acesso Negado'}
                {isSuspended && 'Acesso Suspenso'}
              </span>
            </div>
            <p className="text-xs text-[#8BCF00] font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>{employee.roleTitle || 'Colaborador'}</span>
            </p>
            <p className="text-xs text-neutral-400 font-mono">{employee.email}</p>
          </div>
        </div>

        {/* Grid of Cadastral Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-neutral-900/80 border border-neutral-800/80 p-3 rounded-xl space-y-1">
            <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5 text-[#8BCF00]" /> Telefone / WhatsApp
            </span>
            <p className="font-semibold text-white">{employee.phone || 'Não informado'}</p>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800/80 p-3 rounded-xl space-y-1">
            <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-[#8BCF00]" /> CPF
            </span>
            <p className="font-semibold text-white font-mono">{employee.cpf || 'Não informado'}</p>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800/80 p-3 rounded-xl space-y-1">
            <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#8BCF00]" /> Endereço Completo
            </span>
            <p className="font-semibold text-white">{employee.address || 'Não informado'}</p>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800/80 p-3 rounded-xl space-y-1">
            <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
              <Building className="w-3.5 h-3.5 text-[#8BCF00]" /> Cidade
            </span>
            <p className="font-semibold text-white">{employee.city || 'Não informado'}</p>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800/80 p-3 rounded-xl space-y-1">
            <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#8BCF00]" /> Data de Nascimento
            </span>
            <p className="font-semibold text-white">{employee.birthDate || 'Não informado'}</p>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800/80 p-3 rounded-xl space-y-1">
            <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-[#8BCF00]" /> Método de Cadastro
            </span>
            <p className="font-semibold text-white uppercase tracking-wide">
              {employee.registrationMethod === 'google'
                ? 'Conta Google (OAuth)'
                : 'E-mail e Senha'}
            </p>
          </div>
        </div>

        {/* Audit & Administrative Decision History */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
            <History className="w-3.5 h-3.5 text-[#8BCF00]" />
            Histórico & Decisões Administrativas
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-neutral-300">
            <div>
              <span className="text-neutral-500 block text-[11px]">Data e Horário do Cadastro:</span>
              <strong className="text-white">
                {employee.createdAt
                  ? new Date(employee.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Não registrado'}
              </strong>
            </div>

            {employee.decidedAt && (
              <div>
                <span className="text-neutral-500 block text-[11px]">Data da Decisão:</span>
                <strong className="text-white">
                  {new Date(employee.decidedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </div>
            )}
          </div>

          {employee.decidedBy && (
            <div className="pt-1">
              <span className="text-neutral-500 block text-[11px]">Administrador Responsável:</span>
              <p className="text-white font-medium">{employee.decidedBy}</p>
            </div>
          )}

          {employee.decisionReason && (
            <div className="pt-1 p-2.5 bg-neutral-950 rounded-xl border border-neutral-800">
              <span className="text-neutral-400 block text-[11px] font-bold">
                Motivo Registrado da Decisão:
              </span>
              <p className="text-neutral-200 italic">{employee.decisionReason}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#8BCF00]" />
            <span>Voltar à Lista</span>
          </button>

          <div className="flex items-center gap-2">
            {(isPending || isDenied || isSuspended) && onApprove && (
              <button
                type="button"
                onClick={() => {
                  onApprove(employee.id);
                  onClose();
                }}
                className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-[#8BCF00]/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Permitir Acesso
              </button>
            )}

            {isPending && onDeny && (
              <button
                type="button"
                onClick={() => {
                  onDeny(employee.id);
                  onClose();
                }}
                className="bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Negar Acesso
              </button>
            )}

            {isApproved && onSuspend && (
              <button
                type="button"
                onClick={() => {
                  onSuspend(employee.id);
                  onClose();
                }}
                className="bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                Suspender Acesso
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
