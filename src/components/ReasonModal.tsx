import React, { useState } from 'react';
import { X, AlertTriangle, XCircle } from 'lucide-react';

interface ReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  subtitle: string;
  actionType: 'deny' | 'suspend';
  employeeName: string;
}

export const ReasonModal: React.FC<ReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  actionType,
  employeeName,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason.trim());
    setReason('');
  };

  const isDeny = actionType === 'deny';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181818] border border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            {isDeny ? (
              <XCircle className="w-5 h-5 text-red-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
            <h3 className="text-base font-bold text-white font-['Outfit']">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-neutral-300">
            Colaborador afetado: <strong className="text-white">{employeeName}</strong>
          </p>
          <p className="text-xs text-neutral-400 leading-relaxed">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Motivo da decisão {isDeny ? '(Opcional)' : '(Recomendado)'}
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isDeny
                  ? 'Ex: Cadastro não reconhecido ou documentação incompleta...'
                  : 'Ex: Suspensão preventiva para auditoria cadastral...'
              }
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl p-3 text-xs text-white placeholder-neutral-600 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md ${
                isDeny
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                  : 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
              }`}
            >
              {isDeny ? 'Confirmar Negativa' : 'Confirmar Suspensão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
