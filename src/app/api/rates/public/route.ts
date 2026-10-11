import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getEffectiveRates } from '@/lib/currency';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await adminDb.collection('settings').doc('rates').get();
    const rates = await getEffectiveRates(snapshot.data() || {});
    return NextResponse.json({
      success: true,
      rates: {
        usdToDop: rates.usdToDop,
        usdToHtg: rates.usdToHtg,
        dopToHtg: rates.dopToHtg,
        fetchedAt: rates.fetchedAt,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'No se pudo consultar la tasa vigente' }, { status: 503 });
  }
}
