import React from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
  CheckCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { EmployeeNotification } from '../types';

interface EmployeeNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: EmployeeNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  employeeEmail: string;
}

export const EmployeeNotificationsModal: React.FC<EmployeeNotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  employeeEmail,
}) => {
  if (!isOpen) return null;

  const userNotifs = notifications.filter(
    (n) => n.employeeEmail.toLowerCase() === employeeEmail.toLowerCase()
  );

  const unreadCount = userNotifs.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181818] border border-neutral-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl space-y-5 animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8BCF00]/15 text-[#8BCF00] flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit']">
                Minhas Notificações
              </h3>
              <p className="text-xs text-neutral-400">
                {unreadCount > 0
                  ? `${unreadCount} notificação(ões) não lida(s)`
                  : 'Todas as notificações foram lidas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-xs text-[#8BCF00] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar lidas
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
          {userNotifs.length === 0 ? (
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 text-center text-xs text-neutral-500 space-y-2">
              <Sparkles className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="font-semibold text-neutral-400">Nenhuma notificação no momento</p>
              <p>As decisões administrativas e avisos do CrediControl aparecerão aqui.</p>
            </div>
          ) : (
            userNotifs.map((n) => {
              const isApproval = n.type === 'approval';
              const isRejection = n.type === 'rejection';
              const isSuspension = n.type === 'suspension';

              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && onMarkAsRead(n.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    !n.read ? 'border-l-4 border-l-[#8BCF00]' : 'opacity-85'
                  } ${
                    isApproval
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : isRejection
                      ? 'bg-red-500/10 border-red-500/30'
                      : isSuspension
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-neutral-900/90 border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {isApproval && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {isRejection && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      {isSuspension && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                      {!isApproval && !isRejection && !isSuspension && (
                        <Info className="w-4 h-4 text-[#8BCF00] shrink-0" />
                      )}
                      <h4 className="font-bold text-white text-xs font-['Outfit'] uppercase tracking-wide">
                        {n.title}
                      </h4>
                    </div>

                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-[#8BCF00] shrink-0" title="Não lida" />
                    )}
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed">{n.message}</p>

                  {n.reason && (
                    <div className="mt-2 p-2 bg-neutral-950/70 border border-neutral-800/80 rounded-xl text-xs">
                      <span className="text-neutral-400 block font-semibold text-[11px]">
                        Motivo registrado:
                      </span>
                      <p className="text-neutral-200 italic">{n.reason}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 text-[10px] text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {n.actionLabel && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                        }}
                        className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold px-3 py-1 rounded-lg text-[10px] cursor-pointer"
                      >
                        {n.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-neutral-800">
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
