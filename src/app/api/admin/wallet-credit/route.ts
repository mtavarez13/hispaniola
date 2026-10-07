import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';
import { createAndPushMobileNotification } from '@/lib/mobile-notifications';

function money(value: number) { return Math.round(value * 100) / 100; }

async function findClient(identifier: string) {
  const users = adminDb.collection('users');
  const candidates = Array.from(new Set([identifier, identifier.toUpperCase(), identifier.toLowerCase()]));
  for (const value of candidates) {
    for (const field of ['clientCode', 'email', 'phone']) {
      const snapshot = await users.where(field, '==', value).limit(1).get();
      if (!snapshot.empty) return snapshot.docs[0];
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const identifier = String(body.clientIdentifier || '').trim();
    const amountUSD = money(Number(body.amountUSD));
    const targetPocket = body.targetPocket === 'savings' ? 'savings' : 'main';
    const notes = String(body.notes || 'Depósito acreditado').trim().slice(0, 300);
    const idempotencyKey = String(body.idempotencyKey || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    if (!identifier || !Number.isFinite(amountUSD) || amountUSD <= 0 || amountUSD > 100000) {
      return NextResponse.json({ success: false, error: 'Cliente o monto inválido' }, { status: 400 });
    }

    const client = await findClient(identifier);
    if (!client) return NextResponse.json({ success: false, error: 'No se encontró un cliente registrado con ese código, correo o teléfono' }, { status: 404 });

    const creditId = idempotencyKey || `credit_${Date.now()}`;
    const movementRef = client.ref.collection('wallet_movements').doc(creditId);
    const ratesRef = adminDb.collection('settings').doc('rates');
    const result = await adminDb.runTransaction(async (transaction) => {
      const [profileSnapshot, existingMovement, ratesSnapshot] = await Promise.all([transaction.get(client.ref), transaction.get(movementRef), transaction.get(ratesRef)]);
      if (existingMovement.exists) return { duplicate: true, ...(existingMovement.data() || {}) };
      const profile = profileSnapshot.data() || {};
      const primaryCurrency = profile.primaryCurrency === 'DOP' ? 'DOP' : 'USD';
      const rateDOP = Number(ratesSnapshot.data()?.publicRateDOP || 58.5);
      const creditedAmount = primaryCurrency === 'DOP' ? money(amountUSD * rateDOP) : amountUSD;
      const field = targetPocket === 'savings' ? 'savingsBalance' : 'walletBalance';
      const previousBalance = money(Number(profile[field] || 0));
      const newBalance = money(previousBalance + creditedAmount);
      transaction.update(client.ref, { [field]: newBalance, updatedAt: FieldValue.serverTimestamp() });
      transaction.set(movementRef, {
        type: 'deposit', title: 'Depósito acreditado', description: notes, amount: creditedAmount, currency: primaryCurrency, amountUSD, direction: 'in', targetPocket,
        previousBalance, newBalance, status: 'completed', referenceId: creditId,
        createdAt: FieldValue.serverTimestamp(), createdAtIso: new Date().toISOString(), creditedBy: admin.email,
      });
      return { duplicate: false, previousBalance, newBalance, creditedAmount, primaryCurrency };
    });

    if (!result.duplicate) {
      await createAndPushMobileNotification(client.id, {
        title: 'Depósito acreditado',
        body: `Recibiste +${result.primaryCurrency === 'DOP' ? 'RD$' : 'US$'}${Number(result.creditedAmount).toFixed(2)} en ${targetPocket === 'savings' ? 'tu ahorro' : 'tu billetera'}. Nuevo saldo: ${result.primaryCurrency === 'DOP' ? 'RD$' : 'US$'}${Number(result.newBalance).toFixed(2)}.`,
        type: 'deposit', amountUSD, referenceId: creditId,
      });
    }

    return NextResponse.json({ success: true, duplicate: result.duplicate, creditId, userId: client.id, newBalance: Number(result.newBalance), primaryCurrency: result.primaryCurrency });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
