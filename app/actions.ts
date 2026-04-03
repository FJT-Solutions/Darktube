"use server"

import * as db from "@/lib/database"
import { getNicheIntelligence } from "@/lib/intelligence"
import { revalidatePath } from "next/cache"
import { TrackedChannel } from "@/lib/types"
import { parseYouTubeDate, cn } from "@/lib/utils"
import { VideoAnalysisService } from "@/lib/video-analysis"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { headers } from "next/headers"
import { sendAccessGrantedEmail } from "@/lib/email"
import { GoogleGenerativeAI } from "@google/generative-ai"

async function assertAdmin(userId: string) {
    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
    
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
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: "Você precisa estar logado para analisar vídeos." }
        }

        // Fetch Gemini API key
        let geminiApiKey: string | undefined = process.env.GEMINI_API_KEY;
        const { data: userKey } = await supabase.rpc('get_api_key', {
            p_user_id: user.id,
            p_provider: 'gemini'
        })
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return await db.getTrackedChannels(user?.id)
}

export async function analyzeVideoAction(video: any, channel?: any) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: "Você precisa estar logado para analisar vídeos." }
        }

        // Fetch Gemini API key (required for visual analysis)
        let geminiApiKey: string | undefined = process.env.GEMINI_API_KEY;
        const { data: userKey } = await supabase.rpc('get_api_key', {
            p_user_id: user.id,
            p_provider: 'gemini'
        })
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
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, error: "Não autorizado." }

        // Retrieve the chosen provider's API key
        let providerData: string | undefined;
        const { data: apiKey } = await supabase.rpc('get_api_key', {
            p_user_id: user.id,
            p_provider: provider
        })
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
- "style": "Sem narração - apenas música de fundo: ${audioDesc}"
NÃO invente narração. O vídeo remodelado deve ser FIEL ao original: apenas visual + música.`;
        } else if (audioType === 'none') {
            audioRules = `REGRA CRÍTICA DE ÁUDIO: O vídeo original NÃO tem áudio (silêncio total).
O campo "voiceover" de CADA segmento deve ter:
- "text": "" (vazio)
- "style": "Sem áudio - silêncio ou música ambiente sutil"
NÃO invente narração nem música. Mantenha fidelidade ao original.`;
        } else {
            audioRules = `ÁUDIO: O vídeo original TEM narração humana ("${audioDesc}").
O campo "voiceover" deve conter o texto de locução ORIGINAL remodelado (novo, original, mas com o mesmo tom e estilo) e instruções de estilo detalhadas.`;
        }

        const systemPrompt = `Você é um roteirista e engenheiro de produção de vídeo especialista em automação via n8n.
Sua tarefa: criar um ROTEIRO DE PRODUÇÃO ESTRUTURADO em JSON para remodelar o vídeo "${videoTitle}".

${durationText}
${audioRules}

ANÁLISE VISUAL DO GEMINI (referência):
- Estilo: ${analysis?.style || 'Informativo'}
- Diretrizes visuais: ${template?.visual_directives || 'Manter coerência visual'}
- Estilo de vídeo: ${template?.video_style || 'Cinematográfico'}
- Composição: ${template?.composition_rules || 'Regra dos terços'}
- Música sugerida: ${template?.music_style || 'Épica'}
- AI Stack: ${JSON.stringify(template?.ai_stack || {})}

TRANSCRIÇÃO (referência de tópicos apenas):
${transcript?.slice(0, 2000) || 'Não disponível'}

