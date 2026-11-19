import fs from 'fs';
import path from 'path';

export interface Local3dModelItem {
  id: string;
  name: string;
  source: 'local' | 'polyhaven' | 'polypizza' | 'url';
  license: string;
  glbUrl: string; // e.g. /threejs-engine/models/...
  tags: string[];
  thumbnailUrl?: string;
  createdAt: string;
}

export interface Remote3dAssetCandidate {
  id: string;
  name: string;
  source: 'local' | 'polyhaven' | 'polypizza';
  license: string;
  tags: string[];
  thumbnailUrl?: string;
  downloadUrl?: string;
  glbUrl?: string; // already cached locally
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

  return { local, remote: remote.slice(0, limit), sourcesChecked };
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
