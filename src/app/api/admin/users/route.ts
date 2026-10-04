import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req, { requireManageAdmins: true });
    const snapshot = await adminDb.collection('users').where('role', '==', 'admin').get();
    const users = snapshot.docs.map((item) => {
      const data = item.data();
      return {
        uid: item.id,
        name: data.name || '',
        email: data.email || '',
        adminLevel: data.adminLevel || 'primary',
        canAccessSettings: data.canAccessSettings !== false,
        createdAt: data.createdAt || null,
      };
    });
    return NextResponse.json({ success: true, users });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const creator = await requireAdmin(req, { requireManageAdmins: true });
    const body = await req.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!name || !email || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Nombre, correo y contraseña de al menos 8 caracteres son requeridos.' },
        { status: 400 }
      );
    }

    const account = await adminAuth.createUser({ email, password, displayName: name, emailVerified: true });
    await adminDb.collection('users').doc(account.uid).set({
      uid: account.uid,
      name,
      email,
      role: 'admin',
      adminLevel: 'secondary',
      canAccessSettings: false,
      canManageAdmins: false,
      country: 'DO',
      walletBalance: 0,
      savingsBalance: 0,
      createdAt: new Date().toISOString(),
      createdBy: creator.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Administrador secundario creado sin acceso a Configuración.',
      user: { uid: account.uid, name, email, adminLevel: 'secondary', canAccessSettings: false },
    });
  } catch (error: any) {
    if (String(error?.code || '').startsWith('auth/')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
