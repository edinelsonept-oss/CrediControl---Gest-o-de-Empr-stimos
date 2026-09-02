import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  MessageSquare,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Client } from '../types';
import { formatCurrency, getLoanFinancialSummary } from '../utils/calculations';
import { openWhatsAppChat } from '../utils/whatsapp';

interface ClientListProps {
  onSelectClient: (client: Client) => void;
  onEditClient: (client: Client) => void;
}

export const ClientList: React.FC<ClientListProps> = ({ onSelectClient, onEditClient }) => {
  const { clients, loans, settings, searchQuery, setSearchQuery, setIsClientModalOpen } = useApp();
  const [statusFilter, setStatusFilter] = useState<'todos' | 'em_dia' | 'em_atraso' | 'quitado'>('todos');

  // Filter logic
  const filteredClients = clients.filter((client) => {
    // Search matching
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      client.fullName.toLowerCase().includes(q) ||
      client.cpf.includes(q) ||
      client.phone.includes(q) ||
      client.whatsapp.includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'todos') return true;

    // Financial check for status filter
    const clientLoans = loans.filter((l) => l.clientId === client.id);
    const hasOverdue = clientLoans.some(
      (l) => getLoanFinancialSummary(l, undefined, settings.defaultDailyFine).isOverdue
    );
    const allPaid = clientLoans.length > 0 && clientLoans.every(
      (l) => getLoanFinancialSummary(l, undefined, settings.defaultDailyFine).isPaid
    );

    if (statusFilter === 'em_atraso') return hasOverdue;
    if (statusFilter === 'quitado') return allPaid;
    if (statusFilter === 'em_dia') return !hasOverdue && !allPaid;

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#8BCF00]" /> Cadastro de Clientes
          </h2>
          <p className="text-neutral-400 text-sm mt-0.5">
            Gerencie os dados pessoais, garantias, documentos e localização dos tomadores de empréstimo.
          </p>
        </div>
        <button
          onClick={() => setIsClientModalOpen(true)}
          className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-bold text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-[#8BCF00]/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 stroke-[3]" /> Cadastrar Novo Cliente
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1C1C1C] p-4 rounded-2xl border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por Nome, CPF, Telefone..."
            className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] text-white placeholder-neutral-500 text-sm rounded-xl pl-10 pr-4 py-2 outline-none transition-all"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs text-neutral-400 font-semibold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#8BCF00]" /> Filtrar:
          </span>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'em_dia', label: '🟢 Em dia' },
            { id: 'em_atraso', label: '🔴 Em atraso' },
            { id: 'quitado', label: '🔵 Quitados' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#8BCF00] text-black font-bold shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.length === 0 ? (
          <div className="col-span-full py-12 text-center text-neutral-400 bg-[#1C1C1C] rounded-3xl border border-neutral-800">
            <Users className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm font-semibold">Nenhum cliente encontrado com os filtros atuais.</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const clientLoans = loans.filter((l) => l.clientId === client.id);
            const hasOverdue = clientLoans.some(
              (l) => getLoanFinancialSummary(l, undefined, settings.defaultDailyFine).isOverdue
            );
            const totalRemaining = clientLoans.reduce(
              (sum, l) => sum + getLoanFinancialSummary(l, undefined, settings.defaultDailyFine).remainingBalance,
              0
            );

            return (
              <div
                key={client.id}
                className="bg-[#1C1C1C] border border-neutral-800 hover:border-neutral-700 rounded-3xl p-5 shadow-lg flex flex-col justify-between transition-all hover:scale-[1.01] group"
              >
                <div>
                  {/* Top card bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={client.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                        alt={client.fullName}
                        className="w-12 h-12 rounded-2xl object-cover border border-[#8BCF00]/40"
                      />
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-[#8BCF00] transition-colors font-['Outfit']">
                          {client.fullName}
                        </h3>
                        <p className="text-xs text-neutral-400 font-mono">{client.cpf}</p>
                      </div>
                    </div>

                    {hasOverdue ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF3B30]/20 text-[#FF3B30] animate-pulse">
                        Em Atraso 🔴
                      </span>
                    ) : totalRemaining > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8BCF00]/20 text-[#8BCF00]">
                        Em dia 🟢
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                        Quitado 🔵
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-neutral-400 mb-4 bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800">
                    <p className="flex items-center gap-2 text-neutral-300">
                      <Phone className="w-3.5 h-3.5 text-[#8BCF00]" /> {client.phone}
                    </p>
                    <p className="flex items-center gap-2 text-neutral-300 truncate">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" /> {client.address.neighborhood}, {client.address.city}
                    </p>
                    <p className="flex items-center gap-2 text-neutral-400">
                      <FileText className="w-3.5 h-3.5 text-neutral-400" /> Documentos: {client.documents?.length || 0} anexado(s)
                    </p>
                  </div>
                </div>

                {/* Footer metrics & actions */}
                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Saldo Devedor</span>
                    <span className="text-sm font-extrabold text-[#8BCF00]">{formatCurrency(totalRemaining)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openWhatsAppChat(client.whatsapp, `Olá ${client.fullName.split(' ')[0]}!`)}
                      className="p-2 bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-black rounded-xl transition-all cursor-pointer"
                      title="WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSelectClient(client)}
                      className="bg-neutral-800 hover:bg-[#8BCF00] text-white hover:text-black font-semibold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      Ver Perfil <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
