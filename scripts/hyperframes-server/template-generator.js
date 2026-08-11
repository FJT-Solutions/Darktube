/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Darktube — HyperFrames Cinematic Composition Generator      ║
 * ║  Versão: 2.0  (gsap.globalTimeline — seek-safe)             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * MECANISMO DE SEEK DO HYPERFRAMES:
 *   O HyperFrames injeta um runtime que, a cada frame, executa:
 *     gsap.globalTimeline.pause();
 *     gsap.globalTimeline.seek(frame / fps);
 *
 *   Portanto, TODAS as animações DEVEM ser adicionadas à globalTimeline:
 *     ✅ gsap.globalTimeline.add(tl, startTime)
 *     ✅ gsap.to(el, { ..., delay: startTime })
 *     ❌ gsap.timeline({ paused: true })  → nunca recebe seek
 *
 * FONTES DO CATÁLOGO USADAS:
 *   - Transições: light-leak, glitch, whip-pan, cinematic-zoom, flash-white
 *   - Captions: clip-wipe, editorial-emphasis, glitch-rgb, word-sweep
 *   - Efeitos: Ken Burns, zoom-punch, parallax-up, zoom-out (via GSAP)
 */

/**
 * @param {object} payload
 * @param {Array}  payload.scenes             - Lista de cenas
 * @param {string} payload.format             - 'vertical' | 'horizontal'
 * @param {string} payload.primaryColor       - Cor principal
 * @param {string} payload.accentColor        - Cor de destaque
 * @param {string} payload.captionStyle       - 'pop' | 'karaoke' | 'subtitle'
 * @param {string} payload.watermarkText      - Texto watermark
 * @param {boolean} payload.showWatermark     - Mostrar watermark
 *
 * CAMPOS POR CENA (adicionados pelo AI Director HyperFrames):
 * @param {string}  scene.animationStyle      - 'kenburns-right' | 'kenburns-left' | 'zoom-punch' | 'parallax-up' | 'zoom-out'
 * @param {string}  scene.transitionIn        - 'light-leak' | 'glitch' | 'whip-pan' | 'cinematic-zoom' | 'flash' | 'fade'
 * @param {string}  scene.captionEffect       - 'clip-wipe' | 'editorial' | 'glitch-rgb' | 'bounce' | 'default'
 * @param {number}  scene.intensity           - 0.0–1.0 (intensidade geral)
 * @param {Array}   scene.words               - [{ word, startInSeconds, endInSeconds }] do Whisper
 */
