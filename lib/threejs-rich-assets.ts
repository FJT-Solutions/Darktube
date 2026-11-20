import { downloadPolyHavenModel, listLocal3dModels, searchFree3dAssets, type Local3dModelItem } from '@/lib/threejs-asset-hub';

const CORE_POLYHAVEN_QUERIES = ['chair', 'table', 'lantern', 'rock'];

/**
 * Garante que modelos 3D CC0 reais (.gltf/.glb + texturas PBR) estejam cacheados em
 * `public/threejs-engine/models/` antes da montagem das cenas 3D.
 */
export async function ensureCorePolyHavenModels(maxToFetch = 3): Promise<Local3dModelItem[]> {
  const cached = listLocal3dModels();
  if (cached.length >= 4) return cached;

  let downloaded = 0;
  for (const term of CORE_POLYHAVEN_QUERIES) {
    if (downloaded >= maxToFetch) break;
    try {
      const search = await searchFree3dAssets(term, { limit: 4 });
      const candidate = search.remote.find(
        (item) =>
          item.source === 'polyhaven' &&
          !cached.some((c) => c.id.toLowerCase() === `ph_${item.id.toLowerCase()}`)
      );
      if (candidate) {
        const model = await downloadPolyHavenModel(candidate.id);
        if (!cached.some((c) => c.id.toLowerCase() === model.id.toLowerCase())) {
          cached.push(model);
        }
        downloaded++;
      }
    } catch {
      // Falha de rede nunca bloqueia o render; o motor segue com texturas PBR locais + modelos ja cacheados.
    }
  }

  return Array.from(new Map(cached.map((m) => [m.id.toLowerCase(), m])).values());
}

/**
 * Runtime browser injetavel no Three.js fornecendo:
 * 1) Geradores de texturas PBR procedural + bumpMap (alvenaria, aco escovado, shoji, forro, tatame, brita)
 * 2) Loader seguro de modelos .gltf/.glb locais com normalizacao de escala e piso y=0
 * 3) Construtor `createDepthBean3D` que insere o Bean Character 2D no Depth Buffer 3D real
 *    (com oclusao fisica atras de grades, dentro de cofres e sentado em poltronas)
 * 4) Props esculpidos 2.5D/3D (Cabeca de Dragao Dourada, Sapo de Bronze, Vitral, Cofre Bancario, Cela, Quarto Japones).
 */
