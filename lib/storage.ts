// lib/storage.ts
import { pool } from "./db-client"

export async function uploadThumbnail(buffer: Buffer, filename: string) {
  await pool.query(`
    INSERT INTO public.storage_files (filename, mime_type, content)
    VALUES ($1, $2, $3)
    ON CONFLICT (filename)
    DO UPDATE SET content = EXCLUDED.content
  `, [filename, 'image/jpeg', buffer])

  return `/api/storage/${filename}`
}

export async function uploadMediaFile(buffer: Buffer, filename: string, mimeType: string = 'video/mp4') {
  await pool.query(`
    INSERT INTO public.storage_files (filename, mime_type, content)
    VALUES ($1, $2, $3)
    ON CONFLICT (filename)
    DO UPDATE SET content = EXCLUDED.content, mime_type = EXCLUDED.mime_type
  `, [filename, mimeType, buffer])

  return `/api/storage/${filename}`
}

export async function uploadFrame(buffer: Buffer, filename: string) {
  await pool.query(`
    INSERT INTO public.storage_files (filename, mime_type, content)
    VALUES ($1, $2, $3)
    ON CONFLICT (filename)
    DO UPDATE SET content = EXCLUDED.content
  `, [filename, 'image/jpeg', buffer])

  return filename
}

export async function getFrameUrl(path: string) {
  return `/api/storage/${path}`
}
