import { NextRequest, NextResponse } from 'next/server';
import {
  executeRequestCashIn,
  executeConfirmCashIn,
  moncashRequestCashIn,
  detectHaitiOperator,
  formatHaitiPhoneNumber,
  rememberTxRequestId,
  BencashDepositService,
} from '@/lib/bencash/service';
import { getBencashServerConfig, saveBencashServerConfig } from '@/lib/server-config';

export const dynamic = 'force-dynamic';

/**
 * Proxy alias for /api/channel/requestcashin
 * Permite que llamadas al endpoint canónico de BenCash /api/channel/requestcashin
 * se procesen con la misma firma criptográfica y persistencia de credenciales.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const headerKey = req.headers.get('x-bencash-key') || req.headers.get('skml') || '';
    const headerBaseUrl = req.headers.get('x-bencash-base-url') || '';
    const serverConfig = getBencashServerConfig();

    const effectivePrivateKey = (body.privateKey || headerKey || serverConfig.privateKey || process.env.BENCASH_PRIVATE_KEY || '').trim();
    const effectiveBaseUrl = (body.baseUrl || headerBaseUrl || serverConfig.baseUrl || process.env.BENCASH_BASE_URL || 'https://reseller.test.bencashgroup.com').trim();

    if (effectivePrivateKey) {
      saveBencashServerConfig({ privateKey: effectivePrivateKey, baseUrl: effectiveBaseUrl });
      BencashDepositService.setRuntimeCredentials(effectiveBaseUrl, effectivePrivateKey);
    }

    const {
      toAccountNumber,
      amount,
      content,
      requestId,
      timestamp,
      autoConfirm,
      verifyCode,
      operator,
      channel,
    } = body;

    if (!toAccountNumber) {
      return NextResponse.json(
        { resultCode: '400', resultMessage: 'El número de cuenta o teléfono de Haití es requerido' },
        { status: 400 }
      );
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { resultCode: '400', resultMessage: 'El monto en HTG debe ser mayor a 0' },
        { status: 400 }
      );
    }

    const cleanPhone = formatHaitiPhoneNumber(String(toAccountNumber));
    const detected = detectHaitiOperator(cleanPhone);
    const normalizedSelected = String(operator || channel || '').trim().toLowerCase();
    const isMoncash =
      normalizedSelected === 'moncash' ||
      (normalizedSelected === '' && detected.operator === 'MonCash');

    if (isMoncash) {
      const moncashRes = await moncashRequestCashIn({
        toAccountNumber: cleanPhone,
        amount: Number(amount),
        content: content || 'Remesa HispaniolaPay MonCash',
        requestId: requestId !== undefined && requestId !== null && String(requestId).trim().length > 0 ? requestId : undefined,
        timestamp: timestamp ? Number(timestamp) : undefined,
        baseUrl: effectiveBaseUrl,
        privateKey: effectivePrivateKey,
      });

      const isSuccess = String(moncashRes.resultCode) === '200' || String(moncashRes.resultCode) === '0';
      const extractedTxId = moncashRes.result?.txId || '';
      const resolvedReqId = moncashRes.requestId || requestId;

      if (extractedTxId && resolvedReqId) {
        rememberTxRequestId(extractedTxId, Number(resolvedReqId), {
          operator: 'MonCash',
          toAccountNumber: cleanPhone,
          recipientName: body.recipientName || 'Beneficiario Digicel MonCash',
        });
      }

      if (isSuccess) {
        return NextResponse.json({
          resultCode: '200',
          resultMessage: 'Depósito MonCash acreditado y confirmado exitosamente en red Digicel',
          message: 'Depósito MonCash acreditado y confirmado exitosamente en red Digicel',
          operator: 'MonCash',
          channel: 'moncash',
          isMoncash: true,
          isConfirmed: true,
          isPending: false,
          endpointUsed: '/api/channel/moncash/requestcashin',
          requestId: resolvedReqId,
          result: {
            ...moncashRes.result,
            txId: extractedTxId,
            transactionId: extractedTxId,
            amount: String(amount),
            requestId: resolvedReqId,
            status: 'Confirmed',
          },
        });
      }

      return NextResponse.json(moncashRes);
    }

    // Flujo NatCash / Natcom
    const result = await executeRequestCashIn({
      toAccountNumber: cleanPhone,
      amount: Number(amount),
      content: content || 'Remesa HispaniolaPay NatCash',
      requestId: requestId !== undefined && requestId !== null && String(requestId).trim().length > 0 ? requestId : undefined,
      timestamp: timestamp ? Number(timestamp) : undefined,
      baseUrl: effectiveBaseUrl,
      privateKey: effectivePrivateKey,
      autoConfirm: autoConfirm !== undefined ? Boolean(autoConfirm) : true,
      verifyCode: verifyCode || '1111',
      recipientName: body.recipientName,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/channel/requestcashin:', error);
    return NextResponse.json(
      { resultCode: '500', resultMessage: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
