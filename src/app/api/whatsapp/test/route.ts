import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/whatsapp/service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      phone,
      type = 'custom', // 'sender_receipt' | 'recipient_haiti' | 'invoice' | 'custom'
      customMessage,
      apiToken,
      phoneNumberId,
      gatewayUrl,
      provider = 'cloud_api',
    } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Debe ingresar un número de teléfono de prueba' },
        { status: 400 }
      );
    }

    let messageText = '';
    const cleanPhone = WhatsAppService.cleanPhoneNumber(phone);
    const mockTxId = `HP-${Date.now().toString().slice(-6)}`;

    if (type === 'sender_receipt') {
      messageText = WhatsAppService.formatSenderMessage({
        senderName: 'Usuario de Prueba',
        recipientName: 'Jean Baptiste',
        recipientPhone: '50940885084',
        operator: 'MonCash',
        amountHTG: 1350.0,
        amountUSD: 10.0,
        amountDOP: 600.0,
        txId: mockTxId,
      });
    } else if (type === 'recipient_haiti') {
      messageText = WhatsAppService.formatRecipientMessage({
        recipientName: 'Jean Baptiste',
        senderName: 'Carlos Rodríguez',
        senderPhone: '18095550123',
        operator: 'MonCash',
        amountHTG: 1350.0,
        txId: mockTxId,
      });
    } else if (type === 'invoice') {
      messageText = WhatsAppService.formatInvoiceMessage({
        clientName: 'María Santos',
        servicio: 'Claro Prepago',
        telefono: '8093233535',
        montoRD: 500,
        noReferencia: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      });
    } else {
      messageText = (customMessage || '').trim() ||
        `🧪 *HispaniolaPay - Mensaje de Prueba de Conexión API*\n¡Hola! La integración con el API de WhatsApp ha sido configurada y verificada exitosamente.\n\n⚡ *Fecha/Hora:* ${new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' })}\n🚀 *Estado:* Enrutamiento Activo`;
    }

    const result = await WhatsAppService.sendMessage({
      toPhone: cleanPhone,
      messageText,
      token: apiToken,
      phoneNumberId,
      gatewayUrl,
      provider,
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      status: result.status,
      providerUsed: result.providerUsed,
      whatsappIntentUrl: result.whatsappIntentUrl,
      latencyMs: result.latencyMs,
      error: result.error,
      details: result.details,
      sentMessage: messageText,
      targetPhone: cleanPhone,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error ejecutando prueba de WhatsApp' },
      { status: 500 }
    );
  }
}
