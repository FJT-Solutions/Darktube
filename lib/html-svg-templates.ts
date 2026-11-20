import { validateBrandPalette, validateTimelineStates, type MotionEnergy } from './motion-checks';
import {
  buildDiorama3dHtml,
  buildTechCrimsonHtml,
  type Diorama3dMode,
  type TechCrimsonVisual,
} from './html-svg-presets-extra';
import {
  buildKazChartHtml,
  buildNetflixDocHtml,
  buildPaperFinanceHtml,
  buildVoxPapercutHtml,
  type HtmlSvgChartItem,
} from './html-svg-presets-v2';

export type HtmlSvgPreset =
  | 'html_svg_explainer'
  | 'html_svg_character_story'
  | 'html_svg_product_motion'
  | 'html_svg_tech_crimson'
  | 'html_svg_3d_diorama'
  | 'html_svg_netflix_doc'
  | 'html_svg_vox_papercut'
  | 'html_svg_kaz_chart'
  | 'html_svg_paper_finance';

export type HtmlSvgExpression = 'happy' | 'shocked' | 'smirk' | 'angry' | 'sad' | 'thinking';

export interface HtmlSvgCharacterSpec {
  id: string;
  name: string;
  skinColor?: string;
  hairColor?: string;
  shirtColor?: string;
  pattern?: 'solid' | 'watermelon_stripes' | 'strawberry_seeds' | 'avocado_bumps';
}

export interface HtmlSvgSceneInput {
  title?: string;
  subtitle?: string;
  spokenLine?: string;
  badge?: string;
  durationSec?: number;
  icon?: 'chart' | 'bolt' | 'shield' | 'rocket' | 'heart' | 'code';
  speakerId?: string;
  expression?: HtmlSvgExpression;
  metricValue?: string;
  metricLabel?: string;
  visual?: TechCrimsonVisual;
  callout?: string;
  imageUrl?: string;
  yearLabel?: string;
  chartItems?: HtmlSvgChartItem[];
}

export interface HtmlSvgProjectSpec {
  preset?: HtmlSvgPreset;
  title?: string;
  aspect?: '9:16' | '16:9' | '1:1';
  fps?: number;
  energy?: MotionEnergy;
  palette?: string[]; // max 3 colors: [bg, primaryAccent, secondaryAccent]
  characters?: HtmlSvgCharacterSpec[];
  scenes?: HtmlSvgSceneInput[];
  dioramaMode?: Diorama3dMode;
  customHtml?: string;
  durationSec?: number;
}

const DEFAULT_PALETTES: Record<HtmlSvgPreset, [string, string, string]> = {
  html_svg_explainer: ['#0B1020', '#38BDF8', '#FACC15'],
  html_svg_character_story: ['#111827', '#22C55E', '#F59E0B'],
  html_svg_product_motion: ['#09090B', '#A855F7', '#22D3EE'],
  html_svg_tech_crimson: ['#0A0406', '#F43F5E', '#FACC15'],
  html_svg_3d_diorama: ['#091529', '#F59E0B', '#22C55E'],
  html_svg_netflix_doc: ['#07080D', '#E50914', '#FACC15'],
  html_svg_vox_papercut: ['#F4EFE4', '#DC2626', '#FDE047'],
  html_svg_kaz_chart: ['#090D16', '#38BDF8', '#22C55E'],
  html_svg_paper_finance: ['#F7F1E3', '#15803D', '#B91C1C'],
};

const escHtml = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function resolveCanvasDimensions(aspect: '9:16' | '16:9' | '1:1' = '9:16', draft = false) {
  if (aspect === '16:9') {
    return draft ? { width: 960, height: 540 } : { width: 1920, height: 1080 };
  }
  if (aspect === '1:1') {
    return draft ? { width: 720, height: 720 } : { width: 1080, height: 1080 };
  }
  return draft ? { width: 540, height: 960 } : { width: 1080, height: 1920 };
}

