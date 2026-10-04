import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';
import { deviceTokenId } from '@/lib/mobile-notifications';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const identity = await requireAuthenticatedUser(req);
    const body = await req.json();
    const token = String(body.token || '').trim();
    if (token.length < 40 || token.length > 4096) {
      return NextResponse.json({ success: false, error: 'Token de dispositivo inválido' }, { status: 400 });
    }
    await adminDb.collection('users').doc(identity.uid).collection('devices').doc(deviceTokenId(token)).set({
      token,
      platform: 'android',
      appVersion: String(body.appVersion || ''),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const identity = await requireAuthenticatedUser(req);
    const body = await req.json();
    const token = String(body.token || '').trim();
    if (token) await adminDb.collection('users').doc(identity.uid).collection('devices').doc(deviceTokenId(token)).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
