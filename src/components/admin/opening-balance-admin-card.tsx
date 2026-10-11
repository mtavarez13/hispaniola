"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Landmark, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

const CONFIRMATION = "BORRAR TODOS LOS SALDOS";

export function OpeningBalanceAdminCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState(0);
  const [current, setCurrent] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const headers = async () => ({ "Content-Type": "application/json", Authorization: `Bearer ${await user?.getIdToken()}` });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const response = await fetch("/api/admin/opening-balance", { headers: await headers(), cache: "no-store" });
      const data = await response.json();
      if (response.ok && data.success) { setAmount(Number(data.openingBalanceDOP || 0)); setCurrent(Number(data.currentOperatingBalanceDOP || 0)); }
    })().catch(() => undefined);
  }, [user]);

  const resetAll = async () => {
    setResetting(true);
    try {
      const response = await fetch("/api/admin/opening-balance", { method: "POST", headers: await headers(), body: JSON.stringify({ openingBalanceDOP: amount, confirmation }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "No se pudo reiniciar");
      setAmount(0); setCurrent(0); setDialogOpen(false); setConfirmation("");
      toast({ title: "Reinicio global aplicado", description: `${data.affectedUsers} usuarios, incluyendo administradores, y ${data.affectedSubAgents} subagentes quedaron en RD$0.00.` });
    } catch (error) { toast({ variant: "destructive", title: "No se realizó el reinicio", description: error instanceof Error ? error.message : "Error inesperado" }); }
    finally { setResetting(false); }
  };

  return <>
    <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-white">
      <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-amber-700" /> Reinicio general de balances</CardTitle><CardDescription>Control exclusivo del administrador principal. Las recargas posteriores se realizan desde Contabilidad.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-muted-foreground">Balance operativo actual</div><div className="text-2xl font-black text-emerald-700">RD${current.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <Button variant="destructive" onClick={() => setDialogOpen(true)} className="gap-2"><ShieldAlert className="h-4 w-4" /> Reiniciar todos los saldos a cero</Button>
      </CardContent>
    </Card>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="h-5 w-5" /> Acción irreversible</DialogTitle><DialogDescription>Esto colocará en cero la billetera, ahorro y beneficio acumulado de todos los usuarios, incluyendo administradores, además del balance de todos los subagentes y la cuenta principal.</DialogDescription></DialogHeader><div className="space-y-2"><Label>Escribe exactamente: <strong>{CONFIRMATION}</strong></Label><Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button variant="destructive" disabled={resetting || confirmation !== CONFIRMATION} onClick={resetAll}>{resetting ? "Reiniciando…" : "Confirmar reinicio global"}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
