export interface YouTubeChannel {
  id: string
  name: string
  handle: string
  avatar: string
  banner: string
  subscribers: number
  totalViews: number
  estimatedMonthlyViews?: number
  videoCount: number
  description: string
  joinedDate: string
  country: string
  url: string
  verified: boolean
  topicCategories?: string[]
  // Campos de Assertividade
  socialBladeGrade?: string
  reliabilityIndex?: number
  darkType?: ChannelDarkType
  remodelingScore?: number
  remodelingInsight?: string
}

export type ChannelDarkType =
  | "auto-shorts" | "compilation" | "motivation" | "finance"
  | "facts" | "horror" | "news" | "geek" | "vlog"
  | "gaming" | "cooking" | "health" | "pets" | "ai-tech"

export interface DarkScoringFactors {
  engagementRatio: number
  consistencyScore: number
  nicheViability: number
  growthPotential: number
  contentComplexity: number
}

export interface YouTubeVideo {
  id: string
  title: string
  thumbnail: string
  views: number
  likes: number
  comments: number
  duration: string
  publishedAt: string
  channelId: string
  channelName: string
  description: string
  url: string
  type?: 'video' | 'shorts' | 'live'
  transcript?: string
  aiAnalysis?: string // Stored as JSON string
}

export interface ChannelMetrics {
  avgViewsPerVideo: number
  uploadFrequency: string
  uploadsPerMonth: number
  engagementRate: number
  estimatedRevenue: number
  estimatedMonthlyRevenue: number
  darkScore: number
  cpm: number
  growthPotential: number
  estimatedMonthlyViews?: number
}

export interface TrackedChannel extends YouTubeChannel {
  trackedAt: string
  notes: string
  tags: string[]
  metrics?: ChannelMetrics
}

export interface SearchFilters {
  query: string
  niche: string
  minSubscribers: number
  maxSubscribers: number
  minViews: number
  maxViews: number
  language: string
  country: string
  sortBy: "relevance" | "subscribers" | "views" | "date"
}

export interface SearchResult {
  channels: YouTubeChannel[]
  videos: YouTubeVideo[]
  totalResults: number
}

export interface NicheCategory {
  id: string
  label: string
  keywords: string[]
  estimatedCpm: number
  icon: string
  description: string
  growthPotential: number // 1-10
  difficulty: number // 1-10
  revenuePotential: "Low" | "Medium" | "High"
  aiFriendliness: number // 1-10
  aiWorkflow: {
    visuals: string // "Image Generation", "Video Generation", "Stock Footage"
    script: string
    voice: string
  }
}

export interface BlotatoAccount {
  id: string
  user_id: string
  platform: 'instagram' | 'tiktok' | 'youtube'
  account_id: string
  label?: string
  created_at: string
}
