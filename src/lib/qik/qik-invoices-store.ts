import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  QikInvoice, 
  MasterQikPool, 
  QikAgentAccount, 
  QikBalanceTransaction 
} from "@/lib/types";
import { DEMO_QIK_INVOICES } from "./gmail-parser";

const INVOICES_STORAGE_KEY = "hispaniolapay_qik_invoices";
const POOL_STORAGE_KEY = "hispaniolapay_qik_master_pool";
const AGENTS_STORAGE_KEY = "hispaniolapay_qik_agents";
const TRANSACTIONS_STORAGE_KEY = "hispaniolapay_qik_transactions";

export const DEFAULT_MASTER_POOL: MasterQikPool = {
  totalBalanceRD: 500000.00,
  allocatedBalanceRD: 180000.00,
  availableBalanceRD: 320000.00,
  updatedAt: new Date().toISOString(),
  updatedBy: "Admin Central",
};

export const DEFAULT_QIK_AGENTS: QikAgentAccount[] = [
  {
    id: "AGT-001",
    name: "Bodega El Carmen",
    owner: "Pedro Santos",
    email: "elcarmen@hispaniolapay.com",
    phone: "809-555-0101",
    location: "Las Matas De Santa Cruz",
    allocatedBalanceRD: 60000.00,
    currentBalanceRD: 42530.00,
    totalSpentRD: 17470.00,
    invoicesCount: 8,
    status: "active",
    lastActivityAt: new Date().toISOString(),
  },
  {
    id: "AGT-002",
    name: "Farmacia Lumière",
    owner: "Marie Lebrun",
    email: "lumiere@hispaniolapay.com",
    phone: "809-555-0202",
    location: "Dajabón Centro",
    allocatedBalanceRD: 50000.00,
    currentBalanceRD: 38200.00,
    totalSpentRD: 11800.00,
    invoicesCount: 5,
    status: "active",
    lastActivityAt: new Date().toISOString(),
  },
  {
    id: "AGT-003",
    name: "Comercial Tavárez",
    owner: "Martín Tavárez",
    email: "tavarez@hispaniolapay.com",
    phone: "809-323-3535",
    location: "Montecristi Duarte #30",
    allocatedBalanceRD: 70000.00,
    currentBalanceRD: 54146.01,
    totalSpentRD: 15853.99,
    invoicesCount: 6,
    status: "active",
    lastActivityAt: new Date().toISOString(),
  },
];

export const DEFAULT_TRANSACTIONS: QikBalanceTransaction[] = [
  {
    id: "TX-QIK-101",
    type: "topup_master",
    amountRD: 500000.00,
    previousBalanceRD: 0,
    newBalanceRD: 500000.00,
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    performedBy: "Admin Central",
    note: "Fondeo inicial Cuenta Matriz Qik Banco Digital",
  },
  {
    id: "TX-QIK-102",
    type: "allocate_agent",
    agentId: "AGT-001",
    agentName: "Bodega El Carmen",
    amountRD: 60000.00,
    previousBalanceRD: 0,
    newBalanceRD: 60000.00,
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    performedBy: "Admin Central",
    note: "Asignación de saldo operativo para facturas de servicios",
  },
  {
    id: "TX-QIK-103",
    type: "invoice_payment",
    agentId: "AGT-003",
    agentName: "Comercial Tavárez",
    amountRD: 3863.99,
    previousBalanceRD: 58010.00,
    newBalanceRD: 54146.01,
    noReferencia: "53-189181160",
    serviceName: "Telefónicas / Altice",
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    performedBy: "Martín Tavárez",
    note: "Descuento automático por pago de factura Altice",
  },
];

/* ============================================================
   1. MASTER QIK POOL STORAGE & FUNCTIONS
   ============================================================ */

export function getLocalMasterPool(): MasterQikPool {
  if (typeof window === "undefined") return DEFAULT_MASTER_POOL;
  try {
    const raw = localStorage.getItem(POOL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.totalBalanceRD === "number") {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read local master pool:", e);
  }
  return DEFAULT_MASTER_POOL;
}

export function saveLocalMasterPool(pool: MasterQikPool) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify(pool));
  } catch (e) {
    console.warn("Could not save local master pool:", e);
  }
}

