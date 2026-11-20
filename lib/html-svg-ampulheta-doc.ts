import fs from 'node:fs';
import path from 'node:path';

export type AmpulhetaSceneKind =
  | 'hourglass_intro'
  | 'drakkar_sea'
  | 'island_panorama'
  | 'scribes_desk'
  | 'narrator_interior'
  | 'animated_map'
  | 'triptych_cards'
  | 'council_hud';

export type AmpulhetaHairStyle = 'long_blonde' | 'monk_tonsure' | 'beard_brown' | 'crown_king' | 'braids_female';

export interface AmpulhetaTriptychItem {
  label: string;
  motif?: 'farmer' | 'fisher' | 'smith' | 'scholar' | 'sailor' | 'merchant';
}

export interface AmpulhetaSceneInput {
  sceneKind?: AmpulhetaSceneKind;
  title?: string;
  subtitle?: string;
  spokenLine?: string;
  dialogueText?: string;
  badge?: string;
  yearLabel?: string;
  callout?: string;
  durationSec?: number;
  captionMode?: 'trailer' | 'documentary';
  hairStyle?: AmpulhetaHairStyle;
  skinTone?: string;
  tunicColor?: string;
  stormy?: boolean;
  aurora?: boolean;
  strikeWord?: string;
  manuscriptLines?: string[];
  triptychItems?: AmpulhetaTriptychItem[];
  hudTopics?: string[];
  activeTopicIndex?: number;
  mapRegionLabel?: string;
  expression?: string;
}

export interface AmpulhetaCompileContext {
  title: string;
  width: number;
  height: number;
  viewW: number;
  viewH: number;
  totalDur: number;
  palette: [string, string, string];
  scenes: AmpulhetaSceneInput[];
}

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeJson = (val: unknown): string => JSON.stringify(val).replace(/</g, '\\u003c');

/**
 * Gera trilha ambiente documental procedural (drone grave suave + brisa maritima discreta)
 * para ser usada sozinha ou mixada em baixo volume (-18dB) sob a voz Edge TTS.
 */
export function writeAmpulhetaAmbientWav(outPath: string, totalDurSec: number): string {
  const sr = 22050;
  const dur = Math.max(2, totalDurSec);
  const totalSamples = Math.round(sr * dur);
  const dataBytes = totalSamples * 2;
  const buf = Buffer.alloc(44 + dataBytes);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
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
  buf.writeUInt32LE(dataBytes, 40);

  let rng = 987654321;
  let lp = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sr;
    rng = (1664525 * rng + 1013904223) >>> 0;
    const white = (rng / 0xffffffff) * 2 - 1;
    lp = lp * 0.96 + white * 0.04;

    const fadeIn = Math.min(1, t / 0.8);
    const fadeOut = Math.min(1, Math.max(0, (dur - t) / 1.0));
    const swell = 0.72 + 0.28 * Math.sin(2 * Math.PI * 0.14 * t);
    const drone =
      Math.sin(2 * Math.PI * 73.42 * t) * 0.042 +
      Math.sin(2 * Math.PI * 110.0 * t) * 0.025 +
      Math.sin(2 * Math.PI * 174.61 * t) * 0.011;
    const seaWind = lp * 0.03 * swell;
    const sample = Math.max(-0.85, Math.min(0.85, (drone + seaWind) * fadeIn * fadeOut));
    buf.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return outPath;
}

/**
 * Sequência padrão fiel ao ritmo e gramática visual do canal Ampulheta (VIKINGS: Trailer + Cap. 1 e 2).
 */
export function buildDefaultAmpulhetaScenes(): AmpulhetaSceneInput[] {
  return [
    {
      sceneKind: 'hourglass_intro',
      title: 'AMPULHETA',
      subtitle: 'Da era antiga aos homens do norte',
      spokenLine: 'Essa é a história completa dos vikings, a de verdade, que a série não conta.',
      badge: '01 · ABERTURA',
      captionMode: 'documentary',
      durationSec: 5.5,
    },
    {
      sceneKind: 'drakkar_sea',
      title: 'Travessia pelo Mar do Norte',
      subtitle: 'Drakkars cruzando a neblina e a tempestade',
      spokenLine: 'Em 793, eles atravessaram tempestades em barcos leves de madeira e vela listrada.',
      badge: '02 · TRAVESSIA',
      captionMode: 'trailer',
      stormy: true,
      durationSec: 5.5,
    },
    {
      sceneKind: 'island_panorama',
      title: 'Ilha de Lindisfarne',
      subtitle: 'Costa nordeste da Inglaterra',
      spokenLine: 'Na ilha de Lindisfarne, o mosteiro rico ficava na beira do mar, sem nenhuma defesa.',
      badge: '03 · LINDISFARNE',
      yearLabel: '793',
      callout: 'LINDISFARNE · COSTA NORDESTE DA INGLATERRA',
      captionMode: 'documentary',
      durationSec: 6.0,
    },
    {
      sceneKind: 'scribes_desk',
      title: 'An. dccxciii.',
      subtitle: 'Erro de cópia corrigido nos manuscritos',
      spokenLine: 'O copista anotou janeiro, mas os historiadores corrigiram o ataque para 8 de junho.',
      badge: '04 · MANUSCRITO',
      callout: 'CRÔNICA ANGLO-SAXÔNICA',
      strikeWord: 'JANEIRO',
      manuscriptLines: [
        'Her waeron rede forebecna cumene',
        'ofer Nordhymbra land, 7 thaet folc',
        'earmlice bregdon, thaet waeron',
        'ormete thodenas 7 ligrescas, 7',
        'fyrenne dracan waeron gesewene',
        'on tham lyfte fleogende. Myrce',
        'aefter tham, thaes ilcan geares',
        'on vi id. ianr — 8 de Junho.',
      ],
      captionMode: 'documentary',
      durationSec: 6.0,
    },
    {
      sceneKind: 'narrator_interior',
      title: 'ALCUÍNO',
      subtitle: 'UM INGLÊS DE YORK · PROFESSOR DO REI',
      spokenLine: 'Para Alcuíno, era o fim de um mundo. Mas em menos de trezentos anos, tudo mudou.',
      badge: '05 · A CORTE',
      callout: 'ALCUÍNO · UM INGLÊS DE YORK · PROFESSOR DO REI',
      hairStyle: 'monk_tonsure',
      tunicColor: '#3B4859',
      captionMode: 'documentary',
      durationSec: 6.0,
    },
    {
      sceneKind: 'animated_map',
      title: 'VIKINGS',
      subtitle: 'Rotas da Escandinávia à Rússia e América',
      spokenLine: 'Eles não eram uma nação chamada vikings. Viking era a atividade sazonal no mar.',
      badge: '06 · ROTAS',
      mapRegionLabel: 'VIKINGS',
      callout: 'MAR DO NORTE & BÁLTICO',
      captionMode: 'documentary',
      durationSec: 5.5,
    },
    {
      sceneKind: 'triptych_cards',
      title: 'O Resto do Ano no Norte',
      subtitle: 'Três ofícios fora do verão',
      spokenLine: 'No resto do ano, o mesmo sujeito era fazendeiro, pescador ou ferreiro.',
      badge: '07 · OFÍCIOS',
      triptychItems: [
        { label: 'FAZENDEIRO', motif: 'farmer' },
        { label: 'PESCADOR', motif: 'fisher' },
        { label: 'FERREIRO', motif: 'smith' },
      ],
      captionMode: 'documentary',
      durationSec: 5.5,
    },
    {
      sceneKind: 'council_hud',
      title: 'Por Que Saíram de Casa?',
      subtitle: 'As quatro hipóteses históricas',
      spokenLine: 'Por que saíram de casa? Falta de noivas, prata árabe, oportunidade e vingança pagã.',
      badge: '08 · HIPÓTESES',
      hudTopics: ['1 · NOIVAS?', '2 · PRATA', '3 · CHANCE', '4 · VINGANÇA?'],
      activeTopicIndex: 1,
      captionMode: 'documentary',
      durationSec: 6.0,
    },
  ];
}

/**
 * Compila o motor visual editorial Ampulheta 2D (V3 — Fidelidade Real):
 * - Zero Flat Fill: iluminacao top-left 2-tons, sombras projetadas, grain overlay SVG (feTurbulence 4.5%);
 * - Mapa geográfico real vetorizado da Europa + Ilhas Britanicas + Irlanda + Islandia + Escandinavia;
 * - Arquitetura com texturas de tabuas, cerca em perspectiva, telhados 3D, manuscrito gotico denso e salao rico;
 * - Rig editorial de personagem com sombra facial, nariz, olheiras, trancas/broches e maos reais em objetos.
 */
