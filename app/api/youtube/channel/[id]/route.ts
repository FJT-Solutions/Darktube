import { NextRequest, NextResponse } from "next/server"
import { scrapeChannelPage } from "@/lib/youtube"
import { calculateMetrics } from "@/lib/metrics"
import { getOfficialChannelData, getOfficialChannelVideos } from "@/lib/official-youtube"
import type { YouTubeChannel, YouTubeVideo } from "@/lib/types"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json(
      { error: "Channel ID is required" },
      { status: 400 }
    )
  }

  try {
    let channel: YouTubeChannel | null = null
    let videos: YouTubeVideo[] = []

    // === FONTE PRIMÁRIA: API Oficial do YouTube v3 ===
    // Dados 100% precisos e confiáveis
    try {
      const officialData = await getOfficialChannelData(id)
      if (officialData) {
        channel = {
          id: officialData.id,
          name: officialData.name,
          handle: officialData.handle,
          avatar: officialData.avatar,
          banner: officialData.banner,
          subscribers: officialData.subscribers,
          totalViews: officialData.views,
          videoCount: officialData.videos,
          description: officialData.description,
          joinedDate: officialData.publishedAt,
          country: officialData.country,
          url: `https://www.youtube.com/channel/${id}`,
          verified: false,
          topicCategories: officialData.topicCategories,
        }

        // Busca vídeos com estatísticas reais
        try {
          videos = await getOfficialChannelVideos(id, 30)
        } catch (e) {
          console.warn("[Videos API] Falha ao buscar vídeos:", e instanceof Error ? e.message : e)
        }

        console.log(`[API Oficial] ${channel.name}: ${channel.subscribers} inscritos, ${channel.totalViews} views, ${videos.length} vídeos`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("has not been used") || msg.includes("disabled")) {
        console.warn(`[API Oficial] YouTube Data API v3 NÃO ATIVADA. Ative em: https://console.developers.google.com/apis/api/youtube.googleapis.com/overview?project=284179929757`)
      } else {
        console.warn("[API Oficial] Erro:", msg)
      }
    }

    // === FONTE SECUNDÁRIA: Scraper (fallback) ===
    // Se a API oficial não funcionou, tenta scraping
    if (!channel || channel.subscribers === 0) {
      try {
        const scrapeResult = await scrapeChannelPage(id)
        if (!channel) {
          // Sem dados da API oficial, usa scraper como fonte primária
          channel = scrapeResult.channel
          videos = scrapeResult.videos
        } else {
          // Complementa dados da API com vídeos do scraper se necessário
          if (videos.length === 0) {
            videos = scrapeResult.videos
          }
          // Se scraper tem mais dados, usa
          if (scrapeResult.channel.subscribers > channel.subscribers) {
            channel.subscribers = scrapeResult.channel.subscribers
          }
          if (scrapeResult.channel.totalViews > channel.totalViews) {
            channel.totalViews = scrapeResult.channel.totalViews
          }
        }
      } catch (e) {
        console.warn("[Scraper] Erro:", e instanceof Error ? e.message : e)
      }
    }

    // Se nenhuma fonte funcionou
    if (!channel) {
      return NextResponse.json(
        {
          error: "Não foi possível obter dados do canal",
          details: "A API oficial do YouTube não está ativada e o scraper falhou. Ative a YouTube Data API v3 no Google Cloud Console.",
          apiSetupUrl: "https://console.developers.google.com/apis/api/youtube.googleapis.com/overview"
        },
        { status: 503 }
      )
    }

    const metrics = calculateMetrics(channel, videos)

    return NextResponse.json({
      channel,
      videos: videos as any[],
      metrics,
    })
  } catch (error) {
    console.error("DEBUG: Channel fetch error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
      errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error))
    })
    return NextResponse.json(
      {
        error: "Failed to fetch channel data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
