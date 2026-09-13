"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { 
  getClientDeposits, 
  confirmDepositAndCreditWallet, 
  saveClientDeposit,
  addClientMovement,
  getClientWalletBalances,
  saveClientWalletBalances
} from "@/lib/client-wallet-service";
import { ClientDepositRecord } from "@/lib/types";
import { 
  Wallet, 
  PiggyBank, 
  CheckCircle2, 
  Clock, 
  Search, 
  Building2, 
  Landmark, 
  Plus, 
  DollarSign, 
  User, 
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

export function ClientWalletsAdminTab() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [deposits, setDeposits] = useState<ClientDepositRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  // Direct manual credit dialog
  const [isManualCreditOpen, setIsManualCreditOpen] = useState(false);
  const [clientCode, setClientCode] = useState("");
  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [targetPocket, setTargetPocket] = useState<"main" | "savings">("main");
  const [manualNotes, setManualNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadData = () => {
    setLoading(true);
    try {
      const all = getClientDeposits();
      setDeposits(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDeposits = useMemo(() => {
    return deposits.filter((dep) => {
      const matchesStatus = statusFilter === "all" || dep.status === statusFilter;
      const matchesMethod = methodFilter === "all" || dep.method === methodFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        dep.clientCode.toLowerCase().includes(q) ||
        dep.clientName.toLowerCase().includes(q) ||
        dep.id.toLowerCase().includes(q) ||
        (dep.voucherCode && dep.voucherCode.toLowerCase().includes(q)) ||
        (dep.bankReference && dep.bankReference.toLowerCase().includes(q));

      return matchesStatus && matchesMethod && matchesSearch;
    });
  }, [deposits, statusFilter, methodFilter, search]);

  // Metrics
  const metrics = useMemo(() => {
    const totalVolumeUSD = deposits
      .filter((d) => d.status === "completed")
      .reduce((acc, curr) => acc + curr.amountCreditedUSD, 0);

    const pendingCount = deposits.filter((d) => d.status === "pending").length;
    const completedCount = deposits.filter((d) => d.status === "completed").length;

    const subAgentVolume = deposits
      .filter((d) => d.method === "sub_agent" && d.status === "completed")
      .reduce((acc, curr) => acc + curr.amountCreditedUSD, 0);

    const bankVolume = deposits
      .filter((d) => d.method === "bank_transfer" && d.status === "completed")
      .reduce((acc, curr) => acc + curr.amountCreditedUSD, 0);

    return {
      totalVolumeUSD,
      pendingCount,
      completedCount,
      subAgentVolume,
      bankVolume,
    };
  }, [deposits]);

  const handleApproveDeposit = (depositId: string) => {
    const result = confirmDepositAndCreditWallet(depositId, user?.email || "Admin General");
    if (result.success) {
      toast({
        title: "¡Depósito Aprobado y Acreditado!",
        description: `Se acreditó a la billetera del cliente con éxito.`,
      });
      loadData();
    } else {
      toast({
        variant: "destructive",
        title: "Error al acreditar",
        description: result.message,
      });
    }
  };

  const handleDirectCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientCode.trim()) {
      toast({
        variant: "destructive",
        title: "Código requerido",
        description: "Ingresa el código o teléfono del cliente.",
      });
      return;
    }

    setProcessing(true);
    const cleanCode = clientCode.trim().toUpperCase();
    const depositId = `DEP-ADM-${Date.now().toString().slice(-4)}`;

    const newRecord: ClientDepositRecord = {
      id: depositId,
      clientId: cleanCode.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      clientName: `Cliente (${cleanCode})`,
      clientCode: cleanCode,
      amount: creditAmount,
      currency: "USD",
      amountCreditedUSD: creditAmount,
      method: "admin_manual",
      targetPocket,
      status: "completed",
      voucherCode: `ADM-${Date.now().toString().slice(-6)}`,
      notes: manualNotes.trim() || "Acreditación directa administrativa",
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      confirmedBy: user?.email || "Super Administrador",
    };

    saveClientDeposit(newRecord);

    // Add movement
    addClientMovement({
      id: `MOV-${Date.now().toString().slice(-6)}`,
      clientId: newRecord.clientId,
      type: "admin_credit",
      title: "Recarga Administrativa Directa",
      description: `Acreditación manual por Admin: +$${creditAmount.toFixed(2)} USD (${targetPocket === "savings" ? "Ahorro" : "Principal"})`,
      amountUSD: creditAmount,
      direction: "in",
      targetPocket,
      date: new Date().toISOString(),
      referenceId: depositId,
      status: "completed",
      receiptCode: newRecord.voucherCode,
    });

    // Save to client balance
    try {
      const existing = getClientWalletBalances(newRecord.clientId);
      const updated = {
        ...existing,
        clientCode: cleanCode,
        ...(targetPocket === "savings"
          ? { savingsBalance: Math.round((existing.savingsBalance + creditAmount) * 100) / 100 }
          : { walletBalance: Math.round((existing.walletBalance + creditAmount) * 100) / 100 }),
      };
      saveClientWalletBalances(newRecord.clientId, updated);
    } catch (_) {}

    setTimeout(() => {
      setProcessing(false);
      setIsManualCreditOpen(false);
      setClientCode("");
      setCreditAmount(100);
      setManualNotes("");
      loadData();
      toast({
        title: "Saldo Acreditado",
        description: `Se han sumado +$${creditAmount.toFixed(2)} USD a ${cleanCode}.`,
      });
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Acreditado a Clientes
            </CardDescription>
            <CardTitle className="text-2xl font-black text-slate-900 flex items-center justify-between">
              ${metrics.totalVolumeUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            {metrics.completedCount} depósitos completados
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Recargas por Sub-Agentes
            </CardDescription>
            <CardTitle className="text-2xl font-black text-amber-900 flex items-center justify-between">
              ${metrics.subAgentVolume.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            Efectivo recibido en ventanillas
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Transferencias Bancarias RD
            </CardDescription>
            <CardTitle className="text-2xl font-black text-blue-900 flex items-center justify-between">
              ${metrics.bankVolume.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            Banreservas, BHD y Popular
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pendientes de Confirmar
            </CardDescription>
            <CardTitle className="text-2xl font-black text-slate-900 flex items-center justify-between">
              {metrics.pendingCount}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${metrics.pendingCount > 0 ? "bg-amber-100 text-amber-700 animate-pulse" : "bg-slate-100 text-slate-500"}`}>
                <Clock className="w-4 h-4" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            Requieren verificación o comprobante
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-black text-slate-900">
                  Control de Depósitos & Billeteras de Clientes
                </CardTitle>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs">
                  Ahorro & Remesas
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Monitorea todos los depósitos en efectivo en sub-agentes, transferencias bancarias y aprueba acreditaciones en 1 clic.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="h-9 text-xs gap-1.5 border-slate-200"
              >
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                Actualizar
              </Button>

              <Button
                size="sm"
                onClick={() => setIsManualCreditOpen(true)}
                className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                Acreditar Saldo Manual
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por código (CLI-...), cliente o comprobante..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Canal de Ingreso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Canales</SelectItem>
                <SelectItem value="sub_agent">En Efectivo (Sub-Agentes)</SelectItem>
                <SelectItem value="bank_transfer">Transferencia Bancaria RD</SelectItem>
                <SelectItem value="admin_manual">Acreditación Administrativa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="pending">Pendientes de Confirmar</SelectItem>
                <SelectItem value="completed">Completados & Acreditados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[11px] font-bold">Fecha / ID</TableHead>
                  <TableHead className="text-[11px] font-bold">Cliente</TableHead>
                  <TableHead className="text-[11px] font-bold">Canal / Establecimiento</TableHead>
                  <TableHead className="text-[11px] font-bold">Monto Original</TableHead>
                  <TableHead className="text-[11px] font-bold">Acreditado (USD)</TableHead>
                  <TableHead className="text-[11px] font-bold">Bolsillo</TableHead>
                  <TableHead className="text-[11px] font-bold">Estado</TableHead>
                  <TableHead className="text-[11px] font-bold text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      Cargando registros de billeteras...
                    </TableCell>
                  </TableRow>
                ) : filteredDeposits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      No se encontraron depósitos con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeposits.map((dep) => (
                    <TableRow key={dep.id} className="hover:bg-slate-50/70 text-xs">
                      <TableCell className="font-mono text-[11px]">
                        <div className="font-bold text-slate-900">{dep.id}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(dep.createdAt).toLocaleDateString("es-DO", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-bold text-slate-900">{dep.clientName}</div>
                        <div className="font-mono text-[10px] text-blue-700 font-semibold">{dep.clientCode}</div>
                      </TableCell>

                      <TableCell>
                        {dep.method === "sub_agent" ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-semibold text-amber-900">
                              <Building2 className="w-3.5 h-3.5 text-amber-600" />
                              {dep.subAgentName || "Sub-Agente Autorizado"}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {dep.subAgentLocation || "Ventanilla de Cobro"}
                            </div>
                          </div>
                        ) : dep.method === "bank_transfer" ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-semibold text-blue-900">
                              <Landmark className="w-3.5 h-3.5 text-blue-600" />
                              {dep.bankName || "Transferencia Bancaria"}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              Ref: {dep.bankReference || "N/A"}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 font-semibold text-slate-800">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Acreditación Admin
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="font-semibold" suppressHydrationWarning>
                        {dep.amount.toLocaleString("en-US")} {dep.currency}
                      </TableCell>

                      <TableCell>
                        <strong className="text-emerald-700 font-bold">
                          +${dep.amountCreditedUSD.toFixed(2)} USD
                        </strong>
                      </TableCell>

                      <TableCell>
                        {dep.targetPocket === "savings" ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <PiggyBank className="w-3 h-3 text-emerald-600" /> Ahorro
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Wallet className="w-3 h-3 text-blue-600" /> Principal
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {dep.status === "completed" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Acreditado
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-600" /> Pendiente
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {dep.status === "pending" ? (
                          <Button
                            size="sm"
                            onClick={() => handleApproveDeposit(dep.id)}
                            className="h-7 px-2.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Aprobar
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {dep.voucherCode || "OK"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Manual Credit Dialog */}
      <Dialog open={isManualCreditOpen} onOpenChange={setIsManualCreditOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Acreditación Directa de Saldo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Recarga saldo administrativo en USD directamente a cualquier cliente registrado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDirectCredit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Código o Teléfono del Cliente</Label>
              <Input
                placeholder="Ej. CLI-8821 o +1 (829) 450-2211"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Monto en USD</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Number(e.target.value))}
                  className="text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Bolsillo Destino</Label>
                <Select value={targetPocket} onValueChange={(v: any) => setTargetPocket(v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Billetera Principal (Remesas)</SelectItem>
                    <SelectItem value="savings">Bolsillo de Ahorro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Motivo o Justificación</Label>
              <Input
                placeholder="Ej. Depósito en oficina central / Promoción de bienvenida"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsManualCreditOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={processing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                {processing ? "Acreditando..." : "Confirmar y Acreditar Saldo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
