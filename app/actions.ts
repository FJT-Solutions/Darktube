"use server"

import * as db from "@/lib/database"
import { getNicheIntelligence } from "@/lib/intelligence"
import { revalidatePath } from "next/cache"
import { TrackedChannel } from "@/lib/types"
import { parseYouTubeDate, cn } from "@/lib/utils"
import { VideoAnalysisService } from "@/lib/video-analysis"
import { getCurrentUser, createSession, deleteSession } from "@/lib/auth-helpers"
import { hashPassword, verifyPassword, verifyJWT, signJWT } from "@/lib/crypto"
import { headers } from "next/headers"
import { sendAccessGrantedEmail, sendPasswordResetEmail } from "@/lib/email"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { pool } from "@/lib/db-client"

async function assertAdmin(userId: string) {
    const profile = await db.getProfileById(userId)
    
    if (profile?.role !== 'admin') {
        throw new Error('Não autorizado')
    }
}


/**
 * Analyze a video from any external URL (TikTok, Instagram, Vimeo, etc.)
 * Uses yt-dlp for download and Gemini 2.5 Flash for AI analysis.
 */
export async function analyzeExternalVideoAction(url: string, videoMetadata?: any) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return { success: false, error: "Você precisa estar logado para analisar vídeos." }
        }

        // Fetch Gemini API key
        let geminiApiKey: string | undefined = process.env.GEMINI_API_KEY;
        const userKey = await db.getUserApiKey(user.id, 'gemini')
        if (userKey) geminiApiKey = userKey;

        if (!geminiApiKey) {
            return {
                success: false,
                error: "Chave de API Gemini não encontrada. Adicione sua chave em Credenciais."
            }
        }

        // Run external analysis via yt-dlp download + Gemini
        const analysis = await VideoAnalysisService.performExternalAnalysis(url, geminiApiKey)

        // Save to database if metadata was provided
        if (videoMetadata) {
            const videoForDb = {
                id: videoMetadata.id || url,
                title: videoMetadata.title || 'Vídeo Externo',
                thumbnail: videoMetadata.thumbnail || '',
                views: videoMetadata.views || 0,
                duration: videoMetadata.duration || '0:00',
                publishedAt: parseYouTubeDate(videoMetadata.publishedAt) || null,
                channelId: videoMetadata.uploaderId || '',
                channelName: videoMetadata.channelName || videoMetadata.uploader || 'Externo',
                description: videoMetadata.description || '',
                url: videoMetadata.url || url,
                likes: videoMetadata.likes || 0,
                comments: videoMetadata.comments || 0,
            }
            // Ensure channel exists before updating video analysis to avoid FK error
            const channelObj = {
                id: videoMetadata.uploaderId || videoMetadata.channelId || '',
                name: videoMetadata.uploader || videoMetadata.channelName || 'Externo',
                handle: '',
                avatar: videoMetadata.thumbnail || '',
                banner: '',
                subscribers: 0,
                totalViews: 0,
                videoCount: 0,
                description: '',
                url: '',
            };
            if (channelObj.id) {
                await db.ensureChannelExists(channelObj as any, user.id);
            }
            
            await db.updateVideoAnalysis(videoForDb, analysis.transcript || '', JSON.stringify(analysis), user.id)
        }

        return { success: true, analysis, transcript: analysis.transcript || '' }
    } catch (error) {
        console.error("analyzeExternalVideoAction error:", error)
        return { success: false, error: (error as Error).message }
    }
}


export async function getTrackedChannelsAction() {
    const user = await getCurrentUser()
    return await db.getTrackedChannels(user?.id)
}

export async function analyzeVideoAction(video: any, channel?: any) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return { success: false, error: "Você precisa estar logado para analisar vídeos." }
        }

        // Fetch Gemini API key (required for visual analysis)
        let geminiApiKey: string | undefined = process.env.GEMINI_API_KEY;
        const userKey = await db.getUserApiKey(user.id, 'gemini')
        if (userKey) geminiApiKey = userKey;

        if (!geminiApiKey) {
            return {
                success: false,
                error: "Chave de API Gemini não encontrada. Adicione sua chave em Credenciais para usar a análise visual."
            }
        }

        // Ensure channel exists if provided
        if (channel) {
            await db.ensureChannelExists(channel, user.id)
        } else if (video.channelId) {
            // Fallback for missing channel object but present channelId
            await db.ensureChannelExists({
                id: video.channelId,
                name: video.channelName || 'Externo',
                avatar: video.thumbnail || '',
                subscribers: 0,
                totalViews: 0,
                videoCount: 0,
                description: '',
                handle: '',
                url: '',
            } as any, user.id);
        }

        // Fetch transcript in background (optional — used later for script generation)
        const transcript = await VideoAnalysisService.getTranscript(video.id)

        // Run full visual analysis via Gemini 2.5 Flash + File API
        const analysis = await VideoAnalysisService.performVisualAnalysis(video.id, geminiApiKey)

        // Save to database (parse date first)
        const videoToSave = {
            ...video,
            publishedAt: parseYouTubeDate(video.publishedAt)
        }
        await db.updateVideoAnalysis(videoToSave, transcript, JSON.stringify(analysis), user.id)

        revalidatePath(`/canal/[id]`, 'layout')
        return { success: true, analysis, transcript }
    } catch (error) {
        console.error("analyzeVideoAction error:", error)
        return { success: false, error: (error as Error).message }
    }
}

