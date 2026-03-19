"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { Sidebar } from "./sidebar"
import { cn } from "@/lib/utils"
import { getTrackedChannelsAction } from "@/app/actions"

interface AppShellContextType {
  sidebarOpen: boolean
  toggleSidebar: () => void
  trackedCount: number
  refreshTrackedCount: () => Promise<void>
}

const AppShellContext = createContext<AppShellContextType>({
  sidebarOpen: false,
  toggleSidebar: () => {},
  trackedCount: 0,
  refreshTrackedCount: async () => {},
})

export function useAppShell() {
  return useContext(AppShellContext)
}

import { usePathname } from "next/navigation"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [trackedCount, setTrackedCount] = useState(0)
  const pathname = usePathname()

  const isAuthPage = pathname === "/login" || pathname === "/invite" || pathname === "/pending" || pathname === "/"

  const refreshTrackedCount = async () => {
    try {
      const channels = await getTrackedChannelsAction()
      setTrackedCount(channels?.length || 0)
    } catch (error) {
      console.error("Error refreshing tracked count:", error)
    }
  }

  useEffect(() => {
    refreshTrackedCount()
  }, [pathname])

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)

  return (
    <AppShellContext.Provider value={{ 
      sidebarOpen, 
      toggleSidebar, 
      trackedCount,
      refreshTrackedCount 
    }}>
      <div className={cn(
        "flex bg-background",
        isAuthPage ? "min-h-screen" : "h-screen overflow-hidden"
      )}>
        {!isAuthPage && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <main className={cn(
          "flex flex-1 flex-col",
          isAuthPage ? "w-full" : "overflow-hidden"
        )}>
          {children}
        </main>
      </div>
    </AppShellContext.Provider>
  )
}
