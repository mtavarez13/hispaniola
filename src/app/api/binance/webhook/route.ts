import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Fail closed. Do not acknowledge unsigned or unverified payment notifications
 * as successfully processed. No wallet mutation is performed by this route.
 */
export async function POST() {
  return NextResponse.json({
    success: false,
    code: 'BINANCE_WEBHOOK_DISABLED',
    error: 'Webhook no habilitado; no se acreditó ningún saldo.',
  }, { status: 503 });
}
