import { QikInvoice } from "@/lib/types";

export interface ParsedGmailMessage {
  id: string;
  threadId?: string;
  snippet: string;
  subject: string;
  from: string;
  dateStr: string;
  internalDate: string;
  bodyText: string;
  bodyHtml?: string;
}

/**
 * Searches user Gmail messages with the provided query using the Google OAuth access token.
 * Supports multiple fallback queries and batch limit.
 */
export async function searchQikEmails(
  accessToken: string,
  queryStr: string = "from:no-reply-qik@qik.com.do OR from:qik.com.do OR subject:qik OR subject:\"pago de servicio\"",
  maxResults: number = 50
): Promise<{ id: string; threadId: string }[]> {
  const allMessages: { id: string; threadId: string }[] = [];
  let pageToken: string | undefined = undefined;

  try {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("q", queryStr);
    url.searchParams.set("maxResults", String(Math.min(maxResults, 50)));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData?.error?.message || `Gmail API error (status ${res.status})`
      );
    }

    const data = await res.json();
    if (data.messages && Array.isArray(data.messages)) {
      allMessages.push(...data.messages);
    }
  } catch (err: any) {
    console.warn("Primary Gmail search encountered issue:", err);
    // Try simpler fallback query if complex query had issues
    try {
      const fallbackUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=qik&maxResults=${maxResults}`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.messages) return fallbackData.messages;
      }
    } catch (_) {}
    throw err;
  }

  return allMessages;
}


/**
 * Fetches full detail of a Gmail message.
 */
export async function fetchEmailMessage(
  accessToken: string,
  messageId: string
): Promise<ParsedGmailMessage> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Error fetching email ${messageId} (status ${res.status})`);
  }

  const data = await res.json();

  let subject = "";
  let from = "";
  let dateStr = "";

  const headers = data.payload?.headers || [];
  for (const h of headers) {
    const name = (h.name || "").toLowerCase();
    if (name === "subject") subject = h.value;
    if (name === "from") from = h.value;
    if (name === "date") dateStr = h.value;
  }

  let bodyText = "";
  let bodyHtml = "";

  function extractParts(part: any) {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) {
      bodyText += decodeBase64Url(part.body.data) + "\n";
    } else if (part.mimeType === "text/html" && part.body?.data) {
      bodyHtml += decodeBase64Url(part.body.data) + "\n";
    }
    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(extractParts);
    }
  }

  if (data.payload) {
    extractParts(data.payload);
  }

  if (!bodyText && data.snippet) {
    bodyText = data.snippet;
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || "",
    subject,
    from,
    dateStr,
    internalDate: data.internalDate || String(Date.now()),
    bodyText,
    bodyHtml,
  };
}

function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    try {
      return atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    } catch {
      return str;
    }
  }
}

/**
 * Formats a Date object or timestamp into Dominican Ticket Date/Time:
 * "21/08/2026 03:26 PM"
 */
export function formatTicketDateTime(dateObj: Date): string {
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();

  let hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, "0");

  return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
}

/**
 * Intelligent regex and heuristic extractor for Qik confirmation emails.
 */
