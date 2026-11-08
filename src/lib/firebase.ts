import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  Auth,
} from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfigJson from '../../firebase-applet-config.json';

export const firebaseConfig = firebaseConfigJson;

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
let firestoreInstance: any = null;
try {
  firestoreInstance = (firebaseConfig as any)?.firestoreDatabaseId
    ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
    : getFirestore(app);
} catch (e) {
  try {
    firestoreInstance = getFirestore(app);
  } catch (err2) {
    console.warn('Firestore initialization fallback note:', err2);
  }
}
export const db = firestoreInstance;

export const rtdb = (firebaseConfig as any).databaseURL
  ? getDatabase(app)
  : null;

// Initialize resilient Auth persistence with Popup/Redirect Resolver
// In sandboxed iframes or background tabs, IndexedDB may throw 'Database is closing/hidden'.
// Fallback gracefully from IndexedDB to localStorage to inMemory.
// Passing browserPopupRedirectResolver is MANDATORY for signInWithPopup / signInWithRedirect.
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch (err: any) {
  try {
    authInstance = getAuth(app);
  } catch {
    authInstance = initializeAuth(app, {
      persistence: [browserLocalPersistence, inMemoryPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  }
}
export const auth = authInstance;


// Connection validation
async function testConnection() {
  try {
    if (db) {
      const { getDocFromServer } = await import('firebase/firestore');
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
  } catch (error) {
    // When offline or before rules are published in console, fail silently without spamming console errors
    console.warn('Firebase online connection check info:', error instanceof Error ? error.message : String(error));
  }
}
if (typeof window !== 'undefined') {
  testConnection();
}

// ==========================================
// Firebase Analytics (Recurso Opcional e Resiliente)
// ==========================================
export let analytics: any = null;

// Helper para registro seguro de eventos (no-op silencioso se Analytics estiver inativo)
export function logAnalyticsEvent(eventName: string, eventParams?: Record<string, any>) {
  if (analytics) {
    import('firebase/analytics')
      .then(({ logEvent }) => {
        logEvent(analytics, eventName, eventParams);
      })
      .catch(() => {
        // Falhas não críticas no Analytics opcional não interrompem a aplicação
      });
  }
}

// Inicialização única e estritamente condicional do Analytics:
// 1. Executa apenas se houver measurementId válido (ex: "G-XXXXXXXXXX")
// 2. Não tenta inicializar nem dispara requisições dinâmicas caso measurementId esteja ausente
// 3. Evita mensagens repetidas no console (inicialização única protegida por flag)
// 4. Se configurado corretamente no futuro, inicializa normalmente
if (typeof window !== 'undefined') {
  const globalWin = window as any;

  // Previne registro duplicado do listener de rejeição não tratada
  if (!globalWin.__CC_ANALYTICS_LISTENER_REGISTERED__) {
    globalWin.__CC_ANALYTICS_LISTENER_REGISTERED__ = true;
    window.addEventListener('unhandledrejection', (event) => {
      const errorStr = String(event.reason?.message || event.reason || '');
      // Intercepta estritamente rejeições originadas pela busca dinâmica do Analytics
      // NUNCA intercepta ou oculta erros de Firestore, Auth ou outros serviços
      if (
        errorStr.includes('Analytics: Dynamic config fetch failed') ||
        (errorStr.includes('FirebaseError') && errorStr.includes('Analytics'))
      ) {
        event.preventDefault();
        analytics = null;
      }
    });
  }

  // Só tenta inicializar se ainda não tentou nesta sessão e se houver um measurementId configurado
  if (!globalWin.__CC_ANALYTICS_INITIALIZED__) {
    globalWin.__CC_ANALYTICS_INITIALIZED__ = true;

    const rawMeasurementId = (firebaseConfig as any)?.measurementId;
    const measurementId = typeof rawMeasurementId === 'string' ? rawMeasurementId.trim() : '';
    const hasValidMeasurementId = measurementId.length > 0 && /^G-[A-Za-z0-9]+$/i.test(measurementId);

    if (hasValidMeasurementId) {
      try {
        isSupported()
          .then((supported) => {
            if (supported) {
              try {
                analytics = getAnalytics(app);
                console.info('Firebase Analytics inicializado com sucesso.');
              } catch {
                analytics = null;
              }
            } else {
              analytics = null;
            }
          })
          .catch(() => {
            analytics = null;
          });
      } catch {
        analytics = null;
      }
    } else {
      // measurementId não configurado: Analytics permanece opcional/desabilitado sem chamadas de rede e sem poluir o console
      analytics = null;
    }
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const isPermissionError =
    errMessage.includes('insufficient permissions') ||
    errMessage.includes('permission-denied') ||
    errMessage.includes('Missing or insufficient permissions');

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.error('Firestore Error:', JSON.stringify(errInfo));

  if (isPermissionError) {
    notifyPermissionError(errInfo);
  }

  return errInfo;
}

type PermissionErrorCallback = (info: FirestoreErrorInfo) => void;
const permissionListeners = new Set<PermissionErrorCallback>();
let lastPermissionError: FirestoreErrorInfo | null = null;

export function onPermissionError(callback: PermissionErrorCallback) {
  permissionListeners.add(callback);
  if (lastPermissionError) {
    callback(lastPermissionError);
  }
  return () => {
    permissionListeners.delete(callback);
  };
}

export function notifyPermissionError(info: FirestoreErrorInfo) {
  lastPermissionError = info;
  permissionListeners.forEach((cb) => {
    try {
      cb(info);
    } catch (e) {
      console.warn('Error in permission listener callback:', e);
    }
  });
}

export function clearPermissionError() {
  lastPermissionError = null;
}

export default app;
