export type TechCrimsonVisual =
  | 'pc_ram'
  | 'giant_matrix'
  | 'binary_target'
  | 'cpu_chip'
  | 'node_tree'
  | 'memory_corridor'
  | 'dual_monitors'
  | 'repo_night';

export type Diorama3dMode = 'rural_plot' | 'storefront' | 'cutaway_oven';

export interface ExtraPresetScene {
  index: number;
  start: number;
  end: number;
  durationSec: number;
  title: string;
  subtitle: string;
  spokenLine: string;
  badge: string;
  metricValue: string;
  metricLabel: string;
  visual?: TechCrimsonVisual;
  callout?: string;
}

export interface ExtraPresetCharacter {
  id: string;
  name: string;
  skinColor?: string;
  hairColor?: string;
  shirtColor?: string;
}

export interface ExtraPresetCompileContext {
  title: string;
  width: number;
  height: number;
  viewW: number;
  viewH: number;
  totalDur: number;
  palette: [string, string, string];
  scenes: ExtraPresetScene[];
  characters: ExtraPresetCharacter[];
  dioramaMode?: Diorama3dMode;
}

const TECH_VISUAL_ORDER: TechCrimsonVisual[] = [
  'pc_ram',
  'giant_matrix',
  'binary_target',
  'cpu_chip',
  'node_tree',
  'memory_corridor',
  'dual_monitors',
  'repo_night',
];

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function renderTechSceneGraphic(
  vis: TechCrimsonVisual,
  sc: ExtraPresetScene,
  accent: string,
  sec: string
): string {
  const safeVal = esc(sc.metricValue || sc.badge || '100%');
  const safeLbl = esc(sc.metricLabel || sc.subtitle || 'LOCAL');
  const safeLine = esc(sc.spokenLine || sc.subtitle || sc.title);
  const safeBadge = esc(sc.badge || 'MODO LOCAL');

  switch (vis) {
    case 'pc_ram':
      return `<g class="gfx-root" transform="translate(540,980)">
        <g transform="translate(0,-300) rotate(-3)">
          <rect x="-330" y="-85" width="660" height="170" rx="16" fill="#18080D" stroke="${accent}" stroke-width="5"/>
          <rect x="-250" y="-56" width="500" height="96" rx="10" fill="#EFE8D8"/>
          <rect x="-250" y="-56" width="500" height="16" rx="6" fill="${accent}"/>
          <text x="0" y="6" text-anchor="middle" fill="#12060A" font-size="48" font-weight="900">${safeVal}</text>
          <text x="0" y="34" text-anchor="middle" fill="#475569" font-size="19" font-weight="700" letter-spacing="3">${safeLbl}</text>
          <g class="ram-pins" fill="${sec}">
            ${Array.from({ length: 24 }, (_, k) => `<rect x="${-295 + k * 25}" y="62" width="14" height="22" rx="2"/>`).join('')}
          </g>
        </g>
        <g transform="translate(0,115)">
          <polygon points="180,-200 245,-175 245,255 180,220" fill="#B5AA92"/>
          <rect x="-220" y="-200" width="400" height="420" rx="12" fill="#E7DEC8" stroke="${accent}" stroke-opacity="0.35" stroke-width="3"/>
          <rect x="-175" y="-165" width="310" height="32" rx="6" fill="#D6CCB4" stroke="#A69C86" stroke-width="2"/>
          <rect x="-175" y="-118" width="310" height="32" rx="6" fill="#D6CCB4" stroke="#A69C86" stroke-width="2"/>
          <rect x="-110" y="-105" width="180" height="7" rx="3" fill="#1E1418"/>
          <circle cx="-135" cy="-42" r="22" fill="#D6CCB4" stroke="#857B68" stroke-width="3"/>
          <rect x="-92" y="-50" width="38" height="16" rx="8" fill="${accent}"/>
          <rect x="-42" y="-50" width="38" height="16" rx="8" fill="${sec}"/>
          <g transform="translate(0,105)">
            <circle cx="0" cy="0" r="102" fill="#14070B" stroke="#3B232B" stroke-width="6"/>
            <g class="spin-fan">
              ${Array.from({ length: 6 }, (_, k) => `<ellipse cx="0" cy="-48" rx="22" ry="44" fill="#521226" opacity="0.88" transform="rotate(${k * 60})"/>`).join('')}
            </g>
            <circle cx="0" cy="0" r="24" fill="#EFE8D8"/>
            <circle cx="0" cy="0" r="9" fill="${accent}"/>
          </g>
          <g transform="translate(110,196) rotate(-6)">
            <rect x="-145" y="-34" width="290" height="68" rx="12" fill="#14060A" stroke="${accent}" stroke-width="4"/>
            <text x="0" y="10" text-anchor="middle" fill="${accent}" font-size="30" font-weight="900" letter-spacing="3">${safeBadge}</text>
          </g>
        </g>
      </g>`;

    case 'giant_matrix':
      return `<g class="gfx-root" transform="translate(540,980)">
        <rect x="-290" y="-290" width="580" height="580" rx="28" fill="#12050A" stroke="${accent}" stroke-opacity="0.45" stroke-width="3"/>
        <g class="matrix-digits" font-family="monospace" font-size="20" fill="${accent}" opacity="0.42">
          ${Array.from({ length: 12 }, (_, r) =>
            Array.from({ length: 16 }, (_, c) => {
              const d = (r * 7 + c * 3 + sc.index) % 10;
              return `<text x="${-250 + c * 33}" y="${-240 + r * 44}" text-anchor="middle">${d}</text>`;
            }).join('')
          ).join('')}
        </g>
        <path d="M-120,-240 L-120,-330 L120,-330 L120,-240 L215,-200 L215,65 L145,65 L145,270 L20,270 L20,115 L-20,115 L-20,270 L-145,270 L-145,65 L-215,65 L-215,-200 Z"
          fill="none" stroke="${accent}" stroke-width="4"/>
        <circle cx="-42" cy="-288" r="10" fill="${sec}"/>
        <circle cx="42" cy="-288" r="10" fill="${sec}"/>
        <rect x="-190" y="-82" width="380" height="168" rx="20" fill="#0B0306" stroke="${accent}" stroke-width="4"/>
        <text x="0" y="-4" text-anchor="middle" fill="${sec}" font-size="56" font-weight="900" letter-spacing="4">${safeVal}</text>
        <text x="0" y="54" text-anchor="middle" fill="#F8FAFC" font-size="24" font-weight="800" letter-spacing="3">${safeLbl}</text>
      </g>`;

    case 'binary_target':
      return `<g class="gfx-root" transform="translate(540,960)">
        <g stroke="${accent}" stroke-width="5" fill="none">
          <path d="M-210,-155 L-210,-210 L-155,-210"/>
          <path d="M155,-210 L210,-210 L210,-155"/>
          <path d="M-210,155 L-210,210 L-155,210"/>
          <path d="M155,210 L210,210 L210,155"/>
        </g>
        <g class="pulse-card">
          <path d="M-92,-128 L42,-128 L92,-78 L92,128 L-92,128 Z" fill="#EFE8D8" stroke="${accent}" stroke-width="4"/>
          <polygon points="42,-128 92,-78 42,-78" fill="${accent}"/>
          <text x="0" y="14" text-anchor="middle" fill="#12050A" font-size="36" font-weight="900">${safeVal}</text>
          <text x="0" y="58" text-anchor="middle" fill="${accent}" font-size="20" font-family="monospace" font-weight="700">${safeLbl}</text>
        </g>
      </g>`;

    case 'cpu_chip':
      return `<g class="gfx-root" transform="translate(540,970)">
        ${Array.from({ length: 12 }, (_, k) => {
          const offset = -195 + k * 35;
          return `
            <rect x="${offset}" y="-280" width="14" height="36" rx="3" fill="${sec}"/>
            <rect x="${offset}" y="244" width="14" height="36" rx="3" fill="${sec}"/>
            <rect x="-280" y="${offset}" width="36" height="14" rx="3" fill="${sec}"/>
            <rect x="244" y="${offset}" width="36" height="14" rx="3" fill="${sec}"/>`;
        }).join('')}
        <rect x="-245" y="-245" width="490" height="490" rx="28" fill="#14060A" stroke="${accent}" stroke-width="5"/>
        <g class="cpu-traces" stroke="${accent}" stroke-width="3" stroke-dasharray="14 10" opacity="0.65">
          ${Array.from({ length: 12 }, (_, k) => {
            const ang = (k / 12) * Math.PI * 2;
            return `<line x1="${(Math.cos(ang) * 95).toFixed(1)}" y1="${(Math.sin(ang) * 95).toFixed(1)}" x2="${(Math.cos(ang) * 225).toFixed(1)}" y2="${(Math.sin(ang) * 225).toFixed(1)}"/>`;
          }).join('')}
        </g>
        <rect x="-112" y="-112" width="224" height="224" rx="22" fill="#EFE8D8" stroke="${accent}" stroke-width="4"/>
        <rect x="-54" y="-82" width="108" height="10" rx="5" fill="${accent}"/>
        <text x="0" y="14" text-anchor="middle" fill="#12050A" font-size="60" font-weight="900">CPU</text>
        <text x="0" y="60" text-anchor="middle" fill="#475569" font-size="24" font-family="monospace" font-weight="700">${safeVal}</text>
      </g>`;

    case 'node_tree':
      return `<g class="gfx-root" transform="translate(540,940)">
        <rect x="-290" y="-210" width="580" height="220" rx="24" fill="#EFE8D8" stroke="${accent}" stroke-width="5"/>
        <polygon points="-32,10 32,10 0,58" fill="#EFE8D8" stroke="${accent}" stroke-width="4"/>
        <text x="-240" y="-155" fill="${accent}" font-size="18" font-family="monospace" font-weight="700">// ${safeBadge}</text>
        <circle class="dot-1" cx="-62" cy="-94" r="18" fill="${accent}"/>
        <circle class="dot-2" cx="0" cy="-94" r="18" fill="#B91C1C"/>
        <circle class="dot-3" cx="62" cy="-94" r="18" fill="#2B141A"/>
        <g stroke="${accent}" stroke-width="4" fill="none">
          <path d="M0,58 L0,210"/>
          <path d="M0,120 L-145,195"/>
          <path d="M0,165 L145,235 L205,235"/>
          <path d="M0,210 L-85,305"/>
        </g>
        <circle cx="-145" cy="195" r="9" fill="#FFFFFF"/>
        <circle cx="205" cy="235" r="9" fill="${sec}"/>
        <circle cx="-85" cy="305" r="9" fill="#FFFFFF"/>
      </g>`;

    case 'memory_corridor':
      return `<g class="gfx-root" transform="translate(540,950)">
        <g stroke="${accent}" stroke-width="2.5" opacity="0.55" fill="none">
          <rect x="-240" y="-260" width="480" height="410"/>
          <line x1="-480" y1="-440" x2="-240" y2="-260"/>
          <line x1="480" y1="-440" x2="240" y2="-260"/>
          <line x1="-480" y1="260" x2="-240" y2="150"/>
          <line x1="480" y1="260" x2="240" y2="150"/>
        </g>
        <g class="float-crate" transform="translate(0,-60)">
          <rect x="-86" y="-86" width="172" height="172" rx="12" fill="#18070C" stroke="${accent}" stroke-width="4"/>
          <line x1="-66" y1="-28" x2="66" y2="-28" stroke="${accent}" stroke-width="3"/>
          <line x1="-66" y1="28" x2="66" y2="28" stroke="${accent}" stroke-width="3"/>
          <line x1="-66" y1="-28" x2="66" y2="28" stroke="${accent}" stroke-width="3"/>
          <rect x="20" y="40" width="52" height="26" rx="4" fill="#EFE8D8"/>
          <text x="46" y="59" text-anchor="middle" fill="#12050A" font-size="16" font-weight="900">K3</text>
        </g>
        <polygon points="-320,210 320,210 360,248 -360,248" fill="#EFE8D8"/>
        <rect x="-290" y="256" width="580" height="84" rx="10" fill="#12050A" stroke="${accent}" stroke-width="3"/>
        <text x="0" y="310" text-anchor="middle" fill="#FFFFFF" font-size="38" font-weight="900" letter-spacing="6">${safeBadge}</text>
        <g transform="translate(0,415)">
          <text x="-300" y="-22" fill="rgba(255,255,255,0.75)" font-size="22" font-weight="700">${safeLbl}</text>
          <text x="300" y="-22" text-anchor="end" fill="${sec}" font-size="40" font-weight="900">${safeVal}</text>
          <rect x="-300" y="0" width="600" height="28" rx="14" fill="#1B0A10" stroke="${accent}" stroke-width="3"/>
          <rect class="corridor-bar" x="-296" y="4" width="380" height="20" rx="10" fill="${accent}"/>
        </g>
      </g>`;

    case 'dual_monitors':
      return `<g class="gfx-root" transform="translate(540,980)">
        <g transform="translate(-210,120)">
          <rect x="-175" y="-115" width="350" height="235" rx="18" fill="#EFE8D8"/>
          <rect x="-148" y="-90" width="296" height="175" rx="10" fill="#BE123C"/>
          <rect x="-26" y="120" width="52" height="44" fill="#D6CCB4"/>
          <rect x="-96" y="162" width="192" height="18" rx="9" fill="#EFE8D8"/>
          <text x="0" y="-24" text-anchor="middle" fill="#FFFFFF" font-size="21" font-weight="800">${safeLine.slice(0, 26)}</text>
          <text x="0" y="18" text-anchor="middle" fill="${sec}" font-size="22" font-weight="900">${safeLbl}</text>
          <text x="0" y="232" text-anchor="middle" fill="#FFFFFF" font-size="34" font-weight="900">8 GB</text>
        </g>
        <g transform="translate(210,120)">
          <rect x="-175" y="-115" width="350" height="235" rx="18" fill="#EFE8D8"/>
          <rect x="-148" y="-90" width="296" height="175" rx="10" fill="#E11D48"/>
          <rect x="-26" y="120" width="52" height="44" fill="#D6CCB4"/>
          <rect x="-96" y="162" width="192" height="18" rx="9" fill="#EFE8D8"/>
          <text x="0" y="-24" text-anchor="middle" fill="#FFFFFF" font-size="21" font-weight="800">${safeLine.slice(0, 26)}</text>
          <text x="0" y="18" text-anchor="middle" fill="${sec}" font-size="22" font-weight="900">${safeLbl}</text>
          <text x="0" y="232" text-anchor="middle" fill="#FFFFFF" font-size="34" font-weight="900">128 GB</text>
        </g>
        <g class="quality-seal" transform="translate(0,-95)">
          <circle cx="0" cy="0" r="132" fill="${accent}" stroke="#EFE8D8" stroke-width="10" stroke-dasharray="16 8"/>
          <text x="0" y="8" text-anchor="middle" fill="#FFFFFF" font-size="62" font-weight="900">${safeVal}</text>
          <text x="0" y="54" text-anchor="middle" fill="${sec}" font-size="24" font-weight="900" letter-spacing="2">QUALIDADE</text>
        </g>
      </g>`;

    case 'repo_night':
    default:
      return `<g class="gfx-root" transform="translate(540,1040)">
        <circle cx="155" cy="-215" r="145" fill="#EFE8D8" opacity="0.94"/>
        <g fill="#12060B">
          <polygon points="-380,175 -310,-15 -240,175"/>
          <polygon points="-240,175 -165,-65 -90,175"/>
          <polygon points="105,175 180,-45 255,175"/>
          <polygon points="245,175 320,10 395,175"/>
        </g>
        <path d="M-110,175 L-70,-18 Q0,-95 70,-18 L110,175 Z" fill="#0B0306" stroke="${accent}" stroke-opacity="0.55" stroke-width="3"/>
        <ellipse cx="0" cy="-28" rx="44" ry="38" fill="#18080E"/>
        <circle cx="-16" cy="-30" r="7" fill="#EFE8D8"/>
        <circle cx="16" cy="-30" r="7" fill="#EFE8D8"/>
        <rect x="-105" y="42" width="210" height="128" rx="14" fill="${accent}" stroke="#EFE8D8" stroke-width="4"/>
        <circle cx="0" cy="96" r="24" fill="#EFE8D8"/>
        <circle cx="-8" cy="94" r="4" fill="#12050A"/>
        <circle cx="8" cy="94" r="4" fill="#12050A"/>
        <text x="0" y="148" text-anchor="middle" fill="#FFFFFF" font-size="18" font-family="monospace" font-weight="800">${safeBadge}</text>
        <rect x="-340" y="250" width="680" height="72" rx="36" fill="#15070C" stroke="#EFE8D8" stroke-opacity="0.7" stroke-width="2.5"/>
        <text x="0" y="295" text-anchor="middle" fill="#FFFFFF" font-size="24" font-family="monospace" font-weight="700">${esc(sc.subtitle || sc.spokenLine || sc.title)}</text>
      </g>`;
  }
}

