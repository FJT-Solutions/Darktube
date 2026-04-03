import { createClient, createAdminClient } from "./supabase/server"
import type { TrackedChannel, YouTubeChannel, YouTubeVideo, BlotatoAccount } from "./types"

/**
 * UTILS
 */
function toSnakeCase(obj: any) {
    const snake: any = {}
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        snake[snakeKey] = obj[key]
    }
    return snake
}

function fromSnakeCase(obj: any) {
    const camel: any = {}
    for (const key in obj) {
        const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase())
        camel[camelKey] = obj[key]
    }
    return camel
}

/**
 * CHANNELS
 */
export async function getTrackedChannels(userId?: string): Promise<TrackedChannel[]> {
    const supabase = await createClient()
    let query = supabase
        .from('channels')
        .select(`
            *,
            metrics:channel_metrics_history (
                *
            )
        `)
        .order('tracked_at', { ascending: false })
    
    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query
    if (error) {
        if (error.code === '42501') {
            console.warn("[Database] RLS Permission error fetching channels - returning empty list")
            return []
        }
        throw error
    }

    return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        handle: c.handle,
        avatar: c.avatar_url || "",
        banner: c.banner_url || "",
        subscribers: Number(c.subscribers || 0),
        totalViews: Number(c.total_views || 0),
        videoCount: c.video_count || 0,
        description: c.description || "",
        joinedDate: c.joined_date || "",
        country: c.country || "",
        url: c.url || "",
        verified: c.verified,
        topicCategories: c.topic_categories || [],
        darkType: c.dark_type as any,
        notes: c.notes || "",
        tags: c.tags || [],
        trackedAt: c.tracked_at,
        metrics: c.metrics && c.metrics[0] ? {
            avgViewsPerVideo: c.metrics[0].avg_views_per_video || 0,
            uploadFrequency: "",
            uploadsPerMonth: 0,
            engagementRate: 0,
            estimatedRevenue: c.metrics[0].estimated_revenue || 0,
            estimatedMonthlyRevenue: 0,
            darkScore: c.metrics[0].dark_score || 0,
            cpm: 0,
            growthPotential: 0,
            estimatedMonthlyViews: Number(c.metrics[0].estimated_monthly_views || 0)
        } : undefined
    }))
}

export async function ensureChannelExists(channel: YouTubeChannel, userId?: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('channels')
        .upsert({
            id: channel.id,
            name: channel.name,
            handle: channel.handle,
            avatar_url: channel.avatar,
            banner_url: channel.banner,
            subscribers: channel.subscribers,
            total_views: channel.totalViews,
            video_count: channel.videoCount,
            description: channel.description,
            joined_date: channel.joinedDate || null,
            country: channel.country,
            url: channel.url,
            topic_categories: channel.topicCategories || [],
            user_id: userId || null
        })
    
    if (error) throw error
}

export async function saveTrackedChannel(channel: TrackedChannel, userId?: string): Promise<void> {
    const supabase = await createClient()
    
    // 1. Upsert Channel
    const { error: channelError } = await supabase
        .from('channels')
        .upsert({
            id: channel.id,
            name: channel.name,
            handle: channel.handle,
            avatar_url: channel.avatar,
            banner_url: channel.banner,
            subscribers: channel.subscribers,
            total_views: channel.totalViews,
            video_count: channel.videoCount,
            description: channel.description,
            joined_date: channel.joinedDate || null,
            country: channel.country,
            url: channel.url,
            verified: channel.verified,
            topic_categories: channel.topicCategories || [],
            dark_type: channel.darkType,
            notes: channel.notes,
            tags: channel.tags || [],
            user_id: userId || null
        })

    if (channelError) throw channelError

    // 2. Save Metrics History
    if (channel.metrics) {
        const { error: metricsError } = await supabase
            .from('channel_metrics_history')
            .insert({
                channel_id: channel.id,
                subscribers: channel.subscribers,
                total_views: channel.totalViews,
                avg_views_per_video: channel.metrics.avgViewsPerVideo,
                estimated_monthly_views: channel.metrics.estimatedMonthlyViews || 0,
                estimated_revenue: channel.metrics.estimatedRevenue,
                dark_score: channel.metrics.darkScore,
            })
        
        if (metricsError) throw metricsError
    }
}

