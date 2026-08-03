/**
 * Hyperframes Cinematic Composition Generator
 * Gera HTML dinâmico a partir do payload do Darktube
 * Usa GSAP + CSS avançado para efeitos cinematográficos
 */

/**
 * @param {object} payload
 * @param {Array}  payload.scenes            - Lista de cenas do script
 * @param {string} payload.format            - 'vertical' (1080x1920) | 'horizontal' (1920x1080)
 * @param {string} payload.primaryColor      - Cor principal das legendas
 * @param {string} payload.accentColor       - Cor de destaque
 * @param {string} payload.captionStyle      - 'pop' | 'karaoke' | 'subtitle'
 * @param {string} payload.watermarkText     - Texto do watermark
 * @param {boolean} payload.showWatermark    - Exibir watermark
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

      <!-- Imagem de fundo -->
      <div class="scene-bg" id="bg-${i}">
        ${scene.imageUrl
          ? `<img src="${scene.imageUrl}" alt="Scene ${i + 1}" loading="eager" />`
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

  // Gerar GSAP timeline
  const gsapTimeline = generateGSAPTimeline(scenes, captionStyle);

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

</div>

<script>
  // ─── GSAP TIMELINE PRINCIPAL ───
  const tl = gsap.timeline({ paused: true });

  // Barras cinematográficas de entrada
  tl.to(['#bars-top', '#bars-bottom'], {
    y: 0,
    duration: 0.001,
  }, 0);
  tl.to(['#bars-top', '#bars-bottom'], {
    y: '100%',
    duration: 0.6,
    ease: 'power2.inOut',
    stagger: 0,
  }, 0.1);

  ${showWatermark ? `
  // Watermark
  tl.to('#watermark', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.8);
  ` : ''}

  // Barra de progresso
  tl.to('#progress-bar', {
    opacity: 0.7,
    duration: 0.3
  }, 0.5);
  tl.to('#progress-bar', {
    width: '100%',
    duration: ${totalDuration},
    ease: 'none'
  }, 0);

  // ─── ANIMAÇÕES DAS CENAS ───
  ${gsapTimeline}

  // Registrar timeline
  window.__timelines = window.__timelines || {};
  window.__timelines['darktube-video'] = tl;
</script>

</body>
</html>`;
}

/**
 * Gera o código GSAP para animar todas as cenas
 */
function generateGSAPTimeline(scenes, captionStyle) {
  let gsapCode = '';
  let currentTime = 0;

  const animStyles = ['kenburns-right', 'kenburns-left', 'zoom-punch', 'parallax-up', 'zoom-out'];

  scenes.forEach((scene, i) => {
    const start    = currentTime;
    const duration = scene.durationSeconds || 5;
    const end      = start + duration;
    const style    = scene.animationStyle || animStyles[i % animStyles.length];
    const transIn  = scene.transitionIn || 'fade';

    // Configurar zoom/pan da imagem baseado no estilo
    const imgAnimations = {
      'kenburns-right': {
        from: 'scale: 1, xPercent: 0',
        to:   `scale: 1.12, xPercent: 3, duration: ${duration}, ease: 'none'`,
      },
      'kenburns-left': {
        from: 'scale: 1, xPercent: 0',
        to:   `scale: 1.12, xPercent: -3, duration: ${duration}, ease: 'none'`,
      },
      'zoom-punch': {
        from: 'scale: 1.15',
        to:   `scale: 1.0, duration: ${Math.min(duration, 0.8)}, ease: 'power3.out'`,
      },
      'parallax-up': {
        from: 'scale: 1.15, yPercent: 3',
        to:   `yPercent: -3, scale: 1.08, duration: ${duration}, ease: 'none'`,
      },
      'zoom-out': {
        from: 'scale: 1.18',
        to:   `scale: 1.0, duration: ${duration}, ease: 'none'`,
      },
    };

    const imgAnim = imgAnimations[style] || imgAnimations['kenburns-right'];

    // Fade de entrada da cena
    const fadeInDuration = transIn === 'fade' ? 0.45 : 0.25;

    gsapCode += `
  // ── Cena ${i + 1} [${start.toFixed(2)}s → ${end.toFixed(2)}s] (${style}) ──
  tl.set('#scene-${i}', { opacity: 0 }, ${start});
  tl.to('#scene-${i}', { opacity: 1, duration: ${fadeInDuration}, ease: 'power2.out' }, ${start});`;

    // Animação da imagem
    if (scene.imageUrl) {
      gsapCode += `
  tl.fromTo('#bg-${i} img', { ${imgAnim.from} }, { ${imgAnim.to} }, ${start});`;
    }

    // Legendas baseadas no estilo
    if (captionStyle === 'pop') {
      const words = (scene.captionText || '').split(' ').filter(Boolean);
      const timePerWord = duration / (words.length || 1);

      words.forEach((_, wi) => {
        const wordStart = start + wi * timePerWord;
        const wordEnd   = wordStart + timePerWord;
        gsapCode += `
  tl.to('#w-${i}-${wi}', { opacity: 1, scale: 1, y: 0, duration: 0.18, ease: 'back.out(2)' }, ${wordStart.toFixed(3)});
  tl.to('#w-${i}-${wi}', { opacity: 0, scale: 0.8, duration: 0.12, ease: 'power2.in' }, ${Math.max(wordEnd - 0.12, wordStart + 0.06).toFixed(3)});`;
      });

    } else if (captionStyle === 'karaoke') {
      const words = (scene.captionText || '').split(' ').filter(Boolean);
      const timePerWord = duration / (words.length || 1);

      // Mostrar todas as palavras e destacar a atual
      gsapCode += `
  tl.to('#scene-${i} .caption-words .word', { opacity: 0.35, scale: 0.95, y: 0, duration: 0.2 }, ${(start + 0.1).toFixed(3)});`;
      words.forEach((_, wi) => {
        const wordStart = start + wi * timePerWord;
        const wordEnd   = wordStart + timePerWord;
        gsapCode += `
  tl.to('#w-${i}-${wi}', { opacity: 1, scale: 1.08, color: '${scene.primaryColor || '#EAB308'}', duration: 0.12, ease: 'power2.out' }, ${wordStart.toFixed(3)});
  tl.to('#w-${i}-${wi}', { scale: 1, color: '#ffffff', duration: 0.15 }, ${(wordEnd - 0.15).toFixed(3)});`;
      });

    } else {
      // subtitle — aparece a cena toda
      gsapCode += `
  tl.to('#scene-${i} .caption-line', { opacity: 1, duration: 0.4, ease: 'power2.out' }, ${(start + 0.3).toFixed(3)});
  tl.to('#scene-${i} .caption-line', { opacity: 0, duration: 0.3, ease: 'power2.in' }, ${(end - 0.4).toFixed(3)});`;
    }

    // Fade de saída da cena (exceto última)
    if (i < scenes.length - 1) {
      gsapCode += `
  tl.to('#scene-${i}', { opacity: 0, duration: 0.4, ease: 'power2.inOut' }, ${(end - 0.4).toFixed(3)});`;
    }

    currentTime += duration;
  });

  // Fade out final
  if (scenes.length > 0) {
    gsapCode += `
  // Fade out final
  tl.to('#composition', { opacity: 0, duration: 0.6, ease: 'power2.in' }, ${(currentTime - 0.6).toFixed(3)});`;
  }

  return gsapCode;
}

module.exports = { generateCompositionHTML };