export type ScriptProvider = 'gemini' | 'openai' | 'claude';

export async function generateScriptAction(
    videoId: string,
    videoTitle: string,
    analysisJson: string,
    transcript: string,
    provider: ScriptProvider = 'openai',
    videoDuration?: number
) {
    try {
        const user = await getCurrentUser()

        if (!user) return { success: false, error: "Não autorizado." }

        // Retrieve the chosen provider's API key
        let providerData: string | undefined;
        const apiKey = await db.getUserApiKey(user.id, provider)
        providerData = apiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : undefined);

        if (!providerData) {
            return {
                success: false,
                error: `Chave de API para "${provider}" não encontrada. Adicione em Credenciais.`
            }
        }

        const analysis = JSON.parse(analysisJson)
        const template = analysis?.remodeling_template
        const audioType = analysis?.detected_audio_type || 'voice'
        const audioDesc = analysis?.original_audio_description || ''
        const duration = videoDuration || analysis?.duration || null
        const durationText = duration ? `DURAÇÃO EXATA DO VÍDEO: ${Math.round(duration)} segundos. O último timestamp DEVE terminar em exatamente ${Math.round(duration)} segundos. NÃO EXCEDA este tempo.` : '';

        // Build audio-aware instructions
        let audioRules = '';
        if (audioType === 'music_only') {
            audioRules = `REGRA CRÍTICA DE ÁUDIO: O vídeo original NÃO tem narração/voz humana. Ele tem APENAS música/som de fundo ("${audioDesc}").
O campo "voiceover" de CADA segmento deve ter:
- "text": "" (vazio - SEM texto de locução)
- "style": "No narration - music only: ${audioDesc}"
NÃO invente narração. O vídeo remodelado deve ser FIEL ao original: apenas visual + música.`;
        } else if (audioType === 'none') {
            audioRules = `REGRA CRÍTICA DE ÁUDIO: O vídeo original NÃO tem áudio (silêncio total).
O campo "voiceover" de CADA segmento deve ter:
- "text": "" (vazio)
- "style": "No audio - complete silence or subtle ambient music"
NÃO invente narração nem música. Mantenha fidelidade ao original.`;
        } else {
            audioRules = `ÁUDIO: O vídeo original TEM narração humana ("${audioDesc}").
O campo "voiceover" DEVE conter texto de locução remodelado em Português (PT-BR), com o mesmo tom e estilo do original. NUNCA deixe o campo "voiceover.text" vazio quando o vídeo original tem narração.`;
        }

        const rawScriptPrompt = await db.getSystemPromptContent('script_generator')
        const systemPrompt = rawScriptPrompt
            .replace('{videoTitle}', videoTitle)
            .replace('{durationText}', durationText)
            .replace('{audioRules}', audioRules)
            .replace('{analysisStyle}', analysis?.style || 'Informativo')
            .replace('{visualDirectives}', template?.visual_directives || 'Manter coerência visual')
            .replace('{videoStyle}', template?.video_style || 'Cinematográfico')
            .replace('{compositionRules}', template?.composition_rules || 'Regra dos terços')
            .replace('{musicStyle}', template?.music_style || 'Épica')
            .replace('{aiStack}', JSON.stringify(template?.ai_stack || {}))
            .replace('{transcript}', transcript?.slice(0, 2000) || 'Não disponível')

        let scriptText = '';

        if (provider === 'gemini') {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(providerData);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent([
                systemPrompt,
                `Gere o roteiro de produção estruturado em JSON.`
            ]);
            scriptText = result.response.text();
        } else if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${providerData}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Gere o roteiro de produção estruturado em JSON para "${videoTitle}".` }
                    ],
                    temperature: 0.7,
                    response_format: { type: "json_object" },
                })
            });
            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: `Erro OpenAI: ${data?.error?.message || response.statusText}` }
            }
            scriptText = data?.choices?.[0]?.message?.content || '';
        } else if (provider === 'claude') {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': providerData,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 8192,
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: `Gere o roteiro de produção estruturado em JSON para "${videoTitle}". Responda SOMENTE com o JSON, sem markdown.` }
                    ]
                })
            });
            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: `Erro Claude: ${data?.error?.message || response.statusText}` }
            }
            scriptText = data?.content?.[0]?.text || '';
        }

        if (!scriptText) {
            return { success: false, error: "O provider não retornou um roteiro válido." }
        }

        // Parse structured segments from the response
        let scriptSegments: any[] = [];
        let parsedData: any = {};
        try {
            const cleanJson = scriptText.includes('```json')
                ? scriptText.split('```json')[1].split('```')[0].trim()
                : scriptText.trim();
            parsedData = JSON.parse(cleanJson);
            scriptSegments = parsedData.script_base || parsedData.segments || [];
        } catch (parseErr) {
            console.warn("[generateScriptAction] Could not parse structured JSON, returning raw text:", parseErr);
        }

        return { success: true, script: scriptText, scriptSegments, parsedData }
    } catch (error) {
        console.error("generateScriptAction error:", error)
        return { success: false, error: (error as Error).message }
    }
}


