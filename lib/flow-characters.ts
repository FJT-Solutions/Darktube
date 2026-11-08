import { pool } from '@/lib/db-client'
import { adultAge, type FlowCharacter } from '@/lib/flow-script'
import { REALISM_PROMPT } from '@/lib/flow-template-base'

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

export function isVoiceOnlyCharacter(c: FlowCharacter): boolean {
  const name = String(c.name || '').toLowerCase()
  const desc = String(c.description || '').toLowerCase()
  return (
    /^(narrador|narrator|voz|voice|voiceover|locutor)\b/i.test(name) ||
    /invisible voice|no visual features|off-screen voice|sem corpo|apenas voz|voz invis[ií]vel|voz em off/i.test(desc)
  )
}

// Estilos que nao sao foto: o retrato precisa sair no mesmo traco do video, senao a referencia
// puxa uma pessoa realista para dentro de um video 2D ou 3D.
const STYLIZED = ['estilizado', 'animacao3d', 'massinha', 'ilustrado2d', 'stickman2d', 'avatar3d', 'brinquedo3d']

/** A descricao pede fundo verde (chroma key)? Entao o fundo do retrato tem que ser verde puro, nao "neutro". */
function wantsGreenBackdrop(description: string): boolean {
  return /#00ff00|chroma\s*-?key|green[\s-]*screen|(solid|pure|flat)[^.]{0,30}green|green[^.]{0,20}(background|backdrop)|fundo\s+verde/i.test(description)
}

/** Template de chroma key (o expert e gravado em fundo verde e recortado na montagem)? */
export function isChromaKeyTemplate(templateId?: string | null): boolean {
  return /chroma/i.test(String(templateId || ''))
}

/**
 * Retrato de referencia de um personagem. `realismo`: estilo visual do projeto (valor de REALISM).
 * `chromaKey`: o template e de chroma key; o fundo sai verde puro mesmo que a descricao do personagem nao peca.
 */
export function buildSheetPrompt(c: FlowCharacter, realismo = '', chromaKey = false): string {
  const desc = adultAge((c.description || '').trim()).replace(/\.+$/, '')
  // O fundo do sufixo padrao ("neutro") contradiria o pedido de fundo verde e quebraria o recorte do chroma key.
  const green = chromaKey || wantsGreenBackdrop(desc)
  const backdrop = green
    ? 'Solid pure flat green chroma-key backdrop (#00FF00), perfectly uniform with no gradient, no shadows and no green spill on the subject, even soft lighting'
    : 'Clean solid neutral backdrop'
  if (STYLIZED.includes(realismo) && REALISM_PROMPT[realismo]) {
    return `character design reference of a fictional original character, drawn exactly in this visual style: ${REALISM_PROMPT[realismo]}. The character: ${desc}. Single character, waist-up, facing the camera with a natural expression, wearing their signature outfit. ${green ? backdrop + '.' : 'Plain light neutral background, even soft lighting.'} Single character only, no multiple views, no split screen, no turnaround, no grid, no text, no watermark.`
  }
  return `cinematic character reference portrait of a fictional original adult character, not based on any real or famous person: ${desc}. Single subject waist-up medium portrait, facing the camera with a natural expressive gaze, wearing their signature clothing. ${backdrop}, cinematic soft studio lighting with gentle key light, ${green ? 'sharp background' : 'shallow depth of field'}, sharp detailed facial features, realistic skin texture, clear eyes and natural hair. Single person only, no multiple views, no split screen, no turnaround, no grid, no text, no watermark.`
}

/** Folha do elenco (todos lado a lado). `realismo`: estilo visual do projeto (valor de REALISM). */
export function buildCastPrompt(chars: FlowCharacter[], realismo = ''): string {
  const list = chars
    .map((c, idx) => `Character ${idx + 1} (from left to right): ${adultAge((c.description || c.name).trim()).replace(/\.+$/, '')}`)
    .join('; ')
  const style = STYLIZED.includes(realismo) && REALISM_PROMPT[realismo] ? ` Drawn exactly in this visual style: ${REALISM_PROMPT[realismo]}.` : ''
  return `Professional cast reference sheet of ${chars.length} fictional original adult characters, not based on any real or famous person, standing side by side in a single row from left to right in this exact order: ${list}.${style} Full-body standing front view of all characters together, relaxed A-pose, consistent scale, even soft studio lighting, clean neutral plain light-gray background, sharp details, perfect identity consistency. No text, no labels, no names, no numbers, no captions, no watermark.`.slice(0, 3900)
}
