import { pool } from "./db-client"
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
    let queryText = `
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
    `
    const params: any[] = []
    
    if (userId) {
        queryText += ` WHERE c.user_id = $1`
        params.push(userId)
    }
    
    queryText += ` ORDER BY c.tracked_at DESC`
    
    const { rows } = await pool.query(queryText, params)
    
    return rows.map((c: any) => ({
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
        metrics: c.avg_views_per_video !== null ? {
            avgViewsPerVideo: Number(c.avg_views_per_video || 0),
            uploadFrequency: "",
            uploadsPerMonth: 0,
            engagementRate: 0,
            estimatedRevenue: Number(c.estimated_revenue || 0),
            estimatedMonthlyRevenue: 0,
            darkScore: Number(c.dark_score || 0),
            cpm: 0,
            growthPotential: 0,
            estimatedMonthlyViews: Number(c.estimated_monthly_views || 0)
        } : undefined
    }))
}

export async function ensureChannelExists(channel: YouTubeChannel, userId?: string): Promise<void> {
    await pool.query(`
        INSERT INTO public.channels (
            id, name, handle, avatar_url, banner_url, subscribers, total_views, video_count, 
            description, joined_date, country, url, topic_categories, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            handle = EXCLUDED.handle,
            avatar_url = EXCLUDED.avatar_url,
            banner_url = EXCLUDED.banner_url,
            subscribers = EXCLUDED.subscribers,
            total_views = EXCLUDED.total_views,
            video_count = EXCLUDED.video_count,
            description = EXCLUDED.description,
            joined_date = EXCLUDED.joined_date,
            country = EXCLUDED.country,
            url = EXCLUDED.url,
            topic_categories = EXCLUDED.topic_categories
    `, [
        channel.id, channel.name, channel.handle, channel.avatar, channel.banner || null,
        channel.subscribers, channel.totalViews, channel.videoCount, channel.description || null,
        channel.joinedDate || null, channel.country || null, channel.url || null,
        channel.topicCategories || [], userId || null
    ])
}

