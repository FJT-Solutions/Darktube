import fs from 'fs';
import os from 'os';
import path from 'path';
import { pool } from '@/lib/db-client';
import { uploadMediaFile } from '@/lib/storage';
import { readStored } from '@/lib/flow-assemble';
import { findBrowserExecutable } from '@/lib/browser-executable';
import { callFlowVisionLLM, type FlowProvider, type FlowVisionImage } from '@/lib/flow-llm';

/**
 * Storyboard approved BEFORE generating takes/voice/render: one panel per take with what is narrated,
 * what is shown, framing/depth and the edit beat. Panels are approved or rejected automatically (vision
 * LLM of the user's credential) or by hand, and only an all-approved storyboard goes to production.
 */

export type PanelStatus = 'pending' | 'approved' | 'rejected';

export interface StoryboardPanel {
  index: number;
  /** narrator line of this take */
  narration?: string;
  /** character line: "Ramos: Você não saiu." */
  dialogue?: string;
  /** what the picture shows (every narrated action must be here) */
  action: string;
  /** framing and depth: "plano médio; Ramos em primeiro plano à esquerda, mordomo ao fundo atrás da mesa" */
  shot?: string;
  setting?: string;
  characters?: string[];
  /** edit beat: blackout em "apagou", quake, SFX de batida */
  edit?: string;
  /** camera move: "push-in lento", "travelling lateral", "fixa", "tremor", "pan", "tilt", "órbita", "whip pan" */
  camera?: string;
  /** lens: "24mm", "35mm", "85mm" */
  lens?: string;
  /** take length in seconds */
  duration?: number;
  /** sketch / draft frame (https, /api/storage/... or base64 on input) */
  imageUrl?: string;
  /** animate this take in the Flow (spends credits) instead of a still */
  animate?: boolean;
  status: PanelStatus;
  note?: string;
}

export interface SheetRef {
  label: string;
  imageUrl?: string;
  notes?: string;
}

/**
 * One video has several boards sharing a projectId: "personagens" (360, reactions, poses, props),
 * "cenarios" (each set in several camera angles), "geral" (the takes) and "cena" (one scene in detail).
 * The reference images of every board are reused as Flow / /imagem references for the takes.
 */
export type StoryboardKind = 'geral' | 'personagens' | 'cenarios' | 'cena';
export const STORYBOARD_KINDS: StoryboardKind[] = ['geral', 'personagens', 'cenarios', 'cena'];

/** Production bible printed around the panels (OpenArt-Director-like sheet). Every field is optional. */
export interface StoryboardBible {
  characters?: Array<{
    name: string;
    role?: string;
    description?: string;
    notes?: string[];
    voice?: string;
    /** front / side / back turnaround sheet */
    turnaroundUrl?: string;
    /** facial expressions sheet */
    expressionsUrl?: string;
    /** single reference when there is no turnaround */
    imageUrl?: string;
    /** 360: frente, 3/4, perfil, costas… (one image per angle) */
    views?: SheetRef[];
    /** reactions / expressions one by one: medo, raiva, choro… */
    reactions?: SheetRef[];
    /** body positions: sentado, agachado, correndo… */
    poses?: SheetRef[];
    /** the character's objects: xícara, cupom, algemas… */
    props?: SheetRef[];
  }>;
  environments?: Array<{ name: string; description?: string; imageUrl?: string; angles?: SheetRef[]; props?: SheetRef[] }>;
  /** floor plan / blocking with positions and paths */
  blocking?: { imageUrl?: string; notes?: string[] };
  lighting?: Array<{ label: string; notes?: string; imageUrl?: string }>;
  style?: {
    genre?: string;
    renderStyle?: string;
    lighting?: string;
    mood?: string;
    timeOfDay?: string;
    location?: string;
    era?: string;
    aspectRatio?: string;
    /** hex colors; extracted from the frames when omitted */
    palette?: string[];
    tags?: string[];
  };
  credits?: Array<{ role: string; name: string }>;
  /** production assessment agreed with the user BEFORE any board is generated */
  production?: ProductionPlan;
}

/**
 * imagem: stills only, motion from the 3D stage / edit effects (0 Flow credits).
 * hibrido: stills + a few takes animated in the Flow.
 * flow: images and animated takes in the Flow.
 */
export type ProductionMode = 'imagem' | 'hibrido' | 'flow';
export const PRODUCTION_MODES: ProductionMode[] = ['imagem', 'hibrido', 'flow'];
export interface ProductionPlan {
  mode: ProductionMode;
  /** where the stills come from: antigravity (/imagem) or flow */
  imageSource?: 'antigravity' | 'flow';
  /** why this mode (budget, story, user choice) */
  reason?: string;
  /** max animated takes allowed (hibrido/flow) */
  animatedTakes?: number;
}

function normalizeProduction(raw: any): ProductionPlan | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const mode = String(raw.mode || '').toLowerCase() as ProductionMode;
  if (!PRODUCTION_MODES.includes(mode)) throw new Error(`production.mode inválido: use ${PRODUCTION_MODES.join(', ')}.`);
  const imageSource = raw.imageSource === 'flow' || raw.imageSource === 'antigravity' ? raw.imageSource : mode === 'flow' ? 'flow' : 'antigravity';
  const animatedTakes = mode === 'imagem' ? 0 : Number.isFinite(Number(raw.animatedTakes)) ? Math.max(0, Math.round(Number(raw.animatedTakes))) : undefined;
  return { mode, imageSource, reason: raw.reason ? String(raw.reason).slice(0, 500) : undefined, animatedTakes };
}

/** Panels marked animate must fit the production plan (none in "imagem", at most animatedTakes otherwise). */
function enforceProduction(panels: StoryboardPanel[], plan?: ProductionPlan) {
  if (!plan) return;
  const animated = panels.filter((p) => p.animate).length;
  if (plan.mode === 'imagem' && animated) throw new Error(`Modo "imagem" não usa o Flow: tire "animate" dos ${animated} quadro(s) ou mude production.mode.`);
  if (plan.animatedTakes != null && animated > plan.animatedTakes) throw new Error(`${animated} quadros animados, mas a avaliação de produção permite ${plan.animatedTakes}.`);
}

export interface Storyboard {
  id: string;
  userId: string;
  title: string;
  logline?: string;
  kind?: StoryboardKind;
  /** groups the boards of one video */
  projectId?: string;
  bible?: StoryboardBible;
  panels: StoryboardPanel[];
  sheetUrl?: string | null;
  updatedAt?: string;
}

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.storyboards (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL,
      title TEXT NOT NULL,
      logline TEXT,
      panels JSONB NOT NULL DEFAULT '[]'::jsonb,
      sheet_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.storyboards ADD COLUMN IF NOT EXISTS bible JSONB;
    ALTER TABLE public.storyboards ADD COLUMN IF NOT EXISTS kind TEXT;
    ALTER TABLE public.storyboards ADD COLUMN IF NOT EXISTS project_id TEXT;
  `);
  tableReady = true;
}

const rowToBoard = (r: any): Storyboard => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  logline: r.logline || undefined,
  bible: r.bible && typeof r.bible === 'object' ? r.bible : undefined,
  kind: r.kind || 'geral',
  projectId: r.project_id || undefined,
  panels: Array.isArray(r.panels) ? r.panels : [],
  sheetUrl: r.sheet_url,
  updatedAt: r.updated_at,
});

export async function getStoryboard(userId: string, id: string): Promise<Storyboard> {
  await ensureTable();
  const { rows } = await pool.query(`SELECT * FROM public.storyboards WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (!rows[0]) throw new Error(`Storyboard "${id}" não encontrado.`);
  return rowToBoard(rows[0]);
}

