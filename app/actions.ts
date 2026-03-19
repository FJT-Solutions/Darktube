"use server"

import * as db from "@/lib/database"
import { getNicheIntelligence } from "@/lib/intelligence"
import { revalidatePath } from "next/cache"
import { TrackedChannel } from "@/lib/types"
import { VideoAnalysisService } from "@/lib/video-analysis"
import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

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
import { createAdminClient } from "@/lib/supabase/server"

export async function approveInviteAction(inviteId: string) {
    try {
        const supabase = await createClient()
        const adminSupabase = await createAdminClient()
        
        if (!adminSupabase) throw new Error("Configuração de Admin ausente (SERVICE_ROLE_KEY)")

        // 1. Get invite details
        const { data: invite, error: fetchError } = await supabase
            .from('invites')
            .select('*')
            .eq('id', inviteId)
            .single()
        
        if (fetchError || !invite) throw new Error("Convite não encontrado")

        // 2. Create the Auth User (Generate Invite Link)
        const host = (await headers()).get('host')
        const protocol = host?.includes('localhost') ? 'http' : 'https'
        
        let siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        if (!siteUrl || siteUrl.includes('localhost')) {
            if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
                siteUrl = `${protocol}://${host}`
            } else if (!siteUrl) {
                siteUrl = 'https://darktube.fjt.solutions'
            }
        }

        let { data, error: authError } = await adminSupabase.auth.admin.generateLink({
            type: 'invite',
            email: invite.email,
            options: {
                data: { full_name: invite.name },
                redirectTo: `${siteUrl}/dashboard`
            }
        })

        // If user already exists, try magiclink instead
        if (authError?.message?.includes('already been registered') || (authError as any)?.code === 'email_exists') {
            const magicRes = await adminSupabase.auth.admin.generateLink({
                type: 'magiclink',
                email: invite.email,
                options: {
                    redirectTo: `${siteUrl}/dashboard`
                }
            })
            data = magicRes.data
            authError = magicRes.error
        }

        if (authError || !data?.properties?.action_link) {
            throw new Error("Falha ao gerar o link: " + (authError?.message || "Erro desconhecido"))
        }

        // 3. Update Profile Status
        await db.updateProfileStatus(invite.email, 'approved')

        // 4. Send Custom Email
        console.log(`[Admin] Sending welcome email to ${invite.email}`)
        const emailResult = await sendAccessGrantedEmail(invite.email, invite.name, data.properties.action_link)
        if (!emailResult.success) {
             console.warn("[Admin] Email failed but proceeding:", emailResult.error)
        }

        // 5. Cleanup Invite
        await supabase.from('invites').delete().eq('id', inviteId)

        revalidatePath("/admin/invites")
        return { success: true }
    } catch (error: any) {
        console.error("Error approving invite:", error)
        return { success: false, error: error.message }
    }
}

export async function declineInviteAction(inviteId: string) {
    try {
        const supabase = await createClient()
        
        // 1. Get invite to know the email
        const { data: invite } = await supabase
            .from('invites')
            .select('email')
            .eq('id', inviteId)
            .single()
            
        if (invite) {
            await db.updateProfileStatus(invite.email, 'rejected')
        }

        // 2. Delete Invite
        await supabase.from('invites').delete().eq('id', inviteId)

        revalidatePath("/admin/invites")
        return { success: true }
    } catch (error: any) {
        console.error("Error declining invite:", error)
        return { success: false, error: error.message }
    }
}

