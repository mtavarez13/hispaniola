import { ClientDepositRecord, ClientWalletMovement, UserProfile, HaitiDepositTransaction } from "./types";
import { DEFAULT_SUB_AGENTS } from "./sub-agents-service";

const CLIENT_WALLETS_KEY_PREFIX = "hispaniolapay_client_wallet_";
const CLIENT_DEPOSITS_KEY = "hispaniolapay_client_deposits";
const CLIENT_MOVEMENTS_KEY_PREFIX = "hispaniolapay_client_movements_";

export interface WalletBalances {
  walletBalance: number; // Saldo disponible para envíos (USD)
  savingsBalance: number; // Bolsillo de Ahorro (USD)
  clientCode: string; // e.g. "CLI-7492"
  phone?: string;
  idNumber?: string;
}

export function getClientWalletBalances(uid: string, initialProfile?: UserProfile | null): WalletBalances {
  if (typeof window === "undefined") {
    return {
      walletBalance: initialProfile?.walletBalance ?? 0.0,
      savingsBalance: initialProfile?.savingsBalance ?? 0.0,
      clientCode: initialProfile?.clientCode || "CLI-8821",
      phone: initialProfile?.phone || "+1 (829) 450-2211",
      idNumber: initialProfile?.idNumber || "402-1928374-1",
    };
  }

  const key = `${CLIENT_WALLETS_KEY_PREFIX}${uid}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        walletBalance: typeof parsed.walletBalance === "number" ? parsed.walletBalance : (initialProfile?.walletBalance ?? 0.0),
        savingsBalance: typeof parsed.savingsBalance === "number" ? parsed.savingsBalance : (initialProfile?.savingsBalance ?? 0.0),
        clientCode: parsed.clientCode || initialProfile?.clientCode || `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
        phone: parsed.phone || initialProfile?.phone || "+1 (829) 450-2211",
        idNumber: parsed.idNumber || initialProfile?.idNumber || "402-1928374-1",
      };
    }
  } catch (_) {}

  // Initial starter data for client: New accounts start strictly at 0.00
  const defaultCode = initialProfile?.clientCode || `CLI-${Math.floor(1000 + Math.random() * 9000)}`;
  const starter: WalletBalances = {
    walletBalance: initialProfile?.walletBalance ?? 0.0,
    savingsBalance: initialProfile?.savingsBalance ?? 0.0,
    clientCode: defaultCode,
    phone: initialProfile?.phone || "+1 (829) 450-2211",
    idNumber: initialProfile?.idNumber || "402-1928374-1",
  };

  try {
    localStorage.setItem(key, JSON.stringify(starter));
  } catch (_) {}

  return starter;
}

export function saveClientWalletBalances(uid: string, balances: WalletBalances): void {
  if (typeof window === "undefined") return;
  const key = `${CLIENT_WALLETS_KEY_PREFIX}${uid}`;
  try {
    localStorage.setItem(key, JSON.stringify(balances));
    // Also sync the global user profile in cache
    const profileKey = `hispaniolapay_profile_${uid}`;
    const rawProfile = localStorage.getItem(profileKey);
    if (rawProfile) {
      const profile = JSON.parse(rawProfile);
      profile.walletBalance = balances.walletBalance;
      profile.savingsBalance = balances.savingsBalance;
      profile.clientCode = balances.clientCode;
      profile.phone = balances.phone;
      profile.idNumber = balances.idNumber;
      localStorage.setItem(profileKey, JSON.stringify(profile));
    }
  } catch (_) {}
}

// Client Deposits (Orders at Sub-Agents or Bank Transfers)
export function getClientDeposits(clientId?: string): ClientDepositRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CLIENT_DEPOSITS_KEY);
    const list: ClientDepositRecord[] = raw ? JSON.parse(raw) : [];

    if (clientId) {
      return list.filter((d) => d.clientId === clientId);
    }
    return list;
  } catch (_) {
    return [];
  }
}

export function saveClientDeposit(deposit: ClientDepositRecord): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CLIENT_DEPOSITS_KEY);
    const list: ClientDepositRecord[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((d) => d.id === deposit.id);
    if (index >= 0) {
      list[index] = deposit;
    } else {
      list.unshift(deposit);
    }
    localStorage.setItem(CLIENT_DEPOSITS_KEY, JSON.stringify(list));
  } catch (_) {}
}

// Client Wallet Movements / Ledger
export function getClientMovements(clientId: string): ClientWalletMovement[] {
  if (typeof window === "undefined") return [];
  const key = `${CLIENT_MOVEMENTS_KEY_PREFIX}${clientId}`;
  try {
    const raw = localStorage.getItem(key);
    const list: ClientWalletMovement[] = raw ? JSON.parse(raw) : [];
    return list;
  } catch (_) {
    return [];
  }
}

