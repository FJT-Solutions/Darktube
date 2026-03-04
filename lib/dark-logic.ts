import { YouTubeChannel, YouTubeVideo, NicheCategory, ChannelDarkType, DarkScoringFactors } from "./types"
import { NICHES } from "./constants"

/**
 * Classifica o tipo de canal Dark baseado em palavras-chave e metadados
 */
export function classifyChannelType(channel: YouTubeChannel, videos: YouTubeVideo[] = []): ChannelDarkType {
    const fullText = `${channel.name} ${channel.description} ${videos.map(v => v.title).join(" ")}`.toLowerCase()

    if (fullText.includes("short") || fullText.includes("clip") || fullText.includes("viral")) return "auto-shorts"
    if (fullText.includes("motiva") || fullText.includes("inspira") || fullText.includes("sucesso")) return "motivation"
    if (fullText.includes("finance") || fullText.includes("invest") || fullText.includes("dinheiro") || fullText.includes("riqueza")) return "finance"
    if (fullText.includes("curiosi") || fullText.includes("fatos") || fullText.includes("misterio")) return "facts"
    if (fullText.includes("horror") || fullText.includes("terror") || fullText.includes("medo")) return "horror"
    if (fullText.includes("noticia") || fullText.includes("news") || fullText.includes("atualidade")) return "news"
    if (fullText.includes("geek") || fullText.includes("anime") || fullText.includes("filme") || fullText.includes("serie")) return "geek"
    if (fullText.includes("vlog") || fullText.includes("viagem") || fullText.includes("travel")) return "vlog"
    if (fullText.includes("game") || fullText.includes("play") || fullText.includes("stream")) return "gaming"
    if (fullText.includes("culinaria") || fullText.includes("receita") || fullText.includes("cozinha")) return "cooking"
    if (fullText.includes("saude") || fullText.includes("treino") || fullText.includes("fitness")) return "health"
    if (fullText.includes("pet") || fullText.includes("animal") || fullText.includes("cachorro") || fullText.includes("gato")) return "pets"
    if (fullText.includes("ia ") || fullText.includes("inteligencia artificial") || fullText.includes("tech")) return "ai-tech"

    return "compilation" // Fallback
}

/**
 * Retorna o CPM estimado baseado na categoria do canal
 */
export function getCPMByNiche(type: ChannelDarkType): number {
    const cpmMap: Record<string, number> = {
        "finance": 15,
        "ai-tech": 12,
        "health": 10,
        "news": 8,
        "motivation": 7,
        "facts": 7,
        "geek": 6,
        "horror": 6,
        "cooking": 6,
        "gaming": 5,
        "pets": 5,
        "vlog": 5,
        "auto-shorts": 4,
        "compilation": 4
    }
    return cpmMap[type] || 8
}

/**
 * Motor de Dark Score (0-100)
 * Avalia se o canal é bom para replicação via IA
 */
export function calculateDarkScore(channel: YouTubeChannel, videos: YouTubeVideo[]): { score: number; factors: DarkScoringFactors } {
    const factors: DarkScoringFactors = {
        engagementRatio: 0,
        consistencyScore: 0,
        nicheViability: 0,
        growthPotential: 0,
        contentComplexity: 0
    }

    // 1. Engajamento (Inscritos / Views Totais) - Ideal entre 0.1% e 1%
    const engagement = (channel.subscribers / (channel.totalViews || 1)) * 1000
    factors.engagementRatio = Math.min(25, (engagement / 5) * 25)

    // 2. Consistência (Baseado no histórico recente)
    if (videos.length > 0) {
        const dates = videos.map(v => new Date(v.publishedAt).getTime()).sort((a, b) => b - a)
        const recentGap = (Date.now() - dates[0]) / (1000 * 60 * 60 * 24)
        factors.consistencyScore = Math.max(0, 25 - (recentGap / 7) * 5)
    }

    // 3. Viabilidade de Nicho (Baseado no tipo)
    const type = classifyChannelType(channel, videos)
    const viabilityMap: Record<string, number> = {
        "auto-shorts": 25,
        "facts": 22,
        "motivation": 20,
        "horror": 18,
        "finance": 15,
        "ai-tech": 25
    }
    factors.nicheViability = viabilityMap[type] || 15

    // 4. Potencial de Crescimento (Canais menores com muitas views por vídeo crescem mais rápido)
    const avgViews = channel.totalViews / (channel.videoCount || 1)
    factors.growthPotential = Math.min(25, (avgViews / 100000) * 25)

    const score = Math.min(100, Math.round(
        factors.engagementRatio +
        factors.consistencyScore +
        factors.nicheViability +
        factors.growthPotential
    ))

    return { score, factors }
}

/**
 * Traduz o grau do SocialBlade para o nosso sistema
 */
export function getSocialBladeGrade(channel: YouTubeChannel): string {
    const views = channel.totalViews
    if (views > 1000000000) return "A++"
    if (views > 500000000) return "A+"
    if (views > 100000000) return "A"
    if (views > 50000000) return "A-"
    if (views > 10000000) return "B+"
    if (views > 5000000) return "B"
    if (views > 1000000) return "B-"
    return "C+"
}
