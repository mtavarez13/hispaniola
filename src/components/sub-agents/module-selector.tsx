"use client";

import React from "react";
import { SubAgentModules } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Send, 
  Wallet, 
  Receipt, 
  PhoneCall, 
  Calculator, 
  BarChart3, 
  CheckSquare, 
  Square,
  ShieldCheck
} from "lucide-react";

interface ModuleSelectorProps {
  modules: SubAgentModules;
  onChange: (modules: SubAgentModules) => void;
}

interface ModuleDefinition {
  key: keyof SubAgentModules;
  title: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

const AVAILABLE_MODULES: ModuleDefinition[] = [
  {
    key: "haitiRemittances",
    title: "Remesas a Haití (MonCash / NatCash)",
    description: "Depósitos bancarios y billeteras móviles Digicel / Natcom mediante BenCash API.",
    icon: Smartphone,
    badge: "Alta demanda",
    badgeColor: "bg-red-100 text-red-700 border-red-200"
  },
  {
    key: "sendMoney",
    title: "Envíos de Dinero y Transferencias",
    description: "Creación y cotización de remesas internacionales con tasa preferencial.",
    icon: Send,
    badge: "Principal",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200"
  },
  {
    key: "payouts",
    title: "Pago y Desembolso de Remesas",
    description: "Cobro y entrega de efectivo en ventanilla mediante códigos de retiro HP.",
    icon: Wallet,
    badge: "Caja física",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200"
  },
  {
    key: "qikInvoices",
    title: "Facturas y Pagos de Servicios Qik",
    description: "Pago de servicios públicos (luz, agua, telefonía) con saldo Qik asignado.",
    icon: Receipt,
    badge: "Rep. Dominicana",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200"
  },
  {
    key: "mobileTopups",
    title: "Recargas Telefónicas Móviles",
    description: "Venta de tiempo aire para operadores Claro, Altice, Digicel y Natcom.",
    icon: PhoneCall,
    badge: "Rápido",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200"
  },
  {
    key: "accounting",
    title: "Contabilidad y Arqueo de Caja",
    description: "Acceso al módulo de arqueo, cierre diario, balance y libro de movimientos.",
    icon: Calculator,
    badge: "Financiero",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200"
  },
  {
    key: "reports",
    title: "Reportes y Métricas de Comisión",
    description: "Visualización de comisiones acumuladas, ganancias y métricas de volumen.",
    icon: BarChart3,
    badge: "Auditoría",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200"
  }
];

export function ModuleSelector({ modules, onChange }: ModuleSelectorProps) {
  const toggleModule = (key: keyof SubAgentModules) => {
    onChange({
      ...modules,
      [key]: !modules[key]
    });
  };

  const handleSelectAll = () => {
    const allEnabled: SubAgentModules = {
      haitiRemittances: true,
      sendMoney: true,
      payouts: true,
      qikInvoices: true,
      mobileTopups: true,
      accounting: true,
      reports: true
    };
    onChange(allEnabled);
  };

  const handleDeselectAll = () => {
    const allDisabled: SubAgentModules = {
      haitiRemittances: false,
      sendMoney: false,
      payouts: false,
      qikInvoices: false,
      mobileTopups: false,
      accounting: false,
      reports: false
    };
    onChange(allDisabled);
  };

  const activeCount = Object.values(modules).filter(Boolean).length;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-slate-50/80 dark:bg-slate-850 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <h4 className="text-sm font-bold text-foreground">
              Módulos Habilitados para el Subagente
            </h4>
            <Badge variant="outline" className="text-xs font-semibold bg-primary/5 text-primary">
              {activeCount} de {AVAILABLE_MODULES.length} activos
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Seleccione las herramientas y pantallas a las que este subagente tendrá acceso operativo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-7 text-xs font-medium gap-1 text-primary hover:bg-primary/10"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Marcar Todos</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDeselectAll}
            className="h-7 text-xs font-medium gap-1 text-muted-foreground hover:bg-muted"
          >
            <Square className="h-3.5 w-3.5" />
            <span>Desmarcar</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {AVAILABLE_MODULES.map((item) => {
          const Icon = item.icon;
          const isChecked = !!modules[item.key];

          return (
            <div
              key={item.key}
              onClick={() => toggleModule(item.key)}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                isChecked
                  ? "bg-white dark:bg-slate-800 border-accent/60 shadow-xs ring-1 ring-accent/20"
                  : "bg-white dark:bg-slate-900 border-border/70 opacity-75 hover:opacity-100 hover:border-border"
              }`}
            >
              <div className="pt-0.5">
                <Checkbox
                  id={`mod-${item.key}`}
                  checked={isChecked}
                  onCheckedChange={() => toggleModule(item.key)}
                  className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                    <Icon className={`h-3.5 w-3.5 ${isChecked ? "text-accent" : "text-muted-foreground"}`} />
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
