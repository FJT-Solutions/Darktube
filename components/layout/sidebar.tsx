"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { useAppShell } from "@/components/layout/app-shell"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Search,
  Bookmark,
  Settings,
  X,
  User as UserIcon,
  UserPlus,
  LogOut,
  LogIn,
  Key,
  Youtube,
  LayoutTemplate,
  Clapperboard,
  Terminal,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/minerar", label: "Minerar", icon: Search },
  { href: "/tracker", label: "Tracker", icon: Bookmark },
  { href: "/credentials", label: "Credenciais", icon: Key },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/criacao", label: "Criação", icon: Clapperboard },
  { href: "/settings", label: "Configurações", icon: Settings },
]

interface SidebarProps {
  open: boolean
  collapsed: boolean
  onClose: () => void
}

export function Sidebar({ open, collapsed, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { session, profile, signOut } = useAuth()
  const { trackedCount } = useAppShell()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out",
          "lg:static lg:z-auto lg:translate-x-0",
          collapsed ? "lg:w-20" : "lg:w-64",
          "w-64", // mobile width
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-border px-6 transition-all duration-300",
          collapsed ? "justify-center px-0" : "justify-between"
        )}>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-600/20">
              <Youtube className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tighter text-sidebar-foreground leading-none uppercase">
                  DARK<span className="text-red-600">TUBE</span>
                </span>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:text-sidebar-foreground lg:hidden"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Fechar menu</span>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {!collapsed && (
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Navegacao
            </p>
          )}
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (item.href === "/minerar") {
                    sessionStorage.removeItem("minerar_search_state")
                  }
                  onClose()
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    isActive ? "text-primary" : ""
                  )}
                />
                {!collapsed && item.label}
              </Link>
            )
          })}

          {/* Admin Section */}
          {profile?.role === 'admin' && (
            <div className="mt-8">
              {!collapsed && (
                <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Administração
                </p>
              )}
              <Link
                href="/admin/prompts"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === "/admin/prompts"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <Terminal className={cn("h-[18px] w-[18px] shrink-0", pathname === "/admin/prompts" ? "text-primary" : "")} />
                {!collapsed && "Prompts"}
              </Link>
              <Link
                href="/admin/invites"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === "/admin/invites"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <UserIcon className={cn("h-[18px] w-[18px] shrink-0", pathname === "/admin/invites" ? "text-primary" : "")} />
                {!collapsed && "Convites"}
              </Link>
              <Link
                href="/admin/users"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === "/admin/users"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <UserPlus className={cn("h-[18px] w-[18px] shrink-0", pathname === "/admin/users" ? "text-primary" : "")} />
                {!collapsed && "Gerenciar Membros"}
              </Link>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border p-4">
          <div className={cn(
            "rounded-lg bg-secondary/50 p-3 transition-all",
            collapsed ? "flex flex-col items-center justify-center p-2" : "p-3"
          )}>
            {!collapsed && (
              <p className="text-xs font-medium text-muted-foreground">
                Canais rastreados
              </p>
            )}
            <p className={cn(
              "font-bold text-sidebar-foreground",
              collapsed ? "text-base" : "mt-1 text-lg"
            )}>
              {trackedCount}
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
