import { pool } from "./db-client"
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
 * Gets insights about a specific niche based on tracked data in PostgreSQL.
 */
export async function getNicheIntelligence(nicheId: string) {
    try {
        const queryText = `
            SELECT 
                c.*,
                m.avg_views_per_video,
                m.estimated_monthly_views,
                m.estimated_revenue,
                m.dark_score
            FROM public.channels c
            LEFT JOIN (
                SELECT DISTINCT ON (channel_id) *
                FROM public.channel_metrics_history
                ORDER BY channel_id, created_at DESC
            ) m ON c.id = m.channel_id
            WHERE c.dark_type = $1
        `
        const { rows } = await pool.query(queryText, [nicheId])

        if (!rows || rows.length === 0) return null

        const totalSubs = rows.reduce((acc: number, ch: any) => acc + Number(ch.subscribers || 0), 0)
        const avgSubs = totalSubs / rows.length

        // Find common tags/keywords
        const allTags = rows.flatMap((ch: any) => ch.tags || [])
        const tagFrequency = allTags.reduce((acc: Record<string, number>, tag: string) => {
            acc[tag] = (acc[tag] || 0) + 1
            return acc
        }, {})

        const topStyles = Object.entries(tagFrequency)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([tag]) => tag)

        return {
            trackedCount: rows.length,
            averageSubscribers: Math.round(avgSubs),
            recommendedStyles: topStyles,
            remodelingGems: rows
                .map((ch: any) => {
                    const metricsObj = ch.avg_views_per_video !== null ? {
                        avgViewsPerVideo: Number(ch.avg_views_per_video || 0),
                        estimatedRevenue: Number(ch.estimated_revenue || 0),
                        darkScore: Number(ch.dark_score || 0),
                        estimatedMonthlyViews: Number(ch.estimated_monthly_views || 0)
                    } : undefined;

                    return {
                        id: ch.id as string,
                        name: ch.name as string,
                        score: calculateRemodelingScore({
                            id: ch.id,
                            name: ch.name,
                            subscribers: Number(ch.subscribers || 0),
                            totalViews: Number(ch.total_views || 0),
                            verified: ch.verified,
                            darkType: ch.dark_type as any,
                            metrics: metricsObj
                        } as any)
                    }
                })
                .sort((a: any, b: any) => b.score - a.score)
                .slice(0, 3)
        }
    } catch (error) {
        console.error("Error in getNicheIntelligence:", error)
        return null
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
