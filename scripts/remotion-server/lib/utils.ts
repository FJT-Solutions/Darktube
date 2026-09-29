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

/**
 * Convert relative YouTube dates (e.g., "1 year ago", "3 months ago") into a Date object.
 */
export function parseYouTubeDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    if (dateStr.includes('-') && !isNaN(Date.parse(dateStr))) return dateStr; // Already a date or ISO

    const now = new Date();
    const match = dateStr.match(/(\d+)\s+(year|month|week|day|hour|minute|second)s?\s+ago/i);
    
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 'year': now.setFullYear(now.getFullYear() - value); break;
        case 'month': now.setMonth(now.getMonth() - value); break;
        case 'week': now.setDate(now.getDate() - (value * 7)); break;
        case 'day': now.setDate(now.getDate() - value); break;
        case 'hour': now.setHours(now.getHours() - value); break;
        case 'minute': now.setMinutes(now.getMinutes() - value); break;
        case 'second': now.setSeconds(now.getSeconds() - value); break;
    }

    return now.toISOString();
}
