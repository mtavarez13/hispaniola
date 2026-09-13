"use client"

import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  Smartphone, 
  Building2, 
  MapPin, 
  CheckCircle2,
  Star,
  Landmark,
  Phone,
  Layers,
  Compass,
  Navigation,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export interface CityNode {
  id: string
  name: string
  provinceOrDept: string
  country: "DO" | "HT"
  isHQ?: boolean
  x: number // percentage
  y: number // percentage
  tag: string
  description: string
  methods: string[]
  transferTime: string
  address?: string
}

export const CITIES_DATA: CityNode[] = [
  // SEDE CENTRAL / OFICINA PRINCIPAL (Dominican Republic)
  {
    id: "hq-matas",
    name: "Las Matas de Santa Cruz",
    provinceOrDept: "Monte Cristi, República Dominicana",
    country: "DO",
    isHQ: true,
    x: 42.5,
    y: 29.5,
    tag: "OFICINA PRINCIPAL / SEDE CENTRAL",
    description: "Sede Corporativa y Centro de Operaciones Binacionales de HispaniolaPay. Nodo estratégico en la Línea Noroeste con coordinación directa hacia la frontera norte (Dajabón - Ouanaminthe) y todo el país.",
    methods: ["Banreservas", "Banco BHD", "Banco Popular", "Caja Central", "Envío Directo MonCash & Natcash"],
    transferTime: "Inmediato (< 30 seg)",
    address: "Calle Principal #45, Las Matas de Santa Cruz, Prov. Monte Cristi, R.D."
  },
  // Dominican Republic Nodes
  {
    id: "sdq",
    name: "Santo Domingo",
    provinceOrDept: "Distrito Nacional, Rep. Dominicana",
    country: "DO",
    x: 62.0,
    y: 53.0,
    tag: "Hub Financiero Central",
    description: "Capital y centro bancario: Red nacional de agencias, transferencias ACH/LBTR desde Banreservas, BHD y Popular.",
    methods: ["Banreservas", "Banco BHD", "Banco Popular", "Efectivo"],
    transferTime: "< 1 minuto"
  },
  {
    id: "sti",
    name: "Santiago de los Caballeros",
    provinceOrDept: "Santiago, Rep. Dominicana",
    country: "DO",
    x: 52.5,
    y: 33.5,
    tag: "Corredor Norte Cibao",
    description: "Principal centro comercial del Cibao con alta afluencia de remesas hacia el norte y centro de Haití.",
    methods: ["Banreservas", "Banco Popular", "Banco BHD"],
    transferTime: "< 1 minuto"
  },
  {
    id: "daj",
    name: "Dajabón",
    provinceOrDept: "Dajabón (Frontera Norte), Rep. Dominicana",
    country: "DO",
    x: 39.5,
    y: 32.5,
    tag: "Punto Fronterizo Norte",
    description: "Paso internacional contiguo a Ouanaminthe. Conexión terrestre directa para el intercambio comercial y financiero.",
    methods: ["Banreservas", "Agentes Locales"],
    transferTime: "< 30 seg"
  },
  {
    id: "pop",
    name: "Puerto Plata",
    provinceOrDept: "Puerto Plata, Rep. Dominicana",
    country: "DO",
    x: 51.5,
    y: 22.0,
    tag: "Costa Atlántica",
    description: "Puntos de envío y recepción en la costa norte con soporte de banca electrónica.",
    methods: ["Banreservas", "Banco BHD"],
    transferTime: "< 1 minuto"
  },
  {
    id: "puj",
    name: "Punta Cana / Bávaro",
    provinceOrDept: "La Altagracia, Rep. Dominicana",
    country: "DO",
    x: 87.0,
    y: 46.5,
    tag: "Región Este",
    description: "Hub turístico y laboral con miles de trabajadores que envían soporte familiar mensualmente a Haití.",
    methods: ["Banco BHD", "Banco Popular", "Qik"],
    transferTime: "< 1 minuto"
  },

  // Haiti Nodes
  {
    id: "pap",
    name: "Port-au-Prince (Pòtoprens)",
    provinceOrDept: "Département de l'Ouest, Haïti",
    country: "HT",
    x: 29.0,
    y: 52.0,
    tag: "Capital y Hub Billeteras",
    description: "Recepción instantánea en billeteras móviles MonCash (Digicel) y Natcash (Natcom) con retiro en más de 6,000 agentes.",
    methods: ["MonCash", "Natcash", "Agentes Digicel"],
    transferTime: "Inmediato (SMS en segundos)"
  },
  {
    id: "cap",
    name: "Cap-Haïtien (Okap)",
    provinceOrDept: "Département du Nord, Haïti",
    country: "HT",
    x: 30.5,
    y: 24.5,
    tag: "Metrópoli del Norte",
    description: "Recepción directa en el norte de Haití conectada con la frontera de Dajabón y Las Matas de Santa Cruz.",
    methods: ["MonCash", "Natcash"],
    transferTime: "Inmediato"
  },
  {
    id: "oua",
    name: "Ouanaminthe (Wanament)",
    provinceOrDept: "Département du Nord-Est, Haïti",
    country: "HT",
    x: 37.5,
    y: 31.5,
    tag: "Frontera Nord-Est",
    description: "Recepción fronteriza inmediata frente a Dajabón. Sin demoras ni cargos de retiro abusivos.",
    methods: ["MonCash", "Natcash"],
    transferTime: "< 30 seg"
  },
  {
    id: "cay",
    name: "Les Cayes (Okay)",
    provinceOrDept: "Département du Sud, Haïti",
    country: "HT",
    x: 12.0,
    y: 56.5,
    tag: "Península Sur",
    description: "Acreditación directa a teléfonos móviles en el sur de Haití sin desplazamientos riesgosos.",
    methods: ["MonCash", "Natcash"],
    transferTime: "Inmediato"
  }
]