export async function removeTrackedChannel(channelId: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId)
    
    if (error) throw error
}

export async function isChannelTracked(channelId: string, userId?: string): Promise<boolean> {
    const supabase = await createClient()
    let query = supabase
        .from('channels')
        .select('id', { count: 'exact', head: true })
        .eq('id', channelId)
    
    if (userId) query = query.eq('user_id', userId)

    const { count, error } = await query
    if (error) {
        if (error.code === '42501') {
            // Se der erro de permissão, significa que o canal não pertence ao usuário (ou não está rastreado)
            // Retornamos false em vez de estourar erro 500
            return false
        }
        throw error
    }
    return (count || 0) > 0
}

export async function updateChannelNotes(channelId: string, notes: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('channels')
        .update({ notes })
        .eq('id', channelId)
    
    if (error) throw error
}

export async function updateChannelTags(channelId: string, tags: string[]): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('channels')
        .update({ tags })
        .eq('id', channelId)
    
    if (error) throw error
}

/**
 * VIDEOS
 */
export async function updateVideoAnalysis(video: YouTubeVideo, transcript: string, aiAnalysis: string, userId?: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('videos')
        .upsert({
            id: video.id,
            channel_id: video.channelId || null,
            title: video.title,
            thumbnail_url: video.thumbnail,
            views: video.views,
            duration: video.duration,
            published_at: video.publishedAt || null,
            transcript,
            ai_analysis: aiAnalysis ? JSON.parse(aiAnalysis) : null,
            user_id: userId || null
        })
    
    if (error) throw error
}

/**
 * SETTINGS & API KEYS (Using the new secure RPCs)
 */
export async function upsertUserApiKey(userId: string, provider: string, key: string) {
    const supabase = await createClient()
    const { error } = await supabase.rpc('upsert_api_key', {
        p_user_id: userId,
        p_provider: provider,
        p_key: key
    })
    if (error) throw error
}

export async function getUserApiKey(userId: string, provider: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_api_key', {
        p_user_id: userId,
        p_provider: provider
    })
    if (error) throw error
    return data as string
}

/**
 * NICHES (Extended intelligence)
 */
export async function getDetailedNiches() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('niches')
        .select('*')
        .order('label')
    
    if (error) throw error
    return data
}
export async function updateProfileStatus(email: string, status: 'pending' | 'approved' | 'rejected' | 'blocked') {
    const supabase = await createClient()
    const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('email', email)
    
    if (error) throw error
    return { success: true }
}

export async function deleteProfile(userId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
    
    if (error) throw error
    return { success: true }
}

export async function getAllProfiles() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
}

export async function updateProfileRole(userId: string, role: 'admin' | 'user') {
    const supabase = await createClient()
    const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
    
    if (error) throw error
    return { success: true }
}

/**
 * BLOTATO ACCOUNTS
 */
