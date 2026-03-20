import { createClient } from "./supabase/server"
import type { YouTubeChannel, TrackedChannel } from "./types"
import { NICHES } from "./constants"

/**
 * Calculates a 'Remodeling Potential' score (0-100) for a channel.
 */
export function calculateRemodelingScore(channel: YouTubeChannel | TrackedChannel): number {
    let score = 0

    // 1. Dark Score (30%)
    const darkScore = (channel as any).metrics?.darkScore || (channel as any).darkScore || 50
    score += (darkScore * 0.3)

    // 2. Revenue Efficiency (30%)
    if (channel.subscribers > 0) {
        const monthlyViews = (channel as any).metrics?.estimatedMonthlyViews || (channel.totalViews * 0.02)
        const efficiency = (monthlyViews / channel.subscribers)
        const efficiencyScore = Math.min(efficiency * 100, 100)
        score += (efficiencyScore * 0.3)
    }

    // 3. Profitability (20%)
    const niche = NICHES.find(n => n.id === (channel as any).darkType)
    const cpm = niche?.estimatedCpm || 2
    const profitabilityScore = Math.min((cpm / 15) * 100, 100)
    score += (profitabilityScore * 0.2)

    // 4. Verification & Reliability (20%)
    if (channel.verified) score += 10
    if (channel.subscribers > 100000) score += 10

    return Math.round(score)
}

/**
 * Gets insights about a specific niche based on tracked data in Supabase.
 */
export async function getNicheIntelligence(nicheId: string) {
    const supabase = await createClient()
    const { data: trackedChannels, error } = await supabase
        .from('channels')
        .select(`
            *,
            videos ( * ),
            metrics:channel_metrics_history ( * )
        `)
        .eq('dark_type', nicheId)

    if (error || !trackedChannels || trackedChannels.length === 0) return null

    const totalSubs = trackedChannels.reduce((acc: number, ch: any) => acc + Number(ch.subscribers || 0), 0)
    const avgSubs = totalSubs / trackedChannels.length

    // Find common tags/keywords
    const allTags = trackedChannels.flatMap((ch: any) => ch.tags || [])
    const tagFrequency = allTags.reduce((acc: Record<string, number>, tag: string) => {
        acc[tag] = (acc[tag] || 0) + 1
        return acc
    }, {})

    const topStyles = Object.entries(tagFrequency)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([tag]) => tag)

    return {
        trackedCount: trackedChannels.length,
        averageSubscribers: Math.round(avgSubs),
        recommendedStyles: topStyles,
        remodelingGems: trackedChannels
            .map((ch: any) => ({
                id: ch.id as string,
                name: ch.name as string,
                score: calculateRemodelingScore({
                    ...ch,
                    metrics: ch.metrics?.[0]
                } as any)
            }))
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 3)
    }
}

/**
 * Enriches search results with intelligence data.
 */
export function getRemodelingInsight(channel: YouTubeChannel): string {
    const score = calculateRemodelingScore(channel)
    if (score > 80) return "🔥 Alta Viabilidade: Excelente modelo para remodelagem."
    if (score > 60) return "✅ Boa Oportunidade: Estilo de crescimento sólido."
    if (score > 40) return "📊 Estável: Requer análise de nicho mais profunda."
    return "⚠️ Baixo Potencial: Modelo de difícil replicação ou baixo retorno."
}