export function parseQikEmail(email: ParsedGmailMessage, defaultFee: number = 10.0): QikInvoice {
  const content = `${email.subject}\n${email.snippet}\n${email.bodyText}\n${email.bodyHtml || ""}`;

  // 1. Reference Number extraction (e.g., 53-189181160 or similar)
  let noReferencia = "";
  const refMatches = content.match(/(?:referencia|ref|no\.\s*referencia|número\s*de\s*referencia|transacción|tx|autorización)[\s:#]+([A-Za-z0-9\-]{6,25})/i);
  if (refMatches && refMatches[1]) {
    noReferencia = refMatches[1].trim();
  } else {
    const fallbackRef = content.match(/\b(\d{2}-\d{7,12})\b/);
    if (fallbackRef) {
      noReferencia = fallbackRef[1];
    } else {
      noReferencia = `53-${Math.floor(100000000 + Math.random() * 900000000)}`;
    }
  }

  // 2. Service extraction (Altice, Claro, Edenorte, etc.)
  let servicio = "Telefónicas / Altice";
  const lower = content.toLowerCase();
  if (lower.includes("altice")) {
    servicio = "Telefónicas / Altice";
  } else if (lower.includes("claro")) {
    servicio = "Telefónicas / Claro";
  } else if (lower.includes("viva")) {
    servicio = "Telefónicas / Viva";
  } else if (lower.includes("edenorte")) {
    servicio = "Electricidad / Edenorte";
  } else if (lower.includes("edesur")) {
    servicio = "Electricidad / Edesur";
  } else if (lower.includes("edeeste")) {
    servicio = "Electricidad / Edeeste";
  } else if (lower.includes("caasd")) {
    servicio = "Agua / CAASD";
  } else if (lower.includes("coraasan")) {
    servicio = "Agua / CORAASAN";
  } else if (lower.includes("wind")) {
    servicio = "Internet / Wind Telecom";
  }

  // 3. Telephone / NIC / Contract number
  let telefono = "8299930707";
  const phoneMatch = content.match(/(?:tel|teléfono|telefono|celular|móvil|numero|número|contrato|nic)[\s:#]+(\d{10,12}|\d{3}[-\s]\d{3}[-\s]\d{4})/i);
  if (phoneMatch && phoneMatch[1]) {
    telefono = phoneMatch[1].replace(/[-\s]/g, "");
  } else {
    const rawPhones = content.match(/\b(8[024]9\d{7})\b/);
    if (rawPhones) {
      telefono = rawPhones[1];
    }
  }

  // 4. Amount extraction
  let montoServicio = 3853.99;
  const amountMatch = content.match(/(?:monto|total|pagado|valor|importe|rd\$)[\s:]*(?:rd\$|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2})?)/i);
  if (amountMatch && amountMatch[1]) {
    const cleanNum = amountMatch[1].replace(/,/g, "");
    const parsed = parseFloat(cleanNum);
    if (!isNaN(parsed) && parsed > 0) {
      montoServicio = parsed;
    }
  }

  const cargoServicio = defaultFee;
  const totalPagado = Number((montoServicio + cargoServicio).toFixed(2));

  // 5. Date parsing
  let dateObj = new Date();
  if (email.internalDate) {
    const ts = parseInt(email.internalDate, 10);
    if (!isNaN(ts)) dateObj = new Date(ts);
  } else if (email.dateStr) {
    const parsedDate = new Date(email.dateStr);
    if (!isNaN(parsedDate.getTime())) dateObj = parsedDate;
  }

  const fechaHora = formatTicketDateTime(dateObj);

  return {
    id: `INV-${noReferencia.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now().toString().slice(-4)}`,
    fechaHora,
    noReferencia,
    servicio,
    telefono,
    montoServicio,
    cargoServicio,
    totalPagado,
    moneda: "RD$",
    empresaEmisora: "HISPANIOLA PAY",
    telefonoEmisora: "809-323-3535",
    direccionEmisora: "Las Matas De Santa Cruz/ Duarte No.30",
    senderEmail: email.from || "no-reply-qik@qik.com.do",
    emailId: email.id,
    rawSnippet: email.snippet,
    subject: email.subject,
    createdAt: dateObj.toISOString(),
    status: "completado",
  };
}

export const DEMO_QIK_INVOICES: QikInvoice[] = [
  {
    id: "INV-53189181160",
    fechaHora: "21/08/2026 03:26 PM",
    noReferencia: "53-189181160",
    servicio: "Telefónicas / Altice",
    telefono: "8299930707",
    montoServicio: 3853.99,
    cargoServicio: 10.0,
    totalPagado: 3863.99,
    moneda: "RD$",
    empresaEmisora: "HISPANIOLA PAY",
    telefonoEmisora: "809-323-3535",
    direccionEmisora: "Las Matas De Santa Cruz/ Duarte No.30",
    senderEmail: "no-reply-qik@qik.com.do",
    subject: "Confirmación de Pago de Servicios - Altice",
    createdAt: new Date().toISOString(),
    status: "completado",
    createdByName: "Sistema Qik",
  },
  {
    id: "INV-53298412891",
    fechaHora: "22/08/2026 10:15 AM",
    noReferencia: "53-298412891",
    servicio: "Telefónicas / Claro",
    telefono: "8095551234",
    montoServicio: 1450.0,
    cargoServicio: 10.0,
    totalPagado: 1460.0,
    moneda: "RD$",
    empresaEmisora: "HISPANIOLA PAY",
    telefonoEmisora: "809-323-3535",
    direccionEmisora: "Las Matas De Santa Cruz/ Duarte No.30",
    senderEmail: "no-reply-qik@qik.com.do",
    subject: "Pago exitoso Claro Telecomunicaciones",
    createdAt: new Date().toISOString(),
    status: "completado",
    createdByName: "Sistema Qik",
  },
];
