import { cn } from "@/lib/utils"
import { getDarkScoreColor, getDarkScoreLabel } from "@/lib/metrics"

interface DarkScoreBadgeProps {
  score: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}

export function DarkScoreBadge({
  score,
  size = "md",
  showLabel = true,
}: DarkScoreBadgeProps) {
  const colorClass = getDarkScoreColor(score)
  const label = getDarkScoreLabel(score)

  const sizeClasses = {
    sm: "h-10 w-10 text-sm",
    md: "h-16 w-16 text-xl",
    lg: "h-24 w-24 text-3xl",
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "flex items-center justify-center rounded-full border-2 font-bold",
          sizeClasses[size],
          colorClass,
          score >= 80
            ? "border-emerald-400/30 bg-emerald-400/10"
            : score >= 60
              ? "border-green-400/30 bg-green-400/10"
              : score >= 40
                ? "border-yellow-400/30 bg-yellow-400/10"
                : score >= 20
                  ? "border-orange-400/30 bg-orange-400/10"
                  : "border-red-400/30 bg-red-400/10"
        )}
      >
        {score}
      </div>
      {showLabel && (
        <div className="flex flex-col items-center">
          <span className={cn("text-xs font-semibold", colorClass)}>
            {label}
          </span>
          <span className="text-[10px] text-muted-foreground">Dark Score</span>
        </div>
      )}
    </div>
  )
}
