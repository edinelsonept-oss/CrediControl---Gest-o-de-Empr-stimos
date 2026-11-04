/**
 * Application Runtime Environment & Security Configuration
 * Centralizes environment access to prevent hardcoding personal credentials.
 */

export const ADMIN_EMAIL: string =
  ((import.meta as any).env?.VITE_ADMIN_EMAIL as string) ||
  'admin@credicontrol.com';

export const IS_PRODUCTION: boolean =
  (import.meta as any).env?.MODE === 'production';
