import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ffmpegBin } from '@/lib/flow-assemble';
import { getPythonCommand } from '@/lib/python-runtime';

const runExec = promisify(execFile);

export interface Local3dModelItem {
  id: string;
  name: string;
  source: 'local' | 'polyhaven' | 'polypizza' | 'sketchfab' | 'url';
  license: string;
  glbUrl: string; // e.g. /threejs-engine/models/...
  tags: string[];
  thumbnailUrl?: string;
  createdAt: string;
}

export interface Remote3dAssetCandidate {
  id: string;
  name: string;
  source: 'local' | 'polyhaven' | 'polypizza' | 'sketchfab';
  license: string;
  tags: string[];
  thumbnailUrl?: string;
  downloadUrl?: string;
  glbUrl?: string; // already cached locally
  requiresToken?: boolean;
}

export interface WikimediaImageCandidate {
  id: string;
  title: string;
  url: string;
  thumbUrl: string;
  license: string;
  artist: string;
  width: number;
  height: number;
}

export interface FreesoundSfxCandidate {
  id: string;
  name: string;
  source: 'freesound_cc0' | 'builtin_cc0';
  license: string;
  durationSec: number;
  previewUrl: string;
  tags: string[];
}

const MODELS_DIR = () => path.resolve(process.cwd(), 'public/threejs-engine/models');
const MANIFEST_PATH = () => path.join(MODELS_DIR(), 'manifest.json');

let polyHavenCatalogCache: { fetchedAt: number; data: Record<string, any> } | null = null;

function ensureModelsDir() {
  fs.mkdirSync(MODELS_DIR(), { recursive: true });
}

function safeSlug(raw: string): string {
  return String(raw || 'model')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'model';
}

