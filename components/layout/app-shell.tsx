"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { Sidebar } from "./sidebar"
import { BottomNav } from "./bottom-nav"
import { cn } from "@/lib/utils"
import { getTrackedChannelsAction } from "@/app/actions"
import { usePathname } from "next/navigation"
import { ProductionNotifier } from "@/components/production-notifier"

interface AppShellContextType {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  trackedCount: number
  refreshTrackedCount: () => Promise<void>
}

const AppShellContext = createContext<AppShellContextType>({
  sidebarOpen: false,
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  trackedCount: 0,
  refreshTrackedCount: async () => {},
})

export function useAppShell() {
  return useContext(AppShellContext)
}

const AUTH_PAGES = ["/login", "/invite", "/pending", "/", "/setup-password"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [trackedCount, setTrackedCount] = useState(0)
  const pathname = usePathname()

  const isAuthPage =
    AUTH_PAGES.includes(pathname) || pathname.startsWith("/setup-password")

  const refreshTrackedCount = async () => {
    try {
      const channels = await getTrackedChannelsAction()
      setTrackedCount(channels?.length || 0)
    } catch (error) {
      console.error("Error refreshing tracked count:", error)
    }
  }

  useEffect(() => {
    if (!isAuthPage) refreshTrackedCount()
  }, [pathname])

  const toggleSidebar = () => {
    // Check if we are on desktop (lg: 1024px)
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarCollapsed((prev) => !prev)
    } else {
      setSidebarOpen((prev) => !prev)
    }
  }

  return (
    <AppShellContext.Provider
      value={{ sidebarOpen, sidebarCollapsed, toggleSidebar, trackedCount, refreshTrackedCount }}
    >
      <div
        className={cn(
          "flex bg-background w-full max-w-[100vw] overflow-x-hidden",
          isAuthPage ? "min-h-screen min-h-[100dvh]" : "h-screen h-[100dvh] overflow-hidden"
        )}
      >
        {/* Sidebar — slide drawer on mobile, static on desktop */}
        {!isAuthPage && (
          <Sidebar 
            open={sidebarOpen} 
            collapsed={sidebarCollapsed}
            onClose={() => setSidebarOpen(false)} 
          />
        )}

        {/* Main content */}
        <main
          className={cn(
            "flex flex-1 flex-col min-w-0 h-full w-full max-w-full overflow-x-hidden",
            isAuthPage ? "w-full" : "overflow-y-auto pb-24 lg:pb-0 scroll-touch"
          )}
        >
          {!isAuthPage && <ProductionNotifier />}
          {children}
        </main>

        {/* Mobile bottom navigation */}
        {!isAuthPage && <BottomNav />}
      </div>
    </AppShellContext.Provider>
  )
}
