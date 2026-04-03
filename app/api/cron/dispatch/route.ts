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
                    format: template.format,
                    voice: template.voice_type,
                    music: template.music_style,
                    script_segments: template.template_data?.remodeling_template?.script_base || [],
                    transcription: template.generated_script || "",
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
