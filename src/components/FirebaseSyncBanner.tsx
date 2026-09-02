import React, { useState } from 'react';
import {
  AlertTriangle,
  Database,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import { firebaseConfig, db } from '../lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';

interface FirebaseSyncBannerProps {
  onRetryConnection?: () => void;
  onDismiss?: () => void;
}

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

const REALTIME_DB_RULES_SNIPPET = `{
  "rules": {
    ".read": true,
    ".write": true
  }
}`;

export const FirebaseSyncBanner: React.FC<FirebaseSyncBannerProps> = ({
  onRetryConnection,
  onDismiss,
}) => {
  const [activeTab, setActiveTab] = useState<'firestore' | 'realtime'>('firestore');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  const projectId = (firebaseConfig as any).projectId || 'credicontrol-8315e';

  const handleCopy = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsRetrying(true);
    setRetryMessage(null);
    try {
      if (!db) {
        setRetryMessage('Instância do Firestore não configurada.');
        return;
      }
      await getDocFromServer(doc(db, 'settings', 'config'));
      setRetryMessage('Conexão ao Firestore restabelecida com sucesso!');
      setTimeout(() => {
        if (onRetryConnection) onRetryConnection();
      }, 1200);
    } catch (err: any) {
      if (
        err?.message?.includes('insufficient permissions') ||
        err?.message?.includes('permission-denied')
      ) {
        setRetryMessage('As regras ainda não foram publicadas no Console do Firebase.');
      } else {
        setRetryMessage('Tentando reconexão...');
        if (onRetryConnection) onRetryConnection();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 mb-4 text-sm text-neutral-200 shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">Sincronização em Nuvem Pendente</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold">
                {projectId}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              O Firebase recusou a leitura/escrita por falta de regras públicas. Seus dados estão salvos com segurança no armazenamento local.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>Ocultar Regras</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Como Resolver</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Dispensar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {retryMessage && (
        <div className="mt-2.5 p-2 bg-neutral-900/90 border border-neutral-800 rounded-xl text-xs flex items-center justify-between text-amber-300">
          <span>{retryMessage}</span>
        </div>
      )}

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setActiveTab('firestore')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'firestore'
                    ? 'bg-[#8BCF00] text-black shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Firestore Database (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('realtime')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'realtime'
                    ? 'bg-[#8BCF00] text-black shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Realtime Database
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isRetrying}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>Testar e Reconectar</span>
              </button>

              <a
                href={
                  activeTab === 'firestore'
                    ? `https://console.firebase.google.com/project/${projectId}/firestore/rules`
                    : `https://console.firebase.google.com/project/${projectId}/database/${projectId}-default-rtdb/rules`
                }
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>Abrir Console do Firebase</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-900 text-xs text-neutral-400">
              <span>
                {activeTab === 'firestore'
                  ? 'Copie e cole na aba: Firestore Database > Regras (Rules):'
                  : 'Copie e cole na aba: Realtime Database > Regras (Rules):'}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    activeTab === 'firestore' ? FIRESTORE_RULES_SNIPPET : REALTIME_DB_RULES_SNIPPET
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-[#8BCF00] hover:bg-[#9DE000] text-black font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Regras</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-xs font-mono text-neutral-300 overflow-x-auto p-1 leading-relaxed">
              {activeTab === 'firestore' ? FIRESTORE_RULES_SNIPPET : REALTIME_DB_RULES_SNIPPET}
            </pre>
          </div>

          <p className="text-[11px] text-neutral-400">
            Passo a passo rápido: Acesse o link acima no Firebase Console, cole o bloco acima na caixa de regras e clique no botão azul <strong>"Publicar"</strong>. Em seguida, clique em <strong>"Testar e Reconectar"</strong>.
          </p>
        </div>
      )}
    </div>
  );
};
