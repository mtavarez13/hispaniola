"use client"

import React, { useState, useEffect } from "react";
import { 
  Mail, 
  MailCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Send, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Filter, 
  ArrowRight, 
  Building2, 
  UserCheck, 
  Phone, 
  DollarSign, 
  Check, 
  Lock, 
  Sparkles,
  Layers,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useSystemSettings } from "@/lib/settings-context";
import { useToast } from "@/hooks/use-toast";
import { GmailBankTransfer } from "@/lib/types";
import { 
  loadStoredGmailTransfers, 
  saveStoredGmailTransfers, 
  approveAndDispatchTransfer 
} from "@/lib/gmail/transfers-store";

export function GmailDepositsBoard() {
  const { user, userProfile, googleAccessToken, connectGmail } = useAuth();
  const { settings } = useSystemSettings();
  const { toast } = useToast();

  const [transfers, setTransfers] = useState<GmailBankTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Approval Modal State (1-Click confirmation for Admin)
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState<GmailBankTransfer | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [operator, setOperator] = useState<"MonCash" | "NatCash">("MonCash");
  const [adminNote, setAdminNote] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // Verification: is current user Admin?
  const isAdmin = userProfile?.role === "admin" || (user?.email && user.email.toLowerCase().includes("admin")) || user?.email === "martin.tavarez.gomez@gmail.com";

  const dopRate = settings.publicRateDOP || 58.50;
  const htgRate = settings.publicRateHTG || 132.20;
  const publicFeePct = settings.haitiPublicFeePercent || 8.0;

  // Load initial transfers from storage on mount
  useEffect(() => {
    const loaded = loadStoredGmailTransfers(dopRate, htgRate);
    setTransfers(loaded);
  }, [dopRate, htgRate]);

  // Fetch / Scan Gmail messages using access token or API
  const handleScanGmail = async () => {
    setLoading(true);
    try {
      let token = googleAccessToken;

      // If token not currently held, attempt quick connection or fallback to API
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/gmail/bank-transfers?dopRate=${dopRate}&htgRate=${htgRate}`, {
        headers,
      });

      const data = await res.json();

      if (data.transfers && Array.isArray(data.transfers)) {
        // Merge with existing local approval states
        const currentStored = loadStoredGmailTransfers(dopRate, htgRate);
        const merged = [...data.transfers];

        // Keep local approval overrides
        for (const local of currentStored) {
          const idx = merged.findIndex((m) => m.referenceNumber === local.referenceNumber || m.id === local.id);
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...local };
          } else {
            merged.push(local);
          }
        }

        setTransfers(merged);
        saveStoredGmailTransfers(merged);

        toast({
          title: "Bandeja de Bancos Actualizada",
          description: data.connected 
            ? `Se han sincronizado los correos de Banreservas, BHD y Popular desde Gmail.`
            : `Mostrando depósitos bancarios detectados. Conecta tu Gmail para sincronización en tiempo real.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Aviso de Sincronización",
          description: data.error || "No se recibieron transferencias bancarias en este momento.",
        });
      }
    } catch (err: any) {
      console.error("Error scanning Gmail:", err);
      toast({
        variant: "destructive",
        title: "Error al escanear Gmail",
        description: err.message || "No se pudo conectar con el servicio de lectura de correos.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Connect Gmail with Google OAuth popup
  const handleConnectGmail = async () => {
    try {
      setLoading(true);
      const token = await connectGmail();
      if (token) {
        toast({
          title: "¡Gmail Conectado con Éxito!",
          description: "Ahora HispaniolaPay puede leer transferencias de Banreservas, Banco BHD y Banco Popular.",
        });
        // Immediately scan after connect
        setTimeout(() => {
          handleScanGmail();
        }, 600);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "No se pudo conectar Gmail",
        description: err.message || "Por favor autoriza los permisos de lectura de Gmail.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Copy reference number helper
  const handleCopyReference = (ref: string, id: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedId(id);
    toast({
      title: "Referencia Copiada",
      description: `Comprobante ${ref} copiado al portapapeles.`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open 1-Click Confirmation modal for Admin
  const handleOpenApproveDialog = (transfer: GmailBankTransfer) => {
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Permiso Denegado",
        description: "Solo los administradores pueden autorizar y confirmar transferencias recibidas de bancos.",
      });
      return;
    }

    setActiveTransfer(transfer);
    // Pre-populate recipient if detected or set defaults
    setRecipientName(transfer.recipientName || "");
    setRecipientPhone(transfer.recipientPhone || "");
    setOperator(transfer.operator || "MonCash");
    setAdminNote(`Depósito validado de ${transfer.bank} - Ref: ${transfer.referenceNumber}`);
    setIsApproveOpen(true);
  };

  // Execute 1-Click Approval
  const handleConfirmApproval = () => {
    if (!activeTransfer) return;

    if (!recipientName || !recipientName.trim()) {
      toast({
        variant: "destructive",
        title: "Nombre de destinatario requerido",
        description: "Por favor escribe el nombre y apellido del destinatario en Haití.",
      });
      return;
    }

    if (!recipientPhone || recipientPhone.length < 8) {
      toast({
        variant: "destructive",
        title: "Teléfono en Haití requerido",
        description: "Ingresa el número móvil de 8 o 11 dígitos para acreditar en MonCash/Natcash.",
      });
      return;
    }

    setIsApproving(true);
    try {
      const adminEmail = user?.email || userProfile?.email || "admin@hispaniolapay.com";
      const result = approveAndDispatchTransfer(activeTransfer.id, adminEmail, {
        recipientName,
        recipientPhone: recipientPhone.startsWith("509") ? recipientPhone : `509${recipientPhone}`,
        operator,
        note: adminNote,
        publicFeePercent: publicFeePct,
      });

      if (result.success && result.updatedTransfer) {
        // Update state
        setTransfers((prev) =>
          prev.map((t) => (t.id === activeTransfer.id ? result.updatedTransfer! : t))
        );

        toast({
          title: "¡Remesa Aprobada y Confirmada!",
          description: result.message,
        });

        setIsApproveOpen(false);
        setActiveTransfer(null);
      } else {
        toast({
          variant: "destructive",
          title: "Error al Aprobar",
          description: result.message,
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error en Confirmación",
        description: err.message || "Ocurrió un fallo al procesar la aprobación de la remesa.",
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Filter transfers
  const filteredTransfers = transfers.filter((t) => {
    const matchesBank = selectedBankFilter === "all" || t.bank === selectedBankFilter;
    const matchesStatus = selectedStatusFilter === "all" || t.status === selectedStatusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      !query ||
      t.senderName.toLowerCase().includes(query) ||
      t.referenceNumber.toLowerCase().includes(query) ||
      t.bank.toLowerCase().includes(query) ||
      t.emailSubject.toLowerCase().includes(query) ||
      (t.recipientName && t.recipientName.toLowerCase().includes(query));

    return matchesBank && matchesStatus && matchesSearch;
  });

  // Calculate Metrics
  const totalCount = transfers.length;
  const pendingCount = transfers.filter((t) => t.status === "pending_approval").length;
  const approvedCount = transfers.filter((t) => t.status === "approved" || t.status === "dispatched").length;
  const totalAmountDOP = transfers.reduce((sum, t) => sum + (t.amountDOP || 0), 0);
  const pendingAmountDOP = transfers
    .filter((t) => t.status === "pending_approval")
    .reduce((sum, t) => sum + (t.amountDOP || 0), 0);

  // Helper for bank badge styling
  const getBankBadge = (bank: string) => {
    switch (bank) {
      case "Banreservas":
        return (
          <Badge className="bg-[#0033A0] text-white hover:bg-[#002270] font-bold text-xs gap-1 border-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Banreservas
          </Badge>
        );
      case "Banco BHD":
        return (
          <Badge className="bg-[#00A859] text-white hover:bg-[#008845] font-bold text-xs gap-1 border-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
            Banco BHD
          </Badge>
        );
      case "Banco Popular":
        return (
          <Badge className="bg-[#002B49] text-white hover:bg-[#001D33] font-bold text-xs gap-1 border-0">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            Banco Popular
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-700 font-bold text-xs">
            {bank}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6" id="gmail-deposits-board">
      {/* TOP NOTIFICATION & GMAIL CONNECTION BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <MailCheck className="w-5 h-5" />
              </div>
              <Badge className="bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider">
                Lectura Automática de Depósitos
              </Badge>
              {googleAccessToken ? (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Gmail En Vivo Conectado
                </Badge>
              ) : (
                <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-xs">
                  Modo de Escaneo Activo
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Tablero de Remesas Bancarias (BHD • Banreservas • Popular)
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Detecta automáticamente los avisos de transferencia y depósitos recibidos en tus cuentas dominicanas para colocarlos en cola de espera. <strong>Solo administradores</strong> pueden confirmar y aprobar la remesa a un clic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!googleAccessToken ? (
              <Button
                onClick={handleConnectGmail}
                disabled={loading}
                className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm rounded-xl px-4 py-2.5 shadow-md gap-2"
              >
                <Mail className="w-4 h-4 text-red-500" />
                Conectar con mi Gmail
              </Button>
            ) : (
              <div className="text-xs text-right pr-2 hidden sm:block">
                <p className="text-slate-400">Conectado como:</p>
                <p className="font-mono text-emerald-400 font-bold">{user?.email || "Gmail Activo"}</p>
              </div>
            )}

            <Button
              onClick={handleScanGmail}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl px-4 py-2.5 shadow-lg shadow-blue-600/30 gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Escaneando..." : "Escanear Correos Ahora"}
            </Button>
          </div>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Pending */}
        <Card className="rounded-2xl border-amber-200 bg-amber-50/50 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Pendientes por Confirmar
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-950">
                {pendingCount}
              </div>
              <p className="text-[11px] text-amber-700 font-medium">
                RD$ {pendingAmountDOP.toLocaleString("es-DO", { minimumFractionDigits: 2 })} en espera
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Total Received DOP */}
        <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Monto Total Detectado
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                RD$ {totalAmountDOP.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                ≈ ${(totalAmountDOP / dopRate).toFixed(2)} USD tasa ({dopRate})
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Approved / Dispatched */}
        <Card className="rounded-2xl border-emerald-200 bg-emerald-50/50 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Aprobadas por Admin
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950">
                {approvedCount}
              </div>
              <p className="text-[11px] text-emerald-700 font-medium">
                Despachadas a MonCash / Natcash
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Admin Authority Status */}
        <Card className={`rounded-2xl shadow-xs ${isAdmin ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200 bg-slate-50"}`}>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Permiso Operativo
              </span>
              <div className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
                {isAdmin ? (
                  <>
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <span>Aprobador Autorizado</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 text-amber-600" />
                    <span>Solo Lectura (Agente)</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {isAdmin ? "Aprobación 1-clic habilitada" : "Solo Admin puede aprobar"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs">
              <UserCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER CONTROLS BAR */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por remitente, referencia o banco..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 rounded-xl text-xs sm:text-sm h-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter by Bank */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Banco:</span>
              <Select value={selectedBankFilter} onValueChange={setSelectedBankFilter}>
                <SelectTrigger className="w-36 h-9 rounded-xl text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los bancos</SelectItem>
                  <SelectItem value="Banreservas">Banreservas</SelectItem>
                  <SelectItem value="Banco BHD">Banco BHD</SelectItem>
                  <SelectItem value="Banco Popular">Banco Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Estado:</span>
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="w-36 h-9 rounded-xl text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending_approval">Pendientes</SelectItem>
                  <SelectItem value="approved">Aprobadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedBankFilter("all");
                setSelectedStatusFilter("all");
                setSearchQuery("");
              }}
              className="text-xs rounded-xl h-9 text-slate-600 hover:text-slate-900"
            >
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TABLE / LIST OF DETECTED DEPOSITS */}
      <div className="space-y-4">
        {filteredTransfers.length === 0 ? (
          <Card className="rounded-2xl border-slate-200 bg-white p-12 text-center space-y-3">
            <Mail className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">No se encontraron transferencias</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No hay depósitos bancarios que coincidan con los filtros actuales. Pulsa &ldquo;Escanear Correos Ahora&rdquo; para sincronizar Gmail.
            </p>
            <Button
              onClick={handleScanGmail}
              variant="outline"
              className="mt-2 text-xs font-bold rounded-xl"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Sincronizar Bandeja
            </Button>
          </Card>
        ) : (
          filteredTransfers.map((item) => {
            const isPending = item.status === "pending_approval";
            const isApproved = item.status === "approved" || item.status === "dispatched";

            return (
              <Card
                key={item.id}
                className={`rounded-2xl transition-all border ${
                  isPending
                    ? "border-amber-300/80 bg-white shadow-md hover:border-amber-400"
                    : "border-slate-200 bg-white/90 opacity-95"
                }`}
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left Column: Bank info, Sender, Reference, Concept */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getBankBadge(item.bank)}

                        {isPending ? (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-black text-[11px] gap-1 px-2.5 py-0.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            PENDIENTE POR CONFIRMAR
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-[11px] gap-1 px-2.5 py-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            CONFIRMADA & DESPACHADA
                          </Badge>
                        )}

                        <span className="text-xs text-slate-400 font-medium">
                          {new Date(item.detectedAt).toLocaleDateString("es-DO", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Main Data: Sender & Amount Highlight */}
                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Depositante / Remitente
                          </span>
                          <h4 className="text-lg font-black text-slate-900 tracking-tight">
                            {item.senderName}
                          </h4>
                        </div>

                        {item.senderAccount && (
                          <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md self-start">
                            Origen: {item.senderAccount}
                          </span>
                        )}
                      </div>

                      {/* Reference Number with 1-click copy */}
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700">
                          <span className="font-bold text-slate-500">Ref:</span>
                          <code className="font-mono font-bold text-slate-900">{item.referenceNumber}</code>
                          <button
                            type="button"
                            onClick={() => handleCopyReference(item.referenceNumber, item.id)}
                            className="ml-1 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Copiar Referencia"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {item.destinationAccount && (
                          <span className="text-slate-500 text-[11px]">
                            Acreditado en: <strong className="text-slate-700">{item.destinationAccount}</strong>
                          </span>
                        )}
                      </div>

                      {/* Email preview snippet */}
                      <p className="text-xs text-slate-600 italic bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                        &ldquo;{item.emailSnippet}&rdquo;
                      </p>

                      {item.memoOrConcept && (
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-blue-500" />
                          <span>Concepto detectado: <strong>{item.memoOrConcept}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Middle Column: Amounts & Conversions */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 min-w-[200px] flex flex-col justify-center space-y-1.5 text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Monto Recibido
                      </span>
                      <div className="text-2xl font-black text-slate-900">
                        RD$ {item.amountDOP.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs font-bold text-blue-700">
                        ≈ ${item.amountUSD.toFixed(2)} USD
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-700">
                        Recibe en Haití: ≈ {item.amountHTG?.toLocaleString("es-DO") || (item.amountUSD * htgRate).toFixed(0)} HTG
                      </div>
                    </div>

                    {/* Right Column: 1-Click Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch justify-center gap-2.5 min-w-[170px]">
                      {isPending ? (
                        <Button
                          onClick={() => handleOpenApproveDialog(item)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl py-3 shadow-md shadow-emerald-600/20 gap-1.5"
                        >
                          {isAdmin ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Aprobar y Enviar (1 Clic)
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              Solo Admin Puede Aprobar
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-1 text-center bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                          <span className="text-xs font-black text-emerald-900 block flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Aprobada por Admin
                          </span>
                          <span className="text-[10px] text-emerald-700 block font-mono">
                            {item.approvedByAdminEmail?.split("@")[0] || "Administrador"}
                          </span>
                          {item.dispatchedTxId && (
                            <span className="text-[10px] font-bold text-slate-500 block">
                              Tx: {item.dispatchedTxId}
                            </span>
                          )}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast({
                            title: item.emailSubject,
                            description: item.emailSnippet,
                          });
                        }}
                        className="w-full text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900"
                      >
                        Ver Detalle del Correo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* MODAL: 1-CLICK CONFIRMATION AND DISPATCH (ADMIN ONLY) */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-[550px] !bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-black text-xs uppercase">
                Aprobación Oficial con 1 Clic
              </Badge>
              <Badge className="bg-blue-100 text-blue-800 text-xs font-bold">
                Exclusivo Administrador
              </Badge>
            </div>
            <DialogTitle className="text-xl font-black text-slate-900">
              Confirmar Depósito y Despachar Remesa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Verifica los datos detectados por correo desde {activeTransfer?.bank} para autorizar la acreditación inmediata a Haití.
            </DialogDescription>
          </DialogHeader>

          {activeTransfer && (
            <div className="space-y-4 py-2">
              {/* Deposit Card Overview */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Banco Emisor:</span>
                  <strong className="text-slate-900">{activeTransfer.bank}</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Referencia Bancaria:</span>
                  <code className="font-mono font-bold text-blue-700">{activeTransfer.referenceNumber}</code>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Remitente en RD:</span>
                  <strong className="text-slate-900">{activeTransfer.senderName}</strong>
                </div>
                <div className="border-t border-slate-200/80 pt-2 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-700">Monto Acreditado:</span>
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900">
                      RD$ {activeTransfer.amountDOP.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-500 block font-bold">
                      (${activeTransfer.amountUSD.toFixed(2)} USD)
                    </span>
                  </div>
                </div>
              </div>

              {/* Recipient Form Fields */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rep-name" className="text-xs font-bold text-slate-700">
                    Nombre del Destinatario en Haití <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rep-name"
                    placeholder="Escribe el nombre y apellido (Ej: Jean Baptiste)"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rep-phone" className="text-xs font-bold text-slate-700">
                      Teléfono Móvil en Haití <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="rep-phone"
                      placeholder="Ej: 50937112233"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="h-10 text-xs sm:text-sm rounded-xl font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rep-op" className="text-xs font-bold text-slate-700">
                      Billetera Destino
                    </Label>
                    <Select value={operator} onValueChange={(val: any) => setOperator(val)}>
                      <SelectTrigger id="rep-op" className="h-10 rounded-xl text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MonCash">MonCash (Digicel)</SelectItem>
                        <SelectItem value="NatCash">Natcash (Natcom)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin-note" className="text-xs font-bold text-slate-700">
                    Nota Administrativa / Comentario
                  </Label>
                  <Input
                    id="admin-note"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Commission & Profit split summary */}
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs space-y-1">
                <div className="flex justify-between font-bold text-amber-900">
                  <span>Norma de Tasa Pública:</span>
                  <span>{publicFeePct}%</span>
                </div>
                <div className="flex justify-between text-amber-800 text-[11px]">
                  <span>Reparto de Ganancia:</span>
                  <span>BenCash: 3% | Sub-Agente: 2% | Hispaniola: 3%</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsApproveOpen(false)}
              disabled={isApproving}
              className="text-xs font-bold rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmApproval}
              disabled={isApproving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl px-5 shadow-lg shadow-emerald-600/30 gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isApproving ? "Procesando Aprobación..." : "Confirmar y Aprobar Ahora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
