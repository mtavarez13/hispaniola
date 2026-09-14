import { SubAgent } from "./types";

export const DEFAULT_SUB_AGENTS: SubAgent[] = [
  {
    id: "SA-101",
    name: "Agencia Fronteriza Dajabón",
    owner: "Juan Carlos Martínez",
    idNumber: "044-0019283-4",
    email: "dajabon@hispaniolapay.com",
    phone: "+1 (809) 579-8822",
    status: "active",
    commissionRatePercent: 2.5,
    localCurrency: "DOP",
    walletBalance: 0,
    creditLimit: 0,
    location: {
      country: "DO",
      province: "Dajabón",
      municipality: "Dajabón",
      exactAddress: "Calle Beller #14, esq. Dulce de Jesús Senfleur",
      reference: "A 100 metros del Puente Binacional Fronterizo",
      gps: {
        lat: 19.5488,
        lng: -71.7083,
        addressResolved: "Dajabón Centro, Frontera Norte"
      }
    },
    modules: {
      haitiRemittances: true,
      sendMoney: true,
      payouts: true,
      qikInvoices: true,
      mobileTopups: true,
      accounting: true,
      reports: true
    },
    createdAt: "2024-01-15T10:00:00.000Z",
    notes: "Agente principal de zona fronteriza norte. Alto volumen de MonCash y NatCash."
  },
  {
    id: "SA-102",
    name: "Transfers & Multiservices Ouanaminthe",
    owner: "Jean-Baptiste Pierre",
    idNumber: "NIF: 004-991-827-0",
    email: "ouanaminthe@hispaniolapay.com",
    phone: "+509 3788-9911",
    status: "active",
    commissionRatePercent: 3.0,
    localCurrency: "HTG",
    walletBalance: 0,
    creditLimit: 0,
    location: {
      country: "HT",
      province: "Nord-Est",
      municipality: "Ouanaminthe",
      exactAddress: "Rue Espagnole #88, près du Marché Public",
      reference: "Face à la Banque Nationale de Crédit (BNC)",
      gps: {
        lat: 19.5492,
        lng: -71.7242,
        addressResolved: "Ouanaminthe, Nord-Est, Haïti"
      }
    },
    modules: {
      haitiRemittances: true,
      sendMoney: true,
      payouts: true,
      qikInvoices: false,
      mobileTopups: true,
      accounting: true,
      reports: true
    },
    createdAt: "2024-02-01T14:30:00.000Z",
    notes: "Desembolsos en efectivo en HTG y recargas Digicel/Natcom."
  },
  {
    id: "SA-103",
    name: "Bodega & Giros El Carmen",
    owner: "Pedro Antonio Santos",
    idNumber: "001-1827364-2",
    email: "elcarmen@hispaniolapay.com",
    phone: "+1 (809) 682-4411",
    status: "active",
    commissionRatePercent: 2.0,
    localCurrency: "DOP",
    walletBalance: 0,
    creditLimit: 0,
    location: {
      country: "DO",
      province: "Distrito Nacional",
      municipality: "Villa Juana",
      exactAddress: "Calle Moca #102, esquina Tunti Cáceres",
      reference: "Frente al Colmado Hermanos Cruz",
      gps: {
        lat: 18.4891,
        lng: -69.9074,
        addressResolved: "Villa Juana, Distrito Nacional, Santo Domingo"
      }
    },
    modules: {
      haitiRemittances: true,
      sendMoney: true,
      payouts: true,
      qikInvoices: true,
      mobileTopups: true,
      accounting: false,
      reports: true
    },
    createdAt: "2024-02-20T09:15:00.000Z",
    notes: "Punto barrial de alta captación de remesas comunitarias."
  },
  {
    id: "SA-104",
    name: "Express Cash Pétion-Ville",
    owner: "Marie Claudette Lebrun",
    idNumber: "CIN: 01-02-99-1985-04-0012",
    email: "petionville@hispaniolapay.com",
    phone: "+509 3122-7744",
    status: "active",
    commissionRatePercent: 2.8,
    localCurrency: "USD",
    walletBalance: 0,
    creditLimit: 0,
    location: {
      country: "HT",
      province: "Ouest",
      municipality: "Pétion-Ville",
      exactAddress: "Rue Panamericaine #45, Complexe Lumina",
      reference: "À côté du Supermarché Giant",
      gps: {
        lat: 18.5125,
        lng: -72.2853,
        addressResolved: "Pétion-Ville, Ouest, Haïti"
      }
    },
    modules: {
      haitiRemittances: true,
      sendMoney: true,
      payouts: true,
      qikInvoices: false,
      mobileTopups: true,
      accounting: true,
      reports: true
    },
    createdAt: "2024-03-05T16:00:00.000Z",
    notes: "Agencia autorizada para pago de remesas en dólares USD y Gourdes."
  },
  {
    id: "SA-105",
    name: "Comercial Elías Piña Sur",
    owner: "Manuel de Jesús Gómez",
    idNumber: "074-0002918-1",
    email: "eliaspina@hispaniolapay.com",
    phone: "+1 (829) 441-3300",
    status: "active",
    commissionRatePercent: 3.5,
    localCurrency: "DOP",
    walletBalance: 0,
    creditLimit: 0,
    location: {
      country: "DO",
      province: "Elías Piña",
      municipality: "Comendador",
      exactAddress: "Av. 27 de Febrero #22, salida hacia Belladère",
      reference: "Cerca de Aduanas de Comendador",
      gps: {
        lat: 18.8789,
        lng: -71.7031,
        addressResolved: "Comendador, Elías Piña, Frontera Sur"
      }
    },
    modules: {
      haitiRemittances: true,
      sendMoney: true,
      payouts: true,
      qikInvoices: true,
      mobileTopups: true,
      accounting: true,
      reports: true
    },
    createdAt: "2024-03-12T11:20:00.000Z",
    notes: "Punto de cambio y envío binacional en la puerta sur."
  }
];

const STORAGE_KEY = "hispaniolapay_subagents_v3";

export function loadSubAgentsFromStorage(): SubAgent[] {
  if (typeof window === "undefined") return DEFAULT_SUB_AGENTS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUB_AGENTS));
      return DEFAULT_SUB_AGENTS;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUB_AGENTS));
      return DEFAULT_SUB_AGENTS;
    }
    return parsed;
  } catch (error) {
    console.error("Error reading sub-agents from localStorage:", error);
    return DEFAULT_SUB_AGENTS;
  }
}

export function saveSubAgentsToStorage(subAgents: SubAgent[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subAgents));
  } catch (error) {
    console.error("Error saving sub-agents to localStorage:", error);
  }
}