export async function getAllProfilesAction() {
    try {
        const supabase = await createClient()
        const adminSupabase = await createAdminClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !adminSupabase) return []

        const { data: myProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        // Security check
        if (myProfile?.role !== 'admin' && user.email !== 'nathan.jordan@fjt-solutions.com') {
            throw new Error("Não autorizado")
        }

        const profiles = await db.getAllProfiles()
        const { data: { users: authUsers }, error: authError } = await adminSupabase.auth.admin.listUsers()
        
        if (authError) console.error("Error listing auth users:", authError)

        // Enrich profiles with auth info
        // We iterate over authUsers to make sure "residuos" (remnants) also appear
        const mergedUsers = authUsers.map(authUser => {
            const profile = profiles.find((p: any) => p.email === authUser.email)
            return {
                id: profile?.id || authUser.id,
                email: authUser.email || profile?.email,
                full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Membro Externo',
                role: profile?.role || 'user',
                status: profile?.status || 'approved',
                isRegistered: !!(authUser.last_sign_in_at || authUser.email_confirmed_at),
                lastSignIn: authUser.last_sign_in_at,
                isAuthOnly: !profile
            }
        })

        // Also add profiles that might not have an auth user yet (pending invites)
        profiles.forEach((p: any) => {
            if (!mergedUsers.find(u => u.email === p.email)) {
                mergedUsers.push({
                    ...p,
                    isRegistered: false,
                    lastSignIn: null,
                    isAuthOnly: false
                })
            }
        })

        return mergedUsers
    } catch (error) {
        console.error("Error in getAllProfilesAction:", error)
        return []
    }
}

export async function resendAccessAction(email: string, name: string) {
    try {
        const supabase = await createClient()
        const adminSupabase = await createAdminClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user || !adminSupabase) throw new Error("Não autorizado")

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin' && user.email !== 'nathan.jordan@fjt-solutions.com') {
            throw new Error("Não autorizado")
        }

        const host = (await headers()).get('host')
        const protocol = host?.includes('localhost') ? 'http' : 'https'
        
        let siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        if (!siteUrl || siteUrl.includes('localhost')) {
            if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
                siteUrl = `${protocol}://${host}`
            } else if (!siteUrl) {
                siteUrl = 'https://darktube.fjt.solutions'
            }
        }

        // Generate magic link (works for existing users)
        const { data, error: authError } = await adminSupabase.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
                redirectTo: `${siteUrl}/dashboard`
            }
        })

        if (authError || !data?.properties?.action_link) {
            throw new Error("Falha ao gerar link: " + (authError?.message || "Erro desconhecido"))
        }

        const result = await sendAccessGrantedEmail(email, name, data.properties.action_link)
        return result
    } catch (error: any) {
        console.error("Error in resendAccessAction:", error)
        return { success: false, error: error.message }
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

        // Security check
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

export async function updateUserStatusAction(userId: string, status: 'approved' | 'blocked') {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autenticado")

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        // Security check
        if (profile?.role !== 'admin' && user.email !== 'nathan.jordan@fjt-solutions.com') {
            throw new Error("Não autorizado")
        }

        // We need to find the email of the target user
        const { data: target } = await supabase.from('profiles').select('email').eq('id', userId).single()
        if (!target) throw new Error("Usuário não encontrado")

        const result = await db.updateProfileStatus(target.email, status)
        revalidatePath("/settings")
        return result
    } catch (error: any) {
        console.error("Error in updateUserStatusAction:", error)
        return { success: false, error: error.message }
    }
}

export async function deleteUserAction(userId: string) {
    try {
        const supabase = await createClient()
        const adminSupabase = await createAdminClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user || !adminSupabase) throw new Error("Não autorizado ou configuração ausente")

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        // Security check
        if (profile?.role !== 'admin' && user.email !== 'nathan.jordan@fjt-solutions.com') {
            throw new Error("Não autorizado")
        }

        // 1. Delete from App DB (Profiles etc)
        await db.deleteProfile(userId)
        
        // 2. Delete from Auth (requires Admin Client)
        const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId)
        if (authError) console.warn("Auth deletion failed:", authError)

        revalidatePath("/settings")
        return { success: true }
    } catch (error: any) {
        console.error("Error in deleteUserAction:", error)
        return { success: false, error: error.message }
    }
}