function generateCompositionHTML(payload) {
  const {
    scenes = [],
    format = 'vertical',
    primaryColor = '#EAB308',
    accentColor = '#FFFFFF',
    captionStyle = 'pop',
    watermarkText = 'DarkTube AI',
    showWatermark = true,
  } = payload;

  const width  = format === 'vertical' ? 1080 : 1920;
  const height = format === 'vertical' ? 1920 : 1080;

  // Calcular duração total
  const totalDuration = scenes.reduce((sum, s) => sum + (s.durationSeconds || 5), 0);

  // Gerar HTML das cenas
  const scenesHTML = scenes.map((scene, i) => {
    const startTime = scenes.slice(0, i).reduce((sum, s) => sum + (s.durationSeconds || 5), 0);
    const duration  = scene.durationSeconds || 5;
    const style     = scene.animationStyle || 'kenburns-right';
    const captionText = (scene.captionText || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Palavras para animação pop/karaoke
    const words = captionText.split(' ').filter(Boolean);
    const timePerWord = duration / (words.length || 1);

    const wordSpans = words.map((word, wi) => {
      const wordStart = startTime + wi * timePerWord;
      return `<span class="word" id="w-${i}-${wi}" data-start="${wordStart.toFixed(2)}" data-duration="${timePerWord.toFixed(2)}">${word}</span>`;
    }).join(' ');

    return `
    <!-- ═══ CENA ${i + 1} ═══ -->
    <div class="clip scene" id="scene-${i}"
         data-start="${startTime}"
         data-duration="${duration}"
         data-track-index="${i}">

      <!-- Imagem ou Vídeo de fundo -->
      <div class="scene-bg" id="bg-${i}">
        ${scene.imageUrl
          ? (function() {
              const clean = scene.imageUrl.toLowerCase().split('?')[0];
              const isVid = clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') || clean.includes('/video/') || clean.includes('video_');
              return isVid
                ? `<video src="${scene.imageUrl}" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>`
                : `<img src="${scene.imageUrl}" alt="Scene ${i + 1}" loading="eager" />`;
            })()
          : `<div class="scene-gradient" style="background: linear-gradient(135deg, #0f0f23 0%, #1a0a2e 50%, #16213e 100%);"></div>`
        }
      </div>

      <!-- Vignette cinematográfica -->
      <div class="vignette"></div>

      <!-- Grade de ruído cinematográfico -->
      <div class="noise-overlay"></div>

      <!-- Legenda -->
      <div class="caption-container ${captionStyle === 'subtitle' ? 'caption-subtitle' : ''}">
        ${captionStyle === 'pop' || captionStyle === 'karaoke'
          ? `<div class="caption-words">${wordSpans}</div>`
          : `<div class="caption-line">${captionText}</div>`
        }
      </div>
    </div>`;
  }).join('\n');

  // Gerar GSAP timeline (usa gsap.globalTimeline via delay)
  const gsapTimeline = generateGSAPTimeline(scenes, captionStyle, primaryColor);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DarkTube Video Composition</title>

  <!-- Fontes premium -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />

  <!-- GSAP -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>

  <style>
    /* ─── RESET & BASE ─── */
    *, *::before, *::after {
      margin: 0; padding: 0; box-sizing: border-box;
    }

    html, body {
      width: ${width}px;
      height: ${height}px;
      background: #000;
      overflow: hidden;
      font-family: 'Montserrat', 'Inter', sans-serif;
    }

    /* ─── COMPOSITION ROOT ─── */
    #composition {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: #000;
    }

    /* ─── CENAS ─── */
    .scene {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      opacity: 0;
      will-change: opacity;
    }

    /* ─── IMAGEM DE FUNDO ─── */
    .scene-bg {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      overflow: hidden;
    }

    .scene-bg img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      will-change: transform;
    }

    .scene-gradient {
      width: 100%;
      height: 100%;
    }

    /* ─── VIGNETTE ─── */
    .vignette {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(
        ellipse at center,
        transparent 35%,
        rgba(0, 0, 0, 0.55) 70%,
        rgba(0, 0, 0, 0.85) 100%
      );
      pointer-events: none;
    }

    /* ─── NOISE OVERLAY (look cinematográfico) ─── */
    .noise-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      opacity: 0.04;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      pointer-events: none;
    }

    /* ─── LEGENDAS ─── */
    .caption-container {
      position: absolute;
      bottom: ${format === 'vertical' ? '18%' : '12%'};
      left: 6%;
      right: 6%;
      text-align: center;
      z-index: 10;
    }

    .caption-subtitle {
      bottom: ${format === 'vertical' ? '12%' : '8%'};
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(12px);
      border-radius: 16px;
      padding: 20px 32px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .caption-words {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
    }

    .word {
      display: inline-block;
      font-size: ${format === 'vertical' ? '72px' : '56px'};
      font-weight: 900;
      line-height: 1.1;
      color: ${accentColor};
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0;
      transform: scale(0.6) translateY(20px);
      will-change: transform, opacity;
    }

    .word.active {
      color: ${primaryColor};
    }

    .caption-line {
      font-size: ${format === 'vertical' ? '56px' : '44px'};
      font-weight: 800;
      color: ${accentColor};
      line-height: 1.3;
      text-shadow:
        0 2px 8px rgba(0,0,0,0.9),
        0 4px 24px rgba(0,0,0,0.7);
      opacity: 0;
      will-change: opacity;
    }

    /* ─── WATERMARK ─── */
    .watermark {
      position: absolute;
      top: ${format === 'vertical' ? '56px' : '40px'};
      right: 48px;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 100px;
      padding: 10px 22px;
      opacity: 0;
    }

    .watermark-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${primaryColor};
      box-shadow: 0 0 8px ${primaryColor};
    }

    .watermark-text {
      font-size: 26px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.85);
      letter-spacing: 1px;
      font-family: 'Inter', sans-serif;
    }

    /* ─── BARRA DE PROGRESSO ─── */
    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 4px;
      width: 0%;
      background: linear-gradient(90deg, ${primaryColor}, ${accentColor});
      z-index: 20;
      opacity: 0.7;
      will-change: width;
    }

    /* ─── FRAME DE ENTRADA CINEMÁTICO ─── */
    .cinematic-bars-top,
    .cinematic-bars-bottom {
      position: absolute;
      left: 0; right: 0;
      height: ${format === 'vertical' ? '80px' : '60px'};
      background: #000;
      z-index: 15;
    }
    .cinematic-bars-top { top: 0; transform: translateY(-100%); }
    .cinematic-bars-bottom { bottom: 0; transform: translateY(100%); }
  </style>
