import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, adminAuthError } from '@/lib/server-auth';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request, { allowOperations: false });
    return NextResponse.json({ success: false, code: 'BINANCE_RECONCILIATION_DISABLED' }, { status: 503 });
  } catch (error) {
    const auth = adminAuthError(error);
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }
}
