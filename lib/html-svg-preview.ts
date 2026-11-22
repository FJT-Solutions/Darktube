import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { findBrowserExecutable } from './browser-executable';
import { ffmpegBin } from './flow-assemble';
import { callFlowVisionLLM, type FlowProvider, type FlowVisionImage } from './flow-llm';
import { compileHtmlSvgDocument, type HtmlSvgProjectSpec } from './html-svg-templates';
import { enrichEditorialMedia } from './html-svg-render';

const runExec = promisify(execFile);

export type StagingFix = 'regenerate_background' | 'regenerate_sprite' | 'adjust_layer' | 'none';

export interface StagingIssue {
  severity: 'high' | 'medium' | 'low';
  problem: string;
  fix: StagingFix;
  detail: string;
}

export interface StagingSceneReview {
  index: number;
  title: string;
  startSec: number;
  endSec: number;
  ok: boolean;
  issues: StagingIssue[];
}

export interface StagingPreviewResult {
  contactSheetPath?: string;
  durationSec: number;
  scenes: StagingSceneReview[];
  reviewed: boolean;
  reviewEngine?: string;
  passed: boolean;
  summary: string;
}

const SYSTEM = `You are a strict storyboard staging supervisor for a 2.5D video: empty painted backgrounds with 2D character/prop cutouts composited on top.
For EACH scene you get 2 frames (early and late in the shot), the narration line and the intended staging. Judge only what a viewer would notice as wrong placement or wrong assets:
- Duplicated furniture/objects: a cutout that contains a bed/table/door overlapping the same object already painted in the background (two beds, two doors).
- Floating or sinking: feet not on the floor, character hovering over or standing on top of furniture, lying figure not resting on the mattress, wrong body orientation for the bed.
- Depth/occlusion errors: body parts hidden behind a door frame or furniture when they should be in front, or vice-versa; character too big/small for the set at that depth.
- Facing/gaze: character or creature not facing the target of the action (e.g. the creature should look at the sleeper, not at the wall).
- Props: object that should be held floating away from the hands; hands anatomy broken or reaching nothing.
- A cutout pasted as a rectangle with its own background (visible box edges), or a pose that does not match the line (e.g. eyes open when sleeping).
- Physical incoherence: a sleeping character lying on top of the blanket instead of under it; an apartment number visible on the inside face of a door; an installed device (camera, baby monitor) in a different spot than in earlier scenes; a CCTV/camera point-of-view frame that shows the camera itself or an angle that does not match where it was installed. Report with "regenerate_background" (or "regenerate_sprite") describing the fix.
- The frame does not show what the narration says. Every action spoken in the line (knocked on the door, looked through the peephole, installed the camera, carried the box, laughed) must be visibly performed by the character in a frame of that scene; if an action is only narrated and not shown, report it with "regenerate_sprite" (or "regenerate_background" for a full-frame take) naming the missing action.
For every problem pick the cheapest correct fix: "adjust_layer" (move/scale/flip/z/occluder of an existing layer), "regenerate_sprite" (the pose/expression/prop asset itself is wrong: generate a new full-body cutout on chroma green with the right pose), or "regenerate_background" (the set is wrong or already contains an object that the cutout duplicates: generate the whole empty set again with the furniture placed right).
NOT problems (do not report): a character partly hidden behind a counter/bed/blanket on purpose (the staging says so); someone standing on a chair, stool or bed when the staging says so; two sprites of the same character listed with show/hide times (it is a pose swap, only one is visible at a time); deliberate POV framing such as a peephole circle or a CCTV frame; a full-frame take where the character is painted inside the set (a full-frame layer swapping over a background of the same room is an intended pose change, not a duplicate); a layer with "aparece em Ns" or a fade-in that is not visible yet in the early frame.
Ignore captions, color grade, scanlines, film grain and style. Do not invent problems: ok=true when the scene reads correctly. Point at the exact layer (file name from the layer list) in "detail".
Return ONLY JSON: {"summary":"<one sentence in Brazilian Portuguese>","scenes":[{"index":1,"ok":true,"issues":[{"severity":"high|medium|low","problem":"<Brazilian Portuguese>","fix":"adjust_layer|regenerate_sprite|regenerate_background","detail":"<Brazilian Portuguese concrete instruction: which layer/asset and what to change>"}]}]}`;

