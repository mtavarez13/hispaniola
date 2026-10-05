"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CheckCircle2, Clock3, RefreshCw, Send, ShieldCheck, UserRound, Wallet } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useSystemSettings } from "@/lib/settings-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Movement = { id: string; title: string; description: string; direction: "in" | "out" | "transfer"; amountUSD: number; status: string; createdAt?: string }
type AccountData = { account?: { name?: string; walletBalanceUSD?: number; savingsBalanceUSD?: number; clientCode?: string }; movements?: Movement[]; refreshedAt?: string }

export default function DashboardPage() {
  const { user, userProfile } = useAuth()
  const { settings } = useSystemSettings()
  const [data, setData] = useState<AccountData>({})
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) return
    setSyncing(true)
    try {
      const response = await fetch("/api/mobile/account", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" })
      const body = await response.json()
      if (response.ok && body.success) setData(body)
    } finally { setSyncing(false) }
  }, [user])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const timer = window.setInterval(refresh, 15000)
    const onFocus = () => refresh()
    window.addEventListener("focus", onFocus)
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus) }
  }, [refresh])

  const balance = Number(data.account?.walletBalanceUSD ?? userProfile?.walletBalance ?? 0)
  const savings = Number(data.account?.savingsBalanceUSD ?? userProfile?.savingsBalance ?? 0)
  const name = data.account?.name || userProfile?.name || "Cliente"
  const movements = data.movements || []
  const actions = [
    { href: "/dashboard/wallet?tab=send", icon: Send, title: "Enviar", detail: "NatCash o MonCash", color: "bg-blue-600" },
    { href: "/dashboard/wallet?tab=bank", icon: ArrowDownLeft, title: "Depositar", detail: "Sin comisión", color: "bg-emerald-600" },
    { href: "/dashboard/wallet?tab=history", icon: Clock3, title: "Movimientos", detail: "Actividad unificada", color: "bg-violet-600" },
    { href: "/dashboard/profile", icon: UserRound, title: "Mi perfil", detail: "Datos personales", color: "bg-amber-500" },
  ]

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-12">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <Badge className="mb-4 border-white/15 bg-white/10 text-white hover:bg-white/10">Billetera sincronizada</Badge>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">Hola, {name.split(" ")[0]}</h1>
            <p className="mt-2 text-sm text-blue-100 md:text-base">Deposita, revisa tu saldo y envía a NatCash o MonCash desde un solo lugar.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/wallet?tab=send"><Button className="gap-2 bg-white text-blue-950 hover:bg-blue-50"><Send className="h-4 w-4" /> Enviar remesa</Button></Link>
              <Link href="/dashboard/wallet?tab=bank"><Button variant="outline" className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"><ArrowDownLeft className="h-4 w-4" /> Depositar 0%</Button></Link>
            </div>
          </div>
          <div className="min-w-[280px] rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-100"><span>Saldo disponible</span><Wallet className="h-5 w-5" /></div>
            <div className="mt-3 text-4xl font-black">US${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3 text-xs text-blue-100"><span>Ahorro</span><strong className="text-white">US${savings.toFixed(2)}</strong></div>
            <div className="mt-2 flex items-center justify-between text-xs text-blue-100"><span>Código</span><strong className="font-mono text-white">{data.account?.clientCode || userProfile?.clientCode || "—"}</strong></div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => <Link key={action.title} href={action.href} className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-white ${action.color}`}><action.icon className="h-5 w-5" /></div><div className="font-black text-slate-900">{action.title}</div><div className="mt-1 flex items-center justify-between text-xs text-slate-500"><span>{action.detail}</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div></Link>)}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/70">
            <div><CardTitle className="text-lg font-black">Actividad reciente</CardTitle><p className="mt-1 text-xs text-slate-500">Movimientos realizados desde la web y el APK.</p></div>
            <Button variant="ghost" size="sm" onClick={refresh} disabled={syncing} className="gap-2"><RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Actualizar</Button>
          </CardHeader>
          <CardContent className="p-0">
            {movements.length === 0 ? <div className="p-12 text-center"><Wallet className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-bold text-slate-700">Aún no hay movimientos</p><p className="text-xs text-slate-500">Tus depósitos y remesas aparecerán aquí.</p></div> : movements.slice(0, 8).map((item) => <div key={item.id} className="flex items-center gap-3 border-b px-4 py-4 last:border-0 md:px-6"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.direction === "in" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{item.direction === "in" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-slate-900">{item.title}</div><div className="truncate text-xs text-slate-500">{item.description}</div></div><div className="text-right"><div className={`text-sm font-black ${item.direction === "in" ? "text-emerald-700" : "text-slate-900"}`}>{item.direction === "in" ? "+" : "−"}US${Number(item.amountUSD).toFixed(2)}</div><div className="text-[10px] text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString("es-DO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</div></div></div>)}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-lg font-black">Tasas de hoy</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between rounded-2xl bg-blue-50 p-4"><div><div className="text-xs font-bold text-blue-700">USD → DOP</div><div className="text-[11px] text-slate-500">República Dominicana</div></div><strong className="text-xl text-blue-950">{Number(settings?.publicRateDOP || 58.5).toFixed(2)}</strong></div><div className="flex items-center justify-between rounded-2xl bg-red-50 p-4"><div><div className="text-xs font-bold text-red-700">USD → HTG</div><div className="text-[11px] text-slate-500">Haití</div></div><strong className="text-xl text-red-950">{Number(settings?.publicRateHTG || 132.2).toFixed(2)}</strong></div></CardContent></Card>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex gap-3"><ShieldCheck className="h-6 w-6 shrink-0 text-emerald-700" /><div><div className="font-black text-emerald-950">Un solo saldo, en todos tus dispositivos</div><p className="mt-1 text-xs leading-5 text-emerald-800">Cada operación se registra en el servidor y se refleja tanto en la web como en Android.</p></div></div></div>
          <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Última sincronización: {data.refreshedAt ? new Date(data.refreshedAt).toLocaleTimeString("es-DO") : "conectando…"}</div>
        </div>
      </section>
    </main>
  )
}
