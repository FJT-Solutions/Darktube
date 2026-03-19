import { createClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function getPendingInvites() {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
}

export async function approveInviteAction(inviteId: string, email: string) {
    const supabase = createClient()
    
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
    const supabase = createClient()
    const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', inviteId)
    
    if (error) throw error

    revalidatePath('/admin/invites')
    return { success: true }
}
