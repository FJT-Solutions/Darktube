"use server"

import * as db from "@/lib/database"
import { getNicheIntelligence } from "@/lib/intelligence"
import { revalidatePath } from "next/cache"
import { TrackedChannel } from "@/lib/types"
import { VideoAnalysisService } from "@/lib/video-analysis"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function getTrackedChannelsAction() {
    const session = await getServerSession(authOptions)
    return await db.getTrackedChannels(session?.user ? (session.user as any).id : undefined)
}

export async function analyzeVideoAction(video: any, channel?: any) {
    try {
        const session = await getServerSession(authOptions)

        // Fetch user's personal API key if logged in
        let userApiKey = process.env.GEMINI_API_KEY;
        if (session?.user) {
            const settings = await db.getUserSettings((session.user as any).id)
            if (settings?.geminiApiKey) {
                userApiKey = settings.geminiApiKey
            }
        }

        const transcript = await VideoAnalysisService.getTranscript(video.id)
        let analysis = VideoAnalysisService.analyzeContent(transcript, video.duration)

        // Attempt Deep Vision Analysis with the best available key
        const visionResult = await VideoAnalysisService.performVisionAnalysis(video.id, userApiKey);
        if (visionResult) {
            analysis = {
                ...analysis,
                productionMethod: visionResult.productionMethod,
                confidence: visionResult.confidence,
                justification: visionResult.justification
            };
        }

        // Ensure channel exists if provided (prevents P2003 foreign key error)
        if (channel) {
            await db.ensureChannelExists(channel, session?.user ? (session.user as any).id : undefined)
        }

        // Update DB with results (uses upsert internally)
        await db.updateVideoAnalysis(video, transcript, JSON.stringify(analysis), session?.user ? (session.user as any).id : undefined)

        revalidatePath(`/canal/[id]`, 'layout')
        return { success: true, analysis }
    } catch (error) {
        console.error("Analysis action error:", error)
        return { success: false, error: (error as Error).message }
    }
}

export async function getNicheIntelligenceAction(nicheId: string) {
    return await getNicheIntelligence(nicheId)
}

export async function saveTrackedChannelAction(channel: TrackedChannel) {
    const session = await getServerSession(authOptions)
    await db.saveTrackedChannel(channel, session?.user ? (session.user as any).id : undefined)
    revalidatePath("/")
    revalidatePath("/tracker")
}

export async function removeTrackedChannelAction(channelId: string) {
    await db.removeTrackedChannel(channelId)
    revalidatePath("/")
    revalidatePath("/tracker")
}

export async function isChannelTrackedAction(channelId: string) {
    const session = await getServerSession(authOptions)
    return await db.isChannelTracked(channelId, session?.user ? (session.user as any).id : undefined)
}

export async function updateChannelNotesAction(channelId: string, notes: string) {
    await db.updateChannelNotes(channelId, notes)
    revalidatePath("/tracker")
}

export async function updateChannelTagsAction(channelId: string, tags: string[]) {
    await db.updateChannelTags(channelId, tags)
    revalidatePath("/tracker")
}

export async function updateSettingsAction(data: { geminiApiKey?: string }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return { success: false, error: "Não autorizado" }

        await db.updateUserSettings((session.user as any).id, data)
        return { success: true }
    } catch (error) {
        console.error("Error updating settings:", error)
        return { success: false, error: error.message }
    }
}

export async function getSettingsAction() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return null

        return await db.getUserSettings((session.user as any).id)
    } catch (error) {
        console.error("Error getting settings:", error)
        return null
    }
}
