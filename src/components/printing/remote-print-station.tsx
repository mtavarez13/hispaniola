"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, MonitorUp, Printer, RefreshCw, Volume2, XCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type PrintJob = {
  id: string
  status: "pending" | "printing" | "printed" | "failed"
  createdAt?: string
  printedAt?: string
  attemptCount?: number
  reprintCount?: number
  payload: {
    kind: string
    transactionId: string
    title: string
    reference: string
    userName: string
    userCode?: string
    productName?: string
    provider?: string
    recipientName?: string
    recipientPhone?: string
    target?: string
    amount: number
    currency: string
    fee?: number
    total?: number
    deliveredAmount?: number
    deliveredCurrency?: string
    pin?: string
    status?: string
  }
}

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#039;")

const money = (value: unknown, currency: unknown) => {
  const amount = Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const symbol = currency === "DOP" ? "RD$" : currency === "HTG" ? "G" : currency === "USD" ? "US$" : `${String(currency || "")} `
  return `${symbol}${amount}`
}

export function printThermalReceipt(job: PrintJob, width: 58 | 78) {
  return new Promise<void>((resolve, reject) => {
    const frame = document.createElement("iframe")
    frame.setAttribute("aria-hidden", "true")
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none"
    document.body.appendChild(frame)
    const doc = frame.contentDocument
    if (!doc || !frame.contentWindow) {
      frame.remove()
      reject(new Error("El navegador no permitió preparar la factura"))
      return
    }
    const item = job.payload
    const rows = [
      ["Operación", item.title], ["Referencia", item.reference], ["Cliente", item.userName],
      item.userCode ? ["Código", item.userCode] : null,
      item.productName ? ["Producto", item.productName] : null,
      item.provider ? ["Proveedor", item.provider] : null,
      item.recipientName ? ["Destinatario", item.recipientName] : null,
      item.recipientPhone ? ["Teléfono", item.recipientPhone] : null,
      item.target && !item.recipientPhone ? ["Destino", item.target] : null,
      ["Monto", money(item.amount, item.currency)],
      Number(item.fee || 0) > 0 ? ["Tarifa", money(item.fee, item.currency)] : null,
      Number(item.total || 0) > 0 ? ["Total", money(item.total, item.currency)] : null,
      Number(item.deliveredAmount || 0) > 0 ? ["Recibe", money(item.deliveredAmount, item.deliveredCurrency)] : null,
      item.pin ? ["PIN", item.pin] : null,
      ["Estado", item.status || "COMPLETADA"],
    ].filter(Boolean) as string[][]
    const logo = `${window.location.origin}/branding/hispaniolapay-logo.png`
    doc.open()
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(item.title)}</title><style>
      @page{size:${width}mm auto;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;color:#000;font-family:Arial,sans-serif;width:${width}mm;padding:4mm;font-size:${width === 58 ? 10 : 12}px}.logo{display:block;max-width:${width === 58 ? 34 : 46}mm;max-height:18mm;margin:0 auto 3mm}.center{text-align:center}.brand{font-weight:900;font-size:1.5em}.muted{color:#333;font-size:.9em}.rule{border-top:1px dashed #000;margin:3mm 0}.row{display:flex;gap:2mm;justify-content:space-between;margin:1.5mm 0}.label{font-weight:700}.value{text-align:right;max-width:62%;overflow-wrap:anywhere}.total{font-size:1.2em;font-weight:900}.footer{margin-top:4mm;font-size:.85em;line-height:1.4}@media print{body{width:${width}mm}.no-print{display:none}}
    </style></head><body><img class="logo" src="${escapeHtml(logo)}"><div class="center brand">HISPANIOLAPAY</div><div class="center muted">Comprobante autorizado</div><div class="rule"></div>${rows.map(([label,value]) => `<div class="row${label === "Total" ? " total" : ""}"><span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span></div>`).join("")}<div class="rule"></div><div class="center muted">${escapeHtml(new Date(job.createdAt || Date.now()).toLocaleString("es-DO"))}</div><div class="center footer">www.hispaniolapay.com<br>Gracias por utilizar nuestros servicios</div></body></html>`)
    doc.close()
    const execute = () => {
      try {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
        resolve()
      } catch (error) { reject(error) }
      window.setTimeout(() => frame.remove(), 5000)
    }
    const image = doc.querySelector("img")
    if (image && !image.complete) image.addEventListener("load", () => window.setTimeout(execute, 150), { once: true })
    else window.setTimeout(execute, 250)
  })
}

export function RemotePrintStation() {
  const { user, userProfile } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(false)
  const [autoPrint, setAutoPrint] = useState(true)
  const [jobs, setJobs] = useState<PrintJob[]>([])
  const [loading, setLoading] = useState(false)
  const processing = useRef(false)
  const clientId = useRef("")
  const visible = Boolean(userProfile && (userProfile.role === "admin" || userProfile.role === "agent" || userProfile.thermalReceiptsEnabled))
  const paperWidth: 58 | 78 = userProfile?.receiptPaperWidthMm === 78 ? 78 : 58

  useEffect(() => {
    clientId.current = localStorage.getItem("hispaniolapay_print_client") || `pc_${crypto.randomUUID().replace(/-/g, "")}`
    localStorage.setItem("hispaniolapay_print_client", clientId.current)
    setActive(localStorage.getItem("hispaniolapay_remote_print_active") === "true")
    setAutoPrint(localStorage.getItem("hispaniolapay_remote_auto_print") !== "false")
  }, [])

  const headers = useCallback(async () => ({ "Content-Type": "application/json", Authorization: `Bearer ${await user?.getIdToken()}` }), [user])

  const patchJob = useCallback(async (jobId: string, action: string, extra: Record<string, unknown> = {}) => {
    const response = await fetch("/api/print-jobs", { method: "PATCH", headers: await headers(), body: JSON.stringify({ jobId, action, clientId: clientId.current, ...extra }) })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || "No se pudo actualizar la impresión")
    return data
  }, [headers])

  const signalJob = useCallback((job: PrintJob) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const context = new AudioContextClass(); const oscillator = context.createOscillator(); const gain = context.createGain()
      oscillator.frequency.value = 880; gain.gain.value = 0.08; oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.18)
    } catch (_) {}
    if ("Notification" in window && Notification.permission === "granted") new Notification("Nueva operación para imprimir", { body: `${job.payload.title} · ${job.payload.reference}`, icon: "/branding/hispaniolapay-mark.png" })
    toast({ title: "Nueva operación recibida", description: `${job.payload.title} · enviando a impresora ${paperWidth} mm.` })
  }, [paperWidth, toast])

  const processJob = useCallback(async (job: PrintJob) => {
    if (processing.current) return
    processing.current = true
    try {
      const claim = await patchJob(job.id, "claim")
      if (!claim.claimed) return
      signalJob(job)
      await printThermalReceipt(job, paperWidth)
      await patchJob(job.id, "printed")
      toast({ title: "Comprobante enviado a impresión", description: job.payload.reference })
    } catch (error) {
      await patchJob(job.id, "failed", { error: error instanceof Error ? error.message : "Error de impresión" }).catch(() => undefined)
      toast({ variant: "destructive", title: "No se pudo imprimir", description: error instanceof Error ? error.message : "Revisa la impresora" })
    } finally { processing.current = false }
  }, [paperWidth, patchJob, signalJob, toast])

  const poll = useCallback(async () => {
    if (!user || !active || !visible) return
    try {
      const response = await fetch("/api/print-jobs", { headers: await headers(), cache: "no-store" })
      if (response.status === 403) { setActive(false); localStorage.setItem("hispaniolapay_remote_print_active", "false"); return }
      const data = await response.json()
      if (!response.ok || !data.success) return
      setJobs(Array.isArray(data.jobs) ? data.jobs : [])
      const next = Array.isArray(data.pending) ? data.pending[0] as PrintJob | undefined : undefined
      if (next && autoPrint && !processing.current) await processJob(next)
    } catch (_) {}
  }, [active, autoPrint, headers, processJob, user, visible])

  useEffect(() => {
    if (!active || !visible) return
    poll(); const timer = window.setInterval(poll, 3500)
    const onVisible = () => { if (document.visibilityState === "visible") poll() }
    document.addEventListener("visibilitychange", onVisible)
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible) }
  }, [active, poll, visible])

  const toggleStation = async () => {
    const next = !active
    if (next && "Notification" in window && Notification.permission === "default") await Notification.requestPermission().catch(() => undefined)
    setActive(next); localStorage.setItem("hispaniolapay_remote_print_active", String(next))
    toast({ title: next ? "Estación de impresión activada" : "Estación pausada", description: next ? "Esta PC recibirá las operaciones en tiempo real." : "No se imprimirán operaciones automáticamente." })
  }

  const refresh = async () => { setLoading(true); await poll(); setLoading(false) }
  const reprint = async (job: PrintJob) => { await patchJob(job.id, "reprint"); toast({ title: "Reimpresión en cola", description: job.payload.reference }); await poll() }

  if (!visible) return null
  return <>
    <Button variant={active ? "outline" : "destructive"} size="sm" onClick={() => setOpen(true)} className="relative hidden gap-2 sm:inline-flex" title="Estación de impresión remota">
      <Printer className="h-4 w-4" /> {active ? "Kiosco activo" : "Activar impresora"}
      {jobs.some((job) => job.status === "pending") && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><MonitorUp className="h-5 w-5" /> Estación de impresión remota</DialogTitle><DialogDescription>Recibe operaciones realizadas desde la web o APK y genera el comprobante térmico en esta PC.</DialogDescription></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-3"><Button onClick={toggleStation} variant={active ? "outline" : "default"} className="gap-2">{active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{active ? "Pausar estación" : "Activar estación"}</Button><Button variant="outline" onClick={() => { const next = !autoPrint; setAutoPrint(next); localStorage.setItem("hispaniolapay_remote_auto_print", String(next)) }} className="gap-2"><Volume2 className="h-4 w-4" /> Autoimpresión: {autoPrint ? "Sí" : "No"}</Button><Button variant="outline" onClick={refresh} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar</Button></div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"><strong>Modo kiosco:</strong> para imprimir sin diálogo, inicia Chrome o Edge en esta PC con la opción <code>--kiosk-printing</code>. En modo normal, el navegador mostrará la ventana de impresión.</div>
      <div className="max-h-[380px] space-y-2 overflow-auto">{jobs.length === 0 ? <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Todavía no hay comprobantes en la cola.</div> : jobs.map((job) => <div key={job.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><div className="truncate text-sm font-bold">{job.payload.title}</div><div className="truncate text-xs text-muted-foreground">{job.payload.reference} · {money(job.payload.total || job.payload.amount, job.payload.currency)}</div><div className="text-[11px] text-muted-foreground">{job.createdAt ? new Date(job.createdAt).toLocaleString("es-DO") : ""}</div></div><div className="flex shrink-0 items-center gap-2"><Badge variant={job.status === "printed" ? "default" : job.status === "failed" ? "destructive" : "outline"}>{job.status === "printed" ? "Impresa" : job.status === "failed" ? "Falló" : job.status === "printing" ? "Imprimiendo" : "Pendiente"}</Badge><Button size="sm" variant="outline" onClick={() => reprint(job)}><Printer className="mr-1 h-3.5 w-3.5" /> Reimprimir</Button></div></div>)}</div>
    </DialogContent></Dialog>
  </>
}
