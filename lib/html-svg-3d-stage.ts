import type { HtmlSvgV2CompileContext, HtmlSvgV2Scene } from './html-svg-presets-v2';
import type { WhatIfWordTiming } from './html-svg-whatif-studio';

export interface Stage3DSpriteLayer {
  type: 'sprite';
  url: string;
  x: number;
  y: number;
  z: number;
  height: number;
  xEnd?: number;
  yEnd?: number;
  zEnd?: number;
  flipX?: boolean;
  rot?: number;
  bobAmp?: number;
  bobFreq?: number;
  alpha?: number;
  alphaStartSec?: number;
  alphaFadeSec?: number;
  shadow?: boolean;
  /** Optional normalized source crop [sx, sy, sw, sh] in 0..1 to pick one cell of a 2x2 sheet */
  crop?: [number, number, number, number];
  /**
   * 'bg' = x/y are 0..1 coordinates of the sprite anchor inside the background image and height is a
   * fraction of the background height, so the sprite stays glued to the painted floor/bed/desk under
   * camera zoom, pan and shake. 'stage' (default) keeps the legacy 1080x1920 perspective projection.
   */
  space?: 'stage' | 'bg';
  heightEnd?: number;
  /** Vertical anchor inside the sprite: 1 = feet/bottom (default), 0.5 = center (lying figures), 0 = top */
  anchorY?: number;
  /** Visible only inside [showAtSec, hideAtSec) of the scene, with a short crossfade (expression swaps) */
  showAtSec?: number;
  hideAtSec?: number;
  /**
   * Flipbook: source crops [sx, sy, sw, sh] cycled at frameFps (e.g. a walk sheet with the two leg
   * poses side by side). Overrides crop. Combine with x/xEnd or heightEnd to walk across or toward camera.
   */
  frames?: Array<[number, number, number, number]>;
  frameFps?: number;
}

export interface Stage3DOccluderLayer {
  type: 'occluder';
  z: number;
  polygon: Array<[number, number]>;
  bgUrl?: string;
  space?: 'stage' | 'bg';
}

export interface Stage3DRingLayer {
  type: 'ring';
  x: number;
  y: number;
  z: number;
  color?: string;
  period?: number;
  maxRadius?: number;
  startSec?: number;
  endSec?: number;
  space?: 'stage' | 'bg';
}

export interface Stage3DBadgeLayer {
  type: 'badge';
  x: number;
  y: number;
  z: number;
  text: string;
  bgColor?: string;
  textColor?: string;
  bobAmp?: number;
}

export type Stage3DLayer =
  | Stage3DSpriteLayer
  | Stage3DOccluderLayer
  | Stage3DRingLayer
  | Stage3DBadgeLayer;

export interface Stage3DCameraConfig {
  zoomStart?: number;
  zoomEnd?: number;
  panX?: number;
  panY?: number;
  panXEnd?: number;
  panYEnd?: number;
  shakeAmp?: number;
  shakePeriod?: number;
  tintColor?: string;
  scanlines?: boolean;
  recLabel?: string;
  peepholeRadius?: number;
  /** Scene-relative seconds of each knock/impact: short camera jolt + dark flash (replaces the old ring) */
  knocks?: number[];
  /** Jolt strength in stage pixels (default 22) */
  knockAmp?: number;
  /** Edit events tied to the narration: the picture reacts to what is being said */
  events?: Stage3DEditEvent[];
}

/**
 * blackout: picture fades to dark (lights went out) and stays dark for durSec (default: until scene end);
 * lights_on: picture comes back from dark; flicker: unstable light; quake: decaying earthquake shake;
 * flash: white flash (lightning, gunshot, camera flash); jolt: single impact like a knock.
 */
export interface Stage3DEditEvent {
  type: 'blackout' | 'lights_on' | 'flicker' | 'quake' | 'flash' | 'jolt';
  /** scene-relative seconds, or anchor on a word of the scene's spokenLine (wins over atSec) */
  atSec?: number;
  atWord?: string;
  durSec?: number;
  /** fade length for blackout/lights_on (default 0.35s) */
  fadeSec?: number;
  /** blackout darkness 0..1 (default 0.94), shake amplitude in px for quake/jolt (default 26) */
  amount?: number;
}

/** Sound effect placed relative to the scene start (the renderer resolves it to the retimed cut) */
export interface Stage3DSfx {
  url: string;
  atSec?: number;
  volume?: number;
}

