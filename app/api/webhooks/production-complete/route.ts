import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const payload = await req.json()
        const { history_id, video_url } = payload

        if (!history_id || !video_url) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const supabase = await createClient()
        if (!supabase) throw new Error("Database connection failed")

        const { data, error } = await supabase
            .from("remodeling_history")
            .update({ 
                status: "completed", 
                video_url: video_url 
            })
            .eq("id", history_id)
            .select()
            .single()

        if (error) {
            console.error("Error updating production history:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data })
    } catch (err) {
        console.error("Webhook processing error:", err)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
