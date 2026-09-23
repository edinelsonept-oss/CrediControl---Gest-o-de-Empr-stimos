import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RotateCw,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  FileText,
  Shield,
  Home,
  Sliders,
  Sparkles,
  Upload,
  SwitchCamera,
  Maximize2,
  FileCheck,
} from 'lucide-react';
import { Client, ClientDocument } from '../types';

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSaveDocument: (newDocument: ClientDocument) => Promise<void> | void;
}

type ScanMode = 'camera' | 'preview' | 'saving';
type FilterType = 'original' | 'document_contrast' | 'black_and_white';

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isOpen,
  onClose,
  client,
  onSaveDocument,
}) => {
  const [mode, setMode] = useState<ScanMode>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);

  // Captured image state
  const [rawCapturedImageUrl, setRawCapturedImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('original');

  // Metadata state
  const [docType, setDocType] = useState<ClientDocument['type']>('contrato_assinado');
  const [docTitle, setDocTitle] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Default document title generator
  const getDefaultTitle = useCallback((type: ClientDocument['type']) => {
    const today = new Date().toLocaleDateString('pt-BR');
    switch (type) {
      case 'contrato_assinado':
        return `Contrato Assinado - ${today}`;
      case 'rg_cnh':
        return `RG / CNH - ${client.fullName.split(' ')[0]}`;
      case 'comprovante_residencia':
        return `Comprovante Residência - ${today}`;
      case 'foto_residencia':
        return `Foto Imóvel / Fachada`;
      case 'selfie':
        return `Foto / Selfie de Confirmação`;
      default:
        return `Documento Escaneado - ${today}`;
    }
  }, [client.fullName]);

  // Stop camera helper
  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
  }, []);

  // Start camera stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);
    setIsInitializingCamera(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Acesso à câmera não suportado neste navegador.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          console.warn('Video play warning:', playErr);
        });
      }
      setIsInitializingCamera(false);
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      let message = 'Não foi possível acessar a câmera do dispositivo.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Permissão para usar a câmera foi negada. Conceda a permissão nas configurações do navegador ou utilize o envio de arquivo abaixo.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'Nenhuma câmera encontrada no dispositivo. Você pode tirar uma foto usando o seletor nativo abaixo.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'A câmera já está sendo usada por outro aplicativo ou processo.';
      }
      setCameraError(message);
      setIsInitializingCamera(false);
    }
  }, [facingMode, stopCameraStream]);

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      setMode('camera');
      setDocType('contrato_assinado');
      setDocTitle(getDefaultTitle('contrato_assinado'));
      setDocNotes('');
      setRotationDegrees(0);
      setSelectedFilter('original');
      setRawCapturedImageUrl(null);
      setProcessedImageUrl(null);
      startCameraStream();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, startCameraStream, stopCameraStream, getDefaultTitle]);

  // Update title when type changes
  const handleTypeChange = (newType: ClientDocument['type']) => {
    setDocType(newType);
    setDocTitle(getDefaultTitle(newType));
  };

  // Switch between front and rear cameras
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture frame from video element
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;

    // Scale proportionally to max 1600px for optimal balance of sharp legibility and Firestore quota
    const MAX_DIM = 1600;
    let targetWidth = videoWidth;
    let targetHeight = videoHeight;

    if (videoWidth > MAX_DIM || videoHeight > MAX_DIM) {
      if (videoWidth > videoHeight) {
        targetWidth = MAX_DIM;
        targetHeight = Math.round((videoHeight * MAX_DIM) / videoWidth);
      } else {
        targetHeight = MAX_DIM;
        targetWidth = Math.round((videoWidth * MAX_DIM) / videoHeight);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    setRawCapturedImageUrl(dataUrl);
    setProcessedImageUrl(dataUrl);
    setRotationDegrees(0);
    setSelectedFilter('original');
    stopCameraStream();
    setMode('preview');
  };

  // Fallback native photo capture / file picker
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setRawCapturedImageUrl(result);
      setProcessedImageUrl(result);
      setRotationDegrees(0);
      setSelectedFilter('original');
      stopCameraStream();
      setMode('preview');
    };
    reader.readAsDataURL(file);
  };

  // Apply filters and rotations to captured photo
  const applyImageTransformations = useCallback(
    (baseImageUrl: string, filter: FilterType, rotation: number) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const isSideways = rotation % 180 !== 0;
        canvas.width = isSideways ? img.height : img.width;
        canvas.height = isSideways ? img.width : img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Apply rotation
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Apply visual document filters
        if (filter !== 'original') {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Luminance
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            if (filter === 'document_contrast') {
              // High contrast to sharpen contract text against white paper
              const contrastFactor = 1.35;
              const enhanced = contrastFactor * (gray - 128) + 128;
              const clamped = Math.max(0, Math.min(255, enhanced));
              data[i] = clamped;
              data[i + 1] = clamped;
              data[i + 2] = clamped;
            } else if (filter === 'black_and_white') {
              // Clean black & white scanner threshold
              const threshold = 135;
              const val = gray > threshold ? 255 : 30;
              data[i] = val;
              data[i + 1] = val;
              data[i + 2] = val;
            }
          }
          ctx.putImageData(imageData, 0, 0);
        }

        const transformedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setProcessedImageUrl(transformedDataUrl);
      };
      img.src = baseImageUrl;
    },
    []
  );

  const handleRotate = () => {
    if (!rawCapturedImageUrl) return;
    const nextRotation = (rotationDegrees + 90) % 360;
    setRotationDegrees(nextRotation);
    applyImageTransformations(rawCapturedImageUrl, selectedFilter, nextRotation);
  };

  const handleFilterChange = (filter: FilterType) => {
    if (!rawCapturedImageUrl) return;
    setSelectedFilter(filter);
    applyImageTransformations(rawCapturedImageUrl, filter, rotationDegrees);
  };

  const handleRetake = () => {
    setRawCapturedImageUrl(null);
    setProcessedImageUrl(null);
    setRotationDegrees(0);
    setSelectedFilter('original');
    setMode('camera');
    startCameraStream();
  };

  const handleSaveToProfile = async () => {
    if (!processedImageUrl) return;

    setIsSaving(true);
    try {
      const newDocument: ClientDocument = {
        id: `doc_${Date.now()}`,
        type: docType,
        name: docTitle.trim() || getDefaultTitle(docType),
        url: processedImageUrl,
        fileType: 'image',
        uploadedAt: new Date().toISOString().slice(0, 10),
        notes: docNotes.trim() || undefined,
      };

      await onSaveDocument(newDocument);
      onClose();
    } catch (err) {
      console.error('Error saving scanned document:', err);
      alert('Erro ao salvar documento no perfil. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#181818] border border-neutral-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8BCF00]/15 text-[#8BCF00] flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
                Scanner de Documentos & Contratos
              </h3>
              <p className="text-xs text-neutral-400">
                Cliente: <span className="text-white font-semibold">{client.fullName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {mode === 'camera' && (
            <div className="space-y-4">
              {/* Instructions banner */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 flex items-center justify-between text-xs text-neutral-300">
                <span className="flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-[#8BCF00] shrink-0" />
                  Alinhe o documento (Contrato, RG ou CNH) dentro da moldura abaixo.
                </span>

                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                  title="Alternar entre câmera traseira e frontal"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-[#8BCF00]" />
                  <span>Câmera</span>
                </button>
              </div>

              {/* Camera Viewport / Stream Container */}
              <div className="relative w-full bg-black rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/10] border-2 border-neutral-800 flex items-center justify-center shadow-inner">
                {isInitializingCamera && (
                  <div className="absolute inset-0 z-20 bg-neutral-950/80 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-[#8BCF00] animate-spin" />
                    <p className="text-xs text-neutral-300">Iniciando câmera do dispositivo...</p>
                  </div>
                )}

                {cameraError ? (
                  <div className="p-6 text-center space-y-3 z-10">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed">
                      {cameraError}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={startCameraStream}
                        className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#8BCF00]" /> Tentar Novamente
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-[#8BCF00] hover:bg-[#9DE000] text-black text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Upload className="w-3.5 h-3.5" /> Tirar Foto / Selecionar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Scanner Alignment Frame Overlay */}
                    <div className="absolute inset-6 sm:inset-8 border border-[#8BCF00]/50 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                      {/* Corner Accents */}
                      <div className="flex justify-between">
                        <div className="w-6 h-6 border-t-3 border-l-3 border-[#8BCF00] rounded-tl-lg" />
                        <div className="w-6 h-6 border-t-3 border-r-3 border-[#8BCF00] rounded-tr-lg" />
                      </div>

                      {/* Center Scanner Watermark Guide */}
                      <div className="text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 text-[#8BCF00] text-[11px] font-semibold border border-[#8BCF00]/30 backdrop-blur-xs">
                          <Sparkles className="w-3 h-3" /> Área de Captura de Documento
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <div className="w-6 h-6 border-b-3 border-l-3 border-[#8BCF00] rounded-bl-lg" />
                        <div className="w-6 h-6 border-b-3 border-r-3 border-[#8BCF00] rounded-br-lg" />
                      </div>
                    </div>
                  </>
                )}
              </div>

                {/* Shutter / Capture Button Controls */}
              <div className="flex items-center justify-center gap-4 pt-2">
                {/* Fallback upload input hidden */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-neutral-700 transition-all flex items-center gap-2 cursor-pointer"
                  title="Tirar foto usando app de câmera nativo ou selecionar da galeria"
                >
                  <Upload className="w-4 h-4 text-[#8BCF00]" />
                  <span>Galeria / Nativo</span>
                </button>

                {/* Big Shutter Trigger Button */}
                {!cameraError && (
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    disabled={isInitializingCamera}
                    className="w-16 h-16 rounded-full bg-[#8BCF00] hover:bg-[#9DE000] text-black flex items-center justify-center shadow-lg shadow-[#8BCF00]/30 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Capturar foto do documento"
                  >
                    <div className="w-13 h-13 rounded-full border-2 border-black flex items-center justify-center">
                      <Camera className="w-6 h-6 fill-black stroke-black" />
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggleCamera}
                  disabled={!!cameraError}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-neutral-700 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                  title="Trocar câmera"
                >
                  <SwitchCamera className="w-4 h-4 text-[#8BCF00]" />
                  <span>Trocar Câmera</span>
                </button>
              </div>
            </div>
          )}

          {mode === 'preview' && processedImageUrl && (
            <div className="space-y-4">
              {/* Captured Photo Viewport with rotation & filter options */}
              <div className="relative w-full bg-neutral-950 rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/10] border border-neutral-800 flex items-center justify-center shadow-inner">
                <img
                  src={processedImageUrl}
                  alt="Documento capturado"
                  className="max-w-full max-h-full object-contain"
                />

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto">
                  {/* Rotate Button */}
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="bg-black/80 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-neutral-700 backdrop-blur-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#8BCF00]" /> Girar 90°
                  </button>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-black/80 p-1 rounded-xl border border-neutral-700 backdrop-blur-xs shadow-md">
                    <button
                      type="button"
                      onClick={() => handleFilterChange('original')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedFilter === 'original'
                          ? 'bg-[#8BCF00] text-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Original
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterChange('document_contrast')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedFilter === 'document_contrast'
                          ? 'bg-[#8BCF00] text-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Realce
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterChange('black_and_white')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedFilter === 'black_and_white'
                          ? 'bg-[#8BCF00] text-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      P&B Scanner
                    </button>
                  </div>
                </div>
              </div>

              {/* Form to Categorize and Name Document */}
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Document Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-[#8BCF00]" />
                      Tipo de Documento *
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => handleTypeChange(e.target.value as ClientDocument['type'])}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="contrato_assinado">Contrato Assinado</option>
                      <option value="rg_cnh">RG / CNH / Identidade</option>
                      <option value="comprovante_residencia">Comprovante de Residência</option>
                      <option value="foto_residencia">Foto do Imóvel / Fachada</option>
                      <option value="selfie">Foto / Selfie de Confirmação</option>
                      <option value="outro">Outro Documento</option>
                    </select>
                  </div>

                  {/* Document Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      Nome / Título do Arquivo *
                    </label>
                    <input
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="Ex: Contrato de Empréstimo #01"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Observações (Opcional)
                  </label>
                  <input
                    type="text"
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    placeholder="Ex: Assinado com firma ou data de emissão recente"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-4 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between gap-3">
          {mode === 'camera' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Shield className="w-3.5 h-3.5 text-[#8BCF00]" />
                Salva diretamente no perfil e Firestore
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRetake}
                disabled={isSaving}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#8BCF00]" />
                Tirar Outra Foto
              </button>

              <button
                type="button"
                onClick={handleSaveToProfile}
                disabled={isSaving}
                className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-[#8BCF00]/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando no Firestore...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    Salvar no Perfil do Cliente
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
