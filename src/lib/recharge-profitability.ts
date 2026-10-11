import 'server-only';

import { adminDb } from '@/lib/firebase-admin';

export type CommissionKind = 'percent' | 'fixed';
export type CommissionRule = { kind: CommissionKind; value: number };

const normalize = (value: unknown) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const canonicalProvider = (value: unknown) => {
  const name = normalize(value);
  const aliases: Array<[string, string[]]> = [
    ['claro', ['claro']], ['altice', ['altice']], ['viva', ['viva']], ['digicel', ['digicel']],
    ['natcom', ['natcom']], ['moun', ['moun']], ['wind', ['wind']], ['paso-rapido', ['paso rapido']],
    ['edenorte', ['edenorte']], ['coraasan', ['coraasan', 'corasan']], ['edeeste', ['edeeste']], ['edesur', ['edesur']],
    ['caasd', ['caasd']], ['cepm', ['cepm']], ['ceb', ['ceb']], ['activa', ['activa']], ['adn', ['adn']],
    ['asdn', ['asdn']], ['coraaplata', ['coraaplata', 'coraplata']], ['coraavega', ['coraavega', 'cora vega']],
    ['coaarom', ['coaarom']], ['dgii', ['dgii']], ['pgr-multas', ['pgr multas', 'pgr', 'procuraduria']],
    ['tss', ['tss', 'tesoreria de la seguridad social']], ['midas-seguros', ['midas seguros', 'midas']],
    ['star-sport', ['star sport']], ['juancito-sport', ['juancito sport']],
  ];
  return aliases.find(([, values]) => values.some((alias) => name === alias || name.includes(alias)))?.[0] || name.replace(/[^a-z0-9]+/g, '-');
};

const canonicalType = (product: any) => {
  const type = normalize(product?.type);
  const category = normalize(product?.category);
  if (type === 'seguro' || normalize(product?.name).includes('seguro')) return 'seguro';
  if (type === 'paquetico' || category === 'data-plan') return 'paquetico';
  if (type === 'pin' || category === 'pin') return 'pin';
  if (type === 'factura' || category === 'invoice') return 'factura';
  return 'recarga';
};

export const rechargeProfitKey = (product: any) => `${canonicalType(product)}__${canonicalProvider(product?.name || product?.key)}`;

export const PROVIDER_COMMISSION_DEFAULTS: Record<string, CommissionRule> = {
  'recarga__claro': { kind: 'percent', value: 5.5 }, 'recarga__altice': { kind: 'percent', value: 5.5 },
  'recarga__viva': { kind: 'percent', value: 5.5 }, 'recarga__digicel': { kind: 'percent', value: 5.5 },
  'recarga__natcom': { kind: 'percent', value: 5.5 }, 'recarga__moun': { kind: 'percent', value: 5.5 },
  'recarga__paso-rapido': { kind: 'percent', value: 1 }, 'recarga__edesur': { kind: 'percent', value: 1.5 },
  'recarga__cepm': { kind: 'percent', value: 1 }, 'recarga__ceb': { kind: 'percent', value: 1 },
  'recarga__activa': { kind: 'percent', value: 0.5 }, 'recarga__star-sport': { kind: 'percent', value: 3 },
  'recarga__juancito-sport': { kind: 'percent', value: 4 },
  'paquetico__claro': { kind: 'percent', value: 5.5 }, 'paquetico__altice': { kind: 'percent', value: 5.5 },
  'paquetico__viva': { kind: 'percent', value: 5.5 }, 'paquetico__digicel': { kind: 'percent', value: 5.5 },
  'paquetico__wind': { kind: 'percent', value: 2 },
  'pin__claro': { kind: 'percent', value: 5.5 }, 'pin__altice': { kind: 'percent', value: 5.5 },
  'pin__viva': { kind: 'percent', value: 5.5 },
  'factura__edenorte': { kind: 'fixed', value: 4 }, 'factura__coraasan': { kind: 'fixed', value: 3 },
  'factura__claro': { kind: 'fixed', value: 3 }, 'factura__altice': { kind: 'fixed', value: 3 },
  'factura__viva': { kind: 'fixed', value: 3 }, 'factura__edeeste': { kind: 'fixed', value: 4 },
  'factura__edesur': { kind: 'fixed', value: 4 }, 'factura__wind': { kind: 'fixed', value: 4 },
  'factura__caasd': { kind: 'percent', value: 1 }, 'factura__cepm': { kind: 'fixed', value: 4 },
  'factura__ceb': { kind: 'fixed', value: 4 }, 'factura__adn': { kind: 'fixed', value: 4 },
  'factura__asdn': { kind: 'fixed', value: 0 }, 'factura__coraaplata': { kind: 'percent', value: 1 },
  'factura__coraavega': { kind: 'percent', value: 1 }, 'factura__coaarom': { kind: 'fixed', value: 1 },
  'factura__dgii': { kind: 'fixed', value: 4 }, 'factura__pgr-multas': { kind: 'fixed', value: 4 },
  'factura__tss': { kind: 'fixed', value: 4 }, 'seguro__midas-seguros': { kind: 'percent', value: 10 },
};

export async function getRechargeProfitConfig() {
  const snapshot = await adminDb.collection('settings').doc('recharge_profitability').get();
  const data = snapshot.data() || {};
  return { agentBenefits: (data.agentBenefits || {}) as Record<string, CommissionRule> };
}

export function commissionAmount(amountDOP: number, rule?: CommissionRule) {
  if (!rule || !Number.isFinite(rule.value) || rule.value <= 0) return 0;
  const raw = rule.kind === 'fixed' ? rule.value : amountDOP * rule.value / 100;
  return Math.round(raw * 100) / 100;
}

export async function rechargeProfitability(product: any, amountDOP: number, isAgent: boolean) {
  const key = rechargeProfitKey(product);
  const config = await getRechargeProfitConfig();
  const providerRule = PROVIDER_COMMISSION_DEFAULTS[key] || { kind: 'fixed' as const, value: 0 };
  const agentRule = config.agentBenefits[key] || { kind: 'fixed' as const, value: 0 };
  const providerCommissionDOP = commissionAmount(amountDOP, providerRule);
  const agentBenefitDOP = isAgent ? commissionAmount(amountDOP, agentRule) : 0;
  return { key, providerRule, agentRule, providerCommissionDOP, agentBenefitDOP };
}