export async function getNicheIntelligenceAction(nicheId: string) {
    return await getNicheIntelligence(nicheId)
}

export async function saveTrackedChannelAction(channel: TrackedChannel) {
    try {
        const user = await getCurrentUser()
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
    const user = await getCurrentUser()
    if (!user) throw new Error('Não autorizado')

    await db.removeTrackedChannel(channelId)
    revalidatePath("/")
    revalidatePath("/tracker")
    revalidatePath(`/canal/${channelId}`)
}

export async function isChannelTrackedAction(channelId: string) {
    try {
        const user = await getCurrentUser()
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
        const user = await getCurrentUser()
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
        const user = await getCurrentUser()
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
        const invites = await db.getPendingInvites()
        return invites
    } catch (error) {
        console.error("Error in getPendingInvitesAction:", error)
        return []
    }
}

export async function approveInviteAction(inviteId: string) {
    try {
        // 1. Get invite details
        const invite = await db.getInviteById(inviteId)
        if (!invite) throw new Error("Convite não encontrado")

        // 2. Create token link for password setup
        const heads = await headers()
        const host = heads.get('x-forwarded-host') || heads.get('host')
        const protocol = heads.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
        
        let siteUrl = 'https://darktube.fjt-solutions.com'
        if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
            siteUrl = `${protocol}://${host}`
        }
        
        // Generate setup token (JWT valid for 3 days)
        const setupToken = await signJWT({ email: invite.email, purpose: 'setup-password' }, 72 * 3600)
        const actionLink = `${siteUrl}/setup-password?token=${setupToken}`

        // 3. Create profile/user record in postgres with status = 'approved'
        const existingProfile = await db.getProfileByEmail(invite.email)
        if (!existingProfile) {
            await db.createUser(invite.email, '', invite.name, 'user', 'approved')
        } else {
            await db.updateProfileStatus(invite.email, 'approved')
        }

        // 4. Send Custom Email
        console.log(`[Admin] Sending welcome email to ${invite.email}`)
        const emailResult = await sendAccessGrantedEmail(invite.email, invite.name, actionLink)
        if (!emailResult.success) {
             console.warn("[Admin] Email failed but proceeding:", emailResult.error)
        }

        // 5. Cleanup Invite - Update to 'approved'
        await db.updateInviteStatus(inviteId, 'approved')

        revalidatePath("/admin/invites")
        return { success: true }
    } catch (error: any) {
        console.error("Error approving invite:", error)
        return { success: false, error: error.message }
    }
}

export async function declineInviteAction(inviteId: string) {
    try {
        const invite = await db.getInviteById(inviteId)
        if (!invite) throw new Error("Convite não encontrado")

        const email = invite.email

        // Find and Delete Profile (if exists)
        const profile = await db.getProfileByEmail(email)
        if (profile) {
            await db.deleteProfile(profile.id)
        }

        // Delete invite
        await db.deleteInviteById(inviteId)

        revalidatePath("/admin/invites")
        return { success: true }
    } catch (error: any) {
        console.error("Error declining invite:", error)
        return { success: false, error: error.message }
    }
}

