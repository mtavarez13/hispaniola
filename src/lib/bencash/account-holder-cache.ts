import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

const COLLECTION = 'bencash_account_holders';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function rememberVerifiedNatCashHolder(phone: string, accountName: string) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  const cleanName = String(accountName || '').trim().slice(0, 120);
  if (!/^509\d{8}$/.test(cleanPhone) || !cleanName) return;

  await adminDb.collection(COLLECTION).doc(cleanPhone).set({
    phone: cleanPhone,
    accountName: cleanName,
    operator: 'NatCash',
    verified: true,
    verifiedAtMs: Date.now(),
    verifiedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function getVerifiedNatCashHolder(phone: string) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!/^509\d{8}$/.test(cleanPhone)) return null;

  const snapshot = await adminDb.collection(COLLECTION).doc(cleanPhone).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  const name = String(data.accountName || '').trim();
  const verifiedAtMs = Number(data.verifiedAtMs || 0);
  if (!name || data.operator !== 'NatCash' || data.verified !== true || Date.now() - verifiedAtMs > MAX_AGE_MS) return null;

  return { accountName: name, verifiedAtMs };
}
