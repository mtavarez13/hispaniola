"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSystemSettings } from "@/lib/settings-context";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { 
  Wallet, 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Smartphone, 
  Building2, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  Copy, 
  QrCode, 
  Send, 
  RefreshCw, 
  MapPin, 
  Phone, 
  Share2, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Plus,
  ArrowRightLeft,
  Search,
  Filter,
  Landmark,
  DollarSign,
  Printer,
  Sparkles,
  Check,
  ChevronRight,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  getClientWalletBalances, 
  saveClientWalletBalances,
  getClientDeposits,
  saveClientDeposit,
  getClientMovements,
  addClientMovement,
  transferBetweenPockets,
  confirmDepositAndCreditWallet,
  sendRemittanceFromClientWallet,
  WalletBalances
} from "@/lib/client-wallet-service";
import { ClientDepositRecord, ClientWalletMovement, HaitiDepositTransaction } from "@/lib/types";
import { DEFAULT_SUB_AGENTS, loadSubAgentsFromStorage } from "@/lib/sub-agents-service";
import { detectHaitiOperator, formatHaitiPhoneNumber } from "@/lib/bencash/utils";

function ClientWalletContent() {
  const { user, userProfile, updateProfileBalances } = useAuth();
  const { settings } = useSystemSettings();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const queryTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(queryTab || "send");

  // Balances
  const uid = user?.uid || userProfile?.uid || "guest_client";
  const [balances, setBalances] = useState<WalletBalances>({
    walletBalance: 150.0,
    savingsBalance: 50.0,
    clientCode: userProfile?.clientCode || "CLI-8821",
    phone: userProfile?.phone || "+1 (829) 450-2211",
    idNumber: userProfile?.idNumber || "",
  });

  // Data lists
  const [deposits, setDeposits] = useState<ClientDepositRecord[]>([]);
  const [movements, setMovements] = useState<ClientWalletMovement[]>([]);
  const [subAgentsList, setSubAgentsList] = useState(DEFAULT_SUB_AGENTS);
  const [copiedCode, setCopiedCode] = useState(false);

  // Exchange Rates
  const rateDOP = settings?.publicRateDOP || 58.5;
  const rateHTG = settings?.publicRateHTG || 132.2;
  const feePercent = settings?.defaultFeePercent || 5.0;

  // Load balances and data
  const refreshData = useCallback(() => {
    const b = getClientWalletBalances(uid, userProfile);
    setBalances(b);
    setDeposits(getClientDeposits(uid));
    setMovements(getClientMovements(uid));
    try {
      const loadedSubAgents = loadSubAgentsFromStorage();
      if (loadedSubAgents && loadedSubAgents.length > 0) {
        setSubAgentsList(loadedSubAgents);
      }
    } catch (_) {}
  }, [uid, userProfile]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (queryTab) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  // Sync balances with AuthContext
  const syncBalances = (newB: WalletBalances) => {
    setBalances(newB);
    saveClientWalletBalances(uid, newB);
    if (updateProfileBalances) {
      updateProfileBalances(newB.walletBalance, newB.savingsBalance);
    }
  };

  // --- FORM STATE: SEND REMITTANCE TO HAITI DIRECTLY WITH WALLET ---
  const [sendPhone, setSendPhone] = useState("50940885084");
  const [sendOperator, setSendOperator] = useState<"MonCash" | "NatCash">("MonCash");
  const [sendRecipientName, setSendRecipientName] = useState("");
  const [sendAmountUSD, setSendAmountUSD] = useState<number>(30);
  const [sendProcessing, setSendProcessing] = useState(false);
  const [recentSentTx, setRecentSentTx] = useState<HaitiDepositTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedReceiptMovement, setSelectedReceiptMovement] = useState<ClientWalletMovement | null>(null);

  // Auto detect operator from phone
  useEffect(() => {
    const clean = sendPhone.replace(/\D/g, "");
    if (clean.length >= 8) {
      const detected = detectHaitiOperator(clean);
      if (detected.isDetected && (detected.operator === "MonCash" || detected.operator === "NatCash")) {
        setSendOperator(detected.operator);
      }
    }
  }, [sendPhone]);

  const sendFeeUSD = Math.round(sendAmountUSD * (feePercent / 100) * 100) / 100;
  const totalSendUSD = Math.round((sendAmountUSD + sendFeeUSD) * 100) / 100;
  const receiveHTG = Math.round(sendAmountUSD * rateHTG);

  const handleSendRemittance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendRecipientName.trim()) {
      toast({
        variant: "destructive",
        title: "Nombre requerido",
        description: "Por favor escribe el nombre completo del beneficiario en Haití.",
      });
      return;
    }
    if (sendAmountUSD <= 0) {
      toast({
        variant: "destructive",
        title: "Monto inválido",
        description: "Ingresa un monto en dólares mayor a 0.",
      });
      return;
    }
    if (balances.walletBalance < totalSendUSD) {
      toast({
        variant: "destructive",
        title: "Saldo insuficiente",
        description: `Necesitas $${totalSendUSD.toFixed(2)} USD pero dispones de $${balances.walletBalance.toFixed(2)} USD en tu billetera. Por favor deposita en un Sub-Agente o transfiere de tu ahorro.`,
      });
      return;
    }

    setSendProcessing(true);
    setTimeout(() => {
      const result = sendRemittanceFromClientWallet({
        clientId: uid,
        senderName: userProfile?.name || user?.displayName || "Cliente Registrado",
        senderPhone: balances.phone,
        operator: sendOperator,
        recipientPhone: sendPhone,
        recipientName: sendRecipientName.trim(),
        amountUSD: sendAmountUSD,
        feePercent,
        rateHTG,
      });

      setSendProcessing(false);

      if (result.success && result.tx && result.movement) {
        toast({
          title: "¡Remesa Enviada con Éxito!",
          description: result.message,
        });
        setRecentSentTx(result.tx);
        setSelectedReceiptMovement(result.movement);
        setIsReceiptOpen(true);
        refreshData();
        // Clear fields
        setSendRecipientName("");
        setSendAmountUSD(30);
      } else {
        toast({
          variant: "destructive",
          title: "Error al enviar remesa",
          description: result.message,
        });
      }
    }, 600);
  };

  // --- FORM STATE: DEPOSIT AT SUB-AGENT ---
  const [depositSubAgentId, setDepositSubAgentId] = useState(subAgentsList[0]?.id || "SA-101");
  const [depositAmount, setDepositAmount] = useState<number>(3000);
  const [depositCurrency, setDepositCurrency] = useState<"DOP" | "USD">("DOP");
  const [depositTargetPocket, setDepositTargetPocket] = useState<"main" | "savings">("main");
  const [createdDepositOrder, setCreatedDepositOrder] = useState<ClientDepositRecord | null>(null);
  const [isDepositOrderModalOpen, setIsDepositOrderModalOpen] = useState(false);

  // Calculate equivalent USD credited
  const depositCreditedUSD = useMemo(() => {
    if (depositCurrency === "USD") return depositAmount;
    return Math.round((depositAmount / rateDOP) * 100) / 100;
  }, [depositAmount, depositCurrency, rateDOP]);

  const handleCreateSubAgentDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (depositAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Monto inválido",
        description: "Por favor indica el monto a depositar.",
      });
      return;
    }

    const selectedAgent = subAgentsList.find((s) => s.id === depositSubAgentId) || subAgentsList[0];
    const newOrder: ClientDepositRecord = {
      id: `DEP-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: uid,
      clientName: userProfile?.name || user?.displayName || "Cliente Registrado",
      clientCode: balances.clientCode,
      clientPhone: balances.phone,
      amount: depositAmount,
      currency: depositCurrency,
      amountCreditedUSD: depositCreditedUSD,
      method: "sub_agent",
      subAgentId: selectedAgent.id,
      subAgentName: selectedAgent.name,
      subAgentLocation: `${selectedAgent.location.exactAddress}, ${selectedAgent.location.municipality}`,
      targetPocket: depositTargetPocket,
      status: "pending",
      voucherCode: `VOUCH-${Math.floor(1000 + Math.random() * 9000)}-${selectedAgent.id.replace("SA-", "")}`,
      notes: "Orden de depósito creada para entrega en efectivo en sub-agente.",
      createdAt: new Date().toISOString(),
    };

    saveClientDeposit(newOrder);
    setCreatedDepositOrder(newOrder);
    setIsDepositOrderModalOpen(true);
    refreshData();

    toast({
      title: "¡Boleto de Depósito Generado!",
      description: `Presenta tu código ${balances.clientCode} o referencia ${newOrder.id} en ${selectedAgent.name}.`,
    });
  };

  // Simulate immediate approval at sub-agent
  const handleSimulateSubAgentCashierApproval = (depositId: string) => {
    const res = confirmDepositAndCreditWallet(depositId, "Cajero Sub-Agente (Confirmación en Ventanilla)");
    if (res.success) {
      toast({
        title: "¡Depósito Recibido y Acreditado!",
        description: res.message,
      });
      setIsDepositOrderModalOpen(false);
      refreshData();
    } else {
      toast({
        variant: "destructive",
        title: "Nota",
        description: res.message,
      });
    }
  };

  // --- FORM STATE: BANK TRANSFER DEPOSIT (RD) ---
  const [bankName, setBankName] = useState<"Banreservas" | "Banco BHD" | "Banco Popular">("Banreservas");
  const [bankRef, setBankRef] = useState("");
  const [bankAmountDOP, setBankAmountDOP] = useState<number>(6000);
  const [bankTargetPocket, setBankTargetPocket] = useState<"main" | "savings">("main");

  const handleRegisterBankDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankRef.trim()) {
      toast({
        variant: "destructive",
        title: "Referencia requerida",
        description: "Ingresa el número de comprobante o referencia de la transferencia bancaria.",
      });
      return;
    }

    const credited = Math.round((bankAmountDOP / rateDOP) * 100) / 100;
    const newBankDeposit: ClientDepositRecord = {
      id: `DEP-BNK-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: uid,
      clientName: userProfile?.name || user?.displayName || "Cliente Registrado",
      clientCode: balances.clientCode,
      clientPhone: balances.phone,
      amount: bankAmountDOP,
      currency: "DOP",
      amountCreditedUSD: credited,
      method: "bank_transfer",
      bankName,
      bankReference: bankRef.trim(),
      targetPocket: bankTargetPocket,
      status: "completed", // auto match for demonstration
      voucherCode: `VOUCH-BNK-${Date.now().toString().slice(-5)}`,
      notes: `Transferencia reportada de ${bankName}. Comprobante: ${bankRef.trim()}`,
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      confirmedBy: "Verificación Automática Gmail Banreservas/BHD/Popular",
    };

    saveClientDeposit(newBankDeposit);

    // Credit wallet immediately
    const updated = {
      ...balances,
      ...(bankTargetPocket === "savings" 
        ? { savingsBalance: Math.round((balances.savingsBalance + credited) * 100) / 100 }
        : { walletBalance: Math.round((balances.walletBalance + credited) * 100) / 100 }),
    };
    syncBalances(updated);

    addClientMovement({
      id: `MOV-${Date.now().toString().slice(-6)}`,
      clientId: uid,
      type: "deposit_bank",
      title: `Depósito Bancario ${bankName}`,
      description: `Comprobante ${bankRef.trim()} acreditado: +$${credited.toFixed(2)} USD (RD$ ${bankAmountDOP.toLocaleString()})`,
      amountUSD: credited,
      direction: "in",
      targetPocket: bankTargetPocket,
      date: new Date().toISOString(),
      referenceId: newBankDeposit.id,
      status: "completed",
      receiptCode: newBankDeposit.voucherCode,
    });

    toast({
      title: "¡Depósito Bancario Verificado y Acreditado!",
      description: `Se han sumado +$${credited.toFixed(2)} USD a tu ${bankTargetPocket === "savings" ? "Bolsillo de Ahorro" : "Billetera Principal"}.`,
    });

    setBankRef("");
    refreshData();
  };

  // --- DIALOG: TRANSFER BETWEEN POCKETS (AHORRO) ---
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferDirection, setTransferDirection] = useState<"to_savings" | "to_main">("to_savings");
  const [transferAmountUSD, setTransferAmountUSD] = useState<number>(25);

  const handleExecutePocketTransfer = () => {
    const fromPocket = transferDirection === "to_savings" ? "main" : "savings";
    const toPocket = transferDirection === "to_savings" ? "savings" : "main";

    const res = transferBetweenPockets(uid, transferAmountUSD, fromPocket, toPocket);
    if (res.success && res.newBalances) {
      syncBalances(res.newBalances);
      toast({
        title: "¡Traspaso Exitoso!",
        description: res.message,
      });
      setIsTransferModalOpen(false);
      refreshData();
    } else {
      toast({
        variant: "destructive",
        title: "No se pudo realizar el traspaso",
        description: res.message,
      });
    }
  };

  const copyClientCode = () => {
    navigator.clipboard.writeText(balances.clientCode);
    setCopiedCode(true);
    toast({
      title: "Código copiado",
      description: `Código ${balances.clientCode} copiado al portapapeles.`,
    });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // WhatsApp share link for remittance recipient
  const getWhatsAppShareLink = (tx: HaitiDepositTransaction) => {
    const text = `Hola ${tx.recipientName}! Te he enviado una remesa de $${tx.amountUSD} USD (${tx.amountHTG.toLocaleString()} Gourdes) vía Hispaniola Pay a tu cuenta ${tx.operator} (${tx.toAccountNumber}). Comprobante: ${tx.txId}. ¡Ya puedes verificar tu saldo!`;
    return `https://wa.me/${tx.toAccountNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold gap-1 py-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Cuenta de Cliente Activa
            </Badge>
            <span className="text-xs text-muted-foreground">• ID Cliente: <strong className="text-slate-800">{balances.clientCode}</strong></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Mi Billetera & Bolsillo de Ahorro
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Deposita efectivo en cualquiera de nuestros Sub-Agentes en RD, aparta tus ahorros y envía directo a MonCash y Natcash en Haití.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setTransferDirection("to_savings");
              setIsTransferModalOpen(true);
            }}
            className="text-xs font-bold gap-1.5 border-blue-200 text-blue-800 hover:bg-blue-50"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Mover a Ahorro
          </Button>

          <Button 
            size="sm" 
            onClick={() => setActiveTab("deposit")}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Depositar en Sub-Agente
          </Button>
        </div>
      </div>

      {/* DUAL POCKET WALLET CARDS + CLIENT ID CARNET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Wallet: Saldo Disponible para Envíos */}
        <Card className="lg:col-span-5 border-none shadow-lg bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/40 border border-blue-400/30 flex items-center justify-center text-blue-200">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">Billetera Principal</span>
                  <span className="text-xs text-blue-300/80">Saldo disponible para enviar a Haití</span>
                </div>
              </div>
              <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/40 text-[10px]">
                Envíos 24/7
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-2 pb-4 space-y-3">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                ${balances.walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-semibold text-blue-300">USD</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-blue-200/90 font-medium">
                <span>≈ RD$ {(balances.walletBalance * rateDOP).toLocaleString("en-US", { maximumFractionDigits: 2 })} DOP</span>
                <span>•</span>
                <span>≈ {(balances.walletBalance * rateHTG).toLocaleString("en-US", { maximumFractionDigits: 0 })} HTG (MonCash/Natcash)</span>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <Button 
                onClick={() => setActiveTab("send")}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-9 gap-1.5 shadow-xs"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Enviar a Haití
              </Button>

              <Button 
                onClick={() => setActiveTab("deposit")}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs h-9 gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                Recargar en Agente
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Savings Pocket: Bolsillo de Ahorro */}
        <Card className="lg:col-span-4 border-none shadow-lg bg-gradient-to-br from-emerald-900 via-emerald-950 to-teal-950 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/40 border border-emerald-400/30 flex items-center justify-center text-emerald-200">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block">Bolsillo de Ahorro</span>
                  <span className="text-xs text-emerald-300/80">Fondos protegidos / de reserva</span>
                </div>
              </div>
              <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/40 text-[10px]">
                Seguro
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-2 pb-4 space-y-3">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                ${balances.savingsBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-semibold text-emerald-300">USD</span>
              </div>
              <div className="mt-1 text-[11px] text-emerald-200/90 font-medium">
                ≈ RD$ {(balances.savingsBalance * rateDOP).toLocaleString("en-US", { maximumFractionDigits: 2 })} DOP protegidos
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <Button 
                onClick={() => {
                  setTransferDirection("to_savings");
                  setIsTransferModalOpen(true);
                }}
                className="bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs h-9 gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-700" />
                Guardar Ahorro
              </Button>

              <Button 
                onClick={() => {
                  setTransferDirection("to_main");
                  setIsTransferModalOpen(true);
                }}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs h-9 gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Liberar a Billetera
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Client ID Carnet (Para presentar en Sub-Agentes) */}
        <Card className="lg:col-span-3 border border-amber-200/80 shadow-md bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 relative">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider">Carnet de Cliente</span>
              <Badge className="bg-amber-400 text-amber-950 font-bold text-[10px]">Ventanilla RD</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-1 pb-4 space-y-2.5 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">Código Único de Depósito:</span>
              <div className="flex items-center justify-between bg-white border border-amber-300 rounded-lg p-2 mt-0.5 shadow-xs">
                <span className="font-mono font-black text-base text-amber-950 tracking-wider">
                  {balances.clientCode}
                </span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={copyClientCode}
                  className="h-7 px-2 text-[11px] font-bold text-amber-800 hover:text-amber-900 hover:bg-amber-100/60"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="ml-1">{copiedCode ? "Copiado" : "Copiar"}</span>
                </Button>
              </div>
            </div>

            <div className="text-[11px] text-slate-700 space-y-0.5">
              <div><strong>Titular:</strong> {userProfile?.name || user?.displayName || "Cliente"}</div>
              <div><strong>Teléfono:</strong> {balances.phone}</div>
              {balances.idNumber && <div><strong>Doc:</strong> {balances.idNumber}</div>}
            </div>

            <div className="text-[10px] text-amber-800 bg-amber-100/60 p-2 rounded-md">
              💡 Dicta tu código al cajero del Sub-Agente para que tu depósito entre de inmediato a tu billetera.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MAIN OPERATIONS TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full bg-white p-1.5 rounded-2xl shadow-sm border border-border h-auto">
          <TabsTrigger value="send" className="py-2.5 text-xs font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-xl gap-2">
            <Smartphone className="w-4 h-4" />
            <span>Enviar a Haití</span>
          </TabsTrigger>

          <TabsTrigger value="deposit" className="py-2.5 text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 rounded-xl gap-2">
            <Building2 className="w-4 h-4" />
            <span>Depositar en Sub-Agente</span>
          </TabsTrigger>

          <TabsTrigger value="bank" className="py-2.5 text-xs font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-xl gap-2">
            <Landmark className="w-4 h-4" />
            <span>Depósito Bancario RD</span>
          </TabsTrigger>

          <TabsTrigger value="history" className="py-2.5 text-xs font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-xl gap-2">
            <Receipt className="w-4 h-4" />
            <span>Registro y Movimientos</span>
          </TabsTrigger>

          <TabsTrigger value="subagents" className="py-2.5 text-xs font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-xl gap-2">
            <MapPin className="w-4 h-4" />
            <span>Puntos de Depósito</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ENVIAR A MONCASH / NATCASH DESDE LA BILLETERA */}
        <TabsContent value="send" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Card className="lg:col-span-7 border-none shadow-md bg-white">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                      🇭🇹
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">
                        Envío Directo con Saldo de Billetera
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Descuenta instantáneamente de tu saldo disponible sin tener que ir a un banco.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    Saldo: ${balances.walletBalance.toFixed(2)} USD
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={handleSendRemittance} className="space-y-5">
                  {/* Operator selector pills */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Operador en Haití</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSendOperator("MonCash")}
                        className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                          sendOperator === "MonCash"
                            ? "border-red-600 bg-red-50/60 shadow-xs"
                            : "border-border hover:bg-secondary/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                            MC
                          </div>
                          <div>
                            <div className="text-xs font-black text-red-950">MonCash (Digicel)</div>
                            <div className="text-[10px] text-muted-foreground">Números 509 3XXX, 4XXX</div>
                          </div>
                        </div>
                        {sendOperator === "MonCash" && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSendOperator("NatCash")}
                        className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                          sendOperator === "NatCash"
                            ? "border-blue-600 bg-blue-50/60 shadow-xs"
                            : "border-border hover:bg-secondary/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                            NC
                          </div>
                          <div>
                            <div className="text-xs font-black text-blue-950">NatCash (Natcom)</div>
                            <div className="text-[10px] text-muted-foreground">Números 509 2XXX, 4XXX</div>
                          </div>
                        </div>
                        {sendOperator === "NatCash" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </button>
                    </div>
                  </div>

                  {/* Recipient Phone & Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sendPhone" className="text-xs font-bold">Número Móvil Haití (+509)</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="sendPhone"
                          value={sendPhone}
                          onChange={(e) => setSendPhone(e.target.value)}
                          placeholder="50940885084"
                          className="pl-9 font-mono text-xs"
                          required
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">Detectado: {sendOperator}</span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sendRecipient" className="text-xs font-bold">Nombre del Beneficiario en Haití</Label>
                      <Input
                        id="sendRecipient"
                        value={sendRecipientName}
                        onChange={(e) => setSendRecipientName(e.target.value)}
                        placeholder="Ej. Jean Baptiste Pierre"
                        className="text-xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Amount to send */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="sendAmount" className="text-xs font-bold">Monto a Enviar (USD)</Label>
                      <span className="text-[11px] text-muted-foreground">
                        Disponible: <strong>${balances.walletBalance.toFixed(2)} USD</strong>
                      </span>
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        id="sendAmount"
                        type="number"
                        min="1"
                        max={balances.walletBalance}
                        value={sendAmountUSD}
                        onChange={(e) => setSendAmountUSD(Number(e.target.value))}
                        className="pl-9 text-base font-black"
                        required
                      />
                    </div>

                    {/* Quick amount pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[15, 25, 50, 75, 100].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          disabled={amt > balances.walletBalance}
                          onClick={() => setSendAmountUSD(amt)}
                          className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition-all ${
                            sendAmountUSD === amt
                              ? "bg-slate-900 text-white border-slate-900"
                              : amt > balances.walletBalance
                              ? "opacity-40 cursor-not-allowed bg-slate-100 text-slate-400"
                              : "bg-secondary/60 hover:bg-secondary text-slate-700 border-border"
                          }`}
                        >
                          ${amt} USD
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Breakdown details */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Monto base enviado:</span>
                      <span className="font-bold text-slate-900">${sendAmountUSD.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tasa de cambio del día:</span>
                      <span className="font-bold text-slate-900">1 USD = {rateHTG.toFixed(2)} HTG</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50/80 p-2 rounded-lg border border-emerald-200/60">
                      <span>Recibe en Haití ({sendOperator}):</span>
                      <span className="text-sm font-black" suppressHydrationWarning>{receiveHTG.toLocaleString("en-US")} HTG</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tarifa del servicio ({feePercent}%):</span>
                      <span className="font-bold text-slate-900">${sendFeeUSD.toFixed(2)} USD</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between text-slate-900 font-black text-sm">
                      <span>Total debitado de Billetera:</span>
                      <span className="text-primary">${totalSendUSD.toFixed(2)} USD</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={sendProcessing || balances.walletBalance < totalSendUSD}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-md gap-2"
                  >
                    {sendProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {balances.walletBalance < totalSendUSD
                      ? "Saldo Insuficiente en Billetera"
                      : `Confirmar Envío (${sendOperator}) • $${totalSendUSD.toFixed(2)} USD`}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Quick Tips & Limits Card */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-none shadow-md bg-white">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> ¿Cómo funciona el envío desde Billetera?
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <strong className="text-slate-900 block">Saldo en Billetera:</strong>
                      Mantén saldo depositando efectivo en nuestros Sub-Agentes en RD o por transferencia bancaria.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <strong className="text-slate-900 block">Envío Inmediato:</strong>
                      Tu familiar o contacto en Haití recibe el dinero directamente en su billetera Digicel MonCash o Natcom Natcash en cuestión de segundos.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <strong className="text-slate-900 block">Notificación por WhatsApp:</strong>
                      Al completar el envío, te entregamos un enlace oficial para enviarle el comprobante a tu receptor en Haití.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pocket status shortcut */}
              <Card className="border border-blue-100 bg-blue-50/40 p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-blue-950">¿Necesitas fondos para enviar?</span>
                  <Badge variant="outline" className="border-blue-300 text-blue-800 text-[10px]">Ahorro Disponible</Badge>
                </div>
                <p className="text-[11px] text-blue-800/90 leading-relaxed">
                  Tienes <strong>${balances.savingsBalance.toFixed(2)} USD</strong> en tu Bolsillo de Ahorro. Si los necesitas para un envío, puedes transferirlos a tu saldo disponible en 1 clic.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setTransferDirection("to_main");
                    setIsTransferModalOpen(true);
                  }}
                  className="w-full text-xs font-bold border-blue-300 text-blue-900 hover:bg-blue-100/60 h-8"
                >
                  Liberar Fondos desde Ahorro
                </Button>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: DEPOSITAR EN SUB-AGENTE */}
        <TabsContent value="deposit" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Card className="lg:col-span-7 border-none shadow-md bg-white">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      🏢
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">
                        Generar Orden de Depósito en Sub-Agente
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Deposita efectivo en pesos (DOP) o dólares (USD) en ventanilla en cualquiera de nuestros puntos.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-900 text-[10px] font-bold">Sin comisión extra</Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={handleCreateSubAgentDeposit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subAgentSelect" className="text-xs font-bold">Seleccionar Sub-Agente de Depósito</Label>
                    <Select value={depositSubAgentId} onValueChange={setDepositSubAgentId}>
                      <SelectTrigger id="subAgentSelect" className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {subAgentsList.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id} className="text-xs">
                            {agent.name} — {agent.location.municipality} ({agent.location.country === "DO" ? "🇩🇴 Rep. Dominicana" : "🇭🇹 Haití"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="depositAmount" className="text-xs font-bold">Monto a Entregar</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        min="1"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(Number(e.target.value))}
                        className="text-base font-black"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="depositCurrency" className="text-xs font-bold">Moneda del Depósito</Label>
                      <Select value={depositCurrency} onValueChange={(v: "DOP" | "USD") => setDepositCurrency(v)}>
                        <SelectTrigger id="depositCurrency" className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DOP">🇩🇴 Pesos Dominicanos (DOP)</SelectItem>
                          <SelectItem value="USD">🇺🇸 Dólares Estadounidenses (USD)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Destino de los Fondos</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDepositTargetPocket("main")}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          depositTargetPocket === "main"
                            ? "border-blue-600 bg-blue-50/70 font-bold text-blue-950 shadow-xs"
                            : "border-border hover:bg-secondary/40 text-slate-600"
                        }`}
                      >
                        <div className="text-xs">Billetera Principal</div>
                        <div className="text-[10px] text-muted-foreground font-normal">Disponible para enviar a Haití</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDepositTargetPocket("savings")}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          depositTargetPocket === "savings"
                            ? "border-emerald-600 bg-emerald-50/70 font-bold text-emerald-950 shadow-xs"
                            : "border-border hover:bg-secondary/40 text-slate-600"
                        }`}
                      >
                        <div className="text-xs">Bolsillo de Ahorro</div>
                        <div className="text-[10px] text-muted-foreground font-normal">Fondo protegido de reserva</div>
                      </button>
                    </div>
                  </div>

                  {/* Summary calculation */}
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5 text-xs text-amber-950">
                    <div className="flex justify-between">
                      <span>Monto en ventanilla:</span>
                      <strong className="font-mono" suppressHydrationWarning>{depositAmount.toLocaleString("en-US")} {depositCurrency}</strong>
                    </div>
                    {depositCurrency === "DOP" && (
                      <div className="flex justify-between text-[11px] text-amber-800">
                        <span>Tasa oficial de conversión:</span>
                        <span>1 USD = {rateDOP.toFixed(2)} DOP</span>
                      </div>
                    )}
                    <div className="border-t border-amber-200 pt-1.5 flex justify-between font-bold">
                      <span>Monto que ingresará a tu billetera:</span>
                      <span className="text-sm font-black text-emerald-700">+${depositCreditedUSD.toFixed(2)} USD</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-md gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    Generar Boleto de Depósito y Código QR
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Instruction guide */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-none shadow-md bg-white">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-600" /> Pasos para Depositar en Sub-Agente
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs text-slate-600">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block">Paso 1: Genera tu orden</span>
                    <p className="text-[11px]">Indica el monto y el sub-agente más cercano para obtener tu código de depósito.</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block">Paso 2: Entrega en ventanilla</span>
                    <p className="text-[11px]">Acércate al sub-agente y entrega el dinero en efectivo dictando tu código <strong>{balances.clientCode}</strong>.</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block">Paso 3: Acreditación inmediata</span>
                    <p className="text-[11px]">El cajero confirma el depósito y tus fondos aparecen acreditados en tu billetera en tiempo real.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: DEPÓSITO BANCARIO RD (BANRESERVAS, BHD, POPULAR) */}
        <TabsContent value="bank" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Card className="lg:col-span-7 border-none shadow-md bg-white">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    🏦
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Reportar Transferencia Bancaria RD
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Si transferiste desde tu cuenta de Banreservas, BHD o Banco Popular, ingresa el comprobante aquí.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={handleRegisterBankDeposit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankSelect" className="text-xs font-bold">Banco Dominicano Emisor</Label>
                    <Select value={bankName} onValueChange={(v: any) => setBankName(v)}>
                      <SelectTrigger id="bankSelect" className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Banreservas">Banreservas (Banco de Reservas)</SelectItem>
                        <SelectItem value="Banco BHD">Banco BHD</SelectItem>
                        <SelectItem value="Banco Popular">Banco Popular Dominicano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankAmount" className="text-xs font-bold">Monto Transferido (RD$)</Label>
                      <Input
                        id="bankAmount"
                        type="number"
                        min="100"
                        value={bankAmountDOP}
                        onChange={(e) => setBankAmountDOP(Number(e.target.value))}
                        className="text-base font-black"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bankRef" className="text-xs font-bold">No. Comprobante / Referencia Bancaria</Label>
                      <Input
                        id="bankRef"
                        value={bankRef}
                        onChange={(e) => setBankRef(e.target.value)}
                        placeholder="Ej. REF-9948210"
                        className="text-xs font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Destino de los Fondos Acreditados</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBankTargetPocket("main")}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          bankTargetPocket === "main"
                            ? "border-blue-600 bg-blue-50/70 font-bold text-blue-950 shadow-xs"
                            : "border-border hover:bg-secondary/40 text-slate-600"
                        }`}
                      >
                        <div className="text-xs">Billetera Principal</div>
                        <div className="text-[10px] text-muted-foreground font-normal">Para remesas a Haití</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBankTargetPocket("savings")}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          bankTargetPocket === "savings"
                            ? "border-emerald-600 bg-emerald-50/70 font-bold text-emerald-950 shadow-xs"
                            : "border-border hover:bg-secondary/40 text-slate-600"
                        }`}
                      >
                        <div className="text-xs">Bolsillo de Ahorro</div>
                        <div className="text-[10px] text-muted-foreground font-normal">Ahorro protegido</div>
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Equivalente acreditado en USD:</span>
                      <strong className="text-base font-black text-emerald-700">
                        +${(bankAmountDOP / rateDOP).toFixed(2)} USD
                      </strong>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Tasa: 1 USD = {rateDOP.toFixed(2)} DOP</span>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-md gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Registrar Comprobante y Acreditar Billetera
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Official Accounts Box */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-none shadow-md bg-white">
                <CardHeader className="pb-2 border-b border-border/60">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Cuentas Oficiales HispaniolaPay en RD
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Transfiere únicamente a las cuentas corporativas autorizadas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                    <div className="font-bold text-blue-950">Banco de Reservas (Banreservas)</div>
                    <div className="text-[11px] text-slate-600">Cuenta Corriente en DOP:</div>
                    <div className="font-mono font-bold text-blue-900 text-xs">960-293847-1</div>
                    <div className="text-[10px] text-muted-foreground">Titular: HispaniolaPay Remesas SRL (RNC: 1-32-98472-1)</div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                    <div className="font-bold text-amber-950">Banco BHD</div>
                    <div className="text-[11px] text-slate-600">Cuenta de Ahorros en DOP:</div>
                    <div className="font-mono font-bold text-amber-900 text-xs">084-928174-3</div>
                    <div className="text-[10px] text-muted-foreground">Titular: HispaniolaPay Remesas SRL</div>
                  </div>

                  <div className="p-3 rounded-xl bg-red-50/60 border border-red-100">
                    <div className="font-bold text-red-950">Banco Popular Dominicano</div>
                    <div className="text-[11px] text-slate-600">Cuenta Corriente en DOP:</div>
                    <div className="font-mono font-bold text-red-900 text-xs">792-817264-0</div>
                    <div className="text-[10px] text-muted-foreground">Titular: HispaniolaPay Remesas SRL</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: REGISTRO DE DEPÓSITOS Y MOVIMIENTOS */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                  Registro de Depósitos y Movimientos
                </CardTitle>
                <CardDescription className="text-xs">
                  Historial completo de tus recargas en sub-agentes, transferencias bancarias, traspasos a ahorro y remesas enviadas.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={refreshData} className="gap-1.5 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Actualizar
              </Button>
            </CardHeader>

            <CardContent className="pt-4">
              {movements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <Receipt className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold">No tienes movimientos registrados todavía.</p>
                  <p className="text-xs">Deposita en un Sub-Agente para comenzar a operar.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/40 text-xs">
                      <TableRow>
                        <TableHead>Fecha y Hora</TableHead>
                        <TableHead>Tipo de Movimiento</TableHead>
                        <TableHead>Descripción / Referencia</TableHead>
                        <TableHead>Bolsillo</TableHead>
                        <TableHead>Monto (USD)</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Comprobante</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {movements.map((mov) => {
                        const isIncome = mov.direction === "in";
                        const isOut = mov.direction === "out";

                        return (
                          <TableRow key={mov.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-slate-600 whitespace-nowrap">
                              {new Date(mov.date).toLocaleDateString()} {new Date(mov.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {isIncome && <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />}
                                {isOut && <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />}
                                {mov.direction === "transfer" && <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />}
                                <span className="font-bold text-slate-900">{mov.title}</span>
                              </div>
                            </TableCell>

                            <TableCell className="text-slate-600 max-w-xs truncate">
                              {mov.description}
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${
                                mov.targetPocket === "savings" 
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                                  : "bg-blue-50 text-blue-800 border-blue-200"
                              }`}>
                                {mov.targetPocket === "savings" ? "Ahorro" : "Principal"}
                              </Badge>
                            </TableCell>

                            <TableCell className="font-mono font-black">
                              <span className={isIncome ? "text-emerald-600" : isOut ? "text-red-600" : "text-blue-600"}>
                                {isIncome ? "+" : isOut ? "-" : ""}${mov.amountUSD.toFixed(2)} USD
                              </span>
                            </TableCell>

                            <TableCell>
                              <Badge className={
                                mov.status === "completed" 
                                  ? "bg-emerald-100 text-emerald-800 text-[10px]" 
                                  : "bg-amber-100 text-amber-800 text-[10px]"
                              }>
                                {mov.status === "completed" ? "Completado" : "Pendiente"}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedReceiptMovement(mov);
                                  setIsReceiptOpen(true);
                                }}
                                className="h-7 text-[11px] text-blue-700 hover:text-blue-800 font-bold"
                              >
                                Ver Recibo
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: RED DE SUB-AGENTES CERCANOS */}
        <TabsContent value="subagents" className="space-y-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Puntos de Depósito y Sub-Agentes Autorizados
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Acércate a cualquiera de nuestros puntos en República Dominicana para depositar efectivo en tu billetera.
                  </CardDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-800 text-xs font-bold w-fit">
                  {subAgentsList.length} Puntos Activos
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subAgentsList.map((agent) => (
                  <div key={agent.id} className="p-4 rounded-xl border border-border hover:border-blue-400/80 transition-all bg-secondary/20 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="outline" className="text-[10px] mb-1 border-amber-300 text-amber-900 bg-amber-50">
                          ID: {agent.id}
                        </Badge>
                        <h3 className="font-bold text-slate-900 text-sm">{agent.name}</h3>
                        <p className="text-[11px] text-muted-foreground">{agent.owner}</p>
                      </div>
                      <span className="text-xl">{agent.location.country === "DO" ? "🇩🇴" : "🇭🇹"}</span>
                    </div>

                    <div className="text-xs text-slate-700 space-y-1">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{agent.location.exactAddress}, {agent.location.municipality}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{agent.phone}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setDepositSubAgentId(agent.id);
                          setActiveTab("deposit");
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold h-8"
                      >
                        Depositar Aquí
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: BOLETO / ORDEN DE DEPÓSITO GENERADO EN SUB-AGENTE */}
      <Dialog open={isDepositOrderModalOpen} onOpenChange={setIsDepositOrderModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-amber-600" /> Boleto de Depósito en Sub-Agente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Presenta este comprobante en ventanilla para que el cajero acredite tu billetera.
            </DialogDescription>
          </DialogHeader>

          {createdDepositOrder && (
            <div className="space-y-4 text-xs">
              {/* Ticket visual */}
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-dashed border-amber-300 space-y-3">
                <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase">Orden de Depósito</span>
                    <strong className="text-sm font-mono text-amber-950 font-black">{createdDepositOrder.id}</strong>
                  </div>
                  <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px]">PENDIENTE PAGO</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">Tu Código Cliente:</span>
                    <strong className="font-mono text-sm text-slate-900">{createdDepositOrder.clientCode}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Monto a Entregar:</span>
                    <strong className="text-sm text-amber-950 font-black">{createdDepositOrder.amount} {createdDepositOrder.currency}</strong>
                  </div>
                </div>

                <div className="border-t border-amber-200 pt-2 text-[11px] text-slate-700">
                  <div><strong>Sub-Agente:</strong> {createdDepositOrder.subAgentName}</div>
                  <div><strong>Ubicación:</strong> {createdDepositOrder.subAgentLocation}</div>
                  <div><strong>Acreditará en Billetera:</strong> <span className="text-emerald-700 font-bold">+${createdDepositOrder.amountCreditedUSD.toFixed(2)} USD</span></div>
                </div>

                {/* Simulated QR block */}
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-amber-200">
                  <div className="w-28 h-28 bg-slate-900 text-white rounded-lg flex items-center justify-center p-2 text-center">
                    <div className="space-y-1">
                      <QrCode className="w-12 h-12 mx-auto text-amber-400" />
                      <span className="text-[8px] font-mono tracking-tighter block">{createdDepositOrder.voucherCode}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 font-mono">
                    {createdDepositOrder.voucherCode}
                  </span>
                </div>
              </div>

              {/* Simulation cashier action */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 space-y-2">
                <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ¿Estás en la ventanilla del Sub-Agente?
                </span>
                <p>
                  El cajero puede verificar tu código o puedes confirmar la recepción del efectivo directamente:
                </p>
                <Button
                  size="sm"
                  onClick={() => handleSimulateSubAgentCashierApproval(createdDepositOrder.id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 gap-1.5"
                >
                  Confirmar Depósito (Simulación en Ventanilla)
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDepositOrderModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: TRASPASO ENTRE BOLSILLO DE AHORRO Y BILLETERA PRINCIPAL */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" /> Traspaso entre Bolsillos
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mueve fondos libremente entre tu Billetera Principal de envíos y tu Bolsillo de Ahorro protegido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs pt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransferDirection("to_savings")}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  transferDirection === "to_savings"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs"
                    : "border-border text-slate-600"
                }`}
              >
                <div className="text-xs">Mover a Ahorro</div>
                <div className="text-[10px] text-muted-foreground font-normal">Principal → Ahorro</div>
              </button>

              <button
                type="button"
                onClick={() => setTransferDirection("to_main")}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  transferDirection === "to_main"
                    ? "border-blue-600 bg-blue-50 text-blue-950 font-bold shadow-xs"
                    : "border-border text-slate-600"
                }`}
              >
                <div className="text-xs">Liberar a Principal</div>
                <div className="text-[10px] text-muted-foreground font-normal">Ahorro → Principal</div>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold">Monto a Traspasar (USD)</Label>
                <span className="text-[11px] text-muted-foreground">
                  Disponible origen: <strong>
                    ${transferDirection === "to_savings" ? balances.walletBalance.toFixed(2) : balances.savingsBalance.toFixed(2)} USD
                  </strong>
                </span>
              </div>
              <Input
                type="number"
                min="1"
                max={transferDirection === "to_savings" ? balances.walletBalance : balances.savingsBalance}
                value={transferAmountUSD}
                onChange={(e) => setTransferAmountUSD(Number(e.target.value))}
                className="text-base font-black"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Desde:</span>
                <strong>{transferDirection === "to_savings" ? "Billetera Principal" : "Bolsillo de Ahorro"}</strong>
              </div>
              <div className="flex justify-between">
                <span>Hacia:</span>
                <strong className="text-emerald-700">{transferDirection === "to_savings" ? "Bolsillo de Ahorro" : "Billetera Principal"}</strong>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 text-xs font-bold">
                <span>Comisión por traspaso:</span>
                <span className="text-emerald-600">Gratis ($0.00 USD)</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsTransferModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleExecutePocketTransfer}
              className="bg-primary hover:bg-primary/90 text-white font-bold"
            >
              Confirmar Traspaso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: RECIBO OFICIAL DIGITAL */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" /> Comprobante Digital HispaniolaPay
            </DialogTitle>
          </DialogHeader>

          {selectedReceiptMovement && (
            <div className="space-y-4 text-xs pt-1">
              <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div>
                    <span className="text-xs font-black text-primary">Hispaniola Pay</span>
                    <div className="text-[10px] text-muted-foreground">Terminal Binacional de Remesas</div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {selectedReceiptMovement.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transacción:</span>
                    <strong className="font-mono">{selectedReceiptMovement.id}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span suppressHydrationWarning>{new Date(selectedReceiptMovement.date).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Concepto:</span>
                    <span className="font-semibold">{selectedReceiptMovement.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Detalle:</span>
                    <span className="max-w-[200px] text-right">{selectedReceiptMovement.description}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
                    <span>Monto Total:</span>
                    <span className="text-primary">${selectedReceiptMovement.amountUSD.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              {recentSentTx && recentSentTx.txId === selectedReceiptMovement.referenceId && (
                <div className="space-y-2">
                  <a
                    href={getWhatsAppShareLink(recentSentTx)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2.5 rounded-xl text-xs shadow-xs"
                  >
                    <Share2 className="w-4 h-4" /> Enviar Notificación por WhatsApp al Receptor
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsReceiptOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ClientWalletPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Cargando billetera digital...</div>}>
      <ClientWalletContent />
    </Suspense>
  );
}
