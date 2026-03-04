import type { YouTubeChannel, YouTubeVideo, ChannelMetrics } from "./types"
import { NICHES } from "./constants"

export function calculateMetrics(
  channel: YouTubeChannel,
  videos: YouTubeVideo[]
): ChannelMetrics {
  const avgViewsPerVideo =
    videos.length > 0
      ? Math.round(videos.reduce((sum, v) => sum + v.views, 0) / videos.length)
      : channel.videoCount > 0
        ? Math.round(channel.totalViews / channel.videoCount)
        : 0

  const { frequency, uploadsPerMonth } = calculateUploadFrequency(videos)

  const engagementRate = calculateEngagementRate(videos)

  const { growthPotential, viewsLast28Days } = calculateGrowthPotential(channel, videos)
  const cpm = estimateCpm(channel, videos)

  // Refined RMF: Uses 0.05 factor for active channels or viewsLast28Days if available
  const estimatedMonthlyViews = viewsLast28Days > 0 ? viewsLast28Days : Math.round(channel.totalViews * 0.05)
  const estimatedMonthlyRevenue = Math.round((estimatedMonthlyViews / 1000) * cpm)
  const estimatedRevenue = Math.round((channel.totalViews / 1000) * cpm)

  const darkScore = calculateDarkScore(channel, videos, {
    avgViewsPerVideo,
    uploadFrequency: frequency,
    uploadsPerMonth,
    engagementRate,
    estimatedRevenue,
    estimatedMonthlyRevenue,
    darkScore: 0,
    cpm,
  })

  return {
    avgViewsPerVideo,
    uploadFrequency: frequency,
    uploadsPerMonth,
    engagementRate,
    estimatedRevenue,
    estimatedMonthlyRevenue,
    darkScore,
    cpm,
    growthPotential,
  }
}

function calculateGrowthPotential(
  channel: YouTubeChannel,
  videos: YouTubeVideo[]
): { growthPotential: number; viewsLast28Days: number } {
  const now = new Date()
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)

  const viewsLast28Days = videos
    .filter((v) => new Date(v.publishedAt) >= twentyEightDaysAgo)
    .reduce((sum, v) => sum + v.views, 0)

  if (channel.totalViews === 0) return { growthPotential: 0, viewsLast28Days }

  // Growth Potential = (Views last 28 days / Total Views) * 100
  // Note: Since we only have a sample of videos, this is an estimate
  // If we have actual viewsLast28Days from API, we use it directly
  const growthPotential = Math.round((viewsLast28Days / channel.totalViews) * 100 * 10) / 10

  return { growthPotential, viewsLast28Days }
}

function calculateUploadFrequency(videos: YouTubeVideo[]): {
  frequency: string
  uploadsPerMonth: number
} {
  if (videos.length < 2) {
    return { frequency: "Indeterminado", uploadsPerMonth: 0 }
  }

  const sortedVideos = [...videos].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )

  const firstDate = new Date(sortedVideos[sortedVideos.length - 1].publishedAt)
  const lastDate = new Date(sortedVideos[0].publishedAt)
  const daysDiff = Math.max(
    1,
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  const uploadsPerMonth = Math.round((videos.length / daysDiff) * 30)

  let frequency: string
  if (uploadsPerMonth >= 28) {
    frequency = "Diario"
  } else if (uploadsPerMonth >= 12) {
    frequency = "3x por semana"
  } else if (uploadsPerMonth >= 8) {
    frequency = "2x por semana"
  } else if (uploadsPerMonth >= 4) {
    frequency = "Semanal"
  } else if (uploadsPerMonth >= 2) {
    frequency = "Quinzenal"
  } else if (uploadsPerMonth >= 1) {
    frequency = "Mensal"
  } else {
    frequency = "Irregular"
  }

  return { frequency, uploadsPerMonth }
}

function calculateEngagementRate(videos: YouTubeVideo[]): number {
  if (videos.length === 0) return 0

  const totalEngagement = videos.reduce(
    (sum, v) => sum + v.likes + v.comments,
    0
  )
  const totalViews = videos.reduce((sum, v) => sum + v.views, 0)

  if (totalViews === 0) return 0

  return Math.round((totalEngagement / totalViews) * 10000) / 100
}

