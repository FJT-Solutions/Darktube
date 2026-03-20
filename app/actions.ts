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
    try {
        const supabase = await createClient()
        const adminSupabase = await createAdminClient()
        const { data: invites, error } = await supabase
            .from('invites')
            .select('*')
            .eq('status', 'pending')
            .order('requested_at', { ascending: false })
        
        if (error) throw error

        // 2. Filter out invites for users who already have a profile
        let existingEmails: string[] = []
        if (adminSupabase) {
            const { data: profiles } = await adminSupabase.from('profiles').select('email')
            existingEmails = profiles?.map(p => p.email) || []
        }
        
        const filteredInvites = (invites || []).filter((i: any) => !existingEmails.includes(i.email))
        
        // 3. Optional: Background cleanup of these stale invites
        const staleInvites = (invites || []).filter((i: any) => existingEmails.includes(i.email))
        if (staleInvites.length > 0 && adminSupabase) {
            const staleIds = staleInvites.map((i: any) => i.id)
            adminSupabase.from('invites').delete().in('id', staleIds).then(() => {
                console.log(`[Admin] Cleaned up ${staleIds.length} stale invites.`)
            })
        }

        return filteredInvites
    } catch (error) {
        console.error("Error in getPendingInvitesAction:", error)
        return []
    }
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
        const heads = await headers()
        const host = heads.get('x-forwarded-host') || heads.get('host')
        const protocol = heads.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
        
        console.log(`[Admin] Generating link. Host: ${host}, Protocol: ${protocol}`)

        let siteUrl = 'https://darktube.fjt-solutions.com'
        
        // Only use localhost/detect automatically if we are VERY sure it's local dev
        if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
            siteUrl = `${protocol}://${host}`
        }
        
        console.log(`[Admin] Using siteUrl: ${siteUrl}`)

        let { data, error: authError } = await adminSupabase.auth.admin.generateLink({
            type: 'invite',
            email: invite.email,
            options: {
                data: { full_name: invite.name },
                redirectTo: `${siteUrl}/setup-password`
            }
        })

        // If user already exists, try magiclink instead
        if (authError?.message?.includes('already been registered') || (authError as any)?.code === 'email_exists') {
            const magicRes = await adminSupabase.auth.admin.generateLink({
                type: 'magiclink',
                email: invite.email,
                options: {
                    redirectTo: `${siteUrl}/setup-password`
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

        // 5. Cleanup Invite (Use admin client to ensure bypass of RLS)
        await adminSupabase.from('invites').delete().eq('id', inviteId)
        
        // Also cleanup any other invites with same email to be sure
        await adminSupabase.from('invites').delete().eq('email', invite.email)

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
        const adminSupabase = await createAdminClient()
        if (!adminSupabase) throw new Error("Configuração de Admin ausente (SERVICE_ROLE_KEY)")

        // 1. Get invite details
        const { data: invite } = await supabase
            .from('invites')
            .select('email')
            .eq('id', inviteId)
            .single()

        if (!invite) throw new Error("Convite não encontrado")

        const email = invite.email

        // 2. Find and Delete Profile (if exists)
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single()

        if (profile) {
            // Delete profile
            await adminSupabase.from('profiles').delete().eq('id', profile.id)
            
            // Delete Auth User
            const { error: authError } = await adminSupabase.auth.admin.deleteUser(profile.id)
            if (authError) {
                console.warn("[Admin] Could not delete auth user (might not exist):", authError.message)
            }
        } else {
            // If no profile, try to find by email in auth anyway to be safe
            const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers()
            if (!listError) {
                const userToDelete = users.find(u => u.email === email)
                if (userToDelete) {
                    await adminSupabase.auth.admin.deleteUser(userToDelete.id)
                }
            }
        }

        // 3. Delete ALL invites for this email
        await adminSupabase.from('invites').delete().eq('email', email)

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
                isRegistered: authUser.user_metadata?.password_set === true,
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

        const heads = await headers()
        const host = heads.get('x-forwarded-host') || heads.get('host')
        const protocol = heads.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
        
        let siteUrl = 'https://darktube.fjt-solutions.com'
        
        if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
            siteUrl = `${protocol}://${host}`
        }
        
        console.log(`[Admin] Resending access. Host: ${host}, Using siteUrl: ${siteUrl}`)
        

        // Generate magic link (works for existing users)
        const { data, error: authError } = await adminSupabase.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
                redirectTo: `${siteUrl}/setup-password`
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

        // 0. Get email of the target user first
        const { data: targetProfile } = await adminSupabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .single()
        
        let targetEmail = targetProfile?.email

        // If not in profiles, try to get from Auth
        if (!targetEmail) {
            const { data: authUser } = await adminSupabase.auth.admin.getUserById(userId)
            targetEmail = authUser?.user?.email
        }

        // 1. Delete from App DB (Profiles etc)
        await db.deleteProfile(userId)
        
        // 2. Delete any matching invites (to allow re-requesting)
        if (targetEmail) {
            await adminSupabase.from('invites').delete().eq('email', targetEmail)
            console.log(`[Admin] Cleaned up invites for ${targetEmail}`)
        }
        
        // 3. Delete from Auth (requires Admin Client)
        const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId)
        if (authError) console.warn("Auth deletion failed:", authError)

        revalidatePath("/admin/users")
        revalidatePath("/settings")
        return { success: true }
    } catch (error: any) {
        console.error("Error in deleteUserAction:", error)
        return { success: false, error: error.message }
    }
}