export async function getAllProfilesAction() {
    try {
        const user = await getCurrentUser()
        if (!user) return []

        await assertAdmin(user.id)

        const profiles = await db.getAllProfiles()
        return profiles.map((p: any) => ({
            id: p.id,
            email: p.email,
            full_name: p.full_name || 'Membro Externo',
            role: p.role || 'user',
            status: p.status || 'approved',
            isRegistered: !!p.password_hash,
            lastSignIn: null,
            isAuthOnly: false
        }))
    } catch (error) {
        console.error("Error in getAllProfilesAction:", error)
        return []
    }
}

export async function resendAccessAction(email: string, name: string) {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autorizado")

        await assertAdmin(user.id)

        const heads = await headers()
        const host = heads.get('x-forwarded-host') || heads.get('host')
        const protocol = heads.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
        
        let siteUrl = 'https://darktube.fjt-solutions.com'
        if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
            siteUrl = `${protocol}://${host}`
        }
        
        const setupToken = await signJWT({ email, purpose: 'setup-password' }, 72 * 3600)
        const actionLink = `${siteUrl}/setup-password?token=${setupToken}`

        const result = await sendAccessGrantedEmail(email, name, actionLink)
        return result
    } catch (error: any) {
        console.error("Error in resendAccessAction:", error)
        return { success: false, error: error.message }
    }
}

export async function updateUserRoleAction(userId: string, role: 'admin' | 'user') {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autenticado")

        await assertAdmin(user.id)

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
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autenticado")

        await assertAdmin(user.id)

        const target = await db.getProfileById(userId)
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
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autorizado ou configuração ausente")

        await assertAdmin(user.id)

        let targetEmail = email?.trim().toLowerCase()
        if (!targetEmail) {
            const target = await db.getProfileById(userId)
            targetEmail = target?.email
        }

        // Delete from App DB
        await db.deleteProfile(userId)
        
        // Delete any matching invites
        if (targetEmail) {
            await db.deleteInviteByEmail(targetEmail)
        }

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
        // 1. Check Profiles (Approved users always have a profile)
        const profile = await db.getProfileByEmail(cleanEmail)
        if (profile) {
            if (profile.status !== 'rejected') {
                return { success: false, error: "ESTE_EMAIL_JA_SOLICITOU" }
            }
        }

        // 2. Check if invite already exists
        const existingInvite = await db.getInviteByEmail(cleanEmail)
        if (existingInvite) {
            if (existingInvite.status === 'pending') {
                await db.createInvite(cleanEmail, name, 'pending')
                return { success: true }
            }
            if (existingInvite.status === 'approved' || existingInvite.status === 'rejected' || existingInvite.status === 'expired') {
                await db.deleteInviteByEmail(cleanEmail)
            }
        }

        // 3. Create new invite
        await db.createInvite(cleanEmail, name, 'pending')
        return { success: true }
    } catch (error: any) {
        console.error("Error in requestInviteAction:", error)
        return { success: false, error: error.message }
    }
}