FORMATO DE SAÍDA OBRIGATÓRIO - Responda APENAS com JSON:
{
  "script_base": [
    {
      "timestamp": "0:00-0:05",
      "segment_type": "GANCHO | DESENVOLVIMENTO_N | CLÍMAX | CALL_TO_ACTION",
      "voiceover": {
        "text": "texto da locução (ou vazio se sem voz)",
        "style": "instruções de tom, ritmo, entonação"
      },
      "visual_content": {
        "image_prompt": "Prompt DETALHADO em inglês para gerar a imagem com Flux/Midjourney. Descreva iluminação, composição, estilo, cores, objetos.",
        "animation_instructions": "Instruções EXATAS de movimento para Kling/Runway: tipo de câmera (zoom, pan, tilt, dolly), velocidade, efeitos de partículas, transições."
      },
      "emotion": "emoção alvo"
    }
  ]
}

REGRAS:
1. Os timestamps DEVEM cobrir a duração total do vídeo sem lacunas.
2. Cada image_prompt deve ser autossuficiente e gerar uma imagem COERENTE com os outros segmentos.
3. As animation_instructions devem ser TÉCNICAS e executáveis por IA de vídeo.
4. Crie entre 4 a 8 segmentos dependendo da duração.
5. Os prompts de imagem devem ser em INGLÊS (padrão Flux/MJ). O resto em português.`;

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
        try {
            const cleanJson = scriptText.includes('```json')
                ? scriptText.split('```json')[1].split('```')[0].trim()
                : scriptText.trim();
            const parsed = JSON.parse(cleanJson);
            scriptSegments = parsed.script_base || parsed.segments || [];
        } catch (parseErr) {
            console.warn("[generateScriptAction] Could not parse structured JSON, returning raw text:", parseErr);
        }

        return { success: true, script: scriptText, scriptSegments }
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
    // BUG-01 FIX: Verify ownership via RLS (user_id filter happens via Supabase RLS)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autorizado')

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

        await assertAdmin(user.id)

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

        await assertAdmin(user.id)

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
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autenticado")

        await assertAdmin(user.id)

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

        await assertAdmin(user.id)

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

export async function addBlotatoAccountAction(platform: string, accountId: string, label?: string, pageId?: string, pageName?: string, avatarUrl?: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autorizado")

        return await db.addBlotatoAccount(user.id, platform, accountId, label, pageId, pageName, avatarUrl)
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
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autorizado")

        // BUG-02 FIX: Verify ownership before deleting
        const { data: account } = await supabase
            .from('blotato_accounts')
            .select('id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()
        if (!account) throw new Error("Conta não encontrada ou não pertence a você.")

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
            return { status: 'pending_invite' }
        }

        // SEC-05 FIX: Only fetch first page and check instead of loading ALL users
        // 3. Final Check: if in Auth but no profile/invite, they have access
        try {
            const { data: { users }, error: authErr } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
            if (!authErr && users) {
                const isAuthUser = users.some((u: any) => u.email === email)
                if (isAuthUser) {
                    return { status: 'has_access' }
                }
            }
        } catch {
            // Auth check failed, continue to no_access
        }

        return { status: 'no_access' }
    } catch (error) {
        console.error("Error in checkUserAccessAction:", error)
        return { status: 'error', error: (error as any).message }
    }
}

export async function getBlotatoAccountsAction() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []
        return await db.getBlotatoAccounts(user.id)
    } catch (error) {
        console.error("Error in getBlotatoAccountsAction:", error)
        return []
    }
}

export async function saveRemodelingTemplateAction(data: any) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autorizado")

        const result = await db.saveRemodelingTemplate(user.id, data)
        return { success: true, data: result }
    } catch (error: any) {
        console.error("Error in saveRemodelingTemplateAction:", error)
        return { success: false, error: error.message || "Falha ao salvar template." }
    }
}

export async function getRemodelingTemplatesAction() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []
        return await db.getRemodelingTemplates(user.id)
    } catch (error) {
        console.error("Error in getRemodelingTemplatesAction:", error)
        return []
    }
}

