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
  Radio,
  Settings,
  X,
  User as UserIcon,
  UserPlus,
  LogOut,
  LogIn,
  Key,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/minerar", label: "Minerar", icon: Search },
  { href: "/tracker", label: "Tracker", icon: Bookmark },
  { href: "/credentials", label: "Credenciais", icon: Key },
  { href: "/settings", label: "Configurações", icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
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
          "fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-border bg-sidebar",
          "transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Radio className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                DarkTube
              </span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Miner
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-sidebar-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar menu</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Navegacao
          </p>
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
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px]",
                    isActive ? "text-primary" : ""
                  )}
                />
                {item.label}
              </Link>
            )
          })}

          {/* Admin Section */}
          {profile?.role === 'admin' && (
            <div className="mt-8">
              <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Administração
              </p>
              <Link
                href="/admin/invites"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === "/admin/invites"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <UserIcon className={cn("h-[18px] w-[18px]", pathname === "/admin/invites" ? "text-primary" : "")} />
                Convites
              </Link>
              <Link
                href="/admin/users"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === "/admin/users"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <UserPlus className={cn("h-[18px] w-[18px]", pathname === "/admin/users" ? "text-primary" : "")} />
                Gerenciar Membros
              </Link>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border p-4">
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Canais rastreados
            </p>
            <p className="mt-1 text-lg font-bold text-sidebar-foreground">
              {trackedCount}
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
