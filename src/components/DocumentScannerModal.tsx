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
  Maximize2,
  FileCheck,
  Upload,
  SwitchCamera,
  Sparkles,
  Info,
  Lock,
  Smartphone,
  File as FileIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Client, ClientDocument } from '../types';

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSaveDocument: (newDocument: ClientDocument) => Promise<void> | void;
}

type ScanMode = 'camera' | 'preview';
type FilterType = 'original' | 'document_contrast' | 'black_and_white';
type PermissionState = 'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported';

interface CameraErrorInfo {
  type: 'NotAllowedError' | 'NotFoundError' | 'NotReadableError' | 'OverconstrainedError' | 'InsecureContext' | 'Generic';
  title: string;
  message: string;
  instructions: string[];
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isOpen,
  onClose,
  client,
  onSaveDocument,
}) => {
  const [mode, setMode] = useState<ScanMode>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>('checking');
  const [cameraError, setCameraError] = useState<CameraErrorInfo | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // Available devices
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Captured document state
  const [docFileType, setDocFileType] = useState<'image' | 'pdf'>('image');
  const [rawCapturedImageUrl, setRawCapturedImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [pdfFileInfo, setPdfFileInfo] = useState<{ name: string; sizeFormatted: string } | null>(null);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('original');

  // Metadata form state
  const [docType, setDocType] = useState<ClientDocument['type']>('contrato_assinado');
  const [docTitle, setDocTitle] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileGalleryInputRef = useRef<HTMLInputElement | null>(null);

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

  // Cleanly stop any active media stream
  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Enumerate video devices
  const refreshVideoDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
      }
    } catch (e) {
      console.warn('enumerateDevices note:', e);
    }
  }, []);

  // Start camera stream with progressive constraint cascade
  const startCameraStream = useCallback(async (overrideFacingMode?: 'environment' | 'user', overrideDeviceId?: string) => {
    stopCameraStream();
    setCameraError(null);
    setIsInitializingCamera(true);

    const activeFacing = overrideFacingMode || facingMode;
    const activeDeviceId = overrideDeviceId !== undefined ? overrideDeviceId : selectedDeviceId;

    // 1. Verify Security Context (HTTPS / localhost)
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setIsInitializingCamera(false);
      setCameraError({
        type: 'InsecureContext',
        title: 'Ambiente Não Seguro (HTTPS Obrigatório)',
        message: 'O acesso à câmera via navegador exige uma conexão segura HTTPS.',
        instructions: [
          'Acesse o sistema utilizando o protocolo seguro (https://).',
          'Em ambientes locais de desenvolvimento, utilize http://localhost ou configure um certificado SSL.',
          'Utilize a opção nativa "Tirar Foto (Nativo)" ou "Galeria / PDF" abaixo.',
        ],
      });
      return;
    }

    // 2. Verify MediaDevices API availability
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsInitializingCamera(false);
      setPermissionState('unsupported');
      setCameraError({
        type: 'NotFoundError',
        title: 'Câmera Não Suportada no Navegador',
        message: 'Este navegador não suporta a API de captura de vídeo em tempo real.',
        instructions: [
          'Utilize um navegador moderno e atualizado como Google Chrome, Safari, Microsoft Edge ou Firefox.',
          'Utilize o botão "Tirar Foto (Nativo / Celular)" ou "Galeria / PDF" abaixo para capturar diretamente pelo app de câmera do seu dispositivo.',
        ],
      });
      return;
    }

    // 3. Progressive Constraint Fallback Cascade to prevent OverconstrainedError
    const constraintAttempts: MediaStreamConstraints[] = [];

    if (activeDeviceId) {
      // Direct device selection
      constraintAttempts.push({
        video: { deviceId: { exact: activeDeviceId } },
        audio: false,
      });
    }

    // Attempt 1: High resolution ideal with facingMode
    constraintAttempts.push({
      video: {
        facingMode: { ideal: activeFacing },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });

    // Attempt 2: Standard resolution
    constraintAttempts.push({
      video: {
        facingMode: { ideal: activeFacing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    // Attempt 3: Simple facingMode
    constraintAttempts.push({
      video: {
        facingMode: activeFacing,
      },
      audio: false,
    });

    // Attempt 4: Any available video stream
    constraintAttempts.push({
      video: true,
      audio: false,
    });

    let activeStream: MediaStream | null = null;
    let lastError: any = null;

    for (const constraints of constraintAttempts) {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (activeStream) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        // If user actively denied, no need to attempt looser constraints
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          break;
        }
      }
    }

    if (activeStream) {
      mediaStreamRef.current = activeStream;
      setPermissionState('granted');
      setIsStreaming(true);
      setCameraError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = activeStream;
        videoRef.current.play().catch((playErr) => {
          console.warn('Video playback warning:', playErr);
        });
      }

      await refreshVideoDevices();
      setIsInitializingCamera(false);
      return;
    }

    // Handle Failure Cases Gracefully
    setIsInitializingCamera(false);
    const errName = lastError?.name || '';
    const errMessage = lastError?.message || '';
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
      setPermissionState('denied');
      setCameraError({
        type: 'NotAllowedError',
        title: 'Permissão da Câmera Bloqueada ou Negada',
        message: isInIframe
          ? 'O acesso à câmera foi bloqueado pela política de segurança do navegador ou do contêiner. Você pode habilitar a câmera nas configurações ou usar o botão "Tirar Foto (Nativo)" abaixo.'
          : 'A permissão para usar a câmera foi negada nas configurações do navegador.',
        instructions: [
          'No Google Chrome / Edge: Clique no ícone de cadeado ou controles à esquerda do endereço do site na barra superior > Permissões do Site > Ative "Câmera" > Atualize a página.',
          'No Safari (iOS / Mac): Toque no ícone "aA" na barra de endereços > Ajustes do Site > Câmera > Selecione "Permitir".',
          'No Android (Chrome): Toque nos 3 pontos verticais > Configurações > Configurações do site > Câmera > Permitir.',
          'Ou clique em "Tirar Foto (Nativo / Celular)" abaixo para acionar a câmera nativa do seu celular instantaneamente, sem bloqueios.',
        ],
      });
    } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
      setCameraError({
        type: 'NotFoundError',
        title: 'Nenhuma Câmera Encontrada',
        message: 'Nenhum dispositivo de vídeo físico foi identificado neste computador ou celular.',
        instructions: [
          'Verifique se a webcam está conectada e ligada corretamente.',
          'Se estiver no celular, você pode utilizar o botão "Tirar Foto (Nativo)" para usar o app padrão de câmera.',
          'Ou envie o arquivo PDF ou foto já existente pela Galeria.',
        ],
      });
    } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
      setCameraError({
        type: 'NotReadableError',
        title: 'Câmera Ocupada por Outro Aplicativo',
        message: 'A câmera do dispositivo já está sendo utilizada por outro programa ou aba.',
        instructions: [
          'Feche outros aplicativos que possam estar usando a câmera (WhatsApp, Zoom, Teams, Google Meet, Skype).',
          'Recarregue a página e tente abrir o scanner novamente.',
        ],
      });
    } else if (errName === 'OverconstrainedError') {
      setCameraError({
        type: 'OverconstrainedError',
        title: 'Resolução Não Suportada',
        message: 'A câmera não atende aos parâmetros técnicos solicitados.',
        instructions: ['Tente alternar entre a câmera frontal e traseira, ou utilize a câmera nativa.'],
      });
    } else {
      setCameraError({
        type: 'Generic',
        title: 'Falha ao Iniciar Câmera',
        message: errMessage || 'Não foi possível estabelecer conexão com o sensor de vídeo.',
        instructions: [
          'Clique em "Tentar Novamente".',
          'Caso persista, use o botão "Tirar Foto (Nativo)" ou envie o arquivo PDF pela Galeria.',
        ],
      });
    }
  }, [facingMode, selectedDeviceId, stopCameraStream, refreshVideoDevices]);

  // Initial permission and device probe on modal opening
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      return;
    }

    // Reset state for new scanning session
    setMode('camera');
    setDocType('contrato_assinado');
    setDocTitle(getDefaultTitle('contrato_assinado'));
    setDocNotes('');
    setRotationDegrees(0);
    setSelectedFilter('original');
    setRawCapturedImageUrl(null);
    setProcessedImageUrl(null);
    setPdfFileInfo(null);
    setDocFileType('image');
    setCameraError(null);

    let isMounted = true;

    // Check navigator.permissions if supported
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'camera' as any })
        .then((status) => {
          if (!isMounted) return;
          if (status.state === 'granted') {
            setPermissionState('granted');
            // User previously granted permission: automatically stream camera
            startCameraStream();
          } else if (status.state === 'denied') {
            setPermissionState('denied');
            // Don't spam prompt, show friendly prompt with alternative buttons
          } else {
            setPermissionState('prompt');
            // 'prompt': start camera stream on user action or auto-try once
            startCameraStream();
          }

          status.onchange = () => {
            if (!isMounted) return;
            if (status.state === 'granted') {
              setPermissionState('granted');
              setCameraError(null);
              startCameraStream();
            } else if (status.state === 'denied') {
              setPermissionState('denied');
            }
          };
        })
        .catch(() => {
          // If query fails (e.g. Safari iOS), attempt stream directly
          if (isMounted) {
            startCameraStream();
          }
        });
    } else {
      // Safari / browsers without query support: initiate stream directly
      startCameraStream();
    }

    return () => {
      isMounted = false;
      stopCameraStream();
    };
  }, [isOpen, getDefaultTitle, startCameraStream, stopCameraStream]);

  // Toggle between environment (back) and user (front) cameras
  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setSelectedDeviceId('');
    startCameraStream(nextFacing, '');
  };

  // Switch to specific camera device from dropdown
  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startCameraStream(facingMode, deviceId);
  };

  // Capture frame from active video element
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

    setDocFileType('image');
    setRawCapturedImageUrl(dataUrl);
    setProcessedImageUrl(dataUrl);
    setPdfFileInfo(null);
    setRotationDegrees(0);
    setSelectedFilter('original');
    stopCameraStream();
    setMode('preview');
  };

  // Process image or PDF file selected via native camera or gallery
  const processSelectedFile = (file: File) => {
    if (!file) return;

    // 1. If PDF Document
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const sizeFormatted =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setDocFileType('pdf');
        setProcessedImageUrl(result);
        setRawCapturedImageUrl(result);
        setPdfFileInfo({
          name: file.name,
          sizeFormatted,
        });
        // Auto-fill title from file name if user hasn't typed custom one
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        if (baseName) {
          setDocTitle(baseName);
        }
        stopCameraStream();
        setMode('preview');
      };
      reader.readAsDataURL(file);
      return;
    }

    // 2. If Image (JPEG, PNG, WEBP, HEIC)
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setDocFileType('image');
      setPdfFileInfo(null);
      setRawCapturedImageUrl(result);
      setProcessedImageUrl(result);
      setRotationDegrees(0);
      setSelectedFilter('original');
      stopCameraStream();
      setMode('preview');
    };
    reader.readAsDataURL(file);
  };

  // Native photo capture input change
  const handleNativeCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    e.target.value = '';
  };

  // Gallery / PDF file selection
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    e.target.value = '';
  };

  // Apply filters and rotations to captured photo
  const applyImageTransformations = useCallback(
    (baseImageUrl: string, filter: FilterType, rotation: number) => {
      if (docFileType === 'pdf') return;

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
    [docFileType]
  );

  const handleRotate = () => {
    if (!rawCapturedImageUrl || docFileType === 'pdf') return;
    const nextRotation = (rotationDegrees + 90) % 360;
    setRotationDegrees(nextRotation);
    applyImageTransformations(rawCapturedImageUrl, selectedFilter, nextRotation);
  };

  const handleFilterChange = (filter: FilterType) => {
    if (!rawCapturedImageUrl || docFileType === 'pdf') return;
    setSelectedFilter(filter);
    applyImageTransformations(rawCapturedImageUrl, filter, rotationDegrees);
  };

  const handleRetake = () => {
    setRawCapturedImageUrl(null);
    setProcessedImageUrl(null);
    setPdfFileInfo(null);
    setDocFileType('image');
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
        fileType: docFileType,
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
            title="Fechar scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {mode === 'camera' && (
            <div className="space-y-4">
              {/* Top Controls: Camera selection & orientation toggle */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs text-neutral-300">
                <span className="flex items-center gap-2 font-medium">
                  <Maximize2 className="w-4 h-4 text-[#8BCF00] shrink-0" />
                  Alinhe o documento (Contrato, RG ou CNH) dentro da moldura.
                </span>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Camera Device Switcher (if multiple cameras available) */}
                  {videoDevices.length > 1 && (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => handleSelectDevice(e.target.value)}
                      className="bg-neutral-800 text-neutral-300 text-xs rounded-lg px-2.5 py-1 border border-neutral-700 outline-none cursor-pointer"
                      title="Selecionar dispositivo de câmera"
                    >
                      <option value="">Câmera Padrão</option>
                      {videoDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId}>
                          {dev.label || `Câmera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Alternar entre câmera traseira e frontal"
                  >
                    <SwitchCamera className="w-3.5 h-3.5 text-[#8BCF00]" />
                    <span>{facingMode === 'environment' ? 'Traseira' : 'Frontal'}</span>
                  </button>
                </div>
              </div>

              {/* Camera Viewport / Stream Container */}
              <div className="relative w-full bg-black rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/10] border-2 border-neutral-800 flex items-center justify-center shadow-inner">
                {isInitializingCamera && (
                  <div className="absolute inset-0 z-20 bg-neutral-950/85 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-[#8BCF00] animate-spin" />
                    <p className="text-xs text-neutral-300 font-medium">Iniciando câmera do dispositivo...</p>
                  </div>
                )}

                {cameraError ? (
                  <div className="p-6 text-center space-y-4 z-10 max-w-lg mx-auto">
                    <div className="w-13 h-13 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg">
                      <Lock className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white font-['Outfit']">
                        {cameraError.title}
                      </h4>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {cameraError.message}
                      </p>
                    </div>

                    {/* Expandable Instructions */}
                    <div className="text-left bg-neutral-900/90 rounded-2xl p-3 border border-neutral-800 space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-[#8BCF00] hover:underline cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" /> Como autorizar a câmera nas configurações
                        </span>
                        {showInstructions ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {showInstructions && (
                        <ul className="text-[11px] text-neutral-300 space-y-1.5 pt-1 pl-2 list-disc list-inside border-t border-neutral-800/80">
                          {cameraError.instructions.map((step, idx) => (
                            <li key={idx} className="leading-normal">{step}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Action buttons when camera is blocked */}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCameraStream()}
                        className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 border border-neutral-700"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#8BCF00]" /> Tentar Câmera Novamente
                      </button>

                      <button
                        type="button"
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="bg-[#8BCF00] hover:bg-[#9DE000] text-black text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-[#8BCF00]/20"
                        title="Aciona a câmera nativa do seu celular diretamente sem bloqueio"
                      >
                        <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" /> Tirar Foto (Câmera Nativa)
                      </button>

                      <button
                        type="button"
                        onClick={() => fileGalleryInputRef.current?.click()}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 border border-neutral-700"
                        title="Enviar imagem da galeria ou documento PDF"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#8BCF00]" /> Galeria / PDF
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
                    <div className="absolute inset-5 sm:inset-7 border border-[#8BCF00]/50 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                      {/* Corner Accents */}
                      <div className="flex justify-between">
                        <div className="w-7 h-7 border-t-4 border-l-4 border-[#8BCF00] rounded-tl-xl" />
                        <div className="w-7 h-7 border-t-4 border-r-4 border-[#8BCF00] rounded-tr-xl" />
                      </div>

                      {/* Center Scanner Watermark Guide */}
                      <div className="text-center">
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 text-[#8BCF00] text-xs font-semibold border border-[#8BCF00]/30 backdrop-blur-md">
                          <Sparkles className="w-3.5 h-3.5" /> Área de Captura de Documento
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <div className="w-7 h-7 border-b-4 border-l-4 border-[#8BCF00] rounded-bl-xl" />
                        <div className="w-7 h-7 border-b-4 border-r-4 border-[#8BCF00] rounded-br-xl" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Shutter / Capture Button Controls */}
              <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
                {/* 1. Direct native camera capture (zero permissions required on Android/iOS) */}
                <input
                  ref={nativeCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNativeCameraChange}
                  className="hidden"
                />

                {/* 2. Gallery / File System picker (Images & PDF) */}
                <input
                  ref={fileGalleryInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleGalleryChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-neutral-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  title="Abrir aplicativo de câmera nativo do celular"
                >
                  <Smartphone className="w-4 h-4 text-[#8BCF00]" />
                  <span>Câmera Nativa</span>
                </button>

                {/* Big Central Shutter Trigger Button (when streaming) */}
                {!cameraError && isStreaming && (
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    disabled={isInitializingCamera}
                    className="w-16 h-16 rounded-full bg-[#8BCF00] hover:bg-[#9DE000] text-black flex items-center justify-center shadow-xl shadow-[#8BCF00]/30 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Capturar foto do documento"
                  >
                    <div className="w-13 h-13 rounded-full border-2 border-black flex items-center justify-center">
                      <Camera className="w-6 h-6 fill-black stroke-black" />
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fileGalleryInputRef.current?.click()}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-neutral-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  title="Selecionar foto da galeria ou arquivo em PDF"
                >
                  <Upload className="w-4 h-4 text-[#8BCF00]" />
                  <span>Galeria / PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode: Preview & Metadata Editing */}
          {mode === 'preview' && processedImageUrl && (
            <div className="space-y-4">
              {/* Document Display Viewport */}
              <div className="relative w-full bg-neutral-950 rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/10] border border-neutral-800 flex items-center justify-center shadow-inner">
                {docFileType === 'pdf' ? (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto shadow-md">
                      <FileIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 uppercase tracking-wider">
                        Documento PDF
                      </span>
                      <p className="text-sm font-bold text-white mt-1.5 truncate max-w-sm mx-auto">
                        {pdfFileInfo?.name || 'Documento.pdf'}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Tamanho: {pdfFileInfo?.sizeFormatted || 'Arquivo carregado'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <img
                      src={processedImageUrl}
                      alt="Documento capturado"
                      className="max-w-full max-h-full object-contain"
                    />

                    {/* Image Controls: Rotate & Filters */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto">
                      <button
                        type="button"
                        onClick={handleRotate}
                        className="bg-black/80 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-neutral-700 backdrop-blur-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                        title="Girar 90 graus"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-[#8BCF00]" /> Girar 90°
                      </button>

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
                  </>
                )}
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
                      onChange={(e) => {
                        const newType = e.target.value as ClientDocument['type'];
                        setDocType(newType);
                        if (!pdfFileInfo) {
                          setDocTitle(getDefaultTitle(newType));
                        }
                      }}
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
                Tirar Outra Foto / Trocar Arquivo
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