/**
 * Compila o preset Tech Dark Crimson SVG (inspirado em `Df42O-8skg_`) para renderizacao deterministica $0.
 */
export function buildTechCrimsonHtml(ctx: ExtraPresetCompileContext): string {
  const [bgHex, accentHex, secHex] = ctx.palette;
  const scaleFactor = (ctx.width / ctx.viewW).toFixed(6);

  const sceneLayers = ctx.scenes
    .map((sc) => {
      const vis = sc.visual || TECH_VISUAL_ORDER[sc.index % TECH_VISUAL_ORDER.length];
      const gfx = renderTechSceneGraphic(vis, sc, accentHex, secHex);
      return `
      <div class="tc-scene" id="scene_${sc.index}" style="opacity:${sc.index === 0 ? 1 : 0}">
        <div class="tc-header">
          <div class="tc-subhead">${esc(sc.subtitle || ctx.title)}</div>
          <h1 class="tc-title">${esc(sc.title)}</h1>
        </div>
        <svg class="tc-svg" viewBox="0 0 ${ctx.viewW} ${ctx.viewH}">
          ${gfx}
        </svg>
        ${
          sc.spokenLine && vis !== 'dual_monitors'
            ? `<div class="tc-caption">${esc(sc.spokenLine)}</div>`
            : ''
        }
        <div class="tc-hud-footer">
          <span>// ${esc(sc.badge || `CENA ${sc.index + 1}`)}</span>
          <span>${esc(sc.metricValue || `${sc.durationSec.toFixed(1)}S`)}</span>
        </div>
      </div>`;
    })
    .join('\n');

  const particles = Array.from({ length: 28 }, (_, i) => {
    const x = ((i * 197 + 83) % (ctx.viewW - 80)) + 40;
    const y = ((i * 313 + 127) % (ctx.viewH - 120)) + 60;
    const r = (i % 3) + 2;
    const col = i % 3 === 0 ? accentHex : i % 3 === 1 ? '#EFE8D8' : secHex;
    return `<circle class="pt" data-bx="${x}" data-by="${y}" data-sp="${(0.6 + (i % 5) * 0.25).toFixed(2)}" cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="0.32"/>`;
  }).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${ctx.width}px;
    height: ${ctx.height}px;
    overflow: hidden;
    background: ${bgHex};
    color: #F8FAFC;
    font-family: Inter, system-ui, -apple-system, sans-serif;
  }
  #stage {
    position: relative;
    width: ${ctx.viewW}px;
    height: ${ctx.viewH}px;
    transform-origin: top left;
    transform: scale(${scaleFactor});
    background: radial-gradient(circle at 50% 42%, #240912 0%, ${bgHex} 72%);
    overflow: hidden;
  }
  #bg-particles {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .tc-scene {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .tc-header {
    position: absolute;
    top: 118px;
    left: 72px;
    right: 72px;
    text-align: center;
  }
  .tc-subhead {
    font-size: 32px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #FFFFFF;
    margin-bottom: 10px;
  }
  .tc-title {
    font-size: 56px;
    font-weight: 900;
    line-height: 1.06;
    text-transform: uppercase;
    color: ${accentHex};
    text-shadow: 0 0 28px rgba(244,63,94,0.48);
  }
  .tc-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .tc-caption {
    position: absolute;
    left: 72px;
    right: 72px;
    bottom: 185px;
    padding: 18px 28px;
    border-radius: 16px;
    background: rgba(10, 4, 6, 0.84);
    border: 1.5px solid rgba(244, 63, 94, 0.45);
    text-align: center;
    font-size: 27px;
    font-weight: 700;
    line-height: 1.32;
    color: #F8FAFC;
  }
  .tc-hud-footer {
    position: absolute;
    left: 72px;
    right: 72px;
    bottom: 92px;
    padding-bottom: 14px;
    border-bottom: 1.5px solid rgba(244, 63, 94, 0.48);
    display: flex;
    justify-content: space-between;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 22px;
    font-weight: 700;
    color: rgba(248, 250, 252, 0.72);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  #progress-bar {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 10px;
    width: 100%;
    background: rgba(255,255,255,0.1);
  }
  #progress-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, ${secHex}, ${accentHex});
  }
