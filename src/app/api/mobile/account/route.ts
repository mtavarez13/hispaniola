import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function jsonDate(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuthenticatedUser(req);
    const profile = identity.profile;

    const [settingsSnapshot, remittancesSnapshot, movementsSnapshot, depositsSnapshot] = await Promise.all([
      adminDb.collection('settings').doc('rates').get(),
      adminDb.collection('mobile_remittances').where('userId', '==', identity.uid).limit(40).get(),
      adminDb.collection('users').doc(identity.uid).collection('wallet_movements').limit(60).get(),
      adminDb.collection('wallet_deposits').where('userId', '==', identity.uid).limit(40).get(),
    ]);

    const settings = settingsSnapshot.data() || {};
    const primaryCurrency = profile.primaryCurrency === 'DOP' ? 'DOP' : 'USD';
    const remittanceFeePercent = asNumber(profile.remittanceFeePercent, asNumber(settings.haitiPublicFeePercent, 8));
    const remittances = remittancesSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          operator: data.operator,
          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone,
          amountUSD: asNumber(data.amountUSD),
          amount: asNumber(data.amount, data.amountUSD),
          currency: String(data.sourceCurrency || data.currency || 'USD'),
          amountDOP: asNumber(data.amountDOP),
          amountHTG: asNumber(data.amountHTG),
          feeUSD: asNumber(data.feeUSD),
          status: data.status || 'pending',
          txId: data.txId || '',
          requestId: data.requestId || null,
          message: data.message || '',
          createdAt: jsonDate(data.createdAt) || data.createdAtIso || null,
          completedAt: jsonDate(data.completedAt) || null,
        };
      })
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, 25);

    const movements = movementsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const type = String(data.type || 'movement');
      const operator = String(data.operator || (type.includes('moncash') ? 'MonCash' : type.includes('natcash') ? 'NatCash' : ''));
      return {
        id: doc.id,
        type,
        title: String(data.title || (type === 'deposit' ? 'Depósito acreditado' : operator ? `Remesa ${operator}` : 'Movimiento de billetera')),
        description: String(data.description || (data.recipientName ? `Enviado a ${data.recipientName}` : 'Movimiento procesado')),
        direction: data.direction === 'in' ? 'in' : data.direction === 'transfer' ? 'transfer' : 'out',
        amountUSD: asNumber(data.amountUSD),
        amount: asNumber(data.amount, data.amountUSD),
        currency: String(data.currency || primaryCurrency),
        amountDOP: asNumber(data.amountDOP),
        balanceAfterUSD: data.balanceAfterUSD == null ? (data.newBalance == null ? null : asNumber(data.newBalance)) : asNumber(data.balanceAfterUSD),
        operator,
        recipientName: String(data.recipientName || ''),
        recipientPhone: String(data.recipientPhone || ''),
        status: String(data.status || 'completed'),
        referenceId: String(data.referenceId || doc.id),
        receiptCode: String(data.receiptCode || data.txId || ''),
        createdAt: jsonDate(data.createdAt) || data.createdAtIso || null,
      };
    }).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    const deposits = depositsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id, methodLabel: String(data.methodLabel || 'Depósito'), amount: asNumber(data.amount),
        currency: String(data.currency || 'USD'), amountCreditedUSD: asNumber(data.amountCreditedUSD),
        feePercent: 0, reference: String(data.reference || ''), status: String(data.status || 'pending'),
        rejectionReason: String(data.rejectionReason || ''), createdAt: jsonDate(data.createdAt) || data.createdAtIso || null,
      };
    }).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    return NextResponse.json({
      success: true,
      account: {
        uid: identity.uid,
        name: identity.name,
        email: identity.email,
        role: identity.role,
        clientCode: String(profile.clientCode || ''),
        phone: String(profile.phone || ''),
        idNumber: String(profile.idNumber || ''),
        country: String(profile.country || 'DO'),
        primaryCurrency,
        remittanceFeePercent,
        walletBalance: asNumber(profile.walletBalance),
        savingsBalance: asNumber(profile.savingsBalance),
        walletBalanceUSD: primaryCurrency === 'DOP' ? asNumber(profile.walletBalance) / asNumber(settings.publicRateDOP, 58.5) : asNumber(profile.walletBalance),
        savingsBalanceUSD: primaryCurrency === 'DOP' ? asNumber(profile.savingsBalance) / asNumber(settings.publicRateDOP, 58.5) : asNumber(profile.savingsBalance),
        benefitRatePercent: asNumber(profile.benefitRatePercent),
        benefitAccruedDOP: asNumber(profile.benefitAccruedDOP),
      },
      rates: {
        htgPerUsd: asNumber(settings.publicRateHTG, 132.2),
        dopPerUsd: asNumber(settings.publicRateDOP, 58.5),
        remittanceFeePercent,
      },
      remittances,
      movements,
      deposits,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
