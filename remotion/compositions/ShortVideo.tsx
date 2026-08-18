import React from 'react';
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  TransitionSeries,
  springTiming,
  linearTiming,
} from '@remotion/transitions';
import { fade }  from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe }  from '@remotion/transitions/wipe';
import { flip }  from '@remotion/transitions/flip';
import { RemotionShortProps, SceneSegment, TransitionStyle, SpringPreset } from '../types';
import { SplitBounceText, TypewriterText, GlitchText, EditorialText, KineticPopText } from './TextSplit';
import { GlitchOverlay, LightLeakOverlay, FlashOverlay, ParticlesOverlay, ColorGradingLayer, GRADING_FILTERS } from './GlitchOverlay';
import { FinancialCounterOverlay, CodeTerminalOverlay } from './MotionGraphicsOverlay';
import { AnimatedLineChart, AnimatedBarChart, AnimatedMapRoute, DocumentaryLowerThird } from './Infographics';

import { LivingBackground } from './LivingBackground';
import { LetteringScene } from './LetteringScene';
import { IllustrativeScene } from './IllustrativeScene';

// ─────────────────────────────────────────────────────────────────────────────
// Spring presets — configurações de física por estilo emocional
// ─────────────────────────────────────────────────────────────────────────────
const SPRING_PRESETS: Record<SpringPreset, { damping: number; stiffness: number; mass: number }> = {
  bouncy:   { damping: 8,  stiffness: 320, mass: 0.5 },
  smooth:   { damping: 20, stiffness: 100, mass: 1.0 },
  dramatic: { damping: 5,  stiffness: 500, mass: 0.3 },
  gentle:   { damping: 30, stiffness: 80,  mass: 1.5 },
};

