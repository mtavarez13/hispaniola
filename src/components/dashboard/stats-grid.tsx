"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, Users, Wallet, Activity, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsGridProps {
  role: string
  walletBalance: number
}

export function StatsGrid({ role, walletBalance }: StatsGridProps) {
  const formattedBalance = Number(walletBalance || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const stats = [
    {
      title: "Balance Billetera",
      value: `${formattedBalance} USD`,
      icon: Wallet,
      description: role === 'agent' ? "Comisiones acumuladas" : "Saldo disponible",
      trend: "+12%",
      trendType: "up",
    },
    {
      title: "Envíos del Mes",
      value: "154",
      icon: Activity,
      description: "Transacciones procesadas",
      trend: "+5.2%",
      trendType: "up",
    },
    {
      title: "Beneficiarios",
      value: "82",
      icon: Users,
      description: "Contactos guardados",
      trend: "+2",
      trendType: "up",
    },
    {
      title: "Tarifa Promedio",
      value: "5%",
      icon: CreditCard,
      description: "Costos de transferencia",
      trend: "0%",
      trendType: "neutral",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <div className="p-2 bg-secondary rounded-lg">
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary" suppressHydrationWarning>{stat.value}</div>
            <div className="flex items-center mt-1">
              <span className={cn(
                "text-xs font-medium flex items-center mr-1",
                stat.trendType === 'up' ? "text-green-600" : stat.trendType === 'down' ? "text-red-600" : "text-gray-600"
              )}>
                {stat.trendType === 'up' && <ArrowUpRight className="h-3 w-3" />}
                {stat.trendType === 'down' && <ArrowDownRight className="h-3 w-3" />}
                {stat.trend}
              </span>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}