import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  MapPin,
  FileText,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Download,
} from 'lucide-react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import { Client, Loan } from '../types';
import { formatCurrency, formatDate, getLoanFinancialSummary } from '../utils/calculations';
import { openWhatsAppChat } from '../utils/whatsapp';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ClientDetailViewProps {
  client: Client;
  onBack: () => void;
  onEdit: () => void;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({ client, onBack, onEdit }) => {
  const {
    loans,
    settings,
    deleteClient,
    deleteLoan,
    setIsLoanModalOpen,
    setSelectedLoanDetail,
    setActiveTab,
  } = useApp();

  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [isClientDeleteConfirmOpen, setIsClientDeleteConfirmOpen] = useState<boolean>(false);

  const clientLoans = loans.filter((l) => l.clientId === client.id);

  // Client financial summary
  let clientTotalLoaned = 0;
  let clientTotalPaid = 0;
  let clientRemainingBalance = 0;
  let clientOverdueCount = 0;

  clientLoans.forEach((loan) => {
    const summary = getLoanFinancialSummary(loan, undefined, settings.defaultDailyFine);
    clientTotalLoaned += loan.principalAmount;
    clientTotalPaid += summary.totalPaid;
    clientRemainingBalance += summary.remainingBalance;
    if (summary.isOverdue) clientOverdueCount += 1;
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !client.location) return;

    const { lat, lng } = client.location;
    const map = L.map(mapContainerRef.current).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `<div style="background-color: #8BCF00; width: 24px; height: 24px; border-radius: 50%; border: 3px solid #000; box-shadow: 0 0 12px rgba(139,207,0,0.9);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([lat, lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(`<b>${client.fullName}</b><br/>${client.address.street}, ${client.address.number}`)
      .openPopup();

    return () => {
      map.remove();
    };
  }, [client]);

  const handleConfirmDeleteClient = () => {
    deleteClient(client.id);
    setIsClientDeleteConfirmOpen(false);
    onBack();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3.5 py-2 rounded-xl transition-all border border-neutral-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Lista
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl border border-neutral-700 transition-all cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5 text-[#8BCF00]" /> Editar
          </button>
          <button
            onClick={() => setIsClientDeleteConfirmOpen(true)}
            className="flex items-center gap-1.5 bg-[#FF3B30]/15 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir Cliente
          </button>
        </div>
      </div>

      {/* Main Client Profile Hero Card */}
      <div className="bg-[#1C1C1C] rounded-3xl p-6 border border-neutral-800 shadow-xl flex flex-col md:flex-row gap-6 items-start">
        <img
          src={client.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
          alt={client.fullName}
          className="w-24 h-24 rounded-2xl object-cover border-2 border-[#8BCF00]/50 shadow-md shrink-0"
        />

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold text-white font-['Outfit']">{client.fullName}</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                CPF: <span className="text-neutral-200 font-mono">{client.cpf}</span> | RG: <span className="text-neutral-200">{client.rg || 'Não informado'}</span>
              </p>
            </div>

            {/* Status indicator badge */}
            <div>
              {clientOverdueCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" /> Cliente em Atraso ({clientOverdueCount})
                </span>
              ) : clientRemainingBalance > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#8BCF00]/20 text-[#8BCF00] border border-[#8BCF00]/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Cliente em Dia 🟢
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Contratos Quitados 🔵
                </span>
              )}
            </div>
          </div>

          {/* Quick Contact & WhatsApp Launcher */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => openWhatsAppChat(client.whatsapp, `Olá ${client.fullName.split(' ')[0]}, como vai? Falo da ${settings.companyName}.`)}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-black" /> Falar no WhatsApp
            </button>
            <a
              href={`tel:${client.phone}`}
              className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all border border-neutral-700 flex items-center gap-2"
            >
              <Phone className="w-4 h-4 text-[#8BCF00]" /> Ligar ({client.phone})
            </a>
          </div>
        </div>
      </div>

      {/* Grid: Details & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Address & GPS Location Card */}
        <div className="lg:col-span-2 bg-[#1C1C1C] p-6 rounded-3xl border border-neutral-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#8BCF00]" /> Endereço & Localização do Imóvel
            </h3>
            {client.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${client.location.lat},${client.location.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#8BCF00] hover:underline flex items-center gap-1 font-semibold"
              >
                Abrir no Google Maps <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <p className="text-sm text-neutral-300">
            {client.address.street}, {client.address.number} - {client.address.neighborhood},{' '}
            {client.address.city} - {client.address.state} (CEP: {client.address.cep})
            {client.address.complement && <span className="block text-xs text-neutral-400">Comp: {client.address.complement}</span>}
          </p>

          <div ref={mapContainerRef} className="w-full h-64 rounded-2xl border border-neutral-800 overflow-hidden shadow-inner z-10" />
        </div>

        {/* Client Financial Metrics */}
        <div className="bg-[#1C1C1C] p-6 rounded-3xl border border-neutral-800 shadow-xl flex flex-col justify-between space-y-4">
          <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#8BCF00]" /> Resumo Financeiro do Cliente
          </h3>

          <div className="space-y-3 divide-y divide-neutral-800">
            <div className="pt-2 flex justify-between items-center text-sm">
              <span className="text-neutral-400">Total Emprestado:</span>
              <span className="font-bold text-white">{formatCurrency(clientTotalLoaned)}</span>
            </div>
            <div className="pt-2 flex justify-between items-center text-sm">
              <span className="text-neutral-400">Total Pago Acumulado:</span>
              <span className="font-bold text-emerald-400">{formatCurrency(clientTotalPaid)}</span>
            </div>
            <div className="pt-2 flex justify-between items-center text-sm">
              <span className="text-neutral-400">Saldo Devedor Atual:</span>
              <span className="font-extrabold text-[#8BCF00] text-base">{formatCurrency(clientRemainingBalance)}</span>
            </div>
            <div className="pt-2 flex justify-between items-center text-sm">
              <span className="text-neutral-400">Contratos Registrados:</span>
              <span className="font-bold text-white">{clientLoans.length}</span>
            </div>
          </div>

          <button
            onClick={() => setIsLoanModalOpen(true)}
            className="w-full bg-[#8BCF00] hover:bg-[#9DE000] text-black font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Novo Empréstimo para {client.fullName.split(' ')[0]}
          </button>
        </div>
      </div>

      {/* Attached Mandatory Documents */}
      <div className="bg-[#1C1C1C] p-6 rounded-3xl border border-neutral-800 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#8BCF00]" /> Documentos Anexados do Cliente
        </h3>

        {client.documents?.length === 0 ? (
          <p className="text-xs text-neutral-400 italic py-2">Nenhum documento anexado ao perfil ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {client.documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 flex items-center justify-between hover:border-neutral-700 transition-all"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-[#8BCF00]/10 text-[#8BCF00] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-white truncate">{doc.name}</p>
                    <p className="text-[10px] text-neutral-400 capitalize">{doc.type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewDocUrl(doc.url)}
                    className="p-1.5 text-neutral-400 hover:text-[#8BCF00] hover:bg-neutral-800 rounded-lg cursor-pointer"
                    title="Visualizar documento"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <a
                    href={doc.url}
                    download={doc.name}
                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg"
                    title="Baixar documento"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loans History Table */}
      <div className="bg-[#1C1C1C] p-6 rounded-3xl border border-neutral-800 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white font-['Outfit']">Histórico de Empréstimos</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="text-xs uppercase bg-neutral-900 text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Data Empréstimo</th>
                <th className="py-3 px-4 font-semibold">Valor Emprestado</th>
                <th className="py-3 px-4 font-semibold">Juros (30%)</th>
                <th className="py-3 px-4 font-semibold">Vencimento</th>
                <th className="py-3 px-4 font-semibold text-right">Total Atualizado</th>
                <th className="py-3 px-4 font-semibold text-right">Saldo Devedor</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {clientLoans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-xs text-neutral-400">
                    Nenhum empréstimo cadastrado para este cliente ainda.
                  </td>
                </tr>
              ) : (
                clientLoans.map((loan) => {
                  const summary = getLoanFinancialSummary(loan, undefined, settings.defaultDailyFine);
                  return (
                    <tr
                      key={loan.id}
                      onClick={() => {
                        setSelectedLoanDetail(loan);
                        setActiveTab('loans');
                      }}
                      className="hover:bg-neutral-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-xs font-medium">{formatDate(loan.loanDate)}</td>
                      <td className="py-3 px-4 font-semibold text-white">{formatCurrency(loan.principalAmount)}</td>
                      <td className="py-3 px-4 text-xs text-neutral-400">
                        {loan.interestRatePercent}% ({formatCurrency(loan.interestAmount)})
                      </td>
                      <td className="py-3 px-4 text-xs">{formatDate(loan.dueDate)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(summary.updatedTotalAmount)}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#8BCF00]">
                        {formatCurrency(summary.remainingBalance)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {summary.isPaid ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                            Quitado 🔵
                          </span>
                        ) : summary.isOverdue ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FF3B30]/20 text-[#FF3B30]">
                            Em Atraso 🔴 ({summary.delayDays}d)
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#8BCF00]/20 text-[#8BCF00]">
                            Em dia 🟢
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLoanToDelete(loan);
                          }}
                          className="bg-[#FF3B30]/15 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white p-1.5 rounded-lg transition-all cursor-pointer"
                          title="Excluir Empréstimo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Image Preview Modal */}
      {previewDocUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewDocUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-neutral-900 rounded-3xl overflow-hidden p-2">
            <button
              onClick={() => setPreviewDocUrl(null)}
              className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded-full hover:bg-black transition-colors"
            >
              ✕
            </button>
            <img src={previewDocUrl} alt="Documento" className="max-w-full max-h-[85vh] object-contain rounded-2xl mx-auto" />
          </div>
        </div>
      )}
      {/* Confirm Delete Loan Modal */}
      <ConfirmDeleteModal
        isOpen={!!loanToDelete}
        onClose={() => setLoanToDelete(null)}
        onConfirm={() => {
          if (loanToDelete) {
            deleteLoan(loanToDelete.id);
            setLoanToDelete(null);
          }
        }}
      />

      {/* Confirm Delete Client Modal */}
      <ConfirmDeleteModal
        isOpen={isClientDeleteConfirmOpen}
        onClose={() => setIsClientDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeleteClient}
        title="Excluir Cliente"
        message={`VOCÊ DESEJA EXCLUIR O CLIENTE ${client.fullName.toUpperCase()} E SEUS EMPRÉSTIMOS? SE SIM CLIQUE EM (DELETAR) SE NÃO CLIQUE EM (NÃO )`}
      />
    </div>
  );
};
