"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Smartphone, 
  Bot, 
  Terminal, 
  CheckCheck, 
  HelpCircle, 
  ExternalLink,
  Zap,
  Globe,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Server
} from "lucide-react"

interface WhatsAppSettingsCardProps {
  waEnabled: boolean
  setWaEnabled: (v: boolean) => void
  waProvider: 'cloud_api' | 'custom_gateway' | 'direct_web'
  setWaProvider: (v: 'cloud_api' | 'custom_gateway' | 'direct_web') => void
  waToken: string
  setWaToken: (v: string) => void
  waPhoneId: string
  setWaPhoneId: (v: string) => void
  waBusinessId: string
  setWaBusinessId: (v: string) => void
  waGatewayUrl: string
  setWaGatewayUrl: (v: string) => void
  waNotifySender: boolean
  setWaNotifySender: (v: boolean) => void
  waNotifyRecipient: boolean
  setWaNotifyRecipient: (v: boolean) => void
  waNotifyInvoices: boolean
  setWaNotifyInvoices: (v: boolean) => void
  savingWa: boolean
  lastSavedWa: string | null
  onSave: () => Promise<void>
  testPhone: string
  setTestPhone: (v: string) => void
  testType: 'sender_receipt' | 'recipient_haiti' | 'invoice' | 'custom'
  setTestType: (v: 'sender_receipt' | 'recipient_haiti' | 'invoice' | 'custom') => void
  testCustomMsg: string
  setTestCustomMsg: (v: string) => void
  testingWa: boolean
  testResult: any
  onTest: () => Promise<void>
  previewTab: 'sender' | 'recipient' | 'invoice'
  setPreviewTab: (v: 'sender' | 'recipient' | 'invoice') => void
}

