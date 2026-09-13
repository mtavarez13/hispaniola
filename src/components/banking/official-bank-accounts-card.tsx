"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSystemSettings } from "@/lib/settings-context"
import { OfficialBankAccount } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { 
  Building2, 
  Copy, 
  Check, 
  Landmark, 
  ShieldCheck, 
  Info, 
  FileText, 
  CreditCard,
  ExternalLink,
  DollarSign
} from "lucide-react"

interface OfficialBankAccountsCardProps {
  compact?: boolean
  title?: string
  description?: string
  className?: string
}

export function OfficialBankAccountsCard({
  compact = false,
  title = "Cuentas Oficiales para Recibir Remesas",
  description = "Cuentas y métodos autorizados para recibir fondos desde República Dominicana (Bancos Locales) y Estados Unidos (Cash App, Zelle, PayPal).",
  className = "",
}: OfficialBankAccountsCardProps) {
  const { settings } = useSystemSettings()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"DO" | "US">("DO")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedFullId, setCopiedFullId] = useState<string | null>(null)

  const accounts: OfficialBankAccount[] = (settings?.officialBankAccounts && settings.officialBankAccounts.length > 0)
    ? settings.officialBankAccounts.filter((acc) => acc.active !== false)
    : []

  const usAccounts = settings?.usRemittanceAccounts || {
    zelleEmail: "pagos@hispaniolapay.com",
    zellePhone: "+1 (305) 579-8822",
    zelleHolder: "Hispaniola Pay LLC",
    cashAppTag: "$HispaniolaPay",
    cashAppHolder: "Hispaniola Pay Remittance",
    payPalEmail: "pagos@hispaniolapay.com",
    payPalLink: "https://paypal.me/hispaniolapay",
    instructions: "Envía en USD desde tu app favorita (Zelle, Cash App o PayPal). Incluye en la nota tu nombre y número de destino (MonCash / Natcash / Cuenta RD).",
    active: true,
  }

  const handleCopyAccount = (account: OfficialBankAccount) => {
    navigator.clipboard.writeText(account.accountNumber)
    setCopiedId(account.id)
    toast({
      title: "¡Número de Cuenta Copiado!",
      description: `${account.bankName}: ${account.accountNumber} copiado al portapapeles.`,
    })
    setTimeout(() => {
      setCopiedId(null)
    }, 2500)
  }

  const handleCopyText = (text: string, label: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast({
      title: `¡${label} Copiado!`,
      description: `${text} copiado al portapapeles.`,
    })
    setTimeout(() => {
      setCopiedId(null)
    }, 2500)
  }

  const handleCopyFullDetails = (account: OfficialBankAccount) => {
    const fullText = `*DATOS PARA TRANSFERENCIA / DEPÓSITO - HISPANIOLA PAY*
🏦 *Banco:* ${account.bankName}
🔢 *No. de Cuenta:* ${account.accountNumber}
📑 *Tipo:* ${account.accountType === 'corriente' ? 'Cuenta Corriente' : 'Cuenta de Ahorros'}
💵 *Moneda:* ${account.currency}
👤 *Titular:* ${account.holderName}
🆔 *Documento / RNC:* ${account.documentId}
${account.instructions ? `📌 *Nota / Concepto:* ${account.instructions}` : ''}
_Envía el comprobante para procesar la acreditación a MonCash / NatCash._`

    navigator.clipboard.writeText(fullText)
    setCopiedFullId(account.id)
    toast({
      title: "¡Ficha Bancaria Copiada!",
      description: `Los datos completos de ${account.bankName} han sido copiados para compartir por WhatsApp o notas.`,
    })
    setTimeout(() => {
      setCopiedFullId(null)
    }, 2500)
  }

  return (
    <Card className={`border shadow-lg bg-white overflow-hidden rounded-3xl ${className}`}>
      <CardHeader className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-400 text-slate-950 font-black text-[11px] px-2.5 py-0.5">
                🇩🇴 RD & 🇺🇸 USA
              </Badge>
              <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/40 text-[11px] px-2 py-0.5">
                Cuentas Oficiales Verificadas
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-2 text-white">
              <Landmark className="w-6 h-6 text-amber-400 shrink-0" />
              {title}
            </CardTitle>
            <CardDescription className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {description}
            </CardDescription>
          </div>

          {/* Selector de Región (RD vs USA) */}
          <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/20 shrink-0 self-start sm:self-center">
            <Button
              size="sm"
              variant={activeTab === "DO" ? "default" : "ghost"}
              onClick={() => setActiveTab("DO")}
              className={`rounded-xl text-xs font-black h-9 gap-1.5 ${
                activeTab === "DO" 
                  ? "bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-sm" 
                  : "text-white hover:text-amber-300 hover:bg-white/10"
              }`}
            >
              <span>🇩🇴</span>
              <span>Bancos RD</span>
            </Button>
            <Button
              size="sm"
              variant={activeTab === "US" ? "default" : "ghost"}
              onClick={() => setActiveTab("US")}
              className={`rounded-xl text-xs font-black h-9 gap-1.5 ${
                activeTab === "US" 
                  ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300 shadow-sm" 
                  : "text-white hover:text-emerald-300 hover:bg-white/10"
              }`}
            >
              <span>🇺🇸</span>
              <span>USA (CashApp / Zelle / PayPal)</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-7 space-y-5">
        {/* PESTAÑA: ESTADOS UNIDOS (CASH APP, ZELLE, PAYPAL) */}
        {activeTab === "US" && (
          <div className="space-y-6">
            {/* Banner explicativo USA */}
            <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 text-sm shadow-xs">
                  🇺🇸
                </div>
                <div>
                  <div className="font-extrabold text-emerald-900 text-sm sm:text-base flex items-center gap-1.5">
                    Recibimos remesas desde Estados Unidos
                    <Badge className="bg-emerald-600 text-white text-[10px] font-black">100% Garantizado</Badge>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">
                    Envía en dólares (USD) a través de tu aplicación preferida en USA. Al enviar tu comprobante, entregamos de inmediato en <strong>MonCash</strong> y <strong>Natcash</strong> en Haití o a cuentas bancarias en RD.
                  </p>
                </div>
              </div>
            </div>

            {/* Grid con las 3 plataformas principales USA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* 1. CASH APP */}
              <div className="group rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-b from-emerald-50/40 via-white to-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl bg-[#00D632] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#00D632]/25">
                        $
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-base">Cash App</h4>
                        <p className="text-[11px] font-bold text-emerald-700">Depósito Inmediato USD</p>
                      </div>
                    </div>
                    <Badge className="bg-[#00D632]/20 text-[#008f22] border-[#00D632]/40 font-black text-[10px]">
                      USA
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600">
                    Abre tu aplicación de Cash App y envía el monto en USD a nuestro Cashtag oficial verificado.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Cashtag Oficial</span>
                      <span className="font-mono text-base font-black text-slate-900 block truncate">
                        {usAccounts.cashAppTag || "$HispaniolaPay"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCopyText(usAccounts.cashAppTag || "$HispaniolaPay", "Cashtag", "cashapp")}
                      className="h-8 px-3 bg-[#00D632] hover:bg-[#00b029] text-white font-bold text-xs rounded-lg"
                    >
                      {copiedId === "cashapp" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>

                  <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
                    <span>Titular: <strong>{usAccounts.cashAppHolder || "Hispaniola Pay Remittance"}</strong></span>
                  </div>
                </div>
              </div>

              {/* 2. ZELLE */}
              <div className="group rounded-2xl border-2 border-purple-500/30 bg-gradient-to-b from-purple-50/40 via-white to-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl bg-[#7414CA] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#7414CA]/25">
                        Z
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-base">Zelle®</h4>
                        <p className="text-[11px] font-bold text-purple-700">Sin comisiones bancarias</p>
                      </div>
                    </div>
                    <Badge className="bg-[#7414CA]/20 text-[#550c96] border-[#7414CA]/40 font-black text-[10px]">
                      Bancos USA
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600">
                    Transfiere desde Bank of America, Chase, Wells Fargo o cualquier banco con Zelle en minutos.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Correo Zelle</span>
                      <span className="font-mono text-xs font-black text-slate-900 block truncate">
                        {usAccounts.zelleEmail || "pagos@hispaniolapay.com"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCopyText(usAccounts.zelleEmail || "pagos@hispaniolapay.com", "Email Zelle", "zelle-email")}
                      className="h-7 px-2.5 bg-[#7414CA] hover:bg-[#5b0f9e] text-white font-bold text-xs rounded-lg"
                    >
                      {copiedId === "zelle-email" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>

                  {usAccounts.zellePhone && (
                    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Teléfono Zelle</span>
                        <span className="font-mono text-xs font-black text-slate-900 block truncate">
                          {usAccounts.zellePhone}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCopyText(usAccounts.zellePhone, "Teléfono Zelle", "zelle-phone")}
                        className="h-7 px-2.5 bg-[#7414CA] hover:bg-[#5b0f9e] text-white font-bold text-xs rounded-lg"
                      >
                        {copiedId === "zelle-phone" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 pt-1">
                    <span>Titular: <strong>{usAccounts.zelleHolder || "Hispaniola Pay LLC"}</strong></span>
                  </div>
                </div>
              </div>

              {/* 3. PAYPAL */}
              <div className="group rounded-2xl border-2 border-blue-600/30 bg-gradient-to-b from-blue-50/40 via-white to-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl bg-[#003087] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#003087]/25">
                        P
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-base">PayPal</h4>
                        <p className="text-[11px] font-bold text-blue-700">Tarjeta o Saldo PayPal</p>
                      </div>
                    </div>
                    <Badge className="bg-[#003087]/20 text-[#003087] border-[#003087]/40 font-black text-[10px]">
                      Global / USA
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600">
                    Paga con tu tarjeta de débito/crédito estadounidense o balance directo con protección al comprador.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Cuenta PayPal</span>
                      <span className="font-mono text-xs font-black text-slate-900 block truncate">
                        {usAccounts.payPalEmail || "pagos@hispaniolapay.com"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCopyText(usAccounts.payPalEmail || "pagos@hispaniolapay.com", "Cuenta PayPal", "paypal")}
                      className="h-8 px-3 bg-[#003087] hover:bg-[#002263] text-white font-bold text-xs rounded-lg"
                    >
                      {copiedId === "paypal" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>

                  {usAccounts.payPalLink && (
                    <a 
                      href={usAccounts.payPalLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block text-center text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline pt-1"
                    >
                      Abrir enlace directo paypal.me →
                    </a>
                  )}
                </div>
              </div>

            </div>

            {/* Nota de envío */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Importante para envíos desde USA:</strong> Al realizar el pago en Zelle, Cash App o PayPal, coloca en la nota tu nombre y el número MonCash/Natcash en Haití (ej: <em>509-3711-2233</em>). Guarda tu comprobante para validación inmediata.
              </span>
            </div>
          </div>
        )}

        {/* PESTAÑA: REPÚBLICA DOMINICANA (BANCOS NACIONALES) */}
        {activeTab === "DO" && (
          <div className="space-y-5">
            {/* Instruction Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 text-xs flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Instrucciones de Pago RD:</span> Transfiere o deposita a cualquiera de nuestras cuentas oficiales dominicanas. Copia el número de cuenta directamente o copia la ficha completa para transferir por Pagos al Instante BCRD o ACH desde tu app (Banreservas, BHD, Popular, etc.).
              </div>
            </div>

            {/* Accounts Grid */}
            <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
              {accounts.map((account) => {
                const isCopied = copiedId === account.id
                const isFullCopied = copiedFullId === account.id

                return (
                  <div
                    key={account.id}
                    className="group relative rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/50 to-white hover:border-blue-400 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
                  >
                    {/* Top bank badge & currency */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-xs shrink-0"
                          style={{ backgroundColor: account.logoColor || "#1E3A8A" }}
                        >
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                            {account.bankName}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium capitalize mt-0.5">
                            Cuenta {account.accountType} • {account.currency}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Badge 
                          variant="outline" 
                          className={`font-black text-[11px] uppercase ${
                            account.currency === "USD" 
                              ? "border-emerald-500 text-emerald-700 bg-emerald-50" 
                              : "border-blue-500 text-blue-700 bg-blue-50"
                          }`}
                        >
                          {account.currency}
                        </Badge>
                      </div>
                    </div>

                    {/* Account Number Box with 1-Click Copy */}
                    <div className="bg-slate-100/90 hover:bg-blue-50/80 transition-colors p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                          Número de Cuenta
                        </span>
                        <span className="font-mono text-base sm:text-lg font-black text-slate-900 tracking-wider truncate block">
                          {account.accountNumber}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCopyAccount(account)}
                        className={`h-9 px-3 text-xs font-bold gap-1.5 rounded-lg shrink-0 transition-all ${
                          isCopied
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-primary hover:bg-primary/90 text-white"
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Account Details */}
                    <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">Titular:</span>
                        <span className="font-semibold text-slate-800 text-right truncate">
                          {account.holderName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">Documento:</span>
                        <span className="font-mono font-medium text-slate-700">
                          {account.documentId}
                        </span>
                      </div>
                      {account.instructions && (
                        <div className="pt-1 text-[11px] text-slate-500 italic flex items-start gap-1">
                          <span className="text-amber-600 font-bold not-italic">Nota:</span> {account.instructions}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action: Copy Complete Form */}
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyFullDetails(account)}
                        className="w-full text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-blue-50/60 border-slate-200 h-8 gap-1.5"
                      >
                        {isFullCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Ficha completa copiada</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copiar ficha completa para WhatsApp</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {accounts.length === 0 && (
              <div className="p-8 text-center text-slate-500 border border-dashed rounded-2xl">
                No hay cuentas bancarias activas configuradas actualmente. El administrador puede agregarlas desde el panel de Configuración.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
