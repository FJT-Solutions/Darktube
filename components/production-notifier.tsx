"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { getAllRecentProductionHistoryAction } from "@/app/actions"

export function ProductionNotifier() {
  const activeIdsRef = useRef<Set<string>>(new Set())
  const isFirstRun = useRef(true)

  useEffect(() => {
    let timer: NodeJS.Timeout

    async function checkStatus() {
      try {
        const history = await getAllRecentProductionHistoryAction(20)
        if (!history || history.length === 0) return

        history.forEach((item: any) => {
          const isPending =
            item.status === "sent" ||
            item.status === "sent_auto" ||
            item.status === "processing" ||
            item.status === "rendering"

          // If item was previously pending and is now completed
          if (!isFirstRun.current && activeIdsRef.current.has(item.id)) {
            if (item.status === "completed") {
              activeIdsRef.current.delete(item.id)
              toast.success("🎬 Produção Concluída com Sucesso!", {
                description: "Seu vídeo foi renderizado e já está disponível no histórico.",
                duration: 10000,
                action: item.video_url
                  ? {
                      label: "Assistir Vídeo",
                      onClick: () => window.open(item.video_url, "_blank"),
                    }
                  : undefined,
              })
              window.dispatchEvent(new CustomEvent("production-status-changed"))
            } else if (item.status === "failed") {
              activeIdsRef.current.delete(item.id)
              toast.error("❌ Produção Falhou", {
                description: "Ocorreu um erro ao renderizar o vídeo.",
                duration: 8000,
              })
              window.dispatchEvent(new CustomEvent("production-status-changed"))
            }
          } else if (isPending) {
            activeIdsRef.current.add(item.id)
          }
        })

        if (isFirstRun.current) {
          isFirstRun.current = false
        }
      } catch (err) {
        console.error("Error checking production notifications:", err)
      }
    }

    checkStatus()
    timer = setInterval(checkStatus, 5000)

    return () => clearInterval(timer)
  }, [])

  return null
}
