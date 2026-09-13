"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Bell, 
  Shield, 
  Wallet, 
  Cpu, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Activity,
  Zap,
  Globe,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  MessageSquare,
  Send,
  Smartphone,
  Bot,
  Terminal,
  CheckCheck,
  HelpCircle,
  Radio,
  FileText,
  Landmark,
  Palette
} from "lucide-react"
import { useSystemSettings } from "@/lib/settings-context"
import { useToast } from "@/hooks/use-toast"
import { WhatsAppSettingsCard } from "@/components/settings/whatsapp-settings-card"
import { OfficialBanksSettingsCard } from "@/components/settings/official-banks-settings-card"
import { LogoAndBrandingSettingsCard } from "@/components/settings/logo-and-branding-settings-card"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const { settings, updateSettings, loading: loadingSettings } = useSystemSettings()
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const role = userProfile?.role || (user as any)?.role || 'customer'
  const isAdmin = role === 'admin'

  // BenCash API State
  const [bencashBaseUrl, setBencashBaseUrl] = useState("")
  const [bencashPrivateKey, setBencashPrivateKey] = useState("")
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [savingBenCash, setSavingBenCash] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false)
  const [pinging, setPinging] = useState(false)
  const [pingResult, setPingResult] = useState<any>(null)

  // WhatsApp API & Automation State
  const [waEnabled, setWaEnabled] = useState(false)
  const [waProvider, setWaProvider] = useState<'cloud_api' | 'custom_gateway' | 'direct_web'>('cloud_api')
  const [waToken, setWaToken] = useState("")
  const [waPhoneId, setWaPhoneId] = useState("")
  const [waBusinessId, setWaBusinessId] = useState("")
  const [waGatewayUrl, setWaGatewayUrl] = useState("")
  const [waNotifySender, setWaNotifySender] = useState(true)
  const [waNotifyRecipient, setWaNotifyRecipient] = useState(true)
  const [waNotifyInvoices, setWaNotifyInvoices] = useState(true)
  const [showWaToken, setShowWaToken] = useState(false)
  const [copiedWaToken, setCopiedWaToken] = useState(false)
  const [savingWa, setSavingWa] = useState(false)
  const [lastSavedWa, setLastSavedWa] = useState<string | null>(null)

  // WhatsApp Live Testing State
  const [testPhone, setTestPhone] = useState("")
  const [testType, setTestType] = useState<'sender_receipt' | 'recipient_haiti' | 'invoice' | 'custom'>('sender_receipt')
  const [testCustomMsg, setTestCustomMsg] = useState("")
  const [testingWa, setTestingWa] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [previewTab, setPreviewTab] = useState<'sender' | 'recipient' | 'invoice'>('sender')

  useEffect(() => {
    if (settings && !hasLoadedInitial) {
      setBencashBaseUrl(settings.bencashBaseUrl || "https://reseller.test.bencashgroup.com")
      setBencashPrivateKey(settings.bencashPrivateKey || "")
      setWaEnabled(settings.whatsappApiEnabled ?? false)
      setWaProvider(settings.whatsappProvider || 'cloud_api')
      setWaToken(settings.whatsappApiToken || "")
      setWaPhoneId(settings.whatsappPhoneNumberId || "")
      setWaBusinessId(settings.whatsappBusinessAccountId || "")
      setWaGatewayUrl(settings.whatsappGatewayUrl || "")
      setWaNotifySender(settings.whatsappNotifySender ?? true)
      setWaNotifyRecipient(settings.whatsappNotifyRecipient ?? true)
      setWaNotifyInvoices(settings.whatsappNotifyInvoices ?? true)
      setHasLoadedInitial(true)
    }
  }, [settings, hasLoadedInitial])

  // Guardar configuración de WhatsApp
  const handleSaveWhatsApp = async () => {
    setSavingWa(true)
    const cleanToken = waToken.trim()
    const cleanPhoneId = waPhoneId.trim()
    const cleanGateway = waGatewayUrl.trim()
    const cleanBusinessId = waBusinessId.trim()

    // 1. Guardar en SettingsContext (React state, localStorage, Firestore)
    const success = await updateSettings(
      {
        whatsappApiEnabled: waEnabled,
        whatsappProvider: waProvider,
        whatsappApiToken: cleanToken,
        whatsappPhoneNumberId: cleanPhoneId,
        whatsappBusinessAccountId: cleanBusinessId,
        whatsappGatewayUrl: cleanGateway,
        whatsappNotifySender: waNotifySender,
        whatsappNotifyRecipient: waNotifyRecipient,
        whatsappNotifyInvoices: waNotifyInvoices,
      },
      "Admin",
      "Actualización de WhatsApp API & Automatización"
    )

    // 2. Sincronizar en el servidor runtime Next.js
    try {
      await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: waEnabled,
          provider: waProvider,
          apiToken: cleanToken,
          phoneNumberId: cleanPhoneId,
          businessAccountId: cleanBusinessId,
          gatewayUrl: cleanGateway,
          notifySender: waNotifySender,
          notifyRecipient: waNotifyRecipient,
          notifyInvoices: waNotifyInvoices,
        }),
      })
    } catch (err) {
      console.warn("Error sincronizando WhatsApp config en servidor:", err)
    }

    setSavingWa(false)
    setLastSavedWa(new Date().toLocaleTimeString())

    if (success) {
      toast({
        title: "WhatsApp API Configurado",
        description: waEnabled 
          ? "Automatización de mensajes activada y credenciales sincronizadas."
          : "Configuración guardada (Modo de API pausado/manual).",
      })
    } else {
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudieron actualizar los parámetros de WhatsApp.",
      })
    }
  }

  // Enviar mensaje de prueba de WhatsApp
  const handleTestWhatsApp = async () => {
    if (!testPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Número Requerido",
        description: "Por favor ingresa un número de teléfono para enviar la prueba.",
      })
      return
    }

    setTestingWa(true)
    setTestResult(null)

    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone.trim(),
          type: testType,
          customMessage: testCustomMsg,
          apiToken: waToken.trim(),
          phoneNumberId: waPhoneId.trim(),
          gatewayUrl: waGatewayUrl.trim(),
          provider: waProvider,
        }),
      })

      const data = await res.json()
      setTestResult(data)

      if (data.success) {
        toast({
          title: data.status === 'sent' ? "Mensaje Enviado con Éxito" : "Enlace WhatsApp Listo",
          description: data.status === 'sent'
            ? `Despachado en ${data.latencyMs || 0}ms vía ${data.providerUsed}.`
            : "Haz clic en el enlace para abrir WhatsApp Web.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Fallo en Envío de WhatsApp",
          description: data.error || "No se pudo despachar el mensaje.",
        })
      }
    } catch (err: any) {
      const errorObj = {
        success: false,
        error: err.message || "Error de red al ejecutar prueba.",
      }
      setTestResult(errorObj)
      toast({
        variant: "destructive",
        title: "Error de Red",
        description: err.message || "Fallo de comunicación con el endpoint de prueba.",
      })
    } finally {
      setTestingWa(false)
    }
  }

  // Save BenCash settings
  const handleSaveBenCash = async () => {
    setSavingBenCash(true)
    const cleanUrl = (bencashBaseUrl.trim() || "https://reseller.test.bencashgroup.com").replace(/\/+$/, "")
    const cleanKey = bencashPrivateKey.trim()

    // 1. Guardar en SettingsContext (persistencia en React State, localStorage y Firestore)
    const success = await updateSettings(
      {
        bencashBaseUrl: cleanUrl,
        bencashPrivateKey: cleanKey,
      },
      "Admin",
      "Actualización de API Key y URL BenCash"
    )

    // 2. Sincronizar directamente con el endpoint de configuración del servidor Next.js
    try {
      await fetch("/api/bencash/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: cleanUrl, privateKey: cleanKey }),
      })
    } catch (err) {
      console.warn("Error en sincronización directa de servidor:", err)
    }

    setSavingBenCash(false)
    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    setLastSaved(nowStr)

    toast({
      title: "✓ Configuración Guardada",
      description: `La API Key y la URL base se han guardado con éxito.`,
    })
  }

  const handleCopy = (text: string, type: "url" | "key") => {
    if (!text) return
    navigator.clipboard.writeText(text)
    if (type === "url") {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } else {
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
    toast({
      title: "Copiado al portapapeles",
      description: type === "url" ? "URL del API copiada." : "Clave privada copiada.",
    })
  }

  // Ping BenCash Endpoint
  const handlePingTest = async () => {
    setPinging(true)
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
          title: "Ping Exitoso",
          description: `Servidor conectado (${data.latencyMs}ms). Código HTTP: ${data.httpStatus}`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Fallo de Conexión",
          description: data.message || "No se pudo alcanzar el endpoint.",
        })
      }
    } catch (err: any) {
      const errorObj = {
        success: false,
        reachable: false,
        latencyMs: 0,
        message: err.message || "Error al ejecutar el ping",
        timestamp: new Date().toISOString(),
      }
      setPingResult(errorObj)
      toast({
        variant: "destructive",
        title: "Error de Red",
        description: err.message || "No se pudo enviar la solicitud de ping.",
      })
    } finally {
      setPinging(false)
    }
  }

  const handleApplyPreset = (url: string) => {
    setBencashBaseUrl(url)
    toast({
      title: "Preset Aplicado",
      description: `Endpoint establecido a ${url}`,
    })
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <Card className="border-amber-200 bg-amber-50/40 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-700 shadow-inner">
              <Shield className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-900">
              Acceso Restringido: Exclusivo de Administrador
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 max-w-md mx-auto mt-2">
              Los usuarios con rol <strong>{role === "customer" ? "Cliente" : "Sub-Agente"}</strong> no tienen acceso a claves API ni a configuraciones técnicas del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="p-4 bg-white rounded-xl border border-amber-200/80 text-xs text-slate-700 space-y-2.5 shadow-sm">
              <p className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Servicios asignados a tu cuenta:
              </p>
              <ul className="space-y-1.5 pl-2 text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <strong>Billetera Digital y Ahorro:</strong> Consulta de saldo y depósito en ventanillas de sub-agentes.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <strong>Envío de Remesas Haití:</strong> Envíos a MonCash y NatCash hasta tu <em>límite de balance disponible aprobado por el administrador</em>.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <strong>Historial:</strong> Consulta de comprobantes y transferencias directas.
                </li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Button onClick={() => router.push("/dashboard/wallet")} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-sm">
                <Wallet className="w-4 h-4" /> Ir a Mi Billetera & Ahorro
              </Button>
              <Button onClick={() => router.push("/dashboard/haiti-remittances")} variant="outline" className="text-xs font-bold gap-2 border-slate-300">
                <Send className="w-4 h-4 text-primary" /> Terminal de Remesas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Configuración</h1>
        <p className="text-muted-foreground mt-1">Gestiona tu perfil, billeteras y canales API en Hispaniola Pay.</p>
      </div>

      <Tabs defaultValue="bencash" className="w-full">
        <TabsList className="bg-white border shadow-sm w-full md:w-auto overflow-x-auto justify-start h-auto p-1 rounded-xl">
          <TabsTrigger value="banks" className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Landmark className="w-4 h-4 text-blue-400" /> Cuentas Bancarias RD
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <Palette className="w-4 h-4 text-amber-400" /> Logo & Marca
          </TabsTrigger>
          <TabsTrigger value="bencash" className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Key className="w-4 h-4 text-amber-500" /> API Keys & Conectividad
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <MessageSquare className="w-4 h-4 text-emerald-500" /> WhatsApp API
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            <User className="w-4 h-4" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Bell className="w-4 h-4" /> Notificaciones
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Shield className="w-4 h-4" /> Seguridad
          </TabsTrigger>
          <TabsTrigger value="wallet" className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Wallet className="w-4 h-4" /> Billetera
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BENCASH API ENDPOINTS & PING */}
        <TabsContent value="bencash" className="mt-6 space-y-6">
          <Card className="border-none shadow-md bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-900 via-primary to-slate-900 text-white p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-0.5">
                      🇭🇹 Depósito Haití
                    </Badge>
                    <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/30 text-[10px] px-2 py-0.5">
                      HMAC-SHA256
                    </Badge>
                    {bencashPrivateKey ? (
                      <Badge className="bg-emerald-500 text-white font-bold text-[10px] px-2 py-0.5">
                        API Key Activa
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-300 border-amber-400/40 text-[10px] px-2 py-0.5">
                        Modo Sandbox
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-400" />
                    Configuración de API Key y URL BenCash
                  </CardTitle>
                  <CardDescription className="text-slate-300 text-xs mt-1">
                    Guarda la URL del servidor y tu clave privada API para procesar depósitos automáticos en MonCash y NatCash.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePingTest}
                    disabled={pinging}
                    variant="outline"
                    className="border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold gap-2 text-xs"
                  >
                    <Activity className={`w-4 h-4 text-emerald-400 ${pinging ? "animate-pulse" : ""}`} />
                    {pinging ? "Midiendo Ping..." : "Probar Ping"}
                  </Button>
                  <Button
                    onClick={handleSaveBenCash}
                    disabled={savingBenCash}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 text-xs shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {savingBenCash ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Status Feedback Banner if recently saved */}
              {lastSaved && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs animate-in fade-in duration-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">
                      ¡API Key y URL guardadas correctamente a las {lastSaved}! Disponibles en servidor y navegador.
                    </span>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Sincronizado</Badge>
                </div>
              )}

              {/* Presets & Seller Panel */}
              <div className="p-4 rounded-xl bg-secondary/40 border border-border/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-accent" /> Presets de Servidores BenCash
                  </span>
                  <a 
                    href="https://sellertest.bencashgroup.com" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Panel Seller: sellertest.bencashgroup.com
                  </a>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset("https://reseller.test.bencashgroup.com")}
                    className="text-xs bg-white hover:bg-blue-50 border-blue-200 text-blue-800 font-semibold gap-1.5 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                    Servidor Test: reseller.test.bencashgroup.com
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset("https://api.bencash.com")}
                    className="text-xs bg-white hover:bg-gray-50 text-muted-foreground"
                  >
                    Servidor Producción (api.bencash.com)
                  </Button>
                </div>
              </div>

              {/* URL & Key Inputs */}
              <div className="space-y-5">
                {/* Endpoint URL Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="endpoint-url" className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-accent" /> URL Base del API (Endpoint)
                    </Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(bencashBaseUrl, "url")}
                        className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedUrl ? "Copiado" : "Copiar URL"}
                      </button>
                    </div>
                  </div>
                  <div className="relative flex items-center">
                    <Input
                      id="endpoint-url"
                      value={bencashBaseUrl}
                      onChange={(e) => setBencashBaseUrl(e.target.value)}
                      placeholder="https://reseller.test.bencashgroup.com"
                      className="font-mono text-xs bg-white pr-24"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setBencashBaseUrl("https://reseller.test.bencashgroup.com")}
                        className="h-7 px-2 text-[10px] text-muted-foreground hover:text-primary"
                        title="Restablecer a URL de prueba oficial"
                      >
                        Default
                      </Button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    URL base del API. Las rutas en el servidor Kestrel se ubican en <code className="font-mono bg-secondary px-1 py-0.5 rounded text-[10px]">/api/channel/requestcashin</code> y <code className="font-mono bg-secondary px-1 py-0.5 rounded text-[10px]">/api/channel/confirmcashin</code> (el sistema normaliza automáticamente). Documentación: <a href="https://reseller.test.bencashgroup.com/swagger/index.html" target="_blank" rel="noreferrer" className="text-blue-600 underline font-mono text-[10px]">Swagger API</a>.
                  </p>
                </div>

                {/* Private Key / API Key Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="endpoint-key" className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-accent" /> Clave API Privada (PrivateKey HMAC)
                    </Label>
                    <div className="flex items-center gap-3">
                      {bencashPrivateKey ? (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Clave cargada ({bencashPrivateKey.length} caracteres)
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600">
                          Vacía (Usará Modo Sandbox)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(bencashPrivateKey, "key")}
                        className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        {copiedKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedKey ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>
                  <div className="relative flex items-center">
                    <Input
                      id="endpoint-key"
                      type={showPrivateKey ? "text" : "password"}
                      value={bencashPrivateKey}
                      onChange={(e) => setBencashPrivateKey(e.target.value)}
                      placeholder="Introduce tu clave privada de BenCash (ej: 8a4f...)"
                      className="font-mono text-xs bg-white pr-20"
                    />
                    <div className="absolute right-1 flex items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                        title={showPrivateKey ? "Ocultar clave" : "Mostrar clave"}
                      >
                        {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      {bencashPrivateKey && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-1.5 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setBencashPrivateKey("")}
                          title="Limpiar clave"
                        >
                          Borrar
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Obligatoria para transacciones reales: se envía en el header HTTP <code className="font-mono bg-secondary px-1 py-0.5 rounded text-[10px]">skml</code> y se utiliza para generar firmas HMAC-SHA256 con <code className="font-mono bg-secondary px-1 py-0.5 rounded text-[10px]">accessKey = privateKey + requestId</code>.
                  </p>
                </div>
              </div>

              {/* Ping Result Display */}
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
                          {pingResult.reachable ? "Servidor Receptivo y En Línea" : "Fallo de Respuesta al Ping"}
                        </div>
                        <div className="text-[11px] opacity-80 font-mono">
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

                  {pingResult.details && (
                    <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[10px] space-y-1 overflow-x-auto">
                      <div className="text-slate-400 border-b border-slate-700 pb-1 flex justify-between">
                        <span>Canal de Depósito BenCash</span>
                        <span className="text-emerald-400">{pingResult.timestamp}</span>
                      </div>
                      <p className="text-slate-300">Endpoint probado: {pingResult.channelEndpoint}</p>
                      <p className="text-slate-300">Status Root: {pingResult.details.rootStatus || "N/A"} | Status Canal: {pingResult.details.channelStatus || "N/A"}</p>
                      {pingResult.details.channelResponseBody && (
                        <div className="pt-1 text-amber-300">
                          Respuesta: {JSON.stringify(pingResult.details.channelResponseBody)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="bg-secondary/30 p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Persistencia asegurada en Firestore, servidor Next.js y almacenamiento local</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={handlePingTest}
                  disabled={pinging}
                  variant="outline"
                  className="gap-2 text-xs font-semibold flex-1 sm:flex-initial"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${pinging ? "animate-spin" : ""}`} />
                  Probar Ping
                </Button>
                <Button
                  onClick={handleSaveBenCash}
                  disabled={savingBenCash}
                  className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 text-xs flex-1 sm:flex-initial"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {savingBenCash ? "Guardando..." : "Guardar API Key y URL"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* TAB 2: WHATSAPP API & AUTOMATION SUB-MODULE */}
        <TabsContent value="whatsapp" className="mt-6 space-y-6">
          <WhatsAppSettingsCard
            waEnabled={waEnabled}
            setWaEnabled={setWaEnabled}
            waProvider={waProvider}
            setWaProvider={setWaProvider}
            waToken={waToken}
            setWaToken={setWaToken}
            waPhoneId={waPhoneId}
            setWaPhoneId={setWaPhoneId}
            waBusinessId={waBusinessId}
            setWaBusinessId={setWaBusinessId}
            waGatewayUrl={waGatewayUrl}
            setWaGatewayUrl={setWaGatewayUrl}
            waNotifySender={waNotifySender}
            setWaNotifySender={setWaNotifySender}
            waNotifyRecipient={waNotifyRecipient}
            setWaNotifyRecipient={setWaNotifyRecipient}
            waNotifyInvoices={waNotifyInvoices}
            setWaNotifyInvoices={setWaNotifyInvoices}
            savingWa={savingWa}
            lastSavedWa={lastSavedWa}
            onSave={handleSaveWhatsApp}
            testPhone={testPhone}
            setTestPhone={setTestPhone}
            testType={testType}
            setTestType={setTestType}
            testCustomMsg={testCustomMsg}
            setTestCustomMsg={setTestCustomMsg}
            testingWa={testingWa}
            testResult={testResult}
            onTest={handleTestWhatsApp}
            previewTab={previewTab}
            setPreviewTab={setPreviewTab}
          />
        </TabsContent>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Actualiza tus datos básicos de contacto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input id="name" defaultValue={userProfile?.name || user?.displayName || ""} placeholder="Tu nombre completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" defaultValue={userProfile?.email || user?.email || ""} placeholder="tu@correo.com" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" defaultValue={userProfile?.phone || ""} placeholder="+1 (809) 000-0000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País de Operación</Label>
                  <Input id="country" defaultValue={userProfile?.country || "DO"} disabled />
                </div>
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-white font-bold">Guardar Cambios</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          {/* Submódulo de WhatsApp en Notificaciones */}
          <Card className="border border-emerald-200 shadow-md bg-white overflow-hidden">
            <CardHeader className="bg-emerald-50/80 border-b border-emerald-100 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Automatización de Mensajes por WhatsApp
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600">
                      Despacha recibos oficiales de remesa y avisos en Kreyòl a Haití de forma automática.
                    </CardDescription>
                  </div>
                </div>
                {waEnabled ? (
                  <Badge className="bg-emerald-600 text-white text-xs">Habilitado</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 text-xs">Pausado</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-slate-800">
                    Envío Automático Activo
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Envía comprobantes de depósito inmediatamente a números de RD, EEUU y Haití.
                  </p>
                </div>
                <Switch
                  checked={waEnabled}
                  onCheckedChange={(checked) => {
                    setWaEnabled(checked)
                    updateSettings({ whatsappApiEnabled: checked }, "Admin", "Toggle WhatsApp API en Notificaciones")
                  }}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className={`w-4 h-4 ${waNotifySender ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Comprobante digital al Remitente</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className={`w-4 h-4 ${waNotifyRecipient ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Aviso en Kreyòl al Beneficiario en Haití</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle>Canales Tradicionales</CardTitle>
              <CardDescription>Elige cómo quieres recibir las actualizaciones de tus transacciones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Notificaciones por Email</Label>
                  <p className="text-sm text-muted-foreground">Recibe un correo por cada transacción completada.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Alertas SMS</Label>
                  <p className="text-sm text-muted-foreground">Recibe códigos de confirmación por mensaje de texto.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle>Seguridad de la Cuenta</CardTitle>
              <CardDescription>Mantén tu cuenta protegida con autenticación avanzada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="space-y-2">
                  <Label htmlFor="current-pass">Contraseña Actual</Label>
                  <Input id="current-pass" type="password" />
               </div>
               <Button className="bg-accent hover:bg-accent/90 text-white font-bold">Cambiar Contraseña</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="wallet" className="mt-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle>Configuración de Pagos</CardTitle>
              <CardDescription>Configura tus métodos para retirar tus comisiones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="p-4 rounded-xl bg-secondary/50 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border shadow-sm">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-primary">Cuenta Bancaria (Chase)</div>
                      <div className="text-xs text-muted-foreground">**** 8892</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive">Eliminar</Button>
               </div>
               <Button variant="outline" className="w-full border-dashed border-2 hover:bg-secondary">+ Agregar Nuevo Método de Retiro</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: CUENTAS BANCARIAS DOMINICANAS */}
        <TabsContent value="banks" className="mt-6 space-y-6">
          <OfficialBanksSettingsCard />
        </TabsContent>

        {/* TAB: LOGO & MARCA */}
        <TabsContent value="branding" className="mt-6 space-y-6">
          <LogoAndBrandingSettingsCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
