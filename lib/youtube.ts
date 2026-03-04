import type { YouTubeChannel, YouTubeVideo } from "./types"

// Scrape channel page directly for detailed info
export async function scrapeChannelPage(channelIdentifier: string): Promise<{
  channel: YouTubeChannel
  videos: YouTubeVideo[]
}> {
  // Determine URL format
  let channelUrl: string
  if (channelIdentifier.startsWith("UC") && channelIdentifier.length >= 20) {
    channelUrl = `https://www.youtube.com/channel/${channelIdentifier}`
  } else if (channelIdentifier.startsWith("@")) {
    channelUrl = `https://www.youtube.com/${channelIdentifier}`
  } else {
    channelUrl = `https://www.youtube.com/@${channelIdentifier}`
  }

  // Fetch both videos and shorts tabs
  const [videoRes, shortsRes, liveRes] = await Promise.all([
    fetch(`${channelUrl}/videos`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }),
    fetch(`${channelUrl}/shorts`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }),
    fetch(`${channelUrl}/streams`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })
  ])

  let allVideos: YouTubeVideo[] = []
  let combinedChannel: YouTubeChannel | null = null

  const processResponse = async (res: Response, tabType: 'video' | 'shorts' | 'live') => {
    if (res.ok) {
      const html = await res.text()
      try {
        const { channel, videos } = parseChannelPageHtml(html, channelIdentifier, tabType)
        if (!combinedChannel) combinedChannel = channel
        allVideos = [...allVideos, ...videos]
      } catch (e) {
        console.warn(`[Scraper] Failed to parse ${tabType} tab:`, e)
      }
    }
  }

  await Promise.all([
    processResponse(videoRes, 'video'),
    processResponse(shortsRes, 'shorts'),
    processResponse(liveRes, 'live')
  ])

  if (!combinedChannel) {
    throw new Error("Failed to fetch channel data from any tab")
  }

  // Deduplicate videos by ID
  const seenIds = new Set<string>()
  const uniqueVideos = allVideos.filter(v => {
    if (seenIds.has(v.id)) return false
    seenIds.add(v.id)
    return true
  })

  return { channel: combinedChannel, videos: uniqueVideos }
}

/**
 * Converte texto abreviado de número para inteiro.
 * Suporta formatos em Inglês (K, M, B) E Português (mil, mi, milhão, bi).
 * Exemplos:
 *   "244 mil inscritos"  → 244000
 *   "26 mil visualizações" → 26000
 *   "1.5M subscribers"   → 1500000
 *   "2,3 mi de visualizações" → 2300000
 *   "3.2K views"         → 3200
 *   "418"                → 418
 */
function parseAbbreviatedNumber(text: string): number {
  if (!text) return 0

  const original = text.toLowerCase()

  // 1. Tenta extrair número puro (ex: "26.780 visualizações" ou "418 comments")
  //    Pega sequências como "26.780" ou "26,780" ou "1.234.567"
  const pureMatch = original.match(/([\d]+(?:[.,]\d{3})*)\s*(?:visual|view|subscri|inscri|comment|coment)/i)
  if (pureMatch) {
    // Remove separadores de milhar (tanto . quanto ,) para obter o número puro
    const numStr = pureMatch[1].replace(/[.,]/g, "")
    const parsed = parseInt(numStr, 10)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }

  // 2. Detecta sufixo "mil" (PT) = 1.000
  const milMatch = original.match(/([\d]+(?:[.,]\d+)?)\s*mil/)
  if (milMatch) {
    const numStr = milMatch[1].replace(",", ".")
    return Math.round(parseFloat(numStr) * 1000)
  }

  // 3. Detecta sufixo "mi" ou "milhão/milhões" (PT) = 1.000.000
  const miMatch = original.match(/([\d]+(?:[.,]\d+)?)\s*(?:mi(?:lh[ãõ]|lho)|mi\b)/)
  if (miMatch) {
    const numStr = miMatch[1].replace(",", ".")
    return Math.round(parseFloat(numStr) * 1000000)
  }

  // 4. Detecta sufixo "bi" ou "bilhão/bilhões" (PT) = 1.000.000.000
  const biMatch = original.match(/([\d]+(?:[.,]\d+)?)\s*(?:bi(?:lh[ãõ]|lho)|bi\b)/)
  if (biMatch) {
    const numStr = biMatch[1].replace(",", ".")
    return Math.round(parseFloat(numStr) * 1000000000)
  }

  // 5. Detecta sufixos em inglês: K, M, B, T
  const enMatch = original.match(/([\d]+(?:[.,]\d+)?)\s*([kmbt])\b/i)
  if (enMatch) {
    const numStr = enMatch[1].replace(",", ".")
    const num = parseFloat(numStr)
    const suffix = enMatch[2].toLowerCase()
    switch (suffix) {
      case "k": return Math.round(num * 1000)
      case "m": return Math.round(num * 1000000)
      case "b": return Math.round(num * 1000000000)
      case "t": return Math.round(num * 1000000000000)
    }
  }

  // 6. Fallback: extrai qualquer sequência numérica
  const fallback = original.match(/([\d]+(?:[.,]\d+)?)/)
  if (fallback) {
    const numStr = fallback[1].replace(",", ".")
    const parsed = parseFloat(numStr)
    if (!isNaN(parsed)) return Math.round(parsed)
  }

  return 0
}

