import React from 'react';
import {
  Clock,
  XCircle,
  AlertTriangle,
  Mail,
  Calendar,
  X,
  Bell,
  CheckCircle2,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { EmployeeUser, EmployeeNotification } from '../types';

interface EmployeeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: EmployeeUser | null;
  notifications: EmployeeNotification[];
  onMarkAsRead?: (id: string) => void;
  statusOverride?: 'pending' | 'denied' | 'suspended';
  customTitle?: string;
  customMessage?: string;
  customReason?: string;
}

export const EmployeeStatusModal: React.FC<EmployeeStatusModalProps> = ({
  isOpen,
  onClose,
  employee,
  notifications,
  onMarkAsRead,
  statusOverride,
  customTitle,
  customMessage,
  customReason,
}) => {
  if (!isOpen) return null;

  const currentStatus = statusOverride || employee?.status || 'pending';
  const reason = customReason || employee?.decisionReason;

  // Filter notifications for this employee email
  const userNotifs = notifications.filter(
    (n) =>
      employee?.email &&
      n.employeeEmail.toLowerCase() === employee.email.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181818] border border-neutral-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl space-y-6 animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <span className="text-xs uppercase tracking-wider font-extrabold text-neutral-400 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-[#8BCF00]" />
            Situação do Cadastro
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Hero Block */}
        {currentStatus === 'pending' && (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white font-['Outfit']">
              {customTitle || 'Cadastro em Análise'}
            </h3>
            <p className="text-neutral-300 text-sm leading-relaxed max-w-sm mx-auto">
              {customMessage ||
                'Seu cadastro foi recebido e está aguardando aprovação do administrador. Você receberá uma notificação assim que houver uma decisão.'}
            </p>
          </div>
        )}

        {currentStatus === 'denied' && (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
              <XCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white font-['Outfit'] tracking-tight">
              {customTitle || 'ACESSO NÃO AUTORIZADO'}
            </h3>
            <p className="text-neutral-300 text-sm leading-relaxed max-w-sm mx-auto">
              {customMessage ||
                'Infelizmente, sua solicitação de acesso ao CrediControl não foi aprovada pelo administrador. Você não possui autorização para acessar o sistema neste momento.'}
            </p>

            {reason && (
              <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-2xl text-left text-xs space-y-1">
                <span className="font-bold text-red-400 block">Motivo informado pelo Administrador:</span>
                <p className="text-neutral-200 italic">{reason}</p>
              </div>
            )}

            <p className="text-xs text-neutral-400 pt-1">
              Para mais informações, entre em contato com o administrador.
            </p>
          </div>
        )}

        {(currentStatus === 'suspended' || currentStatus === 'inactive') && (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white font-['Outfit'] tracking-tight">
              {customTitle || 'ACESSO SUSPENSO'}
            </h3>
            <p className="text-neutral-300 text-sm leading-relaxed max-w-sm mx-auto">
              {customMessage ||
                'Seu acesso ao CrediControl foi temporariamente suspenso pelo administrador. No momento, você não poderá utilizar as funcionalidades do sistema.'}
            </p>

            {reason && (
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-left text-xs space-y-1">
                <span className="font-bold text-amber-400 block">Motivo da suspensão:</span>
                <p className="text-neutral-200 italic">{reason}</p>
              </div>
            )}

            <p className="text-xs text-neutral-400 pt-1">
              Entre em contato com o administrador para obter mais informações sobre a suspensão.
            </p>
          </div>
        )}

        {/* Employee Summary Card */}
        {employee && (
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-neutral-400">
              <span>Colaborador:</span>
              <strong className="text-white">{employee.name}</strong>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>E-mail:</span>
              <strong className="text-white font-mono">{employee.email}</strong>
            </div>
            {employee.createdAt && (
              <div className="flex items-center justify-between text-neutral-400">
                <span>Data do Cadastro:</span>
                <span className="text-neutral-300">
                  {new Date(employee.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Notifications Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-[#8BCF00]" />
              Minhas Notificações ({userNotifs.length})
            </h4>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {userNotifs.length === 0 ? (
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 text-center text-xs text-neutral-500">
                Nenhuma notificação registrada até o momento.
              </div>
            ) : (
              userNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                    n.type === 'approval'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : n.type === 'rejection'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white text-[11px] uppercase tracking-wide">
                      {n.title}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(n.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-neutral-300 text-[11px] leading-relaxed">{n.message}</p>
                  {n.reason && (
                    <p className="text-neutral-400 text-[11px] italic pt-0.5">
                      <strong>Motivo:</strong> {n.reason}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
