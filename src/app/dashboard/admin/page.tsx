"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Users, 
  ShieldCheck, 
  Search, 
  MoreVertical, 
  MapPin, 
  TrendingUp, 
  Percent, 
  DollarSign, 
  RefreshCw, 
  CheckCircle2, 
  History, 
  AlertCircle,
  ArrowRightLeft,
  Coins,
  Building2,
  Cpu,
  Globe,
  Key,
  Zap,
  Activity,
  Eye,
  EyeOff,
  Copy,
  Check,
  BarChart3,
  Landmark,
  Palette,
  MailCheck,
  PiggyBank,
  Terminal
} from "lucide-react"
import { PartnerApiAdminTab } from "@/components/admin/partner-api-admin-tab"

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useSystemSettings } from "@/lib/settings-context"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { RateAuditLog } from "@/lib/types"
import { OfficialBanksSettingsCard } from "@/components/settings/official-banks-settings-card"
import { LogoAndBrandingSettingsCard } from "@/components/settings/logo-and-branding-settings-card"
import { GmailDepositsBoard } from "@/components/dashboard/gmail-deposits-board"
import { ClientWalletsAdminTab } from "@/components/admin/client-wallets-admin-tab"
import { formatNumber } from "@/lib/utils"

export default function AdminPage() {
  const { settings, updateSettings, loading: loadingSettings } = useSystemSettings()
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const role = userProfile?.role || (user as any)?.role || 'customer'
  const isAdmin = role === 'admin'

  // Form State initialized from settings
  const [publicDOP, setPublicDOP] = useState<number>(58.50)
  const [publicHTG, setPublicHTG] = useState<number>(132.20)
  const [agentDOP, setAgentDOP] = useState<number>(59.20)
  const [agentHTG, setAgentHTG] = useState<number>(133.80)
  const [agentReceptionFee, setAgentReceptionFee] = useState<number>(1.50)
  const [agentPayoutPct, setAgentPayoutPct] = useState<number>(2.0)
  const [platformFeePct, setPlatformFeePct] = useState<number>(5.0)
  // Norma General de Tasas Haití (Requerimiento de Usuario)
  const [haitiPublicFee, setHaitiPublicFee] = useState<number>(8.0)
  const [bencashShare, setBencashShare] = useState<number>(3.0)
  const [subAgentShare, setSubAgentShare] = useState<number>(2.0)
  const [hispaniolaShare, setHispaniolaShare] = useState<number>(3.0)
  const [adminNote, setAdminNote] = useState("")
  const [saving, setSaving] = useState(false)

  // BenCash Channel API State
  const [bencashBaseUrl, setBencashBaseUrl] = useState("https://reseller.test.bencashgroup.com")
  const [bencashPrivateKey, setBencashPrivateKey] = useState("")
  const [showAdminKey, setShowAdminKey] = useState(false)
  const [adminCopiedUrl, setAdminCopiedUrl] = useState(false)
  const [adminCopiedKey, setAdminCopiedKey] = useState(false)
  const [savingBenCash, setSavingBenCash] = useState(false)
  const [pingingBenCash, setPingingBenCash] = useState(false)
  const [pingResult, setPingResult] = useState<any>(null)

  // Simulation state
  const [simAmount, setSimAmount] = useState<number>(100)
  const [simCurrency, setSimCurrency] = useState<"DOP" | "HTG">("DOP")

  // Audit Logs
  const [historyLogs, setHistoryLogs] = useState<RateAuditLog[]>([])

  // Agents list
  const [agents, setAgents] = useState([
    { id: "AG-101", name: "Multi-Pagos Port-au-Prince", email: "payout@pap-multipaigos.ht", country: "HT", status: "active", type: "payout", balance: 15000 },
    { id: "AG-102", name: "Remesas Cibao Santiago", email: "santiago@cibaoremesas.do", country: "DO", status: "active", type: "payout", balance: 25000 },
    { id: "AG-103", name: "QuickCash Miami", email: "miami@quickcash.us", country: "US", status: "active", type: "payout", balance: 12000 },
    { id: "AG-104", name: "Gonaïves Transferts", email: "contact@gonaives-tx.ht", country: "HT", status: "inactive", type: "payout", balance: 0 },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newAgent, setNewAgent] = useState({
    name: "",
    email: "",
    country: "DO",
    type: "payout"
  })

  // Sync state when settings context loads
  useEffect(() => {
    if (settings) {
      setPublicDOP(settings.publicRateDOP ?? 58.50)
      setPublicHTG(settings.publicRateHTG ?? 132.20)
      setAgentDOP(settings.agentRateDOP ?? 59.20)
      setAgentHTG(settings.agentRateHTG ?? 133.80)
      setAgentReceptionFee(settings.agentReceptionFeeUSD ?? 1.50)
      setAgentPayoutPct(settings.agentPayoutPercentage ?? 2.0)
      setPlatformFeePct(settings.platformFeePercentage ?? 5.0)
      setHaitiPublicFee(settings.haitiPublicFeePercent ?? 8.0)
      setBencashShare(settings.haitiBencashSharePercent ?? 3.0)
      setSubAgentShare(settings.haitiSubAgentSharePercent ?? 2.0)
      setHispaniolaShare(settings.haitiHispaniolaSharePercent ?? 3.0)
      if (settings.bencashBaseUrl) setBencashBaseUrl(settings.bencashBaseUrl)
      if (settings.bencashPrivateKey) setBencashPrivateKey(settings.bencashPrivateKey)
    }
  }, [settings])

  const handleAdminCopy = (text: string, type: "url" | "key") => {
    if (!text) return
    navigator.clipboard.writeText(text)
    if (type === "url") {
      setAdminCopiedUrl(true)
      setTimeout(() => setAdminCopiedUrl(false), 2000)
    } else {
      setAdminCopiedKey(true)
      setTimeout(() => setAdminCopiedKey(false), 2000)
    }
    toast({
      title: "Copiado al portapapeles",
      description: type === "url" ? "URL copiada." : "Clave privada copiada.",
    })
  }

  const handleSaveBenCashConfig = async () => {
    setSavingBenCash(true)
    const cleanUrl = (bencashBaseUrl.trim() || "https://reseller.test.bencashgroup.com").replace(/\/+$/, "")
    const cleanKey = bencashPrivateKey.trim()

    const success = await updateSettings(
      {
        bencashBaseUrl: cleanUrl,
        bencashPrivateKey: cleanKey,
      },
      user?.email || "Admin",
      "Actualización de API Key y URL BenCash"
    )

    try {
      await fetch("/api/bencash/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: cleanUrl, privateKey: cleanKey }),
      })
    } catch (e) {
      console.warn("Error en sync de servidor:", e)
    }

    setSavingBenCash(false)

    toast({
      title: "✓ API Key y URL Guardadas",
      description: "La configuración se ha guardado en la base de datos, servidor y almacenamiento local.",
    })
  }

  const handlePingBenCash = async () => {
    setPingingBenCash(true)
    setPingResult(null)

    try {
      const res = await fetch("/api/bencash/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: bencashBaseUrl.trim() || "https://reseller.test.bencashgroup.com",
          privateKey: bencashPrivateKey.trim() || undefined,
        }),
      })

      const data = await res.json()
      setPingResult(data)

      if (data.reachable) {
        toast({
          title: "Ping Exitoso a BenCash API",
          description: `Servidor conectado (${data.latencyMs}ms). Código HTTP: ${data.httpStatus}`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Fallo de Ping",
          description: data.message || "No se pudo conectar al endpoint.",
        })
      }
    } catch (err: any) {
      setPingResult({ success: false, reachable: false, error: err.message, latencyMs: 0 })
      toast({
        variant: "destructive",
        title: "Error de Ping",
        description: err.message,
      })
    } finally {
      setPingingBenCash(false)
    }
  }

  // Load audit history logs from Firestore
  useEffect(() => {
    const historyRef = collection(db, "settings", "rates", "history")
    const q = query(historyRef, orderBy("timestamp", "desc"), limit(10))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: RateAuditLog[] = []
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as RateAuditLog)
      })
      setHistoryLogs(logs)
    }, (err) => {
      console.warn("Could not load rate audit logs:", err)
    })

    return () => unsubscribe()
  }, [])

  const handleCreateAgent = () => {
    const id = `AG-${Math.floor(Math.random() * 900) + 100}`
    setAgents([...agents, { ...newAgent, id, status: "active", balance: 0 }])
    setIsDialogOpen(false)
    setNewAgent({ name: "", email: "", country: "DO", type: "payout" })
    toast({
      title: "Agente Creado",
      description: `Se ha registrado el agente ${newAgent.name} con éxito.`,
    })
  }

  const handleSaveRates = async () => {
    setSaving(true)
    const success = await updateSettings(
      {
        publicRateDOP: publicDOP,
        publicRateHTG: publicHTG,
        agentRateDOP: agentDOP,
        agentRateHTG: agentHTG,
        agentReceptionFeeUSD: agentReceptionFee,
        agentPayoutPercentage: agentPayoutPct,
        platformFeePercentage: platformFeePct,
        haitiPublicFeePercent: haitiPublicFee,
        haitiBencashSharePercent: bencashShare,
        haitiSubAgentSharePercent: subAgentShare,
        haitiHispaniolaSharePercent: hispaniolaShare,
      },
      user?.email || "Administrador",
      adminNote || "Ajuste de norma general de tasas y reparto de beneficios (Haití)"
    )

    setSaving(false)
    if (success) {
      toast({
        title: "Tasas y Comisiones Actualizadas",
        description: "Los cambios han sido aplicados y publicados en vivo a toda la plataforma.",
      })
      setAdminNote("")
    } else {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudieron guardar las tasas. Por favor, intenta de nuevo.",
      })
    }
  }

  const handleResetMarket = () => {
    setPublicDOP(58.50)
    setPublicHTG(132.20)
    setAgentDOP(59.20)
    setAgentHTG(133.80)
    toast({
      title: "Valores de Mercado Restablecidos",
      description: "Se han cargado las tasas de referencia del mercado. Haz clic en guardar para publicar.",
    })
  }

  // Live simulation calculations
  const simFee = simAmount * (platformFeePct / 100)
  const simNetUSD = simAmount - simFee
  
  const selectedPublicRate = simCurrency === "DOP" ? publicDOP : publicHTG
  const selectedAgentRate = simCurrency === "DOP" ? agentDOP : agentHTG

  const clientReceivedLocal = simNetUSD * selectedPublicRate
  const agentPayoutFeeUSD = simNetUSD * (agentPayoutPct / 100)
  const agentTotalEarningsUSD = agentReceptionFee + agentPayoutFeeUSD
  const agentSpreadProfitLocal = simNetUSD * (selectedAgentRate - selectedPublicRate)

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <Card className="border-amber-200 bg-amber-50/40 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-700 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-900">
              Panel Administrativo Restringido
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 max-w-md mx-auto mt-2">
              Este módulo de fijación de tasas, aprobación de balances y gestión de red está restringido exclusivamente a <strong>Administradores</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4 text-center">
            <div className="p-4 bg-white rounded-xl border border-amber-200/80 text-xs text-slate-700 space-y-2 text-left max-w-lg mx-auto shadow-sm">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Opciones disponibles para tu cuenta:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600">
                <li>Billetera Principal y Bolsillo de Ahorro.</li>
                <li>Envío de remesas directas a MonCash y NatCash con tu saldo aprobado.</li>
                <li>Comprobantes y recibos de transferencias.</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Button onClick={() => router.push("/dashboard/wallet")} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-sm">
                <PiggyBank className="w-4 h-4" /> Ir a Mi Billetera & Ahorro
              </Button>
              <Button onClick={() => router.push("/dashboard/haiti-remittances")} variant="outline" className="text-xs font-bold gap-2 border-slate-300">
                <Coins className="w-4 h-4 text-primary" /> Enviar Remesa Haití
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">Panel de Control General</Badge>
            {settings.updatedAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-emerald-600" /> 
                Última actualización: {new Date(settings.updatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary mt-1">
            Administración de Tasas y Agentes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fija las tasas de cambio para todo público, la ganancia para agentes y gestiona la red pagadora.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleResetMarket}
            className="text-xs gap-1 border-gray-300 hover:bg-secondary"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" /> Restablecer Mercado
          </Button>
          <Button 
            onClick={handleSaveRates} 
            disabled={saving}
            className="bg-accent hover:bg-accent/90 text-white font-bold gap-2 shadow-md shadow-accent/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? "Guardando..." : "Publicar Tasas en Vivo"}
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="rates" className="space-y-6">
        <TabsList className="bg-white p-1 border border-border rounded-lg grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 max-w-7xl">
          <TabsTrigger value="rates" className="gap-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            <TrendingUp className="w-4 h-4" /> Fijar Tasas
          </TabsTrigger>
          <TabsTrigger value="partners" className="gap-2 text-xs font-semibold data-[state=active]:bg-purple-700 data-[state=active]:text-white">
            <Terminal className="w-4 h-4 text-purple-300" /> API Terceros
          </TabsTrigger>
          <TabsTrigger value="wallets" className="gap-2 text-xs font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <PiggyBank className="w-4 h-4 text-emerald-300" /> Billeteras
          </TabsTrigger>
          <TabsTrigger value="gmail" className="gap-2 text-xs font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <MailCheck className="w-4 h-4 text-emerald-300" /> Depósitos Gmail
          </TabsTrigger>
          <TabsTrigger value="banks" className="gap-2 text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Landmark className="w-4 h-4 text-amber-300" /> Bancos RD
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <Palette className="w-4 h-4 text-amber-400" /> Logo & Marca
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Users className="w-4 h-4" /> Red Agentes ({agents.length})
          </TabsTrigger>
          <TabsTrigger value="bencash" className="gap-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Cpu className="w-4 h-4 text-amber-500" /> BenCash API
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            <History className="w-4 h-4" /> Auditoría
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FIJAR TASAS Y COMISIONES */}
        <TabsContent value="rates" className="space-y-6">

          {/* CARD ESPECIAL: NORMA GENERAL DE TASAS Y REPARTO DE BENEFICIOS (HAITÍ) */}
          <Card className="border-2 border-emerald-500/40 shadow-lg bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30">
            <CardHeader className="border-b border-emerald-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm">
                      <Percent className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                        Norma General de Tasa y Reparto de Beneficios (Envíos a Haití)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600 font-medium">
                        Fijada exclusivamente por el Administrador. Los sub-agentes tienen acceso de solo lectura y no pueden modificar ningún parámetro.
                      </CardDescription>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white font-bold text-xs py-1 px-2.5">
                    Fijado por Admin
                  </Badge>
                  <a href="/dashboard/reports">
                    <Button size="sm" variant="outline" className="text-xs font-bold gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-100">
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
                      Ver Reporte Beneficios
                    </Button>
                  </a>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* TASA AL PUBLICO GENERAL */}
              <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                      Tasa al Público General para Enviar Dinero a Haití (%)
                    </Label>
                    <p className="text-xs text-slate-500">
                      Porcentaje total cobrado al cliente remitente sobre el monto enviado en USD.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.5"
                        min="1"
                        max="30"
                        value={haitiPublicFee}
                        onChange={(e) => setHaitiPublicFee(parseFloat(e.target.value) || 0)}
                        className="w-28 h-10 text-base font-black text-emerald-800 bg-emerald-50/50 border-emerald-300 pr-7"
                      />
                      <span className="absolute right-2.5 top-2.5 text-sm font-bold text-emerald-700">%</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setHaitiPublicFee(8.0)} className="h-10 text-xs px-2.5 font-bold">
                        Defecto (8%)
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* REPARTO DE BENEFICIOS (3 PARTES) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                    Desglose del Reparto de la Tasa ({haitiPublicFee}%)
                  </h4>
                  <span className="text-xs font-bold text-slate-600">
                    Suma: <strong className={(bencashShare + subAgentShare + hispaniolaShare) === haitiPublicFee ? "text-emerald-700" : "text-amber-600"}>
                      {(bencashShare + subAgentShare + hispaniolaShare).toFixed(1)}%
                    </strong> / {haitiPublicFee}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* PARTE 1: BENCASH API */}
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-blue-600" /> BenCash API
                      </span>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">
                        Proveedor API
                      </Badge>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-tight">
                      Beneficio / Costo de liquidación de BenCash API por desembolso en Haití.
                    </p>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="20"
                        value={bencashShare}
                        onChange={(e) => setBencashShare(parseFloat(e.target.value) || 0)}
                        className="h-10 font-bold text-base text-blue-900 bg-white border-blue-300 pr-7"
                      />
                      <span className="absolute right-2.5 top-2.5 text-sm font-bold text-blue-700">%</span>
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold block">
                      Ej: ${((100 * bencashShare) / 100).toFixed(2)} USD por cada $100 enviados
                    </span>
                  </div>

                  {/* PARTE 2: SUB AGENTE AFILIADO RD */}
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-amber-600" /> Sub-Agente Afiliado (RD)
                      </span>
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                        Comisión Punto
                      </Badge>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-tight">
                      Comisión pagada al sub-agente captador en República Dominicana.
                    </p>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="20"
                        value={subAgentShare}
                        onChange={(e) => setSubAgentShare(parseFloat(e.target.value) || 0)}
                        className="h-10 font-bold text-base text-amber-900 bg-white border-amber-300 pr-7"
                      />
                      <span className="absolute right-2.5 top-2.5 text-sm font-bold text-amber-700">%</span>
                    </div>
                    <span className="text-[10px] text-amber-700 font-semibold block">
                      Ej: ${((100 * subAgentShare) / 100).toFixed(2)} USD por cada $100 enviados
                    </span>
                  </div>

                  {/* PARTE 3: MARGEN HISPANIOLA PAY */}
                  <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-emerald-600" /> Margen Hispaniola Pay
                      </span>
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        Ganancia Neta
                      </Badge>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-tight">
                      Margen de beneficio neto retenido por la plataforma Hispaniola Pay.
                    </p>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="20"
                        value={hispaniolaShare}
                        onChange={(e) => setHispaniolaShare(parseFloat(e.target.value) || 0)}
                        className="h-10 font-black text-base text-emerald-900 bg-white border-emerald-400 pr-7"
                      />
                      <span className="absolute right-2.5 top-2.5 text-sm font-bold text-emerald-700">%</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold block">
                      Ej: ${((100 * hispaniolaShare) / 100).toFixed(2)} USD por cada $100 enviados
                    </span>
                  </div>
                </div>
              </div>

              {/* BARRA VISUAL DE DISTRIBUCION */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-bold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    Distribución de la Tasa Pública ({haitiPublicFee}%):
                  </span>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> BenCash API ({bencashShare}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Sub-Agente RD ({subAgentShare}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Hispaniola ({hispaniolaShare}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar segments */}
                <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, haitiPublicFee > 0 ? (bencashShare / haitiPublicFee) * 100 : 0)}%` }}
                    className="bg-blue-500 h-full transition-all duration-300"
                    title={`BenCash API: ${bencashShare}%`}
                  />
                  <div
                    style={{ width: `${Math.min(100, haitiPublicFee > 0 ? (subAgentShare / haitiPublicFee) * 100 : 0)}%` }}
                    className="bg-amber-400 h-full transition-all duration-300"
                    title={`Sub-Agente: ${subAgentShare}%`}
                  />
                  <div
                    style={{ width: `${Math.min(100, haitiPublicFee > 0 ? (hispaniolaShare / haitiPublicFee) * 100 : 0)}%` }}
                    className="bg-emerald-500 h-full transition-all duration-300"
                    title={`Hispaniola Pay: ${hispaniolaShare}%`}
                  />
                </div>

                {/* Rebalance helper if sum doesn't match */}
                {parseFloat((bencashShare + subAgentShare + hispaniolaShare).toFixed(2)) !== haitiPublicFee && (
                  <div className="flex items-center justify-between p-2 rounded bg-amber-500/20 border border-amber-500/40 text-xs text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      La suma de los beneficios ({(bencashShare + subAgentShare + hispaniolaShare).toFixed(1)}%) difiere de la tasa pública ({haitiPublicFee}%).
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const calculatedHispaniola = Math.max(0, parseFloat((haitiPublicFee - bencashShare - subAgentShare).toFixed(2)))
                        setHispaniolaShare(calculatedHispaniola)
                      }}
                      className="text-[11px] h-7 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-2.5"
                    >
                      Ajustar Margen Hispaniola a {(Math.max(0, haitiPublicFee - bencashShare - subAgentShare)).toFixed(1)}%
                    </Button>
                  </div>
                )}
              </div>

              {/* Botón de Guardado Directo de la Norma */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 inline mr-1" />
                  Al guardar, la norma entrará en vigor inmediatamente para todas las remesas hacia Haití (MonCash y NatCash).
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSaveRates}
                    disabled={saving}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {saving ? "Guardando Norma..." : "Guardar y Publicar Norma"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CARD 1: TASA A TODO PUBLICO */}
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                      <Coins className="w-5 h-5 text-accent" /> Tasa a Todo Público (Clientes)
                    </CardTitle>
                    <CardDescription>
                      Tasa de cambio estándar visible para los clientes que envían dinero.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Público
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* USD to DOP */}
                <div className="space-y-2 p-4 rounded-xl bg-secondary/20 border border-border/50">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-sm text-foreground flex items-center gap-2">
                      <span>🇩🇴</span> Tasa Público USD ➔ DOP
                    </Label>
                    <span className="text-xs font-semibold text-primary bg-white px-2 py-0.5 rounded border border-border">
                      1 USD = {publicDOP.toFixed(2)} DOP
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      step="0.05"
                      value={publicDOP} 
                      onChange={(e) => setPublicDOP(parseFloat(e.target.value) || 0)}
                      className="text-lg font-bold text-primary bg-white border-gray-300"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setPublicDOP(r => parseFloat((r + 0.25).toFixed(2)))} className="px-2 text-xs">+0.25</Button>
                      <Button size="sm" variant="outline" onClick={() => setPublicDOP(r => parseFloat((r - 0.25).toFixed(2)))} className="px-2 text-xs">-0.25</Button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Si un cliente envía $100 USD, a la tasa público de {publicDOP} recibirá {((100 - (100 * (platformFeePct/100))) * publicDOP).toFixed(2)} DOP.
                  </p>
                </div>

                {/* USD to HTG */}
                <div className="space-y-2 p-4 rounded-xl bg-secondary/20 border border-border/50">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-sm text-foreground flex items-center gap-2">
                      <span>🇭🇹</span> Tasa Público USD ➔ HTG
                    </Label>
                    <span className="text-xs font-semibold text-primary bg-white px-2 py-0.5 rounded border border-border">
                      1 USD = {publicHTG.toFixed(2)} HTG
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      step="0.10"
                      value={publicHTG} 
                      onChange={(e) => setPublicHTG(parseFloat(e.target.value) || 0)}
                      className="text-lg font-bold text-primary bg-white border-gray-300"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setPublicHTG(r => parseFloat((r + 0.50).toFixed(2)))} className="px-2 text-xs">+0.50</Button>
                      <Button size="sm" variant="outline" onClick={() => setPublicHTG(r => parseFloat((r - 0.50).toFixed(2)))} className="px-2 text-xs">-0.50</Button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Si un cliente envía $100 USD, a la tasa público de {publicHTG} recibirá {((100 - (100 * (platformFeePct/100))) * publicHTG).toFixed(2)} HTG.
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    La tasa a todo público se muestra directamente en la calculadora de la página de inicio y se aplica por defecto en todas las remesas web.
                  </span>
                </div>

              </CardContent>
            </Card>

            {/* CARD 2: TASA Y GANANCIA A GANAR LOS AGENTES */}
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-600" /> Tasa y Ganancia a Ganar los Agentes
                    </CardTitle>
                    <CardDescription>
                      Define la tasa de liquidez especial y las comisiones para agentes captadores y pagadores.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Agentes
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                
                {/* Agent Exchange Rate DOP & HTG */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <Label className="text-xs font-bold text-emerald-900">
                      🇩🇴 Tasa Mayorista Agente DOP
                    </Label>
                    <Input 
                      type="number" 
                      step="0.05"
                      value={agentDOP} 
                      onChange={(e) => setAgentDOP(parseFloat(e.target.value) || 0)}
                      className="font-bold text-emerald-800 bg-white"
                    />
                    <span className="text-[10px] text-emerald-600 block">
                      Margen Agente: +{(agentDOP - publicDOP).toFixed(2)} DOP/USD
                    </span>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <Label className="text-xs font-bold text-emerald-900">
                      🇭🇹 Tasa Mayorista Agente HTG
                    </Label>
                    <Input 
                      type="number" 
                      step="0.10"
                      value={agentHTG} 
                      onChange={(e) => setAgentHTG(parseFloat(e.target.value) || 0)}
                      className="font-bold text-emerald-800 bg-white"
                    />
                    <span className="text-[10px] text-emerald-600 block">
                      Margen Agente: +{(agentHTG - publicHTG).toFixed(2)} HTG/USD
                    </span>
                  </div>
                </div>

                {/* Agent Commissions */}
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 p-3 rounded-lg bg-secondary/30 border border-border/60">
                      <Label className="text-xs font-bold text-primary flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-accent" /> Ganancia Agente Receptor
                      </Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          step="0.25"
                          value={agentReceptionFee} 
                          onChange={(e) => setAgentReceptionFee(parseFloat(e.target.value) || 0)}
                          className="font-bold text-primary pl-7 bg-white"
                        />
                        <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">$</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block">Monto fijo en USD por remesa captada</span>
                    </div>

                    <div className="space-y-1.5 p-3 rounded-lg bg-secondary/30 border border-border/60">
                      <Label className="text-xs font-bold text-primary flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-accent" /> Ganancia Agente Pagador
                      </Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          step="0.1"
                          value={agentPayoutPct} 
                          onChange={(e) => setAgentPayoutPct(parseFloat(e.target.value) || 0)}
                          className="font-bold text-primary pr-7 bg-white"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block">% sobre el dinero desembolsado</span>
                    </div>
                  </div>

                  {/* Platform Fee */}
                  <div className="space-y-1.5 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-primary">
                        Comisión General de Plataforma (%)
                      </Label>
                      <span className="text-xs font-bold text-primary">{platformFeePct}%</span>
                    </div>
                    <Input 
                      type="number" 
                      step="0.5"
                      value={platformFeePct} 
                      onChange={(e) => setPlatformFeePct(parseFloat(e.target.value) || 0)}
                      className="font-bold text-primary bg-white"
                    />
                    <span className="text-[10px] text-muted-foreground block">
                      Tarifa total cobrada al remitente al calcular el envío.
                    </span>
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* SIMULATION CARD & PUBLISH SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Simulation Card */}
            <Card className="lg:col-span-2 border-none shadow-md bg-white">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-accent" /> Simulación de Desglose en Tiempo Real
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Verifica exactamente cuánto recibe el cliente y cuánto gana el agente con las tasas ingresadas.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={simAmount} 
                      onChange={(e) => setSimAmount(parseFloat(e.target.value) || 0)}
                      className="w-24 h-8 text-xs font-bold bg-secondary/30"
                      placeholder="Monto"
                    />
                    <Select value={simCurrency} onValueChange={(v: "DOP" | "HTG") => setSimCurrency(v)}>
                      <SelectTrigger className="w-24 h-8 text-xs bg-secondary/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DOP">RD (DOP)</SelectItem>
                        <SelectItem value="HTG">HT (HTG)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* Public Customer Result */}
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2">
                    <span className="text-xs font-semibold text-blue-900 block">Beneficiario Público Recibe</span>
                    <div className="text-2xl font-black text-blue-900" suppressHydrationWarning>
                      {formatNumber(clientReceivedLocal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs">{simCurrency}</span>
                    </div>
                    <div className="text-[11px] text-blue-700 space-y-0.5">
                      <p>Monto enviado: ${simAmount} USD</p>
                      <p>Comisión servicio ({platformFeePct}%): -${simFee.toFixed(2)} USD</p>
                      <p>Monto a cambiar: ${simNetUSD.toFixed(2)} USD</p>
                      <p className="font-bold">Tasa aplicado: 1 USD = {selectedPublicRate} {simCurrency}</p>
                    </div>
                  </div>

                  {/* Agent Payout & Profit */}
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                    <span className="text-xs font-semibold text-emerald-900 block">Ganancia Total Agente</span>
                    <div className="text-2xl font-black text-emerald-900">
                      +${agentTotalEarningsUSD.toFixed(2)} <span className="text-xs">USD</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 space-y-0.5">
                      <p>Comisión Captación: +${agentReceptionFee.toFixed(2)} USD</p>
                      <p>Comisión Desembolso ({agentPayoutPct}%): +${agentPayoutFeeUSD.toFixed(2)} USD</p>
                      <p className="font-bold text-emerald-800">
                        Spread Tasa Agente: +{agentSpreadProfitLocal.toFixed(2)} {simCurrency}
                      </p>
                    </div>
                  </div>

                  {/* Net Platform Spread */}
                  <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-2">
                    <span className="text-xs font-semibold text-purple-900 block">Margen Neto Plataforma</span>
                    <div className="text-2xl font-black text-purple-900">
                      +${(simFee - agentTotalEarningsUSD).toFixed(2)} <span className="text-xs">USD</span>
                    </div>
                    <div className="text-[11px] text-purple-700 space-y-0.5">
                      <p>Fee total cobrado: +${simFee.toFixed(2)} USD</p>
                      <p>Pago a agentes: -${agentTotalEarningsUSD.toFixed(2)} USD</p>
                      <p className="font-bold">Balance operativo positivo</p>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Note and Action Card */}
            <Card className="border-none shadow-md bg-white flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-primary">Confirmar y Publicar</CardTitle>
                <CardDescription className="text-xs">
                  Agrega una nota opcional de auditoría antes de publicar los cambios en vivo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="note" className="text-xs font-semibold">Nota de Auditoría</Label>
                  <Input 
                    id="note"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Ej: Ajuste semanal por alza del dólar en RD"
                    className="text-xs"
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  onClick={handleSaveRates} 
                  disabled={saving}
                  className="w-full bg-accent hover:bg-accent/90 text-white font-bold gap-2 shadow-md shadow-accent/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {saving ? "Guardando..." : "Publicar Cambios Ahora"}
                </Button>
              </CardFooter>
            </Card>

          </div>
        </TabsContent>

        {/* TAB 2: RED DE AGENTES */}
        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Agentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{agents.length}</div>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Red activa y verificada
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agentes en Haití</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{agents.filter(a => a.country === 'HT').length}</div>
                <p className="text-xs text-muted-foreground mt-1">Puntos de cobro y desembolso</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agentes en Rep. Dominicana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{agents.filter(a => a.country === 'DO').length}</div>
                <p className="text-xs text-muted-foreground mt-1">Puntos de cobro y desembolso</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-md bg-white">
            <CardHeader className="pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar agente por nombre o ID..." className="pl-10 bg-secondary/30 border-none text-xs" />
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2 text-xs">
                    <Plus className="w-4 h-4" /> Registrar Nuevo Agente
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Registrar Nuevo Agente Pagador</DialogTitle>
                    <DialogDescription>
                      Ingresa los datos para autorizar a un nuevo agente en la red.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="agent-name">Nombre del Negocio / Establecimiento</Label>
                      <Input 
                        id="agent-name" 
                        value={newAgent.name} 
                        onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                        placeholder="Ej: Remesas Caribe Santiago" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="agent-email">Email Corporativo</Label>
                      <Input 
                        id="agent-email" 
                        type="email"
                        value={newAgent.email} 
                        onChange={(e) => setNewAgent({...newAgent, email: e.target.value})}
                        placeholder="contacto@remesascaribe.do" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="agent-country">País Operativo</Label>
                      <Select value={newAgent.country} onValueChange={(v) => setNewAgent({...newAgent, country: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar país" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">Estados Unidos (USA)</SelectItem>
                          <SelectItem value="DO">República Dominicana</SelectItem>
                          <SelectItem value="HT">Haití</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateAgent} className="bg-primary text-white">Registrar Agente</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/30">
                    <TableRow>
                      <TableHead>Agente e ID</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Fondo Operativo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-bold text-primary text-xs">{agent.name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">{agent.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-accent" />
                            <span className="text-xs">
                              {agent.country === 'HT' ? 'Haití' : agent.country === 'DO' ? 'Rep. Dominicana' : 'Estados Unidos'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{agent.email}</TableCell>
                        <TableCell className="font-semibold text-xs" suppressHydrationWarning>
                          ${formatNumber(agent.balance)} <span className="text-[10px] text-muted-foreground">USD</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className={
                            agent.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100 text-[10px]' : 'bg-gray-100 text-gray-500 text-[10px]'
                          }>
                            {agent.status === 'active' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Editar Tasas Personalizadas</DropdownMenuItem>
                              <DropdownMenuItem>Ver Historial de Desembolsos</DropdownMenuItem>
                              <DropdownMenuItem>Recargar Fondo</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Desactivar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: CANAL BENCASH API */}
        <TabsContent value="bencash" className="space-y-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-0.5">
                      🇭🇹 Depósito BenCash Group
                    </Badge>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0.5">
                      MonCash & NatCash
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-accent" /> Configuración de Endpoint y Ping BenCash
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Administra el endpoint de producción/pruebas y ejecuta pruebas de ping en tiempo real.
                  </CardDescription>
                </div>

                <Button
                  onClick={handlePingBenCash}
                  disabled={pingingBenCash}
                  variant="outline"
                  className="gap-2 text-xs font-bold border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                >
                  <Activity className={`w-4 h-4 text-emerald-600 ${pingingBenCash ? "animate-pulse" : ""}`} />
                  {pingingBenCash ? "Probando Conexión..." : "Probar Ping"}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Presets */}
              <div className="p-3.5 bg-secondary/40 rounded-xl space-y-2 border border-border/60">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-600" /> Servidores Recomendados
                  </span>
                  <span className="text-[10px] text-muted-foreground">Clic para autocompletar</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBencashBaseUrl("https://reseller.test.bencashgroup.com")}
                    className="text-xs bg-white hover:bg-blue-50 border-blue-200 text-blue-800 font-semibold gap-1.5 shadow-sm"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    Test: https://reseller.test.bencashgroup.com
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBencashBaseUrl("https://api.bencash.com")}
                    className="text-xs bg-white text-muted-foreground"
                  >
                    Producción: https://api.bencash.com
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="admin-bencash-url" className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-accent" /> Base URL / Endpoint BenCash
                    </Label>
                    <button
                      type="button"
                      onClick={() => handleAdminCopy(bencashBaseUrl, "url")}
                      className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      {adminCopiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {adminCopiedUrl ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  <Input
                    id="admin-bencash-url"
                    value={bencashBaseUrl}
                    onChange={(e) => setBencashBaseUrl(e.target.value)}
                    placeholder="https://reseller.test.bencashgroup.com"
                    className="font-mono text-xs bg-white"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    URL raíz donde se procesan los endpoints de depósito.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="admin-bencash-key" className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-accent" /> Clave Privada HMAC (PrivateKey)
                    </Label>
                    <button
                      type="button"
                      onClick={() => handleAdminCopy(bencashPrivateKey, "key")}
                      className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      {adminCopiedKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {adminCopiedKey ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Input
                      id="admin-bencash-key"
                      type={showAdminKey ? "text" : "password"}
                      value={bencashPrivateKey}
                      onChange={(e) => setBencashPrivateKey(e.target.value)}
                      placeholder="Clave privada para firma HMAC-SHA256"
                      className="font-mono text-xs bg-white pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => setShowAdminKey(!showAdminKey)}
                      title={showAdminKey ? "Ocultar" : "Mostrar"}
                    >
                      {showAdminKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Se guarda de manera segura y se usa exclusivamente en el backend para headers skml y firma HMAC.
                  </p>
                </div>
              </div>

              {/* Ping Result Box */}
              {pingResult && (
                <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                  pingResult.reachable 
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" 
                    : "bg-red-50/70 border-red-200 text-red-950"
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 border-emerald-200/50">
                    <div className="flex items-center gap-2">
                      {pingResult.reachable ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-sm">
                          {pingResult.reachable ? "Servidor BenCash En Línea" : "Fallo al comunicar con Endpoint"}
                        </div>
                        <div className="text-[11px] opacity-80">
                          {pingResult.endpoint}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={pingResult.reachable ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}>
                        HTTP {pingResult.httpStatus || "ERR"} {pingResult.statusText}
                      </Badge>
                      <Badge variant="outline" className="font-mono font-bold bg-white text-xs">
                        ⚡ {pingResult.latencyMs} ms
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed">
                    {pingResult.message}
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="bg-secondary/30 p-4 border-t border-border flex justify-between gap-3">
              <Button
                variant="outline"
                onClick={handlePingBenCash}
                disabled={pingingBenCash}
                className="text-xs font-semibold gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pingingBenCash ? "animate-spin" : ""}`} />
                Probar Ping
              </Button>
              <Button
                onClick={handleSaveBenCashConfig}
                disabled={savingBenCash}
                className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 text-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                {savingBenCash ? "Guardando..." : "Guardar Endpoint BenCash"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* TAB 4: HISTORIAL Y AUDITORIA */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                <History className="w-5 h-5 text-accent" /> Historial y Auditoría de Modificaciones
              </CardTitle>
              <CardDescription className="text-xs">
                Registro inmutable de cambios en las tasas a todo público y comisiones de agentes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  Aún no hay cambios registrados en el historial. Los cambios que publiques aparecerán aquí automáticamente.
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/30">
                      <TableRow>
                        <TableHead>Fecha / Hora</TableHead>
                        <TableHead>Administrador</TableHead>
                        <TableHead>Tasa Público (DOP/HTG)</TableHead>
                        <TableHead>Tasa Agente (DOP/HTG)</TableHead>
                        <TableHead>Comisión Agente (Rec/Pag)</TableHead>
                        <TableHead>Nota / Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyLogs.map((log, idx) => (
                        <TableRow key={log.id || idx} className="hover:bg-muted/30 text-xs">
                          <TableCell className="font-mono text-muted-foreground" suppressHydrationWarning>
                            {new Date(log.timestamp).toISOString().replace("T", " ").slice(0, 19)}
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            {log.updatedBy}
                          </TableCell>
                          <TableCell className="font-bold">
                            🇩🇴 {log.publicRateDOP?.toFixed(2)} | 🇭🇹 {log.publicRateHTG?.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-bold text-emerald-700">
                            🇩🇴 {log.agentRateDOP?.toFixed(2)} | 🇭🇹 {log.agentRateHTG?.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            ${log.agentReceptionFeeUSD?.toFixed(2)} USD / {log.agentPayoutPercentage}%
                          </TableCell>
                          <TableCell className="text-muted-foreground italic">
                            {log.note || "Actualización de rutina"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: BILLETERAS Y DEPÓSITOS DE CLIENTES */}
        <TabsContent value="wallets" className="space-y-6">
          <ClientWalletsAdminTab />
        </TabsContent>

        {/* TAB: DEPÓSITOS GMAIL (BANCOS RD) */}
        <TabsContent value="gmail" className="space-y-6">
          <GmailDepositsBoard />
        </TabsContent>

        {/* TAB: CUENTAS BANCARIAS OFICIALES DOMINICANAS */}
        <TabsContent value="banks" className="space-y-6">
          <OfficialBanksSettingsCard />
        </TabsContent>

        {/* TAB: LOGO & MARCA */}
        <TabsContent value="branding" className="space-y-6">
          <LogoAndBrandingSettingsCard />
        </TabsContent>

        {/* TAB: API PARA TERCEROS / SOCIOS B2B */}
        <TabsContent value="partners" className="space-y-6">
          <PartnerApiAdminTab />
        </TabsContent>

      </Tabs>
    </div>
  )
}
