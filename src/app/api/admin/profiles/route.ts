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
        primaryCurrency: profile.primaryCurrency === 'DOP' ? 'DOP' : 'USD',
        remittanceFeePercent: Number(profile.remittanceFeePercent ?? 8),
        benefitRatePercent: Number(profile.benefitRatePercent || 0),
        benefitAccruedDOP: Number(profile.benefitAccruedDOP || 0),
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
    const primaryCurrency = body.primaryCurrency === 'DOP' ? 'DOP' : 'USD';
    const remittanceFeePercent = Math.round(Number(body.remittanceFeePercent ?? 8) * 100) / 100;
    const benefitRatePercent = Math.round(Number(body.benefitRatePercent || 0) * 100) / 100;
    if (!uid || name.length < 2) return NextResponse.json({ success: false, error: 'Perfil inválido' }, { status: 400 });
    if (!['DO', 'HT', 'US'].includes(country)) return NextResponse.json({ success: false, error: 'País inválido' }, { status: 400 });
    if (!Number.isFinite(remittanceFeePercent) || remittanceFeePercent < 0 || remittanceFeePercent > 100) return NextResponse.json({ success: false, error: 'La tarifa de remesa debe estar entre 0% y 100%' }, { status: 400 });
    if (!Number.isFinite(benefitRatePercent) || benefitRatePercent < 0 || benefitRatePercent > 100) return NextResponse.json({ success: false, error: 'La tasa de beneficio debe estar entre 0% y 100%' }, { status: 400 });
    const ref = adminDb.collection('users').doc(uid);
    const ratesRef = adminDb.collection('settings').doc('rates');
    const converted = await adminDb.runTransaction(async (transaction) => {
      const [snapshot, ratesSnapshot] = await Promise.all([transaction.get(ref), transaction.get(ratesRef)]);
      if (!snapshot.exists) throw new Error('USER_NOT_FOUND');
      const current = snapshot.data() || {};
      if (current.role === 'admin') throw new Error('ADMIN_PROFILE');
      const previousCurrency = current.primaryCurrency === 'DOP' ? 'DOP' : 'USD';
      const rateDOP = Number(ratesSnapshot.data()?.publicRateDOP || 58.5);
      const convert = (value: unknown) => {
        const amount = Number(value || 0);
        if (previousCurrency === primaryCurrency) return Math.round(amount * 100) / 100;
        return Math.round((primaryCurrency === 'DOP' ? amount * rateDOP : amount / rateDOP) * 100) / 100;
      };
      const walletBalance = convert(current.walletBalance);
      const savingsBalance = convert(current.savingsBalance);
      transaction.set(ref, { name, phone, idNumber, country, clientCode, role, primaryCurrency, remittanceFeePercent, benefitRatePercent, walletBalance, savingsBalance, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { walletBalance, savingsBalance, previousCurrency, converted: previousCurrency !== primaryCurrency };
    });
    await adminAuth.updateUser(uid, { displayName: name });
    return NextResponse.json({ success: true, profile: { uid, name, phone, idNumber, country, clientCode, role, primaryCurrency, remittanceFeePercent, benefitRatePercent, ...converted } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'USER_NOT_FOUND') return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    if (message === 'ADMIN_PROFILE') return NextResponse.json({ success: false, error: 'Los administradores se gestionan en su módulo exclusivo' }, { status: 403 });
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
