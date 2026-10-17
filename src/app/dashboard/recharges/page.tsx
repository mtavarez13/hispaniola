"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, ArrowLeft, CheckCircle2, History, KeyRound, Loader2, Phone, Printer, Receipt, RefreshCw, Undo2, Wifi, Zap } from "lucide-react"
import Link from "next/link"
import { printThermalReceipt, type PrintJob } from "@/components/printing/remote-print-station"

type Product = { id: number; key?: string; type?: string; category?: string; image?: string; name: string; profit?: number; min?: number; max?: number; enabled?: boolean; directoryOnly?: boolean }
type DataPlan = { id: string | number; name: string; price: number }
type RechargeHistory = { id: string; action: string; title: string; productName: string; target: string; amountDOP: number; feeDOP: number; totalDOP: number; providerId: string; status: string; canCancel: boolean; pin?: string; cancellationError?: string; createdAt?: string | null; cancelledAt?: string | null }
const PROVIDER_ASSETS: Record<string, string> = {
  claro: "claro.svg", altice: "altice.svg", viva: "viva.svg", digicel: "digicel.svg", moun: "moun.svg", natcom: "natcom.svg",
  wind: "wind.png", "paso rápido": "paso-rapido.png", "paso rapido": "paso-rapido.png",
  edenorte: "edenorte.png", edesur: "edesur.png", edeeste: "edeeste.png", cepm: "cepm.png", ceb: "ceb.png",
  adn: "adn.png", caasd: "caasd.png", corasan: "coraasan.jpg", coraasan: "coraasan.jpg", coraplata: "coraaplata.png", coraaplata: "coraaplata.png", coaarom: "coaarom.png",
  dgii: "dgii.png", midas: "midas.png", "midas seguros": "midas.png", activa: "activa.png", "star sport": "star-sport.png", "juancito sport": "juancito-sport.png",
}
const normalizeProvider = (value?: string) => String(value || "").trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
const INVOICE_PROVIDERS = new Set([
  "edenorte", "corasan", "coraasan", "claro", "altice", "viva", "edeeste", "edesur", "wind", "caasd", "cepm", "ceb", "adn",
  "coraplata", "coraaplata", "coraavega", "coaarom", "dgii", "pgr multas", "tss", "midas seguros", "midas",
])
const isInvoiceProduct = (item: Product) => {
  const category = normalizeProvider(item.category)
  const type = normalizeProvider(item.type)
  const name = normalizeProvider(item.name)
  if (category === "invoice" || type === "factura") return true
  if (category === "mobile-topup" || category === "data-plan" || type === "recarga" || type === "paquetico") return false
  return [...INVOICE_PROVIDERS].some((provider) => name === provider || name.includes(provider))
}
const providerLogo = (product: Product) => {
  const raw = String(product.name || "").trim().toLocaleLowerCase("es")
  const normalized = normalizeProvider(raw)
  const asset = PROVIDER_ASSETS[raw] || PROVIDER_ASSETS[normalized] || Object.entries(PROVIDER_ASSETS).find(([provider]) => normalized.includes(normalizeProvider(provider)))?.[1]
  if (asset) return `https://www.recargasdominicanas.do/images/${asset}`
  const supplied = String(product.image || "").trim()
  if (/^https:\/\//i.test(supplied)) return supplied
  if (supplied) return `https://www.recargasdominicanas.do/images/${supplied.replace(/[?#].*$/, "").replace(/^.*\//, "")}`
  return ""
}
function ProviderLogoMark({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false)
  const logo = providerLogo(product)
  const initials = product.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 3)
  return <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white p-2 shadow-md ring-1 ring-slate-200">{logo && !failed ? <img src={logo} alt={`Logo ${product.name}`} onError={() => setFailed(true)} className="max-h-full max-w-full object-contain" /> : <span className="text-base font-black text-blue-800">{initials}</span>}</span>
}
function ProviderChoice({ products, value, onChange }: { products: Product[]; value: string; onChange: (value: string) => void }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{products.map((product) => {
    const active = value === String(product.id)
    const disabled = product.enabled === false
    return <button type="button" key={product.id} disabled={disabled} onClick={() => onChange(String(product.id))} className={`flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition ${disabled ? "cursor-not-allowed bg-slate-50 opacity-60" : active ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100" : "bg-background hover:border-blue-300"}`}>
      <ProviderLogoMark product={product}/>
      <span><span className="block font-bold">{product.name}</span><span className={`text-xs ${disabled ? "font-semibold text-amber-700" : "text-muted-foreground"}`}>{disabled ? "Pendiente de activación" : product.type || "Servicio"}</span></span>
    </button>
  })}</div>
}
const symbol = (currency?: string) => currency === "DOP" ? "RD$" : currency === "HTG" ? "G" : "US$"
const idempotencyKey = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`

export default function RechargesPage() {
  const { user, userProfile } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState("")
  const [productId, setProductId] = useState("")
  const [phone, setPhone] = useState("")
  const [amount, setAmount] = useState(0)
  const [serviceProductId, setServiceProductId] = useState("")
  const [serviceNumber, setServiceNumber] = useState("")
  const [serviceAmount, setServiceAmount] = useState(0)
  const [invoiceProductId, setInvoiceProductId] = useState("")
  const [nic, setNic] = useState("")
  const [invoice, setInvoice] = useState<{ nic?: string; name?: string; amount?: number } | null>(null)
  const [planProductId, setPlanProductId] = useState("")
  const [planPhone, setPlanPhone] = useState("")
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [pinProductId, setPinProductId] = useState("")
  const [pinPrice, setPinPrice] = useState(0)
  const [feePercent, setFeePercent] = useState(0)
  const [catalogWarning, setCatalogWarning] = useState("")
  const [history, setHistory] = useState<RechargeHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const invoiceNumberRef = useRef<HTMLInputElement>(null)
  const canPrintReceipts = Boolean(userProfile && (userProfile.role === "admin" || userProfile.role === "agent" || userProfile.thermalReceiptsEnabled))

  const token = useCallback(async () => user?.getIdToken(), [user])
  const api = useCallback(async (url: string, init?: RequestInit) => {
    const idToken = await token()
    if (!idToken) throw new Error("Inicia sesión para continuar.")
    let response: Response | null = null
    let networkError: unknown = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}`, ...(init?.headers || {}) } })
        break
      } catch (error) {
        networkError = error
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
    if (!response) throw new Error(networkError instanceof Error ? `No se pudo conectar con HispaniolaPay: ${networkError.message}` : "No se pudo conectar con HispaniolaPay")
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data.success === false) {
      const error = new Error(data.error || "No se pudo completar la operación") as Error & { reviewRequired?: boolean }
      error.reviewRequired = data.reviewRequired === true
      throw error
    }
    return data
  }, [token])

  const loadProducts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await api("/api/recharges?action=products")
      setProducts(data.products || [])
      setFeePercent(Number(data.feePercent || 0))
      setCatalogWarning(String(data.warning || ""))
    } catch (error) {
      toast({ title: "Servicio no disponible", description: error instanceof Error ? error.message : "No se cargaron los productos", variant: "destructive" })
    } finally { setLoading(false) }
  }, [api, toast, user])

  const loadHistory = useCallback(async () => {
    if (!user) return
    setHistoryLoading(true)
    try { const data = await api("/api/recharges?action=my_history"); setHistory(data.transactions || []) }
    catch (error) { toast({ title: "No se cargó el historial", description: error instanceof Error ? error.message : "Error inesperado", variant: "destructive" }) }
    finally { setHistoryLoading(false) }
  }, [api, toast, user])

  useEffect(() => { loadProducts(); loadHistory() }, [loadProducts, loadHistory])

  const mobileProducts = useMemo(() => products.filter((item) => normalizeProvider(item.category) === "mobile-topup" || (!item.category && normalizeProvider(item.type) === "recarga")), [products])
  const serviceProducts = useMemo(() => products.filter((item) => ["energy-topup", "other"].includes(normalizeProvider(item.category)) || normalizeProvider(item.type) === "recarga de servicio"), [products])
  const dataPlanProducts = useMemo(() => products.filter((item) => item.category === "data-plan" || item.type === "Paquetico"), [products])
  const invoiceProducts = useMemo(() => products.filter(isInvoiceProduct), [products])
  const pinProducts = useMemo(() => products.filter((item) => item.enabled !== false && (normalizeProvider(item.category) === "pin" || normalizeProvider(item.type) === "pin")), [products])
  const selectedProduct = mobileProducts.find((item) => String(item.id) === productId)
  const selectedServiceProduct = serviceProducts.find((item) => String(item.id) === serviceProductId)
  const selectedInvoiceProduct = invoiceProducts.find((item) => String(item.id) === invoiceProductId)
  const fee = Math.round(amount * feePercent) / 100
  const selectedPlan = plans.find((item) => String(item.id) === selectedPlanId)
  const planAmount = Number(selectedPlan?.price || 0)
  const planFee = Math.round(planAmount * feePercent) / 100
  const serviceFee = Math.round(serviceAmount * feePercent) / 100

  const submitTopup = async () => {
    setWorking("topup")
    try {
      const data = await api("/api/recharges", { method: "POST", body: JSON.stringify({ action: "mobile_topup", productId: Number(productId), phone, amount, idempotencyKey: idempotencyKey() }) })
      toast({ title: "Recarga completada", description: `Referencia ${data.transaction.providerId} · RD$${Number(data.transaction.amountDOP).toFixed(2)}` })
      setPhone(""); setAmount(0)
      await loadHistory()
    } catch (error) {
      const typed = error as Error & { reviewRequired?: boolean }
      toast({ title: typed.reviewRequired ? "Operación en revisión" : "No se realizó la recarga", description: typed.message, variant: "destructive" })
    } finally { setWorking("") }
  }

  const submitServiceTopup = async () => {
    setWorking("service_topup")
    try {
      const data = await api("/api/recharges", { method: "POST", body: JSON.stringify({ action: "service_topup", productId: Number(serviceProductId), number: serviceNumber.trim(), amount: serviceAmount, idempotencyKey: idempotencyKey() }) })
      toast({ title: "Servicio recargado", description: `Referencia ${data.transaction.providerId} · RD$${Number(data.transaction.amountDOP).toFixed(2)}` })
      setServiceNumber(""); setServiceAmount(0)
      await loadHistory()
    } catch (error) {
      const typed = error as Error & { reviewRequired?: boolean }
      toast({ title: typed.reviewRequired ? "Operación en revisión" : "No se recargó el servicio", description: typed.message, variant: "destructive" })
    } finally { setWorking("") }
  }

  const lookupInvoice = async () => {
    setWorking("lookup")
    try {
      const data = await api(`/api/recharges?action=invoice&productId=${encodeURIComponent(invoiceProductId)}&nic=${encodeURIComponent(nic)}`)
      setInvoice(data.invoice)
    } catch (error) {
      setInvoice(null)
      toast({ title: "Factura no encontrada", description: error instanceof Error ? error.message : "Verifica el contrato", variant: "destructive" })
    } finally { setWorking("") }
  }

  const selectInvoiceProvider = (value: string) => {
    setInvoiceProductId(value)
    setNic("")
    setInvoice(null)
    window.requestAnimationFrame(() => {
      invoiceNumberRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      invoiceNumberRef.current?.focus({ preventScroll: true })
    })
  }

  const lookupPlans = async () => {
    setWorking("plans")
    setPlans([])
    setSelectedPlanId("")
    try {
      const data = await api(`/api/recharges?action=data_plans&productId=${encodeURIComponent(planProductId)}&phone=${encodeURIComponent(planPhone)}`)
      setPlans(data.plans || [])
      if (!data.plans?.length) toast({ title: "Sin paqueticos disponibles", description: "El proveedor no devolvió planes para este número." })
    } catch (error) {
      toast({ title: "No se cargaron los paqueticos", description: error instanceof Error ? error.message : "Verifica el número", variant: "destructive" })
    } finally { setWorking("") }
  }

  const submitPlan = async () => {
    setWorking("data_plan")
    try {
      const data = await api("/api/recharges", { method: "POST", body: JSON.stringify({ action: "data_plan", productId: Number(planProductId), phone: planPhone, planId: selectedPlanId, idempotencyKey: idempotencyKey() }) })
      toast({ title: "Paquetico activado", description: `Referencia ${data.transaction.providerId} · RD$${Number(data.transaction.amountDOP).toFixed(2)}` })
      setPlanPhone(""); setPlans([]); setSelectedPlanId("")
      await loadHistory()
    } catch (error) {
      const typed = error as Error & { reviewRequired?: boolean }
      toast({ title: typed.reviewRequired ? "Operación en revisión" : "No se activó el paquetico", description: typed.message, variant: "destructive" })
    } finally { setWorking("") }
  }

  const submitPin = async () => {
    setWorking("pin")
    try {
      const data = await api("/api/recharges", { method: "POST", body: JSON.stringify({ action: "pin_purchase", productId: Number(pinProductId), price: pinPrice, idempotencyKey: idempotencyKey() }) })
      const issuedPin = String(data.transaction?.pin || "")
      toast({ title: "PIN comprado", description: issuedPin ? `Código ${issuedPin} · Referencia ${data.transaction.providerId}` : `Referencia ${data.transaction.providerId}` })
      setPinPrice(0)
      await loadHistory()
    } catch (error) {
      const typed = error as Error & { reviewRequired?: boolean }
      toast({ title: typed.reviewRequired ? "Operación en revisión" : "No se compró el PIN", description: typed.message, variant: "destructive" })
    } finally { setWorking("") }
  }

  const payInvoice = async () => {
    setWorking("invoice")
    try {
      const data = await api("/api/recharges", { method: "POST", body: JSON.stringify({ action: "invoice_payment", productId: Number(invoiceProductId), nic, idempotencyKey: idempotencyKey() }) })
      toast({ title: "Factura pagada", description: `Referencia ${data.transaction.providerId} · RD$${Number(data.transaction.amountDOP).toFixed(2)}` })
      setNic(""); setInvoice(null)
      await loadHistory()
    } catch (error) {
      const typed = error as Error & { reviewRequired?: boolean }
      toast({ title: typed.reviewRequired ? "Pago en revisión" : "No se realizó el pago", description: typed.message, variant: "destructive" })
    } finally { setWorking("") }
  }

  const cancelTransaction = async (item: RechargeHistory) => {
    if (!item.canCancel || !window.confirm(`¿Cancelar ${item.title.toLowerCase()} ${item.providerId}? El proveedor decidirá si todavía está dentro del plazo permitido.`)) return
    setWorking(`cancel-${item.id}`)
    try {
      const data = await api("/api/recharges", { method: "DELETE", body: JSON.stringify({ transactionId: item.id }) })
      toast({ title: data.duplicate ? "Operación ya cancelada" : "Cancelación confirmada", description: data.duplicate ? "El saldo ya había sido devuelto." : "El importe fue restaurado en tu billetera." })
      await loadHistory()
    } catch (error) {
      const typed = error as Error & { reviewRequired?: boolean }
      toast({ title: typed.reviewRequired ? "Cancelación en revisión" : "No se pudo cancelar", description: typed.message, variant: "destructive" })
      await loadHistory()
    } finally { setWorking("") }
  }

  const reprintTransaction = async (item: RechargeHistory) => {
    setWorking(`print-${item.id}`)
    try {
      const receipt: PrintJob = {
        id: `history-${item.id}`,
        status: "printed",
        createdAt: item.createdAt || new Date().toISOString(),
        payload: {
          kind: item.action,
          transactionId: item.id,
          title: item.title,
          reference: item.providerId || item.id,
          userName: userProfile?.name || user?.displayName || "Cliente HispaniolaPay",
          userCode: userProfile?.clientCode,
          productName: item.productName,
          provider: "Recargas Dominicanas",
          target: item.target,
          recipientPhone: item.target,
          amount: Number(item.amountDOP || 0),
          currency: "DOP",
          fee: Number(item.feeDOP || 0),
          total: Number(item.totalDOP || item.amountDOP || 0),
          pin: item.pin,
          status: item.status === "cancelled" ? "ANULADA" : "COMPLETADA",
        },
      }
      await printThermalReceipt(receipt, userProfile?.receiptPaperWidthMm === 78 ? 78 : 58)
      toast({ title: "Comprobante enviado a impresión", description: `Referencia ${receipt.payload.reference}` })
    } catch (error) {
      toast({ title: "No se pudo reimprimir", description: error instanceof Error ? error.message : "Revisa la impresora", variant: "destructive" })
    } finally { setWorking("") }
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="rounded-3xl bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-600 p-6 text-white shadow-xl md:p-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><Badge className="mb-3 bg-white/15 text-white hover:bg-white/20">Servicios República Dominicana</Badge><h1 className="text-3xl font-black">Recargas y pagos</h1><p className="mt-2 max-w-xl text-sm text-blue-100">Recarga teléfonos, servicios y paga facturas directamente desde tu billetera HispaniolaPay.</p></div>
        <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur"><div className="text-xs text-blue-100">Balance disponible</div><div className="text-2xl font-black">{symbol(userProfile?.primaryCurrency)}{Number(userProfile?.walletBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div><div className="text-xs text-blue-100">{userProfile?.primaryCurrency || "USD"}</div></div>
      </div>
    </div>

    {catalogWarning && <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><span>Se muestra el último catálogo sincronizado. La conexión en vivo se restablecerá automáticamente.</span></div>}
    {!loading && products.length === 0 && userProfile?.role === "admin" && userProfile.canAccessSettings !== false && <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"><span>El catálogo todavía no está sincronizado. Configura la API de producción y carga los servicios.</span><Button asChild variant="outline"><Link href="/dashboard/settings">Abrir Configuración API</Link></Button></div>}

    <Tabs defaultValue="topup" className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 lg:grid-cols-5"><TabsTrigger value="topup" className="gap-2"><Phone className="h-4 w-4"/> Recarga móvil</TabsTrigger><TabsTrigger value="services" className="gap-2"><Wifi className="h-4 w-4"/> Servicios</TabsTrigger><TabsTrigger value="plans" className="gap-2"><Zap className="h-4 w-4"/> Paqueticos</TabsTrigger><TabsTrigger value="pins" className="gap-2"><KeyRound className="h-4 w-4"/> Pines</TabsTrigger><TabsTrigger value="invoice" className="gap-2"><Receipt className="h-4 w-4"/> Pagar factura</TabsTrigger></TabsList>
      <TabsContent value="topup"><Card><CardHeader><CardTitle>Recarga móvil</CardTitle><CardDescription>El débito y la tarifa se muestran antes de procesar.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><Label>Compañía o producto</Label><ProviderChoice products={mobileProducts} value={productId} onChange={setProductId}/></div>
        <div className="space-y-2"><Label>Número de teléfono</Label><Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="8095550000" /></div>
        <div className="space-y-2"><Label>Monto en pesos dominicanos</Label><Input type="number" min={selectedProduct?.min || 1} max={selectedProduct?.max} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="RD$0.00"/><p className="text-xs text-muted-foreground">{selectedProduct ? `Permitido: RD$${Number(selectedProduct.min || 0).toFixed(2)} – RD$${Number(selectedProduct.max || 0).toFixed(2)}` : "Selecciona el producto para consultar los límites."}</p></div>
        <div className="rounded-xl border bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span>Recarga</span><strong>RD${amount.toFixed(2)}</strong></div><div className="mt-2 flex justify-between"><span>Tarifa ({feePercent.toFixed(2)}%)</span><strong>RD${fee.toFixed(2)}</strong></div><div className="mt-3 flex justify-between border-t pt-3 text-base"><span>Total</span><strong>RD${(amount + fee).toFixed(2)}</strong></div></div>
        <Button className="h-12 md:col-span-2" disabled={!productId || phone.replace(/\D/g, "").length < 10 || amount <= 0 || !!working || loading} onClick={submitTopup}>{working === "topup" ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wifi className="mr-2 h-4 w-4"/>} Confirmar recarga</Button>
      </CardContent></Card></TabsContent>
      <TabsContent value="services"><Card><CardHeader><CardTitle>Recarga de servicios</CardTitle><CardDescription>Para energía prepago, TV, internet, peajes y otros productos que usan número de contrato.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><Label>Proveedor del servicio</Label><ProviderChoice products={serviceProducts} value={serviceProductId} onChange={setServiceProductId}/></div>
        <div className="space-y-2"><Label>Número, contrato o referencia</Label><Input value={serviceNumber} onChange={(e) => setServiceNumber(e.target.value)} placeholder="Número del servicio"/></div>
        <div className="space-y-2"><Label>Monto en pesos dominicanos</Label><Input type="number" min={selectedServiceProduct?.min || 1} max={selectedServiceProduct?.max} value={serviceAmount || ""} onChange={(e) => setServiceAmount(Number(e.target.value))} placeholder="RD$0.00"/><p className="text-xs text-muted-foreground">{selectedServiceProduct ? `Permitido: RD$${Number(selectedServiceProduct.min || 0).toFixed(2)} – RD$${Number(selectedServiceProduct.max || 0).toFixed(2)}` : "Selecciona el proveedor para consultar los límites."}</p></div>
        <div className="rounded-xl border bg-slate-50 p-4 text-sm md:col-span-2"><div className="flex justify-between"><span>Recarga del servicio</span><strong>RD${serviceAmount.toFixed(2)}</strong></div><div className="mt-2 flex justify-between"><span>Tarifa ({feePercent.toFixed(2)}%)</span><strong>RD${serviceFee.toFixed(2)}</strong></div><div className="mt-3 flex justify-between border-t pt-3 text-base"><span>Total</span><strong>RD${(serviceAmount + serviceFee).toFixed(2)}</strong></div></div>
        <Button className="h-12 md:col-span-2" disabled={!serviceProductId || !serviceNumber.trim() || serviceAmount <= 0 || !!working || loading} onClick={submitServiceTopup}>{working === "service_topup" ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wifi className="mr-2 h-4 w-4"/>} Confirmar recarga de servicio</Button>
      </CardContent></Card></TabsContent>
      <TabsContent value="plans"><Card><CardHeader><CardTitle>Paqueticos de internet</CardTitle><CardDescription>Consulta los planes disponibles para el número antes de activar.</CardDescription></CardHeader><CardContent className="space-y-5">
        <div className="space-y-2"><Label>Compañía</Label><ProviderChoice products={dataPlanProducts} value={planProductId} onChange={(value) => { setPlanProductId(value); setPlans([]); setSelectedPlanId("") }}/></div><div className="space-y-2"><Label>Número de teléfono</Label><div className="flex gap-2"><Input inputMode="tel" value={planPhone} onChange={(e) => { setPlanPhone(e.target.value); setPlans([]); setSelectedPlanId("") }} placeholder="8095550000"/><Button variant="outline" disabled={!planProductId || planPhone.replace(/\D/g, "").length < 10 || !!working} onClick={lookupPlans}>{working === "plans" ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}</Button></div></div>
        {plans.length > 0 && <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{plans.map((plan) => <button type="button" key={String(plan.id)} onClick={() => setSelectedPlanId(String(plan.id))} className={`rounded-2xl border p-4 text-left transition ${selectedPlanId === String(plan.id) ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100" : "hover:border-blue-300"}`}><div className="font-bold">{plan.name}</div><div className="mt-2 text-xl font-black text-blue-800">RD${Number(plan.price || 0).toFixed(2)}</div></button>)}</div>}
        {selectedPlan && <div className="rounded-xl border bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span>{selectedPlan.name}</span><strong>RD${planAmount.toFixed(2)}</strong></div><div className="mt-2 flex justify-between"><span>Tarifa ({feePercent.toFixed(2)}%)</span><strong>RD${planFee.toFixed(2)}</strong></div><div className="mt-3 flex justify-between border-t pt-3 text-base"><span>Total</span><strong>RD${(planAmount + planFee).toFixed(2)}</strong></div><Button className="mt-4 h-12 w-full" disabled={!!working} onClick={submitPlan}>{working === "data_plan" ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4"/>} Activar paquetico</Button></div>}
      </CardContent></Card></TabsContent>
      <TabsContent value="pins"><Card><CardHeader><CardTitle>Comprar PIN</CardTitle><CardDescription>Selecciona el proveedor y el valor del PIN. El código se mostrará al completar la operación y quedará en el recibo.</CardDescription></CardHeader><CardContent className="space-y-5">
        <div className="space-y-2"><Label>Proveedor del PIN</Label><ProviderChoice products={pinProducts} value={pinProductId} onChange={setPinProductId}/></div>
        <div className="space-y-2"><Label>Valor del PIN en pesos dominicanos</Label><Input type="number" min={pinProducts.find((item) => String(item.id) === pinProductId)?.min || 1} max={pinProducts.find((item) => String(item.id) === pinProductId)?.max} value={pinPrice || ""} onChange={(e) => setPinPrice(Number(e.target.value))} placeholder="RD$0.00"/></div>
        <div className="rounded-xl border bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span>PIN</span><strong>RD${pinPrice.toFixed(2)}</strong></div><div className="mt-2 flex justify-between"><span>Tarifa ({feePercent.toFixed(2)}%)</span><strong>RD${(pinPrice * feePercent / 100).toFixed(2)}</strong></div><div className="mt-3 flex justify-between border-t pt-3 text-base"><span>Total</span><strong>RD${(pinPrice + pinPrice * feePercent / 100).toFixed(2)}</strong></div></div>
        <Button className="h-12 w-full" disabled={!pinProductId || pinPrice <= 0 || !!working} onClick={submitPin}>{working === "pin" ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4"/>} Comprar PIN</Button>
      </CardContent></Card></TabsContent>
      <TabsContent value="invoice"><Card><CardHeader><CardTitle>Consulta y pago de factura</CardTitle><CardDescription>Selecciona el servicio, consulta el monto y realiza el pago en un solo lugar.</CardDescription></CardHeader><CardContent className="space-y-5">
        {!selectedInvoiceProduct ? <div className="space-y-2"><Label>Selecciona la empresa de servicio</Label><ProviderChoice products={invoiceProducts} value={invoiceProductId} onChange={selectInvoiceProvider}/></div> : <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50 p-4 shadow-lg sm:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-blue-100 pb-4"><div className="flex min-w-0 items-center gap-3"><ProviderLogoMark product={selectedInvoiceProduct}/><div className="min-w-0"><div className="text-xs font-bold uppercase tracking-wide text-blue-600">Servicio seleccionado</div><div className="truncate text-xl font-black text-slate-900">{selectedInvoiceProduct.name}</div></div></div><Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1" onClick={() => { setInvoiceProductId(""); setNic(""); setInvoice(null) }}><ArrowLeft className="h-4 w-4"/> Cambiar</Button></div>
          <div className="mt-5 space-y-2"><Label htmlFor="invoice-service-number">Número de servicio, contrato, NIC o referencia</Label><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Input ref={invoiceNumberRef} id="invoice-service-number" value={nic} onChange={(e) => { setNic(e.target.value); setInvoice(null) }} placeholder="Escribe el número del servicio" className="h-12 bg-white text-base"/><Button className="h-12 gap-2 px-6" disabled={!nic.trim() || !!working} onClick={lookupInvoice}>{working === "lookup" ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>} Consultar factura</Button></div></div>
          {invoice && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 className="h-5 w-5"/> Factura encontrada</div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-white/80 p-3"><span className="text-muted-foreground">Titular</span><div className="font-bold">{invoice.name || "—"}</div></div><div className="rounded-xl bg-white/80 p-3"><span className="text-muted-foreground">Número de servicio</span><div className="font-bold">{invoice.nic || nic}</div></div></div><div className="mt-4 rounded-xl bg-white p-4"><div className="flex justify-between"><span>Monto de la factura</span><strong>RD${Number(invoice.amount || 0).toFixed(2)}</strong></div><div className="mt-2 flex justify-between text-sm"><span>Tarifa ({feePercent.toFixed(2)}%)</span><strong>RD${(Number(invoice.amount || 0) * feePercent / 100).toFixed(2)}</strong></div><div className="mt-3 flex justify-between border-t pt-3 text-lg"><span>Total a pagar</span><strong>RD${(Number(invoice.amount || 0) * (1 + feePercent / 100)).toFixed(2)}</strong></div></div><Button className="mt-5 h-12 w-full text-base font-bold" disabled={!!working || Number(invoice.amount || 0) <= 0} onClick={payInvoice}>{working === "invoice" ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Receipt className="mr-2 h-4 w-4"/>} Pagar servicio</Button></div>}
        </div>}
      </CardContent></Card></TabsContent>
    </Tabs>
    <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Historial y anulaciones</CardTitle><CardDescription>Recargas y facturas recientes. La anulación solo aparece cuando el tipo de operación está admitido por el proveedor.</CardDescription></div><Button variant="outline" size="icon" onClick={loadHistory} disabled={historyLoading}><RefreshCw className={`h-4 w-4 ${historyLoading ? "animate-spin" : ""}`}/></Button></div></CardHeader><CardContent className="space-y-3">
      {history.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-bold">{item.title} · {item.productName}</span><Badge variant={item.status === "cancelled" ? "secondary" : item.status === "completed" ? "default" : "outline"}>{item.status === "cancelled" ? "ANULADA" : item.status === "completed" ? "COMPLETADA" : item.status === "cancellation_review" ? "EN REVISIÓN" : item.status.toUpperCase()}</Badge></div><div className="mt-1 text-xs text-muted-foreground">{item.target} · Ref. {item.providerId || "—"} · {item.createdAt ? new Date(item.createdAt).toLocaleString("es-DO") : ""}</div>{item.cancellationError && <div className="mt-1 text-xs text-amber-700">{item.cancellationError}</div>}</div><div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end"><strong className="mr-1">RD${Number(item.totalDOP || item.amountDOP).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>{canPrintReceipts && ["completed", "cancelled"].includes(item.status) && <Button variant="outline" size="sm" className="gap-2" disabled={!!working} onClick={() => reprintTransaction(item)}>{working === `print-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin"/> : <Printer className="h-4 w-4"/>} Reimprimir</Button>}{item.canCancel && <Button variant="destructive" size="sm" className="gap-2" disabled={!!working} onClick={() => cancelTransaction(item)}>{working === `cancel-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin"/> : <Undo2 className="h-4 w-4"/>} Solicitar anulación</Button>}</div></div>)}
      {!historyLoading && history.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Todavía no tienes operaciones de recarga o pago.</div>}
    </CardContent></Card>
  </div>
}

