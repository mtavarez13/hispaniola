import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const snapshot = await adminDb.collection('whatsapp_messages').orderBy('receivedAt', 'desc').limit(100).get();
    return NextResponse.json({
      success: true,
      messages: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ success: false, error: 'ID requerido.' }, { status: 400 });
    await adminDb.collection('whatsapp_messages').doc(id).set({ read: true, readAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
