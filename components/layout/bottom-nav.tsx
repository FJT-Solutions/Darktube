"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAppShell } from "@/components/layout/app-shell"
import {
  LayoutDashboard,
  Search,
  Sparkles,
  Film,
  Menu,
} from "lucide-react"

export function BottomNav() {
  const pathname = usePathname()
  const { toggleSidebar, sidebarOpen } = useAppShell()

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/minerar", label: "Minerar", icon: Search },
    { href: "/dark-clips", label: "Dark Clips", icon: Sparkles },
    { href: "/flow", label: "Flow", icon: Film },
  ]

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
        "flex h-16 items-stretch border-t border-border/80 bg-sidebar/95 backdrop-blur-xl shadow-lg",
        "pb-safe"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Navegação inferior mobile"
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
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all select-none touch-manipulation",
              isActive
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground active:scale-95"
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-xl transition-all",
                isActive ? "bg-primary/15 text-primary scale-110" : ""
              )}
            >
              <item.icon className="h-5 w-5" />
            </div>
            <span className="tracking-tight leading-none">{item.label}</span>
          </Link>
        )
      })}

      {/* Menu / Mais toggle button */}
      <button
        type="button"
        onClick={toggleSidebar}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all select-none touch-manipulation",
          sidebarOpen
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground active:scale-95"
        )}
        aria-label="Abrir menu de navegação"
      >
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-xl transition-all",
            sidebarOpen ? "bg-primary/15 text-primary scale-110" : ""
          )}
        >
          <Menu className="h-5 w-5" />
        </div>
        <span className="tracking-tight leading-none">Menu</span>
      </button>
    </nav>
  )
}
