import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  buttonLabel?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title = 'Sucesso!',
  message = 'EMPRÉSTIMO CONCLUÍDO COM SUCESSO',
  buttonLabel = 'OK / FECHAR',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1C1C1C] border border-neutral-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8BCF00]/20 text-[#8BCF00] border border-[#8BCF00]/30 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit']">{title}</h3>
              <p className="text-xs text-[#8BCF00] font-medium">Operação realizada</p>
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
          <div className="bg-neutral-900/90 p-5 rounded-2xl border border-[#8BCF00]/30 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#8BCF00]/20 text-[#8BCF00] mx-auto flex items-center justify-center mb-2 animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-base font-extrabold text-[#8BCF00] tracking-wide uppercase leading-snug">
              {message}
            </p>
          </div>

          {/* Action Button */}
          <div>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-[#8BCF00]/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
