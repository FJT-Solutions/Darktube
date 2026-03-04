"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { Sidebar } from "./sidebar"
import { getTrackedChannels } from "@/lib/storage"

interface AppShellContextType {
  sidebarOpen: boolean
  toggleSidebar: () => void
}

const AppShellContext = createContext<AppShellContextType>({
  sidebarOpen: false,
  toggleSidebar: () => {},
})

export function useAppShell() {
  return useContext(AppShellContext)
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const count = getTrackedChannels().length
    const el = document.getElementById("tracked-count")
    if (el) el.textContent = count.toString()
  }, [])

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)

  return (
    <AppShellContext.Provider value={{ sidebarOpen, toggleSidebar }}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </AppShellContext.Provider>
  )
}
