"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/metrics"
import type { YouTubeChannel } from "@/lib/types"
import { Users, Eye, PlayCircle, CheckCircle2, Plus, Check, DollarSign, TrendingUp, ExternalLink } from "lucide-react"

interface ChannelCardProps {
  channel: YouTubeChannel
  darkScore?: number
  isTracked?: boolean
  estimatedMonetization?: number
  onTrack?: () => void
  className?: string
}

export function ChannelCard({
  channel,
  darkScore,
  isTracked,
  estimatedMonetization,
  onTrack,
  className,
}: ChannelCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        className
      )}
    >
      {/* Banner placeholder */}
      <div className="relative h-20 bg-gradient-to-r from-secondary to-accent">
        {channel.banner && (
          <img
            src={channel.banner}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
        {darkScore !== undefined && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold backdrop-blur-sm">
            <span
              className={cn(
                darkScore >= 80
                  ? "text-emerald-400"
                  : darkScore >= 60
                    ? "text-green-400"
                    : darkScore >= 40
                      ? "text-yellow-400"
                      : "text-red-400"
              )}
            >
              {darkScore}
            </span>
            <span className="text-muted-foreground">/100</span>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="relative -mt-8 px-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-secondary">
          {channel.avatar ? (
            <img
              src={channel.avatar}
              alt={channel.name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">
              {channel.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-3 p-4 pt-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/canal/${encodeURIComponent(channel.id)}`}
              className="text-sm font-semibold text-card-foreground hover:text-primary transition-colors line-clamp-1"
            >
              {channel.name}
            </Link>
            {channel.verified && (
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
            )}
          </div>
          {channel.handle && (
            <a
              href={`https://socialblade.com/youtube/channel/${channel.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group/handle flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="truncate max-w-[150px]">
                {channel.handle.startsWith("@") ? channel.handle : `@${channel.handle}`}
              </span>
              <ExternalLink className="h-2 w-2 opacity-0 group-hover/handle:opacity-100 transition-opacity" />
            </a>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1 shrink-0" title="Inscritos">
              <Users className="h-2.5 w-2.5" />
              <span>{formatNumber(channel.subscribers)}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0" title="Views Mensais Estimadas">
              <Eye className="h-2.5 w-2.5" />
              <span>{formatNumber(channel.estimatedMonthlyViews || Math.round(channel.totalViews * 0.02))}/mês</span>
            </div>
            <div className="flex items-center gap-1 shrink-0" title="Total de Vídeos">
              <PlayCircle className="h-2.5 w-2.5" />
              <span>{channel.videoCount}</span>
            </div>
            {channel.socialBladeGrade && (
              <div className="flex items-center gap-1 text-primary font-bold shrink-0" title="SocialBlade Grade">
                <TrendingUp className="h-2.5 w-2.5" />
                <span>{channel.socialBladeGrade}</span>
              </div>
            )}
            {channel.darkType && (
              <div className="flex items-center gap-1 text-muted-foreground italic shrink-0" title="Categoria do Canal">
                <span>{channel.darkType}</span>
              </div>
            )}
            {channel.reliabilityIndex && (
              <div className="flex items-center gap-1 text-emerald-400 shrink-0" title="Índice de Confiabilidade">
                <Check className="h-2.5 w-2.5" />
                <span>{Math.round(channel.reliabilityIndex * 100)}%</span>
              </div>
            )}
          </div>

          {estimatedMonetization !== undefined && estimatedMonetization > 0 && (
            <div className="rounded-lg bg-emerald-500/10 p-2.5 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-emerald-600/70 leading-none mb-1">Receita Mensal Est.</span>
                  <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {formatNumber(Math.round(estimatedMonetization))}
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </div>
          )}

          {channel.remodelingScore !== undefined && (
            <div className="rounded-lg bg-primary/5 p-2.5 border border-primary/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-1 rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  <span>Score: {channel.remodelingScore}</span>
                </div>
                <span className="text-[10px] font-semibold text-primary uppercase">Remodelagem</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight italic">
                {channel.remodelingInsight}
              </p>
            </div>
          )}
        </div>

        {onTrack && (
          <button
            onClick={(e) => {
              e.preventDefault()
              onTrack()
            }}
            className={cn(
              "mt-auto flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              isTracked
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
            )}
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
        )}
      </div>
    </div>
  )
}
