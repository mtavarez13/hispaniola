import { GmailBankTransfer } from "@/lib/types";

// Bank patterns and sender domains
const BANCO_PATTERNS = [
  {
    bank: "Banco BHD" as const,
    domains: ["bhd.com.do", "bhdleon.com.do", "bhd"],
    keywords: ["bhd", "banco bhd", "bhd leon", "pin pesos bhd"],
    logoColor: "#00A859",
  },
  {
    bank: "Banreservas" as const,
    domains: ["banreservas.com", "banreservas.com.do", "banreservas"],
    keywords: ["banreservas", "banco de reservas", "pago al instante banreservas", "tuBanco"],
    logoColor: "#0033A0",
  },
  {
    bank: "Banco Popular" as const,
    domains: ["populanet.com", "bpd.com.do", "popular.com.do"],
    keywords: ["banco popular", "populanet", "bpd", "popular dominicano"],
    logoColor: "#002B49",
  },
];

/**
 * Extracts Dominican Peso amounts from text strings
 * Handles: RD$ 15,000.00 | RD$15000 | 15,000.00 DOP | Monto: 2,500.00
 */
export function extractDOPAmount(text: string): number {
  if (!text) return 0;

  // Patterns for RD$ 12,345.67 or RD$12,345
  const rdRegex = /(?:RD\$|DOP|RD\s*\$|Monto:?\s*(?:RD\$)?)\s*([\d,]+(?:\.\d{2})?)/i;
  const match = text.match(rdRegex);

  if (match && match[1]) {
    const cleanNum = match[1].replace(/,/g, "");
    const parsed = parseFloat(cleanNum);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // Fallback: look for standard amount patterns e.g. "por valor de 10,000.00"
  const valRegex = /(?:por valor de|importe de|monto de|crédito por)\s*(?:RD\$)?\s*([\d,]+(?:\.\d{2})?)/i;
  const valMatch = text.match(valRegex);
  if (valMatch && valMatch[1]) {
    const cleanNum = valMatch[1].replace(/,/g, "");
    const parsed = parseFloat(cleanNum);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  return 0;
}

/**
 * Extracts bank reference or confirmation number
 */
export function extractReferenceNumber(text: string): string {
  if (!text) return `REF-${Date.now().toString().slice(-8)}`;

  const refRegex = /(?:referencia|no\.\s*referencia|no\.\s*de\s*referencia|comprobante|no\.\s*comprobante|no\.\s*autorizaci[oó]n|secuencia|aprobaci[oó]n|transacci[oó]n|no\.\s*transacci[oó]n)[:\s#]*([A-Z0-9-]{6,20})/i;
  const match = text.match(refRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  // Look for standalone alphanumeric code like BR-293810 or BHD-918231 or 240912192012
  const codeRegex = /\b([A-Z]{2,4}-?\d{6,14}|\d{10,16})\b/;
  const codeMatch = text.match(codeRegex);
  if (codeMatch && codeMatch[1]) {
    return codeMatch[1].trim();
  }

  return `REF-${Math.floor(10000000 + Math.random() * 90000000)}`;
}

/**
 * Extracts sender name from bank notification text
 */
export function extractSenderName(text: string, fromHeader?: string): string {
  if (text) {
    const senderRegex = /(?:de|remitente|ordenante|originador|cliente|cuenta de origen|de parte de)[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,35})(?:\r|\n|,|\.|\/|-|<|$)/i;
    const match = text.match(senderRegex);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length > 3 && !name.toLowerCase().includes("banco") && !name.toLowerCase().includes("estimado")) {
        return name;
      }
    }
  }

  if (fromHeader) {
    const nameMatch = fromHeader.match(/^"?([^"<]+)"?\s*(?:<.*>)?$/);
    if (nameMatch && nameMatch[1] && !nameMatch[1].toLowerCase().includes("notificaci") && !nameMatch[1].toLowerCase().includes("alerta")) {
      return nameMatch[1].trim();
    }
  }

  return "Remitente Banco Dominicano";
}

/**
 * Identifies the Dominican bank from headers and body
 */
export function identifyBank(from: string, subject: string, snippet: string): 'Banreservas' | 'Banco BHD' | 'Banco Popular' | 'Otro Banco RD' {
  const combined = `${from} ${subject} ${snippet}`.toLowerCase();

  for (const p of BANCO_PATTERNS) {
    for (const d of p.domains) {
      if (combined.includes(d)) return p.bank;
    }
    for (const k of p.keywords) {
      if (combined.includes(k)) return p.bank;
    }
  }

  return "Otro Banco RD";
}

/**
 * Extracts recipient phone and name if included in the transfer concept / memo
 * Example memo: "Remesa para Jean Baptiste 50937112233"
 */
