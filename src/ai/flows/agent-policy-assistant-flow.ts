'use server';
/**
 * @fileOverview This file implements a Genkit flow that acts as an AI assistant for Hispaniola Pay agents.
 * It provides natural language answers to questions about Hispaniola Pay's policies, procedures, and common transaction scenarios.
 *
 * - agentPolicyAssistant - A function that handles the agent's policy questions.
 * - AgentPolicyAssistantInput - The input type for the agentPolicyAssistant function.
 * - AgentPolicyAssistantOutput - The return type for the agentPolicyAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AgentPolicyAssistantInputSchema = z.object({
  question: z.string().describe('The natural language question from the agent about Hispaniola Pay policies or procedures.'),
});
export type AgentPolicyAssistantInput = z.infer<typeof AgentPolicyAssistantInputSchema>;

const AgentPolicyAssistantOutputSchema = z.object({
  answer: z.string().describe('The accurate and confident answer to the agent\'s question.'),
});
export type AgentPolicyAssistantOutput = z.infer<typeof AgentPolicyAssistantOutputSchema>;

export async function agentPolicyAssistant(input: AgentPolicyAssistantInput): Promise<AgentPolicyAssistantOutput> {
  return agentPolicyAssistantFlow(input);
}

const agentPolicyAssistantPrompt = ai.definePrompt({
  name: 'agentPolicyAssistantPrompt',
  input: { schema: AgentPolicyAssistantInputSchema },
  output: { schema: AgentPolicyAssistantOutputSchema },
  prompt: `You are Hispaniola Pay Policy Assistant, an expert AI designed to assist agents with questions about company policies, procedures, and common transaction scenarios.
Your goal is to provide accurate, confident, and concise answers based on the following Hispaniola Pay business rules and operational context:

Hispaniola Pay Business Logic:
-   **Sender Fee:** A 5% fee is automatically charged to the sender on the amount sent.
-   **Cash-in Agent Commission:** The agent who receives cash for a send earns a fixed fee of 1.50 in the local currency of the origin country (e.g., USD in USA).
-   **Paying Agent Commission (Haiti):** The agent in Haiti who pays out to the beneficiary earns 2% of the total amount paid to the beneficiary.
-   **Supported Countries:** USA, Dominican Republic (DOP), Haiti (HTG).
-   **Exchange Rates:** Real-time exchange rates for USD to DOP and HTG are used for beneficiary payout calculations.

When answering, always assume the role of an knowledgeable assistant helping an agent serve a customer.
Do not provide legal advice or financial advice that is not explicitly part of Hispaniola Pay's defined policies.
If you do not have enough information to answer a question, state that you cannot answer based on the provided context.

Agent Question: {{{question}}}
`,
});

const agentPolicyAssistantFlow = ai.defineFlow(
  {
    name: 'agentPolicyAssistantFlow',
    inputSchema: AgentPolicyAssistantInputSchema,
    outputSchema: AgentPolicyAssistantOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await agentPolicyAssistantPrompt(input);
      if (output?.answer) {
        return output;
      }
    } catch (err) {
      console.error('Error in agentPolicyAssistantFlow:', err);
    }

    return {
      answer: 'Servicio de asistencia temporalmente no disponible en modo automático. La política estándar de Hispaniola Pay establece una comisión del 5% al remitente y comisiones fijas por pago en agencia.',
    };
  }
);
