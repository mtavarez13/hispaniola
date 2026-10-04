/**
 * Servicio Central de Integración y Automatización con WhatsApp
 * Soporta:
 * 1. Meta WhatsApp Cloud API Oficial (versión configurable)
 * 2. Enlaces Directos Universales (WhatsApp Web / App Intent)
 */

export interface WhatsAppConfig {
  enabled: boolean;
  provider: 'cloud_api' | 'direct_web';
  apiToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  webhookVerifyToken?: string;
  appSecret?: string;
  notifySender: boolean;
  notifyRecipient: boolean;
  notifyInvoices: boolean;
  senderTemplate?: string;
  recipientTemplate?: string;
}

export interface SendWhatsAppMessageParams {
  toPhone: string;
  messageText: string;
  token?: string;
  phoneNumberId?: string;
  provider?: 'cloud_api' | 'direct_web';
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  status?: string;
  providerUsed: 'cloud_api' | 'direct_web' | 'simulation';
  whatsappIntentUrl?: string;
  error?: string;
  details?: any;
  latencyMs?: number;
}

// Almacén en memoria del servidor
let runtimeWhatsAppConfig: WhatsAppConfig = {
  enabled: Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
  provider: 'cloud_api',
  apiToken: process.env.WHATSAPP_API_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
  appSecret: process.env.WHATSAPP_APP_SECRET || '',
  notifySender: true,
  notifyRecipient: true,
  notifyInvoices: true,
};

export class WhatsAppService {
  /**
   * Obtiene la configuración actual activa en el servidor
   */
  public static getConfig(): WhatsAppConfig {
    return { ...runtimeWhatsAppConfig };
  }

  /**
   * Actualiza la configuración en caliente
   */
  public static setConfig(partial: Partial<WhatsAppConfig>): WhatsAppConfig {
    runtimeWhatsAppConfig = {
      ...runtimeWhatsAppConfig,
      ...partial,
    };
    return { ...runtimeWhatsAppConfig };
  }

  /**
   * Limpia y formatea el número para estándares de WhatsApp
   * - Quita signos y espacios
   * - Asegura código de país (1 para RD/EEUU, 509 para Haití)
   */
  public static cleanPhoneNumber(phone: string, defaultCountryCode = ''): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');

    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // Número dominicano de 10 dígitos (809, 829, 849)
    if (/^(809|829|849)\d{7}$/.test(cleaned)) {
      cleaned = `1${cleaned}`;
    }

    // Número de Haití de 8 dígitos (empezando por 3 o 4)
    if (/^[34]\d{7}$/.test(cleaned)) {
      cleaned = `509${cleaned}`;
    }

