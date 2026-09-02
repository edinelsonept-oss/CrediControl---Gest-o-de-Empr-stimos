import React, { useEffect, useRef } from 'react';
import { MapPin, Navigation, ExternalLink, Phone, MessageSquare } from 'lucide-react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import { formatCurrency, getLoanFinancialSummary } from '../utils/calculations';
import { openWhatsAppChat } from '../utils/whatsapp';

export const MapView: React.FC = () => {
  const { clients, loans, settings, setSelectedClientDetail, setActiveTab } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Centered at Salinópolis / PA default coordinates or average of clients
    const map = L.map(mapContainerRef.current).setView([-0.6136, -47.3562], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    clients.forEach((client) => {
      if (!client.location) return;

      const clientLoans = loans.filter((l) => l.clientId === client.id);
      const hasOverdue = clientLoans.some(
        (l) => getLoanFinancialSummary(l, undefined, settings.defaultDailyFine).isOverdue
      );
      const totalRemaining = clientLoans.reduce(
        (sum, l) => sum + getLoanFinancialSummary(l, undefined, settings.defaultDailyFine).remainingBalance,
        0
      );

      const color = hasOverdue ? '#FF3B30' : totalRemaining > 0 ? '#8BCF00' : '#30B0C7';

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color: ${color}; width: 26px; height: 26px; border-radius: 50%; border: 3px solid #000; box-shadow: 0 0 14px ${color}; display: flex; align-items: center; justify-content: center; color: #000; font-weight: bold; font-size: 11px;">$</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([client.location.lat, client.location.lng], { icon: customIcon }).addTo(map);

      const popupContent = `
        <div style="font-family: sans-serif; padding: 4px; min-width: 180px;">
          <b style="font-size: 14px; color: #000;">${client.fullName}</b><br/>
          <span style="font-size: 11px; color: #555;">${client.address.street}, ${client.address.number}</span><br/>
          <span style="font-size: 11px; color: #555;">${client.address.neighborhood} - ${client.address.city}</span><br/>
          <div style="margin-top: 6px; font-[#8BCF00]; font-weight: bold; font-size: 12px;">
            Saldo Devedor: R$ ${totalRemaining.toFixed(2)}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
    });

    return () => {
      map.remove();
    };
  }, [clients, loans, settings]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
            <MapPin className="w-7 h-7 text-[#8BCF00]" /> Mapa Geográfico de Clientes & Cobranças
          </h2>
          <p className="text-neutral-400 text-sm mt-0.5">
            Visualize a localização das residências no mapa para planejamento de rotas presenciais e cobranças.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 bg-[#1C1C1C] p-3 rounded-2xl border border-neutral-800 text-xs">
          <span className="flex items-center gap-1.5 text-[#8BCF00] font-semibold">
            <span className="w-3 h-3 rounded-full bg-[#8BCF00]"></span> Em dia 🟢
          </span>
          <span className="flex items-center gap-1.5 text-[#FF3B30] font-semibold">
            <span className="w-3 h-3 rounded-full bg-[#FF3B30]"></span> Em Atraso 🔴
          </span>
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <span className="w-3 h-3 rounded-full bg-cyan-400"></span> Quitados 🔵
          </span>
        </div>
      </div>

      {/* Map container */}
      <div className="bg-[#1C1C1C] rounded-3xl border border-neutral-800 p-2 shadow-2xl overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-[600px] rounded-2xl overflow-hidden z-10" />
      </div>

      {/* Quick Location Cards List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {clients.map((client) => {
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
              className="bg-[#1C1C1C] border border-neutral-800 p-4 rounded-2xl hover:border-neutral-700 transition-all flex items-center justify-between"
            >
              <div>
                <h4 className="font-bold text-white text-sm">{client.fullName}</h4>
                <p className="text-xs text-neutral-400 truncate max-w-[200px]">
                  {client.address.street}, {client.address.number} - {client.address.neighborhood}
                </p>
                <span className="text-xs font-bold text-[#8BCF00] mt-1 block">{formatCurrency(totalRemaining)}</span>
              </div>

              <button
                onClick={() => {
                  setSelectedClientDetail(client);
                  setActiveTab('clients');
                }}
                className="p-2.5 bg-neutral-800 hover:bg-[#8BCF00] text-neutral-300 hover:text-black rounded-xl transition-all cursor-pointer"
                title="Ver perfil completo"
              >
                <Navigation className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
