import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  increment 
} from 'firebase/firestore';
import { ApiPartner, PartnerTransfer, SystemSettings } from './types';

// Colección Firestore para los partners/terceros de la API
const PARTNERS_COLLECTION = 'partners';
const TRANSFERS_COLLECTION = 'partner_transfers';

// Lista inicial de demostración en caso de que la colección esté vacía
const INITIAL_DEMO_PARTNERS: ApiPartner[] = [
  {
    id: 'ptn_demo_quisqueya',
    name: 'Quisqueya Remit Global',
    company: 'Quisqueya Financial Tech SRL',
    email: 'api@quisqueyaremit.com',
    phone: '+1 809-555-0199',
    apiKey: 'hp_live_9a7e3b2f81c44d15e9821a30f1469e',
    status: 'active',
    marginPercent: 3.5, // 3.5% de comisión ofrecido al tercero
    commissionType: 'percentage_margin',
    fixedFeeUSD: 0.0,
    walletBalanceUSD: 0.0,
    creditLimitUSD: 0.0,
    webhookUrl: 'https://webhook.site/quisqueya-remit-test',
    allowedCorridors: ['DO_TO_HT', 'US_TO_HT', 'US_TO_DO'],
    totalVolumeUSD: 42500.0,
    totalTransactions: 340,
    totalCommissionEarnedUSD: 1487.5,
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    createdAt: '2026-08-15T10:00:00.000Z',
    notes: 'Integración activa de envío a MonCash y cuentas Banreservas en lote.',
  },
  {
    id: 'ptn_demo_caribbeancash',
    name: 'Caribbean Payouts Inc',
    company: 'Caribbean Payouts LLC (Miami, FL)',
    email: 'dev@caribbeanpayouts.com',
    phone: '+1 305-555-8822',
    apiKey: 'hp_live_4b8f1c99e2a37d88f6120c45d9018e',
    status: 'active',
    marginPercent: 2.8, // 2.8% fijado para este tercero
    commissionType: 'percentage_margin',
    fixedFeeUSD: 0.5,
    walletBalanceUSD: 0.0,
    creditLimitUSD: 0.0,
    webhookUrl: 'https://api.caribbeanpayouts.com/v1/webhooks/hispaniolapay',
    allowedCorridors: ['US_TO_HT', 'DO_TO_HT'],
    totalVolumeUSD: 89300.0,
    totalTransactions: 720,
    totalCommissionEarnedUSD: 2500.4,
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    createdAt: '2026-07-20T14:30:00.000Z',
    notes: 'Procesador de remesas B2B desde Florida hacia Haití (NatCash & MonCash).',
  },
];

// Fallback en memoria durante runtime en caso de latencia de Firestore
const memoryPartners = new Map<string, ApiPartner>(
  INITIAL_DEMO_PARTNERS.map((p) => [p.apiKey, p])
);

/**
 * Genera una nueva API Key segura para un socio tercero
 */
