import type { ExtraPresetCompileContext, ExtraPresetScene } from './html-svg-presets-extra';

export interface HtmlSvgChartItem {
  label: string;
  value: number;
  color?: string;
}

export interface HtmlSvgV2Scene extends ExtraPresetScene {
  imageUrl?: string;
  mediaQuery?: string;
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

/** Avoids duplicate pill text like "1986 • 1986" when badge equals yearLabel. */
function formatSceneBadge(badge: string | undefined, fallbackPrefix: string, idx: number, yearLabel?: string): string {
  const b = String(badge || '').trim();
  const y = String(yearLabel || '').trim();
  if (!b && !y) return `${fallbackPrefix} 0${idx + 1}`;
  if (b && y && b.toLowerCase() === y.toLowerCase()) {
    return `${fallbackPrefix} 0${idx + 1} • ${y}`;
  }
  if (b && y) return `${b} • ${y}`;
  return b || y;
}

export function buildNetflixDocHtml(ctx: HtmlSvgV2CompileContext): string {
  const isVert = ctx.viewH > ctx.viewW;
  const scaleFactor = Number((ctx.width / ctx.viewW).toFixed(5));
  const bgHex = ctx.palette[0] || '#07080D';
  const accentHex = ctx.palette[1] || '#E50914';
  const goldHex = ctx.palette[2] || '#FACC15';

  const years = ctx.scenes.map((sc, i) => sc.yearLabel || sc.badge || `${2018 + i * 2}`);

  const frameBox = isVert
    ? { x: 64, y: 248, w: ctx.viewW - 128, h: 890 }
    : { x: 90, y: 180, w: ctx.viewW - 180, h: 520 };

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
      const badgeLabel = formatSceneBadge(sc.badge, 'ARQUIVO', i, yearText);
      const hasImg = Boolean(sc.imageUrl && String(sc.imageUrl).trim());
      const cx = (frameBox.w * 0.5).toFixed(0);
      const cy = (frameBox.h * 0.48).toFixed(0);
      const radOut = Math.min(frameBox.w, frameBox.h) * 0.31;
      const radIn = Math.min(frameBox.w, frameBox.h) * 0.18;

      const imgTag = hasImg
        ? `<img class="nd-photo" id="nd_photo_${i}" src="${esc(sc.imageUrl)}" alt="${esc(sc.title)}" />`
        : `<svg class="nd-photo nd-archival-svg" id="nd_photo_${i}" viewBox="0 0 ${frameBox.w} ${frameBox.h}">
            <defs>
              <pattern id="ndGrid${i}" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
              </pattern>
              <radialGradient id="ndRadGlow${i}" cx="50%" cy="48%" r="50%">
                <stop offset="0%" stop-color="${accentHex}" stop-opacity="0.24"/>
                <stop offset="100%" stop-color="#0B0E17" stop-opacity="0"/>
              </radialGradient>
            </defs>
            <rect width="${frameBox.w}" height="${frameBox.h}" fill="#0B0F1A"/>
            <rect width="${frameBox.w}" height="${frameBox.h}" fill="url(#ndGrid${i})"/>
            <rect width="${frameBox.w}" height="${frameBox.h}" fill="url(#ndRadGlow${i})"/>
            <circle cx="${cx}" cy="${cy}" r="${(radOut * 1.25).toFixed(1)}" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="1.5"/>
            <circle cx="${cx}" cy="${cy}" r="${radOut.toFixed(1)}" fill="none" stroke="${accentHex}" stroke-width="3" stroke-dasharray="12 8" opacity="0.78"/>
            <circle cx="${cx}" cy="${cy}" r="${radIn.toFixed(1)}" fill="rgba(229,9,20,0.14)" stroke="${goldHex}" stroke-width="2.5"/>
            <line x1="56" y1="${cy}" x2="${frameBox.w - 56}" y2="${cy}" stroke="rgba(250,204,21,0.32)" stroke-width="1.5"/>
            <line x1="${cx}" y1="56" x2="${cx}" y2="${frameBox.h - 56}" stroke="rgba(250,204,21,0.22)" stroke-width="1.5"/>
            <line class="nd-sweep" id="nd_sweep_${i}" x1="${cx}" y1="${cy}" x2="${Number(cx) + radOut}" y2="${cy}" stroke="${accentHex}" stroke-width="3" opacity="0.85"/>
            <rect x="${Number(cx) - 210}" y="${Number(cy) - 56}" width="420" height="118" rx="16" fill="rgba(7,8,13,0.82)" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
            <text x="${cx}" y="${Number(cy) + 6}" text-anchor="middle" fill="#F8FAFC" font-size="68" font-weight="900" letter-spacing="3">${esc(sc.metricValue || yearText)}</text>
            <text x="${cx}" y="${Number(cy) + 42}" text-anchor="middle" fill="${goldHex}" font-size="22" font-family="monospace" font-weight="700">${esc(sc.metricLabel || sc.badge || 'ARQUIVO CONFIDENCIAL')}</text>
            <text x="58" y="${frameBox.h - 36}" fill="rgba(203,213,225,0.55)" font-size="18" font-family="monospace">REF // DOSSIÊ 0${i + 1} · CH-${String((i + 1) * 14).padStart(3, '0')}</text>
          </svg>`;

      const waveBars = Array.from({ length: 24 }, (_, wi) => {
        const bh = 10 + ((wi * 17 + i * 9) % 24);
        return `<span class="nd-wave-bar" data-base="${bh}" style="height:${bh}px"></span>`;
      }).join('');

      return `
      <div class="nd-scene" id="scene_${i}" style="opacity:${i === 0 ? 1 : 0}">
        <div class="nd-evidence-frame" style="left:${frameBox.x}px;top:${frameBox.y}px;width:${frameBox.w}px;height:${frameBox.h}px;">
          ${imgTag}
          <div class="nd-frame-vignette"></div>
          <div class="nd-classified-stamp">${esc(badgeLabel)}</div>
          ${sc.callout ? `<div class="nd-callout">${esc(sc.callout)}</div>` : ''}
        </div>
        <div class="nd-copy" style="top:${frameBox.y + frameBox.h + (isVert ? 38 : 22)}px;">
          <div class="nd-kicker">${esc(yearText)}${sc.metricLabel ? ` — ${esc(sc.metricLabel)}` : ''}</div>
          <h1 class="nd-title">${esc(sc.title)}</h1>
          ${sc.subtitle ? `<p class="nd-subtitle">${esc(sc.subtitle)}</p>` : ''}
        </div>
        ${
          isVert
            ? `<div class="nd-dossier-strip">
                 <span class="nd-strip-tag">EVIDÊNCIA 0${i + 1} / 0${ctx.scenes.length}</span>
                 <div class="nd-wave" id="nd_wave_${i}">${waveBars}</div>
                 <span class="nd-strip-meta">${esc(sc.metricValue || yearText)}</span>
               </div>`
            : ''
        }
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
    position: absolute; top: ${isVert ? 74 : 44}px; left: 64px; right: 64px;
    display: flex; align-items: center; justify-content: space-between; gap: 24px;
    border-bottom: 1px solid rgba(255,255,255,0.14); padding-bottom: 14px;
  }
  .nd-brand {
    display: inline-flex; align-items: center; gap: 12px; flex-shrink: 0;
    font-size: 22px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase;
  }
  .nd-rec-dot { width: 14px; height: 14px; border-radius: 50%; background: ${accentHex}; box-shadow: 0 0 16px ${accentHex}; }
  .nd-doc-title { font-size: 20px; font-weight: 600; color: #CBD5E1; letter-spacing: 0.05em; text-transform: uppercase; text-align: right; max-width: 58%; }
  .nd-timeline {
    position: absolute; top: ${isVert ? 150 : 104}px; left: 64px; right: 64px; height: 68px;
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
    position: absolute; border-radius: 18px; overflow: hidden;
    border: 2px solid rgba(255,255,255,0.18);
    box-shadow: 0 28px 65px rgba(0,0,0,0.68); background: #0B0E17;
  }
  .nd-photo { width: 100%; height: 100%; object-fit: cover; transform-origin: center center; display: block; filter: contrast(1.06) saturate(0.92); }
  .nd-frame-vignette {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.34) 0%, transparent 26%, transparent 66%, rgba(7,8,13,0.92) 100%);
  }
  .nd-classified-stamp {
    position: absolute; top: 20px; left: 22px; padding: 9px 18px; border-radius: 8px;
    background: rgba(7, 8, 13, 0.88); border: 1.5px solid ${accentHex};
    color: #FFFFFF; font-family: monospace; font-size: 20px; font-weight: 800; letter-spacing: 0.08em;
  }
  .nd-callout {
    position: absolute; right: 24px; bottom: 24px; padding: 11px 20px; border-radius: 10px;
    background: ${goldHex}; color: #111827; font-size: 22px; font-weight: 900; text-transform: uppercase;
  }
  .nd-copy { position: absolute; left: 64px; right: 64px; }
  .nd-kicker { font-family: monospace; font-size: 23px; font-weight: 800; color: ${accentHex}; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
  .nd-title { font-family: Georgia, "Times New Roman", serif; font-size: ${isVert ? 62 : 52}px; font-weight: 900; line-height: 1.07; color: #FFFFFF; margin-bottom: 14px; }
  .nd-subtitle { font-size: ${isVert ? 31 : 26}px; line-height: 1.38; color: #CBD5E1; font-weight: 500; }
  .nd-dossier-strip {
    position: absolute; left: 64px; right: 64px; bottom: 274px;
    display: flex; align-items: center; justify-content: space-between; gap: 18px;
    padding: 14px 22px; border-radius: 12px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12);
  }
  .nd-strip-tag { font-family: monospace; font-size: 19px; font-weight: 800; color: #94A3B8; letter-spacing: 0.08em; }
  .nd-wave { display: flex; align-items: center; gap: 6px; height: 34px; }
  .nd-wave-bar { width: 5px; border-radius: 3px; background: ${accentHex}; opacity: 0.85; }
  .nd-strip-meta { font-family: monospace; font-size: 20px; font-weight: 900; color: ${goldHex}; }
  .nd-caption {
    position: absolute; left: 64px; right: 64px; bottom: ${isVert ? 98 : 44}px;
    padding: 22px 30px; border-radius: 16px; background: rgba(15, 23, 42, 0.94);
    border-left: 7px solid ${accentHex}; border-top: 1px solid rgba(255,255,255,0.12);
    font-size: 29px; font-weight: 700; line-height: 1.36; color: #F8FAFC;
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
        const scZ = 1 + 0.14 * p;
        const panX = (idx % 2 === 0 ? -1 : 1) * 20 * (p - 0.5);
        const panY = -12 * (p - 0.5);
        photo.style.transform = 'scale(' + scZ.toFixed(4) + ') translate(' + panX.toFixed(1) + 'px,' + panY.toFixed(1) + 'px)';
      }
      const sweep = document.getElementById('nd_sweep_' + idx);
      if (sweep && active) {
        const cx = ${(frameBox.w * 0.5).toFixed(1)};
        const cy = ${(frameBox.h * 0.48).toFixed(1)};
        const r = ${Math.min(frameBox.w, frameBox.h) * 0.31};
        const ang = t * 1.45;
        sweep.setAttribute('x2', (cx + Math.cos(ang) * r).toFixed(1));
        sweep.setAttribute('y2', (cy + Math.sin(ang) * r).toFixed(1));
      }
      const wave = document.getElementById('nd_wave_' + idx);
      if (wave && active) {
        wave.querySelectorAll('.nd-wave-bar').forEach(function(bar, bi) {
          const base = Number(bar.getAttribute('data-base')) || 14;
          const h = Math.max(6, Math.round(base * (0.55 + 0.55 * Math.abs(Math.sin(t * 7 + bi * 0.7)))));
          bar.style.height = h + 'px';
        });
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
      const rotDeg = i % 2 === 0 ? -1.2 : 1.2;
      const badgeText = formatSceneBadge(sc.badge, 'EXPLICADOR', i, sc.yearLabel);
      const hasImg = Boolean(sc.imageUrl && String(sc.imageUrl).trim());
      const metricChip = sc.metricValue
        ? `<div class="vox-img-stat">
             <span class="vox-img-val">${esc(sc.metricValue)}</span>
             ${sc.metricLabel ? `<span class="vox-img-lbl">${esc(sc.metricLabel)}</span>` : ''}
           </div>`
        : '';

      const mediaSlot = hasImg
        ? `<img class="vox-cut-img" id="vox_img_${i}" src="${esc(sc.imageUrl)}" alt="${esc(sc.title)}" />
           <div class="vox-cut-halftone"></div>
           ${metricChip}`
        : `<svg class="vox-diagram-bg" viewBox="0 0 840 620" preserveAspectRatio="xMidYMid slice">
             <defs>
               <pattern id="vxDots${i}" width="24" height="24" patternUnits="userSpaceOnUse">
                 <circle cx="4" cy="4" r="2" fill="rgba(24,24,27,0.12)"/>
               </pattern>
             </defs>
             <rect width="840" height="620" fill="#EAE3D2"/>
             <rect width="840" height="620" fill="url(#vxDots${i})"/>
             <circle cx="420" cy="310" r="210" fill="#FFFDF8" stroke="${inkDark}" stroke-width="4" stroke-dasharray="16 10"/>
             <circle cx="420" cy="310" r="148" fill="rgba(253,224,71,0.38)" stroke="${accentHex}" stroke-width="3"/>
             <path d="M90 500 L260 390 L420 440 L590 280 L760 190" fill="none" stroke="${inkDark}" stroke-width="4" stroke-dasharray="8 8" opacity="0.35"/>
           </svg>
           <div class="vox-metric-cut">
             <div class="vox-metric-num">${esc(sc.metricValue || sc.badge || `#0${i + 1}`)}</div>
             <div class="vox-metric-lbl">${esc(sc.metricLabel || sc.yearLabel || 'DESTAQUE EDITORIAL')}</div>
           </div>`;

      return `
      <div class="vox-scene" id="scene_${i}" style="opacity:${i === 0 ? 1 : 0}">
        <div class="vox-paper-card" id="vox_card_${i}" data-base-rot="${rotDeg}">
          <div class="vox-tape vox-tape-l"></div>
          <div class="vox-tape vox-tape-r"></div>
          <div class="vox-badge-pill">${esc(badgeText)}</div>
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
        ${
          isVert
            ? `<div class="vox-footer-rule">
                 <span>CAPÍTULO 0${i + 1} DE 0${ctx.scenes.length}</span>
                 <span>PAPERCUT 12 FPS</span>
               </div>`
            : ''
        }
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
    position: absolute; top: ${isVert ? 66 : 36}px; left: 64px; right: 64px;
    display: flex; justify-content: space-between; align-items: center; gap: 24px;
    border-bottom: 3px solid ${inkDark}; padding-bottom: 14px;
  }
  .vox-tag {
    background: ${voxYellow}; color: ${inkDark}; padding: 8px 18px; flex-shrink: 0;
    font-weight: 900; font-size: 21px; letter-spacing: 0.08em; border: 2.5px solid ${inkDark};
  }
  .vox-doc {
    font-weight: 800; font-size: 21px; text-transform: uppercase; color: #3F3F46;
    text-align: right; max-width: 58%; line-height: 1.2;
  }
  .vox-scene { position: absolute; inset: 0; pointer-events: none; }
  .vox-paper-card {
    position: absolute;
    left: ${isVert ? 64 : 120}px; right: ${isVert ? 64 : 120}px;
    top: ${isVert ? 196 : 125}px;
    background: #FFFDF8; border: 4px solid ${inkDark};
    box-shadow: 16px 18px 0px ${inkDark};
    padding: ${isVert ? '48px 44px 52px' : '34px 44px'};
  }
  .vox-tape {
    position: absolute; top: -18px; width: 132px; height: 34px;
    background: rgba(253, 224, 71, 0.88); border: 2px solid rgba(24,24,27,0.35);
  }
  .vox-tape-l { left: 48px; transform: rotate(-6deg); }
  .vox-tape-r { right: 48px; transform: rotate(5deg); }
  .vox-badge-pill {
    display: inline-block; padding: 8px 18px; background: ${inkDark}; color: #FFFFFF;
    font-size: 21px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 20px;
  }
  .vox-headline { font-size: ${isVert ? 58 : 48}px; font-weight: 950; line-height: 1.1; margin-bottom: 18px; }
  .vox-hl-wrap { position: relative; display: inline-block; padding: 4px 10px; }
  .vox-marker {
    position: absolute; left: 0; top: 6%; bottom: 6%; width: 0%;
    background: ${voxYellow}; z-index: 0;
  }
  .vox-hl-text { position: relative; z-index: 1; }
  .vox-sub { font-size: ${isVert ? 31 : 25}px; line-height: 1.36; color: #27272A; font-weight: 600; margin-bottom: 26px; }
  .vox-cutout-box {
    position: relative;
    width: 100%; height: ${isVert ? 690 : 320}px;
    border: 3.5px solid ${inkDark}; background: #EAE3D2; overflow: hidden;
    box-shadow: 8px 8px 0px rgba(24,24,27,0.22);
    display: flex; align-items: center; justify-content: center;
  }
  .vox-diagram-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .vox-cut-img { width: 100%; height: 100%; object-fit: cover; filter: contrast(1.08) saturate(1.04); transform-origin: center center; }
  .vox-cut-halftone {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(180deg, transparent 58%, rgba(24,24,27,0.55) 100%);
  }
  .vox-img-stat {
    position: absolute; left: 22px; bottom: 22px; z-index: 2;
    background: #FFFDF8; border: 3px solid ${inkDark}; box-shadow: 6px 6px 0px ${inkDark};
    padding: 12px 20px; display: inline-flex; flex-direction: column; gap: 2px;
  }
  .vox-img-val { font-size: 38px; font-weight: 950; color: ${accentHex}; line-height: 1; }
  .vox-img-lbl { font-size: 17px; font-weight: 800; color: ${inkDark}; text-transform: uppercase; letter-spacing: 0.06em; }
  .vox-metric-cut { position: relative; z-index: 1; text-align: center; padding: 24px; }
  .vox-metric-num { font-size: ${isVert ? 108 : 84}px; font-weight: 950; color: ${accentHex}; line-height: 1; margin-bottom: 14px; }
  .vox-metric-lbl { font-size: 27px; font-weight: 800; color: ${inkDark}; text-transform: uppercase; letter-spacing: 0.06em; }
  .vox-sticky {
    position: absolute; right: 32px; bottom: -26px; padding: 14px 24px;
    background: ${voxYellow}; border: 3px solid ${inkDark}; box-shadow: 6px 6px 0px ${inkDark};
    font-size: 23px; font-weight: 900; transform: rotate(-2.2deg);
  }
  .vox-caption {
    position: absolute; left: 64px; right: 64px; bottom: ${isVert ? 104 : 44}px;
    background: ${inkDark}; color: #FFFDF8; padding: 22px 30px;
    border: 3px solid ${voxYellow}; box-shadow: 10px 10px 0px rgba(0,0,0,0.25);
    font-size: 29px; font-weight: 800; line-height: 1.35; text-align: center;
  }
  .vox-footer-rule {
    position: absolute; left: 64px; right: 64px; bottom: 42px;
    display: flex; justify-content: space-between; align-items: center;
    font-family: monospace; font-size: 19px; font-weight: 800; color: #52525B;
    border-top: 2px dashed rgba(24,24,27,0.3); padding-top: 10px;
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
    const t = Math.floor(rawT * 12) / 12;
    SCENES.forEach(function(sc, idx) {
      const el = document.getElementById('scene_' + idx);
      if (!el) return;
      const active = rawT >= sc.start && (rawT < sc.end || (idx === SCENES.length - 1 && rawT <= sc.end));
      el.style.opacity = active ? '1' : '0';
      if (!active) return;
      const localStep = Math.max(0, t - sc.start);
      const p = Math.min(1, localStep / Math.max(0.5, sc.durationSec));
      const marker = document.getElementById('vox_marker_' + idx);
      if (marker) marker.style.width = (Math.min(1, localStep / 0.55) * 100).toFixed(1) + '%';
      const card = document.getElementById('vox_card_' + idx);
      if (card) {
        const baseRot = Number(card.getAttribute('data-base-rot')) || 0;
        const wobble = Math.sin(t * 4.5 + idx) * 0.65;
        const pop = Math.min(1, 0.94 + localStep * 0.25);
        card.style.transform = 'rotate(' + (baseRot + wobble).toFixed(2) + 'deg) scale(' + pop.toFixed(3) + ')';
      }
      const img = document.getElementById('vox_img_' + idx);
      if (img) {
        const z = 1.02 + 0.1 * p;
        img.style.transform = 'scale(' + z.toFixed(3) + ') translate(' + ((idx % 2 === 0 ? -1 : 1) * 10 * p).toFixed(1) + 'px,0px)';
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
      const chartW = isVert ? ctx.viewW - 180 : ctx.viewW - 260;
      const chartH = isVert ? 780 : 390;
      const leftAxisPad = 68;
      const plotW = chartW - leftAxisPad - 20;
      const baseY = chartH - 64;
      const topReserve = 128; // Reserved headroom above highest bar so numbers and trend line never cross
      const maxBarH = Math.max(120, baseY - topReserve);
      const slotW = plotW / items.length;
      const barW = Math.min(136, slotW * 0.54);

      let maxIdx = 0;
      items.forEach((it, bi) => {
        if (it.value >= items[maxIdx].value) maxIdx = bi;
      });

      const yTicks = [1, 0.5, 0]
        .map((ratio) => {
          const yPos = baseY - ratio * maxBarH;
          const labelVal = Math.round(maxVal * ratio);
          return `<g>
            <line x1="${leftAxisPad}" y1="${yPos.toFixed(1)}" x2="${chartW}" y2="${yPos.toFixed(1)}" stroke="${ratio === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)'}" stroke-width="${ratio === 0 ? 3 : 2}" ${ratio === 0 ? '' : 'stroke-dasharray="8 8"'}/>
            <text x="${leftAxisPad - 12}" y="${(yPos + 6).toFixed(1)}" text-anchor="end" fill="#64748B" font-size="18" font-family="monospace" font-weight="700">${labelVal}</text>
          </g>`;
        })
        .join('');

      const barsSvg = items
        .map((it, bi) => {
          const cx = leftAxisPad + slotW * bi + slotW * 0.5;
          const fullH = Math.max(26, (Math.abs(it.value) / maxVal) * maxBarH);
          const col = it.color || paletteBars[bi % paletteBars.length];
          return `
          <g class="kz-bar-grp" data-base-y="${baseY}" data-full-h="${fullH.toFixed(1)}" data-val="${it.value}" data-winner="${bi === maxIdx ? 1 : 0}">
            <rect class="kz-bar" x="${(cx - barW / 2).toFixed(1)}" y="${baseY}" width="${barW.toFixed(1)}" height="0" rx="12" fill="${col}" />
            <text class="kz-bar-val" x="${cx.toFixed(1)}" y="${(baseY - 18).toFixed(1)}" text-anchor="middle" fill="#FFFFFF" font-size="30" font-weight="900">0</text>
            <text x="${cx.toFixed(1)}" y="${(chartH - 18).toFixed(1)}" text-anchor="middle" fill="#CBD5E1" font-size="23" font-weight="700">${esc(it.label.slice(0, 14))}</text>
          </g>`;
        })
        .join('\n');

      // Place yellow trend line 68px ABOVE bar tops so numbers sitting at -18px have 50px clean clearance
      const trendCoords = items.map((it, bi) => {
        const cx = leftAxisPad + slotW * bi + slotW * 0.5;
        const fullH = Math.max(26, (Math.abs(it.value) / maxVal) * maxBarH);
        const ty = Math.max(24, baseY - fullH - 68);
        return { cx, ty };
      });
      const trendPoints = trendCoords.map((pt) => `${pt.cx.toFixed(1)},${pt.ty.toFixed(1)}`).join(' L ');
      const trendDots = trendCoords
        .map((pt, di) => `<circle class="kz-dot" data-idx="${di}" cx="${pt.cx.toFixed(1)}" cy="${pt.ty.toFixed(1)}" r="8" fill="#090D16" stroke="#FACC15" stroke-width="4" opacity="0"/>`)
        .join('');

      const badgeText = formatSceneBadge(sc.badge, 'DADO', i, sc.yearLabel);

      return `
      <div class="kz-scene" id="scene_${i}" style="opacity:${i === 0 ? 1 : 0}">
        <div class="kz-head">
          <span class="kz-pill">${esc(badgeText)}</span>
          <h1 class="kz-title">${esc(sc.title)}</h1>
          ${sc.subtitle ? `<p class="kz-sub">${esc(sc.subtitle)}</p>` : ''}
        </div>
        <div class="kz-chart-card" id="kz_card_${i}">
          <div class="kz-card-header">
            <span class="kz-axis-title">${esc(sc.metricLabel || 'COMPARATIVO DIRETO')}</span>
            ${sc.metricValue ? `<div class="kz-kpi">${esc(sc.metricValue)}</div>` : ''}
          </div>
          <svg viewBox="0 0 ${chartW} ${chartH}" width="${chartW}" height="${chartH}">
            ${yTicks}
            ${barsSvg}
            <path class="kz-trend" d="M ${trendPoints}" fill="none" stroke="#FACC15" stroke-width="5" stroke-linecap="round" stroke-dasharray="1600" stroke-dashoffset="1600"/>
            ${trendDots}
          </svg>
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
  .kz-head { position: absolute; top: ${isVert ? 86 : 42}px; left: 64px; right: 64px; }
  .kz-pill {
    display: inline-block; padding: 8px 18px; border-radius: 999px;
    background: rgba(56,189,248,0.16); border: 1.5px solid ${accentHex};
    color: ${accentHex}; font-size: 21px; font-weight: 800; letter-spacing: 0.08em; margin-bottom: 14px;
  }
  .kz-title { font-size: ${isVert ? 56 : 46}px; font-weight: 900; line-height: 1.08; color: #FFFFFF; margin-bottom: 10px; }
  .kz-sub { font-size: ${isVert ? 29 : 24}px; color: #94A3B8; line-height: 1.34; }
  .kz-chart-card {
    position: absolute; left: 64px; right: 64px; top: ${isVert ? 390 : 230}px;
    padding: 26px 26px 22px; border-radius: 24px;
    background: rgba(15, 23, 42, 0.88); border: 1.5px solid rgba(255,255,255,0.16);
    box-shadow: 0 24px 60px rgba(0,0,0,0.5); transform-origin: center center;
  }
  .kz-card-header {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding-bottom: 18px; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.12);
  }
  .kz-axis-title {
    font-family: monospace; font-size: 20px; font-weight: 800; letter-spacing: 0.08em;
    text-transform: uppercase; color: #94A3B8;
  }
  .kz-kpi {
    padding: 10px 22px; border-radius: 12px; flex-shrink: 0;
    background: ${secHex}; color: #052E16; font-size: 30px; font-weight: 950;
  }
  .kz-caption {
    position: absolute; left: 64px; right: 64px; bottom: ${isVert ? 110 : 44}px;
    padding: 22px 30px; border-radius: 16px;
    background: rgba(9, 13, 22, 0.94); border: 1.5px solid rgba(56,189,248,0.45);
    font-size: 28px; font-weight: 700; text-align: center; line-height: 1.35;
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
      el.querySelectorAll('.kz-bar-grp').forEach(function(grp) {
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
          txt.setAttribute('y', (baseY - curH - 18).toFixed(1));
          txt.textContent = String(Math.round(targetVal * grow));
        }
      });
      const trend = el.querySelector('.kz-trend');
      if (trend) {
        const lineP = easeOutCubic(Math.max(0, localT - 0.35) / 1.0);
        trend.setAttribute('stroke-dashoffset', String((1600 * (1 - lineP)).toFixed(1)));
      }
      el.querySelectorAll('.kz-dot').forEach(function(dot, di) {
        const dp = Math.max(0, Math.min(1, (localT - 0.4 - di * 0.22) / 0.25));
        dot.setAttribute('opacity', dp.toFixed(2));
      });
      const card = document.getElementById('kz_card_' + idx);
      if (card) {
        const camZoom = 1 + 0.03 * easeOutCubic(localT / Math.max(1, sc.durationSec));
        const camX = Math.sin(localT * 0.85) * 6;
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
  const goldInk = '#CA8A04';

  const sceneLayers = ctx.scenes
    .map((sc, i) => {
      const cardW = isVert ? ctx.viewW - 152 : ctx.viewW - 240;
      const cardH = isVert ? 740 : 360;
      const mode = i % 3;
      const badgeText = formatSceneBadge(sc.badge, 'LIÇÃO', i, sc.yearLabel);

      let chartGraphics = '';
      if (mode === 1) {
        // Cena 2 / modo 1: Bola de Neve + Barras de Acúmulo Progressivo (visual distinto da cena 1)
        const cols = [
          { x: 350, h: 90, yr: 'ANO 1' },
          { x: 455, h: 165, yr: 'ANO 5' },
          { x: 560, h: 280, yr: 'ANO 10' },
          { x: 665, h: 430, yr: 'ANO 20' },
        ];
        const bars = cols
          .map((c, ci) => {
            const topY = cardH - 72 - c.h;
            return `<g class="pf-candle" data-delay="${(ci * 0.16).toFixed(2)}">
              <rect x="${c.x}" y="${topY}" width="64" height="${c.h}" rx="10" fill="${ci === cols.length - 1 ? greenInk : '#DCFCE7'}" stroke="${ink}" stroke-width="3.5"/>
              <text x="${c.x + 32}" y="${cardH - 36}" text-anchor="middle" fill="${ink}" font-size="20" font-weight="800">${c.yr}</text>
            </g>`;
          })
          .join('');
        chartGraphics = `
          ${bars}
          <circle class="pf-snowball" cx="697" cy="${cardH - 555}" r="42" fill="#FEF08A" stroke="${ink}" stroke-width="4"/>
          <path class="pf-curve" d="M 330 ${cardH - 125} Q 490 ${cardH - 190}, 697 ${cardH - 555}" fill="none" stroke="${goldInk}" stroke-width="6" stroke-dasharray="900" stroke-dashoffset="900"/>
        `;
      } else if (mode === 2) {
        // Cena 3 / modo 2: Comparação Reta Linear vs Curva Exponencial
        chartGraphics = `
          <path class="pf-curve" d="M 320 ${cardH - 95} L ${cardW - 80} ${cardH - 255}" fill="none" stroke="${redInk}" stroke-width="6" stroke-dasharray="14 10"/>
          <path class="pf-curve" d="M 320 ${cardH - 95} C 470 ${cardH - 115}, 560 ${cardH - 265}, ${cardW - 80} 105" fill="none" stroke="${greenInk}" stroke-width="8" stroke-linecap="round" stroke-dasharray="900" stroke-dashoffset="900"/>
          <rect x="340" y="95" width="210" height="44" rx="8" fill="#DCFCE7" stroke="${greenInk}" stroke-width="2.5"/>
          <text x="445" y="124" text-anchor="middle" fill="${greenInk}" font-size="21" font-weight="900">COMPOSTO</text>
          <rect x="340" y="152" width="210" height="44" rx="8" fill="#FEE2E2" stroke="${redInk}" stroke-width="2.5"/>
          <text x="445" y="181" text-anchor="middle" fill="${redInk}" font-size="21" font-weight="900">LINEAR</text>
        `;
      } else {
        // Modo 0: Candlesticks ascendentes bem espaçados (sem texto por cima!)
        const sticks = [
          { x: 345, y: Math.round(cardH * 0.56), h: 85, up: true },
          { x: 435, y: Math.round(cardH * 0.50), h: 92, up: false },
          { x: 525, y: Math.round(cardH * 0.42), h: 120, up: true },
          { x: 615, y: Math.round(cardH * 0.30), h: 145, up: true },
          { x: 705, y: Math.round(cardH * 0.16), h: 175, up: true },
        ];
        chartGraphics = `
          ${sticks
            .map(
              (st, si) => `<g class="pf-candle" data-delay="${(si * 0.14).toFixed(2)}">
                <line x1="${st.x}" y1="${st.y - 28}" x2="${st.x}" y2="${st.y + st.h + 26}" stroke="${ink}" stroke-width="3.5"/>
                <rect x="${st.x - 20}" y="${st.y}" width="40" height="${st.h}" rx="7" fill="${st.up ? greenInk : redInk}" stroke="${ink}" stroke-width="3.5"/>
              </g>`
            )
            .join('')}
          <path class="pf-curve" d="M 310 ${cardH - 96} C 430 ${cardH - 130}, 560 ${cardH - 290}, ${cardW - 65} 92" fill="none" stroke="${greenInk}" stroke-width="8" stroke-linecap="round" stroke-dasharray="900" stroke-dashoffset="900"/>
        `;
      }

      const armLeftEnd = mode === 1 ? 'x2="-68" y2="-112"' : 'x2="-48" y2="-12"';
      const mouthPath =
        sc.expression === 'shocked'
          ? 'M-8,-108 A8,10 0 1,0 8,-108 A8,10 0 1,0 -8,-108 Z'
          : 'M-13,-108 Q0,-96 13,-108';

      return `
      <div class="pf-scene" id="scene_${i}" style="opacity:${i === 0 ? 1 : 0}">
        <div class="pf-header">
          <div class="pf-badge">${esc(badgeText)}</div>
          <h1 class="pf-title">${esc(sc.title)}</h1>
          ${sc.subtitle ? `<p class="pf-sub">${esc(sc.subtitle)}</p>` : ''}
        </div>
        <div class="pf-board">
          <div class="pf-board-top">
            <span class="pf-board-kicker">${mode === 1 ? 'EFEITO BOLA DE NEVE' : mode === 2 ? 'COMPARATIVO DE CURVA' : 'EVOLUÇÃO DOS APORTES'}</span>
            ${
              sc.metricValue || sc.metricLabel
                ? `<div class="pf-board-kpi">
                     ${sc.metricValue ? `<span class="pf-kpi-val">${esc(sc.metricValue)}</span>` : ''}
                     ${sc.metricLabel ? `<span class="pf-kpi-lbl">${esc(sc.metricLabel)}</span>` : ''}
                   </div>`
                : ''
            }
          </div>
          <svg viewBox="0 0 ${cardW} ${cardH}" width="${cardW}" height="${cardH}">
            <line x1="270" y1="36" x2="270" y2="${cardH - 60}" stroke="rgba(28,25,23,0.18)" stroke-width="3"/>
            <line x1="270" y1="${cardH - 60}" x2="${cardW - 32}" y2="${cardH - 60}" stroke="${ink}" stroke-width="4"/>
            <g class="pf-stickman" id="pf_stick_${i}" transform="translate(135, ${isVert ? 460 : 230})">
              <circle cx="0" cy="-124" r="36" fill="#FFFDF7" stroke="${ink}" stroke-width="5"/>
              <circle cx="-11" cy="-129" r="4.5" fill="${ink}"/>
              <circle cx="11" cy="-129" r="4.5" fill="${ink}"/>
              <path d="${mouthPath}" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>
              <line x1="0" y1="-88" x2="0" y2="42" stroke="${ink}" stroke-width="5.5" stroke-linecap="round"/>
              <polygon points="0,-84 -8,-44 0,-32 8,-44" fill="${redInk}"/>
              <line x1="0" y1="-64" ${armLeftEnd} stroke="${ink}" stroke-width="5.5" stroke-linecap="round"/>
              <line class="pf-arm-point" x1="0" y1="-64" x2="92" y2="-112" stroke="${ink}" stroke-width="5.5" stroke-linecap="round"/>
              <line x1="0" y1="42" x2="-36" y2="128" stroke="${ink}" stroke-width="5.5" stroke-linecap="round"/>
              <line x1="0" y1="42" x2="36" y2="128" stroke="${ink}" stroke-width="5.5" stroke-linecap="round"/>
            </g>
            ${chartGraphics}
          </svg>
        </div>
        ${sc.spokenLine ? `<div class="pf-caption">${esc(sc.spokenLine)}</div>` : ''}
        ${
          isVert
            ? `<div class="pf-footer">
                 <span>CADERNO FINANCEIRO · PÁG. 0${i + 1}/0${ctx.scenes.length}</span>
                 <span>JUROS & TEMPO</span>
               </div>`
            : ''
        }
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
  .pf-header { position: absolute; top: ${isVert ? 78 : 36}px; left: 64px; right: 64px; }
  .pf-badge {
    display: inline-block; padding: 7px 16px; background: ${ink}; color: ${creamBg};
    font-size: 20px; font-weight: 900; letter-spacing: 0.08em; margin-bottom: 14px;
  }
  .pf-title { font-size: ${isVert ? 56 : 44}px; font-weight: 950; line-height: 1.08; color: ${ink}; margin-bottom: 10px; }
  .pf-sub { font-size: ${isVert ? 28 : 23}px; color: #44403C; font-weight: 600; }
  .pf-board {
    position: absolute; left: 64px; right: 64px; top: ${isVert ? 378 : 210}px;
    background: #FFFDF7; border: 4px solid ${ink}; border-radius: 18px;
    box-shadow: 14px 14px 0px ${ink}; overflow: hidden; padding: 18px 14px 10px;
  }
  .pf-board-top {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;
    padding: 0 18px 16px; margin-bottom: 8px; border-bottom: 2.5px dashed rgba(28,25,23,0.2);
  }
  .pf-board-kicker {
    font-family: monospace; font-size: 19px; font-weight: 800; color: #57534E; letter-spacing: 0.06em; padding-top: 6px;
  }
  .pf-board-kpi { text-align: right; display: flex; flex-direction: column; gap: 3px; }
  .pf-kpi-val { font-size: ${isVert ? 46 : 36}px; font-weight: 950; color: ${greenInk}; line-height: 1; }
  .pf-kpi-lbl { font-size: 19px; font-weight: 800; color: ${ink}; letter-spacing: 0.05em; text-transform: uppercase; }
  .pf-caption {
    position: absolute; left: 64px; right: 64px; bottom: ${isVert ? 104 : 42}px;
    background: #FFFDF7; color: ${ink}; border: 3.5px solid ${ink}; border-radius: 14px;
    box-shadow: 8px 8px 0px ${ink}; padding: 22px 30px;
    font-size: 28px; font-weight: 800; text-align: center; line-height: 1.35;
  }
  .pf-footer {
    position: absolute; left: 64px; right: 64px; bottom: 44px;
    display: flex; justify-content: space-between; align-items: center;
    font-family: monospace; font-size: 18px; font-weight: 800; color: #57534E;
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
      el.querySelectorAll('.pf-curve').forEach(function(curve) {
        const cp = Math.min(1, localT / 1.2);
        curve.setAttribute('stroke-dashoffset', (900 * (1 - cp)).toFixed(1));
      });
      el.querySelectorAll('.pf-candle').forEach(function(c) {
        const d = Number(c.getAttribute('data-delay')) || 0;
        const op = Math.max(0, Math.min(1, (localT - d) / 0.25));
        c.setAttribute('opacity', op.toFixed(2));
      });
      const snow = el.querySelector('.pf-snowball');
      if (snow) {
        const sr = 24 + Math.min(1, localT / 1.5) * 24;
        snow.setAttribute('r', sr.toFixed(1));
      }
      const arm = el.querySelector('.pf-arm-point');
      if (arm) {
        const wy = -112 + Math.sin(t * 4.2) * 14;
        arm.setAttribute('y2', wy.toFixed(1));
      }
      const stick = document.getElementById('pf_stick_' + idx);
      if (stick) {
        const dy = (${isVert ? 460 : 230} + Math.sin(t * 3.1) * 5).toFixed(1);
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
