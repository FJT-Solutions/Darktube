import type { TrackedChannel } from "./types"

const STORAGE_KEY = "darktube_tracked_channels"

export function getTrackedChannels(): TrackedChannel[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveTrackedChannel(channel: TrackedChannel): void {
  const channels = getTrackedChannels()
  const existingIndex = channels.findIndex((c) => c.id === channel.id)

  if (existingIndex >= 0) {
    channels[existingIndex] = channel
  } else {
    channels.unshift(channel)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels))
}

export function removeTrackedChannel(channelId: string): void {
  const channels = getTrackedChannels().filter((c) => c.id !== channelId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels))
}

export function isChannelTracked(channelId: string): boolean {
  return getTrackedChannels().some((c) => c.id === channelId)
}

export function updateChannelNotes(
  channelId: string,
  notes: string
): void {
  const channels = getTrackedChannels()
  const channel = channels.find((c) => c.id === channelId)
  if (channel) {
    channel.notes = notes
    localStorage.setItem(STORAGE_KEY, JSON.stringify(channels))
  }
}

export function updateChannelTags(
  channelId: string,
  tags: string[]
): void {
  const channels = getTrackedChannels()
  const channel = channels.find((c) => c.id === channelId)
  if (channel) {
    channel.tags = tags
    localStorage.setItem(STORAGE_KEY, JSON.stringify(channels))
  }
}
