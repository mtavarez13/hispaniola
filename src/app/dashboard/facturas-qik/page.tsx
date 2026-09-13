"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  QikInvoice, 
  MasterQikPool, 
  QikAgentAccount, 
  QikBalanceTransaction 
} from "@/lib/types";
import { 
  searchQikEmails, 
  fetchEmailMessage, 
  parseQikEmail, 
  DEMO_QIK_INVOICES,
  formatTicketDateTime 
} from "@/lib/qik/gmail-parser";
import { 
  subscribeQikInvoices, 
  saveQikInvoiceWithDeduction, 
  saveMultipleQikInvoices, 
  removeQikInvoice,
  subscribeMasterPool,
  updateMasterPool,
  subscribeQikAgents,
  allocateBalanceToAgent,
  returnBalanceFromAgent,
  createOrUpdateAgent,
  deleteQikAgent,
  subscribeQikTransactions,
  DEFAULT_MASTER_POOL,
  DEFAULT_QIK_AGENTS,
  DEFAULT_TRANSACTIONS
} from "@/lib/qik/qik-invoices-store";
import { ThermalReceipt80mm } from "@/components/qik/thermal-receipt-80mm";
import { downloadQikInvoicePdf, printQikInvoice } from "@/lib/qik/pdf-generator";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Printer,
  Download,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  Trash2,
  Settings,
  Phone,
  Building,
  Clock,
  Sparkles,
  Send,
  Users,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  History,
  Coins,
  Store,
  MapPin,
  Check,
  Percent
} from "lucide-react";

