/**
 * Guía Oficial de Implementación para Node.js y Firebase
 * Integración Oficial con "Deposit Channel API" de BenCash Group
 *
 * URLs Oficiales:
 * - Panel Seller (Ver balance, recargas y transacciones): https://sellertest.bencashgroup.com
 * - URL Base del API: https://reseller.test.bencashgroup.com
 *
 * Reglas Críticas de Autenticación y Seguridad:
 * 1. Header Obligatorio: 'skml' en TODAS las peticiones HTTP con la Private Key.
 * 2. Generación de Firmas HMAC-SHA256 (en minúsculas):
 *    - accessKey = privateKey + requestId
 *    - API 1 (Request Cash-In): POST a {baseUrl}/channel/requestcashin
 *      Cadena: {accessKey=<accessKey>$requestId=<requestId>$toAccountNumber=<toAccountNumber>$amount=<amount>$content=<content>$timestamp=<timestamp>}
 *    - API 2 (Confirm Cash-In): POST a {baseUrl}/channel/confirmcashin
 *      Cadena: {accessKey=<accessKey>$requestId=<requestId>$txId=<txId>$verifyCode=<verifyCode>$isConfirm=<isConfirm>}
 *    - El HMAC-SHA256 debe utilizar la privateKey como llave secreta y producir formato hexadecimal en minúsculas.
 * 3. Identificador de Petición (requestId):
 *    - Se genera combinando el tiempo actual con números aleatorios:
 *      const requestId = `${Date.now()}${Math.floor(100000 + Math.random() * 900000)}`;
 */

import crypto from 'crypto';
import { BencashClient, getBencashClient } from './client';

// ============================================================================
// SECCIÓN 1: Clase de Ejemplo Autónoma en Node.js (Crypto + Fetch Nativo)
// ============================================================================

export class BencashStandaloneClient {
  private baseUrl: string;
  private privateKey: string;

  constructor(config?: { baseUrl?: string; privateKey?: string }) {
    this.baseUrl = (
      config?.baseUrl ||
      process.env.BENCASH_BASE_URL ||
      'https://reseller.test.bencashgroup.com'
    ).replace(/\/+$/, '');

    this.privateKey = (
      config?.privateKey ||
      process.env.BENCASH_PRIVATE_KEY ||
      ''
    ).trim();
  }

  /**
   * Generación de requestId 100% único combinando Date.now() y aleatoriedad
   */
  public generateRequestId(): string {
    return `${Date.now()}${Math.floor(100000 + Math.random() * 900000)}`;
  }

