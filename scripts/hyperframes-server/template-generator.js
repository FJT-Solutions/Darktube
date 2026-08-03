/**
 * DarkTube HyperFrames Template Generator — WebGL Edition
 *
 * Usa shaders GLSL reais extraídos dos blocos oficiais do catálogo HyperFrames:
 *   - cinematic-zoom   (zoom blur radial com aberração cromática, 12 amostras)
 *   - flash-through-white (clareamento até branco no ponto médio)
 *   - swirl-vortex     (vórtice espiral com fbm noise orgânico)
 *
 * Cada par de cenas consecutivas recebe uma transição WebGL diferente.
 * Durante a cena: Ken Burns via CSS animation (suave, sem glitch de GSAP).
 * Legendas: word-by-word com GSAP, cor primária em destaque.
 */

'use strict';

// ─── GLSL SHADERS (extraídos dos blocos oficiais do catálogo HyperFrames) ───

const VERT_SRC = `attribute vec2 a_pos; varying vec2 v_uv;
void main(){ v_uv=a_pos*0.5+0.5; v_uv.y=1.0-v_uv.y; gl_Position=vec4(a_pos,0,1); }`;

const FRAG_HEADER = `precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_from, u_to;
uniform float u_progress;
uniform vec2 u_resolution;\n`;

// Passa a cena sem transform (usado para exibição estática)
const FRAG_PASS = FRAG_HEADER + `void main(){ gl_FragColor=texture2D(u_from,v_uv); }`;

// cinematic-zoom: zoom blur radial com aberração cromática (12 samples)
const FRAG_CINEMATIC_ZOOM = FRAG_HEADER + `void main(){
  vec2 d=v_uv-vec2(.5);
  float fromS=u_progress*.08;
  float toS=(1.-u_progress)*.06;
  float fr=0.,fg=0.,fb=0.;
  for(int i=0;i<12;i++){
    float f=float(i)/12.;
    fr+=texture2D(u_from,v_uv-d*(fromS*1.06)*f).r;
    fg+=texture2D(u_from,v_uv-d*fromS*f).g;
    fb+=texture2D(u_from,v_uv-d*(fromS*.94)*f).b;
  }
  vec3 fromBl=vec3(fr,fg,fb)/12.;
  float tr=0.,tg=0.,tb=0.;
  for(int i=0;i<12;i++){
    float f=float(i)/12.;
    tr+=texture2D(u_to,v_uv+d*(toS*1.06)*f).r;
    tg+=texture2D(u_to,v_uv+d*toS*f).g;
    tb+=texture2D(u_to,v_uv+d*(toS*.94)*f).b;
  }
  vec3 toBl=vec3(tr,tg,tb)/12.;
  gl_FragColor=vec4(mix(fromBl,toBl,u_progress),1.);
}`;

// flash-through-white: clareamento até branco no meio da transição
const FRAG_FLASH_WHITE = FRAG_HEADER + `void main(){
  vec4 A=texture2D(u_from,v_uv), B=texture2D(u_to,v_uv);
  float toWhite=smoothstep(0.,.45,u_progress);
  vec3 fromC=mix(A.rgb,vec3(1.),toWhite);
  float fromWhite=1.-smoothstep(.5,1.,u_progress);
  vec3 toC=mix(B.rgb,vec3(1.),fromWhite);
  gl_FragColor=vec4(mix(fromC,toC,smoothstep(.35,.65,u_progress)),1.);
}`;

// swirl-vortex: vórtice espiral com fbm noise orgânico
const FRAG_SWIRL = FRAG_HEADER + `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.,a=.5;
  mat2 R=mat2(.8,.6,-.6,.8);
  for(int i=0;i<5;i++){v+=a*vnoise(p);p=R*p*2.02;a*=.5;}
  return v;
}
void main(){
  vec2 uv=v_uv-.5;
  float dist=length(uv);
  float warp=fbm(v_uv*4.)*.5;
  float fromAng=u_progress*(1.-dist)*10.+warp*u_progress*3.;
  float fs=sin(fromAng),fc=cos(fromAng);
  vec2 fromUv=clamp(vec2(uv.x*fc-uv.y*fs,uv.x*fs+uv.y*fc)+.5,0.,1.);
  float toAng=-(1.-u_progress)*(1.-dist)*10.-warp*(1.-u_progress)*3.;
  float ts=sin(toAng),tc=cos(toAng);
  vec2 toUv=clamp(vec2(uv.x*tc-uv.y*ts,uv.x*ts+uv.y*tc)+.5,0.,1.);
  vec4 A=texture2D(u_from,fromUv);
  vec4 B=texture2D(u_to,toUv);
  gl_FragColor=mix(A,B,u_progress);
}`;