type NormalizedHtmlSvgScene = Required<Omit<HtmlSvgSceneInput, 'visual' | 'callout' | 'imageUrl' | 'yearLabel' | 'chartItems'>> &
  Pick<HtmlSvgSceneInput, 'visual' | 'callout' | 'imageUrl' | 'yearLabel' | 'chartItems'>;

function normalizeScenes(spec: HtmlSvgProjectSpec): NormalizedHtmlSvgScene[] {
  const raw = Array.isArray(spec.scenes) && spec.scenes.length > 0
    ? spec.scenes
    : [
        {
          title: spec.title || 'Vídeos em HTML + SVG',
          subtitle: 'Motor procedural local com custo zero',
          spokenLine: 'Sem créditos externos, sem bloqueios e com consistência total.',
          badge: 'CENA 01',
          durationSec: 4,
          icon: 'rocket' as const,
          expression: 'happy' as const,
          metricValue: '$0.00',
          metricLabel: 'Custo por render',
        },
        {
          title: 'Física & Vetores Vivos',
          subtitle: 'Molas fechadas, SVG e tipografia cinética',
          spokenLine: 'Cada quadro é calculado de forma determinística no navegador.',
          badge: 'CENA 02',
          durationSec: 4,
          icon: 'bolt' as const,
          expression: 'smirk' as const,
          metricValue: '30 FPS',
          metricLabel: 'Render determinístico',
        },
      ];

  return raw.map((sc, i) => ({
    title: String(sc.title || `Cena ${i + 1}`).slice(0, 90),
    subtitle: String(sc.subtitle || '').slice(0, 140),
    spokenLine: String(sc.spokenLine || '').slice(0, 220),
    badge: String(sc.badge || `0${i + 1}`).slice(0, 28),
    durationSec: Math.max(1.5, Math.min(20, Number(sc.durationSec) || 4)),
    icon: sc.icon || (['rocket', 'bolt', 'chart', 'code', 'shield', 'heart'][i % 6] as any),
    speakerId: String(sc.speakerId || spec.characters?.[i % Math.max(1, spec.characters?.length || 1)]?.id || 'c1'),
    expression: sc.expression || 'happy',
    metricValue: String(sc.metricValue || '').slice(0, 24),
    metricLabel: String(sc.metricLabel || '').slice(0, 40),
    visual: sc.visual,
    callout: sc.callout ? String(sc.callout).slice(0, 48) : undefined,
    imageUrl: sc.imageUrl ? String(sc.imageUrl).trim() : undefined,
    yearLabel: sc.yearLabel ? String(sc.yearLabel).slice(0, 20) : undefined,
    chartItems: Array.isArray(sc.chartItems)
      ? sc.chartItems.slice(0, 8).map((c) => ({
          label: String(c?.label || '').slice(0, 24),
          value: Number(c?.value) || 0,
          ...(c?.color ? { color: String(c.color) } : {}),
        }))
      : undefined,
  }));
}

