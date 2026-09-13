"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { SystemSettings, RateAuditLog, OfficialBankAccount, LandingSubAgent, USRemittanceAccounts } from "@/lib/types"

export const DEFAULT_LANDING_SUB_AGENTS: LandingSubAgent[] = [
  { id: "0", name: "★ Sede Central HispaniolaPay", country: "DO", zone: "Monte Cristi", address: "Calle Principal #45, Las Matas de Santa Cruz", phone: "+1 809-579-0000", isHQ: true, active: true, services: "MonCash, Natcash, Depósitos Bancarios, Retiros", hours: "Lun - Sáb: 8:00 AM - 6:00 PM" },
  { id: "1", name: "Multi-Pagos Colonial", country: "DO", zone: "Distrito Nacional", address: "Calle El Conde #102, Zona Colonial", phone: "+1 809-221-0000", isHQ: false, active: true, services: "MonCash, Natcash, Giros Express", hours: "Lun - Sáb: 8:30 AM - 7:00 PM" },
  { id: "2", name: "Remesas Cibao Santiago", country: "DO", zone: "Santiago", address: "Av. 27 de Febrero, Plaza Central", phone: "+1 809-582-1111", isHQ: false, active: true, services: "MonCash, Natcash, Depósitos Bancos RD", hours: "Lun - Dom: 9:00 AM - 6:00 PM" },
  { id: "3", name: "Bavaro Express Payout", country: "DO", zone: "La Altagracia", address: "Av. Barceló, Plaza San Juan", phone: "+1 809-552-2222", isHQ: false, active: true, services: "MonCash, Natcash, USD/DOP", hours: "Lun - Sáb: 9:00 AM - 8:00 PM" },
  { id: "4", name: "Pòtoprens Transfert", country: "HT", zone: "Ouest", address: "Rue Capois, Port-au-Prince", phone: "+509 3711-0000", isHQ: false, active: true, services: "Retiros en Efectivo, MonCash, Natcash", hours: "Lun - Sam: 8:00 AM - 4:00 PM" },
  { id: "5", name: "Cap-Haïtien Payout Point", country: "HT", zone: "Nord", address: "Boulevard du Cap, Cap-Haïtien", phone: "+509 3711-2222", isHQ: false, active: true, services: "Desembolso HTG/USD, MonCash", hours: "Lun - Sam: 8:00 AM - 4:30 PM" },
  { id: "6", name: "Les Cayes Services", country: "HT", zone: "Sud", address: "Rue de la Liberté, Les Cayes", phone: "+509 3711-3333", isHQ: false, active: true, services: "MonCash, Natcash, Recargas", hours: "Lun - Sam: 8:30 AM - 5:00 PM" },
  { id: "7", name: "Miami Caribbean Express (USA)", country: "US", zone: "Florida", address: "NE 2nd Ave, Little Haiti, Miami FL", phone: "+1 (305) 579-8822", isHQ: false, active: true, services: "Zelle, CashApp, PayPal, Envíos a Haití y RD", hours: "Mon - Sat: 9:00 AM - 7:00 PM" }
]

export const DEFAULT_US_REMITTANCE_ACCOUNTS: USRemittanceAccounts = {
  zelleEmail: "pagos@hispaniolapay.com",
  zellePhone: "+1 (305) 579-8822",
  zelleHolder: "Hispaniola Pay LLC",
  cashAppTag: "$HispaniolaPay",
  cashAppHolder: "Hispaniola Pay Remittance",
  payPalEmail: "pagos@hispaniolapay.com",
  payPalLink: "https://paypal.me/hispaniolapay",
  instructions: "Envía en USD desde tu app favorita (Zelle, Cash App o PayPal). Incluye en la nota tu nombre y número de destino (MonCash / Natcash / Cuenta RD).",
  active: true,
}