export async function listStoryboards(userId: string, limit = 20, projectId?: string) {
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT id, title, logline, sheet_url, updated_at, panels, kind, project_id FROM public.storyboards
     WHERE user_id = $1 AND ($3::text IS NULL OR project_id = $3) ORDER BY updated_at DESC LIMIT $2`,
    [userId, limit, projectId || null]
  );
  return rows.map((r: any) => {
    const b = rowToBoard({ ...r, user_id: userId });
    return { id: b.id, title: b.title, kind: b.kind, projectId: b.projectId, sheetUrl: b.sheetUrl, updatedAt: b.updatedAt, ...storyboardSummary(b) };
  });
}

async function projectBoards(userId: string, projectId: string): Promise<Storyboard[]> {
  await ensureTable();
  const { rows } = await pool.query(`SELECT * FROM public.storyboards WHERE user_id = $1 AND project_id = $2 ORDER BY created_at`, [userId, projectId]);
  return rows.map(rowToBoard);
}

/** Bible of the board completed with the characters / sets of the other boards of the same video. */
async function projectBible(b: Storyboard): Promise<StoryboardBible | undefined> {
  if (!b.projectId) return b.bible;
  const out: StoryboardBible = { ...(b.bible || {}) };
  for (const other of await projectBoards(b.userId, b.projectId).catch(() => [])) {
    if (other.id === b.id || !other.bible) continue;
    for (const key of ['characters', 'environments'] as const) {
      const mine: any[] = [...((out[key] as any[]) || [])];
      for (const item of (other.bible[key] as any[]) || []) {
        const at = mine.findIndex((x) => x.name.toLowerCase() === item.name.toLowerCase());
        // the dedicated board (personagens / cenarios) is the source of truth for images
        mine[at >= 0 ? at : mine.length] = at >= 0 ? { ...item, ...stripEmpty(mine[at]), ...pickImages(item) } : item;
      }
      (out as any)[key] = mine;
    }
    out.style = { ...(other.bible.style || {}), ...(out.style || {}) };
  }
  return out;
}

const stripEmpty = (o: any) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const pickImages = (o: any) =>
  stripEmpty(Object.fromEntries(Object.entries(o || {}).filter(([k, v]) => /Url$/.test(k) || (Array.isArray(v) && ['views', 'reactions', 'poses', 'props', 'angles'].includes(k)))));

/** Every reference image of a video, by character / set, to attach in the Flow or /imagem takes. */
export async function storyboardProjectRefs(userId: string, projectId: string) {
  const boards = await projectBoards(userId, projectId);
  const refs: Array<{ owner: string; kind: 'personagem' | 'cenario'; label: string; imageUrl: string; board: string }> = [];
  for (const b of boards) {
    for (const c of b.bible?.characters || []) {
      const one = (label: string, url?: string) => url && refs.push({ owner: c.name, kind: 'personagem', label, imageUrl: url, board: b.id });
      one('turnaround', c.turnaroundUrl);
      one('expressões', c.expressionsUrl);
      one('referência', c.imageUrl);
      for (const r of [...(c.views || []), ...(c.reactions || []), ...(c.poses || []), ...(c.props || [])]) one(r.label, r.imageUrl);
    }
    for (const e of b.bible?.environments || []) {
      if (e.imageUrl) refs.push({ owner: e.name, kind: 'cenario', label: 'referência', imageUrl: e.imageUrl, board: b.id });
      for (const r of [...(e.angles || []), ...(e.props || [])]) if (r.imageUrl) refs.push({ owner: e.name, kind: 'cenario', label: r.label, imageUrl: r.imageUrl, board: b.id });
    }
  }
  return { projectId, boards: boards.map((b) => ({ id: b.id, kind: b.kind, title: b.title, sheetUrl: b.sheetUrl, ...storyboardSummary(b) })), refs };
}

async function saveStoryboard(b: Storyboard): Promise<Storyboard> {
  await ensureTable();
  await pool.query(
    `INSERT INTO public.storyboards (id, user_id, title, logline, panels, sheet_url, bible, kind, project_id, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, $9, NOW())
     ON CONFLICT (id) DO UPDATE SET title = $3, logline = $4, panels = $5::jsonb, sheet_url = $6, bible = $7::jsonb, kind = $8, project_id = $9, updated_at = NOW()`,
    [b.id, b.userId, b.title, b.logline || null, JSON.stringify(b.panels), b.sheetUrl || null, b.bible ? JSON.stringify(b.bible) : null, b.kind || 'geral', b.projectId || null]
  );
  return b;
}

export function storyboardSummary(b: Storyboard) {
  const count = (s: PanelStatus) => b.panels.filter((p) => p.status === s).length;
  return {
    panels: b.panels.length,
    approved: count('approved'),
    rejected: count('rejected'),
    pending: count('pending'),
    animatedTakes: b.panels.filter((p) => p.animate).length,
    readyToProduce: b.panels.length > 0 && count('approved') === b.panels.length,
  };
}

/** Accepts data:/base64 images (e.g. generated by the Antigravity on the PC) and stores them on the server. */
async function persistImage(raw: string | undefined, tag: string): Promise<string | undefined> {
  const v = String(raw || '').trim();
  if (!v) return undefined;
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(v);
  if (m || /^[A-Za-z0-9+/=\s]{400,}$/.test(v)) {
    const mime = m ? m[1] : 'image/png';
    const buf = Buffer.from(m ? m[2] : v, 'base64');
    const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
    const p = await uploadMediaFile(buf, `storyboard_${tag}_${Date.now()}.${ext}`, mime);
    return `https://darktube.fjt-solutions.com${p}`;
  }
  return v;
}

function normalizePanel(p: any, i: number, prev?: StoryboardPanel): StoryboardPanel {
  return {
    index: i + 1,
    narration: p?.narration ?? prev?.narration,
    dialogue: p?.dialogue ?? prev?.dialogue,
    action: String(p?.action ?? prev?.action ?? '').trim(),
    shot: p?.shot ?? prev?.shot,
    setting: p?.setting ?? prev?.setting,
    characters: Array.isArray(p?.characters) ? p.characters.map(String) : prev?.characters,
    edit: p?.edit ?? prev?.edit,
    camera: p?.camera ?? prev?.camera,
    lens: p?.lens ?? prev?.lens,
    duration: Number.isFinite(Number(p?.duration)) && Number(p?.duration) > 0 ? Number(p.duration) : prev?.duration,
    imageUrl: p?.imageUrl ?? prev?.imageUrl,
    animate: p?.animate ?? prev?.animate ?? false,
    // any content change sends the panel back to review
    status: 'pending',
    note: undefined,
  };
}