function parseChannelPageHtml(
  html: string,
  channelIdentifier: string,
  tabType: 'video' | 'shorts' | 'live' = 'video'
): { channel: YouTubeChannel; videos: YouTubeVideo[] } {
  // Extract ytInitialData JSON from the page
  // Must handle braces inside JSON string values correctly.
  const startMarker = "var ytInitialData = "
  const startIdx = html.indexOf(startMarker)
  if (startIdx === -1) {
    throw new Error("Could not find ytInitialData in page")
  }

  const jsonStart = startIdx + startMarker.length
  let depth = 0
  let inString = false
  let jsonEnd = jsonStart
  for (let i = jsonStart; i < html.length; i++) {
    const ch = html[i]
    if (inString) {
      if (ch === "\\") { i++; continue } // Skip escaped character
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) {
        jsonEnd = i + 1
        break
      }
    }
  }

  const jsonStr = html.substring(jsonStart, jsonEnd)

  let data: Record<string, unknown>
  try {
    data = JSON.parse(jsonStr)
  } catch {
    throw new Error("Failed to parse YouTube initial data JSON")
  }

  console.log(`[Scraper] Extracted JSON: ${jsonStr.length} chars`)

  // Extract channel metadata
  const metadata = extractNestedValue(data, "microformat", "microformatDataRenderer") as Record<string, unknown> | null
  const header = extractNestedValue(data, "header") as Record<string, unknown> | null
  const c4Header = extractNestedValue(header, "c4TabbedHeaderRenderer") as Record<string, unknown> | null
  const pageHeader = extractNestedValue(header, "pageHeaderRenderer") as Record<string, unknown> | null

  let channelName = ""
  let channelId = ""
  let avatar = ""
  let banner = ""
  let subscribers = 0
  let description = ""
  let joinedDate = ""
  let country = ""
  let handle = channelIdentifier

  if (metadata) {
    channelName = (metadata.title as string) || ""
    description = (metadata.description as string) || ""
    const urlCanonical = (metadata.urlCanonical as string) || ""
    const idMatch = urlCanonical.match(/channel\/(UC[a-zA-Z0-9_-]+)/)
    if (idMatch) channelId = idMatch[1]
    const thumb = metadata.thumbnail as Record<string, unknown> | undefined
    if (thumb) {
      const thumbs = thumb.thumbnails as Array<Record<string, string>> | undefined
      if (thumbs && thumbs.length > 0) {
        avatar = thumbs[thumbs.length - 1].url || ""
      }
    }
  }

  if (c4Header) {
    if (!channelId) channelId = (c4Header.channelId as string) || ""
    if (!channelName) channelName = (c4Header.title as string) || ""
    const subscriberText = (c4Header.subscriberCountText as Record<string, string>)?.simpleText || ""
    subscribers = parseAbbreviatedNumber(subscriberText)
    const bannerObj = c4Header.banner as Record<string, unknown> | undefined
    if (bannerObj) {
      const bannerThumbs = (bannerObj.thumbnails as Array<Record<string, string>>) || []
      if (bannerThumbs.length > 0) {
        banner = bannerThumbs[bannerThumbs.length - 1].url || ""
      }
    }
    const avatarObj = c4Header.avatar as Record<string, unknown> | undefined
    if (avatarObj) {
      const avatarThumbs = (avatarObj.thumbnails as Array<Record<string, string>>) || []
      if (avatarThumbs.length > 0) {
        avatar = avatarThumbs[avatarThumbs.length - 1].url || ""
      }
    }
  }

  // Try pageHeaderRenderer for newer layouts
  if (pageHeader && !channelName) {
    const content = extractNestedValue(pageHeader, "content", "pageHeaderViewModel") as Record<string, unknown> | null
    if (content) {
      const titleObj = content.title as Record<string, unknown>
      if (titleObj) {
        const dynamicText = titleObj.dynamicTextViewModel as Record<string, unknown>
        if (dynamicText) {
          const textObj = dynamicText.text as Record<string, string>
          if (textObj) channelName = textObj.content || ""
        }
      }
    }
  }

  // Fallback robusto para inscritos: busca em todo o JSON serializado
  const aboutText = JSON.stringify(data)
  if (subscribers === 0) {
    // Tenta subscriberCountText.simpleText
    const subMatch1 = aboutText.match(/"subscriberCountText":\s*{\s*"simpleText":\s*"([^"]+)"/i)
    if (subMatch1) {
      subscribers = parseAbbreviatedNumber(subMatch1[1])
    }
  }
  if (subscribers === 0) {
    // Tenta accessibilityData com "subscribers" ou "inscritos"
    const subMatch2 = aboutText.match(/"label":\s*"([^"]*\d[^"]*(?:subscribers|inscritos)[^"]*)"/i)
    if (subMatch2) {
      subscribers = parseAbbreviatedNumber(subMatch2[1])
    }
  }
  if (subscribers === 0) {
    // Tenta subscriberCountText com "content" (pageHeaderRenderer)
    const subMatch3 = aboutText.match(/"subscriberCountText":\s*"([^"]+)"/i)
    if (subMatch3) {
      subscribers = parseAbbreviatedNumber(subMatch3[1])
    }
  }

  // Extract total views and video count
  let totalViews = 0
  let videoCount = 0

  // Tenta viewCountText como string direta
  const viewsMatch1 = aboutText.match(/"viewCountText":\s*{\s*"simpleText":\s*"([^"]+)"/i)
  if (viewsMatch1) {
    totalViews = parseAbbreviatedNumber(viewsMatch1[1])
  }
  // Tenta pattern alternativo
  if (totalViews === 0) {
    const viewsMatch2 = aboutText.match(/"viewCountText":\s*"([^"]+)"/i)
    if (viewsMatch2) {
      totalViews = parseAbbreviatedNumber(viewsMatch2[1])
    }
  }

  // Extract videos from tabs
  const videos: YouTubeVideo[] = []
  const tabs = extractNestedValue(data, "contents", "twoColumnBrowseResultsRenderer", "tabs") as Array<Record<string, unknown>> | null

  if (tabs) {
    for (const tab of tabs) {
      const tabRenderer = tab.tabRenderer as Record<string, unknown>
      if (!tabRenderer) continue
      const tabTitle = (tabRenderer.title as string || "").toLowerCase()
      if (tabTitle === "videos" || tabTitle === "vídeos" || tabTitle === "shorts" || tabTitle === "ao vivo" || tabTitle === "live" || tabTitle === "streams") {
        const sectionList = extractNestedValue(tabRenderer, "content", "richGridRenderer", "contents") as Array<Record<string, unknown>> | null
        if (sectionList) {
          for (const item of sectionList) {
            const richItem = item.richItemRenderer as Record<string, unknown>
            if (!richItem) continue

            // Check for different renderer types (regular video vs shorts)
            const videoRenderer = extractNestedValue(richItem, "content", "videoRenderer") as Record<string, unknown> | null
            const shortsRenderer = extractNestedValue(richItem, "content", "reelsVideoRenderer") as Record<string, unknown> | null

            const renderer = videoRenderer || shortsRenderer
            if (!renderer) continue

            const vid = parseVideoRenderer(renderer, channelId, channelName, tabType)
            if (vid) {
              videos.push(vid)
              videoCount++
            }
          }
        }
      }
    }
  }

  const channel: YouTubeChannel = {
    id: channelId || channelIdentifier,
    name: channelName,
    handle,
    avatar,
    banner,
    subscribers,
    totalViews,
    videoCount: videoCount || videos.length,
    description,
    joinedDate,
    country,
    url: `https://www.youtube.com/channel/${channelId || channelIdentifier}`,
    verified: false,
  }

  return { channel, videos }
}

