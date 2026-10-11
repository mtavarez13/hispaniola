import 'server-only';

export type WalletCurrency = 'USD' | 'DOP' | 'HTG';

export type EffectiveRates = {
  usdToDop: number;
  usdToHtg: number;
  dopToHtg: number;
  fetchedAt: string;
};

const roundRate = (value: number) => Math.round(value * 10000) / 10000;

export function normalizeWalletCurrency(value: unknown): WalletCurrency {
  return value === 'DOP' || value === 'HTG' ? value : 'USD';
}

export function currencySymbol(currency: WalletCurrency) {
  if (currency === 'DOP') return 'RD$';
  if (currency === 'HTG') return 'G';
  return 'US$';
}

export function toUsd(amount: number, currency: WalletCurrency, rates: EffectiveRates) {
  if (currency === 'DOP') return amount / rates.usdToDop;
  if (currency === 'HTG') return amount / rates.usdToHtg;
  return amount;
}

export function fromUsd(amountUsd: number, currency: WalletCurrency, rates: EffectiveRates) {
  if (currency === 'DOP') return amountUsd * rates.usdToDop;
  if (currency === 'HTG') return amountUsd * rates.usdToHtg;
  return amountUsd;
}

export function convertCurrency(amount: number, from: WalletCurrency, to: WalletCurrency, rates: EffectiveRates) {
  if (from === to) return amount;
  if (from === 'DOP' && to === 'HTG') return amount * rates.dopToHtg;
  if (from === 'HTG' && to === 'DOP') return amount / rates.dopToHtg;
  return fromUsd(toUsd(amount, from, rates), to, rates);
}

async function caribeExpressUsdDop(): Promise<number | null> {
  try {
    const response = await fetch('https://caribeexpress.com.do/', {
      headers: { 'User-Agent': 'Mozilla/5.0 HispaniolaPay/1.0' },
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const dollarsSection = html.match(/DOLARES\s+AMERICANOS[\s\S]{0,800}?class=["']value["'][^>]*>\s*([0-9]+(?:[.,][0-9]+)?)/i);
    const structuredRate = html.match(/tasa de compra del D[oó]lar[^0-9]{0,80}(?:RD\$)?\s*([0-9]+(?:[.,][0-9]+)?)/i);
    const parsed = Number(String(dollarsSection?.[1] || structuredRate?.[1] || '').replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 20 && parsed < 100 ? parsed : null;
  } catch {
    return null;
  }
}

export async function getEffectiveRates(settings: Record<string, unknown> = {}): Promise<EffectiveRates> {
  const configuredDop = Number(settings.publicRateDOP || 58.5);
  const configuredHtg = Number(settings.publicRateHTG || 132.2);
  const caribeReference = await caribeExpressUsdDop();
  const reference = caribeReference ?? configuredDop + 1;
  const usdToDop = Math.max(0.01, reference - 1);
  const usdToHtg = Number.isFinite(configuredHtg) && configuredHtg > 0 ? configuredHtg : 132.2;
  const configuredDopToHtg = Number(settings.publicRateDOPToHTG || 2.03);
  const dopToHtg = Number.isFinite(configuredDopToHtg) && configuredDopToHtg > 0 ? configuredDopToHtg : 2.03;
  return {
    usdToDop: roundRate(usdToDop),
    usdToHtg: roundRate(usdToHtg),
    dopToHtg: roundRate(dopToHtg),
    fetchedAt: new Date().toISOString(),
  };
}
