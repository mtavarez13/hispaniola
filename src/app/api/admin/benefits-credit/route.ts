import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';
import { createAndPushMobileNotification } from '@/lib/mobile-notifications';
import { convertCurrency, getEffectiveRates, normalizeWalletCurrency, toUsd } from '@/lib/currency';

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
    const [ratesDocument, userPreview] = await Promise.all([ratesRef.get(), userRef.get()]);
    const effectiveRates = await getEffectiveRates(ratesDocument.data() || {});
    const redemptionId = `benefit_admin_${userId}_${Date.now()}`;
    const movementRef = userRef.collection('wallet_movements').doc(redemptionId);
    const historyRef = adminDb.collection('benefit_redemptions').doc(redemptionId);
    const userEmail = String(userPreview.data()?.email || '').trim().toLowerCase();
    const linkedSubAgents = userEmail ? await adminDb.collection('sub_agents').where('email', '==', userEmail).limit(1).get() : null;
    const linkedSubAgentRef = linkedSubAgents && !linkedSubAgents.empty ? linkedSubAgents.docs[0].ref : null;
    const result = await adminDb.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists) throw new Error('CLIENT_NOT_FOUND');
      const profile = userSnapshot.data() || {};
      const accruedDOP = money(Number(profile.benefitAccruedDOP || 0));
      if (accruedDOP <= 0) throw new Error('NO_BENEFIT');
      const primaryCurrency = normalizeWalletCurrency(profile.primaryCurrency);
      const amountUSD = money(toUsd(accruedDOP, 'DOP', effectiveRates));
      const creditedAmount = money(convertCurrency(accruedDOP, 'DOP', primaryCurrency, effectiveRates));
      const previousBalance = money(Number(profile.walletBalance || 0));
      const newBalance = money(previousBalance + creditedAmount);
      const createdAtIso = new Date().toISOString();
      transaction.update(userRef, { walletBalance: newBalance, benefitAccruedDOP: 0, walletUpdatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      if (linkedSubAgentRef) transaction.set(linkedSubAgentRef, { walletBalance: newBalance, benefitAccruedDOP: 0, updatedAt: createdAtIso, updatedAtServer: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(movementRef, {
        type: 'benefit_credit', title: 'Beneficio acreditado', description: `Beneficio acumulado convertido por administración: RD$${accruedDOP.toFixed(2)}`,
        direction: 'in', amount: creditedAmount, currency: primaryCurrency, amountDOP: accruedDOP,
        previousBalance, newBalance, status: 'completed', referenceId: redemptionId, receiptCode: redemptionId, createdAt: FieldValue.serverTimestamp(), createdAtIso, creditedBy: admin.email,
      });
      transaction.create(historyRef, {
        id: redemptionId, userId, userName: String(profile.name || ''), userEmail: String(profile.email || ''), userRole: String(profile.role || 'customer'),
        subAgentId: linkedSubAgentRef?.id || null, primaryCurrency, amountDOP: accruedDOP, amountUSD, creditedAmount,
        previousBalance, newBalance, status: 'completed', redeemedBy: admin.email, createdAt: FieldValue.serverTimestamp(), createdAtIso,
      });
      return { primaryCurrency, accruedDOP, creditedAmount, amountUSD, newBalance };
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
