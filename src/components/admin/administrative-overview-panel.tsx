"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ClientWalletsAdminTab } from "@/components/admin/client-wallets-admin-tab";
import { WalletTransferAdminCard } from "@/components/admin/wallet-transfer-admin-card";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  DollarSign,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

type ClientProfile = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  clientCode: string;
  role: "customer" | "agent";
  primaryCurrency: "USD" | "DOP" | "HTG";
  walletBalance: number;
  savingsBalance: number;
  remittanceFeePercent: number;
};

type SubAgentProfile = {
  id: string;
  name?: string;
  owner?: string;
  email?: string;
  phone?: string;
  status?: string;
  primaryCurrency?: "USD" | "DOP" | "HTG";
  localCurrency?: "USD" | "DOP" | "HTG";
  remittanceFeePercent?: number;
  commissionRatePercent?: number;
  walletBalance?: number;
  creditLimit?: number;
  location?: { country?: string; province?: string; municipality?: string };
};

type DepositRequest = {
  id: string;
  userId?: string;
  clientName?: string;
  clientCode?: string;
  clientEmail?: string;
  methodLabel?: string;
  amount?: number;
  currency?: string;
  amountCreditedUSD?: number;
  reference?: string;
  status?: "pending" | "completed" | "rejected";
  createdAt?: string;
};

