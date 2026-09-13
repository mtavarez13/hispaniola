"use client"

import { useState, useEffect, Suspense } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Mail, Lock, User, Shield, Loader2, Phone, CreditCard, Sparkles } from "lucide-react"
import Link from "next/link"
import type { UserRole } from "@/lib/types"
import { AppLogo } from "@/components/brand/app-logo"

function LoginFormInner() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const defaultTab = searchParams.get("tab") === "register" ? "register" : "login"
  const defaultRole = (searchParams.get("role") as UserRole) || "customer"

  const [activeTab, setActiveTab] = useState<string>(defaultTab)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)

  // Login form state
  const [loginEmailVal, setLoginEmailVal] = useState("")
  const [loginPassVal, setLoginPassVal] = useState("")

  // Register form state
  const [regNameVal, setRegNameVal] = useState("")
  const [regEmailVal, setRegEmailVal] = useState("")
  const [regPassVal, setRegPassVal] = useState("")
  const [regPhoneVal, setRegPhoneVal] = useState("")
  const [regIdVal, setRegIdVal] = useState("")
  const [regRoleVal, setRegRoleVal] = useState<UserRole>(defaultRole)
  const [regCountryVal, setRegCountryVal] = useState("DO")

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true)
    try {
      await loginWithGoogle()
      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión exitosamente con Google.",
      })
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Google sign in error in LoginPage:", err)
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: err?.message || "No se pudo conectar con Google. Por favor, intenta de nuevo.",
      })
    } finally {
      setLoadingGoogle(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmailVal || !loginPassVal) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Por favor, ingresa tu correo y contraseña.",
      })
      return
    }

    setLoadingEmail(true)
    try {
      await loginWithEmail(loginEmailVal, loginPassVal)
      toast({
        title: "¡Bienvenido!",
        description: "Sesión iniciada correctamente.",
      })
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Email login error in LoginPage:", err)
      let msg = "Credenciales incorrectas o usuario no encontrado."
      if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password") {
        msg = "Correo o contraseña incorrectos."
      } else if (err?.code === "auth/user-not-found") {
        msg = "No existe una cuenta registrada con este correo."
      }
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: msg,
      })
    } finally {
      setLoadingEmail(false)
    }
  }

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regNameVal || !regEmailVal || !regPassVal) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Por favor, completa todos los campos principales del registro.",
      })
      return
    }

    if (regPassVal.length < 6) {
      toast({
        variant: "destructive",
        title: "Contraseña muy corta",
        description: "La contraseña debe tener al menos 6 caracteres.",
      })
      return
    }

    setLoadingEmail(true)
    try {
      await registerWithEmail(
        regNameVal, 
        regEmailVal, 
        regPassVal, 
        regRoleVal, 
        regCountryVal,
        regPhoneVal,
        regIdVal
      )
      toast({
        title: "¡Cuenta creada exitosamente!",
        description: regRoleVal === "customer" 
          ? "Tu Billetera y Bolsillo de Ahorro están listos para usar." 
          : "Tu cuenta de agente ha sido creada correctamente.",
      })
      router.push("/dashboard/wallet")
    } catch (err: any) {
      console.error("Email register error in LoginPage:", err)
      let msg = "No se pudo crear la cuenta."
      if (err?.code === "auth/email-already-in-use") {
        msg = "Este correo electrónico ya está registrado. Intenta iniciar sesión."
      } else if (err?.code === "auth/weak-password") {
        msg = "La contraseña es muy débil."
      }
      toast({
        variant: "destructive",
        title: "Error al registrarse",
        description: msg,
      })
    } finally {
      setLoadingEmail(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F5FB] flex flex-col justify-center items-center p-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
              <ArrowLeft className="w-4 h-4" /> Volver al Inicio
            </Button>
          </Link>
          <AppLogo size="sm" />
        </div>

        <Card className="border-none shadow-2xl bg-white overflow-hidden">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-black text-primary">Acceso a Hispaniola Pay</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Plataforma binacional de remesas, billetera con ahorro y red de sub-agentes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Google Login Button */}
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleGoogleLogin} 
              disabled={loadingGoogle || loadingEmail}
              className="w-full h-12 border-2 hover:bg-secondary/50 font-bold gap-3 text-foreground"
            >
              {loadingGoogle ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              {loadingGoogle ? "Conectando con Google..." : "Continuar con Google"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground font-semibold">
                  O con tu correo electrónico
                </span>
              </div>
            </div>

            {/* Email / Password Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-xl">
                <TabsTrigger value="login" className="font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary">
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger value="register" className="font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary">
                  Crear Cuenta Cliente
                </TabsTrigger>
              </TabsList>

              {/* LOGIN TAB */}
              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="loginEmail">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="loginEmail"
                        type="email"
                        placeholder="tu@correo.com"
                        className="pl-10"
                        value={loginEmailVal}
                        onChange={(e) => setLoginEmailVal(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loginPass">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="loginPass"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginPassVal}
                        onChange={(e) => setLoginPassVal(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loadingEmail || loadingGoogle}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20"
                  >
                    {loadingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar Sesión"}
                  </Button>
                </form>
              </TabsContent>

              {/* REGISTER TAB */}
              <TabsContent value="register" className="mt-4">
                <form onSubmit={handleEmailRegister} className="space-y-4">
                  {/* Customer Benefits Callout */}
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-950 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Beneficios para Clientes Registrados:</span>
                    </div>
                    <ul className="text-[11px] text-amber-900 space-y-1 pl-5 list-disc">
                      <li><strong>Billetera Digital</strong> con saldo disponible para enviar directamente a <strong>MonCash y Natcash</strong> en Haití.</li>
                      <li><strong>Bolsillo de Ahorro protegido</strong> para reservar tus fondos y transferir cuando quieras.</li>
                      <li><strong>Código Único de Cliente</strong> para depositar efectivo en cualquiera de nuestros <strong>Sub-Agentes</strong> o reportar transferencias bancarias RD.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regName">Nombre Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="regName"
                        placeholder="Nombre y Apellidos"
                        className="pl-10"
                        value={regNameVal}
                        onChange={(e) => setRegNameVal(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regEmail">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="regEmail"
                        type="email"
                        placeholder="tu@correo.com"
                        className="pl-10"
                        value={regEmailVal}
                        onChange={(e) => setRegEmailVal(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="regPhone">Teléfono / WhatsApp</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="regPhone"
                          placeholder="+1 (809) 000-0000"
                          className="pl-10 text-xs"
                          value={regPhoneVal}
                          onChange={(e) => setRegPhoneVal(e.target.value)}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">Para confirmaciones y notificaciones de transferencias</span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="regId">Cédula o Pasaporte (Opcional)</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="regId"
                          placeholder="Documento de Identidad"
                          className="pl-10 text-xs"
                          value={regIdVal}
                          onChange={(e) => setRegIdVal(e.target.value)}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">Para verificar depósitos en sub-agente</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regPass">Contraseña (Mínimo 6 caracteres)</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="regPass"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={regPassVal}
                        onChange={(e) => setRegPassVal(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="regRole">Tipo de Cuenta</Label>
                      <Select value={regRoleVal} onValueChange={(v: UserRole) => setRegRoleVal(v)}>
                        <SelectTrigger id="regRole">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">👤 Cliente (Billetera & Ahorro)</SelectItem>
                          <SelectItem value="agent">🏢 Sub-Agente (Punto de Atención)</SelectItem>
                          <SelectItem value="admin">🛡️ Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="regCountry">País Base</Label>
                      <Select value={regCountryVal} onValueChange={(v) => setRegCountryVal(v)}>
                        <SelectTrigger id="regCountry">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DO">Rep. Dominicana (RD$)</SelectItem>
                          <SelectItem value="HT">Haití (HTG)</SelectItem>
                          <SelectItem value="USA">Estados Unidos (USD)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loadingEmail || loadingGoogle}
                    className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20"
                  >
                    {loadingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : "Crear Billetera y Registrarme"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-secondary/30 p-4 text-center justify-center">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-accent" /> Tus fondos y depósitos están seguros con Hispaniola Pay.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F2F5FB]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <LoginFormInner />
    </Suspense>
  )
}

