import { NextRequest, NextResponse } from "next/server"
import YouTube from "youtube-sr"
import { getOfficialChannelData } from "@/lib/official-youtube"
import { calculateDarkScore, classifyChannelType, getCPMByNiche, getSocialBladeGrade } from "@/lib/dark-logic"
import { calculateRemodelingScore, getRemodelingInsight } from "@/lib/intelligence"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q") || ""
  const type = searchParams.get("type") || "video"
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    )
  }

  try {
    if (type === "channel") {
      // Search for channels directly
      const results = await YouTube.search(query, {
        limit: limit,
        type: "channel",
        safeSearch: false,
      })

      const channels = await Promise.all(results.map(async (ch: any) => {
        let totalViews = ch.views || 0
        let subscribers = ch.subscribersCount || ch.subscribers || 0
        let videoCount = ch.videosCount || 0
        let banner = ""
        let description = ch.description || ""

        // Tenta a API oficial se tivermos a chave, para evitar ZEROS (acertividade)
        if (process.env.YOUTUBE_API_KEY && (subscribers === 0 || totalViews === 0)) {
          try {
            const officialData = await getOfficialChannelData(ch.id)
            if (officialData) {
              subscribers = officialData.subscribers || subscribers
              totalViews = officialData.views || totalViews
              videoCount = officialData.videos || videoCount
              banner = officialData.banner || ""
              description = officialData.description || description
            }
          } catch {
            // API não ativada ou erro - continua com dados do youtube-sr
          }
        }

        const estimatedMonthlyViews = Math.round(totalViews * 0.02)

        const channel: any = {
          id: ch.id || "",
          name: ch.name || "",
          handle: ch.handle || "",
          avatar: ch.icon?.url || `https://yt3.googleusercontent.com/${ch.id}`,
          banner: banner,
          subscribers: subscribers,
          totalViews: totalViews,
          estimatedMonthlyViews: estimatedMonthlyViews,
          videoCount: videoCount,
          description: description,
          joinedDate: "",
          country: "",
          url: ch.url || `https://www.youtube.com/channel/${ch.id}`,
          verified: ch.verified || false,
        }

        // Enriquecimento com Lógica Dark
        const darkType = classifyChannelType(channel)
        const { score } = calculateDarkScore(channel, []) // Sem vídeos recentes por enquanto
        const cpm = getCPMByNiche(darkType)
        const sbGrade = getSocialBladeGrade(channel)

        const remodelingScore = calculateRemodelingScore({
          ...channel,
          darkType: darkType,
          darkScore: score
        } as any)

        return {
          ...channel,
          darkType: darkType,
          darkScore: score,
          remodelingScore: remodelingScore,
          remodelingInsight: getRemodelingInsight({
            ...channel,
            darkScore: score,
            darkType: darkType
          } as any),
          reliabilityIndex: subscribers > 0 ? 0.95 : 0.6,
          socialBladeGrade: sbGrade,
          estimatedMonetization: (estimatedMonthlyViews / 1000) * cpm
        }
      }))

      return NextResponse.json({ channels, totalResults: channels.length })
    }

    // Search for videos
    const results = await YouTube.search(query, {
      limit: Math.min(limit, 25),
      type: "video",
      safeSearch: false,
    })

    const videos = results.map((video) => ({
      id: video.id || "",
      title: video.title || "",
      thumbnail:
        video.thumbnail?.url ||
        `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      views: video.views || 0,
      likes: 0,
      comments: 0,
      duration: video.durationFormatted || "0:00",
      publishedAt: video.uploadedAt || "",
      channelId: video.channel?.id || "",
      channelName: video.channel?.name || "",
      description: video.description || "",
      url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
    }))

    return NextResponse.json({ videos, totalResults: videos.length })
  } catch (error) {
    console.error("YouTube search error:", error)
    return NextResponse.json(
      {
        error: "Failed to search YouTube",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
