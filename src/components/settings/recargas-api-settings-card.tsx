"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, Eye, EyeOff, Globe2, KeyRound, Loader2, RefreshCw, Server, Wifi } from "lucide-react"

type ProviderConfig = {
  enabled: boolean
  baseUrl: string
  username: string
  feePercent: number
  hasPassword: boolean
}

const PRODUCTION_URL = "https://api.recargasdominicanas.do"
const DEVELOPMENT_URL = "https://dev.api.recargasdominicanas.do"

export function RecargasApiSettingsCard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [config, setConfig] = useState<ProviderConfig>({ enabled: false, baseUrl: PRODUCTION_URL, username: "", feePercent: 0, hasPassword: false })
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [working, setWorking] = useState("")
  const [connectedBusiness, setConnectedBusiness] = useState("")
  const [productCount, setProductCount] = useState<number | null>(null)

  const api = useCallback(async (init?: RequestInit) => {
    const idToken = await user?.getIdToken()
    if (!idToken) throw new Error("La sesión administrativa no está disponible.")
    const response = await fetch("/api/admin/recharges/config", {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}`, ...(init?.headers || {}) },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data.success === false) throw new Error(data.error || "No se pudo completar la operación.")
    return data
  }, [user])

  const load = useCallback(async () => {
    try {
      const data = await api()
      setConfig(data.config)
      setConnectedBusiness(String(data.catalog?.businessName || ""))
      setProductCount(Number(data.catalog?.productCount || 0))
    } catch (error) {
      toast({ title: "No se cargó la configuración", description: error instanceof Error ? error.message : "Error de conexión", variant: "destructive" })
    }
  }, [api, toast])

  useEffect(() => { if (user) void load() }, [load, user])

  const submit = async (action: "save" | "test") => {
    setWorking(action)
    try {
      const data = await api({
        method: "POST",
        body: JSON.stringify({ ...config, password, action }),
      })
      setPassword("")
      if (action === "test") {
        setConfig((current) => ({ ...current, enabled: true, hasPassword: true, feePercent: Number(data.feePercent ?? current.feePercent) }))
        setConnectedBusiness(String(data.business?.name || "Cuenta comercial verificada"))
        setProductCount(Array.isArray(data.products) ? data.products.length : 0)
        toast({ title: "API de producción conectada", description: `${Array.isArray(data.products) ? data.products.length : 0} servicios y productos sincronizados.` })
      } else {
        await load()
        toast({ title: "Configuración guardada", description: "Las credenciales permanecen cifradas y se utilizan solo desde el servidor." })
      }
    } catch (error) {
      toast({ title: action === "test" ? "No se pudo conectar" : "No se pudo guardar", description: error instanceof Error ? error.message : "Revisa las credenciales", variant: "destructive" })
    } finally {
      setWorking("")
    }
  }

  return (
    <Card className="overflow-hidden border-emerald-200 shadow-md">
      <CardHeader className="bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 text-white">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge className="bg-emerald-400 text-emerald-950 hover:bg-emerald-400">Pruebas y producción</Badge>
              <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">Recargas y facturas RD</Badge>
            </div>
            <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" /> API Recargas Dominicanas</CardTitle>
            <CardDescription className="mt-1 text-emerald-100">Credenciales, conexión y catálogo centralizados en Configuración.</CardDescription>
          </div>
          <div className={`rounded-full px-3 py-1.5 text-xs font-bold ${config.enabled && config.hasPassword ? "bg-emerald-400 text-emerald-950" : "bg-white/15 text-white"}`}>
            {config.enabled && config.hasPassword ? "Configurada" : "Pendiente"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <Label htmlFor="recargas-url" className="flex items-center gap-2 text-emerald-950"><Globe2 className="h-4 w-4" /> Servidor oficial</Label>
          <Input id="recargas-url" value={config.baseUrl} onChange={(event) => setConfig({ ...config, baseUrl: event.target.value })} className="mt-2 bg-white font-mono text-sm" placeholder={DEVELOPMENT_URL} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={config.baseUrl === DEVELOPMENT_URL ? "default" : "outline"} onClick={() => setConfig({ ...config, baseUrl: DEVELOPMENT_URL })}>Servidor de pruebas</Button>
            <Button type="button" size="sm" variant={config.baseUrl === PRODUCTION_URL ? "default" : "outline"} onClick={() => setConfig({ ...config, baseUrl: PRODUCTION_URL })}>Servidor de producción</Button>
          </div>
          <p className="mt-2 text-xs text-emerald-800">Puedes editar o seleccionar el entorno. Por seguridad solo se aceptan los dos dominios oficiales del proveedor.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="recargas-user">Usuario API comercial</Label>
            <Input id="recargas-user" autoComplete="username" value={config.username} onChange={(event) => setConfig({ ...config, username: event.target.value })} placeholder="Usuario asignado por el proveedor" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recargas-password">Contraseña {config.hasPassword && <span className="text-emerald-700">(guardada)</span>}</Label>
            <div className="relative">
              <Input id="recargas-password" autoComplete="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={config.hasPassword ? "Déjala vacía para conservarla" : "Contraseña del proveedor"} className="pr-10" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recargas-fee">Tarifa HispaniolaPay (%)</Label>
            <Input id="recargas-fee" type="number" min="0" max="100" step="0.01" value={config.feePercent} onChange={(event) => setConfig({ ...config, feePercent: Number(event.target.value) })} />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-4">
            <div><div className="font-semibold">Servicio habilitado</div><p className="text-xs text-muted-foreground">Permite operar el catálogo sincronizado.</p></div>
            <Switch checked={config.enabled} onCheckedChange={(enabled) => setConfig({ ...config, enabled })} />
          </div>
        </div>

        {connectedBusiness && (
          <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" /> {connectedBusiness}</span>
            <Badge className="bg-emerald-700 text-white">{productCount ?? 0} productos cargados</Badge>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={Boolean(working)} onClick={() => submit("save")}>
            {working === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />} Guardar credenciales
          </Button>
          <Button disabled={Boolean(working) || !config.username || (!config.hasPassword && !password)} onClick={() => submit("test")} className="bg-emerald-700 hover:bg-emerald-800">
            {working === "test" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : config.hasPassword ? <RefreshCw className="mr-2 h-4 w-4" /> : <Wifi className="mr-2 h-4 w-4" />} Conectar y sincronizar servicios
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
