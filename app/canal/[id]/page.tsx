"use client"

import { useState, useEffect, useCallback, use, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { useAppShell } from "@/components/layout/app-shell"
import { MetricCard } from "@/components/metric-card"
import { VideoCard } from "@/components/video-card"
import { EarningsCalculator } from "@/components/earnings-calculator"
import { DarkScoreBadge } from "@/components/dark-score-badge"
import { PageLoader, VideoCardSkeleton } from "@/components/loading-states"
import { formatNumber, formatCurrency } from "@/lib/metrics"
import {
  saveTrackedChannelAction,
  removeTrackedChannelAction,
  isChannelTrackedAction,
  analyzeVideoAction,
} from "../../actions"
import type {
  YouTubeChannel,
  YouTubeVideo,
  ChannelMetrics,
  TrackedChannel,
} from "@/lib/types"
import {
  Users,
  Eye,
  PlayCircle,
  DollarSign,
  TrendingUp,
  Clock,
  Heart,
  ExternalLink,
  Plus,
  Check,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Zap,
  Info,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"

export default function ChannelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { toggleSidebar } = useAppShell()
  const [channel, setChannel] = useState<YouTubeChannel | null>(null)
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [metrics, setMetrics] = useState<ChannelMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isTracked, setIsTracked] = useState(false)
  const [activeTab, setActiveTab] = useState<"videos" | "earnings" | "analytics">("videos")
  const [videoSubTab, setVideoSubTab] = useState<"video" | "shorts" | "live">("video")
  const [analyzingVideoId, setAnalyzingVideoId] = useState<string | null>(null)

  const handleAnalyzeVideo = async (video: YouTubeVideo) => {
    setAnalyzingVideoId(video.id)
    const result = await analyzeVideoAction(video, channel)
    if (result.success) {
      // Find the video and update it in the state
      setVideos((prev) =>
        prev.map((v) =>
          v.id === video.id
            ? { ...v, aiAnalysis: JSON.stringify(result.analysis) }
            : v
        )
      )
    }
    setAnalyzingVideoId(null)
  }

  const loadChannel = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/youtube/channel/${encodeURIComponent(id)}`)
      if (!response.ok) {
        throw new Error("Failed to load channel")
      }

      const data = await response.json()
      setChannel(data.channel)
      setVideos(data.videos || [])
      setMetrics(data.metrics)
      setIsTracked(await isChannelTrackedAction(data.channel?.id || id))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nao foi possivel carregar os dados do canal."
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  const filteredVideos = useMemo(() => {
    const grouped = {
      video: videos.filter(v => v.type === 'video' || !v.type),
      shorts: videos.filter(v => v.type === 'shorts'),
      live: videos.filter(v => v.type === 'live')
    }
    return grouped
  }, [videos])

  useEffect(() => {
    loadChannel()
  }, [loadChannel])

  const handleTrack = async () => {
    if (!channel) return

    if (isTracked) {
      await removeTrackedChannelAction(channel.id)
      setIsTracked(false)
    } else {
      const tracked: TrackedChannel = {
        ...channel,
        trackedAt: new Date().toISOString(),
        notes: "",
        tags: [],
        metrics: metrics || undefined,
      }
      await saveTrackedChannelAction(tracked)
      setIsTracked(true)
    }
  }

  if (loading) {
    return (
      <>
        <Header
          title="Carregando canal..."
          onMenuToggle={toggleSidebar}
        />
        <PageLoader message="Fazendo scraping dos dados do canal..." />
      </>
    )
  }

  if (error || !channel) {
    return (
      <>
        <Header
          title="Erro"
          onMenuToggle={toggleSidebar}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <p className="text-sm text-destructive">{error || "Canal nao encontrado"}</p>
          <Link
            href="/minerar"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para mineracao
          </Link>
        </div>
      </>
    )
  }

  // Prepare chart data from videos
  const viewsChartData = videos
    .slice(0, 20)
    .reverse()
    .map((v, i) => ({
      name: `V${i + 1}`,
      views: v.views,
      title: v.title.slice(0, 40) + (v.title.length > 40 ? "..." : ""),
    }))

  const engagementChartData = videos.slice(0, 15).reverse().map((v, i) => ({
    name: `V${i + 1}`,
    likes: v.likes,
    comments: v.comments,
    engagement: v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0,
  }))

  return (
    <>
      <Header
        title={channel.name}
        onMenuToggle={toggleSidebar}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar</span>
            </button>
            <div className="h-4 w-px bg-border mx-1" />
            <a
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              YouTube
            </a>
            <button
              onClick={handleTrack}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${isTracked
                ? "bg-primary/10 text-primary"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
            >
              {isTracked ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Rastreando
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Rastrear
                </>
              )}
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        {/* Channel header with banner */}
        <div className="relative">
          <div className="h-32 bg-gradient-to-r from-primary/20 via-secondary to-primary/10 lg:h-44">
            {channel.banner && (
              <img
                src={channel.banner}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="relative -mt-10 flex items-end gap-4 lg:-mt-14">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-secondary lg:h-28 lg:w-28">
                {channel.avatar ? (
                  <img
                    src={channel.avatar}
                    alt={channel.name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">
                    {channel.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 pb-2">
                <h2 className="text-xl font-bold text-foreground lg:text-2xl text-balance">
                  {channel.name}
                </h2>
                {channel.handle && (
                  <a
                    href={`https://socialblade.com/youtube/channel/${channel.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/handle flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {channel.handle.startsWith("@") ? channel.handle : `@${channel.handle}`}
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover/handle:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>
              {metrics && (
                <div className="hidden lg:block">
                  <DarkScoreBadge score={metrics.darkScore} size="md" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
            <MetricCard
              label="Inscritos"
              value={formatNumber(channel.subscribers)}
              icon={Users}
            />
            <MetricCard
              label="Total de views"
              value={formatNumber(channel.totalViews)}
              icon={Eye}
            />
            <MetricCard
              label="Videos"
              value={channel.videoCount.toString()}
              icon={PlayCircle}
            />
            {metrics && (
              <>
                <MetricCard
                  label="Media views/video"
                  value={formatNumber(metrics.avgViewsPerVideo)}
                  icon={BarChart3}
                />
                <MetricCard
                  label="Crescimento (28d)"
                  value={`${metrics.growthPotential}%`}
                  icon={TrendingUp}
                  trend={metrics.growthPotential > 2 ? "Alto" : "Normal"}
                  trendUp={metrics.growthPotential > 2}
                />
                <MetricCard
                  label="Receita Mensal Est."
                  value={formatCurrency(metrics.estimatedMonthlyRevenue)}
                  icon={DollarSign}
                  trend="Relatório 2026"
                  trendUp={true}
                  description="Baseado no nicho e país (Perplexity 2026)"
                />
                <MetricCard
                  label="Frequencia"
                  value={metrics.uploadFrequency}
                  icon={CalendarDays}
                />
              </>
            )}
          </div>

          {/* Dark Score card (mobile) + metrics detail */}
          {metrics && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl border border-border bg-card p-5 lg:col-span-1 overflow-hidden">
                <div className="shrink-0">
                  <DarkScoreBadge score={metrics.darkScore} size="lg" />
                </div>
                <div className="flex-1 w-full space-y-2.5 min-w-0">
                  <div className="flex items-center justify-between text-[11px] gap-2">
                    <span className="text-muted-foreground truncate">Taxa de engajamento</span>
                    <span className="font-bold text-card-foreground shrink-0 border-b border-white/5 pb-0.5">
                      {metrics.engagementRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] gap-2">
                    <span className="text-muted-foreground truncate">CPM estimado</span>
                    <span className="font-bold text-card-foreground shrink-0 border-b border-white/5 pb-0.5">
                      ${metrics.cpm.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] gap-2">
                    <span className="text-muted-foreground truncate">Uploads/mês</span>
                    <span className="font-bold text-card-foreground shrink-0 border-b border-white/5 pb-0.5">
                      {metrics.uploadsPerMonth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] gap-2">
                    <span className="text-muted-foreground truncate">Receita total est.</span>
                    <span className="font-bold text-emerald-400 shrink-0 border-b border-emerald-400/10 pb-0.5">
                      {formatCurrency(metrics.estimatedRevenue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Views per video chart */}
              <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
                <h3 className="mb-4 text-sm font-semibold text-card-foreground">
                  Views por video (ultimos {viewsChartData.length})
                </h3>
                {viewsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={viewsChartData}>
                      <defs>
                        <linearGradient
                          id="viewsGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="oklch(0.63 0.26 29)"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="oklch(0.63 0.26 29)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.25 0.005 260)"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "oklch(0.6 0 0)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "oklch(0.6 0 0)" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => formatNumber(v)}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "oklch(0.14 0.005 260)",
                          border: "1px solid oklch(0.25 0.005 260)",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "oklch(0.95 0 0)",
                        }}
                        formatter={(value: number) => [
                          formatNumber(value),
                          "Views",
                        ]}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            return (payload[0].payload as { title?: string }).title || label
                          }
                          return label
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="oklch(0.63 0.26 29)"
                        strokeWidth={2}
                        fill="url(#viewsGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sem dados suficientes para gerar o grafico.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {channel.description && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-2 text-sm font-semibold text-card-foreground">
                Descricao do canal
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {channel.description}
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border">
            <button
              onClick={() => setActiveTab("videos")}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${activeTab === "videos"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Videos ({videos.length})
              {activeTab === "videos" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${activeTab === "earnings"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              💰 Earnings
              {activeTab === "earnings" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${activeTab === "analytics"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Analytics
              {activeTab === "analytics" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "videos" ? (
            <div className="space-y-6">
              {/* Sub-tabs for video types */}
              <div className="flex gap-2">
                <button
                  onClick={() => setVideoSubTab("video")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${videoSubTab === "video"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                >
                  Vídeos ({filteredVideos.video.length})
                </button>
                <button
                  onClick={() => setVideoSubTab("shorts")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${videoSubTab === "shorts"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                >
                  Shorts ({filteredVideos.shorts.length})
                </button>
                <button
                  onClick={() => setVideoSubTab("live")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${videoSubTab === "live"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                >
                  Ao Vivo ({filteredVideos.live.length})
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredVideos[videoSubTab].length > 0 ? (
                  filteredVideos[videoSubTab].map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      cpm={metrics?.cpm}
                      onAnalyze={handleAnalyzeVideo}
                      isAnalyzing={analyzingVideoId === video.id}
                    />
                  ))
                ) : (
                  <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    Nenhum {videoSubTab === 'video' ? 'vídeo longo' : videoSubTab === 'shorts' ? 'short' : 'ao vivo'} encontrado para este canal.
                  </p>
                )}
              </div>
            </div>
          ) : activeTab === "earnings" ? (
            metrics ? (
              <EarningsCalculator channel={channel} videos={videos} metrics={metrics} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Carregando métricas...
              </p>
            )
          ) : (
            <div className="space-y-6">
              {/* Video performance comparison */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-4 text-sm font-semibold text-card-foreground">
                  Comparacao de performance dos videos
                </h3>
                {viewsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={viewsChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.25 0.005 260)"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "oklch(0.6 0 0)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "oklch(0.6 0 0)" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => formatNumber(v)}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "oklch(0.14 0.005 260)",
                          border: "1px solid oklch(0.25 0.005 260)",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "oklch(0.95 0 0)",
                        }}
                        formatter={(value: number) => [
                          formatNumber(value),
                          "Views",
                        ]}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            return (payload[0].payload as { title?: string }).title || label
                          }
                          return label
                        }}
                      />
                      <Bar
                        dataKey="views"
                        fill="oklch(0.63 0.26 29)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sem dados suficientes.
                  </p>
                )}
              </div>

              {/* Top performing videos */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-4 text-sm font-semibold text-card-foreground">
                  Top videos por views
                </h3>
                <div className="space-y-3">
                  {[...videos]
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 5)
                    .map((video, i) => (
                      <div
                        key={video.id}
                        className="flex items-center gap-3"
                      >
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                          {i + 1}
                        </span>
                        <div className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded bg-secondary">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-card-foreground hover:text-primary transition-colors line-clamp-1"
                          >
                            {video.title}
                          </a>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="flex-shrink-0 text-[10px] font-semibold text-primary">
                            {formatNumber(video.views)} views
                          </span>
                          {metrics && metrics.cpm > 0 && (
                            <span className="text-[10px] font-bold text-emerald-500">
                              {formatCurrency((video.views / 1000) * metrics.cpm)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Insights */}
              {metrics && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-card-foreground">
                      Analise de viabilidade
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <Zap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                        <p className="text-muted-foreground">
                          O canal posta em media{" "}
                          <strong className="text-foreground">
                            {metrics.uploadsPerMonth} videos/mes
                          </strong>{" "}
                          com frequencia{" "}
                          <strong className="text-foreground">
                            {metrics.uploadFrequency.toLowerCase()}
                          </strong>
                          .
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Eye className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                        <p className="text-muted-foreground">
                          Media de{" "}
                          <strong className="text-foreground">
                            {formatNumber(metrics.avgViewsPerVideo)} views
                          </strong>{" "}
                          por video com taxa de engajamento de{" "}
                          <strong className="text-foreground">
                            {metrics.engagementRate.toFixed(2)}%
                          </strong>
                          .
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <DollarSign className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                        <p className="text-muted-foreground">
                          Receita estimada de{" "}
                          <strong className="text-emerald-400">
                            {formatCurrency(metrics.estimatedMonthlyRevenue)}/mes
                          </strong>{" "}
                          com CPM de ${metrics.cpm.toFixed(2)}.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-card-foreground">
                      Recomendacoes
                    </h3>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      {metrics.darkScore >= 70 && (
                        <p>
                          Este canal tem um <strong className="text-emerald-400">Dark Score alto</strong>, indicando boa viabilidade para replicacao. O modelo de conteudo e consistente e gera bom engajamento.
                        </p>
                      )}
                      {metrics.darkScore >= 40 && metrics.darkScore < 70 && (
                        <p>
                          Dark Score <strong className="text-yellow-400">moderado</strong>. Analise os videos top para entender o que funciona melhor e busque nichos similares com menor concorrencia.
                        </p>
                      )}
                      {metrics.darkScore < 40 && (
                        <p>
                          Dark Score <strong className="text-red-400">baixo</strong>. Este canal pode nao ser o melhor modelo. Busque canais com frequencia mais consistente e views mais estaveis.
                        </p>
                      )}
                      {metrics.uploadsPerMonth < 4 && (
                        <p>
                          A frequencia de upload e baixa. Ao replicar, tente manter pelo menos 4 videos/mes para melhor crescimento.
                        </p>
                      )}
                      {metrics.engagementRate > 3 && (
                        <p>
                          Taxa de engajamento acima da media - o conteudo gera boa interacao.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
