import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getPersistentWhatsAppServerConfig } from '@/lib/server-config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const suppliedToken = params.get('hub.verify_token') || '';
  const challenge = params.get('hub.challenge') || '';
  const config = await getPersistentWhatsAppServerConfig();
  const expectedToken = config.webhookVerifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';

  if (mode === 'subscribe' && expectedToken && suppliedToken === expectedToken) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return NextResponse.json({ success: false, error: 'Webhook de WhatsApp no autorizado.' }, { status: 403 });
}

function validMetaSignature(rawBody: string, signature: string | null, appSecret: string) {
  if (!appSecret) return true;
  if (!signature?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function messageText(message: any): string {
  if (message?.text?.body) return String(message.text.body);
  if (message?.button?.text) return String(message.button.text);
  if (message?.interactive?.button_reply?.title) return String(message.interactive.button_reply.title);
  if (message?.interactive?.list_reply?.title) return String(message.interactive.list_reply.title);
  if (message?.image?.caption) return String(message.image.caption);
  if (message?.document?.caption) return String(message.document.caption);
  return `[${String(message?.type || 'mensaje').toUpperCase()}]`;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const config = await getPersistentWhatsAppServerConfig();
  const appSecret = config.appSecret || process.env.WHATSAPP_APP_SECRET || '';

  if (!validMetaSignature(rawBody, req.headers.get('x-hub-signature-256'), appSecret)) {
    return NextResponse.json({ success: false, error: 'Firma de Meta inválida.' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const writes: Promise<unknown>[] = [];

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const contactMap = new Map(
          (value.contacts || []).map((contact: any) => [String(contact.wa_id || ''), contact.profile?.name || ''])
        );

        for (const message of value.messages || []) {
          const messageId = String(message.id || `wamid-${Date.now()}-${Math.random()}`).replace(/\//g, '_');
          const senderPhone = String(message.from || '');
          writes.push(
            adminDb.collection('whatsapp_messages').doc(messageId).set({
              messageId: message.id || messageId,
              direction: 'inbound',
              from: senderPhone,
              contactName: contactMap.get(senderPhone) || '',
              phoneNumberId: value.metadata?.phone_number_id || '',
              displayPhoneNumber: value.metadata?.display_phone_number || '',
              type: message.type || 'unknown',
              text: messageText(message),
              mediaId: message.image?.id || message.audio?.id || message.video?.id || message.document?.id || null,
              timestamp: message.timestamp || null,
              receivedAt: new Date().toISOString(),
              read: false,
            }, { merge: true })
          );
        }

        for (const status of value.statuses || []) {
          const statusId = String(status.id || '').replace(/\//g, '_');
          if (statusId) {
            writes.push(adminDb.collection('whatsapp_delivery_status').doc(statusId).set({
              messageId: status.id,
              status: status.status || 'unknown',
              recipientId: status.recipient_id || '',
              timestamp: status.timestamp || null,
              updatedAt: new Date().toISOString(),
              errors: status.errors || [],
            }, { merge: true }));
          }
        }
      }
    }

    await Promise.all(writes);
    return NextResponse.json({ success: true, received: writes.length });
  } catch (error) {
    console.error('[WhatsAppWebhook] Payload inválido:', error);
    return NextResponse.json({ success: false, error: 'Payload inválido.' }, { status: 400 });
  }
}