export async function getCredentialsAction() {
    try {
        const user = await getCurrentUser()
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
        const user = await getCurrentUser()
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

export async function addBlotatoAccountAction(platform: string, accountId: string, label?: string, pageId?: string, pageName?: string, avatarUrl?: string) {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autorizado")

        return await db.addBlotatoAccount(user.id, platform, accountId, label, pageId, pageName, avatarUrl)
    } catch (error: any) {
        console.error("Error in addBlotatoAccountAction:", error)
        throw error
    }
}

export async function fetchBlotatoAccountsFromAPIAction() {
    try {
        const user = await getCurrentUser()
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
        if (!rawResponse) throw new Error("Resposta da API Blotato vazia.")

        // Blotato API returns { items: [...] } or array
        const rawItems: any[] = Array.isArray(rawResponse)
            ? rawResponse
            : (rawResponse.items || rawResponse.accounts || rawResponse.data || [])

        if (!Array.isArray(rawItems)) {
            return { success: true, accounts: [] }
        }

        // Map accounts to a standard format for easier processing
        const accounts = rawItems.map(acc => ({
            ...acc,
            id: acc.id || acc.accountId || acc._id,
            platform: acc.platform || acc.type,
            username: acc.username || acc.fullname || acc.name || acc.handle
        }))

        // For Facebook and LinkedIn, fetch subaccounts (pages) automatically
        const PLATFORMS_WITH_PAGES = ['facebook', 'linkedin']
        await Promise.all(
            accounts.map(async (acc) => {
                if (!acc.id || !PLATFORMS_WITH_PAGES.includes(acc.platform)) return
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
                    // Silently ignore if subaccounts endpoint doesn't exist
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
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autorizado")

        // Verify ownership before deleting
        const account = await db.getBlotatoAccountById(id)
        if (!account || account.user_id !== user.id) throw new Error("Conta não encontrada ou não pertence a você.")

        return await db.removeBlotatoAccount(id)
    } catch (error: any) {
        console.error("Error in removeBlotatoAccountAction:", error)
        throw error
    }
}
export async function checkUserAccessAction(email: string) {
    try {
        const cleanEmail = email.trim().toLowerCase()
        // 1. Check Profiles (Approved users)
        const profile = await db.getProfileByEmail(cleanEmail)
        if (profile) {
            if (profile.status === 'blocked') return { status: 'blocked' }
            return { status: 'has_access' }
        }

        // 2. Check Invites (Pending users)
        const invite = await db.getInviteByEmail(cleanEmail)
        if (invite) {
            return { status: 'pending_invite' }
        }

        return { status: 'no_access' }
    } catch (error) {
        console.error("Error in checkUserAccessAction:", error)
        return { status: 'error', error: (error as any).message }
    }
}

export async function getBlotatoAccountsAction() {
    try {
        const user = await getCurrentUser()
        if (!user) return []
        return await db.getBlotatoAccounts(user.id)
    } catch (error) {
        console.error("Error in getBlotatoAccountsAction:", error)
        return []
    }
}

export async function saveRemodelingTemplateAction(data: any) {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autorizado")

        const result = await db.saveRemodelingTemplate(user.id, data)
        return { success: true, data: result }
    } catch (error: any) {
        console.error("Error in saveRemodelingTemplateAction:", error)
        return { success: false, error: error.message || "Falha ao salvar template." }
    }
}

export async function updateRemodelingTemplateAction(templateId: string, data: any) {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autorizado")

        const result = await db.updateRemodelingTemplate(templateId, data)
        return { success: true, data: result }
    } catch (error: any) {
        console.error("Error in updateRemodelingTemplateAction:", error)
        return { success: false, error: error.message || "Falha ao atualizar template." }
    }
}

export async function getRemodelingTemplatesAction() {
    try {
        const user = await getCurrentUser()
        if (!user) return []
        return await db.getRemodelingTemplates(user.id)
    } catch (error) {
        console.error("Error in getRemodelingTemplatesAction:", error)
        return []
    }
}

export async function getRemodelingTemplateByIdAction(id: string) {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autorizado")
        
        const template = await db.getRemodelingTemplateById(id)
        if (template.user_id !== user.id) throw new Error("Acesso negado")
        
        return template
    } catch (error: any) {
        console.error("Error in getRemodelingTemplateByIdAction:", error)
        throw error
    }
}

export async function getProductionHistoryAction(templateId: string) {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autorizado")
        
        // Ensure template belongs to user
        const template = await db.getRemodelingTemplateById(templateId)
        if (template.user_id !== user.id) throw new Error("Acesso negado")
        
        return await db.getProductionHistory(templateId)
    } catch (error) {
        console.error("Error in getProductionHistoryAction:", error)
        return []
    }
}

