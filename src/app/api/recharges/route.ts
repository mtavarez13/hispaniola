import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';
import { convertCurrency, currencySymbol, getEffectiveRates, normalizeWalletCurrency } from '@/lib/currency';
import { createAndPushMobileNotification } from '@/lib/mobile-notifications';
import { getRecargasConfig, RecargasProviderError, recargasRequest } from '@/lib/recargas-dominicanas';
import { rechargeProfitability } from '@/lib/recharge-profitability';

export const dynamic = 'force-dynamic';

const money = (value: unknown) => Math.round(Number(value) * 100) / 100;
const normalizeProductText = (value: unknown) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const invoiceProviderDirectory = [
  { key: 'edenorte', name: 'Edenorte', image: 'edenorte.png', aliases: ['edenorte'] },
  { key: 'corasan', name: 'Corasan', image: 'coraasan.jpg', aliases: ['corasan', 'coraasan'] },
  { key: 'claro', name: 'Claro', image: 'claro.svg', aliases: ['claro'] },
  { key: 'altice', name: 'Altice', image: 'altice.svg', aliases: ['altice'] },
  { key: 'viva', name: 'Viva', image: 'viva.svg', aliases: ['viva'] },
  { key: 'edeeste', name: 'Edeeste', image: 'edeeste.png', aliases: ['edeeste'] },
  { key: 'edesur', name: 'Edesur', image: 'edesur.png', aliases: ['edesur'] },
  { key: 'wind', name: 'Wind', image: 'wind.png', aliases: ['wind'] },
  { key: 'caasd', name: 'Caasd', image: 'caasd.png', aliases: ['caasd'] },
  { key: 'cepm', name: 'Cepm', image: 'cepm.png', aliases: ['cepm'] },
  { key: 'ceb', name: 'Ceb', image: 'ceb.png', aliases: ['ceb'] },
  { key: 'adn', name: 'ADN', image: 'adn.png', aliases: ['adn'] },
  { key: 'coraplata', name: 'Coraplata', image: 'coraaplata.png', aliases: ['coraplata', 'coraaplata'] },
  { key: 'coraavega', name: 'Coraavega', image: '', aliases: ['coraavega', 'cora vega'] },
  { key: 'coaarom', name: 'Coaarom', image: 'coaarom.png', aliases: ['coaarom'] },
  { key: 'dgii', name: 'DGII', image: 'dgii.png', aliases: ['dgii'] },
  { key: 'pgr-multas', name: 'PGR Multas', image: '', aliases: ['pgr multas', 'pgr', 'procuraduria'] },
  { key: 'tss', name: 'TSS', image: '', aliases: ['tss', 'tesoreria de la seguridad social'] },
  { key: 'midas-seguros', name: 'MIDAS Seguros', image: 'midas.png', aliases: ['midas seguros', 'midas'] },
];
const officialProviderAssets: Array<{ aliases: string[]; image: string }> = [
  { aliases: ['claro'], image: 'claro.svg' }, { aliases: ['altice'], image: 'altice.svg' },
  { aliases: ['viva'], image: 'viva.svg' }, { aliases: ['digicel'], image: 'digicel.svg' },
  { aliases: ['natcom'], image: 'natcom.svg' }, { aliases: ['moun'], image: 'moun.svg' },
  { aliases: ['wind'], image: 'wind.png' }, { aliases: ['paso rapido'], image: 'paso-rapido.png' },
  { aliases: ['edenorte'], image: 'edenorte.png' }, { aliases: ['coraasan', 'corasan'], image: 'coraasan.jpg' },
  { aliases: ['edeeste'], image: 'edeeste.png' }, { aliases: ['edesur'], image: 'edesur.png' },
  { aliases: ['caasd'], image: 'caasd.png' }, { aliases: ['cepm'], image: 'cepm.png' },
  { aliases: ['ceb'], image: 'ceb.png' }, { aliases: ['activa'], image: 'activa.png' },
  { aliases: ['adn'], image: 'adn.png' }, { aliases: ['coraaplata', 'coraplata'], image: 'coraaplata.png' },
  { aliases: ['coaarom'], image: 'coaarom.png' }, { aliases: ['dgii'], image: 'dgii.png' },
  { aliases: ['midas seguros', 'midas'], image: 'midas.png' },
  { aliases: ['star sport'], image: 'star-sport.png' }, { aliases: ['juancito sport'], image: 'juancito-sport.png' },
];
const invoiceProviderKey = (product: any) => {
  const haystack = `${normalizeProductText(product?.name)} ${normalizeProductText(product?.key)}`;
  return invoiceProviderDirectory.find((provider) => provider.aliases.some((alias) => haystack === alias || haystack.includes(alias)))?.key || '';
};
const isInvoiceProduct = (product: any) => {
  const category = normalizeProductText(product?.category);
  const type = normalizeProductText(product?.type);
  if (category === 'invoice' || type === 'factura') return true;
  if (category === 'mobile-topup' || category === 'data-plan' || type === 'recarga' || type === 'paquetico') return false;
  return Boolean(invoiceProviderKey(product));
};
const normalizeCatalogProduct = (product: any) => {
  const normalizedName = normalizeProductText(product?.name || product?.key);
  const officialAsset = officialProviderAssets.find((entry) => entry.aliases.some((alias) => normalizedName === alias || normalizedName.includes(alias)))?.image;
  const suppliedImage = String(product?.image || '').trim();
  const cleanSuppliedImage = suppliedImage.replace(/[?#].*$/, '').replace(/^.*\//, '');
  const resolvedImage = officialAsset
    ? `https://www.recargasdominicanas.do/images/${officialAsset}`
    : /^https:\/\//i.test(suppliedImage)
      ? suppliedImage
      : cleanSuppliedImage
        ? `https://www.recargasdominicanas.do/images/${cleanSuppliedImage}`
        : '';
  if (!isInvoiceProduct(product)) return { ...product, image: resolvedImage };
  const directory = invoiceProviderDirectory.find((provider) => provider.key === invoiceProviderKey(product));
  return { ...product, name: directory?.name || product.name, image: resolvedImage, category: 'invoice', type: 'Factura' };
};
const completeCatalog = (products: any[]) => {
  return products.map(normalizeCatalogProduct).sort((a, b) => Number(a.position ?? 9999) - Number(b.position ?? 9999));
};

class RechargeError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function GET(req: NextRequest) {
  try {
    await requireAuthenticatedUser(req);
    const action = req.nextUrl.searchParams.get('action') || 'products';
    if (action === 'products') {
      const config = await getRecargasConfig();
      try {
        const products = await recargasRequest<any[]>('/business/products');
        const allProducts = Array.isArray(products) ? products : [];
        const available = completeCatalog(allProducts.filter((item) => item?.enabled !== false));
        const administrativeCatalog = completeCatalog(allProducts);
        await adminDb.collection('provider_catalogs').doc('recargas_dominicanas').set({
          products: administrativeCatalog,
          productCount: administrativeCatalog.length,
          activeProductCount: available.filter((item) => item.enabled !== false).length,
          syncedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return NextResponse.json({ success: true, feePercent: config.feePercent, products: available, source: 'live' });
      } catch (providerError) {
        const cached = await adminDb.collection('provider_catalogs').doc('recargas_dominicanas').get();
        const products = cached.data()?.products;
        if (Array.isArray(products) && products.length > 0) {
          return NextResponse.json({ success: true, feePercent: config.feePercent, products: completeCatalog(products.filter((item: any) => item?.directoryOnly !== true && item?.enabled !== false)), source: 'cache', warning: providerError instanceof Error ? providerError.message : 'Proveedor temporalmente no disponible' });
        }
        throw providerError;
      }
    }
    if (action === 'invoice') {
      const productId = Number(req.nextUrl.searchParams.get('productId'));
      const nic = String(req.nextUrl.searchParams.get('nic') || '').trim();
      if (!Number.isInteger(productId) || productId <= 0 || !nic) throw new RechargeError(400, 'Selecciona el servicio e indica el contrato o NIC.');
      const invoice = await recargasRequest(`/transactions/invoice/${productId}/${encodeURIComponent(nic)}`);
      return NextResponse.json({ success: true, invoice });
    }
    if (action === 'data_plans') {
      const productId = Number(req.nextUrl.searchParams.get('productId'));
      const phone = String(req.nextUrl.searchParams.get('phone') || '').replace(/\D/g, '');
      if (!Number.isInteger(productId) || productId <= 0 || phone.length < 10) throw new RechargeError(400, 'Selecciona la compañía e indica un teléfono válido.');
      const plans = await recargasRequest<any[]>(`/transactions/data-plans/${productId}/${encodeURIComponent(phone)}`);
      return NextResponse.json({ success: true, plans: Array.isArray(plans) ? plans : [] });
    }
    if (action === 'history') {
      const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || 1));
      const size = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('size') || 25)));
      const history = await recargasRequest(`/business-user/transactions?page=${page}&size=${size}`);
      return NextResponse.json({ success: true, history });
    }
    throw new RechargeError(400, 'Consulta no válida.');
  } catch (error) {
    if (error instanceof RechargeError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    if (error instanceof RecargasProviderError) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status >= 400 && error.status < 600 ? error.status : 502 });
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function POST(req: NextRequest) {
  let uid = '';
  let transactionRef: FirebaseFirestore.DocumentReference | null = null;
  let movementRef: FirebaseFirestore.DocumentReference | null = null;
  let reservedDebit = 0;
  let reservedAdminDebit = 0;
  let balanceBefore = 0;
  try {
    const identity = await requireAuthenticatedUser(req);
    uid = identity.uid;
    const body = await req.json();
    const action = String(body.action || 'mobile_topup');
    if (!['mobile_topup', 'data_plan', 'pin_purchase', 'invoice_payment'].includes(action)) throw new RechargeError(400, 'Tipo de operación no válido.');
    const productId = Number(body.productId);
    const idempotencyKey = String(body.idempotencyKey || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
    if (!Number.isInteger(productId) || productId <= 0 || !idempotencyKey) throw new RechargeError(400, 'Faltan el producto o la referencia única de la operación.');

    const products = await recargasRequest<any[]>('/business/products');
    const product = (Array.isArray(products) ? products : []).find((item) => Number(item.id) === productId && item.enabled !== false);
    if (!product) throw new RechargeError(404, 'El producto seleccionado ya no está disponible.');
    const productCategory = String(product.category || '').toLowerCase();
    const productType = String(product.type || '').toLowerCase();
    if (action === 'data_plan' && productCategory !== 'data-plan' && productType !== 'paquetico') throw new RechargeError(400, 'El producto seleccionado no corresponde a un paquetico.');
    if (action === 'pin_purchase' && productCategory !== 'pin' && productType !== 'pin') throw new RechargeError(400, 'El producto seleccionado no corresponde a un PIN.');
    if (action === 'invoice_payment' && !isInvoiceProduct(product)) throw new RechargeError(400, 'El producto seleccionado no corresponde a una factura.');
    if (action === 'mobile_topup' && productCategory !== 'mobile-topup' && productType !== 'recarga') throw new RechargeError(400, 'El producto seleccionado no corresponde a una recarga móvil.');

    let amountDOP = money(body.amount);
    let target = '';
    let providerPath = '';
    let providerBody: Record<string, unknown>;
    if (action === 'invoice_payment') {
      const nic = String(body.nic || '').trim();
      if (!nic) throw new RechargeError(400, 'Indica el contrato o NIC de la factura.');
      const invoice = await recargasRequest<any>(`/transactions/invoice/${productId}/${encodeURIComponent(nic)}`);
      amountDOP = money(invoice?.amount);
      if (amountDOP <= 0) throw new RechargeError(400, 'El proveedor no devolvió un monto pendiente válido.');
      target = nic;
      providerPath = '/transactions/pay-invoice';
      providerBody = { productId, nic, amount: amountDOP };
    } else if (action === 'data_plan') {
      const phone = String(body.phone || '').replace(/\D/g, '');
      const planId = String(body.planId || '').trim();
      if (phone.length < 10 || !planId) throw new RechargeError(400, 'Indica un teléfono y selecciona un paquetico.');
      const plans = await recargasRequest<any[]>(`/transactions/data-plans/${productId}/${encodeURIComponent(phone)}`);
      const plan = (Array.isArray(plans) ? plans : []).find((item) => String(item?.id) === planId);
      if (!plan) throw new RechargeError(404, 'El paquetico seleccionado ya no está disponible para este número.');
      amountDOP = money(plan.price);
      if (amountDOP <= 0) throw new RechargeError(400, 'El proveedor no devolvió un precio válido para el paquetico.');
      target = phone;
      providerPath = '/transactions/send-data-plan';
      providerBody = { productId, phone, planId };
    } else if (action === 'pin_purchase') {
      amountDOP = money(body.price);
      const minimum = Number(product.min || 0);
      const maximum = Number(product.max || Number.MAX_SAFE_INTEGER);
      if (amountDOP <= 0 || amountDOP < minimum || amountDOP > maximum) throw new RechargeError(400, `El precio permitido es de RD$${minimum.toFixed(2)} a RD$${maximum.toFixed(2)}.`);
      target = `PIN ${String(product.name || '')}`.trim();
      providerPath = '/transactions/send-pin';
      providerBody = { productId, price: amountDOP };
    } else {
      const phone = String(body.phone || '').replace(/\D/g, '');
      if (phone.length < 10 || amountDOP <= 0) throw new RechargeError(400, 'Indica un teléfono y un monto válidos.');
      const minimum = Number(product.min || 0);
      const maximum = Number(product.max || Number.MAX_SAFE_INTEGER);
      if (amountDOP < minimum || amountDOP > maximum) throw new RechargeError(400, `El monto permitido es de RD$${minimum.toFixed(2)} a RD$${maximum.toFixed(2)}.`);
      target = phone;
      providerPath = '/business-user/send-transaction';
      providerBody = { productId, phone, amount: amountDOP };
    }

    const [config, ratesDoc] = await Promise.all([
      getRecargasConfig(),
      adminDb.collection('settings').doc('rates').get(),
    ]);
    const rates = await getEffectiveRates(ratesDoc.data() || {});
    const feeDOP = money(amountDOP * config.feePercent / 100);
    const totalDOP = money(amountDOP + feeDOP);
    const userRef = adminDb.collection('users').doc(identity.uid);
    const operationsRef = adminDb.collection('settings').doc('operations');
    transactionRef = adminDb.collection('recharge_transactions').doc(`${identity.uid}_${idempotencyKey}`);
    movementRef = userRef.collection('wallet_movements').doc(transactionRef.id);

    const reservation = await adminDb.runTransaction(async (transaction) => {
      const [existing, profileSnapshot, operationsSnapshot] = await Promise.all([transaction.get(transactionRef!), transaction.get(userRef), transaction.get(operationsRef)]);
      if (existing.exists) return { duplicate: true, data: existing.data() || {} };
      if (!profileSnapshot.exists) throw new RechargeError(404, 'No se encontró la billetera del usuario.');
      const profile = profileSnapshot.data() || {};
      const currency = normalizeWalletCurrency(profile.primaryCurrency);
      const walletDebit = money(convertCurrency(totalDOP, 'DOP', currency, rates));
      const currentBalance = money(profile.walletBalance || 0);
      if (currentBalance < walletDebit) {
        throw new RechargeError(409, `Saldo insuficiente. Necesitas ${currencySymbol(currency)}${walletDebit.toFixed(2)} y tienes ${currencySymbol(currency)}${currentBalance.toFixed(2)}.`);
      }
      const adminServiceBalanceDOP = money(operationsSnapshot.data()?.rechargeServicesBalanceDOP || 0);
      if (adminServiceBalanceDOP < amountDOP) {
        throw new RechargeError(409, 'El fondo administrativo de Recargas Dominicanas no tiene balance suficiente. Contacta a soporte.');
      }
      const adminServiceBalanceAfterDOP = money(adminServiceBalanceDOP - amountDOP);
      const newBalance = money(currentBalance - walletDebit);
      const actionTitle = action === 'invoice_payment' ? 'Pago de factura' : action === 'data_plan' ? 'Paquetico de internet' : action === 'pin_purchase' ? 'Compra de PIN' : 'Recarga móvil';
      const data = {
        uid: identity.uid,
        userName: identity.name,
        userEmail: identity.email,
        userRole: identity.role,
        action,
        productId,
        productName: String(product.name || product.key || 'Servicio'),
        productType: String(product.type || ''),
        target,
        amountDOP,
        feePercent: config.feePercent,
        feeDOP,
        totalDOP,
        walletCurrency: currency,
        walletDebit,
        adminServiceDebitDOP: amountDOP,
        adminServiceBalanceBeforeDOP: adminServiceBalanceDOP,
        adminServiceBalanceAfterDOP,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        status: 'processing',
        idempotencyKey,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: new Date().toISOString(),
      };
      transaction.update(userRef, { walletBalance: newBalance, walletUpdatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      transaction.set(operationsRef, { rechargeServicesBalanceDOP: adminServiceBalanceAfterDOP, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.create(transactionRef!, data);
      transaction.create(movementRef!, {
        type: action,
        title: actionTitle,
        description: `${String(product.name || 'Servicio')} · ${target}`,
        direction: 'out',
        amount: walletDebit,
        currency,
        amountDOP,
        feeDOP,
        totalDOP,
        newBalance,
        status: 'processing',
        referenceId: transactionRef!.id,
        receiptCode: transactionRef!.id,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: new Date().toISOString(),
      });
      return { duplicate: false, data };
    });

    if (reservation.duplicate) {
      return NextResponse.json({ success: reservation.data.status === 'completed', duplicate: true, transaction: reservation.data }, { status: reservation.data.status === 'completed' ? 200 : 409 });
    }
    reservedDebit = Number(reservation.data.walletDebit);
    reservedAdminDebit = Number(reservation.data.adminServiceDebitDOP || 0);
    balanceBefore = Number(reservation.data.balanceBefore);

    let providerTransaction: any;
    try {
      providerTransaction = await recargasRequest(providerPath, { method: 'POST', body: JSON.stringify(providerBody) });
    } catch (error) {
      if (!(error instanceof RecargasProviderError)) throw error;
      if (error.definiteFailure) {
        await adminDb.runTransaction(async (transaction) => {
          const [currentTransaction, userSnapshot, operationsSnapshot] = await Promise.all([transaction.get(transactionRef!), transaction.get(userRef), transaction.get(operationsRef)]);
          if (!currentTransaction.exists || currentTransaction.data()?.status !== 'processing' || !userSnapshot.exists) return;
          const currentWallet = money(userSnapshot.data()?.walletBalance || 0);
          const refundedBalance = money(currentWallet + reservedDebit);
          const currentAdminServiceBalance = money(operationsSnapshot.data()?.rechargeServicesBalanceDOP || 0);
          transaction.update(userRef, { walletBalance: refundedBalance, walletUpdatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
          transaction.set(operationsRef, { rechargeServicesBalanceDOP: money(currentAdminServiceBalance + reservedAdminDebit), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          transaction.update(transactionRef!, { status: 'failed', error: error.message, providerCode: error.code, refunded: true, completedAt: FieldValue.serverTimestamp() });
          transaction.update(movementRef!, { status: 'failed', newBalance: refundedBalance, error: error.message, refunded: true });
        });
      } else {
        await Promise.all([
          transactionRef.update({ status: 'review_required', error: error.message, providerCode: error.code, updatedAt: FieldValue.serverTimestamp() }),
          movementRef.update({ status: 'review_required', error: error.message }),
        ]);
      }
      throw error;
    }

    const providerId = String(providerTransaction?.id || providerTransaction?.reference || transactionRef.id);
    const issuedPin = String(providerTransaction?.pin || '');
    const profit = await rechargeProfitability(product, amountDOP, identity.role === 'agent');
    const reportedProviderProfit = Number(providerTransaction?.profit);
    const providerCommissionDOP = Number.isFinite(reportedProviderProfit) && reportedProviderProfit >= 0
      ? money(reportedProviderProfit)
      : profit.providerCommissionDOP;
    const platformMarginDOP = money(providerCommissionDOP + feeDOP - profit.agentBenefitDOP);
    const ledgerRef = adminDb.collection('accounting_ledger').doc();
    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(transactionRef!);
      if (!current.exists || current.data()?.status !== 'processing') return;
      transaction.update(transactionRef!, { status: 'completed', providerId, issuedPin, providerTransaction, profitKey: profit.key, providerCommissionRule: profit.providerRule, providerCommissionDOP, agentBenefitRule: profit.agentRule, agentBenefitDOP: profit.agentBenefitDOP, platformMarginDOP, completedAt: FieldValue.serverTimestamp() });
      transaction.update(movementRef!, { status: 'completed', providerId, issuedPin, providerCommissionDOP, agentBenefitDOP: profit.agentBenefitDOP });
      if (profit.agentBenefitDOP > 0) transaction.update(userRef, { benefitAccruedDOP: FieldValue.increment(profit.agentBenefitDOP), updatedAt: FieldValue.serverTimestamp() });
      transaction.create(ledgerRef, {
        type: action,
        direction: 'neutral',
        amountDOP,
        feeDOP,
        totalDOP,
        profitKey: profit.key,
        providerCommissionRule: profit.providerRule,
        providerCommissionDOP,
        agentBenefitRule: profit.agentRule,
        agentBenefitDOP: profit.agentBenefitDOP,
        platformMarginDOP,
        targetUid: identity.uid,
        targetName: identity.name,
        description: `${String(product.name || 'Servicio')} · ${target}`,
        provider: 'recargas_dominicanas',
        providerId,
        performedBy: identity.email,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    await Promise.all([
      createAndPushMobileNotification(identity.uid, {
        title: action === 'invoice_payment' ? 'Factura pagada' : action === 'data_plan' ? 'Paquetico activado' : action === 'pin_purchase' ? 'PIN comprado' : 'Recarga completada',
        body: `${String(product.name || 'Servicio')} por RD$${amountDOP.toFixed(2)} procesado correctamente.`,
        type: 'general',
        referenceId: transactionRef.id,
      }),
    ]);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transactionRef.id,
        providerId,
        status: 'completed',
        action,
        title: action === 'invoice_payment' ? 'Pago de factura' : action === 'data_plan' ? 'Paquetico de internet' : action === 'pin_purchase' ? 'Compra de PIN' : 'Recarga móvil',
        description: `${String(product.name || 'Servicio')} · ${target}`,
        productName: String(product.name || 'Servicio'),
        target,
        amountDOP,
        feeDOP,
        totalDOP,
        amount: amountDOP,
        currency: 'DOP',
        feeAmount: feeDOP,
        recipientPhone: target,
        receiptCode: providerId,
        pin: issuedPin,
        providerCommissionDOP,
        agentBenefitDOP: profit.agentBenefitDOP,
        platformMarginDOP,
        createdAt: new Date().toISOString(),
        walletDebit: reservedDebit,
        walletCurrency: reservation.data.walletCurrency,
        walletBalance: reservation.data.balanceAfter,
      },
    });
  } catch (error) {
    if (error instanceof RechargeError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    if (error instanceof RecargasProviderError) {
      const status = error.definiteFailure ? (error.status >= 400 && error.status < 600 ? error.status : 502) : 202;
      return NextResponse.json({ success: false, error: error.message, code: error.code, reviewRequired: !error.definiteFailure, fundsReserved: !error.definiteFailure }, { status });
    }
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

