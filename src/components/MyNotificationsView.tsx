import React from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  CheckCheck,
  Calendar,
  Sparkles,
  Shield,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MyNotificationsView: React.FC = () => {
  const {
    employeeNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    currentUser,
    setActiveTab,
  } = useApp();

  const userNotifs = employeeNotifications.filter(
    (n) => n.employeeEmail.toLowerCase() === currentUser.email.toLowerCase()
  );

  const unreadCount = userNotifs.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 pb-12 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-[#8BCF00]" /> MINHAS NOTIFICAÇÕES
          </h2>
          <p className="text-neutral-400 text-sm mt-0.5">
            Histórico completo de decisões administrativas, avisos e comunicações sobre seu acesso.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllNotificationsAsRead}
            className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#8BCF00]/20 transition-all cursor-pointer shrink-0 active:scale-98"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Marcar Todas como Lidas</span>
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#181818] border border-neutral-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 text-[#8BCF00] flex items-center justify-center font-bold">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">Total de Notificações</p>
            <p className="text-xl font-extrabold text-white font-['Outfit']">{userNotifs.length}</p>
          </div>
        </div>

        <div className="bg-[#181818] border border-neutral-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">Não Lidas</p>
            <p className="text-xl font-extrabold text-amber-400 font-['Outfit']">{unreadCount}</p>
          </div>
        </div>

        <div className="bg-[#181818] border border-neutral-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">Acesso Atual</p>
            <p className="text-xl font-extrabold text-emerald-400 font-['Outfit']">Autorizado</p>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {userNotifs.length === 0 ? (
          <div className="bg-[#181818] border border-neutral-800 rounded-3xl p-12 text-center space-y-3">
            <Sparkles className="w-10 h-10 text-neutral-600 mx-auto" />
            <h3 className="text-base font-bold text-white font-['Outfit']">
              Nenhuma notificação registrada
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Todas as decisões administrativas e comunicações do sistema serão exibidas nesta central.
            </p>
          </div>
        ) : (
          userNotifs.map((n) => {
            const isApproval = n.type === 'approval';
            const isRejection = n.type === 'rejection';
            const isSuspension = n.type === 'suspension';

            return (
              <div
                key={n.id}
                onClick={() => !n.read && markNotificationAsRead(n.id)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer relative shadow-lg ${
                  !n.read ? 'border-l-4 border-l-[#8BCF00]' : 'opacity-90'
                } ${
                  isApproval
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : isRejection
                    ? 'bg-red-500/5 border-red-500/30'
                    : isSuspension
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-[#181818] border-neutral-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2.5">
                    {isApproval && (
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    {isRejection && (
                      <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                        <XCircle className="w-4 h-4" />
                      </div>
                    )}
                    {isSuspension && (
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    )}
                    {!isApproval && !isRejection && !isSuspension && (
                      <div className="w-8 h-8 rounded-xl bg-[#8BCF00]/15 border border-[#8BCF00]/30 flex items-center justify-center text-[#8BCF00] shrink-0">
                        <Info className="w-4 h-4" />
                      </div>
                    )}

                    <div>
                      <h4 className="font-bold text-white text-sm font-['Outfit'] uppercase tracking-wide">
                        {n.title}
                      </h4>
                      <span className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(n.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {!n.read && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#8BCF00]/20 text-[#8BCF00] border border-[#8BCF00]/30 uppercase tracking-wider shrink-0">
                      Não lida
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed pl-10.5">
                  {n.message}
                </p>

                {n.reason && (
                  <div className="mt-3 ml-10.5 p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl text-xs space-y-0.5">
                    <span className="text-neutral-400 font-bold block text-[11px]">
                      Motivo registrado:
                    </span>
                    <p className="text-neutral-200 italic">{n.reason}</p>
                  </div>
                )}

                {n.actionLabel && (
                  <div className="mt-3 ml-10.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold px-4 py-1.5 rounded-xl text-xs cursor-pointer shadow-md"
                    >
                      {n.actionLabel}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