</style>
</head>
<body>
<div id="stage">
  <svg id="bg-particles" viewBox="0 0 ${ctx.viewW} ${ctx.viewH}">
    ${particles}
  </svg>
  ${sceneLayers}
  <div id="progress-bar"><div id="progress-fill"></div></div>
</div>
<script>
(function() {
  const SCENES = ${JSON.stringify(ctx.scenes)};
  const TOTAL = ${ctx.totalDur};

  function spring(t) {
    if (t <= 0) return 0;
    const w0 = 14, z = 0.76, wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }

  window.__dtSeek = function(timeSec) {
    const t = Math.max(0, Math.min(TOTAL, Number(timeSec) || 0));
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = ((t / TOTAL) * 100).toFixed(2) + '%';

    document.querySelectorAll('#bg-particles .pt').forEach(function(p, idx) {
      const bx = Number(p.getAttribute('data-bx')) || 0;
      const by = Number(p.getAttribute('data-by')) || 0;
      const sp = Number(p.getAttribute('data-sp')) || 1;
      p.setAttribute('cy', ((by - t * 38 * sp + ${ctx.viewH} * 4) % ${ctx.viewH}).toFixed(1));
      p.setAttribute('cx', (bx + Math.sin(t * 1.3 + idx) * 12).toFixed(1));
    });

    SCENES.forEach(function(sc, idx) {
      const el = document.getElementById('scene_' + idx);
      if (!el) return;
      const active = t >= sc.start && (t < sc.end || (idx === SCENES.length - 1 && t <= sc.end));
      const localT = t - sc.start;
      const enter = idx === 0 && localT < 0.05 ? 1 : spring(localT);
      const fadeOut = idx < SCENES.length - 1 && (sc.end - t) < 0.18 ? Math.max(0, (sc.end - t) / 0.18) : 1;
      el.style.opacity = active ? (Math.min(1, enter) * fadeOut).toFixed(4) : '0';

      const gfx = el.querySelector('.gfx-root');
      if (gfx && active) {
        const scVal = 0.92 + 0.08 * Math.min(1, enter);
        const bob = Math.sin(t * 2.4 + idx) * 6;
        gfx.setAttribute('transform', 'translate(540,' + (960 + bob).toFixed(1) + ') scale(' + scVal.toFixed(4) + ')');
      }
      const fan = el.querySelector('.spin-fan');
      if (fan) fan.setAttribute('transform', 'rotate(' + ((t * 280) % 360).toFixed(1) + ')');
      const seal = el.querySelector('.quality-seal');
      if (seal) seal.setAttribute('transform', 'translate(0,-95) rotate(' + (Math.sin(t * 2.2) * 5).toFixed(2) + ')');
      const crate = el.querySelector('.float-crate');
      if (crate) crate.setAttribute('transform', 'translate(0,' + (-60 + Math.sin(t * 3) * 14).toFixed(1) + ')');
      const bar = el.querySelector('.corridor-bar');
      if (bar) bar.setAttribute('width', (180 + Math.min(1, localT / Math.max(1, sc.durationSec)) * 390).toFixed(1));
      const dots = [el.querySelector('.dot-1'), el.querySelector('.dot-2'), el.querySelector('.dot-3')];
      dots.forEach(function(d, di) {
        if (!d) return;
        const pulse = 13 + Math.abs(Math.sin(t * 6 - di * 0.9)) * 7;
        d.setAttribute('r', pulse.toFixed(1));
      });
    });
  };

  window.__dtSeek(0);
})();
</script>
</body>
</html>`;
}

/**
 * Compila o preset 3D Diorama + HUD HTML (inspirado em `Df5km_1MF3n`, `Df7YQhtNDnx` e `Df4khvmjKCw`).
 * Usa motor 3D Canvas em perspectiva com flat-shading, orbita suave de camera, personagens low-poly,
 * callouts ancorados e HUD em camadas HTML sem dependencia de WebGL/CDN externos.
 */
export function buildDiorama3dHtml(ctx: ExtraPresetCompileContext): string {
  const [bgHex, accentHex, secHex] = ctx.palette;
  const scaleFactor = (ctx.width / ctx.viewW).toFixed(6);
  const mode: Diorama3dMode = ctx.dioramaMode || 'rural_plot';
  const charA = ctx.characters[0] || {
    id: 'c1',
    name: 'Seu Tobias',
    skinColor: '#E6B89C',
    shirtColor: '#B91C1C',
    hairColor: '#CBD5E1',
  };
  const charB = ctx.characters[1] || {
    id: 'c2',
    name: 'Cliente',
    skinColor: '#C68B59',
    shirtColor: '#16A34A',
    hairColor: '#1E293B',
  };

  const hudLayers = ctx.scenes
    .map(
      (sc) => `
      <div class="d3-hud" id="hud_${sc.index}" style="opacity:${sc.index === 0 ? 1 : 0}">
        <div class="d3-top">
          <div class="d3-ep-pill">${esc(sc.badge || `CENA ${sc.index + 1}`)} • ${esc(ctx.title)}</div>
          ${
            sc.metricValue
              ? `<div class="d3-counter">
                   <div class="d3-counter-lbl">${esc(sc.metricLabel || 'ACUMULADO')}</div>
                   <div class="d3-counter-val">${esc(sc.metricValue)}</div>
                 </div>`
              : ''
          }
          <h1 class="d3-title">${esc(sc.title)}</h1>
          ${sc.subtitle ? `<p class="d3-sub">${esc(sc.subtitle)}</p>` : ''}
        </div>
        ${
          sc.callout
            ? `<div class="d3-callout" id="callout_${sc.index}">
                 <span class="d3-callout-dot">${sc.index + 1}</span>
                 <span>${esc(sc.callout)}</span>
               </div>`
            : ''
        }
        ${
          sc.spokenLine
            ? `<div class="d3-captions">${esc(sc.spokenLine)}</div>`
            : ''
        }
      </div>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${ctx.width}px;
    height: ${ctx.height}px;
    overflow: hidden;
    background: ${bgHex};
    color: #F8FAFC;
    font-family: Inter, system-ui, -apple-system, sans-serif;
  }
  #stage {
    position: relative;
    width: ${ctx.viewW}px;
    height: ${ctx.viewH}px;
    transform-origin: top left;
    transform: scale(${scaleFactor});
    background: radial-gradient(circle at 50% 35%, #16243D 0%, ${bgHex} 78%);
    overflow: hidden;
  }
  #canvas3d {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .d3-hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .d3-top {
    position: absolute;
    top: 86px;
    left: 64px;
    right: 64px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
  }
  .d3-ep-pill {
    padding: 12px 28px;
    border-radius: 999px;
    background: ${accentHex};
    color: #0F172A;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    box-shadow: 0 10px 26px rgba(0,0,0,0.35);
  }
  .d3-counter {
    padding: 16px 36px;
    border-radius: 22px;
    background: rgba(15, 23, 42, 0.88);
    border: 2.5px solid ${secHex};
    box-shadow: 0 12px 28px rgba(0,0,0,0.45);
  }
  .d3-counter-lbl {
    font-size: 18px;
    font-weight: 800;
    color: rgba(248, 250, 252, 0.72);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .d3-counter-val {
    margin-top: 4px;
    font-size: 48px;
    font-weight: 900;
    color: ${secHex};
    line-height: 1.05;
  }
  .d3-title {
    margin-top: 8px;
    font-size: 56px;
    font-weight: 900;
    line-height: 1.08;
    color: #FFFFFF;
    text-shadow: 0 4px 18px rgba(0,0,0,0.65);
  }
  .d3-sub {
    font-size: 28px;
    font-weight: 600;
    color: rgba(248, 250, 252, 0.86);
    text-shadow: 0 2px 10px rgba(0,0,0,0.65);
  }
  .d3-callout {
    position: absolute;
    left: 50%;
    top: 52%;
    transform: translate(-50%, -50%);
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 14px 24px;
    border-radius: 999px;
    background: #FFFFFF;
    color: #0F172A;
    font-size: 26px;
    font-weight: 800;
    box-shadow: 0 14px 32px rgba(0,0,0,0.45);
    border: 3px solid ${accentHex};
  }
  .d3-callout-dot {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: ${accentHex};
    color: #0F172A;
    display: grid;
    place-items: center;
    font-size: 18px;
    font-weight: 900;
  }
  .d3-captions {
    position: absolute;
    left: 64px;
    right: 64px;
    bottom: 136px;
    text-align: center;
    font-size: 44px;
    font-weight: 900;
    line-height: 1.15;
    text-transform: uppercase;
    color: #FFFFFF;
    -webkit-text-stroke: 3px #0B0F1A;
    paint-order: stroke fill;
    text-shadow: 0 8px 24px rgba(0,0,0,0.8);
  }
  #progress-bar {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 10px;
    width: 100%;
    background: rgba(255,255,255,0.14);
  }
  #progress-fill {
    height: 100%;
    width: 0%;
    background: ${accentHex};
  }