export const RICH_ASSETS_BROWSER_RUNTIME_JS = `
export function makeCanvasTexturePair(THREE, size, drawColorAndBump) {
  const colCanvas = document.createElement('canvas');
  colCanvas.width = size; colCanvas.height = size;
  const cctx = colCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size; bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d');

  drawColorAndBump(cctx, bctx, size);

  const map = new THREE.CanvasTexture(colCanvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

export function makeStoneBrickMaterial(THREE, baseHex = '#3f4756', mortarHex = '#1f2530', repeat = [3, 2]) {
  const { map, bumpMap } = makeCanvasTexturePair(THREE, 512, (cctx, bctx, S) => {
    cctx.fillStyle = mortarHex;
    cctx.fillRect(0, 0, S, S);
    bctx.fillStyle = '#202020';
    bctx.fillRect(0, 0, S, S);

    const rows = 8;
    const cols = 4;
    const rh = S / rows;
    const cw = S / cols;
    let seed = 1337;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * cw + offset + 4;
        const y = r * rh + 4;
        const w = cw - 8;
        const h = rh - 8;
        const shade = Math.round((rand() - 0.5) * 26);
        const col = new THREE.Color(baseHex);
        col.offsetHSL(0, (rand() - 0.5) * 0.05, shade / 255);
        cctx.fillStyle = '#' + col.getHexString();
        cctx.fillRect(x, y, w, h);

        // Textura interna da pedra + manchas sutis
        for (let k = 0; k < 28; k++) {
          cctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.14)';
          cctx.fillRect(x + rand() * (w - 14), y + rand() * (h - 8), 8 + rand() * 14, 4 + rand() * 8);
        }

        const bVal = 175 + Math.round(rand() * 55);
        bctx.fillStyle = 'rgb(' + bVal + ',' + bVal + ',' + bVal + ')';
        bctx.fillRect(x, y, w, h);
      }
    }
  });
  map.repeat.set(repeat[0], repeat[1]);
  bumpMap.repeat.set(repeat[0], repeat[1]);
  return new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.14, roughness: 0.86, metalness: 0.06 });
}

export function makeBrushedSteelMaterial(THREE, baseHex = '#64748b', repeat = [2, 2]) {
  const { map, bumpMap } = makeCanvasTexturePair(THREE, 512, (cctx, bctx, S) => {
    cctx.fillStyle = baseHex;
    cctx.fillRect(0, 0, S, S);
    bctx.fillStyle = '#909090';
    bctx.fillRect(0, 0, S, S);

    // Listras de aco escovado horizontal
    for (let y = 0; y < S; y += 2) {
      const a = (Math.sin(y * 0.7) * 0.5 + 0.5) * 0.08;
      cctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')';
      cctx.fillRect(0, y, S, 2);
    }
    // Juntas de chapas + rebites nos cantos
    cctx.strokeStyle = 'rgba(15,23,42,0.7)';
    cctx.lineWidth = 6;
    bctx.strokeStyle = '#202020';
    bctx.lineWidth = 6;
    for (const step of [0, 256]) {
      cctx.strokeRect(step + 3, 3, 250, 250);
      cctx.strokeRect(step + 3, 259, 250, 250);
      bctx.strokeRect(step + 3, 3, 250, 250);
      bctx.strokeRect(step + 3, 259, 250, 250);
      for (const rx of [step + 22, step + 234]) {
        for (const ry of [22, 234, 278, 490]) {
          cctx.fillStyle = '#cbd5e1';
          cctx.beginPath(); cctx.arc(rx, ry, 7, 0, Math.PI * 2); cctx.fill();
          cctx.strokeStyle = '#0f172a'; cctx.lineWidth = 2; cctx.stroke();
          bctx.fillStyle = '#ffffff';
          bctx.beginPath(); bctx.arc(rx, ry, 7, 0, Math.PI * 2); bctx.fill();
        }
      }
    }
  });
  map.repeat.set(repeat[0], repeat[1]);
  bumpMap.repeat.set(repeat[0], repeat[1]);
  return new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.08, roughness: 0.34, metalness: 0.78 });
}

export function makeShojiWoodMaterial(THREE, baseHex = '#1d4ed8') {
  const { map, bumpMap } = makeCanvasTexturePair(THREE, 512, (cctx, bctx, S) => {
    cctx.fillStyle = baseHex;
    cctx.fillRect(0, 0, S, S);
    bctx.fillStyle = '#888888';
    bctx.fillRect(0, 0, S, S);
    // Paineis moldurados de parede japonesa moderna
    for (let x = 0; x < S; x += 128) {
      cctx.fillStyle = 'rgba(255,255,255,0.06)';
      cctx.fillRect(x + 6, 10, 116, S - 20);
      cctx.strokeStyle = 'rgba(10,20,55,0.55)';
      cctx.lineWidth = 5;
      cctx.strokeRect(x + 4, 8, 120, S - 16);
      bctx.strokeStyle = '#303030';
      bctx.lineWidth = 6;
      bctx.strokeRect(x + 4, 8, 120, S - 16);
    }
  });
  return new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.05, roughness: 0.68, metalness: 0.06 });
}

export function makeTileFloorMaterial(THREE, baseHex = '#b8a993', lineHex = '#7c6e5b', repeat = [6, 6]) {
  const { map, bumpMap } = makeCanvasTexturePair(THREE, 512, (cctx, bctx, S) => {
    cctx.fillStyle = baseHex;
    cctx.fillRect(0, 0, S, S);
    bctx.fillStyle = '#d0d0d0';
    bctx.fillRect(0, 0, S, S);
    const step = 128;
    for (let x = 0; x < S; x += step) {
      for (let y = 0; y < S; y += step) {
        const v = ((x + y) / step) % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
        cctx.fillStyle = v;
        cctx.fillRect(x + 4, y + 4, step - 8, step - 8);
      }
    }
    cctx.strokeStyle = lineHex; cctx.lineWidth = 5;
    bctx.strokeStyle = '#303030'; bctx.lineWidth = 5;
    for (let i = 0; i <= S; i += step) {
      cctx.beginPath(); cctx.moveTo(i, 0); cctx.lineTo(i, S); cctx.stroke();
      cctx.beginPath(); cctx.moveTo(0, i); cctx.lineTo(S, i); cctx.stroke();
      bctx.beginPath(); bctx.moveTo(i, 0); bctx.lineTo(i, S); bctx.stroke();
      bctx.beginPath(); bctx.moveTo(0, i); bctx.lineTo(S, i); bctx.stroke();
    }
  });
  map.repeat.set(repeat[0], repeat[1]);
  bumpMap.repeat.set(repeat[0], repeat[1]);
  return new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.06, roughness: 0.72, metalness: 0.05 });
}

export function drawBeanSpriteToCanvas(ctx, W, H, opts) {
  ctx.clearRect(0, 0, W, H);
  const {
    costume = 'moderno',  // 'moderno' | 'imperial' | 'prisioneiro' | 'assaltante'
    mood = 'normal',      // 'normal' | 'worried' | 'shocked' | 'smiling' | 'effort'
    sweat = false,
    armMode = 'idle',     // 'idle' | 'lift_up' | 'grip_bars' | 'point_right' | 'hands_head' | 'sit'
    walkPhase = 0,
    talkOpen = 0,
  } = opts;

  ctx.save();
  ctx.translate(W / 2, H - 36);
  const sc = 2.05;
  ctx.scale(sc, sc);

  const bw = 138;
  const bh = 238;
  const r = bw / 2;
  const botY = -44;
  const topY = botY - bh;
  const midY = (topY + botY) / 2;

  ctx.strokeStyle = '#141210';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Pernas (sentado ou em pe)
  if (armMode === 'sit') {
    ctx.beginPath(); ctx.moveTo(-28, botY - 12); ctx.lineTo(-42, botY + 18); ctx.lineTo(-48, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28, botY - 12); ctx.lineTo(42, botY + 18); ctx.lineTo(48, -2); ctx.stroke();
  } else {
    const bob = armMode === 'lift_up' ? 4 : Math.sin(walkPhase * 8) * 10;
    ctx.beginPath(); ctx.moveTo(-26, botY - 10); ctx.lineTo(-30 - bob * 0.4, -4); ctx.lineTo(-46 - bob * 0.4, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(26, botY - 10); ctx.lineTo(30 + bob * 0.4, -4); ctx.lineTo(46 + bob * 0.4, -4); ctx.stroke();
  }

  // Bracos atras/frente dependendo da acao fisica no mundo 3D
  ctx.lineWidth = 9.5;
  if (armMode === 'lift_up') {
    ctx.beginPath(); ctx.moveTo(-bw * 0.46, midY + 12); ctx.quadraticCurveTo(-bw * 0.78, topY + 20, -48, topY - 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bw * 0.46, midY + 12); ctx.quadraticCurveTo(bw * 0.78, topY + 20, 48, topY - 26); ctx.stroke();
  } else if (armMode === 'grip_bars') {
    ctx.beginPath(); ctx.moveTo(-bw * 0.46, midY + 12); ctx.lineTo(-bw * 0.76, midY - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bw * 0.46, midY + 12); ctx.lineTo(bw * 0.76, midY - 16); ctx.stroke();
  } else if (armMode === 'hands_head') {
    ctx.beginPath(); ctx.moveTo(-bw * 0.46, midY + 12); ctx.quadraticCurveTo(-bw * 0.76, midY - 26, -bw * 0.52, topY + 58); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bw * 0.46, midY + 12); ctx.quadraticCurveTo(bw * 0.76, midY - 26, bw * 0.52, topY + 58); ctx.stroke();
  } else if (armMode === 'point_right') {
    ctx.beginPath(); ctx.moveTo(-bw * 0.46, midY + 14); ctx.lineTo(-bw * 0.62, midY + 72); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bw * 0.46, midY + 14); ctx.lineTo(bw * 0.94, midY - 10); ctx.stroke();
  } else if (armMode === 'sit') {
    ctx.beginPath(); ctx.moveTo(-bw * 0.46, midY + 16); ctx.lineTo(-bw * 0.68, midY + 58); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bw * 0.46, midY + 16); ctx.lineTo(bw * 0.68, midY + 58); ctx.stroke();
  } else {
    const w = Math.sin(walkPhase * 4) * 8;
    ctx.beginPath(); ctx.moveTo(-bw * 0.46, midY + 14); ctx.lineTo(-bw * 0.64, midY + 68 + w); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bw * 0.46, midY + 14); ctx.lineTo(bw * 0.64, midY + 68 - w); ctx.stroke();
  }

  // Corpo capsula com sombra 2.5D suave
  ctx.beginPath();
  ctx.roundRect(-bw / 2, topY, bw, bh, r);
  const grad = ctx.createLinearGradient(-bw / 2, topY, bw / 2, botY);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.66, '#F4F7FC');
  grad.addColorStop(1, '#BCCBDD');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.clip();
  if (costume === 'imperial') {
    ctx.fillStyle = '#2452BA';
    ctx.fillRect(-bw / 2, midY + 8, bw, bh / 2 + 12);
    ctx.fillStyle = 'rgba(15,23,42,0.22)';
    ctx.fillRect(14, midY + 8, bw / 2, bh / 2 + 12);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(-40, midY + 8); ctx.lineTo(0, midY + 66); ctx.lineTo(40, midY + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#141210'; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#EAB308';
    ctx.fillRect(-bw / 2, midY + 62, bw, 18);
    ctx.strokeRect(-bw / 2, midY + 62, bw, 18);
  } else if (costume === 'prisioneiro') {
    ctx.fillStyle = '#EA580C';
    ctx.fillRect(-bw / 2, midY + 8, bw, bh / 2 + 12);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(16, midY + 8, bw / 2, bh / 2 + 12);
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath(); ctx.moveTo(-26, midY + 8); ctx.lineTo(0, midY + 34); ctx.lineTo(26, midY + 8); ctx.closePath(); ctx.fill();
  } else if (costume === 'assaltante') {
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-bw / 2, midY + 8, bw, bh / 2 + 12);
    for (let sy = midY + 26; sy < botY; sy += 26) {
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(-bw / 2, sy, bw, 9);
    }
  } else {
    ctx.fillStyle = '#7DD3FC';
    ctx.fillRect(-bw / 2, midY + 12, bw, bh / 2 + 12);
    ctx.fillStyle = 'rgba(15,23,42,0.16)';
    ctx.fillRect(18, midY + 12, bw / 2, bh / 2 + 12);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.roundRect(-bw / 2, topY, bw, bh, r);
  ctx.strokeStyle = '#141210';
  ctx.lineWidth = 9.5;
  ctx.stroke();

  // Cabelo / Chapeu / Gorro
  if (costume === 'imperial') {
    ctx.fillStyle = '#181615';
    ctx.beginPath(); ctx.ellipse(0, topY - 12, 21, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, topY + 10, 50, 17, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#EAB308'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-40, topY - 14); ctx.lineTo(40, topY - 14); ctx.stroke();
  } else if (costume === 'assaltante') {
    ctx.fillStyle = '#0F172A';
    ctx.beginPath(); ctx.arc(0, topY + 42, bw * 0.5, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#141210'; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.roundRect(-bw * 0.49, topY + 28, bw * 0.98, 22, 10); ctx.fill(); ctx.stroke();
  } else {
    // Cabelo tigela repartido igual Quadro 1 "Japan,"!
    ctx.fillStyle = '#181615';
    ctx.beginPath(); ctx.arc(0, topY + 44, bw * 0.48, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(2, topY + 4); ctx.lineTo(-8, topY + 32); ctx.stroke();
  }

  // Rosto
  const eyeY = topY + 74;
  ctx.strokeStyle = '#141210';
  if (mood === 'worried') {
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-32, eyeY); ctx.lineTo(-10, eyeY - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, eyeY - 3); ctx.lineTo(32, eyeY); ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-34, eyeY - 18); ctx.lineTo(-12, eyeY - 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, eyeY - 24); ctx.lineTo(34, eyeY - 18); ctx.stroke();
  } else if (mood === 'shocked' || mood === 'effort') {
    for (const ex of [-22, 22]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(ex, eyeY, 15, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = '#141210';
      ctx.beginPath(); ctx.arc(ex, eyeY, mood === 'effort' ? 4 : 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(-22, eyeY - 14, 14, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(22, eyeY - 14, 14, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  } else {
    for (const ex of [-20, 20]) {
      ctx.fillStyle = '#141210';
      ctx.beginPath(); ctx.ellipse(ex, eyeY, 6.5, 9.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(ex - 2, eyeY - 3, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-30, eyeY - 16); ctx.lineTo(-10, eyeY - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, eyeY - 16); ctx.lineTo(30, eyeY - 16); ctx.stroke();
  }

  const mouthY = topY + 110;
  if (mood === 'shocked' || mood === 'effort') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(-21, mouthY - 8, 42, 18, 5); ctx.fill();
    ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-21, mouthY + 1); ctx.lineTo(21, mouthY + 1);
    ctx.moveTo(-7, mouthY - 8); ctx.lineTo(-7, mouthY + 10);
    ctx.moveTo(7, mouthY - 8); ctx.lineTo(7, mouthY + 10);
    ctx.stroke();
  } else if (talkOpen > 0.15) {
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath(); ctx.ellipse(0, mouthY, 15, 4 + talkOpen * 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4; ctx.stroke();
  } else if (mood === 'smiling') {
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, mouthY - 4, 13, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else {
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-13, mouthY); ctx.lineTo(13, mouthY); ctx.stroke();
  }

  if (sweat) {
    ctx.save();
    ctx.translate(45, topY + 46);
    ctx.fillStyle = '#7DD3FC';
    ctx.beginPath();
    ctx.moveTo(0, -15); ctx.quadraticCurveTo(13, 4, 9, 13); ctx.arc(0, 11, 9, 0, Math.PI); ctx.quadraticCurveTo(-13, 4, 0, -15);
    ctx.fill();
    ctx.lineWidth = 3.8; ctx.strokeStyle = '#141210'; ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export function createDepthBean3D(THREE, scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 840;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;

  const geo = new THREE.PlaneGeometry(2.1, 2.75);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.32,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 1.375, 0);

  // Sombra de contato no chao 3D
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128; shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  const sg = sctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  sg.addColorStop(0, 'rgba(0,0,0,0.48)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = sg; sctx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowDisk = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.72),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  );
  shadowDisk.rotation.x = -Math.PI / 2;
  shadowDisk.position.set(0, 0.02, 0);

  const group = new THREE.Group();
  group.add(shadowDisk);
  group.add(mesh);
  scene.add(group);

  return {
    group,
    mesh,
    update(opts, worldPos = [0, 0, 0], scale = 1.0, rotY = 0) {
      drawBeanSpriteToCanvas(ctx, canvas.width, canvas.height, opts);
      tex.needsUpdate = true;
      group.position.set(worldPos[0], worldPos[1], worldPos[2]);
      group.scale.setScalar(scale);
      mesh.rotation.y = rotY;
    },
  };
}

export function createSculptedDragonHeadSprite(THREE) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(256, 260);
  // Aura sutil de relevo metalico dourado
  const goldGrad = ctx.createLinearGradient(-160, -140, 160, 140);
  goldGrad.addColorStop(0, '#fde047');
  goldGrad.addColorStop(0.45, '#d97706');
  goldGrad.addColorStop(1, '#78350f');

  // Juba / Chifres atras
  ctx.fillStyle = '#92400e'; ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(-40, -70); ctx.lineTo(-140, -180); ctx.lineTo(-80, -40); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(40, -70); ctx.lineTo(140, -180); ctx.lineTo(80, -40); ctx.closePath(); ctx.fill(); ctx.stroke();

  // Escamas do rosto
  ctx.fillStyle = goldGrad;
  ctx.beginPath(); ctx.ellipse(0, 0, 118, 92, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Focinho saliente
  ctx.fillStyle = '#b45309';
  ctx.beginPath(); ctx.roundRect(-78, 12, 156, 78, 32); ctx.fill(); ctx.stroke();
  // Dentes brancos afiados + bola dourada na boca
  ctx.fillStyle = '#fef08a';
  for (const dx of [-48, -24, 24, 48]) {
    ctx.beginPath(); ctx.moveTo(dx - 10, 74); ctx.lineTo(dx, 98); ctx.lineTo(dx + 10, 74); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  const ballGrad = ctx.createRadialGradient(-8, 108, 4, 0, 114, 34);
  ballGrad.addColorStop(0, '#fef9c3'); ballGrad.addColorStop(0.5, '#f59e0b'); ballGrad.addColorStop(1, '#78350f');
  ctx.fillStyle = ballGrad;
  ctx.beginPath(); ctx.arc(0, 114, 32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Olhos ferozes
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.ellipse(sx * 48, -22, 24, 15, sx * -0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.ellipse(sx * 48, -22, 6, 12, 0, 0, Math.PI * 2); ctx.fill();
    // Bigodes esvoacantes
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(sx * 72, 32); ctx.bezierCurveTo(sx * 145, 5, sx * 165, 65, sx * 195, 42); ctx.stroke();
  }
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSculptedFrogSprite(THREE) {
  const c = document.createElement('canvas');
  c.width = 384; c.height = 384;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 384, 384);
  ctx.save();
  ctx.translate(192, 230);
  const frogGrad = ctx.createLinearGradient(-110, -100, 110, 90);
  frogGrad.addColorStop(0, '#a8a29e');
  frogGrad.addColorStop(0.55, '#57534e');
  frogGrad.addColorStop(1, '#292524');

  ctx.strokeStyle = '#141210'; ctx.lineWidth = 8;
  // Patas traseiras/dianteiras
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#57534e';
    ctx.beginPath(); ctx.ellipse(sx * 78, 56, 38, 22, sx * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // Corpo rechonchudo de pedra/bronze
  ctx.fillStyle = frogGrad;
  ctx.beginPath(); ctx.ellipse(0, 15, 96, 68, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Olhos saltados no topo
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#78716c';
    ctx.beginPath(); ctx.arc(sx * 44, -52, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.arc(sx * 44, -52, 10, 0, Math.PI * 2); ctx.fill();
  }
  // Boca escancarada esperando a esfera
  ctx.fillStyle = '#1c1917';
  ctx.beginPath(); ctx.ellipse(0, -4, 52, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
`;