    if (!cleaned.startsWith('1') && !cleaned.startsWith('509') && defaultCountryCode) {
      cleaned = `${defaultCountryCode}${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Genera el mensaje oficial para el Remitente (RD / Exterior)
   */
  public static formatSenderMessage(params: {
    senderName?: string;
    recipientName?: string;
    recipientPhone?: string;
    operator?: string;
    amountHTG: number | string;
    amountUSD?: number | string;
    amountDOP?: number | string;
    txId: string;
    requestId?: string;
    date?: string;
  }): string {
    const sender = params.senderName || 'Cliente';
    const recipient = params.recipientName || 'Beneficiario';
    const cleanPhone = this.cleanPhoneNumber(params.recipientPhone || '', '509');
    const operator = params.operator || 'MonCash';
    const formattedHTG = Number(params.amountHTG || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const dateStr = params.date || new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' });
    const websiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hispaniolapay.com/';
    const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || '@hispaniolapay';

    return `✅ *HispaniolaPay - Comprobante de Remesa Exitosa*
¡Hola *${sender}*! Tu transferencia hacia Haití ha sido procesada y acreditada con éxito.

📋 *Detalles de la Transacción:*
• *ID de Transacción:* ${params.txId}
${params.requestId ? `• *No. Petición:* ${params.requestId}\n` : ''}• *Beneficiario:* ${recipient} (+${cleanPhone})
• *Billetera Destino:* ${operator} (Haití)
• *Monto Acreditado:* *${formattedHTG} HTG*
${params.amountUSD ? `• *Monto Enviado:* $${Number(params.amountUSD).toFixed(2)} USD\n` : ''}${params.amountDOP ? `• *Equivalente en Pesos:* RD$${Number(params.amountDOP).toLocaleString('en-US', { minimumFractionDigits: 2 })} DOP\n` : ''}• *Fecha y Hora:* ${dateStr}
• *Estado:* ✅ *Completada / Acreditada*

⚡ *Tu familia ya tiene el dinero disponible en su teléfono en Haití.*
🌐 *Consulta y soporte:* ${websiteUrl}
📸 *Instagram:* ${instagram}
_Gracias por utilizar HispaniolaPay - El corredor financiero inteligente RD ⇄ Haití._`;
  }

  /**
   * Genera el mensaje oficial para el Receptor en Haití (Kreyòl Ayisyen & Español)
   */
  public static formatRecipientMessage(params: {
    recipientName?: string;
    senderName?: string;
    senderPhone?: string;
    operator?: string;
    amountHTG: number | string;
    amountUSD?: number | string;
    amountDOP?: number | string;
    txId: string;
    date?: string;
  }): string {
    const recipient = params.recipientName || 'Benefisyè';
    const sender = params.senderName || 'Fanmi w';
    const operator = params.operator || 'MonCash';
    const formattedHTG = Number(params.amountHTG || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const dateStr = params.date || new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' });
    const websiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hispaniolapay.com/';
    const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || '@hispaniolapay';

    return `🇭🇹 *HispaniolaPay - Notifikasyon Transfè Lajan*
Bonjou *${recipient}*! Ou resevwa yon transfè de *${formattedHTG} HTG* sou kont *${operator}* ou.

👤 *Moun ki voye l:* ${sender}${params.senderPhone ? ` (+${this.cleanPhoneNumber(params.senderPhone, '1')})` : ''}
📋 *Nimewo Referans:* ${params.txId}
${params.amountUSD ? `💵 *Montan voye:* $${Number(params.amountUSD).toFixed(2)} USD\n` : ''}${params.amountDOP ? `💵 *Montan voye:* RD$${Number(params.amountDOP).toLocaleString('en-US', { minimumFractionDigits: 2 })} DOP\n` : ''}💰 *Montan resevwa:* ${formattedHTG} HTG
⚡ *Estati:* Lajan an disponib imedyatman sou telefòn ou pou w itilize oswa retire li.
🕒 *Dat:* ${dateStr}

---
🇩🇴 *Comprobante en Español:*
Has recibido *${formattedHTG} HTG* en tu billetera *${operator}* enviados por *${sender}*. Ref: ${params.txId}. ¡Fondos listos para uso!

🌐 *Consulta y soporte:* ${websiteUrl}
📸 *Instagram:* ${instagram}`;
  }

  /**
   * Genera el mensaje para facturas Qik / pagos de servicios
   */
  public static formatInvoiceMessage(params: {
    clientName?: string;
    servicio: string;
    telefono: string;
    montoRD: number;
    noReferencia: string;
    date?: string;
  }): string {
    const dateStr = params.date || new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' });
    const formattedRD = params.montoRD.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `🧾 *HispaniolaPay - Pago de Servicio Exitoso*
Estimado(a) *${params.clientName || 'Cliente'}*, el pago de tu factura ha sido liquidado correctamente.

📋 *Detalles del Pago:*
• *Servicio:* ${params.servicio}
• *Teléfono / Cuenta:* ${params.telefono}
• *Monto Pagado:* RD$ ${formattedRD} DOP
• *No. Referencia:* ${params.noReferencia}
• *Fecha:* ${dateStr}
• *Estado:* ✅ *Pagado & Validado*

_HispaniolaPay - Red de Pagos y Remesas RD ⇄ Haití_`;
  }

  /**
   * Envía un mensaje individual a través del proveedor configurado
   */
  public static async sendMessage(params: SendWhatsAppMessageParams): Promise<SendWhatsAppResult> {
    const startTime = Date.now();
    const config = this.getConfig();
    const cleanTo = this.cleanPhoneNumber(params.toPhone);

    if (!cleanTo) {
      return {
        success: false,
        providerUsed: 'direct_web',
        error: 'Número telefónico de destino inválido o vacío',
      };
    }

    const intentUrl = `https://api.whatsapp.com/send?phone=${cleanTo}&text=${encodeURIComponent(params.messageText)}`;

    // Priorizar parámetros específicos o configuración global
    const provider = params.provider === 'direct_web' ? 'direct_web' : 'cloud_api';
    const token = (params.token || config.apiToken || '').trim();
    const phoneId = (params.phoneNumberId || config.phoneNumberId || '').trim();

    // Si la API no está habilitada o faltan credenciales, devolver enlace de Web Intent
    if (!config.enabled && !params.token) {
      return {
        success: true,
        providerUsed: 'direct_web',
        whatsappIntentUrl: intentUrl,
        status: 'intent_ready',
        latencyMs: Date.now() - startTime,
      };
    }

    // 1. Proveedor Meta WhatsApp Cloud API Oficial
    if (provider === 'cloud_api') {
      if (!token || !phoneId) {
        return {
          success: false,
          providerUsed: 'cloud_api',
          whatsappIntentUrl: intentUrl,
          error: 'Falta el Token de Acceso (WHATSAPP_API_TOKEN) o el Phone Number ID (WHATSAPP_PHONE_NUMBER_ID)',
        };
      }

      try {
        const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v24.0';
        const url = `https://graph.facebook.com/${graphVersion}/${phoneId}/messages`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanTo,
            type: 'text',
            text: {
              preview_url: false,
              body: params.messageText,
            },
          }),
        });

        const latencyMs = Date.now() - startTime;
        const data = await res.json();

        if (!res.ok || data.error) {
          return {
            success: false,
            providerUsed: 'cloud_api',
            whatsappIntentUrl: intentUrl,
            error: data.error?.message || `Error HTTP ${res.status} de Meta Graph API`,
            details: data.error,
            latencyMs,
          };
        }

        const messageId = data.messages?.[0]?.id;
        return {
          success: true,
          messageId,
          status: 'sent',
          providerUsed: 'cloud_api',
          whatsappIntentUrl: intentUrl,
          details: data,
          latencyMs,
        };
      } catch (err: any) {
        return {
          success: false,
          providerUsed: 'cloud_api',
          whatsappIntentUrl: intentUrl,
          error: err.message || 'Error de conexión con Meta WhatsApp API',
          latencyMs: Date.now() - startTime,
        };
      }
    }

    // 2. Fallback: Enlace directo de apertura
    return {
      success: true,
      providerUsed: 'direct_web',
      whatsappIntentUrl: intentUrl,
      status: 'intent_ready',
      latencyMs: Date.now() - startTime,
    };
  }
}
