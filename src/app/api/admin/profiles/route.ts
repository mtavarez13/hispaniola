import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

function clean(value: unknown, max: number) { return String(value ?? '').trim().slice(0, max); }

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const snapshot = await adminDb.collection('users').limit(300).get();
    const profiles = snapshot.docs.map((doc) => ({ ...doc.data(), uid: doc.id }))
      .filter((profile: any) => profile.role === 'customer' || profile.role === 'agent')
      .map((profile: any) => ({
        uid: profile.uid,
        name: clean(profile.name, 100), email: clean(profile.email, 150), phone: clean(profile.phone, 30),
        idNumber: clean(profile.idNumber, 40), country: clean(profile.country || 'DO', 2),
        clientCode: clean(profile.clientCode, 30), role: profile.role,
        walletBalance: Number(profile.walletBalance || 0), savingsBalance: Number(profile.savingsBalance || 0),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ success: true, profiles });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const uid = clean(body.uid, 128);
    const name = clean(body.name, 100);
    const phone = clean(body.phone, 30);
    const idNumber = clean(body.idNumber, 40);
    const country = clean(body.country, 2).toUpperCase();
    const clientCode = clean(body.clientCode, 30).toUpperCase();
    const role = body.role === 'agent' ? 'agent' : 'customer';
    if (!uid || name.length < 2) return NextResponse.json({ success: false, error: 'Perfil inválido' }, { status: 400 });
    if (!['DO', 'HT', 'US'].includes(country)) return NextResponse.json({ success: false, error: 'País inválido' }, { status: 400 });
    const ref = adminDb.collection('users').doc(uid);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    if (snapshot.data()?.role === 'admin') return NextResponse.json({ success: false, error: 'Los administradores se gestionan en su módulo exclusivo' }, { status: 403 });
    await Promise.all([
      ref.set({ name, phone, idNumber, country, clientCode, role, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
      adminAuth.updateUser(uid, { displayName: name }),
    ]);
    return NextResponse.json({ success: true, profile: { uid, name, phone, idNumber, country, clientCode, role } });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