/** Merges a bible patch (lists are replaced by name; images may come as base64 and are stored). */
async function mergeBible(id: string, current: StoryboardBible | undefined, patch: any): Promise<StoryboardBible | undefined> {
  if (!patch || typeof patch !== 'object') return current;
  const out: StoryboardBible = { ...(current || {}) };
  const byName = async <T extends { name: string }>(cur: T[] | undefined, next: any[], imgKeys: string[], tag: string) => {
    const list = [...(cur || [])];
    for (const raw of next) {
      const name = String(raw?.name || '').trim();
      if (!name) continue;
      const at = list.findIndex((x) => x.name.toLowerCase() === name.toLowerCase());
      const item: any = { ...(at >= 0 ? list[at] : {}), ...raw, name };
      for (const k of imgKeys) {
        const b64 = raw?.[k.replace(/Url$/, 'Base64')];
        if (raw?.[k] || b64) item[k] = await persistImage(raw?.[k] || b64, `${id}_${tag}`);
        delete item[k.replace(/Url$/, 'Base64')];
      }
      for (const k of ['views', 'reactions', 'poses', 'props', 'angles']) {
        if (!Array.isArray(raw?.[k])) continue;
        const refs: SheetRef[] = [];
        for (const r of raw[k]) {
          const label = String(r?.label || r?.name || '').trim();
          if (!label) continue;
          const src = r?.imageUrl || r?.imageBase64;
          refs.push({ label, notes: r?.notes ? String(r.notes) : undefined, imageUrl: src ? await persistImage(src, `${id}_${tag}_${k}`) : undefined });
        }
        item[k] = refs;
      }
      if (at >= 0) list[at] = item;
      else list.push(item);
    }
    return list;
  };
  if (Array.isArray(patch.characters)) out.characters = await byName(out.characters, patch.characters, ['turnaroundUrl', 'expressionsUrl', 'imageUrl'], 'char');
  if (Array.isArray(patch.environments)) out.environments = await byName(out.environments, patch.environments, ['imageUrl'], 'env');
  if (Array.isArray(patch.lighting)) {
    out.lighting = (await byName(
      (out.lighting || []).map((l) => ({ ...l, name: l.label })),
      patch.lighting.map((l: any) => ({ ...l, name: l?.label || l?.name })),
      ['imageUrl'],
      'light'
    )).map(({ name, ...l }: any) => ({ ...l, label: name }));
  }
  if (patch.blocking && typeof patch.blocking === 'object') {
    const img = patch.blocking.imageUrl || patch.blocking.imageBase64;
    out.blocking = {
      imageUrl: img ? await persistImage(img, `${id}_blocking`) : out.blocking?.imageUrl,
      notes: Array.isArray(patch.blocking.notes) ? patch.blocking.notes.map(String) : out.blocking?.notes,
    };
  }
  if (patch.style && typeof patch.style === 'object') out.style = { ...(out.style || {}), ...patch.style };
  if (Array.isArray(patch.credits)) out.credits = patch.credits.map((c: any) => ({ role: String(c?.role || ''), name: String(c?.name || '') }));
  if (patch.production) out.production = normalizeProduction(patch.production);
  return out;
}

