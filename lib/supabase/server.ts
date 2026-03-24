// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // During build time, env vars may not be available
    return null as any
  }

  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })
}
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    if (!url) console.error("createAdminClient: SUPABASE_URL is missing")
    if (!serviceRoleKey) console.error("createAdminClient: SUPABASE_SERVICE_ROLE_KEY is missing")
    return null
  }

  console.log(`[createAdminClient] URL: ${url}, Key present: ${!!serviceRoleKey}, Key starts with: ${serviceRoleKey.substring(0, 10)}...`)

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
