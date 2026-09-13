import crypto from 'crypto';

/**
 * URLs Oficiales de Bencash Group (Deposit Channel API)
 * - Panel Seller (para balance, recargas y transacciones): https://sellertest.bencashgroup.com
 * - URL Base del API: https://reseller.test.bencashgroup.com
 */
export const BENCASH_OFFICIAL_PANEL_URL = 'https://sellertest.bencashgroup.com';
export const BENCASH_DEFAULT_BASE_URL = 'https://reseller.test.bencashgroup.com';

export interface BencashClientConfig {
  baseUrl?: string;
  privateKey?: string;
}

export interface RequestCashInParams {
  toAccountNumber: string; // Número de teléfono en Haití (ej. 50940885084)
  amount: number; // Monto en HTG
  content?: string; // Concepto / descripción (ej. "remittance")
  requestId?: string | number; // Identificador único (si se omite se genera automáticamente)
  timestamp?: number; // Epoch millis (si se omite se usa Date.now())
}

export interface ConfirmCashInParams {
  txId: string; // ID de transacción devuelto por requestcashin
  verifyCode?: string; // Código de verificación (por defecto "1111")
  isConfirm?: string; // "1" = Confirmar depósito, "0" = Cancelar
  requestId?: string | number; // Debe ser el mismo requestId con el que se creó la orden
}

export interface BencashApiResponse<T = any> {
  resultCode: string | number;
  resultMessage: string;
  result?: T;
  data?: any;
  message?: string;
  requestId?: string | number;
  isSandbox?: boolean;
}

export interface RequestCashInResult {
  txId: string;
  amount: string;
  fee?: string;
  totalAmount?: string;
  receiver?: {
    accountId?: string;
    accountNumber: string;
    accountName?: string | null;
    accountCurrency?: string;
  };
  requestId?: string | number;
  transactionId?: string;
  transactionTime?: string;
}

export interface ConfirmCashInResult {
  txId: string;
  transactionId?: string;
  message?: string;
  toPhone?: string;
  amount?: string;
  errorCode?: string;
  transactionTime?: string;
  requestId?: string | number;
}

export interface MoncashRequestCashInParams {
  toAccountNumber: string; // Número de cuenta o teléfono en Haití (ej. 50940885084)
  amount: number; // Monto en HTG
  content?: string; // Concepto (por defecto si está vacío: "Voye atrave BenCash")
  requestId?: string | number; // Identificador único opcional
  timestamp?: number; // Epoch millis opcional
  privateKey?: string; // Llave privada opcional para sobreescritura en runtime
}

export interface MoncashRequestCashInResult {
  txId: string;
  requestId?: string | number;
  amount?: number | string;
  toAccountNumber?: string;
  status?: string;
  message?: string;
  rawResponse?: any;
}

export interface MoncashTransactionStatusResult {
  resultCode: string | number;
  status: string; // "Pending", "Success", "Failed", etc. Vacío ("") si no fue encontrada
  comment: string;
  txId: string;
  notFound?: boolean;
  rawResponse?: any;
}

export interface MoncashCancelResult {
  resultCode: string | number;
  comment: string;
  txId: string;
  success: boolean;
  rawResponse?: any;
}

/**
 * Cliente oficial para la pasarela de pagos "Deposit Channel API" de BenCash Group.
 *
 * Reglas de Autenticación y Seguridad:
 * 1. Header Obligatorio: 'skml' en TODAS las peticiones HTTP con el valor de la Private Key.
 * 2. Generación de Firmas HMAC-SHA256:
 *    - accessKey = privateKey + requestId
 *    - API 1: {accessKey=<accessKey>$requestId=<requestId>$toAccountNumber=<toAccountNumber>$amount=<amount>$content=<content>$timestamp=<timestamp>}
 *    - API 2: {accessKey=<accessKey>$requestId=<requestId>$txId=<txId>$verifyCode=<verifyCode>$isConfirm=<isConfirm>}
 *    - Se calcula usando crypto.createHmac('sha256', privateKey).digest('hex').toLowerCase()
 * 3. requestId Único:
 *    - Generado mediante combinación de marca de tiempo y aleatoriedad (${Date.now()}${Math.floor(100000 + Math.random() * 900000)})
 */