export async function createStoryboard(
  userId: string,
  input: { title: string; logline?: string; panels: any[]; bible?: any; kind?: string; projectId?: string }
): Promise<Storyboard> {
  const kind: StoryboardKind = STORYBOARD_KINDS.includes(input.kind as StoryboardKind) ? (input.kind as StoryboardKind) : 'geral';
  const panelsIn = Array.isArray(input.panels) ? input.panels : [];
  if (!panelsIn.length && (kind === 'geral' || kind === 'cena')) throw new Error('Envie "panels" com pelo menos 1 quadro.');
  if (!panelsIn.length && !input.bible) throw new Error('Envie "bible" com os personagens ou cenários deste storyboard.');
  const id = `sb_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const panels: StoryboardPanel[] = [];
  for (let i = 0; i < panelsIn.length; i++) {
    const p = normalizePanel(input.panels[i], i);
    p.imageUrl = await persistImage(input.panels[i]?.imageUrl || input.panels[i]?.imageBase64, `${id}_${i + 1}`);
    panels.push(p);
  }
  const b: Storyboard = {
    id,
    userId,
    title: String(input.title || 'Storyboard').slice(0, 160),
    logline: input.logline,
    kind,
    projectId: input.projectId ? String(input.projectId).trim() : `vid_${Date.now().toString(36)}`,
    panels,
  };
  b.bible = await mergeBible(id, undefined, input.bible);
  // The production assessment (imagem / hibrido / flow) comes first: inherit it from the video's other boards or demand it.
  if (!b.bible?.production && input.projectId) {
    const inherited = (await projectBoards(userId, b.projectId!).catch(() => [])).find((o) => o.bible?.production)?.bible?.production;
    if (inherited) b.bible = { ...(b.bible || {}), production: inherited };
  }
  if (!b.bible?.production) {
    throw new Error(
      'Falta a avaliação de produção. Antes do storyboard, combine com o usuário e envie bible.production = { mode: "imagem" (só imagem, animação do palco 3D, 0 crédito) | "hibrido" (imagem + alguns takes animados no Flow) | "flow" (imagem e animação no Flow), imageSource: "antigravity" | "flow", animatedTakes, reason }.'
    );
  }
  enforceProduction(b.panels, b.bible.production);
  b.sheetUrl = await buildStoryboardSheet(b).catch(() => null);
  return saveStoryboard(b);
}

/** Replace some panels (by index) or append new ones; changed panels go back to "pending". A bible patch keeps the panel status. */
export async function updateStoryboardPanels(
  userId: string,
  id: string,
  changes: any[],
  extra?: { bible?: any; title?: string; logline?: string }
): Promise<Storyboard> {
  const b = await getStoryboard(userId, id);
  if (extra?.title) b.title = String(extra.title).slice(0, 160);
  if (extra?.logline) b.logline = String(extra.logline);
  b.bible = await mergeBible(id, b.bible, extra?.bible);
  for (const c of changes || []) {
    const idx = Number(c?.index);
    const at = idx >= 1 && idx <= b.panels.length ? idx - 1 : b.panels.length;
    const p = normalizePanel(c, at, b.panels[at]);
    const img = c?.imageUrl || c?.imageBase64;
    if (img) p.imageUrl = await persistImage(img, `${id}_${at + 1}`);
    b.panels[at] = p;
  }
  b.panels.forEach((p, i) => (p.index = i + 1));
  enforceProduction(b.panels, b.bible?.production);
  b.sheetUrl = await buildStoryboardSheet(b).catch(() => b.sheetUrl || null);
  return saveStoryboard(b);
}

/** Manual (semi-automatic) decision of Nathan / the user on each panel. */
export async function decideStoryboardPanels(
  userId: string,
  id: string,
  decisions: Array<{ index: number; status: 'approved' | 'rejected'; note?: string }>
): Promise<Storyboard> {
  const b = await getStoryboard(userId, id);
  for (const d of decisions || []) {
    const p = b.panels[Number(d.index) - 1];
    if (!p) continue;
    p.status = d.status === 'rejected' ? 'rejected' : 'approved';
    p.note = d.note ? String(d.note) : p.status === 'approved' ? undefined : p.note;
  }
  b.sheetUrl = await buildStoryboardSheet(b).catch(() => b.sheetUrl || null);
  return saveStoryboard(b);
}

const REVIEW_SYSTEM = `You are a strict storyboard supervisor for a narrated vertical (9:16) story video. Each panel is one take: the narration, an optional character line, the action the picture must show, the framing/depth, the setting, the cast and the edit beat, plus a draft image when available.
Approve a panel only when ALL of these hold:
1. Narrated = shown: every action spoken in the narration/dialogue is in "action" and, when there is an image, is visibly performed in it.
2. Continuity with the previous and next panel of the same setting: characters keep their side of the frame and their position relative to furniture (behind the desk stays behind), props keep their place, and an object the narration mentions is already visible before (never appears out of nowhere).
3. Cast: only people listed in "characters" appear, each with a recognisable identity; an unnamed person must be introduced by the narration.
4. Color: characters in full color like the rest of the frame (no grey/black-and-white person inside a colored set, unless the whole frame is CCTV/flashback on purpose).
5. Depth: the shot says where each person is (foreground / middle / background) and the scale matches; the main character is centered enough to survive a 9:16 crop.
6. Edit: an event the narration describes physically (lights out, earthquake, knock, scream, laugh, gunshot) has an edit beat (blackout, quake, flash, jolt, sfx) on that word.
Be concrete and short. Return ONLY JSON: {"summary":"<one sentence in Brazilian Portuguese>","panels":[{"index":1,"approved":true,"note":"<Brazilian Portuguese: what is wrong and exactly how to fix it, empty when approved>"}]}`;

async function imageToB64(url: string): Promise<{ data: string; mime: string } | null> {
  try {
    let buf: Buffer;
    if (url.includes('/api/storage/')) buf = await readStored(url.slice(url.indexOf('/api/storage/')));
    else {
      const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!r.ok) return null;
      buf = Buffer.from(await r.arrayBuffer());
    }
    const mime = /\.jpe?g($|\?)/i.test(url) ? 'image/jpeg' : /\.webp($|\?)/i.test(url) ? 'image/webp' : 'image/png';
    return { data: buf.toString('base64'), mime };
  } catch {
    return null;
  }
}

/** Automatic review: the user's vision LLM approves/rejects each panel with a fix note. */
export async function reviewStoryboard(
  userId: string,
  id: string,
  credentials: Array<{ provider: FlowProvider; apiKey: string }>
): Promise<{ board: Storyboard; summary: string; engine?: string }> {
  const b = await getStoryboard(userId, id);
  const creds = credentials.filter((c) => c.apiKey);
  if (!creds.length) throw new Error('Nenhuma credencial de LLM com visão cadastrada para revisar o storyboard.');
  const summaries: string[] = [];
  let engine: string | undefined;
  // 12 panels per call keeps the images under the vision limit; neighbours of the batch go as text context
  for (let s = 0; s < b.panels.length; s += 12) {
    const batch = b.panels.slice(s, s + 12);
    const images: FlowVisionImage[] = [];
    for (const p of batch) {
      if (!p.imageUrl) continue;
      const img = await imageToB64(p.imageUrl);
      if (img) images.push({ dataBase64: img.data, mimeType: img.mime, label: `Quadro ${p.index}` });
    }
    const ctx = (p?: StoryboardPanel) =>
      p
        ? `Quadro ${p.index}${p.imageUrl ? ' (com imagem)' : ' (sem imagem)'}\nNarração: ${p.narration || '-'}\nFala: ${p.dialogue || '-'}\nAção mostrada: ${p.action || '-'}\nEnquadramento/profundidade: ${p.shot || '-'}${p.camera ? `\nCâmera: ${p.camera}` : ''}\nAmbiente: ${p.setting || '-'}\nElenco: ${(p.characters || []).join(', ') || '-'}\nEdição: ${p.edit || '-'}`
        : '';
    const user = [
      `História: ${b.title}${b.logline ? ` — ${b.logline}` : ''}`,
      s > 0 ? `Contexto (quadro anterior, já revisado):\n${ctx(b.panels[s - 1])}` : '',
      ...batch.map(ctx),
      b.panels[s + 12] ? `Contexto (quadro seguinte):\n${ctx(b.panels[s + 12])}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    for (const c of creds) {
      try {
        const raw = await callFlowVisionLLM(c.provider, c.apiKey, REVIEW_SYSTEM, user, images);
        const m = String(raw).match(/\{[\s\S]*\}/);
        if (!m) continue;
        const parsed = JSON.parse(m[0]);
        for (const r of Array.isArray(parsed?.panels) ? parsed.panels : []) {
          const p = b.panels[Number(r?.index) - 1];
          if (!p || p.index < s + 1 || p.index > s + batch.length) continue;
          p.status = r?.approved === false ? 'rejected' : 'approved';
          p.note = p.status === 'rejected' ? String(r?.note || 'Reprovado sem motivo detalhado.') : undefined;
        }
        if (parsed?.summary) summaries.push(String(parsed.summary));
        engine = c.provider;
        break;
      } catch {}
    }
  }
  if (!engine) throw new Error('A revisão automática do storyboard falhou em todas as credenciais de LLM.');
  b.sheetUrl = await buildStoryboardSheet(b).catch(() => b.sheetUrl || null);
  await saveStoryboard(b);
  return { board: b, summary: summaries.join(' '), engine };
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

type CamMove = 'locked' | 'pushIn' | 'pullOut' | 'track' | 'pan' | 'tilt' | 'whip' | 'shake' | 'orbit' | 'crane';

const CAM_RULES: Array<[CamMove, RegExp, string]> = [
  ['pushIn', /push|aproxim|zoom.?in|avan[cç]/i, 'PUSH-IN'],
  ['pullOut', /pull|afast|zoom.?out|recu/i, 'PULL-OUT'],
  ['whip', /whip|chicot/i, 'WHIP PAN'],
  ['orbit', /orbit|órbita|\barco\b|\barc\b|gira em volta/i, 'ÓRBITA'],
  ['track', /track|travel|acompanh|dolly|lateral/i, 'TRAVELLING'],
  ['crane', /crane|grua|drone|sobe|desce/i, 'GRUA'],
  ['tilt', /tilt/i, 'TILT'],
  ['pan', /\bpan\b|panor/i, 'PAN'],
  ['shake', /trem|shake|quake|na m[aã]o|handheld/i, 'TREMOR'],
  ['locked', /fix|locked|parad|est[aá]tic/i, 'FIXA'],
];

function cameraMove(p: StoryboardPanel): { move: CamMove; label: string } {
  const text = `${p.camera || ''}`;
  for (const [move, re, label] of CAM_RULES) if (re.test(text)) return { move, label };
  if (/quake|tremor|terremoto/i.test(p.edit || '')) return { move: 'shake', label: 'TREMOR' };
  return { move: 'locked', label: 'FIXA' };
}

