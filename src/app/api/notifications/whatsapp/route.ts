import { NextRequest, NextResponse } from "next/server";
import { WhatsAppService } from "@/lib/whatsapp/service";

export const dynamic = "force-dynamic";

function cleanPhoneNumber(phone: string, defaultCountryCode = ""): string {
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
      amountHTG = 0,
      operator = "MonCash",
      txId = `TX-${Math.floor(100000 + Math.random() * 900000)}`,
      requestId,
      date = new Date().toLocaleString("es-DO", { timeZone: "America/Santo_Domingo" }),
    } = body;

    if (!senderPhone || !recipientPhone) {
      return NextResponse.json(
        { success: false, error: "Se requieren los teléfonos del remitente y del destinatario" },
        { status: 400 }
      );
    }

    const cleanSender = cleanPhoneNumber(senderPhone, "1");
    const cleanRecipient = cleanPhoneNumber(recipientPhone, "509");

    const senderMessage = WhatsAppService.formatSenderMessage({
      senderName,
      recipientName,
      recipientPhone: cleanRecipient,
      operator,
      amountHTG,
      amountUSD,
      amountDOP,
      txId,
      requestId,
      date,
    });

    const recipientMessage = WhatsAppService.formatRecipientMessage({
      recipientName,
      senderName,
      senderPhone: cleanSender,
      operator,
      amountHTG,
      amountUSD,
      amountDOP,
      txId,
      date,
    });

    const config = WhatsAppService.getConfig();
    const [senderResult, recipientResult] = await Promise.all([
      config.notifySender === false
        ? Promise.resolve({
            success: true,
            status: "disabled",
            providerUsed: "simulation" as const,
            whatsappIntentUrl: undefined,
            messageId: undefined,
            error: undefined,
          })
        : WhatsAppService.sendMessage({ toPhone: cleanSender, messageText: senderMessage }),
      config.notifyRecipient === false
        ? Promise.resolve({
            success: true,
            status: "disabled",
            providerUsed: "simulation" as const,
            whatsappIntentUrl: undefined,
            messageId: undefined,
            error: undefined,
          })
        : WhatsAppService.sendMessage({ toPhone: cleanRecipient, messageText: recipientMessage }),
    ]);

    const apiDispatched = senderResult.status === "sent" || recipientResult.status === "sent";

    return NextResponse.json({
      success: senderResult.success && recipientResult.success,
      sender: {
        phone: cleanSender,
        name: senderName,
        message: senderMessage,
        whatsappUrl: senderResult.whatsappIntentUrl || null,
        apiDispatched: senderResult.status === "sent",
        messageId: senderResult.messageId,
        error: senderResult.error,
      },
      recipient: {
        phone: cleanRecipient,
        name: recipientName,
        message: recipientMessage,
        whatsappUrl: recipientResult.whatsappIntentUrl || null,
        apiDispatched: recipientResult.status === "sent",
        messageId: recipientResult.messageId,
        error: recipientResult.error,
      },
      metadata: {
        txId,
        requestId,
        operator,
        website: process.env.NEXT_PUBLIC_SITE_URL || "https://www.hispaniolapay.com/",
        instagram: process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "@hispaniolapay",
        wabaConfigured: Boolean(config.businessAccountId),
        mode: apiDispatched ? "cloud_api" : "direct_intent",
      },
    });
  } catch (error: any) {
    console.error("Error in /api/notifications/whatsapp:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al enviar las notificaciones de WhatsApp" },
      { status: 500 }
    );
  }
}
