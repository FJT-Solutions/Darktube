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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-2.5 backdrop-blur-md sm:px-4 lg:h-16 lg:px-6 w-full max-w-full">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 mr-1.5 sm:mr-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-1.5 sm:p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-xs sm:text-base lg:text-lg font-semibold text-foreground truncate max-w-[130px] xs:max-w-[190px] sm:max-w-md lg:max-w-none" title={title}>
            {title}
          </h1>
          {description && (
            <p className="hidden text-xs text-muted-foreground lg:block truncate">{description}</p>
          )}
        </div>
      </div>

      {/* Right: custom actions + profile */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {actions && <div className="flex items-center gap-1 sm:gap-2 shrink-0">{actions}</div>}
        
        <ThemeToggle />

        {session && (
          <div className="flex items-center gap-1 sm:gap-2 rounded-xl border border-border/60 bg-secondary/30 p-0.5 sm:p-1 shrink-0">
            <Link 
              href="/settings"
              className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2 py-1 rounded-lg hover:bg-secondary/50 transition-colors"
              title="Configurações do Perfil"
            >
              <span className="hidden text-xs font-semibold text-muted-foreground md:block max-w-[100px] truncate">
                {displayName}
              </span>
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full overflow-hidden border border-primary/20 bg-muted">
                {avatar ? (
                  <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground">{initials}</span>
                )}
              </div>
            </Link>
            <div className="h-3.5 w-[1px] bg-border/60 mx-0.5" />
            <button
              onClick={() => signOut()}
              className="rounded-lg p-1 sm:p-1.5 text-muted-foreground hover:text-destructive transition-colors mr-0.5"
              title="Sair da conta"
              aria-label="Sair"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