// Rotação de shaders por par de cenas
const TRANSITION_SHADERS = [
  FRAG_CINEMATIC_ZOOM,
  FRAG_FLASH_WHITE,
  FRAG_SWIRL,
];

// ─── GERADOR PRINCIPAL ───

function generateCompositionHTML(payload) {
  const {
    scenes = [],
    width = 1080,
    height = 1920,
    format = 'vertical',
    captionStyle = 'pop',
    primaryColor = '#EAB308',
    accentColor = '#FFFFFF',
    showWatermark = false,
    watermarkText = '@darktube',
  } = payload;

  // Duração de cada cena
  const TRANSITION_DUR = 1.0;  // segundos de overlap da transição WebGL
  const sceneDurations = scenes.map(s => s.durationSeconds || 5);
  const totalDuration = sceneDurations.reduce((a, b) => a + b, 0);

  // ── HTML de cada cena (N cenas = N imagens, sem extras) ──
  const scenesHTML = scenes.map((scene, i) => {
    const imageUrl = scene.imageUrl || '';
    const captionText = scene.captionText || '';
    const words = captionText.split(' ').filter(Boolean);

    // Ken Burns: alternância de direção por cena
    const kbClass = `kb-${i % 4}`;

    // Legenda word-by-word (estilo pop/karaoke) ou linha inteira
    let captionHTML = '';
    if ((captionStyle === 'pop' || captionStyle === 'karaoke') && words.length > 0) {
      const wordsSpans = words.map((word, wi) =>
        `<span class="word" id="w-${i}-${wi}">${word.replace(/</g, '&lt;')}</span>`
      ).join(' ');
      captionHTML = `<div class="caption-box"><div class="caption-words">${wordsSpans}</div></div>`;
    } else if (captionText) {
      captionHTML = `<div class="caption-box"><p class="caption-line">${captionText.replace(/</g, '&lt;')}</p></div>`;
    }

    return `
  <div id="scene-${i}" class="scene">
    <div class="bg-wrap">
      <img id="img-${i}" class="kb ${kbClass}" src="${imageUrl}" alt="Cena ${i + 1}" crossorigin="anonymous" />
      <div class="vignette"></div>
    </div>
    ${captionHTML}
  </div>`;
  }).join('\n');

  // ── GSAP: word-by-word animations + controle de cenas ──
  let gsapCode = '';
  let t = 0;

  scenes.forEach((scene, i) => {
    const dur = sceneDurations[i];
    const words = (scene.captionText || '').split(' ').filter(Boolean);
    const timePerWord = words.length > 0 ? (dur * 0.85) / words.length : dur;

    // Animar legendas palavra por palavra
    words.forEach((_, wi) => {
      const wStart = t + 0.2 + wi * timePerWord;
      const wEnd = wStart + timePerWord;
      const isHighlight = wi % 3 === 0;
      const highlightClass = isHighlight ? 'word highlight' : 'word';
      gsapCode += `
  tl.fromTo('#w-${i}-${wi}', {opacity:0,scaleY:0,transformOrigin:'bottom center'}, {opacity:1,scaleY:1,duration:0.12,ease:'back.out(2)'}, ${wStart.toFixed(3)});
  tl.to('#w-${i}-${wi}', {opacity:0,scaleY:0,duration:0.10,ease:'power2.in'}, ${(wEnd - 0.08).toFixed(3)});`;
      if (isHighlight) {
        gsapCode += `
  tl.set('#w-${i}-${wi}', {className:'${highlightClass}'}, ${wStart.toFixed(3)});
  tl.set('#w-${i}-${wi}', {className:'word'}, ${(wEnd - 0.08).toFixed(3)});`;
      }
    });

    t += dur;
  });

  // ── GLSL shaders inline (para uso no engine WebGL) ──
  const shadersSerialized = TRANSITION_SHADERS.map(s => JSON.stringify(s));

  // ── Watermark ──
  const watermarkHTML = showWatermark ? `
  <div class="watermark" id="watermark">
    <span class="watermark-dot"></span>
    <span class="watermark-text">${watermarkText.replace(/</g, '&lt;')}</span>
  </div>` : '';

  // ── Ken Burns CSS para 4 estilos ──
  const kenBurnsCSS = `
    @keyframes kb0 { from { transform: scale(1.0) translate(0%,0%); } to { transform: scale(1.35) translate(5%,-3%); } }
    @keyframes kb1 { from { transform: scale(1.35) translate(-5%,3%); } to { transform: scale(1.0) translate(0%,0%); } }
    @keyframes kb2 { from { transform: scale(1.0) translate(0%,5%); } to { transform: scale(1.3) translate(-4%,-4%); } }
    @keyframes kb3 { from { transform: scale(1.3) translate(4%,4%); } to { transform: scale(1.0) translate(0%,-5%); } }
    .kb-0 { animation-name: kb0; }
    .kb-1 { animation-name: kb1; }
    .kb-2 { animation-name: kb2; }
    .kb-3 { animation-name: kb3; }`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>DarkTube Video</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Inter:wght@700;800;900&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: #000;
      font-family: 'Montserrat', sans-serif;
      user-select: none;
    }

    #composition {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: #050505;
    }

    /* ── CENAS ── */
    .scene {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .bg-wrap {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .bg-wrap img.kb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      filter: contrast(1.18) brightness(0.88) saturate(1.15);
      transform-origin: center center;
      will-change: transform;
      animation-duration: var(--scene-dur, 6s);
      animation-timing-function: linear;
      animation-fill-mode: both;
      animation-play-state: paused;
    }

    ${kenBurnsCSS}

    .vignette {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.82) 100%);
      pointer-events: none;
      z-index: 2;
    }

    /* ── CANVAS WebGL (transições shader) ── */
    #gl-canvas {
      position: absolute;
      top: 0; left: 0;
      width: ${width}px;
      height: ${height}px;
      z-index: 5;
      pointer-events: none;
      display: none;
      image-rendering: pixelated;
    }

    /* ── LEGENDAS ── */
    .caption-box {
      position: absolute;
      bottom: ${format === 'vertical' ? '260px' : '130px'};
      left: 40px; right: 40px;
      z-index: 10;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      pointer-events: none;
    }

    .caption-words {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px 10px;
      max-width: 100%;
    }

    .word {
      display: inline-block;
      font-size: ${format === 'vertical' ? '74px' : '54px'};
      font-weight: 900;
      line-height: 1.1;
      color: #FFFFFF;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 6px 16px;
      border-radius: 14px;
      opacity: 0;
      transform-origin: bottom center;
      -webkit-text-stroke: 4px #000;
      paint-order: stroke fill;
      text-shadow: 0 8px 24px rgba(0,0,0,0.9);
      will-change: transform, opacity;
    }

    .word.highlight {
      background: ${primaryColor};
      color: #000;
      -webkit-text-stroke: 0;
      box-shadow: 0 8px 30px rgba(234,179,8,0.7);
    }

    .caption-line {
      font-size: ${format === 'vertical' ? '64px' : '48px'};
      font-weight: 900;
      color: #FFF;
      text-transform: uppercase;
      -webkit-text-stroke: 3.5px #000;
      paint-order: stroke fill;
      text-shadow: 0 6px 20px rgba(0,0,0,0.95);
      opacity: 0;
      will-change: opacity;
    }

    /* ── WATERMARK ── */
    .watermark {
      position: absolute;
      top: ${format === 'vertical' ? '52px' : '36px'};
      right: 44px;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 100px;
      padding: 10px 22px;
    }

    .watermark-dot {
      display: inline-block;
      width: 9px; height: 9px;
      border-radius: 50%;
      background: ${primaryColor};
      box-shadow: 0 0 10px ${primaryColor};
    }

    .watermark-text {
      font-size: 24px;
      font-weight: 800;
      color: rgba(255,255,255,0.92);
      letter-spacing: 1px;
    }

    /* ── BARRA DE PROGRESSO ── */
    #progress-bar {
      position: absolute;
      bottom: 0; left: 0;
      height: 5px;
      width: 0%;
      background: linear-gradient(90deg, ${primaryColor}, #fff);
      z-index: 20;
      opacity: 0.8;
      box-shadow: 0 0 10px ${primaryColor};
      will-change: width;
    }
  </style>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body>

