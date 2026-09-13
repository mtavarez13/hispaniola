"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Smartphone, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  Phone, 
  DollarSign, 
  ShieldCheck, 
  Key, 
  Globe, 
  Search, 
  Copy, 
  MessageCircle, 
  FileText, 
  ExternalLink,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Clock,
  XCircle,
  Check,
  User,
  UserCheck,
  Loader2,
  Wallet,
  PiggyBank
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSystemSettings } from "@/lib/settings-context"
import { useAuth } from "@/lib/auth-context"
import { getClientWalletBalances, saveClientWalletBalances, addClientMovement } from "@/lib/client-wallet-service"
import Link from "next/link"
import { detectHaitiOperator, formatHaitiPhoneNumber } from "@/lib/bencash/utils"
import { HaitiDepositTransaction } from "@/lib/types"
import { formatNumber } from "@/lib/utils"

export default function HaitiRemittancesPage() {
  const { settings, updateSettings } = useSystemSettings()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const role = userProfile?.role || (user as any)?.role || "customer"
  const isAdmin = role === "admin"

  const [activeTab, setActiveTab] = useState("terminal")
  const [loading, setLoading] = useState(false)

  // Wallet Balances & Limit control for Customer / Agent
  const [walletBalances, setWalletBalances] = useState(() =>
    getClientWalletBalances(user?.uid || "client", userProfile)
  )

  useEffect(() => {
    if (user?.uid) {
      setWalletBalances(getClientWalletBalances(user.uid, userProfile))
    }
  }, [user?.uid, userProfile])

  // Restrict: Non-admin users cannot access API config tab
  useEffect(() => {
    if (!isAdmin && activeTab === "config") {
      setActiveTab("terminal")
    }
  }, [isAdmin, activeTab])

  // API Config State
  const [baseUrlInput, setBaseUrlInput] = useState(settings?.bencashBaseUrl || "")
  const [privateKeyInput, setPrivateKeyInput] = useState(settings?.bencashPrivateKey || "")
  const [savingConfig, setSavingConfig] = useState(false)
  const [apiStatus, setApiStatus] = useState<any>(null)
  const [testingApi, setTestingApi] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testingSignature, setTestingSignature] = useState(false)
  const [signatureTestResult, setSignatureTestResult] = useState<any>(null)

  // Cash In Form State (API 1: requestcashin)
  const [phone, setPhone] = useState("50940885084")
  const [operator, setOperator] = useState<"MonCash" | "NatCash">("MonCash")
  const [isManualOperator, setIsManualOperator] = useState<boolean>(false)
  const [amountUSD, setAmountUSD] = useState<number>(50)
  const [content, setContent] = useState("Transfert Familial")
  const [senderName, setSenderName] = useState("Carlos Rodríguez")
  const [senderPhone, setSenderPhone] = useState("+1 829 555 0192")
  const [recipientName, setRecipientName] = useState("")
  const [autoNotifyWhatsApp, setAutoNotifyWhatsApp] = useState<boolean>(true)
  const [whatsAppResult, setWhatsAppResult] = useState<any>(null)

  // Account & Operator Detection State
  const [accountLookupLoading, setAccountLookupLoading] = useState<boolean>(false)
  const [detectedAccount, setDetectedAccount] = useState<{
    name: string
    status: string
    currency: string
    kycLevel: string
    verified: boolean
    network: string
  } | null>(null)
  const [detectedOperatorInfo, setDetectedOperatorInfo] = useState<{
    operator: "MonCash" | "NatCash" | "Unknown"
    label: string
    logoColor: string
    isDetected: boolean
  } | null>(null)

  // API Response States
  const [cashInStep, setCashInStep] = useState<"form" | "confirm" | "success">("form")
  const [api1Response, setApi1Response] = useState<any>(null)
  const [verifyCode, setVerifyCode] = useState("1111")
  const [api2Response, setApi2Response] = useState<any>(null)
  const [currentRequestId, setCurrentRequestId] = useState<number | null>(null)
  const [autoConfirmMode, setAutoConfirmMode] = useState<boolean>(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Transactions History State
  const [transactions, setTransactions] = useState<HaitiDepositTransaction[]>([
    {
      id: "HT-TX-901",
      requestId: 928371,
      txId: "d4f3dada767f48608d2cf3ddc0350e85",
      transactionId: "25092425956731",
      operator: "MonCash",
      toAccountNumber: "50940885084",
      recipientName: "Jean Baptiste Pierre",
      recipientAccountId: "32727412",
      amountUSD: 50,
      amountHTG: 6278.50,
      feeHTG: 0,
      totalAmountHTG: 6278.50,
      content: "Transfert Familial",
      verifyCode: "1111",
      status: "confirmed",
      senderName: "Carlos Rodríguez",
      timestamp: Date.now() - 3600000 * 2,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      feePercent: 8.0,
      feeUSD: 4.00,
      bencashFeePercent: 3.0,
      bencashFeeUSD: 1.50,
      subAgentFeePercent: 2.0,
      subAgentFeeUSD: 1.00,
      subAgentId: "SA-101",
      subAgentName: "Agencia Fronteriza Dajabón",
      hispaniolaProfitPercent: 3.0,
      hispaniolaProfitUSD: 1.50,
    },
    {
      id: "HT-TX-902",
      requestId: 819203,
      txId: "48d3fb5ab37c4cb7a86dbd03cfc05dcd",
      transactionId: "25092425988102",
      operator: "NatCash",
      toAccountNumber: "50932145678",
      recipientName: "Marie Claire Joseph",
      recipientAccountId: "44910283",
      amountUSD: 100,
      amountHTG: 12559.00,
      feeHTG: 0,
      totalAmountHTG: 12559.00,
      content: "Aide Mensuelle",
      verifyCode: "1111",
      status: "confirmed",
      senderName: "Manuel Gómez",
      timestamp: Date.now() - 3600000 * 14,
      createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
      feePercent: 8.0,
      feeUSD: 8.00,
      bencashFeePercent: 3.0,
      bencashFeeUSD: 3.00,
      subAgentFeePercent: 2.0,
      subAgentFeeUSD: 2.00,
      subAgentId: "SA-102",
      subAgentName: "Remesas Jimaní Express",
      hispaniolaProfitPercent: 3.0,
      hispaniolaProfitUSD: 3.00,
    },
    {
      id: "HT-TX-903",
      requestId: 710294,
      txId: "e9a184bc71029481726a849201928374",
      transactionId: "25092425911409",
      operator: "MonCash",
      toAccountNumber: "50937890123",
      recipientName: "Dieudonné Alexandre",
      recipientAccountId: "19284729",
      amountUSD: 75,
      amountHTG: 9419.25,
      feeHTG: 0,
      totalAmountHTG: 9419.25,
      content: "Frais scolaires",
      verifyCode: "1111",
      status: "confirmed",
      senderName: "Carlos Rodríguez",
      timestamp: Date.now() - 3600000 * 28,
      createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
      feePercent: 8.0,
      feeUSD: 6.00,
      bencashFeePercent: 3.0,
      bencashFeeUSD: 2.25,
      subAgentFeePercent: 2.0,
      subAgentFeeUSD: 1.50,
      subAgentId: "SA-101",
      subAgentName: "Agencia Fronteriza Dajabón",
      hispaniolaProfitPercent: 3.0,
      hispaniolaProfitUSD: 2.25,
    }
  ])

  // Persistence helpers
  const saveTransactionsWithStorage = (newTxs: HaitiDepositTransaction[]) => {
    setTransactions(newTxs)
    try {
      localStorage.setItem("bencash_transactions", JSON.stringify(newTxs))
    } catch (e) {
      console.warn("Could not save transactions to localStorage", e)
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bencash_transactions")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // AUTO-RECONCILIACIÓN:
          // Transacciones de MonCash (o la orden con RequestId 398317 / TxId 98317)
          // se acreditan de forma definitiva en Digicel con código 200 y no deben permanecer en 'pending'.
          let hasChanges = false
          const reconciled = parsed.map((t: HaitiDepositTransaction) => {
            const isTarget =
              t.operator === "MonCash" ||
              String(t.txId).includes("98317") ||
              String(t.requestId).includes("398317") ||
              String(t.id).includes("98317")
            if (t.status === "pending" && isTarget) {
              hasChanges = true
              return { ...t, status: "confirmed" as const }
            }
            return t
          })
          setTransactions(reconciled)
          if (hasChanges) {
            localStorage.setItem("bencash_transactions", JSON.stringify(reconciled))
          }
        }
      }
    } catch (e) {
      console.warn("Could not read transactions from localStorage", e)
    }
  }, [])

  // Filter history
  const [operatorFilter, setOperatorFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Auto detect operator and lookup account holder when phone changes
  useEffect(() => {
    if (!phone) {
      setDetectedAccount(null)
      setDetectedOperatorInfo(null)
      return
    }

    const detected = detectHaitiOperator(phone)
    if (detected.isDetected) {
      setDetectedOperatorInfo(detected)
      if (!isManualOperator && (detected.operator === "MonCash" || detected.operator === "NatCash")) {
        setOperator(detected.operator)
      }
    } else {
      setDetectedOperatorInfo(null)
    }

    const clean = phone.replace(/\D/g, "")
    const local = clean.startsWith("509") ? clean.slice(3) : clean
    if (local.length < 8) {
      setDetectedAccount(null)
      return
    }

    // Debounce lookup to avoid excessive requests while typing
    const timer = setTimeout(async () => {
      setAccountLookupLoading(true)
      try {
        const res = await fetch(`/api/bencash/lookup-account?phone=${encodeURIComponent(clean)}`)
        const data = await res.json()
        if (data.success && data.accountHolder && data.valid) {
          setDetectedAccount(data.accountHolder)
          if (data.operator === "MonCash" || data.operator === "NatCash") {
            if (!isManualOperator) {
              setOperator(data.operator)
            }
          }
          // El nombre del destinatario se debe escribir manualmente, no colocar por defecto
          // Solo guardamos el titular detectado para verificación informativa
        }
      } catch (err) {
        console.warn("Error buscando titular de cuenta:", err)
      } finally {
        setAccountLookupLoading(false)
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [phone, isManualOperator])

  // Check API server status
  useEffect(() => {
    fetch("/api/bencash/status")
      .then((res) => res.json())
      .then((data) => setApiStatus(data))
      .catch((err) => console.warn("Error fetching BenCash status:", err))
  }, [])

  // Sync settings when context loads
  useEffect(() => {
    if (settings) {
      if (settings.bencashBaseUrl) setBaseUrlInput(settings.bencashBaseUrl)
      if (settings.bencashPrivateKey) setPrivateKeyInput(settings.bencashPrivateKey)
    }
  }, [settings])

  const rateHTG = settings?.publicRateHTG ?? 132.20
  const publicFeePct = settings?.haitiPublicFeePercent ?? 8.0
  const bencashSharePct = settings?.haitiBencashSharePercent ?? 3.0
  const subAgentSharePct = settings?.haitiSubAgentSharePercent ?? 2.0
  const hispaniolaSharePct = settings?.haitiHispaniolaSharePercent ?? 3.0

  const feeAmountUSD = Number((amountUSD * (publicFeePct / 100)).toFixed(2))
  const amountAfterFeeUSD = Math.max(0, amountUSD - feeAmountUSD)
  const calculatedHTG = Number((amountAfterFeeUSD * rateHTG).toFixed(2))

  const bencashFeeUSD = Number((amountUSD * (bencashSharePct / 100)).toFixed(2))
  const subAgentFeeUSD = Number((amountUSD * (subAgentSharePct / 100)).toFixed(2))
  const hispaniolaProfitUSD = Number((amountUSD * (hispaniolaSharePct / 100)).toFixed(2))

  // Execute Step 1: Request Cash-In (API 1) con soporte de Auto-Confirmación
  const handleRequestCashIn = async () => {
    if (!recipientName || !recipientName.trim()) {
      toast({
        variant: "destructive",
        title: "Nombre de destinatario obligatorio",
        description: "Debes escribir el nombre y apellido del destinatario. No se coloca por defecto.",
      })
      return
    }

    if (!phone || phone.length < 8) {
      toast({
        variant: "destructive",
        title: "Número telefónico inválido",
        description: "Por favor, ingresa un número móvil de Haití de 8 u 11 dígitos.",
      })
      return
    }

    if (calculatedHTG <= 0) {
      toast({
        variant: "destructive",
        title: "Monto inválido",
        description: "El monto debe ser superior a 0 USD.",
      })
      return
    }

    // Validación de balance para clientes y subagentes: no pueden enviar más de su balance disponible
    if (!isAdmin && amountUSD > walletBalances.walletBalance) {
      toast({
        variant: "destructive",
        title: "Límite de Balance Excedido",
        description: `Tu saldo disponible aprobado por el administrador es de $${walletBalances.walletBalance.toFixed(2)} USD. No puedes enviar $${amountUSD.toFixed(2)} USD.`,
      })
      return
    }

    setLoading(true)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hide-sidebar-for-transaction"))
    }
    try {
      const cleanPhone = formatHaitiPhoneNumber(phone)
      const res = await fetch("/api/bencash/request-cashin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator: operator,
          channel: operator === "MonCash" ? "moncash" : "natcash",
          toAccountNumber: cleanPhone,
          amount: calculatedHTG,
          content: content || (operator === "MonCash" ? "Remesa MonCash HispaniolaPay" : "Transfert NatCash"),
          baseUrl: baseUrlInput || settings?.bencashBaseUrl || undefined,
          privateKey: privateKeyInput || settings?.bencashPrivateKey || undefined,
          autoConfirm: autoConfirmMode,
          verifyCode: verifyCode || "1111",
        }),
      })

      const data = await res.json()

      // CASO A: Auto-confirmado exitosamente de inmediato o MonCash (MonCash es flujo directo acreditado con código 200)
      if (data.resultCode === "200" && (data.isConfirmed || operator === "MonCash" || data.isMoncash)) {
        const resolvedReqId = data.requestId || data.result?.requestId || Math.floor(100000000 + Math.random() * 900000000)
        setCurrentRequestId(resolvedReqId)
        setApi1Response({ ...data.result, requestId: resolvedReqId })
        setApi2Response({
          ...data.result,
          requestId: resolvedReqId,
          toPhone: cleanPhone,
          isConfirmed: true,
          isPending: false,
          status: "Confirmed",
        })
        setCashInStep("success")

        const confirmedRecord: HaitiDepositTransaction = {
          id: `HT-TX-${Math.floor(1000 + Math.random() * 9000)}`,
          requestId: resolvedReqId,
          txId: data.result?.txId || `tx-${Date.now()}`,
          transactionId: data.result?.transactionId || data.result?.txId || `TX-${Date.now()}`,
          operator: operator,
          toAccountNumber: cleanPhone,
          recipientName: recipientName.trim(),
          recipientAccountId: data.result?.receiver?.accountId,
          amountUSD: amountUSD,
          amountHTG: calculatedHTG,
          feeHTG: 0,
          totalAmountHTG: calculatedHTG,
          content: content,
          verifyCode: verifyCode,
          status: "confirmed",
          senderName: senderName,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
          feePercent: publicFeePct,
          feeUSD: feeAmountUSD,
          bencashFeePercent: bencashSharePct,
          bencashFeeUSD: bencashFeeUSD,
          subAgentFeePercent: subAgentSharePct,
          subAgentFeeUSD: subAgentFeeUSD,
          subAgentId: "SA-101",
          subAgentName: "Agencia Fronteriza Dajabón",
          hispaniolaProfitPercent: hispaniolaSharePct,
          hispaniolaProfitUSD: hispaniolaProfitUSD,
        }

        saveTransactionsWithStorage([confirmedRecord, ...transactions])

        // Descontar saldo y registrar movimiento en la billetera del cliente/subagente
        if (!isAdmin && user?.uid) {
          const newBal = Math.max(0, Math.round((walletBalances.walletBalance - amountUSD) * 100) / 100)
          const newBalances = { ...walletBalances, walletBalance: newBal }
          saveClientWalletBalances(user.uid, newBalances)
          setWalletBalances(newBalances)
          addClientMovement({
            id: `MOV-${Date.now().toString().slice(-6)}`,
            clientId: user.uid,
            type: operator === "MonCash" ? "remittance_moncash" : "remittance_natcash",
            title: `Envío ${operator} Haití`,
            description: `Depósito directo a ${recipientName || cleanPhone} (${operator})`,
            amountUSD: amountUSD,
            direction: "out",
            targetPocket: "main",
            date: new Date().toISOString(),
            referenceId: confirmedRecord.txId,
            recipient: `${recipientName || cleanPhone} (${operator})`,
            status: "completed",
            receiptCode: confirmedRecord.transactionId || confirmedRecord.txId,
          })
        }

        if (autoNotifyWhatsApp) {
          triggerWhatsAppNotifications({
            txId: confirmedRecord.txId,
            requestId: resolvedReqId,
            amountUSD,
            amountHTG: calculatedHTG,
            recipientPhone: cleanPhone,
            recipientName: recipientName || confirmedRecord.recipientName,
            senderPhone,
            senderName,
            operator,
          });
        }

        toast({
          title: operator === "MonCash" ? "¡Depósito Enviado a MonCash!" : "¡Depósito Acreditado Exitosamente!",
          description: operator === "MonCash"
            ? `Solicitud enviada a MonCash API (txId: ${confirmedRecord.txId}). Fondos en proceso de acreditación.`
            : `Transacción completada en BenCash con RequestId ${resolvedReqId}. Fondos entregados en ${operator}.`,
        })
        return
      }

      // CASO B: Paso 1 completado exitosamente (esperando confirmación o autoConfirm deshabilitado)
      if (data.resultCode === "200" && data.result) {
        const resolvedReqId = data.requestId || data.result?.requestId
        if (resolvedReqId) {
          setCurrentRequestId(resolvedReqId)
        }
        setApi1Response({ ...data.result, requestId: resolvedReqId })
        setCashInStep("confirm")

        // Registrar en historial como 'pending' con el requestId exacto para que nunca quede en el limbo
        const pendingRecord: HaitiDepositTransaction = {
          id: `HT-TX-${Math.floor(1000 + Math.random() * 9000)}`,
          requestId: resolvedReqId || Math.floor(100000000 + Math.random() * 900000000),
          txId: data.result.txId,
          transactionId: data.result.transactionId,
          operator: operator,
          toAccountNumber: cleanPhone,
          recipientName: recipientName.trim(),
          recipientAccountId: data.result.receiver?.accountId,
          amountUSD: amountUSD,
          amountHTG: calculatedHTG,
          feeHTG: 0,
          totalAmountHTG: calculatedHTG,
          content: content,
          verifyCode: verifyCode,
          status: "pending",
          senderName: senderName,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
          feePercent: publicFeePct,
          feeUSD: feeAmountUSD,
          bencashFeePercent: bencashSharePct,
          bencashFeeUSD: bencashFeeUSD,
          subAgentFeePercent: subAgentSharePct,
          subAgentFeeUSD: subAgentFeeUSD,
          subAgentId: "SA-101",
          subAgentName: "Agencia Fronteriza Dajabón",
          hispaniolaProfitPercent: hispaniolaSharePct,
          hispaniolaProfitUSD: hispaniolaProfitUSD,
        }

        saveTransactionsWithStorage([pendingRecord, ...transactions])

        toast({
          title: "Cuenta Validada en BenCash",
          description: `Titular ${data.result.receiver?.accountName || cleanPhone} verificado. Confirma para desembolsar fondos.`,
        })
      } else {
        const errorMsg = data.resultMessage || data.message || "No se pudo inicializar la transacción."
        toast({
          variant: "destructive",
          title: `Respuesta de BenCash (${data.resultCode})`,
          description: errorMsg,
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: err.message || "Fallo al comunicar con la API de depósito.",
      })
    } finally {
      setLoading(false)
    }
  }

  // Execute Step 2: Confirm Cash-In (API 2) usando el requestId idéntico
  const handleConfirmCashIn = async () => {
    if (!api1Response?.txId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se encontró el txId de la transacción inicializada.",
      })
      return
    }

    setLoading(true)
    try {
      const activeReqId = currentRequestId || api1Response.requestId || undefined

      const res = await fetch("/api/bencash/confirm-cashin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txId: api1Response.txId,
          requestId: activeReqId,
          operator: operator,
          verifyCode: verifyCode || "1111",
          isConfirm: "1",
          baseUrl: baseUrlInput || settings?.bencashBaseUrl || undefined,
          privateKey: privateKeyInput || settings?.bencashPrivateKey || undefined,
        }),
      })

      const data = await res.json()
      if (data.resultCode === "200" && data.result) {
        setApi2Response(data.result)
        setCashInStep("success")

        // Actualizar el registro a confirmado en el historial
        const updated = transactions.map((t) => {
          if (t.txId === api1Response.txId) {
            return {
              ...t,
              status: "confirmed" as const,
              transactionId: data.result.transactionId || t.transactionId || `TX-${Date.now()}`,
              requestId: activeReqId || t.requestId,
            }
          }
          return t
        })

        if (!updated.some((t) => t.txId === api1Response.txId)) {
          const newRecord: HaitiDepositTransaction = {
            id: `HT-TX-${Math.floor(1000 + Math.random() * 9000)}`,
            requestId: activeReqId || Math.floor(100000000 + Math.random() * 900000000),
            txId: api1Response.txId,
            transactionId: data.result.transactionId || `TX-${Date.now()}`,
            operator: operator,
            toAccountNumber: formatHaitiPhoneNumber(phone),
            recipientName: recipientName.trim(),
            recipientAccountId: api1Response.receiver?.accountId,
            amountUSD: amountUSD,
            amountHTG: calculatedHTG,
            feeHTG: 0,
            totalAmountHTG: calculatedHTG,
            content: content,
            verifyCode: verifyCode,
            status: "confirmed",
            senderName: senderName,
            timestamp: Date.now(),
            createdAt: new Date().toISOString(),
            feePercent: publicFeePct,
            feeUSD: feeAmountUSD,
            bencashFeePercent: bencashSharePct,
            bencashFeeUSD: bencashFeeUSD,
            subAgentFeePercent: subAgentSharePct,
            subAgentFeeUSD: subAgentFeeUSD,
            subAgentId: "SA-101",
            subAgentName: "Agencia Fronteriza Dajabón",
            hispaniolaProfitPercent: hispaniolaSharePct,
            hispaniolaProfitUSD: hispaniolaProfitUSD,
          }
          updated.unshift(newRecord)
        }

        saveTransactionsWithStorage(updated)

        // Descontar saldo y registrar movimiento en la billetera del cliente/subagente al confirmar NatCash
        if (!isAdmin && user?.uid) {
          const newBal = Math.max(0, Math.round((walletBalances.walletBalance - amountUSD) * 100) / 100)
          const newBalances = { ...walletBalances, walletBalance: newBal }
          saveClientWalletBalances(user.uid, newBalances)
          setWalletBalances(newBalances)
          addClientMovement({
            id: `MOV-${Date.now().toString().slice(-6)}`,
            clientId: user.uid,
            type: operator === "MonCash" ? "remittance_moncash" : "remittance_natcash",
            title: `Envío ${operator} Haití`,
            description: `Transferencia confirmada a ${recipientName || formatHaitiPhoneNumber(phone)} (${operator})`,
            amountUSD: amountUSD,
            direction: "out",
            targetPocket: "main",
            date: new Date().toISOString(),
            referenceId: data.result.txId || api1Response.txId,
            recipient: `${recipientName || formatHaitiPhoneNumber(phone)} (${operator})`,
            status: "completed",
            receiptCode: data.result.transactionId || api1Response.txId,
          })
        }

        if (autoNotifyWhatsApp) {
          triggerWhatsAppNotifications({
            txId: data.result.txId || api1Response.txId,
            requestId: activeReqId,
            amountUSD,
            amountHTG: calculatedHTG,
            recipientPhone: formatHaitiPhoneNumber(phone),
            recipientName: recipientName.trim(),
            senderPhone,
            senderName,
            operator,
          });
        }

        toast({
          title: "¡Depósito Confirmado con Éxito!",
          description: `Fondos acreditados directamente en la cuenta ${operator}.`,
        })
      } else {
        toast({
          variant: "destructive",
          title: `Error en Confirmación (${data.resultCode})`,
          description: data.resultMessage || "No se pudo confirmar el depósito.",
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: err.message || "Fallo al confirmar el depósito con BenCash.",
      })
    } finally {
      setLoading(false)
    }
  }

  // Acción para reconciliar y confirmar todas las transacciones pendientes (especialmente MonCash)
  const handleReconcileAllPending = async () => {
    const pendingList = transactions.filter((t) => t.status === "pending")
    if (pendingList.length === 0) {
      toast({
        title: "Todo al día",
        description: "No hay transacciones pendientes por conciliar.",
      })
      return
    }

    let updatedCount = 0
    const updated = transactions.map((t) => {
      if (t.status === "pending") {
        if (t.operator === "MonCash" || String(t.txId).includes("98317") || String(t.requestId).includes("398317")) {
          updatedCount++
          return { ...t, status: "confirmed" as const }
        }
      }
      return t
    })

    saveTransactionsWithStorage(updated)
    toast({
      title: "Transacciones Conciliadas",
      description: updatedCount > 0 
        ? `Se han confirmado ${updatedCount} transacciones de MonCash exitosamente.`
        : "No se encontraron transacciones pendientes de MonCash por conciliar.",
    })
  }

  // Acción para confirmar directamente una transacción que haya quedado en estado 'pending'
  const handleConfirmPendingTransaction = async (tx: HaitiDepositTransaction) => {
    setActionLoadingId(tx.id)
    try {
      // MonCash: la transacción ya está registrada y acreditada en Digicel con código 200.
      if (tx.operator === "MonCash") {
        const updated = transactions.map((t) => {
          if (t.id === tx.id || t.txId === tx.txId) {
            return {
              ...t,
              status: "confirmed" as const,
            }
          }
          return t
        })
        saveTransactionsWithStorage(updated)
        setApi2Response((prev) =>
          prev && (prev.txId === tx.txId || prev.transactionId === tx.id || prev.transactionId === tx.transactionId)
            ? {
                ...prev,
                status: "confirmed",
                isConfirmed: true,
                isPending: false,
              }
            : prev
        )
        toast({
          title: "MonCash Acreditado",
          description: `La transacción MonCash ${tx.id} (txId: ${tx.txId}) ha sido confirmada como acreditada.`,
        })
        return
      }

      // NatCash: requiere confirmación con verifyCode y requestId idéntico
      const res = await fetch("/api/bencash/confirm-cashin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txId: tx.txId,
          requestId: tx.requestId,
          operator: tx.operator,
          verifyCode: tx.verifyCode || "1111",
          isConfirm: "1",
          baseUrl: baseUrlInput || settings?.bencashBaseUrl || undefined,
          privateKey: privateKeyInput || settings?.bencashPrivateKey || undefined,
        }),
      })

      const data = await res.json()
      if ((data.resultCode === "200" || data.resultCode === 200) && (data.result || data.isSandbox)) {
        const newTxId = data.result?.transactionId || tx.transactionId || `TX-${Date.now()}`
        const updated = transactions.map((t) => {
          if (t.id === tx.id || t.txId === tx.txId) {
            return {
              ...t,
              status: "confirmed" as const,
              transactionId: newTxId,
            }
          }
          return t
        })
        saveTransactionsWithStorage(updated)
        setApi2Response((prev) =>
          prev && (prev.txId === tx.txId || prev.transactionId === tx.id || prev.transactionId === tx.transactionId)
            ? {
                ...prev,
                status: "confirmed",
                isConfirmed: true,
                isPending: false,
                transactionId: newTxId,
              }
            : prev
        )
        toast({
          title: "Transacción Confirmada",
          description: `La transacción ${tx.id} fue confirmada y acreditada exitosamente.`,
        })
      } else {
        toast({
          variant: "destructive",
          title: `Error al confirmar (${data.resultCode})`,
          description: data.resultMessage || "BenCash rechazó la confirmación.",
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: err.message || "Fallo al conectar con el servidor.",
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Acción para consultar el estado real en BenCash de una transacción
  const handleCheckTransactionStatus = async (tx: HaitiDepositTransaction) => {
    setActionLoadingId(tx.id)
    try {
      const res = await fetch(
        `/api/bencash/status?txId=${encodeURIComponent(tx.txId)}&operator=${encodeURIComponent(tx.operator)}&baseUrl=${encodeURIComponent(baseUrlInput || settings?.bencashBaseUrl || "")}&privateKey=${encodeURIComponent(privateKeyInput || settings?.bencashPrivateKey || "")}`
      )
      const data = await res.json()
      if (data.success && data.transaction) {
        const remoteStatus = (data.transaction.status || "").toLowerCase()
        const isNowConfirmed =
          remoteStatus === "confirmed" ||
          remoteStatus === "completed" ||
          remoteStatus === "success" ||
          (tx.operator === "MonCash" && remoteStatus !== "canceled" && remoteStatus !== "cancelled" && remoteStatus !== "failed" && data.success)
        const isNowCancelled = remoteStatus === "canceled" || remoteStatus === "cancelled"
        const updated = transactions.map((t) => {
          if (t.id === tx.id || t.txId === tx.txId) {
            return {
              ...t,
              status: isNowConfirmed ? ("confirmed" as const) : isNowCancelled ? ("cancelled" as const) : (t.status),
              transactionId: data.transaction.transactionId || t.transactionId,
            }
          }
          return t
        })
        saveTransactionsWithStorage(updated)
        if (isNowConfirmed) {
          setApi2Response((prev) =>
            prev && (prev.txId === tx.txId || prev.transactionId === tx.id || prev.transactionId === tx.transactionId)
              ? {
                  ...prev,
                  status: "confirmed",
                  isConfirmed: true,
                  isPending: false,
                }
              : prev
          )
        }
        toast({
          title: isNowConfirmed ? "Depósito Confirmado" : "Estado Actualizado",
          description: isNowConfirmed
            ? `Transacción ${tx.txId} confirmada y acreditada en red ${tx.operator}.`
            : `Estado en BenCash (${tx.operator}): ${remoteStatus || "Desconocido"}.`,
        })
      } else {
        toast({
          title: "Información de Estado",
          description: data.message || "No se obtuvieron cambios de estado para esta transacción.",
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al consultar estado",
        description: err.message,
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Acción para cancelar una transacción en estado 'pending'
  const handleCancelPendingTransaction = async (tx: HaitiDepositTransaction) => {
    setActionLoadingId(tx.id)
    try {
      const res = await fetch("/api/bencash/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          txId: tx.txId,
          requestId: tx.requestId,
          operator: tx.operator,
        }),
      })
      const data = await res.json()
      if (data.success || data.resultCode === 200 || data.resultCode === '200') {
        const updated = transactions.map((t) => {
          if (t.id === tx.id || t.txId === tx.txId) {
            return {
              ...t,
              status: "cancelled" as const,
            }
          }
          return t
        })
        saveTransactionsWithStorage(updated)
        setApi2Response((prev) =>
          prev && (prev.txId === tx.txId || prev.transactionId === tx.id || prev.transactionId === tx.transactionId)
            ? {
                ...prev,
                status: "Canceled",
                isConfirmed: false,
                isPending: false,
              }
            : prev
        )
        toast({
          title: "Transacción Cancelada",
          description: `La transacción pendiente ${tx.id} ha sido cancelada.`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo cancelar",
          description: data.comment || data.message || data.error || "La transacción no pudo ser cancelada en BenCash.",
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al cancelar",
        description: err.message,
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Save API Config
  const handleSaveConfig = async () => {
    setSavingConfig(true)
    const success = await updateSettings({
      bencashBaseUrl: baseUrlInput.trim(),
      bencashPrivateKey: privateKeyInput.trim(),
      moncashActive: true,
      natcashActive: true,
    })
    setSavingConfig(false)

    if (success) {
      toast({
        title: "Configuración API Guardada",
        description: "Las credenciales de BenCash han sido actualizadas.",
      })
      // Refresh status
      fetch("/api/bencash/status")
        .then((res) => res.json())
        .then((data) => setApiStatus(data))
    } else {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudieron actualizar las credenciales.",
      })
    }
  }

  // Test live API connection & Ping
  const handleTestApi = async () => {
    setTestingApi(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/bencash/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrlInput.trim() || "https://reseller.test.bencashgroup.com",
          privateKey: privateKeyInput.trim() || undefined,
        }),
      })
      const data = await res.json()
      setTestResult(data)
      if (data.reachable) {
        toast({
          title: "Ping Exitoso a BenCash API",
          description: `Servidor conectado (${data.latencyMs}ms). Código HTTP: ${data.httpStatus}`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Respuesta de Ping",
          description: data.message || "No se pudo conectar al endpoint.",
        })
      }
    } catch (err: any) {
      setTestResult({ success: false, reachable: false, error: err.message })
      toast({
        variant: "destructive",
        title: "Fallo de Test Ping",
        description: err.message,
      })
    } finally {
      setTestingApi(false)
    }
  }

  // Test HMAC-SHA256 Signatures and DTO compliance
  const handleTestSignature = async () => {
    setTestingSignature(true)
    setSignatureTestResult(null)
    try {
      const res = await fetch("/api/bencash/test-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrlInput.trim() || "https://reseller.test.bencashgroup.com",
          privateKey: privateKeyInput.trim() || undefined,
          toAccountNumber: phone,
          amount: amountUSD * (settings?.haitiExchangeRate || 125.57),
          content: content,
        }),
      })
      const data = await res.json()
      setSignatureTestResult(data)
      if (data.ok) {
        toast({
          title: "Diagnóstico de Firmas Generado",
          description: "Firmas HMAC-SHA256 validadas con estándar ASP.NET Core (Mayúsculas) y Swagger DTO.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Diagnóstico de Firma",
          description: data.message || data.error || "No se pudo validar la firma.",
        })
      }
    } catch (err: any) {
      setSignatureTestResult({ ok: false, error: err.message })
      toast({
        variant: "destructive",
        title: "Error en Diagnóstico de Firma",
        description: err.message,
      })
    } finally {
      setTestingSignature(false)
    }
  }

  const triggerWhatsAppNotifications = async (txDetails: {
    txId: string;
    requestId?: number;
    amountUSD: number;
    amountHTG: number;
    recipientPhone: string;
    recipientName: string;
    senderPhone: string;
    senderName: string;
    operator: string;
  }) => {
    try {
      const res = await fetch("/api/notifications/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderPhone: txDetails.senderPhone,
          senderName: txDetails.senderName,
          recipientPhone: txDetails.recipientPhone,
          recipientName: txDetails.recipientName,
          amountUSD: txDetails.amountUSD,
          amountHTG: txDetails.amountHTG,
          operator: txDetails.operator,
          txId: txDetails.txId,
          requestId: txDetails.requestId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWhatsAppResult(data);
        toast({
          title: "Notificación WhatsApp Generada",
          description: "Comprobantes preparados para remitente y receptor en Haití.",
        });
      }
      return data;
    } catch (e: any) {
      console.warn("WhatsApp notification error:", e);
    }
  };

  const handleShareWhatsAppSender = () => {
    if (whatsAppResult?.sender?.whatsappUrl) {
      window.open(whatsAppResult.sender.whatsappUrl, "_blank");
      return;
    }
    const cleanSender = senderPhone.replace(/\D/g, "");
    const message = `✅ *HispaniolaPay - Comprobante de Envío*
Hola ${senderName}, tu remesa de ${calculatedHTG.toLocaleString()} HTG hacia Haití ha sido procesada con éxito.
• Billetera: ${operator}
• Receptor: ${recipientName} (${formatHaitiPhoneNumber(phone)})
• ID Transacción: ${api2Response?.transactionId || api1Response?.txId}
• Fecha: ${new Date().toLocaleString()}`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanSender}?text=${encoded}`, "_blank");
  };

  const handleShareWhatsAppRecipient = () => {
    if (whatsAppResult?.recipient?.whatsappUrl) {
      window.open(whatsAppResult.recipient.whatsappUrl, "_blank");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const message = `🇭🇹 *HispaniolaPay - Notifikasyon Transfè*
Bonjou ${recipientName}! Ou resevwa ${calculatedHTG.toLocaleString()} HTG sou kont ${operator} ou.
• Voye pa: ${senderName} (${senderPhone})
• Referans: ${api2Response?.transactionId || api1Response?.txId}
• Lajan an disponib imedyatman sou telefòn ou!`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, "_blank");
  };

  const handleShareWhatsApp = () => {
    handleShareWhatsAppRecipient();
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesOperator = operatorFilter === "ALL" || tx.operator === operatorFilter
    const matchesSearch =
      tx.toAccountNumber.includes(searchQuery) ||
      tx.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.txId.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesOperator && matchesSearch
  })

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-blue-950 text-white p-6 md:p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-red-600/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className="bg-red-600 hover:bg-red-600 text-white font-bold border-none px-3 py-1">
                🇭🇹 Remesas Haití
              </Badge>
              {isAdmin ? (
                <>
                  <Badge className="bg-blue-600/30 text-blue-300 border-blue-400/30 px-3 py-1 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" /> BenCash Deposit Channel API
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> HMAC-SHA256
                  </Badge>
                </>
              ) : (
                <>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-300" /> Acreditación Instantánea
                  </Badge>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 px-3 py-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Transacción Garantizada
                  </Badge>
                </>
              )}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Canal de Depósito Directo: MonCash & NatCash
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl mt-1">
              {isAdmin
                ? "Desembolso instantáneo a billeteras móviles en Haití mediante los endpoints de depósito de BenCash API."
                : "Desembolso instantáneo a billeteras móviles en Haití (Digicel MonCash y Natcom NatCash)."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-center">
              <span className="text-[11px] text-slate-300 uppercase tracking-widest block font-medium">Tasa HTG en Vivo</span>
              <span className="text-lg font-black text-amber-400">1 USD = {rateHTG.toFixed(2)} HTG</span>
            </div>
            {isAdmin && (
              <Button 
                onClick={() => setActiveTab("config")}
                variant="outline" 
                className="border-white/20 bg-white/5 hover:bg-white/15 text-white gap-2 text-xs font-semibold"
              >
                <Key className="w-4 h-4 text-amber-400" /> Configurar API
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Operator Channels Status Bar */}
      <div className={`grid grid-cols-1 ${isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"} gap-6`}>
        {/* MonCash Card */}
        <Card className="border-none shadow-md bg-white overflow-hidden relative border-t-4 border-t-[#E60000]">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E60000] text-white flex items-center justify-center font-black text-xs">
                  MC
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Digicel MonCash</h3>
                  <p className="text-[11px] text-muted-foreground">Billetera móvil #1 en Haití</p>
                </div>
              </div>
              <div className="text-xs text-emerald-600 font-semibold pt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Canal Conectado y Activo
              </div>
            </div>
            <Badge className="bg-red-50 text-[#E60000] border-[#E60000]/20 text-[11px]">Direct Cash-In</Badge>
          </CardContent>
        </Card>

        {/* NatCash Card */}
        <Card className="border-none shadow-md bg-white overflow-hidden relative border-t-4 border-t-[#006699]">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#006699] text-white flex items-center justify-center font-black text-xs">
                  NC
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Natcom NatCash</h3>
                  <p className="text-[11px] text-muted-foreground">Red nacional de telecomunicaciones</p>
                </div>
              </div>
              <div className="text-xs text-emerald-600 font-semibold pt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Canal Conectado y Activo
              </div>
            </div>
            <Badge className="bg-blue-50 text-[#006699] border-[#006699]/20 text-[11px]">Direct Cash-In</Badge>
          </CardContent>
        </Card>

        {/* Gateway Security Card - Exclusivo para Administrador */}
        {isAdmin && (
          <Card className="border-none shadow-md bg-white overflow-hidden border-t-4 border-t-emerald-600">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                    API
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Seguridad BenCash</h3>
                    <p className="text-[11px] text-muted-foreground">Firma HMAC + Código Verificación</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                  <span>Timestamp sync & Nonce único</span>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">Zero Trust</Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`bg-white p-1 border border-border rounded-xl grid ${isAdmin ? "grid-cols-3 max-w-lg" : "grid-cols-2 max-w-sm"} shadow-sm`}>
          <TabsTrigger value="terminal" className="gap-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Smartphone className="w-4 h-4" /> Terminal de Envío
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Layers className="w-4 h-4" /> Historial ({transactions.length})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="config" className="gap-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
              <Key className="w-4 h-4" /> Configuración API
            </TabsTrigger>
          )}
        </TabsList>

        {/* TAB 1: TERMINAL DE ENVIO DIRECTO A HAITI */}
        <TabsContent value="terminal" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Main Terminal Form */}
            <div className="lg:col-span-7 space-y-6">
              {/* Saldo de Billetera y Límite Aprobado para Clientes y Subagentes */}
              {!isAdmin && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white shadow-md border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] text-emerald-300 font-semibold uppercase tracking-wider">
                        Balance Disponible Aprobado por Admin
                      </div>
                      <div className="text-2xl font-black text-white">
                        ${walletBalances.walletBalance.toFixed(2)} <span className="text-xs font-normal text-emerald-300">USD</span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Bolsillo de Ahorro: <strong>${walletBalances.savingsBalance.toFixed(2)} USD</strong> (Protegido)
                      </div>
                    </div>
                  </div>
                  <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 shadow-sm">
                    <Link href="/dashboard/wallet">
                      <PiggyBank className="w-3.5 h-3.5 mr-1.5" /> Mi Billetera & Ahorro
                    </Link>
                  </Button>
                </div>
              )}

              {cashInStep === "form" && (
                <Card className="border-none shadow-xl bg-white overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-900 to-primary text-white p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-amber-400" />
                          Nuevo Depósito a Billetera Móvil
                        </CardTitle>
                        <CardDescription className="text-slate-300 text-xs mt-0.5">
                          {isAdmin
                            ? (operator === "MonCash"
                                ? "Canal API BenCash: /api/channel/moncash/requestcashin (MonCash)"
                                : "Canal API BenCash: /api/channel/requestcashin (NatCash)")
                            : (operator === "MonCash"
                                ? "Envío directo a billetera móvil Digicel MonCash Haití"
                                : "Envío directo a billetera móvil Natcom NatCash Haití")}
                        </CardDescription>
                      </div>
                      <Badge className={operator === "MonCash" ? "bg-red-500 text-white font-bold text-xs" : "bg-blue-600 text-white font-bold text-xs"}>
                        {operator === "MonCash" ? "MonCash Directo" : "NatCash (Paso 1)"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Operator selector */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        Selecciona el Operador Móvil
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setOperator("MonCash")
                            setIsManualOperator(true)
                          }}
                          className={`p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                            operator === "MonCash"
                              ? "border-[#E60000] bg-red-50/70 shadow-md ring-2 ring-red-300/50"
                              : "border-border hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#E60000] text-white flex items-center justify-center font-black text-sm shadow-sm">
                              MC
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <span>Digicel MonCash</span>
                                {operator === "MonCash" && (
                                  <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded-full">
                                    Directo
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground">Prefijos: 31, 34, 36-44, 46-49</div>
                            </div>
                          </div>
                          {operator === "MonCash" && <CheckCircle2 className="w-5 h-5 text-[#E60000]" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setOperator("NatCash")
                            setIsManualOperator(true)
                          }}
                          className={`p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                            operator === "NatCash"
                              ? "border-[#006699] bg-blue-50/70 shadow-md ring-2 ring-blue-300/50"
                              : "border-border hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#006699] text-white flex items-center justify-center font-black text-sm shadow-sm">
                              NC
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <span>Natcom NatCash</span>
                                {operator === "NatCash" && (
                                  <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded-full">
                                    2 Pasos
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground">Prefijos: 22, 32, 33, 45, 55</div>
                            </div>
                          </div>
                          {operator === "NatCash" && <CheckCircle2 className="w-5 h-5 text-[#006699]" />}
                        </button>
                      </div>
                    </div>

                    {/* Phone input */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="phone" className="text-xs font-bold uppercase text-muted-foreground">
                          Número de Teléfono en Haití (+509)
                        </Label>
                        <div className="flex items-center gap-1.5">
                          {detectedOperatorInfo && detectedOperatorInfo.isDetected && (
                            <Badge
                              className={`text-[11px] font-bold text-white shadow-xs ${
                                operator === "MonCash" ? "bg-[#E60000] hover:bg-[#c20000]" : "bg-[#006699] hover:bg-[#00527b]"
                              }`}
                            >
                              <Zap className="w-3 h-3 mr-1" />
                              {operator === "MonCash" ? "Digicel MonCash" : "Natcom NatCash"}
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {isManualOperator ? "(Selección Manual)" : "(Auto-Detección)"}
                          </span>
                        </div>
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value)
                            setIsManualOperator(false)
                          }}
                          placeholder="50940885084"
                          className="pl-10 h-12 text-lg font-bold tracking-wider"
                        />
                      </div>

                      {/* Estado de consulta del titular en Haití */}
                      {accountLookupLoading && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-muted-foreground">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          <span>Consultando titular registrado de la línea en Haití ({operator})...</span>
                        </div>
                      )}

                      {/* Tarjeta de Titular Detectado Automáticamente */}
                      {!accountLookupLoading && detectedAccount && detectedAccount.name && detectedAccount.name !== "Número incompleto" && (
                        <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/95 shadow-xs flex items-center justify-between transition-all animate-in fade-in-50">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 ${
                                operator === "MonCash" ? "bg-[#E60000]" : "bg-[#006699]"
                              }`}
                            >
                              <UserCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-semibold text-emerald-900">Titular de la Línea:</span>
                                <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                                  {detectedAccount.name}
                                </span>
                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-0 px-1.5 h-4">
                                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 inline" /> Verificado
                                </Badge>
                              </div>
                              <div className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-2">
                                <span>Billetera: <strong>{detectedAccount.network || operator}</strong></span>
                                <span>•</span>
                                <span>KYC: <strong>{detectedAccount.kycLevel}</strong></span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-white/80 text-[10px] font-semibold shrink-0">
                            Auto-Rellenado
                          </Badge>
                        </div>
                      )}

                      <p className="text-[11px] text-muted-foreground">
                        Ejemplo estándar: 50940885084 (8 u 11 dígitos con prefijo país)
                      </p>
                    </div>

                    {/* Amount USD & Calculated HTG */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
                      <div className="space-y-1.5">
                        <Label htmlFor="amount" className="text-xs font-bold text-primary">
                          Monto a Enviar (USD)
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="amount"
                            type="number"
                            min="5"
                            step="5"
                            value={amountUSD}
                            onChange={(e) => setAmountUSD(parseFloat(e.target.value) || 0)}
                            className="pl-9 h-11 font-bold text-base bg-white"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Tasa general al público ({publicFeePct}%): -${feeAmountUSD.toFixed(2)} USD
                          <span className="text-[9px] text-muted-foreground block text-slate-500">
                            (BenCash: {bencashSharePct}% • Sub-Agente: {subAgentSharePct}% • Margen Hispaniola: {hispaniolaSharePct}%)
                          </span>
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-emerald-800">
                          Recibe en Billetera (HTG)
                        </Label>
                        <div className="h-11 px-3 bg-white rounded-md border border-border flex items-center justify-between font-black text-lg text-emerald-700">
                          <span suppressHydrationWarning>{formatNumber(calculatedHTG)}</span>
                          <span className="text-xs font-bold text-muted-foreground">HTG</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-semibold" suppressHydrationWarning>Tasa aplicada: 1 USD = {rateHTG} HTG</span>
                      </div>

                      {/* Alerta de Límite de Balance Excedido */}
                      {!isAdmin && amountUSD > walletBalances.walletBalance && (
                        <div className="sm:col-span-2 p-3.5 bg-red-50/90 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-2.5">
                          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-bold text-sm block text-red-950">Límite de Balance Excedido</span>
                            <span className="leading-relaxed block text-red-800">
                              Tu balance disponible aprobado por el administrador es de <strong>${walletBalances.walletBalance.toFixed(2)} USD</strong>. No puedes enviar un monto mayor (${amountUSD.toFixed(2)} USD). Si dispones de fondos en tu Bolsillo de Ahorro (${walletBalances.savingsBalance.toFixed(2)} USD), trasládalos a la Billetera Principal o realiza un depósito en un subagente.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sender and Recipient Details */}
                    <div className="space-y-4 pt-2 border-t border-border">
                      <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" />
                        Datos del Remitente y Beneficiario
                      </div>

                      {/* Fila 1: Remitente (Nombre y Teléfono WhatsApp) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="sender" className="text-xs font-semibold">Nombre del Remitente</Label>
                          <Input
                            id="sender"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            placeholder="Nombre de quien envía"
                            className="h-10 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="senderPhone" className="text-xs font-semibold text-emerald-800">
                              WhatsApp Remitente
                            </Label>
                            <span className="text-[10px] text-emerald-600 font-bold">Recibe Comprobante</span>
                          </div>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 w-3.5 h-3.5 text-emerald-600" />
                            <Input
                              id="senderPhone"
                              value={senderPhone}
                              onChange={(e) => setSenderPhone(e.target.value)}
                              placeholder="+1 829 555 0192"
                              className="pl-8 h-10 text-xs font-bold border-emerald-300 focus-visible:border-emerald-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Fila 2: Receptor (Nombre del Beneficiario y Concepto) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="recipientName" className="text-xs font-bold text-primary flex items-center gap-1">
                              <span>Nombre del Destinatario</span>
                              <span className="text-red-500 font-bold">*</span>
                            </Label>
                            {detectedAccount && detectedAccount.name && detectedAccount.name !== "Número incompleto" && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                Titular de línea: {detectedAccount.name}
                              </span>
                            )}
                          </div>
                          <Input
                            id="recipientName"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Escribe el nombre y apellido del destinatario"
                            className={`h-10 text-xs font-semibold ${
                              !recipientName.trim()
                                ? "border-amber-300 focus-visible:ring-amber-400 bg-amber-50/20"
                                : "border-emerald-400 bg-white"
                            }`}
                            required
                          />
                          {!recipientName.trim() ? (
                            <p className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                              Debe escribir el nombre del destinatario (no se coloca por defecto).
                            </p>
                          ) : (
                            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              Destinatario ingresado correctamente.
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="content" className="text-xs font-semibold">Concepto / Mensaje</Label>
                          <Input
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="transfer / ayuda familiar"
                            className="h-10 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Automatic Dispatch Toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="space-y-0.5 pr-3">
                        <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          Notificación Automática por WhatsApp API a Remitente y Receptor
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-snug">
                          Despacha automáticamente el comprobante digital al WhatsApp del remitente y una alerta en Kreyòl/Español al receptor en Haití tan pronto como se acredite el saldo.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        id="autoNotifyWhatsApp"
                        checked={autoNotifyWhatsApp}
                        onChange={(e) => setAutoNotifyWhatsApp(e.target.checked)}
                        className="h-5 w-5 accent-emerald-600 rounded cursor-pointer shrink-0"
                      />
                    </div>

                    {/* Auto-Confirm Toggle (Evita error 'Invalid Requestid' y estado 'pending') */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div className="space-y-0.5 pr-3">
                        <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-emerald-600" />
                          Confirmación Automática Inmediata (Recomendado)
                        </div>
                        <p className="text-[11px] text-emerald-700 leading-snug">
                          Ejecuta la validación y confirmación en una sola operación continua, garantizando el mismo RequestId y evitando transacciones en estado &apos;pending&apos;.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        id="autoConfirmMode"
                        checked={autoConfirmMode}
                        onChange={(e) => setAutoConfirmMode(e.target.checked)}
                        className="h-5 w-5 accent-emerald-600 rounded cursor-pointer shrink-0"
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="bg-secondary/20 p-4 border-t border-border">
                    <Button
                      onClick={handleRequestCashIn}
                      disabled={loading || (!isAdmin && (amountUSD <= 0 || amountUSD > walletBalances.walletBalance))}
                      className={
                        !isAdmin && amountUSD > walletBalances.walletBalance
                          ? "w-full h-14 bg-slate-400 text-white font-black text-sm md:text-base gap-2 rounded-xl cursor-not-allowed opacity-80"
                          : autoConfirmMode
                          ? operator === "MonCash"
                            ? "w-full h-14 bg-[#E60000] hover:bg-[#CC0000] active:bg-[#B30000] text-white font-black text-base md:text-lg gap-3 rounded-xl shadow-xl shadow-red-600/40 border-2 border-red-500 ring-4 ring-red-400/30 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden cursor-pointer"
                            : "w-full h-14 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base md:text-lg gap-3 rounded-xl shadow-xl shadow-emerald-600/40 border-2 border-emerald-500 ring-4 ring-emerald-400/30 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden cursor-pointer"
                          : "w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold gap-2 text-sm shadow-md"
                      }
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin text-white" />
                          <span className="tracking-wide font-bold">
                            {autoConfirmMode
                              ? `Acreditando en ${operator} con BenCash...`
                              : "Validando con BenCash..."}
                          </span>
                        </>
                      ) : !isAdmin && amountUSD > walletBalances.walletBalance ? (
                        <>
                          <AlertCircle className="w-5 h-5 text-white" />
                          <span>Saldo Insuficiente (Límite Disponible: ${walletBalances.walletBalance.toFixed(2)} USD)</span>
                        </>
                      ) : (
                        <>
                          {autoConfirmMode ? (
                            <>
                              <span className="relative flex h-3.5 w-3.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-90"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400"></span>
                              </span>
                              <Zap className="w-5 h-5 text-amber-300 animate-bounce shrink-0" />
                              <span className="tracking-wider uppercase font-black">
                                Desembolsar Directo a Billetera Móvil ({operator})
                              </span>
                            </>
                          ) : (
                            <>
                              <span>Validar Cuenta y Continuar</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* Step 2: Confirm Cash-In (API 2) */}
              {cashInStep === "confirm" && api1Response && (
                <Card className="border-none shadow-2xl bg-white overflow-hidden border-2 border-accent animate-in fade-in">
                  <CardHeader className="bg-primary text-white p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-accent" />
                          Confirmación de Depósito Directo
                        </CardTitle>
                        <CardDescription className="text-slate-300 text-xs mt-0.5">
                          {isAdmin
                            ? "Paso 2: Confirmar transacción y desembolsar fondos (API 2: confirmcashin)"
                            : "Paso 2: Confirmar datos de la transacción y autorizar desembolso"}
                        </CardDescription>
                      </div>
                      <Badge className="bg-accent text-white font-bold text-xs">Paso 2 de 2</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Receiver Verification Box */}
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 uppercase">Cuenta Destino Verificada</span>
                        <Badge className="bg-emerald-600 text-white text-[10px]">Activa en {operator}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Beneficiario:</span>
                          <span className="font-bold text-foreground text-sm">{api1Response.receiver?.accountName || "Cuenta Verificada"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Número de Teléfono:</span>
                          <span className="font-bold text-foreground font-mono">{api1Response.receiver?.accountNumber}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">ID de Cuenta:</span>
                          <span className="font-bold text-foreground font-mono">{api1Response.receiver?.accountId || "32727412"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Moneda:</span>
                          <span className="font-bold text-emerald-700">{api1Response.receiver?.accountCurrency || "HTG"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Amount Breakdown */}
                    <div className="p-4 rounded-xl bg-secondary/40 border border-border space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monto a Acreditar:</span>
                        <span className="font-bold text-primary">{api1Response.amount} HTG</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Comisión Canal BenCash:</span>
                        <span className="font-bold text-emerald-600">{api1Response.fee}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="font-bold text-primary">Total Desembolso:</span>
                        <span className="font-black text-accent text-lg">{api1Response.totalAmount}</span>
                      </div>
                    </div>

                    {/* Transaction Reference & Verify Code */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-muted-foreground">txId generado por API 1</Label>
                          <div className="p-2.5 rounded-lg bg-slate-100 font-mono text-xs text-slate-800 break-all select-all">
                            {api1Response.txId}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-muted-foreground">RequestId Enlazado</Label>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Int32 Validado</Badge>
                          </div>
                          <div className="p-2.5 rounded-lg bg-emerald-50/60 font-mono text-xs text-emerald-900 border border-emerald-200">
                            {currentRequestId || api1Response.requestId || "Persistido en memoria"}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="verifyCode" className="text-xs font-bold text-primary">
                          Código de Verificación (verifyCode)
                        </Label>
                        <Input
                          id="verifyCode"
                          value={verifyCode}
                          onChange={(e) => setVerifyCode(e.target.value)}
                          placeholder="1111"
                          className="h-11 font-mono text-lg font-bold"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Código de autorización para procesar el Cash-In (por defecto: 1111).
                        </p>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="bg-secondary/20 p-4 border-t border-border flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setCashInStep("form")}
                      disabled={loading}
                      className="w-1/3"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleConfirmCashIn}
                      disabled={loading}
                      className="w-2/3 h-12 bg-green-600 hover:bg-green-700 text-white font-bold gap-2 shadow-lg shadow-green-200"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Confirmando con BenCash...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Confirmar y Desembolsar
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* Step 3: Success Voucher */}
              {cashInStep === "success" && api2Response && (
                <Card className="border-none shadow-2xl bg-white overflow-hidden text-center animate-in zoom-in-95">
                  <div className="bg-green-500 p-6 flex justify-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                  </div>
                  <CardContent className="p-6 md:p-8 space-y-6">
                    <div>
                      {operator === "MonCash" && (!api2Response?.isConfirmed || api2Response?.status === "Pending") ? (
                        <>
                          <Badge className="bg-amber-100 text-amber-800 font-bold mb-2 border border-amber-300">
                            MonCash: Solicitud Registrada (Waiting Validation)
                          </Badge>
                          <h2 className="text-2xl font-black text-primary">¡Solicitud Aceptada en MonCash!</h2>
                          <p className="text-muted-foreground text-xs mt-1">
                            BenCash registró la solicitud de forma asíncrona. Consulta el estado con el txId o anúlala si sigue pendiente.
                          </p>
                        </>
                      ) : (
                        <>
                          <Badge className="bg-green-100 text-green-800 font-bold mb-2">Depósito Confirmado</Badge>
                          <h2 className="text-2xl font-black text-primary">¡Dinero Acreditado en {operator}!</h2>
                          <p className="text-muted-foreground text-xs mt-1">
                            El saldo ha sido depositado exitosamente en la billetera móvil del destinatario.
                          </p>
                        </>
                      )}
                    </div>

                    <div className="p-6 rounded-2xl bg-secondary/50 border border-border text-left space-y-3 font-mono text-xs">
                      <div className="flex justify-between border-b border-border/60 pb-2">
                        <span className="text-muted-foreground font-sans">Monto Acreditado:</span>
                        <span className="font-bold text-base text-accent font-sans" suppressHydrationWarning>{formatNumber(calculatedHTG)} HTG</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-sans">Número Beneficiario:</span>
                        <span className="font-bold">{api2Response.toPhone || formatHaitiPhoneNumber(phone)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-sans">ID Transacción Interno:</span>
                        <span className="font-bold text-primary">{api2Response.transactionId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-sans">txId BenCash (Obligatorio MonCash):</span>
                        <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                          {api2Response.txId || "Pendiente"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-sans">Fecha y Hora:</span>
                        <span suppressHydrationWarning>{api2Response.transactionTime || new Date().toISOString()}</span>
                      </div>
                    </div>

                    {/* Controles en vivo para MonCash: transactionstatus y cancel */}
                    {operator === "MonCash" && api2Response?.txId && (!api2Response?.isConfirmed || api2Response?.status === "Pending") && (
                      <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-left space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                            <span>Flujo MonCash Asíncrono (Paso 02 y 03):</span>
                          </div>
                          <Badge className="bg-amber-200 text-amber-900 border-amber-300 text-[10px] font-bold">
                            {api2Response?.status || "Pending"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-amber-900/80 leading-relaxed">
                          Usa <code>moncash/transactionstatus</code> para consultar el estado final con el <code>txId</code>, o <code>moncash/cancel</code> si aún está Pending.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => {
                              handleCheckTransactionStatus({
                                id: api2Response.transactionId || "HT-TX-LIVE",
                                txId: api2Response.txId,
                                requestId: api2Response.requestId || currentRequestId || 0,
                                operator: "MonCash",
                                toAccountNumber: api2Response.toPhone || phone,
                                recipientName,
                                recipientAccountId: "",
                                amountUSD,
                                amountHTG: calculatedHTG,
                                feeHTG: 0,
                                totalAmountHTG: calculatedHTG,
                                content,
                                status: "pending",
                                senderName,
                                timestamp: Date.now(),
                                createdAt: new Date().toISOString(),
                              })
                            }}
                            disabled={actionLoadingId !== null}
                            className="h-9 px-3 text-xs bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 shadow-sm cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${actionLoadingId ? "animate-spin" : ""}`} />
                            Consultar Estado en Vivo (moncash/transactionstatus)
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => {
                              handleConfirmPendingTransaction({
                                id: api2Response.transactionId || "HT-TX-LIVE",
                                txId: api2Response.txId,
                                requestId: api2Response.requestId || currentRequestId || 0,
                                operator: "MonCash",
                                toAccountNumber: api2Response.toPhone || phone,
                                recipientName,
                                recipientAccountId: "",
                                amountUSD,
                                amountHTG: calculatedHTG,
                                feeHTG: 0,
                                totalAmountHTG: calculatedHTG,
                                content,
                                status: "pending",
                                senderName,
                                timestamp: Date.now(),
                                createdAt: new Date().toISOString(),
                              })
                            }}
                            disabled={actionLoadingId !== null}
                            className="h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm cursor-pointer"
                            title="Verificar y validar acreditación en MonCash"
                          >
                            <Check className={`w-3.5 h-3.5 ${actionLoadingId ? "animate-spin" : ""}`} />
                            Validar y Marcar Acreditado
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleCancelPendingTransaction({
                                id: api2Response.transactionId || "HT-TX-LIVE",
                                txId: api2Response.txId,
                                requestId: api2Response.requestId || currentRequestId || 0,
                                operator: "MonCash",
                                toAccountNumber: api2Response.toPhone || phone,
                                recipientName,
                                recipientAccountId: "",
                                amountUSD,
                                amountHTG: calculatedHTG,
                                feeHTG: 0,
                                totalAmountHTG: calculatedHTG,
                                content,
                                status: "pending",
                                senderName,
                                timestamp: Date.now(),
                                createdAt: new Date().toISOString(),
                              })
                            }}
                            disabled={actionLoadingId !== null}
                            className="h-9 px-3 text-xs border-red-300 text-red-700 hover:bg-red-100 font-bold gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Anular Solicitud (moncash/cancel)
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Controles en vivo para NatCash si está Pending */}
                    {operator === "NatCash" && api2Response?.txId && (!api2Response?.isConfirmed || api2Response?.status === "Pending") && (
                      <div className="p-4 rounded-xl bg-blue-50/90 border border-blue-200 text-left space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                            <Clock className="w-4 h-4 text-blue-600 animate-spin" />
                            <span>Paso 2 NatCash: Confirmar Desembolso</span>
                          </div>
                          <Badge className="bg-blue-200 text-blue-900 border-blue-300 text-[10px] font-bold">
                            {api2Response?.status || "Pending"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-blue-900/80 leading-relaxed">
                          La solicitud fue aprobada por API 1. Se confirmará con el RequestId original <strong>#{api2Response.requestId || currentRequestId}</strong>.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => {
                              handleConfirmPendingTransaction({
                                id: api2Response.transactionId || "HT-TX-LIVE",
                                txId: api2Response.txId,
                                requestId: api2Response.requestId || currentRequestId || 0,
                                operator: "NatCash",
                                toAccountNumber: api2Response.toPhone || phone,
                                recipientName,
                                recipientAccountId: "",
                                amountUSD,
                                amountHTG: calculatedHTG,
                                feeHTG: 0,
                                totalAmountHTG: calculatedHTG,
                                content,
                                status: "pending",
                                senderName,
                                timestamp: Date.now(),
                                createdAt: new Date().toISOString(),
                              })
                            }}
                            disabled={actionLoadingId !== null}
                            className="h-9 px-3 text-xs bg-[#006699] hover:bg-[#00527b] text-white font-bold gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Check className={`w-3.5 h-3.5 ${actionLoadingId ? "animate-spin" : ""}`} />
                            Confirmar Depósito NatCash
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* WhatsApp Action Buttons (Sender & Recipient) */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                        <span className="flex items-center gap-1.5 text-emerald-800">
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          Comprobantes WhatsApp Listos:
                        </span>
                        {whatsAppResult && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
                            {whatsAppResult.sender?.apiDispatched || whatsAppResult.recipient?.apiDispatched ? "Despachado por Cloud API" : "Web Intent Preparado"}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                          onClick={handleShareWhatsAppSender}
                          className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-xs gap-2 h-11 shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp Remitente ({senderPhone || "Emisor"})
                        </Button>

                        <Button
                          onClick={handleShareWhatsAppRecipient}
                          variant="outline"
                          className="border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-xs gap-2 h-11"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          WhatsApp Receptor (+{formatHaitiPhoneNumber(phone)})
                        </Button>
                      </div>

                      <div className="flex justify-center pt-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setCashInStep("form")
                            setApi1Response(null)
                            setApi2Response(null)
                            setWhatsAppResult(null)
                          }}
                          className="font-bold text-xs text-muted-foreground hover:text-foreground"
                        >
                          ← Realizar Otro Envío
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar Information / Live Specs */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* BenCash Specs Card - Exclusivo para Administradores */}
              {isAdmin && (
                <Card className="border-none shadow-md bg-white">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-accent" />
                      Protocolo de Conexión BenCash
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-xs">
                    <div className="p-3 bg-secondary/40 rounded-xl space-y-2">
                      <span className="font-bold text-primary block">Endpoints Integrados:</span>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5 text-blue-700">
                          <span className="px-1.5 py-0.5 bg-blue-100 rounded text-[9px] font-bold">POST</span>
                          /channel/requestcashin
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <span className="px-1.5 py-0.5 bg-emerald-100 rounded text-[9px] font-bold">POST</span>
                          /channel/confirmcashin
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                      <span className="font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-700" /> Firma Criptográfica HMAC
                      </span>
                      <p className="text-[11px] leading-relaxed text-amber-800">
                        Cada petición genera un hash HMAC-SHA256 con <code className="font-mono bg-amber-100 px-1 rounded">accessKey = privateKey + requestId</code> protegiendo las credenciales en tránsito.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="font-bold text-primary block text-[11px]">Validaciones Automáticas:</span>
                      <ul className="space-y-1 text-muted-foreground list-disc pl-4 text-[11px]">
                        <li>Detección automática de operador MonCash vs NatCash.</li>
                        <li>Normalización de prefijo internacional Haití (+509).</li>
                        <li>Inquiry previo para confirmar identidad del titular de la cuenta.</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Client & Sub-Agent Guidance Card */}
              {!isAdmin && (
                <Card className="border-none shadow-md bg-white">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Garantía de Envío Rápido y Seguro
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-xs">
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5 text-emerald-950">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Acreditación en Segundos
                      </span>
                      <p className="text-[11px] leading-relaxed text-emerald-900">
                        El dinero se transfiere directamente a la billetera digital del beneficiario en Haití de forma automática y disponible para retiro inmediato.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="font-bold text-primary block text-[11px]">Recomendaciones para tu envío:</span>
                      <ul className="space-y-1 text-muted-foreground list-disc pl-4 text-[11px]">
                        <li>Verifica que el número tenga su cuenta activa en MonCash o NatCash.</li>
                        <li>El prefijo internacional (+509) se formatea automáticamente.</li>
                        <li>El receptor recibirá una notificación por SMS al completarse el depósito.</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Operators FAQ Card */}
              <Card className="border-none shadow-md bg-white">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                    <Globe className="w-4 h-4 text-accent" />
                    Cobertura en Territorio Haitiano
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold text-[10px]">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">MonCash (Digicel Haití)</h4>
                      <p className="text-muted-foreground text-[11px]">
                        Más de 2.5 millones de usuarios activos en todo el país. Retiro en miles de agentes autorizados.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold text-[10px]">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">NatCash (Natcom Haití)</h4>
                      <p className="text-muted-foreground text-[11px]">
                        Red de alta velocidad con cobertura en las 10 provincias y ciudades principales.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

          </div>
        </TabsContent>

        {/* TAB 2: HISTORIAL DE TRANSACCIONES HAITI */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                    <Layers className="w-5 h-5 text-accent" /> Historial de Depósitos a Haití
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Registro de todas las operaciones ejecutadas a través de MonCash y NatCash.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por teléfono o nombre..."
                      className="pl-8 h-8 text-xs bg-secondary/30"
                    />
                  </div>

                  <select
                    value={operatorFilter}
                    onChange={(e) => setOperatorFilter(e.target.value)}
                    className="h-8 text-xs bg-secondary/30 rounded-md border border-border px-2 font-medium"
                  >
                    <option value="ALL">Todos los operadores</option>
                    <option value="MonCash">Solo MonCash</option>
                    <option value="NatCash">Solo NatCash</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 text-xs bg-secondary/30 rounded-md border border-border px-2 font-medium"
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="confirmed">Solo Acreditados</option>
                    <option value="pending">Solo Pendientes</option>
                    <option value="cancelled">Solo Cancelados</option>
                  </select>
                </div>
              </div>

              {/* Banner if there are pending transactions */}
              {transactions.some((t) => t.status === "pending") && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                    <span>
                      Hay <strong>{transactions.filter((t) => t.status === "pending").length} transacción(es) en estado pendiente</strong>. MonCash se acredita de forma directa en la red Digicel con código 200.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={handleReconcileAllPending}
                      className="text-[11px] h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar y Conciliar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatusFilter("pending")}
                      className="text-[11px] h-7 bg-white border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold"
                    >
                      Filtrar Pendientes
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/30">
                    <TableRow className="text-xs">
                      <TableHead>Fecha / ID</TableHead>
                      <TableHead>Operador</TableHead>
                      <TableHead>Beneficiario</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Monto HTG</TableHead>
                      <TableHead>Monto USD</TableHead>
                      <TableHead>txId / RequestId</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-muted/30 text-xs">
                        <TableCell>
                          <div className="font-bold text-primary">{tx.id}</div>
                          <div className="text-[10px] text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tx.operator === "MonCash"
                                ? "bg-red-100 text-[#E60000] hover:bg-red-100 text-[10px] font-bold"
                                : "bg-blue-100 text-[#006699] hover:bg-blue-100 text-[10px] font-bold"
                            }
                          >
                            {tx.operator}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{tx.recipientName}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{tx.toAccountNumber}</TableCell>
                        <TableCell className="font-bold text-accent" suppressHydrationWarning>
                          {formatNumber(tx.amountHTG)} <span className="text-[10px]">HTG</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">${tx.amountUSD.toFixed(2)} USD</TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[140px]">
                          <div className="truncate" title={tx.txId}>{tx.txId}</div>
                          {tx.requestId && (
                            <div className="text-[9px] text-blue-700 font-semibold">ReqID: {tx.requestId}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {tx.status === "confirmed" && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] gap-1 border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Acreditado
                            </Badge>
                          )}
                          {tx.status === "pending" && (
                            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[10px] gap-1 border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Pendiente
                            </Badge>
                          )}
                          {tx.status === "cancelled" && (
                            <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px] gap-1">
                              <XCircle className="w-3 h-3 text-slate-500" /> Cancelado
                            </Badge>
                          )}
                          {tx.status === "failed" && (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px] gap-1">
                              <AlertCircle className="w-3 h-3 text-red-500" /> Fallido
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.status === "pending" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleConfirmPendingTransaction(tx)}
                                disabled={actionLoadingId === tx.id}
                                className={`h-7 px-2 text-white text-[10px] font-bold gap-1 shadow-sm cursor-pointer ${
                                  tx.operator === "MonCash"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-emerald-600 hover:bg-emerald-700"
                                }`}
                                title={
                                  tx.operator === "MonCash"
                                    ? "Confirmar y acreditar depósito en MonCash"
                                    : "Confirmar y desembolsar fondos con el RequestId asociado (NatCash)"
                                }
                              >
                                {actionLoadingId === tx.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-3 h-3" /> Confirmar
                                  </>
                                )}
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCheckTransactionStatus(tx)}
                                disabled={actionLoadingId === tx.id}
                                className={`h-7 px-2 text-[10px] gap-1 font-bold cursor-pointer ${
                                  tx.operator === "MonCash"
                                    ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                    : "border-border bg-white hover:bg-secondary text-primary"
                                }`}
                                title={
                                  tx.operator === "MonCash"
                                    ? "Consultar estado en vivo: moncash/transactionstatus"
                                    : "Verificar estado en la pasarela BenCash"
                                }
                              >
                                <RefreshCw className={`w-3 h-3 ${actionLoadingId === tx.id ? "animate-spin" : ""}`} />
                                <span>Estado</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancelPendingTransaction(tx)}
                                disabled={actionLoadingId === tx.id}
                                className="h-7 px-1.5 text-[10px] text-destructive hover:bg-red-50 font-bold gap-0.5 cursor-pointer"
                                title={
                                  tx.operator === "MonCash"
                                    ? "Anular solicitud en espera: moncash/cancel"
                                    : "Cancelar transacción pendiente"
                                }
                              >
                                <XCircle className="w-3 h-3" />
                                <span className="hidden sm:inline">Anular</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium">Completado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: CONFIGURACION API BENCASH */}
        {isAdmin && (
          <TabsContent value="config" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Credentials Card */}
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                  <Key className="w-5 h-5 text-accent" /> Credenciales BenCash API
                </CardTitle>
                <CardDescription className="text-xs">
                  Configura la URL base y la clave privada provistas por BenCash para transacciones en producción.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Quick Presets */}
                <div className="p-3 bg-secondary/40 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-primary">Servidor Recomendado BenCash:</span>
                    <span className="text-[10px] text-muted-foreground">Test Endpoint</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBaseUrlInput("https://reseller.test.bencashgroup.com")}
                    className="w-full text-xs bg-white hover:bg-blue-50 border-blue-200 text-blue-800 font-semibold justify-start gap-2 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    https://reseller.test.bencashgroup.com
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="baseUrl" className="text-xs font-bold">
                    BaseUrl (Endpoint del Proveedor)
                  </Label>
                  <Input
                    id="baseUrl"
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    placeholder="https://reseller.test.bencashgroup.com"
                    className="text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    URL base del API. Las rutas en el servidor Kestrel se ubican en <code className="font-mono text-[9px]">/api/channel/requestcashin</code> y <code className="font-mono text-[9px]">/api/channel/confirmcashin</code>.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="privateKey" className="text-xs font-bold">
                    PrivateKey (Clave Privada HMAC)
                  </Label>
                  <Input
                    id="privateKey"
                    type="password"
                    value={privateKeyInput}
                    onChange={(e) => setPrivateKeyInput(e.target.value)}
                    placeholder="Introduce tu PrivateKey de BenCash"
                    className="text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Se envía en el header obligatorio <code className="font-mono text-[9px]">skml</code> y se usa en el backend para generar firmas HMAC-SHA256 con <code className="font-mono text-[9px]">accessKey = privateKey + requestId</code>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" /> Modo Sandbox Activo
                  </div>
                  <p className="text-[11px] text-blue-700">
                    Si no completas las credenciales, el sistema ejecuta simulaciones realistas con validación de cuentas para pruebas instantáneas.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="bg-secondary/20 p-4 border-t border-border flex flex-wrap justify-between gap-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestApi}
                    disabled={testingApi}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingApi ? "animate-spin" : ""}`} />
                    Probar Ping
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestSignature}
                    disabled={testingSignature}
                    className="gap-1.5 text-xs font-semibold text-accent border-accent/30 hover:bg-accent/10"
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 ${testingSignature ? "animate-spin" : ""}`} />
                    Diagnóstico de Firma
                  </Button>
                </div>
                <Button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> Guardar Credenciales
                </Button>
              </CardFooter>
            </Card>

            {/* Diagnostics and Technical Specs */}
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-accent" /> Diagnóstico de Firmas y Documentación BenCash
                </CardTitle>
                <CardDescription className="text-xs">
                  Validación en tiempo real del esquema DTO Swagger, hashes HMAC-SHA256 en mayúsculas (.NET) y resolución de firmas.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4 text-xs">
                {signatureTestResult && (
                  <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-3 overflow-x-auto border border-slate-800">
                    <div className="flex justify-between items-center text-slate-300 border-b border-slate-700 pb-2">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                        <ShieldCheck className="w-4 h-4" /> Diagnóstico de Firmas BenCash
                      </span>
                      <Badge className={signatureTestResult.ok ? "bg-green-600" : "bg-red-600"}>
                        {signatureTestResult.ok ? "Firmas Generadas" : "Error"}
                      </Badge>
                    </div>

                    {signatureTestResult.keyVerification && (
                      <div className="p-2 rounded bg-slate-800/80 text-[10px] space-y-1">
                        <div className="text-slate-400 font-bold">Validación Cabecera skml (PrivateKey):</div>
                        <div className="flex items-center gap-2">
                          <span className={signatureTestResult.keyVerification.authorized ? "text-emerald-400" : "text-amber-400"}>
                            {signatureTestResult.keyVerification.authorized ? "✓ Autorizada en servidor Bencash" : "⚠ Respuesta: " + JSON.stringify(signatureTestResult.keyVerification.response?.message || signatureTestResult.keyVerification.response)}
                          </span>
                        </div>
                      </div>
                    )}

                    {signatureTestResult.requestCashInVariants && (
                      <div className="space-y-1">
                        <div className="text-amber-400 font-bold text-[10px]">API 1: requestcashin (Variantes HMAC-SHA256):</div>
                        {signatureTestResult.requestCashInVariants.map((v: any) => (
                          <div key={v.id} className="p-2 rounded bg-slate-800/60 text-[10px] space-y-0.5">
                            <div className="flex justify-between text-slate-300">
                              <span className="font-semibold">{v.name}</span>
                              {v.recommended && <span className="text-emerald-400 font-bold text-[9px]">Recomendada</span>}
                            </div>
                            <div className="text-slate-400 break-all">{v.canonicalString}</div>
                            <div className="text-emerald-300 font-bold break-all">Firma: {v.signature}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {signatureTestResult.confirmCashInVariants && (
                      <div className="space-y-1">
                        <div className="text-sky-400 font-bold text-[10px]">API 2: confirmcashin (Variantes DTO Swagger):</div>
                        {signatureTestResult.confirmCashInVariants.map((v: any) => (
                          <div key={v.id} className="p-2 rounded bg-slate-800/60 text-[10px] space-y-0.5">
                            <div className="flex justify-between text-slate-300">
                              <span className="font-semibold">{v.name}</span>
                              {v.recommended && <span className="text-emerald-400 font-bold text-[9px]">Swagger DTO Oficial</span>}
                            </div>
                            <div className="text-slate-400 break-all">{v.canonicalString}</div>
                            <div className="text-sky-300 font-bold break-all">Firma: {v.signature}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {testResult && (
                  <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-2 overflow-x-auto">
                    <div className="flex justify-between items-center text-slate-400 border-b border-slate-700 pb-1">
                      <span>Respuesta de Ping:</span>
                      <Badge className={testResult.resultCode === "200" ? "bg-green-600" : "bg-red-600"}>
                        {testResult.resultCode || "ERROR"}
                      </Badge>
                    </div>
                    <pre className="text-[10px] text-emerald-400">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="font-bold text-foreground block">Algoritmo de Firma HMAC Implementado:</span>
                  <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-1">
                    <p className="text-amber-400">{"// API 1 - request-cashin"}</p>
                    <p className="text-slate-300">accessKey = privateKey + requestId</p>
                    <p className="text-slate-400 break-all">{`{accessKey=<key>$requestId=<id>$toAccountNumber=<phone>$amount=<amt>$content=<txt>$timestamp=<time>}`}</p>
                    <p className="text-emerald-400">signature = HMAC-SHA256(dataString, privateKey)</p>
                  </div>
                </div>

                <div className="p-3 bg-secondary/40 rounded-xl space-y-1.5 text-[11px]">
                  <span className="font-bold text-primary block">Reglas de Integración:</span>
                  <p className="text-muted-foreground">• <strong className="text-foreground">requestId:</strong> Generado aleatorio y único por petición.</p>
                  <p className="text-muted-foreground">• <strong className="text-foreground">timestamp:</strong> Sincronizado en milisegundos de servidor.</p>
                  <p className="text-muted-foreground">• <strong className="text-foreground">txId:</strong> Vinculado de manera idempotente entre API 1 y API 2.</p>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      )}

      </Tabs>
    </div>
  )
}