export async function saveTrackedChannel(channel: TrackedChannel, userId?: string): Promise<void> {
    // 1. Upsert Channel
    await pool.query(`
        INSERT INTO public.channels (
            id, name, handle, avatar_url, banner_url, subscribers, total_views, video_count, 
            description, joined_date, country, url, verified, topic_categories, dark_type, notes, tags, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            handle = EXCLUDED.handle,
            avatar_url = EXCLUDED.avatar_url,
            banner_url = EXCLUDED.banner_url,
            subscribers = EXCLUDED.subscribers,
            total_views = EXCLUDED.total_views,
            video_count = EXCLUDED.video_count,
            description = EXCLUDED.description,
            joined_date = EXCLUDED.joined_date,
            country = EXCLUDED.country,
            url = EXCLUDED.url,
            verified = EXCLUDED.verified,
            topic_categories = EXCLUDED.topic_categories,
            dark_type = EXCLUDED.dark_type,
            notes = EXCLUDED.notes,
            tags = EXCLUDED.tags
    `, [
        channel.id, channel.name, channel.handle, channel.avatar, channel.banner || null,
        channel.subscribers, channel.totalViews, channel.videoCount, channel.description || null,
        channel.joinedDate || null, channel.country || null, channel.url || null,
        channel.verified || false, channel.topicCategories || [], channel.darkType || null,
        channel.notes || null, channel.tags || [], userId || null
    ])

    // 2. Save Metrics History
    if (channel.metrics) {
        await pool.query(`
            INSERT INTO public.channel_metrics_history (
                channel_id, subscribers, total_views, avg_views_per_video, 
                estimated_monthly_views, estimated_revenue, dark_score
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            channel.id, channel.subscribers, channel.totalViews, channel.metrics.avgViewsPerVideo,
            channel.metrics.estimatedMonthlyViews || 0, channel.metrics.estimatedRevenue, channel.metrics.darkScore
        ])
    }
}

export async function removeTrackedChannel(channelId: string): Promise<void> {
    await pool.query('DELETE FROM public.channels WHERE id = $1', [channelId])
}

export async function isChannelTracked(channelId: string, userId?: string): Promise<boolean> {
    let queryText = 'SELECT 1 FROM public.channels WHERE id = $1'
    const params: any[] = [channelId]
    
    if (userId) {
        queryText += ' AND user_id = $2'
        params.push(userId)
    }
    
    const { rows } = await pool.query(queryText, params)
    return rows.length > 0
}

export async function updateChannelNotes(channelId: string, notes: string): Promise<void> {
    await pool.query('UPDATE public.channels SET notes = $1 WHERE id = $2', [notes, channelId])
}

export async function updateChannelTags(channelId: string, tags: string[]): Promise<void> {
    await pool.query('UPDATE public.channels SET tags = $1 WHERE id = $2', [tags, channelId])
}

/**
 * VIDEOS
 */
export async function updateVideoAnalysis(video: YouTubeVideo, transcript: string, aiAnalysis: string, userId?: string): Promise<void> {
    await pool.query(`
        INSERT INTO public.videos (
            id, channel_id, title, thumbnail_url, views, duration, published_at, transcript, ai_analysis, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
            channel_id = EXCLUDED.channel_id,
            title = EXCLUDED.title,
            thumbnail_url = EXCLUDED.thumbnail_url,
            views = EXCLUDED.views,
            duration = EXCLUDED.duration,
            published_at = EXCLUDED.published_at,
            transcript = EXCLUDED.transcript,
            ai_analysis = EXCLUDED.ai_analysis
    `, [
        video.id, video.channelId || null, video.title, video.thumbnail, video.views || 0,
        video.duration, video.publishedAt || null, transcript, aiAnalysis ? JSON.parse(aiAnalysis) : null, userId || null
    ])
}

/**
 * SETTINGS & API KEYS (Substitui os RPCs do Supabase)
 */
export async function upsertUserApiKey(userId: string, provider: string, key: string) {
    await pool.query(`
        INSERT INTO public.user_api_keys (user_id, provider, key)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, provider)
        DO UPDATE SET key = EXCLUDED.key, updated_at = NOW()
    `, [userId, provider, key])
}

export async function getUserApiKey(userId: string, provider: string): Promise<string> {
    const { rows } = await pool.query(
        'SELECT key FROM public.user_api_keys WHERE user_id = $1 AND provider = $2',
        [userId, provider]
    )
    return rows[0]?.key || ''
}

/**
 * NICHES
 */
export async function getDetailedNiches() {
    const { rows } = await pool.query('SELECT * FROM public.niches ORDER BY label')
    return rows
}

/**
 * PROFILES (Atualiza a tabela users unificada)
 */
export async function updateProfileStatus(email: string, status: 'pending' | 'approved' | 'rejected' | 'blocked') {
    await pool.query('UPDATE public.users SET status = $1 WHERE email = $2', [status, email])
    return { success: true }
}

export async function deleteProfile(userId: string) {
    await pool.query('DELETE FROM public.users WHERE id = $1', [userId])
    return { success: true }
}

export async function getAllProfiles() {
    const { rows } = await pool.query('SELECT * FROM public.users ORDER BY created_at DESC')
    return rows
}

export async function updateProfileRole(userId: string, role: 'admin' | 'user') {
    await pool.query('UPDATE public.users SET role = $1 WHERE id = $2', [role, userId])
    return { success: true }
}

export async function getProfileById(userId: string) {
    const { rows } = await pool.query('SELECT * FROM public.users WHERE id = $1', [userId])
    return rows[0] || null
}

export async function getProfileByEmail(email: string) {
    const { rows } = await pool.query('SELECT * FROM public.users WHERE email = $1', [email])
    return rows[0] || null
}

export async function createUser(email: string, passwordHash: string, fullName: string, role: string = 'user', status: string = 'pending') {
    const { rows } = await pool.query(
        `INSERT INTO public.users (email, password_hash, full_name, role, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [email, passwordHash, fullName, role, status]
    )
    return rows[0]
}

export async function updateUserPassword(email: string, passwordHash: string) {
    const { rows } = await pool.query(
        `UPDATE public.users SET password_hash = $1 WHERE email = $2 RETURNING *`,
        [passwordHash, email]
    )
    return rows[0] || null
}

/**
 * INVITES
 */
export async function getInviteById(inviteId: string) {
    const { rows } = await pool.query('SELECT * FROM public.invites WHERE id = $1', [inviteId])
    return rows[0] || null
}

export async function getInviteByEmail(email: string) {
    const { rows } = await pool.query('SELECT * FROM public.invites WHERE email = $1', [email])
    return rows[0] || null
}

export async function createInvite(email: string, name: string, status: string = 'pending') {
    const { rows } = await pool.query(
        `INSERT INTO public.invites (email, name, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            status = EXCLUDED.status,
            created_at = NOW()
         RETURNING *`,
        [email, name, status]
    )
    return rows[0]
}

export async function updateInviteStatus(inviteId: string, status: string) {
    const { rows } = await pool.query(
        `UPDATE public.invites SET status = $1, reviewed_at = NOW() WHERE id = $2 RETURNING *`,
        [status, inviteId]
    )
    return rows[0] || null
}

export async function deleteInviteByEmail(email: string) {
    await pool.query('DELETE FROM public.invites WHERE email = $1', [email])
}

export async function deleteInviteById(id: string) {
    await pool.query('DELETE FROM public.invites WHERE id = $1', [id])
}

export async function getPendingInvites() {
    const { rows } = await pool.query("SELECT * FROM public.invites WHERE status = 'pending' ORDER BY created_at DESC")
    return rows
}


/**
 * BLOTATO ACCOUNTS
 */
export async function getBlotatoAccounts(userId: string): Promise<BlotatoAccount[]> {
    const { rows } = await pool.query(
        'SELECT * FROM public.blotato_accounts WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
    )
    return rows
}

export async function addBlotatoAccount(
    userId: string,
    platform: string,
    accountId: string,
    label?: string,
    pageId?: string,
    pageName?: string,
    avatarUrl?: string
): Promise<BlotatoAccount> {
    const { rows } = await pool.query(`
        INSERT INTO public.blotato_accounts (
            user_id, platform, account_id, label, page_id, page_name, avatar_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, platform, account_id, page_id)
        DO UPDATE SET
            label = COALESCE(EXCLUDED.label, blotato_accounts.label),
            page_name = COALESCE(EXCLUDED.page_name, blotato_accounts.page_name),
            avatar_url = COALESCE(EXCLUDED.avatar_url, blotato_accounts.avatar_url)
        RETURNING *
    `, [
        userId, platform, accountId.toString(), label || null, pageId?.toString() || '', pageName || null, avatarUrl || null
    ])
    
    return rows[0]
}

export async function getBlotatoAccountById(id: string): Promise<BlotatoAccount | null> {
    const { rows } = await pool.query('SELECT * FROM public.blotato_accounts WHERE id = $1', [id])
    return rows[0] || null
}

export async function removeBlotatoAccount(id: string) {
    await pool.query('DELETE FROM public.blotato_accounts WHERE id = $1', [id])
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
    engine_mode?: 'local' | 'kie' | 'manual';
    image_model: string;
    thumbnail_model?: string;
    video_model: string;
    music_model?: string;
    voice_model?: string;
    render_model?: string;
    voice_language?: string;
    post_days?: string[];
    created_at: string;
    updated_at: string;
    // ── Dual-Engine fields ──
    render_engine?: 'remotion' | 'hyperframes' | 'auto';
    caption_style?: 'pop' | 'karaoke' | 'subtitle';
    animation_mix?: 'varied' | 'kenburns' | 'zoom-punch';
    transition_style?: 'fade' | 'slide-up' | 'zoom-in';
    language?: string;        // 'pt', 'en', 'es', etc.
    voice?: string;           // Edge-TTS voice, e.g. 'pt-BR-FranciscaNeural'
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
    // Garantir colunas existem (idempotente)
    await pool.query(`ALTER TABLE public.remodeling_templates ADD COLUMN IF NOT EXISTS thumbnail_model TEXT;`);
    await pool.query(`ALTER TABLE public.remodeling_templates ADD COLUMN IF NOT EXISTS render_engine TEXT DEFAULT 'remotion';`);
    await pool.query(`ALTER TABLE public.remodeling_templates ADD COLUMN IF NOT EXISTS caption_style TEXT DEFAULT 'pop';`);
    await pool.query(`ALTER TABLE public.remodeling_templates ADD COLUMN IF NOT EXISTS animation_mix TEXT DEFAULT 'varied';`);
    await pool.query(`ALTER TABLE public.remodeling_templates ADD COLUMN IF NOT EXISTS transition_style TEXT DEFAULT 'fade';`);
    await pool.query(`ALTER TABLE public.remodeling_templates ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt';`);
    await pool.query(`ALTER TABLE public.remodeling_templates ADD COLUMN IF NOT EXISTS voice TEXT;`);

    const { rows } = await pool.query(`
        INSERT INTO public.remodeling_templates (
            user_id, video_id, video_title, video_thumbnail, name, template_data, generated_script,
            format, has_music, music_style, voice_type, post_frequency, post_interval_days,
            post_times, is_active, target_accounts, tags, image_model, video_model,
            music_model, voice_model, voice_language, thumbnail_model,
            render_engine, caption_style, animation_mix, transition_style, language, voice
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
        RETURNING *
    `, [
        userId, data.video_id, data.video_title || null, data.video_thumbnail || null, data.name,
        data.template_data, data.generated_script || null, data.format, data.has_music || false,
        data.music_style || null, data.voice_type || null, data.post_frequency, data.post_interval_days || null,
        data.post_times || [], data.is_active !== false, data.target_accounts || [], data.tags || [],
        data.image_model, data.video_model, data.music_model || null, data.voice_model || null,
        data.voice_language || null, data.thumbnail_model || data.image_model || null,
        data.render_engine || 'remotion', data.caption_style || 'pop',
        data.animation_mix || 'varied', data.transition_style || 'fade',
        data.language || 'pt', data.voice || null
    ])
    
    return rows[0]
}

export async function updateRemodelingTemplate(
    templateId: string,
    data: Partial<Omit<RemodelingTemplateEntity, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<RemodelingTemplateEntity> {
    const keys = Object.keys(data);
    if (keys.length === 0) {
        const { rows } = await pool.query('SELECT * FROM public.remodeling_templates WHERE id = $1', [templateId])
        return rows[0]
    }
    
    const setClauses = keys.map((key, i) => `"${key}" = $${i + 2}`);
    const values = keys.map(key => (data as any)[key]);
    
    const { rows } = await pool.query(`
        UPDATE public.remodeling_templates
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `, [templateId, ...values])
    
    return rows[0]
}

export async function getRemodelingTemplates(userId: string): Promise<RemodelingTemplateEntity[]> {
    const { rows } = await pool.query(
        'SELECT * FROM public.remodeling_templates WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
    )
    return rows
}

export async function getRemodelingTemplateById(id: string): Promise<RemodelingTemplateEntity> {
    const { rows } = await pool.query('SELECT * FROM public.remodeling_templates WHERE id = $1', [id])
    if (rows.length === 0) throw new Error('Template not found')
    return rows[0]
}

export async function deleteRemodelingTemplate(id: string) {
    await pool.query('DELETE FROM public.remodeling_templates WHERE id = $1', [id])
    return { success: true }
}

export async function updateRemodelingTemplateStatus(id: string, isActive: boolean) {
    await pool.query('UPDATE public.remodeling_templates SET is_active = $1 WHERE id = $2', [isActive, id])
    return { success: true }
}

export async function getRecentVideos(limit = 12): Promise<YouTubeVideo[]> {
    const { rows } = await pool.query(
        'SELECT id, title, views, published_at, duration, thumbnail_url, channel_id FROM public.videos ORDER BY created_at DESC LIMIT $1',
        [limit]
    )

    return rows.map((v: any) => ({
        id: v.id,
        title: v.title,
        views: Number(v.views || 0),
        likes: 0,
        comments: 0,
        publishedAt: v.published_at,
        duration: v.duration,
        thumbnail: v.thumbnail_url,
        channelId: v.channel_id || '',
        channelName: 'Externo',
        source: 'youtube',
        url: `https://youtube.com/watch?v=${v.id}`,
        description: ''
    }))
}

export async function getRecentUserVideos(userId: string, limit = 3) {
    const { rows } = await pool.query(
        'SELECT title FROM public.videos WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
    )
    return rows
}


export async function saveProductionHistory(data: Omit<ProductionHistoryEntity, 'id' | 'dispatched_at'>) {
    const { rows } = await pool.query(`
        INSERT INTO public.remodeling_history (template_id, original_video_id, payload, status, video_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `, [data.template_id, data.original_video_id, data.payload, data.status, data.video_url || null])
    
    return rows[0]
}

export async function getProductionHistory(templateId: string): Promise<ProductionHistoryEntity[]> {
    const { rows } = await pool.query(
        'SELECT * FROM public.remodeling_history WHERE template_id = $1 ORDER BY dispatched_at DESC',
        [templateId]
    )
    return rows
}

export async function getAllRecentProductionHistory(limit: number = 20): Promise<ProductionHistoryEntity[]> {
    const { rows } = await pool.query(
        'SELECT * FROM public.remodeling_history ORDER BY dispatched_at DESC LIMIT $1',
        [limit]
    )
    return rows
}

export async function updateProductionHistory(id: string, status: 'completed' | 'failed', videoUrl: string) {
    const { rows } = await pool.query(
        `UPDATE public.remodeling_history 
         SET status = $1, video_url = $2
         WHERE id = $3
         RETURNING *`,
        [status, videoUrl, id]
    )
    return rows[0] || null
}

export async function getTemplatesScheduledFor(timeStr: string): Promise<RemodelingTemplateEntity[]> {
    const { rows } = await pool.query(
        'SELECT * FROM public.remodeling_templates WHERE is_active = true AND $1 = ANY(post_times)',
        [timeStr]
    )
    return rows
}

// ─── SYSTEM PROMPTS (ADMIN) ──────────────────────────────────────
import { DEFAULT_SYSTEM_PROMPTS, type SystemPromptItem } from "./default-prompts"

export async function ensureSystemPromptsTableExists() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS public.system_prompts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            target_model TEXT,
            content TEXT NOT NULL,
            default_content TEXT NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            updated_by TEXT
        );
    `)
}

export async function getSystemPrompts(): Promise<SystemPromptItem[]> {
    await ensureSystemPromptsTableExists()
    const { rows } = await pool.query('SELECT * FROM public.system_prompts ORDER BY id ASC')
    
    const dbPromptsMap = new Map(rows.map((r: any) => [r.id, r]))
    const result: SystemPromptItem[] = []

    for (const key of Object.keys(DEFAULT_SYSTEM_PROMPTS)) {
        const defaultPrompt = DEFAULT_SYSTEM_PROMPTS[key]
        const dbRow = dbPromptsMap.get(key)

        if (dbRow) {
            result.push({
                ...defaultPrompt,
                content: dbRow.content,
                isCustomized: dbRow.content.trim() !== defaultPrompt.defaultContent.trim(),
                updatedAt: dbRow.updated_at,
                updatedBy: dbRow.updated_by || 'Admin'
            })
        } else {
            result.push({
                ...defaultPrompt,
                isCustomized: false
            })
        }
    }
    return result
}

export async function getSystemPromptContent(id: string): Promise<string> {
    try {
        await ensureSystemPromptsTableExists()
        const { rows } = await pool.query('SELECT content FROM public.system_prompts WHERE id = $1', [id])
        if (rows.length > 0 && rows[0].content) {
            return rows[0].content
        }
    } catch (e) {
        console.warn(`[getSystemPromptContent] Could not fetch ${id} from DB, using fallback:`, e)
    }
    return DEFAULT_SYSTEM_PROMPTS[id]?.content || ""
}

export async function saveSystemPrompt(id: string, content: string, updatedBy = 'Admin'): Promise<boolean> {
    await ensureSystemPromptsTableExists()
    const defaultItem = DEFAULT_SYSTEM_PROMPTS[id]
    if (!defaultItem) return false

    await pool.query(`
        INSERT INTO public.system_prompts (id, name, description, target_model, content, default_content, updated_at, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
    `, [id, defaultItem.name, defaultItem.description, defaultItem.targetModel, content, defaultItem.defaultContent, updatedBy])

    return true
}

export async function resetSystemPrompt(id: string): Promise<boolean> {
    await ensureSystemPromptsTableExists()
    await pool.query('DELETE FROM public.system_prompts WHERE id = $1', [id])
    return true
}
