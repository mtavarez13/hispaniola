"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Search, ShieldCheck, Wallet, ArrowRight, CheckCircle2, FileText, XCircle, CreditCard } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ReceiptView } from "@/components/remittance/receipt-view"
import { toast } from "@/hooks/use-toast"
import { formatNumber } from "@/lib/utils"

type PayoutState = 'idle' | 'searching' | 'found' | 'success' | 'error'

export default function PayoutsPage() {
  const [code, setCode] = useState("")
  const [enteredId, setEnteredId] = useState("")
  const [state, setState] = useState<PayoutState>('idle')
  const [payoutData, setPayoutData] = useState<any>(null)

  const handleVerify = () => {
    setState('searching')
    // Simulación de búsqueda de transacción
    setTimeout(() => {
      // Simulamos que el registro oficial tiene un ID específico (ej: ID-992283)
      if (code.length > 5) {
        setPayoutData({
          id: code,
          senderName: "Carlos Rodríguez",
          receiverName: "Jean Baptiste",
          receiverPassport: "ID-992283", // Este es el dato que debe coincidir
          receiverPhone: "+509 3344-5566",
          amountSent: 500,
          feeAmount: 25,
          amountReceived: 62785.50,
          payoutCurrency: "HTG",
          exchangeRate: 132.2,
          withdrawCode: code
        })
        setState('found')
        setEnteredId("") // Reset verification field
      } else {
        setState('error')
      }
    }, 1500)
  }

  const handleConfirmPayout = () => {
    // Validación estricta de seguridad
    if (enteredId.trim() !== payoutData.receiverPassport) {
      toast({
        variant: "destructive",
        title: "Error de Seguridad",
        description: "El número de identificación no coincide con el registro oficial. Verifique el documento físico del cliente.",
      })
      return
    }
    
    setState('success')
    toast({
      title: "Pago Confirmado",
      description: "Los fondos han sido marcados como entregados correctamente.",
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Pagos de Remesas</h1>
        <p className="text-muted-foreground mt-1">Valide rigurosamente la identidad del beneficiario antes de entregar fondos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-white overflow-hidden">
            <CardHeader className="bg-primary text-white">
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-accent" />
                Verificar Código
              </CardTitle>
              <CardDescription className="text-primary-foreground/70">
                Ingrese el código de retiro para localizar la remesa.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Código de Retiro</Label>
                <Input 
                  id="code"
                  placeholder="Ej: HP-XXXX-XXXX" 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-center text-2xl font-black tracking-widest h-16 border-2 focus-visible:ring-accent"
                  disabled={state === 'searching' || state === 'success'}
                />
              </div>
              {state === 'error' && (
                <div className="flex items-center gap-2 text-destructive text-sm font-bold animate-in fade-in">
                  <XCircle className="w-4 h-4" /> Código no encontrado o inválido.
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-secondary/30 p-4">
              <Button 
                onClick={handleVerify} 
                disabled={!code || state === 'searching' || state === 'success'}
                className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold gap-2"
              >
                {state === 'searching' ? 'Verificando...' : 'Verificar Transacción'} <ArrowRight className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>

          {state === 'found' && (
            <Card className="border-none shadow-xl bg-white border-2 border-accent animate-in slide-in-from-top-4">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Validación Obligatoria</CardTitle>
                <CardDescription>Confirme la identidad del beneficiario.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-secondary/30 rounded-xl space-y-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Beneficiario Registrado</p>
                  <p className="text-xl font-black text-primary">{payoutData.receiverName}</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="verifyId" className="text-accent font-bold flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Ingrese Pasaporte o NIF del Cliente
                  </Label>
                  <Input 
                    id="verifyId"
                    placeholder="Número de documento físico presentado" 
                    value={enteredId}
                    onChange={(e) => setEnteredId(e.target.value)}
                    className="h-12 border-2 focus-visible:ring-accent text-lg font-bold"
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    El sistema validará este número contra el registro cifrado original.
                  </p>
                </div>

                <div className="p-4 bg-accent/10 rounded-xl text-center">
                  <p className="text-xs uppercase font-bold text-accent mb-1">Monto a Entregar</p>
                  <p className="text-3xl font-black text-primary" suppressHydrationWarning>
                    {formatNumber(payoutData.amountReceived)} {payoutData.payoutCurrency}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-4">
                <Button 
                  onClick={handleConfirmPayout} 
                  disabled={!enteredId}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-black shadow-lg shadow-green-200"
                >
                  Confirmar y Marcar como Pagado
                </Button>
              </CardFooter>
            </Card>
          )}

          {state === 'success' && (
            <Card className="border-none shadow-2xl bg-white overflow-hidden text-center animate-in zoom-in-95">
              <div className="bg-green-500 p-6 flex justify-center">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <CardContent className="p-8 space-y-6">
                <h2 className="text-2xl font-black text-primary">¡Pago Exitoso!</h2>
                <p className="text-muted-foreground text-sm">La transacción se ha completado. Por favor, entregue el efectivo al cliente.</p>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-12 gap-2 border-primary text-primary font-bold">
                      <FileText className="w-4 h-4" /> Generar Recibo de Pago (80mm)
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Comprobante de Pago</DialogTitle>
                    </DialogHeader>
                    <ReceiptView type="payout" transaction={payoutData} />
                  </DialogContent>
                </Dialog>

                <Button variant="ghost" className="w-full" onClick={() => { setState('idle'); setCode(""); setEnteredId(""); }}>
                  Procesar otro pago
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary">Protocolo de Seguridad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-green-50 rounded-lg shrink-0">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Validación KYC Estricta</h4>
                  <p className="text-xs text-muted-foreground">Nunca entregue dinero si el documento físico no coincide con el sistema.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Saldo del Agente</h4>
                  <p className="text-xs text-muted-foreground">Asegúrese de tener fondos suficientes antes de iniciar el proceso.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="p-6 rounded-2xl bg-primary text-white border border-border shadow-xl">
             <h3 className="font-bold mb-2 uppercase text-[10px] tracking-widest opacity-80">Saldo Operativo Disponible</h3>
             <div className="text-3xl font-black">$12,450.00 <span className="text-sm font-normal opacity-60">USD</span></div>
             <p className="text-[10px] opacity-60 mt-1">Fondo para desembolsos inmediatos.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
