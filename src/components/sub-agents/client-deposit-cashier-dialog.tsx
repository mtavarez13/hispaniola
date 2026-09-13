"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SubAgent } from "@/lib/types";
import { useSystemSettings } from "@/lib/settings-context";
import { 
  Building2, 
  CheckCircle2, 
  QrCode, 
  DollarSign, 
  User, 
  Receipt, 
  Loader2,
  Wallet,
  PiggyBank
} from "lucide-react";
import { 
  saveClientDeposit, 
  confirmDepositAndCreditWallet, 
  addClientMovement,
  getClientWalletBalances,
  saveClientWalletBalances
} from "@/lib/client-wallet-service";
import { ClientDepositRecord } from "@/lib/types";

interface ClientDepositCashierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subAgents: SubAgent[];
  currentSubAgent?: SubAgent;
  onSuccess?: () => void;
}

export function ClientDepositCashierDialog({
  open,
  onOpenChange,
  subAgents,
  currentSubAgent,
  onSuccess,
}: ClientDepositCashierDialogProps) {
  const { toast } = useToast();
  const { settings } = useSystemSettings();
  const rateDOP = settings?.publicRateDOP || 58.5;

  const [selectedSubAgentId, setSelectedSubAgentId] = useState<string>(
    currentSubAgent?.id || subAgents[0]?.id || "SA-101"
  );
  const [clientCodeOrPhone, setClientCodeOrPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState<number>(1000);
  const [currency, setCurrency] = useState<"DOP" | "USD">("DOP");
  const [targetPocket, setTargetPocket] = useState<"main" | "savings">("main");
  const [loading, setLoading] = useState(false);
  const [confirmedRecord, setConfirmedRecord] = useState<ClientDepositRecord | null>(null);

  const activeSubAgent = subAgents.find((s) => s.id === selectedSubAgentId) || currentSubAgent || subAgents[0];

  const amountCreditedUSD = currency === "USD" ? amount : Math.round((amount / rateDOP) * 100) / 100;

  const handleProcessDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientCodeOrPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Código o teléfono requerido",
        description: "Ingresa el código del cliente (ej. CLI-8821) o su número de teléfono.",
      });
      return;
    }
    if (amount <= 0) {
      toast({
        variant: "destructive",
        title: "Monto inválido",
        description: "El monto a depositar debe ser mayor a 0.",
      });
      return;
    }

    setLoading(true);

    setTimeout(() => {
      // Find client profile or match by code
      const cleanCode = clientCodeOrPhone.trim().toUpperCase();
      const depositId = `DEP-${Math.floor(1000 + Math.random() * 9000)}`;

      // Deposit record
      const depositRecord: ClientDepositRecord = {
        id: depositId,
        clientId: cleanCode.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        clientName: clientName.trim() || `Cliente (${cleanCode})`,
        clientCode: cleanCode,
        clientPhone: cleanCode.startsWith("+") || cleanCode.startsWith("8") ? cleanCode : "+1 (829) 450-2211",
        amount,
        currency,
        amountCreditedUSD,
        method: "sub_agent",
        subAgentId: activeSubAgent?.id || "SA-101",
        subAgentName: activeSubAgent?.name || "Sub-Agente Autorizado",
        subAgentLocation: activeSubAgent ? `${activeSubAgent.location.exactAddress}, ${activeSubAgent.location.municipality}` : "República Dominicana",
        targetPocket,
        status: "completed",
        voucherCode: `REC-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`,
        notes: "Depósito recibido en efectivo en ventanilla de sub-agente.",
        createdAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        confirmedBy: `Cajero ${activeSubAgent?.name || "Sub-Agente"}`,
      };

      saveClientDeposit(depositRecord);

      // Add movement ledger entry
      addClientMovement({
        id: `MOV-${Date.now().toString().slice(-6)}`,
        clientId: depositRecord.clientId,
        type: "deposit_subagent",
        title: `Depósito en Sub-Agente (${activeSubAgent?.name})`,
        description: `Recarga en efectivo: ${amount.toLocaleString()} ${currency} (+$${amountCreditedUSD.toFixed(2)} USD acreditados a ${targetPocket === "savings" ? "Ahorro" : "Billetera Principal"})`,
        amountUSD: amountCreditedUSD,
        direction: "in",
        targetPocket,
        date: new Date().toISOString(),
        referenceId: depositId,
        status: "completed",
        receiptCode: depositRecord.voucherCode,
      });

      // Update balances if matches current client or default client
      try {
        const existingB = getClientWalletBalances(depositRecord.clientId);
        const updated = {
          ...existingB,
          clientCode: cleanCode,
          ...(targetPocket === "savings"
            ? { savingsBalance: Math.round((existingB.savingsBalance + amountCreditedUSD) * 100) / 100 }
            : { walletBalance: Math.round((existingB.walletBalance + amountCreditedUSD) * 100) / 100 }),
        };
        saveClientWalletBalances(depositRecord.clientId, updated);
      } catch (_) {}

      setConfirmedRecord(depositRecord);
      setLoading(false);

      toast({
        title: "¡Depósito Recibido y Acreditado!",
        description: `Se han acreditado +$${amountCreditedUSD.toFixed(2)} USD a la billetera del cliente ${cleanCode}.`,
      });

      if (onSuccess) onSuccess();
    }, 500);
  };

  const handleReset = () => {
    setConfirmedRecord(null);
    setClientCodeOrPhone("");
    setClientName("");
    setAmount(1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <Building2 className="w-5 h-5" />
            <DialogTitle className="text-lg font-black text-slate-900">
              Caja Sub-Agente: Recepción de Depósitos
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Acredita efectivo al instante a la billetera digital o bolsillo de ahorro de los clientes registrados.
          </DialogDescription>
        </DialogHeader>

        {confirmedRecord ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="font-black text-emerald-950 text-base">¡Depósito Acreditado con Éxito!</h3>
              <p className="text-xs text-emerald-800">
                El cliente ya tiene disponible su saldo para enviar a <strong>MonCash o Natcash</strong> en Haití.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comprobante Oficial:</span>
                <strong className="font-mono text-slate-900">{confirmedRecord.voucherCode}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Código de Cliente:</span>
                <strong className="font-mono text-slate-900">{confirmedRecord.clientCode}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Efectivo Recibido:</span>
                <span className="font-bold">{confirmedRecord.amount.toLocaleString()} {confirmedRecord.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto Acreditado:</span>
                <strong className="text-emerald-700 font-bold">+${confirmedRecord.amountCreditedUSD.toFixed(2)} USD</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destino:</span>
                <Badge variant="outline" className="text-[10px]">
                  {confirmedRecord.targetPocket === "savings" ? "Bolsillo de Ahorro" : "Billetera Principal"}
                </Badge>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-[11px] text-muted-foreground">
                <span>Sub-Agente:</span>
                <span>{confirmedRecord.subAgentName}</span>
              </div>
            </div>

            <Button onClick={handleReset} className="w-full bg-slate-900 text-white font-bold text-xs h-10">
              Registrar Otro Depósito
            </Button>
          </div>
        ) : (
          <form onSubmit={handleProcessDeposit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Sub-Agente Receptor</Label>
              <Select value={selectedSubAgentId} onValueChange={setSelectedSubAgentId}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subAgents.map((sa) => (
                    <SelectItem key={sa.id} value={sa.id} className="text-xs">
                      {sa.name} ({sa.location.municipality})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cashierClientCode" className="text-xs font-bold">Código o Teléfono del Cliente</Label>
                <Input
                  id="cashierClientCode"
                  value={clientCodeOrPhone}
                  onChange={(e) => setClientCodeOrPhone(e.target.value)}
                  placeholder="Ej. CLI-8821"
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cashierClientName" className="text-xs font-bold">Nombre (Opcional)</Label>
                <Input
                  id="cashierClientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cashierAmount" className="text-xs font-bold">Monto en Efectivo</Label>
                <Input
                  id="cashierAmount"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="text-sm font-black"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Moneda</Label>
                <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOP">RD$ Pesos (DOP)</SelectItem>
                    <SelectItem value="USD">US$ Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Bolsillo Destino del Cliente</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetPocket("main")}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    targetPocket === "main"
                      ? "border-blue-600 bg-blue-50 text-blue-950 font-bold"
                      : "border-border text-slate-600"
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5 mb-1 text-blue-600" />
                  <div>Billetera Principal</div>
                  <div className="text-[10px] text-muted-foreground font-normal">Para remesas a Haití</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetPocket("savings")}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    targetPocket === "savings"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                      : "border-border text-slate-600"
                  }`}
                >
                  <PiggyBank className="w-3.5 h-3.5 mb-1 text-emerald-600" />
                  <div>Bolsillo de Ahorro</div>
                  <div className="text-[10px] text-muted-foreground font-normal">Fondo de reserva</div>
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex justify-between items-center text-amber-950">
              <div>
                <span className="text-muted-foreground block text-[10px]">Acreditará en la billetera:</span>
                <strong className="text-sm font-black text-emerald-700">+${amountCreditedUSD.toFixed(2)} USD</strong>
              </div>
              <span className="text-[10px] text-muted-foreground">Tasa: 1 USD = {rateDOP.toFixed(2)} DOP</span>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              {loading ? "Procesando en Caja..." : "Acreditar Efectivo a Billetera"}
            </Button>
          </form>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
