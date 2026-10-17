import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';
import { proxyRequestToFirebaseBackend } from '@/lib/firebase-backend-proxy';

export const dynamic = 'force-dynamic';

const jsonDate = (value: any) => value?.toDate?.()?.toISOString?.() || value || null;

async function requirePrintingUser(req: NextRequest) {
  const identity = await requireAuthenticatedUser(req);
  if (identity.role === 'admin' || identity.profile?.thermalReceiptsEnabled === true) return identity;
  if (identity.email) {
    const linked = await adminDb.collection('sub_agents').where('email', '==', identity.email).limit(1).get();
    if (!linked.empty && linked.docs[0].data()?.modules?.thermalReceipts === true) return identity;
  }
  throw new Error('PRINTING_NOT_ENABLED');
}

export async function GET(req: NextRequest) {
  const proxied = await proxyRequestToFirebaseBackend(req);
  if (proxied) return proxied;
  try {
    const identity = await requirePrintingUser(req);
    const snapshot = await adminDb.collection('remote_print_jobs').where('userId', '==', identity.uid).limit(100).get();
    const jobs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, ...data, createdAt: jsonDate(data.createdAt) || data.createdAtIso, claimedAt: jsonDate(data.claimedAt), printedAt: jsonDate(data.printedAt) };
    }).sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 30);
    return NextResponse.json({ success: true, pending: jobs.filter((job: any) => job.status === 'pending').reverse(), jobs });
  } catch (error) {
    if (error instanceof Error && error.message === 'PRINTING_NOT_ENABLED') return NextResponse.json({ success: false, error: 'La impresión de comprobantes no está habilitada para este usuario' }, { status: 403 });
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function PATCH(req: NextRequest) {
  const proxied = await proxyRequestToFirebaseBackend(req);
  if (proxied) return proxied;
  try {
    const identity = await requirePrintingUser(req);
    const body = await req.json();
    const jobId = String(body.jobId || '').trim();
    const action = String(body.action || '').trim();
    const clientId = String(body.clientId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
    if (!jobId || !['claim', 'printed', 'failed', 'reprint'].includes(action)) return NextResponse.json({ success: false, error: 'Operación de impresión inválida' }, { status: 400 });
    const jobRef = adminDb.collection('remote_print_jobs').doc(jobId);
    const result = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(jobRef);
      if (!snapshot.exists || snapshot.data()?.userId !== identity.uid) throw new Error('PRINT_JOB_NOT_FOUND');
      const data = snapshot.data() || {};
      if (action === 'claim') {
        if (data.status !== 'pending') return { claimed: false, status: data.status };
        transaction.update(jobRef, { status: 'printing', claimedBy: clientId, claimedAt: FieldValue.serverTimestamp(), attemptCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
        return { claimed: true, job: { id: jobId, ...data } };
      }
      if (action === 'reprint') {
        transaction.update(jobRef, { status: 'pending', claimedBy: FieldValue.delete(), claimedAt: FieldValue.delete(), reprintCount: FieldValue.increment(1), reprintRequestedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        return { queued: true };
      }
      if (data.claimedBy && clientId && data.claimedBy !== clientId) return { updated: false, status: data.status };
      transaction.update(jobRef, action === 'printed'
        ? { status: 'printed', printedAt: FieldValue.serverTimestamp(), printedBy: clientId, lastError: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() }
        : { status: 'failed', failedAt: FieldValue.serverTimestamp(), lastError: String(body.error || 'La impresora no confirmó el trabajo').slice(0, 300), updatedAt: FieldValue.serverTimestamp() });
      return { updated: true, status: action === 'printed' ? 'printed' : 'failed' };
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'PRINTING_NOT_ENABLED') return NextResponse.json({ success: false, error: 'La impresión de comprobantes no está habilitada para este usuario' }, { status: 403 });
    if (message === 'PRINT_JOB_NOT_FOUND') return NextResponse.json({ success: false, error: 'Trabajo de impresión no encontrado' }, { status: 404 });
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
