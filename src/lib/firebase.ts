import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
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

export const auth = getAuth(app);

// Connection validation
async function testConnection() {
  try {
    if (db) {
      const { getDocFromServer } = await import('firebase/firestore');
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
if (typeof window !== 'undefined') {
  testConnection();
}

export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch((err) => {
    console.warn('Firebase Analytics check:', err);
  });
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
