import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';
import { createAndPushMobileNotification } from '@/lib/mobile-notifications';
import { convertCurrency, currencySymbol, getEffectiveRates, normalizeWalletCurrency, toUsd } from '@/lib/currency';

export const dynamic = 'force-dynamic';

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const TRANSFER_FEE_PERCENT = 0.30;

class TransferError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function transferValues(sender: Record<string, any>, recipient: Record<string, any>, amount: number, rates: Awaited<ReturnType<typeof getEffectiveRates>>) {
  const senderCurrency = normalizeWalletCurrency(sender.primaryCurrency);
  const recipientCurrency = normalizeWalletCurrency(recipient.primaryCurrency || recipient.localCurrency);
  const fee = roundMoney(amount * TRANSFER_FEE_PERCENT / 100);
  const totalDebit = roundMoney(amount + fee);
  const amountUSD = toUsd(amount, senderCurrency, rates);
  const creditedAmount = roundMoney(convertCurrency(amount, senderCurrency, recipientCurrency, rates));
  const feeUSD = roundMoney(toUsd(fee, senderCurrency, rates));
  const rateApplied = amount > 0 ? creditedAmount / amount : 0;
  const rateText = senderCurrency === recipientCurrency
    ? `1 ${senderCurrency} = 1 ${recipientCurrency}`
    : `1 ${senderCurrency} = ${rateApplied.toFixed(4)} ${recipientCurrency}`;
  return { senderCurrency, recipientCurrency, fee, totalDebit, amountUSD, creditedAmount, feeUSD, rateApplied, rateText };
}

