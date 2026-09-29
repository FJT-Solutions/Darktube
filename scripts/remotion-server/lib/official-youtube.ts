import { google } from "googleapis"

function getYouTubeClient() {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) return null

    return google.youtube({
        version: "v3",
        auth: apiKey,
    })
}

/**
 * Busca dados exatos de um canal usando a API oficial v3.
 */
export async function getOfficialChannelData(channelId: string) {
    const youtube = getYouTubeClient()
    if (!youtube) return null

    const response = await youtube.channels.list({
        part: ["snippet", "statistics", "brandingSettings", "topicDetails"],
        id: [channelId],
    })

    const item = response.data.items?.[0]
    if (!item) return null

    // Extract topic categories from YouTube's taxonomy
    const topicCategories = (item.topicDetails?.topicCategories || [])
        .map((url: string) => {
            // URLs like "https://en.wikipedia.org/wiki/Education"
            const match = url.match(/\/wiki\/(.+)$/)
            return match ? decodeURIComponent(match[1]).replace(/_/g, " ") : ""
        })
        .filter(Boolean)

    return {
        id: channelId,
        name: item.snippet?.title || "",
        description: item.snippet?.description || "",
        avatar: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
        banner: item.brandingSettings?.image?.bannerExternalUrl || "",
        subscribers: parseInt(item.statistics?.subscriberCount || "0", 10),
        views: parseInt(item.statistics?.viewCount || "0", 10),
        videos: parseInt(item.statistics?.videoCount || "0", 10),
        country: item.snippet?.country || "",
        handle: item.snippet?.customUrl || "",
        publishedAt: item.snippet?.publishedAt || "",
        topicCategories,
    }
}

/**
 * Busca vídeos recentes de um canal usando a API oficial v3.
 * Retorna dados completos incluindo views, likes, etc.
 */
export async function getOfficialChannelVideos(channelId: string, limit = 30) {
    const youtube = getYouTubeClient()
    if (!youtube) return []

    // 1. Busca IDs dos vídeos recentes
    const searchResponse = await youtube.search.list({
        part: ["snippet"],
        channelId: channelId,
        order: "date",
        type: ["video"],
        maxResults: Math.min(limit, 50),
    })

    const videoIds = searchResponse.data.items
        ?.map(item => item.id?.videoId)
        .filter(Boolean) as string[]

    if (!videoIds || videoIds.length === 0) return []

    // 2. Busca estatísticas detalhadas de cada vídeo
    const statsResponse = await youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails"],
        id: videoIds,
    })

    return statsResponse.data.items?.map(item => {
        const durationStr = item.contentDetails?.duration || ""
        const isLive = item.snippet?.liveBroadcastContent === "live"

        // Duration heuristic for shorts (~60s)
        const durationMatch = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
        const hours = parseInt(durationMatch?.[1] || "0", 10)
        const minutes = parseInt(durationMatch?.[2] || "0", 10)
        const seconds = parseInt(durationMatch?.[3] || "0", 10)
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds

        const type = isLive ? "live" : (totalSeconds > 0 && totalSeconds < 61) ? "shorts" : "video"

        return {
            id: item.id || "",
            title: item.snippet?.title || "",
            thumbnail: item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            views: parseInt(item.statistics?.viewCount || "0", 10),
            likes: parseInt(item.statistics?.likeCount || "0", 10),
            comments: parseInt(item.statistics?.commentCount || "0", 10),
            duration: parseDuration(durationStr),
            publishedAt: item.snippet?.publishedAt || "",
            channelId: channelId,
            channelName: item.snippet?.channelTitle || "",
            description: item.snippet?.description?.substring(0, 200) || "",
            url: `https://www.youtube.com/watch?v=${item.id}`,
            type
        }
    }) || []
}

/**
 * Converte duração ISO 8601 (PT1H2M3S) para formato legível (1:02:03)
 */
function parseDuration(iso: string): string {
    if (!iso) return "0:00"
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return "0:00"

    const hours = parseInt(match[1] || "0", 10)
    const minutes = parseInt(match[2] || "0", 10)
    const seconds = parseInt(match[3] || "0", 10)

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
