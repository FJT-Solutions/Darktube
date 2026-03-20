"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Search,
  Bookmark,
  Settings,
  UserPlus,
  Radio,
} from "lucide-react"

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/minerar", label: "Minerar", icon: Search },
  { href: "/tracker", label: "Tracker", icon: Bookmark },
  { href: "/settings", label: "Config", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const { profile } = useAuth()

  const isAdmin = profile?.role === "admin"

  const navItems = isAdmin
    ? [
        ...mainNav,
        { href: "/admin/invites", label: "Admin", icon: UserPlus },
      ]
    : mainNav

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
        "flex items-stretch border-t border-border bg-sidebar/95 backdrop-blur-xl",
        "pb-safe"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-3 text-[10px] font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground active:text-foreground"
            )}
          >
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-lg transition-all",
                isActive ? "text-primary" : ""
              )}
            >
              <item.icon className="h-5 w-5" />
            </div>
            <span className="tracking-tight">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
