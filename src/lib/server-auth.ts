import 'server-only';

import type { NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
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

export interface AuthenticatedIdentity {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'customer';
  profile: Record<string, unknown>;
}

/** Verifica un Firebase ID token y carga el perfil asociado. */
export async function requireAuthenticatedUser(req: NextRequest): Promise<AuthenticatedIdentity> {
  const authorization = req.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) throw new Error('UNAUTHENTICATED');

  const decoded = await adminAuth.verifyIdToken(token);
  const profileRef = adminDb.collection('users').doc(decoded.uid);
  let profileSnapshot = await profileRef.get();
  if (!profileSnapshot.exists && decoded.email) {
    await profileRef.set({
      uid: decoded.uid,
      email: decoded.email.toLowerCase(),
      name: decoded.name || decoded.email.split('@')[0],
      role: 'customer',
      clientCode: `CLI-${decoded.uid.slice(0, 6).toUpperCase()}`,
      phone: decoded.phone_number || '',
      walletBalance: 0,
      savingsBalance: 0,
      primaryCurrency: 'USD',
      benefitRatePercent: 0,
      benefitAccruedDOP: 0,
      authProvider: decoded.firebase?.sign_in_provider || 'firebase',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: false });
    profileSnapshot = await profileRef.get();
  }
  if (!profileSnapshot.exists) throw new Error('PROFILE_NOT_FOUND');

  const profile = (profileSnapshot.data() || {}) as Record<string, unknown>;
  const rawRole = String(profile.role || 'customer');
  const role = rawRole === 'admin' || rawRole === 'agent' ? rawRole : 'customer';

  return {
    uid: decoded.uid,
    email: String(decoded.email || profile.email || '').trim().toLowerCase(),
    name: String(profile.name || decoded.name || decoded.email || 'Cliente'),
    role,
    profile,
  };
}

export function authenticatedUserError(error: unknown) {
  const message = error instanceof Error ? error.message : 'FORBIDDEN';
  if (message === 'UNAUTHENTICATED' || message.includes('auth/')) {
    return { status: 401, message: 'Sesión inválida o vencida' };
  }
  if (message === 'PROFILE_NOT_FOUND') {
    return { status: 404, message: 'Perfil de cliente no encontrado' };
  }
  return { status: 403, message: 'Acceso no autorizado' };
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
