"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  Plus, 
  Percent, 
  Wallet, 
  ArrowUpRight, 
  ExternalLink, 
  ShieldCheck, 
  Terminal, 
  Code2, 
  Play, 
  AlertCircle, 
  Building2, 
  Send, 
  Smartphone,
  Eye,
  EyeOff,
  Trash2,
  Edit3
} from "lucide-react";
import { ApiPartner, PartnerTransfer } from "@/lib/types";

export function PartnerApiAdminTab() {
  const [partners, setPartners] = useState<ApiPartner[]>([]);
  const [stats, setStats] = useState({
    totalPartners: 0,
    activePartners: 0,
    totalVolumeUSD: 0,
    totalTransactions: 0,
    totalCommissionEarnedUSD: 0,
    totalCustodyBalanceUSD: 0,
  });
  const [recentTransfers, setRecentTransfers] = useState<PartnerTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  // Modal / Form nuevo partner
  const [showNewModal, setShowNewModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    marginPercent: 3.5, // % fijado por defecto
    initialBalanceUSD: 1000,
    creditLimitUSD: 500,
    webhookUrl: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  // Modal recarga balance
  const [rechargePartner, setRechargePartner] = useState<ApiPartner | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState("500");
  const [recharging, setRecharging] = useState(false);

  // Edición rápida de % de margen
  const [editingMarginId, setEditingMarginId] = useState<string | null>(null);
  const [newMarginVal, setNewMarginVal] = useState<number>(3.5);
  const [savingMargin, setSavingMargin] = useState(false);

  // Sandbox / Test runner state
  const [selectedSandboxPartner, setSelectedSandboxPartner] = useState<ApiPartner | null>(null);
  const [sandboxEndpoint, setSandboxEndpoint] = useState<"rates" | "quote" | "transfer">("rates");
  const [sandboxQuoteParams, setSandboxQuoteParams] = useState({
    sendAmount: "100",
    operator: "MonCash",
    sourceCurrency: "USD",
    targetCurrency: "HTG",
  });
  const [sandboxTransferParams, setSandboxTransferParams] = useState({
    recipientName: "Jean Baptiste",
    recipientPhone: "50937123456",
    operator: "MonCash",
    amountUSD: "50",
    clientRef: "ORD-EXT-9921",
  });
  const [sandboxResponse, setSandboxResponse] = useState<any>(null);
  const [sandboxStatus, setSandboxStatus] = useState<number | null>(null);
  const [sandboxLatency, setSandboxLatency] = useState<number | null>(null);
  const [testingSandbox, setTestingSandbox] = useState(false);

  // Code snippet language
  const [codeLang, setCodeLang] = useState<"curl" | "node" | "python" | "php">("curl");

  // Cargar datos
  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/admin");
      const data = await res.json();
      if (data.success) {
        setPartners(data.partners || []);
        setStats(data.stats || {});
        setRecentTransfers(data.recentTransfers || []);
        if (data.partners?.length > 0) {
          setSelectedSandboxPartner(prev => prev || data.partners[0]);
        }
      }
    } catch (e) {
      console.error("Error al cargar partners:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleRevealKey = (id: string) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/partner/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewModal(false);
        setFormData({
          name: "",
          company: "",
          email: "",
          phone: "",
          marginPercent: 3.5,
          initialBalanceUSD: 1000,
          creditLimitUSD: 500,
          webhookUrl: "",
          notes: "",
        });
        await fetchPartners();
      } else {
        alert("Error: " + (data.message || "No se pudo crear el socio"));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveMargin = async (partnerId: string) => {
    setSavingMargin(true);
    try {
      const res = await fetch("/api/partner/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          marginPercent: Number(newMarginVal),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPartners(prev =>
          prev.map(p => (p.id === partnerId ? { ...p, marginPercent: Number(newMarginVal) } : p))
        );
        setEditingMarginId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingMargin(false);
    }
  };

  const handleRechargeSubmit = async () => {
    if (!rechargePartner) return;
    setRecharging(true);
    try {
      const res = await fetch("/api/partner/admin/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: rechargePartner.id,
          amountUSD: Number(rechargeAmount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRechargePartner(null);
        await fetchPartners();
      } else {
        alert("Error: " + data.message);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setRecharging(false);
    }
  };

  const handleToggleStatus = async (partner: ApiPartner) => {
    const newStatus = partner.status === "active" ? "suspended" : "active";
    if (!confirm(`¿Desea cambiar el estado del socio '${partner.name}' a ${newStatus.toUpperCase()}?`)) return;

    try {
      await fetch("/api/partner/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: partner.id,
          status: newStatus,
        }),
      });
      fetchPartners();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegenerateKey = async (partner: ApiPartner) => {
    if (!confirm(`¿Regenerar la API Key de '${partner.name}'? La clave anterior quedará invalidada de inmediato.`)) return;

    try {
      await fetch("/api/partner/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: partner.id,
          regenerateApiKey: true,
        }),
      });
      fetchPartners();
    } catch (e) {
      console.error(e);
    }
  };

  // Ejecutar llamada en Sandbox
  const runSandboxTest = async () => {
    if (!selectedSandboxPartner) {
      alert("Seleccione un socio para usar su API Key");
      return;
    }
    setTestingSandbox(true);
    setSandboxResponse(null);
    const start = performance.now();

    try {
      let url = "";
      let method = "GET";
      let body: any = undefined;

      if (sandboxEndpoint === "rates") {
        url = "/api/v1/partner/rates";
        method = "GET";
      } else if (sandboxEndpoint === "quote") {
        url = "/api/v1/partner/quote";
        method = "POST";
        body = {
          sendAmount: Number(sandboxQuoteParams.sendAmount),
          operator: sandboxQuoteParams.operator,
          sourceCurrency: sandboxQuoteParams.sourceCurrency,
          targetCurrency: sandboxQuoteParams.targetCurrency,
        };
      } else if (sandboxEndpoint === "transfer") {
        url = "/api/v1/partner/transfers";
        method = "POST";
        body = {
          sender: { name: "Cliente Test API", country: "DO" },
          recipient: {
            name: sandboxTransferParams.recipientName,
            phone: sandboxTransferParams.recipientPhone,
            operator: sandboxTransferParams.operator,
          },
          sourceAmount: Number(sandboxTransferParams.amountUSD),
          sourceCurrency: "USD",
          targetCurrency: "HTG",
          partnerReference: sandboxTransferParams.clientRef,
        };
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": selectedSandboxPartner.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const end = performance.now();
      const json = await res.json();
      setSandboxLatency(Math.round(end - start));
      setSandboxStatus(res.status);
      setSandboxResponse(json);

      if (sandboxEndpoint === "transfer" && res.ok) {
        fetchPartners();
      }
    } catch (err: any) {
      setSandboxStatus(500);
      setSandboxResponse({ error: "NETWORK_ERROR", message: err.message });
    } finally {
      setTestingSandbox(false);
    }
  };

  // Generador de snippets
  const getSnippet = () => {
    const key = selectedSandboxPartner?.apiKey || "hp_live_su_clave_secreta_aqui";
    const host = typeof window !== "undefined" ? window.location.origin : "https://hispaniolapay.com";

    if (codeLang === "curl") {
      return `# 1. Obtener tasas con su margen (${selectedSandboxPartner?.marginPercent || 3.5}%) aplicado:
curl -X GET "${host}/api/v1/partner/rates" \\
  -H "X-API-Key: ${key}"

# 2. Cotizar un envío a Haití (MonCash/NatCash):
curl -X POST "${host}/api/v1/partner/quote" \\
  -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sendAmount": 100.00,
    "sourceCurrency": "USD",
    "targetCurrency": "HTG",
    "operator": "MonCash"
  }'

# 3. Enviar orden en vivo:
curl -X POST "${host}/api/v1/partner/transfers" \\
  -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipient": {
      "name": "Jean Baptiste",
      "phone": "50937123456",
      "operator": "MonCash"
    },
    "sourceAmount": 100.00,
    "sourceCurrency": "USD",
    "partnerReference": "ORD-${Date.now().toString().slice(-4)}"
  }'`;
    }

    if (codeLang === "node") {
      return `import axios from 'axios';

const API_KEY = '${key}';
const BASE_URL = '${host}/api/v1/partner';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' }
});

// 1. Obtener tasas y % acordado
async function getRates() {
  const { data } = await client.get('/rates');
  console.log('Margen socio:', data.partner.marginPercent + '%');
  console.log('Tasa USD/HTG:', data.rates.USD_HTG.effectiveRate);
}

// 2. Disparar remesa hacia MonCash
async function sendTransfer() {
  const payload = {
    recipient: { name: 'Jean Baptiste', phone: '50937123456', operator: 'MonCash' },
    sourceAmount: 100.00,
    sourceCurrency: 'USD',
    partnerReference: 'ORD-9823'
  };
  const { data } = await client.post('/transfers', payload);
  console.log('Transferencia despachada:', data.transfer.id);
  console.log('Comisión ganada por el socio:', '$' + data.transfer.financialBreakdown.partnerCommissionEarnedUSD);
}`;
    }

    if (codeLang === "python") {
      return `import requests

API_KEY = "${key}"
BASE_URL = "${host}/api/v1/partner"
headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

# 1. Consultar Tasas
response = requests.get(f"{BASE_URL}/rates", headers=headers)
print("Tasas con margen aplicado:", response.json())

# 2. Despachar transferencia
order = {
    "recipient": {
        "name": "Jean Baptiste",
        "phone": "50937123456",
        "operator": "MonCash"
    },
    "sourceAmount": 100.00,
    "sourceCurrency": "USD",
    "partnerReference": "ORD-5432"
}
tx_response = requests.post(f"{BASE_URL}/transfers", json=order, headers=headers)
print("Resultado:", tx_response.json())`;
    }

    if (codeLang === "php") {
      return `<?php
$apiKey = '${key}';
$baseUrl = '${host}/api/v1/partner';

// Crear transferencia vía cURL
$ch = curl_init("$baseUrl/transfers");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-API-Key: $apiKey",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "recipient" => [
        "name" => "Jean Baptiste",
        "phone" => "50937123456",
        "operator" => "MonCash"
    ],
    "sourceAmount" => 100.00,
    "sourceCurrency" => "USD",
    "partnerReference" => "ORD-PHP-01"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
print_r($data);
?>`;
    }

    return "";
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500 text-white font-mono text-xs border-none flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> API B2B v1
            </Badge>
            <Badge variant="outline" className="text-emerald-300 border-emerald-400/40 text-xs">
              RESTful + Webhooks
            </Badge>
          </div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Servicio de Integración API para Terceros
          </h2>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Ofrece la red pagadora (MonCash, NatCash y bancos dominicanos) a sistemas externos. 
            Permite fijar para cada tercero su propio <strong className="text-amber-300">% de comisión o margen</strong>, controlar saldos B2B y auditar transacciones.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-center">
          <Button
            onClick={fetchPartners}
            variant="outline"
            size="sm"
            disabled={loading}
            className="text-white border-white/20 hover:bg-white/10 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>
          <Button
            onClick={() => setShowNewModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/30"
          >
            <Plus className="w-4 h-4" /> Registrar Nuevo Tercero (API Key)
          </Button>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Socios API Conectados</span>
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{stats.totalPartners}</span>
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {stats.activePartners} Activos
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Volumen Procesado B2B</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                ${stats.totalVolumeUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-muted-foreground">USD</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Comisiones Ganadas x Terceros</span>
              <Percent className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">
                ${stats.totalCommissionEarnedUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-muted-foreground">USD</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Saldo B2B en Custodia</span>
              <Wallet className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-700">
                ${stats.totalCustodyBalanceUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-muted-foreground">USD</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABS DE SUB-SECCIONES */}
      <Tabs defaultValue="partners" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
          <TabsTrigger value="partners" className="gap-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Building2 className="w-4 h-4 text-blue-600" /> Socios API & Porcentajes Fijados ({partners.length})
          </TabsTrigger>
          <TabsTrigger value="sandbox" className="gap-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Play className="w-4 h-4 text-emerald-600" /> Consola Interactiva (Sandbox)
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Code2 className="w-4 h-4 text-purple-600" /> Documentación Técnica & Snippets
          </TabsTrigger>
        </TabsList>

        {/* SUBTAB 1: SOCIOS Y PORCENTAJES */}
        <TabsContent value="partners" className="space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-600" /> Clientes y Sistemas Terceros Conectados
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Fija o modifica de manera instantánea el <strong>porcentaje (%)</strong> que se le ofrece a cada tercero, sus límites de crédito y claves de acceso.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600">
                    <TableRow>
                      <TableHead>Socio / Empresa</TableHead>
                      <TableHead className="text-center bg-amber-50/50 text-amber-950 font-black">
                        % Fijado al Tercero
                      </TableHead>
                      <TableHead>Saldo B2B / Crédito</TableHead>
                      <TableHead>API Key Secreta</TableHead>
                      <TableHead className="text-center">Operaciones / Volumen</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                          No hay socios registrados. Presiona &quot;Registrar Nuevo Tercero&quot; para crear el primero y fijar su margen %.
                        </TableCell>
                      </TableRow>
                    ) : (
                      partners.map((p) => {
                        const isEditingMargin = editingMarginId === p.id;
                        const isRevealed = revealedKeys[p.id];
                        return (
                          <TableRow key={p.id} className="text-xs hover:bg-slate-50/80">
                            {/* Nombre y empresa */}
                            <TableCell className="py-3">
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <span>{p.company}</span>
                                <span>•</span>
                                <span className="font-mono text-[10px]">{p.email}</span>
                              </div>
                              {p.webhookUrl && (
                                <div className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5 truncate max-w-xs" title={p.webhookUrl}>
                                  <Badge variant="outline" className="text-[9px] h-4 bg-emerald-50 border-emerald-200">
                                    Webhook
                                  </Badge>
                                  {p.webhookUrl}
                                </div>
                              )}
                            </TableCell>

                            {/* REQUERIMIENTO PRINCIPAL: % FIJADO AL TERCERO */}
                            <TableCell className="text-center bg-amber-50/30 py-3">
                              {isEditingMargin ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="30"
                                    value={newMarginVal}
                                    onChange={(e) => setNewMarginVal(parseFloat(e.target.value) || 0)}
                                    className="w-16 h-7 text-xs font-bold text-center border-amber-400 bg-white"
                                  />
                                  <span className="font-bold text-xs">%</span>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveMargin(p.id)}
                                    disabled={savingMargin}
                                    className="h-7 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px]"
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-200 border-amber-300 font-mono font-black text-sm px-2.5 py-0.5 shadow-sm">
                                    {p.marginPercent.toFixed(1)}%
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                                    onClick={() => {
                                      setEditingMarginId(p.id);
                                      setNewMarginVal(p.marginPercent);
                                    }}
                                    title="Modificar % de comisión del tercero"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                              <div className="text-[10px] text-amber-700/80 mt-0.5">
                                {p.commissionType === "percentage_margin" ? "Margen sobre envío" : "Tarifa Fija"}
                              </div>
                            </TableCell>

                            {/* Saldo B2B */}
                            <TableCell className="py-3">
                              <div className="font-black text-slate-900 text-sm">
                                ${p.walletBalanceUSD.toFixed(2)} <span className="text-[10px] text-muted-foreground font-normal">USD</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <span>Línea Crédito: ${p.creditLimitUSD}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-5 px-1.5 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50"
                                  onClick={() => {
                                    setRechargePartner(p);
                                    setRechargeAmount("500");
                                  }}
                                >
                                  + Recargar
                                </Button>
                              </div>
                            </TableCell>

                            {/* Clave API */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1.5">
                                <code className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {isRevealed ? p.apiKey : `${p.apiKey.slice(0, 10)}••••••••••••`}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-slate-900"
                                  onClick={() => toggleRevealKey(p.id)}
                                  title={isRevealed ? "Ocultar" : "Mostrar"}
                                >
                                  {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-slate-900"
                                  onClick={() => handleCopy(p.apiKey)}
                                  title="Copiar API Key"
                                >
                                  {copiedKey === p.apiKey ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>

                            {/* Operaciones / Volumen */}
                            <TableCell className="text-center py-3">
                              <div className="font-bold text-slate-800">
                                {p.totalTransactions} transacciones
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Vol: ${p.totalVolumeUSD.toLocaleString()} USD
                              </div>
                            </TableCell>

                            {/* Estado */}
                            <TableCell className="text-center py-3">
                              <Badge
                                className={
                                  p.status === "active"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : "bg-red-100 text-red-800 border-red-200"
                                }
                              >
                                {p.status === "active" ? "Activo" : "Suspendido"}
                              </Badge>
                            </TableCell>

                            {/* Acciones */}
                            <TableCell className="text-right py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-slate-700"
                                  onClick={() => {
                                    setSelectedSandboxPartner(p);
                                    const tabs = document.querySelector('[value="sandbox"]') as HTMLElement;
                                    tabs?.click();
                                  }}
                                  title="Probar en Sandbox"
                                >
                                  <Play className="w-3 h-3 text-emerald-600 mr-1" /> Test
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-600"
                                  onClick={() => handleRegenerateKey(p)}
                                  title="Regenerar API Key"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                                  onClick={() => handleToggleStatus(p)}
                                  title={p.status === "active" ? "Suspender Socio" : "Activar Socio"}
                                >
                                  <AlertCircle className="w-3 h-3" />
                                </Button>
                              </div>
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

          {/* HISTORIAL DE TRANSFERENCIAS B2B */}
          {recentTransfers.length > 0 && (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" /> Últimas Transferencias Procesadas vía API
                </CardTitle>
                <CardDescription className="text-xs">
                  Detalle de dispersiones ejecutadas por sistemas de terceros con liquidación de comisiones.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 text-[11px]">
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Socio API</TableHead>
                        <TableHead>Destinatario (Haití / RD)</TableHead>
                        <TableHead>Monto Enviado</TableHead>
                        <TableHead>Tasa</TableHead>
                        <TableHead>Monto Entregado</TableHead>
                        <TableHead className="text-emerald-700">% Comisión Tercero</TableHead>
                        <TableHead>Neto Debitado B2B</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {recentTransfers.slice(0, 10).map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-mono text-muted-foreground text-[10px]">
                            {new Date(tx.createdAt).toLocaleTimeString()}
                          </TableCell>
                          <TableCell className="font-bold">{tx.partnerName}</TableCell>
                          <TableCell>
                            <div className="font-semibold">{tx.recipient.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{tx.recipient.phone} ({tx.recipient.operator})</div>
                          </TableCell>
                          <TableCell className="font-bold">${tx.sourceAmount} {tx.sourceCurrency}</TableCell>
                          <TableCell className="font-mono">{tx.exchangeRate}</TableCell>
                          <TableCell className="font-bold text-slate-900">{tx.targetAmount} {tx.targetCurrency}</TableCell>
                          <TableCell className="text-emerald-700 font-bold font-mono">
                            {tx.partnerCommissionPercent}% (${tx.partnerCommissionUSD} USD)
                          </TableCell>
                          <TableCell className="font-bold">${tx.netDebitedUSD} USD</TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                              {tx.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SUBTAB 2: SANDBOX / CONSOLA DE PRUEBAS */}
        <TabsContent value="sandbox" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Panel de Control de la Petición */}
            <Card className="lg:col-span-5 border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-600" /> Simulador de Llamadas API
                </CardTitle>
                <CardDescription className="text-xs">
                  Envía solicitudes de prueba con la clave y el margen % de un socio seleccionado.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Socio seleccionado */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Socio API que realiza la petición</Label>
                  <select
                    className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedSandboxPartner?.id || ""}
                    onChange={(e) => {
                      const p = partners.find(item => item.id === e.target.value);
                      if (p) setSelectedSandboxPartner(p);
                    }}
                  >
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Margen Fijado: {p.marginPercent}%) - Saldo: ${p.walletBalanceUSD} USD
                      </option>
                    ))}
                  </select>
                </div>

                {/* Endpoint a probar */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Endpoint REST</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={sandboxEndpoint === "rates" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSandboxEndpoint("rates")}
                      className="text-xs"
                    >
                      GET /rates
                    </Button>
                    <Button
                      type="button"
                      variant={sandboxEndpoint === "quote" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSandboxEndpoint("quote")}
                      className="text-xs"
                    >
                      POST /quote
                    </Button>
                    <Button
                      type="button"
                      variant={sandboxEndpoint === "transfer" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSandboxEndpoint("transfer")}
                      className="text-xs"
                    >
                      POST /transfers
                    </Button>
                  </div>
                </div>

                {/* Parámetros si es /quote */}
                {sandboxEndpoint === "quote" && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-800">Parámetros de Cotización</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px]">Monto Envío (USD)</Label>
                        <Input
                          type="number"
                          value={sandboxQuoteParams.sendAmount}
                          onChange={(e) => setSandboxQuoteParams(prev => ({ ...prev, sendAmount: e.target.value }))}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">Operador Destino</Label>
                        <select
                          className="w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
                          value={sandboxQuoteParams.operator}
                          onChange={(e) => setSandboxQuoteParams(prev => ({ ...prev, operator: e.target.value }))}
                        >
                          <option value="MonCash">Digicel MonCash (Haití)</option>
                          <option value="NatCash">Natcom NatCash (Haití)</option>
                          <option value="Banreservas">Banreservas (RD)</option>
                          <option value="Banco BHD">Banco BHD (RD)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Parámetros si es /transfers */}
                {sandboxEndpoint === "transfer" && (
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-3">
                    <div className="text-xs font-bold text-emerald-950">Datos de la Orden en Vivo</div>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[11px]">Nombre Destinatario</Label>
                        <Input
                          value={sandboxTransferParams.recipientName}
                          onChange={(e) => setSandboxTransferParams(prev => ({ ...prev, recipientName: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px]">Teléfono (509...)</Label>
                          <Input
                            value={sandboxTransferParams.recipientPhone}
                            onChange={(e) => setSandboxTransferParams(prev => ({ ...prev, recipientPhone: e.target.value }))}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px]">Monto USD</Label>
                          <Input
                            type="number"
                            value={sandboxTransferParams.amountUSD}
                            onChange={(e) => setSandboxTransferParams(prev => ({ ...prev, amountUSD: e.target.value }))}
                            className="h-8 text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={runSandboxTest}
                  disabled={testingSandbox}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2"
                >
                  <Play className={`w-3.5 h-3.5 ${testingSandbox ? "animate-spin" : ""}`} />
                  {testingSandbox ? "Ejecutando Petición..." : "Enviar Petición a la API"}
                </Button>
              </CardContent>
            </Card>

            {/* Consola de Respuesta JSON */}
            <Card className="lg:col-span-7 border-slate-800 shadow-md bg-slate-950 text-slate-100 flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <CardTitle className="text-sm font-mono font-bold text-white">
                    HTTP Response Body
                  </CardTitle>
                </div>
                {sandboxStatus && (
                  <div className="flex items-center gap-2">
                    <Badge className={sandboxStatus < 300 ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}>
                      HTTP {sandboxStatus}
                    </Badge>
                    {sandboxLatency !== null && (
                      <Badge variant="outline" className="text-slate-400 font-mono text-[10px]">
                        ⚡ {sandboxLatency} ms
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-4 flex-1 flex flex-col font-mono text-xs overflow-auto max-h-[450px]">
                {sandboxResponse ? (
                  <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {JSON.stringify(sandboxResponse, null, 2)}
                  </pre>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-16 text-center">
                    <Code2 className="w-10 h-10 mb-2 opacity-30" />
                    <span>Presione &quot;Enviar Petición a la API&quot; para inspeccionar la respuesta JSON en tiempo real.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SUBTAB 3: DOCUMENTACIÓN Y SNIPPETS */}
        <TabsContent value="docs" className="space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-purple-600" /> Guía Rápida para Desarrolladores Externos
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comparte estos códigos con los equipos técnicos de tus aliados comerciales para que comiencen a integrar en minutos.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <Button
                    size="sm"
                    variant={codeLang === "curl" ? "default" : "ghost"}
                    onClick={() => setCodeLang("curl")}
                    className="h-7 text-xs font-mono"
                  >
                    cURL
                  </Button>
                  <Button
                    size="sm"
                    variant={codeLang === "node" ? "default" : "ghost"}
                    onClick={() => setCodeLang("node")}
                    className="h-7 text-xs font-mono"
                  >
                    Node.js
                  </Button>
                  <Button
                    size="sm"
                    variant={codeLang === "python" ? "default" : "ghost"}
                    onClick={() => setCodeLang("python")}
                    className="h-7 text-xs font-mono"
                  >
                    Python
                  </Button>
                  <Button
                    size="sm"
                    variant={codeLang === "php" ? "default" : "ghost"}
                    onClick={() => setCodeLang("php")}
                    className="h-7 text-xs font-mono"
                  >
                    PHP
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-950 text-xs flex items-center justify-between">
                <div>
                  <strong>Autenticación Obligatoria:</strong> Todas las peticiones deben incluir el header{" "}
                  <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-blue-200 text-blue-900">
                    X-API-Key: {selectedSandboxPartner?.apiKey || "hp_live_..."}
                  </code>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 border-blue-300"
                  onClick={() => handleCopy(selectedSandboxPartner?.apiKey || "")}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Key de Prueba
                </Button>
              </div>

              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Ejemplo en {codeLang.toUpperCase()}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-slate-300 hover:text-white"
                    onClick={() => handleCopy(getSnippet())}
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copiar Código
                  </Button>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
                  {getSnippet()}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: REGISTRAR NUEVO TERCERO */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white shadow-2xl border-slate-200 animate-in fade-in zoom-in-95">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" /> Registrar Socio y Fijar Porcentaje de Comisión
              </CardTitle>
              <CardDescription className="text-xs">
                Genera una API Key única para el sistema tercero y asigna su margen comercial.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreatePartner}>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Nombre Comercial</Label>
                    <Input
                      required
                      placeholder="Ej: Caribe Express API"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Empresa / Razón Social</Label>
                    <Input
                      placeholder="Ej: Fintech Quisqueya SRL"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Email de Contacto Técnico</Label>
                    <Input
                      required
                      type="email"
                      placeholder="dev@empresa.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Teléfono / WhatsApp</Label>
                    <Input
                      placeholder="+1 809..."
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* CAMPO DESTACADO: % FIJADO AL TERCERO */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-amber-600" />
                    <Label className="text-xs font-black text-amber-950">
                      Porcentaje (%) de Comisión Ofrecido al Tercero
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="30"
                      value={formData.marginPercent}
                      onChange={(e) => setFormData(prev => ({ ...prev, marginPercent: parseFloat(e.target.value) || 0 }))}
                      className="h-9 w-28 text-sm font-black text-center bg-white border-amber-300"
                    />
                    <div className="text-xs text-amber-800">
                      Este porcentaje se deducirá como ganancia directa para el socio de cada transacción que procese a través de la API.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Saldo Inicial B2B (USD)</Label>
                    <Input
                      type="number"
                      value={formData.initialBalanceUSD}
                      onChange={(e) => setFormData(prev => ({ ...prev, initialBalanceUSD: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Línea de Crédito (USD)</Label>
                    <Input
                      type="number"
                      value={formData.creditLimitUSD}
                      onChange={(e) => setFormData(prev => ({ ...prev, creditLimitUSD: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">URL Webhook para Notificaciones (Opcional)</Label>
                  <Input
                    placeholder="https://api.empresa.com/webhooks/hispaniolapay"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t p-4 flex justify-end gap-2 bg-slate-50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewModal(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  {creating ? "Generando..." : "Crear Socio y Clave"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: RECARGAR SALDO B2B */}
      {rechargePartner && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-white shadow-2xl border-slate-200">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" /> Recargar Saldo B2B
              </CardTitle>
              <CardDescription className="text-xs">
                Añadir fondos a la cuenta prepagada de <strong>{rechargePartner.name}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="text-xs text-slate-600">
                Saldo actual: <strong>${rechargePartner.walletBalanceUSD.toFixed(2)} USD</strong>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Monto a Acreditar (USD)</Label>
                <Input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="text-base font-bold font-mono"
                  placeholder="500"
                />
              </div>
            </CardContent>
            <CardFooter className="border-t p-3 flex justify-end gap-2 bg-slate-50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRechargePartner(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRechargeSubmit}
                disabled={recharging}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                {recharging ? "Acreditando..." : "Acreditar Fondos"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
