import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser, authenticatedUserError } from '@/lib/server-auth';
import { assertBinanceTopupsEnabled } from '@/lib/binance-topup-config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    assertBinanceTopupsEnabled();
  } catch (error) {
    if (error instanceof Error && error.message === 'BINANCE_TOPUPS_DISABLED') {
      return NextResponse.json({ success: false, code: 'BINANCE_TOPUPS_DISABLED', error: 'Las recargas USDT están en preparación. No se aceptan pagos reales.' }, { status: 503 });
    }
    const auth = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }
}
