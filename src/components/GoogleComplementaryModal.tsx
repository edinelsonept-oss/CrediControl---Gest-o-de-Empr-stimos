import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  X,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { EmployeeUser } from '../types';

interface GoogleComplementaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleData: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  onSubmit: (data: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    address: string;
    city: string;
    birthDate: string;
    avatarUrl?: string;
  }) => Promise<void>;
}

export const GoogleComplementaryModal: React.FC<GoogleComplementaryModalProps> = ({
  isOpen,
  onClose,
  googleData,
  onSubmit,
}) => {
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Salinópolis');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('Por favor informe seu telefone / WhatsApp para contato.');
      return;
    }

    if (!cpf.trim()) {
      setError('Por favor informe seu CPF para validação cadastral.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: googleData.name,
        email: googleData.email,
        phone: phone.trim(),
        cpf: cpf.trim(),
        address: address.trim() || 'Não informado',
        city: city.trim() || 'Salinópolis',
        birthDate: birthDate.trim() || 'Não informado',
        avatarUrl: googleData.avatarUrl,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181818] border border-neutral-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl space-y-5 animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8BCF00]/15 text-[#8BCF00] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit']">
                Finalizar Cadastro de Funcionário
              </h3>
              <p className="text-xs text-neutral-400">
                Dados vinculados à sua Conta Google
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google User Profile Snippet */}
        <div className="flex items-center gap-3 bg-neutral-900/90 border border-neutral-800 p-3 rounded-2xl">
          <img
            src={
              googleData.avatarUrl ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
            }
            alt={googleData.name}
            className="w-11 h-11 rounded-full object-cover border border-[#8BCF00]/30 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{googleData.name}</p>
            <p className="text-xs text-neutral-400 font-mono truncate">{googleData.email}</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8BCF00]/15 text-[#8BCF00] border border-[#8BCF00]/30 uppercase tracking-wider shrink-0">
            Google
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#8BCF00]" /> Telefone / WhatsApp *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(91) 98888-0000"
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#8BCF00]" /> CPF *
              </label>
              <input
                type="text"
                required
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#8BCF00]" /> Endereço Completo
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro..."
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#8BCF00]" /> Cidade
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Salinópolis"
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#8BCF00]" /> Data de Nascimento
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
              />
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed pt-1">
            Seu cadastro será registrado no Cloud Firestore e enviado para aprovação do Administrador.
          </p>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-[#8BCF00]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitação de Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
