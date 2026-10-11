import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
const DEFAULT_OPENING_BALANCE_DOP = 0;
const CONFIRMATION = 'BORRAR TODOS LOS SALDOS';
const money = (value: unknown) => Math.round(Number(value) * 100) / 100;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req, { requireSettings: true });
    const snapshot = await adminDb.collection('settings').doc('operations').get();
    const data = snapshot.data() || {};
    return NextResponse.json({
      success: true,
      openingBalanceDOP: Number(data.openingBalanceDOP ?? DEFAULT_OPENING_BALANCE_DOP),
      currentOperatingBalanceDOP: Number(data.currentOperatingBalanceDOP ?? data.openingBalanceDOP ?? DEFAULT_OPENING_BALANCE_DOP),
      lastResetAt: data.lastResetAt?.toDate?.()?.toISOString?.() || null,
      lastResetBy: String(data.lastResetBy || ''),
    });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, { requireSettings: true });
    const body = await req.json();
    const openingBalanceDOP = money(body.openingBalanceDOP);
    if (!Number.isFinite(openingBalanceDOP) || openingBalanceDOP < 0 || openingBalanceDOP > 1_000_000_000) {
      return NextResponse.json({ success: false, error: 'Balance operativo inicial inválido' }, { status: 400 });
    }
    await adminDb.collection('settings').doc('operations').set({
      openingBalanceDOP,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin.email,
    }, { merge: true });
    return NextResponse.json({ success: true, openingBalanceDOP });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, { requireSettings: true });
    if (!admin.isPrimary) return NextResponse.json({ success: false, error: 'Solo el administrador principal puede reiniciar todos los saldos' }, { status: 403 });
    const body = await req.json();
    const openingBalanceDOP = 0;
    if (body.confirmation !== CONFIRMATION) return NextResponse.json({ success: false, error: `Escribe exactamente: ${CONFIRMATION}` }, { status: 400 });
    if (!Number.isFinite(openingBalanceDOP) || openingBalanceDOP < 0 || openingBalanceDOP > 1_000_000_000) {
      return NextResponse.json({ success: false, error: 'Balance operativo inicial inválido' }, { status: 400 });
    }

    const operationRef = adminDb.collection('admin_audit').doc(`opening_balance_${Date.now()}`);
    const [users, subAgents] = await Promise.all([
      adminDb.collection('users').get(),
      adminDb.collection('sub_agents').get(),
    ]);
    const previousUserBalance = users.docs.reduce((sum, doc) => sum + Number(doc.data().walletBalance || 0) + Number(doc.data().savingsBalance || 0), 0);
    const previousSubAgentBalance = subAgents.docs.reduce((sum, doc) => sum + Number(doc.data().walletBalance || 0), 0);

    await operationRef.set({
      type: 'global_balance_reset', status: 'running', openingBalanceDOP,
      affectedUsers: users.size, affectedSubAgents: subAgents.size,
      previousUserBalance, previousSubAgentBalance,
      startedBy: admin.email, startedAt: FieldValue.serverTimestamp(),
    });

    const writes: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];
    users.docs.forEach((doc) => writes.push({ ref: doc.ref, data: { walletBalance: 0, remittanceBalance: 0, rechargeServicesBalance: 0, savingsBalance: 0, benefitAccruedDOP: 0, walletUpdatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() } }));
    subAgents.docs.forEach((doc) => writes.push({ ref: doc.ref, data: { walletBalance: 0, updatedAt: FieldValue.serverTimestamp() } }));
    for (let index = 0; index < writes.length; index += 400) {
      const batch = adminDb.batch();
      writes.slice(index, index + 400).forEach((write) => batch.set(write.ref, write.data, { merge: true }));
      await batch.commit();
    }

    await Promise.all([
      adminDb.collection('settings').doc('operations').set({
        openingBalanceDOP,
        currentOperatingBalanceDOP: 0,
        principalBalanceDOP: 0,
        rechargeServicesBalanceDOP: 0,
        lastResetAt: FieldValue.serverTimestamp(),
        lastResetBy: admin.email,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true }),
      operationRef.set({ status: 'completed', completedAt: FieldValue.serverTimestamp() }, { merge: true }),
    ]);

    return NextResponse.json({ success: true, openingBalanceDOP, affectedUsers: users.size, affectedSubAgents: subAgents.size });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
