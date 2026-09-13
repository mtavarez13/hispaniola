'use server';
/**
 * @fileOverview This file provides a Genkit flow to fetch live exchange rates.
 * It uses a tool to simulate "connecting with Google" to get current market data.
 *
 * - getExchangeRates - A function that returns the latest rates for DOP and HTG.
 * - GetExchangeRatesOutput - The return type for the getExchangeRates function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetExchangeRatesOutputSchema = z.object({
  rates: z.object({
    DOP: z.number().describe('The adjusted exchange rate for USD to DOP (Market - 1)'),
    HTG: z.number().describe('The adjusted exchange rate for USD to HTG (Market - 1)'),
    USD: z.number().describe('Always 1.0'),
  }),
  lastUpdated: z.string().describe('ISO timestamp of the update'),
  source: z.string().describe('The data source used (e.g., Google Finance)'),
});
export type GetExchangeRatesOutput = z.infer<typeof GetExchangeRatesOutputSchema>;

// Tool that simulates a Google Finance/Search lookup for RAW market data
const googleFinanceTool = ai.defineTool(
  {
    name: 'googleFinanceSearch',
    description: 'Searches Google for the RAW market exchange rate of USD against DOP and HTG.',
    inputSchema: z.object({
      base: z.string().default('USD'),
    }),
    outputSchema: z.object({
      rates: z.array(z.object({
        currency: z.string(),
        rate: z.number(),
      })),
      timestamp: z.string(),
    }),
  },
  async (input) => {
    // We simulate the REAL market rates
    return {
      rates: [
        { currency: 'DOP', rate: 58.50 + (Math.random() * 0.4 - 0.2) },
        { currency: 'HTG', rate: 132.20 + (Math.random() * 2.0 - 1.0) },
      ],
      timestamp: new Date().toISOString(),
    };
  }
);

const exchangeRatesPrompt = ai.definePrompt({
  name: 'exchangeRatesPrompt',
  tools: [googleFinanceTool],
  output: { schema: GetExchangeRatesOutputSchema },
  prompt: `You are a financial data assistant for Hispaniola Pay. 
Your task is to provide the adjusted exchange rates for USD to Dominican Pesos (DOP) and Haitian Gourdes (HTG).

1. Use the googleFinanceSearch tool to get the current RAW MARKET rates.
2. Apply the Hispaniola Pay profit margin:
   - For DOP: Subtract exactly 1.00 from the market rate.
   - For HTG: Subtract exactly 1.00 from the market rate.
   (Example: If market DOP is 58.50, return 57.50).

Format the final output with these adjusted rates which represent the benefit for the remittance company.`,
});

export async function getExchangeRates(): Promise<GetExchangeRatesOutput> {
  return getExchangeRatesFlow();
}

const getExchangeRatesFlow = ai.defineFlow(
  {
    name: 'getExchangeRatesFlow',
    outputSchema: GetExchangeRatesOutputSchema,
  },
  async () => {
    try {
      const { output } = await exchangeRatesPrompt();
      if (output) {
        return output;
      }
    } catch (err) {
      console.error('Error in getExchangeRatesFlow:', err);
    }
    
    // Default fallback rates
    return {
      rates: {
        DOP: 58.50,
        HTG: 132.20,
        USD: 1.00,
      },
      lastUpdated: new Date().toISOString(),
      source: 'Hispaniola Pay (Tasa Estándar de Respaldo)',
    };
  }
);
