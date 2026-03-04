import { NextResponse } from "next/server"
import YouTube from "youtube-sr"

export async function GET() {
  try {
    const trending = await YouTube.trending()

    const videos = trending.map((video) => ({
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
    console.error("Trending fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch trending videos",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