/**
 * Staging preview: renders 2 stills per scene at the real (voice-retimed) cut times, builds a numbered
 * contact sheet and asks the user's own vision LLM to flag placement/asset errors BEFORE the full render,
 * so the agent can regenerate a background/sprite or move a layer instead of shipping a broken video.
 */
export async function previewHtmlSvgStaging(opts: {
  spec: HtmlSvgProjectSpec;
  contactSheetPath: string;
  credentials: Array<{ provider: FlowProvider; apiKey: string }>;
}): Promise<StagingPreviewResult> {
  const assetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_preview_assets_'));
  const enriched = await enrichEditorialMedia(opts.spec, assetDir, false);
  const compiled = compileHtmlSvgDocument(enriched, true);
  const { chromium } = await import('playwright-core');
  const executablePath = findBrowserExecutable({ preferFullChrome: false, defaultExecutablePath: chromium.executablePath() });
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--mute-audio'],
  });
  const tmpHtml = path.join(assetDir, 'preview.html');
  fs.writeFileSync(tmpHtml, compiled.html, 'utf8');
  const specScenes = enriched.scenes || [];
  const scenes: StagingSceneReview[] = [];
  const shots: Array<{ scene: number; file: string; t: number }> = [];

  try {
    const page = await browser.newPage({ viewport: { width: compiled.width, height: compiled.height }, deviceScaleFactor: 1 });
    await page.goto(`file://${tmpHtml.replace(/\\/g, '/')}`, { waitUntil: 'load', timeout: 30000 });
    await page
      .evaluate(async () => {
        await Promise.all(
          Array.from(document.images || []).map((img) =>
            img.complete ? 0 : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })
          )
        );
      })
      .catch(() => {});
    let cuts: Array<{ start: number; end: number }> = await page.evaluate(() => (window as any).__dtScenes || []).catch(() => []);
    if (!cuts.length) {
      let cur = 0;
      cuts = specScenes.map((s) => {
        const d = Math.max(0.5, Number(s.durationSec) || 4);
        const c = { start: cur, end: cur + d };
        cur += d;
        return c;
      });
    }
    for (let i = 0; i < cuts.length; i++) {
      const { start, end } = cuts[i];
      scenes.push({ index: i + 1, title: String(specScenes[i]?.title || `Cena ${i + 1}`), startSec: +start.toFixed(2), endSec: +end.toFixed(2), ok: true, issues: [] });
      for (const f of [0.3, 0.85]) {
        const t = Math.min(compiled.durationSec - 0.05, start + (end - start) * f);
        await page.evaluate(({ t, fps, dur }) => (window as any).__dtSeek?.(t, Math.round(t * fps), fps, dur), { t, fps: compiled.fps, dur: compiled.durationSec });
        const file = path.join(assetDir, `pv_${String(shots.length).padStart(2, '0')}.jpg`);
        fs.writeFileSync(file, await page.screenshot({ type: 'jpeg', quality: 80 }));
        shots.push({ scene: i, file, t });
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  let contactSheetPath: string | undefined;
  if (shots.length) {
    const cols = Math.min(8, shots.length);
    const rows = Math.ceil(shots.length / cols);
    try {
      await runExec(
        ffmpegBin(),
        ['-y', '-loglevel', 'error', '-i', path.join(assetDir, 'pv_%02d.jpg'), '-vf', `scale=270:-1,tile=${cols}x${rows}:padding=4:color=0x0f172a`, '-frames:v', '1', opts.contactSheetPath],
        { timeout: 30_000, windowsHide: true }
      );
      if (fs.existsSync(opts.contactSheetPath)) contactSheetPath = opts.contactSheetPath;
    } catch {}
  }

  let reviewed = false;
  let reviewEngine: string | undefined;
  const summaries: string[] = [];
  const creds = opts.credentials.filter((c) => c.apiKey);
  if (creds.length && shots.length) {
    // 8 scenes (16 frames) per call keeps every request under the 20-image limit of callFlowVisionLLM
    for (let b = 0; b < scenes.length; b += 8) {
      const batch = scenes.slice(b, b + 8);
      const images: FlowVisionImage[] = shots
        .filter((s) => s.scene >= b && s.scene < b + 8)
        .map((s) => ({ dataBase64: fs.readFileSync(s.file).toString('base64'), mimeType: 'image/jpeg', label: `Cena ${s.scene + 1} · t=${s.t.toFixed(1)}s` }));
      const user = batch
        .map((sc) => {
          // original spec (not the locally cached copy) so the reviewer sees the real asset names
          const src: any = (opts.spec.scenes || [])[sc.index - 1] || {};
          const layers = (src.layers || [])
            .filter((l: any) => l.type === 'sprite' || l.type === 'occluder')
            .map((l: any) =>
              l.type === 'sprite'
                ? `sprite(${String(l.url || '').split('/').pop()}, x=${l.x}, y=${l.y}, h=${l.height}, z=${l.z}${l.flipX ? ', flipX' : ''}${l.showAtSec != null ? `, aparece em ${l.showAtSec}s` : ''}${l.hideAtSec != null ? `, some em ${l.hideAtSec}s` : ''})`
                : `occluder(z=${l.z}, cobre o que tiver z maior)`
            )
            .join('; ');
          return `Cena ${sc.index} "${sc.title}"\nFala: ${src.spokenLine || '-'}\nEncenação pretendida: ${src.staging || sc.title}\nCamadas: ${layers || '-'}`;
        })
        .join('\n\n');
      for (const c of creds) {
        try {
          const raw = await callFlowVisionLLM(c.provider, c.apiKey, SYSTEM, user, images);
          const m = String(raw).match(/\{[\s\S]*\}/);
          if (!m) continue;
          const parsed = JSON.parse(m[0]);
          for (const r of Array.isArray(parsed?.scenes) ? parsed.scenes : []) {
            const sc = scenes.find((s) => s.index === Number(r?.index));
            if (!sc) continue;
            sc.issues = (Array.isArray(r?.issues) ? r.issues : []).slice(0, 5).map((it: any) => ({
              severity: it?.severity === 'high' || it?.severity === 'medium' ? it.severity : 'low',
              problem: String(it?.problem || ''),
              fix: ['regenerate_background', 'regenerate_sprite', 'adjust_layer'].includes(it?.fix) ? it.fix : 'adjust_layer',
              detail: String(it?.detail || ''),
            }));
            sc.ok = r?.ok !== false && !sc.issues.some((i) => i.severity !== 'low');
          }
          if (parsed?.summary) summaries.push(String(parsed.summary));
          reviewed = true;
          reviewEngine = c.provider;
          break;
        } catch {}
      }
    }
  }
  fs.rmSync(assetDir, { recursive: true, force: true });

  const bad = scenes.filter((s) => !s.ok);
  return {
    contactSheetPath,
    durationSec: compiled.durationSec,
    scenes,
    reviewed,
    reviewEngine,
    passed: reviewed && bad.length === 0,
    summary: reviewed
      ? bad.length
        ? `${bad.length} cena(s) com problema de encenação: ${bad.map((s) => s.index).join(', ')}. Corrija (ajustar camada, regerar sprite ou cenário) e rode a prévia de novo antes do render final. ${summaries.join(' ')}`
        : `Encenação aprovada nas ${scenes.length} cenas. ${summaries.join(' ')}`
      : 'Prévia gerada, mas sem revisão automática (nenhuma credencial LLM com visão disponível): o agente deve olhar a folha de contato e conferir cada cena antes do render final.',
  };
}