export function HispaniolaIslandMap() {
  const hqCity = CITIES_DATA.find(c => c.isHQ) || CITIES_DATA[0]
  const [activeCity, setActiveCity] = useState<CityNode>(hqCity)
  const [filterMode, setFilterMode] = useState<"all" | "hq" | "DO" | "HT">("all")
  const [viewStyle, setViewStyle] = useState<"3d" | "schematic">("3d")

  const filteredCities = CITIES_DATA.filter(city => {
    if (filterMode === "hq") return city.isHQ
    if (filterMode === "DO") return city.country === "DO"
    if (filterMode === "HT") return city.country === "HT"
    return true
  })

  return (
    <div className="relative w-full rounded-[2.5rem] bg-gradient-to-b from-[#102438] via-[#0D1D2E] to-[#08121C] p-5 sm:p-7 lg:p-9 text-white overflow-hidden shadow-2xl border border-slate-700/50">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION WITH HEADQUARTERS BADGE */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-lg shadow-amber-500/20 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
              SEDE CENTRAL: LAS MATAS DE SANTA CRUZ (R.D.)
            </Badge>
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-blue-400" /> Mapa 3D Isométrico de La Española
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            Corredor Binacional RD ⇄ Haití
          </h3>

          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Visualiza el relieve de la isla con nuestra <strong>Oficina Principal en Las Matas de Santa Cruz (Monte Cristi)</strong> conectando a los bancos de República Dominicana con las billeteras móviles de Haití.
          </p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Quick HQ Focus Button */}
          <Button
            onClick={() => setActiveCity(hqCity)}
            className="h-10 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <Landmark className="w-4 h-4 text-slate-950" />
            Ver Oficina Principal
          </Button>

          {/* Filter Pills */}
          <div className="flex items-center p-1 rounded-xl bg-white/10 border border-white/10 text-xs">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filterMode === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-300 hover:text-white"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterMode("hq")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                filterMode === "hq" ? "bg-amber-400 text-slate-950 shadow-sm" : "text-amber-300 hover:text-amber-200"
              }`}
            >
              ★ Sede
            </button>
            <button
              onClick={() => setFilterMode("DO")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filterMode === "DO" ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
              }`}
            >
              🇩🇴 RD
            </button>
            <button
              onClick={() => setFilterMode("HT")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filterMode === "HT" ? "bg-red-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
              }`}
            >
              🇭🇹 Haití
            </button>
          </div>
        </div>
      </div>

      {/* 3D ISOMETRIC STAGE (Matching the 3D relief requested by user) */}
      <div className="relative z-10 my-6">
        <div className="relative w-full aspect-[16/9] max-h-[560px] min-h-[360px] sm:min-h-[420px] rounded-3xl bg-gradient-to-b from-[#8EA1B2] via-[#7B92A4] to-[#688193] border-2 border-slate-600/40 p-2 sm:p-4 overflow-hidden shadow-2xl flex items-center justify-center select-none">
          
          {/* Studio lighting top-left reflection */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

          {/* 3D Extruded Relief Background of Hispaniola */}
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            <Image
              src="/images/hispaniola-3d-map.jpg"
              alt="Mapa 3D Isométrico de la Isla Hispaniola"
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.4)] transform scale-[1.02] sm:scale-100 transition-transform duration-700"
            />
          </div>

          {/* Dynamic SVG Vector Overlay for Laser Flow Beams & Animated Connections */}
          <svg
            viewBox="0 0 1000 562"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Beam from Las Matas HQ to Ouanaminthe / Haiti */}
              <linearGradient id="hqBeamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="1" />
                <stop offset="60%" stopColor="#10B981" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.8" />
              </linearGradient>

              {/* Laser glow */}
              <filter id="laserGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* LASER FLOW BEAMS FROM LAS MATAS DE SANTA CRUZ (HEADQUARTERS) */}
            {/* Las Matas (425, 166) -> Ouanaminthe (375, 177) */}
            <path
              d="M 425 166 Q 400 150, 375 177"
              fill="none"
              stroke="url(#hqBeamGrad)"
              strokeWidth="4"
              strokeDasharray="8 5"
              filter="url(#laserGlow)"
              className="animate-pulse"
            />

            {/* Las Matas (425, 166) -> Cap-Haïtien (305, 138) */}
            <path
              d="M 425 166 Q 360 120, 305 138"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="3"
              strokeDasharray="6 4"
              filter="url(#laserGlow)"
            />

            {/* Las Matas (425, 166) -> Port-au-Prince (290, 292) */}
            <path
              d="M 425 166 Q 340 210, 290 292"
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeDasharray="7 5"
              strokeOpacity="0.85"
            />

            {/* Santo Domingo (620, 298) -> Las Matas HQ (425, 166) */}
            <path
              d="M 620 298 Q 510 200, 425 166"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeDasharray="5 5"
              strokeOpacity="0.75"
            />

            {/* Santiago (525, 188) -> Las Matas HQ (425, 166) */}
            <path
              d="M 525 188 Q 475 160, 425 166"
              fill="none"
              stroke="#FBBF24"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              strokeOpacity="0.9"
            />

            {/* Moving particle along northern border corridor */}
            <circle cx="400" cy="165" r="4.5" fill="#FDE047" filter="url(#laserGlow)">
              <animate attributeName="r" values="3.5;6.5;3.5" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" repeatCount="indefinite" />
            </circle>

            {/* Frontera Norte Label on SVG */}
            <g transform="translate(370, 140)">
              <rect x="0" y="0" width="70" height="18" rx="9" fill="#0F172A" fillOpacity="0.8" stroke="#F59E0B" strokeWidth="1" />
              <text x="35" y="12" fill="#FBBF24" fontSize="8.5" fontWeight="900" textAnchor="middle">
                PASO NORTE
              </text>
            </g>
          </svg>

          {/* INTERACTIVE MARKERS LAYER (Overlay placed by coordinates on top of 3D image) */}
          <div className="absolute inset-0 z-20 pointer-events-auto">
            
            {/* SPECIAL FLAGSHIP MARKER: LAS MATAS DE SANTA CRUZ (OFICINA PRINCIPAL) */}
            <div
              style={{ left: "42.5%", top: "29.5%" }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 group"
              onClick={() => setActiveCity(hqCity)}
            >
              {/* Concentric Golden Radar Rings */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 -translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 rounded-full bg-amber-400/25 animate-ping pointer-events-none" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 -translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 rounded-full bg-amber-500/40 animate-pulse pointer-events-none" />

              {/* Pin Base & Beacon */}
              <div className="relative flex flex-col items-center">
                {/* Always-Visible Distinguished Headquarters Badge */}
                <div className="mb-1 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-[10px] sm:text-xs shadow-2xl border-2 border-white tracking-tight shrink-0 whitespace-nowrap animate-bounce">
                  <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                  <span>OFICINA PRINCIPAL</span>
                </div>

                {/* 3D Pin Head */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/50 border-2 border-white transform transition-transform group-hover:scale-125">
                  <Landmark className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                </div>

                {/* Subtitle Label */}
                <div className="mt-1 px-2 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-md border border-amber-400/40 text-white font-extrabold text-[9px] sm:text-[10px] tracking-wide whitespace-nowrap shadow-lg">
                  Las Matas de Santa Cruz
                </div>
              </div>
            </div>

            {/* OTHER CITIES PINS */}
            {filteredCities
              .filter(city => !city.isHQ)
              .map(city => {
                const isSelected = activeCity.id === city.id
                return (
                  <div
                    key={city.id}
                    style={{ left: `${city.x}%`, top: `${city.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
                    onClick={() => setActiveCity(city)}
                  >
                    <div className="relative flex flex-col items-center">
                      {/* Pulse circle if selected */}
                      {isSelected && (
                        <div className={`w-8 h-8 absolute -top-1 rounded-full animate-ping pointer-events-none ${
                          city.country === "DO" ? "bg-blue-400/50" : "bg-red-400/50"
                        }`} />
                      )}

                      {/* City Icon Marker */}
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all ${
                        city.country === "DO"
                          ? "bg-blue-600 group-hover:bg-blue-500"
                          : "bg-red-600 group-hover:bg-red-500"
                      } ${isSelected ? "scale-125 ring-2 ring-amber-400" : ""}`}>
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>

                      {/* City Label */}
                      <div className={`mt-1 px-1.5 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm border text-[9px] sm:text-[10px] font-bold whitespace-nowrap shadow-sm ${
                        city.country === "DO"
                          ? "border-blue-400/40 text-blue-100"
                          : "border-red-400/40 text-red-100"
                      }`}>
                        {city.name}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Compass Rose on Top Right */}
          <div className="absolute top-4 right-4 z-20 flex flex-col items-center bg-slate-950/60 backdrop-blur-md p-2 rounded-2xl border border-white/10 text-white shadow-lg pointer-events-none">
            <Navigation className="w-5 h-5 text-amber-400 -rotate-45" />
            <span className="text-[9px] font-black text-slate-300 mt-0.5">N</span>
          </div>

          {/* Bottom Watermark Legend */}
          <div className="absolute bottom-3 left-4 z-20 hidden sm:flex items-center gap-2 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-medium text-slate-300 pointer-events-none">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" /> Sede Central
            <span className="mx-1 text-slate-500">•</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" /> Rep. Dominicana
            <span className="mx-1 text-slate-500">•</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> Haití
          </div>
        </div>
      </div>

      {/* SELECTED NODE & HEADQUARTERS DETAIL CARD */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 mt-6">
        
        {/* ACTIVE LOCATION INFO CARD (8 Cols) */}
        <div className={`lg:col-span-8 rounded-3xl p-5 sm:p-6 border backdrop-blur-md transition-all shadow-xl ${
          activeCity.isHQ 
            ? "bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-blue-950/40 border-amber-400/40 shadow-amber-500/10" 
            : activeCity.country === "DO" 
              ? "bg-slate-900/85 border-blue-500/30" 
              : "bg-slate-900/85 border-red-500/30"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shrink-0 ${
                activeCity.isHQ
                  ? "bg-amber-500 text-slate-950 shadow-amber-500/30"
                  : activeCity.country === "DO"
                    ? "bg-blue-600 text-white shadow-blue-500/30"
                    : "bg-red-600 text-white shadow-red-500/30"
              }`}>
                {activeCity.isHQ ? <Star className="w-6 h-6 fill-slate-950 text-slate-950" /> : <MapPin className="w-6 h-6" />}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xl sm:text-2xl font-black text-white">{activeCity.name}</h4>
                  {activeCity.isHQ ? (
                    <Badge className="bg-amber-400 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full">
                      ★ OFICINA PRINCIPAL
                    </Badge>
                  ) : (
                    <Badge className={activeCity.country === "DO" ? "bg-blue-500 text-white" : "bg-red-500 text-white"}>
                      {activeCity.country === "DO" ? "🇩🇴 República Dominicana" : "🇭🇹 Haití"}
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">
                  {activeCity.provinceOrDept}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Tiempo de procesamiento
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-400 flex items-center sm:justify-end gap-1 mt-0.5">
                <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                {activeCity.transferTime}
              </span>
            </div>
          </div>

          <div className="py-4 space-y-3">
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {activeCity.description}
            </p>

            {activeCity.address && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-xs text-amber-200 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Dirección Física:</strong> {activeCity.address}
                </div>
              </div>
            )}

            {/* Channels Supported */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Canales Bancarios y Billeteras Disponibles:
              </span>
              <div className="flex flex-wrap gap-2">
                {activeCity.methods.map((method, i) => (
                  <span
                    key={i}
                    className="text-xs font-bold px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-white flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick CTA */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Operaciones auditadas y protegidas por protocolo binacional
            </span>

            <Link href="/dashboard/haiti-remittances" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-10 px-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-lg gap-2">
                Enviar Remesa a través de este nodo
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* HEADQUARTERS HIGHLIGHT MINI-PANEL (4 Cols) */}
        <div className="lg:col-span-4 rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border border-amber-400/30 flex flex-col justify-between shadow-xl space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/30">
              <Landmark className="w-5 h-5" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                CENTRO DE MANDO HISPANIOLAPAY
              </span>
              <h5 className="text-lg font-black text-white">
                Las Matas de Santa Cruz
              </h5>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Provincia Monte Cristi. Desde nuestra sede central coordinamos las transferencias diarias con los bancos de República Dominicana y las billeteras móviles en Haití.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Estado operativo:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Activo 24/7
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Paso fronterizo más cercano:</span>
                <span className="font-bold text-amber-300">Dajabón - Ouanaminthe</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Soporte central:</span>
                <span className="font-bold text-white">+1 (809) 579-0000</span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setActiveCity(hqCity)}
            variant="outline"
            className="w-full h-10 border-amber-400/40 text-amber-300 hover:bg-amber-400/10 font-bold text-xs rounded-xl gap-2 mt-2"
          >
            <Star className="w-3.5 h-3.5 fill-amber-300" />
            Enfocar Sede Central en el Mapa
          </Button>
        </div>

      </div>

      {/* FOOTER STATS STRIP */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-center">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
          <div className="text-amber-400 font-black text-base sm:text-lg">Las Matas de Santa Cruz</div>
          <div className="text-[11px] text-slate-400">Oficina Principal & Sede Central</div>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
          <div className="text-emerald-400 font-black text-base sm:text-lg">⚡ &lt; 30 Segundos</div>
          <div className="text-[11px] text-slate-400">Acreditación directa por API</div>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
          <div className="text-blue-400 font-black text-base sm:text-lg">🇩🇴 Banreservas • BHD • Popular</div>
          <div className="text-[11px] text-slate-400">Depósito bancario y ACH</div>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
          <div className="text-red-400 font-black text-base sm:text-lg">🇭🇹 MonCash & Natcash</div>
          <div className="text-[11px] text-slate-400">100% de cobertura en Haití</div>
        </div>
      </div>
    </div>
  )
}
