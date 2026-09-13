"use client"

import { useState } from "react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, DollarSign, Smartphone, Building2 } from "lucide-react"

const weeklyData7Days = [
  { day: "Lun 18", repDom: 1450, moncash: 920, natcash: 410, total: 2780 },
  { day: "Mar 19", repDom: 1820, moncash: 1150, natcash: 530, total: 3500 },
  { day: "Mié 20", repDom: 2100, moncash: 1380, natcash: 620, total: 4100 },
  { day: "Jue 21", repDom: 1950, moncash: 1240, natcash: 580, total: 3770 },
  { day: "Vie 22", repDom: 3200, moncash: 2450, natcash: 980, total: 6630 },
  { day: "Sáb 23", repDom: 3850, moncash: 2890, natcash: 1150, total: 7890 },
  { day: "Dom 24", repDom: 2900, moncash: 2100, natcash: 850, total: 5850 },
]

export function WeeklyRemittanceChart() {
  const [data] = useState(weeklyData7Days)

  const totalWeekVolume = data.reduce((acc, curr) => acc + curr.total, 0)
  const totalMoncash = data.reduce((acc, curr) => acc + curr.moncash, 0)
  const totalNatcash = data.reduce((acc, curr) => acc + curr.natcash, 0)
  const totalRepDom = data.reduce((acc, curr) => acc + curr.repDom, 0)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0)
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
          <p className="font-bold text-slate-200 border-b border-slate-700 pb-1 flex justify-between gap-4">
            <span>{label}</span>
            <span className="text-amber-400 font-mono">${total.toLocaleString()} USD</span>
          </p>
          <div className="space-y-1 pt-1 font-mono text-[11px]">
            <div className="flex justify-between items-center gap-3 text-blue-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0A2540] border border-blue-400" />
                Rep. Dominicana:
              </span>
              <span className="font-bold">${payload.find((p: any) => p.dataKey === 'repDom')?.value?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center gap-3 text-red-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E60000]" />
                MonCash Haití:
              </span>
              <span className="font-bold">${payload.find((p: any) => p.dataKey === 'moncash')?.value?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center gap-3 text-cyan-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#006699]" />
                NatCash Haití:
              </span>
              <span className="font-bold">${payload.find((p: any) => p.dataKey === 'natcash')?.value?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="border-none shadow-md bg-white overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent" />
                Volumen de Remesas por Día (Última Semana)
              </CardTitle>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                +18.4% vs semana previa
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Desglose diario por canal: Red República Dominicana, MonCash Haití y NatCash Haití.
            </CardDescription>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block">Total 7 Días</span>
            <span className="text-2xl font-black text-primary">${totalWeekVolume.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">USD</span></span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        
        {/* Quick Channel Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#0A2540]" />
              <span className="text-xs font-semibold text-slate-700">Rep. Dominicana</span>
            </div>
            <span className="text-xs font-bold font-mono text-slate-900">${totalRepDom.toLocaleString()} USD</span>
          </div>

          <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#E60000]" />
              <span className="text-xs font-semibold text-red-900">MonCash Haití</span>
            </div>
            <span className="text-xs font-bold font-mono text-red-950">${totalMoncash.toLocaleString()} USD</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#006699]" />
              <span className="text-xs font-semibold text-blue-900">NatCash Haití</span>
            </div>
            <span className="text-xs font-bold font-mono text-blue-950">${totalNatcash.toLocaleString()} USD</span>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              barGap={4}
              barSize={18}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 11, fill: '#64748B' }} 
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => {
                  if (value === 'repDom') return <span className="text-xs text-slate-700 font-semibold">Rep. Dominicana</span>
                  if (value === 'moncash') return <span className="text-xs text-[#E60000] font-semibold">MonCash Haití (BenCash)</span>
                  if (value === 'natcash') return <span className="text-xs text-[#006699] font-semibold">NatCash Haití (BenCash)</span>
                  return value
                }}
              />
              <Bar 
                dataKey="repDom" 
                name="repDom"
                fill="#0A2540" 
                radius={[4, 4, 0, 0]} 
                stackId="a"
              />
              <Bar 
                dataKey="moncash" 
                name="moncash"
                fill="#E60000" 
                radius={[4, 4, 0, 0]} 
                stackId="a"
              />
              <Bar 
                dataKey="natcash" 
                name="natcash"
                fill="#006699" 
                radius={[4, 4, 0, 0]} 
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </CardContent>
    </Card>
  )
}
