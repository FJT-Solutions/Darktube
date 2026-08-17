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

export type VideoSource = 'youtube' | 'tiktok' | 'instagram' | 'vimeo' | 'twitter' | 'facebook' | 'dailymotion' | 'twitch' | 'reddit' | 'other'

export interface YouTubeVideo {
  id: string
  title: string
  thumbnail: string
  views: number
  likes: number
  comments: number
  duration: string
  publishedAt?: string | null
  channelId: string
  channelName: string
  description: string
  url: string
  type?: 'video' | 'shorts' | 'live'
  transcript?: string
  aiAnalysis?: string // Stored as JSON string
  source?: VideoSource
  originalUrl?: string
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
  platform: 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'linkedin' | 'twitter' | 'bluesky' | 'threads' | 'pinterest'
  account_id: string
  page_id?: string     // For Facebook Pages and LinkedIn Company Pages
  page_name?: string  // Friendly name of the page (display only)
  label?: string
  created_at: string
}

export interface DarkClip {
  id: string
  user_id?: string
  original_url: string
  platform: string
  video_url: string
  thumbnail_url?: string
  duration: number
  title?: string
  author_name?: string
  author_handle?: string
  author_avatar?: string
  original_caption?: string
  original_metrics?: {
    views?: number
    likes?: number
    comments?: number
    shares?: number
  }
  sanitized: boolean
  created_at: string
}

export interface DarkClipPreset {
  id: string
  user_id?: string
  name: string
  profile_header: {
    avatar_url?: string
    name?: string
    handle?: string
    badge_type?: 'none' | 'blue' | 'gold' | 'gray'
    show_header?: boolean
    padding_top?: number
    scale?: number
    avatar_size?: number
    avatarSize?: number
    font_size?: number
    fontSize?: number
    paddingTop?: number
    textAlign?: 'left' | 'center' | 'right'
    text_align?: 'left' | 'center' | 'right'
    badgeType?: 'none' | 'blue' | 'gold' | 'gray'
    avatarUrl?: string
    showHeader?: boolean
  }
  headline_style: {
    font_family?: string
    fontFamily?: string
    font_size?: number
    fontSize?: number
    main_text_font_size?: number
    mainTextFontSize?: number
    sub_text_font_size?: number
    subTextFontSize?: number
    main_text_font_family?: string
    mainTextFontFamily?: string
    sub_text_font_family?: string
    subTextFontFamily?: string
    primary_color?: string
    primaryColor?: string
    secondary_color?: string
    secondaryColor?: string
    text_align?: 'left' | 'center' | 'right'
    textAlign?: 'left' | 'center' | 'right'
    uppercase?: boolean
    main_text_uppercase?: boolean
    mainTextUppercase?: boolean
    sub_text_uppercase?: boolean
    subTextUppercase?: boolean
    text_shadow?: boolean
    textShadow?: boolean
    main_text_y_offset?: number
    mainTextYOffset?: number
    sub_text_y_offset?: number
    subTextYOffset?: number
    main_text_align?: 'left' | 'center' | 'right'
    mainTextAlign?: 'left' | 'center' | 'right'
    sub_text_align?: 'left' | 'center' | 'right'
    subTextAlign?: 'left' | 'center' | 'right'
    show_main_text?: boolean
    showMainText?: boolean
    show_sub_text?: boolean
    showSubText?: boolean
    mainText?: string
    subText?: string
  }
  video_placement: {
    y_offset?: number // percentage 0 - 100
    yOffset?: number
    scale?: number // percentage 50 - 100
    border_radius?: number // px 0 - 50
    borderRadius?: number
    has_shadow?: boolean
    hasShadow?: boolean
    aspect_ratio?: string // 'auto' | '16:9' | '4:3' | '1:1'
  }
  background_style: {
    type?: 'black' | 'blur' | 'gradient' | 'color' | 'white' | 'neon' | 'zinc'
    blur_intensity?: number // 5 - 50
    overlay_opacity?: number // 0 - 90
    custom_color?: string
  }
  watermark_style?: {
    enabled?: boolean
    type?: 'text' | 'image' | 'both'
    shape?: 'circle' | 'rounded' | 'square'
    text?: string
    imageUrl?: string
    image_url?: string
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom'
    textPosition?: 'right' | 'left' | 'top' | 'bottom'
    text_position?: 'right' | 'left' | 'top' | 'bottom'
    xOffset?: number
    x_offset?: number
    yOffset?: number
    y_offset?: number
    opacity?: number
    fontSize?: number
    font_size?: number
    imageSize?: number
    image_size?: number
    scale?: number
    color?: string
    hasShadow?: boolean
    has_shadow?: boolean
    borderWidth?: number
    border_width?: number
    borderColor?: string
    border_color?: string
  }
  footer_style: {
    show_footer?: boolean
    showFooter?: boolean
    text?: string
    font_size?: number
    fontSize?: number
    color?: string
    y_offset?: number
    yOffset?: number
    text_align?: 'left' | 'center' | 'right'
    textAlign?: 'left' | 'center' | 'right'
    scale?: number
  }
  arrows_style?: DarkClipArrowItem
  arrows_list?: DarkClipArrowItem[]
  is_default?: boolean
  created_at?: string
  updated_at?: string
}

export type DarkClipArrowType = 
  | 'chevron'
  | 'stem'
  | 'block'
  | 'curved'
  | 'pointer'
  | 'target'
  | 'cursor'
  | 'double'
  | 'doodle'
  | 'circle-arrow'

export interface DarkClipArrowItem {
  id?: string
  enabled?: boolean
  arrowType?: DarkClipArrowType
  arrow_type?: DarkClipArrowType
  direction?: 'right' | 'left' | 'up' | 'down' | 'down-right' | 'up-right'
  rotation?: number
  style?: 'bounce' | 'pulse' | 'trail'
  count?: number
  xOffset?: number
  x_offset?: number
  yOffset?: number
  y_offset?: number
  color?: string
  emojiSkinTone?: 'default' | 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark'
  size?: number
  scale?: number
  text?: string
  textColor?: string
  text_color?: string
}

export interface DarkClipPost {
  id: string
  user_id?: string
  clip_id?: string
  title?: string
  rendered_video_url?: string
  remodel_data?: {
    headline_main?: string
    headline_sub?: string
    cta_text?: string
    caption?: string
    hashtags?: string[]
  }
  scheduled_at?: string
  status?: 'draft' | 'rendered' | 'scheduled' | 'publishing' | 'published' | 'failed'
  target_accounts?: string[]
  published_at?: string
  error_message?: string
  created_at?: string
}

