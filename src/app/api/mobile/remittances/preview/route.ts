import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';
import { getPersistentBencashServerConfig } from '@/lib/server-config';
import {
  executeConfirmCashIn,
  executeRequestCashIn,
  extractBencashReceiverName,
  formatHaitiPhoneNumber,
} from '@/lib/bencash/service';
import { convertCurrency, currencySymbol, fromUsd, getEffectiveRates, normalizeWalletCurrency, toUsd } from '@/lib/currency';
import { rememberVerifiedNatCashHolder } from '@/lib/bencash/account-holder-cache';

export const dynamic = 'force-dynamic';

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export async function POST(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  try {
    identity = await requireAuthenticatedUser(req);
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }

  try {
    const body = await req.json();
    const operator = String(body.operator || '').toLowerCase() === 'natcash' ? 'NatCash' : '';
    const recipientPhone = formatHaitiPhoneNumber(String(body.recipientPhone || ''));
    const enteredRecipientName = String(body.recipientName || '').trim().slice(0, 100);
    const requestedAmount = roundMoney(Number(body.amount ?? body.amountUSD));
    const legacyAmountInUSD = body.amount == null;
    const idempotencyKey = String(body.idempotencyKey || '').trim();

    if (!operator) {
      return NextResponse.json({
        success: false,
        error: 'MonCash no ofrece una consulta previa de titular en el API oficial. La verificación previa está disponible para NatCash.',
      }, { status: 409 });
    }
    if (!/^509\d{8}$/.test(recipientPhone)) {
      return NextResponse.json({ success: false, error: 'El número NatCash debe tener 8 dígitos de Haití' }, { status: 422 });
    }
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > 500000) {
      return NextResponse.json({ success: false, error: 'El monto indicado no es válido' }, { status: 422 });
    }
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(idempotencyKey)) {
      return NextResponse.json({ success: false, error: 'Identificador de operación inválido' }, { status: 400 });
    }

    const [config, profileSnapshot, settingsSnapshot, operationsSnapshot, linkedSubAgents] = await Promise.all([
      getPersistentBencashServerConfig(),
      adminDb.collection('users').doc(identity.uid).get(),
      adminDb.collection('settings').doc('rates').get(),
      adminDb.collection('settings').doc('operations').get(),
      identity.email ? adminDb.collection('sub_agents').where('email', '==', identity.email).limit(1).get() : Promise.resolve(null),
    ]);

    if (!config.privateKey) {
      return NextResponse.json({ success: false, error: 'El canal de remesas no está configurado temporalmente' }, { status: 503 });
    }
    if (!profileSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Perfil de cliente no encontrado' }, { status: 404 });
    }

    const profile = profileSnapshot.data() || {};
    const settings = settingsSnapshot.data() || {};
    const effectiveRates = await getEffectiveRates(settings);
    const sourceCurrency = normalizeWalletCurrency(profile.primaryCurrency);
    const accountMode = linkedSubAgents && !linkedSubAgents.empty && linkedSubAgents.docs[0].data().accountMode === 'postpaid' ? 'postpaid' : 'prepaid';
    const principalBalanceDOP = roundMoney(Number(operationsSnapshot.data()?.principalBalanceDOP ?? operationsSnapshot.data()?.currentOperatingBalanceDOP ?? 0));
    const walletBalance = roundMoney(Number(profile.walletBalance || 0));
    const availableBalance = accountMode === 'postpaid'
      ? roundMoney(fromUsd(toUsd(principalBalanceDOP, 'DOP', effectiveRates), sourceCurrency, effectiveRates))
      : walletBalance;
    const sourceAmount = legacyAmountInUSD && sourceCurrency !== 'USD'
      ? roundMoney(fromUsd(requestedAmount, sourceCurrency, effectiveRates))
      : requestedAmount;
    const amountUSD = roundMoney(toUsd(sourceAmount, sourceCurrency, effectiveRates));
    const amountDOP = roundMoney(fromUsd(amountUSD, 'DOP', effectiveRates));
    const configuredFee = profile.remittanceFeePercent ?? settings.haitiPublicFeePercent ?? 8;
    const parsedFee = Number(configuredFee);
    const feePercent = Number.isFinite(parsedFee) ? Math.max(0, Math.min(100, parsedFee)) : 8;
    const deliveredSource = roundMoney(Math.max(0, sourceAmount - sourceAmount * (feePercent / 100)));
    const amountHTG = roundMoney(convertCurrency(deliveredSource, sourceCurrency, 'HTG', effectiveRates));

    if (amountUSD < 1 || amountUSD > 5000) {
      return NextResponse.json({ success: false, error: 'El equivalente del envío debe estar entre US$1 y US$5,000' }, { status: 422 });
    }
    if (availableBalance < sourceAmount) {
      return NextResponse.json({
        success: false,
        error: `Saldo insuficiente. Disponible: ${currencySymbol(sourceCurrency)}${availableBalance.toFixed(2)}`,
      }, { status: 409 });
    }
    if (accountMode === 'prepaid' && principalBalanceDOP < amountDOP) {
      return NextResponse.json({ success: false, error: 'El fondo administrativo de remesas no tiene balance suficiente. Contacta a soporte.' }, { status: 409 });
    }

    const provider = await executeRequestCashIn({
      toAccountNumber: recipientPhone,
      amount: amountHTG,
      content: enteredRecipientName
        ? `HispaniolaPay móvil - verificación de ${enteredRecipientName}`
        : 'HispaniolaPay móvil - verificación de titular NatCash',
      baseUrl: config.baseUrl,
      privateKey: config.privateKey,
      autoConfirm: false,
    });
    const accepted = String(provider.resultCode) === '200';
    const txId = String(provider.result?.txId || '');
    const requestId = provider.requestId || provider.result?.requestId || null;
    const accountName = extractBencashReceiverName(provider);

    if (!accepted || !txId || !requestId) {
      const message = String(provider.resultMessage || provider.message || 'NatCash no pudo validar esta cuenta');
      return NextResponse.json({ success: false, error: message.replace(/bencash/gi, 'proveedor de pagos') }, { status: 422 });
    }
    if (!accountName) {
      await executeConfirmCashIn({
        requestId,
        txId,
        isConfirm: '0',
        baseUrl: config.baseUrl,
        privateKey: config.privateKey,
      }).catch(() => undefined);
      return NextResponse.json({
        success: false,
        error: 'NatCash aceptó la solicitud, pero no devolvió el nombre del titular. La remesa no fue confirmada.',
      }, { status: 422 });
    }

    await rememberVerifiedNatCashHolder(recipientPhone, accountName).catch((cacheError) => {
      console.warn('[Mobile remittance preview] No se pudo guardar el titular NatCash:', cacheError);
    });

    const previewId = `${identity.uid}_${idempotencyKey}`;
    await adminDb.collection('mobile_remittance_previews').doc(previewId).set({
      userId: identity.uid,
      operator,
      recipientPhone,
      enteredRecipientName,
      accountName,
      recipientNameVerified: true,
      requestedAmount,
      sourceAmount,
      sourceCurrency,
      amountHTG,
      txId,
      requestId,
      idempotencyKey,
      status: 'ready',
      expiresAtMs: Date.now() + 10 * 60 * 1000,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      preview: {
        id: previewId,
        operator,
        recipientPhone,
        accountName,
        recipientNameVerified: true,
        sourceAmount,
        sourceCurrency,
        amountHTG,
        feePercent,
        txId,
        requestId,
        expiresInSeconds: 600,
      },
    });
  } catch (error) {
    console.error('[Mobile remittance preview] error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'No se pudo verificar la cuenta NatCash' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  try {
    identity = await requireAuthenticatedUser(req);
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }

  try {
    const body = await req.json();
    const previewId = String(body.previewId || '').trim();
    if (!previewId) return NextResponse.json({ success: false, error: 'La verificación NatCash es obligatoria' }, { status: 400 });

    const previewRef = adminDb.collection('mobile_remittance_previews').doc(previewId);
    const previewSnapshot = await previewRef.get();
    if (!previewSnapshot.exists) return NextResponse.json({ success: true, cancelled: true });
    const preview = previewSnapshot.data() || {};
    if (preview.userId !== identity.uid) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    if (preview.status === 'cancelled') return NextResponse.json({ success: true, cancelled: true });
    if (preview.status !== 'ready') return NextResponse.json({ success: false, error: 'Esta verificación ya no se puede cancelar' }, { status: 409 });

    const config = await getPersistentBencashServerConfig();
    const cancellation = await executeConfirmCashIn({
      requestId: preview.requestId,
      txId: String(preview.txId || ''),
      isConfirm: '0',
      baseUrl: config.baseUrl,
      privateKey: config.privateKey,
    });
    if (String(cancellation.resultCode) !== '200') {
      return NextResponse.json({
        success: false,
        error: cancellation.resultMessage || 'NatCash no confirmó la cancelación',
      }, { status: 502 });
    }

    await previewRef.set({ status: 'cancelled', cancelledAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ success: true, cancelled: true });
  } catch (error) {
    console.error('[Mobile remittance preview cancel] error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'No se pudo cancelar la verificación NatCash' }, { status: 500 });
  }
}