export async function updateMasterPool(
  newTotalBalanceRD: number, 
  updatedBy: string = "Admin Central"
): Promise<MasterQikPool> {
  const currentAgents = getLocalQikAgents();
  const totalAllocated = currentAgents.reduce((sum, ag) => sum + (ag.allocatedBalanceRD || 0), 0);
  const available = Math.max(0, Number((newTotalBalanceRD - totalAllocated).toFixed(2)));

  const pool: MasterQikPool = {
    totalBalanceRD: Number(newTotalBalanceRD.toFixed(2)),
    allocatedBalanceRD: Number(totalAllocated.toFixed(2)),
    availableBalanceRD: available,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  saveLocalMasterPool(pool);

  // Sync to Firestore
  try {
    const docRef = doc(db, "qik_pool", "global");
    await setDoc(docRef, pool, { merge: true });
  } catch (e) {
    console.warn("Firestore pool sync fallback:", e);
  }

  // Record audit transaction
  await recordTransaction({
    id: `TX-TOPUP-${Date.now()}`,
    type: "topup_master",
    amountRD: newTotalBalanceRD,
    previousBalanceRD: getLocalMasterPool().totalBalanceRD,
    newBalanceRD: newTotalBalanceRD,
    timestamp: new Date().toISOString(),
    performedBy: updatedBy,
    note: `Actualización de Balance Total Qik Matriz a RD$ ${newTotalBalanceRD.toLocaleString()}`,
  });

  return pool;
}

export function recalculateMasterPool(): MasterQikPool {
  const pool = getLocalMasterPool();
  const agents = getLocalQikAgents();
  const totalAllocated = agents.reduce((sum, ag) => sum + (ag.currentBalanceRD || 0), 0);
  const updatedPool: MasterQikPool = {
    ...pool,
    allocatedBalanceRD: Number(totalAllocated.toFixed(2)),
    availableBalanceRD: Math.max(0, Number((pool.totalBalanceRD - totalAllocated).toFixed(2))),
    updatedAt: new Date().toISOString(),
  };
  saveLocalMasterPool(updatedPool);
  try {
    const docRef = doc(db, "qik_pool", "global");
    setDoc(docRef, updatedPool, { merge: true }).catch(() => {});
  } catch (_) {}
  return updatedPool;
}

export function subscribeMasterPool(callback: (pool: MasterQikPool) => void) {
  callback(getLocalMasterPool());
  try {
    const docRef = doc(db, "qik_pool", "global");
    const unsub = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as MasterQikPool;
          saveLocalMasterPool(data);
          callback(data);
        }
      },
      (err) => console.warn("Pool listener fallback:", err)
    );
    return unsub;
  } catch {
    return () => {};
  }
}

/* ============================================================
   2. AGENTS QIK BALANCE STORAGE & ALLOCATION
   ============================================================ */

export function getLocalQikAgents(): QikAgentAccount[] {
  if (typeof window === "undefined") return DEFAULT_QIK_AGENTS;
  try {
    const raw = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read local Qik agents:", e);
  }
  return DEFAULT_QIK_AGENTS;
}

export function saveLocalQikAgents(agents: QikAgentAccount[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
  } catch (e) {
    console.warn("Could not save local Qik agents:", e);
  }
}

