import { NextRequest, NextResponse } from 'next/server';
import { adjustPartnerBalance } from '@/lib/partner-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { partnerId, amountUSD, note } = body;

    if (!partnerId || amountUSD === undefined || isNaN(Number(amountUSD))) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'partnerId y amountUSD son requeridos' },
        { status: 400 }
      );
    }

    const result = await adjustPartnerBalance(partnerId, Number(amountUSD), note);

    return NextResponse.json(
      {
        success: true,
        message: `Saldo B2B actualizado: ${Number(amountUSD) >= 0 ? '+' : ''}$${Number(amountUSD).toFixed(2)} USD`,
        newBalanceUSD: result.newBalanceUSD,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'RECHARGE_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
