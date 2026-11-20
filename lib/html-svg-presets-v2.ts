import type { ExtraPresetCompileContext, ExtraPresetScene } from './html-svg-presets-extra';

export interface HtmlSvgChartItem {
  label: string;
  value: number;
  color?: string;
}

export interface HtmlSvgV2Scene extends ExtraPresetScene {
  imageUrl?: string;
  yearLabel?: string;
  chartItems?: HtmlSvgChartItem[];
  speakerId?: string;
  expression?: string;
  icon?: string;
}

export interface HtmlSvgV2CompileContext extends Omit<ExtraPresetCompileContext, 'scenes'> {
  scenes: HtmlSvgV2Scene[];
}

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeJson = (val: unknown): string => JSON.stringify(val).replace(/</g, '\\u003c');

function parseNumericMetric(raw: string, fallback = 75): number {
  const cleaned = String(raw || '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!cleaned) return fallback;
  const n = Number(cleaned[0]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function buildNetflixDocHtml(ctx: HtmlSvgV2CompileContext): string {
  const isVert = ctx.viewH > ctx.viewW;
  const scaleFactor = Number((ctx.width / ctx.viewW).toFixed(5));
  const bgHex = ctx.palette[0] || '#07080D';
  const accentHex = ctx.palette[1] || '#E50914';
  const goldHex = ctx.palette[2] || '#FACC15';

  const years = ctx.scenes.map((sc, i) => sc.yearLabel || sc.badge || `${2018 + i * 2}`);

  const frameBox = isVert
    ? { x: 76, y: 270, w: ctx.viewW - 152, h: 740 }
    : { x: 90, y: 185, w: ctx.viewW - 180, h: 520 };

  const timelineTicks = years
    .map((yr, i) => {
      const ratio = years.length <= 1 ? 0.5 : i / (years.length - 1);
      const leftPct = (10 + ratio * 80).toFixed(2);
      return `<div class="nd-tick" id="nd_tick_${i}" style="left:${leftPct}%">
        <span class="nd-dot"></span>
        <span class="nd-yr">${esc(yr)}</span>
      </div>`;
    })
    .join('\n');

  const sceneLayers = ctx.scenes
    .map((sc, i) => {
      const yearText = sc.yearLabel || years[i];
      const hasImg = Boolean(sc.imageUrl && String(sc.imageUrl).trim());
      const imgTag = hasImg
        ? `<img class="nd-photo" id="nd_photo_${i}" src="${esc(sc.imageUrl)}" alt="${esc(sc.title)}" />`
        : `<svg class="nd-photo nd-archival-svg" id="nd_photo_${i}" viewBox="0 0 ${frameBox.w} ${frameBox.h}">
            <defs>
              <pattern id="ndGrid${i}" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="${frameBox.w}" height="${frameBox.h}" fill="#0F131F"/>
            <rect width="${frameBox.w}" height="${frameBox.h}" fill="url(#ndGrid${i})"/>
            <circle cx="${(frameBox.w * 0.5).toFixed(0)}" cy="${(frameBox.h * 0.48).toFixed(0)}" r="${Math.min(frameBox.w, frameBox.h) * 0.28}" fill="none" stroke="${accentHex}" stroke-width="3" stroke-dasharray="10 8" opacity="0.72"/>
            <circle cx="${(frameBox.w * 0.5).toFixed(0)}" cy="${(frameBox.h * 0.48).toFixed(0)}" r="${Math.min(frameBox.w, frameBox.h) * 0.16}" fill="rgba(229,9,20,0.12)" stroke="${goldHex}" stroke-width="2"/>
            <line x1="60" y1="${(frameBox.h * 0.48).toFixed(0)}" x2="${frameBox.w - 60}" y2="${(frameBox.h * 0.48).toFixed(0)}" stroke="rgba(250,204,21,0.35)" stroke-width="1.5"/>
            <text x="${(frameBox.w * 0.5).toFixed(0)}" y="${(frameBox.h * 0.47).toFixed(0)}" text-anchor="middle" fill="#F8FAFC" font-size="68" font-weight="900" letter-spacing="4">${esc(sc.metricValue || yearText)}</text>
            <text x="${(frameBox.w * 0.5).toFixed(0)}" y="${(frameBox.h * 0.56).toFixed(0)}" text-anchor="middle" fill="${goldHex}" font-size="24" font-family="monospace" font-weight="700">${esc(sc.metricLabel || sc.badge || 'ARQUIVO CONFIDENCIAL')}</text>
          </svg>`;

      return `
      <div class="nd-scene" id="scene_${i}" style="opacity:${i === 0 ? 1 : 0}">
        <div class="nd-evidence-frame" style="left:${frameBox.x}px;top:${frameBox.y}px;width:${frameBox.w}px;height:${frameBox.h}px;">
          ${imgTag}
          <div class="nd-frame-vignette"></div>
          <div class="nd-classified-stamp">${esc(sc.badge || `ARQUIVO 0${i + 1}`)} • ${esc(yearText)}</div>
          ${sc.callout ? `<div class="nd-callout">${esc(sc.callout)}</div>` : ''}
        </div>
        <div class="nd-copy" style="top:${frameBox.y + frameBox.h + (isVert ? 42 : 24)}px;">
          <div class="nd-kicker">${esc(yearText)}${sc.metricLabel ? ` — ${esc(sc.metricLabel)}` : ''}</div>
          <h1 class="nd-title">${esc(sc.title)}</h1>
          ${sc.subtitle ? `<p class="nd-subtitle">${esc(sc.subtitle)}</p>` : ''}
        </div>
        ${sc.spokenLine ? `<div class="nd-caption">${esc(sc.spokenLine)}</div>` : ''}
      </div>`;
    })
    .join('\n');

  const grainSpecks = Array.from({ length: 42 }, (_, idx) => {
    const gx = (idx * 241 + 37) % ctx.viewW;
    const gy = (idx * 389 + 53) % ctx.viewH;
    const gr = (idx % 3) + 1;
    return `<circle class="gr" data-gx="${gx}" data-gy="${gy}" cx="${gx}" cy="${gy}" r="${gr}" fill="#FFFFFF" opacity="0.06"/>`;
  }).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${ctx.width}px; height: ${ctx.height}px; overflow: hidden;
    background: ${bgHex}; color: #F8FAFC;
    font-family: Inter, system-ui, -apple-system, sans-serif;
  }
  #stage {
    position: relative; width: ${ctx.viewW}px; height: ${ctx.viewH}px;
    transform-origin: top left; transform: scale(${scaleFactor});
    background: radial-gradient(circle at 50% 30%, #171B2B 0%, ${bgHex} 78%);
    overflow: hidden;
  }
  .nd-topbar {
    position: absolute; top: ${isVert ? 86 : 44}px; left: 76px; right: 76px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid rgba(255,255,255,0.14); padding-bottom: 16px;
  }
  .nd-brand {
    display: inline-flex; align-items: center; gap: 12px;
    font-size: 22px; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase;
  }
  .nd-rec-dot { width: 14px; height: 14px; border-radius: 50%; background: ${accentHex}; box-shadow: 0 0 16px ${accentHex}; }
  .nd-doc-title { font-size: 20px; font-weight: 600; color: #CBD5E1; letter-spacing: 0.06em; text-transform: uppercase; }
  .nd-timeline {
    position: absolute; top: ${isVert ? 156 : 104}px; left: 76px; right: 76px; height: 68px;
  }
  .nd-track { position: absolute; left: 8%; right: 8%; top: 18px; height: 3px; background: rgba(255,255,255,0.18); }
  .nd-track-fill { position: absolute; left: 8%; width: 0%; top: 18px; height: 3px; background: ${accentHex}; box-shadow: 0 0 12px ${accentHex}; }
  .nd-tick { position: absolute; top: 8px; transform: translateX(-50%); text-align: center; }
  .nd-dot { display: block; width: 20px; height: 20px; margin: 0 auto 8px; border-radius: 50%; background: #1E293B; border: 3px solid rgba(255,255,255,0.4); }
  .nd-tick.active .nd-dot { background: ${accentHex}; border-color: #FFFFFF; transform: scale(1.22); }
  .nd-yr { font-size: 20px; font-weight: 800; font-family: monospace; color: #94A3B8; letter-spacing: 0.05em; }
  .nd-tick.active .nd-yr { color: ${goldHex}; }
  .nd-scene { position: absolute; inset: 0; pointer-events: none; }
  .nd-evidence-frame {
    position: absolute; border-radius: 16px; overflow: hidden;
    border: 2px solid rgba(255,255,255,0.16);
    box-shadow: 0 28px 65px rgba(0,0,0,0.65); background: #0B0E17;
  }
  .nd-photo { width: 100%; height: 100%; object-fit: cover; transform-origin: center center; display: block; }
  .nd-frame-vignette {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.28) 0%, transparent 28%, transparent 68%, rgba(7,8,13,0.9) 100%);
  }
  .nd-classified-stamp {
    position: absolute; top: 20px; left: 22px; padding: 8px 16px; border-radius: 8px;
    background: rgba(7, 8, 13, 0.85); border: 1px solid ${accentHex};
    color: #FFFFFF; font-family: monospace; font-size: 19px; font-weight: 800; letter-spacing: 0.08em;
  }
  .nd-callout {
    position: absolute; right: 24px; bottom: 24px; padding: 10px 18px; border-radius: 10px;
    background: ${goldHex}; color: #111827; font-size: 22px; font-weight: 900; text-transform: uppercase;
  }
  .nd-copy { position: absolute; left: 76px; right: 76px; }
  .nd-kicker { font-family: monospace; font-size: 22px; font-weight: 800; color: ${accentHex}; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
  .nd-title { font-family: Georgia, "Times New Roman", serif; font-size: ${isVert ? 60 : 52}px; font-weight: 900; line-height: 1.08; color: #FFFFFF; margin-bottom: 14px; }
  .nd-subtitle { font-size: ${isVert ? 30 : 26}px; line-height: 1.38; color: #CBD5E1; font-weight: 500; }
  .nd-caption {
    position: absolute; left: 76px; right: 76px; bottom: ${isVert ? 120 : 48}px;
    padding: 20px 28px; border-radius: 14px; background: rgba(15, 23, 42, 0.9);
    border-left: 6px solid ${accentHex}; font-size: 27px; font-weight: 700; line-height: 1.35; color: #F8FAFC;
  }
  #nd-grain { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
</style>
</head>
<body>
<div id="stage">
  <div class="nd-topbar">
    <div class="nd-brand"><span class="nd-rec-dot"></span><span>DOSSIÊ DOCUMENTAL</span></div>
    <div class="nd-doc-title">${esc(ctx.title)}</div>
  </div>
  <div class="nd-timeline">
    <div class="nd-track"></div>
    <div class="nd-track-fill" id="nd_track_fill"></div>
    ${timelineTicks}
  </div>
  ${sceneLayers}
  <svg id="nd-grain" viewBox="0 0 ${ctx.viewW} ${ctx.viewH}">${grainSpecks}</svg>
</div>
<script>
(function() {
  const SCENES = ${safeJson(ctx.scenes)};
  const TOTAL = ${ctx.totalDur};
  window.__dtSeek = function(timeSec) {
    const t = Math.max(0, Math.min(TOTAL, Number(timeSec) || 0));
    const tf = document.getElementById('nd_track_fill');
    if (tf) tf.style.width = ((t / Math.max(0.1, TOTAL)) * 84).toFixed(2) + '%';

    document.querySelectorAll('#nd-grain .gr').forEach(function(g, idx) {
      const step = Math.floor(t * 24);
      const nx = ((Number(g.getAttribute('data-gx')) || 0) + step * 37 * (idx % 5 + 1)) % ${ctx.viewW};
      const ny = ((Number(g.getAttribute('data-gy')) || 0) + step * 53 * (idx % 3 + 1)) % ${ctx.viewH};
      g.setAttribute('cx', nx);
      g.setAttribute('cy', ny);
    });

    SCENES.forEach(function(sc, idx) {
      const el = document.getElementById('scene_' + idx);
      const tick = document.getElementById('nd_tick_' + idx);
      const active = t >= sc.start && (t < sc.end || (idx === SCENES.length - 1 && t <= sc.end));
      if (tick) tick.className = 'nd-tick' + (t >= sc.start ? ' active' : '');
      if (!el) return;
      const localT = Math.max(0, t - sc.start);
      const p = Math.min(1, localT / Math.max(0.5, sc.durationSec));
      const fade = active ? Math.min(1, localT / 0.28 + 0.08) * (idx < SCENES.length - 1 && (sc.end - t) < 0.2 ? Math.max(0, (sc.end - t) / 0.2) : 1) : 0;
      el.style.opacity = fade.toFixed(4);
      const photo = document.getElementById('nd_photo_' + idx);
      if (photo && active) {
        const scZ = 1 + 0.13 * p;
        const panX = (idx % 2 === 0 ? -1 : 1) * 18 * (p - 0.5);
        const panY = -10 * (p - 0.5);
        photo.style.transform = 'scale(' + scZ.toFixed(4) + ') translate(' + panX.toFixed(1) + 'px,' + panY.toFixed(1) + 'px)';
      }
    });
  };
  window.__dtSeek(0);
})();
</script>
</body>
</html>`;
}

export function buildVoxPapercutHtml(ctx: HtmlSvgV2CompileContext): string {
  const isVert = ctx.viewH > ctx.viewW;
  const scaleFactor = Number((ctx.width / ctx.viewW).toFixed(5));
  const paperBg = '#F4EFE4';
  const inkDark = '#18181B';
  const voxYellow = '#FDE047';
  const accentHex = ctx.palette[1] || '#DC2626';

  const sceneLayers = ctx.scenes
    .map((sc, i) => {
      const rotDeg = i % 2 === 0 ? -1.4 : 1.4;
      const mediaSlot = sc.imageUrl
        ? `<img class="vox-cut-img" src="${esc(sc.imageUrl)}" alt="${esc(sc.title)}" />`
        : `<div class="vox-metric-cut">
            <div class="vox-metric-num">${esc(sc.metricValue || sc.badge || `#0${i + 1}`)}</div>
            <div class="vox-metric-lbl">${esc(sc.metricLabel || sc.yearLabel || 'DESTAQUE EDITORIAL')}</div>
          </div>`;

      return `
      <div class="vox-scene" id="scene_${i}" style="opacity:${i === 0 ? 1 : 0}">
        <div class="vox-paper-card" id="vox_card_${i}" data-base-rot="${rotDeg}">
          <div class="vox-tape vox-tape-l"></div>
          <div class="vox-tape vox-tape-r"></div>
          <div class="vox-badge-pill">${esc(sc.badge || `CAPÍTULO 0${i + 1}`)}${sc.yearLabel ? ` • ${esc(sc.yearLabel)}` : ''}</div>
          <h1 class="vox-headline">
            <span class="vox-hl-wrap">
              <span class="vox-marker" id="vox_marker_${i}"></span>
              <span class="vox-hl-text">${esc(sc.title)}</span>
            </span>
          </h1>
          ${sc.subtitle ? `<p class="vox-sub">${esc(sc.subtitle)}</p>` : ''}
          <div class="vox-cutout-box">
            ${mediaSlot}
          </div>
          ${sc.callout ? `<div class="vox-sticky">${esc(sc.callout)}</div>` : ''}
        </div>
        ${sc.spokenLine ? `<div class="vox-caption">${esc(sc.spokenLine)}</div>` : ''}
      </div>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${ctx.width}px; height: ${ctx.height}px; overflow: hidden;
    background: ${paperBg}; color: ${inkDark};
    font-family: Inter, system-ui, -apple-system, sans-serif;
  }
  #stage {
    position: relative; width: ${ctx.viewW}px; height: ${ctx.viewH}px;
    transform-origin: top left; transform: scale(${scaleFactor});
    background-color: ${paperBg};
    background-image: radial-gradient(rgba(24,24,27,0.08) 1.5px, transparent 1.5px);
    background-size: 28px 28px;
    overflow: hidden;
  }
  .vox-header-strip {
    position: absolute; top: ${isVert ? 74 : 36}px; left: 72px; right: 72px;
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 3px solid ${inkDark}; padding-bottom: 12px;
  }
  .vox-tag { background: ${voxYellow}; color: ${inkDark}; padding: 6px 16px; font-weight: 900; font-size: 22px; letter-spacing: 0.08em; border: 2px solid ${inkDark}; }
  .vox-doc { font-weight: 800; font-size: 22px; text-transform: uppercase; color: #3F3F46; }
  .vox-scene { position: absolute; inset: 0; pointer-events: none; }
  .vox-paper-card {
    position: absolute;
    left: ${isVert ? 72 : 120}px; right: ${isVert ? 72 : 120}px;
    top: ${isVert ? 200 : 125}px;
    background: #FFFDF8; border: 4px solid ${inkDark};
    box-shadow: 16px 18px 0px ${inkDark};
    padding: ${isVert ? '52px 46px' : '34px 44px'};
  }
  .vox-tape {
    position: absolute; top: -18px; width: 128px; height: 34px;
    background: rgba(253, 224, 71, 0.88); border: 2px solid rgba(24,24,27,0.35);
  }
  .vox-tape-l { left: 48px; transform: rotate(-6deg); }
  .vox-tape-r { right: 48px; transform: rotate(5deg); }
  .vox-badge-pill {
    display: inline-block; padding: 8px 18px; background: ${inkDark}; color: #FFFFFF;
    font-size: 21px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 24px;
  }
  .vox-headline { font-size: ${isVert ? 58 : 48}px; font-weight: 950; line-height: 1.12; margin-bottom: 20px; }
  .vox-hl-wrap { position: relative; display: inline-block; padding: 4px 10px; }
  .vox-marker {
    position: absolute; left: 0; top: 6%; bottom: 6%; width: 0%;
    background: ${voxYellow}; z-index: 0;
  }
  .vox-hl-text { position: relative; z-index: 1; }
  .vox-sub { font-size: ${isVert ? 31 : 25}px; line-height: 1.38; color: #27272A; font-weight: 600; margin-bottom: 28px; }
  .vox-cutout-box {
    width: 100%; height: ${isVert ? 540 : 320}px;
    border: 3.5px solid ${inkDark}; background: #EAE3D2; overflow: hidden;
    box-shadow: 8px 8px 0px rgba(24,24,27,0.22);
    display: flex; align-items: center; justify-content: center;
  }
  .vox-cut-img { width: 100%; height: 100%; object-fit: cover; filter: contrast(1.06) saturate(1.05); }
  .vox-metric-cut { text-align: center; padding: 24px; }
  .vox-metric-num { font-size: ${isVert ? 112 : 84}px; font-weight: 950; color: ${accentHex}; line-height: 1; margin-bottom: 14px; }
  .vox-metric-lbl { font-size: 28px; font-weight: 800; color: ${inkDark}; text-transform: uppercase; letter-spacing: 0.06em; }
  .vox-sticky {
    position: absolute; right: 32px; bottom: -28px; padding: 14px 24px;
    background: ${voxYellow}; border: 3px solid ${inkDark}; box-shadow: 6px 6px 0px ${inkDark};
    font-size: 24px; font-weight: 900; transform: rotate(-2.5deg);
  }
  .vox-caption {
    position: absolute; left: 72px; right: 72px; bottom: ${isVert ? 125 : 44}px;
    background: ${inkDark}; color: #FFFDF8; padding: 20px 28px;
    border: 3px solid ${voxYellow}; box-shadow: 10px 10px 0px rgba(0,0,0,0.25);
    font-size: 28px; font-weight: 800; line-height: 1.35; text-align: center;
  }
</style>
</head>
<body>
<div id="stage">
  <div class="vox-header-strip">
    <span class="vox-tag">EXPLICADOR EDITORIAL</span>
    <span class="vox-doc">${esc(ctx.title)}</span>
  </div>
  ${sceneLayers}
</div>
<script>
(function() {
  const SCENES = ${safeJson(ctx.scenes)};
  const TOTAL = ${ctx.totalDur};
  window.__dtSeek = function(timeSec) {
    const rawT = Math.max(0, Math.min(TOTAL, Number(timeSec) || 0));
    const t = Math.floor(rawT * 12) / 12; // 12 FPS stepped stop-motion feel
    SCENES.forEach(function(sc, idx) {
      const el = document.getElementById('scene_' + idx);
      if (!el) return;
      const active = rawT >= sc.start && (rawT < sc.end || (idx === SCENES.length - 1 && rawT <= sc.end));
      el.style.opacity = active ? '1' : '0';
      if (!active) return;
      const localStep = Math.max(0, t - sc.start);
      const marker = document.getElementById('vox_marker_' + idx);
      if (marker) marker.style.width = (Math.min(1, localStep / 0.55) * 100).toFixed(1) + '%';
      const card = document.getElementById('vox_card_' + idx);
      if (card) {
        const baseRot = Number(card.getAttribute('data-base-rot')) || 0;
        const wobble = Math.sin(t * 4.5 + idx) * 0.7;
        const pop = Math.min(1, 0.94 + localStep * 0.25);
        card.style.transform = 'rotate(' + (baseRot + wobble).toFixed(2) + 'deg) scale(' + pop.toFixed(3) + ')';
      }
    });
  };
  window.__dtSeek(0);
})();
</script>
</body>
</html>`;
}

export function buildKazChartHtml(ctx: HtmlSvgV2CompileContext): string {
  const isVert = ctx.viewH > ctx.viewW;
  const scaleFactor = Number((ctx.width / ctx.viewW).toFixed(5));
  const bgHex = ctx.palette[0] || '#090D16';
  const accentHex = ctx.palette[1] || '#38BDF8';
  const secHex = ctx.palette[2] || '#22C55E';

  const paletteBars = [accentHex, secHex, '#FACC15', '#FB7185', '#A78BFA'];

  const sceneLayers = ctx.scenes
    .map((sc, i) => {
      const items: HtmlSvgChartItem[] =
        Array.isArray(sc.chartItems) && sc.chartItems.length >= 2
          ? sc.chartItems.slice(0, 6)
          : [
              { label: 'Base', value: Math.round(parseNumericMetric(sc.metricValue, 80) * 0.35), color: '#64748B' },
              { label: 'Média', value: Math.round(parseNumericMetric(sc.metricValue, 80) * 0.62), color: '#38BDF8' },
              { label: sc.metricLabel || sc.badge || 'Atual', value: parseNumericMetric(sc.metricValue, 92), color: secHex },
            ];
      const maxVal = Math.max(1, ...items.map((x) => Math.abs(x.value)));
      const chartW = isVert ? ctx.viewW - 140 : ctx.viewW - 220;
      const chartH = isVert ? 680 : 410;
      const slotW = chartW / items.length;
      const barW = Math.min(140, slotW * 0.56);

      let maxIdx = 0;
      items.forEach((it, bi) => {
        if (it.value >= items[maxIdx].value) maxIdx = bi;
      });

      const barsSvg = items
        .map((it, bi) => {
          const cx = slotW * bi + slotW * 0.5;
          const fullH = Math.max(28, (Math.abs(it.value) / maxVal) * (chartH - 120));
          const col = it.color || paletteBars[bi % paletteBars.length];
          const baseY = chartH - 58;
          return `
          <g class="kz-bar-grp" data-base-y="${baseY}" data-full-h="${fullH.toFixed(1)}" data-val="${it.value}" data-winner="${bi === maxIdx ? 1 : 0}">
            <rect class="kz-bar" x="${(cx - barW / 2).toFixed(1)}" y="${baseY}" width="${barW.toFixed(1)}" height="0" rx="10" fill="${col}" />
            <text class="kz-bar-val" x="${cx.toFixed(1)}" y="${(baseY - 14).toFixed(1)}" text-anchor="middle" fill="#FFFFFF" font-size="28" font-weight="900">0</text>
            <text x="${cx.toFixed(1)}" y="${(chartH - 16).toFixed(1)}" text-anchor="middle" fill="#CBD5E1" font-size="22" font-weight="700">${esc(it.label.slice(0, 14))}</text>
          </g>`;
        })
        .join('\n');

      const trendPoints = items
        .map((it, bi) => {
          const cx = slotW * bi + slotW * 0.5;
          const fullH = Math.max(28, (Math.abs(it.value) / maxVal) * (chartH - 120));
          return `${cx.toFixed(1)},${(chartH - 58 - fullH - 14).toFixed(1)}`;
        })
        .join(' L ');

      return `
      <div class="kz-scene" id="scene_${i}" style="opacity:${i === 0 ? 1 : 0}">
        <div class="kz-head">
          <span class="kz-pill">${esc(sc.badge || `DADO 0${i + 1}`)}${sc.yearLabel ? ` • ${esc(sc.yearLabel)}` : ''}</span>
          <h1 class="kz-title">${esc(sc.title)}</h1>
          ${sc.subtitle ? `<p class="kz-sub">${esc(sc.subtitle)}</p>` : ''}
        </div>
        <div class="kz-chart-card" id="kz_card_${i}">
          <svg viewBox="0 0 ${chartW} ${chartH}" width="${chartW}" height="${chartH}">
            <line x1="0" y1="${chartH - 58}" x2="${chartW}" y2="${chartH - 58}" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
            <line x1="0" y1="${chartH * 0.48}" x2="${chartW}" y2="${chartH * 0.48}" stroke="rgba(255,255,255,0.08)" stroke-width="2" stroke-dasharray="8 8"/>
            ${barsSvg}
            <path class="kz-trend" d="M ${trendPoints}" fill="none" stroke="#FACC15" stroke-width="5" stroke-linecap="round" stroke-dasharray="1600" stroke-dashoffset="1600"/>
          </svg>
          ${sc.metricValue ? `<div class="kz-kpi">${esc(sc.metricValue)}</div>` : ''}
        </div>
        ${sc.spokenLine ? `<div class="kz-caption">${esc(sc.spokenLine)}</div>` : ''}
      </div>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${ctx.width}px; height: ${ctx.height}px; overflow: hidden;
    background: ${bgHex}; color: #F8FAFC;
    font-family: Inter, system-ui, -apple-system, sans-serif;
  }
  #stage {
    position: relative; width: ${ctx.viewW}px; height: ${ctx.viewH}px;
    transform-origin: top left; transform: scale(${scaleFactor});
    background: radial-gradient(circle at 50% 25%, #16223B 0%, ${bgHex} 78%);
    overflow: hidden;
  }
  .kz-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px);
    background-size: 56px 56px;
  }
  .kz-scene { position: absolute; inset: 0; pointer-events: none; }
  .kz-head { position: absolute; top: ${isVert ? 104 : 46}px; left: 70px; right: 70px; }
  .kz-pill {
    display: inline-block; padding: 8px 18px; border-radius: 999px;
    background: rgba(56,189,248,0.16); border: 1.5px solid ${accentHex};
    color: ${accentHex}; font-size: 21px; font-weight: 800; letter-spacing: 0.08em; margin-bottom: 16px;
  }
  .kz-title { font-size: ${isVert ? 56 : 46}px; font-weight: 900; line-height: 1.08; color: #FFFFFF; margin-bottom: 12px; }
  .kz-sub { font-size: ${isVert ? 29 : 24}px; color: #94A3B8; line-height: 1.35; }
  .kz-chart-card {
    position: absolute; left: 70px; right: 70px; top: ${isVert ? 430 : 250}px;
    padding: 28px; border-radius: 24px;
    background: rgba(15, 23, 42, 0.84); border: 1.5px solid rgba(255,255,255,0.14);
    box-shadow: 0 24px 60px rgba(0,0,0,0.5); transform-origin: center center;
  }
  .kz-kpi {
    position: absolute; top: 22px; right: 28px; padding: 10px 20px; border-radius: 12px;
    background: ${secHex}; color: #052E16; font-size: 32px; font-weight: 950;
  }
  .kz-caption {
    position: absolute; left: 70px; right: 70px; bottom: ${isVert ? 130 : 48}px;
    padding: 20px 28px; border-radius: 16px;
    background: rgba(9, 13, 22, 0.9); border: 1.5px solid rgba(56,189,248,0.45);
    font-size: 27px; font-weight: 700; text-align: center; line-height: 1.34;
  }
</style>
</head>
<body>
<div id="stage">
  <div class="kz-grid"></div>
  ${sceneLayers}
</div>
<script>
(function() {
  const SCENES = ${safeJson(ctx.scenes)};
  const TOTAL = ${ctx.totalDur};
  function easeOutCubic(x) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3); }
  window.__dtSeek = function(timeSec) {
    const t = Math.max(0, Math.min(TOTAL, Number(timeSec) || 0));
    SCENES.forEach(function(sc, idx) {
      const el = document.getElementById('scene_' + idx);
      if (!el) return;
      const active = t >= sc.start && (t < sc.end || (idx === SCENES.length - 1 && t <= sc.end));
      el.style.opacity = active ? '1' : '0';
      if (!active) return;
      const localT = Math.max(0, t - sc.start);
      const grow = easeOutCubic(localT / 1.15);
      el.querySelectorAll('.kz-bar-grp').forEach(function(grp, gi) {
        const baseY = Number(grp.getAttribute('data-base-y')) || 300;
        const fullH = Number(grp.getAttribute('data-full-h')) || 100;
        const targetVal = Number(grp.getAttribute('data-val')) || 0;
        const curH = fullH * grow;
        const rect = grp.querySelector('.kz-bar');
        const txt = grp.querySelector('.kz-bar-val');
        if (rect) {
          rect.setAttribute('y', (baseY - curH).toFixed(1));
          rect.setAttribute('height', curH.toFixed(1));
        }
        if (txt) {
          txt.setAttribute('y', (baseY - curH - 14).toFixed(1));
          txt.textContent = String(Math.round(targetVal * grow));
        }
      });
      const trend = el.querySelector('.kz-trend');
      if (trend) {
        const lineP = easeOutCubic(Math.max(0, localT - 0.35) / 1.0);
        trend.setAttribute('stroke-dashoffset', String((1600 * (1 - lineP)).toFixed(1)));
      }
      const card = document.getElementById('kz_card_' + idx);
      if (card) {
        const camZoom = 1 + 0.045 * easeOutCubic(localT / Math.max(1, sc.durationSec));
        const camX = Math.sin(localT * 0.9) * 8;
        card.style.transform = 'scale(' + camZoom.toFixed(4) + ') translateX(' + camX.toFixed(1) + 'px)';
      }
    });
  };
  window.__dtSeek(0);
})();
</script>
</body>
</html>`;
}

export function buildPaperFinanceHtml(ctx: HtmlSvgV2CompileContext): string {
  const isVert = ctx.viewH > ctx.viewW;
  const scaleFactor = Number((ctx.width / ctx.viewW).toFixed(5));
  const creamBg = '#F7F1E3';
  const ink = '#1C1917';
  const greenInk = ctx.palette[1] || '#15803D';
  const redInk = ctx.palette[2] || '#B91C1C';

  const sceneLayers = ctx.scenes
    .map((sc, i) => {
      const cardW = isVert ? ctx.viewW - 140 : ctx.viewW - 220;
      const cardH = isVert ? 680 : 380;
      const sticks = [
        { x: 340, y: 240, h: 65, up: true },
        { x: 420, y: 215, h: 72, up: false },
        { x: 500, y: 190, h: 95, up: true },
        { x: 580, y: 155, h: 110, up: true },
        { x: 660, y: 115, h: 135, up: i % 3 !== 1 },
      ];

      return `
      <div class="pf-scene" id="scene_${i}" style="opacity:${i === 0 ? 1 : 0}">
        <div class="pf-header">
          <div class="pf-badge">${esc(sc.badge || `LIÇÃO 0${i + 1}`)}${sc.yearLabel ? ` • ${esc(sc.yearLabel)}` : ''}</div>
          <h1 class="pf-title">${esc(sc.title)}</h1>
          ${sc.subtitle ? `<p class="pf-sub">${esc(sc.subtitle)}</p>` : ''}
        </div>
        <div class="pf-board">
          <svg viewBox="0 0 ${cardW} ${cardH}" width="${cardW}" height="${cardH}">
            <!-- Grid lines inside notebook board -->
            <line x1="270" y1="60" x2="270" y2="${cardH - 50}" stroke="rgba(28,25,23,0.18)" stroke-width="3"/>
            <line x1="270" y1="${cardH - 50}" x2="${cardW - 40}" y2="${cardH - 50}" stroke="${ink}" stroke-width="4"/>
            <!-- Animated finance stickman on left -->
            <g class="pf-stickman" id="pf_stick_${i}" transform="translate(135, ${isVert ? 420 : 250})">
              <circle cx="0" cy="-120" r="34" fill="#FFFDF7" stroke="${ink}" stroke-width="5"/>
              <circle cx="-10" cy="-124" r="4" fill="${ink}"/>
              <circle cx="10" cy="-124" r="4" fill="${ink}"/>
              <path d="M-12,-106 Q0,-96 12,-106" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>
              <line x1="0" y1="-86" x2="0" y2="38" stroke="${ink}" stroke-width="5.5" stroke-linecap="round"/>
              <!-- Tie -->
              <polygon points="0,-82 -7,-45 0,-34 7,-45" fill="${redInk}"/>
              <line x1="0" y1="-62" x2="-46" y2="-10" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>
              <line class="pf-arm-point" x1="0" y1="-62" x2="88" y2="-105" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>
              <line x1="0" y1="38" x2="-34" y2="122" stroke="${ink}" stroke-width="5.5" stroke-linecap="round"/>
              <line x1="0" y1="38" x2="34" y2="122" stroke="${ink}" stroke-width="5.5" stroke-linecap="round"/>
            </g>
            <!-- Candlesticks & rising line -->
            ${sticks
              .map(
                (st, si) => `<g class="pf-candle" data-delay="${(si * 0.14).toFixed(2)}">
                  <line x1="${st.x}" y1="${st.y - 26}" x2="${st.x}" y2="${st.y + st.h + 24}" stroke="${ink}" stroke-width="3"/>
                  <rect x="${st.x - 16}" y="${st.y}" width="32" height="${st.h}" rx="5" fill="${st.up ? greenInk : redInk}" stroke="${ink}" stroke-width="3"/>
                </g>`
              )
              .join('')}
            <path class="pf-curve" d="M 310 ${cardH - 110} C 410 ${cardH - 125}, 500 ${cardH - 220}, ${cardW - 95} 110" fill="none" stroke="${greenInk}" stroke-width="7" stroke-linecap="round" stroke-dasharray="900" stroke-dashoffset="900"/>
            ${sc.metricValue ? `<text x="${cardW - 80}" y="86" text-anchor="end" fill="${greenInk}" font-size="54" font-weight="950">${esc(sc.metricValue)}</text>` : ''}
            ${sc.metricLabel ? `<text x="${cardW - 80}" y="124" text-anchor="end" fill="${ink}" font-size="22" font-weight="800">${esc(sc.metricLabel)}</text>` : ''}
          </svg>
        </div>
        ${sc.spokenLine ? `<div class="pf-caption">${esc(sc.spokenLine)}</div>` : ''}
      </div>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${ctx.width}px; height: ${ctx.height}px; overflow: hidden;
    background: ${creamBg}; color: ${ink};
    font-family: Inter, system-ui, -apple-system, sans-serif;
  }
  #stage {
    position: relative; width: ${ctx.viewW}px; height: ${ctx.viewH}px;
    transform-origin: top left; transform: scale(${scaleFactor});
    background-color: ${creamBg};
    background-image: linear-gradient(rgba(28,25,23,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(28,25,23,0.06) 1px, transparent 1px);
    background-size: 40px 40px;
    overflow: hidden;
  }
  .pf-scene { position: absolute; inset: 0; pointer-events: none; }
  .pf-header { position: absolute; top: ${isVert ? 92 : 40}px; left: 70px; right: 70px; }
  .pf-badge {
    display: inline-block; padding: 7px 16px; background: ${ink}; color: ${creamBg};
    font-size: 20px; font-weight: 900; letter-spacing: 0.08em; margin-bottom: 14px;
  }
  .pf-title { font-size: ${isVert ? 56 : 44}px; font-weight: 950; line-height: 1.08; color: ${ink}; margin-bottom: 10px; }
  .pf-sub { font-size: ${isVert ? 28 : 23}px; color: #44403C; font-weight: 600; }
  .pf-board {
    position: absolute; left: 70px; right: 70px; top: ${isVert ? 390 : 220}px;
    background: #FFFDF7; border: 4px solid ${ink}; border-radius: 18px;
    box-shadow: 14px 14px 0px ${ink}; overflow: hidden; padding: 12px;
  }
  .pf-caption {
    position: absolute; left: 70px; right: 70px; bottom: ${isVert ? 120 : 42}px;
    background: #FFFDF7; color: ${ink}; border: 3.5px solid ${ink}; border-radius: 14px;
    box-shadow: 8px 8px 0px ${ink}; padding: 20px 28px;
    font-size: 27px; font-weight: 800; text-align: center; line-height: 1.35;
  }
</style>
</head>
<body>
<div id="stage">${sceneLayers}</div>
<script>
(function() {
  const SCENES = ${safeJson(ctx.scenes)};
  const TOTAL = ${ctx.totalDur};
  window.__dtSeek = function(timeSec) {
    const t = Math.max(0, Math.min(TOTAL, Number(timeSec) || 0));
    SCENES.forEach(function(sc, idx) {
      const el = document.getElementById('scene_' + idx);
      if (!el) return;
      const active = t >= sc.start && (t < sc.end || (idx === SCENES.length - 1 && t <= sc.end));
      el.style.opacity = active ? '1' : '0';
      if (!active) return;
      const localT = Math.max(0, t - sc.start);
      const curve = el.querySelector('.pf-curve');
      if (curve) {
        const cp = Math.min(1, localT / 1.2);
        curve.setAttribute('stroke-dashoffset', (900 * (1 - cp)).toFixed(1));
      }
      el.querySelectorAll('.pf-candle').forEach(function(c) {
        const d = Number(c.getAttribute('data-delay')) || 0;
        const op = Math.max(0, Math.min(1, (localT - d) / 0.25));
        c.setAttribute('opacity', op.toFixed(2));
      });
      const arm = el.querySelector('.pf-arm-point');
      if (arm) {
        const wy = -105 + Math.sin(t * 4.2) * 14;
        arm.setAttribute('y2', wy.toFixed(1));
      }
      const stick = document.getElementById('pf_stick_' + idx);
      if (stick) {
        const dy = (${isVert ? 420 : 250} + Math.sin(t * 3.1) * 5).toFixed(1);
        stick.setAttribute('transform', 'translate(135,' + dy + ')');
      }
    });
  };
  window.__dtSeek(0);
})();
</script>
</body>
</html>`;
}
