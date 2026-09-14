"use client"

import {
  History,
  LayoutDashboard,
  Send,
  Settings,
  ShieldCheck,
  Wallet,
  Calculator,
  Users,
  Smartphone,
  Receipt,
  BarChart3,
  MailCheck,
  PiggyBank,
  Terminal,
} from "lucide-react"

import Link from "next/link"
import { useSidebar } from "@/components/ui/sidebar"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useI18n } from "@/lib/i18n/context"

export function NavMain({ role }: { role: string }) {
  const { t } = useI18n();
  const { setOpenMobile, isMobile } = useSidebar();
  const isAdmin = role === 'admin';

  const menuItems = [
    {
      title: t('sidebar_dashboard'),
      icon: LayoutDashboard,
      url: "/dashboard",
      show: true,
    },
    {
      title: "Mi Billetera & Ahorro",
      icon: PiggyBank,
      url: "/dashboard/wallet",
      show: true,
    },
    {
      title: t('sidebar_haiti_remittances'),
      icon: Smartphone,
      url: "/dashboard/haiti-remittances",
      show: true,
    },
    {
      title: t('sidebar_send'),
      icon: Send,
      url: "/dashboard/send",
      show: true,
    },
    {
      title: t('sidebar_history'),
      icon: History,
      url: "/dashboard/history",
      show: true,
    },
    {
      title: t('sidebar_payouts'),
      icon: Wallet,
      url: "/dashboard/payouts",
      show: role === 'agent',
    },
    {
      title: t('sidebar_qik_invoices'),
      icon: Receipt,
      url: "/dashboard/facturas-qik",
      show: isAdmin,
    },
    {
      title: "Depósitos Gmail RD",
      icon: MailCheck,
      url: "/dashboard/gmail-deposits",
      show: isAdmin,
    },
    {
      title: t('sidebar_accounting'),
      icon: Calculator,
      url: "/dashboard/accounting",
      show: isAdmin,
    },
    {
      title: t('sidebar_sub_agents'),
      icon: Users,
      url: "/dashboard/sub-agents",
      show: isAdmin,
    },
    {
      title: t('sidebar_benefits_report'),
      icon: BarChart3,
      url: "/dashboard/reports",
      show: isAdmin,
    },
    {
      title: t('sidebar_admin'),
      icon: ShieldCheck,
      url: "/dashboard/admin",
      show: isAdmin,
    },
    {
      title: "API Terceros (B2B)",
      icon: Terminal,
      url: "/dashboard/partners-api",
      show: isAdmin,
    },
    {
      title: t('sidebar_settings'),
      icon: Settings,
      url: "/dashboard/settings",
      show: isAdmin,
    },
  ]

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('sidebar_main')}</SidebarGroupLabel>
      <SidebarMenu>
        {menuItems.filter(item => item.show).map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title}>
              <Link
                href={item.url}
                onClick={() => {
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}
              >
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}