export function generatePartnerApiKey(prefix: 'hp_live_' | 'hp_test_' = 'hp_live_'): string {
  const chars = '0123456789abcdef';
  let randomHex = '';
  for (let i = 0; i < 30; i++) {
    randomHex += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${randomHex}`;
}

/**
 * Obtiene un socio por su API Key (usado en el middleware de autenticación del endpoint /api/v1/partner/*)
 */
export async function getPartnerByApiKey(apiKey: string): Promise<ApiPartner | null> {
  if (!apiKey || typeof apiKey !== 'string') return null;
  const cleanKey = apiKey.trim().replace(/^Bearer\s+/i, '');

  // 1. Buscar en memoria primero para máxima velocidad
  if (memoryPartners.has(cleanKey)) {
    return memoryPartners.get(cleanKey)!;
  }

  // 2. Buscar en Firestore
  try {
    const q = query(
      collection(db, PARTNERS_COLLECTION),
      where('apiKey', '==', cleanKey),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const partnerDoc = snapshot.docs[0];
      const partner = { id: partnerDoc.id, ...partnerDoc.data() } as ApiPartner;
      memoryPartners.set(cleanKey, partner);
      return partner;
    }
  } catch (err) {
    console.warn('[PartnerService] Error al consultar partner en Firestore:', err);
  }

  // Si coincide con alguna demo pero no estaba en memoria
  const fallback = INITIAL_DEMO_PARTNERS.find((p) => p.apiKey === cleanKey);
  if (fallback) {
    memoryPartners.set(cleanKey, fallback);
    return fallback;
  }

  return null;
}

/**
 * Obtiene todos los socios registrados (para el panel de administración)
 */
export async function getAllPartners(): Promise<ApiPartner[]> {
  try {
    const snapshot = await getDocs(collection(db, PARTNERS_COLLECTION));
    if (!snapshot.empty) {
      const list: ApiPartner[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ApiPartner);
      });
      // Sincronizar memoria
      list.forEach((p) => memoryPartners.set(p.apiKey, p));
      return list;
    } else {
      // Si la colección está vacía en Firestore, persistir los socios iniciales
      const list: ApiPartner[] = [];
      for (const demo of INITIAL_DEMO_PARTNERS) {
        try {
          await setDoc(doc(db, PARTNERS_COLLECTION, demo.id), demo);
          memoryPartners.set(demo.apiKey, demo);
          list.push(demo);
        } catch (seedErr) {
          console.warn('[PartnerService] No se pudo inicializar partner demo en Firestore:', seedErr);
        }
      }
      return list.length > 0 ? list : Array.from(memoryPartners.values());
    }
  } catch (err) {
    console.warn('[PartnerService] Firestore no disponible o usando fallback en memoria:', err);
  }

  return Array.from(memoryPartners.values());
}

/**
 * Crea o registra un nuevo socio tercero
 */
export async function createPartner(
  data: Omit<ApiPartner, 'id' | 'createdAt' | 'totalVolumeUSD' | 'totalTransactions' | 'totalCommissionEarnedUSD'>
): Promise<ApiPartner> {
  const partnerId = `ptn_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const newPartner: ApiPartner = {
    id: partnerId,
    ...data,
    totalVolumeUSD: 0,
    totalTransactions: 0,
    totalCommissionEarnedUSD: 0,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, PARTNERS_COLLECTION, partnerId), newPartner);
  } catch (err) {
    console.warn('[PartnerService] No se pudo guardar en Firestore, guardando en memoria:', err);
  }

  memoryPartners.set(newPartner.apiKey, newPartner);
  return newPartner;
}

/**
 * Actualiza la configuración de un socio (especialmente su % de comisión o margen)
 */
export async function updatePartner(
  partnerId: string,
  updates: Partial<ApiPartner>
): Promise<ApiPartner | null> {
  let partner: ApiPartner | null = null;

  // Actualizar en Firestore
  try {
    const partnerRef = doc(db, PARTNERS_COLLECTION, partnerId);
    const snap = await getDoc(partnerRef);
    if (snap.exists()) {
      await updateDoc(partnerRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      partner = { id: snap.id, ...snap.data(), ...updates } as ApiPartner;
    }
  } catch (err) {
    console.warn('[PartnerService] Error al actualizar partner en Firestore:', err);
  }

  // Actualizar en memoria
  for (const [key, p] of memoryPartners.entries()) {
    if (p.id === partnerId) {
      const updated = { ...p, ...updates, updatedAt: new Date().toISOString() };
      memoryPartners.set(key, updated);
      partner = updated;
      break;
    }
  }

  return partner;
}

/**
 * Recargar o ajustar el saldo de la billetera B2B del socio
 */
export async function adjustPartnerBalance(
  partnerId: string,
  amountUSD: number,
  notes?: string
): Promise<{ success: boolean; newBalanceUSD: number }> {
  let newBalance = 0;

  try {
    const partnerRef = doc(db, PARTNERS_COLLECTION, partnerId);
    await updateDoc(partnerRef, {
      walletBalanceUSD: increment(amountUSD),
      updatedAt: new Date().toISOString(),
      ...(notes ? { notes } : {}),
    });
    const snap = await getDoc(partnerRef);
    if (snap.exists()) {
      newBalance = (snap.data() as ApiPartner).walletBalanceUSD;
    }
  } catch (err) {
    console.warn('[PartnerService] Ajuste en memoria:', err);
  }

  for (const [key, p] of memoryPartners.entries()) {
    if (p.id === partnerId) {
      p.walletBalanceUSD = Math.round((p.walletBalanceUSD + amountUSD) * 100) / 100;
      newBalance = p.walletBalanceUSD;
      memoryPartners.set(key, p);
      break;
    }
  }

  return { success: true, newBalanceUSD: newBalance };
}

/**
 * Elimina o revoca un socio
 */
export async function deletePartner(partnerId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, PARTNERS_COLLECTION, partnerId));
  } catch (err) {
    console.warn('[PartnerService] Error borrando de Firestore:', err);
  }

  for (const [key, p] of memoryPartners.entries()) {
    if (p.id === partnerId) {
      memoryPartners.delete(key);
      break;
    }
  }

  return true;
}