const money = (value: unknown, currency: string) => {
  const amount = Number(value || 0);
  const symbol = currency === "DOP" ? "RD$" : currency === "HTG" ? "G" : "US$";
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const depositStatus = (status?: string) => {
  if (status === "completed") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Acreditado</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-800 border-red-200">Rechazado</Badge>;
  return <Badge className="bg-amber-100 text-amber-900 border-amber-200">Pendiente</Badge>;
};

export function AdministrativeOverviewPanel({ operationsOnly = false }: { operationsOnly?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [subAgents, setSubAgents] = useState<SubAgentProfile[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSubAgent, setNewSubAgent] = useState({ name: "", owner: "", email: "", phone: "" });

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [profilesResponse, subAgentsResponse, depositsResponse] = await Promise.all([
        fetch("/api/admin/profiles", { headers, cache: "no-store" }),
        fetch("/api/admin/sub-agents", { headers, cache: "no-store" }),
        fetch("/api/admin/deposits", { headers, cache: "no-store" }),
      ]);
      const [profilesData, subAgentsData, depositsData] = await Promise.all([
        profilesResponse.json(),
        subAgentsResponse.json(),
        depositsResponse.json(),
      ]);
      if (!profilesResponse.ok || !profilesData.success) throw new Error(profilesData.error || "No se pudieron cargar los clientes");
      if (!subAgentsResponse.ok || !subAgentsData.success) throw new Error(subAgentsData.error || "No se pudieron cargar los subagentes");
      if (!depositsResponse.ok || !depositsData.success) throw new Error(depositsData.error || "No se pudieron cargar los depósitos");
      setProfiles(profilesData.profiles || []);
      setSubAgents(subAgentsData.subAgents || []);
      setDeposits(depositsData.deposits || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo actualizar el panel administrativo");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reviewDeposit = async (id: string, action: "approve" | "reject") => {
    if (!user) return;
    const reason = action === "reject" ? window.prompt("Motivo del rechazo:", "No se pudo validar la referencia") || "" : "";
    if (action === "reject" && !reason) return;
    setProcessing(true);
    try {
      const response = await fetch("/api/admin/deposits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ id, action, reason }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "No se pudo revisar la solicitud");
      toast({ title: action === "approve" ? "Depósito aprobado" : "Depósito rechazado", description: action === "approve" ? "La billetera del cliente fue acreditada." : "La solicitud fue marcada como rechazada." });
      await loadData();
    } catch (reviewError) {
      toast({ variant: "destructive", title: "No se pudo procesar", description: reviewError instanceof Error ? reviewError.message : "Error inesperado" });
    } finally {
      setProcessing(false);
    }
  };

  const createSubAgent = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const id = `SA-${Date.now().toString().slice(-8)}`;
      const response = await fetch("/api/admin/sub-agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({
          subAgent: {
            id,
            ...newSubAgent,
            idNumber: "",
            status: "active",
            commissionRatePercent: 0,
            remittanceFeePercent: 8,
            primaryCurrency: "DOP",
            localCurrency: "DOP",
            walletBalance: 0,
            location: { country: "DO", province: "", municipality: "", exactAddress: "", gps: { lat: 0, lng: 0 } },
            modules: { haitiRemittances: true, sendMoney: true, payouts: false, qikInvoices: false, mobileTopups: false, accounting: false, reports: false, thermalReceipts: false },
            createdAt: new Date().toISOString(),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "No se pudo crear el subagente");
      toast({ title: "Subagente creado", description: `${newSubAgent.name} fue agregado con el código ${id}.` });
      setNewSubAgent({ name: "", owner: "", email: "", phone: "" });
      setCreateOpen(false);
      await loadData();
    } catch (createError) {
      toast({ variant: "destructive", title: "No se pudo crear", description: createError instanceof Error ? createError.message : "Error inesperado" });
    } finally {
      setProcessing(false);
    }
  };

  const clients = useMemo(() => profiles.filter((profile) => profile.role === "customer"), [profiles]);
  const q = search.trim().toLowerCase();
  const visibleClients = useMemo(() => clients.filter((profile) => !q || [profile.name, profile.email, profile.phone, profile.clientCode].some((value) => String(value || "").toLowerCase().includes(q))), [clients, q]);
  const visibleSubAgents = useMemo(() => subAgents.filter((agent) => !q || [agent.name, agent.owner, agent.email, agent.phone, agent.id, agent.location?.province, agent.location?.municipality].some((value) => String(value || "").toLowerCase().includes(q))), [subAgents, q]);
  const pendingDeposits = useMemo(() => deposits.filter((deposit) => deposit.status === "pending"), [deposits]);
  const pendingUSD = useMemo(() => pendingDeposits.reduce((total, deposit) => total + Number(deposit.amountCreditedUSD || 0), 0), [pendingDeposits]);
  const clientWalletUSD = useMemo(() => clients.filter((client) => client.primaryCurrency === "USD").reduce((total, client) => total + Number(client.walletBalance || 0), 0), [clients]);
  const clientWalletDOP = useMemo(() => clients.filter((client) => client.primaryCurrency === "DOP").reduce((total, client) => total + Number(client.walletBalance || 0), 0), [clients]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-blue-950 to-emerald-950 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              <ShieldCheck className="h-4 w-4" /> Centro de control administrativo
            </div>
            <h2 className="text-2xl font-black">Clientes, subagentes y depósitos</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">Consulta las cuentas registradas y revisa las solicitudes de depósito que acreditan las billeteras.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400"><UserPlus className="h-4 w-4" /> Crear subagente</Button>
            <Button onClick={loadData} disabled={loading} className="gap-2 bg-white text-slate-950 hover:bg-slate-100"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar información</Button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Clientes registrados</CardDescription><CardTitle className="flex items-center justify-between text-3xl font-black">{clients.length}<UserRound className="h-7 w-7 text-blue-600" /></CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">US${clientWalletUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })} · RD${clientWalletDOP.toLocaleString("en-US", { maximumFractionDigits: 2 })} en billeteras</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Subagentes registrados</CardDescription><CardTitle className="flex items-center justify-between text-3xl font-black">{subAgents.length}<Building2 className="h-7 w-7 text-purple-600" /></CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{subAgents.filter((agent) => agent.status !== "inactive").length} activos en la red</CardContent></Card>
        <Card className={pendingDeposits.length ? "border-amber-300 bg-amber-50/50" : ""}><CardHeader className="pb-2"><CardDescription>Depósitos pendientes</CardDescription><CardTitle className="flex items-center justify-between text-3xl font-black">{pendingDeposits.length}<Clock3 className={`h-7 w-7 text-amber-600 ${pendingDeposits.length ? "animate-pulse" : ""}`} /></CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Requieren validación del administrador</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Valor pendiente equivalente</CardDescription><CardTitle className="flex items-center justify-between text-3xl font-black">US${pendingUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}<DollarSign className="h-7 w-7 text-emerald-600" /></CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Comisión de depósito: 0%</CardContent></Card>
      </div>

      <Tabs defaultValue="summary" className="space-y-5">
        <TabsList className={`grid h-auto grid-cols-2 gap-1 bg-white p-1 shadow-sm ${operationsOnly ? "sm:grid-cols-4" : "sm:grid-cols-5"}`}>
          <TabsTrigger value="summary" className="gap-2"><Wallet className="h-4 w-4" /> Resumen</TabsTrigger>
          <TabsTrigger value="clients" className="gap-2"><Users className="h-4 w-4" /> Clientes ({clients.length})</TabsTrigger>
          <TabsTrigger value="subagents" className="gap-2"><Building2 className="h-4 w-4" /> Subagentes ({subAgents.length})</TabsTrigger>
          <TabsTrigger value="deposits" className="gap-2"><Clock3 className="h-4 w-4" /> Depósitos ({pendingDeposits.length})</TabsTrigger>
          {!operationsOnly && <TabsTrigger value="transfers" className="gap-2"><ArrowRight className="h-4 w-4" /> Transferencias</TabsTrigger>}
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div><CardTitle className="text-lg font-black">Solicitudes recientes</CardTitle><CardDescription>Depósitos enviados desde la aplicación móvil y la web.</CardDescription></div>
              <Badge className="bg-amber-100 text-amber-900">{pendingDeposits.length} pendientes</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Método</TableHead><TableHead>Monto</TableHead><TableHead>Referencia</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
                {deposits.slice(0, 8).map((deposit) => <TableRow key={deposit.id}>
                  <TableCell><div className="font-bold">{deposit.clientName || "Cliente"}</div><div className="text-[11px] text-muted-foreground">{deposit.clientCode || deposit.clientEmail}</div></TableCell>
                  <TableCell className="text-xs">{deposit.methodLabel || "Depósito"}</TableCell>
                  <TableCell className="font-bold">{money(deposit.amount, deposit.currency || "USD")}</TableCell>
                  <TableCell className="font-mono text-xs">{deposit.reference || "—"}</TableCell>
                  <TableCell>{depositStatus(deposit.status)}</TableCell>
                </TableRow>)}
                {!deposits.length && <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No hay solicitudes registradas.</TableCell></TableRow>}
              </TableBody></Table></div>
            </CardContent>
          </Card>
          {!operationsOnly && <div className="grid gap-3 md:grid-cols-2">
            <Link href="/dashboard/client-profiles"><Button variant="outline" className="h-12 w-full justify-between">Administrar perfiles de clientes <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link href="/dashboard/sub-agents"><Button variant="outline" className="h-12 w-full justify-between">Administrar red de subagentes <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>}
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="relative max-w-lg"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente por nombre, correo, teléfono o código" className="pl-9" /></div>
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Contacto</TableHead><TableHead>Moneda</TableHead><TableHead>Billetera</TableHead><TableHead>Ahorro</TableHead><TableHead>Tarifa</TableHead></TableRow></TableHeader><TableBody>
            {visibleClients.map((client) => <TableRow key={client.uid}><TableCell><div className="font-bold">{client.name || "Sin nombre"}</div><div className="font-mono text-[11px] text-muted-foreground">{client.clientCode || client.uid.slice(0, 10)}</div></TableCell><TableCell><div className="text-xs">{client.email}</div><div className="text-[11px] text-muted-foreground">{client.phone || "Sin teléfono"}</div></TableCell><TableCell><Badge variant="outline">{client.primaryCurrency}</Badge></TableCell><TableCell className="font-bold">{money(client.walletBalance, client.primaryCurrency)}</TableCell><TableCell>{money(client.savingsBalance, client.primaryCurrency)}</TableCell><TableCell>{Number(client.remittanceFeePercent || 0).toFixed(2)}%</TableCell></TableRow>)}
            {!visibleClients.length && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No se encontraron clientes.</TableCell></TableRow>}
          </TableBody></Table></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="subagents" className="space-y-4">
          <div className="relative max-w-lg"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar subagente, propietario o ubicación" className="pl-9" /></div>
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Subagente</TableHead><TableHead>Propietario</TableHead><TableHead>Ubicación</TableHead><TableHead>Estado</TableHead><TableHead>Moneda</TableHead><TableHead>Tarifa</TableHead></TableRow></TableHeader><TableBody>
            {visibleSubAgents.map((agent) => <TableRow key={agent.id}><TableCell><div className="font-bold">{agent.name || agent.id}</div><div className="font-mono text-[11px] text-muted-foreground">{agent.id}</div></TableCell><TableCell><div className="text-xs font-semibold">{agent.owner || "—"}</div><div className="text-[11px] text-muted-foreground">{agent.email || agent.phone}</div></TableCell><TableCell className="text-xs">{[agent.location?.municipality, agent.location?.province, agent.location?.country].filter(Boolean).join(", ") || "Sin ubicación"}</TableCell><TableCell><Badge className={agent.status === "inactive" ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"}>{agent.status === "inactive" ? "Inactivo" : "Activo"}</Badge></TableCell><TableCell><Badge variant="outline">{agent.primaryCurrency || agent.localCurrency || "DOP"}</Badge></TableCell><TableCell>{Number(agent.remittanceFeePercent ?? agent.commissionRatePercent ?? 0).toFixed(2)}%</TableCell></TableRow>)}
            {!visibleSubAgents.length && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No se encontraron subagentes.</TableCell></TableRow>}
          </TableBody></Table></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="deposits">
          {operationsOnly ? <Card><CardHeader><CardTitle>Solicitudes de depósito</CardTitle><CardDescription>Verifica la referencia antes de aprobar o rechazar cada solicitud.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Método</TableHead><TableHead>Monto</TableHead><TableHead>Referencia</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader><TableBody>
            {deposits.map((deposit) => <TableRow key={deposit.id}><TableCell><div className="font-bold">{deposit.clientName || "Cliente"}</div><div className="text-[11px] text-muted-foreground">{deposit.clientCode || deposit.clientEmail}</div></TableCell><TableCell>{deposit.methodLabel || "Depósito"}</TableCell><TableCell className="font-bold">{money(deposit.amount, deposit.currency || "USD")}</TableCell><TableCell className="font-mono text-xs">{deposit.reference || "—"}</TableCell><TableCell>{depositStatus(deposit.status)}</TableCell><TableCell className="text-right">{deposit.status === "pending" ? <div className="flex justify-end gap-1"><Button size="sm" disabled={processing} onClick={() => reviewDeposit(deposit.id, "approve")} className="bg-emerald-600"><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprobar</Button><Button size="sm" variant="outline" disabled={processing} onClick={() => reviewDeposit(deposit.id, "reject")} className="text-red-700"><XCircle className="mr-1 h-3.5 w-3.5" /> Rechazar</Button></div> : <span className="text-xs text-muted-foreground">Procesada</span>}</TableCell></TableRow>)}
            {!deposits.length && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No hay solicitudes registradas.</TableCell></TableRow>}
          </TableBody></Table></div></CardContent></Card> : <ClientWalletsAdminTab />}
        </TabsContent>
        {!operationsOnly && <TabsContent value="transfers"><WalletTransferAdminCard /></TabsContent>}
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crear subagente</DialogTitle><DialogDescription>Registra un nuevo establecimiento autorizado. Los datos podrán ser completados después por el administrador principal.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Nombre del negocio</Label><Input value={newSubAgent.name} onChange={(event) => setNewSubAgent((current) => ({ ...current, name: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Propietario</Label><Input value={newSubAgent.owner} onChange={(event) => setNewSubAgent((current) => ({ ...current, owner: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Correo</Label><Input type="email" value={newSubAgent.email} onChange={(event) => setNewSubAgent((current) => ({ ...current, email: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Teléfono</Label><Input value={newSubAgent.phone} onChange={(event) => setNewSubAgent((current) => ({ ...current, phone: event.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button onClick={createSubAgent} disabled={processing || !newSubAgent.name.trim() || !newSubAgent.owner.trim()}>{processing ? "Creando..." : "Crear subagente"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
