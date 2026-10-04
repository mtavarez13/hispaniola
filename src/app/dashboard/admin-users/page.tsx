"use client"

import { useCallback, useEffect, useState } from "react"
import { ShieldCheck, UserPlus, RefreshCw } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type AdminRow = { uid: string; name: string; email: string; adminLevel: string; canAccessSettings: boolean }

export default function AdminUsersPage() {
  const { user, userProfile } = useAuth()
  const { toast } = useToast()
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const canManage = userProfile?.role === "admin" && userProfile?.canAccessSettings !== false

  const authHeaders = useCallback(async () => ({ Authorization: `Bearer ${await user?.getIdToken()}` }), [user])
  const loadAdmins = useCallback(async () => {
    if (!user || !canManage) return
    setLoading(true)
    const response = await fetch("/api/admin/users", { headers: await authHeaders(), cache: "no-store" })
    const data = await response.json()
    if (data.success) setAdmins(data.users || [])
    setLoading(false)
  }, [user, canManage, authHeaders])

  useEffect(() => { loadAdmins() }, [loadAdmins])

  const createAdmin = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "No se pudo crear el administrador.")
      setName(""); setEmail(""); setPassword("")
      toast({ title: "Administrador creado", description: "Podrá operar el sistema, pero no tendrá acceso a Configuración." })
      await loadAdmins()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al crear", description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (!canManage) return <Card><CardHeader><CardTitle>Acceso restringido</CardTitle><CardDescription>Solo el administrador principal puede gestionar otros administradores.</CardDescription></CardHeader></Card>

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div><h1 className="text-2xl font-black text-primary flex items-center gap-2"><ShieldCheck /> Administradores</h1><p className="text-sm text-muted-foreground">Crea administradores operativos sin acceso al módulo de Configuración.</p></div>
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><UserPlus className="w-5 h-5" /> Nuevo administrador secundario</CardTitle><CardDescription>La contraseña debe contener al menos 8 caracteres.</CardDescription></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>Correo</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1"><Label>Contraseña temporal</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="md:col-span-3"><Button onClick={createAdmin} disabled={saving || !name || !email || password.length < 8} className="gap-2"><UserPlus className="w-4 h-4" /> {saving ? "Creando..." : "Crear administrador"}</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between"><div><CardTitle className="text-lg">Administradores registrados</CardTitle><CardDescription>El administrador secundario no puede abrir Configuración.</CardDescription></div><Button size="sm" variant="ghost" onClick={loadAdmins}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button></CardHeader>
        <CardContent className="space-y-2">{admins.map((admin) => <div key={admin.uid} className="flex items-center justify-between border rounded-lg p-3"><div><div className="font-bold text-sm">{admin.name}</div><div className="text-xs text-muted-foreground">{admin.email}</div></div><Badge className={admin.canAccessSettings ? "bg-blue-600" : "bg-slate-600"}>{admin.canAccessSettings ? "Principal" : "Secundario · Sin configuración"}</Badge></div>)}</CardContent>
      </Card>
    </div>
  )
}
