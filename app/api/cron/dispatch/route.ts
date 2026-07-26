import { NextResponse } from "next/server"
import * as db from "@/lib/database"

/**
 * CRON DISPATCH ENGINE
 * Should be called every minute (e.g. via Vercel Cron or GitHub Actions)
 */
export async function GET(request: Request) {
    try {
        // 1. Get current time in HHhmm format (e.g., 09h01)
        // Ensure we use the correct timezone (America/Sao_Paulo)
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
        const h = now.getHours().toString().padStart(2, '0')
        const m = now.getMinutes().toString().padStart(2, '0')
        const currentTimeStr = `${h}h${m}`

        console.log(`[Cron Dispatch] checking for ${currentTimeStr}...`)

        // 2. Find active templates scheduled for this minute
        const templates = await db.getTemplatesScheduledFor(currentTimeStr)

        if (templates.length === 0) {
            return NextResponse.json({ message: "No templates scheduled for this minute", time: currentTimeStr })
        }

        const webhookUrl = process.env.N8N_PRODUCTION_WEBHOOK_URL
        if (!webhookUrl) throw new Error("N8N_PRODUCTION_WEBHOOK_URL not configured")

        const results = []

        for (const template of templates) {
            // 3. Anti-Duplicate Check: Has this template already been sent in the last 23 hours?
            // This prevents double-dispatch if the cron runs twice or overlaps.
            const history = await db.getProductionHistory(template.id)
            const recentDispatch = history.find(h => {
                const dispatchDate = new Date(h.dispatched_at)
                const hoursSince = (now.getTime() - dispatchDate.getTime()) / (1000 * 60 * 60)
                return hoursSince < 23 // Safe buffer for daily frequency
            })

            if (recentDispatch) {
                results.push({ id: template.id, status: "skipped", reason: "Already dispatched recently" })
                continue
            }

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

            // 4. Prepare Payload
            const payload = {
                message: "Automatic Production Request",
                timestamp: now.toISOString(),
                user_id: template.user_id,
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

            // 5. Dispatch to n8n
            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })

                if (!response.ok) throw new Error(`n8n error: ${response.status}`)

                // 6. Record Success in History
                await db.saveProductionHistory({
                    template_id: template.id,
                    original_video_id: template.video_id,
                    payload,
                    status: 'sent_auto'
                })

                // 7. Update last dispatched on template
                // We'll need a direct update or a db helper
                results.push({ id: template.id, status: "success" })
            } catch (err: any) {
                console.error(`Dispatch fail for ${template.id}:`, err)
                results.push({ id: template.id, status: "error", error: err.message })
            }
        }

        return NextResponse.json({ 
            message: "Cron execution finished", 
            time: currentTimeStr, 
            results 
        })
    } catch (error: any) {
        console.error("Cron Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