// Almacén en memoria para transacciones simuladas de MonCash en modo Sandbox/desarrollo
const mockMoncashStore = new Map<string, { status: string; comment: string; amount: number; toAccountNumber: string }>();

export class BencashClient {
  private baseUrl: string;
  private privateKey: string;

  constructor(config?: BencashClientConfig) {
    this.baseUrl = (
      config?.baseUrl ||
      process.env.BENCASH_BASE_URL ||
      BENCASH_DEFAULT_BASE_URL
    ).replace(/\/+$/, '');

    this.privateKey = (
      config?.privateKey ??
      process.env.BENCASH_PRIVATE_KEY ??
      ''
    ).trim();
  }

  /**
   * Obtiene la URL base configurada
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Verifica si el cliente cuenta con la clave privada configurada
   */
  public hasPrivateKey(): boolean {
    return this.privateKey.length > 0;
  }

  /**
   * Genera un identificador `requestId` 100% único por petición,
   * combinando la marca de tiempo actual (timestamp) con dígitos aleatorios.
   * Formato: `${Date.now()}${Math.floor(100000 + Math.random() * 900000)}`
   */
  public generateRequestId(): string {
    return `${Date.now()}${Math.floor(100000 + Math.random() * 900000)}`;
  }

  /**
   * Calcula la firma HMAC-SHA256 en formato hexadecimal minúsculas para API 1 (Request Cash-In).
   *
   * accessKey = privateKey + requestId
   * Cadena: {accessKey=<accessKey>$requestId=<requestId>$toAccountNumber=<toAccountNumber>$amount=<amount>$content=<content>$timestamp=<timestamp>}
   */
  public calculateRequestCashInSignature(params: {
    requestId: string | number;
    toAccountNumber: string;
    amount: number;
    content: string;
    timestamp: number;
    privateKey?: string;
  }): string {
    const key = (params.privateKey || this.privateKey).trim();
    if (!key) {
      throw new Error('La Clave Privada (BENCASH_PRIVATE_KEY) es requerida para calcular la firma de requestcashin.');
    }

    const cleanAccount = params.toAccountNumber.replace(/\D/g, '');
    const cleanContent = (params.content || 'remittance').trim();
    const accessKey = `${key}${params.requestId}`;

    const signString = `{accessKey=${accessKey}$requestId=${params.requestId}$toAccountNumber=${cleanAccount}$amount=${params.amount}$content=${cleanContent}$timestamp=${params.timestamp}}`;

    return crypto
      .createHmac('sha256', key)
      .update(signString, 'utf8')
      .digest('hex')
      .toLowerCase();
  }

  /**
   * Calcula la firma HMAC-SHA256 en formato hexadecimal minúsculas para API 2 (Confirm Cash-In).
   *
   * accessKey = privateKey + requestId
   * Cadena: {accessKey=<accessKey>$requestId=<requestId>$txId=<txId>$verifyCode=<verifyCode>$isConfirm=<isConfirm>}
   */
  public calculateConfirmCashInSignature(params: {
    requestId: string | number;
    txId: string;
    verifyCode?: string;
    isConfirm?: string;
    privateKey?: string;
  }): string {
    const key = (params.privateKey || this.privateKey).trim();
    if (!key) {
      throw new Error('La Clave Privada (BENCASH_PRIVATE_KEY) es requerida para calcular la firma de confirmcashin.');
    }

    const cleanTxId = String(params.txId).trim();
    const verifyCode = params.verifyCode || '1111';
    const isConfirm = params.isConfirm !== undefined ? String(params.isConfirm).trim() : '1';
    const accessKey = `${key}${params.requestId}`;

    const signString = `{accessKey=${accessKey}$requestId=${params.requestId}$txId=${cleanTxId}$verifyCode=${verifyCode}$isConfirm=${isConfirm}}`;

    return crypto
      .createHmac('sha256', key)
      .update(signString, 'utf8')
      .digest('hex')
      .toLowerCase();
  }