export async function allocateBalanceToAgent(
  agentId: string,
  amountRD: number,
  performedBy: string = "Admin Central",
  note: string = "Recarga de saldo Qik"
): Promise<{ success: boolean; message: string; updatedAgent?: QikAgentAccount }> {
  if (amountRD <= 0) {
    return { success: false, message: "El monto a transferir debe ser mayor a 0." };
  }

  const pool = getLocalMasterPool();
  if (amountRD > pool.availableBalanceRD) {
    return { 
      success: false, 
      message: `Balance insuficiente en la cuenta matriz. Disponible: RD$ ${pool.availableBalanceRD.toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
    };
  }

  const agents = getLocalQikAgents();
  const agentIdx = agents.findIndex((a) => a.id === agentId);
  if (agentIdx === -1) {
    return { success: false, message: "Agente no encontrado." };
  }

  const agent = agents[agentIdx];
  const previousBalance = agent.currentBalanceRD;
  const newCurrent = Number((previousBalance + amountRD).toFixed(2));
  const newAllocated = Number(((agent.allocatedBalanceRD || 0) + amountRD).toFixed(2));

  const updatedAgent: QikAgentAccount = {
    ...agent,
    currentBalanceRD: newCurrent,
    allocatedBalanceRD: newAllocated,
    lastActivityAt: new Date().toISOString(),
  };

  agents[agentIdx] = updatedAgent;
  saveLocalQikAgents(agents);

  // Sync agent to Firestore
  try {
    const docRef = doc(db, "qik_agents", agent.id);
    await setDoc(docRef, updatedAgent, { merge: true });
  } catch (e) {
    console.warn("Agent firestore sync fallback:", e);
  }

  // Update Pool
  recalculateMasterPool();

  // Audit transaction
  await recordTransaction({
    id: `TX-ALLOC-${Date.now()}`,
    type: "allocate_agent",
    agentId: agent.id,
    agentName: agent.name,
    amountRD,
    previousBalanceRD: previousBalance,
    newBalanceRD: newCurrent,
    timestamp: new Date().toISOString(),
    performedBy,
    note: note || `Transferencia de balance Qik a ${agent.name}`,
  });

  return { 
    success: true, 
    message: `Se enviaron exitosamente RD$ ${amountRD.toLocaleString()} a ${agent.name}. Nuevo balance: RD$ ${newCurrent.toLocaleString()}`, 
    updatedAgent 
  };
}

export async function returnBalanceFromAgent(
  agentId: string,
  amountRD: number,
  performedBy: string = "Admin Central",
  note: string = "Retorno de saldo a cuenta matriz"
): Promise<{ success: boolean; message: string; updatedAgent?: QikAgentAccount }> {
  const agents = getLocalQikAgents();
  const agentIdx = agents.findIndex((a) => a.id === agentId);
  if (agentIdx === -1) {
    return { success: false, message: "Agente no encontrado." };
  }

  const agent = agents[agentIdx];
  if (amountRD > agent.currentBalanceRD) {
    return { 
      success: false, 
      message: `El agente solo tiene RD$ ${agent.currentBalanceRD.toLocaleString()} disponible.` 
    };
  }

  const previousBalance = agent.currentBalanceRD;
  const newCurrent = Number((previousBalance - amountRD).toFixed(2));
  const newAllocated = Math.max(0, Number(((agent.allocatedBalanceRD || 0) - amountRD).toFixed(2)));

  const updatedAgent: QikAgentAccount = {
    ...agent,
    currentBalanceRD: newCurrent,
    allocatedBalanceRD: newAllocated,
    lastActivityAt: new Date().toISOString(),
  };

  agents[agentIdx] = updatedAgent;
  saveLocalQikAgents(agents);

  try {
    const docRef = doc(db, "qik_agents", agent.id);
    await setDoc(docRef, updatedAgent, { merge: true });
  } catch (_) {}

  recalculateMasterPool();

  await recordTransaction({
    id: `TX-RETURN-${Date.now()}`,
    type: "return_from_agent",
    agentId: agent.id,
    agentName: agent.name,
    amountRD,
    previousBalanceRD: previousBalance,
    newBalanceRD: newCurrent,
    timestamp: new Date().toISOString(),
    performedBy,
    note: note || `Retorno de balance desde ${agent.name} hacia matriz`,
  });

  return { 
    success: true, 
    message: `Se retornaron RD$ ${amountRD.toLocaleString()} a la cuenta matriz.`, 
    updatedAgent 
  };
}

export async function createOrUpdateAgent(agentData: Partial<QikAgentAccount> & { name: string }): Promise<QikAgentAccount> {
  const agents = getLocalQikAgents();
  const id = agentData.id || `AGT-${Math.floor(100 + Math.random() * 900)}`;
  
  const existingIdx = agents.findIndex((a) => a.id === id);
  let finalAgent: QikAgentAccount;

  if (existingIdx >= 0) {
    finalAgent = { ...agents[existingIdx], ...agentData };
    agents[existingIdx] = finalAgent;
  } else {
    finalAgent = {
      id,
      name: agentData.name,
      owner: agentData.owner || agentData.name,
      email: agentData.email || `${id.toLowerCase()}@hispaniolapay.com`,
      phone: agentData.phone || "809-555-0000",
      location: agentData.location || "República Dominicana",
      allocatedBalanceRD: agentData.allocatedBalanceRD || 0,
      currentBalanceRD: agentData.currentBalanceRD || agentData.allocatedBalanceRD || 0,
      totalSpentRD: 0,
      invoicesCount: 0,
      status: "active",
      lastActivityAt: new Date().toISOString(),
    };
    agents.push(finalAgent);
  }

  saveLocalQikAgents(agents);

  try {
    const docRef = doc(db, "qik_agents", finalAgent.id);
    await setDoc(docRef, finalAgent, { merge: true });
  } catch (_) {}

  recalculateMasterPool();
  return finalAgent;
}

export async function deleteQikAgent(agentId: string) {
  const agents = getLocalQikAgents().filter((a) => a.id !== agentId);
  saveLocalQikAgents(agents);
  try {
    const docRef = doc(db, "qik_agents", agentId);
    await deleteDoc(docRef);
  } catch (_) {}
  recalculateMasterPool();
}

export function subscribeQikAgents(callback: (agents: QikAgentAccount[]) => void) {
  callback(getLocalQikAgents());
  try {
    const q = query(collection(db, "qik_agents"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: QikAgentAccount[] = [];
          snapshot.forEach((d) => list.push(d.data() as QikAgentAccount));
          if (list.length > 0) {
            saveLocalQikAgents(list);
            callback(list);
          }
        }
      },
      (err) => console.warn("Agents listener fallback:", err)
    );
    return unsub;
  } catch {
    return () => {};
  }
}

/* ============================================================
   3. TRANSACTIONS AUDIT LEDGER
   ============================================================ */

export function getLocalTransactions(): QikBalanceTransaction[] {
  if (typeof window === "undefined") return DEFAULT_TRANSACTIONS;
  try {
    const raw = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read transactions:", e);
  }
  return DEFAULT_TRANSACTIONS;
}

export function saveLocalTransactions(txs: QikBalanceTransaction[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(txs));
  } catch (e) {
    console.warn("Could not save transactions:", e);
  }
}

export async function recordTransaction(tx: QikBalanceTransaction) {
  const list = getLocalTransactions();
  const updated = [tx, ...list.filter((t) => t.id !== tx.id)].slice(0, 200);
  saveLocalTransactions(updated);

  try {
    const docRef = doc(db, "qik_transactions", tx.id);
    await setDoc(docRef, tx, { merge: true });
  } catch (_) {}
}

export function subscribeQikTransactions(callback: (txs: QikBalanceTransaction[]) => void) {
  callback(getLocalTransactions());
  try {
    const q = query(collection(db, "qik_transactions"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: QikBalanceTransaction[] = [];
          snapshot.forEach((d) => list.push(d.data() as QikBalanceTransaction));
          if (list.length > 0) {
            saveLocalTransactions(list);
            callback(list);
          }
        }
      },
      (err) => console.warn("Transactions listener fallback:", err)
    );
    return unsub;
  } catch {
    return () => {};
  }
}

/* ============================================================
   4. INVOICES STORAGE & AUTOMATIC AGENT BALANCE DEDUCTION
   ============================================================ */

export function getLocalQikInvoices(): QikInvoice[] {
  if (typeof window === "undefined") return DEMO_QIK_INVOICES;
  try {
    const raw = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read local Qik invoices:", e);
  }
  return DEMO_QIK_INVOICES;
}

export function saveLocalQikInvoices(invoices: QikInvoice[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.warn("Could not write local Qik invoices:", e);
  }
}

/**
 * Saves a Qik Invoice AND automatically deducts the payment amount from the assigned Agent's balance!
 */
export async function saveQikInvoiceWithDeduction(
  invoice: QikInvoice,
  agentId?: string,
  performedBy: string = "Operador"
): Promise<{ invoice: QikInvoice; agentBalanceAfter?: number; deducted: boolean }> {
  let finalInvoice = { ...invoice };
  let assignedAgentId = agentId || invoice.agentId;
  let deducted = false;
  let balanceAfter = 0;

  // Auto-deduct from agent balance if agent specified
  if (assignedAgentId) {
    const agents = getLocalQikAgents();
    const agentIdx = agents.findIndex((a) => a.id === assignedAgentId);

    if (agentIdx >= 0) {
      const agent = agents[agentIdx];
      const deductAmount = invoice.totalPagado || (invoice.montoServicio + (invoice.cargoServicio || 0));
      const previousBal = agent.currentBalanceRD;
      const newBal = Number((previousBal - deductAmount).toFixed(2));

      agent.currentBalanceRD = newBal;
      agent.totalSpentRD = Number(((agent.totalSpentRD || 0) + deductAmount).toFixed(2));
      agent.invoicesCount = (agent.invoicesCount || 0) + 1;
      agent.lastActivityAt = new Date().toISOString();

      agents[agentIdx] = agent;
      saveLocalQikAgents(agents);

      try {
        const docRef = doc(db, "qik_agents", agent.id);
        setDoc(docRef, agent, { merge: true }).catch(() => {});
      } catch (_) {}

      // Update invoice fields
      finalInvoice.agentId = agent.id;
      finalInvoice.agentName = agent.name;
      finalInvoice.deductedFromBalance = true;
      finalInvoice.balanceAfterPayment = newBal;
      deducted = true;
      balanceAfter = newBal;

      // Record transaction
      await recordTransaction({
        id: `TX-INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: "invoice_payment",
        agentId: agent.id,
        agentName: agent.name,
        amountRD: deductAmount,
        previousBalanceRD: previousBal,
        newBalanceRD: newBal,
        invoiceId: invoice.id,
        noReferencia: invoice.noReferencia,
        serviceName: invoice.servicio,
        timestamp: new Date().toISOString(),
        performedBy,
        note: `Pago de factura ${invoice.servicio} - Ref #${invoice.noReferencia}. Saldo restante: RD$ ${newBal.toLocaleString()}`,
      });

      recalculateMasterPool();
    }
  }

  // Update local invoices cache
  const localList = getLocalQikInvoices();
  const existingIdx = localList.findIndex(
    (item) => item.id === finalInvoice.id || item.noReferencia === finalInvoice.noReferencia
  );
  let updatedList: QikInvoice[];
  if (existingIdx >= 0) {
    updatedList = [...localList];
    updatedList[existingIdx] = finalInvoice;
  } else {
    updatedList = [finalInvoice, ...localList];
  }
  saveLocalQikInvoices(updatedList);

  // Sync to Firestore
  try {
    const docRef = doc(db, "qik_invoices", finalInvoice.id);
    await setDoc(docRef, finalInvoice, { merge: true });
  } catch (e) {
    console.warn("Firestore sync fallback for invoice:", e);
  }

  return { invoice: finalInvoice, agentBalanceAfter: balanceAfter, deducted };
}

