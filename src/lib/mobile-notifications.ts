import 'server-only';

import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

export interface MobileNotificationInput {
  title: string;
  body: string;
  type: 'deposit' | 'remittance' | 'security' | 'general';
  amountUSD?: number;
  referenceId?: string;
}

export function deviceTokenId(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAndPushMobileNotification(userId: string, input: MobileNotificationInput) {
  const notificationRef = adminDb.collection('users').doc(userId).collection('notifications').doc();
  await notificationRef.set({
    ...input,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    createdAtIso: new Date().toISOString(),
  });

  const devices = await adminDb.collection('users').doc(userId).collection('devices').get();
  const tokens = devices.docs.map((doc) => String(doc.data().token || '')).filter(Boolean);
  if (!tokens.length) return { notificationId: notificationRef.id, pushed: 0 };

  try {
    const result = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: { title: input.title, body: input.body },
      data: {
        notificationId: notificationRef.id,
        type: input.type,
        referenceId: input.referenceId || '',
        amountUSD: input.amountUSD == null ? '' : String(input.amountUSD),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'wallet_movements',
          sound: 'default',
          clickAction: 'OPEN_NOTIFICATIONS',
        },
      },
    });

    const invalidIds: string[] = [];
    result.responses.forEach((response, index) => {
      const code = response.error?.code || '';
      if (!response.success && (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token'))) {
        invalidIds.push(deviceTokenId(tokens[index]));
      }
    });
    await Promise.all(invalidIds.map((id) => adminDb.collection('users').doc(userId).collection('devices').doc(id).delete()));
    return { notificationId: notificationRef.id, pushed: result.successCount };
  } catch (error) {
    console.error('FCM notification failed; inbox notification was preserved', error);
    return { notificationId: notificationRef.id, pushed: 0 };
  }
}
