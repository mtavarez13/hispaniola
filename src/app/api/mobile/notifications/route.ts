import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

function jsonDate(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuthenticatedUser(req);
    const snapshot = await adminDb.collection('users').doc(identity.uid).collection('notifications').limit(75).get();
    const notifications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: String(data.title || 'HispaniolaPay'),
        body: String(data.body || ''),
        type: String(data.type || 'general'),
        amountUSD: Number(data.amountUSD || 0),
        referenceId: String(data.referenceId || ''),
        read: Boolean(data.read),
        createdAt: jsonDate(data.createdAt) || String(data.createdAtIso || ''),
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ success: true, notifications, unread: notifications.filter((item) => !item.read).length });
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const identity = await requireAuthenticatedUser(req);
    const body = await req.json();
    const notificationId = String(body.notificationId || '').trim();
    if (notificationId) {
      await adminDb.collection('users').doc(identity.uid).collection('notifications').doc(notificationId).set({ read: true, readAt: FieldValue.serverTimestamp() }, { merge: true });
    } else {
      const unread = await adminDb.collection('users').doc(identity.uid).collection('notifications').where('read', '==', false).limit(100).get();
      const batch = adminDb.batch();
      unread.docs.forEach((doc) => batch.update(doc.ref, { read: true, readAt: FieldValue.serverTimestamp() }));
      await batch.commit();
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
