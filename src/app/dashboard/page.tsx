"use client"

import { StatsGrid } from "@/components/dashboard/stats-grid"
import { CalculatorCard } from "@/components/remittance/calculator-card"
import { WeeklyRemittanceChart } from "@/components/dashboard/weekly-remittance-chart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, ArrowRight, Download, Send, Search, Smartphone, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSystemSettings } from "@/lib/settings-context"
import Link from "next/link"

export default function DashboardPage() {
  const { settings } = useSystemSettings()

  const transactions = [
    { id: "HT-992144", date: "2026-08-23", sender: "Carlos Rodriguez", receiver: "Jean Baptiste (MonCash)", amount: "$500.00", status: "completed", dest: "HTG", channel: "MonCash" },
    { id: "HP-8172", date: "2026-08-22", sender: "Carlos Rodriguez", receiver: "Maria Santos (Santiago)", amount: "$1,200.00", status: "completed", dest: "DOP", channel: "Agente DO" },
    { id: "HT-881203", date: "2026-08-21", sender: "Carlos Rodriguez", receiver: "Pierre Louis (NatCash)", amount: "$350.00", status: "completed", dest: "HTG", channel: "NatCash" },
    { id: "HP-7654", date: "2026-08-20", sender: "Maria Garcia", receiver: "Carlos Rodriguez", amount: "$150.00", status: "completed", dest: "USD", channel: "Directo" },
    { id: "HT-772910", date: "2026-08-19", sender: "Carlos Rodriguez", receiver: "Fritzner Joseph (MonCash)", amount: "$420.00", status: "pending", dest: "HTG", channel: "MonCash" },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Bienvenido a Hispaniola Pay</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Plataforma integral de remesas transfronterizas (Rep. Dominicana y Haití vía BenCash).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/haiti-remittances">
            <Button variant="outline" className="text-xs font-bold gap-2 border-red-200 text-red-700 hover:bg-red-50">
              <Smartphone className="w-4 h-4 text-red-600" />
              Remesas Haití Directo
            </Button>
          </Link>
          <Link href="/dashboard/send">
            <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2 text-xs">
              <Send className="w-4 h-4" /> Enviar Dinero
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <StatsGrid role="agent" walletBalance={34250.00} />

      {/* Weekly Remittances Bar Chart (Recharts) */}
      <WeeklyRemittanceChart />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
              <div>
                <CardTitle className="text-lg font-bold text-primary">Transacciones Recientes</CardTitle>
                <CardDescription className="text-xs">Últimos movimientos registrados en el corredor.</CardDescription>
              </div>
              <Link href="/dashboard/history">
                <Button variant="outline" size="sm" className="hidden sm:flex border-primary/20 text-primary hover:bg-secondary text-xs">
                  Ver todo el historial
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por ID, canal o nombre de destinatario..." className="pl-9 bg-secondary/30 border-none h-9 text-xs" />
                </div>
                <div className="rounded-md border border-border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/30">
                      <TableRow>
                        <TableHead>Transacción</TableHead>
                        <TableHead className="hidden md:table-cell">Destinatario & Canal</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id} className="hover:bg-muted/30 text-xs">
                          <TableCell>
                            <div className="font-bold text-primary">{tx.id}</div>
                            <div className="text-[11px] text-muted-foreground">{tx.date}</div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-[10px] py-0 ${
                                tx.channel === 'MonCash' ? 'bg-red-50 text-red-700 border-red-200' :
                                tx.channel === 'NatCash' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-slate-50 text-slate-700'
                              }`}>
                                {tx.channel}
                              </Badge>
                              <span className="font-medium text-slate-800">{tx.receiver}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-900">{tx.amount}</TableCell>
                          <TableCell>
                            <Badge variant={
                              tx.status === 'completed' ? 'default' : 
                              tx.status === 'pending' ? 'secondary' : 'destructive'
                            } className={
                              tx.status === 'completed' ? 'bg-green-100 text-green-700 hover:bg-green-100 text-[10px]' :
                              tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-[10px]' : ''
                            }>
                              {tx.status === 'completed' ? 'Completado' : 
                               tx.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href="/dashboard/history">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Exchange Rates & Quick Calculator */}
        <div className="space-y-6">
          <CalculatorCard />
          
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-primary">Tasas Oficiales del Día</CardTitle>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px]">En Vivo</Badge>
              </div>
              <CardDescription className="text-xs">Fijadas por la administración para el público.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
               <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">🇩🇴</div>
                    <div>
                      <div className="text-xs font-bold text-blue-950">USD a DOP (Rep. Dom)</div>
                      <div className="text-[10px] text-muted-foreground">Tasa Público</div>
                    </div>
                  </div>
                  <div className="text-base font-black text-blue-950">{settings?.publicRateDOP?.toFixed(2) || "58.50"}</div>
               </div>

               <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">🇭🇹</div>
                    <div>
                      <div className="text-xs font-bold text-red-950">USD a HTG (Haití)</div>
                      <div className="text-[10px] text-muted-foreground">MonCash / NatCash</div>
                    </div>
                  </div>
                  <div className="text-base font-black text-red-950">{settings?.publicRateHTG?.toFixed(2) || "132.20"}</div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
