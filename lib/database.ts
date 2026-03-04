import { db } from "./db"
import type { TrackedChannel, YouTubeChannel, YouTubeVideo } from "./types"

export async function getTrackedChannels(userId?: string): Promise<TrackedChannel[]> {
    const channels = await db.channel.findMany({
        where: userId ? { userId } : {},
        include: {
            metricsHistory: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        },
        orderBy: { trackedAt: 'desc' }
    })

    return channels.map(c => ({
        id: c.id,
        name: c.name,
        handle: c.handle,
        avatar: c.avatarUrl || "",
        banner: c.bannerUrl || "",
        subscribers: Number(c.subscribers || 0),
        totalViews: Number(c.totalViews || 0),
        videoCount: c.videoCount || 0,
        description: c.description || "",
        joinedDate: c.joinedDate?.toISOString() || "",
        country: c.country || "",
        url: c.url || "",
        verified: c.verified,
        topicCategories: c.topicCategories ? JSON.parse(c.topicCategories) : [],
        darkType: c.darkType as any,
        notes: c.notes || "",
        tags: c.tags ? JSON.parse(c.tags) : [],
        trackedAt: c.trackedAt.toISOString(),
        metrics: c.metricsHistory[0] ? {
            avgViewsPerVideo: c.metricsHistory[0].avgViewsPerVideo || 0,
            uploadFrequency: "", // Calculado em outro lugar se necessário
            uploadsPerMonth: 0,
            engagementRate: 0,
            estimatedRevenue: c.metricsHistory[0].estimatedRevenue || 0,
            estimatedMonthlyRevenue: 0,
            darkScore: c.metricsHistory[0].darkScore || 0,
            cpm: 0,
            growthPotential: 0,
            estimatedMonthlyViews: Number(c.metricsHistory[0].estimatedMonthlyViews || 0)
        } : undefined
    }))
}

export async function ensureChannelExists(channel: YouTubeChannel, userId?: string): Promise<void> {
    await db.channel.upsert({
        where: { id: channel.id },
        update: {
            name: channel.name,
            handle: channel.handle,
            avatarUrl: channel.avatar,
            bannerUrl: channel.banner,
            subscribers: BigInt(channel.subscribers || 0),
            totalViews: BigInt(channel.totalViews || 0),
            videoCount: channel.videoCount,
            description: channel.description,
            joinedDate: channel.joinedDate ? new Date(channel.joinedDate) : null,
            country: channel.country,
            url: channel.url,
            topicCategories: channel.topicCategories ? JSON.stringify(channel.topicCategories) : null,
            userId: userId || null
        },
        create: {
            id: channel.id,
            name: channel.name,
            handle: channel.handle,
            avatarUrl: channel.avatar,
            bannerUrl: channel.banner,
            subscribers: BigInt(channel.subscribers || 0),
            totalViews: BigInt(channel.totalViews || 0),
            videoCount: channel.videoCount,
            description: channel.description,
            joinedDate: channel.joinedDate ? new Date(channel.joinedDate) : null,
            country: channel.country,
            url: channel.url,
            topicCategories: channel.topicCategories ? JSON.stringify(channel.topicCategories) : null,
            userId: userId || null
        }
    })
}

export async function saveTrackedChannel(channel: TrackedChannel, userId?: string): Promise<void> {
    await db.channel.upsert({
        where: { id: channel.id },
        update: {
            name: channel.name,
            handle: channel.handle,
            avatarUrl: channel.avatar,
            bannerUrl: channel.banner,
            subscribers: BigInt(channel.subscribers),
            totalViews: BigInt(channel.totalViews),
            videoCount: channel.videoCount,
            description: channel.description,
            joinedDate: channel.joinedDate ? new Date(channel.joinedDate) : null,
            country: channel.country,
            url: channel.url,
            verified: channel.verified,
            topicCategories: JSON.stringify(channel.topicCategories || []),
            darkType: channel.darkType,
            notes: channel.notes,
            tags: JSON.stringify(channel.tags || []),
            userId: userId || null
        },
        create: {
            id: channel.id,
            name: channel.name,
            handle: channel.handle,
            avatarUrl: channel.avatar,
            bannerUrl: channel.banner,
            subscribers: BigInt(channel.subscribers),
            totalViews: BigInt(channel.totalViews),
            videoCount: channel.videoCount,
            description: channel.description,
            joinedDate: channel.joinedDate ? new Date(channel.joinedDate) : null,
            country: channel.country,
            url: channel.url,
            verified: channel.verified,
            topicCategories: JSON.stringify(channel.topicCategories || []),
            darkType: channel.darkType,
            notes: channel.notes,
            tags: JSON.stringify(channel.tags || []),
            userId: userId || null
        }
    })

    // Salvar métricas no histórico se disponíveis
    if (channel.metrics) {
        await db.channelMetricsHistory.create({
            data: {
                channelId: channel.id,
                subscribers: BigInt(channel.subscribers),
                totalViews: BigInt(channel.totalViews),
                avgViewsPerVideo: channel.metrics.avgViewsPerVideo,
                estimatedMonthlyViews: BigInt(channel.metrics.estimatedMonthlyViews || 0),
                estimatedRevenue: channel.metrics.estimatedRevenue,
                darkScore: channel.metrics.darkScore,
            }
        })
    }
}

export async function removeTrackedChannel(channelId: string): Promise<void> {
    // SQLite handles cascade delete if configured in schema, but for safely:
    await db.channelMetricsHistory.deleteMany({ where: { channelId } })
    await db.video.deleteMany({ where: { channelId } })
    await db.channel.delete({ where: { id: channelId } })
}

export async function isChannelTracked(channelId: string, userId?: string): Promise<boolean> {
    const count = await db.channel.count({
        where: {
            id: channelId,
            ...(userId ? { userId } : {})
        }
    })
    return count > 0
}

export async function updateChannelNotes(channelId: string, notes: string): Promise<void> {
    await db.channel.update({
        where: { id: channelId },
        data: { notes }
    })
}

export async function updateChannelTags(channelId: string, tags: string[]): Promise<void> {
    await db.channel.update({
        where: { id: channelId },
        data: { tags: JSON.stringify(tags) }
    })
}

export async function updateVideoAnalysis(video: YouTubeVideo, transcript: string, aiAnalysis: string, userId?: string): Promise<void> {
    await db.video.upsert({
        where: { id: video.id },
        update: { transcript, aiAnalysis, userId: userId || null },
        create: {
            id: video.id,
            channelId: video.channelId,
            title: video.title,
            thumbnailUrl: video.thumbnail,
            views: BigInt(video.views),
            duration: video.duration,
            publishedAt: video.publishedAt ? new Date(video.publishedAt) : null,
            transcript,
            aiAnalysis,
            userId: userId || null
        }
    })
}

export async function getUserSettings(userId: string) {
    return await db.settings.findUnique({
        where: { userId }
    })
}

export async function updateUserSettings(userId: string, data: { geminiApiKey?: string }) {
    return await db.settings.upsert({
        where: { userId },
        update: data,
        create: {
            userId,
            ...data
        }
    })
}
