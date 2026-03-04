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
import { getTrackedChannelsAction } from "./actions"
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
        description="Visao geral dos seus canais e tendencias"
        onMenuToggle={toggleSidebar}
      />
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
              label="Receita estimada/mes"
              value={formatCurrency(avgRevenue)}
              icon={DollarSign}
            />
          </div>

          {/* Quick actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/minerar"
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-card-foreground">
                  Minerar canais
                </h3>
                <p className="text-sm text-muted-foreground">
                  Descubra novos canais dark por nicho ou palavras-chave
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
            <Link
              href="/tracker"
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-card-foreground">
                  Ver tracker
                </h3>
                <p className="text-sm text-muted-foreground">
                  Acompanhe os canais que voce esta rastreando
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          </div>

          {/* Tracked channels */}
          {trackedChannels.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">
                  Canais rastreados
                </h2>
                <Link
                  href="/tracker"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Ver todos
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {trackedChannels.slice(0, 4).map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    darkScore={channel.metrics?.darkScore}
                    isTracked={true}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Trending videos */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Videos em alta
              </h2>
            </div>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <VideoCardSkeleton key={i} />
                ))}
              </div>
            ) : trendingVideos.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {trendingVideos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="Nenhum video em alta encontrado"
                description="Nao foi possivel carregar os videos em alta no momento. Tente novamente mais tarde."
              />
            )}
          </section>
        </div>
      </div>
    </>
  )
}
