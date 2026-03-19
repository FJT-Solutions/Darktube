"use server"

import * as db from "@/lib/database"
import { getNicheIntelligence } from "@/lib/intelligence"
import { revalidatePath } from "next/cache"
import { TrackedChannel } from "@/lib/types"
import { VideoAnalysisService } from "@/lib/video-analysis"
import { createClient } from "@/lib/supabase/server"

export async function getTrackedChannelsAction() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return await db.getTrackedChannels(user?.id)
}

export async function analyzeVideoAction(video: any, channel?: any) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Fetch user's personal API key if logged in
        let userApiKey = process.env.GEMINI_API_KEY;
        if (user) {
            // Use the get_api_key RPC for decryption
            const { data: key } = await supabase.rpc('get_api_key', {
                p_user_id: user.id,
                p_provider: 'gemini'
            })
            if (key) {
                userApiKey = key
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

        // Ensure channel exists if provided
        if (channel) {
            await db.ensureChannelExists(channel, user?.id)
        }

        // Update DB with results
        await db.updateVideoAnalysis(video, transcript, JSON.stringify(analysis), user?.id)

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
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        await db.saveTrackedChannel(channel, user?.id)
        revalidatePath("/")
        revalidatePath("/tracker")
        revalidatePath(`/canal/${channel.id}`)
    } catch (error: any) {
        console.error("Error in saveTrackedChannelAction:", error)
        throw new Error(error.message || "Falha ao salvar canal. Verifique sua conexão.")
    }
}

export async function removeTrackedChannelAction(channelId: string) {
    await db.removeTrackedChannel(channelId)
    revalidatePath("/")
    revalidatePath("/tracker")
    revalidatePath(`/canal/${channelId}`)
}

export async function isChannelTrackedAction(channelId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        return await db.isChannelTracked(channelId, user?.id)
    } catch (error) {
        console.error("Error in isChannelTrackedAction:", error)
        return false
    }
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
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Não autorizado" }

        if (data.geminiApiKey) {
            await db.upsertUserApiKey(user.id, 'gemini', data.geminiApiKey)
        }
        
        return { success: true }
    } catch (error: any) {
        console.error("Error updating settings:", error)
        return { success: false, error: error?.message || "Erro desconhecido" }
    }
}

export async function getSettingsAction() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const geminiKey = await db.getUserApiKey(user.id, 'gemini')
        return { geminiApiKey: geminiKey }
    } catch (error) {
        console.error("Error getting settings:", error)
        return null
    }
}
export async function getPendingInvitesAction() {
    const supabase = await createClient()
    const { data: invites, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return invites
}

import { sendAccessGrantedEmail } from "@/lib/email"

export async function approveInviteAction(inviteId: string) {
    try {
        const supabase = await createClient()
        
        // 1. Get invite details
        const { data: invite, error: fetchError } = await supabase
            .from('invites')
            .select('*')
            .eq('id', inviteId)
            .single()
        
        if (fetchError || !invite) throw new Error("Convite não encontrado")

        // 2. Create the Auth User (Manual Invite)
        // We use inviteUserByEmail which sends a Supabase email, 
        // OR we can use generating an invite link and sending our own email.
        // Let's use our custom email service for better branding.
        const { data: { properties }, error: authError } = await supabase.auth.admin.generateLink({
            type: 'invite',
            email: invite.email,
            options: {
                data: { full_name: invite.name },
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/setup-password`
            }
        })

        if (!properties) throw new Error("Falha ao gerar o link de convite")

        // 3. Update Profile Status
        await db.updateProfileStatus(invite.email, 'approved')

        // 4. Send Custom Email
        await sendAccessGrantedEmail(invite.email, invite.name, properties.action_link)

        // 5. Cleanup Invite
        await supabase.from('invites').delete().eq('id', inviteId)

        revalidatePath("/admin/invites")
        return { success: true }
    } catch (error: any) {
        console.error("Error approving invite:", error)
        return { success: false, error: error.message }
    }
}

export async function getAllProfilesAction() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        // Security check: must be admin OR nathan
        if (profile?.role !== 'admin' && user.email !== 'nathan.jordan@fjt-solutions.com') {
            throw new Error("Não autorizado")
        }

        return await db.getAllProfiles()
    } catch (error) {
        console.error("Error in getAllProfilesAction:", error)
        return []
    }
}

export async function updateUserRoleAction(userId: string, role: 'admin' | 'user') {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autenticado")

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        // Security check: must be admin OR nathan
        if (profile?.role !== 'admin' && user.email !== 'nathan.jordan@fjt-solutions.com') {
            throw new Error("Não autorizado")
        }

        const result = await db.updateProfileRole(userId, role)
        revalidatePath("/settings")
        return result
    } catch (error: any) {
        console.error("Error in updateUserRoleAction:", error)
        return { success: false, error: error.message }
    }
}