export const DEFAULT_OFFICIAL_BANK_ACCOUNTS: OfficialBankAccount[] = [
  {
    id: "bank-br-dop",
    bankName: "Banco de Reservas (Banreservas)",
    accountNumber: "960-2481029-3",
    accountType: "corriente",
    currency: "DOP",
    holderName: "Hispaniola Pay SRL",
    documentId: "RNC: 1-32-84910-2",
    instructions: "Transferencia directa Banreservas o depósito en subagente Cerca Banreservas",
    active: true,
    logoColor: "#002F6C",
  },
  {
    id: "bank-bhd-dop",
    bankName: "Banco BHD",
    accountNumber: "284-918237-1",
    accountType: "ahorros",
    currency: "DOP",
    holderName: "Hispaniola Pay SRL",
    documentId: "RNC: 1-32-84910-2",
    instructions: "Transferencia ACH o Pago al Instante BCRD (acreditación inmediata)",
    active: true,
    logoColor: "#008852",
  },
  {
    id: "bank-pop-dop",
    bankName: "Banco Popular Dominicano",
    accountNumber: "802-918274-5",
    accountType: "corriente",
    currency: "DOP",
    holderName: "Hispaniola Pay SRL",
    documentId: "RNC: 1-32-84910-2",
    instructions: "Pago al Instante BCRD o depósito en ventanilla bancaria",
    active: true,
    logoColor: "#003882",
  },
  {
    id: "bank-br-usd",
    bankName: "Banreservas (Cuenta en Dólares USD)",
    accountNumber: "960-9102834-1",
    accountType: "ahorros",
    currency: "USD",
    holderName: "Hispaniola Pay SRL",
    documentId: "RNC: 1-32-84910-2",
    instructions: "Para depósitos directos en Dólares Estadounidenses (USD)",
    active: true,
    logoColor: "#002F6C",
  },
]

const DEFAULT_SETTINGS: SystemSettings = {
  publicRateDOP: 58.50,
  publicRateHTG: 132.20,
  publicRateUSD: 1.00,
  haitiPublicFeePercent: 8.0,
  haitiBencashSharePercent: 3.0,
  haitiSubAgentSharePercent: 2.0,
  haitiHispaniolaSharePercent: 3.0,
  agentRateDOP: 59.20,
  agentRateHTG: 133.80,
  agentReceptionFeeUSD: 1.50,
  agentPayoutPercentage: 2.0,
  platformFeePercentage: 5.0,
  bencashBaseUrl: "https://reseller.test.bencashgroup.com",
  bencashPrivateKey: "",
  moncashActive: true,
  natcashActive: true,
  whatsappApiEnabled: false,
  whatsappProvider: "cloud_api",
  whatsappApiToken: "",
  whatsappPhoneNumberId: "",
  whatsappBusinessAccountId: "",
  whatsappGatewayUrl: "",
  whatsappNotifySender: true,
  whatsappNotifyRecipient: true,
  whatsappNotifyInvoices: true,
  appLogoUrl: "",
  appLogoText: "HispaniolaPay",
  officialBankAccounts: DEFAULT_OFFICIAL_BANK_ACCOUNTS,
  usRemittanceAccounts: DEFAULT_US_REMITTANCE_ACCOUNTS,
  landingSubAgents: DEFAULT_LANDING_SUB_AGENTS,
  updatedAt: new Date().toISOString(),
  updatedBy: "Sistema Central",
}

