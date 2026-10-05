"use client"

import { FormEvent, useEffect, useState } from "react"
import { Save, UserRound, Loader2, ShieldCheck } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  const { userProfile, updateProfileDetails } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [country, setCountry] = useState("DO")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!userProfile) return
    setName(userProfile.name || "")
    setPhone(userProfile.phone || "")
    setIdNumber(userProfile.idNumber || "")
    setCountry(userProfile.country || "DO")
  }, [userProfile])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await updateProfileDetails({ name, phone, idNumber, country })
      toast({ title: "Perfil guardado", description: "Tus datos se actualizaron correctamente." })
    } catch (error) {
      toast({ variant: "destructive", title: "No se pudo guardar", description: error instanceof Error ? error.message : "Error inesperado" })
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={save} className="space-y-6 max-w-4xl mx-auto pb-24">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 rounded-xl border bg-background/95 p-4 shadow-sm backdrop-blur">
        <div><h1 className="text-2xl font-black text-primary flex items-center gap-2"><UserRound className="w-6 h-6" /> Mi perfil</h1><p className="text-xs text-muted-foreground">Información personal y de contacto</p></div>
        <Button type="submit" disabled={saving || name.trim().length < 2} className="gap-2 bg-primary text-white font-bold min-w-36">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? "Guardando…" : "Guardar perfil"}
        </Button>
      </div>
      <Card className="bg-white shadow-md">
        <CardHeader><CardTitle>Datos personales</CardTitle><CardDescription>Puedes actualizar estos datos cuando cambien. El correo y el código de cliente están protegidos.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2"><Label htmlFor="profile-name">Nombre completo</Label><Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Correo electrónico</Label><Input value={userProfile?.email || ""} disabled /></div>
          <div className="space-y-2"><Label htmlFor="profile-phone">Teléfono / WhatsApp</Label><Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 809 000 0000" /></div>
          <div className="space-y-2"><Label htmlFor="profile-id">Cédula o pasaporte</Label><Input id="profile-id" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="profile-country">País</Label><select id="profile-country" value={country} onChange={(e) => setCountry(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="DO">República Dominicana</option><option value="HT">Haití</option><option value="US">Estados Unidos</option></select></div>
          <div className="space-y-2"><Label>Código de cliente</Label><Input value={userProfile?.clientCode || "Sin asignar"} disabled className="font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-emerald-200 bg-emerald-50/60"><CardContent className="flex gap-3 p-5 text-sm text-emerald-900"><ShieldCheck className="w-5 h-5 shrink-0" /><span>Tu rol, correo, saldos y código de cliente no pueden modificarse desde este formulario.</span></CardContent></Card>
      <Button type="submit" disabled={saving || name.trim().length < 2} className="w-full md:hidden gap-2 bg-primary text-white font-bold"><Save className="w-4 h-4" /> Guardar perfil</Button>
    </form>
  )
}
