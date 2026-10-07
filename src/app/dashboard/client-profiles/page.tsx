"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Coins, Edit3, Loader2, RefreshCw, Save, Search, UsersRound } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type ProfileRow = { uid: string; name: string; email: string; phone: string; idNumber: string; country: string; clientCode: string; role: "customer" | "agent"; walletBalance: number; savingsBalance: number; primaryCurrency: "USD" | "DOP"; remittanceFeePercent: number; benefitRatePercent: number; benefitAccruedDOP: number }

export default function ClientProfilesPage() {
  const { user, userProfile } = useAuth()
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creditingUid, setCreditingUid] = useState("")

  const load = useCallback(async () => {
    if (!user || userProfile?.role !== "admin") return
    setLoading(true)
    try {
      const response = await fetch("/api/admin/profiles", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "No se pudieron cargar los perfiles")
      setProfiles(data.profiles || [])
    } catch (error) { toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Error inesperado" }) }
    finally { setLoading(false) }
  }, [user, userProfile?.role, toast])

  useEffect(() => { load() }, [load])
  const visible = useMemo(() => profiles.filter((item) => `${item.name} ${item.email} ${item.phone} ${item.clientCode}`.toLowerCase().includes(query.toLowerCase())), [profiles, query])

  const save = async () => {
    if (!user || !editing) return
    setSaving(true)
    try {
      const response = await fetch("/api/admin/profiles", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify(editing) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "No se pudo guardar")
      toast({ title: "Perfil actualizado", description: `Se guardaron los cambios de ${editing.name}.` })
      setEditing(null); await load()
    } catch (error) { toast({ variant: "destructive", title: "No se pudo guardar", description: error instanceof Error ? error.message : "Error inesperado" }) }
    finally { setSaving(false) }
  }

  const creditBenefits = async (profile: ProfileRow) => {
    if (!user || profile.benefitAccruedDOP <= 0) return
    if (!window.confirm(`¿Asignar RD$${profile.benefitAccruedDOP.toFixed(2)} de beneficios a la billetera de ${profile.name}?`)) return
    setCreditingUid(profile.uid)
    try {
      const response = await fetch("/api/admin/benefits-credit", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ uid: profile.uid }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "No se pudo acreditar el beneficio")
      toast({ title: "Beneficio acreditado", description: `Se asignaron ${data.primaryCurrency === "DOP" ? "RD$" : "US$"}${Number(data.creditedAmount).toFixed(2)} a la billetera.` })
      await load()
    } catch (error) { toast({ variant: "destructive", title: "No se pudo acreditar", description: error instanceof Error ? error.message : "Error inesperado" }) }
    finally { setCreditingUid("") }
  }

  if (userProfile?.role !== "admin") return <Card><CardHeader><CardTitle>Acceso restringido</CardTitle></CardHeader></Card>
  return <div className="space-y-6 max-w-6xl mx-auto">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-black text-primary flex gap-2"><UsersRound /> Perfiles de clientes</h1><p className="text-sm text-muted-foreground">El administrador puede editar clientes y usuarios agentes. Los subagentes se editan en su módulo.</p></div><Button variant="outline" onClick={load}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button></div>
    <Card><CardHeader><CardTitle className="text-lg">Directorio</CardTitle><CardDescription>{profiles.length} perfiles registrados</CardDescription></CardHeader><CardContent className="space-y-3">
      <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, correo, teléfono o código" className="pl-9" /></div>
      {visible.map((item) => <div key={item.uid} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border p-4"><div><div className="font-bold">{item.name}</div><div className="text-xs text-muted-foreground">{item.email} · {item.phone || "Sin teléfono"}</div><div className="mt-1 flex flex-wrap gap-2"><Badge variant="outline">{item.role === "agent" ? "Subagente" : "Cliente"}</Badge><Badge className="bg-blue-600 font-mono">{item.clientCode || "Sin código"}</Badge><Badge variant="outline">Billetera {item.primaryCurrency}</Badge><Badge variant="outline">Tarifa {item.remittanceFeePercent.toFixed(2)}%</Badge></div></div><div className="flex flex-col md:flex-row md:items-center gap-3"><div className="text-right text-xs"><div>Disponible: <strong>{item.primaryCurrency === "DOP" ? "RD$" : "US$"}{item.walletBalance.toFixed(2)}</strong></div><div>Beneficio {item.benefitRatePercent.toFixed(2)}%: <strong className="text-emerald-700">RD${item.benefitAccruedDOP.toFixed(2)}</strong></div></div><Button size="sm" variant="outline" disabled={item.benefitAccruedDOP <= 0 || creditingUid === item.uid} onClick={() => creditBenefits(item)} className="gap-2"><Coins className="w-4 h-4" /> {creditingUid === item.uid ? "Acreditando…" : "Asignar beneficio"}</Button><Button size="sm" onClick={() => setEditing({ ...item })} className="gap-2"><Edit3 className="w-4 h-4" /> Editar perfil</Button></div></div>)}
      {!loading && visible.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No se encontraron perfiles.</div>}
    </CardContent></Card>
    <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Editar perfil de cliente</DialogTitle><DialogDescription>Los saldos se administran desde el módulo de billeteras.</DialogDescription></DialogHeader>{editing && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <div className="space-y-1"><Label>Nombre</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
      <div className="space-y-1"><Label>Correo</Label><Input value={editing.email} disabled /></div>
      <div className="space-y-1"><Label>Teléfono</Label><Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
      <div className="space-y-1"><Label>Cédula/Pasaporte</Label><Input value={editing.idNumber} onChange={(e) => setEditing({ ...editing, idNumber: e.target.value })} /></div>
      <div className="space-y-1"><Label>Código</Label><Input value={editing.clientCode} onChange={(e) => setEditing({ ...editing, clientCode: e.target.value.toUpperCase() })} /></div>
      <div className="space-y-1"><Label>País</Label><select value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value })} className="flex h-10 w-full rounded-md border px-3 text-sm"><option value="DO">República Dominicana</option><option value="HT">Haití</option><option value="US">Estados Unidos</option></select></div>
      <div className="space-y-1"><Label>Moneda principal</Label><select value={editing.primaryCurrency} onChange={(e) => setEditing({ ...editing, primaryCurrency: e.target.value as "USD" | "DOP" })} className="flex h-10 w-full rounded-md border px-3 text-sm"><option value="DOP">DOP · Peso dominicano</option><option value="USD">USD · Dólar estadounidense</option></select></div>
      <div className="space-y-1"><Label>Tarifa de remesa (%)</Label><Input type="number" min="0" max="100" step="0.01" value={editing.remittanceFeePercent} onChange={(e) => setEditing({ ...editing, remittanceFeePercent: Number(e.target.value) })} /><p className="text-[11px] text-muted-foreground">Se descuenta del monto enviado antes de convertirlo a gourdes.</p></div>
      <div className="space-y-1"><Label>Tasa de beneficio (%)</Label><Input type="number" min="0" max="100" step="0.01" value={editing.benefitRatePercent} onChange={(e) => setEditing({ ...editing, benefitRatePercent: Number(e.target.value) })} /><p className="text-[11px] text-muted-foreground">Se acumula en pesos dominicanos por cada remesa completada.</p></div>
      <div className="space-y-1"><Label>Beneficio acumulado</Label><Input value={`RD$${editing.benefitAccruedDOP.toFixed(2)}`} disabled /></div>
      <div className="space-y-1 sm:col-span-2"><Label>Tipo de usuario</Label><select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as "customer" | "agent" })} className="flex h-10 w-full rounded-md border px-3 text-sm"><option value="customer">Cliente</option><option value="agent">Agente</option></select></div>
    </div>}<DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={save} disabled={saving || !editing?.name.trim()} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
