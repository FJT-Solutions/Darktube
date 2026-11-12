import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
  description?: string
  className?: string
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  description,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-2 sm:gap-3 rounded-xl border border-border bg-card p-3 sm:p-5 transition-all hover:border-primary/20 min-w-0 overflow-hidden shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        <p className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate" title={label}>{label}</p>
        <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        </div>
      </div>
      <div className="flex flex-col gap-1 overflow-hidden min-w-0">
        <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
          <p className="text-base xs:text-lg sm:text-2xl font-black text-card-foreground leading-tight tracking-tight truncate max-w-full" title={value}>
            {value}
          </p>
          {trend && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold whitespace-nowrap",
                trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              )}
            >
              {trend}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2" title={description}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
