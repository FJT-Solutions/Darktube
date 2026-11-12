"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { useAppShell } from "@/components/layout/app-shell"
import { MetricCard } from "@/components/metric-card"
import { VideoCard } from "@/components/video-card"
import { ChannelCard } from "@/components/channel-card"
import { VideoCardSkeleton, EmptyState } from "@/components/loading-states"
import { formatNumber, formatCurrency } from "@/lib/metrics"
import { getTrackedChannelsAction } from "@/app/actions"
import type { YouTubeVideo } from "@/lib/types"
import type { TrackedChannel } from "@/lib/types"
import {
  Bookmark,
  TrendingUp,
  Eye,
  DollarSign,
  Search,
  ArrowRight,
  Zap,
} from "lucide-react"

export default function DashboardPage() {
  const { toggleSidebar } = useAppShell()
  const [trackedChannels, setTrackedChannels] = useState<TrackedChannel[]>([])
  const [trendingVideos, setTrendingVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load tracked channels from database
      const channels = await getTrackedChannelsAction()
      setTrackedChannels(channels)

      // Load trending videos
      const response = await fetch("/api/youtube/trending")
      if (response.ok) {
        const data = await response.json()
        setTrendingVideos(data.videos?.slice(0, 8) || [])
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalViews = trackedChannels.reduce(
    (sum, ch) => sum + ch.totalViews,
    0
  )
  const totalSubs = trackedChannels.reduce(
    (sum, ch) => sum + ch.subscribers,
    0
  )
  const avgRevenue = trackedChannels.reduce(
    (sum, ch) => sum + (ch.metrics?.estimatedMonthlyRevenue || 0),
    0
  )

  return (
    <>
      <Header
        title="Dashboard"
        description="Visão geral dos seus canais e tendências"
        onMenuToggle={toggleSidebar}
      />
      <div className="flex-1 overflow-y-auto scroll-touch p-3 sm:p-4 lg:p-6 page-transition w-full max-w-full">
        <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            <MetricCard
              label="Canais rastreados"
              value={trackedChannels.length.toString()}
              icon={Bookmark}
            />
            <MetricCard
              label="Total de inscritos"
              value={formatNumber(totalSubs)}
              icon={TrendingUp}
            />
            <MetricCard
              label="Total de views"
              value={formatNumber(totalViews)}
              icon={Eye}
            />
            <MetricCard
              label="Receita estimada/mês"
              value={formatCurrency(avgRevenue)}
              icon={DollarSign}
            />
          </div>

          {/* Quick actions */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
            <Link
              href="/minerar"
              className="group flex items-center gap-3.5 sm:gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 min-w-0"
            >
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-card-foreground truncate">
                  Minerar canais
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                  Descubra novos canais dark por nicho ou palavras-chave
                </p>
              </div>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary shrink-0" />
            </Link>
            <Link
              href="/tracker"
              className="group flex items-center gap-3.5 sm:gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 min-w-0"
            >
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-card-foreground truncate">
                  Ver tracker
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                  Acompanhe os canais que você está rastreando
                </p>
              </div>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary shrink-0" />
            </Link>
          </div>

          {/* Tracked channels */}
          {trackedChannels.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-semibold text-foreground">
                  Canais rastreados
                </h2>
                <Link
                  href="/tracker"
                  className="flex items-center gap-1 text-xs sm:text-sm text-primary hover:underline font-medium"
                >
                  Ver todos
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {/* Mobile: horizontal scroll, Tablet & Desktop: grid */}
              <div className="-mx-3 overflow-x-auto pb-2 sm:mx-0 sm:overflow-visible scroll-touch">
                <div className="flex gap-3 px-3 sm:px-0 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4">
                  {trackedChannels.slice(0, 6).map((channel) => (
                    <div key={channel.id} className="w-[260px] xs:w-[280px] shrink-0 sm:w-auto">
                      <ChannelCard
                        channel={channel}
                        darkScore={channel.metrics?.darkScore}
                        isTracked={true}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Trending videos */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Vídeos em alta
              </h2>
            </div>
            {loading ? (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <VideoCardSkeleton key={i} />
                ))}
              </div>
            ) : trendingVideos.length > 0 ? (
              <div className="-mx-3 overflow-x-auto pb-2 sm:mx-0 sm:overflow-visible scroll-touch">
                <div className="flex gap-3 px-3 sm:px-0 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4">
                  {trendingVideos.map((video) => (
                    <div key={video.id} className="w-[260px] xs:w-[280px] shrink-0 sm:w-auto">
                      <VideoCard video={video} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="Nenhum vídeo em alta encontrado"
                description="Não foi possível carregar os vídeos em alta no momento. Tente novamente mais tarde."
              />
            )}
          </section>
        </div>
      </div>
    </>
  )
}
