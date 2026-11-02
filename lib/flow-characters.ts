import { pool } from '@/lib/db-client'
import type { FlowCharacter } from '@/lib/flow-script'

export interface FlowLibraryCharacter {
  id: string
  user_id: string
  name: string
  description: string
  voice: string
  sheet_url: string | null
  created_at: string
  updated_at: string
}

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let ready = false

export async function ensureFlowCharactersTable() {
  if (ready) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.flow_characters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      voice TEXT NOT NULL DEFAULT '',
      sheet_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS flow_characters_user_idx ON public.flow_characters (user_id, updated_at DESC);
  `)
  ready = true
}

export async function listFlowLibrary(userId: string): Promise<FlowLibraryCharacter[]> {
  await ensureFlowCharactersTable()
  const { rows } = await pool.query(
    `SELECT * FROM public.flow_characters WHERE user_id = $1 ORDER BY updated_at DESC, created_at DESC LIMIT 200`,
    [userId]
  )
  return rows
}

export async function getLibraryCharacter(userId: string, id: string): Promise<FlowLibraryCharacter | null> {
  if (!UUID_RX.test(id)) return null
  await ensureFlowCharactersTable()
  const { rows } = await pool.query(
    `SELECT * FROM public.flow_characters WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )
  return rows[0] ?? null
}

export async function saveToLibrary(userId: string, character: FlowCharacter): Promise<FlowLibraryCharacter> {
  await ensureFlowCharactersTable()
  const name = (character.name || '').trim().slice(0, 60) || 'Personagem'
  const description = (character.description || '').trim().slice(0, 500)
  const voice = (character.voice || '').trim().slice(0, 160)
  const sheetUrl = character.sheetUrl ? character.sheetUrl.trim().slice(0, 300) : null

  if (character.libraryId && UUID_RX.test(character.libraryId)) {
    const updated = await pool.query(
      `UPDATE public.flow_characters
          SET name = $3,
              description = $4,
              voice = $5,
              sheet_url = COALESCE($6, sheet_url),
              updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [character.libraryId, userId, name, description, voice, sheetUrl]
    )
    if (updated.rows[0]) return updated.rows[0]
  }

  const inserted = await pool.query(
    `INSERT INTO public.flow_characters (user_id, name, description, voice, sheet_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, name, description, voice, sheetUrl]
  )
  return inserted.rows[0]
}

export async function deleteLibraryCharacter(userId: string, id: string): Promise<boolean> {
  if (!UUID_RX.test(id)) return false
  await ensureFlowCharactersTable()
  const res = await pool.query(
    `DELETE FROM public.flow_characters WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )
  return (res.rowCount ?? 0) > 0
}

export function buildSheetPrompt(c: FlowCharacter): string {
  const desc = (c.description || '').trim().replace(/\.+$/, '')
  return `professional character reference sheet of a fictional original character, not based on any real or famous person: ${desc}. Clean neutral plain light-gray background, technical model turnaround, two horizontal rows; top row four full-body standing views side by side: front, left profile, right profile, back; bottom row three detailed close-up portraits: front, left profile, right profile. Perfect identity consistency, relaxed A-pose, consistent scale, even soft lighting, sharp details. No text, no labels, no names, no numbers, no watermark. 16:9`
}

export function buildCastPrompt(chars: FlowCharacter[]): string {
  const list = chars
    .map((c, idx) => `Character ${idx + 1} (from left to right): ${(c.description || c.name).trim().replace(/\.+$/, '')}`)
    .join('; ')
  return `Professional cast reference sheet of ${chars.length} fictional original characters, not based on any real or famous person, standing side by side in a single row from left to right in this exact order: ${list}. Full-body standing front view of all characters together, relaxed A-pose, consistent scale, even soft studio lighting, clean neutral plain light-gray background, sharp details, perfect identity consistency. No text, no labels, no names, no numbers, no captions, no watermark. 16:9`.slice(0, 3900)
}