</style>
</head>
<body>
<div id="stage">
  <canvas id="canvas3d" width="${ctx.viewW}" height="${ctx.viewH}"></canvas>
  ${hudLayers}
  <div id="progress-bar"><div id="progress-fill"></div></div>
</div>
<script>
(function() {
  const SCENES = ${JSON.stringify(ctx.scenes)};
  const TOTAL = ${ctx.totalDur};
  const MODE = ${JSON.stringify(mode)};
  const CHAR_A = ${JSON.stringify(charA)};
  const CHAR_B = ${JSON.stringify(charB)};
  const canvas = document.getElementById('canvas3d');
  const g = canvas.getContext('2d');
  const W = ${ctx.viewW}, H = ${ctx.viewH};

  function hexToRgb(h) {
    const m = /^#?([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i.exec(h || '#888888');
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [136, 136, 136];
  }
  function shade(hex, k) {
    const [r, gr, b] = hexToRgb(hex);
    return 'rgb(' + Math.max(0, Math.min(255, Math.round(r * k))) + ',' +
      Math.max(0, Math.min(255, Math.round(gr * k))) + ',' +
      Math.max(0, Math.min(255, Math.round(b * k))) + ')';
  }

  function makeBox(faces, cx, cy, cz, sx, sy, sz, col) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const v = [
      [cx - hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz - hz],
      [cx + hx, cy + hy, cz - hz], [cx - hx, cy + hy, cz - hz],
      [cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz],
      [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz],
    ];
    const quads = [
      [[0, 1, 2, 3], 0.72],
      [[5, 4, 7, 6], 0.92],
      [[4, 0, 3, 7], 0.68],
      [[1, 5, 6, 2], 0.85],
      [[3, 2, 6, 7], 1.12],
      [[4, 5, 1, 0], 0.52],
    ];
    quads.forEach(function(q) {
      faces.push({ pts: q[0].map(function(i) { return v[i]; }), fill: shade(col, q[1]) });
    });
  }

  function makePyramid(faces, cx, cy, cz, r, h, sides, col) {
    const base = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      base.push([cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r]);
    }
    const top = [cx, cy + h, cz];
    for (let i = 0; i < sides; i++) {
      const n = (i + 1) % sides;
      const light = 0.72 + 0.36 * Math.max(0, Math.cos((i / sides) * Math.PI * 2 - 0.8));
      faces.push({ pts: [base[i], base[n], top], fill: shade(col, light) });
    }
  }

  function addPerson(faces, px, py, pz, ch, t, speaking) {
    const bob = speaking ? Math.abs(Math.sin(t * 5.2)) * 0.14 : Math.sin(t * 2) * 0.03;
    const armSw = speaking ? Math.sin(t * 6) * 0.28 : Math.sin(t * 2.2) * 0.06;
    const skin = ch.skinColor || '#E6B89C';
    const shirt = ch.shirtColor || '#DC2626';
    const hair = ch.hairColor || '#1E293B';
    makeBox(faces, px - 0.18, py + 0.45, pz, 0.24, 0.9, 0.26, '#1D4ED8');
    makeBox(faces, px + 0.18, py + 0.45, pz, 0.24, 0.9, 0.26, '#1D4ED8');
    makeBox(faces, px, py + 1.32 + bob, pz, 0.82, 0.9, 0.48, shirt);
    makeBox(faces, px - 0.56, py + 1.3 + bob + armSw * 0.25, pz + armSw, 0.22, 0.72, 0.22, shirt);
    makeBox(faces, px + 0.56, py + 1.3 + bob - armSw * 0.25, pz - armSw, 0.22, 0.72, 0.22, shirt);
    makeBox(faces, px, py + 2.08 + bob, pz, 0.54, 0.52, 0.5, skin);
    makeBox(faces, px, py + 2.4 + bob, pz, 0.86, 0.14, 0.86, hair);
    makeBox(faces, px, py + 2.54 + bob, pz, 0.5, 0.2, 0.5, hair);
  }

  function projectPoint(pt, yaw, pitch, camDist, cx, cy, cz) {
    const dx = pt[0] - cx, dy = pt[1] - cy, dz = pt[2] - cz;
    const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
    const x1 = dx * cyaw - dz * syaw;
    const z1 = dx * syaw + dz * cyaw;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const y2 = dy * cp + z1 * sp;
    const z2 = -dy * sp + z1 * cp + camDist;
    if (z2 < 0.8) return null;
    const f = 1040 / z2;
    return [W / 2 + x1 * f, H * 0.58 - y2 * f, z2];
  }

  function renderWorld(t, sceneIdx) {
    g.clearRect(0, 0, W, H);
    const groundFaces = [];
    const faces = [];

    const yaw = -0.58 + Math.sin(t * 0.35 + sceneIdx * 0.55) * 0.38;
    const pitch = 0.46 + Math.cos(t * 0.28 + sceneIdx) * 0.08;
    const camDist = 11.5 - (sceneIdx % 2) * 1.6;
    const target = [0, 1.1, 0];

    if (MODE === 'storefront') {
      makeBox(groundFaces, 0, -0.35, 0, 8.8, 0.7, 7.2, '#334155');
      makeBox(faces, 0, 1.4, -2.2, 6.2, 3.0, 2.0, '#F1E8D6');
      makeBox(faces, 0, 1.85, -1.05, 6.4, 0.42, 0.9, '#D97706');
      makeBox(faces, 0, 0.6, 0.2, 4.4, 1.2, 0.8, '#92400E');
      makeBox(faces, 3.0, 1.8, -0.8, 1.5, 2.7, 0.25, '#1D4ED8');
      addPerson(faces, -1.4, 0, 1.9, CHAR_A, t, true);
      addPerson(faces, 1.3, 0, 1.8, CHAR_B, t + 1.2, false);
    } else if (MODE === 'cutaway_oven') {
      makeBox(groundFaces, 0, -0.35, 0, 8.2, 0.7, 6.4, '#451A03');
      makeBox(faces, 0, 0.85, 0, 5.8, 1.7, 4.0, '#B45309');
      makeBox(faces, 0, 1.8, 0, 6.1, 0.22, 4.3, '#CBD5E1');
      // Parede traseira em corte (sem face frontal para revelar fogo e pizza dentro)
      const archSides = 7;
      for (let i = 0; i < archSides; i++) {
        const a1 = (i / archSides) * Math.PI;
        const a2 = ((i + 1) / archSides) * Math.PI;
        faces.push({
          pts: [
            [Math.cos(a1) * 2.5, 1.9, Math.sin(a1) * 1.9 + 0.1],
            [Math.cos(a2) * 2.5, 1.9, Math.sin(a2) * 1.9 + 0.1],
            [0, 4.1, 0.3],
          ],
          fill: shade('#D97706', 0.74 + 0.28 * Math.sin(a1)),
        });
      }
      makeBox(faces, 2.1, 2.8, 0.8, 0.85, 2.0, 0.85, '#9A3412');
      // Fogo estilizado com pulso deterministico visivel na frente esquerda
      const fH = 1.05 + Math.sin(t * 9) * 0.22;
      makePyramid(faces, -1.15, 1.92, -0.55, 0.46, fH, 5, '#F97316');
      makePyramid(faces, -0.85, 1.92, -0.38, 0.32, fH * 0.8, 5, '#FACC15');
      // Pizza no piso do forno visivel na frente direita
      makeBox(faces, 0.85, 1.96, -0.55, 1.25, 0.14, 1.25, '#FDE68A');
      makeBox(faces, 0.85, 2.06, -0.55, 0.98, 0.06, 0.98, '#EF4444');
    } else {
      // rural_plot: terreno 3D low-poly estilo Seu Tobias
      makeBox(groundFaces, 0, -0.4, 0, 7.2, 0.8, 11.4, '#6B4226');
      makeBox(groundFaces, 0, 0.08, 0, 7.2, 0.22, 11.4, '#84CC16');
      // Parcelas no terreno
      makeBox(groundFaces, -1.6, 0.21, -2.5, 2.8, 0.05, 3.0, '#A3E635');
      makeBox(groundFaces, 1.6, 0.21, 2.2, 2.8, 0.05, 3.4, '#D9F99D');
      const trees = [[-2.6, -4.4], [-2.8, 1.8], [2.6, -3.6], [2.4, -0.4], [-2.1, 4.1], [2.5, 4.2]];
      trees.forEach(function(tr, k) {
        makeBox(faces, tr[0], 0.45, tr[1], 0.24, 0.6, 0.24, '#78350F');
        makePyramid(faces, tr[0], 0.72, tr[1], 0.65 + (k % 2) * 0.14, 1.5, 5, '#15803D');
      });
      // Postes de cerca
      for (let z = -5.2; z <= 5.2; z += 1.73) {
        makeBox(faces, -3.45, 0.48, z, 0.12, 0.72, 0.12, '#78350F');
        makeBox(faces, 3.45, 0.48, z, 0.12, 0.72, 0.12, '#78350F');
      }
      addPerson(faces, -0.3, 0.16, 0.6, CHAR_A, t, true);
    }

    function drawBatch(batch) {
      const projected = [];
      batch.forEach(function(fc) {
        const p2 = [];
        let depth = 0;
        for (let i = 0; i < fc.pts.length; i++) {
          const pr = projectPoint(fc.pts[i], yaw, pitch, camDist, target[0], target[1], target[2]);
          if (!pr) return;
          p2.push(pr);
          depth += pr[2];
        }
        projected.push({ p2: p2, z: depth / p2.length, fill: fc.fill });
      });
      projected.sort(function(a, b) { return b.z - a.z; });
      projected.forEach(function(poly) {
        g.beginPath();
        g.moveTo(poly.p2[0][0], poly.p2[0][1]);
        for (let i = 1; i < poly.p2.length; i++) g.lineTo(poly.p2[i][0], poly.p2[i][1]);
        g.closePath();
        g.fillStyle = poly.fill;
        g.fill();
      });
    }
    drawBatch(groundFaces);
    drawBatch(faces);

    return projectPoint([0, 2.2, 0.6], yaw, pitch, camDist, target[0], target[1], target[2]);
  }

  window.__dtSeek = function(timeSec) {
    const t = Math.max(0, Math.min(TOTAL, Number(timeSec) || 0));
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = ((t / TOTAL) * 100).toFixed(2) + '%';

    let activeIdx = 0;
    SCENES.forEach(function(sc, idx) {
      const active = t >= sc.start && (t < sc.end || (idx === SCENES.length - 1 && t <= sc.end));
      if (active) activeIdx = idx;
      const hud = document.getElementById('hud_' + idx);
      if (hud) hud.style.opacity = active ? '1' : '0';
    });

    const anchor = renderWorld(t, activeIdx);
    const callout = document.getElementById('callout_' + activeIdx);
    if (callout && anchor) {
      const cx = Math.max(240, Math.min(W - 240, anchor[0] + 185));
      const cy = Math.max(460, Math.min(H - 360, anchor[1] - 85));
      callout.style.left = cx.toFixed(1) + 'px';
      callout.style.top = cy.toFixed(1) + 'px';
    }
  };

  window.__dtSeek(0);
})();
</script>
</body>
</html>`;
}
