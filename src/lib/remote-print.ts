import 'server-only';

import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

export type RemotePrintKind = 'remittance' | 'mobile_topup' | 'service_topup' | 'data_plan' | 'pin_purchase' | 'invoice_payment';

export interface RemotePrintPayload {
  kind: RemotePrintKind;
  transactionId: string;
  title: string;
  reference: string;
  userName: string;
  userCode?: string;
  productName?: string;
  provider?: string;
  recipientName?: string;
  recipientPhone?: string;
  target?: string;
  amount: number;
  currency: string;
  fee?: number;
  total?: number;
  deliveredAmount?: number;
  deliveredCurrency?: string;
  pin?: string;
  status?: string;
}

const cleanObject = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(cleanObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .map(([key, item]) => [key, cleanObject(item)]));
};

/** Creates one durable print job per transaction. Repeated API calls cannot duplicate it. */
export async function enqueueRemotePrintJob(userId: string, input: RemotePrintPayload) {
  const digest = createHash('sha256').update(`${userId}|${input.kind}|${input.transactionId}`).digest('hex').slice(0, 32);
  const jobRef = adminDb.collection('remote_print_jobs').doc(`print_${digest}`);
  const payload = cleanObject(input) as RemotePrintPayload;
  const created = await adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(jobRef);
    if (existing.exists) return false;
    transaction.create(jobRef, {
      userId,
      transactionId: input.transactionId,
      kind: input.kind,
      status: 'pending',
      payload,
      attemptCount: 0,
      reprintCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: new Date().toISOString(),
    });
    return true;
  });
  return { id: jobRef.id, created };
}