function buildCharacterMarkup(ch: HtmlSvgCharacterSpec, idx: number, total: number, isVertical: boolean): string {
  const skin = ch.skinColor || (idx === 0 ? '#34D399' : idx === 1 ? '#F43F5E' : '#84CC16');
  const hair = ch.hairColor || '#1E1B18';
  const shirt = ch.shirtColor || (idx === 0 ? '#E7DEC8' : idx === 1 ? '#881337' : '#18181B');
  const spacing = isVertical ? 260 : 340;
  const cx = 540 + (idx - (total - 1) / 2) * spacing;
  const cy = isVertical ? 1050 : 620;
  const patId = `pat_${idx}_${ch.pattern || 'solid'}`;

  let patternSvg = '';
  if (ch.pattern === 'watermelon_stripes') {
    patternSvg = `<pattern id="${patId}" width="26" height="40" patternUnits="userSpaceOnUse">
      <rect width="26" height="40" fill="${skin}"/>
      <path d="M6 0 Q10 20 6 40 M18 0 Q22 20 18 40" stroke="#065F46" stroke-width="6" fill="none"/>
    </pattern>`;
  } else if (ch.pattern === 'strawberry_seeds') {
    patternSvg = `<pattern id="${patId}" width="24" height="24" patternUnits="userSpaceOnUse">
      <rect width="24" height="24" fill="${skin}"/>
      <ellipse cx="6" cy="8" rx="1.6" ry="2.6" fill="#FDE68A"/>
      <ellipse cx="18" cy="18" rx="1.6" ry="2.6" fill="#FDE68A"/>
    </pattern>`;
  } else if (ch.pattern === 'avocado_bumps') {
    patternSvg = `<pattern id="${patId}" width="18" height="18" patternUnits="userSpaceOnUse">
      <rect width="18" height="18" fill="${skin}"/>
      <circle cx="5" cy="6" r="2.2" fill="#3F6212" opacity="0.5"/>
      <circle cx="13" cy="14" r="2.2" fill="#3F6212" opacity="0.5"/>
    </pattern>`;
  }

  const headFill = patternSvg ? `url(#${patId})` : skin;

  return `
  <g id="char_${escHtml(ch.id)}" data-cx="${cx}" data-cy="${cy}" transform="translate(${cx}, ${cy})">
    <defs>${patternSvg}</defs>
    <!-- Sombra no chao -->
    <ellipse cx="0" cy="210" rx="110" ry="20" fill="#000000" opacity="0.38"/>
    <!-- Corpo e roupa -->
    <g class="char-body">
      <path d="M-85,45 Q-95,180 -65,205 L65,205 Q95,180 85,45 Q45,25 0,25 Q-45,25 -85,45 Z" fill="${shirt}" stroke="rgba(255,255,255,0.16)" stroke-width="4"/>
      <!-- Bracos articulados -->
      <path class="arm-l" d="M-82,60 Q-128,110 -105,165" stroke="${headFill}" stroke-width="26" stroke-linecap="round" fill="none"/>
      <path class="arm-r" d="M82,60 Q128,110 105,165" stroke="${headFill}" stroke-width="26" stroke-linecap="round" fill="none"/>
      <!-- Pescoco -->
      <rect x="-24" y="-5" width="48" height="42" rx="16" fill="${headFill}"/>
      <!-- Cabeca estilizada -->
      <g class="char-head">
        <ellipse cx="0" cy="-65" rx="84" ry="88" fill="${headFill}" stroke="rgba(255,255,255,0.22)" stroke-width="4"/>
        <!-- Brilho 3D sutil -->
        <ellipse cx="-28" cy="-108" rx="30" ry="18" fill="#FFFFFF" opacity="0.16" transform="rotate(-20 -28 -108)"/>
        <!-- Cabelo -->
        <path d="M-78,-85 Q-82,-162 0,-166 Q82,-162 78,-85 Q46,-126 0,-122 Q-46,-126 -78,-85 Z" fill="${hair}"/>
        <!-- Olhos -->
        <g class="eye-l" transform="translate(-30, -68)">
          <ellipse cx="0" cy="0" rx="16" ry="19" fill="#FFFFFF"/>
          <circle class="pupil" cx="2" cy="1" r="8" fill="#0F172A"/>
          <circle cx="5" cy="-3" r="3" fill="#FFFFFF"/>
        </g>
        <g class="eye-r" transform="translate(30, -68)">
          <ellipse cx="0" cy="0" rx="16" ry="19" fill="#FFFFFF"/>
          <circle class="pupil" cx="2" cy="1" r="8" fill="#0F172A"/>
          <circle cx="5" cy="-3" r="3" fill="#FFFFFF"/>
        </g>
        <!-- Sobrancelhas -->
        <path class="brow-l" d="M-46,-96 Q-30,-104 -14,-95" stroke="${hair}" stroke-width="6" stroke-linecap="round" fill="none"/>
        <path class="brow-r" d="M14,-95 Q30,-104 46,-96" stroke="${hair}" stroke-width="6" stroke-linecap="round" fill="none"/>
        <!-- Nariz botao estilizado -->
        <ellipse cx="0" cy="-46" rx="11" ry="8" fill="rgba(0,0,0,0.16)"/>
        <!-- Boca com lip-sync -->
        <path class="mouth" d="M-24,-22 Q0,-6 24,-22" stroke="#1E1B18" stroke-width="6" stroke-linecap="round" fill="#7F1D1D"/>
      </g>
    </g>
    <!-- Nome do personagem -->
    <g transform="translate(0, 250)">
      <rect x="-78" y="-18" width="156" height="36" rx="18" fill="rgba(15,23,42,0.82)" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
      <text x="0" y="6" text-anchor="middle" fill="#F8FAFC" font-size="18" font-weight="700" font-family="Inter, sans-serif">${escHtml(ch.name)}</text>
    </g>
  </g>`;
}