const CAM_ICON = (x: number, y: number, rot = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-11" y="-7" width="17" height="14" rx="2" fill="#1c1917"/><path d="M6 -4 L15 -8 L15 8 L6 4Z" fill="#1c1917"/></g>`;
const SUBJECT = (x: number, y: number) =>
  `<circle cx="${x}" cy="${y - 7}" r="5" fill="#c2410c"/><rect x="${x - 6}" y="${y - 1}" width="12" height="14" rx="4" fill="#c2410c"/>`;
const ARROW = 'stroke="#1c1917" stroke-width="2.2" fill="none" marker-end="url(#sbah)"';

/** Small top-down diagram of each camera move (section 4). */
function cameraDiagram(move: CamMove): string {
  const body: Record<CamMove, string> = {
    locked: `${CAM_ICON(28, 48)}${SUBJECT(118, 46)}<path d="M44 48 L104 22 M44 48 L104 74" stroke="#78716c" stroke-dasharray="4 3" fill="none"/>`,
    pushIn: `${CAM_ICON(24, 48)}${SUBJECT(124, 46)}<path d="M44 48 L94 48" ${ARROW}/>`,
    pullOut: `${CAM_ICON(76, 48)}${SUBJECT(126, 46)}<path d="M58 48 L16 48" ${ARROW}/>`,
    track: `${SUBJECT(80, 30)}${CAM_ICON(80, 70, -90)}<path d="M22 84 L132 84" ${ARROW}/>`,
    pan: `${CAM_ICON(40, 50)}<path d="M96 18 A46 46 0 0 1 96 82" ${ARROW}/>${SUBJECT(126, 50)}`,
    tilt: `${CAM_ICON(40, 50)}<path d="M84 82 A44 44 0 0 0 84 18" ${ARROW}/>${SUBJECT(124, 50)}`,
    whip: `${CAM_ICON(40, 50)}<path d="M96 16 A48 48 0 0 1 96 84" ${ARROW} stroke-width="3.4"/><path d="M110 30 L130 26 M114 50 L136 50 M110 70 L130 74" stroke="#78716c" stroke-width="2"/>`,
    shake: `${CAM_ICON(30, 48)}<polyline points="52,48 60,36 68,60 76,36 84,60 92,48" stroke="#1c1917" stroke-width="2.2" fill="none"/>${SUBJECT(122, 46)}`,
    orbit: `${SUBJECT(76, 48)}<ellipse cx="76" cy="52" rx="56" ry="26" stroke="#78716c" stroke-dasharray="4 3" fill="none"/><path d="M128 62 A56 26 0 0 1 76 78" ${ARROW}/>${CAM_ICON(132, 50, 180)}`,
    crane: `${CAM_ICON(34, 78)}<path d="M34 64 L34 22" ${ARROW}/>${SUBJECT(116, 50)}`,
  };
  return `<svg viewBox="0 0 150 96" width="150" height="96">${body[move]}</svg>`;
}

const SHEET_STATUS = {
  approved: { color: '#15803d', label: 'APROVADO' },
  rejected: { color: '#b91c1c', label: 'REPROVADO' },
  pending: { color: '#78716c', label: 'PENDENTE' },
} as const;

const KIND_TITLE: Record<StoryboardKind, string> = {
  geral: 'STORYBOARD DE PRODUÇÃO',
  personagens: 'FOLHA DE PERSONAGENS',
  cenarios: 'FOLHA DE CENÁRIOS',
  cena: 'STORYBOARD DA CENA',
};

type PicFn = (url: string | undefined, h: number, alt: string, cls?: string) => string;
type CastItem = NonNullable<StoryboardBible['characters']>[number];
type EnvItem = NonNullable<StoryboardBible['environments']>[number];

const refStrip = (title: string, refs: SheetRef[] | undefined, h: number, pic: PicFn) =>
  refs?.length
    ? `<div class="refrow"><b>${esc(title)}</b><div class="strip">${refs
        .map((r) => `<figure>${pic(r.imageUrl, h, `gerar: ${r.label}`)}<figcaption>${esc(r.label)}${r.notes ? ` · <i>${esc(r.notes)}</i>` : ''}</figcaption></figure>`)
        .join('')}</div></div>`
    : '';

/** "personagens" board: 360 views, reactions, poses and objects of each character. */
function charactersBoardHtml(cast: CastItem[], pic: PicFn): string {
  if (!cast.length) return `<section class="sec">${'<div class="ph" style="height:160px">Nenhum personagem enviado</div>'}</section>`;
  return cast
    .map((c, i) => {
      const single = [
        c.turnaroundUrl ? { label: 'turnaround', imageUrl: c.turnaroundUrl } : null,
        c.expressionsUrl ? { label: 'expressões', imageUrl: c.expressionsUrl } : null,
        c.imageUrl ? { label: 'referência', imageUrl: c.imageUrl } : null,
      ].filter(Boolean) as SheetRef[];
      const notes = [c.description, ...(c.notes || [])].filter(Boolean).map((n) => `<li>${esc(n)}</li>`).join('');
      const rows =
        refStrip('360°', c.views, 330, pic) +
        refStrip('Reações', c.reactions, 220, pic) +
        refStrip('Poses', c.poses, 260, pic) +
        refStrip('Objetos', c.props, 170, pic) +
        (!c.views?.length && single.length ? refStrip('Referência', single, 330, pic) : '');
      return `<section class="sec refsec"><h2><span>${i + 1}</span>${esc(c.name)}${c.role ? ` · ${esc(c.role)}` : ''}</h2>
  <div class="char" style="grid-template-columns:1fr 300px"><div>${rows || '<div class="ph" style="height:200px">sem imagens: gerar 360 (frente, 3/4, perfil, costas), reações e objetos</div>'}</div>
  <div class="cnotes">${notes ? `<ul>${notes}</ul>` : ''}${c.voice ? `<div class="voice">VOZ · ${esc(c.voice)}</div>` : ''}</div></div></section>`;
    })
    .join('');
}

/** "cenarios" board: every set in several camera angles, its objects and the floor plan. */
function setsBoardHtml(envs: EnvItem[], blocking: StoryboardBible['blocking'], pic: PicFn): string {
  const sets = envs
    .map((e, i) => {
      const angles: SheetRef[] = e.angles?.length ? e.angles : e.imageUrl ? [{ label: 'referência', imageUrl: e.imageUrl }] : [];
      return `<section class="sec refsec"><h2><span>${i + 1}</span>${esc(e.name)}</h2>${e.description ? `<p style="margin-bottom:8px">${esc(e.description)}</p>` : ''}
  ${angles.length ? `<div class="angles">${angles.map((a) => `<figure>${pic(a.imageUrl, 300, `gerar: ${a.label}`)}<figcaption>${esc(a.label)}${a.notes ? ` · <i>${esc(a.notes)}</i>` : ''}</figcaption></figure>`).join('')}</div>` : '<div class="ph" style="height:200px">sem imagens: gerar o cenário em vários ângulos (geral, contraplano, plongée, detalhe)</div>'}
  ${refStrip('Objetos', e.props, 170, pic)}</section>`;
    })
    .join('');
  const blk =
    blocking && (blocking.imageUrl || blocking.notes?.length)
      ? `<section class="sec refsec"><h2><span>${envs.length + 1}</span>Planta / marcação</h2>${blocking.imageUrl ? pic(blocking.imageUrl, 360, '') : ''}${blocking.notes?.length ? `<ul style="padding-left:16px;margin-top:6px">${blocking.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</section>`
      : '';
  return sets + blk || '<section class="sec"><div class="ph" style="height:160px">Nenhum cenário enviado</div></section>';
}

function aspectRatioOf(b: Storyboard): number {
  const m = /^(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)$/.exec(String(b.bible?.style?.aspectRatio || '9:16').trim());
  const r = m ? Number(m[1]) / Number(m[2]) : 9 / 16;
  return Number.isFinite(r) && r > 0 ? r : 9 / 16;
}

/**
 * Production-bible sheet in the OpenArt Director style: 1) characters, 2) environments + blocking,
 * 3) storyboard, 4) camera moves, 5) lighting / mood, 6) shot list, 7) credits, 8) metadata + palette.
 * `img` maps every image url of the board to an embeddable src (data URI).
 */
export function renderStoryboardSheetHtml(b: Storyboard, img: (url?: string) => string | undefined): string {
  const bible = b.bible || {};
  const style = bible.style || {};
  const s = storyboardSummary(b);
  const ar = aspectRatioOf(b);
  const cellW = ar < 1 ? 176 : 300;
  const thumbH = Math.round(cellW / ar);
  const ph = (text: string, h: number) => `<div class="ph" style="height:${h}px">${esc(text)}</div>`;
  const pic = (url: string | undefined, h: number, alt: string, cls = '') =>
    img(url) ? `<img class="${cls}" src="${img(url)}" style="height:${h}px"/>` : ph(alt, h);
  const sec = (n: number, title: string, body: string, extra = '') =>
    `<section class="sec ${extra}"><h2><span>${n}</span>${esc(title)}</h2>${body}</section>`;

  // 1) characters: given ones, else the names used in the panels
  const castNames = Array.from(new Set(b.panels.flatMap((p) => p.characters || []).map((n) => n.trim()).filter(Boolean)));
  const cast = bible.characters?.length ? bible.characters : castNames.map((name) => ({ name } as NonNullable<StoryboardBible['characters']>[number]));
  const charHtml = cast.length
    ? cast
        .map((c) => {
          const visuals = [
            c.turnaroundUrl ? `<figure>${pic(c.turnaroundUrl, 230, '')}<figcaption>FRENTE · LADO · COSTAS</figcaption></figure>` : '',
            c.expressionsUrl ? `<figure>${pic(c.expressionsUrl, 230, '')}<figcaption>EXPRESSÕES</figcaption></figure>` : '',
            !c.turnaroundUrl && !c.expressionsUrl
              ? `<figure>${pic(c.imageUrl || c.views?.[0]?.imageUrl, 230, 'sem referência: gerar turnaround (frente, lado, costas) e expressões')}<figcaption>REFERÊNCIA</figcaption></figure>`
              : '',
          ].join('');
          const notes = [c.description, ...(c.notes || [])].filter(Boolean).map((n) => `<li>${esc(n)}</li>`).join('');
          return `<div class="char"><div class="vis">${visuals}</div><div class="cnotes"><h3>${esc(c.name)}</h3>${c.role ? `<div class="role">${esc(c.role)}</div>` : ''}${notes ? `<ul>${notes}</ul>` : ''}${c.voice ? `<div class="voice">VOZ · ${esc(c.voice)}</div>` : ''}</div></div>`;
        })
        .join('')
    : ph('Elenco ainda não definido', 120);

  // 2) environments + blocking
  const settings = Array.from(new Set(b.panels.map((p) => (p.setting || '').trim()).filter(Boolean)));
  const envs = bible.environments?.length ? bible.environments : settings.map((name) => ({ name } as NonNullable<StoryboardBible['environments']>[number]));
  const envHtml = envs
    .map((e) => `<figure class="env">${pic(e.imageUrl || e.angles?.[0]?.imageUrl, 190, 'sem imagem de referência')}<figcaption>${esc(e.name)}${e.description ? ` · <i>${esc(e.description)}</i>` : ''}</figcaption></figure>`)
    .join('');
  const blk = bible.blocking;
  const blockingHtml =
    blk && (blk.imageUrl || blk.notes?.length)
      ? `<figure class="env blk">${blk.imageUrl ? pic(blk.imageUrl, 190, '') : ''}<figcaption>PLANTA / MARCAÇÃO</figcaption>${blk.notes?.length ? `<ul>${blk.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</figure>`
      : '';

  // 3) storyboard cells
  const cells = b.panels
    .map((p) => {
      const st = SHEET_STATUS[p.status];
      const cam = cameraMove(p);
      return `<div class="cell" style="width:${cellW}px">
  <div class="chead"><b>${String(p.index).padStart(2, '0')}</b><span class="chip" style="background:${st.color}">${st.label}</span>${p.animate ? '<span class="chip anim">ANIMADO</span>' : ''}</div>
  <div class="thumb" style="height:${thumbH}px">${img(p.imageUrl) ? `<img class="pf" src="${img(p.imageUrl)}"/>` : `<div class="ph" style="height:${thumbH}px">${esc(p.action)}</div>`}</div>
  <div class="ctx">
    ${p.narration ? `<p class="nar">“${esc(p.narration)}”</p>` : ''}
    ${p.dialogue ? `<p class="dl">${esc(p.dialogue)}</p>` : ''}
    <p class="sh">${esc([p.shot, cam.label, p.lens].filter(Boolean).join(' · '))}</p>
    ${p.edit ? `<p class="ed">✂ ${esc(p.edit)}</p>` : ''}
    ${p.note ? `<p class="nt">⚠ ${esc(p.note)}</p>` : ''}
  </div></div>`;
    })
    .join('');

  // 4) camera moves actually used, with the takes that use them
  const moves = new Map<CamMove, { label: string; takes: number[] }>();
  for (const p of b.panels) {
    const c = cameraMove(p);
    const e = moves.get(c.move) || { label: c.label, takes: [] };
    e.takes.push(p.index);
    moves.set(c.move, e);
  }
  const camHtml = Array.from(moves.entries())
    .map(([move, e]) => `<div class="cam">${cameraDiagram(move)}<b>${e.label}</b><small>takes ${e.takes.join(', ')}</small></div>`)
    .join('');

  // 5) lighting / mood: given refs, else first, middle and last frame
  const framed = b.panels.filter((p) => img(p.imageUrl));
  const lightRefs = bible.lighting?.length
    ? bible.lighting
    : [framed[0], framed[Math.floor(framed.length / 2)], framed[framed.length - 1]]
        .filter((p, i, a): p is StoryboardPanel => !!p && a.indexOf(p) === i)
        .map((p) => ({ label: `Take ${p.index}${p.setting ? ` · ${p.setting}` : ''}`, imageUrl: p.imageUrl, notes: undefined as string | undefined }));
  const lightHtml = `<div class="lights">${lightRefs
    .map((l) => `<figure>${pic(l.imageUrl, 150, '')}<figcaption>${esc(l.label)}${l.notes ? `<br/><i>${esc(l.notes)}</i>` : ''}</figcaption></figure>`)
    .join('')}</div>${
    style.mood || style.lighting
      ? `<dl class="kv">${style.mood ? `<dt>CLIMA</dt><dd>${esc(style.mood)}</dd>` : ''}${style.lighting ? `<dt>LUZ</dt><dd>${esc(style.lighting)}</dd>` : ''}</dl>`
      : ''
  }`;

  // 6) shot list
  const rows = b.panels
    .map((p) => {
      const st = SHEET_STATUS[p.status];
      return `<tr><td class="c">${p.index}</td><td>${esc(p.narration || '')}${p.dialogue ? `<div class="dl">${esc(p.dialogue)}</div>` : ''}</td><td>${esc(p.action)}</td><td>${esc(p.shot || '')}</td><td>${esc(p.camera || cameraMove(p).label)}</td><td class="c">${esc(p.lens || '')}</td><td class="c">${p.duration ? `${p.duration}s` : ''}</td><td>${esc(p.edit || '')}</td><td><b style="color:${st.color}">${st.label}</b>${p.note ? `<div class="nt">${esc(p.note)}</div>` : ''}</td></tr>`;
    })
    .join('');
  const table = `<table><thead><tr><th>#</th><th>NARRAÇÃO / FALA</th><th>A IMAGEM MOSTRA</th><th>PLANO / PROFUNDIDADE</th><th>CÂMERA</th><th>LENTE</th><th>DURAÇÃO</th><th>EDIÇÃO</th><th>STATUS</th></tr></thead><tbody>${rows}</tbody></table>`;

  // 7) credits
  const credits = bible.credits?.length
    ? bible.credits
    : [
        { role: 'Produção', name: 'DarkTube' },
        { role: 'Imagens', name: 'Nano Banana Pro' },
        ...cast.filter((c) => c.voice).map((c) => ({ role: `Voz · ${c.name}`, name: c.voice as string })),
      ];
  const creditsHtml = `<dl class="kv">${credits.map((c) => `<dt>${esc(c.role).toUpperCase()}</dt><dd>${esc(c.name)}</dd>`).join('')}</dl>`;

  // 8) metadata
  const totalSec = b.panels.reduce((acc, p) => acc + (p.duration || 0), 0);
  const meta: Array<[string, string | undefined]> = [
    ['GÊNERO', style.genre],
    ['ESTILO DE RENDER', style.renderStyle],
    ['FORMATO', `${style.aspectRatio || '9:16'}${ar < 1 ? ' · vertical' : ' · horizontal'}`],
    ['TAKES', s.panels ? `${s.panels} (${s.animatedTakes} animados)` : undefined],
    ['ELENCO', b.kind === 'personagens' && cast.length ? cast.map((c) => c.name).join(' · ') : undefined],
    ['DURAÇÃO', totalSec ? `${Math.round(totalSec)}s` : undefined],
    ['LUZ', style.lighting],
    ['HORÁRIO', style.timeOfDay],
    ['LOCAÇÃO', style.location || settings.join(' · ') || undefined],
    ['ÉPOCA', style.era],
    ['APROVAÇÃO', s.panels ? `${s.approved}/${s.panels} aprovados · ${s.rejected} reprovados` : undefined],
  ];
  const palette = (style.palette || []).filter((c) => /^#?[0-9a-f]{3,8}$/i.test(c)).map((c) => (c.startsWith('#') ? c : `#${c}`));
  const metaHtml = `<div class="meta"><div class="palwrap"><div class="mt">8 · METADADOS DO SHOT</div><div id="pal" class="pal">${palette
    .map((c) => `<i style="background:${c}"><em>${esc(c)}</em></i>`)
    .join('')}</div>${style.tags?.length ? `<div class="tags">TAGS · ${style.tags.map(esc).join(' · ')}</div>` : ''}</div><div class="mgrid">${meta
    .filter(([, v]) => v)
    .map(([k, v]) => `<div><span>${k}</span>${esc(v)}</div>`)
    .join('')}</div></div>`;

  const W = 2400;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#ece8df;color:#1c1917;font:14px/1.35 Arial,Helvetica,sans-serif;width:${W}px;padding:26px}
header{display:flex;align-items:flex-end;justify-content:space-between;border-bottom:3px solid #1c1917;padding-bottom:12px;margin-bottom:16px}
header h1{font-size:40px;letter-spacing:-.5px}header .lg{color:#57534e;font-size:17px;margin-top:4px;max-width:1500px}
header .brand{text-align:right;font-size:13px;letter-spacing:2px;color:#57534e}header .brand b{display:block;font-size:22px;letter-spacing:1px;color:#1c1917}
.grid{display:grid;grid-template-columns:1.42fr 1fr;gap:14px;align-items:start}
.col{display:flex;flex-direction:column;gap:14px}
.sec{background:#faf8f3;border:1.5px solid #1c1917;padding:12px 14px}
.sec h2{font-size:14px;letter-spacing:1.6px;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sec h2 span{background:#1c1917;color:#faf8f3;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:13px}
.ph{background:repeating-linear-gradient(45deg,#e7e2d6,#e7e2d6 10px,#efebe2 10px,#efebe2 20px);color:#78716c;font-style:italic;font-size:13px;display:flex;align-items:center;justify-content:center;text-align:center;padding:10px;width:100%}
figure{display:flex;flex-direction:column;gap:4px}figure img{max-width:100%;object-fit:contain;background:#fff;border:1px solid #d6d3d1}
figcaption{font-size:11px;letter-spacing:1.2px;color:#44403c;text-transform:uppercase}figcaption i{text-transform:none;letter-spacing:0}
.chars{display:flex;flex-direction:column;gap:12px}
.char{display:grid;grid-template-columns:1fr 280px;gap:12px;border-top:1px dashed #a8a29e;padding-top:10px}.char:first-child{border-top:0;padding-top:0}
.chars.row{display:grid;gap:14px}.chars.row .char{grid-template-columns:1fr 1fr;border-top:0;padding-top:0;border-left:1px dashed #a8a29e;padding-left:12px}.chars.row .char:first-child{border-left:0;padding-left:0}
.vis{display:flex;gap:10px}.vis figure{flex:1;min-width:0}.vis .ph{min-width:220px}
.cnotes h3{font-size:20px}.role{color:#c2410c;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin:2px 0 6px}
.cnotes ul,.blk ul{padding-left:16px;font-size:13px}.voice{margin-top:8px;font-size:12px;font-weight:700;letter-spacing:1px}
.envs{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.env img{width:100%;object-fit:cover}
.sbgrid{display:flex;flex-wrap:wrap;gap:10px}
.cell{background:#fff;border:1px solid #1c1917;display:flex;flex-direction:column}
.chead{display:flex;align-items:center;gap:4px;padding:4px 6px;border-bottom:1px solid #1c1917}.chead b{font-size:16px;margin-right:auto}
.chip{color:#fff;font-size:9px;font-weight:700;letter-spacing:.6px;padding:2px 5px}.chip.anim{background:#6d28d9}
.thumb{width:100%;overflow:hidden;background:#e7e2d6}.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.ctx{padding:6px 7px;font-size:11.5px;line-height:1.3}.ctx p{margin-bottom:4px}
.nar{font-style:italic}.dl{color:#92400e;font-weight:700}.sh{font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#57534e}.ed{color:#1d4ed8}.nt{color:#b91c1c}
.cams{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.cam{border:1px solid #d6d3d1;background:#fff;display:flex;flex-direction:column;align-items:center;padding:4px 4px 6px}.cam b{font-size:12px;letter-spacing:1px}.cam small{color:#78716c;font-size:11px}
.lights{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.lights img{width:100%;object-fit:cover}
.kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin-top:10px;font-size:13px}.kv dt{font-size:11px;letter-spacing:1.2px;font-weight:700;color:#57534e}
table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1c1917;color:#faf8f3;font-size:10.5px;letter-spacing:1px;text-align:left;padding:5px 6px}
td{border-bottom:1px solid #d6d3d1;padding:5px 6px;vertical-align:top}td.c{text-align:center}tr:nth-child(even) td{background:#f5f2eb}
.meta{margin-top:14px;background:#1c1917;color:#e7e5e4;padding:14px 16px;display:grid;grid-template-columns:860px 1fr;gap:18px}
.mt{font-size:13px;letter-spacing:1.6px;font-weight:700;margin-bottom:8px}
.pal{display:flex;height:58px}.pal i{flex:1;position:relative}.pal em{position:absolute;bottom:-17px;left:0;font-size:10px;font-style:normal;color:#a8a29e}
.tags{margin-top:24px;font-size:12px;color:#d6d3d1}
.refsec{margin-bottom:14px}.refrow{display:grid;grid-template-columns:150px 1fr;gap:12px;border-top:1px dashed #a8a29e;padding:10px 0}.refrow:first-of-type{border-top:0}
.refrow>b{font-size:12px;letter-spacing:1.4px;text-transform:uppercase;padding-top:4px}
.strip{display:flex;flex-wrap:wrap;gap:10px}.strip figure img{object-fit:contain;background:#fff}.strip .ph{width:170px}
.angles{display:grid;grid-template-columns:repeat(auto-fill,240px);gap:12px}.angles img,.angles .ph{width:240px!important;height:auto!important;aspect-ratio:9/16;object-fit:cover}
.mgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px 16px;font-size:13px}.mgrid span{display:block;font-size:10.5px;letter-spacing:1.3px;color:#a8a29e;font-weight:700}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs><marker id="sbah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#1c1917"/></marker></defs></svg>
<header><div><h1>${esc(b.title)}</h1>${b.logline ? `<div class="lg">${esc(b.logline)}</div>` : ''}</div><div class="brand"><b>${KIND_TITLE[b.kind || 'geral']}</b>DARKTUBE${b.projectId ? ` · ${esc(b.projectId)}` : ''}${s.panels ? ` · ${s.approved}/${s.panels} APROVADOS` : ''}${bible.production ? `<br>MODO ${esc({ imagem: 'SÓ IMAGEM', hibrido: 'HÍBRIDO', flow: 'FLOW' }[bible.production.mode])}${bible.production.animatedTakes ? ` · ${bible.production.animatedTakes} ANIMADOS` : ''}` : ''}</div></header>
${b.kind === 'personagens' ? charactersBoardHtml(cast, pic) : b.kind === 'cenarios' ? setsBoardHtml(envs, bible.blocking, pic) : `<div class="grid">
  <div class="col">
    ${sec(
      1,
      'Referência de personagens',
      // single refs side by side; a turnaround/expressions sheet is wide and gets its own row
      cast.some((c) => c.turnaroundUrl || c.expressionsUrl)
        ? `<div class="chars">${charHtml}</div>`
        : `<div class="chars row" style="grid-template-columns:repeat(${Math.min(Math.max(cast.length, 1), 4)},1fr)">${charHtml}</div>`
    )}
    ${sec(3, `Storyboard (${s.panels} takes)`, `<div class="sbgrid">${cells}</div>`)}
  </div>
  <div class="col">
    ${sec(2, 'Ambientes / cenário', envHtml || blockingHtml ? `<div class="envs">${envHtml}${blockingHtml}</div>` : ph('Ambientes ainda não definidos', 120))}
    ${sec(4, 'Câmera / fluxo de planos', `<div class="cams">${camHtml}</div>`)}
    ${lightRefs.length || style.mood || style.lighting ? sec(5, 'Luz / clima / estilo', lightHtml) : ''}
    ${sec(7, 'Créditos', creditsHtml)}
  </div>
</div>
<div style="margin-top:14px">${sec(6, 'Lista de planos', table)}</div>`}
${metaHtml}
<script>
(function(){
  var box=document.getElementById('pal');
  var imgs=[].slice.call(document.querySelectorAll('img.pf'));if(!imgs.length)imgs=[].slice.call(document.querySelectorAll('img'));
  function done(){document.body.setAttribute('data-ready','1');}
  if(!box||box.children.length||!imgs.length){done();return;}
  Promise.all(imgs.map(function(i){return i.complete?0:new Promise(function(r){i.onload=i.onerror=r;});})).then(function(){
    var c=document.createElement('canvas');c.width=c.height=48;var x=c.getContext('2d');var cnt={};
    imgs.forEach(function(i){try{x.drawImage(i,0,0,48,48);var d=x.getImageData(0,0,48,48).data;
      for(var k=0;k<d.length;k+=4){var key=((d[k]>>5)<<6)|((d[k+1]>>5)<<3)|(d[k+2]>>5);var e=cnt[key]||(cnt[key]={n:0,r:0,g:0,b:0});e.n++;e.r+=d[k];e.g+=d[k+1];e.b+=d[k+2];}}catch(err){}});
    var hex=function(v){return ('0'+v.toString(16)).slice(-2);};
    var top=Object.keys(cnt).map(function(k){return cnt[k];}).sort(function(a,b){return b.n-a.n;}).slice(0,10)
      .map(function(e){return [Math.round(e.r/e.n),Math.round(e.g/e.n),Math.round(e.b/e.n)];})
      .sort(function(a,b){return (a[0]*.3+a[1]*.59+a[2]*.11)-(b[0]*.3+b[1]*.59+b[2]*.11);});
    box.innerHTML=top.map(function(c){var h='#'+hex(c[0])+hex(c[1])+hex(c[2]);return '<i style="background:'+h+'"><em>'+h+'</em></i>';}).join('');
    done();
  });
})();
</script>
</body></html>`;
}

/** Renders the production-bible sheet to PNG and stores it; returns the public url. */
export async function buildStoryboardSheet(board: Storyboard): Promise<string | null> {
  // the takes board borrows the characters / sets drawn in the other boards of the same video
  const b: Storyboard = board.kind === 'geral' || board.kind === 'cena' || !board.kind ? { ...board, bible: await projectBible(board) } : board;
  const urls = new Set<string>();
  const add = (u?: string) => u && urls.add(u);
  const addRefs = (refs?: SheetRef[]) => refs?.forEach((r) => add(r.imageUrl));
  b.panels.forEach((p) => add(p.imageUrl));
  b.bible?.characters?.forEach((c) => {
    [c.turnaroundUrl, c.expressionsUrl, c.imageUrl].forEach(add);
    [c.views, c.reactions, c.poses, c.props].forEach(addRefs);
  });
  b.bible?.environments?.forEach((e) => {
    add(e.imageUrl);
    [e.angles, e.props].forEach(addRefs);
  });
  b.bible?.lighting?.forEach((l) => add(l.imageUrl));
  add(b.bible?.blocking?.imageUrl);
  const embedded = new Map<string, string>();
  for (const u of urls) {
    const got = await imageToB64(u);
    if (got) embedded.set(u, `data:${got.mime};base64,${got.data}`);
  }
  const png = await screenshotSheetHtml(renderStoryboardSheetHtml(b, (u) => (u ? embedded.get(u) : undefined)));
  const stored = await uploadMediaFile(png, `${b.id}_sheet_${Date.now()}.png`, 'image/png');
  return `https://darktube.fjt-solutions.com${stored}`;
}

export async function screenshotSheetHtml(html: string): Promise<Buffer> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_storyboard_'));
  const htmlPath = path.join(dir, 'sb.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  const { chromium } = await import('playwright-core');
  const executablePath = findBrowserExecutable({ preferFullChrome: false, defaultExecutablePath: chromium.executablePath() });
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 2400, height: 1200 }, deviceScaleFactor: 1 });
    await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForFunction(() => document.body.getAttribute('data-ready') === '1', undefined, { timeout: 15_000 }).catch(() => {});
    return await page.screenshot({ type: 'png', fullPage: true });
  } finally {
    await browser.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
