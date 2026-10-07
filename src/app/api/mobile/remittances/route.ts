import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';
import { getPersistentBencashServerConfig } from '@/lib/server-config';
import {
  executeRequestCashIn,
  formatHaitiPhoneNumber,
  moncashRequestCashIn,
} from '@/lib/bencash/service';

export const dynamic = 'force-dynamic';

class MobileApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const roundMoney = (value: number) => Math.round(value * 100) / 100;

type Reservation =
  | { duplicate: true; data: Record<string, any> }
  | {
      duplicate: false;
      balance: number;
      newBalance: number;
      sourceAmount: number;
      sourceCurrency: 'USD' | 'DOP';
      amountDOP: number;
      rateHTG: number;
      rateDOP: number;
      feeUSD: number;
      deliveredUSD: number;
      amountHTG: number;
      benefitRatePercent: number;
      benefitEarnedDOP: number;
    };

export async function POST(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  try {
    identity = await requireAuthenticatedUser(req);
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Solicitud JSON inválida' }, { status: 400 });
  }

  const operator = String(body.operator || '').toLowerCase() === 'moncash' ? 'MonCash' :
    String(body.operator || '').toLowerCase() === 'natcash' ? 'NatCash' : '';
  const recipientPhone = formatHaitiPhoneNumber(String(body.recipientPhone || ''));
  const recipientName = String(body.recipientName || '').trim().slice(0, 100);
  const requestedAmount = roundMoney(Number(body.amount ?? body.amountUSD));
  const legacyAmountInUSD = body.amount == null;
  const idempotencyKey = String(body.idempotencyKey || '').trim();

  if (!operator) return NextResponse.json({ success: false, error: 'Seleccione NatCash o MonCash' }, { status: 400 });
  if (!/^509\d{8}$/.test(recipientPhone)) {
    return NextResponse.json({ success: false, error: 'El número del destinatario debe tener 8 dígitos de Haití' }, { status: 422 });
  }
  if (recipientName.length < 3) {
    return NextResponse.json({ success: false, error: 'Escriba el nombre completo del destinatario' }, { status: 422 });
  }
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > 500000) {
    return NextResponse.json({ success: false, error: 'El monto indicado no es válido' }, { status: 422 });
  }
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(idempotencyKey)) {
    return NextResponse.json({ success: false, error: 'Identificador de operación inválido' }, { status: 400 });
  }

  const profileRef = adminDb.collection('users').doc(identity.uid);
  const settingsRef = adminDb.collection('settings').doc('rates');
  const remittanceId = `${identity.uid}_${idempotencyKey}`;
  const remittanceRef = adminDb.collection('mobile_remittances').doc(remittanceId);
  let fundsReserved = false;

  try {
    const config = await getPersistentBencashServerConfig();
    if (!config.privateKey) throw new MobileApiError(503, 'El canal de remesas no está configurado temporalmente');

    const reservation: Reservation = await adminDb.runTransaction(async (transaction): Promise<Reservation> => {
      const [profileSnapshot, settingsSnapshot, existingSnapshot] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(settingsRef),
        transaction.get(remittanceRef),
      ]);

      if (existingSnapshot.exists) {
        return { duplicate: true, data: existingSnapshot.data() || {} };
      }
      if (!profileSnapshot.exists) throw new MobileApiError(404, 'Perfil de cliente no encontrado');

      const profile = profileSnapshot.data() || {};
      const settings = settingsSnapshot.data() || {};
      const sourceCurrency: 'USD' | 'DOP' = profile.primaryCurrency === 'DOP' ? 'DOP' : 'USD';
      const balance = roundMoney(Number(profile.walletBalance || 0));
      const rateHTG = Number(settings.publicRateHTG || 132.2);
      const rateDOP = Number(settings.publicRateDOP || 58.5);
      const sourceAmount = legacyAmountInUSD && sourceCurrency === 'DOP' ? roundMoney(requestedAmount * rateDOP) : requestedAmount;
      const amountUSD = roundMoney(sourceCurrency === 'DOP' ? sourceAmount / rateDOP : sourceAmount);
      if (amountUSD < 1 || amountUSD > 5000) throw new MobileApiError(422, 'El equivalente del envío debe estar entre US$1 y US$5,000');
      const amountDOP = roundMoney(sourceCurrency === 'DOP' ? sourceAmount : amountUSD * rateDOP);
      const configuredFee = profile.remittanceFeePercent ?? settings.haitiPublicFeePercent ?? 8;
      const parsedFee = Number(configuredFee);
      const feePercent = Number.isFinite(parsedFee) ? Math.max(0, Math.min(100, parsedFee)) : 8;
      const feeUSD = roundMoney(amountUSD * (feePercent / 100));
      const deliveredUSD = roundMoney(Math.max(0, amountUSD - feeUSD));
      const amountHTG = roundMoney(deliveredUSD * rateHTG);
      const benefitRatePercent = Math.max(0, Math.min(100, Number(profile.benefitRatePercent || 0)));
      const benefitEarnedDOP = roundMoney(amountDOP * benefitRatePercent / 100);

      if (balance < sourceAmount) {
        throw new MobileApiError(409, `Saldo insuficiente. Disponible: ${sourceCurrency === 'DOP' ? 'RD$' : 'US$'}${balance.toFixed(2)}`);
      }

      const newBalance = roundMoney(balance - sourceAmount);
      transaction.update(profileRef, {
        walletBalance: newBalance,
        walletUpdatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(remittanceRef, {
        userId: identity.uid,
        userEmail: identity.email,
        senderName: identity.name,
        operator,
        recipientPhone,
        recipientName,
        amount: sourceAmount,
        sourceCurrency,
        amountUSD,
        amountDOP,
        feeUSD,
        feePercent,
        deliveredUSD,
        amountHTG,
        rateHTG,
        rateDOP,
        benefitRatePercent,
        benefitEarnedDOP,
        status: 'processing',
        idempotencyKey,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: new Date().toISOString(),
      });

      return { duplicate: false, balance, newBalance, sourceAmount, sourceCurrency, amountDOP, rateHTG, rateDOP, feeUSD, deliveredUSD, amountHTG, benefitRatePercent, benefitEarnedDOP };
    });

    if (reservation.duplicate) {
      const existing = reservation.data;
      const status = String(existing.status || 'processing');
      return NextResponse.json({
        success: status === 'completed' || status === 'pending',
        duplicate: true,
        remittance: { id: remittanceId, ...existing },
        error: status === 'processing' ? 'Esta operación ya se está procesando' : undefined,
      }, { status: status === 'processing' ? 409 : 200 });
    }
    fundsReserved = true;

    let provider: any;
    if (operator === 'MonCash') {
      provider = await moncashRequestCashIn({
        toAccountNumber: recipientPhone,
        amount: reservation.amountHTG,
        content: `HispaniolaPay móvil - ${recipientName}`,
        baseUrl: config.baseUrl,
        privateKey: config.privateKey,
      });
    } else {
      provider = await executeRequestCashIn({
        toAccountNumber: recipientPhone,
        amount: reservation.amountHTG,
        content: `HispaniolaPay móvil - ${recipientName}`,
        baseUrl: config.baseUrl,
        privateKey: config.privateKey,
        autoConfirm: true,
        verifyCode: '1111',
      });
    }

    const providerCode = String(provider?.resultCode || '502');
    const accepted = providerCode === '200' || providerCode === '0';
    const txId = String(provider?.result?.txId || provider?.txId || '');
    const requestId = provider?.requestId || provider?.result?.requestId || null;
    const providerMessage = String(provider?.resultMessage || provider?.message || 'Respuesta sin detalle')
      .replace(/bencash/gi, 'proveedor de pagos');

    if (!accepted) {
      const unknownOutcome = providerCode === '502' || providerCode === '504';
      if (unknownOutcome) {
        await remittanceRef.set({
          status: 'review',
          providerCode,
          message: providerMessage,
          requestId,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return NextResponse.json({
          success: false,
          pendingReview: true,
          error: 'No se pudo verificar el resultado con el proveedor de pagos. No repita el envío; soporte revisará la operación.',
          remittanceId,
          requestId,
        }, { status: 202 });
      }

      await adminDb.runTransaction(async (transaction) => {
        const [profileSnapshot, remittanceSnapshot] = await Promise.all([
          transaction.get(profileRef),
          transaction.get(remittanceRef),
        ]);
        const current = Number(profileSnapshot.data()?.walletBalance || 0);
        if (remittanceSnapshot.data()?.status === 'processing') {
          transaction.update(profileRef, {
            walletBalance: roundMoney(current + reservation.sourceAmount),
            walletUpdatedAt: FieldValue.serverTimestamp(),
          });
          transaction.update(remittanceRef, {
            status: 'failed',
            providerCode,
            message: providerMessage,
            refunded: true,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      });

      return NextResponse.json({ success: false, error: providerMessage, providerCode }, { status: 422 });
    }

    const completed = operator === 'MonCash' || provider?.isConfirmed === true;
    const status = completed ? 'completed' : 'pending';
    await adminDb.runTransaction(async (transaction) => {
      transaction.update(remittanceRef, {
        status,
        txId,
        requestId,
        providerCode,
        message: providerMessage,
        isConfirmed: completed,
        completedAt: completed ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (reservation.benefitEarnedDOP > 0) {
        transaction.update(profileRef, { benefitAccruedDOP: FieldValue.increment(reservation.benefitEarnedDOP), updatedAt: FieldValue.serverTimestamp() });
      }
      const movementRef = profileRef.collection('wallet_movements').doc(remittanceId);
      transaction.set(movementRef, {
        type: operator === 'MonCash' ? 'remittance_moncash' : 'remittance_natcash',
        direction: 'out',
        amount: reservation.sourceAmount,
        currency: reservation.sourceCurrency,
        amountUSD: roundMoney(reservation.sourceCurrency === 'DOP' ? reservation.sourceAmount / reservation.rateDOP : reservation.sourceAmount),
        amountDOP: reservation.amountDOP,
        balanceAfterUSD: reservation.newBalance,
        balanceAfter: reservation.newBalance,
        operator,
        recipientName,
        recipientPhone,
        txId,
        requestId,
        status,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({
      success: true,
      remittance: {
        id: remittanceId,
        status,
        operator,
        recipientName,
        recipientPhone,
        amount: reservation.sourceAmount,
        sourceCurrency: reservation.sourceCurrency,
        amountUSD: roundMoney(reservation.sourceCurrency === 'DOP' ? reservation.sourceAmount / reservation.rateDOP : reservation.sourceAmount),
        amountDOP: reservation.amountDOP,
        feeUSD: reservation.feeUSD,
        amountHTG: reservation.amountHTG,
        benefitRatePercent: reservation.benefitRatePercent,
        benefitEarnedDOP: reservation.benefitEarnedDOP,
        txId,
        requestId,
        message: providerMessage,
      },
      walletBalanceUSD: reservation.newBalance,
      walletBalance: reservation.newBalance,
      primaryCurrency: reservation.sourceCurrency,
    });
  } catch (error) {
    if (error instanceof MobileApiError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('[Mobile remittance] unexpected error:', error);
    if (fundsReserved) {
      await remittanceRef.set({
        status: 'review',
        message: 'Resultado pendiente de revisión por un error interno',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => undefined);
      return NextResponse.json({
        success: false,
        pendingReview: true,
        error: 'La operación quedó en revisión. No repita el envío.',
        remittanceId,
      }, { status: 202 });
    }
    return NextResponse.json({ success: false, error: 'No se pudo procesar la remesa de forma segura' }, { status: 500 });
  }
}
