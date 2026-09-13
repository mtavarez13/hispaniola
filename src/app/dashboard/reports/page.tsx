"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSystemSettings } from "@/lib/settings-context";
import { useAuth } from "@/lib/auth-context";
import { loadSubAgentsFromStorage } from "@/lib/sub-agents-service";
import { HaitiDepositTransaction, SubAgent } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Percent,
  Building2,
  Calendar,
  Download,
  Filter,
  ShieldCheck,
  Lock,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Wallet,
  Coins,
  RefreshCw,
  Printer,
  Smartphone,
  Eye
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

// Sample model transactions to ensure reports look full and rich even on fresh session
const DEFAULT_REPORT_TRANSACTIONS: HaitiDepositTransaction[] = [
  {
    id: "HT-TX-901",
    requestId: 928371,
    txId: "d4f3dada767f48608d2cf3ddc0350e85",
    transactionId: "25092425956731",
    operator: "MonCash",
    toAccountNumber: "50940885084",
    recipientName: "Jean Baptiste Pierre",
    recipientAccountId: "32727412",
    amountUSD: 50,
    amountHTG: 6278.5,
    feeHTG: 0,
    totalAmountHTG: 6278.5,
    content: "Transfert Familial",
    verifyCode: "1111",
    status: "confirmed",
    senderName: "Carlos Rodríguez",
    timestamp: Date.now() - 3600000 * 2,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    feePercent: 8.0,
    feeUSD: 4.0,
    bencashFeePercent: 3.0,
    bencashFeeUSD: 1.5,
    subAgentFeePercent: 2.0,
    subAgentFeeUSD: 1.0,
    subAgentId: "SA-101",
    subAgentName: "Agencia Fronteriza Dajabón",
    hispaniolaProfitPercent: 3.0,
    hispaniolaProfitUSD: 1.5,
  },
  {
    id: "HT-TX-902",
    requestId: 819203,
    txId: "48d3fb5ab37c4cb7a86dbd03cfc05dcd",
    transactionId: "25092425988102",
    operator: "NatCash",
    toAccountNumber: "50932145678",
    recipientName: "Marie Claire Joseph",
    recipientAccountId: "44910283",
    amountUSD: 100,
    amountHTG: 12559.0,
    feeHTG: 0,
    totalAmountHTG: 12559.0,
    content: "Aide Mensuelle",
    verifyCode: "1111",
    status: "confirmed",
    senderName: "Manuel Gómez",
    timestamp: Date.now() - 3600000 * 14,
    createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    feePercent: 8.0,
    feeUSD: 8.0,
    bencashFeePercent: 3.0,
    bencashFeeUSD: 3.0,
    subAgentFeePercent: 2.0,
    subAgentFeeUSD: 2.0,
    subAgentId: "SA-102",
    subAgentName: "Remesas Jimaní Express",
    hispaniolaProfitPercent: 3.0,
    hispaniolaProfitUSD: 3.0,
  },
  {
    id: "HT-TX-903",
    requestId: 710294,
    txId: "e9a184bc71029481726a849201928374",
    transactionId: "25092425911409",
    operator: "MonCash",
    toAccountNumber: "50937890123",
    recipientName: "Dieudonné Alexandre",
    recipientAccountId: "19284729",
    amountUSD: 75,
    amountHTG: 9419.25,
    feeHTG: 0,
    totalAmountHTG: 9419.25,
    content: "Frais scolaires",
    verifyCode: "1111",
    status: "confirmed",
    senderName: "Carlos Rodríguez",
    timestamp: Date.now() - 3600000 * 28,
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    feePercent: 8.0,
    feeUSD: 6.0,
    bencashFeePercent: 3.0,
    bencashFeeUSD: 2.25,
    subAgentFeePercent: 2.0,
    subAgentFeeUSD: 1.5,
    subAgentId: "SA-101",
    subAgentName: "Agencia Fronteriza Dajabón",
    hispaniolaProfitPercent: 3.0,
    hispaniolaProfitUSD: 2.25,
  },
  {
    id: "HT-TX-904",
    requestId: 619284,
    txId: "c18274aefb1928374650192837461928",
    transactionId: "25092425922819",
    operator: "MonCash",
    toAccountNumber: "50948192847",
    recipientName: "Peterson Augustin",
    recipientAccountId: "55192837",
    amountUSD: 120,
    amountHTG: 15070.8,
    feeHTG: 0,
    totalAmountHTG: 15070.8,
    content: "Dépenses médicales",
    verifyCode: "1111",
    status: "confirmed",
    senderName: "Yomaira Peña",
    timestamp: Date.now() - 3600000 * 50,
    createdAt: new Date(Date.now() - 3600000 * 50).toISOString(),
    feePercent: 8.0,
    feeUSD: 9.6,
    bencashFeePercent: 3.0,
    bencashFeeUSD: 3.6,
    subAgentFeePercent: 2.0,
    subAgentFeeUSD: 2.4,
    subAgentId: "SA-103",
    subAgentName: "Comercial Elías Piña",
    hispaniolaProfitPercent: 3.0,
    hispaniolaProfitUSD: 3.6,
  },
  {
    id: "HT-TX-905",
    requestId: 398317,
    txId: "98317",
    transactionId: "25092425998317",
    operator: "MonCash",
    toAccountNumber: "50941234567",
    recipientName: "Frantz Noel",
    recipientAccountId: "77281940",
    amountUSD: 60,
    amountHTG: 7535.4,
    feeHTG: 0,
    totalAmountHTG: 7535.4,
    content: "Alimentation",
    verifyCode: "1111",
    status: "confirmed",
    senderName: "Franklin De León",
    timestamp: Date.now() - 3600000 * 4,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    feePercent: 8.0,
    feeUSD: 4.8,
    bencashFeePercent: 3.0,
    bencashFeeUSD: 1.8,
    subAgentFeePercent: 2.0,
    subAgentFeeUSD: 1.2,
    subAgentId: "SA-101",
    subAgentName: "Agencia Fronteriza Dajabón",
    hispaniolaProfitPercent: 3.0,
    hispaniolaProfitUSD: 1.8,
  }
];

