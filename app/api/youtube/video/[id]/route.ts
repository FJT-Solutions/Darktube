import { NextRequest, NextResponse } from "next/server"
import YouTube from "youtube-sr"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json(
      { error: "Video ID is required" },
      { status: 400 }
    )
  }

  try {
    const video = await YouTube.getVideo(
      `https://www.youtube.com/watch?v=${id}`
    )

    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: video.id || id,
      title: video.title || "",
      thumbnail:
        video.thumbnail?.url ||
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      views: video.views || 0,
      likes: video.likes || 0,
      comments: 0,
      duration: video.durationFormatted || "0:00",
      publishedAt: video.uploadedAt || "",
      channelId: video.channel?.id || "",
      channelName: video.channel?.name || "",
      description: video.description || "",
      url: video.url || `https://www.youtube.com/watch?v=${id}`,
      tags: video.tags || [],
      live: video.live || false,
    })
  } catch (error) {
    console.error("Video fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch video data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
