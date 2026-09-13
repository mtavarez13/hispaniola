"use client"

import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Building2, 
  Smartphone, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Wallet, 
  Sparkles, 
  Landmark, 
  CreditCard,
  Send,
  Coins,
  Clock
} from "lucide-react"
import Link from "next/link"

export function CorridorBanks() {
  const [selectedBank, setSelectedBank] = useState<"reservas" | "bhd" | "popular" | "usa" | "cash">("usa")
  const [selectedWallet, setSelectedWallet] = useState<"moncash" | "natcash">("moncash")

  return (
    <div className="w-full py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Title & Subtitle */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            CONECTIVIDAD BANCARIA Y MÓVIL DIRECTA
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Envía desde <span className="text-blue-600 underline decoration-blue-300 decoration-wavy">EE.UU. y Rep. Dominicana</span> directo a <span className="text-red-600 underline decoration-red-300 decoration-wavy">Haití al Instante</span>
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Sin intermediarios ni demoras. Envía en USD desde Estados Unidos con <strong>Cash App</strong>, <strong>Zelle</strong> y <strong>PayPal</strong>, o deposita en RD desde <strong>Banreservas</strong>, <strong>Banco BHD</strong> y <strong>Banco Popular</strong>. Tu familia recibe de inmediato en <strong>MonCash</strong> o <strong>Natcash</strong>.
          </p>
        </div>

        {/* 3-Step Interactive Transfer Corridor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* STEP 1: ORIGEN - BANCOS DOMINICANOS (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-slate-900 text-amber-400 font-black text-[11px] px-3 py-1 rounded-full border border-amber-400/30">
                  1. ORIGEN • EE.UU. 🇺🇸 & REP. DOMINICANA 🇩🇴
                </Badge>
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Verificado
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">¿Desde dónde deseas enviar?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recibimos pagos vía Cash App, Zelle y PayPal desde USA, y transferencias bancarias directas en RD.
                </p>
              </div>

              {/* Channels List */}
              <div className="space-y-3 pt-2">
                {/* ESTADOS UNIDOS: CASH APP / ZELLE / PAYPAL */}
                <div
                  onClick={() => setSelectedBank("usa")}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between gap-3 ${
                    selectedBank === "usa"
                      ? "border-emerald-500 bg-emerald-50/90 shadow-md ring-2 ring-emerald-400/30"
                      : "border-slate-100 hover:border-emerald-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Stylized USA Apps Badge */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 via-purple-600 to-blue-600 flex items-center justify-center text-white font-black text-base shrink-0 shadow-md">
                      🇺🇸
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-900 text-sm sm:text-base">USA: Cash App, Zelle & PayPal</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                          Nuevo
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Dólares USD sin fronteras vía CashApp ($), Zelle o PayPal
                      </p>
                      <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">
                        Conversión automática y entrega inmediata en Haití
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedBank === "usa" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"
                  }`}>
                    {selectedBank === "usa" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* BANRESERVAS */}
                <div
                  onClick={() => setSelectedBank("reservas")}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between gap-3 ${
                    selectedBank === "reservas"
                      ? "border-[#002F6C] bg-blue-50/80 shadow-md"
                      : "border-slate-100 hover:border-blue-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Stylized Banreservas Emblem */}
                    <div className="w-12 h-12 rounded-xl bg-[#002F6C] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md shadow-[#002F6C]/20">
                      <div className="text-center leading-none">
                        <span className="text-amber-400 font-extrabold text-[10px] block">BAN</span>
                        <span className="text-white font-black text-xs">RES</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm sm:text-base">Banreservas</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                          Popular
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Banco de Reservas de la República Dominicana
                      </p>
                      <span className="text-[10px] text-blue-700 font-semibold mt-0.5 block">
                        Ventanilla, App Banreservas y transferencias ACH
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedBank === "reservas" ? "border-[#002F6C] bg-[#002F6C] text-white" : "border-slate-300"
                  }`}>
                    {selectedBank === "reservas" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* BANCO BHD */}
                <div
                  onClick={() => setSelectedBank("bhd")}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between gap-3 ${
                    selectedBank === "bhd"
                      ? "border-[#008852] bg-emerald-50/80 shadow-md"
                      : "border-slate-100 hover:border-emerald-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Stylized BHD Emblem */}
                    <div className="w-12 h-12 rounded-xl bg-[#008852] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md shadow-[#008852]/20">
                      <div className="text-center leading-none">
                        <span className="text-white font-black text-xs tracking-wider">BHD</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm sm:text-base">Banco BHD</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Instantáneo
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        BHD León • Móvil Banking y PIN Pesos
                      </p>
                      <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                        Transferencias al instante e Internet Banking
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedBank === "bhd" ? "border-[#008852] bg-[#008852] text-white" : "border-slate-300"
                  }`}>
                    {selectedBank === "bhd" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* BANCO POPULAR */}
                <div
                  onClick={() => setSelectedBank("popular")}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between gap-3 ${
                    selectedBank === "popular"
                      ? "border-[#003882] bg-blue-50/80 shadow-md"
                      : "border-slate-100 hover:border-blue-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Stylized Banco Popular Chevron Emblem */}
                    <div className="w-12 h-12 rounded-xl bg-[#003882] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md shadow-[#003882]/20 relative overflow-hidden">
                      <div className="text-center leading-none">
                        <span className="text-orange-400 font-black text-xs block">▲</span>
                        <span className="text-white font-black text-[10px] tracking-wider">POP</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm sm:text-base">Banco Popular</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Líder
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Banco Popular Dominicano • App y tPago
                      </p>
                      <span className="text-[10px] text-blue-700 font-semibold mt-0.5 block">
                        App Popular, cajeros automáticos y depósitos
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedBank === "popular" ? "border-[#003882] bg-[#003882] text-white" : "border-slate-300"
                  }`}>
                    {selectedBank === "popular" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* EFECTIVO / AGENTES FISICOS */}
                <div
                  onClick={() => setSelectedBank("cash")}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between gap-3 ${
                    selectedBank === "cash"
                      ? "border-amber-500 bg-amber-50/80 shadow-md"
                      : "border-slate-100 hover:border-amber-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white font-black text-base shrink-0 shadow-md shadow-amber-500/20">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm sm:text-base">Efectivo en Agentes</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          +250 Puntos
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Paga en efectivo en colmados, farmacias y agencias
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedBank === "cash" ? "border-amber-500 bg-amber-500 text-white" : "border-slate-300"
                  }`}>
                    {selectedBank === "cash" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sin comisiones sorpresa
              </span>
              <span className="font-bold text-slate-700">Tasa fijada al enviar</span>
            </div>
          </div>

          {/* STEP 2: EL CORREDOR / MOTOR BENCASH (2 Cols) */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 via-slate-900 to-red-900 rounded-3xl p-6 text-white text-center shadow-xl shadow-slate-300/40 relative overflow-hidden">
            {/* Pulsing light rings */}
            <div className="w-20 h-20 rounded-full bg-amber-500/20 animate-ping absolute pointer-events-none" />
            <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black mb-3 shadow-lg shadow-amber-500/30 relative z-10">
              <Zap className="w-7 h-7 text-slate-950 fill-slate-950 animate-bounce" />
            </div>

            <div className="relative z-10 space-y-1">
              <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">
                MOTOR BENCASH
              </span>
              <h4 className="text-base font-black text-white">
                Envío en 30s
              </h4>
              <p className="text-[11px] text-slate-300 leading-tight">
                Conversión automática DOP / USD a Gourdes (HTG)
              </p>
            </div>

            <div className="w-full my-4 py-2 px-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-[11px] font-mono text-emerald-300 font-bold">
              ✓ API Kestrel 24/7
            </div>

            <div className="hidden lg:flex items-center gap-1 text-xs text-amber-300 font-bold">
              <span>Hacia Haití</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* STEP 3: DESTINO - BILLETERAS MÓVILES EN HAITÍ (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-36 h-36 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-red-600 text-white font-black text-[11px] px-3 py-1 rounded-full">
                  3. DESTINO • HAITÍ 🇭🇹
                </Badge>
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-red-600" /> Billeteras Móviles (+509)
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">¿Cómo reciben tus seres queridos?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  El dinero entra directo al celular del beneficiario en Gourdes (HTG), listo para retirar.
                </p>
              </div>

              {/* Haiti Wallets List */}
              <div className="space-y-3 pt-2">
                {/* MONCASH */}
                <div
                  onClick={() => setSelectedWallet("moncash")}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between gap-3 ${
                    selectedWallet === "moncash"
                      ? "border-[#E30613] bg-red-50/80 shadow-md"
                      : "border-slate-100 hover:border-red-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* MonCash Digicel Emblem */}
                    <div className="w-12 h-12 rounded-xl bg-[#E30613] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md shadow-[#E30613]/20">
                      <div className="text-center leading-none">
                        <span className="text-amber-300 font-extrabold text-[10px] block">MON</span>
                        <span className="text-white font-black text-xs">CASH</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm sm:text-base">MonCash (Digicel)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                          Billetera #1
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Más de 3.5 millones de usuarios en Haití
                      </p>
                      <span className="text-[10px] text-red-700 font-semibold mt-0.5 block">
                        Retiro en +12,000 agentes Digicel en todo el país
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedWallet === "moncash" ? "border-[#E30613] bg-[#E30613] text-white" : "border-slate-300"
                  }`}>
                    {selectedWallet === "moncash" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* NATCASH */}
                <div
                  onClick={() => setSelectedWallet("natcash")}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between gap-3 ${
                    selectedWallet === "natcash"
                      ? "border-[#FF5900] bg-orange-50/80 shadow-md"
                      : "border-slate-100 hover:border-orange-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Natcash Natcom Emblem */}
                    <div className="w-12 h-12 rounded-xl bg-[#FF5900] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md shadow-[#FF5900]/20">
                      <div className="text-center leading-none">
                        <span className="text-white font-extrabold text-[10px] block">NAT</span>
                        <span className="text-slate-950 font-black text-xs">CASH</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm sm:text-base">Natcash (Natcom)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                          Sin Comisiones Extra
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Red nacional Natcom en los 10 departamentos
                      </p>
                      <span className="text-[10px] text-orange-700 font-semibold mt-0.5 block">
                        Acreditación directa e inmediata sin filas
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedWallet === "natcash" ? "border-[#FF5900] bg-[#FF5900] text-white" : "border-slate-300"
                  }`}>
                    {selectedWallet === "natcash" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* BENEFICIOS EN HAITI */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ¿Qué puede hacer tu familiar al recibir?
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1">
                    <li>• Retirar dinero en efectivo al instante en cualquier agente.</li>
                    <li>• Comprar comida, medicinas y pagar servicios desde su teléfono.</li>
                    <li>• Guardar su dinero de forma segura sin riesgo de robos.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-red-600" /> Disponible los 365 días del año
              </span>
              <span className="font-bold text-slate-700">Recepción SMS instantáneo</span>
            </div>
          </div>

        </div>

        {/* Action Callout Bar */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-primary to-blue-950 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-black flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              ¿Listo para enviar a tu familiar en Haití?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Solo necesitas el número de teléfono con MonCash o Natcash (+509) y el monto a transferir.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
            <Link href="/dashboard/haiti-remittances" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-12 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 gap-2">
                <Send className="w-4 h-4" />
                Enviar a MonCash / Natcash Ahora
              </Button>
            </Link>
            <a href="#calculator" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-12 px-5 border-white/20 text-white hover:bg-white/10 font-bold text-sm rounded-xl">
                Cotizar Envío
              </Button>
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