  /**
   * API 1 (Request Cash-In): POST a {baseUrl}/channel/requestcashin
   */
  public async requestCashIn(params: {
    toAccountNumber: string;
    amount: number;
    content?: string;
    requestId?: string;
  }) {
    if (!this.privateKey) {
      throw new Error('process.env.BENCASH_PRIVATE_KEY es requerida para operar.');
    }

    const requestId = params.requestId || this.generateRequestId();
    const timestamp = Date.now();
    const content = params.content || 'Transfert Familial';
    const toAccountNumber = params.toAccountNumber.replace(/\D/g, '');

    // 1. accessKey = privateKey + requestId
    const accessKey = `${this.privateKey}${requestId}`;

    // 2. Cadena exacta requerida por Bencash Group
    const signString = `{accessKey=${accessKey}$requestId=${requestId}$toAccountNumber=${toAccountNumber}$amount=${params.amount}$content=${content}$timestamp=${timestamp}}`;

    // 3. HMAC-SHA256 en formato hexadecimal minúsculas
    const signature = crypto
      .createHmac('sha256', this.privateKey)
      .update(signString, 'utf8')
      .digest('hex')
      .toLowerCase();

    // 4. Petición HTTP con Header OBLIGATORIO 'skml'
    const endpoint = `${this.baseUrl}/channel/requestcashin`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'skml': this.privateKey, // REGLA OBLIGATORIA
      },
      body: JSON.stringify({
        requestId,
        toAccountNumber,
        amount: params.amount,
        content,
        timestamp,
        signature,
      }),
    });

    return await response.json();
  }

  /**
   * API 2 (Confirm Cash-In): POST a {baseUrl}/channel/confirmcashin
   */
  public async confirmCashIn(params: {
    txId: string;
    requestId: string;
    verifyCode?: string;
    isConfirm?: string;
  }) {
    if (!this.privateKey) {
      throw new Error('process.env.BENCASH_PRIVATE_KEY es requerida para operar.');
    }

    const requestId = params.requestId;
    const verifyCode = params.verifyCode || '1111';
    const isConfirm = params.isConfirm !== undefined ? params.isConfirm : '1';

    // 1. accessKey = privateKey + requestId
    const accessKey = `${this.privateKey}${requestId}`;

    // 2. Cadena exacta requerida por Bencash Group
    const signString = `{accessKey=${accessKey}$requestId=${requestId}$txId=${params.txId}$verifyCode=${verifyCode}$isConfirm=${isConfirm}}`;

    // 3. HMAC-SHA256 en formato hexadecimal minúsculas
    const signature = crypto
      .createHmac('sha256', this.privateKey)
      .update(signString, 'utf8')
      .digest('hex')
      .toLowerCase();

    // 4. Petición HTTP con Header OBLIGATORIO 'skml'
    const endpoint = `${this.baseUrl}/channel/confirmcashin`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'skml': this.privateKey, // REGLA OBLIGATORIA
      },
      body: JSON.stringify({
        requestId,
        txId: params.txId,
        verifyCode,
        isConfirm,
        signature,
      }),
    });

    return await response.json();
  }
}

// ============================================================================
// SECCIÓN 2: Firebase Cloud Functions v2 (HTTP onRequest con defineSecret)
// ============================================================================
/*
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

// La Private Key se almacena en Google Cloud Secret Manager mediante Firebase:
// CLI: firebase functions:secrets:set BENCASH_PRIVATE_KEY
const bencashPrivateKey = defineSecret("BENCASH_PRIVATE_KEY");

export const bencashRequestCashInFunction = onRequest(
  {
    secrets: [bencashPrivateKey],
    cors: true,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed. Use POST" });
      return;
    }

    try {
      const { toAccountNumber, amount, content } = req.body;

      if (!toAccountNumber || !amount) {
        res.status(400).json({ error: "toAccountNumber y amount son requeridos" });
        return;
      }

      // Inicializa el cliente oficial con la llave segura
      const client = new BencashClient({
        baseUrl: process.env.BENCASH_BASE_URL || "https://reseller.test.bencashgroup.com",
        privateKey: bencashPrivateKey.value(),
      });

      // Ejecuta requestcashin con firma HMAC-SHA256 y header skml automático
      const result = await client.requestCashIn({
        toAccountNumber,
        amount: Number(amount),
        content: content || "remittance",
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error en Cloud Function:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
);
*/

// ============================================================================
// SECCIÓN 3: Firebase Callable Function v2 (onCall con autenticación)
// ============================================================================
/*
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const bencashSecret = defineSecret("BENCASH_PRIVATE_KEY");

export const sendRemittanceCallable = onCall(
  { secrets: [bencashSecret] },
  async (request) => {
    // 1. Validación de seguridad en Firebase Auth
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debe autenticarse en Firebase para enviar remesas");
    }

    const { toAccountNumber, amount, content, autoConfirm } = request.data;
    const client = new BencashClient({
      baseUrl: process.env.BENCASH_BASE_URL || "https://reseller.test.bencashgroup.com",
      privateKey: bencashSecret.value(),
    });

    if (autoConfirm) {
      // Envía y auto-confirma en un solo ciclo seguro
      const result = await client.sendCashInFullFlow({
        toAccountNumber,
        amount: Number(amount),
        content: content || `Remittance from ${request.auth.uid}`,
      });
      return result;
    }

    return await client.requestCashIn({
      toAccountNumber,
      amount: Number(amount),
      content: content || `Remittance from ${request.auth.uid}`,
    });
  }
);
*/

export default BencashClient;