/**
 * Calcula una cotización oficial de remesa personalizada para el tercero,
 * aplicando el % fijado para ese socio en particular.
 */
export function calculatePartnerQuote(
  partner: ApiPartner,
  settings: SystemSettings,
  params: {
    sendAmount?: number;
    receiveAmount?: number;
    sourceCurrency: 'USD' | 'DOP';
    targetCurrency: 'HTG' | 'DOP' | 'USD';
    operator: 'MonCash' | 'NatCash' | 'Banreservas' | 'Banco BHD' | 'Banco Popular' | string;
  }
) {
  const rateDOP = settings.publicRateDOP || 58.5;
  const rateHTG = settings.publicRateHTG || 132.2;
  const partnerMarginPct = Number(partner.marginPercent) || 0; // % fijado al tercero (e.g. 3.5%)

  // 1. Determinar el monto de envío en USD base
  let sendAmountUSD = 0;
  const rawSend = params.sendAmount ? Number(params.sendAmount) : 0;

  if (params.sourceCurrency === 'DOP') {
    sendAmountUSD = rawSend / rateDOP;
  } else {
    sendAmountUSD = rawSend;
  }

  // 2. Determinar la tasa de cambio efectiva
  let effectiveExchangeRate = 0;
  if (params.targetCurrency === 'HTG') {
    effectiveExchangeRate = rateHTG;
  } else if (params.targetCurrency === 'DOP') {
    effectiveExchangeRate = rateDOP;
  } else {
    effectiveExchangeRate = 1.0;
  }

  // 3. Cálculo de la comisión / beneficio para el tercero según su % fijado:
  // El tercero gana el % acordado (ej: 3.5%) sobre el monto enviado.
  const partnerCommissionUSD = Math.round(sendAmountUSD * (partnerMarginPct / 100) * 100) / 100;
  const fixedFee = partner.fixedFeeUSD || 0;
  const totalPartnerProfitUSD = Math.round((partnerCommissionUSD + fixedFee) * 100) / 100;

  // 4. Monto a entregar al destinatario en destino
  // Si envía $100 USD hacia Haití (HTG), recibe: $100 * rateHTG
  let targetAmount = 0;
  if (params.receiveAmount && Number(params.receiveAmount) > 0) {
    targetAmount = Number(params.receiveAmount);
    // Recalcular sendAmount a partir del target
    if (params.targetCurrency === 'HTG') {
      sendAmountUSD = targetAmount / effectiveExchangeRate;
    } else if (params.targetCurrency === 'DOP') {
      sendAmountUSD = targetAmount / effectiveExchangeRate;
    }
  } else {
    targetAmount = Math.round(sendAmountUSD * effectiveExchangeRate * 100) / 100;
  }

  // 5. Costo neto que se le debita al partner de su billetera B2B:
  // Es el monto principal menos la comisión que él retiene/gana, más fees si aplica.
  const netDebitedUSD = Math.round((sendAmountUSD - partnerCommissionUSD) * 100) / 100;

  return {
    sourceCurrency: params.sourceCurrency,
    sourceAmount: rawSend || Math.round((params.sourceCurrency === 'DOP' ? sendAmountUSD * rateDOP : sendAmountUSD) * 100) / 100,
    sourceAmountUSD: Math.round(sendAmountUSD * 100) / 100,
    targetCurrency: params.targetCurrency,
    targetAmount: Math.round(targetAmount * 100) / 100,
    exchangeRate: effectiveExchangeRate,
    operator: params.operator,
    
    // Desglose del % del Tercero
    partnerPricing: {
      partnerId: partner.id,
      partnerName: partner.name,
      agreedMarginPercent: partnerMarginPct,
      commissionType: partner.commissionType,
      partnerCommissionUSD: totalPartnerProfitUSD,
      netDebitedUSD: netDebitedUSD,
      walletAvailableUSD: partner.walletBalanceUSD + partner.creditLimitUSD,
      hasSufficientFunds: (partner.walletBalanceUSD + partner.creditLimitUSD) >= netDebitedUSD,
    },
    guaranteeDurationSeconds: 900, // Cotización asegurada por 15 minutos
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

/**
 * Registra una transferencia ejecutada a través de la API del socio
 */
export async function recordPartnerTransfer(
  transferData: Omit<PartnerTransfer, 'id' | 'createdAt'>
): Promise<PartnerTransfer> {
  const transferId = `TRX-PTN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
  const transfer: PartnerTransfer = {
    id: transferId,
    ...transferData,
    createdAt: new Date().toISOString(),
  };

  // 1. Guardar en Firestore
  try {
    await setDoc(doc(db, TRANSFERS_COLLECTION, transferId), transfer);
    
    // Actualizar métricas del partner
    const partnerRef = doc(db, PARTNERS_COLLECTION, transfer.partnerId);
    await updateDoc(partnerRef, {
      totalVolumeUSD: increment(transfer.sourceAmount),
      totalTransactions: increment(1),
      totalCommissionEarnedUSD: increment(transfer.partnerCommissionUSD),
      walletBalanceUSD: increment(-transfer.netDebitedUSD),
      lastUsedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[PartnerService] Error al persistir transferencia en Firestore:', err);
  }

  // 2. Actualizar en memoria
  for (const [key, p] of memoryPartners.entries()) {
    if (p.id === transfer.partnerId) {
      p.walletBalanceUSD = Math.round((p.walletBalanceUSD - transfer.netDebitedUSD) * 100) / 100;
      p.totalVolumeUSD = Math.round((p.totalVolumeUSD + transfer.sourceAmount) * 100) / 100;
      p.totalTransactions += 1;
      p.totalCommissionEarnedUSD = Math.round((p.totalCommissionEarnedUSD + transfer.partnerCommissionUSD) * 100) / 100;
      p.lastUsedAt = new Date().toISOString();
      memoryPartners.set(key, p);
      break;
    }
  }

  return transfer;
}

/**
 * Obtiene las transferencias procesadas vía API por un socio (o todas para el admin)
 */
export async function getPartnerTransfers(
  partnerId?: string,
  limitCount = 50
): Promise<PartnerTransfer[]> {
  try {
    let q;
    if (partnerId) {
      q = query(
        collection(db, TRANSFERS_COLLECTION),
        where('partnerId', '==', partnerId),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, TRANSFERS_COLLECTION),
        limit(limitCount)
      );
    }

    const snap = await getDocs(q);
    const list: PartnerTransfer[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as PartnerTransfer);
    });
    // Ordenar de más reciente a más antiguo en memoria
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  } catch (err) {
    console.warn('[PartnerService] No se pudieron cargar transferencias de Firestore:', err);
    return [];
  }
}

/**
 * Envía una notificación webhook al endpoint configurado por el tercero
 */
export async function dispatchPartnerWebhook(
  partner: ApiPartner,
  event: 'transfer.created' | 'transfer.completed' | 'transfer.failed',
  payload: any
): Promise<boolean> {
  if (!partner.webhookUrl || !partner.webhookUrl.startsWith('http')) {
    return false;
  }

  try {
    const res = await fetch(partner.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HispaniolaPay-Webhook/1.0',
        'X-Hispaniola-Event': event,
        'X-Hispaniola-Partner-Id': partner.id,
      },
      body: JSON.stringify({
        event,
        partnerId: partner.id,
        timestamp: new Date().toISOString(),
        data: payload,
      }),
      signal: AbortSignal.timeout(5000), // 5 segundos max
    });

    return res.ok;
  } catch (err) {
    console.warn('[PartnerWebhook] Fallo al entregar webhook:', err);
    return false;
  }
}
