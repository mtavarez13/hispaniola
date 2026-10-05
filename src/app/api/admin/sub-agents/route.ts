import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const snapshot = await adminDb.collection('sub_agents').limit(500).get();
    return NextResponse.json({ success: true, subAgents: snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })) });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const subAgent = body.subAgent && typeof body.subAgent === 'object' ? body.subAgent : null;
    const id = String(subAgent?.id || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);
    const name = String(subAgent?.name || '').trim().slice(0, 120);
    const owner = String(subAgent?.owner || '').trim().slice(0, 120);
    if (!id || !name || !owner) return NextResponse.json({ success: false, error: 'Perfil de subagente inválido' }, { status: 400 });
    const safe = JSON.parse(JSON.stringify(subAgent));
    safe.id = id; safe.name = name; safe.owner = owner;
    safe.updatedAt = new Date().toISOString();
    safe.updatedAtServer = FieldValue.serverTimestamp();
    safe.updatedBy = admin.email;
    await adminDb.collection('sub_agents').doc(id).set(safe, { merge: true });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
