import { GmailBankTransfer, HaitiDepositTransaction } from "@/lib/types";
import { getInitialDemoBankTransfers } from "@/lib/gmail/bank-parser";

const GMAIL_TRANSFERS_STORAGE_KEY = "hispaniolapay_gmail_transfers";
const HAITI_DEPOSITS_STORAGE_KEY = "hispaniolapay_haiti_deposits";

export function loadStoredGmailTransfers(dopRate = 58.50, htgRate = 132.20): GmailBankTransfer[] {
  if (typeof window === "undefined") {
    return getInitialDemoBankTransfers(dopRate, htgRate);
  }

  try {
    const raw = localStorage.getItem(GMAIL_TRANSFERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading stored Gmail transfers:", e);
  }

  const initial = getInitialDemoBankTransfers(dopRate, htgRate);
  try {
    localStorage.setItem(GMAIL_TRANSFERS_STORAGE_KEY, JSON.stringify(initial));
  } catch (_) {}
  return initial;
}

export function saveStoredGmailTransfers(transfers: GmailBankTransfer[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GMAIL_TRANSFERS_STORAGE_KEY, JSON.stringify(transfers));
  } catch (e) {
    console.error("Error saving Gmail transfers:", e);
  }
}

/**
 * 1-Click Approval of a Gmail Bank Transfer (Admin only)
 * Creates a linked Haiti Deposit Remittance and marks transfer as approved / dispatched
 */
export function approveAndDispatchTransfer(
  transferId: string,
  adminEmail: string,
  options: {
    recipientName: string;
    recipientPhone: string;
    operator: "MonCash" | "NatCash";
    note?: string;
    publicFeePercent?: number;
  }
): { success: boolean; message: string; updatedTransfer?: GmailBankTransfer; createdRemittance?: HaitiDepositTransaction } {
  if (typeof window === "undefined") {
    return { success: false, message: "Operación no disponible en SSR" };
  }

  const transfers = loadStoredGmailTransfers();
  const index = transfers.findIndex((t) => t.id === transferId);

  if (index === -1) {
    return { success: false, message: "Depósito no encontrado en el tablero" };
  }

  const transfer = transfers[index];

  if (transfer.status === "approved" || transfer.status === "dispatched") {
    return { success: false, message: "Este depósito ya ha sido aprobado previamente" };
  }

  const feePct = options.publicFeePercent || 8.0;
  const feeUSD = Number((transfer.amountUSD * (feePct / 100)).toFixed(2));
  const amountAfterFeeUSD = Math.max(0, transfer.amountUSD - feeUSD);
  const calculatedHTG = Number((amountAfterFeeUSD * 132.20).toFixed(2));

  // Generate linked Haiti remittance transaction
  const newTxId = `TX-${Date.now().toString().slice(-6)}`;
  const remittanceId = `HT-TX-${Math.floor(1000 + Math.random() * 9000)}`;

  const createdRemittance: HaitiDepositTransaction = {
    id: remittanceId,
    requestId: Math.floor(100000000 + Math.random() * 900000000),
    txId: newTxId,
    transactionId: `DEP-${transfer.referenceNumber}`,
    operator: options.operator,
    toAccountNumber: options.recipientPhone,
    recipientName: options.recipientName.trim(),
    amountUSD: transfer.amountUSD,
    amountHTG: calculatedHTG,
    feeHTG: 0,
    totalAmountHTG: calculatedHTG,
    content: `Remesa aprobada de ${transfer.bank} Ref: ${transfer.referenceNumber}. ${options.note || ""}`,
    status: "confirmed",
    senderName: transfer.senderName,
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
    feePercent: feePct,
    feeUSD: feeUSD,
    bencashFeePercent: 3.0,
    bencashFeeUSD: Number((transfer.amountUSD * 0.03).toFixed(2)),
    subAgentFeePercent: 2.0,
    subAgentFeeUSD: Number((transfer.amountUSD * 0.02).toFixed(2)),
    hispaniolaProfitPercent: 3.0,
    hispaniolaProfitUSD: Number((transfer.amountUSD * 0.03).toFixed(2)),
    subAgentId: "SA-GMAIL-AUTO",
    subAgentName: "Depósito Bancario Directo (Gmail)",
  };

  // 1. Update Gmail transfer state
  const updatedTransfer: GmailBankTransfer = {
    ...transfer,
    status: "approved",
    recipientName: options.recipientName.trim(),
    recipientPhone: options.recipientPhone,
    operator: options.operator,
    approvedByAdminEmail: adminEmail,
    approvedAt: new Date().toISOString(),
    dispatchedTxId: remittanceId,
    notes: options.note || `Aprobado por ${adminEmail} vía Gmail Dashboard`,
  };

  transfers[index] = updatedTransfer;
  saveStoredGmailTransfers(transfers);

  // 2. Persist created remittance to Haiti Deposits store so it appears in live terminals
  try {
    const rawDeposits = localStorage.getItem(HAITI_DEPOSITS_STORAGE_KEY);
    let deposits: HaitiDepositTransaction[] = [];
    if (rawDeposits) {
      deposits = JSON.parse(rawDeposits);
    }
    deposits.unshift(createdRemittance);
    localStorage.setItem(HAITI_DEPOSITS_STORAGE_KEY, JSON.stringify(deposits));
  } catch (e) {
    console.error("Error linking remittance to Haiti deposits:", e);
  }

  return {
    success: true,
    message: `Remesa de ${transfer.bank} (${transfer.referenceNumber}) aprobada y enviada a ${options.operator} exitosamente`,
    updatedTransfer,
    createdRemittance,
  };
}