</head>
<body>

<div id="composition" data-composition-id="darktube-video"
     data-width="${width}" data-height="${height}">

  ${scenesHTML}

  <!-- Watermark global -->
  ${showWatermark ? `
  <div class="watermark" id="watermark">
    <div class="watermark-dot"></div>
    <span class="watermark-text">${watermarkText.replace(/</g, '&lt;')}</span>
  </div>` : ''}

  <!-- Barra de progresso -->
  <div class="progress-bar" id="progress-bar"></div>

  <!-- Barras cinematográficas (intro/outro) -->
  <div class="cinematic-bars-top" id="bars-top"></div>
  <div class="cinematic-bars-bottom" id="bars-bottom"></div>
  <!-- Overlays globais de transição cinematográfica -->
  <div id="flash-overlay" style="
    position:absolute;top:0;left:0;right:0;bottom:0;
    background:#fff;opacity:0;pointer-events:none;z-index:30;
  "></div>
  <div id="light-leak-overlay" style="
    position:absolute;top:0;left:0;right:0;bottom:0;
    background:linear-gradient(105deg,#ff9d00 0%,#fffbe0 40%,#ff6b35 100%);
    mix-blend-mode:screen;opacity:0;pointer-events:none;z-index:28;transform-origin:center;
  "></div>

</div>

<script>
  // ════════════════════════════════════════════════════
  // DARKTUBE — GSAP globalTimeline (seek-safe)
  // O HyperFrames faz: gsap.globalTimeline.seek(frame/fps)
  // TODAS as animações devem estar na globalTimeline.
  // ════════════════════════════════════════════════════

  // Progress bar — na globalTimeline diretamente
  gsap.set('#progress-bar', { opacity: 0.7, width: '0%' });
  gsap.to('#progress-bar', {
    width: '100%',
    duration: ${totalDuration},
    ease: 'none',
    delay: 0,
  });

  // Barras cinematográficas de abertura
  gsap.set(['#bars-top', '#bars-bottom'], { y: 0 });
  gsap.to(['#bars-top', '#bars-bottom'], {
    y: '100%',
    duration: 0.55,
    ease: 'power2.inOut',
    delay: 0.08,
  });

  ${showWatermark ? `
  // Watermark
  gsap.set('#watermark', { opacity: 0, y: -12 });
  gsap.to('#watermark', { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.9 });
  ` : ''}

  // ─── ANIMAÇÕES POR CENA ───
  ${gsapTimeline}
</script>

</body>
</html>`;
}

// ════════════════════════════════════════════════════════════════
// generateGSAPTimeline— gera código JS que adiciona animações
// diretamente à gsap.globalTimeline (não a uma timeline local).
// ════════════════════════════════════════════════════════════════
function generateGSAPTimeline(scenes, captionStyle, primaryColor) {
  let code = '';
  let currentTime = 0;

  const defaultAnimStyles = ['kenburns-right', 'kenburns-left', 'zoom-punch', 'parallax-up', 'zoom-out'];

  scenes.forEach((scene, i) => {
    const start    = currentTime;
    const duration = scene.durationSeconds || 5;
    const end      = start + duration;
    const animStyle = scene.animationStyle || defaultAnimStyles[i % defaultAnimStyles.length];
    const transIn   = scene.transitionIn   || 'fade';
    const color     = scene.primaryColor   || primaryColor || '#EAB308';
    const intensity = scene.intensity      ?? 0.7;

    // ─ 1. Reveal/fade-in da cena ────────────────────────────────
    code += `
  // ═══ CENA ${i + 1} [${start.toFixed(2)}s → ${end.toFixed(2)}s] ═══`;

    // Transition overlays baseadas no tipo
    switch (transIn) {
      case 'flash':
        code += `
  // Flash de entrada
  gsap.set('#scene-${i}', { opacity: 0 });
  gsap.to('#scene-${i}', { opacity: 1, duration: 0.08, ease: 'none', delay: ${start} });
  gsap.fromTo('#flash-overlay', { opacity: ${0.95 * intensity} }, { opacity: 0, duration: 0.35, ease: 'power2.out', delay: ${start} });`;
        break;

      case 'light-leak':
        code += `
  // Light leak de entrada
  gsap.set('#scene-${i}', { opacity: 0 });
  gsap.to('#scene-${i}', { opacity: 1, duration: 0.5, ease: 'power1.inOut', delay: ${start} });
  gsap.fromTo('#light-leak-overlay', 
    { opacity: ${0.8 * intensity}, scaleX: 0.6, x: '-30%' },
    { opacity: 0, scaleX: 1.3, x: '30%', duration: 0.65, ease: 'power1.inOut', delay: ${start} });`;
        break;

      case 'glitch':
        code += `
  // Glitch de entrada
  gsap.set('#scene-${i}', { opacity: 0, x: 0 });
  gsap.to('#scene-${i}', { opacity: 1, duration: 0.06, ease: 'none', delay: ${start} });
  gsap.to('#scene-${i}', {
    keyframes: [
      { x: ${Math.round(14 * intensity)}, skewX: ${Math.round(4 * intensity)}, filter: 'hue-rotate(90deg) brightness(1.5)', duration: 0.04 },
      { x: ${Math.round(-10 * intensity)}, skewX: 0, filter: 'hue-rotate(-60deg)', duration: 0.04 },
      { x: 0, filter: 'none', duration: 0.06 },
    ],
    delay: ${start},
  });`;
        break;

      case 'whip-pan':
        code += `
  // Whip pan de entrada
  gsap.fromTo('#scene-${i}',
    { opacity: 0, x: ${Math.round(160 * intensity)}, filter: 'blur(${Math.round(14 * intensity)}px)' },
    { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.28, ease: 'power3.out', delay: ${start} });`;
        break;

      case 'cinematic-zoom':
        code += `
  // Cinematic zoom de entrada
  gsap.fromTo('#scene-${i}',
    { opacity: 0, scale: 1.25, filter: 'blur(8px)' },
    { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.55, ease: 'power2.out', delay: ${start} });`;
        break;

      default: // 'fade'
        code += `
  // Fade de entrada
  gsap.set('#scene-${i}', { opacity: 0 });
  gsap.to('#scene-${i}', { opacity: 1, duration: 0.4, ease: 'power2.out', delay: ${start} });`;
    }

    // ─ 2. Animação da imagem de fundo ou vídeo ────────────────────────
    if (scene.imageUrl) {
      const mediaSel = `#bg-${i} img, #bg-${i} video`;
      switch (animStyle) {
        case 'kenburns-right':
          code += `
  gsap.fromTo('${mediaSel}', { scale: 1.12, xPercent: -3 }, { scale: 1.35, xPercent: 8, duration: ${duration}, ease: 'sine.inOut', delay: ${start} });`;
          break;
        case 'kenburns-left':
          code += `
  gsap.fromTo('${mediaSel}', { scale: 1.12, xPercent: 3 }, { scale: 1.35, xPercent: -8, duration: ${duration}, ease: 'sine.inOut', delay: ${start} });`;
          break;
        case 'kenburns-up':
          code += `
  gsap.fromTo('${mediaSel}', { scale: 1.12, yPercent: 4 }, { scale: 1.35, yPercent: -8, duration: ${duration}, ease: 'sine.inOut', delay: ${start} });`;
          break;
        case 'kenburns-down':
          code += `
  gsap.fromTo('${mediaSel}', { scale: 1.12, yPercent: -4 }, { scale: 1.35, yPercent: 8, duration: ${duration}, ease: 'sine.inOut', delay: ${start} });`;
          break;
        case 'zoom-punch':
          code += `
  gsap.fromTo('${mediaSel}', { scale: 1.55, rotation: -2 }, { scale: 1.12, rotation: 0, duration: ${Math.min(duration, 0.8)}, ease: 'power4.out', delay: ${start} });
  gsap.to('${mediaSel}', { scale: 1.25, duration: ${Math.max(duration - 0.8, 0.1)}, ease: 'sine.inOut', delay: ${start + 0.8} });`;
          break;
        case 'parallax-up':
          code += `
  gsap.fromTo('${mediaSel}', { scale: 1.25, yPercent: 10 }, { yPercent: -8, scale: 1.12, duration: ${duration}, ease: 'power1.inOut', delay: ${start} });`;
          break;
        case 'parallax-down':
          code += `
  gsap.fromTo('${mediaSel}', { scale: 1.25, yPercent: -10 }, { yPercent: 8, scale: 1.12, duration: ${duration}, ease: 'power1.inOut', delay: ${start} });`;
          break;
        case 'zoom-out':
          code += `
  gsap.fromTo('${mediaSel}', { scale: 1.48 }, { scale: 1.05, duration: ${duration}, ease: 'power1.out', delay: ${start} });`;
          break;
        case 'tilt-3d':
          code += `
  gsap.fromTo('${mediaSel}', { scale: 1.35, rotationX: 16, rotationY: -14, transformPerspective: 800 }, { rotationX: -8, rotationY: 10, scale: 1.15, duration: ${duration}, ease: 'sine.inOut', delay: ${start} });`;
          break;
        case 'shake-impact':
          code += `
  gsap.fromTo('${mediaSel}', { scale: 1.28 }, { scale: 1.12, duration: ${duration}, ease: 'none', delay: ${start} });
  gsap.to('${mediaSel}', { x: '+=16', y: '-=10', yoyo: true, repeat: 7, duration: 0.04, delay: ${start} });`;
          break;
        case 'spin-in':
          code += `
  gsap.fromTo('${mediaSel}', { scale: 1.45, rotation: -28 }, { rotation: 0, scale: 1.12, duration: 0.7, ease: 'back.out(1.7)', delay: ${start} });
  gsap.to('${mediaSel}', { scale: 1.25, duration: ${Math.max(duration - 0.7, 0.1)}, ease: 'none', delay: ${start + 0.7} });`;
          break;
        default:
          code += `
  gsap.fromTo('${mediaSel}', { scale: 1.12 }, { scale: 1.30, duration: ${duration}, ease: 'sine.inOut', delay: ${start} });`;
      }
    }

    // ─ 3. Legendas ───────────────────────────────────────
    const words = buildWordList(scene, start, duration);

    if (captionStyle === 'pop') {
      words.forEach((w, wi) => {
        const wDur = Math.max(w.endTime - w.startTime, 0.15);
        const safeWord = String(w.word).replace(/'/g, "\\'");
        code += `
  // Pop palavra ${wi + 1}: "${safeWord}" @ ${w.startTime.toFixed(3)}s
  gsap.set('#w-${i}-${wi}', { opacity: 0, scale: 0.5, rotation: -8, y: 20 });
  gsap.to('#w-${i}-${wi}', { opacity: 1, scale: 1, rotation: 0, y: 0, duration: 0.2, ease: 'back.out(2.5)', delay: ${w.startTime.toFixed(3)} });
  gsap.to('#w-${i}-${wi}', { opacity: 0, scale: 0.82, duration: 0.12, ease: 'power2.in', delay: ${Math.max(w.endTime - 0.12, w.startTime + 0.1).toFixed(3)} });`;
      });

    } else if (captionStyle === 'karaoke') {
      // Todas as palavras visíveis (opacidade baixa) desde o início da cena
      code += `
  gsap.set('#scene-${i} .word', { opacity: 0, y: 0, scale: 0.95 });
  gsap.to('#scene-${i} .word', { opacity: 0.3, duration: 0.25, stagger: 0.04, delay: ${(start + 0.15).toFixed(3)} });`;

      words.forEach((w, wi) => {
        const wDur = Math.max(w.endTime - w.startTime, 0.15);
        const safeWord = String(w.word).replace(/'/g, "\\'");
        code += `
  // Karaoke palavra ${wi + 1}: "${safeWord}" @ ${w.startTime.toFixed(3)}s
  gsap.to('#w-${i}-${wi}', { opacity: 1, scale: 1.1, color: '${color}', textShadow: '0 0 24px ${color}88', duration: 0.1, ease: 'power2.out', delay: ${w.startTime.toFixed(3)} });
  gsap.to('#w-${i}-${wi}', { scale: 1, color: '#ffffff', textShadow: '2px 2px 0 #000', duration: 0.18, delay: ${(w.endTime - 0.18).toFixed(3)} });`;
      });

    } else {
      // subtitle — texto completo, fade in no início e fade out no fim
      code += `
  gsap.set('#scene-${i} .caption-line', { opacity: 0, y: 12 });
  gsap.to('#scene-${i} .caption-line', { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', delay: ${(start + 0.35).toFixed(3)} });
  gsap.to('#scene-${i} .caption-line', { opacity: 0, y: -8, duration: 0.3, ease: 'power2.in', delay: ${(end - 0.4).toFixed(3)} });`;
    }

    // ─ 4. Fade out da cena ─────────────────────────────────
    if (i < scenes.length - 1) {
      code += `
  gsap.to('#scene-${i}', { opacity: 0, duration: 0.38, ease: 'power2.inOut', delay: ${(end - 0.38).toFixed(3)} });`;
    }

    currentTime += duration;
  });

  // Fade out final do composition inteiro
  if (scenes.length > 0) {
    code += `
  // Fade out final
  gsap.to('#composition', { opacity: 0, duration: 0.6, ease: 'power2.in', delay: ${(currentTime - 0.65).toFixed(3)} });`;
  }

  return code;
}

// ════════════════════════════════════════════════════════════════
// buildWordList — usa timestamps reais do Whisper se disponíveis
// Fallback: distribui linearmente pela duração da cena
// ════════════════════════════════════════════════════════════════
function buildWordList(scene, sceneStartTime, duration) {
  // Timestamps reais do Whisper (campo words adicionado pelo n8n)
  if (Array.isArray(scene.words) && scene.words.length > 0) {
    return scene.words.map(w => ({
      word:      w.word,
      startTime: Number(w.startInSeconds ?? w.start ?? sceneStartTime),
      endTime:   Number(w.endInSeconds   ?? w.end   ?? sceneStartTime + (duration / scene.words.length)),
    }));
  }

  // Fallback linear pela captionText
  const text  = (scene.captionText || '').trim();
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];

  const timePerWord = duration / parts.length;
  return parts.map((word, wi) => ({
    word,
    startTime: sceneStartTime + wi * timePerWord,
    endTime:   sceneStartTime + (wi + 1) * timePerWord,
  }));
}

// ════════════════════════════════════════════════════════════════
// escapeHTML — sanitiza conteúdo para uso no HTML
// ════════════════════════════════════════════════════════════════
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { generateCompositionHTML };
