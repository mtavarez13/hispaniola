import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';
import { createAndPushMobileNotification } from '@/lib/mobile-notifications';
import { convertCurrency, getEffectiveRates, normalizeWalletCurrency, toUsd } from '@/lib/currency';

export const dynamic = 'force-dynamic';
const money = (value: number) => Math.round(value * 100) / 100;

export async function POST(req: NextRequest) {
  try {
    const identity = await requireAuthenticatedUser(req);
    const userRef = adminDb.collection('users').doc(identity.uid);
    const redemptionId = `benefit_redeem_${identity.uid}_${Date.now()}`;
    const movementRef = userRef.collection('wallet_movements').doc(redemptionId);
    const historyRef = adminDb.collection('benefit_redemptions').doc(redemptionId);
    const [ratesSnapshot, linkedSubAgents] = await Promise.all([
      adminDb.collection('settings').doc('rates').get(),
      identity.email
        ? adminDb.collection('sub_agents').where('email', '==', identity.email).limit(1).get()
        : Promise.resolve(null),
    ]);
    const rates = await getEffectiveRates(ratesSnapshot.data() || {});
    const linkedSubAgentRef = linkedSubAgents && !linkedSubAgents.empty ? linkedSubAgents.docs[0].ref : null;

    const result = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userRef);
      if (!snapshot.exists) throw new Error('PROFILE_NOT_FOUND');
      const profile = snapshot.data() || {};
      const accruedDOP = money(Number(profile.benefitAccruedDOP || 0));
      if (accruedDOP <= 0) throw new Error('NO_BENEFIT');

      const primaryCurrency = normalizeWalletCurrency(profile.primaryCurrency);
      const amountUSD = money(toUsd(accruedDOP, 'DOP', rates));
      const creditedAmount = money(convertCurrency(accruedDOP, 'DOP', primaryCurrency, rates));
      const previousBalance = money(Number(profile.walletBalance || 0));
      const newBalance = money(previousBalance + creditedAmount);
      const createdAtIso = new Date().toISOString();

      transaction.update(userRef, {
        walletBalance: newBalance,
        benefitAccruedDOP: 0,
        walletUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (linkedSubAgentRef) {
        transaction.set(linkedSubAgentRef, {
          walletBalance: newBalance,
          benefitAccruedDOP: 0,
          updatedAtServer: FieldValue.serverTimestamp(),
          updatedAt: createdAtIso,
        }, { merge: true });
      }
      const history = {
        id: redemptionId,
        userId: identity.uid,
        userName: identity.name,
        userEmail: identity.email,
        userRole: identity.role,
        subAgentId: linkedSubAgentRef?.id || null,
        primaryCurrency,
        amountDOP: accruedDOP,
        amountUSD,
        creditedAmount,
        previousBalance,
        newBalance,
        status: 'completed',
        redeemedBy: 'self',
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso,
      };
      transaction.create(historyRef, history);
      transaction.create(movementRef, {
        type: 'benefit_credit',
        title: 'Canje de beneficios',
        description: `Canje de beneficio acumulado: RD$${accruedDOP.toFixed(2)}`,
        direction: 'in',
        amount: creditedAmount,
        currency: primaryCurrency,
        amountDOP: accruedDOP,
        amountUSD,
        previousBalance,
        newBalance,
        status: 'completed',
        referenceId: redemptionId,
        receiptCode: redemptionId,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso,
      });
      return { redemptionId, primaryCurrency, accruedDOP, creditedAmount, amountUSD, previousBalance, newBalance };
    });

    await createAndPushMobileNotification(identity.uid, {
      title: 'Beneficios canjeados',
      body: `RD$${result.accruedDOP.toFixed(2)} fueron convertidos en saldo disponible.`,
      type: 'deposit',
      amountUSD: result.amountUSD,
      referenceId: result.redemptionId,
    }).catch((error) => console.error('[Benefit redemption] notification failed', error));

    return NextResponse.json({ success: true, redemption: result, walletBalance: result.newBalance, benefitAccruedDOP: 0 });
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_BENEFIT') {
      return NextResponse.json({ success: false, error: 'No tienes beneficios pendientes para canjear' }, { status: 409 });
    }
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