export interface Stage3DSceneInput extends Partial<HtmlSvgV2Scene> {
  bgUrl?: string;
  camera?: Stage3DCameraConfig;
  layers?: Stage3DLayer[];
  /** Default coordinate space for every layer of the scene (see Stage3DSpriteLayer.space) */
  space?: 'stage' | 'bg';
  sfx?: Stage3DSfx[];
  /** Who speaks this scene's spokenLine; shown as "NAME:" before the caption (empty = narrator) */
  speaker?: string;
  /** Character line: the narrator pauses after this scene's spokenLine while it plays (see lib/dialogue-pauses.ts) */
  dialogue?: { url: string; volume?: number; gapBeforeSec?: number; gapAfterSec?: number };
}

export interface Stage3DCompileContext extends Omit<HtmlSvgV2CompileContext, 'scenes'> {
  scenes: Stage3DSceneInput[];
  words?: WhatIfWordTiming[];
}

const safeJson = (val: unknown): string => JSON.stringify(val).replace(/</g, '\\u003c');

export function buildDefault3dStageScenes(): Stage3DSceneInput[] {
  return [
    {
      title: 'PALCO 3D XYZ COM OCLUSÃO',
      subtitle: 'Profundidade real (x, y, z) e recorte de primeiro plano',
      spokenLine: 'Camadas ordenadas por profundidade garantem que personagens fiquem atrás de mesas, camas e portas.',
      badge: '01 · PALCO 3D',
      durationSec: 4.5,
      camera: { zoomStart: 1.04, zoomEnd: 1.12, panX: -12, panXEnd: 12 },
      layers: [
        { type: 'badge', x: 540, y: 420, z: 240, text: 'CAMADA Z = 240 (FRENTE)', bgColor: '#38BDF8', textColor: '#090D16', bobAmp: 6 },
        { type: 'badge', x: 540, y: 540, z: 420, text: 'CAMADA Z = 420 (FUNDO)', bgColor: '#1E293B', textColor: '#FACC15', bobAmp: 4 },
      ],
    },
  ];
}

/**
 * Compila um palco 2.5D/3D determinístico em coordenadas (x, y, z) com ordenação por profundidade (Painter's Algorithm),
 * escala perspectiva automática, polígonos de oclusão sincronizados à câmera e legendas palavra a palavra.
 */