function readManifest(): Local3dModelItem[] {
  ensureModelsDir();
  const p = MANIFEST_PATH();
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeManifest(items: Local3dModelItem[]) {
  ensureModelsDir();
  fs.writeFileSync(MANIFEST_PATH(), JSON.stringify(items, null, 2), 'utf8');
}

function upsertManifestItem(item: Local3dModelItem): Local3dModelItem {
  const list = readManifest().filter((x) => x.id !== item.id);
  list.unshift(item);
  writeManifest(list);
  return item;
}

/** Lista todos os modelos .glb/.gltf disponíveis no cache local ($0, instantâneo). */
export function listLocal3dModels(): Local3dModelItem[] {
  ensureModelsDir();
  const manifest = readManifest();
  const byUrl = new Map<string, Local3dModelItem>();
  for (const m of manifest) {
    const rel = m.glbUrl.replace(/^\/threejs-engine\/models\//, '');
    if (fs.existsSync(path.join(MODELS_DIR(), rel))) {
      byUrl.set(m.glbUrl, m);
    }
  }
  // Também detecta arquivos .glb colocados manualmente em public/threejs-engine/models/
  for (const ent of fs.readdirSync(MODELS_DIR(), { withFileTypes: true })) {
    if (ent.isFile() && /\.(glb|gltf)$/i.test(ent.name)) {
      const glbUrl = `/threejs-engine/models/${ent.name}`;
      if (!byUrl.has(glbUrl)) {
        const id = safeSlug(path.basename(ent.name, path.extname(ent.name)));
        byUrl.set(glbUrl, {
          id,
          name: id.replace(/_/g, ' '),
          source: 'local',
          license: 'CC0 / Local',
          glbUrl,
          tags: [id],
          createdAt: new Date().toISOString(),
        });
      }
    }
  }
  return Array.from(byUrl.values());
}

async function fetchPolyHavenCatalog(): Promise<Record<string, any>> {
  if (polyHavenCatalogCache && Date.now() - polyHavenCatalogCache.fetchedAt < 30 * 60_000) {
    return polyHavenCatalogCache.data;
  }
  const res = await fetch('https://api.polyhaven.com/assets?t=models', {
    headers: { 'User-Agent': 'DarkTube-3D-Studio/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Poly Haven API indisponível (${res.status})`);
  const data = (await res.json()) as Record<string, any>;
  polyHavenCatalogCache = { fetchedAt: Date.now(), data };
  return data;
}

/**
 * Busca modelos 3D gratuitos CC0 em:
 * 1) Cache local
 * 2) Poly Haven API (100% grátis, sem chave, 100% CC0)
 * 3) Poly Pizza API (opcional se POLY_PIZZA_API_KEY estiver configurada, filtro CC0)
 */
export async function searchFree3dAssets(query: string, opts?: { limit?: number; polyPizzaApiKey?: string }): Promise<{
  local: Local3dModelItem[];
  remote: Remote3dAssetCandidate[];
  sourcesChecked: string[];
}> {
  const q = String(query || '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(opts?.limit || 16), 1), 40);
  const tokens = q.split(/\s+/).filter(Boolean);

  const allLocal = listLocal3dModels();
  const local = !tokens.length
    ? allLocal.slice(0, limit)
    : allLocal.filter((m) => {
        const hay = `${m.id} ${m.name} ${m.tags.join(' ')}`.toLowerCase();
        return tokens.some((tok) => hay.includes(tok));
      }).slice(0, limit);

  const remote: Remote3dAssetCandidate[] = [];
  const sourcesChecked: string[] = ['local'];

  // 1) Poly Haven (CC0, sem API key)
  try {
    const catalog = await fetchPolyHavenCatalog();
    sourcesChecked.push('polyhaven');
    const scored: Array<{ score: number; item: Remote3dAssetCandidate }> = [];
    for (const [id, meta] of Object.entries(catalog)) {
      const name = String(meta?.name || id);
      const tags: string[] = [
        ...(Array.isArray(meta?.tags) ? meta.tags : []),
        ...(Array.isArray(meta?.categories) ? meta.categories : []),
      ].map((t) => String(t).toLowerCase());
      const hay = `${id} ${name} ${tags.join(' ')}`.toLowerCase();
      let score = 0;
      if (!tokens.length) {
        score = Number(meta?.download_count || 1);
      } else {
        for (const tok of tokens) {
          if (id.toLowerCase().includes(tok) || name.toLowerCase().includes(tok)) score += 10;
          else if (tags.some((t) => t.includes(tok))) score += 5;
          else if (hay.includes(tok)) score += 2;
        }
      }
      if (score > 0) {
        scored.push({
          score,
          item: {
            id,
            name,
            source: 'polyhaven',
            license: 'CC0',
            tags: tags.slice(0, 8),
            thumbnailUrl: `https://cdn.polyhaven.com/asset_img/thumbs/${encodeURIComponent(id)}.png?width=320`,
          },
        });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    for (const s of scored.slice(0, limit)) remote.push(s.item);
  } catch {
    // offline ou indisponível: segue com outras fontes
  }

  // 2) Poly Pizza (opcional, conta gratuita, filtro CC0)
  const pizzaKey = opts?.polyPizzaApiKey || process.env.POLY_PIZZA_API_KEY || '';
  if (pizzaKey && q) {
    try {
      const url = `https://api.poly.pizza/v1.1/search/${encodeURIComponent(q)}?licence=CC0`;
      const res = await fetch(url, {
        headers: { 'x-auth-token': pizzaKey, 'User-Agent': 'DarkTube-3D-Studio/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        sourcesChecked.push('polypizza');
        const json = await res.json();
        const rows = Array.isArray(json?.results) ? json.results : [];
        for (const r of rows.slice(0, limit)) {
          if (!r?.Download) continue;
          remote.push({
            id: String(r.ID || safeSlug(r.Title || 'model')),
            name: String(r.Title || r.ID || 'Modelo Poly Pizza'),
            source: 'polypizza',
            license: String(r.Licence || 'CC0'),
            tags: Array.isArray(r.Tags) ? r.Tags.map(String).slice(0, 8) : [],
            thumbnailUrl: r.Thumbnail ? String(r.Thumbnail) : undefined,
            downloadUrl: String(r.Download),
          });
        }
      }
    } catch {}
  }

  // 3) Sketchfab (modelos gratuitos baixáveis; busca é aberta sem chave!)
  if (q) {
    try {
      const sf = await searchSketchfabFreeModels(q, Math.min(8, limit));
      if (sf.length > 0) sourcesChecked.push('sketchfab');
      for (const item of sf) remote.push(item);
    } catch {}
  }

  return { local, remote: remote.slice(0, limit), sourcesChecked };
}

/** Busca modelos 3D gratuitos para download no Sketchfab v3 Search API (sem necessidade de chave para pesquisa). */
export async function searchSketchfabFreeModels(
  query: string,
  limit = 10,
  token = process.env.SKETCHFAB_API_TOKEN || ''
): Promise<Remote3dAssetCandidate[]> {
  const q = String(query || '').trim();
  if (!q) return [];
  const url = `https://api.sketchfab.com/v3/search?type=models&downloadable=true&archives_flavours=false&q=${encodeURIComponent(q)}&count=${Math.min(24, Math.max(1, limit))}`;
  const headers: Record<string, string> = { 'User-Agent': 'DarkTube-3D-Studio/1.0' };
  if (token) headers.Authorization = `Token ${token}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return [];
  const json = await res.json();
  const rows = Array.isArray(json?.results) ? json.results : [];
  return rows.slice(0, limit).map((r: any) => {
    const thumbs = Array.isArray(r?.thumbnails?.images) ? r.thumbnails.images : [];
    const bestThumb = thumbs.find((t: any) => t.width >= 300)?.url || thumbs[0]?.url;
    const tags = Array.isArray(r?.tags) ? r.tags.map((t: any) => String(t?.name || t)).filter(Boolean).slice(0, 6) : [];
    return {
      id: String(r.uid),
      name: String(r.name || 'Modelo Sketchfab'),
      source: 'sketchfab' as const,
      license: String(r?.license?.label || 'Sketchfab Free'),
      tags,
      thumbnailUrl: bestThumb ? String(bestThumb) : undefined,
      requiresToken: !token,
    };
  });
}

/** Baixa um modelo gratuito do Sketchfab (.glb ou .zip contendo .gltf/.glb) usando SKETCHFAB_API_TOKEN. */
export async function downloadSketchfabModel(
  uid: string,
  token = process.env.SKETCHFAB_API_TOKEN || ''
): Promise<Local3dModelItem> {
  const cleanUid = safeSlug(uid);
  const existing = listLocal3dModels().find((m) => m.id === `sf_${cleanUid}`);
  if (existing) return existing;
  if (!token) {
    throw new Error(
      'Configure SKETCHFAB_API_TOKEN gratuita (sketchfab.com/settings/password) nas variáveis de ambiente para baixar modelos do Sketchfab automaticamente.'
    );
  }
  const metaRes = await fetch(`https://api.sketchfab.com/v3/models/${encodeURIComponent(uid)}/download`, {
    headers: { Authorization: `Token ${token}`, 'User-Agent': 'DarkTube-3D-Studio/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!metaRes.ok) {
    throw new Error(`Sketchfab recusou o download (${metaRes.status}). Verifique SKETCHFAB_API_TOKEN.`);
  }
  const meta = await metaRes.json();
  const dlInfo = meta?.glb || meta?.gltf;
  if (!dlInfo?.url) {
    throw new Error('Este modelo do Sketchfab não disponibilizou pacote GLB/GLTF gratuito.');
  }

  const folderName = `sf_${cleanUid}`;
  const targetDir = path.join(MODELS_DIR(), folderName);
  fs.mkdirSync(targetDir, { recursive: true });

  const fileRes = await fetch(dlInfo.url, { signal: AbortSignal.timeout(60_000) });
  if (!fileRes.ok) throw new Error(`Falha ao baixar arquivo do Sketchfab (${fileRes.status})`);
  const buf = Buffer.from(await fileRes.arrayBuffer());

  let entryRel = 'scene.gltf';
  if (buf.length >= 16 && buf.readUInt32LE(0) === 0x46546c67) {
    entryRel = `${cleanUid}.glb`;
    fs.writeFileSync(path.join(targetDir, entryRel), buf);
  } else {
    const zipPath = path.join(targetDir, `${cleanUid}.zip`);
    fs.writeFileSync(zipPath, buf);
    const py = getPythonCommand();
    const extractScript = `
import json, os, sys, zipfile
zpath, outdir = sys.argv[1], sys.argv[2]
entry = None
with zipfile.ZipFile(zpath, 'r') as zf:
    zf.extractall(outdir)
for root, _, files in os.walk(outdir):
    for f in files:
        if f.lower().endswith(('.glb', '.gltf')):
            entry = os.path.relpath(os.path.join(root, f), outdir).replace('\\\\', '/')
            break
    if entry:
        break
print(json.dumps({"entry": entry}))
`.trim();
    const { stdout } = await runExec(py, ['-c', extractScript, zipPath, targetDir], { timeout: 30_000, windowsHide: true });
    try { fs.unlinkSync(zipPath); } catch {}
    const parsed = JSON.parse(stdout || '{}');
    if (!parsed?.entry) throw new Error('Pacote Sketchfab baixado sem arquivo .glb/.gltf interno.');
    entryRel = String(parsed.entry);
  }

  return upsertManifestItem({
    id: folderName,
    name: `Sketchfab ${cleanUid}`,
    source: 'sketchfab',
    license: 'Sketchfab Free',
    glbUrl: `/threejs-engine/models/${folderName}/${entryRel}`,
    tags: [cleanUid, 'sketchfab'],
    createdAt: new Date().toISOString(),
  });
}

/** Busca imagens reais em domínio público / CC na API aberta da Wikimedia Commons ($0 sem chave). */
export async function searchWikimediaImages(query: string, limit = 12): Promise<WikimediaImageCandidate[]> {
  const q = String(query || '').trim();
  if (!q) return [];
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q)}&gsrlimit=${Math.min(20, Math.max(1, limit))}&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=640&format=json&origin=*`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DarkTube-Studio/1.0' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];
  const json = await res.json();
  const pages = Object.values<any>(json?.query?.pages || {});
  const out: WikimediaImageCandidate[] = [];
  for (const p of pages) {
    const info = Array.isArray(p?.imageinfo) ? p.imageinfo[0] : null;
    if (!info?.url || !/^image\/(jpeg|png|webp)/i.test(String(info.mime || ''))) continue;
    const ext = info.extmetadata || {};
    out.push({
      id: String(p.pageid || p.title),
      title: String(p.title || '').replace(/^File:/i, '').slice(0, 120),
      url: String(info.url),
      thumbUrl: String(info.thumburl || info.url),
      license: String(ext?.LicenseShortName?.value || 'Public domain / CC').replace(/<[^>]+>/g, ''),
      artist: String(ext?.Artist?.value || 'Wikimedia Commons').replace(/<[^>]+>/g, '').slice(0, 80),
      width: Number(info.width || 0),
      height: Number(info.height || 0),
    });
  }
  return out;
}

const BUILTIN_SFX_SPECS: Record<string, { name: string; durationSec: number; tags: string[]; lavfi: string }> = {
  whoosh: {
    name: 'Whoosh Transição Rápida',
    durationSec: 0.45,
    tags: ['transicao', 'corte', 'vento'],
    lavfi: 'anoisesrc=d=0.45:c=pink:a=0.45,afade=t=in:st=0:d=0.14,afade=t=out:st=0.2:d=0.25,highpass=f=240,lowpass=f=2400',
  },
  pop: {
    name: 'Pop UI / Balão',
    durationSec: 0.2,
    tags: ['pop', 'ui', 'bolha'],
    lavfi: 'sine=f=680:d=0.18,asetrate=44100*1.35,afade=t=out:st=0.04:d=0.12',
  },
  camera_click: {
    name: 'Click / Flash de Câmera',
    durationSec: 0.25,
    tags: ['camera', 'flash', 'foto'],
    lavfi: 'anoisesrc=d=0.18:c=white:a=0.5,highpass=f=1800,afade=t=out:st=0.02:d=0.14',
  },
  bass_drop: {
    name: 'Bass Drop Impacto Grave',
    durationSec: 1.1,
    tags: ['impacto', 'grave', 'virada'],
    lavfi: 'sine=f=110:d=1.1,afade=t=out:st=0.2:d=0.9,lowpass=f=160',
  },
  paper_rustle: {
    name: 'Papel / Recorte VOX',
    durationSec: 0.55,
    tags: ['papel', 'vox', 'documento'],
    lavfi: 'anoisesrc=d=0.55:c=brown:a=0.4,highpass=f=1200,lowpass=f=4500,afade=t=in:st=0:d=0.08,afade=t=out:st=0.3:d=0.25',
  },
  vault_open: {
    name: 'Cofre / Mecanismo Metálico',
    durationSec: 0.9,
    tags: ['cofre', 'metal', 'porta'],
    lavfi: 'sine=f=180:d=0.85,afade=t=in:st=0:d=0.06,afade=t=out:st=0.4:d=0.45,tremolo=f=12:d=0.5',
  },
  alarm_beep: {
    name: 'Alerta Curto / Alarme',
    durationSec: 0.65,
    tags: ['alerta', 'erro', 'suspense'],
    lavfi: 'sine=f=880:d=0.6,tremolo=f=8:d=0.85,afade=t=out:st=0.45:d=0.15',
  },
  typewriter: {
    name: 'Tecla Dossiê / Máquina de Escrever',
    durationSec: 0.22,
    tags: ['texto', 'dossie', 'netflix'],
    lavfi: 'anoisesrc=d=0.12:c=white:a=0.55,bandpass=f=2200:w=800,afade=t=out:st=0.01:d=0.1',
  },
  riser_tension: {
    name: 'Riser de Tensão',
    durationSec: 1.4,
    tags: ['tensao', 'hook', 'documentario'],
    lavfi: 'anoisesrc=d=1.4:c=pink:a=0.35,afade=t=in:st=0.05:d=1.25,afade=t=out:st=1.3:d=0.1',
  },
  impact_boom: {
    name: 'Impacto Cinematográfico',
    durationSec: 1.0,
    tags: ['boom', 'cinema', 'cena'],
    lavfi: 'sine=f=68:d=1.0,afade=t=out:st=0.08:d=0.9,volume=1.6',
  },
};

/** Garante um arquivo .mp3 CC0 procedural local em public/threejs-engine/sfx/<id>.mp3 ($0). */
export async function ensureBuiltinSfx(sfxId: string): Promise<{ id: string; url: string; path: string }> {
  const spec = BUILTIN_SFX_SPECS[sfxId];
  if (!spec) throw new Error(`SFX builtin desconhecido: ${sfxId}`);
  const sfxDir = path.resolve(process.cwd(), 'public/threejs-engine/sfx');
  fs.mkdirSync(sfxDir, { recursive: true });
  const filePath = path.join(sfxDir, `${sfxId}.mp3`);
  if (!fs.existsSync(filePath)) {
    await runExec(
      ffmpegBin(),
      ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', spec.lavfi, '-c:a', 'libmp3lame', '-b:a', '128k', filePath],
      { timeout: 15_000, windowsHide: true }
    );
  }
  return { id: sfxId, url: `/threejs-engine/sfx/${sfxId}.mp3`, path: filePath };
}

/** Busca SFX gratuitos CC0 no Freesound.org (se FREESOUND_API_KEY presente) + banco CC0 procedural local instantâneo. */
export async function searchFreesoundSfx(
  query: string,
  limit = 12,
  apiKey = process.env.FREESOUND_API_KEY || ''
): Promise<{ items: FreesoundSfxCandidate[]; freesoundActive: boolean }> {
  const q = String(query || '').trim().toLowerCase();
  const builtin: FreesoundSfxCandidate[] = Object.entries(BUILTIN_SFX_SPECS)
    .filter(([id, s]) => !q || `${id} ${s.name} ${s.tags.join(' ')}`.toLowerCase().includes(q))
    .map(([id, s]) => ({
      id,
      name: s.name,
      source: 'builtin_cc0' as const,
      license: 'CC0 Procedural',
      durationSec: s.durationSec,
      previewUrl: `/api/studio-3d/assets?sfxPlay=${encodeURIComponent(id)}`,
      tags: s.tags,
    }));

  if (!apiKey || !q) {
    return { items: builtin.slice(0, limit), freesoundActive: false };
  }

  try {
    const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(q)}&filter=${encodeURIComponent('license:"Creative Commons 0"')}&fields=id,name,duration,previews,tags,license&page_size=${Math.min(15, limit)}&token=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return { items: builtin.slice(0, limit), freesoundActive: false };
    const json = await res.json();
    const remote: FreesoundSfxCandidate[] = (Array.isArray(json?.results) ? json.results : [])
      .filter((r: any) => r?.previews?.['preview-hq-mp3'] || r?.previews?.['preview-lq-mp3'])
      .map((r: any) => ({
        id: `fs_${r.id}`,
        name: String(r.name || 'Freesound SFX'),
        source: 'freesound_cc0' as const,
        license: 'CC0 (Freesound)',
        durationSec: +Number(r.duration || 1).toFixed(2),
        previewUrl: String(r.previews['preview-hq-mp3'] || r.previews['preview-lq-mp3']),
        tags: Array.isArray(r.tags) ? r.tags.slice(0, 6).map(String) : [],
      }));
    return { items: [...remote, ...builtin].slice(0, limit), freesoundActive: true };
  } catch {
    return { items: builtin.slice(0, limit), freesoundActive: false };
  }
}

/** Baixa um modelo 3D CC0 do Poly Haven (1k glTF + bin + texturas) para cache local permanente ($0). */
export async function downloadPolyHavenModel(assetId: string): Promise<Local3dModelItem> {
  const id = safeSlug(assetId);
  const existing = listLocal3dModels().find((m) => m.id === `ph_${id}`);
  if (existing) return existing;

  const res = await fetch(`https://api.polyhaven.com/files/${encodeURIComponent(assetId)}`, {
    headers: { 'User-Agent': 'DarkTube-3D-Studio/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Poly Haven não encontrou arquivos para "${assetId}" (${res.status})`);
  const filesJson = await res.json();
  const gltfGroup = filesJson?.gltf?.['1k']?.gltf || filesJson?.gltf?.['2k']?.gltf;
  if (!gltfGroup?.url) {
    throw new Error(`Modelo "${assetId}" no Poly Haven não possui pacote glTF 1k/2k.`);
  }

  const folderName = `ph_${id}`;
  const targetDir = path.join(MODELS_DIR(), folderName);
  fs.mkdirSync(targetDir, { recursive: true });

  const mainFileName = path.basename(new URL(gltfGroup.url).pathname) || `${id}.gltf`;
  const mainResp = await fetch(gltfGroup.url, { signal: AbortSignal.timeout(30_000) });
  if (!mainResp.ok) throw new Error(`Falha ao baixar ${gltfGroup.url} (${mainResp.status})`);
  fs.writeFileSync(path.join(targetDir, mainFileName), Buffer.from(await mainResp.arrayBuffer()));

  // Baixa arquivos auxiliares (.bin e texturas referenciadas pelo .gltf)
  const includeMap = gltfGroup.include || {};
  for (const [relPath, meta] of Object.entries<any>(includeMap)) {
    if (!meta?.url) continue;
    const cleanRel = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (cleanRel.includes('..')) continue;
    const destFile = path.join(targetDir, cleanRel);
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    const subResp = await fetch(meta.url, { signal: AbortSignal.timeout(30_000) });
    if (subResp.ok) {
      fs.writeFileSync(destFile, Buffer.from(await subResp.arrayBuffer()));
    }
  }

  return upsertManifestItem({
    id: folderName,
    name: assetId.replace(/_/g, ' '),
    source: 'polyhaven',
    license: 'CC0',
    glbUrl: `/threejs-engine/models/${folderName}/${mainFileName}`,
    tags: [assetId, 'polyhaven', 'cc0'],
    thumbnailUrl: `https://cdn.polyhaven.com/asset_img/thumbs/${encodeURIComponent(assetId)}.png?width=320`,
    createdAt: new Date().toISOString(),
  });
}

/** Baixa um arquivo .glb direto (Poly Pizza CC0, Kenney, Quaternius ou URL direta) e valida assinatura glTF. */
export async function downloadExternalGlbToLibrary(opts: {
  url: string;
  name?: string;
  id?: string;
  source?: 'polypizza' | 'url';
  license?: string;
  tags?: string[];
  thumbnailUrl?: string;
}): Promise<Local3dModelItem> {
  const slug = safeSlug(opts.id || opts.name || path.basename(new URL(opts.url).pathname, '.glb'));
  const fileName = `${slug}.glb`;
  const destPath = path.join(MODELS_DIR(), fileName);
  ensureModelsDir();

  const res = await fetch(opts.url, {
    headers: { 'User-Agent': 'DarkTube-3D-Studio/1.0' },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Falha ao baixar modelo .glb (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 16 || buf.readUInt32LE(0) !== 0x46546c67) {
    throw new Error('O arquivo baixado não é um binário .glb válido (assinatura glTF ausente).');
  }
  fs.writeFileSync(destPath, buf);

  return upsertManifestItem({
    id: slug,
    name: opts.name || slug.replace(/_/g, ' '),
    source: opts.source || 'url',
    license: opts.license || 'CC0',
    glbUrl: `/threejs-engine/models/${fileName}`,
    tags: opts.tags?.length ? opts.tags : [slug],
    thumbnailUrl: opts.thumbnailUrl,
    createdAt: new Date().toISOString(),
  });
}