function buildIconSvg(kind: string, accent: string, secondary: string): string {
  switch (kind) {
    case 'bolt':
      return `<path class="draw-path" d="M62 12 L24 64 L54 64 L42 108 L86 52 L54 52 Z" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="5" stroke-linejoin="round"/>`;
    case 'chart':
      return `<g>
        <rect class="bar-1" x="18" y="64" width="18" height="40" rx="5" fill="${accent}"/>
        <rect class="bar-2" x="48" y="42" width="18" height="62" rx="5" fill="${secondary}"/>
        <rect class="bar-3" x="78" y="20" width="18" height="84" rx="5" fill="${accent}"/>
        <path class="draw-path" d="M16 54 L54 32 L88 12" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
      </g>`;
    case 'shield':
      return `<path class="draw-path" d="M56 12 L94 26 V56 C94 82 76 100 56 108 C36 100 18 82 18 56 V26 Z" fill="${accent}" fill-opacity="0.16" stroke="${accent}" stroke-width="5"/>
        <path class="draw-path" d="M38 60 L51 73 L76 45" fill="none" stroke="${secondary}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'code':
      return `<path class="draw-path" d="M40 32 L16 58 L40 84 M72 32 L96 58 L72 84 M62 22 L50 94" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'heart':
      return `<path class="draw-path" d="M56 98 C24 76 14 54 14 38 C14 22 27 12 40 12 C49 12 54 17 56 22 C58 17 63 12 72 12 C85 12 98 22 98 38 C98 54 88 76 56 98 Z" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="5"/>`;
    case 'rocket':
    default:
      return `<g>
        <path class="draw-path" d="M56 12 C74 28 80 56 72 82 L40 82 C32 56 38 28 56 12 Z" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="5"/>
        <circle cx="56" cy="46" r="10" fill="${secondary}"/>
        <path class="draw-path" d="M40 72 L24 88 L42 88 M72 72 L88 88 L70 88" fill="none" stroke="${secondary}" stroke-width="5" stroke-linejoin="round"/>
      </g>`;
  }
}

export interface CompiledHtmlSvg {
  html: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  palette: string[];
  timelineIssues: { errors: string[]; warnings: string[] };
}

/**
 * Compila uma especificacao estruturada (ou HTML customizado) para um documento HTML5 + SVG
 * deterministico compativel com `window.__dtSeek(timeSec, frame, fps, durationSec)`.
 */