interface SettingsContextType {
  settings: SystemSettings
  loading: boolean
  updateSettings: (newSettings: Partial<SystemSettings>, updatedByEmail?: string, note?: string) => Promise<boolean>
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  updateSettings: async () => false,
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Try reading from localStorage first for instant initial render
    try {
      const cached = localStorage.getItem("hispaniola_settings")
      if (cached) {
        const parsed = JSON.parse(cached)
        setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...parsed }))
      }
    } catch (e) {
      console.warn("Error reading cached settings:", e)
    }

    // 2. Fetch server runtime config if available (BenCash & WhatsApp)
    fetch("/api/bencash/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && (data.baseUrl || data.privateKey)) {
          setSettings((prev) => {
            const updated = {
              ...prev,
              bencashBaseUrl: data.baseUrl || prev.bencashBaseUrl,
              bencashPrivateKey: data.privateKey || prev.bencashPrivateKey,
            }
            try {
              localStorage.setItem("hispaniola_settings", JSON.stringify(updated))
            } catch (e) {}
            return updated
          })
        }
      })
      .catch((err) => console.warn("Failed fetching server bencash config:", err))

    fetch("/api/whatsapp/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.config) {
          setSettings((prev) => {
            const cfg = data.config
            const updated = {
              ...prev,
              whatsappApiEnabled: cfg.enabled !== undefined ? cfg.enabled : prev.whatsappApiEnabled,
              whatsappProvider: cfg.provider || prev.whatsappProvider,
              whatsappPhoneNumberId: cfg.phoneNumberId || prev.whatsappPhoneNumberId,
              whatsappBusinessAccountId: cfg.businessAccountId || prev.whatsappBusinessAccountId,
              whatsappGatewayUrl: cfg.gatewayUrl || prev.whatsappGatewayUrl,
              whatsappApiToken: cfg.apiToken || prev.whatsappApiToken,
              whatsappNotifySender: cfg.notifySender !== undefined ? cfg.notifySender : prev.whatsappNotifySender,
              whatsappNotifyRecipient: cfg.notifyRecipient !== undefined ? cfg.notifyRecipient : prev.whatsappNotifyRecipient,
              whatsappNotifyInvoices: cfg.notifyInvoices !== undefined ? cfg.notifyInvoices : prev.whatsappNotifyInvoices,
            }
            try {
              localStorage.setItem("hispaniola_settings", JSON.stringify(updated))
            } catch (e) {}
            return updated
          })
        }
      })
      .catch((err) => console.warn("Failed fetching server whatsapp config:", err))

    // 3. Subscribe to Firestore for real-time rates update
    const unsubscribe = onSnapshot(
      doc(db, "settings", "rates"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<SystemSettings>
          setSettings((prev) => {
            const merged: SystemSettings = {
              ...DEFAULT_SETTINGS,
              ...prev,
              ...data,
              // Protect API key and URL from being overwritten by empty Firestore fields
              bencashBaseUrl: data.bencashBaseUrl || prev.bencashBaseUrl || DEFAULT_SETTINGS.bencashBaseUrl,
              bencashPrivateKey: (data.bencashPrivateKey !== undefined && data.bencashPrivateKey !== "")
                ? data.bencashPrivateKey
                : (prev.bencashPrivateKey || ""),
              // Protect WhatsApp credentials
              whatsappApiToken: (data.whatsappApiToken !== undefined && data.whatsappApiToken !== "")
                ? data.whatsappApiToken
                : (prev.whatsappApiToken || ""),
              whatsappPhoneNumberId: (data.whatsappPhoneNumberId !== undefined && data.whatsappPhoneNumberId !== "")
                ? data.whatsappPhoneNumberId
                : (prev.whatsappPhoneNumberId || ""),
              whatsappGatewayUrl: (data.whatsappGatewayUrl !== undefined && data.whatsappGatewayUrl !== "")
                ? data.whatsappGatewayUrl
                : (prev.whatsappGatewayUrl || ""),
              // Logo & branding preservation
              appLogoUrl: data.appLogoUrl !== undefined ? data.appLogoUrl : (prev.appLogoUrl || ""),
              appLogoText: data.appLogoText || prev.appLogoText || DEFAULT_SETTINGS.appLogoText,
              // Official Dominican bank accounts preservation
              officialBankAccounts: (data.officialBankAccounts && data.officialBankAccounts.length > 0)
                ? data.officialBankAccounts
                : (prev.officialBankAccounts && prev.officialBankAccounts.length > 0 ? prev.officialBankAccounts : DEFAULT_OFFICIAL_BANK_ACCOUNTS),
              // US Remittance Accounts (Zelle, CashApp, PayPal)
              usRemittanceAccounts: data.usRemittanceAccounts || prev.usRemittanceAccounts || DEFAULT_US_REMITTANCE_ACCOUNTS,
              // Landing Sub-Agents preservation
              landingSubAgents: (data.landingSubAgents && data.landingSubAgents.length > 0)
                ? data.landingSubAgents
                : (prev.landingSubAgents && prev.landingSubAgents.length > 0 ? prev.landingSubAgents : DEFAULT_LANDING_SUB_AGENTS),
            }
            try {
              localStorage.setItem("hispaniola_settings", JSON.stringify(merged))
            } catch (e) {}
            return merged
          })
        } else {
          // Initialize Firestore document if it doesn't exist yet
          setDoc(doc(db, "settings", "rates"), DEFAULT_SETTINGS).catch((err) => {
            console.warn("Could not auto-initialize settings in Firestore:", err)
          })
        }
        setLoading(false)
      },
      (error) => {
        console.warn("Firestore settings snapshot error, using cached/default settings:", error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const updateSettings = async (
    newSettings: Partial<SystemSettings>,
    updatedByEmail: string = "Admin",
    note: string = "Actualización de tasas"
  ): Promise<boolean> => {
    try {
      const updated: SystemSettings = {
        ...settings,
        ...newSettings,
        updatedAt: new Date().toISOString(),
        updatedBy: updatedByEmail,
      }

      // Update state locally immediately
      setSettings(updated)
      try {
        localStorage.setItem("hispaniola_settings", JSON.stringify(updated))
      } catch (e) {}

      // Sync BenCash API credentials to server runtime
      if (newSettings.bencashBaseUrl !== undefined || newSettings.bencashPrivateKey !== undefined) {
        fetch("/api/bencash/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseUrl: updated.bencashBaseUrl,
            privateKey: updated.bencashPrivateKey,
          }),
        }).catch((e) => console.warn("Failed syncing config to server:", e))
      }

      // Sync WhatsApp API configuration to server runtime
      if (
        newSettings.whatsappApiEnabled !== undefined ||
        newSettings.whatsappApiToken !== undefined ||
        newSettings.whatsappPhoneNumberId !== undefined ||
        newSettings.whatsappGatewayUrl !== undefined ||
        newSettings.whatsappProvider !== undefined ||
        newSettings.whatsappNotifySender !== undefined ||
        newSettings.whatsappNotifyRecipient !== undefined ||
        newSettings.whatsappNotifyInvoices !== undefined
      ) {
        fetch("/api/whatsapp/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: updated.whatsappApiEnabled,
            provider: updated.whatsappProvider,
            apiToken: updated.whatsappApiToken,
            phoneNumberId: updated.whatsappPhoneNumberId,
            businessAccountId: updated.whatsappBusinessAccountId,
            gatewayUrl: updated.whatsappGatewayUrl,
            notifySender: updated.whatsappNotifySender,
            notifyRecipient: updated.whatsappNotifyRecipient,
            notifyInvoices: updated.whatsappNotifyInvoices,
          }),
        }).catch((e) => console.warn("Failed syncing whatsapp config to server:", e))
      }

      // Persist to Firestore with non-blocking timeout fallback
      try {
        const firestorePromise = setDoc(doc(db, "settings", "rates"), updated)
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3500))
        await Promise.race([firestorePromise, timeoutPromise])
      } catch (dbErr) {
        console.warn("Firestore save warning (settings preserved locally and server-side):", dbErr)
      }

      // Add audit log entry
      try {
        const auditLog: RateAuditLog = {
          timestamp: new Date().toISOString(),
          updatedBy: updatedByEmail,
          publicRateDOP: updated.publicRateDOP,
          publicRateHTG: updated.publicRateHTG,
          agentRateDOP: updated.agentRateDOP,
          agentRateHTG: updated.agentRateHTG,
          agentPayoutPercentage: updated.agentPayoutPercentage,
          agentReceptionFeeUSD: updated.agentReceptionFeeUSD,
          note,
        }
        addDoc(collection(db, "settings", "rates", "history"), auditLog).catch(() => {})
      } catch (auditErr) {
        console.warn("Failed to write rate audit log:", auditErr)
      }

      return true
    } catch (err) {
      console.error("Error updating settings:", err)
      return false
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSystemSettings() {
  return useContext(SettingsContext)
}

export const useSettings = useSystemSettings;
