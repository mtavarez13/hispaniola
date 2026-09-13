"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Info, Calculator, Sparkles, Coins, RefreshCw, Lock, ShieldCheck, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/context"
import { useSystemSettings } from "@/lib/settings-context"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { formatNumber } from "@/lib/utils"

interface CalculatorCardProps {
  onConfirm?: (details: any) => void
  showBankLink?: boolean
}

export function CalculatorCard({ onConfirm, showBankLink = true }: CalculatorCardProps) {
  const { t } = useI18n();
  const { settings } = useSystemSettings();
  const { user } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false)
  const [amount, setAmount] = useState<number>(100)
  const [destination, setDestination] = useState<string>("HT") // Default to Haiti Corridor
  const [payoutCurrency, setPayoutCurrency] = useState<string>("HTG")
  const [explanation, setExplanation] = useState<string>("")
  const [loadingAi, setLoadingAi] = useState(false)

  // Norma general de tasa: Para Haití usa haitiPublicFeePercent (8% por defecto)
  const feePercentage = destination === "HT"
    ? (settings?.haitiPublicFeePercent ?? 8.0)
    : (settings?.platformFeePercentage ?? 5.0)

  const feeAmount = amount * (feePercentage / 100)
  const amountAfterFee = Math.max(0, amount - feeAmount)
  
  // Calculate public exchange rate from system settings
  const exchangeRate = payoutCurrency === "DOP" 
    ? (settings?.publicRateDOP ?? 58.5) 
    : (payoutCurrency === "HTG" ? (settings?.publicRateHTG ?? 132.2) : 1.0)
  
  const amountReceived = amountAfterFee * exchangeRate
  const isAgentOrAdmin = user && (user.role === "admin" || user.role === "sub_agent" || user.role === "agent")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (destination === "DO" && payoutCurrency === "HTG") {
      setPayoutCurrency("DOP")
    } else if (destination === "HT" && payoutCurrency === "DOP") {
      setPayoutCurrency("HTG")
    }
  }, [destination, payoutCurrency])

  const handleExplain = async () => {
    setLoadingAi(true)
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountSent: amount,
          feePercentage,
          exchangeRate,
          destinationCurrency: payoutCurrency,
        }),
      })
      const data = await res.json()
      if (data?.explanation) {
        setExplanation(data.explanation)
      }
    } catch (error) {
      console.error(error)
      // Fallback
      setExplanation(`Desglose: $${amount} USD menos comisión del ${feePercentage}% (-$${feeAmount.toFixed(2)} USD). El destinatario recibe ${formatNumber(amountReceived, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${payoutCurrency} con tasa oficial ${exchangeRate}.`)
    } finally {
      setLoadingAi(false)
    }
  }

  if (!mounted) {
    return (
      <Card className="w-full shadow-lg border-primary/10 overflow-hidden h-[500px] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </Card>
    )
  }

  return (
    <Card className="w-full shadow-lg border-primary/10 overflow-hidden">
      <CardHeader className="bg-primary text-primary-foreground space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-accent" />
            {t('calc_title')}
          </CardTitle>
          <Badge variant="secondary" className="bg-accent text-white border-none">
            {t('calc_fee_badge')}
          </Badge>
        </div>
        <CardDescription className="text-primary-foreground/70">
          {t('calc_desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-muted-foreground">{t('calc_label_amount')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="pl-7 focus-visible:ring-accent"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">{t('calc_label_dest')}</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="focus-visible:ring-accent">
                <SelectValue placeholder="Seleccionar país" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DO">República Dominicana</SelectItem>
                <SelectItem value="HT">Haití</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground flex items-center gap-2">
            <Coins className="w-4 h-4 text-accent" />
            {t('calc_label_how')}
          </Label>
          <Select value={payoutCurrency} onValueChange={setPayoutCurrency}>
            <SelectTrigger className="focus-visible:ring-accent bg-secondary/30">
              <SelectValue placeholder="Seleccionar moneda de recepción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              {destination === "DO" && <SelectItem value="DOP">DOP</SelectItem>}
              {destination === "HT" && <SelectItem value="HTG">HTG</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-center justify-center py-4 px-6 bg-secondary rounded-2xl border border-accent/20">
          <span className="text-xs font-bold text-primary/70 uppercase tracking-wider mb-1">
            Destinatario Recibe en {destination === "HT" ? "Haití (MonCash/Natcash)" : "Rep. Dominicana"}
          </span>
          <div className="text-4xl font-black text-primary flex items-baseline gap-2 text-center break-all" suppressHydrationWarning>
            {formatNumber(amountReceived, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xl font-bold text-accent">{payoutCurrency}</span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/80 w-full flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
            <span>
              Tasa fijada: <strong>{feePercentage}%</strong> (-${feeAmount.toFixed(2)} USD)
            </span>
            <span>
              Tasa cambio: <strong>1 USD = {exchangeRate} {payoutCurrency}</strong>
            </span>
          </div>
        </div>

        {/* Dominican Banks Direct Action Banner */}
        {showBankLink && (
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-blue-900">
              <Landmark className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-semibold text-[11px]">
                Deposita desde Banreservas, BHD o Popular
              </span>
            </div>
            <a
              href="#bancos-oficiales"
              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline shrink-0"
            >
              Ver Cuentas Copiables →
            </a>
          </div>
        )}

        {/* Notice: Sending requires Sub-Agent / Admin Login */}
        <div className="p-3.5 rounded-xl border text-xs flex items-start gap-2.5 bg-amber-50/80 border-amber-200 text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-[11px]">Control Operativo de Envío</p>
            <p className="text-[11px] text-amber-800 leading-snug">
              {isAgentOrAdmin ? (
                <>Sesión activa como <strong>{user?.role === "admin" ? "Administrador" : "Sub-Agente"}</strong>. Puedes ingresar a la terminal para despachar este envío.</>
              ) : (
                <>Desde el portal público solo se calcula la tasa. Para realizar el envío debes <strong>iniciar sesión como Sub-Agente afiliado o Administrador</strong>.</>
              )}
            </p>
          </div>
        </div>

        {explanation && (
          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 text-sm">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <div className="text-primary/80 whitespace-pre-wrap leading-relaxed italic">
                {explanation}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/30 p-4 flex flex-col sm:flex-row gap-2">
        <Button
          variant="ghost"
          className="flex-1 text-primary hover:text-accent font-medium gap-2 text-xs"
          onClick={handleExplain}
          disabled={loadingAi}
        >
          {loadingAi ? "..." : t('calc_btn_explain')}
          <Sparkles className="w-4 h-4" />
        </Button>

        {isAgentOrAdmin ? (
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs shadow-sm"
            onClick={() => {
              if (onConfirm) {
                onConfirm({ amount, destination, payoutCurrency, feeAmount, amountReceived, exchangeRate })
              } else {
                router.push(`/dashboard/haiti-remittances?amount=${amount}&currency=${payoutCurrency}`)
              }
            }}
          >
            Terminal de Envío
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold gap-2 text-xs shadow-sm"
            onClick={() => {
              router.push(`/login?redirect=/dashboard/haiti-remittances&amount=${amount}`)
            }}
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            Acceso Sub-Agente / Admin
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
