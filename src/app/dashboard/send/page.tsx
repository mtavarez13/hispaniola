"use client"

import { useState } from "react"
import { CalculatorCard } from "@/components/remittance/calculator-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Send, 
  User, 
  Phone, 
  ArrowLeft, 
  CheckCircle2, 
  Copy, 
  Share2, 
  CreditCard, 
  MessageCircle, 
  FileText, 
  Smartphone, 
  Building2, 
  RefreshCw,
  ArrowRight
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ReceiptView } from "@/components/remittance/receipt-view"
import { detectHaitiOperator, formatHaitiPhoneNumber } from "@/lib/bencash/utils"
import { formatNumber } from "@/lib/utils"

type Step = 'calculator' | 'delivery_method' | 'recipient' | 'bencash_confirm' | 'success'

export default function SendMoneyPage() {
  const [step, setStep] = useState<Step>('calculator')
  const [transactionData, setTransactionData] = useState<any>(null)
  
  // Delivery Method: 'cash_pickup' or 'mobile_wallet'
  const [deliveryMethod, setDeliveryMethod] = useState<'cash_pickup' | 'mobile_wallet'>('cash_pickup')
  const [haitiOperator, setHaitiOperator] = useState<'MonCash' | 'NatCash'>('MonCash')

  const [recipient, setRecipient] = useState({ name: "", phone: "", passportNumber: "" })
  const [withdrawCode, setWithdrawCode] = useState("")

  // BenCash API flow state
  const [bencashLoading, setBencashLoading] = useState(false)
  const [api1Response, setApi1Response] = useState<any>(null)
  const [verifyCode, setVerifyCode] = useState("1111")
  const [api2Response, setApi2Response] = useState<any>(null)

  const handleCalculatorConfirm = (details: any) => {
    setTransactionData(details)
    if (details.destination === 'HT') {
      setStep('delivery_method')
    } else {
      setDeliveryMethod('cash_pickup')
      setStep('recipient')
    }
  }

  // Handle Haiti Phone input change and operator detection
  const handlePhoneChange = (val: string) => {
    setRecipient(prev => ({ ...prev, phone: val }))
    if (transactionData?.destination === 'HT' || deliveryMethod === 'mobile_wallet') {
      const detected = detectHaitiOperator(val)
      if (detected.operator === 'MonCash' || detected.operator === 'NatCash') {
        setHaitiOperator(detected.operator)
      }
    }
  }

  const handleRecipientSubmit = async () => {
    if (!recipient.name || !recipient.phone) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Por favor, completa el nombre y teléfono del beneficiario.",
      })
      return
    }

    if (deliveryMethod === 'cash_pickup' && !recipient.passportNumber) {
      toast({
        variant: "destructive",
        title: "ID requerido para retiro en efectivo",
        description: "Por favor ingresa el número de documento de identidad del beneficiario.",
      })
      return
    }

    // If mobile wallet to Haiti (BenCash API 1 inquiry or MonCash cashin)
    if (deliveryMethod === 'mobile_wallet') {
      setBencashLoading(true)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("hide-sidebar-for-transaction"))
      }
      try {
        const cleanPhone = formatHaitiPhoneNumber(recipient.phone)
        const res = await fetch("/api/bencash/request-cashin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operator: haitiOperator,
            channel: haitiOperator === 'MonCash' ? 'moncash' : 'natcash',
            toAccountNumber: cleanPhone,
            amount: transactionData?.amountReceived || 100,
            content: `Remesa HispaniolaPay (${haitiOperator})`,
          }),
        })

        const data = await res.json()
        if (data.resultCode === "200" && data.result) {
          setApi1Response(data.result)

          // Si es MonCash, el flujo directo de un paso ya fue completado
          if (haitiOperator === 'MonCash' || data.isMoncash) {
            const txCode = data.result.txId || data.result.transactionId || `MC-${Date.now().toString().slice(-6)}`
            const resolvedReqId = data.requestId || data.result?.requestId || Math.floor(100000 + Math.random() * 900000)
            setWithdrawCode(txCode)
            setStep('success')

            try {
              const existingStr = localStorage.getItem("bencash_transactions")
              const existing = existingStr ? JSON.parse(existingStr) : []
              const newRecord = {
                id: `HT-TX-${Math.floor(1000 + Math.random() * 9000)}`,
                requestId: resolvedReqId,
                txId: txCode,
                transactionId: txCode,
                operator: 'MonCash',
                toAccountNumber: cleanPhone,
                recipientName: recipient.name,
                recipientAccountId: data.result?.receiver?.accountId,
                amountUSD: transactionData?.amountSent || 0,
                amountHTG: transactionData?.amountReceived || 0,
                feeHTG: 0,
                totalAmountHTG: transactionData?.amountReceived || 0,
                content: `Remesa HispaniolaPay (MonCash)`,
                verifyCode: "1111",
                status: "confirmed",
                senderName: "Remitente HispaniolaPay",
                timestamp: Date.now(),
                createdAt: new Date().toISOString(),
              }
              localStorage.setItem("bencash_transactions", JSON.stringify([newRecord, ...existing]))
            } catch (storageErr) {
              console.warn("Error guardando en bencash_transactions", storageErr)
            }

            toast({
              title: "¡Depósito Acreditado en MonCash!",
              description: `Solicitud procesada y confirmada en MonCash con txId ${txCode}. Fondos acreditados.`,
            })
            return
          }

          // Si es NatCash, pasa a confirmación de paso 2
          setStep('bencash_confirm')
          toast({
            title: "Cuenta Validada en NatCash",
            description: `Billetera ${haitiOperator} lista para recibir los fondos. Procede a confirmar.`,
          })
        } else {
          toast({
            variant: "destructive",
            title: `Error BenCash (${data.resultCode})`,
            description: data.resultMessage || "No se pudo validar la cuenta móvil.",
          })
        }
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Error de Conexión",
          description: err.message || "Fallo de comunicación con BenCash API.",
        })
      } finally {
        setBencashLoading(false)
      }
      return
    }

    // Cash Pickup flow
    const code = `HP-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
    setWithdrawCode(code)
    setStep('success')
    
    toast({
      title: "¡Envío Exitoso!",
      description: "La transacción ha sido generada correctamente.",
    })
  }

  // Handle Step 2 confirmation for BenCash direct deposit
  const handleConfirmBenCash = async () => {
    if (!api1Response?.txId) return

    setBencashLoading(true)
    try {
      const res = await fetch("/api/bencash/confirm-cashin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txId: api1Response.txId,
          verifyCode: verifyCode || "1111",
          isConfirm: "1",
        }),
      })

      const data = await res.json()
      if (data.resultCode === "200" && data.result) {
        setApi2Response(data.result)
        setWithdrawCode(data.result.transactionId || `HT-${Date.now().toString().slice(-6)}`)
        setStep('success')
        toast({
          title: "¡Depósito Completado!",
          description: `Los fondos han sido acreditados directamente en ${haitiOperator}.`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error al confirmar",
          description: data.resultMessage || "No se pudo completar el depósito.",
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: err.message,
      })
    } finally {
      setBencashLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(withdrawCode)
    toast({
      title: "Copiado",
      description: "Código o ID copiado al portapapeles.",
    })
  }

  const handleWhatsAppShare = () => {
    let message = ""
    if (deliveryMethod === 'mobile_wallet') {
      message = `¡Hola ${recipient.name}! Tu recarga de ${formatNumber(transactionData?.amountReceived)} HTG en tu cuenta ${haitiOperator} (${recipient.phone}) ha sido acreditada exitosamente con Hispaniola Pay. ID Transacción: *${withdrawCode}*.`
    } else {
      message = `¡Hola ${recipient.name}! Te acabo de enviar ${formatNumber(transactionData?.amountReceived)} ${transactionData?.payoutCurrency} a través de Hispaniola Pay. Tu código de retiro es: *${withdrawCode}*. Puedes retirarlo en cualquier agente autorizado presentando tu ID: ${recipient.passportNumber}.`
    }

    const encodedMessage = encodeURIComponent(message)
    const cleanPhone = recipient.phone.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        {step !== 'calculator' && step !== 'success' && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (step === 'bencash_confirm') setStep('recipient')
              else if (step === 'recipient' && transactionData?.destination === 'HT') setStep('delivery_method')
              else setStep('calculator')
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            {step === 'calculator' ? 'Enviar Dinero' 
              : step === 'delivery_method' ? 'Método de Entrega en Haití'
              : step === 'recipient' ? 'Datos del Beneficiario'
              : step === 'bencash_confirm' ? 'Confirmar Depósito BenCash'
              : '¡Envío Confirmado!'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {step === 'calculator' 
              ? 'Realiza envíos seguros a República Dominicana y Haití con comisiones bajas.' 
              : step === 'delivery_method'
                ? 'Elige entre retiro en agente físico o depósito directo a MonCash / NatCash.'
                : step === 'recipient' 
                  ? 'Ingresa la información de la persona que recibirá los fondos.'
                  : step === 'bencash_confirm'
                    ? 'Verifica los datos del titular de la cuenta antes de transferir.'
                    : 'Transacción completada exitosamente.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          
          {/* STEP 1: CALCULATOR */}
          {step === 'calculator' && (
            <CalculatorCard onConfirm={handleCalculatorConfirm} />
          )}

          {/* STEP 2: DELIVERY METHOD (FOR HAITI) */}
          {step === 'delivery_method' && (
            <Card className="border-none shadow-lg bg-white overflow-hidden">
              <CardHeader className="bg-primary text-white">
                <CardTitle className="text-lg font-bold">¿Cómo desea entregar los fondos en Haití?</CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  Seleccione el canal de desembolso preferido para el destinatario.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  
                  {/* Option A: Direct Mobile Wallet (BenCash) */}
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMethod('mobile_wallet')
                      setStep('recipient')
                    }}
                    className="p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all border-accent/40 hover:border-accent hover:bg-accent/5 shadow-sm group"
                  >
                    <div className="p-3 bg-red-100 text-red-600 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-colors">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-primary text-base">Billetera Móvil (MonCash / NatCash)</span>
                        <Badge className="bg-emerald-600 text-white text-[10px]">Instantáneo (API)</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Depósito directo al número celular del beneficiario mediante BenCash API. Sin necesidad de ir a sucursal.
                      </p>
                    </div>
                  </button>

                  {/* Option B: Physical Agent Cash Pickup */}
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMethod('cash_pickup')
                      setStep('recipient')
                    }}
                    className="p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all border-border hover:border-primary/40 hover:bg-secondary/40 shadow-sm group"
                  >
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-primary text-base">Efectivo en Agente Físico</span>
                        <Badge variant="outline" className="text-[10px]">Puntos Aliados</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Retiro presencial en ventanilla presentando código de retiro y documento de identidad.
                      </p>
                    </div>
                  </button>

                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: RECIPIENT DETAILS */}
          {step === 'recipient' && (
            <Card className="border-none shadow-lg bg-white overflow-hidden">
              <CardHeader className="bg-primary text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {deliveryMethod === 'mobile_wallet' ? <Smartphone className="w-5 h-5 text-accent" /> : <User className="w-5 h-5 text-accent" />}
                    {deliveryMethod === 'mobile_wallet' ? 'Datos para Billetera Móvil Haití' : 'Información del Beneficiario'}
                  </CardTitle>
                  <Badge className="bg-accent text-white text-[10px]">
                    {deliveryMethod === 'mobile_wallet' ? 'Depósito Directo' : 'Retiro en Efectivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  
                  {deliveryMethod === 'mobile_wallet' && (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-900">Operador Detectado:</span>
                        <Badge className={haitiOperator === 'MonCash' ? 'bg-[#E60000] text-white' : 'bg-[#006699] text-white'}>
                          {haitiOperator}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">Canal BenCash</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="recipientName">Nombre Completo del Beneficiario</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="recipientName"
                        placeholder="Ej: Jean Baptiste Pierre"
                        className="pl-10"
                        value={recipient.name}
                        onChange={(e) => setRecipient({...recipient, name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipientPhone">
                        {deliveryMethod === 'mobile_wallet' ? 'Número Celular (+509)' : 'Teléfono'}
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          id="recipientPhone"
                          placeholder="50940885084"
                          className="pl-10 font-bold"
                          value={recipient.phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                        />
                      </div>
                    </div>

                    {deliveryMethod === 'cash_pickup' ? (
                      <div className="space-y-2">
                        <Label htmlFor="recipientPassport">Pasaporte o NIF del Cliente</Label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input 
                            id="recipientPassport"
                            placeholder="Nro de documento oficial"
                            className="pl-10"
                            value={recipient.passportNumber}
                            onChange={(e) => setRecipient({...recipient, passportNumber: e.target.value})}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Moneda de Acreditación</Label>
                        <div className="h-10 px-3 bg-secondary/50 rounded-md border border-border flex items-center font-bold text-sm text-primary">
                          Gourdes Haitianos (HTG)
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-secondary/50 rounded-xl border border-border">
                  <h4 className="font-bold text-primary mb-2 text-xs uppercase tracking-wider">Resumen del Desembolso</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto enviado:</span>
                      <span className="font-semibold">${transactionData?.amountSent || transactionData?.amount} USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comisión del servicio (5%):</span>
                      <span className="font-semibold text-destructive">-${transactionData?.feeAmount?.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border/50">
                      <span className="font-bold text-primary">Recibe en {transactionData?.payoutCurrency || 'HTG'}:</span>
                      <span className="font-bold text-accent text-base" suppressHydrationWarning>
                        {formatNumber(transactionData?.amountReceived)} {transactionData?.payoutCurrency || 'HTG'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-4">
                <Button 
                  className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold gap-2" 
                  onClick={handleRecipientSubmit}
                  disabled={bencashLoading}
                >
                  {bencashLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Validando con BenCash API...
                    </>
                  ) : (
                    <>
                      {deliveryMethod === 'mobile_wallet' ? 'Validar Billetera y Continuar' : 'Confirmar y Enviar'} <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* STEP 4: BENCASH CONFIRMATION MODAL/STEP */}
          {step === 'bencash_confirm' && api1Response && (
            <Card className="border-none shadow-2xl bg-white overflow-hidden border-2 border-accent animate-in fade-in">
              <CardHeader className="bg-primary text-white p-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                  Confirmar Depósito Directo BenCash
                </CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  Valide la cuenta del destinatario antes del desembolso final.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                  <span className="font-bold text-emerald-900 block">Cuenta Destinataria Acreditada:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Titular Registrado:</span>
                      <span className="font-bold text-foreground text-sm">{api1Response.receiver?.accountName || recipient.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Teléfono Móvil:</span>
                      <span className="font-bold text-foreground font-mono">{api1Response.receiver?.accountNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-secondary/50 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto Total a Acreditar:</span>
                    <span className="font-bold text-primary text-base">{api1Response.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comisión Canal:</span>
                    <span className="font-bold text-emerald-700">{api1Response.fee}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="verifyCode" className="text-xs font-bold text-primary">
                    Código de Confirmación (verifyCode)
                  </Label>
                  <Input
                    id="verifyCode"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="1111"
                    className="font-mono text-base font-bold h-11"
                  />
                  <span className="text-[10px] text-muted-foreground">Código de autenticación por defecto: 1111</span>
                </div>
              </CardContent>
              <CardFooter className="bg-secondary/20 p-4 border-t border-border flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('recipient')} 
                  disabled={bencashLoading}
                  className="w-1/3"
                >
                  Atrás
                </Button>
                <Button
                  onClick={handleConfirmBenCash}
                  disabled={bencashLoading}
                  className="w-2/3 h-12 bg-green-600 hover:bg-green-700 text-white font-bold gap-2 shadow-lg shadow-green-200"
                >
                  {bencashLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Desembolsando...
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

          {/* STEP 5: SUCCESS RECEIPT */}
          {step === 'success' && (
            <Card className="border-none shadow-2xl bg-white overflow-hidden text-center">
              <div className="bg-green-500 p-8 flex justify-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
              </div>
              <CardContent className="p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-primary">
                    {deliveryMethod === 'mobile_wallet' ? '¡Depósito Móvil Exitoso!' : '¡Transacción Completada!'}
                  </h2>
                  <p className="text-muted-foreground text-xs mt-1">
                    {deliveryMethod === 'mobile_wallet' 
                      ? `Los fondos ya han sido acreditados directamente en la cuenta ${haitiOperator}.`
                      : 'El dinero ya está disponible para retiro en cualquier agente aliado.'}
                  </p>
                </div>

                <div className="bg-secondary p-6 rounded-3xl border-2 border-dashed border-primary/20 space-y-3">
                  <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">
                    {deliveryMethod === 'mobile_wallet' ? 'ID Transacción BenCash' : 'Código de Retiro'}
                  </span>
                  <div className="text-3xl font-black text-primary tracking-widest">{withdrawCode}</div>
                  <div className="flex flex-col sm:flex-row justify-center gap-2 pt-2">
                    <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={copyToClipboard}>
                      <Copy className="w-4 h-4" /> Copiar Código
                    </Button>
                    <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 font-bold text-xs" onClick={handleWhatsAppShare}>
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="secondary" size="sm" className="gap-2 font-bold text-xs">
                          <FileText className="w-4 h-4" /> Ver Recibo
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Recibo de Transacción</DialogTitle>
                        </DialogHeader>
                        <ReceiptView 
                          type="send"
                          transaction={{
                            ...transactionData,
                            receiverName: recipient.name,
                            receiverPhone: recipient.phone,
                            receiverPassport: recipient.passportNumber || "Direct-Wallet",
                            withdrawCode
                          }} 
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <Button className="w-full h-12 rounded-xl bg-primary text-white font-bold" onClick={() => {
                  setStep('calculator')
                  setRecipient({ name: "", phone: "", passportNumber: "" })
                  setApi1Response(null)
                  setApi2Response(null)
                }}>
                  Realizar otro envío
                </Button>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold text-primary">Canales Disponibles</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="p-3 bg-red-50 rounded-xl border border-red-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-950">🇭🇹 Haití (BenCash API)</span>
                  <Badge className="bg-red-600 text-white text-[9px]">MonCash / NatCash</Badge>
                </div>
                <p className="text-[11px] text-red-800">
                  Depósitos inmediatos directo a números de teléfono haitianos en Gourdes (HTG).
                </p>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950">🇩🇴 Rep. Dominicana</span>
                  <Badge className="bg-blue-600 text-white text-[9px]">Red de Agentes</Badge>
                </div>
                <p className="text-[11px] text-blue-800">
                  Retiro presencial en Pesos Dominicanos (DOP) o USD en Santo Domingo, Santiago y todas las provincias.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
