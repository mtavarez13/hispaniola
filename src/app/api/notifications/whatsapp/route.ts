import { NextRequest, NextResponse } from "next/server";
import { WhatsAppService } from "@/lib/whatsapp/service";

export const dynamic = 'force-dynamic';

export function cleanPhoneNumber(phone: string, defaultCountryCode = ""): string {
  return WhatsAppService.cleanPhoneNumber(phone, defaultCountryCode);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      senderPhone,
      senderName = "Cliente",
      recipientPhone,
      recipientName = "Beneficiario",
      amountUSD,
      amountDOP,
      amountHTG,
      operator = "MonCash",
      txId = "TX-" + Math.floor(100000 + Math.random() * 900000),
      requestId,
      date = new Date().toLocaleString("es-DO", { timeZone: "America/Santo_Domingo" }),
    } = body;

    if (!recipientPhone && !senderPhone) {
      return NextResponse.json(
        { success: false, error: "Se requiere al menos un número telefónico (remitente o receptor)" },
        { status: 400 }
      );
    }

    const cleanSender = cleanPhoneNumber(senderPhone || "", "1");
    const cleanRecipient = cleanPhoneNumber(recipientPhone || "", "509");

    const formattedHTG = amountHTG ? Number(amountHTG).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
    const formattedUSD = amountUSD ? Number(amountUSD).toFixed(2) : null;
    const formattedDOP = amountDOP ? Number(amountDOP).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;

    // Mensaje 1: Para el Remitente (Confirmación de envío y recibo oficial)
    const senderMessage = `✅ *HispaniolaPay - Comprobante de Remesa Exitosa*
¡Hola *${senderName}*! Tu transferencia hacia Haití ha sido procesada y acreditada con éxito.

📋 *Detalles de la Transacción:*
• *ID de Transacción:* ${txId}
${requestId ? `• *No. Petición:* ${requestId}\n` : ""}• *Beneficiario:* ${recipientName} (+${cleanRecipient})
• *Billetera Destino:* ${operator} (Haití)
• *Monto Acreditado:* *${formattedHTG} HTG*
${formattedUSD ? `• *Monto Enviado:* $${formattedUSD} USD\n` : ""}${formattedDOP ? `• *Equivalente en Pesos:* RD$${formattedDOP} DOP\n` : ""}• *Fecha y Hora:* ${date}
• *Estado:* ✅ *Completada / Acreditada*

⚡ *Tu familia ya tiene el dinero disponible en su teléfono en Haití.*
_Gracias por utilizar HispaniolaPay - El corredor seguro RD ⇄ Haití._`;

    // Mensaje 2: Para el Receptor / Beneficiario en Haití (Kreyòl Ayisyen & Español)
    const recipientMessage = `🇭🇹 *HispaniolaPay - Notifikasyon Transfè Lajan*
Bonjou *${recipientName}*! Ou resevwa yon transfè de *${formattedHTG} HTG* sou kont *${operator}* ou (+${cleanRecipient}).

👤 *Moun ki voye l:* ${senderName}${cleanSender ? ` (+${cleanSender})` : ""}
📋 *Nimewo Referans:* ${txId}
⚡ *Estati:* Lajan an disponib imedyatman sou telefòn ou pou w itilize oswa retire li.
🕒 *Dat:* ${date}

---
🇩🇴 *Comprobante en Español:*
Has recibido *${formattedHTG} HTG* en tu billetera *${operator}* enviados por *${senderName}*. Ref: ${txId}. ¡Fondos listos para uso!`;

    // URLs para apertura directa (Web Intent / WhatsApp API universal)
    const senderWhatsAppUrl = cleanSender 
      ? `https://api.whatsapp.com/send?phone=${cleanSender}&text=${encodeURIComponent(senderMessage)}`
      : null;

    const recipientWhatsAppUrl = cleanRecipient
      ? `https://api.whatsapp.com/send?phone=${cleanRecipient}&text=${encodeURIComponent(recipientMessage)}`
      : null;

    let metaSenderDispatched = false;
    let metaRecipientDispatched = false;
    let apiError: string | null = null;

    const waConfig = WhatsAppService.getConfig();
    const metaToken = waConfig.apiToken || process.env.WHATSAPP_API_TOKEN;
    const metaPhoneId = waConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const isApiEnabled = waConfig.enabled || Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

    // Si la API está habilitada y existen credenciales de Meta WhatsApp Cloud API
    if (isApiEnabled && metaToken && metaPhoneId) {
      try {
        // Enviar a Remitente si la regla lo permite
        if (cleanSender && waConfig.notifySender !== false) {
          const res = await fetch(`https://graph.facebook.com/v20.0/${metaPhoneId}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${metaToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: cleanSender,
              type: "text",
              text: { body: senderMessage },
            }),
          });
          const data = await res.json();
          metaSenderDispatched = Boolean(data.messages && data.messages.length > 0);
          if (data.error) {
            console.error("Meta WhatsApp Sender Error:", data.error);
            apiError = data.error.message || JSON.stringify(data.error);
          }
        }

        // Enviar a Receptor si la regla lo permite
        if (cleanRecipient && waConfig.notifyRecipient !== false) {
          const res = await fetch(`https://graph.facebook.com/v20.0/${metaPhoneId}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${metaToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: cleanRecipient,
              type: "text",
              text: { body: recipientMessage },
            }),
          });
          const data = await res.json();
          metaRecipientDispatched = Boolean(data.messages && data.messages.length > 0);
          if (data.error) {
            console.error("Meta WhatsApp Recipient Error:", data.error);
            apiError = data.error.message || JSON.stringify(data.error);
          }
        }
      } catch (e: any) {
        apiError = e.message;
        console.error("WhatsApp Cloud API error:", e);
      }
    }

    // Webhook Gateway opcional
    const gatewayUrl = waConfig.gatewayUrl || process.env.WHATSAPP_GATEWAY_URL;
    if (isApiEnabled && gatewayUrl) {
      try {
        await fetch(gatewayUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: { phone: cleanSender, name: senderName, message: senderMessage },
            recipient: { phone: cleanRecipient, name: recipientName, message: recipientMessage },
            txId,
            operator,
            amountHTG,
          }),
        });
      } catch (err) {
        console.warn("WhatsApp Gateway dispatch warning:", err);
      }
    }

    return NextResponse.json({
      success: true,
      sender: {
        phone: cleanSender,
        name: senderName,
        message: senderMessage,
        whatsappUrl: senderWhatsAppUrl,
        apiDispatched: metaSenderDispatched,
      },
      recipient: {
        phone: cleanRecipient,
        name: recipientName,
        message: recipientMessage,
        whatsappUrl: recipientWhatsAppUrl,
        apiDispatched: metaRecipientDispatched,
      },
      metadata: {
        txId,
        requestId,
        operator,
        amountHTG: formattedHTG,
        apiError,
        mode: (metaSenderDispatched || metaRecipientDispatched) ? "cloud_api" : "direct_intent",
      },
    });
  } catch (error: any) {
    console.error("Error in /api/notifications/whatsapp:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al generar notificación de WhatsApp" },
      { status: 500 }
    );
  }
}
