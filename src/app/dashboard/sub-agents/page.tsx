"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SubAgent } from "@/lib/types";
import { 
  loadSubAgentsFromStorage, 
  saveSubAgentsToStorage, 
  DEFAULT_SUB_AGENTS 
} from "@/lib/sub-agents-service";
import { SubAgentFormDialog } from "@/components/sub-agents/sub-agent-form-dialog";
import { SubAgentDetailDialog } from "@/components/sub-agents/sub-agent-detail-dialog";
import { ClientDepositCashierDialog } from "@/components/sub-agents/client-deposit-cashier-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { 
  Plus, 
  Users, 
  Search, 
  Percent, 
  Coins, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Eye, 
  Trash2, 
  Smartphone, 
  Send, 
  Wallet, 
  Receipt, 
  PhoneCall, 
  Calculator, 
  BarChart3, 
  ExternalLink,
  Navigation,
  RefreshCw,
  Building2,
  Filter,
  Check,
  AlertTriangle,
  Lock
} from "lucide-react";

export default function SubAgentsPage() {
  const { toast } = useToast();
  const { userProfile, user } = useAuth();
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Role check: Admin has full control; Sub-Agents are strictly read-only
  const [roleViewOverride, setRoleViewOverride] = useState<"auto" | "admin" | "sub_agent">("auto");
  const actualIsAdmin = userProfile?.role === "admin" || (!userProfile && user?.email?.includes("admin"));
  const isAdmin = roleViewOverride === "auto" ? actualIsAdmin : roleViewOverride === "admin";

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSubAgentForEdit, setSelectedSubAgentForEdit] = useState<SubAgent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSubAgentForDetail, setSelectedSubAgentForDetail] = useState<SubAgent | null>(null);
  const [isCashierOpen, setIsCashierOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadSubAgentsFromStorage();
    setSubAgents(loaded);
    setIsLoaded(true);
  }, []);

  // Save changes
  const updateListAndPersist = (updated: SubAgent[]) => {
    setSubAgents(updated);
    saveSubAgentsToStorage(updated);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = subAgents.length;
    const active = subAgents.filter((s) => s.status === "active").length;
    const avgCommission =
      total > 0
        ? subAgents.reduce((acc, curr) => acc + (curr.commissionRatePercent || 0), 0) / total
        : 0;

    const dopCount = subAgents.filter((s) => s.localCurrency === "DOP").length;
    const htgCount = subAgents.filter((s) => s.localCurrency === "HTG").length;
    const usdCount = subAgents.filter((s) => s.localCurrency === "USD").length;

    return {
      total,
      active,
      avgCommission: avgCommission.toFixed(2),
      dopCount,
      htgCount,
      usdCount,
    };
  }, [subAgents]);

  // Filtered List
  const filteredSubAgents = useMemo(() => {
    return subAgents.filter((sa) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        sa.name.toLowerCase().includes(query) ||
        sa.owner.toLowerCase().includes(query) ||
        sa.id.toLowerCase().includes(query) ||
        sa.phone.toLowerCase().includes(query) ||
        sa.location.province.toLowerCase().includes(query) ||
        sa.location.municipality.toLowerCase().includes(query) ||
        sa.location.exactAddress.toLowerCase().includes(query);

      const matchesCountry =
        countryFilter === "ALL" || sa.location.country === countryFilter;

      const matchesStatus =
        statusFilter === "ALL" || sa.status === statusFilter;

      const matchesCurrency =
        currencyFilter === "ALL" || sa.localCurrency === currencyFilter;

      const matchesModule =
        moduleFilter === "ALL" ||
        (moduleFilter === "haitiRemittances" && sa.modules.haitiRemittances) ||
        (moduleFilter === "sendMoney" && sa.modules.sendMoney) ||
        (moduleFilter === "payouts" && sa.modules.payouts) ||
        (moduleFilter === "qikInvoices" && sa.modules.qikInvoices) ||
        (moduleFilter === "mobileTopups" && sa.modules.mobileTopups) ||
        (moduleFilter === "accounting" && sa.modules.accounting);

      return matchesSearch && matchesCountry && matchesStatus && matchesCurrency && matchesModule;
    });
  }, [subAgents, searchQuery, countryFilter, statusFilter, currencyFilter, moduleFilter]);

  // Open creation dialog
  const handleOpenCreateDialog = () => {
    if (!isAdmin) {
      toast({
        title: "Permiso Denegado",
        description: "Los usuarios sub-agentes tienen acceso de solo lectura. Solo el Administrador Central puede crear nuevos puntos.",
        variant: "destructive",
      });
      return;
    }
    setSelectedSubAgentForEdit(null);
    setIsFormOpen(true);
  };

  // Open edit dialog
  const handleOpenEditDialog = (subAgent: SubAgent) => {
    if (!isAdmin) {
      toast({
        title: "Permiso Denegado",
        description: "Los usuarios sub-agentes no pueden modificar tasas ni configuraciones del sistema.",
        variant: "destructive",
      });
      return;
    }
    setSelectedSubAgentForEdit(subAgent);
    setIsFormOpen(true);
  };

  // Open detail dialog
  const handleOpenDetailDialog = (subAgent: SubAgent) => {
    setSelectedSubAgentForDetail(subAgent);
    setIsDetailOpen(true);
  };

  // Save (Create or Update)
  const handleSaveSubAgent = (subAgentData: Partial<SubAgent>) => {
    if (!isAdmin) {
      toast({
        title: "Acción no autorizada",
        description: "Los sub-agentes no pueden modificar ningún dato del sistema.",
        variant: "destructive",
      });
      return;
    }
    if (selectedSubAgentForEdit) {
      // Update
      const updated = subAgents.map((sa) =>
        sa.id === selectedSubAgentForEdit.id
          ? {
              ...sa,
              ...subAgentData,
              updatedAt: new Date().toISOString(),
            }
          : sa
      );
      updateListAndPersist(updated as SubAgent[]);
      toast({
        title: "Sub-Agente Actualizado",
        description: `Se han guardado los cambios para ${subAgentData.name || selectedSubAgentForEdit.name}.`,
      });
    } else {
      // Create new
      const newId = `SA-${Math.floor(100 + Math.random() * 900)}`;
      const newRecord: SubAgent = {
        ...(subAgentData as SubAgent),
        id: newId,
        createdAt: new Date().toISOString(),
      };
      const updated = [newRecord, ...subAgents];
      updateListAndPersist(updated);
      toast({
        title: "¡Sub-Agente Registrado!",
        description: `Se creó exitosamente el perfil comercial con ID ${newId}.`,
      });
    }
  };

  // Toggle status (Active / Suspended)
  const handleToggleStatus = (subAgent: SubAgent) => {
    if (!isAdmin) {
      toast({
        title: "Acceso Solo Lectura",
        description: "Los sub-agentes no tienen permisos para alternar el estado de los establecimientos.",
        variant: "destructive",
      });
      return;
    }
    const nextStatus = subAgent.status === "active" ? "suspended" : "active";
    const updated = subAgents.map((sa) =>
      sa.id === subAgent.id
        ? {
            ...sa,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          }
        : sa
    );
    updateListAndPersist(updated as SubAgent[]);
    toast({
      title: nextStatus === "active" ? "Sub-Agente Activado" : "Sub-Agente Suspendido",
      description: `${subAgent.name} ahora se encuentra en estado ${nextStatus === "active" ? "activo" : "suspendido"}.`,
    });

    if (selectedSubAgentForDetail && selectedSubAgentForDetail.id === subAgent.id) {
      setSelectedSubAgentForDetail({
        ...selectedSubAgentForDetail,
        status: nextStatus,
      });
    }
  };

  // Delete sub-agent
  const handleDeleteSubAgent = (id: string, name: string) => {
    if (!isAdmin) {
      toast({
        title: "Acceso Solo Lectura",
        description: "Los sub-agentes no tienen permisos para eliminar registros.",
        variant: "destructive",
      });
      return;
    }
    if (window.confirm(`¿Está seguro de eliminar al sub-agente "${name}" (${id})? Esta acción no se puede deshacer.`)) {
      const updated = subAgents.filter((sa) => sa.id !== id);
      updateListAndPersist(updated);
      toast({
        title: "Sub-Agente Eliminado",
        description: `Se ha retirado el registro de ${name}.`,
        variant: "destructive",
      });
    }
  };

  // Reset to sample defaults if empty
  const handleRestoreDefaults = () => {
    if (!isAdmin) {
      toast({
        title: "Acceso Solo Lectura",
        description: "Solo el Administrador puede restablecer los modelos de sub-agentes.",
        variant: "destructive",
      });
      return;
    }
    if (window.confirm("¿Desea restablecer la lista con los sub-agentes predeterminados de República Dominicana y Haití?")) {
      updateListAndPersist(DEFAULT_SUB_AGENTS);
      toast({
        title: "Sub-Agentes Restablecidos",
        description: "Se cargaron los establecimientos modelo con ubicación GPS y módulos configurados.",
      });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-primary">
              Gestión de Sub-Agentes
            </h1>
            <Badge className="bg-accent text-white font-bold text-xs px-2.5 py-0.5">
              Red Binacional
            </Badge>
            {!isAdmin && (
              <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-bold text-xs px-2.5 py-0.5 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" />
                Solo Lectura
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Administre los establecimientos autorizados, configure su tasa de beneficios (%), moneda local, ubicación GPS y módulos asignados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Role Mode Simulator */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-border text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-300 px-2 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Modo:
            </span>
            <button
              type="button"
              onClick={() => setRoleViewOverride("admin")}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors ${
                isAdmin
                  ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Admin (Configurador)
            </button>
            <button
              type="button"
              onClick={() => setRoleViewOverride("sub_agent")}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors flex items-center gap-1 ${
                !isAdmin
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="w-3 h-3" /> Sub-Agente
            </button>
          </div>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestoreDefaults}
              className="h-9 text-xs font-semibold gap-1.5 border-border bg-white hover:bg-secondary"
              title="Recargar sub-agentes de demostración"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden md:inline">Restablecer</span>
            </Button>
          )}

          <Button
            onClick={() => setIsCashierOpen(true)}
            className="h-9 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black gap-2 shadow-sm px-3.5 text-xs"
          >
            <Receipt className="w-4 h-4" />
            <span>Recibir Depósito de Cliente</span>
          </Button>

          {isAdmin ? (
            <Button
              onClick={handleOpenCreateDialog}
              className="h-9 bg-accent hover:bg-accent/90 text-white font-bold gap-2 shadow-sm px-4 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Sub-Agente</span>
            </Button>
          ) : (
            <Button
              disabled
              variant="outline"
              className="h-9 border-amber-300 bg-amber-50 text-amber-800 text-xs font-bold gap-2 cursor-not-allowed opacity-90"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Edición Bloqueada (Solo Admin)</span>
            </Button>
          )}
        </div>
      </div>

      {/* Non-admin notice */}
      {!isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-sm">Modo Sub-Agente: Restricción de Seguridad Activa</p>
              <p className="text-amber-800 text-xs mt-0.5">
                La norma general de tasas, beneficios y módulos es fijada exclusivamente por la Administración Central de Hispaniola Pay. Los sub-agentes no pueden modificar parámetros operativos.
              </p>
            </div>
          </div>
          <a href="/dashboard/reports" className="shrink-0">
            <Button size="sm" variant="outline" className="text-xs font-bold bg-white border-amber-300 text-amber-900 hover:bg-amber-100 shadow-xs">
              <BarChart3 className="w-3.5 h-3.5 mr-1 text-accent" /> Consultar Mis Beneficios
            </Button>
          </a>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Sub-Agentes
              </p>
              <h3 className="text-2xl font-black text-primary mt-1">{stats.total}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Red comercial en DO y HT
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Sub-Agentes Activos
              </p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% con operaciones habilitadas
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Tasa Beneficio Promedio
              </p>
              <h3 className="text-2xl font-black text-accent mt-1">
                {stats.avgCommission}%
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Comisión asignada por volumen
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <Percent className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Monedas Operativas
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-bold text-sm text-foreground">{stats.dopCount} DOP</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-bold text-sm text-foreground">{stats.htgCount} HTG</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-bold text-sm text-foreground">{stats.usdCount} USD</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Cajas en moneda local
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Coins className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-none shadow-md bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Listado de Sub-Agentes y Puntos Autorizados
              </CardTitle>
              <CardDescription className="text-xs">
                Controle las tasas de comisión, moneda base, coordenadas de geolocalización GPS y módulos permitidos.
              </CardDescription>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, ciudad, ID..."
                  className="pl-8 h-9 text-xs bg-secondary/30"
                />
              </div>

              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="h-9 text-xs bg-secondary/30 rounded-md border border-border px-2.5 font-medium"
              >
                <option value="ALL">Todos los países</option>
                <option value="DO">🇩🇴 Rep. Dominicana</option>
                <option value="HT">🇭🇹 Haití</option>
              </select>

              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                className="h-9 text-xs bg-secondary/30 rounded-md border border-border px-2.5 font-medium"
              >
                <option value="ALL">Todas las monedas</option>
                <option value="DOP">DOP (RD$)</option>
                <option value="HTG">HTG (G)</option>
                <option value="USD">USD ($)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 text-xs bg-secondary/30 rounded-md border border-border px-2.5 font-medium"
              >
                <option value="ALL">Todos los estados</option>
                <option value="active">Solo Activos</option>
                <option value="suspended">Solo Suspendidos</option>
                <option value="inactive">Solo Inactivos</option>
              </select>

              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="h-9 text-xs bg-secondary/30 rounded-md border border-border px-2.5 font-medium"
              >
                <option value="ALL">Todos los módulos</option>
                <option value="haitiRemittances">Con Remesas Haití</option>
                <option value="sendMoney">Con Envíos de Dinero</option>
                <option value="payouts">Con Pago en Ventanilla</option>
                <option value="qikInvoices">Con Facturas Qik</option>
                <option value="mobileTopups">Con Recargas Móviles</option>
                <option value="accounting">Con Contabilidad</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow className="text-xs">
                  <TableHead className="font-bold">Sub-Agente / ID</TableHead>
                  <TableHead className="font-bold">Responsable & Contacto</TableHead>
                  <TableHead className="font-bold">Tasa Beneficio (%)</TableHead>
                  <TableHead className="font-bold">Moneda Local & Balance</TableHead>
                  <TableHead className="font-bold">Ubicación & GPS</TableHead>
                  <TableHead className="font-bold">Módulos Habilitados</TableHead>
                  <TableHead className="font-bold">Estado</TableHead>
                  <TableHead className="font-bold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredSubAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                      No se encontraron sub-agentes que coincidan con los filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubAgents.map((sa) => {
                    const googleMapsUrl = `https://www.google.com/maps?q=${sa.location.gps.lat},${sa.location.gps.lng}`;
                    const activeModulesCount = Object.values(sa.modules).filter(Boolean).length;

                    return (
                      <TableRow key={sa.id} className="hover:bg-muted/30 text-xs">
                        {/* Sub-Agente / ID */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div
                                onClick={() => handleOpenDetailDialog(sa)}
                                className="font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <span>{sa.name}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {sa.id} • {sa.location.country === "DO" ? "🇩🇴 RD" : "🇭🇹 HT"}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Responsable & Contacto */}
                        <TableCell>
                          <div className="font-medium text-foreground">{sa.owner}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span>{sa.phone}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                            {sa.email}
                          </div>
                        </TableCell>

                        {/* Tasa en % de Beneficios */}
                        <TableCell>
                          <div className="inline-flex items-center gap-1 bg-accent/10 text-accent font-black text-xs px-2 py-0.5 rounded-md border border-accent/20">
                            <Percent className="w-3 h-3" />
                            <span>{sa.commissionRatePercent.toFixed(2)}%</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Margen por operación
                          </div>
                        </TableCell>

                        {/* Moneda Local & Balance */}
                        <TableCell>
                          <div className="flex items-center gap-1 font-bold text-foreground">
                            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4">
                              {sa.localCurrency}
                            </Badge>
                            <span suppressHydrationWarning>
                              {sa.localCurrency === "USD" ? "$" : sa.localCurrency === "DOP" ? "RD$ " : "G "}
                              {sa.walletBalance.toLocaleString("en-US")}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5" suppressHydrationWarning>
                            Crédito: {sa.localCurrency === "USD" ? "$" : sa.localCurrency === "DOP" ? "RD$ " : "G "}{(sa.creditLimit || 0).toLocaleString("en-US")}
                          </div>
                        </TableCell>

                        {/* Ubicación & GPS */}
                        <TableCell>
                          <div>
                            <span className="font-semibold text-foreground">
                              {sa.location.province}, {sa.location.municipality}
                            </span>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[170px]" title={sa.location.exactAddress}>
                              {sa.location.exactAddress}
                            </div>
                            <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline mt-0.5"
                              title="Abrir coordenadas GPS en Google Maps"
                            >
                              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                              <span className="font-mono">
                                {sa.location.gps.lat.toFixed(4)}, {sa.location.gps.lng.toFixed(4)}
                              </span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </TableCell>

                        {/* Módulos Habilitados */}
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap max-w-[150px]">
                            {sa.modules.haitiRemittances && (
                              <span title="Remesas a Haití (MonCash/NatCash)" className="p-1 rounded bg-red-50 text-red-700 border border-red-200">
                                <Smartphone className="w-3 h-3" />
                              </span>
                            )}
                            {sa.modules.sendMoney && (
                              <span title="Envíos de Dinero" className="p-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                <Send className="w-3 h-3" />
                              </span>
                            )}
                            {sa.modules.payouts && (
                              <span title="Pago de Remesas (Payouts)" className="p-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Wallet className="w-3 h-3" />
                              </span>
                            )}
                            {sa.modules.qikInvoices && (
                              <span title="Facturas Qik" className="p-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                <Receipt className="w-3 h-3" />
                              </span>
                            )}
                            {sa.modules.mobileTopups && (
                              <span title="Recargas Telefónicas" className="p-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                <PhoneCall className="w-3 h-3" />
                              </span>
                            )}
                            {sa.modules.accounting && (
                              <span title="Contabilidad y Arqueo" className="p-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                <Calculator className="w-3 h-3" />
                              </span>
                            )}
                            {sa.modules.reports && (
                              <span title="Reportes y Comisiones" className="p-1 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
                                <BarChart3 className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-1">
                            {activeModulesCount} módulos activos
                          </span>
                        </TableCell>

                        {/* Estado */}
                        <TableCell>
                          <Badge
                            variant="secondary"
                            onClick={() => isAdmin && handleToggleStatus(sa)}
                            className={`text-[10px] select-none ${
                              isAdmin ? "cursor-pointer" : "cursor-default"
                            } ${
                              sa.status === "active"
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300"
                                : sa.status === "suspended"
                                ? "bg-red-100 text-red-800 hover:bg-red-200 border-red-300"
                                : "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300"
                            }`}
                            title={isAdmin ? "Haz clic para alternar el estado" : "Estado fijado por administración central"}
                          >
                            {sa.status === "active" ? "Activo" : sa.status === "suspended" ? "Suspendido" : "Inactivo"}
                          </Badge>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDetailDialog(sa)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                              title="Ver ficha completa y mapa"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {isAdmin ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditDialog(sa)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                  title="Editar configuración"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSubAgent(sa.id, sa.name)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  title="Eliminar sub-agente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <span title="Edición bloqueada para sub-agentes" className="p-1 text-slate-400">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog for Creating and Editing */}
      <SubAgentFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        subAgentToEdit={selectedSubAgentForEdit}
        onSave={handleSaveSubAgent}
      />

      {/* Detail Dialog for Viewing Sub-Agent File */}
      <SubAgentDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        subAgent={selectedSubAgentForDetail}
        onEdit={(sa) => {
          setSelectedSubAgentForEdit(sa);
          setIsFormOpen(true);
        }}
        onToggleStatus={handleToggleStatus}
      />

      {/* Cashier Deposit Dialog for Sub-Agents */}
      <ClientDepositCashierDialog
        open={isCashierOpen}
        onOpenChange={setIsCashierOpen}
        subAgents={subAgents}
        onSuccess={() => {
          toast({
            title: "Operación de Caja Completada",
            description: "El saldo ha sido acreditado a la billetera del cliente.",
          });
        }}
      />
    </div>
  );
}
