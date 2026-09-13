"use client";

import React, { useState } from "react";
import { QikInvoice } from "@/lib/types";
import { downloadQikInvoicePdf, printQikInvoice } from "@/lib/qik/pdf-generator";
import { Button } from "@/components/ui/button";
import { Printer, Download, Share2, Copy, Check } from "lucide-react";

interface ThermalReceipt80mmProps {
  invoice: QikInvoice;
  onEdit?: (invoice: QikInvoice) => void;
}

export function ThermalReceipt80mm({ invoice }: ThermalReceipt80mmProps) {
  const [copied, setCopied] = useState(false);

  const formattedText = `  ${invoice.empresaEmisora || "HISPANIOLA PAY"}
       TEL: ${invoice.telefonoEmisora || "809-323-3535"}
 ${invoice.direccionEmisora || "Las Matas De Santa Cruz/ Duarte No.30"}

FECHA/HORA: ${invoice.fechaHora}
NO. REFERENCIA: ${invoice.noReferencia}
SERVICIO: ${invoice.servicio}
TEL: ${invoice.telefono}

MONTO SERVICIO: ${invoice.moneda} ${invoice.montoServicio.toFixed(2)}
CARGO SERVICIO: ${invoice.moneda} ${invoice.cargoServicio.toFixed(2)}

TOTAL PAGADO: ${invoice.moneda} ${invoice.totalPagado.toFixed(2)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `*COMPROBANTE DE PAGO - HISPANIOLA PAY*\n` +
      `--------------------------------\n` +
      `*Fecha/Hora:* ${invoice.fechaHora}\n` +
      `*No. Referencia:* ${invoice.noReferencia}\n` +
      `*Servicio:* ${invoice.servicio}\n` +
      `*Teléfono/Ref:* ${invoice.telefono}\n` +
      `*Monto Servicio:* ${invoice.moneda} ${invoice.montoServicio.toFixed(2)}\n` +
      `*Cargo Servicio:* ${invoice.moneda} ${invoice.cargoServicio.toFixed(2)}\n` +
      `*TOTAL PAGADO:* ${invoice.moneda} ${invoice.totalPagado.toFixed(2)}\n` +
      `--------------------------------\n` +
      `Las Matas De Santa Cruz / Duarte No.30\nTel: 809-323-3535`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="flex flex-col items-center">
      {/* 80mm Thermal Paper Simulation Card */}
      <div 
        id={`receipt-${invoice.id}`}
        className="w-full max-w-[340px] bg-[#fffdf9] text-zinc-900 font-mono text-[13px] leading-relaxed p-6 rounded-md shadow-lg border border-zinc-200/80 relative select-text"
        style={{
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Top Paper Serration / Indicator */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-200/40 via-zinc-300/40 to-amber-200/40 border-b border-dashed border-zinc-300"></div>

        {/* Header */}
        <div className="text-center pt-2 pb-3">
          <h2 className="font-bold text-base tracking-wider text-black">
            {invoice.empresaEmisora || "HISPANIOLA PAY"}
          </h2>
          <p className="text-xs font-semibold text-zinc-700 mt-0.5">
            TEL: {invoice.telefonoEmisora || "809-323-3535"}
          </p>
          <p className="text-[11px] text-zinc-600 mt-0.5 leading-snug">
            {invoice.direccionEmisora || "Las Matas De Santa Cruz/ Duarte No.30"}
          </p>
        </div>

        {/* Divider */}
        <div className="border-b border-dashed border-zinc-400 my-2"></div>

        {/* Body Details */}
        <div className="space-y-1.5 py-1 text-zinc-800">
          <div className="flex justify-between items-baseline gap-1">
            <span className="font-bold">FECHA/HORA:</span>
            <span className="text-right font-semibold">{invoice.fechaHora}</span>
          </div>

          <div className="flex justify-between items-baseline gap-1">
            <span className="font-bold">NO. REFERENCIA:</span>
            <span className="text-right font-bold text-zinc-950">{invoice.noReferencia}</span>
          </div>

          <div className="flex justify-between items-baseline gap-1">
            <span className="font-bold">SERVICIO:</span>
            <span className="text-right font-semibold">{invoice.servicio}</span>
          </div>

          <div className="flex justify-between items-baseline gap-1">
            <span className="font-bold">TEL:</span>
            <span className="text-right font-semibold">{invoice.telefono}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-dashed border-zinc-400 my-2"></div>

        {/* Amounts Breakdown */}
        <div className="space-y-1.5 py-1 text-zinc-800">
          <div className="flex justify-between items-baseline">
            <span className="font-bold">MONTO SERVICIO:</span>
            <span className="font-semibold">
              {invoice.moneda} {invoice.montoServicio.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-baseline">
            <span className="font-bold">CARGO SERVICIO:</span>
            <span className="font-semibold">
              {invoice.moneda} {invoice.cargoServicio.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Total Divider */}
        <div className="border-b-2 border-zinc-800 my-2.5"></div>

        {/* Total Pagado */}
        <div className="flex justify-between items-baseline py-1">
          <span className="font-black text-sm tracking-wide text-zinc-950">TOTAL PAGADO:</span>
          <span className="font-black text-base text-zinc-950">
            {invoice.moneda} {invoice.totalPagado.toFixed(2)}
          </span>
        </div>

        {/* Thermal Receipt Bottom Edge Graphic */}
        <div className="mt-4 pt-2 border-t border-dotted border-zinc-300 text-center text-[10px] text-zinc-500">
          <p className="font-semibold">¡Comprobante de Pago Qik / Hispaniola Pay!</p>
          <p className="mt-0.5">Gracias por su preferencia</p>
          <p className="mt-0.5 text-zinc-400">Formato Estándar Térmico 80mm</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-4 w-full max-w-[340px]">
        <Button
          onClick={() => downloadQikInvoicePdf(invoice)}
          className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 shadow-sm"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Descargar PDF
        </Button>

        <Button
          onClick={() => printQikInvoice(invoice)}
          variant="outline"
          className="border-zinc-300 hover:bg-zinc-100 font-bold text-xs h-9 text-zinc-800"
        >
          <Printer className="w-3.5 h-3.5 mr-1.5" />
          Imprimir 80mm
        </Button>

        <Button
          onClick={handleWhatsApp}
          variant="outline"
          className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-semibold text-xs h-9"
        >
          <Share2 className="w-3.5 h-3.5 mr-1.5" />
          WhatsApp
        </Button>

        <Button
          onClick={handleCopy}
          variant="outline"
          className="border-zinc-300 hover:bg-zinc-100 font-semibold text-xs h-9 text-zinc-700"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              ¡Copiado!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copiar Texto
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
