"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Phone, Receipt, RefreshCw, Wifi, Zap } from "lucide-react"
import Link from "next/link"

type Product = { id: number; key?: string; type?: string; category?: string; image?: string; name: string; profit?: number; min?: number; max?: number; enabled?: boolean; directoryOnly?: boolean }
type DataPlan = { id: string | number; name: string; price: number }
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

  useEffect(() => { loadProducts() }, [loadProducts])

  const mobileProducts = useMemo(() => products.filter((item) => item.category === "mobile-topup" || item.type === "Recarga"), [products])
  const dataPlanProducts = useMemo(() => products.filter((item) => item.category === "data-plan" || item.type === "Paquetico"), [products])
  const invoiceProducts = useMemo(() => products.filter(isInvoiceProduct), [products])
  const pinProducts = useMemo(() => products.filter((item) => item.enabled !== false && (normalizeProvider(item.category) === "pin" || normalizeProvider(item.type) === "pin")), [products])
  const selectedProduct = mobileProducts.find((item) => String(item.id) === productId)
  const fee = Math.round(amount * feePercent) / 100
  const selectedPlan = plans.find((item) => String(item.id) === selectedPlanId)
  const planAmount = Number(selectedPlan?.price || 0)
  const planFee = Math.round(planAmount * feePercent) / 100

  const submitTopup = async () => {
    setWorking("topup")
    try {
      const data = await api("/api/recharges", { method: "POST", body: JSON.stringify({ action: "mobile_topup", productId: Number(productId), phone, amount, idempotencyKey: idempotencyKey() }) })
      toast({ title: "Recarga completada", description: `Referencia ${data.transaction.providerId} · RD$${Number(data.transaction.amountDOP).toFixed(2)}` })
      setPhone(""); setAmount(0)
    } catch (error) {
      const typed = error as Error & { reviewRequired?: boolean }
      toast({ title: typed.reviewRequired ? "Operación en revisión" : "No se realizó la recarga", description: typed.message, variant: "destructive" })
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
    } catch (error) {
      const typed = error as Error & { reviewRequired?: boolean }
      toast({ title: typed.reviewRequired ? "Pago en revisión" : "No se realizó el pago", description: typed.message, variant: "destructive" })
    } finally { setWorking("") }
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="rounded-3xl bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-600 p-6 text-white shadow-xl md:p-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><Badge className="mb-3 bg-white/15 text-white hover:bg-white/20">Servicios República Dominicana</Badge><h1 className="text-3xl font-black">Recargas y pagos</h1><p className="mt-2 max-w-xl text-sm text-blue-100">Recarga teléfonos y paga facturas directamente desde tu billetera HispaniolaPay.</p></div>
        <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur"><div className="text-xs text-blue-100">Balance disponible</div><div className="text-2xl font-black">{symbol(userProfile?.primaryCurrency)}{Number(userProfile?.walletBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div><div className="text-xs text-blue-100">{userProfile?.primaryCurrency || "USD"}</div></div>
      </div>
    </div>

    {catalogWarning && <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><span>Se muestra el último catálogo sincronizado. La conexión en vivo se restablecerá automáticamente.</span></div>}
    {!loading && products.length === 0 && userProfile?.role === "admin" && userProfile.canAccessSettings !== false && <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"><span>El catálogo todavía no está sincronizado. Configura la API de producción y carga los servicios.</span><Button asChild variant="outline"><Link href="/dashboard/settings">Abrir Configuración API</Link></Button></div>}

    <Tabs defaultValue="topup" className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:w-[900px] md:grid-cols-4"><TabsTrigger value="topup" className="gap-2"><Phone className="h-4 w-4"/> Recarga móvil</TabsTrigger><TabsTrigger value="plans" className="gap-2"><Zap className="h-4 w-4"/> Paqueticos</TabsTrigger><TabsTrigger value="pins" className="gap-2"><KeyRound className="h-4 w-4"/> Pines</TabsTrigger><TabsTrigger value="invoice" className="gap-2"><Receipt className="h-4 w-4"/> Pagar factura</TabsTrigger></TabsList>
      <TabsContent value="topup"><Card><CardHeader><CardTitle>Recarga móvil</CardTitle><CardDescription>El débito y la tarifa se muestran antes de procesar.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><Label>Compañía o producto</Label><ProviderChoice products={mobileProducts} value={productId} onChange={setProductId}/></div>
        <div className="space-y-2"><Label>Número de teléfono</Label><Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="8095550000" /></div>
        <div className="space-y-2"><Label>Monto en pesos dominicanos</Label><Input type="number" min={selectedProduct?.min || 1} max={selectedProduct?.max} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="RD$0.00"/><p className="text-xs text-muted-foreground">{selectedProduct ? `Permitido: RD$${Number(selectedProduct.min || 0).toFixed(2)} – RD$${Number(selectedProduct.max || 0).toFixed(2)}` : "Selecciona el producto para consultar los límites."}</p></div>
        <div className="rounded-xl border bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span>Recarga</span><strong>RD${amount.toFixed(2)}</strong></div><div className="mt-2 flex justify-between"><span>Tarifa ({feePercent.toFixed(2)}%)</span><strong>RD${fee.toFixed(2)}</strong></div><div className="mt-3 flex justify-between border-t pt-3 text-base"><span>Total</span><strong>RD${(amount + fee).toFixed(2)}</strong></div></div>
        <Button className="h-12 md:col-span-2" disabled={!productId || phone.replace(/\D/g, "").length < 10 || amount <= 0 || !!working || loading} onClick={submitTopup}>{working === "topup" ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wifi className="mr-2 h-4 w-4"/>} Confirmar recarga</Button>
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
      <TabsContent value="invoice"><Card><CardHeader><CardTitle>Consulta y pago de factura</CardTitle><CardDescription>Consultamos directamente al proveedor antes de aceptar el pago.</CardDescription></CardHeader><CardContent className="space-y-5">
        <div className="space-y-2"><Label>Empresa de servicio</Label><ProviderChoice products={invoiceProducts} value={invoiceProductId} onChange={(value) => { setInvoiceProductId(value); setInvoice(null) }}/></div><div className="space-y-2"><Label>Contrato, NIC o referencia</Label><div className="flex gap-2"><Input value={nic} onChange={(e) => { setNic(e.target.value); setInvoice(null) }} placeholder="Número de contrato"/><Button variant="outline" disabled={!invoiceProductId || !nic || !!working} onClick={lookupInvoice}>{working === "lookup" ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}</Button></div></div>
        {invoice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 className="h-5 w-5"/> Factura encontrada</div><div className="mt-3 grid gap-2 text-sm md:grid-cols-3"><div><span className="text-muted-foreground">Titular</span><div className="font-bold">{invoice.name || "—"}</div></div><div><span className="text-muted-foreground">Contrato</span><div className="font-bold">{invoice.nic || nic}</div></div><div><span className="text-muted-foreground">Monto</span><div className="text-xl font-black">RD${Number(invoice.amount || 0).toFixed(2)}</div></div></div><Button className="mt-5 w-full" disabled={!!working} onClick={payInvoice}>{working === "invoice" && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Pagar factura</Button></div>}
      </CardContent></Card></TabsContent>
    </Tabs>
  </div>
}

