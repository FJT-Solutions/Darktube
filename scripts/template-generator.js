/**
 * HyperFrames Template Generator - High-Impact YouTube Shorts Aesthetic
 * Suporta: Ken Burns 3D, Zoom Punch, Captions com Highlight Box Neon, Overlay Cinematográfico
 */

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

  const totalDuration = scenes.reduce((acc, s) => acc + (s.durationSeconds || 5), 0);

  // ─── GERAR HTML DAS CENAS ───
  const scenesHTML = scenes.map((scene, i) => {
    const imageUrl = scene.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080';
    const captionText = scene.captionText || '';
    const words = captionText.split(' ').filter(Boolean);

    let captionHTML = '';
    if (captionStyle === 'pop' || captionStyle === 'karaoke') {
      const wordsHTML = words.map((word, wi) => `
        <span class="word-badge" id="w-${i}-${wi}">${word.replace(/</g, '&lt;')}</span>
      `).join('');
      captionHTML = `<div class="caption-container"><div class="caption-words">${wordsHTML}</div></div>`;
    } else {
      captionHTML = `
        <div class="caption-container">
          <div class="caption-line">${captionText.replace(/</g, '&lt;')}</div>
        </div>`;
    }

    return `
    <div class="scene" id="scene-${i}">
      <div class="bg-wrap" id="bg-${i}">
        <img src="${imageUrl}" alt="Cena ${i + 1}" />
        <div class="cinematic-vignette"></div>
      </div>
      ${captionHTML}
    </div>`;
  }).join('\n');

  // ─── GERAR TIMELINE GSAP ───
  const gsapTimeline = generateGSAPTimeline(scenes, captionStyle, primaryColor);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>DarkTube Video</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Inter:wght@700;800&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: #000000;
      font-family: 'Montserrat', sans-serif;
      user-select: none;
    }

    #composition {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      background: #050505;
      overflow: hidden;
    }

    /* ─── CENAS ─── */
    .scene {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      opacity: 0;
      will-change: opacity;
    }

    .bg-wrap {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      overflow: hidden;
    }

    .bg-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      filter: contrast(1.18) brightness(0.88) saturate(1.12);
      transform-origin: center center;
      will-change: transform;
    }

    /* Overlay Cinematográfico com Gradiente Escuro */
    .cinematic-vignette {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.85) 95%);
      pointer-events: none;
      z-index: 2;
    }

    /* ─── LEGENDAS VIRAL SHORTS ─── */
    .caption-container {
      position: absolute;
      bottom: ${format === 'vertical' ? '280px' : '140px'};
      left: 60px; right: 60px;
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
      align-items: center;
      gap: 16px 14px;
      max-width: 960px;
    }

    .word-badge {
      display: inline-block;
      font-size: ${format === 'vertical' ? '76px' : '58px'};
      font-weight: 900;
      line-height: 1.05;
      color: #FFFFFF;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 6px 16px;
      border-radius: 14px;
      opacity: 0;
      transform: scale(0.2) translateY(30px);
      -webkit-text-stroke: 4px #000000;
      paint-order: stroke fill;
      text-shadow: 0 8px 32px rgba(0,0,0,0.95);
      will-change: transform, opacity, background, color;
    }

    .word-badge.highlight {
      background: linear-gradient(135deg, ${primaryColor}, #CA8A04);
      color: #000000;
      -webkit-text-stroke: 0px transparent;
      box-shadow: 0 10px 40px rgba(234, 179, 8, 0.6), 0 0 20px ${primaryColor};
      transform: scale(1.15) rotate(-1.5deg);
    }

    .caption-line {
      font-size: ${format === 'vertical' ? '64px' : '48px'};
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1.2;
      text-transform: uppercase;
      -webkit-text-stroke: 3px #000000;
      paint-order: stroke fill;
      text-shadow: 0 8px 24px rgba(0,0,0,0.95);
      opacity: 0;
      will-change: opacity, transform;
    }

    /* ─── WATERMARK ─── */
    .watermark {
      position: absolute;
      top: ${format === 'vertical' ? '56px' : '40px'};
      right: 48px;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 100px;
      padding: 12px 26px;
      opacity: 0;
    }

    .watermark-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${primaryColor};
      box-shadow: 0 0 12px ${primaryColor};
    }

    .watermark-text {
      font-size: 26px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.95);
      letter-spacing: 1px;
    }

    /* ─── BARRA DE PROGRESSO ─── */
    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 6px;
      width: 0%;
      background: linear-gradient(90deg, ${primaryColor}, #FFFFFF);
      z-index: 20;
      opacity: 0.85;
      box-shadow: 0 0 10px ${primaryColor};
      will-change: width;
    }
  </style>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body>

<div id="composition" data-composition-id="darktube-video"
     data-width="${width}" data-height="${height}">

  ${scenesHTML}

  ${showWatermark ? `
  <div class="watermark" id="watermark">
    <div class="watermark-dot"></div>
    <span class="watermark-text">${watermarkText.replace(/</g, '&lt;')}</span>
  </div>` : ''}

  <div class="progress-bar" id="progress-bar"></div>
</div>

