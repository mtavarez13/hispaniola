import 'server-only';

import type { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const PRIMARY_ADMIN_EMAILS = new Set(
  (process.env.PRIMARY_ADMIN_EMAILS || 'martin.tavarez.gomez@gmail.com')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export interface AdminIdentity {
  uid: string;
  email: string;
  isPrimary: boolean;
  canAccessSettings: boolean;
  canManageAdmins: boolean;
}

export async function requireAdmin(
  req: NextRequest,
  options: { requireSettings?: boolean; requireManageAdmins?: boolean } = {}
): Promise<AdminIdentity> {
  const authorization = req.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) throw new Error('UNAUTHENTICATED');

  const decoded = await adminAuth.verifyIdToken(token);
  const email = String(decoded.email || '').trim().toLowerCase();
  const profileSnapshot = await adminDb.collection('users').doc(decoded.uid).get();
  const profile = profileSnapshot.data() || {};
  const isPrimary = PRIMARY_ADMIN_EMAILS.has(email) || profile.adminLevel === 'primary';
  const isAdmin = isPrimary || profile.role === 'admin';
  if (!isAdmin) throw new Error('FORBIDDEN');

  const canAccessSettings = isPrimary || profile.canAccessSettings !== false;
  const canManageAdmins = isPrimary || profile.canManageAdmins === true;
  if (options.requireSettings && !canAccessSettings) throw new Error('SETTINGS_FORBIDDEN');
  if (options.requireManageAdmins && !canManageAdmins) throw new Error('ADMIN_MANAGEMENT_FORBIDDEN');

  return { uid: decoded.uid, email, isPrimary, canAccessSettings, canManageAdmins };
}

export function adminAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : 'FORBIDDEN';
  const status = message === 'UNAUTHENTICATED' ? 401 : 403;
  return { status, message };
}
