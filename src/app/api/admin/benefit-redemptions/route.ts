import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const jsonDate = (value: any) => typeof value?.toDate === 'function' ? value.toDate().toISOString() : (value || null);

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req, { allowOperations: true });
    const snapshot = await adminDb.collection('benefit_redemptions').orderBy('createdAt', 'desc').limit(300).get();
    const redemptions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { ...data, id: doc.id, createdAt: jsonDate(data.createdAt) || data.createdAtIso };
    });
    return NextResponse.json({
      success: true,
      redemptions,
      summary: {
        count: redemptions.length,
        totalDOP: redemptions.reduce((sum, item) => sum + Number(item.amountDOP || 0), 0),
      },
    });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
