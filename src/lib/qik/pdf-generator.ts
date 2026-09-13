import { jsPDF } from "jspdf";
import { QikInvoice } from "@/lib/types";

/**
 * Generates an 80mm thermal receipt PDF matching the exact specified format:
 * 
 *   HISPANIOLA PAY
 *        TEL: 809-323-3535
 *  Las Matas De Santa Cruz/ Duarte No.30
 * 
 * FECHA/HORA: 21/08/2026 03:26 PM
 * NO. REFERENCIA: 53-189181160
 * SERVICIO: Telefónicas / Altice
 * TEL: 8299930707
 * 
 * MONTO SERVICIO: RD$ 3853.99
 * CARGO SERVICIO: RD$ 10.00
 * 
 * TOTAL PAGADO: RD$ 3863.99
 */
export function generateQikInvoicePdf(invoice: QikInvoice): jsPDF {
  // 80mm thermal roll format (80mm width, 155mm height)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 155],
  });

  const pageWidth = 80;
  let y = 10;

  // Set font
  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.text(invoice.empresaEmisora || "HISPANIOLA PAY", pageWidth / 2, y, { align: "center" });

  y += 5.5;
  doc.setFont("courier", "normal");
  doc.setFontSize(9.5);
  doc.text(`TEL: ${invoice.telefonoEmisora || "809-323-3535"}`, pageWidth / 2, y, { align: "center" });

  y += 4.5;
  doc.setFontSize(8.5);
  doc.text(invoice.direccionEmisora || "Las Matas De Santa Cruz/ Duarte No.30", pageWidth / 2, y, { align: "center" });

  y += 5;
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text("-".repeat(34), pageWidth / 2, y, { align: "center" });

  y += 6;
  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  const leftX = 6;

  doc.text(`FECHA/HORA: ${invoice.fechaHora}`, leftX, y);
  
  y += 5.5;
  doc.text(`NO. REFERENCIA: ${invoice.noReferencia}`, leftX, y);

  y += 5.5;
  doc.text(`SERVICIO: ${invoice.servicio}`, leftX, y);

  y += 5.5;
  doc.text(`TEL: ${invoice.telefono}`, leftX, y);

  y += 5.5;
  doc.setFont("courier", "normal");
  doc.text("-".repeat(34), pageWidth / 2, y, { align: "center" });

  y += 6.5;
  doc.setFont("courier", "bold");
  doc.setFontSize(9.5);
  doc.text(`MONTO SERVICIO: ${invoice.moneda} ${invoice.montoServicio.toFixed(2)}`, leftX, y);

  y += 5.5;
  doc.text(`CARGO SERVICIO: ${invoice.moneda} ${invoice.cargoServicio.toFixed(2)}`, leftX, y);

  y += 5.5;
  doc.setFont("courier", "normal");
  doc.text("=".repeat(34), pageWidth / 2, y, { align: "center" });

  y += 7;
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text(`TOTAL PAGADO: ${invoice.moneda} ${invoice.totalPagado.toFixed(2)}`, leftX, y);

  y += 8;
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text("¡Comprobante de Pago Autorizado!", pageWidth / 2, y, { align: "center" });

  y += 4.5;
  doc.text("Gracias por su preferencia", pageWidth / 2, y, { align: "center" });

  y += 4.5;
  doc.text("www.hispaniolapay.com", pageWidth / 2, y, { align: "center" });

  return doc;
}

export function downloadQikInvoicePdf(invoice: QikInvoice) {
  const doc = generateQikInvoicePdf(invoice);
  const cleanRef = (invoice.noReferencia || "factura").replace(/[^a-zA-Z0-9-]/g, "_");
  doc.save(`Factura_Qik_${cleanRef}_80mm.pdf`);
}

export function printQikInvoice(invoice: QikInvoice) {
  try {
    // Generate styled printable content in the current document
    const printId = "qik-thermal-print-container";
    let printContainer = document.getElementById(printId);
    if (!printContainer) {
      printContainer = document.createElement("div");
      printContainer.id = printId;
      document.body.appendChild(printContainer);
    }

    printContainer.innerHTML = `
      <style>
        @media print {
          body * {
            visibility: hidden !important;
          }
          #${printId}, #${printId} * {
            visibility: visible !important;
          }
          #${printId} {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            font-family: monospace !important;
            font-size: 12px !important;
            line-height: 1.4 !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      </style>
      <div style="width: 72mm; font-family: monospace; font-size: 12px; color: black; line-height: 1.4; text-align: left;">
        <div style="text-align: center; margin-bottom: 8px;">
          <strong style="font-size: 14px;">${invoice.empresaEmisora || "HISPANIOLA PAY"}</strong><br />
          TEL: ${invoice.telefonoEmisora || "809-323-3535"}<br />
          <span style="font-size: 10px;">${invoice.direccionEmisora || "Las Matas De Santa Cruz/ Duarte No.30"}</span>
        </div>
        <div style="border-top: 1px dashed black; margin: 6px 0;"></div>
        <div><strong>FECHA/HORA:</strong> ${invoice.fechaHora}</div>
        <div><strong>NO. REFERENCIA:</strong> ${invoice.noReferencia}</div>
        <div><strong>SERVICIO:</strong> ${invoice.servicio}</div>
        <div><strong>TEL:</strong> ${invoice.telefono}</div>
        <div style="border-top: 1px dashed black; margin: 6px 0;"></div>
        <div><strong>MONTO SERVICIO:</strong> ${invoice.moneda} ${invoice.montoServicio.toFixed(2)}</div>
        <div><strong>CARGO SERVICIO:</strong> ${invoice.moneda} ${invoice.cargoServicio.toFixed(2)}</div>
        <div style="border-top: 2px solid black; margin: 6px 0;"></div>
        <div style="font-size: 14px; font-weight: bold;">
          TOTAL PAGADO: ${invoice.moneda} ${invoice.totalPagado.toFixed(2)}
        </div>
        <div style="border-top: 1px dotted black; margin: 8px 0; padding-top: 6px; text-align: center; font-size: 10px;">
          ¡Comprobante de Pago Autorizado!<br />
          Gracias por su preferencia<br />
          www.hispaniolapay.com
        </div>
      </div>
    `;

    // Attempt native browser window.print()
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    } else {
      downloadQikInvoicePdf(invoice);
    }
  } catch (err) {
    console.warn("Direct window.print fallback, saving PDF:", err);
    // If window.print is restricted by iframe sandbox, download the 80mm PDF
    downloadQikInvoicePdf(invoice);
  }
}