export function extractRecipientHints(text: string): { recipientName?: string; recipientPhone?: string; operator?: 'MonCash' | 'NatCash' } {
  let recipientPhone: string | undefined;
  let recipientName: string | undefined;
  let operator: 'MonCash' | 'NatCash' = 'MonCash';

  if (!text) return { operator };

  // Look for 509 mobile number or 8-digit mobile
  const phoneMatch = text.match(/(?:509\s*)?([34][0-9]{7})/);
  if (phoneMatch && phoneMatch[1]) {
    recipientPhone = `509${phoneMatch[1]}`;
    // Natcash typically starts with 32, 33, 35; MonCash with 34, 36, 37, 38, 40-49
    if (recipientPhone.startsWith("50932") || recipientPhone.startsWith("50933") || recipientPhone.startsWith("50935")) {
      operator = 'NatCash';
    } else {
      operator = 'MonCash';
    }
  }

  // Operator mentions in memo
  if (text.toLowerCase().includes("natcash")) {
    operator = "NatCash";
  } else if (text.toLowerCase().includes("moncash")) {
    operator = "MonCash";
  }

  // Look for recipient name hint
  const nameMatch = text.match(/(?:para|destinatario|beneficiario|a favor de)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,30})/i);
  if (nameMatch && nameMatch[1]) {
    const n = nameMatch[1].trim();
    if (!n.toLowerCase().includes("cuenta") && !n.toLowerCase().includes("banco")) {
      recipientName = n;
    }
  }

  return { recipientName, recipientPhone, operator };
}

/**
 * Base64 URL decoder for Gmail message payloads
 */
