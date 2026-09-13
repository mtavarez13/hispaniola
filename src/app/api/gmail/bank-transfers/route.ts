import { NextRequest, NextResponse } from "next/server";
import { parseGmailBankMessage, getInitialDemoBankTransfers } from "@/lib/gmail/bank-parser";
import { GmailBankTransfer } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

    // Query params for exchange rates
    const url = new URL(req.url);
    const dopRate = parseFloat(url.searchParams.get("dopRate") || "58.50");
    const htgRate = parseFloat(url.searchParams.get("htgRate") || "132.20");

    // If no token, return demo Dominican bank transfers for preview
    if (!token) {
      const demoTransfers = getInitialDemoBankTransfers(dopRate, htgRate);
      return NextResponse.json({
        success: true,
        connected: false,
        needsAuth: true,
        message: "Conecta tu cuenta de Gmail para leer los correos de Banreservas, Banco BHD y Banco Popular en vivo.",
        transfers: demoTransfers,
        totalCount: demoTransfers.length,
      });
    }

    // Call Gmail API using the access token
    // Filter for Dominican banks: Banreservas, BHD, Popular, or transfer keywords
    const searchQuery = encodeURIComponent(
      'from:(bhd OR banreservas OR popular OR bpd OR populanet) OR subject:(transferencia OR "pago al instante" OR "crédito" OR depósito OR deposito OR aviso)'
    );

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${searchQuery}&maxResults=25`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (!listRes.ok) {
      const errorText = await listRes.text();
      console.warn("Gmail API list messages error:", listRes.status, errorText);

      // Return fallback demo with notice if token is invalid or expired
      const demoTransfers = getInitialDemoBankTransfers(dopRate, htgRate);
      return NextResponse.json({
        success: false,
        connected: false,
        needsAuth: listRes.status === 401,
        error: `Gmail API: ${listRes.status} ${listRes.statusText}`,
        transfers: demoTransfers,
        totalCount: demoTransfers.length,
      });
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      // In case the Gmail inbox does not have Dominican bank notifications yet,
      // return demo transfers with a flag indicating zero live bank emails found
      const demoTransfers = getInitialDemoBankTransfers(dopRate, htgRate);
      return NextResponse.json({
        success: true,
        connected: true,
        liveCount: 0,
        message: "No se encontraron correos de BHD, Banreservas o Banco Popular en tu bandeja aún. Mostrando depósitos de referencia.",
        transfers: demoTransfers,
        totalCount: demoTransfers.length,
      });
    }

    // Fetch details for each message in parallel (up to 15)
    const detailPromises = messages.slice(0, 15).map(async (m: { id: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
        if (!detailRes.ok) return null;
        return await detailRes.json();
      } catch (err) {
        return null;
      }
    });

    const rawDetails = await Promise.all(detailPromises);
    const parsedTransfers: GmailBankTransfer[] = [];

    for (const raw of rawDetails) {
      if (!raw) continue;
      const parsed = parseGmailBankMessage(raw, dopRate, htgRate);
      if (parsed) {
        parsedTransfers.push(parsed);
      }
    }

    // If parsed transfers were found, combine or return them
    let finalTransfers = parsedTransfers;
    if (finalTransfers.length === 0) {
      finalTransfers = getInitialDemoBankTransfers(dopRate, htgRate);
    }

    return NextResponse.json({
      success: true,
      connected: true,
      liveCount: parsedTransfers.length,
      transfers: finalTransfers,
      totalCount: finalTransfers.length,
    });
  } catch (error: any) {
    console.error("Error fetching bank transfers from Gmail:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al procesar lectura de correos de Gmail",
      },
      { status: 500 }
    );
  }
}
