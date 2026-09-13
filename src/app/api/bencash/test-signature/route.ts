import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  bencashService,
  sanitizeRequestId,
  generateUniqueRequestId,
  formatHaitiPhoneNumber,
  resolveChannelEndpoint,
  BencashClient,
} from '@/lib/bencash/service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawKey = body.privateKey || process.env.BENCASH_PRIVATE_KEY || '';
    const privateKey = rawKey.trim();
    const rawBaseUrl = (body.baseUrl || process.env.BENCASH_BASE_URL || 'https://reseller.test.bencashgroup.com').trim();
    const requestId = sanitizeRequestId(body.requestId || generateUniqueRequestId());
    const toAccountNumber = formatHaitiPhoneNumber(body.toAccountNumber || '50940885084');
    const amount = Number(body.amount) || 10;
    const content = (body.content || 'remittance').trim();
    const timestamp = Number(body.timestamp) || Date.now();
    const txId = (body.txId || 'test_tx_001').trim();
    const isConfirm = '1';
    const verifyCode = '1111';

    if (!privateKey) {
      return NextResponse.json({
        ok: false,
        error: 'PrivateKey no configurada',
        message: 'Debe ingresar o configurar la Private Key oficial de Bencash para generar firmas.',
      }, { status: 400 });
    }

    // Instancia de BencashClient oficial
    const client = new BencashClient({ baseUrl: rawBaseUrl, privateKey });
    const officialRequestSig = client.calculateRequestCashInSignature({
      requestId,
      toAccountNumber,
      amount,
      content,
      timestamp,
    });
    const officialConfirmSig = client.calculateConfirmCashInSignature({
      requestId,
      txId,
      verifyCode,
      isConfirm,
    });

    // 1. Probar validación de la llave en BenCash mediante el endpoint de Balance
    let keyVerification: any = null;
    try {
      const balanceEndpoint = resolveChannelEndpoint(rawBaseUrl, 'balance');
      const balanceRes = await fetch(balanceEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'skml': privateKey,
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(5000),
      });

      const rawText = await balanceRes.text();
      let parsed = null;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = { raw: rawText };
      }

      keyVerification = {
        endpoint: balanceEndpoint,
        httpStatus: balanceRes.status,
        authorized: balanceRes.ok && parsed?.resultCode !== '503',
        response: parsed,
      };
    } catch (err: any) {
      keyVerification = {
        error: err.message,
        authorized: false,
      };
    }

    // 2. Generar variantes de firmas para API 1 (requestcashin)
    const accessKey = `${privateKey}${requestId}`;
    const reqCanonicalWithBraces = `{accessKey=${accessKey}$requestId=${requestId}$toAccountNumber=${toAccountNumber}$amount=${amount}$content=${content}$timestamp=${timestamp}}`;
    const reqCanonicalWithoutBraces = `accessKey=${accessKey}$requestId=${requestId}$toAccountNumber=${toAccountNumber}$amount=${amount}$content=${content}$timestamp=${timestamp}`;

    const requestCashInVariants = [
      {
        id: 'lower_braces',
        name: 'Minúsculas con llaves (Fórmula Oficial BencashClient)',
        recommended: true,
        canonicalString: reqCanonicalWithBraces,
        signature: officialRequestSig,
      },
      {
        id: 'upper_braces_standard',
        name: 'Mayúsculas con llaves (.NET C# Estándar)',
        recommended: false,
        canonicalString: reqCanonicalWithBraces,
        signature: crypto.createHmac('sha256', privateKey).update(reqCanonicalWithBraces, 'utf8').digest('hex').toUpperCase(),
      },
      {
        id: 'upper_nobraces',
        name: 'Mayúsculas sin llaves',
        recommended: false,
        canonicalString: reqCanonicalWithoutBraces,
        signature: crypto.createHmac('sha256', privateKey).update(reqCanonicalWithoutBraces, 'utf8').digest('hex').toUpperCase(),
      },
    ];

    // 3. Generar variantes de firmas para API 2 (confirmcashin)
    const confirmCanonicalWithVerify = `{accessKey=${accessKey}$requestId=${requestId}$txId=${txId}$verifyCode=${verifyCode}$isConfirm=${isConfirm}}`;
    const confirmCanonicalDto = `{accessKey=${accessKey}$requestId=${requestId}$txId=${txId}$isConfirm=${isConfirm}}`;

    const confirmCashInVariants = [
      {
        id: 'legacy_lower_with_verify',
        name: 'Fórmula Oficial con verifyCode (Minúsculas - BencashClient)',
        recommended: true,
        canonicalString: confirmCanonicalWithVerify,
        bodyFields: ['requestId', 'txId', 'verifyCode', 'isConfirm', 'signature'],
        signature: officialConfirmSig,
      },
      {
        id: 'dto_lower_no_verify',
        name: 'Swagger DTO Oficial (Sin verifyCode, Minúsculas)',
        recommended: false,
        canonicalString: confirmCanonicalDto,
        bodyFields: ['requestId', 'txId', 'isConfirm', 'signature'],
        signature: crypto.createHmac('sha256', privateKey).update(confirmCanonicalDto, 'utf8').digest('hex').toLowerCase(),
      },
      {
        id: 'dto_upper_no_verify',
        name: 'Swagger DTO Oficial (Sin verifyCode, Mayúsculas)',
        recommended: false,
        canonicalString: confirmCanonicalDto,
        bodyFields: ['requestId', 'txId', 'isConfirm', 'signature'],
        signature: crypto.createHmac('sha256', privateKey).update(confirmCanonicalDto, 'utf8').digest('hex').toUpperCase(),
      },
    ];

    return NextResponse.json({
      ok: true,
      requestId,
      privateKeyMasked: privateKey.length > 8 ? `${privateKey.slice(0, 4)}...${privateKey.slice(-4)}` : '***',
      bencashClient: {
        officialRequestSignature: officialRequestSig,
        officialConfirmSignature: officialConfirmSig,
      },
      keyVerification,
      requestCashInVariants,
      confirmCashInVariants,
      diagnosticTips: [
        'El servidor BenCash utiliza ASP.NET Core (.NET 7/8). La función Convert.ToHexString() de .NET produce hashes en MAYÚSCULAS.',
        'El esquema Swagger oficial (BenCashConfirmCashInRequestDTO) define que confirmcashin NO acepta verifyCode en el payload.',
        'El motor de BencashDepositService ahora prueba automáticamente las variantes para asegurar que ninguna transacción falle con "invalid signature".',
      ],
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message,
    }, { status: 500 });
  }
}