// Mapa de transições do @remotion/transitions
function getTransitionPresentation(style: TransitionStyle, direction?: string) {
  switch (style) {
    case 'slide-right':  return slide({ direction: 'from-right'  }) as any;
    case 'slide-left':   return slide({ direction: 'from-left'   }) as any;
    case 'slide-up':     return slide({ direction: 'from-bottom' }) as any;
    case 'slide-down':   return slide({ direction: 'from-top'    }) as any;
    case 'wipe':         return wipe({ direction: 'from-right'   }) as any;
    case 'clock-wipe':   return wipe({ direction: 'from-left'    }) as any;
    case 'flip':         return flip({ direction: 'from-right'   }) as any;
    case 'rotate':       return flip({ direction: 'from-bottom'  }) as any;
    case 'zoom-in':      return fade() as any;  // @remotion/transitions has no zoom-in; fade is cleanest fallback
    case 'fade':
    default:             return fade() as any;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPOSITION
// ─────────────────────────────────────────────────────────────────────────────
export const ShortVideoComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  backgroundMusicUrl,
  captionStyle = 'pop',
  primaryColor = '#EAB308',
  accentColor = '#FFFFFF',
  showWatermark = true,
  watermarkText = 'DarkTube AI',
  format = 'vertical',
}) => {
  const { fps } = useVideoConfig();

  const DEFAULT_TRANSITION_FRAMES = 18;

  // Calcula duração de cada segmento da TransitionSeries (inclui sobreposição da transição)
  const segments = scenes.map((scene, i) => {
    const durationFrames = Math.round((scene.durationSeconds || 5) * fps);
    const transitionStyle = scene.transitionIn || 'fade';
    const transitionFrames = scene.transitionDurationFrames || (transitionStyle === 'none' ? 0 : DEFAULT_TRANSITION_FRAMES);
    return { scene, durationFrames, transitionStyle, transitionFrames };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', fontFamily: 'Montserrat, Inter, sans-serif' }}>

      {/* ── CENAS com TransitionSeries ── */}
      <TransitionSeries>
        {segments.map(({ scene, durationFrames, transitionStyle, transitionFrames }, i) => {
          const isLast = i === scenes.length - 1;
          // Na última cena, não há transição de saída — a cena ocupa todo o tempo restante
          return (
            <React.Fragment key={i}>
              <TransitionSeries.Sequence durationInFrames={durationFrames}>
                <SceneLayer
                  scene={scene}
                  sceneIndex={i}
                  totalScenes={scenes.length}
                  durationFrames={durationFrames}
                  captionStyle={captionStyle}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                  format={format}
                />
              </TransitionSeries.Sequence>

              {/* Adiciona transição entre cenas (exceto após a última) */}
              {!isLast && transitionStyle !== 'none' && (
                <TransitionSeries.Transition
                  presentation={getTransitionPresentation(transitionStyle)}
                  timing={linearTiming({
                    durationInFrames: transitionFrames,
                  })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {/* ── BARRA DE PROGRESSO ── */}
      <ProgressBar totalScenes={scenes.length} primaryColor={primaryColor} accentColor={accentColor} />

      {/* Música de fundo — mixada via FFmpeg no servidor */}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CENA INDIVIDUAL (Padrão VERBO Motion O.S.)
// ─────────────────────────────────────────────────────────────────────────────
const SceneLayer: React.FC<{
  scene: SceneSegment;
  sceneIndex: number;
  totalScenes: number;
  durationFrames: number;
  captionStyle: string;
  primaryColor: string;
  accentColor: string;
  format: string;
}> = ({ scene, sceneIndex, totalScenes, durationFrames, captionStyle, primaryColor, accentColor, format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const exitDirections: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'up', 'right', 'down'];
  const exitDirection = exitDirections[sceneIndex % exitDirections.length];

  // 1. CENA DE LETTERING HERO (Tipografia Gigante, Stagger, Blur Inércia)
  if (scene.sceneType === 'LETTERING' || (scene.letteringLines && scene.letteringLines.length > 0)) {
    return (
      <AbsoluteFill>
        <LivingBackground
          type={scene.livingBgType || (sceneIndex % 2 === 0 ? 'dot-grid' : 'floating-symbols')}
          baseColor={scene.emotionColor || '#0B132B'}
          accentColor={primaryColor}
        />
        <LetteringScene
          lines={scene.letteringLines}
          fallbackText={scene.captionText}
          primaryColor={primaryColor}
          accentColor={accentColor}
          exitDirection={exitDirection}
        />
      </AbsoluteFill>
    );
  }

  // 2. CENA DATA_VIZ (Gráficos, Métricas, Contadores)
  // O Diretor pode usar imagens como fundo e sobrepor gráficos/dados
  if (scene.sceneType === 'DATA_VIZ' || (scene.animationStyle && ['bar-chart', 'line-chart', 'counter-confetti', 'odometer-digit-roll'].includes(scene.animationStyle))) {
    const bgImage = scene.imageUrl;
    return (
      <AbsoluteFill>
        {/* Fundo: imagem do usuário (se houver) ou LivingBackground */}
        {bgImage ? (
          <KenBurnsImage
            imgUrl={bgImage}
            durationFrames={durationFrames}
            animationStyle="kenburns-up"
            colorGrading={scene.colorGrading}
          />
        ) : (
          <LivingBackground
            type={scene.livingBgType || 'concentric-rings'}
            baseColor={scene.emotionColor || '#0B132B'}
            accentColor={primaryColor}
          />
        )}
        {/* Overlay escuro para legibilidade quando há imagem de fundo */}
        {bgImage && (
          <AbsoluteFill style={{ background: 'rgba(0,0,0,0.55)', zIndex: 5 }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 40px', zIndex: 30 }}>
          {scene.animationStyle === 'bar-chart' ? (
            <AnimatedBarChart isVertical={format === 'vertical'} />
          ) : (
            <AnimatedLineChart isVertical={format === 'vertical'} color={primaryColor} />
          )}
          {scene.badgeText && (
            <div style={{ marginTop: 40, padding: '14px 28px', backgroundColor: scene.badgeColor || primaryColor, borderRadius: 999, color: '#000', fontWeight: 900, fontSize: 32, boxShadow: '0 8px 0 rgba(0,0,0,0.4)' }}>
              {scene.badgeText}
            </div>
          )}
        </div>
        {/* Legendas sincronizadas por palavra */}
        <CaptionLayer
          scene={scene}
          captionStyle={captionStyle}
          primaryColor={primaryColor}
          accentColor={accentColor}
          durationFrames={durationFrames}
          format={format}
        />
      </AbsoluteFill>
    );
  }

  // 3. CENA CODE_TECH (Terminal, Código, Hacker)
  // O Diretor pode usar imagens como fundo e sobrepor terminal
  if (scene.sceneType === 'CODE_TECH' || scene.animationStyle === 'typing-code-block' || scene.animationStyle === 'terminal-3d') {
    const bgImage = scene.imageUrl;
    return (
      <AbsoluteFill>
        {bgImage ? (
          <KenBurnsImage
            imgUrl={bgImage}
            durationFrames={durationFrames}
            animationStyle="kenburns-down"
            colorGrading={scene.colorGrading}
          />
        ) : (
          <LivingBackground
            type={scene.livingBgType || 'mesh-gradient'}
            baseColor={scene.emotionColor || '#050811'}
            accentColor={primaryColor}
          />
        )}
        {bgImage && (
          <AbsoluteFill style={{ background: 'rgba(0,0,0,0.65)', zIndex: 5 }} />
        )}
        <CodeTerminalOverlay primaryColor={primaryColor} />
        {/* Legendas sincronizadas por palavra */}
        <CaptionLayer
          scene={scene}
          captionStyle={captionStyle}
          primaryColor={primaryColor}
          accentColor={accentColor}
          durationFrames={durationFrames}
          format={format}
        />
      </AbsoluteFill>
    );
  }

  // 4. CENA PADRÃO / CINEMÁTICA (2.5D Parallax ou Ken Burns + Overlays + Legendas Sincronizadas)
  const fgImage = scene.subjectImageUrl || scene.foregroundUrl;
  const bgImage = scene.imageUrl;
  const intensity = scene.intensity ?? 0.8;

  return (
    <AbsoluteFill>
      {/* CAMADA DE FUNDO / IMAGEM / 2.5D */}
      {fgImage && bgImage ? (
        <Parallax25DImage
          bgUrl={bgImage}
          fgUrl={fgImage}
          durationFrames={durationFrames}
          animationStyle={scene.animationStyle || 'parallax-up'}
          colorGrading={scene.colorGrading}
          format={format}
        />
      ) : bgImage ? (
        <KenBurnsImage
          imgUrl={bgImage}
          durationFrames={durationFrames}
          animationStyle={scene.animationStyle || 'kenburns-right'}
          colorGrading={scene.colorGrading}
        />
      ) : (
        <LivingBackground
          type={scene.livingBgType || (sceneIndex % 2 === 0 ? 'concentric-rings' : 'ambient-particles')}
          baseColor={scene.emotionColor || '#070B19'}
          accentColor={primaryColor}
        />
      )}

      {/* OVERLAYS VISUAIS (Light leak, Glitch, Flash, Partículas) */}
      <OverlayLayer scene={scene} intensity={intensity} durationFrames={durationFrames} />

      {/* BADGE DA CENA (se houver) */}
      {scene.badgeText && (
        <div
          style={{
            position: 'absolute',
            top: '12%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: scene.badgeColor || primaryColor,
            color: '#000000',
            fontWeight: 900,
            fontSize: 28,
            padding: '10px 24px',
            borderRadius: 999,
            boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
            zIndex: 35,
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          {scene.badgeText}
        </div>
      )}

      {/* LEGENDAS SINCRONIZADAS DINÂMICAS PALAVRA A PALAVRA / CHUNKS */}
      <CaptionLayer
        scene={scene}
        captionStyle={captionStyle}
        primaryColor={primaryColor}
        accentColor={accentColor}
        durationFrames={durationFrames}
        format={format}
      />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OVERLAY LAYER — Efeitos de luz, glitch, flash e partículas
// ─────────────────────────────────────────────────────────────────────────────
const OverlayLayer: React.FC<{
  scene: SceneSegment;
  intensity: number;
  durationFrames: number;
}> = ({ scene, intensity, durationFrames }) => {
  const overlay = scene.overlayEffect;
  if (!overlay || overlay === 'none') return null;

  return (
    <>
      {overlay === 'glitch' && <GlitchOverlay intensity={intensity} durationFrames={20} />}
      {overlay === 'light-leak' && <LightLeakOverlay intensity={intensity} durationFrames={25} />}
      {overlay === 'flash' && <FlashOverlay intensity={intensity} durationFrames={10} />}
      {overlay === 'particles' && <ParticlesOverlay intensity={intensity} durationFrames={durationFrames} />}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PARALLAX 2.5D IMAGE — Sujeito (Foreground PNG recortado) + Fundo (Background)
// Fundo estendido (130%) com desfoque de lente sutil para eliminar duplicações
// ─────────────────────────────────────────────────────────────────────────────
const Parallax25DImage: React.FC<{
  bgUrl: string;
  fgUrl: string;
  durationFrames: number;
  animationStyle: string;
  colorGrading?: string;
  format?: string;
}> = ({ bgUrl, fgUrl, durationFrames, animationStyle, colorGrading, format = 'vertical' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: 'clamp' });

  // Entrada suave com física spring
  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 85 },
  });

  // Micro-movimento flutuante contínuo (respiração / câmera de mão)
  const floatX = Math.sin(frame * 0.04) * 4;
  const floatY = Math.cos(frame * 0.03) * 4;

  let bgTransform = '';
  let fgTransform = '';

  const isVertical = format === 'vertical';

  switch (animationStyle) {
    case 'parallax-up': {
      const bgScale = interpolate(progress, [0, 1], [1.30, 1.38]);
      const bgY = interpolate(progress, [0, 1], [10, -10]);
      const fgScale = interpolate(enterSpring, [0, 1], [0.94, 1.05]);
      const fgY = interpolate(progress, [0, 1], [15, -20]);
      bgTransform = `scale(${bgScale}) translate(${floatX * 0.5}px, ${bgY + floatY * 0.5}px)`;
      fgTransform = `scale(${fgScale}) translate(${floatX}px, ${fgY + floatY}px)`;
      break;
    }
    case 'parallax-down': {
      const bgScale = interpolate(progress, [0, 1], [1.30, 1.38]);
      const bgY = interpolate(progress, [0, 1], [-10, 10]);
      const fgScale = interpolate(enterSpring, [0, 1], [0.94, 1.05]);
      const fgY = interpolate(progress, [0, 1], [-15, 20]);
      bgTransform = `scale(${bgScale}) translate(${floatX * 0.5}px, ${bgY + floatY * 0.5}px)`;
      fgTransform = `scale(${fgScale}) translate(${floatX}px, ${fgY + floatY}px)`;
      break;
    }
    case 'parallax-left': {
      const bgScale = interpolate(progress, [0, 1], [1.30, 1.38]);
      const bgX = interpolate(progress, [0, 1], [10, -10]);
      const fgScale = interpolate(enterSpring, [0, 1], [0.94, 1.05]);
      const fgX = interpolate(progress, [0, 1], [15, -20]);
      bgTransform = `scale(${bgScale}) translate(${bgX + floatX * 0.5}px, ${floatY * 0.5}px)`;
      fgTransform = `scale(${fgScale}) translate(${fgX + floatX}px, ${floatY}px)`;
      break;
    }
    case 'parallax-right': {
      const bgScale = interpolate(progress, [0, 1], [1.30, 1.38]);
      const bgX = interpolate(progress, [0, 1], [-10, 10]);
      const fgScale = interpolate(enterSpring, [0, 1], [0.94, 1.05]);
      const fgX = interpolate(progress, [0, 1], [-15, 20]);
      bgTransform = `scale(${bgScale}) translate(${bgX + floatX * 0.5}px, ${floatY * 0.5}px)`;
      fgTransform = `scale(${fgScale}) translate(${fgX + floatX}px, ${floatY}px)`;
      break;
    }
    default: {
      const bgScale = interpolate(progress, [0, 1], [1.30, 1.36]);
      const fgScale = interpolate(enterSpring, [0, 1], [0.95, 1.04]);
      bgTransform = `scale(${bgScale}) translate(${floatX * 0.5}px, ${floatY * 0.5}px)`;
      fgTransform = `scale(${fgScale}) translate(${floatX}px, ${floatY}px)`;
    }
  }

  const gradingFilter = (colorGrading && colorGrading !== 'none') ? GRADING_FILTERS[colorGrading] || '' : '';

  return (
    <AbsoluteFill style={{ overflow: 'hidden', perspective: '1000px', backgroundColor: '#0B0F19' }}>
      {/* Camada 1: Fundo Estendido com tratamento de profundidade (Zero duplicidade de cabeça) */}
      <Img
        src={bgUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: bgTransform,
          filter: gradingFilter ? `${gradingFilter} brightness(0.6) contrast(1.15)` : 'brightness(0.6) contrast(1.15)',
          opacity: 0.75,
          willChange: 'transform',
        }}
      />

      {/* Camada de Vinheta Escura de Profundidade */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,8,16,0.7) 75%, rgba(5,8,16,0.95) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Camada 2: Sujeito Recortado com Sombra de Contato Realista */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: isVertical ? 'center' : 'flex-end',
          alignItems: 'center',
          transform: fgTransform,
          willChange: 'transform',
          paddingRight: isVertical ? 0 : 60,
        }}
      >
        <Img
          src={fgUrl}
          style={{
            width: isVertical ? '100%' : '75%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center bottom',
            filter: gradingFilter
              ? `${gradingFilter} drop-shadow(0 25px 45px rgba(0,0,0,0.85))`
              : 'drop-shadow(0 25px 45px rgba(0,0,0,0.85))',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KEN BURNS & DYNAMIC CAMERA — Animação de imagem, vídeo IA e 3D via interpolate()
// Suporta arquivos de vídeo (.mp4/.webm) e imagens estáticas (.png/.jpg)
// ─────────────────────────────────────────────────────────────────────────────
const KenBurnsImage: React.FC<{
  imgUrl: string;
  durationFrames: number;
  animationStyle: string;
  colorGrading?: string;
}> = ({ imgUrl, durationFrames, animationStyle, colorGrading }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: 'clamp' });

  // Detecta se a mídia é um arquivo de vídeo (ex: clipe animado por IA gerado via Runway/Kling/Luma/Sora)
  const isVideoMedia = (url: string) => {
    if (!url) return false;
    const clean = url.toLowerCase().split('?')[0];
    return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') || clean.includes('/video/') || clean.includes('video_');
  };

  const isVideo = isVideoMedia(imgUrl);

  // Micro-pulso flutuante (2px) para garantir movimento dinâmico contínuo em todas as cenas
  const floatX = Math.sin(frame * 0.08) * 3;
  const floatY = Math.cos(frame * 0.06) * 3;

  let transform = '';

  switch (animationStyle) {
    case 'kenburns-right':
      transform = `scale(${1.12 + progress * 0.28}) translate(${progress * 10 + floatX}%, ${floatY}px)`;
      break;
    case 'kenburns-left':
      transform = `scale(${1.12 + progress * 0.28}) translate(${-progress * 10 + floatX}%, ${floatY}px)`;
      break;
    case 'kenburns-up':
      transform = `scale(${1.12 + progress * 0.28}) translate(${floatX}px, ${-progress * 10 + floatY}%)`;
      break;
    case 'kenburns-down':
      transform = `scale(${1.12 + progress * 0.28}) translate(${floatX}px, ${progress * 10 + floatY}%)`;
      break;
    case 'zoom-punch': {
      const punchScale = interpolate(frame, [0, 8, durationFrames], [1.55, 1.22, 1.10], {
        extrapolateRight: 'clamp',
      });
      const rot = Math.sin(frame * 0.1) * 1.5;
      transform = `scale(${punchScale}) rotate(${rot}deg)`;
      break;
    }
    case 'parallax-up':
      transform = `scale(${1.20 + progress * 0.20}) translate(${floatX}px, ${10 - progress * 18}%)`;
      break;
    case 'parallax-down':
      transform = `scale(${1.20 + progress * 0.20}) translate(${floatX}px, ${-10 + progress * 18}%)`;
      break;
    case 'parallax-left':
      transform = `scale(${1.20 + progress * 0.20}) translate(${10 - progress * 18}%, ${floatY}px)`;
      break;
    case 'parallax-right':
      transform = `scale(${1.20 + progress * 0.20}) translate(${-10 + progress * 18}%, ${floatY}px)`;
      break;
    case 'zoom-out':
      transform = `scale(${1.45 - progress * 0.35}) translate(${floatX}px, ${floatY}px)`;
      break;
    case 'tilt-3d': {
      const rotX = interpolate(progress, [0, 1], [14, -8]);
      const rotY = interpolate(progress, [0, 1], [-16, 14]);
      transform = `perspective(800px) scale(1.28) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      break;
    }
    case 'shake-impact': {
      const shakeX = Math.sin(frame * 1.8) * interpolate(frame, [0, 16], [18, 0], { extrapolateRight: 'clamp' });
      const shakeY = Math.cos(frame * 1.8) * interpolate(frame, [0, 16], [18, 0], { extrapolateRight: 'clamp' });
      transform = `scale(1.20) translate(${shakeX}px, ${shakeY}px)`;
      break;
    }
    case 'spin-in': {
      const rot = interpolate(frame, [0, 18], [-28, 0], { extrapolateRight: 'clamp' });
      const scaleSpin = interpolate(frame, [0, 18], [1.45, 1.15], { extrapolateRight: 'clamp' });
      transform = `scale(${scaleSpin}) rotate(${rot}deg)`;
      break;
    }
    default:
      transform = `scale(${1.12 + progress * 0.22}) translate(${floatX}px, ${floatY}px)`;
  }

  const gradingFilter = (colorGrading && colorGrading !== 'none') ? GRADING_FILTERS[colorGrading] || '' : '';

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {isVideo ? (
        <OffthreadVideo
          src={imgUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            transform,
            transformOrigin: 'center center',
            willChange: 'transform',
            filter: gradingFilter || 'none',
          }}
        />
      ) : (
        <Img
          src={imgUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            transform,
            transformOrigin: 'center center',
            willChange: 'transform',
            filter: gradingFilter || 'none',
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LEGENDAS — 3 estilos com efeitos avançados
// ─────────────────────────────────────────────────────────────────────────────
const CaptionLayer: React.FC<{
  scene: SceneSegment;
  captionStyle: string;
  primaryColor: string;
  accentColor: string;
  durationFrames: number;
  format: string;
}> = ({ scene, captionStyle, primaryColor, accentColor, durationFrames, format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeInScene = frame / fps;

  const isVertical = format === 'vertical';
  const words = scene.words || [];
  const captionText = scene.captionText || '';
  const textEffect = scene.textEffect || (captionStyle === 'pop' ? 'pop' : 'none');
  const springPreset = scene.springPreset || 'bouncy';
  const springConfig = SPRING_PRESETS[springPreset];
  const fontSize = isVertical ? 72 : 56;

  // ── POP: cada palavra aparece e desaparece individualmente ──────────────────
  // Usa pop quando: captionStyle='pop' OU quando há words disponíveis (priority: sync words)
  const usePopMode = (captionStyle === 'pop' || words.length > 0) && words.length > 0;
  if (usePopMode) {
    const activeIndex = words.findIndex((w, i) => {
      const nextWord = words[i + 1];
      const end = nextWord ? nextWord.startInSeconds : (w.endInSeconds + 0.5);
      return currentTimeInScene >= w.startInSeconds && currentTimeInScene < end;
    });

    if (activeIndex === -1) return null;
    const currentWord = words[activeIndex];
    const wordFrame = frame - Math.round(currentWord.startInSeconds * fps);

    return (
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: isVertical ? '18%' : '12%',
          pointerEvents: 'none',
        }}
      >
        {/* Efeito de texto pelo textEffect da cena */}
        {textEffect === 'split-bounce' ? (
          <SplitBounceText
            text={currentWord.word}
            primaryColor={primaryColor}
            fontSize={fontSize + 20}
            springPreset={springPreset}
            staggerFrames={1}
          />
        ) : textEffect === 'glitch' ? (
          <GlitchText
            text={currentWord.word}
            fontSize={fontSize + 20}
            intensity={scene.intensity ?? 0.8}
          />
        ) : textEffect === 'typewriter' ? (
          <TypewriterText
            text={currentWord.word}
            fontSize={fontSize + 20}
            color={accentColor}
            charsPerSecond={18}
          />
        ) : textEffect === 'editorial' ? (
          <EditorialText
            text={currentWord.word}
            primaryColor={primaryColor}
            fontSize={fontSize + 20}
            frame={wordFrame}
          />
        ) : (textEffect === 'kinetic-pop' || textEffect === 'kinetic') ? (
          <KineticPopText
            text={currentWord.word}
            primaryColor={primaryColor}
            fps={fps}
            isVertical={isVertical}
            springConfig={{ damping: 4, stiffness: 600, mass: 0.25 }}
            frame={wordFrame}
          />
        ) : (
          /* Pop padrão com spring physics */
          <PopWord
            word={currentWord.word}
            primaryColor={primaryColor}
            fps={fps}
            isVertical={isVertical}
            springConfig={springConfig}
            frame={wordFrame}
          />
        )}
      </AbsoluteFill>
    );
  }

  // ── KARAOKE: todas as palavras visíveis, a ativa é destacada ────────────────
  if (captionStyle === 'karaoke') {
    if (words.length === 0) return null;

    return (
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: isVertical ? '16%' : '10%',
          paddingLeft: '5%',
          paddingRight: '5%',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '10px',
            maxWidth: '90%',
          }}
        >
          {words.map((w, i) => {
            const isActive = currentTimeInScene >= w.startInSeconds && currentTimeInScene < w.endInSeconds;
            const isPast   = currentTimeInScene >= w.endInSeconds;
            return (
              <KaraokeWord
                key={i}
                word={w.word}
                isActive={isActive}
                isPast={isPast}
                primaryColor={scene.emotionColor || primaryColor}
                accentColor={accentColor}
                fps={fps}
                isVertical={isVertical}
                springConfig={springConfig}
              />
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ── SUBTITLE: texto completo da cena ──────────────────────────────────────
  const subtitleOpacity = interpolate(
    frame,
    [0, 8, durationFrames - 8, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const subtitleY = interpolate(frame, [0, 12], [20, 0], { extrapolateRight: 'clamp' });

  // textEffect: split-bounce para subtitle também
  if (textEffect === 'split-bounce' && captionText) {
    return (
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: isVertical ? '20%' : '12%',
          pointerEvents: 'none',
          opacity: subtitleOpacity,
        }}
      >
        <SplitBounceText
          text={captionText}
          primaryColor={primaryColor}
          fontSize={isVertical ? 56 : 44}
          springPreset={springPreset}
          staggerFrames={2}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: isVertical ? '20%' : '12%',
        paddingLeft: '5%',
        paddingRight: '5%',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          borderRadius: '16px',
          padding: '20px 32px',
          border: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center',
          color: accentColor,
          fontFamily: 'Montserrat, sans-serif',
          fontSize: isVertical ? 64 : 50,
          fontWeight: 800,
          lineHeight: 1.3,
          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
          maxWidth: '100%',
        }}
      >
        {captionText}
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// POP WORD — spring bounce por palavra (controlado por frame do pai)
// ─────────────────────────────────────────────────────────────────────────────
const PopWord: React.FC<{
  word: string;
  primaryColor: string;
  fps: number;
  isVertical: boolean;
  springConfig: { damping: number; stiffness: number; mass: number };
  frame: number;
}> = ({ word, primaryColor, fps, isVertical, springConfig, frame }) => {
  const scaleVal = spring({ frame: Math.max(0, frame), fps, config: springConfig });
  const translateY = interpolate(scaleVal, [0, 1], [30, 0], { extrapolateRight: 'clamp' });
  const rotation = interpolate(Math.max(0, frame), [0, 6, 10], [-6, 2, 0], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        transform: `scale(${scaleVal}) rotate(${rotation}deg) translateY(${translateY}px)`,
        color: '#FFFFFF',
        fontSize: isVertical ? 96 : 72,
        fontWeight: 900,
        textTransform: 'uppercase',
        textAlign: 'center',
        fontFamily: 'Montserrat, Inter, Impact, sans-serif',
        WebkitTextStroke: isVertical ? '6px #000000' : '4px #000000',
        paintOrder: 'stroke fill',
        textShadow: `0 8px 24px rgba(0,0,0,0.95), 0 0 35px ${primaryColor}88`,
        transformOrigin: 'center center',
        willChange: 'transform',
        letterSpacing: '1px',
      }}
    >
      <span style={{ color: primaryColor }}>{word}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KARAOKE WORD — palavra com destaque progressivo via spring
// ─────────────────────────────────────────────────────────────────────────────
const KaraokeWord: React.FC<{
  word: string;
  isActive: boolean;
  isPast: boolean;
  primaryColor: string;
  accentColor: string;
  fps: number;
  isVertical: boolean;
  springConfig: { damping: number; stiffness: number; mass: number };
}> = ({ word, isActive, isPast, primaryColor, accentColor, fps, isVertical, springConfig }) => {
  const frame = useCurrentFrame();

  const localFrame = isActive ? (frame % Math.ceil(fps * 0.5)) : 0;
  const scale = isActive
    ? spring({ frame: localFrame, fps, config: springConfig, from: 1, to: 1.15 })
    : 1;

  return (
    <span
      style={{
        fontFamily: 'Montserrat, Inter, Impact, sans-serif',
        fontSize: isVertical ? 82 : 58,
        fontWeight: 900,
        textTransform: 'uppercase',
        WebkitTextStroke: isVertical ? '6px #000000' : '4px #000000',
        paintOrder: 'stroke fill',
        color: isActive ? primaryColor : isPast ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.6)',
        textShadow: isActive
          ? `0 0 30px ${primaryColor}, 0 6px 20px #000000`
          : '0 4px 12px #000000',
        transform: `scale(${scale})`,
        display: 'inline-block',
        willChange: 'transform, color',
        transformOrigin: 'center bottom',
        margin: '0 6px',
      }}
    >
      {word}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ totalScenes: number; primaryColor: string; accentColor: string }> = ({
  primaryColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: '4px',
        width: `${progress}%`,
        background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
        opacity: 0.7,
        zIndex: 90,
      }}
    />
  );
};
