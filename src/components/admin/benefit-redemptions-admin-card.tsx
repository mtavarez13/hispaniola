"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Redemption = {
  id: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  primaryCurrency?: string;
  amountDOP?: number;
  creditedAmount?: number;
  redeemedBy?: string;
  createdAt?: string;
};

export function BenefitRedemptionsAdminCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Redemption[]>([]);
  const [totalDOP, setTotalDOP] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/benefit-redemptions", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "No se pudo cargar el historial");
      setRows(data.redemptions || []);
      setTotalDOP(Number(data.summary?.totalDOP || 0));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  return (
    <Card className="border-amber-200 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-amber-700" /> Historial general de canjes</CardTitle>
          <CardDescription>Cada canje coloca el beneficio acumulado en cero y acredita su equivalente en la billetera.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualizar</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2"><Badge variant="outline">{rows.length} canjes</Badge><Badge className="bg-amber-700">RD${totalDOP.toLocaleString("en-US", { minimumFractionDigits: 2 })} canjeados</Badge></div>
        {error ? <p className="text-sm text-red-600">{error}</p> : rows.length === 0 && !loading ? <p className="text-sm text-muted-foreground">Todavía no existen canjes registrados.</p> : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Usuario</TableHead><TableHead>Tipo</TableHead><TableHead>Beneficio</TableHead><TableHead>Balance acreditado</TableHead><TableHead>Canjeado por</TableHead></TableRow></TableHeader>
              <TableBody>{rows.map((item) => <TableRow key={item.id}>
                <TableCell className="whitespace-nowrap text-xs">{item.createdAt ? new Date(item.createdAt).toLocaleString("es-DO") : "—"}</TableCell>
                <TableCell><div className="font-semibold">{item.userName || "Usuario"}</div><div className="text-xs text-muted-foreground">{item.userEmail}</div></TableCell>
                <TableCell><Badge variant="outline">{item.userRole === "agent" ? "Subagente" : "Cliente"}</Badge></TableCell>
                <TableCell className="font-bold text-amber-800">RD${Number(item.amountDOP || 0).toFixed(2)}</TableCell>
                <TableCell className="font-bold">{item.primaryCurrency || "DOP"} {Number(item.creditedAmount || 0).toFixed(2)}</TableCell>
                <TableCell className="text-xs">{item.redeemedBy === "self" ? "Usuario" : item.redeemedBy || "Administración"}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
