"use server"


import * as db from "@/lib/database"
import { getNicheIntelligence } from "@/lib/intelligence"
import { revalidatePath } from "next/cache"
import { TrackedChannel } from "@/lib/types"
import { VideoAnalysisService } from "@/lib/video-analysis"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { headers } from "next/headers"
import { sendAccessGrantedEmail } from "@/lib/email"

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
        if (!adminSupabase) throw new Error("Erro de configuração do servidor")

        // 1. Fetch pending invites using Admin Client to bypass any broken RLS policies
        // such as those referencing non-existent columns like 'requested_at'
        const { data: invites, error } = await adminSupabase
            .from('invites')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
        
        console.log(`[Invites] Fetch pending result:`, { count: invites?.length, error: error?.message || 'none' })

        if (!invites || invites.length === 0) return []

        // 2. Filter out emails that already have a profile (are already approved/blocked)
        // This handles cases where deletion of the invite failed previously
        const emails = invites.map((i: any) => i.email.toLowerCase().trim())
        const { data: existingProfiles, error: profErr } = await adminSupabase
            .from('profiles')
            .select('email')
        
        if (profErr) console.error("[Invites] Profile check error:", profErr)
        
        const existingEmails = (existingProfiles || []).map((p: any) => p.email.toLowerCase().trim())
        console.log(`[Invites] Profiles found in DB:`, existingEmails)
        
        const activeEmails = new Set(existingEmails)
        const filteredInvites = invites.filter((i: any) => !activeEmails.has(i.email.toLowerCase().trim()))

        console.log(`[Invites] Found ${invites.length} in table, ${filteredInvites.length} after profile filtering. Emails filtered out:`, 
            invites.map((i: any) => i.email).filter(e => activeEmails.has(e.toLowerCase().trim())))
        
        return filteredInvites
    } catch (error) {
        console.error("Error in getPendingInvitesAction:", error)
        return []
    }
}



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

        // 5. Cleanup Invite - Update to 'approved' instead of delete to keep record
        // but hide from pending list. This helps with visibility in DB.
        console.log(`[Admin] Attempting update for invite ID: ${inviteId}`)
        const { data: updRes, error: updateInvErr } = await adminSupabase
            .from('invites')
            .update({ status: 'approved', reviewed_at: new Date().toISOString() })
            .eq('id', inviteId)
            .select()
        
        console.log(`[Admin] Update result for ID ${inviteId}:`, { success: !!updRes, error: updateInvErr?.message || 'none', data: updRes })

        if (updateInvErr || !updRes || updRes.length === 0) {
            console.warn("[Admin] Update failed/no rows, trying delete fallback")
            await adminSupabase.from('invites').delete().eq('id', inviteId)
            await supabase.from('invites').delete().eq('id', inviteId)
        }

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

