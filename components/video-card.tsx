"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/metrics"
import type { YouTubeVideo } from "@/lib/types"
import {
  Eye, Clock, Calendar, DollarSign, Sparkles, Wand2, Loader2, CheckCircle2, TrendingUp, Zap,
  Wrench,
  Info,
} from "lucide-react"
import { useMemo } from "react"

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, "0")
    const min = String(d.getMinutes()).padStart(2, "0")
    const ss = String(d.getSeconds()).padStart(2, "0")
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`
  } catch {
    return iso
  }
}

interface VideoCardProps {
  video: YouTubeVideo
  className?: string
  compact?: boolean
  cpm?: number
  onAnalyze?: (video: YouTubeVideo) => void
  isAnalyzing?: boolean
  analysis?: any
}

export function VideoCard({ video, className, compact, cpm, onAnalyze, isAnalyzing, analysis: propAnalysis }: VideoCardProps) {
  const estimatedRevenue = cpm ? (video.views / 1000) * cpm : 0

  // Use prop analysis or parse from video
  const analysis = useMemo(() => {
    if (propAnalysis) return propAnalysis
    if (video.aiAnalysis) {
      try {
        return JSON.parse(video.aiAnalysis)
      } catch {
        return null
      }
    }
    return null
  }, [propAnalysis, video.aiAnalysis])

  if (compact) {
    return (
      <div className={cn("group flex gap-3", className)}>
        <div className="relative aspect-video w-40 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          {video.duration && (
            <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-foreground">
              {video.duration}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-2 text-sm font-medium text-card-foreground hover:text-primary transition-colors"
          >
            {video.title}
          </a>
          <p className="text-xs text-muted-foreground">{video.channelName}</p>
          <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatNumber(video.views)}
            </span>
            {video.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(video.publishedAt)}
              </span>
            )}
            {estimatedRevenue > 0 && (
              <span className="flex items-center gap-1 text-emerald-500 font-medium">
                <DollarSign className="h-3 w-3" />
                {estimatedRevenue < 10 ? estimatedRevenue.toFixed(2) : formatNumber(Math.round(estimatedRevenue))}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        className
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-secondary">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        {video.duration && (
          <span className="absolute right-2 bottom-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
            {video.duration}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-sm font-medium text-card-foreground hover:text-primary transition-colors"
        >
          {video.title}
        </a>
        <Link
          href={`/canal/${encodeURIComponent(video.channelId)}`}
          className="text-xs text-muted-foreground hover:text-primary transition-colors truncate"
          title={video.channelName}
        >
          {video.channelName}
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1 shrink-0">
            <Eye className="h-2.5 w-2.5" />
            {formatNumber(video.views)}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <Clock className="h-2.5 w-2.5" />
            {video.duration}
          </span>
          {video.publishedAt && (
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="h-2.5 w-2.5" />
              {formatDate(video.publishedAt)}
            </span>
          )}
          {estimatedRevenue > 0 && (
            <span className="flex items-center gap-1 text-emerald-500 font-medium shrink-0">
              <DollarSign className="h-2.5 w-2.5" />
              {estimatedRevenue < 10 ? estimatedRevenue.toFixed(2) : formatNumber(Math.round(estimatedRevenue))}
            </span>
          )}
        </div>

        {/* AI Analysis UI */}
        <div className="mt-3 pt-3 border-t border-border/50">
          {analysis ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase">IA: {analysis.feasibility}</span>
                </div>
                <span className="text-[9px] text-muted-foreground italic">{analysis.style}</span>
              </div>

              {/* Visual Intelligence Badges */}
              <div className="flex flex-wrap gap-1.5">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/50 border border-border/50">
                  <Eye className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[9px] font-medium text-muted-foreground uppercase">{analysis.visualStyle}</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/50 border border-border/50">
                  <Zap className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[9px] font-medium text-muted-foreground uppercase">{analysis.pacing}</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/50 border border-border/50">
                  <Wrench className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[9px] font-medium text-muted-foreground uppercase">{analysis.productionMethod}</span>
                </div>
                <div className="ml-auto text-[8px] text-muted-foreground/60 font-mono">
                  {Math.round(analysis.confidence * 100)}% conf.
                </div>
              </div>

              {analysis.justification && (
                <div className="p-2 rounded bg-primary/5 border border-primary/10 flex gap-2">
                  <Info className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                  <p className="text-[9px] leading-tight text-primary/80 italic">
                    <span className="font-bold uppercase not-italic">Veredito Técnico:</span> {analysis.justification}
                  </p>
                </div>
              )}

              <p className="text-[10px] leading-relaxed text-muted-foreground line-clamp-2">
                {analysis.remodelingTip}
              </p>
            </div>
          ) : (
            <button
              onClick={() => onAnalyze?.(video)}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-secondary/80 hover:bg-primary/10 hover:text-primary py-2 text-[10px] font-semibold transition-all group/ai disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Analisando...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3 transition-transform group-hover/ai:rotate-12" />
                  <span>Analisar para IA</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
