import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getPendingInvites() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
}

export async function approveInviteAction(inviteId: string, email: string) {
    const supabase = await createAdminClient()
    if (!supabase) throw new Error("Não foi possível inicializar o cliente admin")
    
    // 1. Create a magic link or just invite the user via Supabase Auth
    // The middleware and triggers will handle the rest
    const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { role: 'user' },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    })

    if (authError) throw authError

    // 2. Delete the invite record
    const { error: deleteError } = await supabase
        .from('invites')
        .delete()
        .eq('id', inviteId)
    
    if (deleteError) throw deleteError

    revalidatePath('/admin/invites')
    return { success: true }
}

export async function rejectInviteAction(inviteId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', inviteId)
    
    if (error) throw error

    revalidatePath('/admin/invites')
    return { success: true }
}