export async function getBlotatoAccounts(userId: string): Promise<BlotatoAccount[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('blotato_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
}

export async function addBlotatoAccount(userId: string, platform: string, accountId: string, label?: string, pageId?: string, pageName?: string, avatarUrl?: string): Promise<BlotatoAccount> {
    const supabase = await createClient()
    
    // We use upsert to avoid Unique Violation (23505) and update existing records
    // Assuming conflict on user_id, platform, account_id, and page_id after SQL fix
    const { data, error } = await supabase
        .from('blotato_accounts')
        .upsert({
            user_id: userId,
            platform,
            account_id: accountId.toString(),
            label,
            page_id: pageId?.toString() || '',
            page_name: pageName || null,
            avatar_url: avatarUrl || null,
        }, {
            onConflict: 'user_id,platform,account_id,page_id'
        })
        .select()
    
    if (error) {
        console.error("Supabase upsert error:", error)
        throw error
    }
    
    return data && data.length > 0 ? data[0] : null as any
}

export async function removeBlotatoAccount(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('blotato_accounts')
        .delete()
        .eq('id', id)
    
    if (error) throw error
    return { success: true }
}

/**
 * REMODELING TEMPLATES
 */
export interface RemodelingTemplateEntity {
    id: string;
    user_id: string;
    video_id: string;
    video_title?: string;
    video_thumbnail?: string;
    name: string;
    template_data: any;
    generated_script?: string;
    format: 'horizontal' | 'vertical';
    has_music: boolean;
    music_style?: string;
    voice_type?: string;
    post_frequency: string;
    post_interval_days?: number;
    post_times?: string[];
    last_dispatched_at?: string;
    is_active: boolean;
    target_accounts: string[];
    tags: string[];
    created_at: string;
    updated_at: string;
}

export interface ProductionHistoryEntity {
    id: string;
    template_id: string;
    original_video_id: string;
    dispatched_at: string;
    payload: any;
    status: string;
    video_url?: string | null;
}

export async function saveRemodelingTemplate(
    userId: string,
    data: Omit<RemodelingTemplateEntity, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<RemodelingTemplateEntity> {
    const supabase = await createClient()
    if (!supabase) throw new Error("Client not available")
    const { data: inserted, error } = await supabase
        .from('remodeling_templates')
        .insert({
            user_id: userId,
            ...data
        })
        .select()
        .single()
    
    if (error) throw error
    return inserted
}

export async function getRemodelingTemplates(userId: string): Promise<RemodelingTemplateEntity[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('remodeling_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
}

export async function getRemodelingTemplateById(id: string): Promise<RemodelingTemplateEntity> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('remodeling_templates')
        .select('*')
        .eq('id', id)
        .single()
    
    if (error) throw error
    return data
}

export async function deleteRemodelingTemplate(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('remodeling_templates')
        .delete()
        .eq('id', id)
    
    if (error) throw error
    return { success: true }
}

export async function updateRemodelingTemplateStatus(id: string, isActive: boolean) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('remodeling_templates')
        .update({ is_active: isActive })
        .eq('id', id)
    
    if (error) throw error
    return { success: true }
}

export async function getRecentVideos(limit = 12): Promise<YouTubeVideo[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('videos')
        .select(`
            id, title, views, published_at, duration, thumbnail_url, channel_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching recent videos:', error)
        return []
    }

    return data.map((v: any) => ({
        id: v.id,
        title: v.title,
        views: v.views || 0,
        likes: 0,
        comments: 0,
        publishedAt: v.published_at,
        duration: v.duration,
        thumbnail: v.thumbnail_url,
        channelId: v.channel_id || '',
        channelName: 'Externo', // Defaulting to 'Externo', we could join channels table if needed
        source: 'youtube',
        url: `https://youtube.com/watch?v=${v.id}`,
        description: ''
    }))
}

export async function saveProductionHistory(data: Omit<ProductionHistoryEntity, 'id' | 'dispatched_at'>) {
    const supabase = await createClient()
    const { data: inserted, error } = await supabase
        .from('remodeling_history')
        .insert(data)
        .select()
        .single()
    
    if (error) throw error
    return inserted
}

export async function getProductionHistory(templateId: string): Promise<ProductionHistoryEntity[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('remodeling_history')
        .select('*')
        .eq('template_id', templateId)
        .order('dispatched_at', { ascending: false })
    
    if (error) throw error
    return data || []
}

export async function getTemplatesScheduledFor(timeStr: string): Promise<RemodelingTemplateEntity[]> {
    const supabase = await createClient()
    // Using a JSON query to find the time string in the post_times array
    const { data, error } = await supabase
        .from('remodeling_templates')
        .select('*')
        .eq('is_active', true)
        .contains('post_times', [timeStr])
    
    if (error) throw error
    return data || []
}