  /**
   * Resuelve el endpoint asegurando compatibilidad con prefijos de enrutamiento
   * ({baseUrl}/channel/{action} y {baseUrl}/api/channel/{action})
   */
  private resolveEndpoints(action: 'requestcashin' | 'confirmcashin' | 'balance'): string[] {
    const cleanBase = this.baseUrl.replace(/\/+$/, '');
    // Si ya contiene /channel o /api/channel
    if (cleanBase.endsWith('/channel')) {
      return [`${cleanBase}/${action}`, `${cleanBase.replace('/channel', '/api/channel')}/${action}`];
    }
    if (cleanBase.endsWith('/api/channel')) {
      return [`${cleanBase}/${action}`, `${cleanBase.replace('/api/channel', '/channel')}/${action}`];
    }
    if (cleanBase.endsWith('/api')) {
      return [`${cleanBase}/channel/${action}`, `${cleanBase.replace('/api', '')}/channel/${action}`];
    }
    return [
      `${cleanBase}/channel/${action}`,
      `${cleanBase}/api/channel/${action}`,
    ];
  }

  /**
   * Realiza una petición POST enviando el header obligatorio `skml: <privateKey>`
   * y reintentando automáticamente en caso de 404 de ruta o "requestid duplicated".
   */
  private async postWithSkml<T>(
    action: 'requestcashin' | 'confirmcashin',
    bodyData: any,
    regenerateIdOnDup?: () => { newRequestId: string | number; newSignature: string }
  ): Promise<BencashApiResponse<T>> {
    if (!this.privateKey) {
      throw new Error(
        'Clave privada no configurada. Configure BENCASH_PRIVATE_KEY en sus variables de entorno o mediante el constructor.'
      );
    }

    const endpoints = this.resolveEndpoints(action);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'skml': this.privateKey, // REGLA OBLIGATORIA 1
    };

    let lastError: any = null;

