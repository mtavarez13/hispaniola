"use client"

import { Transaction, UserProfile } from "@/lib/types"
import { Printer, Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface ReceiptViewProps {
  transaction: any // Partial<Transaction>
  user?: UserProfile
  type: 'send' | 'payout'
}

export function ReceiptView({ transaction, user, type }: ReceiptViewProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <div className="w-[320px] bg-white p-6 shadow-xl border border-gray-200 font-mono text-[12px] leading-tight text-black print:shadow-none print:border-none print:m-0" id="thermal-receipt">
        <div className="text-center space-y-1 mb-4">
          <h2 className="text-lg font-black uppercase tracking-tighter">Hispaniola Pay</h2>
          <p>Conectando la Isla</p>
          <p className="text-[10px]">Santo Domingo - Port-au-Prince - Miami</p>
          <p className="text-[10px]">RNC: 1-32-44556-2</p>
        </div>

        <Separator className="my-2 border-dashed bg-transparent border-black" />

        <div className="space-y-1">
          <div className="flex justify-between font-bold">
            <span>TICKET:</span>
            <span>{transaction.id || 'HP-TEMP-001'}</span>
          </div>
          <div className="flex justify-between">
            <span>FECHA:</span>
            <span suppressHydrationWarning>{transaction.date || new Date().toISOString().slice(0, 10)}</span>
          </div>
          <div className="flex justify-between">
            <span>TIPO:</span>
            <span className="uppercase">{type === 'send' ? 'ENVIO DE DINERO' : 'PAGO DE REMESA'}</span>
          </div>
        </div>

        <Separator className="my-2 border-dashed bg-transparent border-black" />

        <div className="space-y-2">
          <div>
            <p className="font-bold border-b border-black inline-block mb-1">EMISOR:</p>
            <p className="truncate">{transaction.senderName || user?.name || 'CLIENTE MOSTRADOR'}</p>
          </div>
          <div>
            <p className="font-bold border-b border-black inline-block mb-1">BENEFICIARIO:</p>
            <p className="truncate font-bold text-[14px]">{transaction.receiverName}</p>
            <p>ID: {transaction.receiverPassport}</p>
            <p>TEL: {transaction.receiverPhone}</p>
          </div>
        </div>

        <Separator className="my-2 border-dashed bg-transparent border-black" />

        <div className="space-y-1">
          <div className="flex justify-between">
            <span>MONTO ENVIADO:</span>
            <span>${transaction.amountSent?.toLocaleString() || transaction.amount?.toLocaleString()} USD</span>
          </div>
          <div className="flex justify-between">
            <span>COMISION (5%):</span>
            <span>-${transaction.feeAmount?.toFixed(2)} USD</span>
          </div>
          {transaction.payoutCurrency !== 'USD' && (
            <div className="flex justify-between italic">
              <span>TASA CAMBIO:</span>
              <span>1:{transaction.exchangeRate?.toFixed(2)} {transaction.payoutCurrency}</span>
            </div>
          )}
        </div>

        <div className="my-4 py-2 border-y-2 border-black text-center">
          <p className="text-[10px] mb-1 uppercase font-bold">Monto a Entregar</p>
          <p className="text-2xl font-black">
            {transaction.amountReceived?.toLocaleString()} {transaction.payoutCurrency}
          </p>
        </div>

        <div className="text-center space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold">Código de Retiro</p>
            <p className="text-xl font-black border-2 border-black p-1 inline-block min-w-[150px]">
              {transaction.withdrawCode}
            </p>
          </div>
          
          <div className="text-[9px] leading-tight mt-6 italic">
            <p>Este documento es un comprobante de transacción.</p>
            <p>El retiro está sujeto a la presentación de identificación válida.</p>
            <p>¡Gracias por confiar en Hispaniola Pay!</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 w-full max-w-[320px] print:hidden">
        <Button onClick={handlePrint} className="flex-1 gap-2 bg-primary text-white">
          <Printer className="w-4 h-4" /> Imprimir
        </Button>
        <Button variant="outline" className="flex-1 gap-2 border-primary text-primary">
          <Download className="w-4 h-4" /> PDF
        </Button>
      </div>
    </div>
  )
}
