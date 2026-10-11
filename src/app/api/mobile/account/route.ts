import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';
import { getEffectiveRates, normalizeWalletCurrency, toUsd } from '@/lib/currency';

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

    const [settingsSnapshot, remittancesSnapshot, movementsSnapshot, depositsSnapshot, subAgentSnapshot, operationsSnapshot] = await Promise.all([
      adminDb.collection('settings').doc('rates').get(),
      adminDb.collection('mobile_remittances').where('userId', '==', identity.uid).limit(40).get(),
      adminDb.collection('users').doc(identity.uid).collection('wallet_movements').limit(60).get(),
      adminDb.collection('wallet_deposits').where('userId', '==', identity.uid).limit(40).get(),
      identity.email ? adminDb.collection('sub_agents').where('email', '==', identity.email).limit(1).get() : Promise.resolve(null),
      adminDb.collection('settings').doc('operations').get(),
    ]);

    const settings = settingsSnapshot.data() || {};
    const effectiveRates = await getEffectiveRates(settings);
    const primaryCurrency = normalizeWalletCurrency(profile.primaryCurrency);
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
          feePercent: asNumber(data.feePercent),
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
    const remittanceById = new Map(remittances.map((item) => [item.id, item]));

    const movements = movementsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const remittance = remittanceById.get(doc.id);
      const type = String(data.type || 'movement');
      const operator = String(data.operator || remittance?.operator || (type.includes('moncash') ? 'MonCash' : type.includes('natcash') ? 'NatCash' : ''));
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
        amountHTG: asNumber(data.amountHTG, remittance?.amountHTG || 0),
        feeAmount: asNumber(data.feeAmount),
        feePercent: asNumber(data.feePercent, remittance?.feePercent || 0),
        feeUSD: asNumber(data.feeUSD, remittance?.feeUSD || 0),
        balanceAfterUSD: data.balanceAfterUSD == null ? (data.newBalance == null ? null : asNumber(data.newBalance)) : asNumber(data.balanceAfterUSD),
        operator,
        recipientName: String(data.recipientName || remittance?.recipientName || ''),
        recipientPhone: String(data.recipientPhone || remittance?.recipientPhone || ''),
        recipientCode: String(data.recipientCode || ''),
        senderName: String(data.senderName || ''),
        senderCode: String(data.senderCode || ''),
        rateText: String(data.rateText || ''),
        totalDebit: asNumber(data.totalDebit),
        status: String(data.status || 'completed'),
        referenceId: String(data.referenceId || doc.id),
        receiptCode: String(data.receiptCode || data.txId || remittance?.txId || ''),
        createdAt: jsonDate(data.createdAt) || data.createdAtIso || remittance?.createdAt || null,
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

    const subAgentDocument = subAgentSnapshot && !subAgentSnapshot.empty ? subAgentSnapshot.docs[0] : null;
    const subAgentData = subAgentDocument?.data() || null;
    const accountMode = subAgentData?.accountMode === 'postpaid' ? 'postpaid' : 'prepaid';
    const principalBalanceDOP = asNumber(operationsSnapshot.data()?.principalBalanceDOP ?? operationsSnapshot.data()?.currentOperatingBalanceDOP);
    const availableBalance = accountMode === 'postpaid' ? fromUsd(toUsd(principalBalanceDOP, 'DOP', effectiveRates), primaryCurrency, effectiveRates) : asNumber(profile.walletBalance);

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
        language: String(profile.language || 'es'),
        primaryCurrency,
        remittanceFeePercent,
        walletBalance: availableBalance,
        savingsBalance: asNumber(profile.savingsBalance),
        walletBalanceUSD: toUsd(availableBalance, primaryCurrency, effectiveRates),
        savingsBalanceUSD: toUsd(asNumber(profile.savingsBalance), primaryCurrency, effectiveRates),
        benefitRatePercent: asNumber(profile.benefitRatePercent),
        benefitAccruedDOP: asNumber(profile.benefitAccruedDOP),
        receiptPrintingEnabled: profile.thermalReceiptsEnabled === true || subAgentData?.modules?.thermalReceipts === true,
        receiptPaperWidthMm: Number(profile.receiptPaperWidthMm || subAgentData?.receiptPaperWidthMm) === 78 ? 78 : 58,
        agentAccountMode: accountMode,
      },
      rates: {
        htgPerUsd: effectiveRates.usdToHtg,
        dopPerUsd: effectiveRates.usdToDop,
        htgPerDop: effectiveRates.dopToHtg,
        rateFetchedAt: effectiveRates.fetchedAt,
        remittanceFeePercent,
      },
      subAgent: subAgentData ? {
        id: subAgentDocument!.id,
        name: String(subAgentData.name || ''),
        owner: String(subAgentData.owner || ''),
        phone: String(subAgentData.phone || ''),
        email: String(subAgentData.email || ''),
        address: String(subAgentData.location?.exactAddress || ''),
        municipality: String(subAgentData.location?.municipality || ''),
        province: String(subAgentData.location?.province || ''),
        receiptPrintingEnabled: subAgentData.modules?.thermalReceipts === true,
        receiptPaperWidthMm: Number(subAgentData.receiptPaperWidthMm || profile.receiptPaperWidthMm) === 78 ? 78 : 58,
      } : null,
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
