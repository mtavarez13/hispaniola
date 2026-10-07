import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';
import { createAndPushMobileNotification } from '@/lib/mobile-notifications';

export const dynamic = 'force-dynamic';
const money = (value: number) => Math.round(value * 100) / 100;

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const { uid } = await req.json();
    const userId = String(uid || '').trim();
    if (!userId) return NextResponse.json({ success: false, error: 'Cliente requerido' }, { status: 400 });
    const userRef = adminDb.collection('users').doc(userId);
    const ratesRef = adminDb.collection('settings').doc('rates');
    const movementRef = userRef.collection('wallet_movements').doc(`benefit_${Date.now()}`);
    const result = await adminDb.runTransaction(async (transaction) => {
      const [userSnapshot, ratesSnapshot] = await Promise.all([transaction.get(userRef), transaction.get(ratesRef)]);
      if (!userSnapshot.exists) throw new Error('CLIENT_NOT_FOUND');
      const profile = userSnapshot.data() || {};
      const accruedDOP = money(Number(profile.benefitAccruedDOP || 0));
      if (accruedDOP <= 0) throw new Error('NO_BENEFIT');
      const primaryCurrency = profile.primaryCurrency === 'DOP' ? 'DOP' : 'USD';
      const rateDOP = Number(ratesSnapshot.data()?.publicRateDOP || 58.5);
      const creditedAmount = primaryCurrency === 'DOP' ? accruedDOP : money(accruedDOP / rateDOP);
      const previousBalance = money(Number(profile.walletBalance || 0));
      const newBalance = money(previousBalance + creditedAmount);
      transaction.update(userRef, { walletBalance: newBalance, benefitAccruedDOP: 0, walletUpdatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      transaction.set(movementRef, {
        type: 'benefit_credit', title: 'Beneficio acreditado', description: `Beneficio acumulado convertido por administración: RD$${accruedDOP.toFixed(2)}`,
        direction: 'in', amount: creditedAmount, currency: primaryCurrency, amountDOP: accruedDOP,
        previousBalance, newBalance, status: 'completed', createdAt: FieldValue.serverTimestamp(), createdAtIso: new Date().toISOString(), creditedBy: admin.email,
      });
      return { primaryCurrency, accruedDOP, creditedAmount, amountUSD: money(accruedDOP / rateDOP), newBalance };
    });
    await createAndPushMobileNotification(userId, { title: 'Beneficio acreditado', body: `RD$${result.accruedDOP.toFixed(2)} de beneficios fueron asignados a tu billetera.`, type: 'deposit', amountUSD: result.amountUSD, referenceId: movementRef.id });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'CLIENT_NOT_FOUND') return NextResponse.json({ success: false, error: 'Cliente no encontrado' }, { status: 404 });
    if (message === 'NO_BENEFIT') return NextResponse.json({ success: false, error: 'El cliente no tiene beneficios pendientes' }, { status: 409 });
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
