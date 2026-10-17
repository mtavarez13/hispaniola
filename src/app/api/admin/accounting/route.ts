import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';
import { fromUsd, getEffectiveRates, normalizeWalletCurrency, toUsd } from '@/lib/currency';
import { CommissionKind, PROVIDER_COMMISSION_DEFAULTS, rechargeProfitKey } from '@/lib/recharge-profitability';
import { proxyAdministrativeRequestToFirebase } from '@/lib/firebase-backend-proxy';

export const dynamic = 'force-dynamic';
const money = (value: unknown) => Math.round(Number(value) * 100) / 100;
const isoDate = (value: any) => value?.toDate?.()?.toISOString?.() || value || null;

export async function GET(req: NextRequest) {
  const proxied = await proxyAdministrativeRequestToFirebase(req);
  if (proxied) return proxied;

  try {
    await requireAdmin(req, { requireSettings: true });
    const [operationsDoc, ratesDoc, usersSnap, subAgentsSnap, ledgerSnap, catalogDoc, profitabilityDoc, rechargeTransactions] = await Promise.all([
      adminDb.collection('settings').doc('operations').get(),
      adminDb.collection('settings').doc('rates').get(),
      adminDb.collection('users').limit(500).get(),
      adminDb.collection('sub_agents').limit(500).get(),
      adminDb.collection('accounting_ledger').orderBy('createdAt', 'desc').limit(100).get(),
      adminDb.collection('provider_catalogs').doc('recargas_dominicanas').get(),
      adminDb.collection('settings').doc('recharge_profitability').get(),
      adminDb.collection('recharge_transactions').where('status', '==', 'completed').limit(1000).get(),
    ]);
    const operations = operationsDoc.data() || {};
    const ratesData = ratesDoc.data() || {};
    const rates = await getEffectiveRates(ratesData);
    const toDop = (amount: unknown, currency: unknown) => money(fromUsd(toUsd(Number(amount || 0), normalizeWalletCurrency(currency), rates), 'DOP', rates));
    const users = usersSnap.docs.map((doc) => {
      const data = doc.data();
      const currency = normalizeWalletCurrency(data.primaryCurrency);
      return { uid: doc.id, name: String(data.name || 'Usuario'), email: String(data.email || ''), role: String(data.role || 'customer'), clientCode: String(data.clientCode || ''), primaryCurrency: currency, walletBalance: money(data.walletBalance || 0), savingsBalance: money(data.savingsBalance || 0), balanceDOP: toDop(Number(data.walletBalance || 0) + Number(data.savingsBalance || 0), currency), agentAccountMode: data.agentAccountMode === 'postpaid' ? 'postpaid' : 'prepaid' };
    });
    const subAgents = subAgentsSnap.docs.map((doc) => {
      const data = doc.data();
      const currency = normalizeWalletCurrency(data.primaryCurrency || data.localCurrency);
      return { id: doc.id, name: String(data.name || 'Subagente'), owner: String(data.owner || ''), email: String(data.email || ''), primaryCurrency: currency, walletBalance: money(data.walletBalance || 0), balanceDOP: toDop(data.walletBalance, currency), accountMode: data.accountMode === 'postpaid' ? 'postpaid' : 'prepaid', postpaidUsedDOP: money(data.postpaidUsedDOP || 0), creditLimit: money(data.creditLimit || 0) };
    });
    const agentBenefits = (profitabilityDoc.data()?.agentBenefits || {}) as Record<string, { kind?: CommissionKind; value?: number }>;
    const uniqueProfitProducts = new Map<string, any>();
    for (const product of (Array.isArray(catalogDoc.data()?.products) ? catalogDoc.data()!.products : [])) {
      if (product?.directoryOnly === true) continue;
      const key = rechargeProfitKey(product);
      if (!PROVIDER_COMMISSION_DEFAULTS[key]) continue;
      uniqueProfitProducts.set(key, {
        key, productId: Number(product.id || 0), name: String(product.name || 'Servicio'), type: String(product.type || ''), image: String(product.image || ''), enabled: product.enabled !== false,
        providerRule: PROVIDER_COMMISSION_DEFAULTS[key],
        agentRule: { kind: agentBenefits[key]?.kind === 'percent' ? 'percent' : 'fixed', value: money(agentBenefits[key]?.value || 0) },
      });
    }
    for (const [key, providerRule] of Object.entries(PROVIDER_COMMISSION_DEFAULTS)) {
      if (uniqueProfitProducts.has(key)) continue;
      const [type, provider] = key.split('__');
      const name = ({ 'paso-rapido': 'Paso Rápido', coraasan: 'Coraasan', coraaplata: 'Coraaplata', coraavega: 'Coraavega', coaarom: 'Coaarom', 'pgr-multas': 'PGR Multas', 'midas-seguros': 'Midas Seguros', 'star-sport': 'Star Sport', 'juancito-sport': 'Juancito Sport' } as Record<string, string>)[provider] || provider.toUpperCase();
      uniqueProfitProducts.set(key, { key, productId: 0, name, type: type === 'paquetico' ? 'Paquetico' : type === 'pin' ? 'Pin' : type === 'factura' ? 'Factura' : type === 'seguro' ? 'Seguro' : 'Recarga', image: '', enabled: false, providerRule, agentRule: { kind: agentBenefits[key]?.kind === 'percent' ? 'percent' : 'fixed', value: money(agentBenefits[key]?.value || 0) } });
    }
    const profitTotals = rechargeTransactions.docs.reduce((totals, doc) => {
      const item = doc.data();
      totals.salesDOP += money(item.amountDOP || 0);
      totals.providerCommissionDOP += money(item.providerCommissionDOP || 0);
      totals.agentBenefitDOP += money(item.agentBenefitDOP || 0);
      totals.platformMarginDOP += money(item.platformMarginDOP || 0);
      totals.transactions += 1;
      return totals;
    }, { salesDOP: 0, providerCommissionDOP: 0, agentBenefitDOP: 0, platformMarginDOP: 0, transactions: 0 });
    return NextResponse.json({
      success: true,
      principalBalanceDOP: money(operations.principalBalanceDOP ?? operations.currentOperatingBalanceDOP ?? 0),
      remittanceBalanceDOP: money(operations.principalBalanceDOP ?? operations.currentOperatingBalanceDOP ?? 0),
      rechargeServicesBalanceDOP: money(operations.rechargeServicesBalanceDOP || 0),
      providerControl: {
        policy: 'consumption_only',
        userFundingAffectsProviderBalance: false,
        remittancesAvailableDOP: money(operations.principalBalanceDOP ?? operations.currentOperatingBalanceDOP ?? 0),
        rechargesAvailableDOP: money(operations.rechargeServicesBalanceDOP || 0),
      },
      totalUsersDOP: money(users.reduce((sum, item) => sum + item.balanceDOP, 0)),
      totalSubAgentsDOP: money(subAgents.reduce((sum, item) => sum + item.balanceDOP, 0)),
      rates: { dopPerUsd: rates.usdToDop, htgPerUsd: rates.usdToHtg, htgPerDop: rates.dopToHtg },
      users,
      subAgents,
      ledger: ledgerSnap.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: isoDate(doc.data().createdAt) })),
      rechargeProfitability: { products: Array.from(uniqueProfitProducts.values()).sort((a, b) => `${a.type} ${a.name}`.localeCompare(`${b.type} ${b.name}`)), totals: profitTotals },
    });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function POST(req: NextRequest) {
  const proxied = await proxyAdministrativeRequestToFirebase(req);
  if (proxied) return proxied;

  try {
    const admin = await requireAdmin(req, { requireSettings: true });
    const body = await req.json();
    const action = String(body.action || '');
    if (action === 'update_agent_benefits') {
      const rows = Array.isArray(body.benefits) ? body.benefits.slice(0, 200) : [];
      const agentBenefits: Record<string, { kind: CommissionKind; value: number }> = {};
      for (const row of rows) {
        const key = String(row?.key || '').replace(/[^a-z0-9_-]/g, '').slice(0, 120);
        const kind: CommissionKind = row?.kind === 'percent' ? 'percent' : 'fixed';
        const value = money(row?.value || 0);
        if (!key || !PROVIDER_COMMISSION_DEFAULTS[key]) continue;
        if (!Number.isFinite(value) || value < 0 || (kind === 'percent' && value > 100) || (kind === 'fixed' && value > 1_000_000)) return NextResponse.json({ success: false, error: `Beneficio inválido para ${key}` }, { status: 400 });
        agentBenefits[key] = { kind, value };
      }
      await adminDb.collection('settings').doc('recharge_profitability').set({ agentBenefits, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email }, { merge: true });
      await adminDb.collection('accounting_ledger').add({ type: 'agent_service_benefits_update', direction: 'neutral', amountDOP: 0, description: `Beneficios de agentes actualizados para ${Object.keys(agentBenefits).length} servicios`, performedBy: admin.email, createdAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, count: Object.keys(agentBenefits).length });
    }
    if (action === 'update_rates') {
      const dopPerUsd = money(body.dopPerUsd);
      const htgPerUsd = money(body.htgPerUsd);
      const htgPerDop = Math.round(Number(body.htgPerDop) * 1000) / 1000;
      if (dopPerUsd <= 0 || htgPerUsd <= 0 || htgPerDop <= 0) return NextResponse.json({ success: false, error: 'Las tasas deben ser mayores que cero' }, { status: 400 });
      await adminDb.collection('settings').doc('rates').set({ publicRateDOP: dopPerUsd, publicRateHTG: htgPerUsd, publicRateDOPToHTG: htgPerDop, updatedAt: new Date().toISOString(), updatedBy: admin.email }, { merge: true });
      await adminDb.collection('accounting_ledger').add({ type: 'rate_update', direction: 'neutral', amountDOP: 0, description: `Tasas: USD/DOP ${dopPerUsd}, USD/HTG ${htgPerUsd}, DOP/HTG ${htgPerDop}`, performedBy: admin.email, createdAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true });
    }

    const amountDOP = money(body.amountDOP);
    const operationsRef = adminDb.collection('settings').doc('operations');
    const ledgerRef = adminDb.collection('accounting_ledger').doc();
    if (action === 'set_provider_balance') {
      const serviceType = body.serviceType === 'recharges' ? 'recharges' : 'remittances';
      const exactBalanceDOP = money(body.balanceDOP);
      if (!Number.isFinite(exactBalanceDOP) || exactBalanceDOP < 0 || exactBalanceDOP > 1_000_000_000) {
        return NextResponse.json({ success: false, error: 'Balance de proveedor inválido' }, { status: 400 });
      }
      await adminDb.runTransaction(async (transaction) => {
        const operations = (await transaction.get(operationsRef)).data() || {};
        const previousBalance = serviceType === 'recharges'
          ? money(operations.rechargeServicesBalanceDOP || 0)
          : money(operations.principalBalanceDOP ?? operations.currentOperatingBalanceDOP ?? 0);
        const balanceUpdate = serviceType === 'recharges'
          ? { rechargeServicesBalanceDOP: exactBalanceDOP }
          : { principalBalanceDOP: exactBalanceDOP, currentOperatingBalanceDOP: exactBalanceDOP };
        transaction.set(operationsRef, { ...balanceUpdate, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email }, { merge: true });
        transaction.set(ledgerRef, {
          type: 'provider_balance_adjustment', serviceType,
          direction: exactBalanceDOP > previousBalance ? 'in' : exactBalanceDOP < previousBalance ? 'out' : 'neutral',
          amountDOP: money(Math.abs(exactBalanceDOP - previousBalance)), previousBalanceDOP: previousBalance,
          newBalanceDOP: exactBalanceDOP,
          description: String(body.notes || `Ajuste manual del fondo ${serviceType === 'recharges' ? 'Recargas Dominicanas' : 'Remesas'}`).slice(0, 300),
          performedBy: admin.email, createdAt: FieldValue.serverTimestamp(),
        });
      });
      return NextResponse.json({ success: true, balanceDOP: exactBalanceDOP });
    }
    if (!Number.isFinite(amountDOP) || amountDOP <= 0 || amountDOP > 1_000_000_000) return NextResponse.json({ success: false, error: 'Monto inválido' }, { status: 400 });
    if (action === 'principal_recharge') {
      const serviceType = body.serviceType === 'recharges' ? 'recharges' : 'remittances';
      await adminDb.runTransaction(async (transaction) => {
        const operations = (await transaction.get(operationsRef)).data() || {};
        const previousBalance = serviceType === 'recharges'
          ? money(operations.rechargeServicesBalanceDOP || 0)
          : money(operations.principalBalanceDOP ?? operations.currentOperatingBalanceDOP ?? 0);
        const newBalance = money(previousBalance + amountDOP);
        const balanceUpdate = serviceType === 'recharges'
          ? { rechargeServicesBalanceDOP: newBalance }
          : { principalBalanceDOP: newBalance, currentOperatingBalanceDOP: newBalance };
        transaction.set(operationsRef, { ...balanceUpdate, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email }, { merge: true });
        transaction.set(ledgerRef, { type: serviceType === 'recharges' ? 'recharge_services_funding' : 'remittance_funding', serviceType, direction: 'in', amountDOP, previousBalanceDOP: previousBalance, newBalanceDOP: newBalance, description: String(body.notes || `Recarga de fondo ${serviceType === 'recharges' ? 'Recargas Dominicanas' : 'Remesas'}`).slice(0, 300), performedBy: admin.email, createdAt: FieldValue.serverTimestamp() });
      });
      return NextResponse.json({ success: true });
    }
    if (action !== 'fund_user') return NextResponse.json({ success: false, error: 'Operación contable inválida' }, { status: 400 });
    const uid = String(body.uid || '').trim();
    const userRef = adminDb.collection('users').doc(uid);
    const rates = await getEffectiveRates((await adminDb.collection('settings').doc('rates').get()).data() || {});
    const result = await adminDb.runTransaction(async (transaction) => {
      const [userSnapshot, operationsSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(operationsRef),
      ]);
      if (!userSnapshot.exists) throw new Error('USER_NOT_FOUND');
      const profile = userSnapshot.data() || {};
      const operations = operationsSnapshot.data() || {};
      const remittanceBalanceDOP = money(operations.principalBalanceDOP ?? operations.currentOperatingBalanceDOP ?? 0);
      const rechargeServicesBalanceDOP = money(operations.rechargeServicesBalanceDOP || 0);
      const currency = normalizeWalletCurrency(profile.primaryCurrency);
      const creditAmount = money(fromUsd(toUsd(amountDOP, 'DOP', rates), currency, rates));
      const previousUserBalance = money(profile.walletBalance || 0);
      const newUserBalance = money(previousUserBalance + creditAmount);
      transaction.update(userRef, { walletBalance: newUserBalance, walletUpdatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      transaction.set(userRef.collection('wallet_movements').doc(ledgerRef.id), { type: 'admin_credit', title: 'Recarga administrativa', description: 'Crédito a billetera única', direction: 'in', amount: creditAmount, currency, amountDOP, previousBalance: previousUserBalance, newBalance: newUserBalance, status: 'completed', referenceId: ledgerRef.id, createdAt: FieldValue.serverTimestamp() });
      transaction.set(ledgerRef, { type: 'user_wallet_credit', direction: 'neutral', amountDOP, targetUid: uid, targetName: String(profile.name || ''), targetEmail: String(profile.email || ''), creditedAmount: creditAmount, creditedCurrency: currency, affectsProviderBalance: false, remittanceBalanceDOP, rechargeServicesBalanceDOP, description: 'Crédito administrativo a billetera única · no descuenta fondos proveedores', performedBy: admin.email, createdAt: FieldValue.serverTimestamp() });
      return { newUserBalance, currency };
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'USER_NOT_FOUND') return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    if (message === 'INSUFFICIENT_PRINCIPAL') return NextResponse.json({ success: false, error: 'La cuenta principal no tiene balance suficiente' }, { status: 409 });
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
