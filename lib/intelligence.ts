import { db } from "./db"
import type { YouTubeChannel, TrackedChannel } from "./types"
import { NICHES } from "./constants"

/**
 * Calculates a 'Remodeling Potential' score (0-100) for a channel.
 * Higher scores mean the channel is a great candidate for remodeling
 * (high revenue, low complexity, proven niche).
 */
export function calculateRemodelingScore(channel: YouTubeChannel | TrackedChannel): number {
    let score = 0

    // 1. Dark Score (30%)
    const darkScore = channel.darkType ? (channel as any).darkScore || 50 : 50
    score += (darkScore * 0.3)

    // 2. Revenue Efficiency (30%)
    // We look for channels that make good money relative to their size
    if (channel.subscribers > 0) {
        const monthlyViews = (channel as any).estimatedMonthlyViews || (channel.totalViews * 0.02)
        const efficiency = (monthlyViews / channel.subscribers)
        // Normalize efficiency: 1 view per sub per month is very good (100 pts)
        const efficiencyScore = Math.min(efficiency * 100, 100)
        score += (efficiencyScore * 0.3)
    }

    // 3. Profitability (20%)
    // Based on the niche CPM
    const niche = NICHES.find(n => n.id === (channel as any).darkType)
    const cpm = niche?.estimatedCpm || 2
    const profitabilityScore = Math.min((cpm / 15) * 100, 100) // normalized to 15$ max cpm
    score += (profitabilityScore * 0.2)

    // 4. Verification & Reliability (20%)
    if (channel.verified) score += 10
    if (channel.subscribers > 100000) score += 10

    return Math.round(score)
}

/**
 * Gets insights about a specific niche based on tracked data in the database.
 */
export async function getNicheIntelligence(nicheId: string) {
    const trackedChannels = await db.channel.findMany({
        where: { darkType: nicheId },
        include: { videos: true }
    })

    if (trackedChannels.length === 0) return null

    const totalSubs = trackedChannels.reduce((acc, ch) => acc + Number(ch.subscribers || 0), 0)
    const avgSubs = totalSubs / trackedChannels.length

    // Find common tags/keywords
    const allTags = trackedChannels.flatMap(ch => ch.tags ? JSON.parse(ch.tags) : [])
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
            .map(ch => ({
                id: ch.id,
                name: ch.name,
                score: calculateRemodelingScore(ch as any)
            }))
            .sort((a, b) => b.score - a.score)
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
