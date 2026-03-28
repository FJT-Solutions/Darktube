import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { VideoSource } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): VideoSource {
    const u = url.toLowerCase();
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('tiktok.com')) return 'tiktok';
    if (u.includes('instagram.com')) return 'instagram';
    if (u.includes('vimeo.com')) return 'vimeo';
    if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
    if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
    if (u.includes('dailymotion.com') || u.includes('dai.ly')) return 'dailymotion';
    if (u.includes('twitch.tv')) return 'twitch';
    if (u.includes('reddit.com') || u.includes('redd.it')) return 'reddit';
    return 'other';
}
