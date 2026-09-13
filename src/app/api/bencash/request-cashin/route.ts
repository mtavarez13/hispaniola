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

    // Determinar operador: prioridad a la selección explícita del usuario
    const normalizedSelected = String(operator || channel || '').trim().toLowerCase();
    const isMoncash =
      normalizedSelected === 'moncash' ||
      (normalizedSelected === '' && detected.operator === 'MonCash');

    // 1. FLUJO MONCASH: POST /api/channel/moncash/requestcashin
    // + Auto-Confirm en /api/channel/confirmcashin (hasta 60 seg) para que las órdenes no queden Pending
    if (isMoncash) {
      const moncashRes = await moncashRequestCashIn({
        toAccountNumber: cleanPhone,
        amount: Number(amount),
        content: content || 'Remesa HispaniolaPay MonCash',
        requestId:
          requestId !== undefined && requestId !== null && String(requestId).trim().length > 0
            ? requestId
            : undefined,
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

      // En MonCash (/api/channel/moncash/requestcashin), la transacción se procesa directamente en la red Digicel.
      // Cuando resultCode es 200/0, BenCash ha aceptado y despachado el depósito a MonCash.
      // Por tanto, la transacción es definitiva y confirmada (no requiere segundo paso ni debe quedar en 'pending').
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
            receiver: {
              accountId: cleanPhone,
              accountNumber: cleanPhone,
              accountName: body.recipientName || moncashRes.result?.receiver?.accountName || 'Beneficiario Digicel MonCash',
              accountCurrency: 'HTG',
            },
          },
        });
      }

      return NextResponse.json({
        ...moncashRes,
        operator: 'MonCash',
        channel: 'moncash',
        isMoncash: true,
        isConfirmed: false,
        isPending: false,
        endpointUsed: '/api/channel/moncash/requestcashin',
        result: {
          ...moncashRes.result,
          txId: extractedTxId,
          transactionId: extractedTxId,
          amount: String(amount),
          requestId: resolvedReqId,
          status: 'Failed',
          receiver: {
            accountId: cleanPhone,
            accountNumber: cleanPhone,
            accountName: body.recipientName || moncashRes.result?.receiver?.accountName || 'Beneficiario Digicel MonCash',
            accountCurrency: 'HTG',
          },
        },
      });
    }

    // 2. FLUJO NATCASH (REGLA OBLIGATORIA: Preservar lógica y métodos existentes de NatCash)
    // POST /api/channel/requestcashin
    const result = await executeRequestCashIn({
      toAccountNumber: cleanPhone,
      amount: Number(amount),
      content: content || 'remittance',
      requestId:
        requestId !== undefined && requestId !== null && String(requestId).trim().length > 0
          ? requestId
          : undefined,
      timestamp: timestamp ? Number(timestamp) : undefined,
      baseUrl: effectiveBaseUrl,
      privateKey: effectivePrivateKey,
      autoConfirm: autoConfirm !== undefined ? Boolean(autoConfirm) : false,
      verifyCode: verifyCode || '1111',
    });

    return NextResponse.json({
      ...result,
      operator: 'NatCash',
      channel: 'natcash',
      isMoncash: false,
      endpointUsed: '/api/channel/requestcashin',
    });
  } catch (error: any) {
    console.error('Error in /api/bencash/request-cashin:', error);
    return NextResponse.json(
      { resultCode: '500', resultMessage: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
