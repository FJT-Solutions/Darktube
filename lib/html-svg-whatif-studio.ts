import fs from 'fs';
import type { HtmlSvgV2CompileContext, HtmlSvgV2Scene } from './html-svg-presets-v2';

export type WhatIfStyleMood = 'dusk' | 'midnight' | 'golden' | 'neon' | 'storybook';

export type WhatIfVisualStyle =
  | 'whatif_2d'
  | 'quadro_negro'
  | 'esboco_neon'
  | 'pixel_art'
  | 'quadrinhos'
  | 'estilo_lego';

export type WhatIfSceneKind =
  | 'cafe_hook'
  | 'data_compare'
  | 'freeze_10x'
  | 'blueprint'
  | 'big_face'
  | 'action_stage'
  | 'end_cta';

export interface WhatIfWordTiming {
  palavra: string;
  inicio: number;
  fim: number;
}

export interface WhatIfStudioScene extends Partial<HtmlSvgV2Scene> {
  sceneKind?: WhatIfSceneKind;
  shirtColor?: string;
}

export interface WhatIfStudioCompileContext extends Omit<HtmlSvgV2CompileContext, 'scenes'> {
  scenes: WhatIfStudioScene[];
  styleMood?: WhatIfStyleMood;
  visualStyle?: WhatIfVisualStyle;
  words?: WhatIfWordTiming[];
}

const safeJson = (val: unknown): string => JSON.stringify(val).replace(/</g, '\\u003c');

