import * as THREE from 'three';

const INK = '#1b141a';
const SKINS = ['#ffd6b5', '#f3c19d', '#d99e75', '#a9714b', '#ffe0c8', '#c68960'];

function hashPalette(preset = 'homem') {
  const map = {
    construtor: { jacket: '#e07a22', pants: '#2b4570', hat: 'helmet', hatCol: '#f5b700', hair: '#2c1e16', skin: SKINS[1] },
    engenheiro: { jacket: '#2d6cdf', pants: '#283244', hat: 'helmet', hatCol: '#f4f4f6', hair: '#3b2b20', skin: SKINS[0] },
    engenheira: { jacket: '#d94e67', pants: '#273043', hat: 'hair', hatCol: '#4a2b1d', hair: '#4a2b1d', skin: SKINS[4] },
    homem: { jacket: '#264b8c', pants: '#232834', hat: 'tophat', hatCol: '#1f2230', hair: '#241b16', skin: SKINS[0] },
    mulher: { jacket: '#8d2f6e', pants: '#282636', hat: 'hair', hatCol: '#69341d', hair: '#69341d', skin: SKINS[4] },
    velhinho: { jacket: '#78563a', pants: '#353942', hat: 'beret', hatCol: '#4c3e36', hair: '#d8dde6', skin: SKINS[0] },
    velhinha: { jacket: '#4b7a68', pants: '#343b42', hat: 'hair', hatCol: '#d6dbe0', hair: '#d6dbe0', skin: SKINS[4] },
    crianca: { jacket: '#e67e22', pants: '#25395c', hat: 'cap', hatCol: '#e53935', hair: '#3d2415', skin: SKINS[1] },
    menina: { jacket: '#e05780', pants: '#2f3e66', hat: 'hair', hatCol: '#4d2b18', hair: '#4d2b18', skin: SKINS[0] },
    apresentador: { jacket: '#1f3b73', pants: '#19202e', hat: 'tophat', hatCol: '#1d1d24', hair: '#2b1e16', skin: SKINS[0] },
  };
  return map[preset] || map.homem;
}

function drawRoundedLimb(ctx, x1, y1, x2, y2, w, fill, inkW) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + inkW * 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawProp(ctx, propName, px, py, inkW) {
  if (!propName) return;
  ctx.save();
  ctx.translate(px, py);
  ctx.lineWidth = inkW * 0.9;
  ctx.strokeStyle = INK;
  if (propName === 'moeda' || propName === 'dinheiro') {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#a16207';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
  } else if (propName === 'livro' || propName === 'carta') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-34, -26, 68, 52);
    ctx.strokeRect(-34, -26, 68, 52);
    ctx.strokeStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(-20, -10);
    ctx.lineTo(20, -10);
    ctx.moveTo(-20, 6);
    ctx.lineTo(14, 6);
    ctx.stroke();
  } else if (propName === 'lupa') {
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.arc(0, -10, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16, 10);
    ctx.lineTo(36, 36);
    ctx.stroke();
  } else if (propName === 'martelo') {
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-6, -24, 12, 64);
    ctx.strokeRect(-6, -24, 12, 64);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-28, -42, 56, 22);
    ctx.strokeRect(-28, -42, 56, 22);
  }
  ctx.restore();
}

/**
 * Desenha personagem estilo 2.5D Cartoon (baseado em #05/#19: proporcao ~3.2 HH,
 * traco de nanquim grosso ~6.6% da largura da cabeca, pes ancorados na base y=970).
 */
