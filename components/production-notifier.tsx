"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

export function ProductionNotifier() {
  const activeIdsRef = useRef<Set<string>>(new Set())
  const isFirstRun = useRef(true)

  useEffect(() => {
    let timer: NodeJS.Timeout

    async function checkStatus() {
      try {
        const res = await fetch("/api/productions/recent").catch(() => null)
        if (!res || !res.ok) return
        const data = await res.json()
        const history = data.history || []
        if (history.length === 0) return

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
                description: "Seu vídeo foi renderizado e já está disponível para baixar.",
                duration: 12000,
                action: item.video_url
                  ? {
                      label: "Baixar Vídeo",
                      onClick: async () => {
                        try {
                          const res = await fetch(item.video_url)
                          const blob = await res.blob()
                          const blobUrl = URL.createObjectURL(blob)
                          const a = document.createElement("a")
                          a.href = blobUrl
                          a.download = `darktube_${item.id || Date.now()}.mp4`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          URL.revokeObjectURL(blobUrl)
                        } catch {
                          window.open(item.video_url, "_blank")
                        }
                      },
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
