"use client"

import { useCallback, useEffect, useState } from "react"
import { MessageSquare, RefreshCw, CheckCheck } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type InboxMessage = {
  id: string
  from: string
  contactName?: string
  text: string
  type: string
  receivedAt: string
  read?: boolean
}

export default function WhatsAppInboxPage() {
  const { user, userProfile, loading } = useAuth()
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [error, setError] = useState("")
  const isAdmin = userProfile?.role === "admin"

  const loadMessages = useCallback(async () => {
    if (!user || !isAdmin) return
    setLoadingMessages(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/whatsapp/messages", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "No se pudo cargar la bandeja.")
      setMessages(data.messages || [])
      setError("")
    } catch (err: any) {
      setError(err.message || "Error cargando mensajes.")
    } finally {
      setLoadingMessages(false)
    }
  }, [user, isAdmin])

  useEffect(() => {
    loadMessages()
    const timer = window.setInterval(loadMessages, 15000)
    return () => window.clearInterval(timer)
  }, [loadMessages])

  const markRead = async (message: InboxMessage) => {
    if (!user || message.read) return
    const token = await user.getIdToken()
    await fetch("/api/whatsapp/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: message.id }),
    })
    setMessages((current) => current.map((item) => item.id === message.id ? { ...item, read: true } : item))
  }

  if (!loading && !isAdmin) {
    return <Card><CardHeader><CardTitle>Acceso restringido</CardTitle><CardDescription>La bandeja de WhatsApp es exclusiva para administradores.</CardDescription></CardHeader></Card>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary flex items-center gap-2"><MessageSquare className="text-emerald-600" /> WhatsApp recibido</h1>
          <p className="text-sm text-muted-foreground">Mensajes entrantes recibidos por Meta WhatsApp Cloud API. Solo administradores.</p>
        </div>
        <Button variant="outline" onClick={loadMessages} disabled={loadingMessages} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loadingMessages ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <div className="space-y-3">
        {!loadingMessages && messages.length === 0 && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Aún no se han recibido mensajes por el webhook.</CardContent></Card>
        )}
        {messages.map((message) => (
          <Card key={message.id} className={message.read ? "bg-white" : "border-emerald-300 bg-emerald-50/40"}>
            <CardContent className="p-4 flex gap-4 justify-between items-start">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{message.contactName || message.from}</span>
                  {message.contactName && <span className="text-xs text-muted-foreground font-mono">{message.from}</span>}
                  <Badge variant="outline" className="text-[10px]">{message.type}</Badge>
                  {!message.read && <Badge className="bg-emerald-600 text-white text-[10px]">Nuevo</Badge>}
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                <p className="text-[11px] text-muted-foreground">{message.receivedAt ? new Date(message.receivedAt).toLocaleString("es-DO") : ""}</p>
              </div>
              {!message.read && <Button size="sm" variant="ghost" onClick={() => markRead(message)} title="Marcar como leído"><CheckCheck className="w-4 h-4" /></Button>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