export function WhatsAppSettingsCard({
  waEnabled,
  setWaEnabled,
  waProvider,
  setWaProvider,
  waToken,
  setWaToken,
  waPhoneId,
  setWaPhoneId,
  waBusinessId,
  setWaBusinessId,
  waGatewayUrl,
  setWaGatewayUrl,
  waNotifySender,
  setWaNotifySender,
  waNotifyRecipient,
  setWaNotifyRecipient,
  waNotifyInvoices,
  setWaNotifyInvoices,
  savingWa,
  lastSavedWa,
  onSave,
  testPhone,
  setTestPhone,
  testType,
  setTestType,
  testCustomMsg,
  setTestCustomMsg,
  testingWa,
  testResult,
  onTest,
  previewTab,
  setPreviewTab,
}: WhatsAppSettingsCardProps) {
  const [showToken, setShowToken] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const handleCopyToken = () => {
    if (!waToken) return
    navigator.clipboard.writeText(waToken)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
  }

  // Comprobantes de ejemplo para la previsualización
  const sampleSenderMessage = `✅ *HispaniolaPay - Comprobante de Remesa Exitosa*
¡Hola *Carlos Rodríguez*! Tu transferencia hacia Haití ha sido procesada y acreditada con éxito.

📋 *Detalles de la Transacción:*
• *ID de Transacción:* HP-782910
• *No. Petición:* REQ-99201
• *Beneficiario:* Jean Baptiste (+509 4088-5084)
• *Billetera Destino:* MonCash (Haití)
• *Monto Acreditado:* *1,350.00 HTG*
• *Monto Enviado:* $10.00 USD
• *Equivalente:* RD$ 600.00 DOP
• *Fecha y Hora:* ${new Date().toLocaleDateString('es-DO')} 12:45 PM
• *Estado:* ✅ *Completada / Acreditada*

⚡ *Tu familia ya tiene el dinero disponible en su teléfono en Haití.*
_Gracias por utilizar HispaniolaPay - Corredor RD ⇄ Haití._`

  const sampleRecipientMessage = `🇭🇹 *HispaniolaPay - Notifikasyon Transfè Lajan*
Bonjou *Jean Baptiste*! Ou resevwa yon transfè de *1,350.00 HTG* sou kont *MonCash* ou.

👤 *Moun ki voye l:* Carlos Rodríguez (+1 809-555-0123)
📋 *Nimewo Referans:* HP-782910
⚡ *Estati:* Lajan an disponib imedyatman sou telefòn ou pou w itilize oswa retire li.
🕒 *Dat:* ${new Date().toLocaleDateString('es-DO')} 12:45 PM

---
🇩🇴 *Comprobante en Español:*
Has recibido *1,350.00 HTG* en tu billetera *MonCash* enviados por *Carlos Rodríguez*. Ref: HP-782910. ¡Fondos listos para uso!`

  const sampleInvoiceMessage = `🧾 *HispaniolaPay - Pago de Servicio Exitoso*
Estimado(a) *María Santos*, el pago de tu factura ha sido liquidado correctamente.

📋 *Detalles del Pago:*
• *Servicio:* Edeeste Factura
• *Teléfono / Contrato:* 8093233535
• *Monto Pagado:* RD$ 2,450.00 DOP
• *No. Referencia:* REF-849201
• *Fecha:* ${new Date().toLocaleDateString('es-DO')} 12:45 PM
• *Estado:* ✅ *Pagado & Validado*

_HispaniolaPay - Red de Pagos y Remesas RD ⇄ Haití_`

  return (
    <div className="space-y-6">
      {/* 1. MAIN CARD HEADER */}
      <Card className="border-none shadow-md bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge className="bg-emerald-400 text-slate-950 font-bold text-[10px] px-2 py-0.5 flex items-center gap-1">
                  <Bot className="w-3 h-3" /> Automatización Activa
                </Badge>
                {waEnabled ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-mono text-[10px] px-2 py-0.5">
                    ● Enrutamiento Activo
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono text-[10px] px-2 py-0.5">
                    ○ Enrutamiento Pausado
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-white">
                <MessageSquare className="w-6 h-6 text-emerald-400" />
                Submódulo WhatsApp API & Automatización
              </CardTitle>
              <CardDescription className="text-emerald-100/80 text-xs sm:text-sm mt-1 max-w-xl">
                Despacha automáticamente recibos oficiales de remesa a RD/EEUU y avisos instantáneos en Kreyòl a receptores de MonCash y NatCash en Haití.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={onSave}
                disabled={savingWa}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-900/30 gap-1.5 text-xs sm:text-sm"
              >
                {savingWa ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Guardar WhatsApp
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* INTERRUPTOR PRINCIPAL DE AUTOMATIZACIÓN */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="master-wa-switch" className="text-base font-bold text-slate-900 cursor-pointer">
                  Habilitar API de WhatsApp para Automatización
                </Label>
                {waEnabled ? (
                  <Badge className="bg-emerald-600 text-white text-[10px]">ACTIVADO</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 text-[10px]">DESACTIVADO</Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 max-w-xl">
                Cuando está activo, el sistema enviará en background los comprobantes digitales inmediatamente después de que un depósito en Haití o pago Qik se complete.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="master-wa-switch"
                checked={waEnabled}
                onCheckedChange={setWaEnabled}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>

          {/* SELECTOR DE PROVEEDOR / ARQUITECTURA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-600" />
                Proveedor de WhatsApp & Canal de Despacho
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 h-7 gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showGuide ? "Ocultar Guía Meta" : "¿Cómo obtener credenciales Meta?"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Meta Cloud API */}
              <div
                onClick={() => setWaProvider('cloud_api')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  waProvider === 'cloud_api'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  {waProvider === 'cloud_api' && (
                    <Badge className="bg-emerald-600 text-white text-[10px]">Seleccionado</Badge>
                  )}
                </div>
                <div className="font-bold text-sm text-slate-900">Meta Cloud API (Oficial)</div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Envío directo en segundo plano a los servidores de Meta Graph API v20.0. Oficial y escalable.
                </p>
              </div>

              {/* Option 2: Custom Gateway */}
              <div
                onClick={() => setWaProvider('custom_gateway')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  waProvider === 'custom_gateway'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                    <Server className="w-4 h-4" />
                  </div>
                  {waProvider === 'custom_gateway' && (
                    <Badge className="bg-emerald-600 text-white text-[10px]">Seleccionado</Badge>
                  )}
                </div>
                <div className="font-bold text-sm text-slate-900">Gateway / Webhook</div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Compatible con Evolution API, Baileys, Z-API, Wassenger o servidor WhatsApp propio.
                </p>
              </div>

              {/* Option 3: Direct Web Intent */}
              <div
                onClick={() => setWaProvider('direct_web')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  waProvider === 'direct_web'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  {waProvider === 'direct_web' && (
                    <Badge className="bg-emerald-600 text-white text-[10px]">Seleccionado</Badge>
                  )}
                </div>
                <div className="font-bold text-sm text-slate-900">Enlaces Web Directos</div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Genera botones universales de WhatsApp Web con texto pre-rellenado para agentes de taquilla.
                </p>
              </div>
            </div>
          </div>

          {/* GUÍA RÁPIDA DESPLEGABLE META DEVELOPERS */}
          {showGuide && (
            <div className="p-4 rounded-xl bg-slate-900 text-slate-200 space-y-3 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Guía Rápida: Cómo conectar Meta WhatsApp Cloud API
                </span>
                <Badge className="bg-emerald-500 text-slate-950 text-[10px]">Paso a Paso</Badge>
              </div>
              <ol className="text-xs space-y-2 text-slate-300 list-decimal pl-4">
                <li>
                  Inicia sesión en <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-bold">developers.facebook.com</a> y crea o entra a tu app de tipo <b>Negocio (Business)</b>.
                </li>
                <li>
                  Agrega el producto <b>WhatsApp</b> y en la pestaña <b>API Setup</b> copia tu <b>Phone Number ID</b> (número remitente verificado).
                </li>
                <li>
                  Para obtener el token permanente que nunca vence, ve a <b>Meta Business Suite &gt; Configuración del Negocio &gt; Usuarios del Sistema</b>, genera un token con permisos <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">whatsapp_business_messaging</code> y pégalo abajo.
                </li>
              </ol>
            </div>
          )}

          {/* CAMPOS DE CREDENCIALES DEL API */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Phone Number ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="wa-phone-id" className="text-xs font-bold text-slate-700">
                  Meta Phone Number ID <span className="text-red-500">*</span>
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">ID de Teléfono Remitente</span>
              </div>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="wa-phone-id"
                  value={waPhoneId}
                  onChange={(e) => setWaPhoneId(e.target.value)}
                  placeholder="Ej: 108928374628192"
                  className="pl-9 font-mono text-xs bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            {/* WABA ID (Opcional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="wa-business-id" className="text-xs font-bold text-slate-700">
                  WhatsApp Business Account ID (WABA)
                </Label>
                <span className="text-[10px] text-muted-foreground">Opcional</span>
              </div>
              <div className="relative">
                <BuildingIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="wa-business-id"
                  value={waBusinessId}
                  onChange={(e) => setWaBusinessId(e.target.value)}
                  placeholder="Ej: 105492837482910"
                  className="pl-9 font-mono text-xs bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Token de Acceso */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="wa-token" className="text-xs font-bold text-slate-700">
                  Meta Permanent Access Token (Bearer) <span className="text-red-500">*</span>
                </Label>
                {waToken ? (
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px] gap-1">
                    <Check className="w-3 h-3" /> Token Configurado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">
                    Falta Token
                  </Badge>
                )}
              </div>
              <div className="relative">
                <Input
                  id="wa-token"
                  type={showToken ? "text" : "password"}
                  value={waToken}
                  onChange={(e) => setWaToken(e.target.value)}
                  placeholder="EAAG..."
                  className="pr-20 font-mono text-xs bg-slate-50 focus:bg-white"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowToken(!showToken)}
                    className="h-7 w-7 p-0 text-slate-500"
                    title={showToken ? "Ocultar" : "Mostrar"}
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyToken}
                    disabled={!waToken}
                    className="h-7 w-7 p-0 text-slate-500"
                    title="Copiar token"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Se almacena con cifrado y se usa en el servidor Next.js para firmar las llamadas a la Graph API de Meta.
              </p>
            </div>

            {/* Gateway URL (Visible si selecciona Custom Gateway) */}
            {waProvider === 'custom_gateway' && (
              <div className="space-y-1.5 md:col-span-2 p-3 rounded-lg bg-indigo-50/70 border border-indigo-200">
                <Label htmlFor="wa-gateway-url" className="text-xs font-bold text-indigo-900">
                  URL del Webhook / Gateway Propio
                </Label>
                <Input
                  id="wa-gateway-url"
                  value={waGatewayUrl}
                  onChange={(e) => setWaGatewayUrl(e.target.value)}
                  placeholder="https://api.tu-servidor-whatsapp.com/v1/messages"
                  className="font-mono text-xs bg-white"
                />
                <p className="text-[11px] text-indigo-700">
                  El servidor de HispaniolaPay enviará un POST JSON con el payload de la remesa a este endpoint.
                </p>
              </div>
            )}
          </div>

          {/* REGLAS DE AUTOMATIZACIÓN DE MENSAJES */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <Label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              Reglas de Automatización de Mensajes
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Regla 1: Remitente */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900">Recibo al Remitente</span>
                    <Switch
                      checked={waNotifySender}
                      onCheckedChange={setWaNotifySender}
                      className="data-[state=checked]:bg-emerald-600 scale-90"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Envía el comprobante digital en pesos dominicanos o dólares al cliente en RD/EEUU con ID de transacción.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-[10px] text-slate-600 bg-white">
                  🇩🇴 🇺🇸 Remitente
                </Badge>
              </div>

              {/* Regla 2: Receptor Haití */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900">Aviso Receptor Haití</span>
                    <Switch
                      checked={waNotifyRecipient}
                      onCheckedChange={setWaNotifyRecipient}
                      className="data-[state=checked]:bg-emerald-600 scale-90"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Envía notificación bilingüe (Kreyòl Ayisyen y Español) con saldo acreditado en MonCash o NatCash.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-[10px] text-slate-600 bg-white">
                  🇭🇹 Kreyòl & Español
                </Badge>
              </div>

              {/* Regla 3: Facturas Qik */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900">Facturas Qik / Recargas</span>
                    <Switch
                      checked={waNotifyInvoices}
                      onCheckedChange={setWaNotifyInvoices}
                      className="data-[state=checked]:bg-emerald-600 scale-90"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Envía confirmación con número de autorización para pagos de luz, agua, telefonía o recargas.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-[10px] text-slate-600 bg-white">
                  🧾 Servicios & Qik
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {lastSavedWa ? (
              <span>Última sincronización: <b>{lastSavedWa}</b></span>
            ) : (
              <span>Cambios protegidos localmente y sincronizados con Firestore.</span>
            )}
          </div>
          <Button
            onClick={onSave}
            disabled={savingWa}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs"
          >
            {savingWa ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Guardar Configuración WhatsApp
          </Button>
        </CardFooter>
      </Card>

      {/* 2. PREVISUALIZADOR Y CONSOLA DE PRUEBA EN VIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SIMULADOR DE CHAT WHATSAPP (5 COLS) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              Previsualizador de Chat WhatsApp
            </Label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPreviewTab('sender')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                  previewTab === 'sender'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Remitente
              </button>
              <button
                onClick={() => setPreviewTab('recipient')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                  previewTab === 'recipient'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Haití (Kreyòl)
              </button>
              <button
                onClick={() => setPreviewTab('invoice')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                  previewTab === 'invoice'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Factura
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-300 shadow-sm overflow-hidden bg-[#efeae2]">
            {/* WhatsApp App Header Mockup */}
            <div className="bg-[#075e54] text-white p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs text-white shadow">
                HP
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs leading-tight truncate">HispaniolaPay Oficial</div>
                <div className="text-[10px] text-emerald-200 leading-tight">Cuenta de Empresa Verificada</div>
              </div>
              <Badge className="bg-emerald-400 text-slate-950 text-[9px] px-1.5 py-0 font-bold">
                ✓ Oficial
              </Badge>
            </div>

            {/* Chat Area Mockup */}
            <div className="p-4 space-y-3 min-h-[290px] max-h-[380px] overflow-y-auto">
              <div className="flex justify-center">
                <span className="bg-white/80 backdrop-blur-sm text-[10px] text-slate-600 px-2.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider font-semibold">
                  Hoy
                </span>
              </div>

              {/* Message Bubble */}
              <div className="flex justify-start">
                <div className="max-w-[92%] bg-[#d9fdd3] text-slate-900 rounded-lg rounded-tl-none p-3 shadow-xs text-xs space-y-1.5 leading-relaxed whitespace-pre-wrap font-sans">
                  {previewTab === 'sender' && sampleSenderMessage}
                  {previewTab === 'recipient' && sampleRecipientMessage}
                  {previewTab === 'invoice' && sampleInvoiceMessage}

                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 pt-1">
                    <span>12:45 PM</span>
                    <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONSOLA DE PRUEBA EN VIVO (6 COLS) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-600" />
              Consola de Prueba de Envío en Vivo
            </Label>
            <Badge variant="outline" className="text-[10px] font-mono">
              Sandbox & Live Test
            </Badge>
          </div>

          <Card className="border border-slate-200 shadow-sm bg-white p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="test-phone-input" className="text-xs font-bold text-slate-700">
                Número Telefónico Destinatario de Prueba
              </Label>
              <div className="flex gap-2">
                <Input
                  id="test-phone-input"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Ej: +1 809 555 0123 o 509 4088 5084"
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTestPhone("+18095550123")}
                  className="text-[11px] shrink-0"
                >
                  RD Test
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTestPhone("+50940885084")}
                  className="text-[11px] shrink-0"
                >
                  Haití Test
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Acepta formato local o internacional con o sin prefijo (+1 o +509).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Tipo de Mensaje de Prueba</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={testType === 'sender_receipt' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTestType('sender_receipt')}
                  className={`text-xs h-8 ${testType === 'sender_receipt' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                  Recibo Remitente
                </Button>
                <Button
                  type="button"
                  variant={testType === 'recipient_haiti' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTestType('recipient_haiti')}
                  className={`text-xs h-8 ${testType === 'recipient_haiti' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                  Aviso Haití (Kreyòl)
                </Button>
                <Button
                  type="button"
                  variant={testType === 'invoice' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTestType('invoice')}
                  className={`text-xs h-8 ${testType === 'invoice' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                  Factura Qik
                </Button>
                <Button
                  type="button"
                  variant={testType === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTestType('custom')}
                  className={`text-xs h-8 ${testType === 'custom' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                  Mensaje Libre
                </Button>
              </div>
            </div>

            {testType === 'custom' && (
              <div className="space-y-1.5">
                <Label htmlFor="custom-test-msg" className="text-xs font-bold text-slate-700">
                  Texto del Mensaje Personalizado
                </Label>
                <Input
                  id="custom-test-msg"
                  value={testCustomMsg}
                  onChange={(e) => setTestCustomMsg(e.target.value)}
                  placeholder="Escribe el texto de prueba..."
                  className="text-xs"
                />
              </div>
            )}

            <Button
              onClick={onTest}
              disabled={testingWa}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 text-xs h-9 shadow-sm"
            >
              {testingWa ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Despachando prueba...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-emerald-400" /> Enviar Mensaje de Prueba WhatsApp
                </>
              )}
            </Button>

            {/* RESULTADO DE LA PRUEBA */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center gap-1.5">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    {testResult.success ? "Prueba Exitosa" : "Fallo en la Prueba"}
                  </div>
                  {testResult.latencyMs !== undefined && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {testResult.latencyMs}ms
                    </Badge>
                  )}
                </div>

                {testResult.messageId && (
                  <div className="font-mono text-[10px] text-emerald-800 break-all bg-white/70 p-1.5 rounded">
                    <b>Meta Message ID:</b> {testResult.messageId}
                  </div>
                )}

                {testResult.error && (
                  <div className="text-rose-700 bg-white/70 p-2 rounded text-[11px] leading-relaxed">
                    <b>Error:</b> {testResult.error}
                    <div className="mt-1 text-[10px] text-slate-600">
                      Verifica que el <b>Phone Number ID</b> y el <b>Token de Meta</b> pertenezcan a la misma App de WhatsApp.
                    </div>
                  </div>
                )}

                {testResult.whatsappIntentUrl && (
                  <div className="pt-1">
                    <a
                      href={testResult.whatsappIntentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold underline text-xs"
                    >
                      Abrir enlace en WhatsApp Web <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function BuildingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  )
}