<div id="composition"
     data-composition-id="darktube-video"
     data-width="${width}"
     data-height="${height}">

  ${scenesHTML}

  <!-- Canvas WebGL para transições shader -->
  <canvas id="gl-canvas" width="${width}" height="${height}"></canvas>

  ${watermarkHTML}

  <!-- Barra de progresso -->
  <div id="progress-bar"></div>

  <!-- Driver clip: HyperFrames CLI controla o timeline via este elemento -->
  <div id="driver" class="clip"
       data-start="0"
       data-duration="${totalDuration.toFixed(2)}"
       data-track-index="0"
       style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;">
  </div>

</div>

<script>
(function() {
  'use strict';

  // ─── Configurações ───
  var WIDTH  = ${width};
  var HEIGHT = ${height};
  var SCENE_DURATIONS = ${JSON.stringify(sceneDurations)};
  var TOTAL_DURATION  = ${totalDuration.toFixed(3)};
  var TRANS_DUR       = ${TRANSITION_DUR.toFixed(2)}; // duração da transição WebGL em segundos

  // ─── GLSL Shaders ───
  var SHADERS_FRAG = [
    ${shadersSerialized.join(',\n    ')}
  ];

  var VERT_SRC = ${JSON.stringify(VERT_SRC)};
  var FRAG_PASS = ${JSON.stringify(FRAG_PASS)};

  // ─── Inicializar Ken Burns ───
  var t0 = 0;
  SCENE_DURATIONS.forEach(function(dur, i) {
    var img = document.getElementById('img-' + i);
    if (img) {
      img.style.setProperty('--scene-dur', dur + 's');
      img.style.animationDelay = '0s';
      img.style.animationPlayState = 'paused';
    }
    t0 += dur;
  });

  // ─── WebGL Engine ───
  var glCanvas = document.getElementById('gl-canvas');
  var gl = glCanvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: true });

  if (!gl) {
    console.warn('[DarkTube] WebGL não disponível — fallback para CSS transitions');
    initFallback();
    return;
  }

  gl.viewport(0, 0, WIDTH, HEIGHT);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // ─── Compilar shaders ───
  function compileShader(src, type) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error('[DarkTube] Shader error:', gl.getShaderInfoLog(s));
    return s;
  }

  function mkProg(fragSrc) {
    var p = gl.createProgram();
    gl.attachShader(p, compileShader(VERT_SRC, gl.VERTEX_SHADER));
    gl.attachShader(p, compileShader(fragSrc, gl.FRAGMENT_SHADER));
    gl.linkProgram(p);
    return p;
  }

  var quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  var progPass = mkProg(FRAG_PASS);
  var progTransitions = SHADERS_FRAG.map(function(frag) { return mkProg(frag); });

  // ─── Capturar cena como textura WebGL ───
  function captureSceneTexture(sceneId) {
    var scene = document.getElementById(sceneId);
    if (!scene) return null;

    // Mostrar cena temporariamente para captura
    var prevOp = scene.style.opacity;
    var prevZ  = scene.style.zIndex;
    scene.style.opacity = '1';
    scene.style.zIndex  = '9999';
    scene.offsetHeight; // force reflow

    // Criar canvas 2D e desenhar cena
    var c   = document.createElement('canvas');
    c.width  = WIDTH;
    c.height = HEIGHT;
    var ctx = c.getContext('2d');

    // Fundo
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Desenhar imagem de fundo
    var img = scene.querySelector('img.kb');
    if (img && img.complete && img.naturalWidth > 0) {
      try {
        ctx.save();
        ctx.filter = 'contrast(1.18) brightness(0.88) saturate(1.15)';
        ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
        ctx.restore();
      } catch(e) {
        // cross-origin fallback
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }
    }

    // Vignette
    var vg = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, HEIGHT*0.15, WIDTH/2, HEIGHT/2, HEIGHT*0.65);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    scene.style.opacity = prevOp;
    scene.style.zIndex  = prevZ;

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    return tex;
  }

  // ─── Renderizar frame WebGL ───
  function renderFrame(prog, texFrom, texTo, progress) {
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texFrom);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_from'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texTo || texFrom);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_to'), 1);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_progress'), progress);
    gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), WIDTH, HEIGHT);
    var aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function easeInOut(p) {
    return p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2, 2)/2;
  }

  // ─── Aguardar imagens e construir timeline ───
  var sceneCount = ${scenes.length};

  function waitForImages(cb) {
    var imgs = document.querySelectorAll('img.kb');
    var loaded = 0;
    var total = imgs.length;
    if (total === 0) { cb(); return; }
    imgs.forEach(function(img) {
      if (img.complete && img.naturalWidth > 0) {
        loaded++;
        if (loaded === total) cb();
      } else {
        img.onload  = function() { loaded++; if (loaded === total) cb(); };
        img.onerror = function() { loaded++; if (loaded === total) cb(); };
      }
    });
  }

  waitForImages(function() {
    // Capturar texturas de todas as cenas
    var textures = [];
    for (var i = 0; i < sceneCount; i++) {
      textures.push(captureSceneTexture('scene-' + i));
    }

    // Ocultar cenas DOM (WebGL toma conta)
    document.querySelectorAll('.scene').forEach(function(s) {
      s.style.visibility = 'hidden';
    });
    glCanvas.style.display = 'block';

    // Renderizar cena 0 como estado inicial
    if (textures[0]) renderFrame(progPass, textures[0], textures[0], 0);

    // ─── GSAP Timeline principal ───
    var tl = gsap.timeline({ paused: true });

    // Barra de progresso
    tl.to('#progress-bar', { width: '100%', duration: TOTAL_DURATION, ease: 'none' }, 0);

    // Watermark fade-in
    ${showWatermark ? "tl.to('#watermark', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.5);" : ''}

    // Ken Burns: sincroniza CSS animation com o timeline GSAP
    var tKB = 0;
    SCENE_DURATIONS.forEach(function(dur, i) {
      (function(idx, start, d) {
        tl.add(function() {
          var img = document.getElementById('img-' + idx);
          if (img) {
            img.style.animationDuration = d + 's';
            img.style.animationPlayState = 'running';
            img.style.animationDelay = '0s';
          }
        }, start);
      })(i, tKB, dur);
      tKB += dur;
    });

    // Transições WebGL entre cenas + lógica de tempo de cada cena
    var sceneStart = 0;
    for (var i = 0; i < sceneCount; i++) {
      (function(idx, start, dur) {
        var nextIdx = idx + 1;
        var transStart = start + dur - TRANS_DUR;

        // Renderizar cena atual durante sua duração
        tl.add(gsap.to({p: 0}, {
          p: 1,
          duration: dur,
          ease: 'none',
          onUpdate: function() {
            var t = tl.time();
            if (t < transStart || nextIdx >= sceneCount) {
              // Exibir cena atual sem transição
              if (textures[idx]) renderFrame(progPass, textures[idx], textures[idx], 0);
            }
          }
        }), start);

        // Transição shader para a próxima cena
        if (nextIdx < sceneCount && textures[idx] && textures[nextIdx]) {
          var shaderProg = progTransitions[idx % progTransitions.length];
          tl.add(gsap.to({p: 0}, {
            p: 1,
            duration: TRANS_DUR,
            ease: 'none',
            onUpdate: function() {
              var raw = this.targets()[0].p;
              renderFrame(shaderProg, textures[idx], textures[nextIdx], easeInOut(raw));
            },
            onComplete: function() {
              if (textures[nextIdx]) renderFrame(progPass, textures[nextIdx], textures[nextIdx], 0);
            }
          }), transStart);
        }

      })(i, sceneStart, sceneDurations[i]);
      sceneStart += sceneDurations[i];
    }

    // Legendas word-by-word
    ${gsapCode}

    // Fade out final
    tl.to(glCanvas, { opacity: 0, duration: 0.5, ease: 'power2.in' }, TOTAL_DURATION - 0.5);

    window.__timelines = window.__timelines || {};
    window.__timelines['darktube-video'] = tl;
  });

  // ─── Fallback CSS (sem WebGL) ───
  function initFallback() {
    var tl = gsap.timeline({ paused: true });
    var t = 0;
    SCENE_DURATIONS.forEach(function(dur, i) {
      tl.set('#scene-' + i, { opacity: 0 }, t);
      tl.to('#scene-' + i, { opacity: 1, duration: 0.4, ease: 'power2.out' }, t);
      if (i < sceneCount - 1) {
        tl.to('#scene-' + i, { opacity: 0, duration: 0.4, ease: 'power2.in' }, t + dur - 0.4);
      }
      t += dur;
    });
    ${gsapCode}
    tl.to('#progress-bar', { width: '100%', duration: TOTAL_DURATION, ease: 'none' }, 0);
    window.__timelines = window.__timelines || {};
    window.__timelines['darktube-video'] = tl;
  }

})();
</script>

</body>
</html>`;
}

module.exports = { generateCompositionHTML };