export async function sendToN8NAction(templateId: string) {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autorizado")

        // 1. Get Template
        const template = await db.getRemodelingTemplateById(templateId)
        if (template.user_id !== user.id) throw new Error("Acesso negado")

        // 2. Prepare Payload
        let webhookUrl = await db.getUserApiKey(user.id, 'n8n_webhook')
        if (!webhookUrl) webhookUrl = process.env.N8N_PRODUCTION_WEBHOOK_URL || 'https://n8n.fjt-solutions.com/webhook/darktube_producao'
        if (!webhookUrl) throw new Error("n8n Webhook URL não configurada.")

        let parsedScript: any = {}
        try {
            if (template.generated_script) {
                const cleanJson = template.generated_script.includes('```json') 
                    ? template.generated_script.split('```json')[1].split('```')[0].trim() 
                    : template.generated_script.trim()
                parsedScript = JSON.parse(cleanJson)
            }
        } catch (e) {
            console.warn("Could not parse script for payload enrichment")
        }

        const payload = {
            message: "Production Request from DarkTube",
            timestamp: new Date().toISOString(),
            user_id: user.id,
            template: {
                id: template.id,
                name: template.name,
                video_url: `https://youtube.com/watch?v=${template.video_id}`,
                original_video_id: template.video_id,
                video_title: template.video_title,
                video_thumbnail: template.video_thumbnail,
                format: template.format,
                engine_mode: template.engine_mode || 'local',
                image_model: template.image_model || 'gemini-2.5-flash-image',
                thumbnail_model: template.thumbnail_model || template.image_model || 'gemini-2.5-flash-image',
                video_model: template.video_model || 'gemini-veo-3.1-fast-1080p',
                voice_model: template.voice_model || 'edge-tts-docker',
                music_model: template.music_model || 'suno-v4',
                render_model: template.render_model || 'remotion-engine',
                voice: template.voice_type,
                voice_language: template.voice_language || 'pt-BR',
                has_music: template.has_music,
                music_style: template.music_style,
                post_frequency: template.post_frequency,
                post_days: template.post_days || [],
                post_times: template.post_times || [],
                target_accounts: template.target_accounts || [],
                thumbnail_prompt: template.template_data?.remodeling_template?.thumbnail_prompt || "",
                music_prompt: parsedScript.music_prompt || "",
                sfx_prompt: parsedScript.sfx_prompt || "",
                script_segments: parsedScript.script_base || template.template_data?.remodeling_template?.script_base || [],
                generated_script: template.generated_script || "",
                ai_analysis: template.template_data
            }
        }

        // 3. Send to n8n
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Erro no n8n: ${response.status} - ${errorText}`)
        }

        // 4. Record in History
        await db.saveProductionHistory({
            template_id: templateId,
            original_video_id: template.video_id,
            payload,
            status: 'sent'
        })

        // 5. Update last dispatched
        await db.updateRemodelingTemplate(templateId, { last_dispatched_at: new Date().toISOString() })

        revalidatePath(`/templates/${templateId}`)
        return { success: true }
    } catch (error: any) {
        console.error("Error in sendToN8NAction:", error)
        return { success: false, error: error.message || "Erro ao disparar produção." }
    }
}

export async function deleteRemodelingTemplateAction(id: string) {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autorizado")

        // Verify ownership before deleting
        const template = await db.getRemodelingTemplateById(id)
        if (!template || template.user_id !== user.id) throw new Error("Template não encontrado ou não pertence a você.")

        return await db.deleteRemodelingTemplate(id)
    } catch (error: any) {
        console.error("Error in deleteRemodelingTemplateAction:", error)
        return { success: false, error: error.message || "Falha ao excluir template." }
    }
}

export async function updateTemplateStatusAction(id: string, isActive: boolean) {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autorizado")
        return await db.updateRemodelingTemplateStatus(id, isActive)
    } catch (error: any) {
        console.error("Error in updateTemplateStatusAction:", error)
        return { success: false, error: error.message || "Falha ao atualizar status." }
    }
}

export async function getRecentVideosAction(limit = 12) {
    try {
        const user = await getCurrentUser()
        if (!user) return []
        
        return await db.getRecentVideos(limit)
    } catch (error: any) {
        console.error("Error in getRecentVideosAction:", error)
        return []
    }
}

export async function getSmartRecommendationsAction(limit = 12) {
    const YouTube = (await import("youtube-sr")).default

    // Helper: search YouTube with fallback
    async function searchYouTube(query: string, searchLimit: number) {
        console.log("[SmartRecommendations] Buscando YouTube:", query)
        try {
            const results = await YouTube.search(query, {
                limit: searchLimit,
                type: "video",
                safeSearch: false
            })
            return (results || []).map((video: any) => ({
                id: video.id || "",
                title: video.title || "",
                thumbnail: video.thumbnail?.url || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
                views: video.views || 0,
                likes: 0,
                comments: 0,
                duration: video.durationFormatted || "0:00",
                publishedAt: video.uploadedAt || "",
                channelId: video.channel?.id || "",
                channelName: video.channel?.name || "",
                description: video.description || "",
                url: video.url || `https://www.youtube.com/watch?v=${video.id}`
            }))
        } catch (err: any) {
            console.warn("[SmartRecommendations] Falha no youtube-sr para a query:", query)
            return []
        }
    }

    // Pool de buscas genéricas para contas novas ou fallback
    const trendingSearches = [
        "motivação viral shorts 2024",
        "curiosidades incríveis mundo",
        "finanças renda passiva dicas",
        "estoicismo mentalidade forte",
        "desenvolvimento pessoal sucesso",
        "psicologia fatos surpreendentes",
        "inteligência artificial novidades",
        "história fatos pouco conhecidos",
        "saúde dicas cientificas",
        "produtividade hábitos milionários",
    ]

    try {
        // 1. Tenta busca personalizada se o usuário estiver logado
        let queryWords: string[] = []
        
        try {
            const user = await getCurrentUser()
            
            if (user) {
                // Busca canais rastreados para contexto
                const trackedData = await db.getTrackedChannels(user.id)

                if (trackedData && trackedData.length > 0) {
                    trackedData.forEach((c: any) => {
                        if (c.name) queryWords.push(...c.name.split(" ").filter((w: string) => w.length > 3))
                        if (c.tags && Array.isArray(c.tags)) queryWords.push(...c.tags)
                    })
                }

                // Busca vídeos já analisados para mais contexto
                const analyzedData = await db.getRecentUserVideos(user.id, 3)

                if (analyzedData && analyzedData.length > 0) {
                    analyzedData.forEach((v: any) => {
                        if (v.title) queryWords.push(...v.title.split(" ").filter((w: string) => w.length > 4).slice(0, 2))
                    })
                }
            }
        } catch (authErr) {
            console.warn("[SmartRecommendations] Auth/DB lookup falhou, usando busca genérica:", authErr)
        }

        // 2. Se temos contexto do usuário, usa; senão, escolhe buscas aleatórias do pool
        if (queryWords.length > 0) {
            queryWords = queryWords.sort(() => 0.5 - Math.random())
            const personalQuery = queryWords.slice(0, 3).join(" ") + " viral"
            const results = await searchYouTube(personalQuery, limit)
            if (results.length > 0) return results
        }

        // 3. Fallback: escolha aleatória de buscas genéricas (sempre funciona)
        const shuffled = trendingSearches.sort(() => 0.5 - Math.random())
        // Faz 2 buscas diferentes para ter variedade
        const results1 = await searchYouTube(shuffled[0], Math.ceil(limit / 2))
        const results2 = await searchYouTube(shuffled[1], Math.ceil(limit / 2))
        const combined = [...results1, ...results2]

        if (combined.length > 0) return combined.slice(0, limit)

        // 4. Último fallback: busca super genérica
        return await searchYouTube("trending videos viral 2024", limit)
    } catch (error: any) {
        console.error("[SmartRecommendations] Erro total:", error)
        try {
            return await db.getRecentVideos(limit)
        } catch {
            return []
        }
    }
}