export function compileHtmlSvgDocument(spec: HtmlSvgProjectSpec, draft = false): CompiledHtmlSvg {
  const preset: HtmlSvgPreset = spec.preset || 'html_svg_explainer';
  const { width, height } = resolveCanvasDimensions(spec.aspect || '9:16', draft);
  const fps = Math.max(15, Math.min(60, Math.round(Number(spec.fps) || 30)));

  if (spec.customHtml && spec.customHtml.trim()) {
    const dur = Math.max(2, Math.min(120, Number(spec.durationSec) || 8));
    return {
      html: spec.customHtml,
      width,
      height,
      fps,
      durationSec: dur,
      palette: spec.palette || DEFAULT_PALETTES[preset],
      timelineIssues: { errors: [], warnings: [] },
    };
  }

  const defaults = DEFAULT_PALETTES[preset];
  const rawPalette = (spec.palette && spec.palette.length >= 1 ? spec.palette : defaults).slice(0, 3);
  while (rawPalette.length < 3) rawPalette.push(defaults[rawPalette.length]);
  const palCheck = validateBrandPalette(rawPalette, { maxColors: 3 });
  const [bgHex, accentHex, secHex] = palCheck.normalized.length >= 3 ? palCheck.normalized : defaults;

  const scenes = normalizeScenes(spec);
  let cursor = 0;
  const scheduled = scenes.map((sc, i) => {
    const start = cursor;
    cursor += sc.durationSec;
    return { ...sc, index: i, start, end: cursor };
  });
  const totalDur = Math.max(2, cursor);

  const tlCheck = validateTimelineStates(
    scheduled.map((s) => ({
      id: `scene_${s.index + 1}`,
      atSec: s.start,
      durationSec: s.durationSec,
      opacityAtStart: s.index === 0 ? 1 : 0,
    })),
    totalDur
  );

  const isVertical = height >= width;
  const viewW = isVertical ? 1080 : width === height ? 1080 : 1920;
  const viewH = isVertical ? 1920 : width === height ? 1080 : 1080;

  const characters =
    Array.isArray(spec.characters) && spec.characters.length > 0
      ? spec.characters.slice(0, 3)
      : [
          { id: 'c1', name: 'Melancildo', skinColor: '#22C55E', pattern: 'watermelon_stripes' as const },
          { id: 'c2', name: 'Morangela', skinColor: '#F43F5E', pattern: 'strawberry_seeds' as const },
        ];

  if (
    preset === 'html_svg_tech_crimson' ||
    preset === 'html_svg_3d_diorama' ||
    preset === 'html_svg_netflix_doc' ||
    preset === 'html_svg_vox_papercut' ||
    preset === 'html_svg_kaz_chart' ||
    preset === 'html_svg_paper_finance'
  ) {
    const extraCtx = {
      title: String(spec.title || scheduled[0]?.title || 'DarkTube Studio').slice(0, 80),
      width,
      height,
      viewW,
      viewH,
      totalDur,
      palette: [bgHex, accentHex, secHex] as [string, string, string],
      scenes: scheduled,
      characters,
      dioramaMode: spec.dioramaMode,
    };
    const extraHtml =
      preset === 'html_svg_tech_crimson'
        ? buildTechCrimsonHtml(extraCtx)
        : preset === 'html_svg_3d_diorama'
          ? buildDiorama3dHtml(extraCtx)
          : preset === 'html_svg_netflix_doc'
            ? buildNetflixDocHtml(extraCtx)
            : preset === 'html_svg_vox_papercut'
              ? buildVoxPapercutHtml(extraCtx)
              : preset === 'html_svg_kaz_chart'
                ? buildKazChartHtml(extraCtx)
                : buildPaperFinanceHtml(extraCtx);
    return {
      html: extraHtml,
      width,
      height,
      fps,
      durationSec: totalDur,
      palette: [bgHex, accentHex, secHex],
      timelineIssues: {
        errors: [...palCheck.errors, ...tlCheck.errors],
        warnings: [...palCheck.warnings, ...tlCheck.warnings],
      },
    };
  }

  const charactersSvg =
    preset === 'html_svg_character_story'
      ? characters.map((ch, idx) => buildCharacterMarkup(ch, idx, characters.length, isVertical)).join('\n')
      : '';

  const sceneCardsMarkup = scheduled
    .map((sc) => {
      const iconSvg = buildIconSvg(sc.icon, accentHex, secHex);
      return `
      <div class="scene-layer" id="scene_${sc.index}" data-start="${sc.start}" data-end="${sc.end}" style="opacity:${sc.index === 0 ? 1 : 0}">
        <div class="badge-pill">${escHtml(sc.badge)}</div>
        ${
          preset !== 'html_svg_character_story'
            ? `<div class="hero-card">
                 <div class="icon-ring">
                   <svg viewBox="0 0 112 112" width="112" height="112">${iconSvg}</svg>
                 </div>
                 ${
                   sc.metricValue
                     ? `<div class="metric-block">
                          <div class="metric-val">${escHtml(sc.metricValue)}</div>
                          <div class="metric-lbl">${escHtml(sc.metricLabel)}</div>
                        </div>`
                     : ''
                 }
               </div>`
            : ''
        }
        <h1 class="scene-title">${escHtml(sc.title)}</h1>
        ${sc.subtitle ? `<p class="scene-sub">${escHtml(sc.subtitle)}</p>` : ''}
        ${
          sc.spokenLine
            ? `<div class="speech-box"><span class="speech-dot"></span><span>${escHtml(sc.spokenLine)}</span></div>`
            : ''
        }
      </div>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background: ${bgHex};
    color: #F8FAFC;
    font-family: Inter, system-ui, -apple-system, sans-serif;
  }
  #stage {
    position: relative;
    width: ${viewW}px;
    height: ${viewH}px;
    transform-origin: top left;
    transform: scale(${(width / viewW).toFixed(6)});
    background: ${bgHex};
    overflow: hidden;
  }
  #bg-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .scene-layer {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: ${preset === 'html_svg_character_story' ? 'flex-start' : 'center'};
    padding: ${isVertical ? '130px 72px 160px' : '72px 120px'};
    text-align: center;
    gap: 28px;
    pointer-events: none;
  }
  .badge-pill {
    display: inline-flex;
    align-items: center;
    padding: 12px 28px;
    border-radius: 999px;
    border: 2px solid ${accentHex};
    background: rgba(255,255,255,0.06);
    color: ${accentHex};
    font-size: 24px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .hero-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 36px;
    padding: 36px 48px;
    border-radius: 32px;
    background: rgba(255,255,255,0.05);
    border: 2px solid rgba(255,255,255,0.14);
    min-width: ${isVertical ? '760px' : '640px'};
  }
  .icon-ring {
    width: 140px;
    height: 140px;
    border-radius: 28px;
    display: grid;
    place-items: center;
    background: rgba(255,255,255,0.04);
    border: 2px solid ${accentHex};
  }
  .metric-block { text-align: left; }
  .metric-val {
    font-size: 72px;
    font-weight: 900;
    color: ${secHex};
    line-height: 1;
  }
  .metric-lbl {
    margin-top: 8px;
    font-size: 26px;
    color: rgba(248,250,252,0.78);
    font-weight: 600;
  }
  .scene-title {
    font-size: ${isVertical ? '76px' : '64px'};
    font-weight: 900;
    line-height: 1.08;
    max-width: 920px;
    letter-spacing: -0.02em;
  }
  .scene-sub {
    font-size: ${isVertical ? '36px' : '30px'};
    line-height: 1.35;
    max-width: 840px;
    color: rgba(248,250,252,0.82);
  }
  .speech-box {
    margin-top: ${preset === 'html_svg_character_story' ? 'auto' : '18px'};
    display: inline-flex;
    align-items: center;
    gap: 16px;
    padding: 22px 34px;
    border-radius: 24px;
    background: rgba(15,23,42,0.86);
    border: 2px solid ${secHex};
    font-size: 30px;
    font-weight: 700;
    max-width: 900px;
  }
  .speech-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${secHex};
    flex-shrink: 0;
  }
  #char-stage {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  #progress-bar {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 10px;
    width: 100%;
    background: rgba(255,255,255,0.12);
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
  <svg id="bg-svg" viewBox="0 0 ${viewW} ${viewH}" preserveAspectRatio="none">
    <defs>
      <pattern id="dt-grid" width="72" height="72" patternUnits="userSpaceOnUse">
        <path d="M 72 0 L 0 0 0 72" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
      </pattern>
    </defs>
    <rect width="${viewW}" height="${viewH}" fill="${bgHex}"/>
    <rect width="${viewW}" height="${viewH}" fill="url(#dt-grid)"/>
    <circle id="orb-a" cx="${Math.round(viewW * 0.2)}" cy="${Math.round(viewH * 0.22)}" r="220" fill="${accentHex}" opacity="0.10"/>
    <circle id="orb-b" cx="${Math.round(viewW * 0.82)}" cy="${Math.round(viewH * 0.78)}" r="260" fill="${secHex}" opacity="0.10"/>
    <path id="wave-path" d="M 0 ${Math.round(viewH * 0.54)} Q ${Math.round(viewW * 0.25)} ${Math.round(viewH * 0.48)}, ${Math.round(viewW * 0.5)} ${Math.round(viewH * 0.54)} T ${viewW} ${Math.round(viewH * 0.54)}" fill="none" stroke="${accentHex}" stroke-width="4" stroke-dasharray="18 14" opacity="0.35"/>
  </svg>

  ${preset === 'html_svg_character_story' ? `<svg id="char-stage" viewBox="0 0 ${viewW} ${viewH}">${charactersSvg}</svg>` : ''}

  ${sceneCardsMarkup}

  <div id="progress-bar"><div id="progress-fill"></div></div>
</div>

<script>
(function() {
  const SCENES = ${JSON.stringify(scheduled)};
  const TOTAL_DUR = ${totalDur};
  const CHAR_IDS = ${JSON.stringify(characters.map((c) => c.id))};

  function closedSpring(t, k = 170, d = 24) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(k);
    const z = d / (2 * w0);
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }

  function applyExpression(charEl, expr, talking, t) {
    if (!charEl) return;
    const mouth = charEl.querySelector('.mouth');
    const browL = charEl.querySelector('.brow-l');
    const browR = charEl.querySelector('.brow-r');
    const eyeL = charEl.querySelector('.eye-l');
    const eyeR = charEl.querySelector('.eye-r');
    const head = charEl.querySelector('.char-head');
    const armL = charEl.querySelector('.arm-l');
    const armR = charEl.querySelector('.arm-r');

    // Piscada deterministica a cada ~3.2s
    const blinkPhase = t % 3.2;
    const blinkScaleY = blinkPhase > 3.04 ? Math.max(0.08, Math.abs(Math.cos((blinkPhase - 3.04) * 20))) : 1;
    if (eyeL) eyeL.setAttribute('transform', 'translate(-30, -68) scale(1,' + blinkScaleY.toFixed(3) + ')');
    if (eyeR) eyeR.setAttribute('transform', 'translate(30, -68) scale(1,' + blinkScaleY.toFixed(3) + ')');

    // Movimento sutil da boca sincronizado ao ritmo da fala
    const open = talking ? (0.45 + 0.55 * Math.abs(Math.sin(t * 14))) : 0;
    if (mouth) {
      if (talking) {
        const rx = 18 + open * 6;
        const ry = 4 + open * 13;
        mouth.setAttribute('d', 'M-' + rx.toFixed(1) + ',-20 Q0,' + (-20 + ry * 1.9).toFixed(1) + ' ' + rx.toFixed(1) + ',-20 Q0,' + (-20 - ry * 0.4).toFixed(1) + ' -' + rx.toFixed(1) + ',-20 Z');
      } else if (expr === 'shocked') {
        mouth.setAttribute('d', 'M-14,-22 A14,18 0 1,0 14,-22 A14,18 0 1,0 -14,-22 Z');
      } else if (expr === 'sad' || expr === 'angry') {
        mouth.setAttribute('d', 'M-22,-14 Q0,-28 22,-14');
      } else {
        mouth.setAttribute('d', 'M-24,-22 Q0,-5 24,-22');
      }
    }

    if (browL && browR) {
      if (expr === 'angry') {
        browL.setAttribute('d', 'M-46,-102 L-14,-90');
        browR.setAttribute('d', 'M14,-90 L46,-102');
      } else if (expr === 'shocked') {
        browL.setAttribute('d', 'M-46,-106 Q-30,-116 -14,-106');
        browR.setAttribute('d', 'M14,-106 Q30,-116 46,-106');
      } else {
        browL.setAttribute('d', 'M-46,-96 Q-30,-104 -14,-95');
        browR.setAttribute('d', 'M14,-95 Q30,-104 46,-96');
      }
    }

    if (head) {
      const nod = talking ? Math.sin(t * 7) * 3.5 : Math.sin(t * 2) * 1.2;
      head.setAttribute('transform', 'rotate(' + nod.toFixed(2) + ' 0 -20)');
    }
    if (armL && armR) {
      const gesture = talking ? Math.sin(t * 6) * 10 : Math.sin(t * 2) * 2;
      armL.setAttribute('transform', 'rotate(' + (-gesture).toFixed(2) + ' -82 60)');
      armR.setAttribute('transform', 'rotate(' + gesture.toFixed(2) + ' 82 60)');
    }
  }

  window.__dtSeek = function(timeSec) {
    const t = Math.max(0, Math.min(TOTAL_DUR, Number(timeSec) || 0));
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = ((t / TOTAL_DUR) * 100).toFixed(2) + '%';

    const orbA = document.getElementById('orb-a');
    const orbB = document.getElementById('orb-b');
    const wave = document.getElementById('wave-path');
    if (orbA) orbA.setAttribute('transform', 'translate(' + (Math.sin(t * 0.9) * 34).toFixed(1) + ',' + (Math.cos(t * 0.7) * 26).toFixed(1) + ')');
    if (orbB) orbB.setAttribute('transform', 'translate(' + (Math.cos(t * 0.8) * -36).toFixed(1) + ',' + (Math.sin(t * 0.6) * 28).toFixed(1) + ')');
    if (wave) wave.setAttribute('stroke-dashoffset', (-t * 60).toFixed(1));

    let activeScene = SCENES[0];
    SCENES.forEach(function(sc, idx) {
      const el = document.getElementById('scene_' + idx);
      if (!el) return;
      const inScene = t >= sc.start && (t < sc.end || (idx === SCENES.length - 1 && t <= sc.end));
      if (inScene) activeScene = sc;
      const localT = t - sc.start;
      const enter = idx === 0 && localT < 0.05 ? 1 : closedSpring(localT, 190, 22);
      const exitT = sc.end - t;
      const fadeOut = idx < SCENES.length - 1 && exitT < 0.22 ? Math.max(0, exitT / 0.22) : 1;
      const opacity = inScene ? Math.min(1, enter) * fadeOut : 0;
      const ty = (1 - Math.min(1, enter)) * 42;
      const scale = 0.94 + 0.06 * Math.min(1, enter);
      el.style.opacity = opacity.toFixed(4);
      el.style.transform = 'translate3d(0,' + ty.toFixed(1) + 'px,0) scale(' + scale.toFixed(4) + ')';

      el.querySelectorAll('.draw-path').forEach(function(p) {
        try {
          const len = p.getTotalLength ? p.getTotalLength() : 300;
          const drawP = idx === 0 && localT < 0.05 ? 0.55 : Math.min(1, Math.max(0.1, localT / 0.85));
          p.style.strokeDasharray = String(len);
          p.style.strokeDashoffset = (len * (1 - drawP)).toFixed(1);
        } catch (_) {}
      });
    });

    CHAR_IDS.forEach(function(cid) {
      const g = document.getElementById('char_' + cid);
      if (!g) return;
      const baseCx = Number(g.getAttribute('data-cx')) || 540;
      const baseCy = Number(g.getAttribute('data-cy')) || 960;
      const isSpeaker = activeScene && activeScene.speakerId === cid;
      const bounce = isSpeaker ? Math.abs(Math.sin(t * 5)) * -10 : Math.sin(t * 2.2) * 3;
      const sc = isSpeaker ? 1.06 : 0.96;
      g.setAttribute('transform', 'translate(' + baseCx + ',' + (baseCy + bounce).toFixed(1) + ') scale(' + sc.toFixed(3) + ')');
      applyExpression(g, isSpeaker && activeScene ? activeScene.expression : 'happy', Boolean(isSpeaker && activeScene && activeScene.spokenLine), t);
    });
  };

  // Frame 0 ja inicializado visivel no carregamento
  window.__dtSeek(0);
})();
</script>
</body>
</html>`;

  return {
    html,
    width,
    height,
    fps,
    durationSec: totalDur,
    palette: [bgHex, accentHex, secHex],
    timelineIssues: {
      errors: [...palCheck.errors, ...tlCheck.errors],
      warnings: [...palCheck.warnings, ...tlCheck.warnings],
    },
  };
}
