import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar Exclusão',
  message = 'VOCÊ DESEJA EXCLUIR ESTE EMPRÉSTIMO SE SIM CLIQUE EM (DELETAR) SE NÃO CLIQUE EM (NÃO )',
  confirmLabel = 'DELETAR',
  cancelLabel = 'NÃO',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1C1C1C] border border-neutral-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit']">{title}</h3>
              <p className="text-xs text-neutral-400">Ação irreversível</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          <div className="bg-neutral-900/80 p-4 rounded-2xl border border-neutral-800/80 text-center">
            <p className="text-sm font-bold text-neutral-200 leading-relaxed uppercase tracking-wide">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 rounded-xl text-sm transition-all border border-neutral-700 cursor-pointer flex items-center justify-center gap-1.5"
            >
              (NÃO)
            </button>

            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="w-full bg-[#FF3B30] hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-[#FF3B30]/25 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              (DELETAR)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
