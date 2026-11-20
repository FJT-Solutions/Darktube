import fs from 'fs';
import type { ExtraPresetCompileContext, ExtraPresetScene } from './html-svg-presets-extra';

export type SilhouetteSceneKind =
  | 'store_wide'
  | 'store_hands'
  | 'phone_alarm'
  | 'room_window'
  | 'store_counter'
  | 'wall_poster'
  | 'bed_wake'
  | 'rain_street'
  | 'quote_card'
  | 'autumn_avenue'
  | 'calendar_grid'
  | 'green_hill';

export interface SilhouetteFilmScene extends Partial<ExtraPresetScene> {
  sceneKind?: SilhouetteSceneKind;
  dialogueText?: string;
  quoteAuthor?: string;
  phoneDate?: string;
  phoneTime?: string;
  phoneGoal?: string;
  speakerId?: string;
  expression?: string;
  raincoat?: boolean;
  ponytail?: boolean;
}

export interface SilhouetteFilmCompileContext extends Omit<ExtraPresetCompileContext, 'scenes'> {
  scenes: SilhouetteFilmScene[];
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
 * Roteiro padrão 100% fiel à estrutura visual e dramática de
 * "1 MINUTE | An Animated Short Film" (Last Soul / NeWlC4bJTMs).
 */
export function buildDefaultSilhouetteFilmScenes(): SilhouetteFilmScene[] {
  return [
    {
      sceneKind: 'store_wide',
      title: 'O Começo na Loja',
      subtitle: 'Troca na loja esportiva',
      badge: '01 · LOJA',
      durationSec: 4.0,
      expression: 'neutral',
      ponytail: true,
    },
    {
      sceneKind: 'store_hands',
      title: 'Os Tênis Novos',
      subtitle: '14-DAY RETURNS',
      badge: '02 · CAIXA',
      durationSec: 3.0,
    },
    {
      sceneKind: 'phone_alarm',
      title: 'Primeiro Alarme',
      subtitle: 'Dia 1 — Meta 10K',
      dialogueText: 'Um pouco dolorido.',
      phoneDate: 'Mon, Sep 22',
      phoneTime: '5:30',
      phoneGoal: 'RUN 10K',
      badge: '03 · SONECA',
      durationSec: 3.8,
    },
    {
      sceneKind: 'phone_alarm',
      title: 'Terceira Tentativa',
      subtitle: 'Frio demais lá fora',
      dialogueText: 'Frio demais.',
      phoneDate: 'Tue, Oct 14',
      phoneTime: '5:30',
      phoneGoal: 'RUN 10K',
      badge: '04 · DESCULPA',
      durationSec: 3.4,
    },
    {
      sceneKind: 'room_window',
      title: 'Desistência Silenciosa',
      subtitle: 'Plano amassado no chão',
      dialogueText: 'Eu simplesmente não nasci pra correr.',
      badge: '05 · QUARTO',
      durationSec: 4.2,
      expression: 'sad',
    },
    {
      sceneKind: 'store_counter',
      title: 'Conselho da Atendente',
      subtitle: 'O retorno à loja',
      dialogueText: 'Então comece por aí.',
      speakerId: 'clerk',
      expression: 'happy',
      ponytail: true,
      badge: '06 · VIRADA',
      durationSec: 4.2,
    },
    {
      sceneKind: 'wall_poster',
      title: 'Nova Meta: 1 MIN',
      subtitle: 'Cartaz na parede iluminada',
      phoneGoal: '1 MIN',
      badge: '07 · META',
      durationSec: 3.4,
    },
    {
      sceneKind: 'bed_wake',
      title: 'Cinco e Meia',
      subtitle: 'RUN 1 MIN',
      dialogueText: 'É só um minuto.',
      phoneDate: 'Tue, Oct 21',
      phoneTime: '5:30',
      phoneGoal: 'RUN 1 MIN',
      badge: '08 · DECISÃO',
      durationSec: 3.8,
    },
    {
      sceneKind: 'rain_street',
      title: 'Primeiro Passo na Chuva',
      subtitle: 'Capa amarela sob os postes',
      raincoat: true,
      expression: 'determined',
      badge: '09 · CHUVA',
      durationSec: 4.6,
    },
    {
      sceneKind: 'quote_card',
      title: 'Nenhuma grande obra nasce de repente; nem mesmo um cacho de uvas ou um figo.',
      quoteAuthor: 'EPICTETUS',
      badge: '10 · EPICTETO',
      durationSec: 4.2,
    },
    {
      sceneKind: 'autumn_avenue',
      title: 'Dia Após Dia',
      subtitle: 'Alameda de outono ao entardecer',
      raincoat: false,
      expression: 'determined',
      badge: '11 · CONSTÂNCIA',
      durationSec: 4.2,
    },
    {
      sceneKind: 'calendar_grid',
      title: 'EVERY DAY',
      subtitle: 'Sequência construída no calendário',
      phoneGoal: 'EVERY DAY',
      badge: '12 · HÁBITO',
      durationSec: 3.6,
    },
    {
      sceneKind: 'green_hill',
      title: 'Onde Isso Te Leva',
      subtitle: 'Só um minuto por dia.',
      dialogueText: 'Só um minuto por dia.',
      badge: '13 · HORIZONTE',
      durationSec: 4.6,
    },
  ];
}

/**
 * Compila o motor visual cinematográfico Silhouette 2D (estilo Last Soul / NeWlC4bJTMs)
 * com camadas DOF/blur, silhuetas com olhos expressivos e rim-light,
 * legendas flutuantes em halo suave e 12 cenários procedurais determinísticos.
 */
export function buildSilhouetteFilmHtml(ctx: SilhouetteFilmCompileContext): string {
  const scenes =
    Array.isArray(ctx.scenes) && ctx.scenes.length > 0 && ctx.scenes.some((s) => s.sceneKind)
      ? ctx.scenes
      : buildDefaultSilhouetteFilmScenes();

  let cursor = 0;
  const scheduled = scenes.map((sc, i) => {
    const dur = Math.max(1.5, Math.min(20, Number(sc.durationSec) || 4));
    const start = cursor;
    cursor += dur;
    return { ...sc, index: i, durationSec: dur, start, end: cursor };
  });
  const totalDur = Math.max(2, cursor);
  const scenesJson = safeJson(scheduled);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>${esc(ctx.title || '1 MINUTE | Silhouette Short Film')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #040507;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  #stage {
    position: relative;
    width: ${ctx.width}px;
    height: ${ctx.height}px;
    overflow: hidden;
    background: #040507;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
</head>
<body>
<div id="stage">
  <canvas id="sf_canvas" width="${ctx.width}" height="${ctx.height}"></canvas>
</div>
<script>
(function() {
  const SCENES = ${scenesJson};
  const TOTAL = ${totalDur};
  const canvas = document.getElementById('sf_canvas');
  const g = canvas.getContext('2d');
  const W = ${ctx.width};
  const H = ${ctx.height};
  const VW = 1920;
  const VH = 1080;
  const scaleX = W / VW;
  const scaleY = H / VH;
  const coverScale = Math.max(scaleX, scaleY);
  const fitScale = Math.min(scaleX, scaleY);

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(x) { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
  function lerp(a, b, k) { return a + (b - a) * k; }

  function applyStageTransform(zoom) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.translate(W * 0.5, H * 0.5);
    const s = (W < H ? coverScale * 0.84 : fitScale) * (zoom || 1);
    g.scale(s, s);
    g.translate(-VW * 0.5, -VH * 0.5);
  }

  function drawVignette(strength) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    const rad = g.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.28, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    rad.addColorStop(0, 'rgba(0,0,0,0)');
    rad.addColorStop(1, 'rgba(3,5,9,' + clamp(strength ?? 0.55, 0, 0.92) + ')');
    g.fillStyle = rad;
    g.fillRect(0, 0, W, H);
    g.restore();
  }

  function drawFloatingDialogue(text, x, y, alpha, scaleFactor) {
    if (!text || alpha <= 0.02) return;
    g.save();
    g.globalAlpha = clamp(alpha, 0, 1);
    const fs = Math.round(42 * (scaleFactor || 1));
    g.font = '600 ' + fs + 'px "Segoe UI", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const m = g.measureText(text);
    const rx = Math.max(160, m.width * 0.62 + 80);
    const ry = fs * 1.45;
    g.save();
    g.translate(x, y);
    g.scale(1, ry / rx);
    const rg = g.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
    rg.addColorStop(0, 'rgba(8, 11, 16, 0.72)');
    rg.addColorStop(0.55, 'rgba(8, 11, 16, 0.34)');
    rg.addColorStop(1, 'rgba(8, 11, 16, 0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(0, 0, rx, 0, Math.PI * 2);
    g.fill();
    g.restore();

    g.shadowColor = 'rgba(0,0,0,0.88)';
    g.shadowBlur = 14;
    g.fillStyle = '#f3e7d3';
    g.fillText(text, x, y);
    g.restore();
  }

  function drawSilhouetteChar(opts) {
    const x = opts.x || 0;
    const y = opts.y || 0;
    const s = opts.scale || 1;
    const expr = opts.expr || 'neutral';
    const t = opts.t || 0;
    const walk = opts.walk || 0;
    const blink = ((t + (opts.seed || 0)) % 3.6) > 3.44;
    const blurPx = opts.blur || 0;

    g.save();
    if (blurPx > 0.1) g.filter = 'blur(' + blurPx + 'px)';
    g.translate(x, y);
    g.scale(s, s);

    // Contact shadow
    if (opts.shadow !== false) {
      g.fillStyle = 'rgba(0,0,0,0.34)';
      g.beginPath();
      g.ellipse(0, 6, 62, 13, 0, 0, Math.PI * 2);
      g.fill();
    }

    const stride = Math.sin(walk) * 26;
    const strideR = -stride;
    const breathY = Math.sin(t * 2.4 + (opts.seed || 0)) * 3.2;
    const bodyCol = '#07090d';
    const rimCol = 'rgba(255,255,255,0.16)';

    // Legs & sneakers (normal straight stance; hidden only behind counter)
    if (opts.seatedLegs) {
      g.lineCap = 'round';
      g.lineWidth = 22;
      g.strokeStyle = bodyCol;
      g.beginPath();
      g.moveTo(-18, -138);
      g.lineTo(-18, -14);
      g.moveTo(18, -138);
      g.lineTo(18, -14);
      g.stroke();

      for (const sx of [-18, 18]) {
        g.fillStyle = opts.sneakers ? '#56758f' : '#11151d';
        g.beginPath();
        g.ellipse(sx + 5, -12, 20, 9, 0, Math.PI, 0);
        g.fill();
        g.fillStyle = opts.sneakers ? '#e5e7eb' : '#262b36';
        g.fillRect(sx - 14, -12, 38, 6);
      }
    } else if (!opts.noLegs) {
      g.lineCap = 'round';
      g.lineWidth = 22;
      g.strokeStyle = bodyCol;
      g.beginPath();
      g.moveTo(-22, -138);
      g.lineTo(-24 + stride * 0.7, -14);
      g.moveTo(22, -138);
      g.lineTo(24 + strideR * 0.7, -14);
      g.stroke();

      // White sneaker soles
      for (const sx of [-24 + stride * 0.7, 24 + strideR * 0.7]) {
        g.fillStyle = opts.sneakers ? '#56758f' : '#11151d';
        g.beginPath();
        g.ellipse(sx + 6, -12, 22, 10, 0, Math.PI, 0);
        g.fill();
        g.fillStyle = opts.sneakers ? '#e5e7eb' : '#262b36';
        g.fillRect(sx - 15, -12, 42, 6);
      }
    }

    // Apply subtle continuous breathing to upper body & head
    g.translate(0, breathY);

    // Back ponytail for clerk
    if (opts.ponytail) {
      g.fillStyle = bodyCol;
      g.beginPath();
      g.moveTo(42, -310);
      g.quadraticCurveTo(96, -285, 86, -206);
      g.quadraticCurveTo(64, -228, 44, -268);
      g.closePath();
      g.fill();
    }

    // Torso
    const fillCoat = opts.yellowRaincoat ? '#e0bc44' : bodyCol;
    g.fillStyle = fillCoat;
    g.strokeStyle = opts.yellowRaincoat ? '#a88422' : rimCol;
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(-52, -252, 104, 146, [44, 44, 18, 18]);
    g.fill();
    g.stroke();

    if (opts.yellowRaincoat) {
      // Raincoat center placket & buttons + blue wrist watch glow
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, -220);
      g.lineTo(0, -108);
      g.stroke();
      for (let b = 0; b < 3; b++) {
        g.fillStyle = '#18181b';
        g.beginPath();
        g.arc(10, -200 + b * 28, 4, 0, Math.PI * 2);
        g.fill();
      }
    }

    // Articulated arms with continuous subtle idle sway
    const idleArm = Math.sin(t * 1.9 + (opts.seed || 0)) * 7;
    const armSwingL = walk ? Math.sin(walk) * 20 : (opts.armLAngle ?? 8) + idleArm;
    const armSwingR = walk ? -Math.sin(walk) * 20 : (opts.armRAngle ?? -8) - idleArm;
    g.lineCap = 'round';
    g.lineWidth = opts.yellowRaincoat ? 24 : 20;
    g.strokeStyle = fillCoat;
    g.beginPath();
    g.moveTo(-48, -228);
    g.quadraticCurveTo(-72, -182, -56 + armSwingL * 0.8, -138);
    g.stroke();
    g.beginPath();
    g.moveTo(48, -228);
    g.quadraticCurveTo(72, -182, 56 + armSwingR * 0.8, -138);
    g.stroke();

    if (opts.watchGlow) {
      g.save();
      g.fillStyle = '#38bdf8';
      g.shadowColor = '#38bdf8';
      g.shadowBlur = 16;
      g.beginPath();
      g.arc(58 + armSwingR * 0.72, -152, 7, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    // Yellow raincoat hood halo behind head
    if (opts.yellowRaincoat) {
      g.fillStyle = '#e0bc44';
      g.beginPath();
      g.arc(0, -300, 62, 0, Math.PI * 2);
      g.fill();
    }

    // Head
    const tilt = opts.headTilt || (expr === 'sad' ? 0.08 : 0);
    g.save();
    g.translate(0, -300);
    g.rotate(tilt);

    g.fillStyle = bodyCol;
    g.strokeStyle = opts.yellowRaincoat ? '#111827' : rimCol;
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(0, 0, 50, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    if (opts.ponytail) {
      // White sport headband
      g.fillStyle = '#eceff3';
      g.beginPath();
      g.roundRect(-49, -28, 98, 16, 8);
      g.fill();
    }

    // Expressive white eyes & brows (NO MOUTH)
    if (!opts.backView) {
      const ex = 16;
      const ey = -4;
      g.fillStyle = '#f8fafc';
      g.strokeStyle = '#e2e8f0';
      g.lineWidth = 3.2;
      if (blink) {
        for (const d of [-1, 1]) {
          g.beginPath();
          g.moveTo(d * ex - 7, ey);
          g.lineTo(d * ex + 7, ey);
          g.stroke();
        }
      } else if (expr === 'happy') {
        for (const d of [-1, 1]) {
          g.beginPath();
          g.arc(d * ex, ey + 4, 7.5, Math.PI * 1.15, Math.PI * 1.85);
          g.stroke();
        }
      } else {
        for (const d of [-1, 1]) {
          g.beginPath();
          g.ellipse(d * ex, ey, 5.5, expr === 'tired' ? 3.5 : 6.2, 0, 0, Math.PI * 2);
          g.fill();
        }
      }

      // Expressive eyebrows
      g.strokeStyle = '#cbd5e1';
      g.lineWidth = 3;
      g.lineCap = 'round';
      for (const d of [-1, 1]) {
        g.beginPath();
        if (expr === 'sad' || expr === 'tired') {
          g.moveTo(d * ex - d * 9, ey - 10);
          g.lineTo(d * ex + d * 8, ey - 16);
        } else if (expr === 'determined') {
          g.moveTo(d * ex - d * 9, ey - 16);
          g.lineTo(d * ex + d * 8, ey - 11);
        } else {
          g.moveTo(d * ex - 8, ey - 14);
          g.quadraticCurveTo(d * ex, ey - 18, d * ex + 8, ey - 14);
        }
        g.stroke();
      }
    }

    g.restore();
    g.restore();
  }

  const _shelfCache = {};
  function drawStoreShelfWall(blurPx) {
    const key = String(blurPx || 0);
    if (_shelfCache[key]) {
      g.drawImage(_shelfCache[key], 0, 0);
      return;
    }
    const oc = document.createElement('canvas');
    oc.width = VW;
    oc.height = 640;
    const og = oc.getContext('2d');
    if (blurPx) og.filter = 'blur(' + blurPx + 'px)';
    // Left and right luminous sneaker shelf units
    const colors = ['#6b8ea6', '#5e9684', '#7f8998', '#8c96a4', '#4d7c8a', '#9aa4b2'];
    for (const bx of [336, 1004]) {
      og.fillStyle = '#f8fafc';
      og.fillRect(bx, 180, 580, 440);
      og.strokeStyle = '#d1d5db';
      og.lineWidth = 4;
      for (let row = 0; row <= 5; row++) {
        const y = 180 + row * 74;
        og.beginPath();
        og.moveTo(bx, y);
        og.lineTo(bx + 580, y);
        og.stroke();
      }
      for (let col = 0; col <= 6; col++) {
        const x = bx + col * (580 / 6);
        og.beginPath();
        og.moveTo(x, 180);
        og.lineTo(x, 550);
        og.stroke();
      }
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 6; c++) {
          if ((r + c) % 7 === 0) continue;
          const sx = bx + c * (580 / 6) + 18;
          const sy = 180 + r * 74 + 46;
          og.fillStyle = colors[(r * 5 + c) % colors.length];
          og.beginPath();
          og.moveTo(sx, sy);
          og.lineTo(sx + 48, sy);
          og.lineTo(sx + 54, sy + 12);
          og.lineTo(sx - 4, sy + 12);
          og.closePath();
          og.fill();
          og.fillStyle = '#e5e7eb';
          og.fillRect(sx - 4, sy + 11, 58, 5);
        }
      }
    }
    _shelfCache[key] = oc;
    g.drawImage(oc, 0, 0);
  }

  function drawCounterBase(yTop, xLeft, width, drawCard, drawBox, boxOffsetX) {
    g.save();
    g.fillStyle = '#f3f4f6';
    g.fillRect(xLeft, yTop - 16, width, 20);
    g.fillStyle = '#9ca3af';
    g.fillRect(xLeft + 8, yTop + 4, width - 16, 220);
    // Vertical flutes
    g.fillStyle = 'rgba(30,41,59,0.22)';
    for (let rx = xLeft + 16; rx < xLeft + width - 16; rx += 16) {
      g.fillRect(rx, yTop + 4, 6, 220);
    }
    if (drawCard) {
      const cx = drawCard.x;
      const cy = yTop - 92;
      g.fillStyle = '#f8fafc';
      g.strokeStyle = '#9ca3af';
      g.lineWidth = 2;
      g.fillRect(cx - 56, cy, 112, 76);
      g.strokeRect(cx - 56, cy, 112, 76);
      g.fillStyle = '#111827';
      g.font = 'bold 16px sans-serif';
      g.textAlign = 'center';
      g.fillText('14-DAY', cx, cy + 30);
      g.font = 'bold 15px sans-serif';
      g.fillText('RETURNS', cx, cy + 54);
    }
    if (drawBox) {
      const bx = drawBox.x + (boxOffsetX || 0);
      const by = yTop - 88;
      g.fillStyle = '#738294';
      g.fillRect(bx - 76, by + 22, 152, 50);
      g.fillStyle = '#e2e8f0';
      g.fillRect(bx - 82, by, 164, 24);
      g.fillStyle = '#cbd5e1';
      g.fillRect(bx - 24, by + 38, 48, 18);
    }
    g.restore();
  }

  function renderScene(sc, localT, totalSceneDur) {
    const p = clamp(localT / Math.max(0.1, totalSceneDur), 0, 1);
    const kind = sc.sceneKind || 'store_wide';

    if (kind === 'store_wide') {
      applyStageTransform(lerp(1.0, 1.05, p));
      // Walls & floor
      const bg = g.createLinearGradient(0, 0, 0, VH);
      bg.addColorStop(0, '#cfd4da');
      bg.addColorStop(0.65, '#e5e7eb');
      bg.addColorStop(1, '#b8bec6');
      g.fillStyle = bg;
      g.fillRect(0, 0, VW, VH);

      // Left / Right angled walls
      g.fillStyle = '#bfc5cc';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(240, 140); g.lineTo(240, 740); g.lineTo(0, 920); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(VW, 0); g.lineTo(1680, 140); g.lineTo(1680, 740); g.lineTo(VW, 920); g.closePath(); g.fill();

      // Framed hill artwork on left wall
      g.fillStyle = '#334155';
      g.fillRect(72, 340, 114, 165);
      g.fillStyle = '#9cc5de';
      g.fillRect(80, 348, 98, 70);
      g.fillStyle = '#7ca355';
      g.fillRect(80, 416, 98, 80);

      // Framed runner sign on right wall
      g.fillStyle = '#1e293b';
      g.fillRect(1720, 340, 108, 100);
      g.fillStyle = '#e2e8f0';
      g.beginPath(); g.arc(1774, 376, 8, 0, Math.PI * 2); g.fill();

      // Treadmill right
      g.fillStyle = '#374151';
      g.fillRect(1560, 680, 260, 42);
      g.fillRect(1610, 500, 18, 190);
      g.fillStyle = '#4b5563';
      g.fillRect(1570, 470, 130, 55);

      // Ceiling spotlight track
      g.strokeStyle = '#6b7280';
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(220, 100); g.lineTo(1700, 100); g.stroke();
      for (let lx = 360; lx <= 1560; lx += 240) {
        const beam = g.createLinearGradient(lx, 104, lx, 620);
        beam.addColorStop(0, 'rgba(255,255,255,0.22)');
        beam.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = beam;
        g.beginPath(); g.moveTo(lx - 14, 104); g.lineTo(lx + 14, 104); g.lineTo(lx + 130, 620); g.lineTo(lx - 130, 620); g.closePath(); g.fill();
      }

      drawStoreShelfWall(1.8);
      g.fillStyle = '#dfe3e8';
      g.fillRect(900, 120, 120, 500);

      // Clerk behind counter
      drawSilhouetteChar({ x: 1140, y: 740, scale: 0.94, expr: 'happy', ponytail: sc.ponytail !== false, noLegs: true, t: localT, shadow: false });
      drawCounterBase(625, 310, 1300, { x: 1290 }, null, 0);

      // Doormat foreground
      g.fillStyle = '#6b7280';
      g.beginPath(); g.moveTo(640, 880); g.lineTo(1280, 880); g.lineTo(1380, 1080); g.lineTo(540, 1080); g.closePath(); g.fill();

      // Runner standing in front of counter
      drawSilhouetteChar({ x: 750, y: 805, scale: 1.05, expr: 'neutral', sneakers: true, backView: true, t: localT, seed: 1.2 });
      drawVignette(0.46);
    } else if (kind === 'store_hands') {
      applyStageTransform(lerp(1.16, 1.24, p));
      g.fillStyle = '#d1d5db';
      g.fillRect(0, 0, VW, VH);
      drawStoreShelfWall(14);
      drawCounterBase(760, 0, VW, { x: 1410 }, { x: 950 }, lerp(-40, 40, smooth(p)));

      // Close-up blue shoebox center & balanced silhouette arms exchanging box
      const bx = 950 + lerp(-40, 40, smooth(p));
      g.fillStyle = '#5c7288';
      g.fillRect(bx - 125, 635, 250, 92);
      g.fillStyle = '#eef2f6';
      g.fillRect(bx - 134, 605, 268, 34);
      g.fillStyle = '#cbd5e1';
      g.fillRect(bx - 42, 668, 84, 24);

      g.save();
      g.strokeStyle = '#07090d';
      g.lineWidth = 54;
      g.lineCap = 'round';
      const lReach = lerp(180, bx - 140, smooth(Math.min(1, p * 1.35)));
      g.beginPath(); g.moveTo(-40, 640); g.lineTo(lReach, 650); g.stroke();
      const rReach = lerp(1780, bx + 140, smooth(Math.min(1, p * 1.35)));
      g.beginPath(); g.moveTo(VW + 40, 620); g.lineTo(rReach, 650); g.stroke();
      g.restore();
      drawVignette(0.5);
    } else if (kind === 'phone_alarm') {
      applyStageTransform(lerp(1.0, 1.04, p));
      const bg = g.createLinearGradient(0, 0, VW, VH);
      bg.addColorStop(0, '#1e242c');
      bg.addColorStop(0.5, '#353d47');
      bg.addColorStop(1, '#11151b');
      g.fillStyle = bg;
      g.fillRect(0, 0, VW, VH);
      // Faint blinds texture
      g.fillStyle = 'rgba(255,255,255,0.03)';
      for (let y = 80; y < VH; y += 34) g.fillRect(0, y, VW, 8);

      const shake = p < 0.55 ? Math.sin(localT * 42) * 0.012 : 0;
      g.save();
      g.translate(VW * 0.56, VH * 0.53);
      g.rotate(-0.18 + shake);

      // Phone body & screen
      g.fillStyle = '#090d14';
      g.strokeStyle = '#475569';
      g.lineWidth = 6;
      g.beginPath(); g.roundRect(-245, -455, 490, 910, 56); g.fill(); g.stroke();
      g.fillStyle = '#1b2b44';
      g.beginPath(); g.roundRect(-225, -435, 450, 870, 42); g.fill();

      g.fillStyle = '#cbd5e1';
      g.textAlign = 'center';
      g.font = '500 34px sans-serif';
      g.fillText(sc.phoneDate || 'Mon, Sep 22', 0, -255);

      g.fillStyle = '#ffffff';
      g.font = '600 165px sans-serif';
      g.fillText(sc.phoneTime || '5:30', 0, -90);

      g.fillStyle = '#e2e8f0';
      g.font = '600 36px sans-serif';
      g.fillText(sc.phoneGoal || 'RUN 10K', 0, 18);

      // Snooze pill button
      const tapped = p > 0.52 && p < 0.72;
      const pillScale = tapped ? 0.94 : 1;
      g.save();
      g.scale(pillScale, pillScale);
      g.fillStyle = '#f8fafc';
      g.beginPath(); g.roundRect(-155, 115, 310, 94, 47); g.fill();
      g.fillStyle = '#0f172a';
      g.font = '700 40px sans-serif';
      g.fillText('SNOOZE', 0, 175);
      g.restore();

      // Stop subtle button
      g.strokeStyle = 'rgba(255,255,255,0.28)';
      g.lineWidth = 3;
      g.beginPath(); g.roundRect(-95, 255, 190, 68, 34); g.stroke();
      g.fillStyle = '#64748b';
      g.font = '600 28px sans-serif';
      g.fillText('STOP', 0, 299);

      // Tap ripple + reaching hand inside the phone's rotated coordinate space (lands on exact SNOOZE center 0, 162)
      const tapK = smooth(clamp(p / 0.52, 0, 1));
      const fx = lerp(-340, 4, tapK);
      const fy = lerp(520, 170, tapK);
      if (tapped) {
        const rp = (p - 0.52) / 0.2;
        g.strokeStyle = 'rgba(56, 189, 248, ' + (0.65 * (1 - rp)).toFixed(2) + ')';
        g.lineWidth = 4;
        g.beginPath();
        g.arc(0, 162, 26 + rp * 54, 0, Math.PI * 2);
        g.stroke();
      }
      g.strokeStyle = '#05070a';
      g.fillStyle = '#05070a';
      g.lineWidth = 52;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(fx - 340, fy + 400); g.lineTo(fx - 26, fy + 38); g.stroke();
      g.beginPath(); g.arc(fx - 22, fy + 34, 34, 0, Math.PI * 2); g.fill();
      g.lineWidth = 22;
      g.beginPath(); g.moveTo(fx - 14, fy + 22); g.lineTo(fx, fy - 4); g.stroke();
      g.restore();

      drawFloatingDialogue(sc.dialogueText, 410, 310, smooth(p * 2.2), 1);
      drawVignette(0.62);
    } else if (kind === 'room_window') {
      applyStageTransform(lerp(1.0, 1.04, p));
      // Overcast outdoor view through window
      const sky = g.createLinearGradient(0, 0, 0, 740);
      sky.addColorStop(0, '#b6bec6');
      sky.addColorStop(1, '#848f96');
      g.fillStyle = sky;
      g.fillRect(180, 70, 1560, 660);

      // Autumn trees outside window (soft translucent layers without per-frame filter overhead)
      g.fillStyle = 'rgba(83, 98, 76, 0.85)';
      g.fillRect(180, 490, 1560, 240);
      for (const tx of [480, 720, 1280, 1520]) {
        const tg = g.createRadialGradient(tx, 260, 20, tx, 260, 140);
        tg.addColorStop(0, 'rgba(185, 137, 71, 0.92)');
        tg.addColorStop(0.75, 'rgba(185, 137, 71, 0.65)');
        tg.addColorStop(1, 'rgba(185, 137, 71, 0)');
        g.fillStyle = tg;
        g.beginPath(); g.arc(tx, 260, 140, 0, Math.PI * 2); g.fill();
      }

      // Interior room walls around window
      g.fillStyle = '#252930';
      g.fillRect(0, 0, VW, 85);
      g.fillRect(0, 0, 220, VH);
      g.fillRect(1700, 0, 220, VH);
      g.fillRect(880, 70, 34, 660);
      g.fillRect(0, 700, VW, 380);
      g.fillStyle = '#323740';
      g.fillRect(0, 720, VW, 360);

      // Crumpled plan paper + sneakers on floor
      g.fillStyle = '#e2e8f0';
      g.beginPath(); g.arc(760, 880, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#64748b';
      g.fillRect(580, 820, 78, 30);

      // Slumped sitting runner (with visible bent legs resting on floor)
      drawSilhouetteChar({ x: 460, y: 845, scale: 0.92, expr: 'sad', seatedLegs: true, sneakers: true, armLAngle: 22, armRAngle: -22, headTilt: 0.14 + Math.sin(localT * 1.6) * 0.03, t: localT });
      drawFloatingDialogue(sc.dialogueText, 460, 420, smooth((p - 0.1) * 2.5), 0.95);
      drawVignette(0.55);
    } else if (kind === 'store_counter') {
      applyStageTransform(lerp(1.0, 1.04, p));
      g.fillStyle = '#d8dce1';
      g.fillRect(0, 0, VW, VH);
      const isClerk = (sc.speakerId || 'clerk') === 'clerk';

      drawStoreShelfWall(isClerk ? 2.5 : 4.5);
      drawSilhouetteChar({
        x: 1110,
        y: 830,
        scale: 1.5,
        expr: sc.expression || (isClerk ? 'happy' : 'sad'),
        ponytail: sc.ponytail !== false,
        noLegs: true,
        armLAngle: isClerk ? Math.sin(localT * 3.1) * 14 : 6,
        armRAngle: isClerk ? -Math.cos(localT * 2.5) * 12 : -6,
        headTilt: Math.sin(localT * 1.9) * 0.04,
        t: localT,
        shadow: false,
      });
      drawCounterBase(790, 0, VW, { x: 1410 }, { x: 910 }, 0);

      // Over-the-shoulder foreground runner (cached silhouette blur avoids per-frame GPU/CPU cost)
      drawSilhouetteChar({
        x: 340,
        y: 1200,
        scale: 2.35,
        backView: true,
        noLegs: true,
        shadow: false,
        t: localT,
      });

      drawFloatingDialogue(sc.dialogueText, 1110, 165, smooth((p - 0.08) * 2.6), 1.0);
      drawVignette(0.45);
    } else if (kind === 'wall_poster') {
      applyStageTransform(lerp(1.0, 1.05, p));
      g.fillStyle = '#8b9096';
      g.fillRect(0, 0, VW, VH);
      // Warm diagonal spotlight cone on wall
      const cone = g.createRadialGradient(VW * 0.5, VH * 0.42, 60, VW * 0.5, VH * 0.45, 760);
      cone.addColorStop(0, 'rgba(255,255,255,0.45)');
      cone.addColorStop(0.55, 'rgba(220,226,232,0.12)');
      cone.addColorStop(1, 'rgba(15,18,24,0.82)');
      g.fillStyle = cone;
      g.fillRect(0, 0, VW, VH);

      // White pinned paper
      g.save();
      g.fillStyle = '#f8fafc';
      g.shadowColor = 'rgba(0,0,0,0.45)';
      g.shadowBlur = 24;
      g.fillRect(680, 140, 560, 740);
      g.restore();

      g.fillStyle = '#c82333';
      g.textAlign = 'center';
      g.font = '700 185px "Segoe UI", sans-serif';
      const goalTxt = sc.phoneGoal || '1 MIN';
      const charsShow = Math.max(1, Math.floor(smooth(clamp(p * 2.4, 0, 1)) * goalTxt.length));
      g.fillText(goalTxt.slice(0, charsShow), 960, 560);

      // Arm reaching cleanly from right
      const rx = lerp(1920, 1280, smooth(Math.min(1, p * 1.5)));
      g.strokeStyle = '#05070a';
      g.lineWidth = 64;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(1980, 240); g.lineTo(rx, 240); g.stroke();
      drawVignette(0.6);
    } else if (kind === 'bed_wake') {
      applyStageTransform(lerp(1.0, 1.04, p));
      g.fillStyle = '#141920';
      g.fillRect(0, 0, VW, VH);
      // Phone glow rectangle on right
      const glow = g.createRadialGradient(1480, 620, 20, 1480, 620, 480);
      glow.addColorStop(0, 'rgba(148, 197, 255, 0.35)');
      glow.addColorStop(1, 'rgba(148, 197, 255, 0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, VW, VH);

      // Pillow + Blanket silhouette
      g.fillStyle = '#252c36';
      g.beginPath(); g.ellipse(480, 820, 480, 320, 0, Math.PI, 0); g.fill();

      drawSilhouetteChar({ x: 560, y: 840, scale: 1.85, expr: 'determined', noLegs: true, shadow: false, t: localT });

      // Duvet wave covering lower body
      g.fillStyle = '#1f252e';
      g.beginPath(); g.ellipse(460, 1020, 540, 290, 0, Math.PI, 0); g.fill();

      // Reaching hand to glowing phone on right
      g.strokeStyle = '#07090d';
      g.lineWidth = 48;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(860, 820); g.lineTo(1360, 690); g.stroke();
      g.fillStyle = '#38bdf8';
      g.fillRect(1420, 520, 74, 240);

      drawFloatingDialogue(sc.dialogueText, 440, 220, smooth((p - 0.08) * 2.5), 1.0);
      drawVignette(0.62);
    } else if (kind === 'rain_street') {
      applyStageTransform(lerp(1.0, 1.05, p));
      const bg = g.createLinearGradient(0, 0, 0, VH);
      bg.addColorStop(0, '#070a0f');
      bg.addColorStop(0.58, '#1b222c');
      bg.addColorStop(1, '#151921');
      g.fillStyle = bg;
      g.fillRect(0, 0, VW, VH);

      // Perspective street & wet sidewalk
      g.fillStyle = '#1f252e';
      g.beginPath(); g.moveTo(960, 520); g.lineTo(1920, 1080); g.lineTo(0, 1080); g.closePath(); g.fill();
      g.fillStyle = '#333b45';
      g.beginPath(); g.moveTo(960, 520); g.lineTo(680, 1080); g.lineTo(200, 1080); g.closePath(); g.fill();

      // Streetlamps receding
      const lamps = [
        { x: 260, y: 200, s: 1.0 },
        { x: 800, y: 400, s: 0.42 },
        { x: 890, y: 465, s: 0.24 },
      ];
      for (const lp of lamps) {
        const cone = g.createRadialGradient(lp.x, lp.y + 40 * lp.s, 10, lp.x, lp.y + 80 * lp.s, 290 * lp.s);
        cone.addColorStop(0, 'rgba(253, 224, 156, 0.45)');
        cone.addColorStop(1, 'rgba(253, 224, 156, 0)');
        g.fillStyle = cone;
        g.fillRect(lp.x - 320 * lp.s, lp.y - 120 * lp.s, 640 * lp.s, 720 * lp.s);

        g.fillStyle = '#090b10';
        g.fillRect(lp.x - 8 * lp.s, lp.y + 60 * lp.s, 16 * lp.s, 700 * lp.s);
        g.fillStyle = '#fef3c7';
        g.beginPath();
        g.moveTo(lp.x - 38 * lp.s, lp.y - 20 * lp.s);
        g.lineTo(lp.x + 38 * lp.s, lp.y - 20 * lp.s);
        g.lineTo(lp.x + 24 * lp.s, lp.y + 60 * lp.s);
        g.lineTo(lp.x - 24 * lp.s, lp.y + 60 * lp.s);
        g.closePath();
        g.fill();
      }

      // Runner walking forward in yellow raincoat
      const runnerScale = lerp(0.88, 1.08, p);
      drawSilhouetteChar({
        x: lerp(520, 470, p),
        y: lerp(835, 920, p),
        scale: runnerScale,
        expr: 'determined',
        yellowRaincoat: sc.raincoat !== false,
        watchGlow: true,
        sneakers: true,
        walk: localT * 7.5,
        t: localT,
      });

      // Deterministic diagonal rain streaks + splashes
      g.strokeStyle = 'rgba(203, 213, 225, 0.35)';
      g.lineWidth = 2.5;
      for (let i = 0; i < 95; i++) {
        const rx = ((i * 197 + localT * 240) % (VW + 120)) - 60;
        const ry = ((i * 313 + localT * 1150) % (VH + 140)) - 70;
        g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + 18, ry + 56); g.stroke();
      }
      drawVignette(0.58);
    } else if (kind === 'quote_card') {
      applyStageTransform(1);
      g.fillStyle = '#040507';
      g.fillRect(0, 0, VW, VH);
      const fadeInOut = Math.min(smooth(p * 3.5), smooth((1 - p) * 3.5));
      g.save();
      g.globalAlpha = fadeInOut;
      g.fillStyle = '#d6cebe';
      g.font = '400 44px Georgia, "Times New Roman", serif';
      g.textAlign = 'center';
      const words = String(sc.title || '').split(' ');
      const lines = [];
      let line = '';
      for (const w of words) {
        if ((line + ' ' + w).length > 38) { lines.push(line); line = w; }
        else line = line ? line + ' ' + w : w;
      }
      if (line) lines.push(line);
      const y0 = VH * 0.48 - (lines.length - 1) * 30;
      lines.forEach((ln, idx) => g.fillText(ln, VW * 0.5, y0 + idx * 62));
      if (sc.quoteAuthor) {
        g.fillStyle = '#9ca3af';
        g.font = '500 24px Georgia, serif';
        g.fillText('—  ' + String(sc.quoteAuthor).toUpperCase(), VW * 0.5, y0 + lines.length * 62 + 34);
      }
      g.restore();
    } else if (kind === 'autumn_avenue') {
      applyStageTransform(lerp(1.0, 1.05, p));
      const sky = g.createLinearGradient(0, 0, 0, 560);
      sky.addColorStop(0, '#1e2638');
      sky.addColorStop(0.6, '#585869');
      sky.addColorStop(1, '#d1a375');
      g.fillStyle = sky;
      g.fillRect(0, 0, VW, 560);

      g.fillStyle = '#24351c';
      g.fillRect(0, 540, VW, 540);
      g.fillStyle = '#484d52';
      g.beginPath(); g.moveTo(960, 540); g.lineTo(1320, 1080); g.lineTo(360, 1080); g.closePath(); g.fill();

      // Golden autumn canopies
      const canopies = [
        [240, 210, 170], [490, 320, 120], [1640, 220, 185], [1420, 340, 130], [720, 440, 72], [1160, 440, 74],
      ];
      for (const [tx, ty, tr] of canopies) {
        g.fillStyle = '#12100d';
        g.fillRect(tx - tr * 0.1, ty, tr * 0.2, 540 - ty + tr * 0.4);
        g.fillStyle = '#c4903e';
        g.beginPath(); g.arc(tx, ty, tr, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e0af52';
        g.beginPath(); g.arc(tx - tr * 0.25, ty - tr * 0.15, tr * 0.65, 0, Math.PI * 2); g.fill();
      }

      drawSilhouetteChar({
        x: lerp(680, 720, p),
        y: lerp(790, 860, p),
        scale: lerp(0.75, 0.92, p),
        expr: 'determined',
        watchGlow: true,
        sneakers: true,
        walk: localT * 9.5,
        t: localT,
      });

      // Falling golden leaves
      for (let i = 0; i < 36; i++) {
        const lx = (i * 239 + Math.sin(localT * 2 + i) * 45) % VW;
        const ly = ((i * 173 + localT * 140) % (VH - 200)) + 160;
        g.fillStyle = i % 2 === 0 ? '#dfb152' : '#c68339';
        g.beginPath();
        g.ellipse(lx, ly, 12, 6, Math.sin(localT * 3 + i), 0, Math.PI * 2);
        g.fill();
      }
      drawVignette(0.45);
    } else if (kind === 'calendar_grid') {
      applyStageTransform(lerp(1.0, 1.03, p));
      g.fillStyle = '#090b10';
      g.fillRect(0, 0, VW, VH);

      // Laptop frame
      g.fillStyle = '#181c23';
      g.beginPath(); g.roundRect(230, 60, 1460, 910, 26); g.fill();
      g.fillStyle = '#f8fafc';
      g.fillRect(265, 130, 1390, 810);
      // Window top bar
      g.fillStyle = '#e5e7eb';
      g.fillRect(265, 95, 1390, 42);
      for (const [ci, col] of ['#ef4444', '#f59e0b', '#10b981'].entries()) {
        g.fillStyle = col;
        g.beginPath(); g.arc(305 + ci * 26, 116, 8, 0, Math.PI * 2); g.fill();
      }

      // Header streak + EVERY DAY
      const countUp = 1 + Math.floor(p * 27);
      g.fillStyle = '#111827';
      g.textAlign = 'center';
      g.font = '700 54px "Segoe UI", sans-serif';
      g.fillText(countUp + ' | ' + (sc.phoneGoal || 'EVERY DAY'), 960, 225);
      g.strokeStyle = '#6b7280';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(550, 250); g.lineTo(1370, 250); g.stroke();

      // 7x4 calendar grid tiles lighting up step by step
      const tilePalette = ['#689785', '#5b84a8', '#9a9fb1', '#7ea9b8'];
      const filledTiles = Math.ceil(smooth(p) * 28);
      let idx = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 7; c++) {
          idx++;
          const tx = 445 + c * 150;
          const ty = 310 + r * 145;
          const active = idx <= filledTiles;
          g.fillStyle = active ? tilePalette[c % tilePalette.length] : '#e2e8f0';
          g.beginPath(); g.roundRect(tx, ty, 134, 128, 8); g.fill();
          if (active) {
            g.fillStyle = 'rgba(255,255,255,0.65)';
            g.fillRect(tx + 16, ty + 34, 86, 8);
            g.fillRect(tx + 16, ty + 54, 62, 8);
          }
        }
      }
      drawVignette(0.5);
    } else if (kind === 'green_hill') {
      applyStageTransform(lerp(1.0, 1.04, p));
      const sky = g.createLinearGradient(0, 0, 0, 560);
      sky.addColorStop(0, '#5d8eb8');
      sky.addColorStop(1, '#d3e8f5');
      g.fillStyle = sky;
      g.fillRect(0, 0, VW, 560);

      // Soft hill silhouette
      g.fillStyle = '#89b34d';
      g.beginPath();
      g.moveTo(0, VH);
      g.lineTo(0, 520);
      g.quadraticCurveTo(960, 180, VW, 500);
      g.lineTo(VW, VH);
      g.closePath();
      g.fill();

      // Winding dirt trail up to the crest
      g.strokeStyle = '#d9cfb1';
      g.lineCap = 'round';
      g.beginPath();
      g.lineWidth = 110;
      g.moveTo(560, VH + 20);
      g.bezierCurveTo(640, 820, 1180, 680, 1080, 360);
      g.stroke();

      // Grass blades + tiny flowers foreground
      const flowerCols = ['#facc15', '#ffffff', '#c084fc', '#fb923c'];
      for (let i = 0; i < 65; i++) {
        const fx = (i * 197 + 40) % VW;
        const fy = 620 + ((i * 89) % 440);
        g.strokeStyle = '#628a34';
        g.lineWidth = 4;
        g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + Math.sin(localT * 2 + i) * 5, fy - 28); g.stroke();
        if (i % 3 === 0) {
          g.fillStyle = flowerCols[i % flowerCols.length];
          g.beginPath(); g.arc(fx, fy - 30, 5, 0, Math.PI * 2); g.fill();
        }
      }

      // Runner jogging cheerfully up the path
      drawSilhouetteChar({
        x: lerp(830, 960, p),
        y: lerp(720, 620, p),
        scale: lerp(0.56, 0.42, p),
        sneakers: true,
        backView: true,
        walk: localT * 8.5,
        t: localT,
      });

      drawFloatingDialogue(sc.dialogueText, VW * 0.5, 920, smooth((p - 0.1) * 2.4), 1.0);
      drawVignette(0.32);
    }
  }

  window.__dtSeek = function(timeSec) {
    const t = clamp(Number(timeSec) || 0, 0, TOTAL);
    let active = SCENES[SCENES.length - 1];
    for (let i = 0; i < SCENES.length; i++) {
      const sc = SCENES[i];
      if (t >= sc.start && (t < sc.end || i === SCENES.length - 1)) {
        active = sc;
        break;
      }
    }
    const localT = Math.max(0, t - active.start);
    renderScene(active, localT, active.durationSec);
  };

  window.__dtSeek(0);
})();
</script>
</body>
</html>`;
}

/**
 * Gera faixa WAV minimalista procedural ($0) para curtas mudos Silhouette 2D:
 * progressão suave de piano ambiente (Dm - Bb - F - C) + chuva leve nas janelas de rua chuvosa.
 */
export function writeSilhouetteAmbientWav(
  outWavPath: string,
  scenes: Array<{ sceneKind?: string; durationSec?: number }>,
  totalDurSec: number
): string {
  const sampleRate = 22050;
  const totalSamples = Math.max(sampleRate * 2, Math.round(totalDurSec * sampleRate));
  const pcm = new Int16Array(totalSamples);

  const rainRanges: Array<[number, number]> = [];
  let cursor = 0;
  for (const s of scenes) {
    const d = Math.max(1.5, Math.min(20, Number(s.durationSec) || 4));
    if (s.sceneKind === 'rain_street' || s.sceneKind === 'room_window') {
      rainRanges.push([cursor, cursor + d]);
    }
    cursor += d;
  }

  // Soft contemplative felt-piano chords (Hz): Dm, Bb, F, C cycle every 3.6s
  const chords = [
    [146.83, 220.0, 293.66, 349.23],
    [116.54, 174.61, 233.08, 293.66],
    [174.61, 220.0, 261.63, 349.23],
    [130.81, 196.0, 261.63, 329.63],
  ];
  const chordDur = 3.6;
  let noiseState = 1234567;
  let lpRain = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.floor(t / chordDur) % chords.length;
    const local = t % chordDur;
    const env = Math.min(1, local / 0.08) * Math.exp(-local * 0.72);
    const notes = chords[chordIdx];

    let sample = 0;
    for (let n = 0; n < notes.length; n++) {
      const arpDelay = n * 0.14;
      if (local < arpDelay) continue;
      const nt = local - arpDelay;
      const nEnv = Math.min(1, nt / 0.04) * Math.exp(-nt * 0.85);
      sample += Math.sin(2 * Math.PI * notes[n] * t) * nEnv * 0.11;
      sample += Math.sin(2 * Math.PI * notes[n] * 2 * t) * nEnv * 0.025;
    }

    // Subtle rain patter during rainy scenes
    let inRain = false;
    for (const [r0, r1] of rainRanges) {
      if (t >= r0 && t <= r1) {
        inRain = true;
        break;
      }
    }
    if (inRain) {
      noiseState = (noiseState * 1664525 + 1013904223) >>> 0;
      const white = (noiseState / 0xffffffff) * 2 - 1;
      lpRain = lpRain * 0.88 + white * 0.12;
      sample += lpRain * 0.16;
    }

    // Global gentle fade-in / fade-out
    const masterFade = Math.min(1, t / 0.8) * Math.min(1, Math.max(0, totalDurSec - t) / 1.0);
    const val = Math.max(-0.92, Math.min(0.92, (sample * 0.7 + sample * env * 0.3) * masterFade));
    pcm[i] = Math.round(val * 32767);
  }

  const dataBytes = pcm.length * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  Buffer.from(pcm.buffer).copy(buf, 44);
  fs.writeFileSync(outWavPath, buf);
  return outWavPath;
}
