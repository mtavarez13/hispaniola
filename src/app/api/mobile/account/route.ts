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

    const [settingsSnapshot, remittancesSnapshot] = await Promise.all([
      adminDb.collection('settings').doc('rates').get(),
      adminDb.collection('mobile_remittances').where('userId', '==', identity.uid).limit(40).get(),
    ]);

    const settings = settingsSnapshot.data() || {};
    const remittances = remittancesSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          operator: data.operator,
          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone,
          amountUSD: asNumber(data.amountUSD),
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
        walletBalanceUSD: asNumber(profile.walletBalance),
        savingsBalanceUSD: asNumber(profile.savingsBalance),
      },
      rates: {
        htgPerUsd: asNumber(settings.publicRateHTG, 132.2),
        dopPerUsd: asNumber(settings.publicRateDOP, 58.5),
        remittanceFeePercent: asNumber(settings.haitiPublicFeePercent, 8),
      },
      remittances,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
