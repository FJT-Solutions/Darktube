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
  /** Optional normalized source crop [sx, sy, sw, sh] in 0..1 to trim 2x2 sheet edge artifacts */
  crop?: [number, number, number, number];
}

export interface Stage3DOccluderLayer {
  type: 'occluder';
  z: number;
  polygon: Array<[number, number]>;
  bgUrl?: string;
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
}

export interface Stage3DSceneInput extends Partial<HtmlSvgV2Scene> {
  bgUrl?: string;
  camera?: Stage3DCameraConfig;
  layers?: Stage3DLayer[];
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
    bgAssetId: (sc.bgUrl || sc.imageUrl) ? urlToId.get(String(sc.bgUrl || sc.imageUrl)) || '' : '',
    camera: sc.camera || {},
    layers: (sc.layers || []).map((l) => {
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

  function drawSprite3D(layer, localT, globalT, camState) {
    const img = getImg(layer.assetId);
    if (!img) return;
    const dur = Math.max(0.5, camState.dur || 4);
    const prog = easeOut(localT / dur);
    const wx = layer.xEnd !== undefined ? lerp(layer.x, layer.xEnd, prog) : layer.x;
    const wy = layer.yEnd !== undefined ? lerp(layer.y, layer.yEnd, prog) : layer.y;
    const wz = layer.zEnd !== undefined ? lerp(layer.z, layer.zEnd, prog) : layer.z;

    let alpha = layer.alpha !== undefined ? layer.alpha : 1;
    if (layer.alphaStartSec !== undefined) {
      if (localT < layer.alphaStartSec) return;
      const fade = Math.max(0.1, layer.alphaFadeSec || 1.2);
      alpha *= easeOut((localT - layer.alphaStartSec) / fade);
    }
    if (alpha <= 0.01) return;

    const cr = Array.isArray(layer.crop) && layer.crop.length === 4 ? layer.crop : null;
    const srcX = cr ? Math.round(img.naturalWidth * clamp(cr[0], 0, 0.9)) : 0;
    const srcY = cr ? Math.round(img.naturalHeight * clamp(cr[1], 0, 0.9)) : 0;
    const srcW = cr ? Math.max(1, Math.round(img.naturalWidth * clamp(cr[2], 0.1, 1))) : img.naturalWidth;
    const srcH = cr ? Math.max(1, Math.round(img.naturalHeight * clamp(cr[3], 0.1, 1))) : img.naturalHeight;

    const bob = layer.bobAmp ? Math.sin(globalT * (layer.bobFreq || 5)) * layer.bobAmp : 0;
    const p = projectPoint(wx, wy + bob, wz, camState);
    const drawH = (layer.height || 860) * p.scale;
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
    ctx.drawImage(img, srcX, srcY, srcW, srcH, -drawW * 0.5, -drawH, drawW, drawH);
    ctx.restore();
  }

  function drawOccluder3D(layer, bgImg, bgRect, camState) {
    const occImg = layer.assetId ? getImg(layer.assetId) : bgImg;
    if (!occImg || !Array.isArray(layer.polygon) || layer.polygon.length < 3) return;
    const occRect = occImg === bgImg ? bgRect : computeBgRect(occImg, camState);
    // Transform polygon points alongside bgZoom/dx/dy so occluder remains locked to the background furniture
    ctx.save();
    ctx.beginPath();
    layer.polygon.forEach(function(pt, idx) {
      const sx = W * 0.5 + (pt[0] - W * 0.5) * camState.zoom + camState.dx;
      const sy = H * 0.5 + (pt[1] - H * 0.5) * camState.zoom + camState.dy;
      if (idx === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(occImg, occRect.x, occRect.y, occRect.dw, occRect.dh);
    ctx.restore();
  }

  function drawRing3D(layer, localT, globalT, camState) {
    if (layer.startSec !== undefined && localT < layer.startSec) return;
    const p = projectPoint(layer.x, layer.y, layer.z, camState);
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

  function drawCaptions(t, activeScene) {
    if (WORDS.length > 0) {
      let activeIdx = -1;
      for (let i = 0; i < WORDS.length; i++) {
        if (t >= WORDS[i].inicio && t <= WORDS[i].fim + 0.14) { activeIdx = i; break; }
        if (t > WORDS[i].fim) activeIdx = i;
      }
      if (activeIdx < 0) return;
      const chunkIdx = Math.floor(activeIdx / 3);
      const slice = WORDS.slice(chunkIdx * 3, chunkIdx * 3 + 3);
      if (!slice.length) return;

      const y = H * 0.855;
      ctx.save();
      ctx.font = '900 50px "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'middle';
      const gap = 16;
      const widths = slice.map(function(w) { return ctx.measureText(String(w.palavra || '').toUpperCase()).width; });
      const totalW = widths.reduce(function(a, b) { return a + b; }, 0) + gap * (slice.length - 1);
      let curX = W * 0.5 - totalW * 0.5;

      ctx.fillStyle = 'rgba(7, 11, 22, 0.86)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.58)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(curX - 34, y - 46, totalW + 68, 92, 22);
      ctx.fill();
      ctx.stroke();

      slice.forEach(function(w, idx) {
        const isCur = chunkIdx * 3 + idx === activeIdx;
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

    const camState = {
      dur: dur,
      zoom: lerp(cam.zoomStart || 1.04, cam.zoomEnd || 1.12, easeOut(prog)),
      dx: lerp(cam.panX || 0, cam.panXEnd !== undefined ? cam.panXEnd : (cam.panX || 0), prog) + shakeX,
      dy: lerp(cam.panY || 0, cam.panYEnd !== undefined ? cam.panYEnd : (cam.panY || 0), prog),
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
      if (layer.type === 'sprite') drawSprite3D(layer, localT, t, camState);
      else if (layer.type === 'occluder') drawOccluder3D(layer, bgImg, bgRect, camState);
      else if (layer.type === 'ring') drawRing3D(layer, localT, t, camState);
      else if (layer.type === 'badge') drawBadge3D(layer, t, camState);
    }

    // Apply atmospheric color grade after occluders so foreground furniture shares the same lighting
    if (cam.tintColor) {
      ctx.fillStyle = cam.tintColor;
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
