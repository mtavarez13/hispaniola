"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, DollarSign, RefreshCw, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type WalletTransfer = {
  id: string;
  senderName?: string;
  senderEmail?: string;
  senderCode?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientCode?: string;
  recipientType?: string;
  amount?: number;
  sourceCurrency?: string;
  creditedAmount?: number;
  destinationCurrency?: string;
  dopPerUsd?: number;
  feeAmount?: number;
  feeUSD?: number;
  feePercent?: number;
  status?: string;
  createdAt?: string;
};

const currencyMoney = (amount: unknown, currency?: string) => `${currency === "DOP" ? "RD$" : "US$"}${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function WalletTransferAdminCard() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<WalletTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTransfers = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/transfers", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "No se pudieron cargar las transferencias");
      setTransfers(data.transfers || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las transferencias");
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadTransfers(); }, [loadTransfers]);
  const completed = useMemo(() => transfers.filter((item) => item.status === "completed"), [transfers]);
  const profitUSD = useMemo(() => completed.reduce((total, item) => total + Number(item.feeUSD || 0), 0), [completed]);
  const volumeUSD = useMemo(() => completed.reduce((total, item) => total + Number(item.sourceCurrency === "DOP" ? Number(item.amount || 0) / Number(item.dopPerUsd || 58.5) : item.amount || 0), 0), [completed]);

  return <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader className="pb-2"><CardDescription>Transferencias completadas</CardDescription><CardTitle className="flex items-center justify-between text-3xl">{completed.length}<ArrowRightLeft className="h-7 w-7 text-blue-600" /></CardTitle></CardHeader></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Volumen aproximado</CardDescription><CardTitle className="flex items-center justify-between text-3xl">US${volumeUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}<TrendingUp className="h-7 w-7 text-purple-600" /></CardTitle></CardHeader></Card>
      <Card className="border-emerald-300 bg-emerald-50/50"><CardHeader className="pb-2"><CardDescription>Beneficio por comisión 0.30%</CardDescription><CardTitle className="flex items-center justify-between text-3xl text-emerald-800">US${profitUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<DollarSign className="h-7 w-7" /></CardTitle></CardHeader></Card>
    </div>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Todos los movimientos internos</CardTitle><CardDescription>Transferencias entre clientes y subagentes, con su margen generado.</CardDescription></div><Button variant="outline" size="sm" onClick={loadTransfers} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar</Button></CardHeader>
      <CardContent className="p-0">
        {error && <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Origen</TableHead><TableHead>Destino</TableHead><TableHead>Monto</TableHead><TableHead>Acreditado</TableHead><TableHead>Beneficio</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
          {transfers.map((item) => <TableRow key={item.id}><TableCell className="whitespace-nowrap text-xs">{item.createdAt ? new Date(item.createdAt).toLocaleString("es-DO") : "—"}</TableCell><TableCell><div className="font-semibold">{item.senderName || "Cliente"}</div><div className="text-[11px] text-muted-foreground">{item.senderCode || item.senderEmail}</div></TableCell><TableCell><div className="font-semibold">{item.recipientName || "Destinatario"}</div><div className="text-[11px] text-muted-foreground">{item.recipientCode || item.recipientEmail} · {item.recipientType === "sub_agent" ? "Subagente" : "Cliente"}</div></TableCell><TableCell className="font-bold">{currencyMoney(item.amount, item.sourceCurrency)}</TableCell><TableCell className="font-bold text-emerald-700">{currencyMoney(item.creditedAmount, item.destinationCurrency)}</TableCell><TableCell><div className="font-bold">{currencyMoney(item.feeAmount, item.sourceCurrency)}</div><div className="text-[11px] text-muted-foreground">{Number(item.feePercent || 0).toFixed(2)}% · US${Number(item.feeUSD || 0).toFixed(2)}</div></TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-800">Completada</Badge></TableCell></TableRow>)}
          {!loading && !transfers.length && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Todavía no hay transferencias internas.</TableCell></TableRow>}
        </TableBody></Table></div>
      </CardContent>
    </Card>
  </div>;
}
