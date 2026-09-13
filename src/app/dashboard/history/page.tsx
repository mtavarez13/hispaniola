"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Filter, Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ReceiptView } from "@/components/remittance/receipt-view"
import { formatNumber } from "@/lib/utils"

export default function HistoryPage() {
  const transactions = [
    { id: "RF-9283", date: "2024-05-15", sender: "Carlos Rodriguez", receiver: "Jean Baptiste", amountSent: 500, status: "completed", dest: "HTG", payoutCurrency: "HTG", exchangeRate: 132.2, receiverPhone: "+509 1234 5678", receiverPassport: "ID-12345", amountReceived: 62785, feeAmount: 25, withdrawCode: "HP-9283-1122" },
    { id: "RF-8172", date: "2024-05-14", sender: "Carlos Rodriguez", receiver: "Maria Santos", amountSent: 1200, status: "pending", dest: "DOP", payoutCurrency: "DOP", exchangeRate: 58.5, receiverPhone: "+1 809 123 4567", receiverPassport: "ID-54321", amountReceived: 66690, feeAmount: 60, withdrawCode: "HP-8172-3344" },
    { id: "RF-7654", date: "2024-05-12", sender: "Maria Garcia", receiver: "Carlos Rodriguez", amountSent: 150, status: "completed", dest: "USA", payoutCurrency: "USD", exchangeRate: 1.0, receiverPhone: "+1 305 123 4567", receiverPassport: "ID-67890", amountReceived: 142.5, feeAmount: 7.5, withdrawCode: "HP-7654-5566" },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Historial de Transacciones</h1>
          <p className="text-muted-foreground mt-1">Consulta y gestiona todos tus movimientos pasados.</p>
        </div>
        <Button variant="outline" className="border-primary text-primary hover:bg-secondary gap-2">
          <Download className="w-4 h-4" /> Exportar Reporte
        </Button>
      </div>

      <Card className="border-none shadow-md bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por código o nombre..." className="pl-10 bg-secondary/30 border-none" />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="gap-2 text-muted-foreground">
                <Filter className="w-4 h-4" /> Filtrar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Fecha e ID</TableHead>
                  <TableHead>Remitente</TableHead>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead>Monto (USD)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Recibo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium text-primary">{tx.id}</div>
                      <div className="text-xs text-muted-foreground">{tx.date}</div>
                    </TableCell>
                    <TableCell className="text-sm">{tx.sender}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] py-0">{tx.dest}</Badge>
                        <span className="text-sm">{tx.receiver}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold" suppressHydrationWarning>${formatNumber(tx.amountSent)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        tx.status === 'completed' ? 'default' : 
                        tx.status === 'pending' ? 'secondary' : 'destructive'
                      } className={
                        tx.status === 'completed' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                        tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' : ''
                      }>
                        {tx.status === 'completed' ? 'Completado' : 
                         tx.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80 underline h-auto p-0 gap-1">
                            <FileText className="w-3 h-3" /> Ver Recibo
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Recibo de Transacción</DialogTitle>
                          </DialogHeader>
                          <ReceiptView 
                            type={tx.id.startsWith('RF-9') ? 'payout' : 'send'} 
                            transaction={{
                              ...tx,
                              receiverName: tx.receiver,
                              senderName: tx.sender
                            }} 
                          />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
