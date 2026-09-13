"use client"

import * as React from "react"
import Link from "next/link"
import { Sparkles, Command } from "lucide-react"

import { NavMain } from "@/components/dashboard/nav-main"
import { AppLogo } from "@/components/brand/app-logo"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { UserProfile } from "@/lib/types"

export function AppSidebar({ user, className, ...props }: { user: UserProfile } & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" className={cn("bg-white border-r border-slate-200", className)} {...props}>
      <SidebarHeader className="bg-white border-b border-slate-100">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-slate-100">
              <Link href="/" className="flex items-center gap-2">
                <AppLogo size="sm" showText={false} clickable={false} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-slate-900">Hispaniola Pay</span>
                  <span className="truncate text-[11px] text-muted-foreground">Terminal Operativa</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <NavMain role={user.role} />
      </SidebarContent>
      <SidebarFooter className="bg-white border-t border-slate-100">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-slate-100">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                <Sparkles className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-slate-900">{user.name}</span>
                <span className="truncate text-xs text-slate-500 capitalize">{user.role} • {user.country}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
