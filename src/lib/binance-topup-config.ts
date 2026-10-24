import 'server-only';

export const BINANCE_TOPUPS_ENABLED = false as const;
export const BINANCE_TOPUP_CURRENCY = 'USDT' as const;
export const WALLET_CREDIT_CURRENCY = 'USD' as const;

/**
 * This feature is intentionally locked in source code. Never enable real deposits
 * merely by setting an environment variable or sending a request parameter.
 * Merchant approval, verified payment attribution and ledger review are required.
 */
export function assertBinanceTopupsEnabled(): never {
  throw new Error('BINANCE_TOPUPS_DISABLED');
}
