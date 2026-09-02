import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  FileText,
  MapPin,
  Upload,
  Camera,
  Trash2,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Crosshair,
} from 'lucide-react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import { Client, ClientDocument } from '../types';
import { formatCPF, formatPhone } from '../utils/calculations';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({ isOpen, onClose, clientToEdit }) => {
  const { addClient, updateClient } = useApp();

  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  // Address
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Salinópolis');
  const [state, setState] = useState('PA');
  const [complement, setComplement] = useState('');

  // GPS Location
  const [lat, setLat] = useState(-0.6136);
  const [lng, setLng] = useState(-47.3562);
  const [addressFormatted, setAddressFormatted] = useState('');

  // Documents
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [notes, setNotes] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (clientToEdit) {
      setFullName(clientToEdit.fullName);
      setCpf(clientToEdit.cpf);
      setRg(clientToEdit.rg);
      setBirthDate(clientToEdit.birthDate);
      setPhone(clientToEdit.phone);
      setWhatsapp(clientToEdit.whatsapp);
      setEmail(clientToEdit.email);
      setCep(clientToEdit.address.cep);
      setStreet(clientToEdit.address.street);
      setNumber(clientToEdit.address.number);
      setNeighborhood(clientToEdit.address.neighborhood);
      setCity(clientToEdit.address.city);
      setState(clientToEdit.address.state);
      setComplement(clientToEdit.address.complement || '');
      setLat(clientToEdit.location?.lat || -0.6136);
      setLng(clientToEdit.location?.lng || -47.3562);
      setAddressFormatted(clientToEdit.location?.addressFormatted || '');
      setDocuments(clientToEdit.documents || []);
      setPhotoUrl(clientToEdit.photoUrl || '');
      setNotes(clientToEdit.notes || '');
    } else {
      // Reset
      setFullName('');
      setCpf('');
      setRg('');
      setBirthDate('');
      setPhone('');
      setWhatsapp('');
      setEmail('');
      setCep('');
      setStreet('');
      setNumber('');
      setNeighborhood('');
      setCity('Salinópolis');
      setState('PA');
      setComplement('');
      setLat(-0.6136);
      setLng(-47.3562);
      setAddressFormatted('');
      setDocuments([]);
      setPhotoUrl('');
      setNotes('');
    }
  }, [clientToEdit, isOpen]);

  // Leaflet Map Picker Initialization
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Small timeout to allow DOM node rendering
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background-color: #8BCF00; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #000; box-shadow: 0 0 10px rgba(139,207,0,0.8);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([lat, lng], { draggable: true, icon: customIcon }).addTo(map);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, lat, lng]);

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          setLat(newLat);
          setLng(newLng);
          if (mapInstanceRef.current && markerInstanceRef.current) {
            mapInstanceRef.current.setView([newLat, newLng], 16);
            markerInstanceRef.current.setLatLng([newLat, newLng]);
          }
        },
        () => {
          alert('Não foi possível obter a localização exata do GPS. Você pode clicar no mapa para definir.');
        }
      );
    }
  };

  const handleDocumentFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: ClientDocument['type']
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      const newDoc: ClientDocument = {
        id: `doc_${Date.now()}`,
        type: docType,
        name: file.name,
        url: base64Url,
        fileType: file.type.includes('image') ? 'image' : 'pdf',
        uploadedAt: new Date().toISOString().slice(0, 10),
      };

      setDocuments((prev) => {
        const filtered = prev.filter((d) => d.type !== docType);
        return [...filtered, newDoc];
      });
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !cpf || !phone) {
      alert('Por favor, preencha pelo menos Nome, CPF e Telefone/WhatsApp.');
      return;
    }

    const formattedAddressString = `${street}, ${number} - ${neighborhood}, ${city} - ${state}`;

    const clientData = {
      fullName,
      cpf,
      rg,
      birthDate,
      phone,
      whatsapp: whatsapp || phone,
      email,
      address: {
        cep,
        street,
        number,
        neighborhood,
        city,
        state,
        complement,
      },
      location: {
        lat,
        lng,
        addressFormatted: addressFormatted || formattedAddressString,
      },
      documents,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      notes,
    };

    if (clientToEdit) {
      updateClient(clientToEdit.id, clientData);
    } else {
      addClient(clientData);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1C1C1C] border border-neutral-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8BCF00]/20 text-[#8BCF00] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">
                {clientToEdit ? 'Editar Cadastro de Cliente' : 'Novo Cadastro de Cliente'}
              </h3>
              <p className="text-xs text-neutral-400">Preencha os dados e anexe a documentação obrigatória</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Dados Pessoais */}
          <div>
            <h4 className="text-sm font-bold text-[#8BCF00] uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Dados Pessoais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: João Pedro Santos"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">CPF *</label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">RG</label>
                <input
                  type="text"
                  value={rg}
                  onChange={(e) => setRg(e.target.value)}
                  placeholder="0000000-PA"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Telefone Principal *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => {
                    const val = formatPhone(e.target.value);
                    setPhone(val);
                    if (!whatsapp) setWhatsapp(val);
                  }}
                  placeholder="(91) 98000-0000"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                  placeholder="(91) 98000-0000"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Endereço & Localização GPS */}
          <div className="pt-4 border-t border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-[#8BCF00] uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Endereço & GPS do Imóvel
              </h4>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="text-xs bg-neutral-800 hover:bg-neutral-700 text-[#8BCF00] px-3 py-1.5 rounded-xl border border-neutral-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" /> Usar Meu GPS Atual
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">CEP</label>
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="68721-000"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-[#8BCF00] outline-none font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Rua / Logradouro</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Av. Beira Mar"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Número</label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="1250"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Bairro</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Atalaia"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Cidade / UF</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Salinópolis"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="PA"
                    className="w-16 bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3 py-2.5 text-sm text-white outline-none text-center uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Interactive Leaflet Map Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-300">
                Pino no Mapa GPS (Clique ou arraste o marcador para a casa do cliente)
              </label>
              <div
                ref={mapContainerRef}
                className="w-full h-52 rounded-2xl border border-neutral-800 overflow-hidden shadow-inner bg-neutral-900 z-10"
              />
              <p className="text-[11px] text-neutral-400">
                Coordenadas selecionadas: <span className="text-[#8BCF00] font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
              </p>
            </div>
          </div>

          {/* Section 3: Documentos Obrigatórios */}
          <div className="pt-4 border-t border-neutral-800">
            <h4 className="text-sm font-bold text-[#8BCF00] uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Documentos Obrigatórios do Cliente
            </h4>
            <p className="text-xs text-neutral-400 mb-4">
              Anexe comprovantes e fotos da residência para garantia e histórico do crédito.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { type: 'rg_cnh' as const, label: 'RG ou CNH (Frente e Verso)', icon: FileText },
                { type: 'comprovante_residencia' as const, label: 'Comprovante de Residência', icon: FileText },
                { type: 'foto_residencia' as const, label: 'Foto da Frente da Residência', icon: Camera },
                { type: 'selfie' as const, label: 'Selfie do Cliente (Opcional)', icon: User },
                { type: 'contrato_assinado' as const, label: 'Contrato Assinado (Opcional)', icon: FileText },
              ].map((docSpec) => {
                const existingDoc = documents.find((d) => d.type === docSpec.type);
                const IconComponent = docSpec.icon;

                return (
                  <div
                    key={docSpec.type}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      existingDoc
                        ? 'bg-[#8BCF00]/10 border-[#8BCF00]/40'
                        : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <IconComponent className="w-3.5 h-3.5 text-[#8BCF00]" />
                        {docSpec.label}
                      </span>
                      {existingDoc && (
                        <CheckCircle2 className="w-4 h-4 text-[#8BCF00]" />
                      )}
                    </div>

                    {existingDoc ? (
                      <div className="flex items-center justify-between bg-neutral-950 p-2 rounded-xl text-xs">
                        <span className="truncate max-w-[140px] text-neutral-300">{existingDoc.name}</span>
                        <button
                          type="button"
                          onClick={() => removeDocument(existingDoc.id)}
                          className="text-[#FF3B30] hover:bg-[#FF3B30]/20 p-1 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-700 transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Anexar Arquivo
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleDocumentFileUpload(e, docSpec.type)}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Observações / Anotações Internas */}
          <div className="pt-4 border-t border-neutral-800">
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Observações & Histórico Comercial
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre comportamento de pagamento, referências..."
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl p-3 text-sm text-white outline-none"
            />
          </div>

          {/* Modal Buttons */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#8BCF00] hover:bg-[#9DE000] text-black text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-[#8BCF00]/20 transition-all cursor-pointer"
            >
              {clientToEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