export async function requestInviteAction(email: string, name: string) {
    try {
        const supabase = await createClient()
        const adminSupabase = await createAdminClient()
        if (!adminSupabase) throw new Error("Erro de configuração do servidor")

        // 1. Check if an invite already exists
        const { data: existingInvite } = await adminSupabase
            .from('invites')
            .select('id, status')
            .eq('email', email)
            .maybeSingle()

        if (existingInvite) {
            // Check if user actually exists in Auth or Profiles
            const { data: profile } = await adminSupabase.from('profiles').select('id').eq('email', email).maybeSingle()
            
            const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers()
            const authUser = authUsers.find(u => u.email === email)

            if (!profile && !authUser) {
                // If neither exists, the invite is orphaned. Clean it up to allow a new request.
                console.log(`[Invite] Cleaning up orphaned invite for ${email}`)
                await adminSupabase.from('invites').delete().eq('email', email)
            } else {
                return { success: false, error: "ESTE_EMAIL_JA_SOLICITOU" }
            }
        }

        // 2. Insert new invite (bypass RLS for the check using admin client if needed, 
        // but here we just insert as public)
        const { error } = await supabase
            .from('invites')
            .insert({ email, name })

        if (error) {
            if (error.code === '23505') return { success: false, error: "ESTE_EMAIL_JA_SOLICITOU" }
            throw error
        }

        return { success: true }
    } catch (error: any) {
        console.error("Error in requestInviteAction:", error)
        return { success: false, error: error.message }
    }
}

export async function getCredentialsAction() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autorizado")

        const providers = [
            'blotato', 'gemini', 'openai', 'elevenlabs', 'claude', 
            'openrouter', 'kie_ai', 'meta_app_id', 'meta_app_secret', 
            'meta_client_token', 'meta_access_token'
        ]
        const keys: Record<string, string> = {}
        
        for (const provider of providers) {
            const key = await db.getUserApiKey(user.id, provider)
            if (key) keys[provider] = key
        }
        
        return keys
    } catch (error: any) {
        console.error("Error in getCredentialsAction:", error)
        return {}
    }
}

export async function updateCredentialsAction(provider: string, key: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Não autorizado" }

        await db.upsertUserApiKey(user.id, provider, key)
        revalidatePath('/credentials')
        revalidatePath('/settings')
        return { success: true }
    } catch (error: any) {
        console.error("Error in updateCredentialsAction:", error)
        return { success: false, error: error.message }
    }
}

export async function updateCredentialsBulkAction(data: Record<string, string>) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Não autorizado" }

        for (const [provider, key] of Object.entries(data)) {
            await db.upsertUserApiKey(user.id, provider, key)
        }
        
        revalidatePath('/credentials')
        revalidatePath('/settings')
        return { success: true }
    } catch (error: any) {
        console.error("Error in updateCredentialsBulkAction:", error)
        return { success: false, error: error.message }
    }
}

export async function getBlotatoAccountsAction() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        return await db.getBlotatoAccounts(user.id)
    } catch (error: any) {
        console.error("Error in getBlotatoAccountsAction:", error)
        return []
    }
}

export async function addBlotatoAccountAction(platform: string, accountId: string, label?: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autorizado")

        return await db.addBlotatoAccount(user.id, platform, accountId, label)
    } catch (error: any) {
        console.error("Error in addBlotatoAccountAction:", error)
        throw error
    }
}

export async function removeBlotatoAccountAction(id: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autorizado")

        return await db.removeBlotatoAccount(id)
    } catch (error: any) {
        console.error("Error in removeBlotatoAccountAction:", error)
        throw error
    }
}
