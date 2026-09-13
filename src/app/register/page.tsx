"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/login?tab=register&role=customer")
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F5FB] space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm font-semibold text-muted-foreground">Abriendo registro de billetera para clientes...</p>
    </div>
  )
}
