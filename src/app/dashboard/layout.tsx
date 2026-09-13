"use client"

import { useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { UserProfile } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Bell, LogOut, User, EyeOff, Eye, Maximize2 } from "lucide-react"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function SidebarTransactionController() {
  const pathname = usePathname()
  const { open, setOpen, openMobile, setOpenMobile, isMobile } = useSidebar()

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setOpenMobile(false)

    // Si entra a pantalla de remesas o transacciones, ocultar/colapsar el menú para que no tape los formularios ni la pantalla táctil
    const isTransactionScreen =
      pathname.includes("/haiti-remittances") ||
      pathname.includes("/send") ||
      pathname.includes("/recharge") ||
      pathname.includes("/remittances")

    if (isTransactionScreen) {
      if (isMobile) {
        setOpenMobile(false)
      } else {
        setOpen(false)
      }
    }
  }, [pathname, setOpenMobile, setOpen, isMobile])

  // Escuchar eventos globales de transacción iniciada o en proceso
  useEffect(() => {
    const handleHideMenu = () => {
      setOpenMobile(false)
      setOpen(false)
    }

    window.addEventListener("hide-sidebar-for-transaction", handleHideMenu)
    window.addEventListener("transaction-started", handleHideMenu)
    window.addEventListener("close-mobile-menu", handleHideMenu)

    return () => {
      window.removeEventListener("hide-sidebar-for-transaction", handleHideMenu)
      window.removeEventListener("transaction-started", handleHideMenu)
      window.removeEventListener("close-mobile-menu", handleHideMenu)
    }
  }, [setOpenMobile, setOpen])

  const isTransactionPage =
    pathname.includes("/haiti-remittances") ||
    pathname.includes("/send") ||
    pathname.includes("/recharge") ||
    pathname.includes("/remittances")

  return (
    <div className="flex items-center gap-2">
      <SidebarTrigger className="-ml-1 text-slate-700 hover:text-slate-900" />
      <Separator orientation="vertical" className="h-4 bg-slate-200" />
      {isTransactionPage && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false)
            } else {
              setOpen(!open)
            }
          }}
          className="hidden sm:inline-flex text-xs h-7 gap-1.5 font-medium text-slate-600 border-slate-200 hover:bg-slate-100"
          title="Ocultar o expandir menú para ver toda la transacción"
        >
          {open ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Ocultar Menú</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Mostrar Menú</span>
            </>
          )}
        </Button>
      )}
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userProfile, logout, user } = useAuth()
  const router = useRouter()

  const currentProfile: UserProfile = userProfile || {
    uid: user?.uid || "guest",
    name: user?.displayName || (user?.email ? user.email.split('@')[0] : "Usuario"),
    email: user?.email || "",
    role: "customer",
    country: "DO",
    walletBalance: 0.00
  }

  const getInitials = (name: string) => {
    if (!name) return "HP"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <SidebarProvider>
      <AppSidebar user={currentProfile} />
      <SidebarInset className="bg-[#F2F5FB]">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 sticky top-0 bg-white z-10 border-b border-slate-200 shadow-xs">
          <SidebarTransactionController />
          
          <div className="flex items-center gap-3">
             <LanguageSwitcher />
             <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
               <Bell className="w-5 h-5" />
               <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-white"></span>
             </Button>
             
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs p-0">
                    {getInitials(currentProfile.name)}
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-56">
                 <DropdownMenuLabel className="font-normal">
                   <div className="flex flex-col space-y-1">
                     <p className="text-sm font-bold leading-none text-primary">{currentProfile.name}</p>
                     <p className="text-xs leading-none text-muted-foreground">{currentProfile.email}</p>
                   </div>
                 </DropdownMenuLabel>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                   <User className="mr-2 h-4 w-4" />
                   <span>Perfil y Configuración</span>
                 </DropdownMenuItem>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={() => logout().then(() => router.push("/"))} className="text-destructive focus:text-destructive">
                   <LogOut className="mr-2 h-4 w-4" />
                   <span>Cerrar Sesión</span>
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
          </div>
        </header>
        <main className="p-4 md:p-8 space-y-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
