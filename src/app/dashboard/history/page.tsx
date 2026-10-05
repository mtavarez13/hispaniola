"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Search } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Movement = { id: string; title: string; description: string; direction: "in" | "out" | "transfer"; amountUSD: number; status: string; createdAt?: string; referenceId?: string; receiptCode?: string }

export default function HistoryPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Movement[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const response = await fetch("/api/mobile/account", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" })
      const data = await response.json()
      if (response.ok && data.success) setItems(data.movements || [])
    } finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const timer = window.setInterval(load, 15000)
    return () => window.clearInterval(timer)
  }, [load])

  const visible = useMemo(() => {
    const value = query.toLowerCase().trim()
    return value ? items.filter((item) => `${item.id} ${item.title} ${item.description} ${item.referenceId || ""}`.toLowerCase().includes(value)) : items
  }, [items, query])

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-black tracking-tight text-slate-950">Tus movimientos</h1><p className="mt-1 text-sm text-slate-500">Un historial único para operaciones realizadas desde la web y Android.</p></div>
        <Button variant="outline" onClick={load} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar</Button>
      </div>
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/60"><CardTitle className="text-lg font-black">Historial de billetera</CardTitle><div className="relative mt-3 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar referencia, destinatario o concepto" className="bg-white pl-9" /></div></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Movimiento</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader><TableBody>
          {!loading && visible.length === 0 ? <TableRow><TableCell colSpan={4} className="h-32 text-center text-sm text-slate-500">No hay movimientos registrados.</TableCell></TableRow> : visible.map((item) => <TableRow key={item.id}><TableCell><div className="flex items-center gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-full ${item.direction === "in" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{item.direction === "in" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</div><div><div className="text-sm font-bold">{item.title}</div><div className="max-w-[420px] truncate text-xs text-slate-500">{item.description}</div><div className="font-mono text-[10px] text-slate-400">{item.receiptCode || item.referenceId || item.id}</div></div></div></TableCell><TableCell className="whitespace-nowrap text-xs text-slate-600">{item.createdAt ? new Date(item.createdAt).toLocaleString("es-DO") : "—"}</TableCell><TableCell><Badge className={item.status === "completed" ? "bg-emerald-100 text-emerald-800" : item.status === "failed" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}>{item.status === "completed" ? "Completado" : item.status === "failed" ? "Fallido" : "Pendiente"}</Badge></TableCell><TableCell className={`text-right font-black ${item.direction === "in" ? "text-emerald-700" : "text-slate-900"}`}>{item.direction === "in" ? "+" : "−"} US${Number(item.amountUSD).toFixed(2)}</TableCell></TableRow>)}
        </TableBody></Table></div></CardContent>
      </Card>
    </div>
  )
}