export async function deleteUserAction(userId: string, email?: string) {
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

        // 0. Determine email for invite cleanup
        let targetEmail = email?.trim().toLowerCase()
        if (!targetEmail) {
            const { data: authUser } = await adminSupabase.auth.admin.getUserById(userId)
            targetEmail = authUser?.user?.email
            
            if (!targetEmail) {
                // Fallback to auth client to find email
                const { data: p } = await supabase.from('profiles').select('email').eq('id', userId).maybeSingle()
                targetEmail = p?.email
            }
        }

        // 1. Delete from App DB (Profiles etc)
        // Try with admin client, then auth client fallback
        const { error: profileError } = await adminSupabase.from('profiles').delete().eq('id', userId)
        if (profileError) {
             console.warn("[Admin] Profile delete via admin failed, trying auth client:", profileError.message)
             await supabase.from('profiles').delete().eq('id', userId)
        }
        
        // 2. Delete any matching invites (to allow re-requestinging)
        if (targetEmail) {
            const cleanEmail = targetEmail.trim().toLowerCase()
            console.log(`[Admin] Cleaning up invites for ${cleanEmail}`)
            
            // Try to find by email first to get ID
            const { data: list } = await adminSupabase.from('invites').select('id').eq('email', cleanEmail)
            const ids = (list || []).map((i: any) => i.id)

            if (ids.length > 0) {
                 await adminSupabase.from('invites').delete().in('id', ids)
            }
            
            // Blanket delete as fallback
            const { error: invErr } = await adminSupabase.from('invites').delete().eq('email', cleanEmail)
            if (invErr) {
                 console.warn("[Admin] Invite delete failed, trying auth client fallback:", invErr.message)
                 await supabase.from('invites').delete().eq('email', cleanEmail)
            }
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
    const cleanEmail = email.trim().toLowerCase()
    try {
        const supabase = await createClient()
        const adminSupabase = await createAdminClient()
        if (!adminSupabase) throw new Error("Erro de configuração do servidor")

        // 1. Check Profiles (Approved users always have a profile)
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('id, status')
            .ilike('email', cleanEmail)
            .maybeSingle()

        if (profile) {
            // If they have an active profile, they don't need a new invite
            if (profile.status !== 'rejected') {
                return { success: false, error: "ESTE_EMAIL_JA_SOLICITOU" }
            }
        }

        // 2. Check if an invite already exists
        const { data: existingInvite } = await adminSupabase
            .from('invites')
            .select('id, status')
            .ilike('email', cleanEmail)
            .maybeSingle()

        if (existingInvite) {
            // If it's pending, just update it to bring to top
            if (existingInvite.status === 'pending') {
                const { error: updateError } = await adminSupabase
                    .from('invites')
                    .update({ 
                        name, 
                        created_at: new Date().toISOString() 
                    })
                    .eq('id', existingInvite.id)
                
                if (updateError) {
                    console.warn("[Invite] Admin update failed, trying auth client:", updateError.message)
                    await supabase
                        .from('invites')
                        .update({ name, created_at: new Date().toISOString() })
                        .eq('id', existingInvite.id)
                }
                return { success: true }
            }
            
            // If it's already approved but no profile exists (cleanup failed), 
            // allow a new invite request to proceed by cleaning up the old one
            if (existingInvite.status === 'approved') {
                console.log(`[Invite] Found stale 'approved' invite for ${email}, cleaning up...`)
                await adminSupabase.from('invites').delete().eq('id', existingInvite.id)
                // proceed to insert/upsert below
            }
            
            // If it's rejected/expired, delete and allow new request
            else if (existingInvite.status === 'rejected' || existingInvite.status === 'expired') {
                await adminSupabase.from('invites').delete().eq('id', existingInvite.id)
            }
        }

        // 2. Insert new invite (bypass RLS check by using admin then auth fallback)
        // Use an upsert-like logic: delete then insert, or just use upsert
        // but invites table might not have email as unique but the logic expects it.
        const { error: finalErr } = await adminSupabase
            .from('invites')
            .upsert({ email: cleanEmail, name, status: 'pending', created_at: new Date().toISOString() }, { onConflict: 'email' })

        if (finalErr) {
            console.warn("[Invite] Upsert via admin failed, falling back to insert:", finalErr.message)
            const { error: insertErr } = await supabase
                .from('invites')
                .insert({ email: cleanEmail, name })

            if (insertErr) {
                if (insertErr.code === '23505') return { success: false, error: "ESTE_EMAIL_JA_SOLICITOU" }
                throw insertErr
            }
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
            'openrouter', 'kie_ai'
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

export async function addBlotatoAccountAction(platform: string, accountId: string, label?: string, pageId?: string, pageName?: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autorizado")

        return await db.addBlotatoAccount(user.id, platform, accountId, label, pageId, pageName)
    } catch (error: any) {
        console.error("Error in addBlotatoAccountAction:", error)
        throw error
    }
}

export async function fetchBlotatoAccountsFromAPIAction() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autorizado")

        const apiKey = await db.getUserApiKey(user.id, 'blotato')
        if (!apiKey) return { success: false, error: "Chave API do Blotato não encontrada. Configure-a na aba IA primeiro." }


        const res = await fetch('https://backend.blotato.com/v2/users/me/accounts', {
            headers: { 'blotato-api-key': apiKey }
        })

        if (!res.ok) {
            const errorText = await res.text()
            throw new Error(`Erro na API Blotato: ${res.status} - ${errorText}`)
        }

        const rawResponse = await res.json()

        // Blotato API returns { items: [...] }
        const accounts: any[] = Array.isArray(rawResponse)
            ? rawResponse
            : (rawResponse.items || rawResponse.accounts || rawResponse.data || [])

        // For Facebook and LinkedIn, fetch subaccounts (pages) automatically
        const PLATFORMS_WITH_PAGES = ['facebook', 'linkedin']
        await Promise.all(
            accounts.map(async (acc) => {
                if (!PLATFORMS_WITH_PAGES.includes(acc.platform)) return
                try {
                    const subRes = await fetch(
                        `https://backend.blotato.com/v2/users/me/accounts/${acc.id}/subaccounts`,
                        { headers: { 'blotato-api-key': apiKey } }
                    )
                    if (!subRes.ok) return
                    const subRaw = await subRes.json()
                    const subItems: any[] = Array.isArray(subRaw)
                        ? subRaw
                        : (subRaw.items || subRaw.pages || subRaw.data || [])
                    if (subItems.length > 0) {
                        acc.pages = subItems
                    }
                } catch {
                    // Silently ignore if subaccounts endpoint doesn't exist for this account
                }
            })
        )

        return { success: true, accounts }
    } catch (error: any) {
        console.error("Error in fetchBlotatoAccountsFromAPIAction:", error)
        return { success: false, error: error.message }
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
export async function checkUserAccessAction(email: string) {
    try {
        const adminSupabase = await createAdminClient()
        if (!adminSupabase) throw new Error("Erro de configuração do servidor")

        // 1. Check Profiles (Approved users)
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('id, status')
            .eq('email', email)
            .maybeSingle()

        if (profile) {
            if (profile.status === 'blocked') return { status: 'blocked' }
            return { status: 'has_access' }
        }

        // 2. Check Invites (Pending users)
        const { data: invite } = await adminSupabase
            .from('invites')
            .select('id, status')
            .eq('email', email)
            .maybeSingle()

        if (invite) {
            // Check if user was deleted but invite remained
            const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers()
            const authUser = authUsers.find(u => u.email === email)
            if (!authUser) {
                 // Orphaned invite, let them in or handle as no access?
                 // Actually if they have a pending invite, they should wait.
                 // But if they WERE deleted, they shouldn't have an invite.
                 return { status: 'pending_invite' }
            }
            return { status: 'pending_invite' }
        }

        // 3. Final Check: Even if no profile/invite, if they are in Auth, they have access
        // This covers Admins and users created manually
        const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers()
        const isAuthUser = authUsers.some(u => u.email === email)
        
        if (isAuthUser) {
            return { status: 'has_access' }
        }

        return { status: 'no_access' }
    } catch (error) {
        console.error("Error in checkUserAccessAction:", error)
        return { status: 'error', error: (error as any).message }
    }
}
