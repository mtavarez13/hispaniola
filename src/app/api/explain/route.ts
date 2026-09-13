import { NextRequest, NextResponse } from 'next/server';
import { explainTransactionBreakdown } from '@/ai/flows/explain-transaction-breakdown-flow';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amountSent, feePercentage, exchangeRate, destinationCurrency } = body;

    const result = await explainTransactionBreakdown({
      amountSent: Number(amountSent) || 100,
      feePercentage: Number(feePercentage) || 5,
      exchangeRate: Number(exchangeRate) || 58.5,
      destinationCurrency: destinationCurrency || 'DOP',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Error in explain route:', error);
    return NextResponse.json(
      {
        explanation: 'Desglose calculado con la tasa y comisión vigentes del sistema.',
        error: error.message,
      },
      { status: 200 }
    );
  }
}
