"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowRight, 
  ShieldCheck, 
  Globe, 
  Wallet, 
  Sparkles, 
  RefreshCcw, 
  Calculator, 
  Building2, 
  MapPin, 
  Search, 
  Phone,
  Zap,
  Smartphone,
  CheckCircle2,
  Receipt,
  CreditCard,
  Send,
  Coins,
  Landmark,
  Lock,
  PiggyBank,
  Menu,
  X,
  DollarSign
} from "lucide-react"
import Link from "next/link"
import { CalculatorCard } from "@/components/remittance/calculator-card"
import { AppLogo } from "@/components/brand/app-logo"
import { OfficialBankAccountsCard } from "@/components/banking/official-bank-accounts-card"
import { HispaniolaIslandMap } from "@/components/landing/hispaniola-island-map"
import { CorridorBanks } from "@/components/landing/corridor-banks"
import { useI18n } from "@/lib/i18n/context"
import { useAuth } from "@/lib/auth-context"
import { useSystemSettings, DEFAULT_LANDING_SUB_AGENTS } from "@/lib/settings-context"
import { LandingSubAgent } from "@/lib/types"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Home() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { settings } = useSystemSettings();
  const [selectedCountry, setSelectedCountry] = useState<"DO" | "HT" | "US">("DO")
  const [selectedZone, setSelectedZone] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Sub-agentes configurables dinámicamente por el Administrador desde el panel
  const allSubAgents: LandingSubAgent[] = (settings?.landingSubAgents && settings.landingSubAgents.length > 0)
    ? settings.landingSubAgents
    : DEFAULT_LANDING_SUB_AGENTS

  const activeSubAgents = allSubAgents.filter(agent => agent.active !== false)

  const dynamicZones = Array.from(
    new Set(
      activeSubAgents
        .filter(agent => agent.country === selectedCountry)
        .map(agent => agent.zone)
        .filter(Boolean)
    )
  )

  const filteredAgents = activeSubAgents.filter(agent => {
    const matchesCountry = agent.country === selectedCountry
    const matchesZone = selectedZone === "all" || agent.zone === selectedZone
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          agent.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          agent.address.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCountry && matchesZone && matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#F4F7FC] selection:bg-amber-400/40 selection:text-slate-900 scroll-smooth">
      {/* Dynamic Top Announcement Bar with US Remittance */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 text-white text-xs py-2.5 px-4 text-center font-medium flex flex-wrap items-center justify-center gap-2 border-b border-white/10">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-extrabold text-amber-300">
          🇺🇸 NUEVO DESDE ESTADOS UNIDOS:
        </span>
        <span>
          Recibimos remesas vía <strong>Cash App ($)</strong>, <strong>Zelle</strong> y <strong>PayPal</strong> con entrega directa a MonCash y Natcash en Haití y cuentas en RD.
        </span>
        <a href="#bancos-oficiales" className="underline font-bold text-emerald-300 hover:text-emerald-200 ml-1">
          Ver Cuentas USA →
        </a>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 w-full z-50 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <AppLogo size="md" />

          <div className="hidden lg:flex items-center gap-5">
            <a href="#bancos-oficiales" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1">
              <Landmark className="w-4 h-4 text-amber-500" />
              Cuentas RD & USA
            </a>
            <a href="#calculator" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1">
              <Calculator className="w-4 h-4 text-emerald-500" />
              Calculadora
            </a>
            <a href="#billetera" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1">
              <PiggyBank className="w-4 h-4 text-emerald-600" />
              Billetera & Ahorro
            </a>
            <a href="#mapa" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1">
              <Globe className="w-4 h-4 text-blue-500" />
              Mapa Isla
            </a>
            <a href="#agents" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1">
              <Building2 className="w-4 h-4 text-blue-500" />
              {t('agents_network_title')}
            </a>
            <Link 
              href="/apply-agent" 
              className="text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/40 shadow-xs hover:shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              Solicitar ser Agente
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/dashboard">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-5 text-xs sm:text-sm shadow-md shadow-blue-600/20">
                    Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => logout()} className="text-slate-500 hover:text-slate-900 text-xs">
                  Salir
                </Button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-700 font-semibold text-xs sm:text-sm">
                    {t('nav_login')}
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl px-5 text-xs sm:text-sm shadow-md shadow-amber-500/25">
                    {t('nav_register')}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-700 hover:text-slate-900 hover:bg-slate-100 h-9 w-9"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Menú principal"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown - 100% Solid White Background */}
        {mobileNavOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 shadow-xl px-4 py-3 space-y-2">
            <div className="flex flex-col space-y-1">
              <a
                href="#bancos-oficiales"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Landmark className="w-4 h-4 text-amber-500" />
                Cuentas RD & USA
              </a>
              <a
                href="#calculator"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Calculator className="w-4 h-4 text-emerald-500" />
                Calculadora de Remesas
              </a>
              <a
                href="#billetera"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <PiggyBank className="w-4 h-4 text-emerald-600" />
                Billetera & Ahorro
              </a>
              <a
                href="#mapa"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Globe className="w-4 h-4 text-blue-500" />
                Mapa Isla
              </a>
              <a
                href="#agents"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Building2 className="w-4 h-4 text-blue-500" />
                {t('agents_network_title')}
              </a>
              <Link
                href="/apply-agent"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Solicitar ser Agente
              </Link>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileNavOpen(false)}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-xl">
                      Ir al Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      logout()
                      setMobileNavOpen(false)
                    }}
                    className="w-full text-slate-600 font-semibold h-9 text-xs"
                  >
                    Cerrar Sesión
                  </Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setMobileNavOpen(false)}>
                    <Button variant="outline" className="w-full font-semibold border-slate-300 text-xs h-9">
                      {t('nav_login')}
                    </Button>
                  </Link>
                  <Link href="/login" onClick={() => setMobileNavOpen(false)}>
                    <Button className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-9">
                      {t('nav_register')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section with Vibrant Colors & Intuitive Action Cards */}
      <section className="relative pt-12 sm:pt-16 pb-20 px-4 overflow-hidden">
        {/* Background decorative glow spots */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-red-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/3 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-12">
          {/* Main Hero Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 via-blue-50 to-red-50 border border-slate-200 text-slate-900 text-xs font-black tracking-wide shadow-xs">
                <span className="text-emerald-700 font-extrabold flex items-center gap-1">🇺🇸 USA</span>
                <span className="text-slate-400">•</span>
                <span className="text-blue-800 font-extrabold">🇩🇴 REP. DOMINICANA</span>
                <span className="text-slate-400">➔</span>
                <span className="text-red-700 font-bold">🇭🇹 MONCASH & NATCASH</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.08] tracking-tight">
                Envía desde <span className="text-emerald-700 underline decoration-emerald-300 decoration-wavy">EE.UU.</span> y <span className="text-blue-700 underline decoration-blue-300 decoration-wavy">Rep. Dominicana</span>
                <br className="hidden sm:inline" />
                <span className="text-slate-800"> directo a </span>
                <span className="text-red-600 underline decoration-red-300 decoration-wavy">MonCash y Natcash</span>
              </h1>

              {/* Description */}
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
                Transfiere dinero a tus seres queridos en minutos con <strong>tasa preferencial garantizada</strong>. Aceptamos <strong>Cash App, Zelle y PayPal</strong> desde Estados Unidos en dólares (USD), o depósitos en RD (DOP/USD) vía <strong>Banreservas, BHD y Popular</strong>. Tu familia retira al instante en su teléfono en todo Haití.
              </p>

              {/* Call to Actions */}
              <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
                <Link href="/dashboard/haiti-remittances">
                  <Button className="h-14 px-7 bg-blue-600 hover:bg-blue-700 text-white font-black text-base rounded-2xl gap-2.5 shadow-xl shadow-blue-600/25 w-full sm:w-auto group">
                    <Send className="w-5 h-5 text-amber-300" />
                    Enviar a Haití Ahora
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-white/80" />
                  </Button>
                </Link>
                <a href="#bancos-oficiales">
                  <Button variant="outline" className="h-14 px-6 border-2 border-slate-300 hover:border-slate-400 bg-white text-slate-800 font-bold text-base rounded-2xl gap-2 shadow-xs w-full sm:w-auto">
                    <Landmark className="w-5 h-5 text-amber-600" />
                    Ver Cuentas RD & USA
                  </Button>
                </a>
              </div>

              {/* Fast Logos Marquee / Quick Trust Badges */}
              <div className="pt-4 border-t border-slate-200/70 space-y-2.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Medios y billeteras integradas:
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Cash App */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-black text-xs">
                    <div className="w-5 h-5 rounded-md bg-[#00D632] text-white font-black text-[10px] flex items-center justify-center">
                      $
                    </div>
                    <span>Cash App</span>
                  </div>

                  {/* Zelle */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-300 text-purple-800 font-black text-xs">
                    <div className="w-5 h-5 rounded-md bg-[#7414CA] text-white font-black text-[10px] flex items-center justify-center">
                      Z
                    </div>
                    <span>Zelle</span>
                  </div>

                  {/* PayPal */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-300 text-blue-800 font-black text-xs">
                    <div className="w-5 h-5 rounded-md bg-[#003087] text-white font-black text-[10px] flex items-center justify-center">
                      P
                    </div>
                    <span>PayPal</span>
                  </div>

                  {/* Banreservas Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#002F6C]/10 border border-[#002F6C]/20 text-[#002F6C]">
                    <div className="w-5 h-5 rounded-md bg-[#002F6C] text-amber-400 font-black text-[9px] flex items-center justify-center">
                      BR
                    </div>
                    <span className="font-extrabold text-xs">Banreservas</span>
                  </div>

                  {/* BHD Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#008852]/10 border border-[#008852]/20 text-[#008852]">
                    <div className="w-5 h-5 rounded-md bg-[#008852] text-white font-black text-[9px] flex items-center justify-center">
                      BHD
                    </div>
                    <span className="font-extrabold text-xs">Banco BHD</span>
                  </div>

                  {/* Popular Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#003882]/10 border border-[#003882]/20 text-[#003882]">
                    <div className="w-5 h-5 rounded-md bg-[#003882] text-orange-400 font-black text-[9px] flex items-center justify-center">
                      ▲
                    </div>
                    <span className="font-extrabold text-xs">Popular</span>
                  </div>

                  <span className="text-slate-400 font-bold">➔</span>

                  {/* MonCash Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#E30613]/10 border border-[#E30613]/20 text-[#E30613]">
                    <div className="w-5 h-5 rounded-md bg-[#E30613] text-amber-300 font-black text-[9px] flex items-center justify-center">
                      MC
                    </div>
                    <span className="font-extrabold text-xs">MonCash</span>
                  </div>

                  {/* Natcash Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FF5900]/10 border border-[#FF5900]/20 text-[#FF5900]">
                    <div className="w-5 h-5 rounded-md bg-[#FF5900] text-white font-black text-[9px] flex items-center justify-center">
                      NC
                    </div>
                    <span className="font-extrabold text-xs">Natcash</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Calculator Card on Hero Right - Only calculator on public page */}
            <div className="lg:col-span-5" id="calculator">
              <div className="relative">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 via-amber-500 to-red-600 rounded-[2.8rem] blur-lg opacity-30" />
                <div className="relative bg-white rounded-[2.5rem] shadow-2xl border border-white/60 p-2 overflow-hidden">
                  <div className="p-3 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl mx-1.5 mt-1.5 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-xs">Calculadora Pública Oficial</span>
                    </div>
                    <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px] font-bold">
                      Tasa en Vivo
                    </Badge>
                  </div>

                  <CalculatorCard showBankLink={true} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION: CUENTAS BANCARIAS OFICIALES DOMINICANAS Y DE ESTADOS UNIDOS */}
      <section id="bancos-oficiales" className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 to-slate-900 text-white relative">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-amber-400 text-slate-950 font-black px-3.5 py-1 text-xs uppercase tracking-wider">
              Cuentas Oficiales para Recibir Dinero
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Cuentas en República Dominicana 🇩🇴 y Estados Unidos 🇺🇸
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Copia el número de cuenta o identificador con 1 solo clic. En RD transfiere vía ACH/Pagos al Instante BCRD (Banreservas, BHD, Popular). En USA envía en USD por <strong>Cash App</strong>, <strong>Zelle</strong> o <strong>PayPal</strong>.
            </p>
          </div>

          <OfficialBankAccountsCard />
        </div>
      </section>

      {/* SECTION: MAPA DE LA ISLA LA ESPAÑOLA (HISPANIOLA ISLAND MAP) */}
      <section id="mapa" className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white relative border-t border-slate-800">
        <div className="max-w-7xl mx-auto space-y-6">
          <HispaniolaIslandMap />
        </div>
      </section>

      {/* SECTION: BANCOS DOMINICANOS Y BILLETERAS DE HAITÍ */}
      <section id="bancos" className="bg-white border-y border-slate-200/80">
        <CorridorBanks />
      </section>

      {/* SECTION: ¿POR QUÉ HISPANIOLA PAY? (3 PILARES INTUITIVOS) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F4F7FC]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold px-3 py-1 text-xs">
              MÁXIMA TRANQUILIDAD
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              ¿Por qué somos la opción favorita de las familias?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Diseñado pensando en la comunidad dominico-haitiana con procesos simples, transparentes y seguros.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md hover:shadow-xl transition-all space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Zap className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Velocidad Instantánea</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Olvídate de esperar días laborables. El depósito se procesa en el acto mediante nuestra conexión directa a la API BenCash con entrega en menos de un minuto.
              </p>
              <div className="text-xs font-bold text-blue-700 flex items-center gap-1 pt-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Confirmación inmediata por SMS
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md hover:shadow-xl transition-all space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Coins className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Mejor Tasa de Cambio</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tus familiares en Haití reciben más Gourdes (HTG) por cada Peso Dominicano (DOP) o Dólar (USD). Tarifa plana clara sin comisiones sorpresa al momento de cobrar.
              </p>
              <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 pt-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% de lo prometido recibido
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md hover:shadow-xl transition-all space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Building2 className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Red de Agentes Autorizados</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Puntos de cobro y taquillas en toda la geografía dominicana y haitiana para depósitos en efectivo y retiros directos. ¿Tienes un comercio? ¡Conviértete en punto de pago oficial!
              </p>
              <div className="text-xs font-bold text-amber-800 flex items-center gap-1 pt-2">
                <Link href="/apply-agent" className="hover:underline flex items-center gap-1 font-bold text-blue-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Solicitar ser Agente HispaniolaPay →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: BILLETERA DIGITAL & BOLSILLO DE AHORRO PARA CLIENTES */}
      <section id="billetera" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-black px-3.5 py-1 text-xs uppercase tracking-wider">
              Nuevo Servicio para Clientes
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Tu Billetera Digital con <span className="text-emerald-400">Bolsillo de Ahorro</span>
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Crea tu cuenta en 1 minuto. Recarga saldo en efectivo en cualquiera de nuestros <strong>sub-agentes autorizados</strong> o transfiere desde tu banco dominicano. Envía al instante a <strong>MonCash y Natcash</strong> cuando lo necesites.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Card 1 */}
            <div className="bg-white/5 border border-white/10 hover:border-emerald-500/40 rounded-3xl p-7 backdrop-blur-sm transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Depósito en Sub-Agentes</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Presenta tu <strong>Código de Cliente único</strong> (ej. CLI-8821) en cualquier comercio o taquilla de nuestra red para recargar efectivo de inmediato.
              </p>
              <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Acreditación en tiempo real
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white/5 border border-white/10 hover:border-emerald-500/40 rounded-3xl p-7 backdrop-blur-sm transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-bold">
                <PiggyBank className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Bolsillo de Ahorro Seguro</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Separa tu dinero en un bolsillo protegido para emergencias familiares o metas. Pasa saldo entre tu billetera de envíos y tu ahorro con un solo toque.
              </p>
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 0% comisión por transferencias internas
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white/5 border border-white/10 hover:border-emerald-500/40 rounded-3xl p-7 backdrop-blur-sm transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-300 flex items-center justify-center font-bold">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Envíos Directos MonCash & Natcash</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Paga tus remesas utilizando el saldo disponible de tu billetera sin filas ni esperas. Tu familia en Haití recibe el dinero directamente en su móvil.
              </p>
              <div className="text-[11px] font-bold text-red-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Comprobante y trazabilidad total
              </div>
            </div>
          </div>

          {/* Action CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/login?tab=register&role=customer">
              <Button className="h-13 px-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl gap-2 shadow-lg shadow-emerald-500/25">
                <PiggyBank className="w-4 h-4" />
                Registrarme como Cliente con Billetera
              </Button>
            </Link>
            <Link href="/dashboard/wallet">
              <Button variant="outline" className="h-13 px-7 border-slate-700 hover:border-slate-600 bg-white/5 text-white font-bold text-sm rounded-2xl gap-2">
                <Wallet className="w-4 h-4 text-amber-400" />
                Ver Mi Billetera & Movimientos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* RATES SECTION */}
      <section id="rates" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-12">
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">{t('rates_title')}</h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
              {t('rates_desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-[#F8FAFC] p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                <Wallet className="w-7 h-7" />
              </div>
              <div className="text-3xl font-black text-slate-900">1.00 USD</div>
              <p className="text-xs font-bold text-slate-500 uppercase">Dólar Estadounidense (Base)</p>
            </div>

            <div className="bg-[#F8FAFC] p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 font-black text-lg">
                RD$
              </div>
              <div className="text-3xl font-black text-slate-900">58.50 DOP</div>
              <p className="text-xs font-bold text-slate-500 uppercase">Pesos Dominicanos por USD</p>
            </div>

            <div className="bg-[#F8FAFC] p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-700 font-black text-lg">
                HTG
              </div>
              <div className="text-3xl font-black text-slate-900">132.20 HTG</div>
              <p className="text-xs font-bold text-slate-500 uppercase">Gourdes por USD</p>
            </div>
          </div>

          <div className="flex justify-center items-center gap-2 text-xs text-slate-500">
            <RefreshCcw className="w-4 h-4 text-emerald-600 animate-spin-slow" />
            <span>{t('rates_updated')}</span>
          </div>
        </div>
      </section>

      {/* AGENTS NETWORK SECTION */}
      <section id="agents" className="py-24 bg-[#F4F7FC]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-900 border-blue-200 font-bold px-3 py-1 text-xs">
                PRESENCIA EN AMBOS PAÍSES
              </Badge>
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold px-3 py-1 text-xs">
                CONVOCATORIA ABIERTA
              </Badge>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">{t('agents_network_title')}</h2>
            <p className="text-base text-slate-600 max-w-2xl mx-auto">{t('agents_network_desc')}</p>
            <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
              <Link href="/apply-agent">
                <Button className="h-12 px-7 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-md shadow-amber-500/25 gap-2 group">
                  <Building2 className="w-4 h-4 text-slate-950" />
                  Solicitar ser Agente HispaniolaPay
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-200/80 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
                <Button 
                  onClick={() => { setSelectedCountry("DO"); setSelectedZone("all"); }}
                  variant={selectedCountry === "DO" ? "default" : "ghost"}
                  className={`flex-1 rounded-xl h-12 font-extrabold text-xs sm:text-sm ${
                    selectedCountry === "DO" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🇩🇴 Rep. Dominicana
                </Button>
                <Button 
                  onClick={() => { setSelectedCountry("HT"); setSelectedZone("all"); }}
                  variant={selectedCountry === "HT" ? "default" : "ghost"}
                  className={`flex-1 rounded-xl h-12 font-extrabold text-xs sm:text-sm ${
                    selectedCountry === "HT" ? "bg-red-600 text-white shadow-md" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🇭🇹 Haití
                </Button>
                <Button 
                  onClick={() => { setSelectedCountry("US"); setSelectedZone("all"); }}
                  variant={selectedCountry === "US" ? "default" : "ghost"}
                  className={`flex-1 rounded-xl h-12 font-extrabold text-xs sm:text-sm ${
                    selectedCountry === "US" ? "bg-emerald-700 text-white shadow-md" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🇺🇸 EE.UU.
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-4 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder={t('agents_search_placeholder')} 
                  className="pl-10 h-14 bg-slate-50 border-slate-200 rounded-2xl shadow-xs text-xs sm:text-sm font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="bg-slate-50 rounded-2xl shadow-xs border border-slate-200">
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger className="h-14 border-none rounded-2xl focus:ring-0 text-xs sm:text-sm font-medium">
                    <SelectValue placeholder={t('agents_zone_label')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('agents_zone_label')}</SelectItem>
                    {dynamicZones.map(z => (
                      <SelectItem key={z} value={z}>{z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {filteredAgents.map(agent => (
                <Card key={agent.id} className={`border shadow-sm hover:shadow-xl transition-all rounded-3xl overflow-hidden ${
                  agent.isHQ 
                    ? "bg-gradient-to-br from-amber-50 via-white to-amber-50/40 border-amber-300 shadow-md ring-1 ring-amber-400/30" 
                    : "bg-slate-50/50 border-slate-200/80"
                }`}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                        agent.isHQ ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20" : "bg-blue-50 text-blue-700"
                      }`}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <Badge className={
                        agent.isHQ 
                          ? "bg-amber-400 text-slate-950 font-black" 
                          : agent.country === "DO" ? "bg-blue-100 text-blue-800" : agent.country === "US" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }>
                        {agent.isHQ ? "★ SEDE CENTRAL" : agent.zone}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                        {agent.name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {agent.address}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        {agent.phone}
                      </div>
                      <a href="#mapa">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 p-0 h-auto font-bold text-xs gap-1">
                          {t('agents_view_map')} <ArrowRight className="w-3 h-3" />
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Card para Solicitar ser Agente en la Red */}
              <Card className="border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-amber-100/50 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
                <CardContent className="p-6 space-y-4 flex flex-col justify-between h-full">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-sm shadow-amber-400/30">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <Badge className="bg-amber-400 text-slate-950 font-black text-[10px]">
                        ¡ÚNETE A LA RED!
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        ¿Tienes un negocio o taquilla?
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        Monetiza tu establecimiento ofreciendo remesas directas a MonCash y NatCash con atractivas comisiones garantizadas por transacción.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-amber-200/60">
                    <Link href="/apply-agent" className="w-full block">
                      <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-10 gap-1.5 shadow-sm">
                        <Building2 className="w-3.5 h-3.5 text-amber-400" />
                        Solicitar ser Agente
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {filteredAgents.length === 0 && (
              <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-500 italic text-sm">No se encontraron agentes en esta zona con los criterios seleccionados.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* APPLY AS AGENT SECTION */}
      <section className="py-20 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px]" />
        <div className="max-w-5xl mx-auto px-4 text-center space-y-7 relative z-10">
          <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center mx-auto backdrop-blur-sm border border-white/20">
            <Building2 className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black">{t('agent_apply_section_title')}</h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t('agent_apply_section_desc')}
          </p>
          <Link href="/apply-agent">
            <Button className="h-14 px-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-amber-500/20 gap-2.5">
              {t('agent_apply_btn')} <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <AppLogo size="sm" />

            <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-slate-600 font-semibold">
              <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
              <Link href="/dashboard/haiti-remittances" className="hover:text-blue-600">Remesas Haití</Link>
              <Link href="/apply-agent" className="hover:text-amber-700 font-bold text-amber-600">Solicitar ser Agente</Link>
              <a href="#agents" className="hover:text-blue-600">Red de Agentes</a>
              <a href="#mapa" className="hover:text-blue-600">Mapa Hispaniola</a>
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitcher />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Hispaniola Pay Inc. Todos los derechos reservados. Corredor financiero binacional RD ⇄ Haití.</p>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Transacciones seguras cifradas con TLS y HMAC-SHA256</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
