"use client";

import React from "react";
import { SubAgent } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  User, 
  CreditCard, 
  Mail, 
  Phone, 
  MapPin, 
  Percent, 
  Coins, 
  ShieldCheck, 
  ExternalLink, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Smartphone,
  Send,
  Wallet,
  Receipt,
  PhoneCall,
  Calculator,
  BarChart3,
  Navigation
} from "lucide-react";

interface SubAgentDetailDialogProps {
  subAgent: SubAgent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (subAgent: SubAgent) => void;
  onToggleStatus: (subAgent: SubAgent) => void;
}

export function SubAgentDetailDialog({
  subAgent,
  open,
  onOpenChange,
  onEdit,
  onToggleStatus,
}: SubAgentDetailDialogProps) {
  if (!subAgent) return null;

  const { location, modules } = subAgent;
  const googleMapsUrl = `https://www.google.com/maps?q=${location.gps.lat},${location.gps.lng}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${location.gps.lng - 0.015}%2C${location.gps.lat - 0.015}%2C${location.gps.lng + 0.015}%2C${location.gps.lat + 0.015}&layer=mapnik&marker=${location.gps.lat}%2C${location.gps.lng}`;

  const cleanPhone = subAgent.phone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hola ${subAgent.owner}, nos comunicamos desde la administración central de Hispaniola Pay.`
  )}`;

  const moduleItems = [
    { key: "haitiRemittances", label: "Remesas Haití (MonCash/NatCash)", icon: Smartphone, enabled: modules.haitiRemittances },
    { key: "sendMoney", label: "Envíos de Dinero", icon: Send, enabled: modules.sendMoney },
    { key: "payouts", label: "Pago de Remesas (Payouts)", icon: Wallet, enabled: modules.payouts },
    { key: "qikInvoices", label: "Facturas Qik", icon: Receipt, enabled: modules.qikInvoices },
    { key: "mobileTopups", label: "Recargas Móviles", icon: PhoneCall, enabled: modules.mobileTopups },
    { key: "accounting", label: "Contabilidad y Arqueo", icon: Calculator, enabled: modules.accounting },
    { key: "reports", label: "Reportes y Comisiones", icon: BarChart3, enabled: modules.reports },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 !bg-white !opacity-100 border border-slate-200 shadow-2xl text-slate-900 rounded-xl">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-accent" />
                  {subAgent.name}
                </DialogTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {subAgent.id}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Ficha operativa del subagente comercial en red binacional Hispaniola Pay.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                className={`text-xs px-2.5 py-0.5 ${
                  subAgent.status === "active"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : subAgent.status === "suspended"
                    ? "bg-red-100 text-red-800 border-red-300"
                    : "bg-slate-100 text-slate-800 border-slate-300"
                }`}
              >
                {subAgent.status === "active"
                  ? "● Operativo Activo"
                  : subAgent.status === "suspended"
                  ? "● Suspendido"
                  : "● Inactivo"}
              </Badge>
              <Badge variant="secondary" className="text-xs font-semibold">
                {location.country === "DO" ? "🇩🇴 República Dominicana" : "🇭🇹 Haití"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Tarjetas financieras principales: Tasa % Beneficios, Moneda Local, Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-accent/5 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-accent text-xs font-bold uppercase tracking-wider">
                <Percent className="w-3.5 h-3.5" />
                Tasa de Beneficios
              </div>
              <div className="text-2xl font-black text-foreground">
                {subAgent.commissionRatePercent.toFixed(2)}%
              </div>
              <p className="text-[11px] text-muted-foreground">
                Margen asignado sobre cada transacción
              </p>
            </div>

            <div className="rounded-xl border border-border bg-primary/5 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
                <Coins className="w-3.5 h-3.5" />
                Moneda Local
              </div>
              <div className="text-2xl font-black text-foreground flex items-center gap-2">
                <span>{subAgent.localCurrency}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {subAgent.localCurrency === "DOP" ? "(Pesos RD$)" : subAgent.localCurrency === "HTG" ? "(Gourdes G)" : "(Dólares USD)"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Moneda base de cobros y caja
              </p>
            </div>

            <div className="rounded-xl border border-border bg-emerald-500/5 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5" />
                Balance Operativo
              </div>
              <div className="text-2xl font-black text-emerald-700" suppressHydrationWarning>
                {subAgent.localCurrency === "USD" ? "$" : subAgent.localCurrency === "DOP" ? "RD$ " : "G "}
                {subAgent.walletBalance.toLocaleString("en-US")}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Fondo disponible en billetera
              </p>
            </div>
          </div>

          {/* Información del Responsable y Contacto */}
          <div className="rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Datos del Titular y Acceso
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Dueño / Responsable</span>
                <span className="font-semibold text-foreground text-sm">{subAgent.owner}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Identificación (Cédula/RNC/NIF)</span>
                <span className="font-mono font-medium text-foreground">{subAgent.idNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Email de Acceso</span>
                <a href={`mailto:${subAgent.email}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {subAgent.email}
                </a>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Teléfono / WhatsApp</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-medium text-foreground">{subAgent.phone}</span>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 font-bold"
                    title="Enviar WhatsApp"
                  >
                    WA
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Ubicación Geográfica y GPS con Mapa */}
          <div className="rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" /> Ubicación Física y Posicionamiento GPS
              </h4>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>Abrir en Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-border/70">
                <span className="text-muted-foreground block text-[11px]">Provincia / Departamento</span>
                <span className="font-bold text-foreground">{location.province}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-border/70">
                <span className="text-muted-foreground block text-[11px]">Municipio / Comuna</span>
                <span className="font-bold text-foreground">{location.municipality}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-border/70">
                <span className="text-muted-foreground block text-[11px]">Coordenadas GPS</span>
                <span className="font-mono font-bold text-primary">
                  {location.gps.lat.toFixed(6)}, {location.gps.lng.toFixed(6)}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <span className="text-muted-foreground block text-[11px]">Dirección Exacta y Puntos de Referencia:</span>
              <p className="font-medium text-foreground bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-border/70">
                {location.exactAddress}
                {location.reference && (
                  <span className="text-muted-foreground block text-[11px] mt-1 font-normal">
                    Referencia: {location.reference}
                  </span>
                )}
              </p>
            </div>

            {/* Embedded Map Frame */}
            <div className="relative rounded-lg overflow-hidden border border-border h-48 bg-muted/40">
              <iframe
                title="Mapa de ubicación"
                src={osmEmbedUrl}
                className="w-full h-full border-0 pointer-events-none opacity-90"
                loading="lazy"
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2.5 py-1 rounded-md border text-[11px] shadow-sm">
                <Navigation className="w-3 h-3 text-accent" />
                <span className="font-semibold">{subAgent.name}</span>
                <span className="text-muted-foreground">({location.province}, {location.municipality})</span>
              </div>
            </div>
          </div>

          {/* Módulos Habilitados */}
          <div className="rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" /> Módulos Asignados al Subagente
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {moduleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-medium ${
                      item.enabled
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : "bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60"
                    }`}
                  >
                    {item.enabled ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {subAgent.notes && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <span className="font-bold text-foreground block mb-1">Notas Administrativas:</span>
              {subAgent.notes}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onToggleStatus(subAgent)}
            className={
              subAgent.status === "active"
                ? "text-amber-700 hover:bg-amber-50 border-amber-300"
                : "text-emerald-700 hover:bg-emerald-50 border-emerald-300"
            }
          >
            {subAgent.status === "active" ? "Suspender Subagente" : "Activar Subagente"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(subAgent);
              }}
              className="bg-primary hover:bg-primary/90 text-white font-semibold gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Editar Configuración</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