function sanitizeCaptionWords(raw: string): string {
  return String(raw || '')
    .replace(/[$€£%#*@&_=+<>|/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Roteiro padrão PT-BR Zero-Símbolos (estilo What If? 10X) para testes rápidos ou preview sem input customizado.
 */
export function buildDefaultWhatIfScenes(): WhatIfStudioScene[] {
  return [
    {
      sceneKind: 'cafe_hook',
      title: 'E SE SUA REAÇÃO FOSSE DEZ VEZES MAIS RÁPIDA?',
      subtitle: 'O café nem caiu da mesa',
      spokenLine: 'Um copo cai da mesa. O café nem começou a derramar e sua mão já está embaixo.',
      badge: '01 · HOOK',
      durationSec: 5.5,
      expression: 'smirk',
    },
    {
      sceneKind: 'data_compare',
      title: 'TEMPO DE REAÇÃO HUMANO',
      subtitle: 'Duzentos e cinquenta contra vinte e cinco milissegundos',
      spokenLine: 'Uma pessoa comum reage em duzentos e cinquenta milissegundos. Você reage em apenas vinte e cinco.',
      badge: '02 · DADOS',
      durationSec: 5.2,
      chartItems: [
        { label: 'PESSOA COMUM', value: 250, color: '#64748b' },
        { label: 'VOCÊ DEZ VEZES', value: 25, color: '#f2c14e' },
      ],
    },
    {
      sceneKind: 'freeze_10x',
      title: 'MUNDO CONGELADO',
      subtitle: 'Tudo parece parar ao seu redor',
      spokenLine: 'O mundo inteiro parece congelar ao seu redor.',
      badge: '10X',
      durationSec: 4.0,
      expression: 'smirk',
    },
    {
      sceneKind: 'blueprint',
      title: 'ESQUEMA DE RESPOSTA MOTORA',
      subtitle: 'Cérebro acelerado e músculo limitado',
      spokenLine: 'Mas existe uma regra cruel. Seu cérebro ficou dez vezes mais rápido, seus músculos não.',
      badge: '04 · REGRA',
      durationSec: 5.5,
      chartItems: [
        { label: 'CÉREBRO', value: 100 },
        { label: 'SINAL ELÉTRICO', value: 70 },
        { label: 'MÚSCULO', value: 25 },
      ],
    },
    {
      sceneKind: 'big_face',
      title: 'A ESCOLHA EM UM SEGUNDO',
      subtitle: 'Quando cada milissegundo decide tudo',
      spokenLine: 'Na hora do perigo, você vê o impacto antes de todo mundo e tem apenas um segundo para escolher.',
      badge: '05 · CLÍMAX',
      durationSec: 5.5,
      expression: 'shocked',
    },
    {
      sceneKind: 'end_cta',
      title: 'O que você faria com esse poder?',
      subtitle: 'COMENTE SUA ESCOLHA',
      spokenLine: 'O que você faria com esse poder?',
      badge: '06 · FINAL',
      durationSec: 4.3,
    },
  ];
}

/**
 * Gera trilha sonora procedural leve (sub-drone + pulso rítmico + chime de freeze + hits de corte) em WAV PCM 16-bit.
 */
export function writeWhatIfAmbientWav(
  outPath: string,
  durationSec: number,
  cueTimes: { compareSec?: number; freezeSec?: number; blueprintSec?: number; bigFaceSec?: number; endSec?: number } = {}
): string {
  const sr = 44100;
  const totalSamples = Math.max(sr, Math.ceil((durationSec + 0.3) * sr));
  const buf = Buffer.alloc(44 + totalSamples * 2);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + totalSamples * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(totalSamples * 2, 40);

  const compareSec = cueTimes.compareSec ?? durationSec * 0.2;
  const freezeSec = cueTimes.freezeSec ?? durationSec * 0.4;
  const blueprintSec = cueTimes.blueprintSec ?? durationSec * 0.56;
  const bigFaceSec = cueTimes.bigFaceSec ?? durationSec * 0.72;
  const endSec = cueTimes.endSec ?? durationSec * 0.88;
  const hits = [0.2, compareSec, blueprintSec, bigFaceSec, endSec];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sr;
    const fadeIn = Math.min(1, t / 0.7);
    const fadeOut = Math.min(1, Math.max(0, (durationSec - t) / 0.9));
    const env = fadeIn * fadeOut;

    let s =
      (0.11 * Math.sin(2 * Math.PI * 73.42 * t) +
        0.06 * Math.sin(2 * Math.PI * 110 * t + 0.35 * Math.sin(t * 0.7)) +
        0.025 * Math.sin(2 * Math.PI * 220 * t)) *
      env;

    if (t >= compareSec && t <= endSec) {
      const ph = (t % 0.45) / 0.45;
      s += 0.05 * Math.exp(-ph * 18) * Math.sin(2 * Math.PI * (t >= blueprintSec ? 680 : 520) * t);
    }

    const dtF = t - freezeSec;
    if (dtF >= 0 && dtF < 1.6) {
      const sweep = 1160 - 420 * Math.min(1, dtF / 0.55);
      s += 0.15 * Math.exp(-dtF * 2.6) * (Math.sin(2 * Math.PI * sweep * dtF) + 0.35 * Math.sin(2 * Math.PI * sweep * 1.5 * dtF));
    }

    for (const h of hits) {
      const dt = t - h;
      if (dt >= 0 && dt < 0.42) {
        const f = 140 - 95 * Math.min(1, dt / 0.25);
        s += 0.2 * Math.exp(-dt * 10) * Math.sin(2 * Math.PI * f * dt);
      }
    }

    const clamped = Math.max(-0.92, Math.min(0.92, s));
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  fs.writeFileSync(outPath, buf);
  return outPath;
}

/**
 * Fallback deterministico de timestamps por palavra quando apenas `spokenLine` das cenas foi enviado sem ASR.
 */
function buildEstimatedWords(scenes: Array<WhatIfStudioScene & { start?: number; durationSec?: number }>): WhatIfWordTiming[] {
  const out: WhatIfWordTiming[] = [];
  let cursor = 0;
  for (const sc of scenes) {
    const dur = Math.max(1.5, Number(sc.durationSec) || 4);
    const start = sc.start ?? cursor;
    const text = sanitizeCaptionWords(sc.spokenLine || sc.subtitle || sc.title || '');
    const tokens = text ? text.split(' ').filter(Boolean) : [];
    if (tokens.length > 0) {
      const usable = Math.max(0.8, dur - 0.3);
      const step = usable / tokens.length;
      for (let i = 0; i < tokens.length; i++) {
        out.push({
          palavra: tokens[i],
          inicio: Number((start + 0.12 + i * step).toFixed(3)),
          fim: Number((start + 0.12 + (i + 0.92) * step).toFixed(3)),
        });
      }
    }
    cursor = start + dur;
  }
  return out;
}

/**
 * Compila o documento HTML5 Canvas deterministico do preset `html_svg_whatif_studio`
 * suportando 5 moods (`dusk`, `midnight`, `golden`, `neon`, `storybook`) e 6 estilos visuais
 * (`whatif_2d`, `quadro_negro`, `esboco_neon`, `pixel_art`, `quadrinhos`, `estilo_lego`).
 */
export function buildWhatIfStudioHtml(ctx: WhatIfStudioCompileContext): string {
  const width = ctx.width || 1080;
  const height = ctx.height || 1920;
  const viewW = ctx.viewW || (height >= width ? 1080 : 1920);
  const viewH = ctx.viewH || (height >= width ? 1920 : 1080);
  const scaleFactor = Number((width / viewW).toFixed(6));

  let cursor = 0;
  const scenes = (ctx.scenes && ctx.scenes.length > 0 ? ctx.scenes : buildDefaultWhatIfScenes()).map((sc, i) => {
    const dur = Math.max(1.5, Number(sc.durationSec) || 4);
    const start = cursor;
    cursor += dur;
    const fallbackKinds: WhatIfSceneKind[] = ['cafe_hook', 'data_compare', 'freeze_10x', 'blueprint', 'big_face', 'end_cta'];
    return {
      index: i,
      sceneKind: (sc.sceneKind || (i === 0 ? 'cafe_hook' : fallbackKinds[i % fallbackKinds.length])) as WhatIfSceneKind,
      title: String(sc.title || `Cena ${i + 1}`),
      subtitle: String(sc.subtitle || ''),
      spokenLine: sanitizeCaptionWords(sc.spokenLine || ''),
      badge: String(sc.badge || `CENA ${i + 1}`),
      expression: String(sc.expression || 'neutral'),
      shirtColor: String(sc.shirtColor || '#d64a33'),
      metricValue: String(sc.metricValue || ''),
      metricLabel: String(sc.metricLabel || ''),
      chartItems: Array.isArray(sc.chartItems) ? sc.chartItems : undefined,
      start,
      end: cursor,
      durationSec: dur,
    };
  });

  const totalDur = Math.max(2, cursor);
  const words = (ctx.words && ctx.words.length > 0 ? ctx.words : buildEstimatedWords(scenes)).map((w) => ({
    palavra: sanitizeCaptionWords(w.palavra),
    inicio: Number(w.inicio || 0),
    fim: Number(w.fim || 0),
  })).filter((w) => w.palavra.length > 0);

  const styleMood: WhatIfStyleMood = ctx.styleMood || 'dusk';
  const visualStyle: WhatIfVisualStyle = ctx.visualStyle || 'whatif_2d';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background: #0b0e18;
    font-family: 'Segoe UI', Inter, system-ui, -apple-system, sans-serif;
  }
  #wrap {
    width: ${viewW}px;
    height: ${viewH}px;
    transform-origin: top left;
    transform: scale(${scaleFactor});
    overflow: hidden;
  }
  canvas { display: block; width: ${viewW}px; height: ${viewH}px; }
</style>
</head>
<body>
<div id="wrap"><canvas id="stage" width="${viewW}" height="${viewH}"></canvas></div>
<script>
(function(){
  const W = ${viewW}, H = ${viewH};
  const IS_VERT = H >= W;
  const DURATION = ${totalDur.toFixed(3)};
  const SCENES = ${safeJson(scenes)};
  const WORDS = ${safeJson(words)};
  const DEFAULT_MOOD = ${safeJson(styleMood)};
  const VISUAL_STYLE = ${safeJson(visualStyle)};
  const HERO_SHIRT = ${safeJson(ctx.characters?.[0]?.shirtColor || '#d64a33')};

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');

  const MOODS = {
    dusk: {
      skyTop: '#161124', skyBot: '#4c2c44', wall: '#21192e', wallDark: '#140f1e', floor: '#281d34',
      key: '#ffb870', rim: '#ffe0a8', fog: 'rgba(68, 36, 62, 0.35)', accent: '#f2c14e', blue: '#6db7ff',
      ink: '#06070d', inkFar: '#261e38', vig: 'rgba(7, 4, 14, 0.60)'
    },
    midnight: {
      skyTop: '#070b18', skyBot: '#142347', wall: '#0e162c', wallDark: '#070c19', floor: '#111b34',
      key: '#6ec8ff', rim: '#bde7ff', fog: 'rgba(18, 40, 88, 0.42)', accent: '#4de1ff', blue: '#79c2ff',
      ink: '#04060c', inkFar: '#1b2848', vig: 'rgba(2, 5, 14, 0.66)'
    },
    golden: {
      skyTop: '#1a2736', skyBot: '#e3874f', wall: '#27242e', wallDark: '#17151c', floor: '#2f282b',
      key: '#ffd080', rim: '#fff0bd', fog: 'rgba(227, 135, 79, 0.25)', accent: '#ffcf5c', blue: '#66d1c9',
      ink: '#09070a', inkFar: '#322b38', vig: 'rgba(16, 9, 8, 0.52)'
    },
    neon: {
      skyTop: '#06050f', skyBot: '#210d35', wall: '#0c091a', wallDark: '#05040b', floor: '#120c24',
      key: '#ff42b0', rim: '#3af2e6', fog: 'rgba(58, 242, 230, 0.16)', accent: '#ff52b8', blue: '#3af2e6',
      ink: '#030207', inkFar: '#2b1945', vig: 'rgba(3, 1, 9, 0.70)'
    },
    storybook: {
      skyTop: '#24354d', skyBot: '#7fa1b8', wall: '#2b3648', wallDark: '#1d2533', floor: '#353e4e',
      key: '#fff0cc', rim: '#fff8e3', fog: 'rgba(175, 200, 215, 0.24)', accent: '#ffd875', blue: '#8fd2ff',
      ink: '#121621', inkFar: '#38465d', vig: 'rgba(18, 24, 34, 0.40)'
    }
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * clamp(t, 0, 1); }
  function easeOutCubic(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t) { t = clamp(t, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  function activeScene(t) {
    for (let i = SCENES.length - 1; i >= 0; i--) {
      if (t >= SCENES[i].start) return SCENES[i];
    }
    return SCENES[0];
  }

  function applyStyleOverride(S) {
    if (VISUAL_STYLE === 'quadro_negro') {
      return { ...S, skyTop: '#162920', skyBot: '#213d30', wall: '#1a3226', wallDark: '#102119', floor: '#13271d', key: '#fef08a', rim: '#f8fafc', accent: '#fde047', ink: '#f8fafc', inkFar: '#94a3b8' };
    }
    if (VISUAL_STYLE === 'esboco_neon') {
      return MOODS.neon;
    }
    if (VISUAL_STYLE === 'quadrinhos') {
      return { ...S, skyTop: '#fef3c7', skyBot: '#fde68a', wall: '#fffbeb', wallDark: '#18181b', floor: '#fed7aa', key: '#ef4444', rim: '#0f172a', accent: '#dc2626', blue: '#2563eb', ink: '#111827', inkFar: '#475569', vig: 'rgba(24,24,27,0.22)' };
    }
    if (VISUAL_STYLE === 'pixel_art') {
      return { ...S, skyTop: '#0f172a', skyBot: '#1e1b4b', wall: '#172554', wallDark: '#090d16', floor: '#1e293b', key: '#38bdf8', rim: '#22d3ee', accent: '#facc15', blue: '#38bdf8', ink: '#020617', inkFar: '#334155' };
    }
    return S;
  }

  function drawBg(S, t, showWindow) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, S.skyTop);
    g.addColorStop(0.56, S.wall);
    g.addColorStop(1, S.wallDark);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (VISUAL_STYLE === 'quadro_negro') {
      // Textura de giz e margem de lousa
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 25; i++) {
        ctx.beginPath();
        ctx.arc(hash(i + 3) * W, hash(i + 9) * H, 40 + hash(i + 15) * 140, 0, Math.PI * 1.4);
        ctx.stroke();
      }
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 18;
      ctx.strokeRect(10, 10, W - 20, H - 20);
    } else if (VISUAL_STYLE === 'quadrinhos') {
      // Reticula halftone estilo HQ
      ctx.fillStyle = 'rgba(17, 24, 39, 0.08)';
      for (let x = 28; x < W; x += 42) {
        for (let y = 28; y < H; y += 42) {
          ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 14;
      ctx.strokeRect(18, 18, W - 36, H - 36);
    } else if (VISUAL_STYLE === 'pixel_art') {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }

    if (showWindow && VISUAL_STYLE !== 'quadro_negro') {
      const ww = IS_VERT ? 720 : 940;
      const wh = IS_VERT ? 780 : 540;
      const wx = (W - ww) / 2;
      const wy = IS_VERT ? 190 : 90;
      const wg = ctx.createLinearGradient(wx, wy, wx, wy + wh);
      wg.addColorStop(0, S.skyBot);
      wg.addColorStop(1, S.key);
      ctx.fillStyle = wg;
      ctx.fillRect(wx, wy, ww, wh);

      const sunG = ctx.createRadialGradient(wx + ww * 0.68, wy + wh * 0.42, 20, wx + ww * 0.68, wy + wh * 0.42, 340);
      sunG.addColorStop(0, 'rgba(255, 245, 210, 0.8)');
      sunG.addColorStop(0.45, 'rgba(255, 195, 120, 0.28)');
      sunG.addColorStop(1, 'rgba(255, 195, 120, 0)');
      ctx.fillStyle = sunG;
      ctx.fillRect(wx, wy, ww, wh);

      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = S.rim;
      for (let k = 0; k < 3; k++) {
        const rx = wx + 80 + k * (ww / 3);
        ctx.beginPath();
        ctx.moveTo(rx, wy); ctx.lineTo(rx + 140, wy);
        ctx.lineTo(rx - 260, H); ctx.lineTo(rx - 440, H);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = S.wallDark;
      ctx.fillRect(wx + ww / 2 - 10, wy, 20, wh);
      ctx.fillRect(wx, wy + wh * 0.5 - 10, ww, 20);
      ctx.strokeStyle = S.wallDark;
      ctx.lineWidth = 22;
      ctx.strokeRect(wx, wy, ww, wh);
    }

    const gy = H * (IS_VERT ? 0.68 : 0.78);
    const fg = ctx.createLinearGradient(0, gy, 0, H);
    fg.addColorStop(0, S.floor);
    fg.addColorStop(1, S.wallDark);
    ctx.fillStyle = fg;
    ctx.fillRect(-100, gy, W + 200, H - gy + 100);

    // Particulas deterministicas
    ctx.save();
    for (let i = 0; i < 36; i++) {
      const px = (hash(i + 1) * W + t * (14 + hash(i + 7) * 18)) % W;
      const py = (hash(i + 31) * gy + Math.sin(t * 1.4 + i) * 16);
      ctx.fillStyle = S.rim;
      ctx.globalAlpha = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2 + i));
      if (VISUAL_STYLE === 'pixel_art') ctx.fillRect(Math.round(px / 8) * 8, Math.round(py / 8) * 8, 8, 8);
      else { ctx.beginPath(); ctx.arc(px, py, 2 + hash(i + 91) * 3, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }

  function drawHero(S, opt) {
    const { x, y, scale = 1, facing = 1, t = 0, shirt = HERO_SHIRT, rimSide = 1, expr = 'neutral', armPose = 'idle', speedTrail = 0 } = opt;

    const renderBody = (alpha, offX) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x + offX, y);
      ctx.scale(scale * facing, scale);
      const breathe = Math.sin(t * 2.8) * 3.5;

      // Sombra no chao
      ctx.fillStyle = 'rgba(0,0,0,0.36)';
      ctx.beginPath(); ctx.ellipse(0, 0, 56, 13, 0, 0, Math.PI * 2); ctx.fill();

      if (VISUAL_STYLE === 'estilo_lego') {
        // Boneco estilizado em blocos com pino no topo da cabeca
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(-26, -108, 22, 106);
        ctx.fillRect(4, -108, 22, 106);
        ctx.fillStyle = shirt;
        ctx.beginPath();
        ctx.moveTo(-28, -220 + breathe); ctx.lineTo(28, -220 + breathe);
        ctx.lineTo(36, -108 + breathe); ctx.lineTo(-36, -108 + breathe);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = S.rim; ctx.lineWidth = 4; ctx.stroke();
        // Cabeca amarela cilindro Lego
        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.roundRect(-34, -304 + breathe, 68, 72, 18); ctx.fill();
        ctx.fillRect(-16, -322 + breathe, 32, 18);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(8, -272 + breathe, 5, 0, Math.PI * 2); ctx.arc(24, -272 + breathe, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(16, -256 + breathe, 12, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
        ctx.restore();
        return;
      }

      if (VISUAL_STYLE === 'pixel_art') {
        const px = (v) => Math.round(v / 6) * 6;
        ctx.fillStyle = S.ink;
        ctx.fillRect(px(-28), px(-112), 18, 110);
        ctx.fillRect(px(10), px(-112), 18, 110);
        ctx.fillStyle = shirt;
        ctx.fillRect(px(-30), px(-224 + breathe), 60, 114);
        ctx.fillStyle = S.rim;
        ctx.fillRect(px(rimSide >= 0 ? 24 : -30), px(-224 + breathe), 6, 114);
        ctx.fillStyle = S.ink;
        ctx.fillRect(px(-42), px(-316 + breathe), 84, 84);
        ctx.fillStyle = S.rim;
        ctx.fillRect(px(36), px(-316 + breathe), 6, 84);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px(6), px(-284 + breathe), 12, 12);
        ctx.fillRect(px(24), px(-284 + breathe), 12, 12);
        ctx.restore();
        return;
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Membros distantes (inkFar)
      ctx.strokeStyle = S.inkFar;
      ctx.lineWidth = 15;
      ctx.beginPath(); ctx.moveTo(-8, -110 + breathe); ctx.lineTo(-28, -52); ctx.lineTo(-22, -2); ctx.lineTo(-6, -2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -210 + breathe); ctx.lineTo(-42, -162 + breathe); ctx.lineTo(-26, -124 + breathe); ctx.stroke();

      // Perna frontal
      ctx.strokeStyle = VISUAL_STYLE === 'esboco_neon' ? S.accent : S.ink;
      ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(8, -110 + breathe); ctx.lineTo(28, -54); ctx.lineTo(24, -2); ctx.lineTo(44, -2); ctx.stroke();

      // Tronco
      if (VISUAL_STYLE === 'quadro_negro' || VISUAL_STYLE === 'esboco_neon') {
        ctx.strokeStyle = S.rim;
        ctx.lineWidth = 6;
        ctx.strokeRect(-26, -225 + breathe, 56, 116);
      } else {
        ctx.fillStyle = shirt;
        ctx.beginPath();
        ctx.moveTo(-26, -225 + breathe); ctx.lineTo(26, -225 + breathe);
        ctx.lineTo(32, -106 + breathe); ctx.lineTo(-30, -106 + breathe);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = S.rim; ctx.lineWidth = 4.5;
        ctx.beginPath();
        if (rimSide >= 0) { ctx.moveTo(26, -225 + breathe); ctx.lineTo(32, -110 + breathe); }
        else { ctx.moveTo(-26, -225 + breathe); ctx.lineTo(-30, -110 + breathe); }
        ctx.stroke();
      }

      // Braco frontal
      ctx.strokeStyle = VISUAL_STYLE === 'esboco_neon' ? S.rim : S.ink;
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(12, -212 + breathe);
      if (armPose === 'catch') { ctx.lineTo(66, -182 + breathe); ctx.lineTo(122, -206 + breathe); }
      else if (armPose === 'think') { ctx.lineTo(54, -184 + breathe); ctx.lineTo(28, -238 + breathe); }
      else { ctx.lineTo(46, -162 + breathe); ctx.lineTo(62, -122 + breathe); }
      ctx.stroke();

      // Cabeca com rim light e piscar
      ctx.save();
      ctx.translate(0, -274 + breathe);
      ctx.fillStyle = VISUAL_STYLE === 'quadro_negro' ? 'rgba(26,50,38,0.9)' : S.ink;
      ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = S.rim; ctx.lineWidth = 5;
      ctx.beginPath();
      if (VISUAL_STYLE === 'quadro_negro' || VISUAL_STYLE === 'esboco_neon') ctx.arc(0, 0, 50, 0, Math.PI * 2);
      else if (rimSide >= 0) ctx.arc(0, 0, 50, -Math.PI * 0.45, Math.PI * 0.4);
      else ctx.arc(0, 0, 50, Math.PI * 0.6, Math.PI * 1.45);
      ctx.stroke();

      const eyeColor = VISUAL_STYLE === 'quadrinhos' ? '#ffffff' : '#f8fafc';
      const isBlink = (t % 3.1) > 2.98;
      ctx.fillStyle = eyeColor;
      if (isBlink) {
        ctx.strokeStyle = eyeColor; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(18, -6); ctx.moveTo(26, -6); ctx.lineTo(38, -6); ctx.stroke();
      } else {
        const er = expr === 'shocked' ? 7.5 : 5.5;
        ctx.beginPath(); ctx.arc(13, -7, er, 0, Math.PI * 2); ctx.arc(32, -7, er * 0.9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = eyeColor; ctx.lineWidth = 3.2;
      ctx.beginPath();
      if (expr === 'shocked') ctx.ellipse(22, 16, 7, 10, 0, 0, Math.PI * 2);
      else if (expr === 'smirk') { ctx.moveTo(14, 14); ctx.quadraticCurveTo(24, 21, 34, 11); }
      else { ctx.moveTo(15, 15); ctx.lineTo(31, 15); }
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    };

    if (speedTrail > 0) {
      for (let k = speedTrail; k >= 1; k--) renderBody(0.14 / k, -k * 36 * facing);
    }
    renderBody(1, 0);
  }

  function drawTopHeadline(S, sc, alpha) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = VISUAL_STYLE === 'quadrinhos' ? '#fffbeb' : 'rgba(6, 9, 18, 0.85)';
    ctx.lineWidth = 14;
    ctx.font = '900 ' + (IS_VERT ? 56 : 52) + 'px "Segoe UI", sans-serif';
    const words = sc.title.split(' ');
    const mid = Math.ceil(words.length / 2);
    const l1 = words.slice(0, mid).join(' ');
    const l2 = words.slice(mid).join(' ');
    const y1 = IS_VERT ? 185 : 115;
    ctx.strokeText(l1, W / 2, y1);
    ctx.fillStyle = S.accent;
    ctx.fillText(l1, W / 2, y1);
    if (l2) {
      ctx.strokeText(l2, W / 2, y1 + 74);
      ctx.fillStyle = VISUAL_STYLE === 'quadrinhos' ? '#111827' : '#ffffff';
      ctx.fillText(l2, W / 2, y1 + 74);
    }
    ctx.restore();
  }

  function renderScene_CafeHook(S, sc, t, u) {
    drawBg(S, t, true);
    const gy = H * (IS_VERT ? 0.68 : 0.78);
    ctx.save();
    const z = 1 + 0.06 * u;
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2 - 20 * u, -H / 2);

    const lx = W * (IS_VERT ? 0.24 : 0.34);
    const rx = W * (IS_VERT ? 0.65 : 0.62);
    const dash = easeOutCubic(clamp((u - 0.15) / 0.45, 0, 1));
    const hx = lerp(W * 0.9, rx, dash);

    drawHero(S, { x: lx, y: gy, scale: IS_VERT ? 1.55 : 1.35, facing: 1, t, shirt: '#3a6ea5', rimSide: 1, expr: 'shocked', armPose: 'think' });
    ctx.fillStyle = '#3b2416';
    ctx.fillRect(W / 2 - 180, gy - 148, 360, 22);
    ctx.fillRect(W / 2 - 150, gy - 126, 20, 126);
    ctx.fillRect(W / 2 + 130, gy - 126, 20, 126);
    drawHero(S, { x: hx, y: gy, scale: IS_VERT ? 1.6 : 1.4, facing: -1, t, shirt: sc.shirtColor || HERO_SHIRT, rimSide: -1, expr: 'smirk', armPose: 'catch', speedTrail: dash > 0.05 && dash < 0.98 ? 4 : 0 });
    ctx.restore();

    if (u < 0.72) drawTopHeadline(S, sc, u < 0.12 ? u / 0.12 : u > 0.58 ? (0.72 - u) / 0.14 : 1);
  }

  function renderScene_DataCompare(S, sc, t, u) {
    drawBg(S, t, true);
    ctx.fillStyle = 'rgba(6, 10, 22, 0.74)';
    ctx.fillRect(0, 0, W, H);
    const items = (sc.chartItems && sc.chartItems.length) ? sc.chartItems : [{ label: 'REFERÊNCIA', value: 250 }, { label: 'DESTAQUE', value: 25 }];
    const maxV = Math.max(1, ...items.map((it) => Number(it.value) || 0));
    const cardW = IS_VERT ? 880 : 1120;
    const cardH = 190 + items.length * 175;
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2 - (IS_VERT ? 110 : 40);

    const pop = easeOutBack(clamp(u / 0.25, 0, 1));
    ctx.save();
    ctx.translate(W / 2, cardY + cardH / 2); ctx.scale(pop, pop); ctx.translate(-W / 2, -(cardY + cardH / 2));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = S.blue; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 28); ctx.fill(); ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 30px "Segoe UI", sans-serif';
    ctx.fillText(sc.title.toUpperCase(), cardX + 54, cardY + 74);

    items.forEach((it, idx) => {
      const prog = easeOutCubic(clamp((u - idx * 0.18) / 0.35, 0, 1));
      const by = cardY + 150 + idx * 170;
      const bw = cardW - 110;
      const fillW = Math.max(24, (Number(it.value) / maxV) * bw * prog);
      ctx.fillStyle = idx === items.length - 1 ? S.accent : '#e2e8f0';
      ctx.font = '900 34px "Segoe UI", sans-serif';
      ctx.fillText(String(it.label).toUpperCase(), cardX + 54, by);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.roundRect(cardX + 54, by + 20, bw, 58, 14); ctx.fill();
      ctx.fillStyle = it.color || (idx === items.length - 1 ? S.accent : '#64748b');
      ctx.beginPath(); ctx.roundRect(cardX + 54, by + 20, fillW, 58, 14); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(Number(it.value) * prog)), cardX + bw + 34, by + 62);
      ctx.textAlign = 'left';
    });
    ctx.restore();
  }

  function renderScene_Freeze10X(S, sc, t, u) {
    const F = MOODS.midnight;
    drawBg(F, 0.5, true);
    ctx.fillStyle = 'rgba(10, 35, 85, 0.32)';
    ctx.fillRect(0, 0, W, H);
    const gy = H * (IS_VERT ? 0.68 : 0.78);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(1.02 + 0.08 * u, 1.02 + 0.08 * u);
    ctx.rotate((u - 0.5) * 0.035);
    ctx.translate(-W / 2, -H / 2);

    for (let r = 0; r < 3; r++) {
      ctx.strokeStyle = 'rgba(110, 200, 255, ' + (0.28 - r * 0.07) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(W / 2, gy - 320, 160 + r * 92 + u * 24, 0, Math.PI * 2); ctx.stroke();
    }
    drawHero(F, { x: lerp(W * 0.58, W * 0.52, u), y: gy, scale: IS_VERT ? 1.7 : 1.45, facing: -1, t, shirt: sc.shirtColor || HERO_SHIRT, rimSide: 1, expr: 'smirk', armPose: 'think' });
    ctx.restore();

    // Badge no canto superior direito
    ctx.save();
    const sp = easeOutBack(clamp(u / 0.2, 0, 1));
    ctx.translate(W - 185, 170); ctx.scale(sp, sp);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; ctx.strokeStyle = F.accent; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(-105, -48, 210, 96, 20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = F.accent; ctx.textAlign = 'center'; ctx.font = '900 46px "Segoe UI", sans-serif';
    ctx.fillText(sc.badge || '10X', 0, 16);
    ctx.restore();

    if (u < 0.08) {
      ctx.fillStyle = 'rgba(255,255,255,' + ((0.08 - u) / 0.08) * 0.85 + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function renderScene_Blueprint(S, sc, t, u) {
    ctx.fillStyle = '#07142b';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.13)'; ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '800 34px "Segoe UI", sans-serif';
    ctx.fillText(sc.title.toUpperCase(), W / 2, IS_VERT ? 185 : 110);

    const nodes = (sc.chartItems && sc.chartItems.length >= 2)
      ? sc.chartItems.slice(0, 3).map((it, i) => ({ label: String(it.label), sub: i === sc.chartItems.length - 1 ? (sc.subtitle || 'LIMITE') : 'ETAPA ' + (i + 1), color: i === 0 ? '#f2c14e' : i === 1 ? '#38bdf8' : '#f43f5e' }))
      : [
          { label: 'CÉREBRO', sub: 'RESPOSTA RÁPIDA', color: '#f2c14e' },
          { label: 'SINAL ELÉTRICO', sub: 'TRANSMISSÃO', color: '#38bdf8' },
          { label: 'MÚSCULO', sub: 'LIMITE BIOLÓGICO', color: '#f43f5e' },
        ];

    const topY = IS_VERT ? 380 : 250;
    const stepY = IS_VERT ? 295 : 220;
    const lastY = topY + (nodes.length - 1) * stepY;
    const lineEnd = lerp(topY, lastY, clamp(u / 0.55, 0, 1));

    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 6; ctx.setLineDash([16, 12]);
    ctx.beginPath(); ctx.moveTo(W / 2, topY); ctx.lineTo(W / 2, lineEnd); ctx.stroke();
    ctx.setLineDash([]);

    const py = topY + ((t * 400) % Math.max(100, lastY - topY));
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath(); ctx.arc(W / 2, Math.min(py, lineEnd), 13, 0, Math.PI * 2); ctx.fill();

    nodes.forEach((nd, idx) => {
      const ny = topY + idx * stepY;
      const active = u >= idx * 0.22;
      ctx.fillStyle = '#0b1e3d';
      ctx.strokeStyle = active ? nd.color : '#334155';
      ctx.lineWidth = active ? 5 : 2;
      const bw = IS_VERT ? 700 : 820;
      ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2, ny - 76, bw, 152, 24); ctx.fill(); ctx.stroke();
      ctx.fillStyle = active ? '#ffffff' : '#64748b';
      ctx.font = '900 42px "Segoe UI", sans-serif';
      ctx.fillText(nd.label.toUpperCase(), W / 2, ny - 6);
      ctx.fillStyle = active ? nd.color : '#475569';
      ctx.font = '800 26px "Segoe UI", sans-serif';
      ctx.fillText(nd.sub.toUpperCase(), W / 2, ny + 40);
    });
    ctx.restore();
  }

  function renderScene_BigFace(S, sc, t, u) {
    drawBg(S, t, false);
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.34)'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 60; i++) {
      const rx = (hash(i + 2) * W + t * 180) % W;
      const ry = (hash(i + 8) * H + t * 1400) % H;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 14, ry + 52); ctx.stroke();
    }
    ctx.restore();

    const g = ctx.createRadialGradient(W * 0.22, H * 0.34, 20, W * 0.22, H * 0.34, 480);
    g.addColorStop(0, S.rim); g.addColorStop(0.45, S.fog); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = 0.72; ctx.fillStyle = g; ctx.fillRect(0, 120, W, H * 0.65); ctx.restore();

    const cx = W * 0.55, cy = H * (IS_VERT ? 0.44 : 0.48);
    const z = 1 + 0.08 * u;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(z, z);
    ctx.fillStyle = sc.shirtColor || HERO_SHIRT;
    ctx.beginPath(); ctx.ellipse(0, 440, 420, 240, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = S.ink;
    ctx.beginPath(); ctx.arc(0, 0, 295, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = S.rim; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(0, 0, 293, Math.PI * 0.65, Math.PI * 1.48); ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-90, -18, 40, 46, 0, 0, Math.PI * 2); ctx.ellipse(58, -18, 34, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(-96, -18, 12, 0, Math.PI * 2); ctx.arc(50, -18, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-142, -88); ctx.lineTo(-46, -70); ctx.moveTo(14, -70); ctx.lineTo(100, -88); ctx.stroke();
    ctx.restore();
  }

  function renderScene_ActionStage(S, sc, t, u) {
    drawBg(S, t, true);
    const gy = H * (IS_VERT ? 0.68 : 0.78);
    ctx.save();
    const z = 1 + 0.05 * u;
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    drawHero(S, { x: W * 0.48, y: gy, scale: IS_VERT ? 1.6 : 1.38, facing: 1, t, shirt: sc.shirtColor || HERO_SHIRT, rimSide: 1, expr: sc.expression || 'smirk', armPose: 'think' });
    ctx.restore();
    drawTopHeadline(S, sc, easeOutCubic(clamp(u / 0.25, 0, 1)));
  }

  function renderScene_EndCta(S, sc, t, u) {
    drawBg(S, t, true);
    ctx.fillStyle = 'rgba(6, 9, 18, 0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = easeOutCubic(clamp(u / 0.35, 0, 1));
    ctx.textAlign = 'center';
    ctx.fillStyle = S.accent;
    ctx.font = 'italic 900 ' + (IS_VERT ? 66 : 62) + 'px Georgia, serif';
    ctx.fillText(sc.title, W / 2, H * (IS_VERT ? 0.34 : 0.28));
    drawHero(S, { x: W / 2, y: H * (IS_VERT ? 0.64 : 0.72), scale: IS_VERT ? 1.3 : 1.05, facing: 1, t, shirt: sc.shirtColor || HERO_SHIRT, rimSide: 1, expr: 'smirk', armPose: 'idle' });
    ctx.fillStyle = S.accent;
    ctx.beginPath(); ctx.roundRect(W / 2 - 250, H * (IS_VERT ? 0.72 : 0.80), 500, 84, 42); ctx.fill();
    ctx.fillStyle = '#0b0e18';
    ctx.font = '900 32px "Segoe UI", sans-serif';
    ctx.fillText((sc.subtitle || 'COMENTE SUA ESCOLHA').toUpperCase(), W / 2, H * (IS_VERT ? 0.72 : 0.80) + 52);
    ctx.restore();
  }

  function drawCaptions(t) {
    if (!WORDS.length) return;
    let activeIdx = -1;
    for (let i = 0; i < WORDS.length; i++) {
      if (t >= WORDS[i].inicio && t <= WORDS[i].fim + 0.12) { activeIdx = i; break; }
      if (t > WORDS[i].fim) activeIdx = i;
    }
    if (activeIdx < 0) return;

    const chunkIdx = Math.floor(activeIdx / 3);
    const slice = WORDS.slice(chunkIdx * 3, chunkIdx * 3 + 3);
    if (!slice.length) return;

    const y = H * (IS_VERT ? 0.79 : 0.88);
    ctx.save();
    ctx.font = '900 ' + (IS_VERT ? 52 : 48) + 'px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    const gap = 18;
    const widths = slice.map((w) => ctx.measureText(w.palavra.toUpperCase()).width);
    const totalW = widths.reduce((a, b) => a + b, 0) + gap * (slice.length - 1);
    let curX = W / 2 - totalW / 2;

    ctx.fillStyle = 'rgba(7, 10, 20, 0.74)';
    ctx.beginPath(); ctx.roundRect(curX - 32, y - 46, totalW + 64, 92, 22); ctx.fill();

    for (let i = 0; i < slice.length; i++) {
      const w = slice[i];
      const txt = w.palavra.toUpperCase();
      const isAct = t >= w.inicio && t <= w.fim + 0.1;
      ctx.textAlign = 'left';
      ctx.lineWidth = 8; ctx.strokeStyle = '#03050a'; ctx.strokeText(txt, curX, y);
      ctx.fillStyle = isAct ? '#f2c14e' : '#ffffff';
      ctx.fillText(txt, curX, y);
      curX += widths[i] + gap;
    }
    ctx.restore();
  }

  window.__dtSeek = function(timeSec) {
    const t = clamp(Number(timeSec) || 0, 0, DURATION);
    const sc = activeScene(t);
    const u = clamp((t - sc.start) / Math.max(0.1, sc.end - sc.start), 0, 1);

    let moodKey = DEFAULT_MOOD;
    if (sc.sceneKind === 'freeze_10x' || sc.sceneKind === 'blueprint') moodKey = DEFAULT_MOOD === 'dusk' ? 'midnight' : DEFAULT_MOOD;
    else if (sc.sceneKind === 'big_face' && DEFAULT_MOOD === 'dusk') moodKey = 'golden';

    const S = applyStyleOverride(MOODS[moodKey] || MOODS.dusk);
    ctx.clearRect(0, 0, W, H);

    if (sc.sceneKind === 'cafe_hook') renderScene_CafeHook(S, sc, t, u);
    else if (sc.sceneKind === 'data_compare') renderScene_DataCompare(S, sc, t, u);
    else if (sc.sceneKind === 'freeze_10x') renderScene_Freeze10X(S, sc, t, u);
    else if (sc.sceneKind === 'blueprint') renderScene_Blueprint(S, sc, t, u);
    else if (sc.sceneKind === 'big_face') renderScene_BigFace(S, sc, t, u);
    else if (sc.sceneKind === 'end_cta') renderScene_EndCta(S, sc, t, u);
    else renderScene_ActionStage(S, sc, t, u);

    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.32, W / 2, H / 2, H * 0.65);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, S.vig);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    if (sc.sceneKind !== 'end_cta') drawCaptions(t);
  };

  window.__dtSeek(0);
})();
</script>
</body>
</html>`;
}
