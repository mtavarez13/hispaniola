import { jsPDF } from "jspdf"
import type { HaitiDepositTransaction, UserProfile } from "@/lib/types"

type ReceiptIdentity = Pick<UserProfile, "name" | "clientCode" | "phone"> & { businessName?: string }

const money = (value: number) => Number(value || 0).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

async function loadBrandLogo() {
  const response = await fetch("/branding/hispaniolapay-mark-transparent.png", { cache: "force-cache" })
  if (!response.ok) throw new Error("No se pudo cargar el logo de HispaniolaPay")
  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function createReceipt(transaction: HaitiDepositTransaction, identity?: ReceiptIdentity) {
  const doc = new jsPDF({ unit: "mm", format: [58, 150], orientation: "portrait" })
  const center = 29
  const left = 4
  const right = 54
  let y = 7

  const centered = (text: string, size = 8, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.setFontSize(size)
    doc.text(text, center, y, { align: "center", maxWidth: 50 })
    y += size <= 7 ? 3.5 : 4.5
  }
  const rule = () => {
    doc.setDrawColor(30)
    doc.setLineDashPattern([0.8, 0.8], 0)
    doc.line(left, y, right, y)
    doc.setLineDashPattern([], 0)
    y += 4
  }
  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.text(label, left, y)
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.text(value, right, y, { align: "right", maxWidth: 32 })
    y += 4
  }

  try {
    const logo = await loadBrandLogo()
    doc.addImage(logo, "PNG", 21, 4, 16, 16, "hispaniolapay-logo", "FAST")
    y = 24
  } catch (error) {
    console.warn("No se pudo agregar el logo al recibo:", error)
  }

  centered("HISPANIOLAPAY", 12, true)
  centered("RECIBO DE REMESA", 8, true)
  centered("www.hispaniolapay.com", 7)
  rule()
  row("OPERADOR", transaction.operator, true)
  row("ESTADO", transaction.status === "confirmed" ? "ACREDITADO" : transaction.status.toUpperCase(), true)
  row("FECHA", new Date(transaction.createdAt || transaction.timestamp).toLocaleString("es-DO"))
  row("REFERENCIA", transaction.transactionId || transaction.txId || transaction.id)
  rule()
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.text("REMITENTE / PUNTO", left, y)
  y += 4
  centered(transaction.senderName || identity?.name || "Cliente HispaniolaPay", 8, true)
  if (identity?.businessName) centered(identity.businessName, 7)
  if (identity?.clientCode) centered(`CODIGO: ${identity.clientCode}`, 7)
  if (identity?.phone) centered(`TEL: ${identity.phone}`, 7)
  rule()
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.text("DESTINATARIO", left, y)
  y += 4
  centered(transaction.recipientName || "Destinatario", 9, true)
  centered(transaction.toAccountNumber || "—", 8)
  rule()
  row("MONTO ENVIADO", `${money(transaction.amountSent ?? transaction.amountUSD)} ${transaction.sourceCurrency || "USD"}`, true)
  if (Number(transaction.feeAmount ?? transaction.feeUSD) > 0) {
    row("TARIFA", `${money(transaction.feeAmount ?? transaction.feeUSD ?? 0)} ${transaction.sourceCurrency || "USD"}`)
  }
  row("MONTO RECIBIDO", `${money(transaction.amountHTG)} HTG`, true)
  rule()
  centered("Conserve este comprobante", 7, true)
  centered("Gracias por usar HispaniolaPay", 7)
  centered("Soporte: 809-458-3731", 7)
  return doc
}

export async function downloadRemittanceReceipt58mm(transaction: HaitiDepositTransaction, identity?: ReceiptIdentity) {
  const doc = await createReceipt(transaction, identity)
  const reference = String(transaction.transactionId || transaction.txId || transaction.id).replace(/[^a-z0-9_-]/gi, "-")
  doc.save(`HispaniolaPay_${transaction.operator}_${reference}_58mm.pdf`)
}

export async function printRemittanceReceipt58mm(transaction: HaitiDepositTransaction, identity?: ReceiptIdentity) {
  const doc = await createReceipt(transaction, identity)
  window.open(String(doc.output("bloburl")), "_blank", "noopener,noreferrer")
}
