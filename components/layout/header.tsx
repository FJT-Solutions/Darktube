"use client"

import { Menu, LogOut } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import Link from "next/link"
import { ThemeToggle } from "./theme-toggle"

interface HeaderProps {
  title: string
  description?: string
  onMenuToggle: () => void
  actions?: React.ReactNode
}

export function Header({ title, description, onMenuToggle, actions }: HeaderProps) {
  const { session, signOut } = useAuth()

  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "Conta"

  const avatar =
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture

  const initials = displayName.charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md lg:h-16 lg:px-6">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-sm font-semibold text-foreground lg:text-lg">{title}</h1>
          {description && (
            <p className="hidden text-xs text-muted-foreground lg:block">{description}</p>
          )}
        </div>
      </div>

      {/* Right: custom actions + profile */}
      <div className="flex items-center gap-2">
        {actions}
        
        <ThemeToggle />

        {session && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 p-1">
            <Link 
              href="/settings"
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary/50 transition-colors"
              title="Configurações do Perfil"
            >
              <span className="hidden text-xs font-semibold text-muted-foreground sm:block max-w-[120px] truncate">
                {displayName}
              </span>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden border border-primary/20 bg-muted">
                {avatar ? (
                  <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[11px] font-bold text-muted-foreground">{initials}</span>
                )}
              </div>
            </Link>
            <div className="h-4 w-[1px] bg-border/60 mx-1" />
            <button
              onClick={() => signOut()}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive transition-colors mr-1"
              title="Sair da conta"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