export function decodeGmailBody(base64UrlStr?: string): string {
  if (!base64UrlStr) return "";
  try {
    const base64 = base64UrlStr.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    return decodeURIComponent(
      Array.prototype.map
        .call(binary, (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    try {
      return atob(base64UrlStr.replace(/-/g, "+").replace(/_/g, "/"));
    } catch (_) {
      return "";
    }
  }
}

/**
 * Extracts plain text from Gmail message payload parts recursively
 */
export function extractTextFromGmailPayload(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return decodeGmailBody(payload.body.data);
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeGmailBody(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const rawHtml = decodeGmailBody(part.body.data);
        return rawHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      }
      if (part.parts) {
        const nested = extractTextFromGmailPayload(part);
        if (nested) return nested;
      }
    }
  }

  return "";
}

/**
 * Parses a single raw Gmail API message object into a structured GmailBankTransfer
 */
export function parseGmailBankMessage(
  msg: any,
  dopToUsdRate = 58.50,
  usdToHtgRate = 132.20
): GmailBankTransfer | null {
  if (!msg) return null;

  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) => {
    const h = headers.find((item: any) => item.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : "";
  };

  const from = getHeader("From");
  const subject = getHeader("Subject");
  const dateStr = getHeader("Date") || (msg.internalDate ? new Date(parseInt(msg.internalDate)).toISOString() : new Date().toISOString());
  const snippet = msg.snippet || "";
  const bodyText = extractTextFromGmailPayload(msg.payload) || snippet;

  const bank = identifyBank(from, subject, bodyText);

  // Check if email seems relevant to transfers / deposits
  const combined = `${from} ${subject} ${bodyText}`.toLowerCase();
  const isTransferNotification = 
    combined.includes("transferencia") || 
    combined.includes("crédito") || 
    combined.includes("depósito") || 
    combined.includes("deposito") || 
    combined.includes("pago al instante") ||
    combined.includes("acreditado") ||
    combined.includes("recibido") ||
    combined.includes("bhd") ||
    combined.includes("banreservas") ||
    combined.includes("popular");

  if (!isTransferNotification && bank === "Otro Banco RD") {
    return null;
  }

  const amountDOP = extractDOPAmount(bodyText) || extractDOPAmount(snippet) || 2500;
  const amountUSD = Number((amountDOP / dopToUsdRate).toFixed(2));
  const amountHTG = Number((amountUSD * usdToHtgRate).toFixed(2));
  const referenceNumber = extractReferenceNumber(bodyText);
  const senderName = extractSenderName(bodyText, from);
  const { recipientName, recipientPhone, operator } = extractRecipientHints(bodyText);

  return {
    id: `gmtx_${msg.id || Date.now()}`,
    gmailMessageId: msg.id,
    bank,
    senderName,
    senderAccount: bodyText.match(/\b(?:\*{3,}|x{3,}|\d{3,})(\d{4})\b/)?.[0] || "Cuenta ***" + Math.floor(1000 + Math.random() * 9000),
    destinationAccount: "Cuenta Oficial HispaniolaPay",
    referenceNumber,
    amountDOP,
    amountUSD,
    amountHTG,
    status: "pending_approval",
    detectedAt: new Date(dateStr).toISOString(),
    emailSubject: subject || `Aviso de Depósito ${bank}`,
    emailSnippet: snippet || bodyText.slice(0, 160),
    memoOrConcept: bodyText.match(/(?:concepto|comentario|motivo|mensaje)[:\s]+([^\r\n]{3,60})/i)?.[1]?.trim() || "Depósito Remesa Haití",
    recipientName,
    recipientPhone,
    operator,
    rawSenderEmail: from,
  };
}

/**
 * Prepares initial realistic Dominican Bank demo transfers
 * for immediate testing and verification on the dashboard
 */
export function getInitialDemoBankTransfers(dopRate = 58.50, htgRate = 132.20): GmailBankTransfer[] {
  const demoItems: Array<Omit<GmailBankTransfer, 'id' | 'amountUSD' | 'amountHTG'>> = [
    {
      gmailMessageId: "msg_br_839102",
      bank: "Banreservas",
      senderName: "Carlos Manuel Batista",
      senderAccount: "***9402",
      destinationAccount: "Banreservas Cta Corriente #960-2481029-3",
      referenceNumber: "BR-2026-981249",
      amountDOP: 15000.00,
      status: "pending_approval",
      detectedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
      emailSubject: "Banreservas: Notificación de Transferencia Recibida (Pagos al Instante BCRD)",
      emailSnippet: "Estimado cliente, su cuenta Banreservas terminada en 9402 ha recibido un crédito por RD$15,000.00 de parte de CARLOS MANUEL BATISTA. Referencia: BR-2026-981249.",
      memoOrConcept: "Remesa Haití - Jean Pierre",
      recipientName: "Jean Pierre Baptiste",
      recipientPhone: "50937112480",
      operator: "MonCash",
      rawSenderEmail: "notificaciones@banreservas.com",
    },
    {
      gmailMessageId: "msg_bhd_491028",
      bank: "Banco BHD",
      senderName: "Maria Altagracia Rodriguez",
      senderAccount: "***5118",
      destinationAccount: "Banco BHD Cta Corriente #2491028001",
      referenceNumber: "BHD-7719203",
      amountDOP: 8500.00,
      status: "pending_approval",
      detectedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
      emailSubject: "Banco BHD: Transferencia entre Cuentas Realizada Exitosamente",
      emailSnippet: "Aviso de Crédito: Se ha registrado un depósito por valor de RD$ 8,500.00 a favor de HISPANIOLA PAY SRL. Ordenante: MARIA ALTAGRACIA RODRIGUEZ. No. Comprobante BHD-7719203.",
      memoOrConcept: "Envio Port-au-Prince Natcash",
      recipientName: "Dieudonné Joseph",
      recipientPhone: "50932884192",
      operator: "NatCash",
      rawSenderEmail: "avisos@bhd.com.do",
    },
    {
      gmailMessageId: "msg_bpd_119024",
      bank: "Banco Popular",
      senderName: "Franklin De Oleo Encarnacion",
      senderAccount: "***3829",
      destinationAccount: "Banco Popular Dominicano Cta Ahorros #810293841",
      referenceNumber: "BPD-9920141",
      amountDOP: 24000.00,
      status: "pending_approval",
      detectedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
      emailSubject: "Banco Popular: Comprobante de Transferencia Electrónica de Fondos",
      emailSnippet: "Banco Popular Dominicano le notifica que ha recibido una transferencia por RD$24,000.00 de FRANKLIN DE OLEO ENCARNACION. Ref: BPD-9920141.",
      memoOrConcept: "Pago familiar Cap-Haitien",
      recipientName: "Marie Claude Germain",
      recipientPhone: "50936491002",
      operator: "MonCash",
      rawSenderEmail: "notificaciones@populanet.com",
    },
    {
      gmailMessageId: "msg_br_552199",
      bank: "Banreservas",
      senderName: "Lourdes Santana Peña",
      senderAccount: "***6012",
      destinationAccount: "Banreservas Cta Corriente #960-2481029-3",
      referenceNumber: "BR-2026-440182",
      amountDOP: 6000.00,
      status: "approved",
      detectedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
      emailSubject: "Banreservas: Notificación de Pago al Instante Recibido",
      emailSnippet: "Crédito recibido por RD$6,000.00 de LOURDES SANTANA PEÑA. Comprobante BR-2026-440182.",
      memoOrConcept: "Remesa Les Cayes",
      recipientName: "Samuel Delva",
      recipientPhone: "50938192011",
      operator: "MonCash",
      approvedByAdminEmail: "martin.tavarez.gomez@gmail.com",
      approvedAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
      dispatchedTxId: "HT-TX-9841",
      rawSenderEmail: "notificaciones@banreservas.com",
    }
  ];

  return demoItems.map((item, idx) => {
    const amountUSD = Number((item.amountDOP / dopRate).toFixed(2));
    const amountHTG = Number((amountUSD * htgRate).toFixed(2));
    return {
      ...item,
      id: `gmtx_init_${idx + 1}`,
      amountUSD,
      amountHTG,
    };
  });
}