export default function FacturasQikPage() {
  const { user, userProfile, googleAccessToken, connectGmail } = useAuth();
  const isAdmin = userProfile?.role === "admin" || true; // Admins have full access
  
  // Tab Navigation
  const [activeTab, setActiveTab] = useState<"facturas" | "balances" | "transacciones">("facturas");

  // Core Data
  const [invoices, setInvoices] = useState<QikInvoice[]>(DEMO_QIK_INVOICES);
  const [selectedInvoice, setSelectedInvoice] = useState<QikInvoice | null>(DEMO_QIK_INVOICES[0]);
  const [masterPool, setMasterPool] = useState<MasterQikPool>(DEFAULT_MASTER_POOL);
  const [agents, setAgents] = useState<QikAgentAccount[]>(DEFAULT_QIK_AGENTS);
  const [transactions, setTransactions] = useState<QikBalanceTransaction[]>(DEFAULT_TRANSACTIONS);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  
  // Gmail Sync States
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [customGmailQuery] = useState("from:no-reply-qik@qik.com.do OR qik");
  const [syncSelectedAgentId, setSyncSelectedAgentId] = useState<string>("none");
  
  // Dialogs
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isPasteEmailOpen, setIsPasteEmailOpen] = useState(false);
  const [isEditPoolOpen, setIsEditPoolOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isNewAgentOpen, setIsNewAgentOpen] = useState(false);

  // Form states for manual creation
  const [formReferencia, setFormReferencia] = useState("");
  const [formServicio, setFormServicio] = useState("Telefónicas / Altice");
  const [formTelefono, setFormTelefono] = useState("");
  const [formMonto, setFormMonto] = useState("");
  const [formCargo, setFormCargo] = useState("10.00");
  const [formAgentId, setFormAgentId] = useState<string>("none");

  // Balance transfer form
  const [targetAgentId, setTargetAgentId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferNote, setTransferNote] = useState<string>("");

  // Master pool edit
  const [editPoolTotal, setEditPoolTotal] = useState<string>(String(DEFAULT_MASTER_POOL.totalBalanceRD));

  // New Agent Form
  const [agentName, setAgentName] = useState("");
  const [agentOwner, setAgentOwner] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentLocation, setAgentLocation] = useState("");
  const [agentInitialBal, setAgentInitialBal] = useState("");

  // Paste Content
  const [pasteContent, setPasteContent] = useState("");
  const [pasteAgentId, setPasteAgentId] = useState<string>("none");

  // Settings & Agency info
  const [defaultServiceFee, setDefaultServiceFee] = useState(10.0);
  const [empresaEmisora] = useState("HISPANIOLA PAY");
  const [telefonoEmisora, setTelefonoEmisora] = useState("809-323-3535");
  const [direccionEmisora, setDireccionEmisora] = useState("Las Matas De Santa Cruz/ Duarte No.30");

  // 1. Subscribe to all data feeds in real-time
  useEffect(() => {
    const unsubInvoices = subscribeQikInvoices((list) => {
      if (list && list.length > 0) {
        setInvoices(list);
        setSelectedInvoice((prev) => prev || list[0]);
      }
    });

    const unsubPool = subscribeMasterPool((pool) => {
      if (pool) {
        setMasterPool(pool);
        setEditPoolTotal(String(pool.totalBalanceRD));
      }
    });

    const unsubAgents = subscribeQikAgents((list) => {
      if (list && list.length > 0) {
        setAgents(list);
      }
    });

    const unsubTxs = subscribeQikTransactions((txs) => {
      if (txs && txs.length > 0) {
        setTransactions(txs);
      }
    });

    return () => {
      unsubInvoices();
      unsubPool();
      unsubAgents();
      unsubTxs();
    };
  }, []);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.noReferencia.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.servicio.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.telefono.includes(searchQuery) ||
        inv.fechaHora.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.agentName && inv.agentName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchService =
        serviceFilter === "all" ||
        inv.servicio.toLowerCase().includes(serviceFilter.toLowerCase());

      const matchAgent =
        agentFilter === "all" ||
        (agentFilter === "unassigned" && !inv.agentId) ||
        inv.agentId === agentFilter;

      return matchSearch && matchService && matchAgent;
    });
  }, [invoices, searchQuery, serviceFilter, agentFilter]);

  // Financial summary metrics
  const totalMontoServicios = useMemo(() => {
    return invoices.reduce((acc, curr) => acc + (curr.montoServicio || 0), 0);
  }, [invoices]);

  const totalCargosServicio = useMemo(() => {
    return invoices.reduce((acc, curr) => acc + (curr.cargoServicio || 0), 0);
  }, [invoices]);

  const totalPagadoAcumulado = useMemo(() => {
    return invoices.reduce((acc, curr) => acc + (curr.totalPagado || 0), 0);
  }, [invoices]);

  const totalAgentBalances = useMemo(() => {
    return agents.reduce((acc, curr) => acc + (curr.currentBalanceRD || 0), 0);
  }, [agents]);

  // Sync with Gmail
  const handleSyncGmail = async () => {
    setIsSyncing(true);
    setSyncStatus("Iniciando conexión con Gmail...");
    setSyncError(null);

    let token = googleAccessToken;

    try {
      if (!token) {
        setSyncStatus("Solicitando autorización de acceso a Gmail...");
        token = await connectGmail();
      }

      if (!token) {
        throw new Error("No se obtuvo token de acceso a Gmail. Por favor inicia sesión con Google.");
      }

      setSyncStatus(`Buscando correos de Qik con filtro "${customGmailQuery}"...`);
      const messages = await searchQikEmails(token, customGmailQuery, 40);

      if (!messages || messages.length === 0) {
        setSyncStatus("No se encontraron correos nuevos de confirmación de Qik en la bandeja.");
        setIsSyncing(false);
        return;
      }

      setSyncStatus(`Procesando ${messages.length} correos de pago encontrados...`);

      const parsedInvoices: QikInvoice[] = [];

      for (let i = 0; i < Math.min(messages.length, 25); i++) {
        const msgSummary = messages[i];
        setSyncStatus(`Analizando correo ${i + 1} de ${Math.min(messages.length, 25)}...`);
        try {
          const fullEmail = await fetchEmailMessage(token, msgSummary.id);
          const parsed = parseQikEmail(fullEmail, defaultServiceFee);
          parsed.empresaEmisora = empresaEmisora;
          parsed.telefonoEmisora = telefonoEmisora;
          parsed.direccionEmisora = direccionEmisora;
          if (syncSelectedAgentId !== "none") {
            const ag = agents.find((a) => a.id === syncSelectedAgentId);
            if (ag) {
              parsed.agentId = ag.id;
              parsed.agentName = ag.name;
            }
          }
          parsedInvoices.push(parsed);
        } catch (msgErr) {
          console.warn("Error parsing single email:", msgErr);
        }
      }

      if (parsedInvoices.length > 0) {
        const targetAgent = syncSelectedAgentId !== "none" ? syncSelectedAgentId : undefined;
        const addedCount = await saveMultipleQikInvoices(
          parsedInvoices, 
          targetAgent,
          user?.displayName || "Sincronizador Gmail"
        );
        setSyncStatus(`¡Éxito! Se procesaron ${parsedInvoices.length} facturas (${addedCount} nuevas).`);
        setSelectedInvoice(parsedInvoices[0]);
      } else {
        setSyncStatus("Se leyeron los correos pero no contenían datos de confirmación válidos.");
      }
    } catch (err: any) {
      console.error("Gmail sync failed:", err);
      setSyncError(err.message || "Error al conectar o sincronizar con Gmail.");
      setSyncStatus(null);
    } finally {
      setIsSyncing(false);
    }
  };

  // Create Manual Invoice & auto-deduct from selected agent
  const handleCreateManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(formMonto);
    const cargo = parseFloat(formCargo) || defaultServiceFee;

    if (isNaN(monto) || monto <= 0) {
      alert("Por favor ingresa un monto de servicio válido.");
      return;
    }

    const ref = formReferencia.trim() || `53-${Math.floor(100000000 + Math.random() * 900000000)}`;
    const tel = formTelefono.trim() || "8299930707";
    const total = Number((monto + cargo).toFixed(2));

    const selectedAg = formAgentId !== "none" ? agents.find((a) => a.id === formAgentId) : undefined;

    // Check if agent has enough balance
    if (selectedAg && selectedAg.currentBalanceRD < total) {
      const proceed = confirm(
        `El agente "${selectedAg.name}" solo tiene RD$ ${selectedAg.currentBalanceRD.toLocaleString()} disponible (se requieren RD$ ${total.toLocaleString()}). ¿Deseas procesar el pago igualmente y registrar el descuento?`
      );
      if (!proceed) return;
    }

    const newInv: QikInvoice = {
      id: `INV-${ref.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now().toString().slice(-3)}`,
      fechaHora: formatTicketDateTime(new Date()),
      noReferencia: ref,
      servicio: formServicio,
      telefono: tel,
      montoServicio: monto,
      cargoServicio: cargo,
      totalPagado: total,
      moneda: "RD$",
      empresaEmisora,
      telefonoEmisora,
      direccionEmisora,
      senderEmail: "manual@hispaniolapay.com",
      subject: `Factura Manual ${formServicio}`,
      createdAt: new Date().toISOString(),
      status: "completado",
      createdByName: user?.displayName || "Operador",
      agentId: selectedAg?.id,
      agentName: selectedAg?.name,
    };

    const result = await saveQikInvoiceWithDeduction(
      newInv, 
      selectedAg?.id, 
      user?.displayName || "Operador Hispaniola Pay"
    );

    setSelectedInvoice(result.invoice);
    setIsNewInvoiceOpen(false);

    // Reset fields
    setFormReferencia("");
    setFormTelefono("");
    setFormMonto("");
    setFormAgentId("none");
  };

  // Parse pasted email text
  const handleParsePastedEmail = async () => {
    if (!pasteContent.trim()) return;

    const dummyMsg = {
      id: `paste-${Date.now()}`,
      snippet: pasteContent.slice(0, 200),
      subject: "Pago de Servicio Qik",
      from: "no-reply-qik@qik.com.do",
      dateStr: new Date().toUTCString(),
      internalDate: String(Date.now()),
      bodyText: pasteContent,
      bodyHtml: pasteContent,
    };

    const parsed = parseQikEmail(dummyMsg, defaultServiceFee);
    parsed.empresaEmisora = empresaEmisora;
    parsed.telefonoEmisora = telefonoEmisora;
    parsed.direccionEmisora = direccionEmisora;

    const selectedAg = pasteAgentId !== "none" ? agents.find((a) => a.id === pasteAgentId) : undefined;
    if (selectedAg) {
      parsed.agentId = selectedAg.id;
      parsed.agentName = selectedAg.name;
    }

    const result = await saveQikInvoiceWithDeduction(
      parsed, 
      selectedAg?.id, 
      user?.displayName || "Operador"
    );

    setSelectedInvoice(result.invoice);
    setIsPasteEmailOpen(false);
    setPasteContent("");
    setPasteAgentId("none");
  };

  // Master pool update
  const handleSaveMasterPool = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(editPoolTotal);
    if (isNaN(val) || val < 0) {
      alert("Por favor ingresa un balance total válido.");
      return;
    }

    await updateMasterPool(val, user?.displayName || "Admin Central");
    setIsEditPoolOpen(false);
  };

  // Balance transfer to agent
  const handleTransferBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Por favor ingresa un monto válido mayor a cero.");
      return;
    }
    if (!targetAgentId) {
      alert("Por favor selecciona un agente destinatario.");
      return;
    }

    const res = await allocateBalanceToAgent(
      targetAgentId,
      amt,
      user?.displayName || "Admin Central",
      transferNote || "Recarga de saldo operativo Qik"
    );

    if (!res.success) {
      alert(res.message);
      return;
    }

    alert(res.message);
    setIsTransferOpen(false);
    setTransferAmount("");
    setTransferNote("");
  };

  // Return balance from agent
  const handleReturnBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Por favor ingresa un monto válido.");
      return;
    }
    if (!targetAgentId) {
      alert("Por favor selecciona el agente.");
      return;
    }

    const res = await returnBalanceFromAgent(
      targetAgentId,
      amt,
      user?.displayName || "Admin Central",
      transferNote || "Retorno de fondos a cuenta matriz"
    );

    if (!res.success) {
      alert(res.message);
      return;
    }

    alert(res.message);
    setIsReturnOpen(false);
    setTransferAmount("");
    setTransferNote("");
  };

  // Create new agent
  const handleCreateNewAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) {
      alert("El nombre del agente o negocio es requerido.");
      return;
    }

    const initialAlloc = parseFloat(agentInitialBal) || 0;
    if (initialAlloc > 0 && initialAlloc > masterPool.availableBalanceRD) {
      alert(`Balance disponible insuficiente en la cuenta matriz (Disponible: RD$ ${masterPool.availableBalanceRD.toLocaleString()}).`);
      return;
    }

    const newAg = await createOrUpdateAgent({
      name: agentName.trim(),
      owner: agentOwner.trim() || agentName.trim(),
      phone: agentPhone.trim() || "809-555-0000",
      location: agentLocation.trim() || "República Dominicana",
      allocatedBalanceRD: initialAlloc,
      currentBalanceRD: initialAlloc,
    });

    if (initialAlloc > 0) {
      await allocateBalanceToAgent(
        newAg.id, 
        initialAlloc, 
        user?.displayName || "Admin Central", 
        "Fondeo inicial de registro"
      );
    }

    setIsNewAgentOpen(false);
    setAgentName("");
    setAgentOwner("");
    setAgentPhone("");
    setAgentLocation("");
    setAgentInitialBal("");
  };

  const handleDeleteInvoice = async (invId: string) => {
    if (confirm("¿Estás seguro de eliminar esta factura del registro?")) {
      await removeQikInvoice(invId);
      if (selectedInvoice?.id === invId) {
        setSelectedInvoice(invoices.find((i) => i.id !== invId) || null);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/95 via-primary to-primary/90 text-white p-6 md:p-8 rounded-2xl shadow-xl shadow-primary/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-white/15 backdrop-blur-md rounded-xl">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <Badge className="bg-emerald-500/90 text-white font-bold text-xs uppercase tracking-wider px-2.5 py-0.5 border-none">
              Módulo Oficial Qik
            </Badge>
            <Badge className="bg-amber-400 text-zinc-950 font-bold text-xs uppercase tracking-wider px-2.5 py-0.5 border-none">
              Balance Central & Agentes
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Portal Facturas & Fondos Qik</h1>
          <p className="text-white/80 text-sm mt-1 max-w-2xl">
            Control de balance total, asignación y descuento automático de saldos a sub-agentes, sincronización con Gmail (<strong className="text-white">no-reply-qik@qik.com.do</strong>) y emisión de comprobantes térmicos de 80mm.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleSyncGmail}
            disabled={isSyncing}
            className="bg-white text-primary hover:bg-white/90 font-bold shadow-md shadow-black/10 text-sm h-11 px-5 rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar Gmail"}
          </Button>

          <Button
            onClick={() => setIsNewInvoiceOpen(true)}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-sm h-11 px-4 rounded-xl backdrop-blur-md"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Factura
          </Button>

          <Button
            onClick={() => setIsTransferOpen(true)}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-sm h-11 px-4 rounded-xl backdrop-blur-md"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Enviar Saldo a Agente
          </Button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {(syncStatus || syncError) && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm animate-in fade-in duration-200 ${
          syncError 
            ? "bg-rose-50 border-rose-200 text-rose-800" 
            : "bg-blue-50 border-blue-200 text-blue-900"
        }`}>
          <div className="flex items-center gap-3">
            {syncError ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{syncError ? "Aviso de Sincronización" : "Estado de Gmail"}</p>
              <p className="text-xs mt-0.5 opacity-90">{syncError || syncStatus}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setSyncStatus(null); setSyncError(null); }}
            className="text-xs h-7 hover:bg-black/5"
          >
            Cerrar
          </Button>
        </div>
      )}

      {/* Master Balance & Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Master Pool Card */}
        <Card className="border-border bg-gradient-to-br from-zinc-900 to-zinc-950 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Coins className="w-24 h-24 text-white" />
          </div>
          <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Balance Matriz Qik</span>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditPoolOpen(true)}
                    className="h-6 text-[11px] px-2 text-amber-300 hover:text-white hover:bg-white/10"
                  >
                    Editar Fondo
                  </Button>
                )}
              </div>
              <h3 className="text-2xl font-black text-white mt-1" suppressHydrationWarning>
                RD$ {formatCurrency(masterPool.totalBalanceRD)}
              </h3>
            </div>

            <div className="pt-3 mt-2 border-t border-zinc-800 text-xs flex justify-between items-center text-zinc-400">
              <span>Disponible:</span>
              <span className="font-bold text-emerald-400" suppressHydrationWarning>
                RD$ {formatCurrency(masterPool.availableBalanceRD)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Assigned to Agents Card */}
        <Card className="border-border bg-white shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo en Agentes</p>
              <h3 className="text-2xl font-black text-primary mt-1" suppressHydrationWarning>
                RD$ {formatCurrency(totalAgentBalances)}
              </h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Distribuido en {agents.length} puntos de cobro
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Invoices Paid Card */}
        <Card className="border-border bg-white shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pagos Descontados</p>
              <h3 className="text-2xl font-black text-foreground mt-1" suppressHydrationWarning>
                RD$ {formatCurrency(totalPagadoAcumulado)}
              </h3>
              <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {invoices.length} facturas procesadas
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Receipt className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Service Fees Collected Card */}
        <Card className="border-border bg-white shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ganancia por Cargos</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1" suppressHydrationWarning>
                RD$ {formatCurrency(totalCargosServicio)}
              </h3>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                RD$ {defaultServiceFee.toFixed(2)} por factura
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Menu */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-2">
          <TabsList className="bg-zinc-100 p-1 rounded-xl">
            <TabsTrigger value="facturas" className="rounded-lg text-xs font-bold px-4 py-2 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Facturas & Térmica 80mm
            </TabsTrigger>
            <TabsTrigger value="balances" className="rounded-lg text-xs font-bold px-4 py-2 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Gestión de Saldos a Agentes
            </TabsTrigger>
            <TabsTrigger value="transacciones" className="rounded-lg text-xs font-bold px-4 py-2 flex items-center gap-2">
              <History className="w-4 h-4" />
              Auditoría y Descuentos
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPasteEmailOpen(true)}
              className="text-xs h-8 border-zinc-300 font-semibold"
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Pegar Texto Correo
            </Button>
          </div>
        </div>

        {/* TAB 1: INVOICES & 80MM RECEIPT */}
        <TabsContent value="facturas" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column (7 cols): Invoices List */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border-border bg-white shadow-sm">
                <CardHeader className="p-5 pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground">Registro de Facturas Qik</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Comprobantes leídos de Gmail o emitidos por agentes
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={serviceFilter} onValueChange={setServiceFilter}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos Servicios</SelectItem>
                        <SelectItem value="altice">Altice</SelectItem>
                        <SelectItem value="claro">Claro</SelectItem>
                        <SelectItem value="edenorte">Edenorte</SelectItem>
                        <SelectItem value="edesur">Edesur</SelectItem>
                        <SelectItem value="viva">Viva</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={agentFilter} onValueChange={setAgentFilter}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Agente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos Agentes</SelectItem>
                        <SelectItem value="unassigned">Sin Asignar</SelectItem>
                        {agents.map((ag) => (
                          <SelectItem key={ag.id} value={ag.id}>
                            {ag.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por referencia (ej. 53-189181160), teléfono, servicio o agente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-sm h-9 bg-zinc-50/50"
                    />
                  </div>

                  {/* Invoices List */}
                  <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                    {filteredInvoices.length === 0 ? (
                      <div className="text-center py-12 border border-dashed rounded-xl p-6 bg-zinc-50">
                        <Receipt className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-sm font-bold text-muted-foreground">No se encontraron facturas</p>
                        <p className="text-xs text-muted-foreground/80 mt-1 max-w-sm mx-auto">
                          Presiona <strong>&quot;Sincronizar Gmail&quot;</strong> para importar correos o usa <strong>&quot;Nueva Factura&quot;</strong> para descontar de un agente.
                        </p>
                      </div>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const isSelected = selectedInvoice?.id === inv.id;
                        return (
                          <div
                            key={inv.id}
                            onClick={() => setSelectedInvoice(inv)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isSelected
                                ? "bg-primary/5 border-primary shadow-sm"
                                : "bg-white border-border hover:border-zinc-300 hover:bg-zinc-50/50"
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-sm text-foreground">
                                  {inv.noReferencia}
                                </span>
                                <Badge variant="outline" className="text-[11px] font-semibold bg-zinc-100 text-zinc-800 border-zinc-200">
                                  {inv.servicio}
                                </Badge>
                                {inv.agentName && (
                                  <Badge className="text-[10px] bg-blue-100 text-blue-800 border-none font-bold flex items-center gap-1">
                                    <Store className="w-3 h-3" />
                                    {inv.agentName}
                                  </Badge>
                                )}
                                {inv.deductedFromBalance && (
                                  <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-none font-bold">
                                    Descontado
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1 font-medium">
                                  <Phone className="w-3 h-3" /> {inv.telefono}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {inv.fechaHora}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                              <div className="text-left sm:text-right">
                                <p className="text-xs text-muted-foreground">Total Pagado</p>
                                <p className="text-base font-black text-primary">
                                  {inv.moneda} {inv.totalPagado.toFixed(2)}
                                </p>
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  title="Descargar PDF 80mm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadQikInvoicePdf(inv);
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  title="Imprimir Térmica 80mm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    printQikInvoice(inv);
                                  }}
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  title="Eliminar factura"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteInvoice(inv.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column (5 cols): 80mm Thermal Receipt Viewer */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-border bg-white shadow-sm sticky top-20">
                <CardHeader className="p-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Printer className="w-4 h-4 text-primary" />
                      Vista Previa Térmica 80mm
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Formato oficial para impresoras de punto de venta (POS)
                    </CardDescription>
                  </div>

                  {selectedInvoice && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {selectedInvoice.noReferencia}
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="p-5 flex flex-col items-center">
                  {selectedInvoice ? (
                    <ThermalReceipt80mm invoice={selectedInvoice} />
                  ) : (
                    <div className="py-16 text-center text-muted-foreground">
                      <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-semibold">Selecciona una factura del registro</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Agency Config Card */}
              <Card className="border-border bg-zinc-50/70">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-zinc-500" />
                      Datos de Cabecera de Ticket 80mm
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white">
                      Cargo: RD$ {defaultServiceFee.toFixed(2)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Cargo de Servicio (RD$)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={defaultServiceFee}
                        onChange={(e) => setDefaultServiceFee(parseFloat(e.target.value) || 10)}
                        className="h-8 text-xs bg-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Teléfono Emisora</Label>
                      <Input
                        value={telefonoEmisora}
                        onChange={(e) => setTelefonoEmisora(e.target.value)}
                        className="h-8 text-xs bg-white mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Dirección Sucursal</Label>
                    <Input
                      value={direccionEmisora}
                      onChange={(e) => setDireccionEmisora(e.target.value)}
                      className="h-8 text-xs bg-white mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: BALANCES & SUB-AGENTS MANAGEMENT */}
        <TabsContent value="balances" className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-border shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-foreground">Distribución de Saldos Qik</h2>
              <p className="text-xs text-muted-foreground">
                Envía fondos de la cuenta matriz a los agentes. Al emitirse o sincronizarse facturas de servicios, el saldo se descuenta automáticamente.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsNewAgentOpen(true)}
                variant="outline"
                size="sm"
                className="text-xs font-bold h-9"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Registrar Sub-Agente
              </Button>
              <Button
                onClick={() => setIsTransferOpen(true)}
                size="sm"
                className="bg-primary text-white font-bold text-xs h-9"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Enviar Saldo
              </Button>
            </div>
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((ag) => {
              const pctUsed = ag.allocatedBalanceRD > 0 
                ? Math.min(100, Math.round((ag.totalSpentRD / ag.allocatedBalanceRD) * 100))
                : 0;

              return (
                <Card key={ag.id} className="border-border bg-white shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="p-5 pb-3 border-b border-border/50 flex flex-row items-start justify-between">
                    <div>
                      <Badge variant="outline" className="text-[10px] font-mono text-zinc-600 mb-1">
                        {ag.id}
                      </Badge>
                      <CardTitle className="text-base font-bold text-foreground">
                        {ag.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground/70" />
                        {ag.location}
                      </p>
                    </div>

                    <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px]">
                      Activo
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/70 space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-medium text-muted-foreground">Balance Disponible:</span>
                        <span className="text-lg font-black text-primary" suppressHydrationWarning>
                          RD$ {formatCurrency(ag.currentBalanceRD)}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline text-xs text-muted-foreground pt-1 border-t border-zinc-200">
                        <span>Total Asignado:</span>
                        <span className="font-semibold text-zinc-800" suppressHydrationWarning>
                          RD$ {formatCurrency(ag.allocatedBalanceRD)}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                        <span>Total Pagado en Facturas:</span>
                        <span className="font-semibold text-rose-600" suppressHydrationWarning>
                          - RD$ {formatCurrency(ag.totalSpentRD)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                        <span>Consumo de Saldo</span>
                        <span>{pctUsed}% usado</span>
                      </div>
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${pctUsed > 85 ? "bg-rose-500" : pctUsed > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${pctUsed}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {ag.phone}
                      </span>
                      <span className="font-semibold text-zinc-700">
                        {ag.invoicesCount} facturas
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setTargetAgentId(ag.id);
                          setIsTransferOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-white text-xs font-bold h-8"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                        Recargar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTargetAgentId(ag.id);
                          setIsReturnOpen(true);
                        }}
                        className="text-xs font-semibold h-8 border-zinc-300"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
                        Retornar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 3: TRANSACTION LEDGER & DEDUCTION AUDIT */}
        <TabsContent value="transacciones" className="mt-6 space-y-6">
          <Card className="border-border bg-white shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Libro Mayor de Movimientos y Descuentos
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Registro inmutable de fondeos, transferencias a sub-agentes y débitos automáticos por cobro de facturas
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-50 border-b text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5 font-bold">Fecha / Hora</th>
                      <th className="p-3.5 font-bold">Tipo de Operación</th>
                      <th className="p-3.5 font-bold">Agente / Beneficiario</th>
                      <th className="p-3.5 font-bold">Detalle / Referencia</th>
                      <th className="p-3.5 font-bold text-right">Monto (RD$)</th>
                      <th className="p-3.5 font-bold text-right">Nuevo Balance</th>
                      <th className="p-3.5 font-bold">Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((tx) => {
                      const isDeduction = tx.type === "invoice_payment" || tx.type === "return_from_agent";
                      return (
                        <tr key={tx.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap" suppressHydrationWarning>
                            {new Date(tx.timestamp).toISOString().replace("T", " ").slice(0, 19)}
                          </td>
                          <td className="p-3.5">
                            {tx.type === "topup_master" && (
                              <Badge className="bg-purple-100 text-purple-800 border-none font-bold text-[10px]">
                                Fondeo Matriz
                              </Badge>
                            )}
                            {tx.type === "allocate_agent" && (
                              <Badge className="bg-blue-100 text-blue-800 border-none font-bold text-[10px]">
                                Recarga a Agente
                              </Badge>
                            )}
                            {tx.type === "return_from_agent" && (
                              <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px]">
                                Retorno a Matriz
                              </Badge>
                            )}
                            {tx.type === "invoice_payment" && (
                              <Badge className="bg-rose-100 text-rose-800 border-none font-bold text-[10px]">
                                Pago Factura (-Débito)
                              </Badge>
                            )}
                          </td>
                          <td className="p-3.5 font-semibold text-zinc-900">
                            {tx.agentName || "Cuenta Matriz Qik"}
                          </td>
                          <td className="p-3.5 text-zinc-600 max-w-[260px] truncate">
                            {tx.note || (tx.serviceName ? `${tx.serviceName} (#${tx.noReferencia})` : "Operación de balance")}
                          </td>
                          <td className={`p-3.5 text-right font-bold font-mono ${isDeduction ? "text-rose-600" : "text-emerald-600"}`} suppressHydrationWarning>
                            {isDeduction ? "-" : "+"} RD$ {formatCurrency(tx.amountRD)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-semibold text-zinc-800" suppressHydrationWarning>
                            RD$ {formatCurrency(tx.newBalanceRD)}
                          </td>
                          <td className="p-3.5 text-muted-foreground">
                            {tx.performedBy}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG 1: Transfer Balance to Agent */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Transferir Saldo a Sub-Agente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Envía fondos desde la cuenta matriz para que el agente cobre facturas de servicios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTransferBalance} className="space-y-4 py-2">
            <div className="bg-zinc-50 p-3 rounded-lg border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disponible en Matriz:</span>
                <span className="font-bold text-emerald-600" suppressHydrationWarning>
                  RD$ {formatCurrency(masterPool.availableBalanceRD)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Seleccionar Agente Destinatario</Label>
              <Select value={targetAgentId} onValueChange={setTargetAgentId} required>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecciona un agente" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((ag) => (
                    <SelectItem key={ag.id} value={ag.id}>
                      {ag.name} (Saldo actual: RD$ {formatNumber(ag.currentBalanceRD)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Monto a Enviar (RD$)</Label>
              <Input
                type="number"
                step="100"
                placeholder="Ej: 50000"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="h-9 text-xs font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nota u Observación (Opcional)</Label>
              <Input
                placeholder="Ej: Recarga semanal para pago de Altice/Edenorte"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsTransferOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-white font-bold">
                Confirmar Transferencia
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Return Balance from Agent */}
      <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <ArrowDownLeft className="w-5 h-5" />
              Retornar Saldo a Cuenta Matriz
            </DialogTitle>
            <DialogDescription className="text-xs">
              Devuelve saldo del agente a la cuenta matriz Qik.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReturnBalance} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Agente</Label>
              <Select value={targetAgentId} onValueChange={setTargetAgentId} required>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecciona un agente" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((ag) => (
                    <SelectItem key={ag.id} value={ag.id}>
                      {ag.name} (Saldo: RD$ {formatNumber(ag.currentBalanceRD)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Monto a Retornar (RD$)</Label>
              <Input
                type="number"
                step="100"
                placeholder="Ej: 20000"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="h-9 text-xs font-bold"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsReturnOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                Retornar Fondos
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Edit Master Pool Total */}
      <Dialog open={isEditPoolOpen} onOpenChange={setIsEditPoolOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Ajustar Balance Central Qik Banco Digital
            </DialogTitle>
            <DialogDescription className="text-xs">
              Establece el monto total disponible en tu cuenta matriz Qik para fondear agentes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMasterPool} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nuevo Balance Total en Cuenta Qik (RD$)</Label>
              <Input
                type="number"
                step="1000"
                value={editPoolTotal}
                onChange={(e) => setEditPoolTotal(e.target.value)}
                className="h-10 text-base font-bold"
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1" suppressHydrationWarning>
                Actualmente asignado a agentes: RD$ {formatNumber(masterPool.allocatedBalanceRD)}
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditPoolOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-white font-bold">
                Guardar Balance Central
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Manual New Invoice with Agent Deduction */}
      <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Emitir Factura Qik & Descontar Saldo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ingresa los datos del servicio. El monto total se descontará del agente seleccionado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateManualInvoice} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Agente que realiza el cobro</Label>
              <Select value={formAgentId} onValueChange={setFormAgentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin descontar de agente (Oficina Central)</SelectItem>
                  {agents.map((ag) => (
                    <SelectItem key={ag.id} value={ag.id}>
                      {ag.name} (Disponible: RD$ {formatNumber(ag.currentBalanceRD)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">No. Referencia</Label>
                <Input
                  placeholder="Ej: 53-189181160"
                  value={formReferencia}
                  onChange={(e) => setFormReferencia(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Servicio / Empresa</Label>
                <Select value={formServicio} onValueChange={setFormServicio}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Telefónicas / Altice">Telefónicas / Altice</SelectItem>
                    <SelectItem value="Telefónicas / Claro">Telefónicas / Claro</SelectItem>
                    <SelectItem value="Telefónicas / Viva">Telefónicas / Viva</SelectItem>
                    <SelectItem value="Electricidad / Edenorte">Electricidad / Edenorte</SelectItem>
                    <SelectItem value="Electricidad / Edesur">Electricidad / Edesur</SelectItem>
                    <SelectItem value="Electricidad / Edeeste">Electricidad / Edeeste</SelectItem>
                    <SelectItem value="Agua / CAASD">Agua / CAASD</SelectItem>
                    <SelectItem value="Agua / CORAASAN">Agua / CORAASAN</SelectItem>
                    <SelectItem value="Internet / Wind Telecom">Internet / Wind Telecom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Teléfono / Contrato / NIC</Label>
              <Input
                placeholder="Ej: 8299930707"
                value={formTelefono}
                onChange={(e) => setFormTelefono(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Monto Servicio (RD$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="3853.99"
                  value={formMonto}
                  onChange={(e) => setFormMonto(e.target.value)}
                  className="h-9 text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cargo Servicio (RD$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formCargo}
                  onChange={(e) => setFormCargo(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {formMonto && !isNaN(parseFloat(formMonto)) && (
              <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 text-xs flex justify-between items-center font-semibold">
                <span>TOTAL A COBRAR Y DESCONTAR:</span>
                <span className="text-sm font-black text-primary">
                  RD$ {(parseFloat(formMonto) + (parseFloat(formCargo) || defaultServiceFee)).toFixed(2)}
                </span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewInvoiceOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-white font-bold">
                Generar Ticket & Descontar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: Register Sub-Agent */}
      <Dialog open={isNewAgentOpen} onOpenChange={setIsNewAgentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Registrar Nuevo Sub-Agente Qik
            </DialogTitle>
            <DialogDescription className="text-xs">
              Crea una cuenta para que un negocio o sucursal reciba saldo y cobre servicios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewAgent} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nombre del Establecimiento / Negocio</Label>
              <Input
                placeholder="Ej: Bodega Don José"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Propietario</Label>
                <Input
                  placeholder="José Gómez"
                  value={agentOwner}
                  onChange={(e) => setAgentOwner(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Teléfono</Label>
                <Input
                  placeholder="809-555-0101"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ubicación / Dirección</Label>
              <Input
                placeholder="Ej: Dajabón Centro / Calle Sánchez #12"
                value={agentLocation}
                onChange={(e) => setAgentLocation(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Saldo Inicial a Asignar (RD$)</Label>
              <Input
                type="number"
                step="500"
                placeholder="Ej: 50000 (Opcional)"
                value={agentInitialBal}
                onChange={(e) => setAgentInitialBal(e.target.value)}
                className="h-9 text-xs font-bold"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewAgentOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-white font-bold">
                Guardar Sub-Agente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 6: Paste Email Content */}
      <Dialog open={isPasteEmailOpen} onOpenChange={setIsPasteEmailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Pegar Texto de Correo Qik
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pega el correo recibido de Qik para extraer la referencia, monto y generar el ticket de 80mm
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descontar pago de agente (Opcional)</Label>
              <Select value={pasteAgentId} onValueChange={setPasteAgentId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin descontar (Cuenta General)</SelectItem>
                  {agents.map((ag) => (
                    <SelectItem key={ag.id} value={ag.id}>
                      {ag.name} (Saldo: RD$ {formatNumber(ag.currentBalanceRD)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <textarea
              className="w-full h-40 p-3 text-xs font-mono border rounded-lg bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={`Pega aquí el contenido del correo de Qik...\nEjemplo:\nTu pago de servicio Altice para el número 8299930707 por RD$ 3,853.99 con referencia 53-189181160 fue procesado exitosamente.`}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPasteEmailOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleParsePastedEmail}
              disabled={!pasteContent.trim()}
              className="bg-primary text-white font-bold"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Procesar y Emitir Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
