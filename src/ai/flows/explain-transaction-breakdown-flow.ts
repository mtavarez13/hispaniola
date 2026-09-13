'use server';

import { GoogleGenAI } from '@google/genai';

export interface ExplainTransactionBreakdownInput {
  amountSent: number;
  feePercentage: number;
  feeAmount?: number;
  amountAfterFee?: number;
  exchangeRate: number;
  destinationCurrency: string;
  amountReceived?: number;
  isUSD?: boolean;
}

export interface ExplainTransactionBreakdownOutput {
  explanation: string;
}

export async function explainTransactionBreakdown(
  input: ExplainTransactionBreakdownInput
): Promise<ExplainTransactionBreakdownOutput> {
  const feeAmount = input.amountSent * (input.feePercentage / 100);
  const amountAfterFee = input.amountSent - feeAmount;
  const amountReceived = amountAfterFee * input.exchangeRate;
  const isUSD = input.destinationCurrency === 'USD';

  // Format default deterministic fallback explanation
  const feeAmountStr = feeAmount.toFixed(2);
  const amountAfterFeeStr = amountAfterFee.toFixed(2);
  const receivedStr = amountReceived.toFixed(2);

  let defaultExplanation = `Desglose de la transacción:\n• Monto enviado: $${input.amountSent.toFixed(2)} USD\n• Comisión de servicio (${input.feePercentage}%): -$${feeAmountStr} USD\n• Monto neto: $${amountAfterFeeStr} USD`;
  if (isUSD) {
    defaultExplanation += `\n• El beneficiario recibe: $${receivedStr} USD (sin conversión de moneda).`;
  } else {
    defaultExplanation += `\n• Tasa de cambio aplicada: 1 USD = ${input.exchangeRate.toFixed(2)} ${input.destinationCurrency}\n• Total a recibir por el beneficiario: ${Number(receivedStr).toLocaleString()} ${input.destinationCurrency}.`;
  }

  // If Gemini API key is present, generate natural language personalized explanation
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Como un experto en servicios financieros de Hispaniola Pay, explica de manera clara, concisa y cordial a un cliente cómo se calcula su transacción de remesa:
- Monto a enviar: $${input.amountSent.toFixed(2)} USD
- Comisión de servicio: ${input.feePercentage}% ($${feeAmountStr} USD)
- Monto neto: $${amountAfterFeeStr} USD
- Moneda de destino: ${input.destinationCurrency}
- Tasa de cambio: ${isUSD ? 'N/A' : `1 USD = ${input.exchangeRate.toFixed(2)} ${input.destinationCurrency}`}
- Monto final que recibe el beneficiario: ${isUSD ? `$${receivedStr} USD` : `${Number(receivedStr).toLocaleString()} ${input.destinationCurrency}`}

Brinda una explicación de máximo 3 o 4 oraciones fáciles de leer.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text && response.text.trim().length > 0) {
        return { explanation: response.text.trim() };
      }
    } catch (err: any) {
      console.warn('Gemini explanation fallback:', err.message);
    }
  }

  return { explanation: defaultExplanation };
}
