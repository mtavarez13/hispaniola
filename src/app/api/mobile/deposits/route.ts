import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';
import { createAndPushMobileNotification } from '@/lib/mobile-notifications';

export const dynamic = 'force-dynamic';

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const jsonDate = (value: any) => typeof value?.toDate === 'function' ? value.toDate().toISOString() : (value || null);

function availableMethods(settings: Record<string, any>) {
  const us = { zelleEmail: 'pagos@hispaniolapay.com', zellePhone: '+1 (305) 579-8822', zelleHolder: 'Hispaniola Pay LLC', payPalEmail: 'pagos@hispaniolapay.com', payPalLink: 'https://paypal.me/hispaniolapay', active: true, ...(settings.usRemittanceAccounts || {}) };
  const defaultBanks = [
    { id: 'bank-br-dop', bankName: 'Banco de Reservas (Banreservas)', accountNumber: '960-2481029-3', accountType: 'corriente', currency: 'DOP', holderName: 'Hispaniola Pay SRL', active: true },
    { id: 'bank-bhd-dop', bankName: 'Banco BHD', accountNumber: '284-918237-1', accountType: 'ahorros', currency: 'DOP', holderName: 'Hispaniola Pay SRL', active: true },
    { id: 'bank-pop-dop', bankName: 'Banco Popular Dominicano', accountNumber: '802-918274-5', accountType: 'corriente', currency: 'DOP', holderName: 'Hispaniola Pay SRL', active: true },
  ];
  const banks = Array.isArray(settings.officialBankAccounts) && settings.officialBankAccounts.length ? settings.officialBankAccounts : defaultBanks;
  const methods = banks.filter((bank: any) => bank?.active !== false && bank?.accountNumber).map((bank: any) => ({
    id: `bank:${String(bank.id || bank.accountNumber)}`,
    type: 'bank',
    label: String(bank.bankName || 'Cuenta bancaria autorizada'),
    currency: bank.currency === 'USD' ? 'USD' : 'DOP',
    recipient: String(bank.holderName || 'Hispaniola Pay SRL'),
    account: String(bank.accountNumber),
    detail: `${bank.accountType === 'corriente' ? 'Cuenta corriente' : 'Cuenta de ahorros'} · ${bank.currency || 'DOP'}`,
    instructions: String(bank.instructions || 'Incluye tu código de cliente en el concepto.'),
    enabled: true,
  }));
  if (us.active !== false) {
    if (us.zelleEmail || us.zellePhone) methods.push({ id: 'zelle', type: 'zelle', label: 'Zelle', currency: 'USD', recipient: String(us.zelleHolder || 'Hispaniola Pay'), account: String(us.zelleEmail || us.zellePhone), detail: us.zellePhone ? `Tel. ${us.zellePhone}` : 'Transferencia Zelle', instructions: 'Incluye tu código de cliente en la nota.', enabled: true });
    if (us.payPalEmail || us.payPalLink) methods.push({ id: 'paypal', type: 'paypal', label: 'PayPal', currency: 'USD', recipient: String(us.payPalEmail || 'Hispaniola Pay'), account: String(us.payPalLink || us.payPalEmail), detail: 'Saldo o tarjeta PayPal', instructions: 'Conserva el ID de la transacción.', enabled: true });
    methods.push({ id: 'binance', type: 'binance', label: 'Binance', currency: 'USD', recipient: String(us.binanceHolder || 'Hispaniola Pay'), account: String(us.binancePayId || ''), detail: String(us.binanceNetwork || 'Binance Pay (USDT)'), instructions: us.binancePayId ? 'Envía únicamente mediante Binance Pay y conserva el Order ID.' : 'La administración debe configurar el Binance Pay ID antes de recibir depósitos.', enabled: Boolean(us.binancePayId) });
  }
  return methods;
}

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuthenticatedUser(req);
    const [settingsSnapshot, depositsSnapshot] = await Promise.all([
      adminDb.collection('settings').doc('rates').get(),
      adminDb.collection('wallet_deposits').where('userId', '==', identity.uid).limit(40).get(),
    ]);
    const deposits = depositsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, methodId: data.methodId, methodLabel: data.methodLabel, amount: Number(data.amount || 0), currency: data.currency || 'USD', amountCreditedUSD: Number(data.amountCreditedUSD || 0), feePercent: 0, feeUSD: 0, reference: data.reference || '', status: data.status || 'pending', rejectionReason: data.rejectionReason || '', createdAt: jsonDate(data.createdAt) || data.createdAtIso, reviewedAt: jsonDate(data.reviewedAt) };
    }).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const settings = settingsSnapshot.data() || {};
    return NextResponse.json({ success: true, feePercent: 0, methods: availableMethods(settings), deposits, dopPerUsd: Number(settings.publicRateDOP || 58.5) });
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await requireAuthenticatedUser(req);
    const body = await req.json();
    const methodId = String(body.methodId || '').trim().slice(0, 120);
    const reference = String(body.reference || '').trim().slice(0, 120);
    const amount = roundMoney(Number(body.amount));
    const settingsSnapshot = await adminDb.collection('settings').doc('rates').get();
    const settings = settingsSnapshot.data() || {};
    const method = availableMethods(settings).find((item) => item.id === methodId);
    if (!method || !method.enabled) return NextResponse.json({ success: false, error: 'Este método de depósito no está configurado o activo' }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return NextResponse.json({ success: false, error: 'Monto de depósito inválido' }, { status: 400 });
    if (reference.length < 4) return NextResponse.json({ success: false, error: 'Escribe el número de referencia o comprobante' }, { status: 400 });
    const currency = method.currency;
    const dopPerUsd = Number(settings.publicRateDOP || 58.5);
    const amountCreditedUSD = roundMoney(currency === 'DOP' ? amount / dopPerUsd : amount);
    const fingerprint = createHash('sha256').update(`${identity.uid}|${methodId}|${reference.toLowerCase()}`).digest('hex').slice(0, 20).toUpperCase();
    const id = `DEP-${fingerprint}`;
    const depositRef = adminDb.collection('wallet_deposits').doc(id);
    const record = {
      userId: identity.uid, clientCode: String(identity.profile.clientCode || ''), clientName: identity.name, clientEmail: identity.email,
      methodId, methodType: method.type, methodLabel: method.label, destinationAccount: method.account,
      amount, currency, amountCreditedUSD, feePercent: 0, feeUSD: 0, reference, status: 'pending',
      createdAt: FieldValue.serverTimestamp(), createdAtIso: new Date().toISOString(),
    };
    const creation = await adminDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(depositRef);
      if (existing.exists) return { created: false, status: String(existing.data()?.status || 'pending') };
      transaction.set(depositRef, record);
      return { created: true, status: 'pending' };
    });
    if (!creation.created) return NextResponse.json({ success: true, duplicate: true, deposit: { id, methodLabel: method.label, amount, currency, amountCreditedUSD, feePercent: 0, status: creation.status, reference } });
    await createAndPushMobileNotification(identity.uid, { title: 'Depósito recibido para validación', body: `${method.label}: ${amount.toFixed(2)} ${currency}. Comisión 0%. Te avisaremos cuando el saldo esté acreditado.`, type: 'deposit', amountUSD: amountCreditedUSD, referenceId: id });
    return NextResponse.json({ success: true, deposit: { id, methodLabel: method.label, amount, currency, amountCreditedUSD, feePercent: 0, status: 'pending', reference } });
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