    for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex++) {
      const endpoint = endpoints[endpointIndex];
      try {
        let currentPayload = { ...bodyData };
        const MAX_RETRIES = 2;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(currentPayload),
          });

          // Si el endpoint no existe (404), intentar la siguiente variante de ruta
          if (res.status === 404 && endpointIndex < endpoints.length - 1) {
            break;
          }

          const rawText = await res.text();
          let parsed: any = null;
          try {
            parsed = JSON.parse(rawText);
          } catch {
            parsed = null;
          }

          const message = parsed?.resultMessage || parsed?.message || rawText;

          // Manejo robusto de colisión de RequestId duplicado
          if (
            message &&
            (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('duplicado')) &&
            attempt < MAX_RETRIES &&
            regenerateIdOnDup
          ) {
            const { newRequestId, newSignature } = regenerateIdOnDup();
            currentPayload = {
              ...currentPayload,
              requestId: newRequestId,
              signature: newSignature,
            };
            console.warn(`[BencashClient] RequestId duplicado detectado. Reintentando con nuevo ID: ${newRequestId}`);
            continue;
          }

          if (parsed && (parsed.resultCode === '200' || parsed.resultCode === 200 || parsed.result)) {
            return {
              resultCode: '200',
              resultMessage: parsed.resultMessage || 'Success',
              result: parsed.result,
              requestId: currentPayload.requestId,
              isSandbox: false,
            };
          }

          return {
            resultCode: String(parsed?.resultCode || res.status),
            resultMessage: message || `Error HTTP ${res.status} de BenCash Group`,
            message,
            requestId: currentPayload.requestId,
            isSandbox: false,
          };
        }
      } catch (err: any) {
        lastError = err;
        if (endpointIndex < endpoints.length - 1) {
          continue;
        }
      }
    }

    return {
      resultCode: '500',
      resultMessage: `Error de conexión con BenCash API: ${lastError?.message || 'Fallo de red'}`,
      message: lastError?.message,
      requestId: bodyData.requestId,
    };
  }

  /**
   * API 1 (Request Cash-In): POST a {baseUrl}/channel/requestcashin
   *
   * Formato de firma exacto:
   * {accessKey=<accessKey>$requestId=<requestId>$toAccountNumber=<toAccountNumber>$amount=<amount>$content=<content>$timestamp=<timestamp>}
   * Header: skml: <privateKey>
   */
  public async requestCashIn(params: RequestCashInParams): Promise<BencashApiResponse<RequestCashInResult>> {
    const toAccountNumber = params.toAccountNumber.replace(/\D/g, '');
    const amount = Number(params.amount);
    const content = (params.content || 'remittance').trim();
    const timestamp = params.timestamp || Date.now();
    let requestId = params.requestId ?? this.generateRequestId();

    // Si no cuenta con PrivateKey configurada, retornar simulación para no bloquear entornos dev
    if (!this.hasPrivateKey()) {
      return this.mockRequestCashIn(toAccountNumber, amount, content, requestId);
    }

    let signature = this.calculateRequestCashInSignature({
      requestId,
      toAccountNumber,
      amount,
      content,
      timestamp,
    });

    const bodyData = {
      requestId,
      toAccountNumber,
      amount,
      content,
      timestamp,
      signature,
    };

    return this.postWithSkml<RequestCashInResult>(
      'requestcashin',
      bodyData,
      () => {
        requestId = this.generateRequestId();
        signature = this.calculateRequestCashInSignature({
          requestId,
          toAccountNumber,
          amount,
          content,
          timestamp,
        });
        return { newRequestId: requestId, newSignature: signature };
      }
    );
  }

  /**
   * API 2 (Confirm Cash-In): POST a {baseUrl}/channel/confirmcashin
   *
   * Formato de firma exacto:
   * {accessKey=<accessKey>$requestId=<requestId>$txId=<txId>$verifyCode=<verifyCode>$isConfirm=<isConfirm>}
   * Header: skml: <privateKey>
   */
  public async confirmCashIn(params: ConfirmCashInParams): Promise<BencashApiResponse<ConfirmCashInResult>> {
    const txId = String(params.txId).trim();
    const verifyCode = params.verifyCode || '1111';
    const isConfirm = params.isConfirm !== undefined ? String(params.isConfirm).trim() : '1';
    const requestId = params.requestId ?? this.generateRequestId();

    if (!txId) {
      return {
        resultCode: '400',
        resultMessage: 'El txId retornado por API 1 (requestcashin) es obligatorio.',
      };
    }

    // Si no cuenta con PrivateKey configurada, retornar simulación sandbox
    if (!this.hasPrivateKey()) {
      return this.mockConfirmCashIn(txId, requestId);
    }

    const signature = this.calculateConfirmCashInSignature({
      requestId,
      txId,
      verifyCode,
      isConfirm,
    });

    const bodyData = {
      requestId,
      txId,
      verifyCode,
      isConfirm,
      signature,
    };

    return this.postWithSkml<ConfirmCashInResult>('confirmcashin', bodyData);
  }

  /**
   * Flujo Completo: Solicita y auto-confirma el depósito en un solo paso
   */
  public async sendCashInFullFlow(params: RequestCashInParams & { verifyCode?: string }): Promise<{
    requestResult: BencashApiResponse<RequestCashInResult>;
    confirmResult?: BencashApiResponse<ConfirmCashInResult>;
    isSuccess: boolean;
    txId?: string;
  }> {
    const reqRes = await this.requestCashIn(params);

    if (reqRes.resultCode !== '200' && reqRes.resultCode !== 200) {
      return { requestResult: reqRes, isSuccess: false };
    }

    const txId = reqRes.result?.txId;
    if (!txId) {
      return { requestResult: reqRes, isSuccess: false };
    }

    const confRes = await this.confirmCashIn({
      txId,
      requestId: reqRes.requestId || params.requestId,
      verifyCode: params.verifyCode || '1111',
      isConfirm: '1',
    });

    const isSuccess = confRes.resultCode === '200' || confRes.resultCode === 200;

    return {
      requestResult: reqRes,
      confirmResult: confRes,
      isSuccess,
      txId,
    };
  }

  // Métodos de Sandbox / Fallback cuando no hay PrivateKey configurada
  private mockRequestCashIn(
    toAccountNumber: string,
    amount: number,
    content: string,
    requestId: string | number
  ): BencashApiResponse<RequestCashInResult> {
    const mockTxId = crypto.randomBytes(16).toString('hex');
    return {
      resultCode: '200',
      resultMessage: 'Success (Modo Sandbox)',
      result: {
        amount: amount.toFixed(1),
        fee: '0.00 HTG',
        totalAmount: `${amount.toFixed(2)} HTG`,
        receiver: {
          accountId: '99281726',
          accountNumber: toAccountNumber,
          accountName: 'Beneficiario Haití (Modo Simulado)',
          accountCurrency: 'HTG',
        },
        txId: mockTxId,
        requestId,
      },
      requestId,
      isSandbox: true,
    };
  }

  private mockConfirmCashIn(txId: string, requestId: string | number): BencashApiResponse<ConfirmCashInResult> {
    const mockTxNum = `${new Date().getFullYear().toString().slice(-2)}${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    return {
      resultCode: '200',
      resultMessage: 'Success (Modo Sandbox)',
      result: {
        txId,
        transactionId: mockTxNum,
        message: 'Deposit confirmed',
        amount: 'Confirmed',
        errorCode: '00000',
        transactionTime: new Date().toLocaleString(),
        requestId,
      },
      requestId,
      isSandbox: true,
    };
  }

  /**
   * Calcula la firma HMAC-SHA256 en minúsculas para MonCash Request Cash-In
   *
   * Formato oficial de la cadena:
   * {accessKey=<skml><requestId>$requestId=<requestId>$toAccountNumber=<toAccountNumber>$amount=<amount>$content=<content>$timestamp=<timestamp>}
   * (Si content es nulo o vacío, se utiliza el valor por defecto: "Voye atrave BenCash")
   */
  public calculateMoncashRequestCashInSignature(params: {
    requestId: string | number;
    toAccountNumber: string;
    amount: number;
    content?: string;
    timestamp: number;
    privateKey?: string;
  }): string {
    const key = (params.privateKey || this.privateKey).trim();
    if (!key) {
      throw new Error('La Clave Privada (skml / BENCASH_PRIVATE_KEY) es requerida para calcular la firma de MonCash.');
    }

    const cleanAccount = params.toAccountNumber.replace(/\D/g, '');
    const cleanContent =
      params.content && params.content.trim().length > 0
        ? params.content.trim()
        : 'Voye atrave BenCash';
    const accessKey = `${key}${params.requestId}`;

    const signString = `{accessKey=${accessKey}$requestId=${params.requestId}$toAccountNumber=${cleanAccount}$amount=${params.amount}$content=${cleanContent}$timestamp=${params.timestamp}}`;

    return crypto
      .createHmac('sha256', key)
      .update(signString, 'utf8')
      .digest('hex')
      .toLowerCase();
  }

  /**
   * Resuelve el endpoint de MonCash garantizando el prefijo operativo /api/channel/moncash/{action}
   */
  private resolveMoncashEndpoint(
    action: 'requestcashin' | 'transactionstatus' | 'cancel',
    queryParams?: Record<string, string>
  ): string {
    let cleanBase = this.baseUrl.replace(/\/+$/, '');
    // Eliminar cualquier acción residual si se ingresó una URL de endpoint completa
    cleanBase = cleanBase.replace(/\/(requestcashin|confirmcashin|transactionstatus|cancel)\/?$/, '');
    let path = '';

    if (cleanBase.endsWith('/api/channel/moncash')) {
      path = `${cleanBase}/${action}`;
    } else if (cleanBase.endsWith('/channel/moncash')) {
      path = `${cleanBase.replace('/channel/moncash', '/api/channel/moncash')}/${action}`;
    } else if (cleanBase.endsWith('/api/channel')) {
      path = `${cleanBase}/moncash/${action}`;
    } else if (cleanBase.endsWith('/channel')) {
      path = `${cleanBase.replace('/channel', '/api/channel')}/moncash/${action}`;
    } else if (cleanBase.endsWith('/api')) {
      path = `${cleanBase}/channel/moncash/${action}`;
    } else {
      path = `${cleanBase}/api/channel/moncash/${action}`;
    }

    if (queryParams && Object.keys(queryParams).length > 0) {
      const search = new URLSearchParams(queryParams).toString();
      return `${path}?${search}`;
    }
    return path;
  }

  /**
   * MonCash - A) Solicitud de Cash-in
   * POST /api/channel/moncash/requestcashin
   *
   * Headers: 'Content-Type: application/json', 'skml: <privateKey>'
   * Body JSON: requestId (int), toAccountNumber (string 509XXXXXXXX), amount (number), content (string), timestamp (int10), signature (string).
   * Respuesta esperada: resultCode: "200", message: "Success. Waiting validation.", y extraer `result.txId`.
   */
  public async moncashRequestCashIn(params: {
    requestId?: string | number;
    toAccountNumber: string;
    amount: number;
    content?: string;
    timestamp?: number;
    privateKey?: string;
  }): Promise<BencashApiResponse<MoncashRequestCashInResult>> {
    const rawAccount = params.toAccountNumber.replace(/\D/g, '');
    const toAccountNumber = rawAccount.startsWith('509')
      ? rawAccount
      : rawAccount.length === 8
      ? `509${rawAccount}`
      : rawAccount;

    const amount = Number(params.amount);
    const content =
      params.content && params.content.trim().length > 0
        ? params.content.trim()
        : 'Test payment';

    // Timestamp UNIX en segundos (10 dígitos) según especificación oficial de BenCash MonCash
    let timestamp = params.timestamp ? Number(params.timestamp) : Math.floor(Date.now() / 1000);
    if (timestamp > 10000000000) {
      timestamp = Math.floor(timestamp / 1000);
    }

    // Normalizar requestId a entero positivo de 32 bits (Int32) requerido por BenCash ASP.NET Core
    let requestIdNum: number;
    if (params.requestId !== undefined && params.requestId !== null && String(params.requestId).trim().length > 0) {
      const parsed = parseInt(String(params.requestId).replace(/\D/g, ''), 10);
      requestIdNum = parsed > 0 && parsed <= 2147483647 ? parsed : Math.floor(100000 + Math.random() * 900000);
    } else {
      requestIdNum = Math.floor(100000 + Math.random() * 900000);
    }

    const privateKey = (params.privateKey || this.privateKey).trim();

    if (!privateKey) {
      return this.mockMoncashRequestCashIn(toAccountNumber, amount, content, requestIdNum);
    }

    const endpoint = this.resolveMoncashEndpoint('requestcashin');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      skml: privateKey,
    };

    const MAX_RETRIES = 3;
    let lastErrorResult: BencashApiResponse<MoncashRequestCashInResult> | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // En caso de duplicidad de requestId en BenCash, regenerar uno nuevo
        requestIdNum = Math.floor(100000 + Math.random() * 900000);
      }

      const signature = this.calculateMoncashRequestCashInSignature({
        requestId: requestIdNum,
        toAccountNumber,
        amount,
        content,
        timestamp,
        privateKey,
      });

      const bodyData = {
        requestId: requestIdNum,
        toAccountNumber,
        amount,
        content,
        timestamp,
        signature,
      };

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyData),
        });

        const rawText = await res.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          parsed = null;
        }

        const rawResultCode = parsed?.resultCode ?? res.status;
        const resultCodeStr = String(rawResultCode);
        const isSuccess = resultCodeStr === '200' || resultCodeStr === '0';
        const message = parsed?.message || parsed?.resultMessage || rawText;

        // Si ocurre colisión de RequestId duplicado (error 503 con 'duplicate'), reintentar automáticamente
        if (
          !isSuccess &&
          message &&
          (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('duplicado')) &&
          attempt < MAX_RETRIES - 1
        ) {
          console.warn(`[Bencash MonCash] RequestId duplicado (${requestIdNum}). Reintentando con nuevo ID...`);
          continue;
        }

        // Extraer el campo txId de result.txId o result directo
        const extractedTxId =
          parsed?.result?.txId ||
          parsed?.txId ||
          parsed?.data?.txId ||
          '';

        if (isSuccess) {
          return {
            resultCode: '200',
            resultMessage: message || 'Success. Waiting validation.',
            message: message || 'Success. Waiting validation.',
            result: {
              txId: extractedTxId,
              requestId: requestIdNum,
              amount,
              toAccountNumber,
              status: 'Pending',
              message: message || 'Success. Waiting validation.',
              rawResponse: parsed,
            },
            requestId: requestIdNum,
            isSandbox: false,
          };
        }

        let userFriendlyMsg = message;
        if (resultCodeStr === '400') {
          userFriendlyMsg = `BenCash rechazó el número (${toAccountNumber}). Verifique que la cuenta MonCash esté activa y registrada en Digicel Haití.`;
        } else if (resultCodeStr === '503') {
          userFriendlyMsg = `Validación BenCash (503): ${message || 'Clave privada skml inválida o saldo insuficiente'}.`;
        }

        lastErrorResult = {
          resultCode: resultCodeStr,
          resultMessage: userFriendlyMsg || `Error HTTP ${res.status} de MonCash API`,
          message: userFriendlyMsg || message,
          result: parsed?.result ? { txId: extractedTxId, ...parsed.result } : undefined,
          requestId: requestIdNum,
          isSandbox: false,
        };
        break;
      } catch (err: any) {
        lastErrorResult = {
          resultCode: '500',
          resultMessage: `Error de red al conectar con MonCash API: ${err?.message || 'Fallo de red'}`,
          message: err?.message,
          requestId: requestIdNum,
          isSandbox: false,
        };
        break;
      }
    }

    return (
      lastErrorResult || {
        resultCode: '500',
        resultMessage: 'Error desconocido al procesar la solicitud de MonCash.',
        requestId: requestIdNum,
        isSandbox: false,
      }
    );
  }

  /**
   * MonCash - B) Consulta de Estado de Transacción
   * POST /api/channel/moncash/transactionstatus?txid=<txId>
   *
   * Método HTTP: POST sin body.
   * Query Parameter: txid=<txId> (debe usar el txId devuelto por requestcashin, no el requestId).
   * Headers: 'skml: <privateKey>'.
   * Respuesta: resultCode (200), status ("Pending", etc.), comment. Si status viene vacío (""), tratarlo como transacción no encontrada.
   */
  public async moncashTransactionStatus(
    txId: string,
    options?: { privateKey?: string }
  ): Promise<MoncashTransactionStatusResult> {
    const cleanTxId = String(txId || '').trim();
    if (!cleanTxId) {
      return {
        resultCode: '400',
        status: '',
        comment: 'El parámetro txId es obligatorio.',
        txId: '',
        notFound: true,
      };
    }

    const privateKey = (options?.privateKey || this.privateKey).trim();
    if (!privateKey) {
      return this.mockMoncashTransactionStatus(cleanTxId);
    }

    const endpoint = this.resolveMoncashEndpoint('transactionstatus', { txid: cleanTxId });
    const headers: Record<string, string> = {
      skml: privateKey,
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
      });

      const rawText = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = null;
      }

      const rawStatus =
        parsed?.status !== undefined
          ? String(parsed.status).trim()
          : parsed?.result?.status !== undefined
          ? String(parsed.result.status).trim()
          : '';

      const comment = parsed?.comment || parsed?.resultMessage || parsed?.message || '';

      // Regla: Si status viene vacío (""), tratarlo como transacción no encontrada.
      if (rawStatus === '') {
        return {
          resultCode: parsed?.resultCode !== undefined ? parsed.resultCode : res.ok ? 200 : res.status,
          status: '',
          comment: comment || 'Transacción no encontrada.',
          txId: cleanTxId,
          notFound: true,
          rawResponse: parsed || rawText,
        };
      }

      return {
        resultCode: parsed?.resultCode !== undefined ? parsed.resultCode : 200,
        status: rawStatus,
        comment,
        txId: cleanTxId,
        notFound: false,
        rawResponse: parsed,
      };
    } catch (err: any) {
      return {
        resultCode: '500',
        status: '',
        comment: `Error al consultar estado de transacción MonCash: ${err?.message || 'Fallo de red'}`,
        txId: cleanTxId,
        notFound: false,
      };
    }
  }

  /**
   * MonCash - C) Cancelación de Transacción
   * POST /api/channel/moncash/cancel?txid=<txId>
   *
   * Solo aplica si la transacción continúa en estado "Pending".
   * Método HTTP: POST sin body.
   * Query Parameter: txid=<txId>.
   * Headers: 'skml: <privateKey>'.
   * Respuesta esperada: resultCode: 200 y comment: "Transaction canceled.".
   */
  public async moncashCancel(
    txId: string,
    options?: { privateKey?: string; checkPendingFirst?: boolean }
  ): Promise<MoncashCancelResult> {
    const cleanTxId = String(txId || '').trim();
    if (!cleanTxId) {
      return {
        resultCode: '400',
        comment: 'El parámetro txId es obligatorio.',
        txId: '',
        success: false,
      };
    }

    const privateKey = (options?.privateKey || this.privateKey).trim();

    // Verificación preventiva opcional si checkPendingFirst es true
    if (options?.checkPendingFirst) {
      const statusRes = await this.moncashTransactionStatus(cleanTxId, { privateKey });
      if (statusRes.notFound || !statusRes.status) {
        return {
          resultCode: '404',
          comment: 'No se puede cancelar: Transacción no encontrada.',
          txId: cleanTxId,
          success: false,
        };
      }
      if (statusRes.status.toLowerCase() !== 'pending') {
        return {
          resultCode: '400',
          comment: `Solo aplica si la transacción continúa en estado "Pending". Estado actual: "${statusRes.status}".`,
          txId: cleanTxId,
          success: false,
        };
      }
    }

    if (!privateKey) {
      return this.mockMoncashCancel(cleanTxId);
    }

    const endpoint = this.resolveMoncashEndpoint('cancel', { txid: cleanTxId });
    const headers: Record<string, string> = {
      skml: privateKey,
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
      });

      const rawText = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = null;
      }

      const comment = parsed?.comment || parsed?.resultMessage || parsed?.message || rawText;
      const rawResultCode = parsed?.resultCode ?? (res.ok ? 200 : res.status);
      const isSuccess = rawResultCode === 200 || rawResultCode === '200';

      return {
        resultCode: rawResultCode,
        comment: comment || (isSuccess ? 'Transaction canceled.' : 'Fallo en la cancelación de MonCash'),
        txId: cleanTxId,
        success: isSuccess,
        rawResponse: parsed,
      };
    } catch (err: any) {
      return {
        resultCode: '500',
        comment: `Error al cancelar transacción MonCash: ${err?.message || 'Fallo de red'}`,
        txId: cleanTxId,
        success: false,
      };
    }
  }

  // Métodos Sandbox para MonCash
  private mockMoncashRequestCashIn(
    toAccountNumber: string,
    amount: number,
    content: string,
    requestId: string | number
  ): BencashApiResponse<MoncashRequestCashInResult> {
    const mockTxId = `mc_${crypto.randomBytes(12).toString('hex')}`;
    mockMoncashStore.set(mockTxId, {
      status: 'Pending',
      comment: 'Success. Waiting validation.',
      amount,
      toAccountNumber,
    });

    return {
      resultCode: '200',
      resultMessage: 'Success. Waiting validation.',
      message: 'Success. Waiting validation.',
      result: {
        txId: mockTxId,
        requestId,
        amount,
        toAccountNumber,
        status: 'Pending',
        message: 'Success. Waiting validation.',
      },
      requestId,
      isSandbox: true,
    };
  }

  private mockMoncashTransactionStatus(txId: string): MoncashTransactionStatusResult {
    const record = mockMoncashStore.get(txId);
    if (!record) {
      return {
        resultCode: 200,
        status: '',
        comment: 'Transacción no encontrada.',
        txId,
        notFound: true,
      };
    }

    return {
      resultCode: 200,
      status: record.status,
      comment: record.comment,
      txId,
      notFound: false,
    };
  }

  private mockMoncashCancel(txId: string): MoncashCancelResult {
    const record = mockMoncashStore.get(txId);
    if (!record) {
      return {
        resultCode: 404,
        comment: 'Transacción no encontrada.',
        txId,
        success: false,
      };
    }

    if (record.status !== 'Pending') {
      return {
        resultCode: 400,
        comment: `Solo aplica si la transacción continúa en estado "Pending". Estado actual: "${record.status}".`,
        txId,
        success: false,
      };
    }

    record.status = 'Canceled';
    record.comment = 'Transaction canceled.';

    return {
      resultCode: 200,
      comment: 'Transaction canceled.',
      txId,
      success: true,
    };
  }
}

/**
 * Instancia singleton para uso rápido en API routes y Cloud Functions
 */
let defaultClientInstance: BencashClient | null = null;

export function getBencashClient(config?: BencashClientConfig): BencashClient {
  if (config) {
    return new BencashClient(config);
  }
  if (!defaultClientInstance) {
    defaultClientInstance = new BencashClient();
  }
  return defaultClientInstance;
}

export default BencashClient;