export async function translatePromptAction(text: string) {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Não autorizado")

        // Get OpenAI key (same pattern as generateScriptAction)
        const apiKey = await db.getUserApiKey(user.id, 'openai')

        if (!apiKey) {
            return { success: false, error: "Chave OpenAI não encontrada. Adicione em Credenciais." }
        }

        const systemPrompt = await db.getSystemPromptContent('prompt_translator')

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                temperature: 0.3,
            })
        })

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}))
            console.error("OpenAI translation error:", errorBody)
            return { success: false, error: `Erro OpenAI: ${errorBody?.error?.message || response.statusText}` }
        }

        const data = await response.json()
        const translation = data?.choices?.[0]?.message?.content?.trim()

        if (!translation) {
            return { success: false, error: "Tradução indisponível" }
        }

        return { success: true, translation }
    } catch (error) {
        console.error("Translation error:", error)
        return { success: false, error: "Erro na tradução" }
    }
}

// ─── ADMIN SYSTEM PROMPTS ACTIONS ───────────────────────────────
export async function getSystemPromptsAction() {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: "Não autorizado." }
        const prompts = await db.getSystemPrompts()
        return { success: true, prompts }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function saveSystemPromptAction(id: string, content: string) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: "Não autorizado." }
        await db.saveSystemPrompt(id, content, user.email || 'Admin')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function resetSystemPromptAction(id: string) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: "Não autorizado." }
        await db.resetSystemPrompt(id)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function loginAction(email: string, password: string) {
    try {
        const cleanEmail = email.trim().toLowerCase()
        const user = await db.getProfileByEmail(cleanEmail)
        
        if (!user) {
            return { success: false, error: "E-mail ou senha incorretos." }
        }

        if (user.status === 'pending') {
            return { success: false, error: "PENDING_APPROVAL" }
        }

        if (user.status === 'blocked') {
            return { success: false, error: "BLOCKED" }
        }

        // Verify password hash
        if (!user.password_hash) {
            return { success: false, error: "PASSWORD_NOT_SET" }
        }

        const isPasswordCorrect = await verifyPassword(password, user.password_hash)
        if (!isPasswordCorrect) {
            return { success: false, error: "E-mail ou senha incorretos." }
        }

        // Successful login! Create session cookie
        await createSession({
            id: user.id,
            email: user.email,
            role: user.role || 'user',
            status: user.status || 'approved',
            full_name: user.full_name || ''
        })

        return { success: true }
    } catch (error: any) {
        console.error("Error in loginAction:", error)
        return { success: false, error: error.message || "Erro desconhecido durante o login." }
    }
}

