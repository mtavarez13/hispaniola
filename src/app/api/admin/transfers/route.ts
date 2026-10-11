import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const jsonDate = (value: any) => typeof value?.toDate === 'function' ? value.toDate().toISOString() : (value || null);

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const snapshot = await adminDb.collection('wallet_transfers').limit(300).get();
    const transfers = snapshot.docs.map((doc) => {
      const data = doc.data();
      const { referenceUsdToDop: _reference, rateSource: _source, ...publicData } = data;
      return { id: doc.id, ...publicData, createdAt: jsonDate(data.createdAt) || data.createdAtIso };
    }).sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const completed = transfers.filter((item: any) => item.status === 'completed');
    return NextResponse.json({
      success: true,
      transfers,
      summary: {
        count: completed.length,
        volumeUSD: completed.reduce((total: number, item: any) => total + Number(item.sourceCurrency === 'DOP' ? item.amount / (item.dopPerUsd || 58.5) : item.amount || 0), 0),
        profitUSD: completed.reduce((total: number, item: any) => total + Number(item.feeUSD || 0), 0),
      },
    });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
