"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { useAppShell } from "@/components/layout/app-shell"
import { ChannelCard } from "@/components/channel-card"
import { VideoCard } from "@/components/video-card"
import {
  ChannelCardSkeleton,
  VideoCardSkeleton,
  EmptyState,
} from "@/components/loading-states"
import { NICHES, SUBSCRIBER_RANGES } from "@/lib/constants"
import {
  saveTrackedChannelAction,
  removeTrackedChannelAction,
  isChannelTrackedAction,
  getTrackedChannelsAction,
  getNicheIntelligenceAction,
} from "../actions"
import type { YouTubeChannel, YouTubeVideo, TrackedChannel } from "@/lib/types"
import {
  Search,
  SlidersHorizontal,
  X,
  LayoutGrid,
  List,
  Tv,
  PlayCircle,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ChevronRight,
} from "lucide-react"
import { MiningWizard } from "@/components/mining/mining-wizard"
import { NicheBadge } from "@/components/mining/niche-badge"
import { Button } from "@/components/ui/button"

export default function MinerarPage() {
  const { toggleSidebar } = useAppShell()
  const [query, setQuery] = useState("")
  const [searchType, setSearchType] = useState<"channel" | "video">("channel")
  const [selectedNiche, setSelectedNiche] = useState("")
  const [minSubs, setMinSubs] = useState("0")
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const [channels, setChannels] = useState<YouTubeChannel[]>([])
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set())
  const [wizardOpen, setWizardOpen] = useState(false)
  const [nicheIntel, setNicheIntel] = useState<any>(null)

  // Persistence Key
  const STORAGE_KEY = "minerar_search_state"

  // Restore state on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem(STORAGE_KEY)
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        setQuery(state.query || "")
        setSearchType(state.searchType || "channel")
        setSelectedNiche(state.selectedNiche || "")
        setMinSubs(state.minSubs || "0")
        setChannels(state.channels || [])
        setVideos(state.videos || [])
        setHasSearched(state.hasSearched || false)
        if (state.selectedNiche) {
          getNicheIntelligenceAction(state.selectedNiche).then(setNicheIntel)
        }
      } catch (e) {
        console.error("Failed to restore search state", e)
      }
    }
  }, [])

  // Save state on changes
  useEffect(() => {
    if (hasSearched) {
      const state = {
        query,
        searchType,
        selectedNiche,
        minSubs,
        channels,
        videos,
        hasSearched
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  }, [query, searchType, selectedNiche, minSubs, channels, videos, hasSearched])

  // Fetch niche intelligence when niche is selected
  useEffect(() => {
    if (selectedNiche) {
      getNicheIntelligenceAction(selectedNiche).then(setNicheIntel)
    } else {
      setNicheIntel(null)
    }
  }, [selectedNiche])

  const handleSearch = useCallback(async (overrideQuery?: string | any, overrideNicheId?: string) => {
    let searchQuery = (typeof overrideQuery === 'string' ? overrideQuery : query).trim()
    const activeNicheId = overrideNicheId !== undefined ? overrideNicheId : selectedNiche

    // Add niche keywords if selected
    if (activeNicheId) {
      const niche = NICHES.find((n) => n.id === activeNicheId)
      if (niche) {
        const nicheKeyword =
          niche.keywords[Math.floor(Math.random() * niche.keywords.length)]
        if (!searchQuery) {
          searchQuery = nicheKeyword
        } else {
          searchQuery = `${searchQuery} ${nicheKeyword}`
        }
      }
    }

    if (!searchQuery) return

    setLoading(true)
    setHasSearched(true)

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: searchType,
        limit: "20",
      })

      const response = await fetch(`/api/youtube/search?${params}`)
      if (!response.ok) throw new Error("Search failed")

      const data = await response.json()

      if (searchType === "channel") {
        let filteredChannels = data.channels || []

        // Apply subscriber filter
        const minSubCount = parseInt(minSubs, 10)
        if (minSubCount > 0) {
          filteredChannels = filteredChannels.filter(
            (ch: YouTubeChannel) => ch.subscribers >= minSubCount
          )
        }

        // --- SORT BY PROFITABILITY ---
        // estimatedMonetization is already calculated in the backend API
        filteredChannels.sort((a: any, b: any) =>
          (b.estimatedMonetization || 0) - (a.estimatedMonetization || 0)
        )

        setChannels(filteredChannels)
        setVideos([])
      } else {
        setVideos(data.videos || [])
        setChannels([])
      }

      // Check tracked status in database
      const trackedChannels = await getTrackedChannelsAction()
      const ids = new Set(trackedChannels.map(c => c.id))
      setTrackedIds(ids)
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setLoading(false)
    }
  }, [query, searchType, selectedNiche, minSubs])

  const handleTrack = async (channel: YouTubeChannel) => {
    const isCurrentlyTracked = trackedIds.has(channel.id)
    
    // Optimistic update
    setTrackedIds((prev) => {
      const next = new Set(prev)
      if (isCurrentlyTracked) next.delete(channel.id)
      else next.add(channel.id)
      return next
    })

    try {
      if (isCurrentlyTracked) {
        await removeTrackedChannelAction(channel.id)
      } else {
        const tracked: TrackedChannel = {
          ...channel,
          trackedAt: new Date().toISOString(),
          notes: "",
          tags: [],
        }
        await saveTrackedChannelAction(tracked)
      }
    } catch (error) {
      console.error("Error toggling track status:", error)
      // Rollback
      setTrackedIds((prev) => {
        const next = new Set(prev)
        if (isCurrentlyTracked) next.add(channel.id)
        else next.delete(channel.id)
        return next
      })
      alert("Erro ao salvar canal. Verifique sua conexão.")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  const handleNicheClick = (nicheId: string) => {
    const newNiche = nicheId === selectedNiche ? "" : nicheId
    setSelectedNiche(newNiche)
    if (newNiche) {
      getNicheIntelligenceAction(newNiche).then(setNicheIntel)
    } else {
      setNicheIntel(null)
    }
  }

  return (
    <>
      <Header
        title="Minerar"
        description="Descubra canais dark e nichos altamente lucrativos"
        onMenuToggle={toggleSidebar}
      />
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Welcome & Discovery Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl border border-primary/20 bg-primary/5 p-6 backdrop-blur-sm">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Dúvida no nicho? <Sparkles className="h-5 w-5 text-primary" />
              </h2>
              <p className="text-muted-foreground">
                Use nosso assistente inteligente para encontrar os nichos mais rentáveis para canais dark.
              </p>
            </div>
            <Button
              onClick={() => setWizardOpen(true)}
              className="rounded-xl shadow-lg"
            >
              Iniciar Assistente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <MiningWizard
            open={wizardOpen}
            onOpenChange={setWizardOpen}
            onSelectNiche={(nicheId) => {
              const niche = NICHES.find(n => n.id === nicheId)
              if (niche) {
                setSelectedNiche(nicheId)
                const firstKeyword = niche.keywords[0]
                setQuery(firstKeyword)
                // Trigger search directly with values to avoid state lag
                handleSearch(firstKeyword, nicheId)
              }
            }}
          />

          {/* Search bar */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar canais, nichos, palavras-chave..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-11 w-full rounded-lg border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${showFilters
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
              </button>
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium shadow-md"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
            </div>

            {/* Search type toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchType("channel")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${searchType === "channel"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Tv className="h-3.5 w-3.5" />
                Canais
              </button>
              <button
                onClick={() => setSearchType("video")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${searchType === "video"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Videos
              </button>
              <div className="mx-2 h-4 w-px bg-border" />
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-1.5 ${viewMode === "grid"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-md p-1.5 ${viewMode === "list"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Filters panel */}
            {showFilters && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                {/* Niche filter */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nicho
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {NICHES.map((niche) => (
                      <div
                        key={niche.id}
                        onClick={() => handleNicheClick(niche.id)}
                        className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-all cursor-pointer ${selectedNiche === niche.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:bg-secondary/50"
                          }`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleNicheClick(niche.id)
                          }
                        }}
                      >
                        <NicheBadge niche={niche} showMetrics />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscriber range */}
                {searchType === "channel" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Minimo de inscritos
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SUBSCRIBER_RANGES.map((range) => (
                        <button
                          key={range.value}
                          onClick={() => setMinSubs(range.value)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${minSubs === range.value
                            ? "bg-foreground text-background"
                            : "bg-secondary text-secondary-foreground hover:bg-accent"
                            }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active filters summary */}
                {(selectedNiche || minSubs !== "0") && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">Filtros ativos:</span>
                    {selectedNiche && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {NICHES.find((n) => n.id === selectedNiche)?.label}
                        <button onClick={() => setSelectedNiche("")}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {minSubs !== "0" && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {SUBSCRIBER_RANGES.find(
                          (r) => r.value === minSubs
                        )?.label}{" "}
                        inscritos
                        <button onClick={() => setMinSubs("0")}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Niche Intelligence Dashboard */}
            {selectedNiche && nicheIntel && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Inteligência de Nicho: {NICHES.find(n => n.id === selectedNiche)?.label}</h3>
                    <p className="text-[10px] text-muted-foreground">Baseado nos canais que você está rastreando</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Canais Rastreados</span>
                    <p className="text-2xl font-bold text-foreground mt-1">{nicheIntel.trackedCount}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 italic">Neste nicho específico</p>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Estilos Populares</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {nicheIntel.recommendedStyles.length > 0 ? (
                        nicheIntel.recommendedStyles.map((style: string) => (
                          <span key={style} className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                            {style}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Calibrando dados...</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Gemas para Remodelagem</span>
                    <div className="space-y-2 mt-2">
                      {nicheIntel.remodelingGems.length > 0 ? (
                        nicheIntel.remodelingGems.map((gem: any) => (
                          <div key={gem.id} className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-foreground truncate max-w-[120px]">{gem.name}</span>
                            <span className="text-primary font-bold">Score: {gem.score}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Rastreie canais para ver sugestões</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {loading ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "space-y-3"
              }
            >
              {Array.from({ length: 8 }).map((_, i) =>
                searchType === "channel" ? (
                  <ChannelCardSkeleton key={i} />
                ) : (
                  <VideoCardSkeleton key={i} compact={viewMode === "list"} />
                )
              )}
            </div>
          ) : hasSearched ? (
            searchType === "channel" ? (
              channels.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {channels.length} canal(is) encontrado(s)
                  </p>
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        : "space-y-3"
                    }
                  >
                    {channels.map((channel) => (
                      <ChannelCard
                        key={channel.id}
                        channel={channel}
                        isTracked={trackedIds.has(channel.id)}
                        onTrack={() => handleTrack(channel)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={Tv}
                  title="Nenhum canal encontrado"
                  description="Tente buscar com outras palavras-chave ou ajuste seus filtros."
                />
              )
            ) : videos.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {videos.length} video(s) encontrado(s)
                </p>
                <div
                  className={
                    viewMode === "grid"
                      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                      : "space-y-3"
                  }
                >
                  {videos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      compact={viewMode === "list"}
                      cpm={NICHES.find(n => n.id === selectedNiche)?.estimatedCpm}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                icon={PlayCircle}
                title="Nenhum video encontrado"
                description="Tente buscar com outras palavras-chave."
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                Comece a minerar
              </h3>
              <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
                Busque por palavras-chave, selecione um nicho ou use os filtros
                avançados para encontrar os melhores canais dark do YouTube.
              </p>

              {/* Hot Niches Suggestions */}
              <div className="mt-12 w-full max-w-4xl">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Nichos de Alta Lucratividade
                  </h4>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {NICHES.filter((n) => n.revenuePotential === "High")
                    .slice(0, 3)
                    .map((niche) => (
                      <div
                        key={niche.id}
                        onClick={() => {
                          setSelectedNiche(niche.id)
                          const firstKeyword = niche.keywords[0]
                          setQuery(firstKeyword)
                          handleSearch(firstKeyword, niche.id)
                        }}
                        className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setSelectedNiche(niche.id)
                            const firstKeyword = niche.keywords[0]
                            setQuery(firstKeyword)
                            handleSearch(firstKeyword, niche.id)
                          }
                        }}
                      >
                        <NicheBadge niche={niche} showMetrics />
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {niche.description}
                        </p>
                        <div className="mt-auto pt-2 flex items-center text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          EXPLORAR CANAIS
                          <ChevronRight className="h-3 w-3" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div >
    </>
  )
}
