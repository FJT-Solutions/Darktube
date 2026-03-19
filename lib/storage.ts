import { createClient as createServerClient } from "./supabase/server"
import { createClient as createBrowserClient } from "./supabase/client"

// Helper to get the correct client based on environment
async function getSupabase() {
  if (typeof window === "undefined") {
    return await createServerClient()
  }
  return createBrowserClient()
}

export async function uploadThumbnail(buffer: Buffer, filename: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase.storage
    .from('thumbnails')
    .upload(filename, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    })
  
  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('thumbnails')
    .getPublicUrl(filename)

  return publicUrl
}

export async function uploadFrame(buffer: Buffer, filename: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase.storage
    .from('frames')
    .upload(filename, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    })
  
  if (error) throw error
  return data.path
}

export async function getFrameUrl(path: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase.storage
    .from('frames')
    .createSignedUrl(path, 3600) // 1 hour
  
  if (error) throw error
  return data.signedUrl
}