export function addClientMovement(movement: ClientWalletMovement): void {
  if (typeof window === "undefined") return;
  const key = `${CLIENT_MOVEMENTS_KEY_PREFIX}${movement.clientId}`;
  try {
    const raw = localStorage.getItem(key);
    const list: ClientWalletMovement[] = raw ? JSON.parse(raw) : [];
    list.unshift(movement);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (_) {}
}

// Transfer funds between Main Wallet and Savings
export function transferBetweenPockets(
  uid: string,
  amount: number,
  fromPocket: "main" | "savings",
  toPocket: "main" | "savings"
): { success: boolean; message: string; newBalances?: WalletBalances } {
  if (amount <= 0) {
    return { success: false, message: "El monto a transferir debe ser mayor a 0." };
  }

  const current = getClientWalletBalances(uid);

  if (fromPocket === "main" && toPocket === "savings") {
    if (current.walletBalance < amount) {
      return { success: false, message: `Saldo insuficiente en Billetera Principal ($${current.walletBalance.toFixed(2)} USD disponible).` };
    }
    const updated: WalletBalances = {
      ...current,
      walletBalance: Math.round((current.walletBalance - amount) * 100) / 100,
      savingsBalance: Math.round((current.savingsBalance + amount) * 100) / 100,
    };
    saveClientWalletBalances(uid, updated);

    addClientMovement({
      id: `MOV-${Date.now().toString().slice(-6)}`,
      clientId: uid,
      type: "transfer_to_savings",
      title: "Traspaso a Bolsillo de Ahorro",
      description: `Traslado de $${amount.toFixed(2)} USD desde Billetera Principal`,
      amountUSD: amount,
      direction: "transfer",
      targetPocket: "savings",
      date: new Date().toISOString(),
      status: "completed",
      receiptCode: `SAV-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    return { success: true, message: `Has transferido $${amount.toFixed(2)} USD a tu Bolsillo de Ahorro.`, newBalances: updated };
  }

  if (fromPocket === "savings" && toPocket === "main") {
    if (current.savingsBalance < amount) {
      return { success: false, message: `Saldo insuficiente en tu Bolsillo de Ahorro ($${current.savingsBalance.toFixed(2)} USD disponible).` };
    }
    const updated: WalletBalances = {
      ...current,
      walletBalance: Math.round((current.walletBalance + amount) * 100) / 100,
      savingsBalance: Math.round((current.savingsBalance - amount) * 100) / 100,
    };
    saveClientWalletBalances(uid, updated);

    addClientMovement({
      id: `MOV-${Date.now().toString().slice(-6)}`,
      clientId: uid,
      type: "withdraw_from_savings",
      title: "Liberación de Ahorro a Saldo Principal",
      description: `Liberación de $${amount.toFixed(2)} USD disponible para enviar a Haití`,
      amountUSD: amount,
      direction: "in",
      targetPocket: "main",
      date: new Date().toISOString(),
      status: "completed",
      receiptCode: `LIB-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    return { success: true, message: `Has liberado $${amount.toFixed(2)} USD a tu Billetera Principal disponible para envíos.`, newBalances: updated };
  }

  return { success: false, message: "Operación de traspaso inválida." };
}

// Confirm a deposit (credits the wallet)
export function confirmDepositAndCreditWallet(
  depositId: string,
  confirmedBy: string
): { success: boolean; message: string; deposit?: ClientDepositRecord } {
  if (typeof window === "undefined") return { success: false, message: "Entorno no disponible." };

  try {
    const raw = localStorage.getItem(CLIENT_DEPOSITS_KEY);
    const list: ClientDepositRecord[] = raw ? JSON.parse(raw) : [];
    const deposit = list.find((d) => d.id === depositId);

    if (!deposit) {
      return { success: false, message: "Orden de depósito no encontrada." };
    }

    if (deposit.status === "completed") {
      return { success: false, message: "Este depósito ya fue acreditado previamente." };
    }

    deposit.status = "completed";
    deposit.confirmedAt = new Date().toISOString();
    deposit.confirmedBy = confirmedBy;
    saveClientDeposit(deposit);

    // Credit client wallet
    const balances = getClientWalletBalances(deposit.clientId);
    const creditedAmount = deposit.amountCreditedUSD;

    let updatedBalances: WalletBalances;
    if (deposit.targetPocket === "savings") {
      updatedBalances = {
        ...balances,
        savingsBalance: Math.round((balances.savingsBalance + creditedAmount) * 100) / 100,
      };
    } else {
      updatedBalances = {
        ...balances,
        walletBalance: Math.round((balances.walletBalance + creditedAmount) * 100) / 100,
      };
    }
    saveClientWalletBalances(deposit.clientId, updatedBalances);

    // Add movement
    addClientMovement({
      id: `MOV-${Date.now().toString().slice(-6)}`,
      clientId: deposit.clientId,
      type: deposit.method === "sub_agent" ? "deposit_sub_agent" : "deposit_bank",
      title: deposit.method === "sub_agent" ? `Depósito en Sub-Agente (${deposit.subAgentName || "Punto Autorizado"})` : `Depósito Bancario (${deposit.bankName || "Banco RD"})`,
      description: `Acreditado exitosamente: $${creditedAmount.toFixed(2)} USD (${deposit.amount} ${deposit.currency})`,
      amountUSD: creditedAmount,
      direction: "in",
      targetPocket: deposit.targetPocket,
      date: new Date().toISOString(),
      referenceId: deposit.id,
      status: "completed",
      receiptCode: deposit.voucherCode,
    });

    return { success: true, message: `Depósito acreditado con éxito: +$${creditedAmount.toFixed(2)} USD.`, deposit };
  } catch (err: any) {
    return { success: false, message: err?.message || "Error al acreditar depósito." };
  }
}

// Send remittance to Haiti directly with wallet balance
export function sendRemittanceFromClientWallet(params: {
  clientId: string;
  senderName: string;
  senderPhone?: string;
  operator: "MonCash" | "NatCash";
  recipientPhone: string;
  recipientName: string;
  amountUSD: number;
  feePercent?: number; // e.g. 5%
  rateHTG: number; // e.g. 132.20
  subAgentId?: string;
}): {
  success: boolean;
  message: string;
  tx?: HaitiDepositTransaction;
  movement?: ClientWalletMovement;
  newBalance?: number;
} {
  const { clientId, senderName, senderPhone, operator, recipientPhone, recipientName, amountUSD, feePercent = 5, rateHTG, subAgentId } = params;

  if (amountUSD <= 0) {
    return { success: false, message: "El monto a enviar debe ser mayor a 0." };
  }

  const feeUSD = Math.round(amountUSD * (feePercent / 100) * 100) / 100;
  const totalDeductionUSD = Math.round((amountUSD + feeUSD) * 100) / 100;

  const currentBalances = getClientWalletBalances(clientId);
  if (currentBalances.walletBalance < totalDeductionUSD) {
    return {
      success: false,
      message: `Saldo insuficiente en tu Billetera. Necesitas $${totalDeductionUSD.toFixed(2)} USD (incluye tarifa del ${feePercent}%), pero tienes $${currentBalances.walletBalance.toFixed(2)} USD disponibles. Por favor deposita en un Sub-Agente o transfiere de tu ahorro.`,
    };
  }

  // Calculate HTG
  const amountHTG = Math.round(amountUSD * rateHTG * 100) / 100;
  const feeHTG = Math.round(feeUSD * rateHTG * 100) / 100;
  const totalAmountHTG = Math.round(amountHTG + feeHTG);

  const txId = `HT-${Date.now().toString().slice(-6)}`;
  const cleanPhone = recipientPhone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("509") ? cleanPhone : `509${cleanPhone}`;

  // Deduct balance
  const updatedBalances: WalletBalances = {
    ...currentBalances,
    walletBalance: Math.round((currentBalances.walletBalance - totalDeductionUSD) * 100) / 100,
  };
  saveClientWalletBalances(clientId, updatedBalances);

  // Register Haiti transaction in BenCash transactions log
  const newTx: HaitiDepositTransaction = {
    id: txId,
    requestId: Date.now(),
    txId: txId,
    transactionId: `BC-${Date.now().toString().slice(-8)}`,
    operator,
    toAccountNumber: formattedPhone,
    recipientName,
    amountUSD,
    amountHTG,
    feeHTG,
    totalAmountHTG,
    content: "Envío desde Billetera HispaniolaPay",
    status: "confirmed",
    senderName,
    senderPhone: senderPhone || currentBalances.phone,
    timestamp: Date.now(),
    isSandbox: true,
    createdAt: new Date().toISOString(),
    feePercent,
    feeUSD,
    subAgentId: subAgentId || "DIRECT_WALLET",
    subAgentName: "Billetera Digital Cliente",
    hispaniolaProfitPercent: feePercent,
    hispaniolaProfitUSD: feeUSD,
  };

  try {
    const rawTxs = localStorage.getItem("hispaniolapay_bencash_transactions");
    const txList = rawTxs ? JSON.parse(rawTxs) : [];
    txList.unshift(newTx);
    localStorage.setItem("hispaniolapay_bencash_transactions", JSON.stringify(txList));
  } catch (_) {}

  // Add movement to client ledger
  const movement: ClientWalletMovement = {
    id: `MOV-${Date.now().toString().slice(-6)}`,
    clientId,
    type: operator === "MonCash" ? "remittance_moncash" : "remittance_natcash",
    title: `Envío Remesa ${operator} Haití`,
    description: `Acreditado a ${recipientName} (${formattedPhone}). Total debitado: $${totalDeductionUSD.toFixed(2)} USD`,
    amountUSD: totalDeductionUSD,
    direction: "out",
    targetPocket: "main",
    date: new Date().toISOString(),
    referenceId: txId,
    recipient: `${recipientName} (${operator})`,
    status: "completed",
    receiptCode: `REC-${operator.toUpperCase()}-${txId}`,
  };
  addClientMovement(movement);

  return {
    success: true,
    message: `¡Remesa enviada exitosamente a ${recipientName} por ${operator}! Se han debitado $${totalDeductionUSD.toFixed(2)} USD de tu billetera.`,
    tx: newTx,
    movement,
    newBalance: updatedBalances.walletBalance,
  };
}
