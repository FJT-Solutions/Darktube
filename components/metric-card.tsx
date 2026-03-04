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
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/20",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="flex flex-col gap-1 overflow-hidden">
        <div className="flex flex-wrap items-end gap-2">
          <p className="text-2xl font-bold text-card-foreground leading-none">{value}</p>
          {trend && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
                trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              )}
            >
              {trend}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[10px] text-muted-foreground leading-tight mt-1 line-clamp-2" title={description}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