export function buildAmpulhetaDocHtml(ctx: AmpulhetaCompileContext): string {
  const scenes =
    Array.isArray(ctx.scenes) && ctx.scenes.length > 0 && ctx.scenes.some((s) => s.sceneKind)
      ? ctx.scenes
      : buildDefaultAmpulhetaScenes();

  let cursor = 0;
  const scheduled = scenes.map((sc, i) => {
    const dur = Math.max(1.8, Math.min(30, Number(sc.durationSec) || 5.0));
    const start = cursor;
    cursor += dur;
    return { ...sc, index: i, durationSec: dur, start, end: cursor };
  });
  const totalDur = Math.max(2, cursor);
  const scenesJson = safeJson(scheduled);
  const [bgHex, accentHex, secHex] = ctx.palette;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>${esc(ctx.title || 'Ampulheta 2D V3')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: ${esc(bgHex || '#0B1020')};
    font-family: 'Segoe UI', Roboto, system-ui, sans-serif;
  }
  #stage {
    position: relative;
    width: ${ctx.width}px;
    height: ${ctx.height}px;
    overflow: hidden;
    background: ${esc(bgHex || '#0B1020')};
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .amp-grain {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    opacity: 0.055;
    mix-blend-mode: overlay;
  }
</style>
</head>
<body>
<div id="stage">
  <canvas id="amp_canvas" width="${ctx.width}" height="${ctx.height}"></canvas>
  <svg class="amp-grain" xmlns="http://www.w3.org/2000/svg">
    <filter id="grainF">
      <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#grainF)"/>
  </svg>
</div>
<script>
(function() {
  const SCENES = ${scenesJson};
  const TOTAL = ${totalDur};
  const canvas = document.getElementById('amp_canvas');
  const g = canvas.getContext('2d');
  const W = ${ctx.width};
  const H = ${ctx.height};
  const VW = 1920;
  const VH = 1080;
  const fitScale = Math.min(W / VW, H / VH);
  const coverScale = Math.max(W / VW, H / VH);

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(x) { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
  function lerp(a, b, k) { return a + (b - a) * k; }

  function applyStage(zoom, panX, panY) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.translate(W * 0.5 + (panX || 0) * fitScale, H * 0.5 + (panY || 0) * fitScale);
    const s = (W < H ? coverScale * 0.62 : fitScale) * (zoom || 1);
    g.scale(s, s);
    g.translate(-VW * 0.5, -VH * 0.5);
  }

  function resetHudTransform() {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.translate(W * 0.5, H * 0.5);
    const s = W < H ? coverScale * 0.62 : fitScale;
    g.scale(s, s);
    g.translate(-VW * 0.5, -VH * 0.5);
  }

  function drawVignette(strength) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    const rad = g.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.36, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
    rad.addColorStop(0, 'rgba(0,0,0,0)');
    rad.addColorStop(1, 'rgba(5,8,15,' + clamp(strength ?? 0.36, 0, 0.85) + ')');
    g.fillStyle = rad;
    g.fillRect(0, 0, W, H);
    g.restore();
  }

  function drawWoodPlanks(x, y, w, h, baseHex, plankStep, alpha) {
    g.save();
    g.fillStyle = baseHex;
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(0,0,0,' + (alpha || 0.14) + ')';
    for (let px = x; px < x + w; px += plankStep) g.fillRect(px, y, 3, h);
    g.fillStyle = 'rgba(255,255,255,0.04)';
    for (let px = x + 3; px < x + w; px += plankStep) g.fillRect(px, y, 2, h);
    g.restore();
  }

  function drawFeatherQuill(tipX, tipY, scale, wobble) {
    g.save();
    g.translate(tipX, tipY);
    g.rotate((wobble || 0) * 0.04);
    g.scale(scale || 1, scale || 1);

    g.fillStyle = '#0F172A';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(10, -14); g.lineTo(16, -8); g.closePath(); g.fill();

    g.strokeStyle = '#E7DEC8';
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(8, -10);
    g.quadraticCurveTo(54, -68, 128, -124);
    g.stroke();

    const fg = g.createLinearGradient(20, -24, 130, -128);
    fg.addColorStop(0, '#F8FAFC');
    fg.addColorStop(1, '#CBD5E1');
    g.fillStyle = fg;
    g.strokeStyle = '#94A3B8';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(22, -26);
    g.quadraticCurveTo(34, -84, 72, -104);
    g.lineTo(66, -86);
    g.lineTo(82, -110);
    g.quadraticCurveTo(108, -132, 134, -128);
    g.quadraticCurveTo(124, -88, 92, -62);
    g.lineTo(76, -68);
    g.lineTo(86, -54);
    g.quadraticCurveTo(58, -28, 22, -26);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  function drawHistoricalChar(opts) {
    const x = opts.x || 0;
    const y = opts.y || 0;
    const s = opts.scale || 1;
    const t = opts.t || 0;
    const seed = opts.seed || 0;
    const expr = opts.expr || 'neutral';
    const hairStyle = opts.hairStyle || 'beard_brown';
    const skin = opts.skin || '#DFB791';
    const skinShadow = '#C89872';
    const tunic = opts.tunic || '#5E4632';
    const tunicDark = opts.tunicDark || '#3E2E20';
    const cloak = opts.cloak || '#8B3A2B';
    const walk = opts.walk || 0;
    const blink = ((t + seed) % 3.1) > 2.95;
    const breath = Math.sin(t * 2.5 + seed) * 2.3;
    const gesture = Math.sin(t * 2.9 + seed) * (opts.talking ? 14 : 4.5);

    g.save();
    g.translate(x, y);
    g.scale(s, s);

    if (!opts.behindDesk && opts.shadow !== false) {
      g.fillStyle = 'rgba(15, 23, 42, 0.28)';
      g.beginPath();
      g.ellipse(8, 5, 56, 12, 0, 0, Math.PI * 2);
      g.fill();
    }

    if (!opts.behindDesk) {
      const stride = Math.sin(walk) * 20;
      g.lineCap = 'round';
      g.lineWidth = 21;
      g.strokeStyle = '#332924';
      g.beginPath();
      g.moveTo(-18, -124);
      g.lineTo(-18 + stride * 0.65, -14);
      g.moveTo(18, -124);
      g.lineTo(18 - stride * 0.65, -14);
      g.stroke();

      for (const bx of [-18 + stride * 0.65, 18 - stride * 0.65]) {
        g.fillStyle = '#231A15';
        g.beginPath(); g.roundRect(bx - 15, -20, 32, 18, 7); g.fill();
      }
    }

    g.translate(0, breath);

    // Back hair / braids behind shoulders
    if (hairStyle === 'long_blonde' || hairStyle === 'braids_female') {
      const bh = hairStyle === 'long_blonde' ? '#C7964B' : '#B98A46';
      g.fillStyle = bh;
      g.beginPath(); g.roundRect(-48, -304, 96, 152, 34); g.fill();
      if (hairStyle === 'braids_female') {
        g.fillStyle = '#E2BC72';
        for (const side of [-1, 1]) {
          for (let b = 0; b < 4; b++) {
            g.beginPath(); g.arc(side * 42, -238 + b * 20, 10, 0, Math.PI * 2); g.fill();
          }
        }
      }
    }

    if (opts.hasCloak) {
      g.fillStyle = cloak;
      g.beginPath();
      g.moveTo(-64, -244);
      g.quadraticCurveTo(-76, -138, -58, -86);
      g.lineTo(58, -86);
      g.quadraticCurveTo(76, -138, 64, -244);
      g.closePath();
      g.fill();
    }

    // Two-tone shaded tunic torso (top-left light, right shadow)
    const tg = g.createLinearGradient(-52, -250, 52, -100);
    tg.addColorStop(0, tunic);
    tg.addColorStop(0.7, tunic);
    tg.addColorStop(1, tunicDark);
    g.fillStyle = tg;
    g.strokeStyle = 'rgba(15, 23, 42, 0.28)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(-54, -250, 108, 154, [40, 40, 12, 12]);
    g.fill();
    g.stroke();

    // Vertical trim / tunic fold / Nordic apron straps & oval brooches
    if (hairStyle === 'monk_tonsure') {
      g.fillStyle = '#E2E8F0';
      g.beginPath(); g.moveTo(-22, -250); g.lineTo(22, -250); g.lineTo(12, -234); g.lineTo(-12, -234); g.closePath(); g.fill();
      g.strokeStyle = '#EAB308';
      g.lineWidth = 5;
      g.beginPath(); g.moveTo(0, -214); g.lineTo(0, -166); g.moveTo(-14, -198); g.lineTo(14, -198); g.stroke();
    } else if (hairStyle === 'braids_female') {
      g.fillStyle = '#B45309';
      g.fillRect(-32, -236, 12, 134);
      g.fillRect(20, -236, 12, 134);
      g.fillStyle = '#FACC15';
      g.strokeStyle = '#78350F'; g.lineWidth = 2;
      for (const sx of [-26, 26]) {
        g.beginPath(); g.ellipse(sx, -214, 11, 14, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.fillStyle = '#CBD5E1';
      g.beginPath(); g.arc(0, -234, 7, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = '#3B2B20';
      g.fillRect(-52, -148, 104, 15);
      g.fillStyle = '#D4AF37';
      g.fillRect(-11, -151, 22, 19);
    }

    // Arms & hands (support resting on desk OR raising mug OR natural gesture)
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = 20;
    g.strokeStyle = tunic;
    if (opts.deskHands) {
      // Forearms resting cleanly forward on desk surface (matching 150s!)
      g.beginPath(); g.moveTo(-50, -222); g.quadraticCurveTo(-70, -162, -24, -118); g.stroke();
      g.beginPath(); g.moveTo(50, -222); g.quadraticCurveTo(70, -162, 26 + gesture * 0.25, -122 - gesture * 0.2); g.stroke();
      g.fillStyle = skin;
      g.beginPath(); g.ellipse(-20, -116, 13, 10, 0.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(26 + gesture * 0.25, -120 - gesture * 0.2, 13, 10, -0.2, 0, Math.PI * 2); g.fill();
    } else if (opts.holdMug) {
      g.beginPath(); g.moveTo(-48, -222); g.quadraticCurveTo(-70, -176, -54, -134); g.stroke();
      const mugLift = Math.sin(t * 2.2 + seed) * 10;
      g.beginPath(); g.moveTo(48, -222); g.quadraticCurveTo(78, -196, 62, -172 - mugLift); g.stroke();
      g.fillStyle = skin;
      g.beginPath(); g.arc(-54, -134, 10, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(62, -172 - mugLift, 10, 0, Math.PI * 2); g.fill();
      // Wooden ale mug with foam
      g.fillStyle = '#78350F';
      g.fillRect(50, -198 - mugLift, 24, 30);
      g.fillStyle = '#F8FAFC';
      g.beginPath(); g.ellipse(62, -199 - mugLift, 13, 6, 0, 0, Math.PI * 2); g.fill();
    } else {
      g.beginPath(); g.moveTo(-48, -224); g.quadraticCurveTo(-74, -178, -60 - gesture * 0.35, -134 + gesture * 0.25); g.stroke();
      g.beginPath(); g.moveTo(48, -224); g.quadraticCurveTo(74, -178, 60 + gesture * 0.45, -138 - gesture * 0.4); g.stroke();
      g.fillStyle = skin;
      g.beginPath(); g.arc(-60 - gesture * 0.35, -134 + gesture * 0.25, 10, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(60 + gesture * 0.45, -138 - gesture * 0.4, 10, 0, Math.PI * 2); g.fill();
    }

    // Neck with chin shadow
    g.fillStyle = skinShadow;
    g.fillRect(-15, -268, 30, 28);
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(-15, -268, 30, 10);

    // Head with 2-tone shading, nose, cheekbones, subtle under-eye shade
    g.save();
    const headTilt = opts.talking ? Math.sin(t * 4.2 + seed) * 0.032 : Math.sin(t * 1.6 + seed) * 0.015;
    g.translate(0, -304);
    g.rotate(headTilt);

    g.fillStyle = skinShadow;
    g.beginPath(); g.arc(-43, 6, 9.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(43, 6, 9.5, 0, Math.PI * 2); g.fill();

    if (hairStyle === 'monk_tonsure') {
      g.fillStyle = '#CBD5E1';
      g.beginPath();
      g.ellipse(-38, -8, 12, 22, -0.15, 0, Math.PI * 2);
      g.ellipse(38, -8, 12, 22, 0.15, 0, Math.PI * 2);
      g.fill();
    }

    const fg = g.createLinearGradient(-42, -50, 42, 50);
    fg.addColorStop(0, skin);
    fg.addColorStop(0.62, skin);
    fg.addColorStop(1, skinShadow);
    g.fillStyle = fg;
    g.strokeStyle = 'rgba(0,0,0,0.16)';
    g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, 0, 42, 50, 0, 0, Math.PI * 2); g.fill(); g.stroke();

    // Rosy cheek + subtle under-eye lines
    g.fillStyle = 'rgba(217, 119, 87, 0.16)';
    g.beginPath(); g.ellipse(-22, 14, 11, 7, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(22, 14, 11, 7, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(130, 82, 58, 0.26)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(-15, 1, 7, 0.2, Math.PI - 0.2);
    g.stroke();
    g.beginPath();
    g.arc(15, 1, 7, 0.2, Math.PI - 0.2);
    g.stroke();

    // Sculpted shaded nose (gives editorial depth missing in V2!)
    g.fillStyle = skinShadow;
    g.beginPath();
    g.moveTo(0, -6);
    g.lineTo(-5, 11);
    g.quadraticCurveTo(0, 14, 5, 11);
    g.closePath();
    g.fill();

    // Hair / Tonsure / Crown / Headband
    if (hairStyle === 'monk_tonsure') {
      g.fillStyle = '#B8C0CC';
      g.beginPath();
      g.ellipse(-36, -12, 9, 16, -0.2, 0, Math.PI * 2);
      g.ellipse(36, -12, 9, 16, 0.2, 0, Math.PI * 2);
      g.fill();
    } else if (hairStyle === 'crown_king') {
      g.fillStyle = '#A16207';
      g.beginPath(); g.arc(0, -18, 42, Math.PI, 0); g.fill();
      const cg = g.createLinearGradient(-42, -64, 42, -28);
      cg.addColorStop(0, '#FEF08A'); cg.addColorStop(1, '#CA8A04');
      g.fillStyle = cg;
      g.beginPath();
      g.moveTo(-38, -28); g.lineTo(-42, -58); g.lineTo(-20, -40); g.lineTo(0, -64);
      g.lineTo(20, -40); g.lineTo(42, -58); g.lineTo(38, -28); g.closePath();
      g.fill();
    } else if (hairStyle === 'braids_female') {
      g.fillStyle = '#D4A857';
      g.beginPath(); g.arc(0, -16, 43, Math.PI * 0.94, Math.PI * 2.06); g.fill();
      g.fillStyle = '#B91C1C';
      g.fillRect(-41, -30, 82, 9);
      g.fillStyle = '#FACC15';
      g.fillRect(-41, -24, 82, 4);
    } else {
      const hCol = hairStyle === 'long_blonde' ? '#D4A153' : '#4A3425';
      g.fillStyle = hCol;
      g.beginPath();
      g.arc(0, -14, 43, Math.PI * 0.96, Math.PI * 2.04);
      g.quadraticCurveTo(0, -34, -43, -14);
      g.fill();
    }

    if (hairStyle === 'beard_brown' || hairStyle === 'long_blonde' || hairStyle === 'crown_king') {
      g.fillStyle = hairStyle === 'long_blonde' ? '#C58E44' : '#523928';
      g.beginPath();
      g.moveTo(-39, 8);
      g.quadraticCurveTo(-39, 54, 0, 62);
      g.quadraticCurveTo(39, 54, 39, 8);
      g.quadraticCurveTo(18, 22, 0, 18);
      g.quadraticCurveTo(-18, 22, -39, 8);
      g.closePath();
      g.fill();
    }

    // Eyes & eyebrows
    g.fillStyle = '#111827';
    for (const d of [-1, 1]) {
      if (blink) {
        g.strokeStyle = '#111827'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(d * 15 - 5, -3); g.lineTo(d * 15 + 5, -3); g.stroke();
      } else {
        g.beginPath(); g.arc(d * 15, -3, 4.1, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = hairStyle === 'monk_tonsure' ? '#94A3B8' : '#473124';
      g.lineWidth = 3.2;
      g.beginPath();
      if (expr === 'sad') { g.moveTo(d * 15 - d * 8, -12); g.lineTo(d * 15 + d * 7, -16); }
      else { g.moveTo(d * 15 - 8, -15); g.quadraticCurveTo(d * 15, -19, d * 15 + 8, -15); }
      g.stroke();
    }

    g.strokeStyle = '#7C3F30';
    g.lineWidth = 3;
    const talkOpen = opts.talking ? Math.abs(Math.sin(t * 11 + seed)) * 5 : 0;
    g.beginPath();
    if (talkOpen > 1.6) {
      g.ellipse(0, 24, 7.5, talkOpen, 0, 0, Math.PI * 2);
      g.fillStyle = '#5B251B';
      g.fill();
    } else {
      g.moveTo(-8, 24);
      g.quadraticCurveTo(0, expr === 'happy' ? 29 : 23, 8, 24);
      g.stroke();
    }
    g.restore();
    g.restore();
  }

  function drawDrakkar(x, y, scale, t, rowPhase, shieldsCount, tiltAngle, frontView) {
    g.save();
    g.translate(x, y + Math.sin(t * 2.3) * 7);
    g.rotate((tiltAngle || 0) + Math.sin(t * 1.7) * 0.025);
    g.scale(scale, scale);

    if (frontView) {
      g.fillStyle = '#4A311E'; g.fillRect(-6, -290, 12, 270); g.fillRect(-130, -260, 260, 10);
      const billow = Math.sin(t * 3.4) * 8;
      for (let sIdx = 0; sIdx < 7; sIdx++) {
        const w = 240 / 7; const x0 = -120 + sIdx * w;
        g.fillStyle = sIdx % 2 === 0 ? '#ECE6D8' : '#9B2226';
        g.beginPath(); g.moveTo(x0, -252); g.lineTo(x0 + w, -252);
        g.quadraticCurveTo(x0 + w * 0.5, -140 + billow, x0 + w * 1.06, -54);
        g.lineTo(x0 - w * 0.06, -54); g.closePath(); g.fill();
      }
      g.strokeStyle = '#9C6B43'; g.lineWidth = 4.5;
      for (const side of [-1, 1]) {
        for (let r = 0; r < 5; r++) {
          const swing = Math.sin(rowPhase + r * 0.25) * 16;
          g.beginPath(); g.moveTo(side * (42 + r * 6), -8 - r * 2); g.lineTo(side * (165 + r * 22), 34 + swing); g.stroke();
        }
      }
      g.fillStyle = '#5C3A21'; g.strokeStyle = '#382112'; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(-78, -32); g.quadraticCurveTo(0, 38, 78, -32); g.quadraticCurveTo(0, -14, -78, -32); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#4A2E1A';
      g.beginPath(); g.moveTo(-14, -12); g.lineTo(-10, -96); g.lineTo(0, -118); g.lineTo(10, -96); g.lineTo(14, -12); g.closePath(); g.fill();
      g.fillStyle = '#FACC15'; g.beginPath(); g.arc(-4, -98, 2.5, 0, Math.PI * 2); g.arc(4, -98, 2.5, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = '#4A311E'; g.fillRect(-7, -255, 14, 240); g.fillRect(-98, -220, 196, 10);
      const billow = Math.sin(t * 3.1) * 10;
      for (let sIdx = 0; sIdx < 7; sIdx++) {
        const x0 = -90 + sIdx * (180 / 7); const x1 = x0 + (180 / 7);
        g.fillStyle = sIdx % 2 === 0 ? '#ECE6D8' : '#9B2226';
        g.beginPath(); g.moveTo(x0, -210); g.lineTo(x1, -210);
        g.quadraticCurveTo(x1 + 12 + billow * 0.5, -135, x1, -64);
        g.lineTo(x0, -64); g.quadraticCurveTo(x0 + 12 + billow * 0.5, -135, x0, -210); g.closePath(); g.fill();
      }
      for (let c = -3; c <= 3; c++) {
        g.fillStyle = c % 2 === 0 ? '#78350F' : '#334155';
        g.beginPath(); g.arc(c * 34, -36 + Math.sin(t * 3 + c) * 2, 10, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#E2B990';
        g.beginPath(); g.arc(c * 34, -46 + Math.sin(t * 3 + c) * 2, 6.5, 0, Math.PI * 2); g.fill();
      }
      const hg = g.createLinearGradient(-220, -40, 220, 30);
      hg.addColorStop(0, '#704728'); hg.addColorStop(1, '#4A2E1A');
      g.fillStyle = hg; g.strokeStyle = '#2E1A0E'; g.lineWidth = 4;
      g.beginPath();
      g.moveTo(-210, -40); g.quadraticCurveTo(-245, -110, -220, -132); g.quadraticCurveTo(-195, -96, -180, -32);
      g.lineTo(185, -32); g.quadraticCurveTo(215, -92, 245, -148); g.quadraticCurveTo(278, -162, 266, -124);
      g.quadraticCurveTo(240, -82, 210, -6); g.quadraticCurveTo(0, 34, -200, -4); g.closePath(); g.fill(); g.stroke();

      const nShields = shieldsCount || 7;
      for (let sh = 0; sh < nShields; sh++) {
        const sx = -125 + sh * (250 / (nShields - 1));
        g.fillStyle = sh % 2 === 0 ? '#D97706' : '#CBD5E1';
        g.strokeStyle = '#1E293B'; g.lineWidth = 2.5;
        g.beginPath(); g.arc(sx, -16, 13, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.strokeStyle = '#855836'; g.lineWidth = 5; g.lineCap = 'round';
      for (let o = 0; o < 7; o++) {
        const ox = -110 + o * 36; const a = Math.sin(rowPhase + o * 0.12) * 0.32;
        g.save(); g.translate(ox, 2); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.lineTo(-14, 58); g.stroke(); g.restore();
      }
    }
    g.restore();
  }

  function drawOverlayGrammar(sc, p) {
    resetHudTransform();
    if (Array.isArray(sc.hudTopics) && sc.hudTopics.length > 0) {
      g.save();
      let curX = 68; const topY = 42;
      sc.hudTopics.forEach(function(topic, idx) {
        const active = idx === (sc.activeTopicIndex ?? 0);
        g.font = '700 22px "Segoe UI", sans-serif';
        const tw = g.measureText(String(topic)).width; const bw = tw + 38;
        g.fillStyle = active ? '#D95D39' : 'rgba(15, 23, 42, 0.78)';
        g.strokeStyle = active ? '#FDE68A' : 'rgba(255,255,255,0.22)';
        g.lineWidth = 2;
        g.beginPath(); g.roundRect(curX, topY, bw, 44, 8); g.fill(); g.stroke();
        g.fillStyle = '#F8FAFC'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(topic), curX + bw * 0.5, topY + 22);
        curX += bw + 12;
      });
      g.restore();
    }

    if (sc.yearLabel) {
      g.save();
      const enter = smooth(clamp(p / 0.22, 0, 1));
      g.translate(1745, 92); g.rotate(0.09);
      g.scale(lerp(1.25, 1, enter), lerp(1.25, 1, enter));
      g.globalAlpha = enter;
      g.fillStyle = '#F3EAD7'; g.strokeStyle = '#991B1B'; g.lineWidth = 5;
      g.beginPath(); g.roundRect(-102, -40, 204, 80, 10); g.fill(); g.stroke();
      g.fillStyle = '#991B1B'; g.font = '900 42px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(sc.yearLabel), 0, 2);
      g.restore();
    }

    if (sc.captionMode === 'trailer' && (sc.spokenLine || sc.dialogueText)) {
      const txt = String(sc.spokenLine || sc.dialogueText || '').toUpperCase();
      g.save();
      g.font = '800 30px "Segoe UI", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(0,0,0,0.92)'; g.shadowBlur = 14;
      g.fillStyle = '#F8FAFC';
      g.fillText(txt, VW * 0.5, 968, 1600);
      g.restore();
    } else if (sc.callout && sc.sceneKind !== 'island_panorama' && sc.sceneKind !== 'narrator_interior') {
      // Clean editorial lower-left label with subtle rule (like 146s ALCUINO!)
      const parts = String(sc.callout).split('·');
      const mainTitle = parts[0].trim();
      const subTitle = parts.slice(1).join(' · ').trim();
      g.save();
      const enter = smooth(clamp(p / 0.22, 0, 1));
      g.globalAlpha = enter;
      g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = 10;
      g.fillStyle = '#F8FAFC'; g.font = '700 32px Georgia, serif'; g.textAlign = 'left';
      g.fillText(mainTitle, 78, 956);
      g.strokeStyle = 'rgba(250, 204, 21, 0.72)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(78, 970); g.lineTo(78 + Math.min(480, g.measureText(mainTitle).width + 60), 970); g.stroke();
      if (subTitle) {
        g.fillStyle = '#CBD5E1'; g.font = '600 18px "Segoe UI", sans-serif';
        g.fillText(subTitle, 78, 996);
      }
      g.restore();
    }
  }

  function renderScene(sc, localT, totalSceneDur) {
    const p = clamp(localT / Math.max(0.1, totalSceneDur), 0, 1);
    const kind = sc.sceneKind || 'island_panorama';

    if (kind === 'hourglass_intro') {
      if (p < 0.34) {
        const ep = p / 0.34;
        applyStage(1.04, 0, 0);
        const sky = g.createLinearGradient(0, 0, VW, VH);
        sky.addColorStop(0, '#7C2D12'); sky.addColorStop(0.5, '#1D4ED8'); sky.addColorStop(1, '#312E81');
        g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
        const shift = ep * 2400;
        g.fillStyle = '#0F172A';
        const px1 = 920 - shift * 0.45;
        g.fillRect(px1, 540, 320, 34);
        for (let c = 0; c < 6; c++) g.fillRect(px1 + 24 + c * 52, 574, 22, 160);
        g.fillRect(px1 - 20, 734, 360, 44);
        const px2 = 1780 - shift * 0.55;
        g.fillRect(px2, 520, 260, 250);
        g.fillRect(px2 - 40, 460, 70, 310); g.fillRect(px2 + 230, 460, 70, 310);
        g.fillStyle = '#1E293B'; g.fillRect(0, 770, VW, 310);
        const eraLabel = ep < 0.45 ? '554 a.C.' : ep < 0.78 ? '921 d.C.' : '1842 d.C.';
        g.fillStyle = '#F8FAFC'; g.font = '800 64px "Segoe UI", sans-serif'; g.textAlign = 'center';
        g.fillText(eraLabel, VW * 0.5, 190);
      } else {
        const gp = (p - 0.34) / 0.66;
        applyStage(lerp(0.96, 1.07, gp), 0, 0);
        const bg = g.createRadialGradient(VW * 0.5, VH * 0.44, 60, VW * 0.5, VH * 0.48, 1080);
        bg.addColorStop(0, '#27355E'); bg.addColorStop(0.45, '#111936'); bg.addColorStop(1, '#04060D');
        g.fillStyle = bg; g.fillRect(0, 0, VW, VH);

        g.save();
        g.translate(VW * 0.5, VH * 0.42);
        // Subtle soft golden aura behind glass
        const aura = g.createRadialGradient(0, 0, 10, 0, 0, 320);
        aura.addColorStop(0, 'rgba(250, 204, 21, 0.24)'); aura.addColorStop(1, 'rgba(250, 204, 21, 0)');
        g.fillStyle = aura; g.beginPath(); g.arc(0, 0, 320, 0, Math.PI * 2); g.fill();

        g.strokeStyle = 'rgba(250, 204, 21, 0.16)'; g.lineWidth = 2;
        for (const r of [180, 310, 460, 640]) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
        for (let ray = 0; ray < 14; ray++) {
          const a = (ray / 14) * Math.PI * 2 + localT * 0.14;
          g.beginPath(); g.moveTo(Math.cos(a) * 140, Math.sin(a) * 140); g.lineTo(Math.cos(a) * 780, Math.sin(a) * 780); g.stroke();
        }

        // Brass frame beveled 2-tone
        const br = g.createLinearGradient(-78, -148, 78, 148);
        br.addColorStop(0, '#FDE047'); br.addColorStop(0.5, '#D97706'); br.addColorStop(1, '#78350F');
        g.fillStyle = br;
        g.fillRect(-78, -146, 156, 16); g.fillRect(-78, 130, 156, 16);
        g.fillRect(-70, -130, 8, 260); g.fillRect(62, -130, 8, 260);

        // Glass bulb silhouette
        g.fillStyle = 'rgba(148, 163, 184, 0.14)';
        g.strokeStyle = '#FACC15'; g.lineWidth = 5;
        g.beginPath();
        g.moveTo(-58, -128); g.lineTo(58, -128); g.lineTo(8, -6); g.lineTo(58, 128);
        g.lineTo(-58, 128); g.lineTo(-8, -6); g.closePath();
        g.fill(); g.stroke();

        const sandLevel = clamp(gp, 0.08, 0.94);
        const sg = g.createLinearGradient(0, -110, 0, 124);
        sg.addColorStop(0, '#FEF08A'); sg.addColorStop(1, '#EAB308');
        g.fillStyle = sg;
        g.beginPath();
        g.moveTo(-42 * (1 - sandLevel * 0.65), -114 + sandLevel * 74);
        g.lineTo(42 * (1 - sandLevel * 0.65), -114 + sandLevel * 74);
        g.lineTo(5, -10); g.lineTo(-5, -10); g.closePath(); g.fill();
        g.beginPath();
        g.moveTo(-50, 124); g.quadraticCurveTo(0, 120 - sandLevel * 115, 50, 124); g.closePath(); g.fill();
        g.strokeStyle = '#FEF08A'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(0, -8); g.lineTo(0, 120); g.stroke();
        g.restore();

        // Classical serif Ampulheta typography with golden top sheen
        const tg = g.createLinearGradient(0, 680, 0, 770);
        tg.addColorStop(0, '#FFFFFF'); tg.addColorStop(1, '#E7DEC8');
        g.fillStyle = tg;
        g.shadowColor = 'rgba(250, 204, 21, 0.35)'; g.shadowBlur = 22;
        g.font = '700 94px Georgia, serif'; g.textAlign = 'center';
        g.fillText(String(sc.title || 'AMPULHETA').toUpperCase(), VW * 0.5, 760);
        g.shadowBlur = 0;
        g.fillStyle = '#CBD5E1'; g.font = '500 28px "Segoe UI", sans-serif';
        g.fillText(String(sc.subtitle || ''), VW * 0.5, 822);
      }
      drawOverlayGrammar(sc, p);
      drawVignette(0.42);
    } else if (kind === 'drakkar_sea') {
      if (p < 0.44) {
        const fp = p / 0.44;
        applyStage(lerp(1.0, 1.08, fp), 0, 0);
        const sky = g.createLinearGradient(0, 0, 0, VH);
        sky.addColorStop(0, '#9FB0B8'); sky.addColorStop(0.55, '#6C8490'); sky.addColorStop(1, '#2B4C5E');
        g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
        g.fillStyle = '#244152'; g.fillRect(0, 560, VW, 520);
        drawDrakkar(VW * 0.5, 620, lerp(0.72, 1.62, smooth(fp)), localT, localT * 5.2, 8, 0, true);
        const fogA = lerp(0.72, 0.08, smooth(fp));
        const fog = g.createLinearGradient(0, 100, 0, 650);
        fog.addColorStop(0, 'rgba(203, 213, 225, ' + fogA.toFixed(2) + ')');
        fog.addColorStop(1, 'rgba(203, 213, 225, 0)');
        g.fillStyle = fog; g.fillRect(0, 0, VW, 680);
      } else {
        // Epic diagonal storm wave matching 10.6s frame!
        const sp = (p - 0.44) / 0.56;
        applyStage(lerp(1.0, 1.08, sp), lerp(-22, 22, sp), 0);
        const sky = g.createLinearGradient(0, 0, 0, 740);
        sky.addColorStop(0, '#1C2833'); sky.addColorStop(1, '#3D505C');
        g.fillStyle = sky; g.fillRect(0, 0, VW, VH);

        // Two-tone storm clouds & gull
        g.fillStyle = 'rgba(148, 163, 184, 0.16)';
        for (let cl = 0; cl < 4; cl++) {
          const cx = ((cl * 520 + localT * 38) % (VW + 300)) - 150;
          g.beginPath(); g.ellipse(cx, 180 + (cl % 2) * 80, 220, 42, 0, 0, Math.PI * 2); g.fill();
        }
        g.strokeStyle = '#E2E8F0'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(1160, 160); g.quadraticCurveTo(1176, 148, 1188, 162); g.quadraticCurveTo(1200, 148, 1216, 160); g.stroke();

        // Background sea crest
        g.fillStyle = '#1E3440';
        g.fillRect(0, 560, VW, 520);

        // Drakkar riding cleanly ON TOP of giant wave slope (hull + dragon prow visible above wave crest)
        const shipX = lerp(880, 1080, sp);
        const shipY = lerp(520, 468, sp);
        drawDrakkar(shipX, shipY, 1.18, localT, localT * 5.0, 8, -0.18, false);

        // Giant sweeping diagonal wave with white foam crest below the hull!
        const wg = g.createLinearGradient(0, 560, 0, VH);
        wg.addColorStop(0, '#102A3A'); wg.addColorStop(1, '#071620');
        g.fillStyle = wg;
        g.beginPath();
        g.moveTo(0, 820);
        g.quadraticCurveTo(640, 680, 1180, 545 + Math.sin(localT * 2.5) * 12);
        g.quadraticCurveTo(1480, 495, 1920, 640);
        g.lineTo(VW, VH); g.lineTo(0, VH); g.closePath();
        g.fill();

        // White foam edge along diagonal crest
        g.strokeStyle = 'rgba(226, 232, 240, 0.78)';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(0, 820);
        g.quadraticCurveTo(640, 680, 1180, 545 + Math.sin(localT * 2.5) * 12);
        g.quadraticCurveTo(1480, 495, 1920, 640);
        g.stroke();

        if (sc.stormy) {
          g.strokeStyle = 'rgba(226, 232, 240, 0.30)'; g.lineWidth = 2;
          for (let r = 0; r < 72; r++) {
            const rx = ((r * 197 + localT * 420) % (VW + 200)) - 100;
            const ry = ((r * 113 + localT * 960) % (VH + 100)) - 50;
            g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 18, ry + 44); g.stroke();
          }
        }
      }
      drawOverlayGrammar(sc, p);
      drawVignette(0.36);
    } else if (kind === 'island_panorama') {
      // Rich Lindisfarne matching 72.5s: wooden planks, projected shadows, perspective fence, huts & monk line!
      applyStage(lerp(1.0, 1.12, p), lerp(24, -24, p), 0);
      const sky = g.createLinearGradient(0, 0, 0, 500);
      sky.addColorStop(0, '#6A8392'); sky.addColorStop(0.65, '#C8AC98'); sky.addColorStop(1, '#E6C29F');
      g.fillStyle = sky; g.fillRect(0, 0, VW, 500);

      // Warm sun glow horizon right
      const sun = g.createRadialGradient(1480, 390, 20, 1480, 390, 220);
      sun.addColorStop(0, 'rgba(254, 243, 199, 0.85)'); sun.addColorStop(1, 'rgba(254, 243, 199, 0)');
      g.fillStyle = sun; g.beginPath(); g.arc(1480, 390, 220, 0, Math.PI * 2); g.fill();

      // Volumetric 2-tone clouds
      for (let cl = 0; cl < 4; cl++) {
        const cx = ((cl * 480 + localT * 18) % (VW + 300)) - 150;
        g.fillStyle = 'rgba(214, 179, 158, 0.55)';
        g.beginPath(); g.ellipse(cx, 150 + (cl % 2) * 44, 150, 24, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255, 238, 225, 0.45)';
        g.beginPath(); g.ellipse(cx - 24, 142 + (cl % 2) * 44, 100, 18, 0, 0, Math.PI * 2); g.fill();
      }

      g.fillStyle = '#4B7482'; g.fillRect(0, 420, VW, 340);
      drawDrakkar(lerp(1740, 1400, p), 468, 0.34, localT, localT * 4.0, 5, 0, false);
      drawDrakkar(lerp(1870, 1540, p), 482, 0.28, localT + 1.2, localT * 4.0, 5, 0, false);

      // Layered sandy beach & green turf mound
      g.fillStyle = '#C9AE87'; g.fillRect(0, 690, VW, 390);
      g.fillStyle = '#5D7A47';
      g.beginPath(); g.ellipse(960, 665, 860, 170, 0, 0, Math.PI * 2); g.fill();
      // Dirt walking path leading up to monastery door
      g.fillStyle = '#B89E79';
      g.beginPath(); g.moveTo(860, 585); g.lineTo(940, 585); g.lineTo(540, 1080); g.lineTo(310, 1080); g.closePath(); g.fill();

      // Perspective wooden fence posts along beach path (matching 72.5s!)
      g.fillStyle = '#3B281B';
      for (let fp = 0; fp < 6; fp++) {
        const k = fp / 5;
        const fx1 = lerp(830, 280, k); const fy1 = lerp(610, 975, k);
        const fx2 = lerp(960, 580, k); const fy2 = lerp(610, 995, k);
        const hPost = lerp(18, 48, k);
        g.fillRect(fx1, fy1 - hPost, 6, hPost);
        g.fillRect(fx2, fy2 - hPost, 6, hPost);
      }

      // Monastery projected cast shadow on turf
      g.fillStyle = 'rgba(30, 45, 22, 0.32)';
      g.beginPath(); g.moveTo(800, 590); g.lineTo(1160, 590); g.lineTo(1080, 650); g.lineTo(750, 645); g.closePath(); g.fill();

      // Monastery front & angled wooden plank walls + thatch roof (like 72.5s!)
      drawWoodPlanks(800, 450, 240, 145, '#7C5A3B', 16, 0.2);
      drawWoodPlanks(1040, 450, 110, 145, '#593F28', 16, 0.22);
      // Thatch roof front & side
      g.fillStyle = '#8F7A53';
      g.beginPath(); g.moveTo(785, 460); g.lineTo(920, 355); g.lineTo(1055, 460); g.closePath(); g.fill();
      g.fillStyle = '#6E5B3B';
      g.beginPath(); g.moveTo(920, 355); g.lineTo(1065, 355); g.lineTo(1165, 460); g.lineTo(1055, 460); g.closePath(); g.fill();
      g.strokeStyle = '#3B281B'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(920, 318); g.lineTo(920, 358); g.moveTo(906, 332); g.lineTo(934, 332); g.stroke();
      g.fillStyle = '#2B1E14'; g.fillRect(896, 520, 48, 75);

      // Small thatch huts flanking monastery (with rising smoke)
      for (const hut of [{ x: 645, y: 585, s: 1 }, { x: 1365, y: 580, s: 0.9 }]) {
        g.fillStyle = '#6E5035'; g.fillRect(hut.x - 28 * hut.s, hut.y - 34 * hut.s, 56 * hut.s, 36 * hut.s);
        g.fillStyle = '#8F7A53';
        g.beginPath(); g.moveTo(hut.x - 34 * hut.s, hut.y - 32 * hut.s); g.lineTo(hut.x, hut.y - 58 * hut.s); g.lineTo(hut.x + 34 * hut.s, hut.y - 32 * hut.s); g.closePath(); g.fill();
      }

      // Grazing fluffy sheep with cast shadows
      for (const sh of [{ x: 585, y: 635 }, { x: 1185, y: 615 }, { x: 1275, y: 638 }]) {
        const hop = Math.abs(Math.sin(localT * 1.6 + sh.x)) * 3.5;
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(sh.x, sh.y + 8, 18, 6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#F8FAFC'; g.beginPath(); g.ellipse(sh.x, sh.y - hop, 19, 12, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1E293B'; g.beginPath(); g.arc(sh.x + 17, sh.y - 4 - hop, 6, 0, Math.PI * 2); g.fill();
      }

      // 6 monks walking along diagonal path in increasing perspective size!
      for (let m = 0; m < 6; m++) {
        const k = clamp((m / 5) + localT * 0.015, 0, 1);
        drawHistoricalChar({
          x: lerp(790, 410, k),
          y: lerp(650, 960, k),
          scale: lerp(0.24, 0.56, k),
          hairStyle: 'monk_tonsure',
          tunic: '#57463B',
          tunicDark: '#3B2F27',
          walk: localT * 4.5 + m,
          t: localT,
          seed: m,
        });
      }

      // Clean white typography bottom-right matching 72.5s LINDISFARNE!
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.65)'; g.shadowBlur = 10;
      g.fillStyle = '#FFFFFF'; g.font = '800 42px "Segoe UI", sans-serif'; g.textAlign = 'right';
      g.fillText('LINDISFARNE', 1825, 932);
      g.fillStyle = '#F1F5F9'; g.font = '600 18px "Segoe UI", sans-serif';
      g.fillText('COSTA NORDESTE DA INGLATERRA', 1825, 966);
      g.restore();

      drawOverlayGrammar(sc, p);
      drawVignette(0.30);
    } else if (kind === 'scribes_desk') {
      // Rich bevelled wooden desk + gothic manuscript lines + exact circle fix on "ianr" (119.5s!)
      applyStage(lerp(1.0, 1.06, p), 0, 0);
      drawWoodPlanks(0, 0, VW, VH, '#4E3524', 210, 0.14);

      // Desk edge & bevel at top (matching 119.5s!)
      g.fillStyle = '#2E1E13'; g.fillRect(0, 215, VW, 26);
      g.fillStyle = '#7C583C'; g.fillRect(0, 200, VW, 18);

      // Window top-right starry night -> dawn
      g.fillStyle = p < 0.65 ? '#1B2838' : '#87A9B8';
      g.fillRect(1260, 0, 380, 185);
      if (p < 0.65) {
        g.fillStyle = '#F8FAFC';
        for (let st = 0; st < 22; st++) g.fillRect(1280 + (st * 47) % 340, 18 + (st * 31) % 150, 3, 3);
      } else {
        g.fillStyle = '#4B7482'; g.fillRect(1260, 115, 380, 70);
      }
      g.strokeStyle = '#38271B'; g.lineWidth = 12; g.strokeRect(1260, 0, 380, 185);

      // Top-right warm glow + beveled inkwell
      const glow = g.createRadialGradient(1480, 320, 24, 1480, 320, 760);
      glow.addColorStop(0, 'rgba(253, 224, 71, 0.28)'); glow.addColorStop(1, 'rgba(0,0,0,0.32)');
      g.fillStyle = glow; g.fillRect(0, 0, VW, VH);
      g.fillStyle = '#3B281B'; g.beginPath(); g.arc(1465, 315, 42, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0F172A'; g.beginPath(); g.arc(1465, 315, 19, 0, Math.PI * 2); g.fill();

      if (sc.strikeWord) {
        g.save();
        g.fillStyle = '#F3EAD7'; g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 16;
        g.fillRect(92, 62, 370, 116); g.shadowBlur = 0;
        g.fillStyle = '#292019'; g.font = '700 44px Georgia, serif'; g.textAlign = 'center';
        g.fillText(String(sc.strikeWord).toUpperCase(), 277, 126);
        const strikeP = smooth(clamp((p - 0.16) / 0.24, 0, 1));
        if (strikeP > 0.05) {
          g.strokeStyle = '#B91C1C'; g.lineWidth = 6;
          g.beginPath(); g.moveTo(132, 114); g.lineTo(lerp(132, 422, strikeP), 114); g.stroke();
          g.fillStyle = '#B91C1C'; g.font = '700 18px "Segoe UI", sans-serif';
          g.fillText('ERRO DE CÓPIA', 277, 158);
        }
        g.restore();
      }

      // Main dense Parchment sheet
      g.save();
      const pg = g.createLinearGradient(460, 220, 1320, 980);
      pg.addColorStop(0, '#F5EDE0'); pg.addColorStop(1, '#E3D5BC');
      g.fillStyle = pg; g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 26;
      g.fillRect(460, 240, 860, 720);
      g.restore();

      g.fillStyle = '#991B1B'; g.font = '700 34px Georgia, serif'; g.textAlign = 'center';
      g.fillText(String(sc.title || 'An. dccxciii.'), 890, 322);

      const lines = Array.isArray(sc.manuscriptLines) && sc.manuscriptLines.length
        ? sc.manuscriptLines
        : [String(sc.subtitle || ''), String(sc.spokenLine || '').slice(0, 56)];

      let penTipX = 560; let penTipY = 390;
      g.fillStyle = '#292019'; g.font = 'italic 30px Georgia, serif'; g.textAlign = 'left';

      const writeP = clamp((p - 0.06) / 0.78, 0, 1);
      const totalChars = Math.max(1, lines.reduce((acc, ln) => acc + ln.length, 0));
      let charsRemaining = Math.floor(writeP * totalChars);

      lines.forEach(function(ln, lIdx) {
        const yPos = 392 + lIdx * 58;
        const take = clamp(charsRemaining, 0, ln.length);
        const sub = ln.slice(0, take);
        if (sub) {
          g.fillText(sub, 555, yPos);
          penTipX = 555 + g.measureText(sub).width;
          penTipY = yPos;
        }
        charsRemaining -= ln.length;
      });

      // Hand + cuff + feather quill
      const handX = penTipX + 22; const handY = penTipY + 18;
      g.save();
      g.fillStyle = '#3E2B20';
      g.beginPath();
      g.moveTo(handX + 260, handY + 340); g.lineTo(handX + 345, handY + 265);
      g.lineTo(handX + 86, handY + 22); g.lineTo(handX + 28, handY + 68);
      g.closePath(); g.fill();
      g.fillStyle = '#DFB791';
      g.beginPath(); g.ellipse(handX + 22, handY + 14, 24, 18, -0.5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(handX - 2, handY - 2, 13, 8, -0.4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(handX + 6, handY + 12, 12, 8, -0.2, 0, Math.PI * 2); g.fill();
      g.restore();
      drawFeatherQuill(penTipX, penTipY, 1.32, Math.sin(localT * 14));

      drawOverlayGrammar(sc, p);
      drawVignette(0.38);
    } else if (kind === 'narrator_interior') {
      // Wide-to-medium zoom matching 146s -> 150s -> 166s: wall planks, round medallion, both hands resting on desk!
      applyStage(lerp(1.0, 1.24, smooth(p)), lerp(0, -18, p), lerp(0, 28, p));
      drawWoodPlanks(0, 0, VW, VH, '#6A513B', 160, 0.12);
      g.fillStyle = '#4B3625'; g.fillRect(0, 0, 420, VH);

      // Left bookshelf + round shield medallion above desk (matching 150s!)
      g.fillStyle = '#38271B'; g.fillRect(60, 180, 310, 560);
      for (let sh = 0; sh < 4; sh++) {
        g.fillStyle = '#251810'; g.fillRect(72, 275 + sh * 120, 286, 14);
        for (let b = 0; b < 7; b++) {
          g.fillStyle = (b + sh) % 3 === 0 ? '#991B1B' : (b + sh) % 3 === 1 ? '#1E3A8A' : '#B45309';
          g.fillRect(88 + b * 36, 200 + sh * 120, 26, 75);
        }
      }

      // Hanging satchel & framed art beside arched window (matching 150s!)
      g.fillStyle = '#8B5A2B'; g.fillRect(1285, 210, 80, 95);
      g.fillStyle = '#F3EAD7'; g.fillRect(1185, 225, 68, 84);

      // Arched window with Aachen cathedral domes outside
      g.fillStyle = '#A8C3CF'; g.beginPath(); g.roundRect(1420, 190, 360, 390, [180, 180, 0, 0]); g.fill();
      g.fillStyle = '#6D8C54'; g.fillRect(1420, 460, 360, 120);
      g.fillStyle = '#E2E8F0'; g.fillRect(1540, 390, 110, 85);
      g.beginPath(); g.arc(1595, 390, 44, Math.PI, 0); g.fill();
      g.strokeStyle = '#38271B'; g.lineWidth = 14; g.beginPath(); g.roundRect(1420, 190, 360, 390, [180, 180, 0, 0]); g.stroke();

      // Secondary monk seated behind elevated lectern
      drawHistoricalChar({
        x: 560, y: 675, scale: 0.88, hairStyle: 'beard_brown', tunic: '#5C4636', tunicDark: '#3D2E23',
        behindDesk: true, t: localT, seed: 2.1,
      });
      g.fillStyle = '#4B3625'; g.fillRect(460, 560, 200, 185);
      g.fillStyle = '#F3EAD7'; g.fillRect(505, 540, 110, 24);

      // Main narrator Alcuin behind desk WITH REAL HANDS ON DESK (deskHands: true)
      drawHistoricalChar({
        x: 980, y: 925, scale: 1.56, hairStyle: sc.hairStyle || 'monk_tonsure',
        tunic: sc.tunicColor || '#3B4859', tunicDark: '#232C38',
        behindDesk: true, deskHands: true, talking: true, expr: sc.expression || 'neutral', t: localT,
      });

      // Desk surface + open written manuscript + inkwell & upright feather quill
      g.fillStyle = '#3F2A1D'; g.fillRect(0, 740, VW, 340);
      g.fillStyle = '#2A1B12'; g.fillRect(0, 740, VW, 22);
      g.fillStyle = '#F3EAD7'; g.fillRect(740, 780, 460, 150);
      g.strokeStyle = '#94A3B8'; g.lineWidth = 2;
      for (let ln = 0; ln < 4; ln++) {
        g.beginPath(); g.moveTo(775, 812 + ln * 24); g.lineTo(1165, 812 + ln * 24); g.stroke();
      }
      g.fillStyle = '#334155'; g.fillRect(1510, 700, 54, 48);
      drawFeatherQuill(1538, 704, 1.0, Math.sin(localT * 2));

      // Clean editorial lower-left label locked in unzoomed stage safe-zone (no clearRect!)
      resetHudTransform();
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = 10;
      g.fillStyle = '#FFFFFF'; g.font = '700 36px Georgia, serif'; g.textAlign = 'left';
      g.fillText(String(sc.title || 'ALCUÍNO'), 78, 922);
      g.strokeStyle = 'rgba(250, 204, 21, 0.7)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(78, 938); g.lineTo(480, 938); g.stroke();
      g.fillStyle = '#CBD5E1'; g.font = '600 18px "Segoe UI", sans-serif';
      g.fillText(String(sc.subtitle || 'UM INGLÊS DE YORK · PROFESSOR DO REI'), 78, 968);
      g.restore();

      drawOverlayGrammar(sc, p);
      drawVignette(0.32);
    } else if (kind === 'animated_map') {
      // REAL geographical Europe + Britain + Ireland + Iceland + Scandinavia map contours (matching 206s!)
      applyStage(lerp(1.0, 1.15, smooth(p)), lerp(-22, 24, p), lerp(18, -18, p));
      const ocean = g.createRadialGradient(VW * 0.5, VH * 0.5, 100, VW * 0.5, VH * 0.5, 1100);
      ocean.addColorStop(0, '#558090'); ocean.addColorStop(1, '#3D616E');
      g.fillStyle = ocean; g.fillRect(0, 0, VW, VH);

      // Subtle map grid lines
      g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1.5;
      for (let gx = 160; gx < VW; gx += 180) { g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, VH); g.stroke(); }
      for (let gy = 140; gy < VH; gy += 180) { g.beginPath(); g.moveTo(0, gy); g.lineTo(VW, gy); g.stroke(); }

      g.fillStyle = '#D8CCA8'; g.strokeStyle = '#8C7E62'; g.lineWidth = 3;

      // Iceland (top-left)
      g.beginPath();
      g.moveTo(215, 225); g.lineTo(285, 210); g.lineTo(340, 245); g.lineTo(315, 285); g.lineTo(230, 280); g.closePath();
      g.fill(); g.stroke();

      // Ireland
      g.beginPath();
      g.moveTo(520, 625); g.lineTo(565, 610); g.lineTo(580, 675); g.lineTo(540, 725); g.lineTo(502, 685); g.closePath();
      g.fill(); g.stroke();

      // Great Britain (Scotland Highlands + Wales + Cornwall + East Coast)
      g.beginPath();
      g.moveTo(640, 480); g.lineTo(685, 470); g.lineTo(710, 520); g.lineTo(695, 575);
      g.lineTo(745, 640); g.lineTo(765, 705); g.lineTo(730, 755); g.lineTo(635, 765);
      g.lineTo(655, 720); g.lineTo(620, 680); g.lineTo(642, 625); g.lineTo(615, 560); g.closePath();
      g.fill(); g.stroke();

      // Continental Europe (France, Low Countries, Germany, Poland, Baltic shore, Rus/Russia)
      g.beginPath();
      g.moveTo(460, 1080); g.lineTo(510, 960); g.lineTo(610, 880); g.lineTo(735, 835);
      g.lineTo(860, 770); g.lineTo(935, 685); g.lineTo(1065, 640); g.lineTo(1180, 665);
      g.lineTo(1310, 620); g.lineTo(1365, 520); g.lineTo(1465, 420); g.lineTo(1560, 240);
      g.lineTo(1920, 160); g.lineTo(1920, 1080); g.closePath();
      g.fill(); g.stroke();

      // Baltic Finland landmass (beige)
      g.beginPath();
      g.moveTo(1235, 0); g.lineTo(1540, 0); g.lineTo(1500, 290); g.lineTo(1355, 345);
      g.lineTo(1265, 290); g.lineTo(1285, 195); g.closePath();
      g.fill(); g.stroke();

      // Highlighted coral Scandinavia (Norway fjords + Sweden + Jutland Denmark)
      g.fillStyle = '#D96B38'; g.strokeStyle = '#9A3412'; g.lineWidth = 3;
      // Norway + Sweden
      g.beginPath();
      g.moveTo(915, 395); g.lineTo(945, 275); g.lineTo(1035, 145); g.lineTo(1170, 35); g.lineTo(1290, 50);
      g.lineTo(1270, 140); g.lineTo(1210, 260); g.lineTo(1185, 415); g.lineTo(1110, 515);
      g.lineTo(1055, 510); g.lineTo(1015, 425); g.lineTo(955, 450); g.closePath();
      g.fill(); g.stroke();
      // Jutland / Denmark peninsula
      g.beginPath();
      g.moveTo(960, 545); g.lineTo(1015, 535); g.lineTo(1030, 610); g.lineTo(965, 618); g.closePath();
      g.fill(); g.stroke();

      // Subtle rivers in Europe
      g.strokeStyle = '#6B99AA'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(890, 825); g.quadraticCurveTo(930, 910, 975, 1010); g.stroke();
      g.beginPath(); g.moveTo(1480, 440); g.quadraticCurveTo(1560, 620, 1620, 860); g.stroke();

      // Topographic mountain triangles + ocean labels
      g.fillStyle = '#6E5035';
      for (const mt of [[1070, 260], [1035, 325], [1480, 610], [1560, 650], [1410, 790], [1165, 865]]) {
        g.beginPath(); g.moveTo(mt[0], mt[1] - 15); g.lineTo(mt[0] - 11, mt[1]); g.lineTo(mt[0] + 11, mt[1]); g.closePath(); g.fill();
      }
      g.fillStyle = 'rgba(248, 250, 252, 0.45)'; g.font = '600 18px "Segoe UI", sans-serif'; g.textAlign = 'center';
      g.fillText('MAR DO NORTE', 845, 575);
      g.fillText('MAR BÁLTICO', 1245, 485);

      // Curved dashed routes with sailing tiny drakkars
      const routes = [
        [950, 435, 825, 495, 708, 575],
        [940, 355, 620, 270, 310, 250],
        [1160, 465, 1340, 420, 1525, 565],
        [965, 575, 810, 680, 745, 820],
      ];
      const routeP = smooth(clamp(p / 0.78, 0, 1));
      routes.forEach(function(rt) {
        const [x0, y0, cx, cy, x1, y1] = rt;
        g.save();
        g.strokeStyle = '#DC2626'; g.lineWidth = 4.5; g.setLineDash([12, 9]); g.lineDashOffset = -localT * 42;
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
        g.restore();

        const u = routeP;
        const bx = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1;
        const by = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y1;
        g.fillStyle = '#78350F'; g.beginPath(); g.arc(bx, by, 9, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#F8FAFC'; g.fillRect(bx - 5, by - 14, 10, 9);
      });

      // Central VIKINGS card matching 206s
      const cardA = smooth(clamp(p / 0.25, 0, 1));
      g.save();
      g.globalAlpha = cardA;
      g.fillStyle = 'rgba(248, 245, 238, 0.94)'; g.shadowColor = 'rgba(0,0,0,0.22)'; g.shadowBlur = 18;
      g.fillRect(720, 350, 480, 114); g.shadowBlur = 0;
      g.fillStyle = '#1E293B'; g.font = '700 66px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(sc.mapRegionLabel || sc.title || 'VIKINGS'), 960, 408);
      g.restore();

      drawOverlayGrammar(sc, p);
      drawVignette(0.28);
    } else if (kind === 'triptych_cards') {
      // Rich Triptych matching 231s (mountains, water reflection, golden wheat, matte cream frames!)
      applyStage(lerp(1.0, 1.05, p), 0, 0);
      g.fillStyle = '#D9D0BA'; g.fillRect(0, 0, VW, VH);

      const items = Array.isArray(sc.triptychItems) && sc.triptychItems.length
        ? sc.triptychItems.slice(0, 3)
        : [{ label: 'FAZENDEIRO', motif: 'farmer' }, { label: 'PESCADOR', motif: 'fisher' }, { label: 'FERREIRO', motif: 'smith' }];

      const cardW = 450; const cardH = 680; const gap = 72;
      const startX = (VW - (items.length * cardW + (items.length - 1) * gap)) * 0.5;

      items.forEach(function(item, idx) {
        const enter = smooth(clamp((p - idx * 0.12) / 0.24, 0, 1));
        const cx = startX + idx * (cardW + gap);
        const cy = 165 + (1 - enter) * 36;
        g.save();
        g.globalAlpha = enter;
        g.fillStyle = '#2B241D'; g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 20;
        g.fillRect(cx - 10, cy - 10, cardW + 20, cardH + 20); g.shadowBlur = 0;
        g.fillStyle = '#EDE6D4'; g.fillRect(cx, cy, cardW, cardH);

        const ix = cx + 24; const iy = cy + 24; const iw = cardW - 48; const ih = cardH - 145;
        if (idx === 0) {
          g.fillStyle = '#89A6B5'; g.fillRect(ix, iy, iw, ih);
          g.fillStyle = '#536D7A';
          g.beginPath(); g.moveTo(ix, iy + 270); g.lineTo(ix + 115, iy + 130); g.lineTo(ix + 250, iy + 250); g.lineTo(ix + 350, iy + 150); g.lineTo(ix + iw, iy + 270); g.closePath(); g.fill();
          g.fillStyle = '#CA8A04'; g.fillRect(ix, iy + 320, iw, ih - 320);
          g.strokeStyle = '#FEF08A'; g.lineWidth = 3;
          for (let wh = 0; wh < 12; wh++) {
            const wx = ix + 18 + wh * 33; const sway = Math.sin(localT * 3 + wh) * 7;
            g.beginPath(); g.moveTo(wx, iy + ih); g.lineTo(wx + sway, iy + 410); g.stroke();
          }
        } else if (idx === 1) {
          const wg = g.createLinearGradient(0, iy, 0, iy + 300);
          wg.addColorStop(0, '#6B8898'); wg.addColorStop(1, '#E6C29F');
          g.fillStyle = wg; g.fillRect(ix, iy, iw, ih);
          g.fillStyle = '#33596B'; g.fillRect(ix, iy + 290, iw, ih - 290);
          g.fillStyle = '#78350F'; g.beginPath(); g.ellipse(ix + iw * 0.5, iy + 415 + Math.sin(localT * 2.5) * 4, 118, 22, 0, 0, Math.PI * 2); g.fill();
        } else {
          g.fillStyle = '#4B3A2E'; g.fillRect(ix, iy, iw, ih);
          g.fillStyle = '#EA580C'; g.beginPath(); g.arc(ix + 100, iy + 380, 62 + Math.sin(localT * 8) * 6, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#334155'; g.fillRect(ix + 230, iy + 430, 96, 36);
          g.fillStyle = '#FDE047';
          for (let spk = 0; spk < 6; spk++) {
            const sy = iy + 340 - ((localT * 95 + spk * 35) % 130);
            g.fillRect(ix + 90 + spk * 16, sy, 5, 5);
          }
        }

        drawHistoricalChar({
          x: cx + cardW * 0.5, y: cy + 475, scale: 0.72,
          hairStyle: idx === 1 ? 'long_blonde' : 'beard_brown',
          tunic: idx === 0 ? '#5E4632' : idx === 1 ? '#334155' : '#292524',
          tunicDark: '#1E1B18',
          talking: idx === Math.floor(p * 3), t: localT, seed: idx * 1.3,
        });

        g.fillStyle = '#EDE6D4'; g.fillRect(cx + 10, cy + cardH - 115, cardW - 20, 105);
        g.fillStyle = '#1E293B'; g.font = '700 32px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(item.label || '').toUpperCase(), cx + cardW * 0.5, cy + cardH - 60);
        g.restore();
      });

      drawOverlayGrammar(sc, p);
      drawVignette(0.28);
    } else {
      // Rich long-hall council_hud matching 269s (planks, shields, Nordic aprons/brooches, mugs & bread loaves!)
      applyStage(lerp(1.0, 1.07, p), lerp(-24, 24, p), 0);
      drawWoodPlanks(0, 0, VW, VH, '#4B3625', 140, 0.16);

      // Decorative crossbeams & painted shields
      g.fillStyle = '#362418'; g.fillRect(0, 120, VW, 34);
      for (let ws = 0; ws < 5; ws++) {
        const sx = 320 + ws * 320;
        g.fillStyle = ws % 2 === 0 ? '#9B2226' : '#EAB308';
        g.strokeStyle = '#291D14'; g.lineWidth = 6;
        g.beginPath(); g.arc(sx, 285, 58, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#F8FAFC'; g.beginPath(); g.arc(sx, 285, 14, 0, Math.PI * 2); g.fill();
      }

      const styles = ['braids_female', 'beard_brown', 'long_blonde', 'braids_female', 'crown_king'];
      const tunics = ['#475569', '#7C2D12', '#5E4632', '#64748B', '#991B1B'];
      const activeIdx = Array.isArray(sc.hudTopics) && sc.hudTopics.length
        ? Math.min(sc.hudTopics.length - 1, Math.floor(p * sc.hudTopics.length))
        : (sc.activeTopicIndex ?? 1);
      sc = Object.assign({}, sc, { activeTopicIndex: activeIdx });

      for (let ch = 0; ch < 5; ch++) {
        drawHistoricalChar({
          x: 340 + ch * 310, y: 785, scale: 1.04,
          hairStyle: styles[ch], tunic: tunics[ch], tunicDark: '#1E1B18',
          holdMug: ch % 2 === 0,
          talking: ch === activeIdx, expr: ch === 1 ? 'happy' : 'neutral', t: localT, seed: ch * 0.9,
        });
      }

      // Long feast table with bread loaves & plates
      g.fillStyle = '#6E4C32'; g.fillRect(140, 745, 1640, 335);
      g.fillStyle = '#855D3D'; g.fillRect(120, 735, 1680, 28);
      for (let pl = 0; pl < 6; pl++) {
        const px = 310 + pl * 260;
        g.fillStyle = '#9CA3AF'; g.beginPath(); g.ellipse(px, 735, 42, 9, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#D97706'; g.beginPath(); g.ellipse(px, 730, 26, 11, 0, Math.PI, 0); g.fill();
      }

      for (let fl = 0; fl < 9; fl++) {
        const fx = 280 + fl * 170; const fh = 64 + Math.sin(localT * 9 + fl * 1.4) * 18;
        g.fillStyle = '#F97316'; g.beginPath(); g.moveTo(fx - 34, VH); g.quadraticCurveTo(fx, VH - fh * 1.4, fx + 34, VH); g.fill();
        g.fillStyle = '#FACC15'; g.beginPath(); g.moveTo(fx - 18, VH); g.quadraticCurveTo(fx, VH - fh, fx + 18, VH); g.fill();
      }

      drawOverlayGrammar(sc, p);
      drawVignette(0.34);
    }
  }

  window.__dtSeek = function(timeSec) {
    const t = clamp(Number(timeSec) || 0, 0, TOTAL);
    let idx = SCENES.length - 1;
    for (let i = 0; i < SCENES.length; i++) {
      if (t >= SCENES[i].start && t < SCENES[i].end) { idx = i; break; }
    }
    const sc = SCENES[idx];
    const localT = Math.max(0, t - sc.start);
    renderScene(sc, localT, sc.durationSec);
  };

  window.__dtSeek(0);
})();
</script>
</body>
</html>`;
}
