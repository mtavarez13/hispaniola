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
    const email = String(subAgent?.email || '').trim().toLowerCase().slice(0, 150);
    const primaryCurrency = subAgent?.primaryCurrency === 'USD' ? 'USD' : 'DOP';
    const remittanceFeePercent = Math.round(Number(subAgent?.remittanceFeePercent ?? 8) * 100) / 100;
    if (!id || !name || !owner) return NextResponse.json({ success: false, error: 'Perfil de subagente inválido' }, { status: 400 });
    if (!Number.isFinite(remittanceFeePercent) || remittanceFeePercent < 0 || remittanceFeePercent > 100) return NextResponse.json({ success: false, error: 'La tarifa de remesa debe estar entre 0% y 100%' }, { status: 400 });
    const safe = JSON.parse(JSON.stringify(subAgent));
    safe.id = id; safe.name = name; safe.owner = owner;
    safe.email = email;
    safe.primaryCurrency = primaryCurrency;
    safe.remittanceFeePercent = remittanceFeePercent;
    safe.updatedAt = new Date().toISOString();
    safe.updatedAtServer = FieldValue.serverTimestamp();
    safe.updatedBy = admin.email;
    const userQuery = email ? await adminDb.collection('users').where('email', '==', email).limit(1).get() : null;
    const userRef = userQuery && !userQuery.empty ? userQuery.docs[0].ref : null;
    const subAgentRef = adminDb.collection('sub_agents').doc(id);
    await adminDb.runTransaction(async (transaction) => {
      let profileUpdate: Record<string, unknown> | null = null;
      if (userRef) {
        const [profileSnapshot, ratesSnapshot] = await Promise.all([
          transaction.get(userRef),
          transaction.get(adminDb.collection('settings').doc('rates')),
        ]);
        const profile = profileSnapshot.data() || {};
        const previousCurrency = profile.primaryCurrency === 'DOP' ? 'DOP' : 'USD';
        const rateDOP = Number(ratesSnapshot.data()?.publicRateDOP || 58.5);
        const convert = (value: unknown) => {
          const amount = Number(value || 0);
          if (previousCurrency === primaryCurrency) return Math.round(amount * 100) / 100;
          return Math.round((primaryCurrency === 'DOP' ? amount * rateDOP : amount / rateDOP) * 100) / 100;
        };
        profileUpdate = {
          role: 'agent',
          primaryCurrency,
          remittanceFeePercent,
          walletBalance: convert(profile.walletBalance),
          savingsBalance: convert(profile.savingsBalance),
          updatedAt: FieldValue.serverTimestamp(),
        };
      }
      transaction.set(subAgentRef, safe, { merge: true });
      if (userRef && profileUpdate) transaction.set(userRef, profileUpdate, { merge: true });
    });
    return NextResponse.json({ success: true, id, linkedUserUpdated: Boolean(userRef) });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