function parseVideoRenderer(
  renderer: Record<string, unknown>,
  channelId: string,
  channelName: string,
  tabType: 'video' | 'shorts' | 'live'
): YouTubeVideo | null {
  const videoId = renderer.videoId as string
  if (!videoId) return null

  const titleObj = renderer.title as Record<string, unknown>
  let title = ""
  if (titleObj) {
    const runs = titleObj.runs as Array<Record<string, string>>
    if (runs && runs.length > 0) {
      title = runs.map((r) => r.text).join("")
    }
  }

  const thumbObj = renderer.thumbnail as Record<string, unknown>
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  if (thumbObj) {
    const thumbs = thumbObj.thumbnails as Array<Record<string, string | number>>
    if (thumbs && thumbs.length > 0) {
      thumbnail = (thumbs[thumbs.length - 1].url as string) || thumbnail
    }
  }

  const viewCountObj = renderer.viewCountText as Record<string, unknown>
  let views = 0
  if (viewCountObj) {
    const simpleText = viewCountObj.simpleText as string
    if (simpleText) {
      views = parseAbbreviatedNumber(simpleText)
    } else {
      const runs = viewCountObj.runs as Array<Record<string, string>>
      if (runs) {
        const text = runs.map((r) => r.text).join("")
        views = parseAbbreviatedNumber(text)
      }
    }
  }

  const durationObj = renderer.lengthText as Record<string, string>
  const duration = durationObj?.simpleText || "0:00"

  const publishedObj = renderer.publishedTimeText as Record<string, string>
  const publishedAt = publishedObj?.simpleText || ""

  const descSnippet = renderer.descriptionSnippet as Record<string, unknown>
  let description = ""
  if (descSnippet) {
    const runs = descSnippet.runs as Array<Record<string, string>>
    if (runs) {
      description = runs.map((r) => r.text).join("")
    }
  }

  // Determine type based on tabType and duration
  let type: 'video' | 'shorts' | 'live' = tabType
  if (tabType === 'video') {
    // If duration is < 1:00 it might be a short accidentally listed in videos
    if (duration.split(':').length === 2) {
      const [m, s] = duration.split(':').map(Number)
      if (m === 0 && s < 61) type = 'shorts'
    }
  }

  // Refine Live detection
  const viewCountText = JSON.stringify(viewCountObj || {})
  if (viewCountText.includes("watching") || viewCountText.includes("assistindo") || viewCountText.includes("Live")) {
    type = 'live'
  }

  return {
    id: videoId,
    title,
    thumbnail,
    views,
    likes: 0,
    comments: 0,
    duration,
    publishedAt,
    channelId,
    channelName,
    description,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    type
  }
}

// Utility to extract nested values from objects
function extractNestedValue(
  obj: unknown,
  ...keys: string[]
): unknown {
  let current = obj
  for (const key of keys) {
    if (current && typeof current === "object" && current !== null) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return null
    }
  }
  return current
}