export function drawCartoon25dCanvas(ctx, W, H, opts) {
  ctx.clearRect(0, 0, W, H);
  const pal = { ...hashPalette(opts.preset), ...(opts.palette || {}) };
  const expr = opts.expr || 'smile';
  const open = Math.max(0, Math.min(1, Number(opts.mouthOpen || 0)));
  const blink = Boolean(opts.blink);
  const wave = Number(opts.wave || 0);
  const pointDir = opts.pointDir || '';
  const walkPhase = Number(opts.walkPhase || 0);
  const headTilt = Number(opts.headTilt || 0);

  const cx = W * 0.5;
  const footY = H * 0.965;
  const headR = W * 0.195; // ~117px em 600px -> ~3.2 HH no canvas 1000px
  const inkW = Math.max(8, headR * 0.085); // contorno nanquim espesso legivel
  const hipY = footY - 240;
  const torsoTopY = hipY - 210;
  const headY = torsoTopY - headR * 0.92;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Pernas articuladas ancoradas no chao
  const strideL = Math.sin(walkPhase) * 34;
  const strideR = -strideL;
  drawRoundedLimb(ctx, cx - 34, hipY, cx - 44 + strideL, footY - 14, 24, pal.pants, inkW * 0.85);
  drawRoundedLimb(ctx, cx + 34, hipY, cx + 44 + strideR, footY - 14, 24, pal.pants, inkW * 0.85);

  // Sapatos firmes no y=footY
  for (const [sx, sy] of [[cx - 48 + strideL, footY - 12], [cx + 48 + strideR, footY - 12]]) {
    ctx.fillStyle = '#1d1f24';
    ctx.strokeStyle = INK;
    ctx.lineWidth = inkW * 0.8;
    ctx.beginPath();
    ctx.ellipse(sx + 8, sy, 30, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Braco esquerdo
  const armLAngle = wave > 0.1 ? -2.2 + Math.sin(wave * 10) * 0.25 : 0.35 + Math.sin(walkPhase) * 0.2;
  const armLX2 = cx - 72 + Math.sin(armLAngle) * 145;
  const armLY2 = torsoTopY + 38 + Math.cos(armLAngle) * 145;
  drawRoundedLimb(ctx, cx - 64, torsoTopY + 34, armLX2, armLY2, 22, pal.jacket, inkW * 0.8);
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = inkW * 0.75;
  ctx.beginPath();
  ctx.arc(armLX2, armLY2, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Corpo (feijao / jaqueta pintada com degradê e faixa)
  const bodyGrad = ctx.createLinearGradient(cx - 90, torsoTopY, cx + 90, hipY);
  bodyGrad.addColorStop(0, pal.jacket);
  bodyGrad.addColorStop(1, '#111827');
  ctx.fillStyle = pal.jacket;
  ctx.strokeStyle = INK;
  ctx.lineWidth = inkW;
  ctx.beginPath();
  ctx.roundRect(cx - 78, torsoTopY, 156, 226, 72);
  ctx.fill();
  // sombra lateral direita em meia-lua
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(17, 24, 39, 0.22)';
  ctx.fillRect(cx + 22, torsoTopY, 70, 230);
  // faixa / cinto + botoes como no estilo Hans Acha
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(cx - 80, hipY - 34, 160, 22);
  ctx.restore();
  ctx.stroke();

  // Botoes
  ctx.fillStyle = '#facc15';
  for (let b = 0; b < 3; b++) {
    ctx.beginPath();
    ctx.arc(cx, torsoTopY + 62 + b * 36, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Braco direito (+ prop opcional)
  let armRAngle = -0.35 - Math.sin(walkPhase) * 0.2;
  if (pointDir === 'up') armRAngle = 2.4;
  else if (pointDir === 'side' || pointDir === 'forward') armRAngle = 1.45;
  else if (opts.prop) armRAngle = 0.9;
  const armRX2 = cx + 72 + Math.sin(armRAngle) * 145;
  const armRY2 = torsoTopY + 38 + Math.cos(armRAngle) * 145;
  drawRoundedLimb(ctx, cx + 64, torsoTopY + 34, armRX2, armRY2, 22, pal.jacket, inkW * 0.8);
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = inkW * 0.75;
  ctx.beginPath();
  ctx.arc(armRX2, armRY2, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (opts.prop) {
    drawProp(ctx, opts.prop, armRX2 + 12, armRY2 - 18, inkW * 0.8);
  }

  // Cabeca + Rosto + Chapeu/Cabelo
  ctx.save();
  ctx.translate(cx, headY);
  ctx.rotate(headTilt);

  // Cabeca oval com sombra suave (reconstroi path da cabeca antes de stroke!)
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = inkW;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, headR, headR * 1.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(130, 68, 42, 0.14)';
  ctx.beginPath();
  ctx.ellipse(headR * 0.45, 0, headR * 0.75, headR * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, 0, headR, headR * 1.06, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Cabelo / Chapeu (com contra-rotacao controlada)
  if (pal.hat === 'tophat') {
    ctx.fillStyle = pal.hatCol;
    ctx.strokeStyle = INK;
    ctx.lineWidth = inkW * 0.85;
    ctx.beginPath();
    ctx.roundRect(-headR * 0.72, -headR * 1.9, headR * 1.44, headR * 1.02, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-headR * 0.72, -headR * 1.06, headR * 1.44, 16);
    ctx.fillStyle = pal.hatCol;
    ctx.beginPath();
    ctx.roundRect(-headR * 1.15, -headR * 0.92, headR * 2.3, 24, 12);
    ctx.fill();
    ctx.stroke();
  } else if (pal.hat === 'helmet' || pal.hat === 'cap') {
    ctx.fillStyle = pal.hatCol;
    ctx.strokeStyle = INK;
    ctx.lineWidth = inkW * 0.85;
    ctx.beginPath();
    ctx.arc(0, -headR * 0.25, headR * 1.04, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-headR * 0.2, -headR * 0.36, headR * 1.35, 22, 11);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = pal.hair;
    ctx.strokeStyle = INK;
    ctx.lineWidth = inkW * 0.8;
    ctx.beginPath();
    ctx.arc(0, -headR * 0.28, headR * 1.05, Math.PI * 0.92, Math.PI * 0.08);
    ctx.quadraticCurveTo(0, -headR * 0.55, -headR * 0.98, -headR * 0.25);
    ctx.fill();
    ctx.stroke();
  }

  // Olhos + Sobrancelhas
  const eyeY = -headR * 0.1;
  const eyeX = headR * 0.36;
  ctx.strokeStyle = INK;
  ctx.lineWidth = inkW * 0.7;
  if (blink || expr === 'laugh' || expr === 'relief') {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * eyeX, eyeY + 6, 20, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else if (expr === 'dazed') {
    for (const dir of [-1, 1]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(dir * eyeX, eyeY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dir * eyeX - 9, eyeY - 9);
      ctx.lineTo(dir * eyeX + 9, eyeY + 9);
      ctx.moveTo(dir * eyeX + 9, eyeY - 9);
      ctx.lineTo(dir * eyeX - 9, eyeY + 9);
      ctx.stroke();
    }
  } else {
    const eyeR = expr === 'shock' || expr === 'shocked' ? 25 : 19;
    for (const dir of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * eyeX, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(dir * eyeX + 3, eyeY, expr === 'shock' || expr === 'shocked' ? 7 : 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sobrancelhas expressivas
  ctx.strokeStyle = INK;
  ctx.lineWidth = inkW * 0.65;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    if (expr === 'angry' || expr === 'stern') {
      ctx.moveTo(dir * eyeX - dir * 20, eyeY - 38);
      ctx.lineTo(dir * eyeX + dir * 20, eyeY - 22);
    } else if (expr === 'worried' || expr === 'sad' || expr === 'nervous') {
      ctx.moveTo(dir * eyeX - dir * 20, eyeY - 26);
      ctx.lineTo(dir * eyeX + dir * 20, eyeY - 40);
    } else if (expr === 'shock' || expr === 'shocked') {
      ctx.moveTo(dir * eyeX - 20, eyeY - 42);
      ctx.quadraticCurveTo(dir * eyeX, eyeY - 58, dir * eyeX + 20, eyeY - 42);
    } else {
      ctx.moveTo(dir * eyeX - 20, eyeY - 32);
      ctx.quadraticCurveTo(dir * eyeX, eyeY - 40, dir * eyeX + 20, eyeY - 32);
    }
    ctx.stroke();
  }

  // Boca (Rhubarb/Whisper mouthOpen OU expressao estatica)
  const mouthY = headR * 0.42;
  if (open > 0.12) {
    const mw = 26 + open * 16;
    const mh = 12 + open * 28;
    ctx.fillStyle = '#681122';
    ctx.strokeStyle = INK;
    ctx.lineWidth = inkW * 0.68;
    ctx.beginPath();
    ctx.ellipse(0, mouthY, mw, mh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ef7a8b';
    ctx.beginPath();
    ctx.ellipse(0, mouthY + mh * 0.45, mw * 0.55, mh * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (expr === 'laugh' || expr === 'grin') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = inkW * 0.65;
    ctx.beginPath();
    ctx.arc(0, mouthY - 8, 34, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (expr === 'shock' || expr === 'shocked' || expr === 'whistle') {
    ctx.fillStyle = '#681122';
    ctx.strokeStyle = INK;
    ctx.lineWidth = inkW * 0.65;
    ctx.beginPath();
    ctx.ellipse(0, mouthY + 4, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (expr === 'sad' || expr === 'angry' || expr === 'worried') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = inkW * 0.68;
    ctx.beginPath();
    ctx.arc(0, mouthY + 22, 26, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.strokeStyle = INK;
    ctx.lineWidth = inkW * 0.68;
    ctx.beginPath();
    ctx.arc(0, mouthY - 6, 28, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }

  ctx.restore();
}

export function createCartoon25dCharacter(c) {
  const heightScale = Number(c.escala || 1.0);
  const spriteH = 2.15 * heightScale; // ~2.16m adulto estilo #05
  const spriteW = spriteH * 0.6;
  const cw = 600;
  const ch = 1000;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.15,
    side: THREE.DoubleSide,
  });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(spriteW, spriteH), mat);
  card.position.y = spriteH / 2;

  // Sombra de contato no chao
  const shadowMat = new THREE.MeshBasicMaterial({
    color: '#1b141a',
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(spriteW * 0.34, 24), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;

  const root = new THREE.Group();
  root.name = `cartoon25d:${c.id}`;
  root.add(shadow, card);

  return {
    root,
    card,
    canvas,
    ctx,
    tex,
    preset: c.preset || 'homem',
    palette: c.palette || null,
    heightScale,
    spriteH,
    lastDrawKey: '',
    acoesRaw: (c.acoes || []).slice(),
    idSeed: String(c.id || '').split('').reduce((a, chCode) => a + chCode.charCodeAt(0), 0),
  };
}

export function updateCartoon25dCharacter(ent, t, mouthOpen, cameraPos, walkDist) {
  const c25 = ent.c25;
  if (!c25) return;

  // Billboard suave voltado para a camera (nunca visto de perfil fino)
  const dx = cameraPos.x - ent.holder.position.x;
  const dz = cameraPos.z - ent.holder.position.z;
  if (Math.hypot(dx, dz) > 0.05) {
    c25.card.rotation.y = Math.atan2(dx, dz) - ent.holder.rotation.y;
  }

  const acaoAtiva = c25.acoesRaw.find((a) => t >= (a.de ?? -1) && t <= (a.ate ?? 9999));
  const expr = acaoAtiva?.expressao || (acaoAtiva?.clip === 'surprised' ? 'shock' : 'smile');
  const talking = mouthOpen > 0.12 || Boolean(acaoAtiva?.fala);
  const openQ = Math.round(mouthOpen * 6) / 6;
  const blinkPhase = (t + (c25.idSeed % 7) * 0.41) % 3.4;
  const blink = blinkPhase > 3.24;
  const wave = acaoAtiva?.clip === 'wave' || acaoAtiva?.clip === 'cheer' ? (Math.sin(t * 9) * 0.5 + 0.5) : 0;
  const pointDir = acaoAtiva?.clip === 'point' ? (acaoAtiva?.params?.dir || 'side') : '';
  const walkPhase = walkDist > 0.01 ? Math.round(walkDist * 4.5 * 4) / 4 : 0;
  const prop = acaoAtiva?.prop || ent.def?.prop || '';
  const tilt = talking ? Math.round(Math.sin(t * 6.5) * 3) * 0.015 : Math.round(Math.sin(t * 2) * 1.5) * 0.01;

  const drawKey = `${c25.preset}|${expr}|${openQ}|${blink}|${Math.round(wave * 4)}|${pointDir}|${walkPhase}|${prop}|${tilt.toFixed(3)}`;
  if (drawKey !== c25.lastDrawKey) {
    c25.lastDrawKey = drawKey;
    drawCartoon25dCanvas(c25.ctx, c25.canvas.width, c25.canvas.height, {
      preset: c25.preset,
      palette: c25.palette,
      expr,
      mouthOpen: openQ,
      blink,
      wave,
      pointDir,
      walkPhase,
      prop,
      headTilt: tilt,
    });
    c25.tex.needsUpdate = true;
  }
}

export function applyToonInkStyle(obj) {
  if (!obj) return;
  obj.traverse((m) => {
    if (!m.isMesh || !m.geometry) return;
    if (m.userData.__inkApplied) return;
    m.userData.__inkApplied = true;
    try {
      const edges = new THREE.EdgesGeometry(m.geometry, 26);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.72 })
      );
      line.renderOrder = 2;
      m.add(line);
    } catch {}
  });
}