export async function logoutAction() {
    try {
        await deleteSession()
        return { success: true }
    } catch (error: any) {
        console.error("Error in logoutAction:", error)
        return { success: false, error: error.message || "Erro ao fazer logout." }
    }
}

export async function resetPasswordAction(email: string) {
    try {
        const cleanEmail = email.trim().toLowerCase()
        const user = await db.getProfileByEmail(cleanEmail)

        if (!user) {
            return { success: false, error: "Não encontramos uma conta aprovada para este e-mail." }
        }

        if (user.status === 'pending') {
            return { success: false, error: "Sua solicitação de acesso ainda está em análise." }
        }

        if (user.status === 'blocked') {
            return { success: false, error: "Seu acesso foi suspenso. Entre em contato com o suporte." }
        }

        const heads = await headers()
        const host = heads.get('x-forwarded-host') || heads.get('host')
        const protocol = heads.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
        
        let siteUrl = 'https://darktube.fjt-solutions.com'
        if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
            siteUrl = `${protocol}://${host}`
        }

        // Generate reset token (JWT valid for 2 hours)
        const resetToken = await signJWT({ email: user.email, purpose: 'reset-password' }, 2 * 3600)
        const actionLink = `${siteUrl}/setup-password?token=${resetToken}`

        console.log(`[Auth] Sending password reset email to ${user.email}`)
        const emailResult = await sendPasswordResetEmail(user.email, user.full_name || 'Usuário', actionLink)
        
        if (!emailResult.success) {
            throw new Error("Falha ao enviar e-mail. Verifique as configurações de SMTP.")
        }

        return { success: true }
    } catch (error: any) {
        console.error("Error in resetPasswordAction:", error)
        return { success: false, error: error.message || "Erro desconhecido." }
    }
}

export async function verifySetupTokenAction(token: string) {
    try {
        const payload = await verifyJWT(token)
        if (!payload || !payload.email || (payload.purpose !== 'setup-password' && payload.purpose !== 'reset-password')) {
            return { success: false, error: "Link inválido ou expirado." }
        }

        const user = await db.getProfileByEmail(payload.email)
        if (!user) {
            return { success: false, error: "Usuário não encontrado." }
        }

        return { success: true, email: user.email }
    } catch (error: any) {
        console.error("Error verifying setup token:", error)
        return { success: false, error: "Token inválido ou expirado." }
    }
}

export async function setupPasswordAction(token: string, password: string) {
    try {
        const payload = await verifyJWT(token)
        if (!payload || !payload.email || (payload.purpose !== 'setup-password' && payload.purpose !== 'reset-password')) {
            return { success: false, error: "Link inválido ou expirado." }
        }

        const user = await db.getProfileByEmail(payload.email)
        if (!user) {
            return { success: false, error: "Usuário não encontrado." }
        }

        // Hash and update password
        const passwordHash = await hashPassword(password)
        await db.updateUserPassword(user.email, passwordHash)

        // Establish session cookie immediately
        await createSession({
            id: user.id,
            email: user.email,
            role: user.role || 'user',
            status: 'approved',
            full_name: user.full_name || ''
        })

        return { success: true }
    } catch (error: any) {
        console.error("Error in setupPasswordAction:", error)
        return { success: false, error: error.message || "Erro desconhecido." }
    }
}

export async function getCurrentUserAction() {
    try {
        const user = await getCurrentUser()
        return user
    } catch (error) {
        console.error("Error in getCurrentUserAction:", error)
        return null
    }
}

export async function uploadUserMediaAction(formData: FormData) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: "Não autorizado." }

        const file = formData.get("file") as File
        if (!file) return { success: false, error: "Nenhum arquivo enviado." }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const ext = file.name.split('.').pop() || 'png'
        const filename = `manual_media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const mimeType = file.type || 'image/png'

        await pool.query(`
            INSERT INTO public.storage_files (filename, mime_type, content)
            VALUES ($1, $2, $3)
            ON CONFLICT (filename)
            DO UPDATE SET content = EXCLUDED.content
        `, [filename, mimeType, buffer])

        const publicUrl = `/api/storage/${filename}`
        return { success: true, url: publicUrl, filename }
    } catch (error: any) {
        console.error("Error in uploadUserMediaAction:", error)
        return { success: false, error: error?.message || "Erro ao fazer upload do arquivo." }
    }
}