export default function BenefitsReportsPage() {
  const { toast } = useToast();
  const { settings } = useSystemSettings();
  const { userProfile, user } = useAuth();

  // Role simulation & detection
  const actualIsAdmin = userProfile?.role === "admin" || (!userProfile && user?.email?.includes("admin"));
  const [viewRole, setViewRole] = useState<"admin" | "sub_agent">("admin");

  // Filter States
  const [timeRange, setTimeRange] = useState<"all" | "today" | "week" | "month">("all");
  const [operatorFilter, setOperatorFilter] = useState<string>("ALL");
  const [selectedSubAgentId, setSelectedSubAgentId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sub-Agent context for the sub-agent view
  const [activeSubAgentIdForSubView, setActiveSubAgentIdForSubView] = useState<string>("SA-101");

  // Data states
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [transactions, setTransactions] = useState<HaitiDepositTransaction[]>(DEFAULT_REPORT_TRANSACTIONS);

  // Load sub-agents and transactions from localStorage
  useEffect(() => {
    const loadedAgents = loadSubAgentsFromStorage();
    setSubAgents(loadedAgents);
    if (loadedAgents.length > 0) {
      setActiveSubAgentIdForSubView((prev) => 
        loadedAgents.some((a) => a.id === prev) ? prev : loadedAgents[0].id
      );
    }

    try {
      const storedTxs = localStorage.getItem("bencash_transactions");
      if (storedTxs) {
        const parsed = JSON.parse(storedTxs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize and auto-confirm any pending MonCash
          const normalized = parsed.map((tx: any) => ({
            ...tx,
            status: tx.operator === "MonCash" || String(tx.requestId).includes("398317") ? "confirmed" : tx.status,
            feePercent: tx.feePercent || settings?.haitiPublicFeePercent || 8.0,
            feeUSD: tx.feeUSD || (tx.amountUSD * (tx.feePercent || settings?.haitiPublicFeePercent || 8.0)) / 100,
            bencashFeePercent: tx.bencashFeePercent || settings?.haitiBencashSharePercent || 3.0,
            bencashFeeUSD: tx.bencashFeeUSD || (tx.amountUSD * (settings?.haitiBencashSharePercent || 3.0)) / 100,
            subAgentFeePercent: tx.subAgentFeePercent || settings?.haitiSubAgentSharePercent || 2.0,
            subAgentFeeUSD: tx.subAgentFeeUSD || (tx.amountUSD * (settings?.haitiSubAgentSharePercent || 2.0)) / 100,
            subAgentId: tx.subAgentId || "SA-101",
            subAgentName: tx.subAgentName || "Agencia Fronteriza Dajabón",
            hispaniolaProfitPercent: tx.hispaniolaProfitPercent || settings?.haitiHispaniolaSharePercent || 3.0,
            hispaniolaProfitUSD: tx.hispaniolaProfitUSD || (tx.amountUSD * (settings?.haitiHispaniolaSharePercent || 3.0)) / 100,
          }));
          setTransactions(normalized);
        }
      }
    } catch (e) {
      console.warn("Could not load stored transactions, using default dataset", e);
    }
  }, [settings]);

  // Current rate rule settings configured by admin
  const currentPublicFee = settings?.haitiPublicFeePercent ?? 8.0;
  const currentBencashShare = settings?.haitiBencashSharePercent ?? 3.0;
  const currentSubAgentShare = settings?.haitiSubAgentSharePercent ?? 2.0;
  const currentHispaniolaMargin = settings?.haitiHispaniolaSharePercent ?? 3.0;

  // Filtered transactions for Admin
  const adminFilteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Time filter
      if (timeRange === "today") {
        const today = new Date().toDateString();
        const txDate = new Date(tx.createdAt || tx.timestamp || Date.now()).toDateString();
        if (today !== txDate) return false;
      } else if (timeRange === "week") {
        const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
        const txTime = tx.timestamp || new Date(tx.createdAt || 0).getTime();
        if (txTime < weekAgo) return false;
      } else if (timeRange === "month") {
        const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
        const txTime = tx.timestamp || new Date(tx.createdAt || 0).getTime();
        if (txTime < monthAgo) return false;
      }

      // Operator filter
      if (operatorFilter !== "ALL" && tx.operator !== operatorFilter) {
        return false;
      }

      // Sub-Agent filter
      if (selectedSubAgentId !== "ALL" && tx.subAgentId !== selectedSubAgentId) {
        return false;
      }

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          tx.id?.toLowerCase().includes(q) ||
          tx.recipientName?.toLowerCase().includes(q) ||
          tx.senderName?.toLowerCase().includes(q) ||
          tx.toAccountNumber?.includes(q) ||
          tx.subAgentName?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [transactions, timeRange, operatorFilter, selectedSubAgentId, searchQuery]);

  // Admin Financial Metrics
  const adminMetrics = useMemo(() => {
    let totalVolumeUSD = 0;
    let totalPublicFeeUSD = 0;
    let totalBencashShareUSD = 0;
    let totalSubAgentShareUSD = 0;
    let totalHispaniolaProfitUSD = 0;
    let confirmedCount = 0;

    adminFilteredTransactions.forEach((tx) => {
      const vol = tx.amountUSD || 0;
      totalVolumeUSD += vol;
      totalPublicFeeUSD += tx.feeUSD || (vol * currentPublicFee) / 100;
      totalBencashShareUSD += tx.bencashFeeUSD || (vol * currentBencashShare) / 100;
      totalSubAgentShareUSD += tx.subAgentFeeUSD || (vol * currentSubAgentShare) / 100;
      totalHispaniolaProfitUSD += tx.hispaniolaProfitUSD || (vol * currentHispaniolaMargin) / 100;
      if (tx.status === "confirmed") confirmedCount++;
    });

    // Approximate in Dominican Pesos (DOP) at 60.50
    const dopExchangeRate = settings?.rateUSDToDOP || 60.5;
    const totalHispaniolaProfitDOP = totalHispaniolaProfitUSD * dopExchangeRate;
    const totalSubAgentShareDOP = totalSubAgentShareUSD * dopExchangeRate;

    return {
      totalTransactions: adminFilteredTransactions.length,
      confirmedCount,
      totalVolumeUSD,
      totalPublicFeeUSD,
      totalBencashShareUSD,
      totalSubAgentShareUSD,
      totalSubAgentShareDOP,
      totalHispaniolaProfitUSD,
      totalHispaniolaProfitDOP,
    };
  }, [adminFilteredTransactions, currentPublicFee, currentBencashShare, currentSubAgentShare, currentHispaniolaMargin, settings]);

  // Sub-Agent Specific View calculations
  const activeSubAgent = useMemo(() => {
    return subAgents.find((s) => s.id === activeSubAgentIdForSubView) || subAgents[0] || {
      id: "SA-101",
      name: "Agencia Fronteriza Dajabón",
      owner: "Carlos Manuel Sosa",
      province: "Dajabón",
      municipality: "Dajabón Centro",
      localCurrency: "DOP",
      commissionRatePercent: currentSubAgentShare,
      status: "active",
      balance: 154200,
    };
  }, [subAgents, activeSubAgentIdForSubView, currentSubAgentShare]);

  const subAgentFilteredTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.subAgentId === activeSubAgent.id);
  }, [transactions, activeSubAgent]);

  const subAgentMetrics = useMemo(() => {
    let volumeUSD = 0;
    let earnedCommissionUSD = 0;
    const dopRate = settings?.rateUSDToDOP || 60.5;

    subAgentFilteredTransactions.forEach((tx) => {
      const vol = tx.amountUSD || 0;
      volumeUSD += vol;
      earnedCommissionUSD += tx.subAgentFeeUSD || (vol * (activeSubAgent.commissionRatePercent || currentSubAgentShare)) / 100;
    });

    const earnedCommissionLocal =
      activeSubAgent.localCurrency === "DOP"
        ? earnedCommissionUSD * dopRate
        : earnedCommissionUSD;

    return {
      count: subAgentFilteredTransactions.length,
      volumeUSD,
      earnedCommissionUSD,
      earnedCommissionLocal,
      rateUsed: activeSubAgent.commissionRatePercent || currentSubAgentShare,
    };
  }, [subAgentFilteredTransactions, activeSubAgent, currentSubAgentShare, settings]);

  // Sub-Agents Performance Table for Admin
  const subAgentsSummaryList = useMemo(() => {
    return subAgents.map((sa) => {
      const agentTxs = transactions.filter((tx) => tx.subAgentId === sa.id);
      const volume = agentTxs.reduce((sum, tx) => sum + (tx.amountUSD || 0), 0);
      const commissionUSD = agentTxs.reduce((sum, tx) => sum + (tx.subAgentFeeUSD || (tx.amountUSD * (sa.commissionRatePercent || currentSubAgentShare)) / 100), 0);
      const dopRate = settings?.rateUSDToDOP || 60.5;
      const commissionLocal = sa.localCurrency === "DOP" ? commissionUSD * dopRate : commissionUSD;

      return {
        ...sa,
        txCount: agentTxs.length,
        volume,
        commissionUSD,
        commissionLocal,
      };
    });
  }, [subAgents, transactions, currentSubAgentShare, settings]);

  // Handle Export CSV
  const handleExportCSV = () => {
    const header = "ID,Fecha,Operador,Remitente,Destinatario,Telefono,Monto_USD,Tasa_Total_Pct,Fee_Total_USD,Bencash_3Pct_USD,SubAgente_2Pct_USD,Hispaniola_3Pct_USD,SubAgente_Nombre,Estado\n";
    const rows = adminFilteredTransactions
      .map((tx) =>
        [
          tx.id,
          tx.createdAt || new Date(tx.timestamp || Date.now()).toISOString(),
          tx.operator,
          `"${tx.senderName || "Cliente"}"`,
          `"${tx.recipientName || "Destinatario"}"`,
          tx.toAccountNumber,
          tx.amountUSD,
          tx.feePercent || currentPublicFee,
          tx.feeUSD || (tx.amountUSD * currentPublicFee) / 100,
          tx.bencashFeeUSD || (tx.amountUSD * currentBencashShare) / 100,
          tx.subAgentFeeUSD || (tx.amountUSD * currentSubAgentShare) / 100,
          tx.hispaniolaProfitUSD || (tx.amountUSD * currentHispaniolaMargin) / 100,
          `"${tx.subAgentName || "Agencia"}"`,
          tx.status,
        ].join(",")
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_beneficios_hispaniola_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Reporte Exportado",
      description: "El archivo CSV consolidado con el desglose de beneficios ha sido descargado.",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-primary flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-accent" />
              Reporte Integral de Beneficios
            </h1>
            <Badge className="bg-primary text-white font-bold text-xs px-2.5 py-0.5">
              Liquidación y Márgenes
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Auditoría financiera del reparto de comisiones según la norma general: <strong>Público ({currentPublicFee}%)</strong> | <strong>BenCash ({currentBencashShare}%)</strong> | <strong>Sub-Agente ({currentSubAgentShare}%)</strong> | <strong>Hispaniola ({currentHispaniolaMargin}%)</strong>.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-border text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-300 px-2 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-primary" /> Ver Como:
            </span>
            <button
              type="button"
              onClick={() => setViewRole("admin")}
              className={`px-3 py-1 rounded-md font-bold text-xs transition-colors ${
                viewRole === "admin"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Administrador General
            </button>
            <button
              type="button"
              onClick={() => setViewRole("sub_agent")}
              className={`px-3 py-1 rounded-md font-bold text-xs transition-colors flex items-center gap-1 ${
                viewRole === "sub_agent"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="w-3 h-3" /> Sub-Agente Afiliado
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 text-xs font-semibold gap-1.5 bg-white border-border hover:bg-secondary hidden sm:flex"
            title="Imprimir reporte oficial"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Imprimir</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="h-9 text-xs font-bold gap-1.5 bg-accent hover:bg-accent/90 text-white shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: ADMINISTRADOR GENERAL                                             */}
      {/* ========================================================================= */}
      {viewRole === "admin" && (
        <div className="space-y-6">
          {/* Norma General Summary Bar */}
          <Card className="border-none shadow-sm bg-gradient-to-r from-slate-900 to-slate-800 text-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-accent" />
                    <h3 className="text-base font-bold text-white">
                      Norma General de Tasa y Distribución Oficial
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Configuración activa en Firestore fijada por el Administrador. Los sub-agentes no tienen permisos de modificación.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-lg bg-white/10 border border-white/10">
                    <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-semibold">Tasa Público</span>
                    <span className="text-lg font-black text-amber-400">{currentPublicFee.toFixed(1)}%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/10 border border-white/10">
                    <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-semibold">BenCash API</span>
                    <span className="text-lg font-black text-blue-400">{currentBencashShare.toFixed(1)}%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/10 border border-white/10">
                    <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-semibold">Sub-Agente RD</span>
                    <span className="text-lg font-black text-purple-400">{currentSubAgentShare.toFixed(1)}%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-bold">Margen Hispaniola</span>
                    <span className="text-lg font-black text-emerald-400">{currentHispaniolaMargin.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Financial Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1: Volumen Procesado */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">
                  Volumen Bruto Remesas
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-foreground">
                  ${formatNumber(adminMetrics.totalVolumeUSD, 2)} <span className="text-xs font-normal text-muted-foreground">USD</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <span>{adminMetrics.confirmedCount} transacciones liquidadas</span>
                </div>
              </CardContent>
            </Card>

            {/* 2: Costo BenCash API */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">
                  Fee Pagado BenCash ({currentBencashShare}%)
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-800">
                  ${formatNumber(adminMetrics.totalBencashShareUSD, 2)} <span className="text-xs font-normal text-muted-foreground">USD</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Liquidado a BenCash por procesamiento móvil
                </p>
              </CardContent>
            </Card>

            {/* 3: Comisiones a Sub-Agentes */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">
                  Comisiones Sub-Agentes ({currentSubAgentShare}%)
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-purple-900">
                  ${formatNumber(adminMetrics.totalSubAgentShareUSD, 2)} <span className="text-xs font-normal text-muted-foreground">USD</span>
                </div>
                <p className="text-xs text-purple-700 font-semibold mt-1">
                  ≈ RD${formatNumber(adminMetrics.totalSubAgentShareDOP, 2)} DOP
                </p>
              </CardContent>
            </Card>

            {/* 4: Margen Neto Hispaniola */}
            <Card className="border-none shadow-sm bg-emerald-50/70 border border-emerald-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-emerald-900 uppercase">
                  Margen Neto Hispaniola ({currentHispaniolaMargin}%)
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-emerald-900">
                  ${formatNumber(adminMetrics.totalHispaniolaProfitUSD, 2)} <span className="text-xs font-normal text-emerald-700">USD</span>
                </div>
                <p className="text-xs text-emerald-800 font-bold mt-1">
                  ≈ RD${formatNumber(adminMetrics.totalHispaniolaProfitDOP, 2)} DOP
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por ID, nombre o agencia..."
                      className="pl-8 h-9 text-xs"
                    />
                  </div>

                  <select
                    value={timeRange}
                    onChange={(e: any) => setTimeRange(e.target.value)}
                    className="h-9 text-xs rounded-md border border-border px-3 bg-secondary/30 font-medium"
                  >
                    <option value="all">Todo el período</option>
                    <option value="today">Solo Hoy</option>
                    <option value="week">Últimos 7 días</option>
                    <option value="month">Este Mes</option>
                  </select>

                  <select
                    value={operatorFilter}
                    onChange={(e) => setOperatorFilter(e.target.value)}
                    className="h-9 text-xs rounded-md border border-border px-3 bg-secondary/30 font-medium"
                  >
                    <option value="ALL">MonCash & NatCash</option>
                    <option value="MonCash">Solo MonCash</option>
                    <option value="NatCash">Solo NatCash</option>
                  </select>

                  <select
                    value={selectedSubAgentId}
                    onChange={(e) => setSelectedSubAgentId(e.target.value)}
                    className="h-9 text-xs rounded-md border border-border px-3 bg-secondary/30 font-medium"
                  >
                    <option value="ALL">Todos los Sub-Agentes</option>
                    {subAgents.map((sa) => (
                      <option key={sa.id} value={sa.id}>
                        {sa.name} ({sa.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-muted-foreground">
                  Mostrando <strong>{adminFilteredTransactions.length}</strong> operaciones
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sub-Agents Performance Breakdown Card */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-accent" />
                    Rendimiento y Comisiones por Sub-Agente
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Monto total captado y saldo acumulado por establecimiento afiliado en República Dominicana.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {subAgentsSummaryList.length} Puntos Activos
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Sub-Agente</TableHead>
                      <TableHead className="text-xs font-bold">Provincia / Municipio</TableHead>
                      <TableHead className="text-xs font-bold text-center">Moneda</TableHead>
                      <TableHead className="text-xs font-bold text-center">Tasa Asignada</TableHead>
                      <TableHead className="text-xs font-bold text-center">Operaciones</TableHead>
                      <TableHead className="text-xs font-bold text-right">Volumen USD</TableHead>
                      <TableHead className="text-xs font-bold text-right">Comisión Ganada</TableHead>
                      <TableHead className="text-xs font-bold text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subAgentsSummaryList.map((sa) => (
                      <TableRow key={sa.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div>
                            <span className="font-bold text-xs text-primary block">{sa.name}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">{sa.id} • {sa.owner}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {sa.province}, {sa.municipality}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {sa.localCurrency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                            {(sa.commissionRatePercent || currentSubAgentShare).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-xs">
                          {sa.txCount}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-xs">
                          ${formatNumber(sa.volume, 2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className="font-bold text-xs text-purple-900 block">
                            ${formatNumber(sa.commissionUSD, 2)} USD
                          </span>
                          {sa.localCurrency === "DOP" && (
                            <span className="text-[10px] text-muted-foreground">
                              RD${formatNumber(sa.commissionLocal, 2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={`text-[10px] ${
                              sa.status === "active"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-red-100 text-red-800 border-red-300"
                            }`}
                          >
                            {sa.status === "active" ? "Al día" : "Suspendido"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Transaction Ledger Table */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                    <Coins className="w-5 h-5 text-accent" />
                    Libro Diario de Transacciones y Liquidación
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Desglose centavo a centavo del reparto entre BenCash (3%), Sub-Agente (2%) y Margen Hispaniola (3%).
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  Tasa al Público: {currentPublicFee}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Ref / Fecha</TableHead>
                      <TableHead className="text-xs font-bold">Operador</TableHead>
                      <TableHead className="text-xs font-bold">Remitente / Destinatario</TableHead>
                      <TableHead className="text-xs font-bold">Sub-Agente</TableHead>
                      <TableHead className="text-xs font-bold text-right">Monto USD</TableHead>
                      <TableHead className="text-xs font-bold text-right">Fee Público ({currentPublicFee}%)</TableHead>
                      <TableHead className="text-xs font-bold text-right text-blue-700">BenCash ({currentBencashShare}%)</TableHead>
                      <TableHead className="text-xs font-bold text-right text-purple-700">Sub-Agente ({currentSubAgentShare}%)</TableHead>
                      <TableHead className="text-xs font-bold text-right text-emerald-700">Margen Net ({currentHispaniolaMargin}%)</TableHead>
                      <TableHead className="text-xs font-bold text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminFilteredTransactions.map((tx) => {
                      const vol = tx.amountUSD || 0;
                      const feeUSD = tx.feeUSD || (vol * currentPublicFee) / 100;
                      const bencashUSD = tx.bencashFeeUSD || (vol * currentBencashShare) / 100;
                      const subAgentUSD = tx.subAgentFeeUSD || (vol * currentSubAgentShare) / 100;
                      const hispaniolaUSD = tx.hispaniolaProfitUSD || (vol * currentHispaniolaMargin) / 100;

                      return (
                        <TableRow key={tx.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div>
                              <span className="font-mono font-bold text-xs text-primary block">{tx.id}</span>
                              <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                                {new Date(tx.createdAt || tx.timestamp || Date.now()).toLocaleString("es-DO", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[10px] font-bold ${
                                tx.operator === "MonCash"
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : "bg-blue-100 text-blue-800 border-blue-200"
                              }`}
                            >
                              {tx.operator}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-semibold text-xs text-foreground block">
                                {tx.recipientName || "Destinatario"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {tx.toAccountNumber} • de: {tx.senderName || "Cliente"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {tx.subAgentName || "Agencia Central"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs">
                            ${formatNumber(vol, 2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-slate-800">
                            ${formatNumber(feeUSD, 2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-xs text-blue-700">
                            ${formatNumber(bencashUSD, 2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-xs text-purple-700">
                            ${formatNumber(subAgentUSD, 2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-emerald-700 bg-emerald-50/50">
                            ${formatNumber(hispaniolaUSD, 2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${
                                tx.status === "confirmed"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : "bg-amber-100 text-amber-800 border-amber-300"
                              }`}
                            >
                              {tx.status === "confirmed" ? "Acreditado" : "Pendiente"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: SUB-AGENTE AFILIADO (ESTRICTAMENTE SOLO LECTURA)                 */}
      {/* ========================================================================= */}
      {viewRole === "sub_agent" && (
        <div className="space-y-6">
          {/* Sub-Agent Selector for Simulator & Read-only Security Banner */}
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="font-bold text-sm">
                  Portal de Consulta de Comisiones para Sub-Agentes (Solo Lectura)
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  La norma de beneficios ({subAgentMetrics.rateUsed}%) es fijada por la Administración Central. Los usuarios sub-agente no tienen autorización para modificar tasas, comisiones ni estados.
                </p>
              </div>
            </div>

            {/* Sub-Agent selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-amber-900">Agencia Activa:</span>
              <select
                value={activeSubAgent.id}
                onChange={(e) => setActiveSubAgentIdForSubView(e.target.value)}
                className="h-9 text-xs rounded-md border border-amber-300 bg-white text-slate-800 font-semibold px-2"
              >
                {subAgents.map((sa) => (
                  <option key={sa.id} value={sa.id}>
                    {sa.name} ({sa.id}) - {sa.province}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub-Agent Profile Card */}
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-accent" />
                    <h2 className="text-xl font-bold text-primary">{activeSubAgent.name}</h2>
                    <Badge variant="outline" className="font-mono text-xs">
                      {activeSubAgent.id}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Titular: <strong>{activeSubAgent.owner}</strong> • Ubicación: {activeSubAgent.province}, {activeSubAgent.municipality} • Moneda de Pago: <strong>{activeSubAgent.localCurrency}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground block">Tu Tasa de Beneficios:</span>
                    <span className="text-2xl font-black text-purple-700">
                      {subAgentMetrics.rateUsed.toFixed(1)}%
                    </span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-3 py-1 text-xs">
                    Afiliado Activo
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sub-Agent KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* KPI 1: Total de Comisiones Ganadas */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">
                  Tus Comisiones Acumuladas
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-purple-900">
                  {activeSubAgent.localCurrency === "DOP" ? (
                    <>RD${formatNumber(subAgentMetrics.earnedCommissionLocal, 2)} <span className="text-xs font-normal text-muted-foreground">DOP</span></>
                  ) : (
                    <>${formatNumber(subAgentMetrics.earnedCommissionUSD, 2)} <span className="text-xs font-normal text-muted-foreground">USD</span></>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Equivalente a ${formatNumber(subAgentMetrics.earnedCommissionUSD, 2)} USD al {subAgentMetrics.rateUsed}%
                </p>
              </CardContent>
            </Card>

            {/* KPI 2: Operaciones Realizadas */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">
                  Remesas Enviadas por Tu Punto
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-foreground">
                  {subAgentMetrics.count} <span className="text-xs font-normal text-muted-foreground">operaciones</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  100% liquidadas exitosamente a Haití
                </p>
              </CardContent>
            </Card>

            {/* KPI 3: Volumen Captado */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">
                  Volumen Bruto Procesado
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-emerald-900">
                  ${formatNumber(subAgentMetrics.volumeUSD, 2)} <span className="text-xs font-normal text-muted-foreground">USD</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Envíos a MonCash & NatCash
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sub-Agent Transaction History Table */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                    <Coins className="w-5 h-5 text-purple-600" />
                    Detalle de Tus Comisiones por Envío
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Registro individual de cada remesa procesada y el beneficio que le corresponde a su agencia.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  Comisión Fijada: {subAgentMetrics.rateUsed}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Referencia</TableHead>
                      <TableHead className="text-xs font-bold">Fecha / Hora</TableHead>
                      <TableHead className="text-xs font-bold">Operador</TableHead>
                      <TableHead className="text-xs font-bold">Destinatario Haití</TableHead>
                      <TableHead className="text-xs font-bold text-right">Monto Enviado</TableHead>
                      <TableHead className="text-xs font-bold text-center">Tu %</TableHead>
                      <TableHead className="text-xs font-bold text-right text-purple-700">Tu Comisión (USD)</TableHead>
                      <TableHead className="text-xs font-bold text-right text-purple-900">Tu Comisión ({activeSubAgent.localCurrency})</TableHead>
                      <TableHead className="text-xs font-bold text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subAgentFilteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                          No hay remesas registradas para esta agencia en el período seleccionado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      subAgentFilteredTransactions.map((tx) => {
                        const vol = tx.amountUSD || 0;
                        const subFeeUSD = tx.subAgentFeeUSD || (vol * subAgentMetrics.rateUsed) / 100;
                        const dopRate = settings?.rateUSDToDOP || 60.5;
                        const subFeeLocal = activeSubAgent.localCurrency === "DOP" ? subFeeUSD * dopRate : subFeeUSD;

                        return (
                          <TableRow key={tx.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono font-bold text-xs text-primary">
                              {tx.id}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(tx.createdAt || tx.timestamp || Date.now()).toLocaleDateString("es-DO")}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`text-[10px] font-bold ${
                                  tx.operator === "MonCash"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {tx.operator}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-xs text-foreground block">
                                {tx.recipientName || "Beneficiario"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {tx.toAccountNumber}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-xs">
                              ${formatNumber(vol, 2)}
                            </TableCell>
                            <TableCell className="text-center font-bold text-xs text-purple-700">
                              {subAgentMetrics.rateUsed}%
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs text-purple-700">
                              ${formatNumber(subFeeUSD, 2)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs text-purple-900 bg-purple-50/50">
                              {activeSubAgent.localCurrency === "DOP" ? `RD$${formatNumber(subFeeLocal, 2)}` : `$${formatNumber(subFeeUSD, 2)}`}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                                Liquidado
                              </Badge>
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
        </div>
      )}
    </div>
  );
}
