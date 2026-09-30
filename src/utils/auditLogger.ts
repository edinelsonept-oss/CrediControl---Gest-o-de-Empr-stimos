/**
 * Audit Logging Service
 * Provides immutable, tamper-resistant tracking of all security-sensitive and financial operations.
 * Stored in Firestore 'audit_logs' collection and local cache.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuditLog, AuditAction, UserProfile } from '../types';
import { scrubSensitiveFields } from './securityValidator';

const AUDIT_STORAGE_KEY = 'credicontrol_audit_logs';

/**
 * Creates and persists an audit log entry.
 */
export async function logAuditEvent(
  user: UserProfile | { id: string; name: string; email: string; role: 'admin' | 'employee' | 'system' },
  action: AuditAction,
  entityType: 'client' | 'loan' | 'payment' | 'employee' | 'settings' | 'auth' | 'backup' | 'migration',
  entityId: string,
  details: Record<string, any> = {}
): Promise<AuditLog> {
  const auditEntry: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    action,
    entityType,
    entityId,
    userId: user.id || 'anonymous',
    userName: user.name || 'Desconhecido',
    userEmail: user.email || 'sem-email',
    userRole: (user.role as any) || 'system',
    timestamp: new Date().toISOString(),
    details: scrubSensitiveFields(details),
  };

  // 1. Save to Local Cache for quick offline access
  try {
    const cached = localStorage.getItem(AUDIT_STORAGE_KEY);
    const logs: AuditLog[] = cached ? JSON.parse(cached) : [];
    logs.unshift(auditEntry);
    // Keep last 500 logs locally
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs.slice(0, 500)));
  } catch (storageErr) {
    // Non-blocking
  }

  // 2. Persist to Firestore immutable 'audit_logs' collection
  if (db) {
    try {
      await setDoc(doc(db, 'audit_logs', auditEntry.id), auditEntry);
    } catch (firestoreErr) {
      // Non-blocking fallback to ensure main UX is uninterrupted
      console.warn('Audit log remote persistence note:', firestoreErr);
    }
  }

  return auditEntry;
}

/**
 * Retrieves the local audit log trail.
 */
export function getLocalAuditLogs(): AuditLog[] {
  try {
    const cached = localStorage.getItem(AUDIT_STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}