export async function POST(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof requireAuthenticatedUser>> | null = null;
  try {
    const authenticatedIdentity = await requireAuthenticatedUser(req);
    identity = authenticatedIdentity;
    const body = await req.json();
    const recipientIdentifier = String(body.recipient || '').trim();
    const emailIdentifier = recipientIdentifier.toLowerCase();
    const codeIdentifier = recipientIdentifier.toUpperCase();
    const amount = roundMoney(Number(body.amount || 0));
    const quoteOnly = body.quoteOnly === true;
    const idempotencyKey = String(body.idempotencyKey || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
    if (!recipientIdentifier || amount <= 0 || (!quoteOnly && !idempotencyKey)) throw new TransferError(400, 'Indica el código o correo del destinatario y un monto válido.');

    const users = adminDb.collection('users');
    const [emailUser, codeUser, subAgentByEmail, subAgentById] = await Promise.all([
      users.where('email', '==', emailIdentifier).limit(1).get(),
      users.where('clientCode', '==', codeIdentifier).limit(1).get(),
      adminDb.collection('sub_agents').where('email', '==', emailIdentifier).limit(1).get(),
      adminDb.collection('sub_agents').doc(codeIdentifier).get(),
    ]);

    const recipientUserDoc = !emailUser.empty ? emailUser.docs[0] : !codeUser.empty ? codeUser.docs[0] : null;
    const recipientSubAgentDoc = recipientUserDoc ? null : !subAgentByEmail.empty ? subAgentByEmail.docs[0] : subAgentById.exists ? subAgentById : null;
    if (!recipientUserDoc && !recipientSubAgentDoc) throw new TransferError(404, 'No encontramos un cliente o subagente con ese código o correo.');
    if (recipientUserDoc?.id === authenticatedIdentity.uid) throw new TransferError(400, 'No puedes transferirte saldo a tu misma cuenta.');

    const senderRef = users.doc(authenticatedIdentity.uid);
    const recipientRef = recipientUserDoc ? recipientUserDoc.ref : recipientSubAgentDoc!.ref;
    const settingsRef = adminDb.collection('settings').doc('rates');
    const [senderPreview, recipientPreview, settingsPreview] = await Promise.all([
      senderRef.get(), recipientRef.get(), settingsRef.get(),
    ]);
    if (!senderPreview.exists || !recipientPreview.exists) throw new TransferError(404, 'La cuenta de origen o destino ya no está disponible.');
    const effectiveRates = await getEffectiveRates(settingsPreview.data() || {});
    const previewValues = transferValues(senderPreview.data() || {}, recipientPreview.data() || {}, amount, effectiveRates);
    const recipientPreviewData = recipientPreview.data() || {};
    const previewName = String(recipientPreviewData.name || recipientPreviewData.owner || recipientPreviewData.email || recipientIdentifier);
    const previewCode = String(recipientPreviewData.clientCode || recipientPreviewData.id || recipientSubAgentDoc?.id || '');
    if (quoteOnly) {
      const balance = roundMoney(Number(senderPreview.data()?.walletBalance || 0));
      return NextResponse.json({
        success: true,
        quote: {
          recipientName: previewName, recipientCode: previewCode,
          amount, sourceCurrency: previewValues.senderCurrency,
          creditedAmount: previewValues.creditedAmount, destinationCurrency: previewValues.recipientCurrency,
          feePercent: TRANSFER_FEE_PERCENT, feeAmount: previewValues.fee, totalDebit: previewValues.totalDebit,
          rateApplied: previewValues.rateApplied, rateText: previewValues.rateText,
          usdToDop: effectiveRates.usdToDop, usdToHtg: effectiveRates.usdToHtg,
          sufficientBalance: balance >= previewValues.totalDebit, availableBalance: balance,
        },
      });
    }
    const transferId = `${authenticatedIdentity.uid}_${idempotencyKey}`;
    const transferRef = adminDb.collection('wallet_transfers').doc(transferId);
    const senderMovementRef = senderRef.collection('wallet_movements').doc(transferId);
    const recipientMovementRef = recipientUserDoc
      ? recipientUserDoc.ref.collection('wallet_movements').doc(transferId)
      : recipientSubAgentDoc!.ref.collection('wallet_movements').doc(transferId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const [existingTransfer, senderSnapshot, recipientSnapshot] = await Promise.all([
        transaction.get(transferRef), transaction.get(senderRef), transaction.get(recipientRef),
      ]);
      if (existingTransfer.exists) return { duplicate: true, ...(existingTransfer.data() || {}) };
      if (!senderSnapshot.exists || !recipientSnapshot.exists) throw new TransferError(404, 'La cuenta de origen o destino ya no está disponible.');

      const sender = senderSnapshot.data() || {};
      const recipient = recipientSnapshot.data() || {};
      const values = transferValues(sender, recipient, amount, effectiveRates);
      const { senderCurrency, recipientCurrency, fee, totalDebit, creditedAmount, feeUSD, rateApplied, rateText } = values;
      const senderBalance = roundMoney(Number(sender.walletBalance || 0));
      if (senderBalance < totalDebit) {
        const symbol = currencySymbol(senderCurrency);
        throw new TransferError(409, `Saldo insuficiente. Necesitas ${symbol}${totalDebit.toFixed(2)} y tienes ${symbol}${senderBalance.toFixed(2)}.`);
      }

      const recipientBalance = roundMoney(Number(recipient.walletBalance || 0));
      const senderBalanceAfter = roundMoney(senderBalance - totalDebit);
      const recipientBalanceAfter = roundMoney(recipientBalance + creditedAmount);
      const recipientName = String(recipient.name || recipient.owner || recipient.email || recipientIdentifier);
      const recipientCode = String(recipient.clientCode || recipient.id || recipientSubAgentDoc?.id || '');
      const transferData = {
        senderId: authenticatedIdentity.uid,
        senderName: authenticatedIdentity.name,
        senderEmail: authenticatedIdentity.email,
        senderCode: String(sender.clientCode || ''),
        senderRole: String(sender.role || 'customer'),
        recipientId: recipientRef.id,
        recipientType: recipientUserDoc ? String(recipient.role || 'customer') : 'sub_agent',
        recipientName,
        recipientEmail: String(recipient.email || ''),
        recipientCode,
        amount,
        sourceCurrency: senderCurrency,
        creditedAmount,
        destinationCurrency: recipientCurrency,
        dopPerUsd: effectiveRates.usdToDop,
        htgPerUsd: effectiveRates.usdToHtg,
        rateApplied,
        rateText,
        feePercent: TRANSFER_FEE_PERCENT,
        feeAmount: fee,
        feeUSD,
        totalDebit,
        senderBalanceAfter,
        recipientBalanceAfter,
        status: 'completed',
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: new Date().toISOString(),
      };

      transaction.update(senderRef, { walletBalance: senderBalanceAfter, walletUpdatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      transaction.update(recipientRef, { walletBalance: recipientBalanceAfter, walletUpdatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      transaction.create(transferRef, transferData);
      transaction.create(senderMovementRef, { type: 'internal_transfer_out', title: 'Transferencia enviada', description: `Enviado a ${recipientName} · ${rateText} · Comisión ${TRANSFER_FEE_PERCENT.toFixed(2)}%`, direction: 'out', amount, currency: senderCurrency, amountUSD: roundMoney(values.amountUSD), feeAmount: fee, feePercent: TRANSFER_FEE_PERCENT, totalDebit, rateApplied, rateText, newBalance: senderBalanceAfter, status: 'completed', referenceId: transferId, receiptCode: transferId, recipientName, recipientCode, createdAt: FieldValue.serverTimestamp(), createdAtIso: new Date().toISOString() });
      transaction.create(recipientMovementRef, { type: 'internal_transfer_in', title: 'Transferencia recibida', description: `Recibido de ${authenticatedIdentity.name} · ${rateText}`, direction: 'in', amount: creditedAmount, currency: recipientCurrency, amountUSD: roundMoney(values.amountUSD), rateApplied, rateText, newBalance: recipientBalanceAfter, status: 'completed', referenceId: transferId, receiptCode: transferId, senderName: authenticatedIdentity.name, senderCode: String(authenticatedIdentity.profile.clientCode || ''), createdAt: FieldValue.serverTimestamp(), createdAtIso: new Date().toISOString() });
      return { duplicate: false, id: transferId, status: 'completed', recipientName, recipientCode, amount, sourceCurrency: senderCurrency, creditedAmount, destinationCurrency: recipientCurrency, dopPerUsd: effectiveRates.usdToDop, htgPerUsd: effectiveRates.usdToHtg, rateApplied, rateText, feePercent: TRANSFER_FEE_PERCENT, feeAmount: fee, feeUSD, totalDebit, senderBalanceAfter, recipientBalanceAfter };
    });

    if (!result.duplicate) {
      const senderSymbol = currencySymbol(normalizeWalletCurrency(result.sourceCurrency));
      const senderAmountUSD = toUsd(Number(result.amount), normalizeWalletCurrency(result.sourceCurrency), effectiveRates);
      const notifications = [
        createAndPushMobileNotification(authenticatedIdentity.uid, { title: 'Transferencia enviada', body: `Enviaste ${senderSymbol}${Number(result.amount).toFixed(2)} a ${result.recipientName}. Comisión: ${senderSymbol}${Number(result.feeAmount).toFixed(2)}.`, type: 'transfer', amountUSD: senderAmountUSD, referenceId: transferId }),
      ];
      if (recipientUserDoc) {
        const symbol = currencySymbol(normalizeWalletCurrency(result.destinationCurrency));
        const receivedUSD = toUsd(Number(result.creditedAmount), normalizeWalletCurrency(result.destinationCurrency), effectiveRates);
        notifications.push(createAndPushMobileNotification(recipientUserDoc.id, { title: 'Transferencia recibida', body: `${authenticatedIdentity.name} te envió ${symbol}${Number(result.creditedAmount).toFixed(2)}.`, type: 'transfer', amountUSD: receivedUSD, referenceId: transferId }));
      }
      await Promise.all(notifications);
    }
    return NextResponse.json({ success: true, transfer: result, walletBalance: result.senderBalanceAfter });
  } catch (error) {
    if (error instanceof TransferError) {
      if (identity && error.status === 409) {
        try {
          await createAndPushMobileNotification(identity.uid, { title: 'Transferencia no realizada', body: error.message, type: 'transfer' });
        } catch (notificationError) {
          console.error('[Mobile transfer] insufficient-balance notification failed', notificationError);
        }
      }
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
