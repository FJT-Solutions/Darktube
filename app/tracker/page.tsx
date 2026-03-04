"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { useAppShell } from "@/components/layout/app-shell"
import { DarkScoreBadge } from "@/components/dark-score-badge"
import { EmptyState } from "@/components/loading-states"
import { formatNumber, formatCurrency } from "@/lib/metrics"
import {
  getTrackedChannelsAction,
  removeTrackedChannelAction,
  updateChannelNotesAction,
} from "../actions"
import type { TrackedChannel } from "@/lib/types"
import {
  Bookmark,
  Search,
  Trash2,
  ExternalLink,
  Eye,
  Users,
  PlayCircle,
  DollarSign,
  StickyNote,
  ArrowUpDown,
  ChevronRight,
} from "lucide-react"

type SortKey = "name" | "subscribers" | "totalViews" | "trackedAt" | "darkScore"

export default function TrackerPage() {
  const { toggleSidebar } = useAppShell()
  const [channels, setChannels] = useState<TrackedChannel[]>([])
  const [searchFilter, setSearchFilter] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("trackedAt")
  const [sortAsc, setSortAsc] = useState(false)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState("")

  const loadChannels = useCallback(async () => {
    const data = await getTrackedChannelsAction()
    setChannels(data)
  }, [])

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  const handleRemove = async (id: string) => {
    await removeTrackedChannelAction(id)
    loadChannels()
  }

  const handleSaveNotes = async (id: string) => {
    await updateChannelNotesAction(id, notesValue)
    setEditingNotes(null)
    loadChannels()
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const filteredChannels = channels
    .filter((ch) =>
      ch.name.toLowerCase().includes(searchFilter.toLowerCase())
    )
    .sort((a, b) => {
      let aVal: number | string
      let bVal: number | string

      switch (sortKey) {
        case "name":
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case "subscribers":
          aVal = a.subscribers
          bVal = b.subscribers
          break
        case "totalViews":
          aVal = a.totalViews
          bVal = b.totalViews
          break
        case "trackedAt":
          aVal = new Date(a.trackedAt).getTime()
          bVal = new Date(b.trackedAt).getTime()
          break
        case "darkScore":
          aVal = a.metrics?.darkScore || 0
          bVal = b.metrics?.darkScore || 0
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortAsc ? -1 : 1
      if (aVal > bVal) return sortAsc ? 1 : -1
      return 0
    })

  return (
    <>
      <Header
        title="Tracker"
        description={`${channels.length} canal(is) rastreado(s)`}
        onMenuToggle={toggleSidebar}
      />
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          {channels.length > 0 ? (
            <>
              {/* Search and sort controls */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filtrar canais..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Ordenar:</span>
                  {(
                    [
                      ["trackedAt", "Data"],
                      ["name", "Nome"],
                      ["subscribers", "Inscritos"],
                      ["totalViews", "Views"],
                      ["darkScore", "Score"],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => handleSort(key)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${sortKey === key
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {label}
                      {sortKey === key && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel rows */}
              <div className="space-y-2">
                {filteredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
                        {channel.avatar ? (
                          <img
                            src={channel.avatar}
                            alt={channel.name}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">
                            {channel.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Channel info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/canal/${encodeURIComponent(channel.id)}`}
                            className="text-sm font-semibold text-card-foreground hover:text-primary transition-colors truncate"
                          >
                            {channel.name}
                          </Link>
                          {channel.metrics?.darkScore !== undefined && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${channel.metrics.darkScore >= 60
                                ? "bg-emerald-400/10 text-emerald-400"
                                : channel.metrics.darkScore >= 40
                                  ? "bg-yellow-400/10 text-yellow-400"
                                  : "bg-red-400/10 text-red-400"
                                }`}
                            >
                              {channel.metrics.darkScore}/100
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {formatNumber(channel.subscribers)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatNumber(channel.totalViews)}
                          </span>
                          <span className="flex items-center gap-1">
                            <PlayCircle className="h-3 w-3" />
                            {channel.videoCount} videos
                          </span>
                          {channel.metrics?.estimatedMonthlyRevenue ? (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(
                                channel.metrics.estimatedMonthlyRevenue
                              )}
                              /mes
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Notes */}
                      {editingNotes === channel.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSaveNotes(channel.id)
                              if (e.key === "Escape") setEditingNotes(null)
                            }}
                            placeholder="Anotacao..."
                            className="h-8 w-40 rounded border border-border bg-input px-2 text-xs text-foreground focus:border-primary focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveNotes(channel.id)}
                            className="text-xs text-primary hover:underline"
                          >
                            Salvar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingNotes(channel.id)
                            setNotesValue(channel.notes || "")
                          }}
                          className="hidden items-center gap-1 text-xs text-muted-foreground hover:text-foreground sm:flex"
                          title={channel.notes || "Adicionar nota"}
                        >
                          <StickyNote className="h-3.5 w-3.5" />
                          {channel.notes ? (
                            <span className="max-w-[100px] truncate">
                              {channel.notes}
                            </span>
                          ) : (
                            "Nota"
                          )}
                        </button>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <a
                          href={channel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          title="Abrir no YouTube"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Link
                          href={`/canal/${encodeURIComponent(channel.id)}`}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          title="Ver detalhes"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleRemove(channel.id)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Remover do tracker"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Tags */}
                    {channel.tags && channel.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 pl-16">
                        {channel.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredChannels.length === 0 && searchFilter && (
                <EmptyState
                  icon={Search}
                  title="Nenhum resultado"
                  description={`Nenhum canal corresponde a "${searchFilter}".`}
                />
              )}
            </>
          ) : (
            <EmptyState
              icon={Bookmark}
              title="Nenhum canal rastreado"
              description="Comece minerando canais e adicionando-os ao seu tracker para acompanhar."
              action={
                <Link
                  href="/minerar"
                  className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Comecar a minerar
                </Link>
              }
            />
          )}
        </div>
      </div>
    </>
  )
}