export async function getRemodelingTemplateByIdAction(id: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
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
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
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
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autorizado")

        // 1. Get Template
        const template = await db.getRemodelingTemplateById(templateId)
        if (template.user_id !== user.id) throw new Error("Acesso negado")

        // 2. Prepare Payload
        const webhookUrl = process.env.N8N_PRODUCTION_WEBHOOK_URL
        if (!webhookUrl) throw new Error("n8n Webhook URL não configurada.")

        const payload = {
            message: "Production Request from DarkTube",
            timestamp: new Date().toISOString(),
            user_id: user.id,
            template: {
                id: template.id,
                name: template.name,
                video_url: `https://youtube.com/watch?v=${template.video_id}`,
                original_video_id: template.video_id,
                format: template.format,
                voice: template.voice_type,
                music: template.music_style,
                script_segments: template.template_data?.remodeling_template?.script_base || [],
                transcription: template.generated_script || "",
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
        const { error: updateError } = await supabase
            .from('remodeling_templates')
            .update({ last_dispatched_at: new Date().toISOString() })
            .eq('id', templateId)
        
        if (updateError) console.error("Failed to update last_dispatched_at:", updateError)

        revalidatePath(`/templates/${templateId}`)
        return { success: true }
    } catch (error: any) {
        console.error("Error in sendToN8NAction:", error)
        return { success: false, error: error.message || "Erro ao disparar produção." }
    }
}

export async function deleteRemodelingTemplateAction(id: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autorizado")

        // BUG-03 FIX: Verify ownership before deleting
        const { data: template } = await supabase
            .from('remodeling_templates')
            .select('id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()
        if (!template) throw new Error("Template não encontrado ou não pertence a você.")

        return await db.deleteRemodelingTemplate(id)
    } catch (error: any) {
        console.error("Error in deleteRemodelingTemplateAction:", error)
        return { success: false, error: error.message || "Falha ao excluir template." }
    }
}

export async function updateTemplateStatusAction(id: string, isActive: boolean) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autorizado")
        return await db.updateRemodelingTemplateStatus(id, isActive)
    } catch (error: any) {
        console.error("Error in updateTemplateStatusAction:", error)
        return { success: false, error: error.message || "Falha ao atualizar status." }
    }
}

export async function getRecentVideosAction(limit = 12) {
    try {
        // Optional auth check (we might want everyone logged in to see them)
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
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
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user) {
                // Busca canais rastreados para contexto
                const { data: trackedData } = await supabase
                    .from("tracked_channels")
                    .select("name, tags")
                    .eq("user_id", user.id)
                    .order("tracked_at", { ascending: false })
                    .limit(5)

                if (trackedData && trackedData.length > 0) {
                    trackedData.forEach((c: any) => {
                        if (c.name) queryWords.push(...c.name.split(" ").filter((w: string) => w.length > 3))
                        if (c.tags && Array.isArray(c.tags)) queryWords.push(...c.tags)
                    })
                }

                // Busca vídeos já analisados para mais contexto
                const { data: analyzedData } = await supabase
                    .from("videos")
                    .select("title")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(3)

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
        // 5. Fallback absoluto: tenta Supabase
        try {
            return await db.getRecentVideos(limit)
        } catch {
            return []
        }
    }
}


export async function translatePromptAction(text: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autorizado")

        let geminiApiKey: string | undefined = process.env.GEMINI_API_KEY;
        const { data: userKey } = await supabase.rpc('get_api_key', {
            p_user_id: user.id,
            p_provider: 'gemini'
        })
        if (userKey) geminiApiKey = userKey;

        if (!geminiApiKey) throw new Error("API Key não encontrada")

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Traduza o seguinte prompt técnico de vídeo (instruções de imagem/animação) para Português do Brasil de forma clara e natural para o usuário final. Retorne APENAS a tradução: \n\n${text}`
                    }]
                }]
            })
        })

        const data = await response.json()
        return { success: true, translation: data.candidates?.[0]?.content?.parts?.[0]?.text || text }
    } catch (error) {
        console.error("Translation error:", error)
        return { success: false, error: "Erro na tradução" }
    }
}
