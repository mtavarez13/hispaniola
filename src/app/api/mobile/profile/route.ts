import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

function cleanText(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

export async function PATCH(req: NextRequest) {
  try {
    const identity = await requireAuthenticatedUser(req);
    const body = await req.json();
    const name = cleanText(body.name, 100);
    const phone = cleanText(body.phone, 30);
    const idNumber = cleanText(body.idNumber, 40);
    const country = cleanText(body.country, 2).toUpperCase();

    if (name.length < 2) return NextResponse.json({ success: false, error: 'Escribe un nombre válido' }, { status: 400 });
    if (phone && phone.replace(/\D/g, '').length < 7) return NextResponse.json({ success: false, error: 'Escribe un teléfono válido' }, { status: 400 });
    if (!['DO', 'HT', 'US'].includes(country)) return NextResponse.json({ success: false, error: 'Selecciona un país válido' }, { status: 400 });

    const profileRef = adminDb.collection('users').doc(identity.uid);
    await Promise.all([
      profileRef.set({ name, phone, idNumber, country, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
      adminAuth.updateUser(identity.uid, { displayName: name }),
    ]);
    const updated = (await profileRef.get()).data() || {};
    return NextResponse.json({ success: true, profile: { ...updated, uid: identity.uid } });
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
