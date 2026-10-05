import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';
import { createAndPushMobileNotification } from '@/lib/mobile-notifications';

export const dynamic = 'force-dynamic';
const money = (value: number) => Math.round(value * 100) / 100;
const jsonDate = (value: any) => typeof value?.toDate === 'function' ? value.toDate().toISOString() : (value || null);

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const snapshot = await adminDb.collection('wallet_deposits').limit(100).get();
    const deposits = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: jsonDate(doc.data().createdAt) || doc.data().createdAtIso, reviewedAt: jsonDate(doc.data().reviewedAt) })).sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return NextResponse.json({ success: true, deposits });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const id = String(body.id || '').trim();
    const action = body.action === 'reject' ? 'reject' : 'approve';
    const reason = String(body.reason || '').trim().slice(0, 240);
    if (!id) return NextResponse.json({ success: false, error: 'Depósito requerido' }, { status: 400 });
    const depositRef = adminDb.collection('wallet_deposits').doc(id);
    let notification: { userId: string; amountUSD: number; newBalance?: number; methodLabel: string } | null = null;
    const result = await adminDb.runTransaction(async (transaction) => {
      const depositSnapshot = await transaction.get(depositRef);
      if (!depositSnapshot.exists) throw new Error('DEPOSIT_NOT_FOUND');
      const deposit = depositSnapshot.data() || {};
      if (deposit.status !== 'pending') return { duplicate: true, status: deposit.status, userId: deposit.userId };
      if (action === 'reject') {
        transaction.update(depositRef, { status: 'rejected', rejectionReason: reason || 'No se pudo validar el comprobante', reviewedAt: FieldValue.serverTimestamp(), reviewedBy: admin.email });
        notification = { userId: String(deposit.userId), amountUSD: Number(deposit.amountCreditedUSD || 0), methodLabel: String(deposit.methodLabel || 'Depósito') };
        return { duplicate: false, status: 'rejected', userId: deposit.userId };
      }
      const userRef = adminDb.collection('users').doc(String(deposit.userId));
      const movementRef = userRef.collection('wallet_movements').doc(id);
      const [userSnapshot, movementSnapshot] = await Promise.all([transaction.get(userRef), transaction.get(movementRef)]);
      if (!userSnapshot.exists) throw new Error('CLIENT_NOT_FOUND');
      const amountUSD = money(Number(deposit.amountCreditedUSD || 0));
      if (amountUSD <= 0) throw new Error('INVALID_AMOUNT');
      const previousBalance = money(Number(userSnapshot.data()?.walletBalance || 0));
      const newBalance = money(previousBalance + amountUSD);
      transaction.update(userRef, { walletBalance: newBalance, walletUpdatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      if (!movementSnapshot.exists) transaction.set(movementRef, { type: 'deposit', title: 'Depósito acreditado', description: `${deposit.methodLabel || 'Cuenta autorizada'} · Comisión 0%`, amountUSD, direction: 'in', targetPocket: 'main', previousBalance, newBalance, status: 'completed', referenceId: id, receiptCode: deposit.reference || '', createdAt: FieldValue.serverTimestamp(), createdAtIso: new Date().toISOString(), creditedBy: admin.email });
      transaction.update(depositRef, { status: 'completed', reviewedAt: FieldValue.serverTimestamp(), reviewedBy: admin.email, creditedAt: FieldValue.serverTimestamp(), balanceAfterUSD: newBalance });
      notification = { userId: String(deposit.userId), amountUSD, newBalance, methodLabel: String(deposit.methodLabel || 'Depósito') };
      return { duplicate: false, status: 'completed', userId: deposit.userId, newBalanceUSD: newBalance };
    });
    if (!result.duplicate && notification) {
      const n = notification as { userId: string; amountUSD: number; newBalance?: number; methodLabel: string };
      await createAndPushMobileNotification(n.userId, action === 'approve' ? { title: 'Depósito acreditado', body: `Recibiste +$${n.amountUSD.toFixed(2)} USD sin comisión. Saldo disponible: $${Number(n.newBalance).toFixed(2)} USD.`, type: 'deposit', amountUSD: n.amountUSD, referenceId: id } : { title: 'Depósito requiere revisión', body: `${n.methodLabel}: ${reason || 'No se pudo validar el comprobante'}.`, type: 'deposit', amountUSD: n.amountUSD, referenceId: id });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'DEPOSIT_NOT_FOUND') return NextResponse.json({ success: false, error: 'Depósito no encontrado' }, { status: 404 });
    if (message === 'CLIENT_NOT_FOUND' || message === 'INVALID_AMOUNT') return NextResponse.json({ success: false, error: 'El depósito o el cliente no es válido' }, { status: 400 });
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