export async function saveQikInvoice(invoice: QikInvoice): Promise<void> {
  await saveQikInvoiceWithDeduction(invoice, invoice.agentId);
}

export async function saveMultipleQikInvoices(
  invoices: QikInvoice[],
  defaultAgentId?: string,
  performedBy: string = "Sincronización Gmail"
): Promise<number> {
  const current = getLocalQikInvoices();
  let countAdded = 0;
  const existingMap = new Map<string, QikInvoice>();
  current.forEach((item) => existingMap.set(item.noReferencia || item.id, item));

  for (const inv of invoices) {
    const key = inv.noReferencia || inv.id;
    if (!existingMap.has(key)) {
      countAdded++;
      await saveQikInvoiceWithDeduction(inv, defaultAgentId || inv.agentId, performedBy);
    } else {
      // already exists, update record
      const docRef = doc(db, "qik_invoices", inv.id);
      setDoc(docRef, inv, { merge: true }).catch(() => {});
    }
  }

  return countAdded;
}

export async function removeQikInvoice(invoiceId: string): Promise<void> {
  const current = getLocalQikInvoices();
  const filtered = current.filter((inv) => inv.id !== invoiceId);
  saveLocalQikInvoices(filtered);

  try {
    const docRef = doc(db, "qik_invoices", invoiceId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn("Error deleting from Firestore:", e);
  }
}

export function subscribeQikInvoices(callback: (invoices: QikInvoice[]) => void) {
  callback(getLocalQikInvoices());

  try {
    const q = query(collection(db, "qik_invoices"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: QikInvoice[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as QikInvoice);
          });
          if (list.length > 0) {
            saveLocalQikInvoices(list);
            callback(list);
          }
        }
      },
      (error) => {
        console.warn("Firestore Qik invoices listener operated in offline cache mode:", error?.message || error);
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn("Could not setup snapshot listener:", e);
    return () => {};
  }
}

