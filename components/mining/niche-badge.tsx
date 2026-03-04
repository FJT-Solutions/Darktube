import { Badge } from "@/components/ui/badge"
import { NicheCategory } from "@/lib/types"
import { TrendingUp, DollarSign, Zap, Brain } from "lucide-react"

interface NicheBadgeProps {
    niche: NicheCategory
    showMetrics?: boolean
}

export function NicheBadge({ niche, showMetrics = false }: NicheBadgeProps) {
    const isHighProfit = niche.revenuePotential === "High" || niche.estimatedCpm >= 8
    const isHighGrowth = niche.growthPotential >= 8

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="text-sm font-semibold truncate max-w-[140px]" title={niche.label}>
                    {niche.label}
                </span>
                <div className="flex flex-wrap gap-1">
                    {isHighProfit && (
                        <Badge variant="default" className="bg-emerald-500/10 text-[0.5rem] text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 px-1.5 py-0 whitespace-nowrap">
                            <DollarSign className="h-2.5 w-2.5 mr-0.5" />
                            Lucrativo
                        </Badge>
                    )}
                    {isHighGrowth && (
                        <Badge variant="default" className="bg-blue-500/10 text-[0.5rem] text-blue-500 hover:bg-blue-500/20 border-blue-500/20 px-1.5 py-0 whitespace-nowrap">
                            <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                            Em Alta
                        </Badge>
                    )}
                </div>
            </div>
            {showMetrics && (
                <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Zap className="h-2.5 w-2.5" />
                            CPM: ${niche.estimatedCpm}
                        </span>
                        <span>Dificuldade: {niche.difficulty}/10</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-amber-500/80">
                        <Brain className="h-2.5 w-2.5" />
                        AI Friendly: {niche.aiFriendliness}/10
                    </div>
                </div>
            )}
        </div>
    )
}
