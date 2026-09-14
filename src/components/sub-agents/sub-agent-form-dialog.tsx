"use client";

import React, { useState, useEffect } from "react";
import { SubAgent, SubAgentModules, SubAgentLocation } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GpsLocationPicker } from "./gps-location-picker";
import { ModuleSelector } from "./module-selector";
import { 
  DOMINICAN_REPUBLIC_PROVINCES, 
  HAITI_DEPARTMENTS 
} from "@/lib/geo-data";
import { 
  Building2, 
  Percent, 
  Coins, 
  MapPin, 
  ShieldCheck, 
  User, 
  Lock, 
  Wallet,
  Check,
  HelpCircle
} from "lucide-react";

interface SubAgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subAgentToEdit?: SubAgent | null;
  onSave: (subAgentData: Partial<SubAgent>) => void;
}

const DEFAULT_MODULES: SubAgentModules = {
  haitiRemittances: true,
  sendMoney: true,
  payouts: true,
  qikInvoices: true,
  mobileTopups: true,
  accounting: false,
  reports: true,
};

export function SubAgentFormDialog({
  open,
  onOpenChange,
  subAgentToEdit,
  onSave,
}: SubAgentFormDialogProps) {
  const isEditing = Boolean(subAgentToEdit);
  const [activeTab, setActiveTab] = useState<string>("general");

  // Form State
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "suspended">("active");

  // Configuración Financiera y Beneficios
  const [commissionRatePercent, setCommissionRatePercent] = useState<number>(2.5);
  const [localCurrency, setLocalCurrency] = useState<"DOP" | "HTG" | "USD">("DOP");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [creditLimit, setCreditLimit] = useState<number>(0);

  // Ubicación
  const [country, setCountry] = useState<"DO" | "HT">("DO");
  const [province, setProvince] = useState<string>("Distrito Nacional");
  const [municipality, setMunicipality] = useState<string>("Santo Domingo Centro");
  const [exactAddress, setExactAddress] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [gpsLat, setGpsLat] = useState<number>(18.4861);
  const [gpsLng, setGpsLng] = useState<number>(-69.9312);
  const [gpsAddressResolved, setGpsAddressResolved] = useState<string>("");

  // Módulos
  const [modules, setModules] = useState<SubAgentModules>(DEFAULT_MODULES);
  const [notes, setNotes] = useState("");

  // Populate when editing
  useEffect(() => {
    if (subAgentToEdit) {
      setName(subAgentToEdit.name || "");
      setOwner(subAgentToEdit.owner || "");
      setIdNumber(subAgentToEdit.idNumber || "");
      setEmail(subAgentToEdit.email || "");
      setPassword(subAgentToEdit.password || "");
      setPhone(subAgentToEdit.phone || "");
      setStatus(subAgentToEdit.status || "active");

      setCommissionRatePercent(subAgentToEdit.commissionRatePercent ?? 2.5);
      setLocalCurrency(subAgentToEdit.localCurrency || "DOP");
      setWalletBalance(subAgentToEdit.walletBalance ?? 0);
      setCreditLimit(subAgentToEdit.creditLimit ?? 0);

      if (subAgentToEdit.location) {
        setCountry(subAgentToEdit.location.country || "DO");
        setProvince(subAgentToEdit.location.province || "Distrito Nacional");
        setMunicipality(subAgentToEdit.location.municipality || "");
        setExactAddress(subAgentToEdit.location.exactAddress || "");
        setReference(subAgentToEdit.location.reference || "");
        if (subAgentToEdit.location.gps) {
          setGpsLat(subAgentToEdit.location.gps.lat ?? 18.4861);
          setGpsLng(subAgentToEdit.location.gps.lng ?? -69.9312);
          setGpsAddressResolved(subAgentToEdit.location.gps.addressResolved || "");
        }
      }

      setModules(subAgentToEdit.modules || DEFAULT_MODULES);
      setNotes(subAgentToEdit.notes || "");
    } else {
      // Reset to fresh form
      setName("");
      setOwner("");
      setIdNumber("");
      setEmail("");
      setPassword("Pass" + Math.floor(1000 + Math.random() * 9000) + "!");
      setPhone("");
      setStatus("active");

      setCommissionRatePercent(2.5);
      setLocalCurrency("DOP");
      setWalletBalance(0);
      setCreditLimit(0);

      setCountry("DO");
      setProvince("Distrito Nacional");
      setMunicipality("Santo Domingo Centro");
      setExactAddress("");
      setReference("");
      setGpsLat(18.4861);
      setGpsLng(-69.9312);
      setGpsAddressResolved("");

      setModules(DEFAULT_MODULES);
      setNotes("");
    }
  }, [subAgentToEdit, open]);

  // Handle Country change
  const handleCountryChange = (newCountry: "DO" | "HT") => {
    setCountry(newCountry);
    if (newCountry === "DO") {
      setLocalCurrency("DOP");
      const defaultProv = "Distrito Nacional";
      setProvince(defaultProv);
      const provData = DOMINICAN_REPUBLIC_PROVINCES[defaultProv];
      if (provData) {
        setMunicipality(provData.municipalities[0] || "");
        setGpsLat(provData.defaultGps.lat);
        setGpsLng(provData.defaultGps.lng);
      }
    } else {
      setLocalCurrency("HTG");
      const defaultDept = "Ouest";
      setProvince(defaultDept);
      const deptData = HAITI_DEPARTMENTS[defaultDept];
      if (deptData) {
        setMunicipality(deptData.municipalities[0] || "");
        setGpsLat(deptData.defaultGps.lat);
        setGpsLng(deptData.defaultGps.lng);
      }
    }
  };

  // Handle Province change
  const handleProvinceChange = (newProvince: string) => {
    setProvince(newProvince);
    const data = country === "DO" 
      ? DOMINICAN_REPUBLIC_PROVINCES[newProvince] 
      : HAITI_DEPARTMENTS[newProvince];
    if (data) {
      setMunicipality(data.municipalities[0] || "");
      setGpsLat(data.defaultGps.lat);
      setGpsLng(data.defaultGps.lng);
    }
  };

  // Provinces list based on selected country
  const currentDivisions = country === "DO" 
    ? DOMINICAN_REPUBLIC_PROVINCES 
    : HAITI_DEPARTMENTS;

  const currentMunicipalities = currentDivisions[province]?.municipalities || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const locationData: SubAgentLocation = {
      country,
      province,
      municipality,
      exactAddress: exactAddress || `${province}, ${municipality}`,
      reference,
      gps: {
        lat: Number(gpsLat) || 18.4861,
        lng: Number(gpsLng) || -69.9312,
        addressResolved: gpsAddressResolved || `${municipality}, ${province}`,
      },
    };

    onSave({
      name: name || "Nuevo Sub-Agente",
      owner: owner || "Responsable Autorizado",
      idNumber: idNumber || "N/A",
      email: email || `agente_${Date.now()}@hispaniolapay.com`,
      password,
      phone: phone || "+1 (809) 000-0000",
      status,
      commissionRatePercent: Number(commissionRatePercent) || 2.5,
      localCurrency,
      walletBalance: Number(walletBalance) || 0,
      creditLimit: Number(creditLimit) || 0,
      location: locationData,
      modules,
      notes,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 !bg-white !opacity-100 border border-slate-200 shadow-2xl text-slate-900 rounded-xl">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-primary">
                  {isEditing ? `Editar Sub-Agente (${subAgentToEdit?.id})` : "Registrar Nuevo Sub-Agente"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Configure comisiones, moneda, ubicación física con coordenadas GPS y permisos de módulos.
                </DialogDescription>
              </div>
            </div>
            {isEditing && (
              <Badge variant="outline" className="font-mono text-xs">
                {subAgentToEdit?.id}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-11 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-border">
              <TabsTrigger value="general" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <User className="w-3.5 h-3.5" />
                <span>Datos Básicos</span>
              </TabsTrigger>
              <TabsTrigger value="finance" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <Percent className="w-3.5 h-3.5 text-accent" />
                <span>Beneficios & Moneda</span>
              </TabsTrigger>
              <TabsTrigger value="location" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>Ubicación & GPS</span>
              </TabsTrigger>
              <TabsTrigger value="modules" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Módulos ({Object.values(modules).filter(Boolean).length})</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: DATOS BÁSICOS & CREDENCIALES */}
            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                    Nombre Comercial del Negocio *
                  </Label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Agencia Fronteriza Dajabón / Minimarket San Pedro"
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Dueño o Responsable Legal *
                  </Label>
                  <Input
                    required
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Ej: Juan Carlos Martínez / Marie Lebrun"
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Cédula, RNC o NIF *
                  </Label>
                  <Input
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="044-0019283-4 o NIF"
                    className="h-10 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Teléfono / WhatsApp *
                  </Label>
                  <Input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (809) 555-0199 o +509..."
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Estado Operativo
                  </Label>
                  <Select
                    value={status}
                    onValueChange={(val: "active" | "inactive" | "suspended") => setStatus(val)}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo (Habilitado)</SelectItem>
                      <SelectItem value="suspended">Suspendido (Pausado)</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" />
                  Credenciales de Acceso para el Subagente
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Email de Inicio de Sesión</Label>
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="subagente@hispaniolapay.com"
                      className="h-9 text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Contraseña Provisoria</Label>
                    <Input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contraseña segura"
                      className="h-9 text-xs font-mono bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Notas Administrativas / Observaciones</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Información sobre límite de crédito acordado, referencias bancarias, etc."
                  className="h-16 text-xs resize-none"
                />
              </div>
            </TabsContent>

            {/* TAB 2: CONFIGURACIÓN FINANCIERA (TASA % BENEFICIOS & MONEDA LOCAL) */}
            <TabsContent value="finance" className="space-y-5 pt-4">
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-accent" />
                  <h4 className="text-sm font-bold text-foreground">
                    Configuración de Beneficios y Comisión del Subagente
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Establezca el porcentaje exacto de ganancia que recibirá este subagente por cada operación procesada en ventanilla o plataforma.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Tasa en % de Beneficios (Comisión) *
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        max="100"
                        required
                        value={commissionRatePercent}
                        onChange={(e) => setCommissionRatePercent(parseFloat(e.target.value) || 0)}
                        placeholder="Ej: 2.50"
                        className="h-11 text-base font-bold pl-3 pr-9 font-mono text-primary"
                      />
                      <span className="absolute right-3 top-3 text-sm font-bold text-accent">%</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Rango habitual en red binacional: 1.50% - 4.00%
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-primary" /> Moneda Local del Subagente *
                    </Label>
                    <Select
                      value={localCurrency}
                      onValueChange={(val: "DOP" | "HTG" | "USD") => setLocalCurrency(val)}
                    >
                      <SelectTrigger className="h-11 text-sm font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DOP">🇩🇴 DOP - Peso Dominicano (RD$)</SelectItem>
                        <SelectItem value="HTG">🇭🇹 HTG - Gourde Haitiano (G)</SelectItem>
                        <SelectItem value="USD">🇺🇸 USD - Dólar Estadounidense ($)</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[11px] text-muted-foreground">
                      Moneda con la que el subagente realiza arqueos y pagos locales
                    </span>
                  </div>
                </div>

                {/* Simulador de beneficio en tiempo real */}
                <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-accent shrink-0" />
                    <div>
                      <span className="font-bold text-foreground">Ejemplo de Ganancia Proyectada:</span>
                      <p className="text-muted-foreground text-[11px]">
                        Por una operación de 10,000 {localCurrency} con tasa de {commissionRatePercent.toFixed(2)}%:
                      </p>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-accent text-sm sm:text-right shrink-0">
                    +{(10000 * (commissionRatePercent / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {localCurrency}
                  </div>
                </div>
              </div>

              {/* Fondo operativo y Límites */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    Fondo Operativo Inicial ({localCurrency})
                  </Label>
                  <Input
                    type="number"
                    value={walletBalance}
                    onChange={(e) => setWalletBalance(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-10 text-sm font-mono"
                  />
                  <span className="text-[11px] text-amber-700 font-medium block">
                    ⚡ Por directiva de lanzamiento, las nuevas cuentas inician en balance 0. Solo el Administrador puede acreditar saldo.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Límite de Crédito Autorizado ({localCurrency})
                  </Label>
                  <Input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-10 text-sm font-mono"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Monto máximo en descubierto permitido por la administración
                  </span>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: UBICACIÓN GEOGRÁFICA Y GPS */}
            <TabsContent value="location" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">País de la Sucursal *</Label>
                  <Select
                    value={country}
                    onValueChange={(val: "DO" | "HT") => handleCountryChange(val)}
                  >
                    <SelectTrigger className="h-10 text-sm font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DO">🇩🇴 República Dominicana</SelectItem>
                      <SelectItem value="HT">🇭🇹 Haití</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    {country === "DO" ? "Provincia *" : "Département *"}
                  </Label>
                  <Select
                    value={province}
                    onValueChange={handleProvinceChange}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(currentDivisions).map((prov) => (
                        <SelectItem key={prov} value={prov}>
                          {prov}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    {country === "DO" ? "Municipio *" : "Commune *"}
                  </Label>
                  <Select
                    value={municipality}
                    onValueChange={(val) => setMunicipality(val)}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentMunicipalities.map((mun) => (
                        <SelectItem key={mun} value={mun}>
                          {mun}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Dirección Exacta (Calle, Número, Edificio, Local) *
                  </Label>
                  <Input
                    required
                    value={exactAddress}
                    onChange={(e) => setExactAddress(e.target.value)}
                    placeholder="Ej: Calle Duarte #45, Edif. Colonial, Local 2B"
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Punto de Referencia
                  </Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ej: Frente al Parque Central o a 50m de la Parada de Autobuses"
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Coordenadas GPS y Mapa */}
              <GpsLocationPicker
                lat={gpsLat}
                lng={gpsLng}
                addressResolved={gpsAddressResolved}
                province={province}
                municipality={municipality}
                onChange={({ lat, lng, addressResolved }) => {
                  setGpsLat(lat);
                  setGpsLng(lng);
                  if (addressResolved) setGpsAddressResolved(addressResolved);
                }}
              />
            </TabsContent>

            {/* TAB 4: MÓDULOS A USAR */}
            <TabsContent value="modules" className="space-y-4 pt-4">
              <ModuleSelector
                modules={modules}
                onChange={(updated) => setModules(updated)}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Paso rápido:</span>
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={`hover:underline ${activeTab === "general" ? "font-bold text-primary" : ""}`}
              >
                1. Datos
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setActiveTab("finance")}
                className={`hover:underline ${activeTab === "finance" ? "font-bold text-primary" : ""}`}
              >
                2. Beneficios
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setActiveTab("location")}
                className={`hover:underline ${activeTab === "location" ? "font-bold text-primary" : ""}`}
              >
                3. Ubicación & GPS
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setActiveTab("modules")}
                className={`hover:underline ${activeTab === "modules" ? "font-bold text-primary" : ""}`}
              >
                4. Módulos
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white font-bold gap-1.5 shadow-sm px-5"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? "Guardar Cambios" : "Crear Sub-Agente"}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
