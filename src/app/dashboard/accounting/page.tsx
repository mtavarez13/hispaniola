"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, CreditCard, PiggyBank, ArrowDownRight, ArrowUpRight } from "lucide-react"
import { useSystemSettings } from "@/lib/settings-context"
import { formatNumber } from "@/lib/utils"

export default function AccountingPage() {
  const { settings } = useSystemSettings()

  const platformFee = settings?.platformFeePercentage ?? 5.0
  const agentFee = settings?.agentPayoutPercentage ?? 2.0

  const financialStats = [
    { title: "Volumen Total", value: "$128,450.00", icon: DollarSign, trend: "+12.5%", trendType: "up", desc: "Monto total enviado" },
    { title: "Comisiones HP", value: "$6,422.50", icon: TrendingUp, trend: "+5.2%", trendType: "up", desc: `Ganancia por fee del ${platformFee}%` },
    { title: "Pagos a Agentes", value: "$2,569.00", icon: CreditCard, trend: "-2.1%", trendType: "down", desc: `Comisiones de red (${agentFee}%)` },
    { title: "Balance Neto", value: "$3,853.50", icon: PiggyBank, trend: "+8.4%", trendType: "up", desc: "Utilidad operativa bruta" },
  ]

  const transactions = [
    { id: "TX-9001", date: "2024-05-20", type: "Ingreso", category: "Fee Transacción", amount: 25.00, status: "completed" },
    { id: "TX-9002", date: "2024-05-20", type: "Egreso", category: "Comisión Agente", amount: -10.00, status: "completed" },
    { id: "TX-9003", date: "2024-05-19", type: "Ingreso", category: "Recarga Fondo", amount: 5000.00, status: "completed" },
    { id: "TX-9004", date: "2024-05-19", type: "Ingreso", category: "Fee Transacción", amount: 60.00, status: "completed" },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Módulo de Contabilidad</h1>
        <p className="text-muted-foreground mt-1">Resumen financiero y flujo de caja de la plataforma.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {financialStats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <div className="flex items-center mt-1">
                <span className={`text-xs font-medium flex items-center mr-1 ${stat.trendType === 'up' ? "text-green-600" : "text-red-600"}`}>
                  {stat.trendType === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.trend}
                </span>
                <p className="text-[10px] text-muted-foreground">{stat.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary">Movimientos Financieros</CardTitle>
          <CardDescription>Registro histórico de ingresos y egresos operativos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Monto (USD)</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium text-primary">{tx.id}</TableCell>
                    <TableCell className="text-sm">{tx.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{tx.category}</Badge>
                    </TableCell>
                    <TableCell className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`} suppressHydrationWarning>
                      {tx.amount > 0 ? '+' : ''}{formatNumber(tx.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-100 text-green-700">Completado</Badge>
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