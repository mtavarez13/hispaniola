import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ success: false, code: 'BINANCE_TOPUPS_DISABLED', status: 'disabled' }, { status: 503 });
}