export function build3dStageHtml(ctx: Stage3DCompileContext): string {
  const { title, width, height, viewW, viewH, totalDur, palette, scenes, words } = ctx;
  const [bgHex, accentHex, secHex] = palette;

  const uniqueUrls = new Set<string>();
  for (const sc of scenes) {
    const bg = sc.bgUrl || sc.imageUrl;
    if (bg) uniqueUrls.add(bg);
    for (const layer of sc.layers || []) {
      if (layer.type === 'sprite' && layer.url) uniqueUrls.add(layer.url);
      if (layer.type === 'occluder' && layer.bgUrl) uniqueUrls.add(layer.bgUrl);
    }
  }
  const urlList = Array.from(uniqueUrls);
  const urlToId = new Map<string, string>();
  const preloadTags = urlList
    .map((u, idx) => {
      const id = `stage_asset_${idx}`;
      urlToId.set(u, id);
      const safeSrc = u.replace(/"/g, '&quot;');
      return `<img id="${id}" src="${safeSrc}" />`;
    })
    .join('\n  ');

  const serializedScenes = scenes.map((sc) => ({
    index: Number((sc as any).index || 0),
    start: Number((sc as any).start || 0),
    end: Number((sc as any).end || 4),
    durationSec: Number(sc.durationSec || 4),
    title: String(sc.title || ''),
    subtitle: String(sc.subtitle || ''),
    spokenLine: String(sc.spokenLine || ''),
    speaker: String(sc.speaker || ''),
    bgAssetId: (sc.bgUrl || sc.imageUrl) ? urlToId.get(String(sc.bgUrl || sc.imageUrl)) || '' : '',
    camera: sc.camera || {},
    layers: (sc.layers || []).map((raw) => {
      const l: any = sc.space && !(raw as any).space && raw.type !== 'badge' ? { ...raw, space: sc.space } : raw;
      if (l.type === 'sprite') return { ...l, assetId: urlToId.get(l.url) || '' };
      if (l.type === 'occluder' && l.bgUrl) return { ...l, assetId: urlToId.get(l.bgUrl) || '' };
      return l;
    }),
  }));

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>${String(title || 'DarkTube 3D Stage').replace(/</g, '&lt;')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: ${bgHex}; }
  canvas { display: block; width: 100%; height: 100%; }
  .preload-assets { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; overflow: hidden; }
</style>
</head>
<body>
<div class="preload-assets">
  ${preloadTags}
</div>
<canvas id="c" width="${width}" height="${height}"></canvas>
<script>
(function() {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const W = ${viewW};
  const H = ${viewH};
  const TOTAL = ${Math.max(2, totalDur).toFixed(3)};
  const BG_HEX = ${safeJson(bgHex)};
  const ACCENT = ${safeJson(accentHex)};
  const SEC = ${safeJson(secHex)};
  const SCENES = ${safeJson(serializedScenes)};
  const dtWords = window['__DT_' + 'WORDS'];
  const WORDS = (Array.isArray(dtWords) && dtWords.length ? dtWords : ${safeJson(words || [])});

  // Retime scenes to the real voice: each scene starts on the first word of its spokenLine,
  // so cuts land on the narration instead of on hand-written durationSec guesses.
  (function retimeToVoice() {
    if (!WORDS.length || SCENES.length < 2 || SCENES.some(function(s) { return !String(s.spokenLine || '').trim(); })) return;
    const tok = function(s) { return String(s).split(/\\s+/).filter(function(w) { return /[\\p{L}\\p{N}]/u.test(w); }).length; };
    const counts = SCENES.map(function(s) { return Math.max(1, tok(s.spokenLine)); });
    const totalTok = counts.reduce(function(a, b) { return a + b; }, 0);
    let cum = 0;
    for (let i = 0; i < SCENES.length; i++) {
      const idx = Math.min(WORDS.length - 1, Math.round(cum * WORDS.length / totalTok));
      cum += counts[i];
      const st = i === 0 ? 0 : Math.max(0, Number(WORDS[idx].inicio) - 0.08);
      SCENES[i].start = i === 0 ? 0 : Math.max(SCENES[i - 1].start + 0.4, st);
    }
    for (let i = 0; i < SCENES.length; i++) {
      SCENES[i].end = i === SCENES.length - 1 ? TOTAL : SCENES[i + 1].start;
      SCENES[i].durationSec = Math.max(0.5, SCENES[i].end - SCENES[i].start);
    }
  })();

  // Anchor edit events on the spoken word ("apagou a luz" -> blackout when "apagou" is heard)
  (function anchorEvents() {
    const norm = function(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^\\p{L}\\p{N}]/gu, ''); };
    for (let i = 0; i < SCENES.length; i++) {
      const evs = (SCENES[i].camera && SCENES[i].camera.events) || [];
      for (let k = 0; k < evs.length; k++) {
        const ev = evs[k];
        if (!ev.atWord || !WORDS.length) continue;
        const target = norm(String(ev.atWord).split(/\\s+/)[0]);
        const hit = WORDS.find(function(w) {
          return Number(w.inicio) >= SCENES[i].start - 0.05 && Number(w.inicio) < SCENES[i].end && norm(w.palavra) === target;
        }) || WORDS.find(function(w) {
          return Number(w.inicio) >= SCENES[i].start - 0.05 && Number(w.inicio) < SCENES[i].end && norm(w.palavra).indexOf(target) === 0;
        });
        if (hit) ev.atSec = Math.max(0, Number(hit.inicio) - SCENES[i].start);
      }
    }
  })();

  // Darkness, flash and shake from the scene's edit events at scene time lt
  function editFx(cam, lt, sceneDur) {
    const fx = { dark: 0, flash: 0, dx: 0, dy: 0 };
    const evs = Array.isArray(cam.events) ? cam.events.slice().sort(function(a, b) { return (a.atSec || 0) - (b.atSec || 0); }) : [];
    for (let k = 0; k < evs.length; k++) {
      const ev = evs[k];
      const at = Number(ev.atSec || 0);
      const dt = lt - at;
      if (dt < 0) continue;
      const fade = Math.max(0.01, Number(ev.fadeSec || 0.35));
      const dur = ev.durSec !== undefined ? Number(ev.durSec) : sceneDur;
      if (ev.type === 'blackout') {
        const lvl = ev.amount !== undefined ? clamp(Number(ev.amount), 0, 1) : 0.94;
        fx.dark = dt < dur ? lvl * clamp(dt / fade, 0, 1) : (ev.durSec !== undefined ? lvl * clamp(1 - (dt - dur) / fade, 0, 1) : lvl);
      } else if (ev.type === 'lights_on') {
        fx.dark = fx.dark * clamp(1 - dt / fade, 0, 1);
      } else if (ev.type === 'flicker' && dt < (ev.durSec || 1.2)) {
        const n = hash(Math.floor((at + dt) * 14) + k * 31);
        fx.dark = Math.max(fx.dark, n > 0.55 ? 0.85 * n : 0);
      } else if (ev.type === 'quake' && dt < (ev.durSec || 1.6)) {
        const amp = Number(ev.amount || 26) * (1 - dt / (ev.durSec || 1.6));
        fx.dx += Math.sin(dt * 47) * amp;
        fx.dy += Math.sin(dt * 61 + 0.7) * amp * 0.7;
      } else if (ev.type === 'flash' && dt < 0.45) {
        fx.flash = Math.max(fx.flash, Math.exp(-dt * 9));
      } else if (ev.type === 'jolt' && dt < 0.4) {
        const e = Math.exp(-dt * 11);
        fx.dy += Math.sin(dt * 70) * Number(ev.amount || 26) * e;
        fx.dx += Math.sin(dt * 53 + 1.3) * Number(ev.amount || 26) * 0.45 * e;
      }
    }
    return fx;
  }

  // Final cut times (after the voice retime) for the renderer: QA sampling and SFX placement
  window.__dtScenes = SCENES.map(function(s) { return { start: s.start, end: s.end, title: s.title, spokenLine: s.spokenLine }; });

  const BASE_Z = 300;
  const FOCAL = 700;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  function getImg(id) {
    if (!id) return null;
    const el = document.getElementById(id);
    return el && el.complete && el.naturalWidth > 0 ? el : null;
  }

  function computeBgRect(img, camState) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(W / iw, H / ih) * camState.zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const x = (W - dw) * 0.5 + camState.dx;
    const y = (H - dh) * 0.5 + camState.dy;
    return { x, y, dw, dh, scale };
  }

  function projectPoint(x, y, z, camState) {
    const persp = FOCAL / Math.max(120, FOCAL + (z - BASE_Z));
    const px = W * 0.5 + (x - W * 0.5) * persp + camState.dx * (BASE_Z / Math.max(120, z));
    const py = H * 0.5 + (y - H * 0.5) * persp + camState.dy * (BASE_Z / Math.max(120, z));
    return { x: px, y: py, scale: persp * (0.94 + 0.06 * camState.zoom) };
  }

  function drawSprite3D(layer, localT, globalT, camState, bgRect) {
    const img = getImg(layer.assetId);
    if (!img) return;
    const dur = Math.max(0.5, camState.dur || 4);
    const prog = easeOut(localT / dur);
    const wx = layer.xEnd !== undefined ? lerp(layer.x, layer.xEnd, prog) : layer.x;
    const wy = layer.yEnd !== undefined ? lerp(layer.y, layer.yEnd, prog) : layer.y;
    const wz = layer.zEnd !== undefined ? lerp(layer.z, layer.zEnd, prog) : layer.z;
    const wh = layer.heightEnd !== undefined ? lerp(layer.height, layer.heightEnd, prog) : layer.height;

    let alpha = layer.alpha !== undefined ? layer.alpha : 1;
    if (layer.alphaStartSec !== undefined) {
      if (localT < layer.alphaStartSec) return;
      const fade = Math.max(0.1, layer.alphaFadeSec || 1.2);
      alpha *= easeOut((localT - layer.alphaStartSec) / fade);
    }
    const XF = 0.14;
    if (layer.showAtSec !== undefined) {
      if (localT < layer.showAtSec) return;
      alpha *= clamp((localT - layer.showAtSec) / XF, 0, 1);
    }
    if (layer.hideAtSec !== undefined) {
      if (localT >= layer.hideAtSec + XF) return;
      alpha *= clamp(1 - (localT - layer.hideAtSec) / XF, 0, 1);
    }
    if (alpha <= 0.01) return;
    const anchorY = layer.anchorY !== undefined ? clamp(layer.anchorY, 0, 1) : 1;

    const fr = Array.isArray(layer.frames) && layer.frames.length > 0 ? layer.frames : null;
    const frame = fr ? fr[Math.floor(Math.max(0, localT) * (layer.frameFps || 6)) % fr.length] : null;
    const cr = frame && frame.length === 4 ? frame : Array.isArray(layer.crop) && layer.crop.length === 4 ? layer.crop : null;
    const srcX = cr ? Math.round(img.naturalWidth * clamp(cr[0], 0, 0.9)) : 0;
    const srcY = cr ? Math.round(img.naturalHeight * clamp(cr[1], 0, 0.9)) : 0;
    const srcW = cr ? Math.max(1, Math.round(img.naturalWidth * clamp(cr[2], 0.1, 1))) : img.naturalWidth;
    const srcH = cr ? Math.max(1, Math.round(img.naturalHeight * clamp(cr[3], 0.1, 1))) : img.naturalHeight;

    const bob = layer.bobAmp ? Math.sin(globalT * (layer.bobFreq || 5)) * layer.bobAmp : 0;
    let p, drawH;
    if (layer.space === 'bg' && bgRect) {
      // Glued to the background image: same zoom/pan/shake as the painted set
      const k = bgRect.dh / H;
      p = { x: bgRect.x + wx * bgRect.dw, y: bgRect.y + wy * bgRect.dh + bob * k, scale: k };
      drawH = (wh || 0.4) * bgRect.dh;
    } else {
      p = projectPoint(wx, wy + bob, wz, camState);
      drawH = (wh || 860) * p.scale;
    }
    const drawW = drawH * (srcW / srcH);

    ctx.save();
    ctx.globalAlpha = alpha;
    if (layer.shadow !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 18 * p.scale, drawW * 0.30, 16 * p.scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.translate(p.x, p.y);
    if (layer.rot) ctx.rotate(layer.rot);
    ctx.scale(layer.flipX ? -1 : 1, 1);
    ctx.drawImage(img, srcX, srcY, srcW, srcH, -drawW * 0.5, -drawH * anchorY, drawW, drawH);
    ctx.restore();
  }

  function drawOccluder3D(layer, bgImg, bgRect, camState) {
    const occImg = layer.assetId ? getImg(layer.assetId) : bgImg;
    if (!occImg || !Array.isArray(layer.polygon) || layer.polygon.length < 3) return;
    const occRect = occImg === bgImg ? bgRect : computeBgRect(occImg, camState);
    if (!occRect) return;
    const inBg = layer.space === 'bg';
    // Transform polygon points alongside bgZoom/dx/dy so occluder remains locked to the background furniture
    ctx.save();
    ctx.beginPath();
    layer.polygon.forEach(function(pt, idx) {
      const sx = inBg ? occRect.x + pt[0] * occRect.dw : W * 0.5 + (pt[0] - W * 0.5) * camState.zoom + camState.dx;
      const sy = inBg ? occRect.y + pt[1] * occRect.dh : H * 0.5 + (pt[1] - H * 0.5) * camState.zoom + camState.dy;
      if (idx === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(occImg, occRect.x, occRect.y, occRect.dw, occRect.dh);
    ctx.restore();
  }

  function drawRing3D(layer, localT, globalT, camState, bgRect) {
    if (layer.startSec !== undefined && localT < layer.startSec) return;
    if (layer.endSec !== undefined && localT >= layer.endSec) return;
    const p = layer.space === 'bg' && bgRect
      ? { x: bgRect.x + layer.x * bgRect.dw, y: bgRect.y + layer.y * bgRect.dh, scale: bgRect.dh / H }
      : projectPoint(layer.x, layer.y, layer.z, camState);
    const period = layer.period || 1.2;
    const ph = (globalT % period) / period;
    const maxR = (layer.maxRadius || 150) * p.scale;
    const col = layer.color || SEC;
    for (let k = 0; k < 3; k++) {
      const rProg = (ph + k * 0.25) % 1;
      ctx.save();
      ctx.globalAlpha = 1 - rProg;
      ctx.strokeStyle = col;
      ctx.lineWidth = (7 - rProg * 4) * p.scale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 22 * p.scale + rProg * maxR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBadge3D(layer, globalT, camState) {
    const bob = layer.bobAmp ? Math.sin(globalT * 4) * layer.bobAmp : 0;
    const p = projectPoint(layer.x, layer.y + bob, layer.z, camState);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale, p.scale);
    ctx.font = '900 34px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(layer.text || '').width;
    const bw = Math.max(260, tw + 74);
    ctx.fillStyle = layer.bgColor || '#EF4444';
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(-bw * 0.5, -42, bw, 84, 42);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = layer.textColor || '#FFFFFF';
    ctx.fillText(layer.text || '', 0, 2);
    ctx.restore();
  }

  // Caption chunks: max 3 words, split on pauses and on speaker changes, so a caption never
  // shows words that were not spoken yet and disappears while nobody is talking.
  let CHUNKS = null;
  function speakerAt(sec) {
    for (let i = 0; i < SCENES.length; i++) {
      if (sec >= SCENES[i].start - 0.05 && sec < SCENES[i].end) return String(SCENES[i].speaker || '');
    }
    return '';
  }
  function buildChunks() {
    const out = [];
    let cur = null;
    for (let i = 0; i < WORDS.length; i++) {
      const w = WORDS[i];
      const spk = speakerAt(Number(w.inicio));
      const prev = cur && cur.words[cur.words.length - 1];
      if (!cur || cur.words.length >= 3 || spk !== cur.speaker || (prev && Number(w.inicio) - Number(prev.fim) > 0.35)) {
        cur = { speaker: spk, words: [] };
        out.push(cur);
      }
      cur.words.push(w);
    }
    return out;
  }

  function drawCaptions(t, activeScene) {
    if (WORDS.length > 0) {
      if (!CHUNKS) CHUNKS = buildChunks();
      const chunk = CHUNKS.find(function(c) {
        return t >= Number(c.words[0].inicio) && t <= Number(c.words[c.words.length - 1].fim) + 0.25;
      });
      if (!chunk) return;
      const slice = chunk.words.filter(function(w) { return Number(w.inicio) <= t; });
      if (!slice.length) return;
      let activeIdx = slice.length - 1;

      const y = H * 0.855;
      ctx.save();
      ctx.font = '900 50px "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'middle';
      const gap = 16;
      const label = chunk.speaker ? chunk.speaker.toUpperCase() + ':' : '';
      const labelW = label ? ctx.measureText(label).width + gap : 0;
      const widths = slice.map(function(w) { return ctx.measureText(String(w.palavra || '').toUpperCase()).width; });
      const totalW = labelW + widths.reduce(function(a, b) { return a + b; }, 0) + gap * (slice.length - 1);
      let curX = W * 0.5 - totalW * 0.5;

      ctx.fillStyle = 'rgba(7, 11, 22, 0.86)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.58)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(curX - 34, y - 46, totalW + 68, 92, 22);
      ctx.fill();
      ctx.stroke();

      if (label) {
        ctx.fillStyle = ACCENT;
        ctx.textAlign = 'left';
        ctx.fillText(label, curX, y + 2);
        curX += labelW;
      }
      slice.forEach(function(w, idx) {
        const isCur = idx === activeIdx;
        ctx.fillStyle = isCur ? SEC : '#F8FAFC';
        ctx.textAlign = 'left';
        ctx.fillText(String(w.palavra || '').toUpperCase(), curX, y + 2);
        curX += widths[idx] + gap;
      });
      ctx.restore();
      return;
    }

    const line = activeScene && (activeScene.spokenLine || activeScene.title);
    if (!line) return;
    ctx.save();
    ctx.font = '900 40px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = Math.min(920, ctx.measureText(line).width + 76);
    ctx.fillStyle = 'rgba(7, 11, 22, 0.86)';
    ctx.beginPath();
    ctx.roundRect(W * 0.5 - w * 0.5, H * 0.855 - 42, w, 84, 20);
    ctx.fill();
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(line.slice(0, 44), W * 0.5, H * 0.855 + 2);
    ctx.restore();
  }

  window.__dtSeek = function(timeSec) {
    const t = clamp(Number(timeSec) || 0, 0, TOTAL);
    ctx.save();
    ctx.scale(canvas.width / W, canvas.height / H);
    ctx.fillStyle = BG_HEX;
    ctx.fillRect(0, 0, W, H);

    let sc = SCENES[0];
    for (let i = 0; i < SCENES.length; i++) {
      if (t >= SCENES[i].start && (t < SCENES[i].end || i === SCENES.length - 1)) {
        sc = SCENES[i];
        break;
      }
    }
    const localT = Math.max(0, t - sc.start);
    const dur = Math.max(0.5, sc.durationSec || (sc.end - sc.start) || 4);
    const prog = clamp(localT / dur, 0, 1);
    const cam = sc.camera || {};

    const shakeAmp = cam.shakeAmp || 0;
    const shakePer = cam.shakePeriod || 0;
    const shakeActive = shakeAmp > 0 && (shakePer <= 0 || (t % shakePer) < 0.38);
    const shakeX = shakeActive ? Math.sin(t * 58) * shakeAmp : 0;
    // Knock jolt: damped impulse right after each knock time
    let joltY = 0, joltX = 0, knockFlash = 0;
    const knocks = Array.isArray(cam.knocks) ? cam.knocks : [];
    for (let k = 0; k < knocks.length; k++) {
      const dt = localT - Number(knocks[k]);
      if (dt >= 0 && dt < 0.4) {
        const e = Math.exp(-dt * 11);
        joltY += Math.sin(dt * 70) * (cam.knockAmp || 22) * e;
        joltX += Math.sin(dt * 53 + 1.3) * (cam.knockAmp || 22) * 0.45 * e;
        knockFlash = Math.max(knockFlash, 0.32 * e);
      }
    }

    const fx = editFx(cam, localT, dur);
    const camState = {
      dur: dur,
      zoom: lerp(cam.zoomStart || 1.04, cam.zoomEnd || 1.12, easeOut(prog)),
      dx: lerp(cam.panX || 0, cam.panXEnd !== undefined ? cam.panXEnd : (cam.panX || 0), prog) + shakeX + joltX + fx.dx,
      dy: lerp(cam.panY || 0, cam.panYEnd !== undefined ? cam.panYEnd : (cam.panY || 0), prog) + joltY + fx.dy,
    };

    const bgImg = getImg(sc.bgAssetId);
    const bgRect = bgImg ? computeBgRect(bgImg, camState) : null;

    if (cam.peepholeRadius && bgImg && bgRect) {
      ctx.fillStyle = '#03050B';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.45, cam.peepholeRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(bgImg, bgRect.x, bgRect.y, bgRect.dw, bgRect.dh);
      const flk = 0.12 + 0.10 * Math.sin(t * 19);
      ctx.fillStyle = 'rgba(250, 204, 21, ' + flk.toFixed(2) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.strokeStyle = SEC;
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.45, cam.peepholeRadius + 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (bgImg && bgRect) {
      ctx.drawImage(bgImg, bgRect.x, bgRect.y, bgRect.dw, bgRect.dh);
    }

    // Painter's Algorithm: sort all 3D layers back-to-front (descending z)
    const sorted = (sc.layers || []).slice().sort(function(a, b) {
      return (Number(b.z) || 300) - (Number(a.z) || 300);
    });
    for (let i = 0; i < sorted.length; i++) {
      const layer = sorted[i];
      if (layer.type === 'sprite') drawSprite3D(layer, localT, t, camState, bgRect);
      else if (layer.type === 'occluder') drawOccluder3D(layer, bgImg, bgRect, camState);
      else if (layer.type === 'ring') drawRing3D(layer, localT, t, camState, bgRect);
      else if (layer.type === 'badge') drawBadge3D(layer, t, camState);
    }

    // Apply atmospheric color grade after occluders so foreground furniture shares the same lighting
    if (cam.tintColor) {
      ctx.fillStyle = cam.tintColor;
      ctx.fillRect(0, 0, W, H);
    }

    if (knockFlash > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, ' + knockFlash.toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (fx.dark > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, ' + fx.dark.toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (fx.flash > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.85 * fx.flash).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    if (cam.scanlines) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      for (let y = 0; y < H; y += 10) ctx.fillRect(0, y, W, 3);
    }
    if (cam.recLabel) {
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 5;
      ctx.strokeRect(48, 86, W - 96, H - 430);
      if (Math.sin(t * 6) > -0.2) {
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(118, 155, 16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '900 40px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(cam.recLabel + ' ' + String(Math.floor(localT) % 60).padStart(2, '0'), 155, 169);
    }

    // Floating dust + vignette
    for (let d = 0; d < 18; d++) {
      const dx = (hash(d + 1) * W + t * (16 + (d % 4) * 5)) % W;
      const dy = (hash(d + 31) * H - t * (18 + (d % 3) * 6) + H * 10) % H;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.beginPath();
      ctx.arc(dx, dy, 1.8 + (d % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(11, 16, 32, 0.72)';
    ctx.fillRect(0, 0, W, 14);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(0, 0, W * (t / TOTAL), 14);

    drawCaptions(t, sc);
    ctx.restore();
  };

  window.__dtSeek(0);
})();
</script>
</body>
</html>`;
}