const COUNTRY_MULTIPLIERS: Record<string, number> = {
  US: 1.0,  // United States
  GB: 1.0,  // United Kingdom
  CA: 1.0,  // Canada
  AU: 1.0,  // Australia
  DE: 1.0,  // Germany
  CH: 1.0,  // Switzerland
  PT: 0.7,  // Portugal
  ES: 0.7,  // Spain
  IT: 0.7,  // Italy
  BR: 0.45, // Brazil
  MX: 0.45, // Mexico
  IN: 0.4,  // India (Lower average CPM)
}

function estimateCpm(
  channel: YouTubeChannel,
  videos: YouTubeVideo[]
): number {
  const allText = [
    channel.name,
    channel.description,
    ...videos.map((v) => v.title),
  ]
    .join(" ")
    .toLowerCase()

  let bestMatch: { cpm: number; score: number } = { cpm: 4, score: 0 }

  for (const niche of NICHES) {
    let score = 0
    for (const keyword of niche.keywords) {
      if (allText.includes(keyword.toLowerCase())) {
        score++
      }
    }
    if (score > bestMatch.score) {
      bestMatch = { cpm: niche.estimatedCpm, score }
    }
  }

  const baseCpm = bestMatch.cpm
  const countryMultiplier = channel.country ? (COUNTRY_MULTIPLIERS[channel.country] || 0.5) : 0.5

  return Math.round(baseCpm * countryMultiplier * 10) / 10
}

function calculateDarkScore(
  channel: YouTubeChannel,
  videos: YouTubeVideo[],
  metrics: ChannelMetrics
): number {
  let score = 0

  // 1. Potencial de Crescimento (0-30 pontos) - Peso aumentado conforme relatório 2026
  // Growth Potential de 5% ou mais em 28 dias é excelente para canais dark
  if (metrics.growthPotential >= 10) score += 30
  else if (metrics.growthPotential >= 5) score += 25
  else if (metrics.growthPotential >= 2) score += 15
  else if (metrics.growthPotential >= 1) score += 10
  else if (metrics.growthPotential > 0) score += 5

  // 2. Recência e Consistência (0-20 pontos)
  if (videos.length > 0) {
    const sortedVideos = [...videos].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    const latestVideo = new Date(sortedVideos[0].publishedAt)
    const daysSinceLastUpload = (new Date().getTime() - latestVideo.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceLastUpload <= 7) score += 20
    else if (daysSinceLastUpload <= 14) score += 15
    else if (daysSinceLastUpload <= 30) score += 10
    else if (daysSinceLastUpload <= 60) score += 5
  }

  // 3. Frequencia de upload (0-25 pontos)
  if (metrics.uploadsPerMonth >= 12) score += 25
  else if (metrics.uploadsPerMonth >= 8) score += 20
  else if (metrics.uploadsPerMonth >= 4) score += 15
  else if (metrics.uploadsPerMonth >= 2) score += 10
  else if (metrics.uploadsPerMonth >= 1) score += 5

  // 4. Escala de Monetização (0-25 pontos)
  if (metrics.estimatedMonthlyRevenue >= 10000) score += 25
  else if (metrics.estimatedMonthlyRevenue >= 5000) score += 20
  else if (metrics.estimatedMonthlyRevenue >= 2000) score += 15
  else if (metrics.estimatedMonthlyRevenue >= 1000) score += 10
  else if (metrics.estimatedMonthlyRevenue >= 500) score += 5

  return Math.min(100, Math.round(score))
}

export function formatNumber(num: number): string {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + "B"
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toString()
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCurrencyUSD(value: number): string {
  return "$" + new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatBRNumber(num: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Math.round(num))
}

export function getDarkScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400"
  if (score >= 60) return "text-green-400"
  if (score >= 40) return "text-yellow-400"
  if (score >= 20) return "text-orange-400"
  return "text-red-400"
}

export function getDarkScoreLabel(score: number): string {
  if (score >= 80) return "Excelente"
  if (score >= 60) return "Bom"
  if (score >= 40) return "Moderado"
  if (score >= 20) return "Baixo"
  return "Fraco"
}
