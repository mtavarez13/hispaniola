"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Send, 
  Smartphone, 
  CheckCircle2, 
  MessageCircle, 
  Sparkles, 
  RefreshCw, 
  ArrowRight, 
  ShieldCheck, 
  DollarSign, 
  Phone, 
  User, 
  Zap,
  Check,
  ExternalLink,
  Receipt
} from "lucide-react"
import { useSystemSettings } from "@/lib/settings-context"
import { useI18n } from "@/lib/i18n/context"
import { formatNumber } from "@/lib/utils"
import Link from "next/link"

export function ExpressRemittanceCard() {
  const { t } = useI18n()
  const { settings } = useSystemSettings()
  
  // Step in widget: 1 = Form, 2 = Confirmation / Success
  const [step, setStep] = useState<1 | 2>(1)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Currencies & Amounts
  const [currency, setCurrency] = useState<"USD" | "DOP">("USD")
  const [amountUSD, setAmountUSD] = useState<number>(100)
  const [operator, setOperator] = useState<"MonCash" | "Natcash">("MonCash")

  // Sender info
  const [senderName, setSenderName] = useState("")
  const [senderPhone, setSenderPhone] = useState("")

  // Recipient info
  const [recipientName, setRecipientName] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")

  // Options
  const [autoNotifyWhatsApp, setAutoNotifyWhatsApp] = useState(true)

  // Success result
  const [txResult, setTxResult] = useState<{
    txId: string;
    requestId?: number;
    amountHTG: number;
    amountUSD: number;
    amountDOP: number;
    operator: string;
    senderWhatsAppUrl?: string;
    recipientWhatsAppUrl?: string;
    senderPhone: string;
    recipientPhone: string;
    senderMessage?: string;
    recipientMessage?: string;
    autoDispatched?: boolean;
  } | null>(null)

  const rateHTG = settings?.publicRateHTG ?? 132.20
  const rateDOP = settings?.publicRateDOP ?? 58.50
  const platformFeePct = settings?.haitiPublicFeePercent ?? settings?.platformFeePercentage ?? 8.0

  // Calculate fees and receiving amount
  const feeAmountUSD = amountUSD * (platformFeePct / 100)
  const amountAfterFeeUSD = Math.max(0, amountUSD - feeAmountUSD)
  const calculatedHTG = Number((amountAfterFeeUSD * rateHTG).toFixed(2))
  const calculatedDOP = Number((amountUSD * rateDOP).toFixed(2))

  // Handle currency toggle
  const handleAmountDopChange = (dopVal: number) => {
    const equivalentUSD = dopVal / rateDOP
    setAmountUSD(Number(equivalentUSD.toFixed(2)))
  }

  const handleSendRemittance = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Validations
    if (!recipientName || !recipientName.trim()) {
      setErrorMessage("Por favor, escribe el nombre completo del destinatario (obligatorio).")
      return
    }

    if (!senderPhone || senderPhone.replace(/\D/g, "").length < 8) {
      setErrorMessage("Por favor, ingresa el número de WhatsApp del remitente.")
      return
    }

    const cleanRecipient = recipientPhone.replace(/\D/g, "")
    if (!cleanRecipient || cleanRecipient.length < 8) {
      setErrorMessage("Por favor, ingresa un número válido de Haití (+509...) para el destinatario.")
      return
    }

    if (calculatedHTG <= 0) {
      setErrorMessage("El monto a enviar debe ser mayor a $0.")
      return
    }

    setSending(true)

    try {
      // 1. Enviar a BenCash API (con enrutamiento inteligente según MonCash o NatCash)
      const res = await fetch("/api/bencash/request-cashin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator: operator === "Natcash" ? "NatCash" : "MonCash",
          channel: operator === "Natcash" ? "natcash" : "moncash",
          toAccountNumber: cleanRecipient.startsWith("509") ? cleanRecipient : `509${cleanRecipient}`,
          amount: calculatedHTG,
          content: `Remesa ${senderName || "Cliente"} a ${recipientName || "Familiar"} (${operator})`,
          autoConfirm: true,
        }),
      })

      const data = await res.json()
      const txId = data.result?.txId || data.result?.transactionId || `HP-${Date.now().toString().slice(-6)}`
      const resolvedReqId = data.requestId || data.result?.requestId

      // 2. Enviar Notificación Automática por WhatsApp a Remitente y Receptor
      let waSenderUrl = ""
      let waRecipientUrl = ""
      let waAutoDispatched = false

      if (autoNotifyWhatsApp) {
        try {
          const waRes = await fetch("/api/notifications/whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              senderPhone,
              senderName: senderName || "Remitente",
              recipientPhone: cleanRecipient,
              recipientName: recipientName || "Beneficiario",
              amountUSD,
              amountDOP: calculatedDOP,
              amountHTG: calculatedHTG,
              operator,
              txId,
              requestId: resolvedReqId,
            }),
          })
          const waData = await waRes.json()
          if (waData.success) {
            waSenderUrl = waData.sender?.whatsappUrl || ""
            waRecipientUrl = waData.recipient?.whatsappUrl || ""
            waAutoDispatched = Boolean(waData.sender?.apiDispatched || waData.recipient?.apiDispatched)
          }
        } catch (waErr) {
          console.warn("WhatsApp dispatch warning:", waErr)
        }
      }

      setTxResult({
        txId,
        requestId: resolvedReqId,
        amountHTG: calculatedHTG,
        amountUSD,
        amountDOP: calculatedDOP,
        operator,
        senderPhone,
        recipientPhone: cleanRecipient,
        senderWhatsAppUrl: waSenderUrl,
        recipientWhatsAppUrl: waRecipientUrl,
        autoDispatched: waAutoDispatched,
      })

      setStep(2)
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message || "No se pudo procesar la remesa. Reintente en un momento.")
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setTxResult(null)
    setErrorMessage(null)
  }

  return (
    <Card className="w-full shadow-2xl border-2 border-slate-200/80 rounded-[2rem] overflow-hidden bg-white">
      {/* Header Banner */}
      <CardHeader className="bg-gradient-to-r from-blue-900 via-slate-900 to-red-900 text-white p-5 sm:p-6 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white font-black text-[10px] tracking-wider uppercase border-none px-2.5 py-0.5">
              Corredor Activo 24/7
            </Badge>
          </div>
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> BenCash Certificado
          </span>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
          Envío Directo a Haití
        </CardTitle>
        <CardDescription className="text-slate-300 text-xs sm:text-sm">
          Acreditación instantánea a MonCash o Natcash con notificación automática por WhatsApp.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-5">
        {step === 1 ? (
          <form onSubmit={handleSendRemittance} className="space-y-5">
            {/* Quick Amount Selector & Currency Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                  Monto a Transferir
                </Label>
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setCurrency("USD")}
                    className={`px-2.5 py-1 rounded-md font-extrabold transition-all ${
                      currency === "USD" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency("DOP")}
                    className={`px-2.5 py-1 rounded-md font-extrabold transition-all ${
                      currency === "DOP" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    DOP (RD$)
                  </button>
                </div>
              </div>

              {/* Amount input & Quick Chips */}
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 font-black text-lg">
                  {currency === "USD" ? "$" : "RD$"}
                </span>
                <Input
                  type="number"
                  min="5"
                  step="5"
                  value={currency === "USD" ? amountUSD : calculatedDOP}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    if (currency === "USD") {
                      setAmountUSD(val)
                    } else {
                      handleAmountDopChange(val)
                    }
                  }}
                  className="pl-12 h-13 text-xl sm:text-2xl font-black text-slate-900 rounded-xl border-2 border-slate-200 focus-visible:border-blue-600"
                />
              </div>

              {/* Preset Chips */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                {[50, 100, 150, 200, 300].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmountUSD(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      amountUSD === preset
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Operator Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-red-600" />
                Billetera Móvil en Haití
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOperator("MonCash")}
                  className={`p-3 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                    operator === "MonCash"
                      ? "border-[#E60000] bg-red-50/70 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E60000] text-white flex items-center justify-center font-black text-xs">
                      MC
                    </div>
                    <div>
                      <div className="font-black text-xs text-slate-900">MonCash</div>
                      <div className="text-[10px] text-slate-500">Digicel Haití</div>
                    </div>
                  </div>
                  {operator === "MonCash" && <Check className="w-4 h-4 text-[#E60000] stroke-[3]" />}
                </button>

                <button
                  type="button"
                  onClick={() => setOperator("Natcash")}
                  className={`p-3 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                    operator === "Natcash"
                      ? "border-[#006699] bg-blue-50/70 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#006699] text-white flex items-center justify-center font-black text-xs">
                      NC
                    </div>
                    <div>
                      <div className="font-black text-xs text-slate-900">Natcash</div>
                      <div className="text-[10px] text-slate-500">Natcom Haití</div>
                    </div>
                  </div>
                  {operator === "Natcash" && <Check className="w-4 h-4 text-[#006699] stroke-[3]" />}
                </button>
              </div>
            </div>

            {/* Recipient Receives Preview Highlight */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                  El Beneficiario Recibe en Haití:
                </span>
                <span className="text-[10px] text-emerald-700">
                  Tasa garantizada: 1 USD = {rateHTG} HTG
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-800 leading-none block" suppressHydrationWarning>
                  {formatNumber(calculatedHTG)} <span className="text-xs font-bold">HTG</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium" suppressHydrationWarning>
                  Comisión: ${feeAmountUSD.toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* SENDER & RECIPIENT PHONE NUMBERS (As explicitly requested by user) */}
            <div className="space-y-3.5 pt-2 border-t border-slate-100">
              <div className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Datos de Envío y Notificación
              </div>

              {/* Sender Phone (Quien envía) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label htmlFor="senderName" className="text-[11px] font-bold text-slate-600">
                    Tu Nombre (Remitente)
                  </Label>
                  <Input
                    id="senderName"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="senderPhone" className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                    <span>WhatsApp Remitente</span>
                    <span className="text-[10px] font-semibold text-emerald-600">Recibe Comprobante</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-3.5 h-3.5 text-emerald-600" />
                    <Input
                      id="senderPhone"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="+1 809 555 1234"
                      required
                      className="pl-8 h-10 text-xs font-bold rounded-xl border-emerald-200 focus-visible:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Recipient Phone (Quien recibe en Haití) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label htmlFor="recipientName" className="text-[11px] font-bold text-slate-600">
                    Nombre del Destinatario
                  </Label>
                  <Input
                    id="recipientName"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Ej. Pierre Jean"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="recipientPhone" className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                    <span>Teléfono en Haití (+509)</span>
                    <span className="text-[10px] font-semibold text-red-600">{operator}</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-3.5 h-3.5 text-red-600" />
                    <Input
                      id="recipientPhone"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="50940885084"
                      required
                      className="pl-8 h-10 text-xs font-bold rounded-xl border-red-200 focus-visible:border-red-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp Automatic Messaging Toggle */}
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="autoNotify"
                checked={autoNotifyWhatsApp}
                onChange={(e) => setAutoNotifyWhatsApp(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-emerald-600 cursor-pointer"
              />
              <label htmlFor="autoNotify" className="text-[11px] text-emerald-950 font-medium cursor-pointer leading-tight">
                <strong>Notificación Automática por WhatsApp API:</strong> Se enviará un comprobante digital al Remitente y una alerta en Kreyòl/Español al Receptor en Haití de forma inmediata.
              </label>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            {/* Action Submit Button */}
            <Button
              type="submit"
              disabled={sending}
              className="w-full h-13 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-700/25 gap-2 transition-all"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  Procesando Remesa y Despachando WhatsApp...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-amber-300" />
                  <span suppressHydrationWarning>Enviar Remesa Ahora ({formatNumber(calculatedHTG)} HTG)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </form>
        ) : (
          /* STEP 2: SUCCESS VIEW WITH DIRECT WHATSAPP ACTION BUTTONS */
          <div className="space-y-5 py-2">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                ¡Transferencia Acreditada con Éxito!
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Los fondos de <strong suppressHydrationWarning>{formatNumber(txResult?.amountHTG)} HTG</strong> han sido acreditados a través de BenCash Group.
              </p>
            </div>

            {/* Transaction Receipt Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 font-mono">
                <span className="text-slate-500 font-sans">ID de Transacción:</span>
                <span className="font-bold text-slate-900">{txResult?.txId}</span>
              </div>
              {txResult?.requestId && (
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-slate-500 font-sans">No. Petición (ReqID):</span>
                  <span className="text-blue-700 font-semibold">{txResult.requestId}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Monto Acreditado:</span>
                <span className="font-black text-emerald-700 text-sm" suppressHydrationWarning>{formatNumber(txResult?.amountHTG)} HTG</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Billetera Móvil:</span>
                <span className="font-bold text-slate-800">{txResult?.operator} (Haití)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Beneficiario:</span>
                <span className="font-semibold text-slate-900">{txResult?.recipientPhone}</span>
              </div>
            </div>

            {/* DUAL WHATSAPP ACTIONS (Sender and Receiver) */}
            <div className="space-y-2.5">
              <div className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                Comprobantes de WhatsApp Listos:
              </div>

              {/* Button 1: WhatsApp Remitente */}
              {txResult?.senderWhatsAppUrl && (
                <a
                  href={txResult.senderWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    type="button"
                    className="w-full h-11 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-xs gap-2 rounded-xl shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Abrir WhatsApp Remitente ({txResult.senderPhone})
                    <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
                  </Button>
                </a>
              )}

              {/* Button 2: WhatsApp Receptor en Haití */}
              {txResult?.recipientWhatsAppUrl && (
                <a
                  href={txResult.recipientWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-xs gap-2 rounded-xl"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    Abrir WhatsApp Receptor (+{txResult.recipientPhone})
                    <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
                  </Button>
                </a>
              )}
            </div>

            {/* Navigation options */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="flex-1 text-xs font-bold rounded-xl"
              >
                Realizar Otro Envío
              </Button>
              <Link href="/dashboard/haiti-remittances" className="flex-1">
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl">
                  Ir al Panel BenCash →
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