<script>
  const tl = gsap.timeline({ paused: true });

  ${showWatermark ? `
  tl.to('#watermark', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.5);
  ` : ''}

  tl.to('#progress-bar', { width: '100%', duration: ${totalDuration}, ease: 'none' }, 0);

  // ─── TIMELINE DAS CENAS ───
  ${gsapTimeline}

  window.__timelines = window.__timelines || {};
  window.__timelines['darktube-video'] = tl;
</script>

</body>
</html>`;
}

function generateGSAPTimeline(scenes, captionStyle, primaryColor) {
  let gsapCode = '';
  let currentTime = 0;

  const animStyles = ['kenburns-right', 'kenburns-left', 'zoom-punch', 'parallax-up', 'zoom-out'];

  scenes.forEach((scene, i) => {
    const start = currentTime;
    const duration = scene.durationSeconds || 5;
    const end = start + duration;
    const style = scene.animationStyle || animStyles[i % animStyles.length];

    // Animações de alto impacto cinematográfico
    const imgAnimations = {
      'kenburns-right': {
        from: 'scale: 1.0, xPercent: -2, yPercent: 0, rotationZ: 0',
        to: `scale: 1.32, xPercent: 6, yPercent: -3, rotationZ: 1.5, duration: ${duration}, ease: 'none'`,
      },
      'kenburns-left': {
        from: 'scale: 1.0, xPercent: 2, yPercent: 0, rotationZ: 0',
        to: `scale: 1.32, xPercent: -6, yPercent: 3, rotationZ: -1.5, duration: ${duration}, ease: 'none'`,
      },
      'zoom-punch': {
        from: 'scale: 1.45, rotationZ: -2',
        to: `scale: 1.08, rotationZ: 0, duration: ${Math.min(duration, 0.9)}, ease: 'power3.out'`,
      },
      'parallax-up': {
        from: 'scale: 1.3, yPercent: 8, rotationZ: 0',
        to: `scale: 1.08, yPercent: -6, duration: ${duration}, ease: 'none'`,
      },
      'zoom-out': {
        from: 'scale: 1.38, rotationZ: 1',
        to: `scale: 1.0, rotationZ: 0, duration: ${duration}, ease: 'none'`,
      },
    };

    const imgAnim = imgAnimations[style] || imgAnimations['kenburns-right'];

    gsapCode += `
  // ── Cena ${i + 1} [${start.toFixed(2)}s → ${end.toFixed(2)}s] (${style}) ──
  tl.set('#scene-${i}', { opacity: 0 }, ${start});
  tl.to('#scene-${i}', { opacity: 1, duration: 0.35, ease: 'power2.out' }, ${start});`;

    if (scene.imageUrl) {
      gsapCode += `
  tl.fromTo('#bg-${i} img', { ${imgAnim.from} }, { ${imgAnim.to} }, ${start});`;
    }

    // Legendas em estilo Viral Short (pop palavra por palavra)
    const words = (scene.captionText || '').split(' ').filter(Boolean);
    const timePerWord = duration / (words.length || 1);

    if (captionStyle === 'pop' || captionStyle === 'karaoke') {
      words.forEach((_, wi) => {
        const wordStart = start + wi * timePerWord;
        const wordEnd = wordStart + timePerWord;
        const isKey = wi % 3 === 1 || wi === 0;

        if (isKey) {
          gsapCode += `
  tl.to('#w-${i}-${wi}', { opacity: 1, scale: 1.15, y: 0, className: 'word-badge highlight', duration: 0.16, ease: 'back.out(2.5)' }, ${wordStart.toFixed(3)});
  tl.to('#w-${i}-${wi}', { opacity: 0, scale: 0.7, duration: 0.12, ease: 'power2.in' }, ${Math.max(wordEnd - 0.1, wordStart + 0.05).toFixed(3)});`;
        } else {
          gsapCode += `
  tl.to('#w-${i}-${wi}', { opacity: 1, scale: 1.0, y: 0, duration: 0.14, ease: 'back.out(2)' }, ${wordStart.toFixed(3)});
  tl.to('#w-${i}-${wi}', { opacity: 0, scale: 0.7, duration: 0.12, ease: 'power2.in' }, ${Math.max(wordEnd - 0.1, wordStart + 0.05).toFixed(3)});`;
        }
      });
    } else {
      gsapCode += `
  tl.to('#scene-${i} .caption-line', { opacity: 1, duration: 0.3, ease: 'power2.out' }, ${(start + 0.2).toFixed(3)});
  tl.to('#scene-${i} .caption-line', { opacity: 0, duration: 0.3, ease: 'power2.in' }, ${(end - 0.3).toFixed(3)});`;
    }

    if (i < scenes.length - 1) {
      gsapCode += `
  tl.to('#scene-${i}', { opacity: 0, duration: 0.35, ease: 'power2.inOut' }, ${(end - 0.35).toFixed(3)});`;
    }

    currentTime += duration;
  });

  if (scenes.length > 0) {
    gsapCode += `
  tl.to('#composition', { opacity: 0, duration: 0.5, ease: 'power2.in' }, ${(currentTime - 0.5).toFixed(3)});`;
  }

  return gsapCode;
}

module.exports = { generateCompositionHTML };
