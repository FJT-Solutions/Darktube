import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
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
import { SplitBounceText, TypewriterText, GlitchText } from './TextSplit';
import { GlitchOverlay, LightLeakOverlay, FlashOverlay } from './GlitchOverlay';

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
    case 'slide-right': return slide({ direction: 'from-right' }) as any;
    case 'slide-left':  return slide({ direction: 'from-left'  }) as any;
    case 'slide-up':    return slide({ direction: 'from-bottom' }) as any;
    case 'slide-down':  return slide({ direction: 'from-top'   }) as any;
    case 'wipe':        return wipe({ direction: 'from-right'  }) as any;
    case 'flip':        return flip({ direction: 'from-right'  }) as any;
    case 'fade':
    default:            return fade() as any;
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
        {segments.map(({ scene, durationFrames, transitionStyle, transitionFrames }, i) => (
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
            {i < scenes.length - 1 && transitionStyle !== 'none' && (
              <TransitionSeries.Transition
                presentation={getTransitionPresentation(transitionStyle)}
                timing={springTiming({
                  durationInFrames: transitionFrames,
                  config: { damping: 14, stiffness: 200 },
                })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>

      {/* ── WATERMARK GLOBAL ── */}
      {showWatermark && (
        <WatermarkOverlay text={watermarkText} primaryColor={primaryColor} />
      )}

      {/* ── BARRA DE PROGRESSO ── */}
      <ProgressBar totalScenes={scenes.length} primaryColor={primaryColor} accentColor={accentColor} />

      {/* ── MÚSICA DE FUNDO ── */}
      {backgroundMusicUrl && (
        <Audio src={backgroundMusicUrl} volume={0.12} />
      )}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CENA INDIVIDUAL
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
}> = ({ scene, durationFrames, captionStyle, primaryColor, accentColor, format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const transIn = scene.transitionIn || 'fade';
  const intensity = scene.intensity ?? 0.8;

  return (
    <AbsoluteFill>
      {/* Fundo — imagem com Ken Burns ou gradiente */}
      {scene.imageUrl ? (
        <KenBurnsImage
          imgUrl={scene.imageUrl}
          durationFrames={durationFrames}
          animationStyle={scene.animationStyle || 'kenburns-right'}
        />
      ) : (
        <AbsoluteFill
          style={{
            background: scene.emotionColor
              ? `linear-gradient(135deg, ${scene.emotionColor}22 0%, #0f0f23 50%, #16213e 100%)`
              : 'linear-gradient(135deg, #0f0f23 0%, #1a0a2e 50%, #16213e 100%)',
          }}
        />
      )}

      {/* Vignette cinematográfica */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.88) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Gradiente inferior para legenda */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.3) 30%, transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      {/* Overlays de entrada — controlados pelo captionEffect (campo do AI Director) */}
      {(scene.captionEffect as string) === 'glitch' && (
        <GlitchOverlay intensity={intensity} durationFrames={20} primaryColor={primaryColor} />
      )}
      {(scene.captionEffect as string) === 'light-leak' && (
        <LightLeakOverlay intensity={intensity} durationFrames={28} />
      )}
      {(scene.captionEffect as string) === 'flash' && (
        <FlashOverlay intensity={intensity * 0.9} durationFrames={12} />
      )}

      {/* Legendas */}
      <CaptionLayer
        scene={scene}
        captionStyle={captionStyle}
        primaryColor={primaryColor}
        accentColor={accentColor}
        durationFrames={durationFrames}
        format={format}
      />

      {/* Áudio da narração desta cena */}
      {scene.audioUrl && <Audio src={scene.audioUrl} />}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KEN BURNS — Animação de imagem via interpolate() (não CSS)
// ─────────────────────────────────────────────────────────────────────────────
const KenBurnsImage: React.FC<{
  imgUrl: string;
  durationFrames: number;
  animationStyle: string;
}> = ({ imgUrl, durationFrames, animationStyle }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: 'clamp' });

  let transform = '';

  switch (animationStyle) {
    case 'kenburns-right':
      transform = `scale(${1 + progress * 0.12}) translateX(${progress * 2}%)`;
      break;
    case 'kenburns-left':
      transform = `scale(${1 + progress * 0.12}) translateX(${-progress * 2}%)`;
      break;
    case 'zoom-punch': {
      const punchScale = interpolate(frame, [0, 8, durationFrames], [1.18, 1.05, 1.0], {
        extrapolateRight: 'clamp',
      });
      transform = `scale(${punchScale})`;
      break;
    }
    case 'parallax-up':
      transform = `scale(${1 + progress * 0.08}) translateY(${3 - progress * 6}%)`;
      break;
    case 'zoom-out':
      transform = `scale(${1.18 - progress * 0.18})`;
      break;
    default:
      transform = `scale(${1 + progress * 0.1})`;
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
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
        }}
      />
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
  if (captionStyle === 'pop') {
    const currentWord = words.find(
      (w) => currentTimeInScene >= w.startInSeconds && currentTimeInScene < w.endInSeconds
    );

    if (!currentWord) return null;

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
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(12px)',
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

  const translateY = interpolate(scaleVal, [0, 1], [50, 0], { extrapolateRight: 'clamp' });
  const rotation = interpolate(Math.max(0, frame), [0, 6, 10], [-10, 2, 0], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        transform: `scale(${scaleVal}) rotate(${rotation}deg) translateY(${translateY}px)`,
        color: '#ffffff',
        fontSize: isVertical ? 110 : 85,
        fontWeight: 900,
        textTransform: 'uppercase',
        textAlign: 'center',
        padding: '14px 32px',
        backgroundColor: primaryColor,
        borderRadius: '16px',
        boxShadow: `0 15px 30px rgba(0,0,0,0.5), inset 0 -4px 0 rgba(0,0,0,0.25), 0 0 50px ${primaryColor}55`,
        border: '3px solid rgba(0,0,0,0.5)',
        transformOrigin: 'center center',
        willChange: 'transform',
        WebkitTextStroke: '2px rgba(0,0,0,0.3)',
      }}
    >
      {word}
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

  // Re-trigger o spring quando a palavra fica ativa
  // Usa frame local para que o spring comece sempre do zero quando ativa
  const localFrame = isActive ? (frame % Math.ceil(fps * 0.5)) : 0;
  const scale = isActive
    ? spring({ frame: localFrame, fps, config: springConfig, from: 1, to: 1.12 })
    : 1;

  return (
    <span
      style={{
        fontFamily: 'Montserrat, sans-serif',
        fontSize: isVertical ? 78 : 62,
        fontWeight: 900,
        textTransform: 'uppercase',
        WebkitTextStroke: '3px black',
        color: isActive ? primaryColor : isPast ? 'rgba(255,255,255,0.85)' : 'rgba(150,150,150,0.7)',
        textShadow: isActive
          ? `0 0 20px ${primaryColor}aa, 4px 4px 0 #000`
          : '3px 3px 0 #000',
        transform: `scale(${scale})`,
        display: 'inline-block',
        willChange: 'transform, color',
        transformOrigin: 'center bottom',
      }}
    >
      {word}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WATERMARK
// ─────────────────────────────────────────────────────────────────────────────
const WatermarkOverlay: React.FC<{ text: string; primaryColor: string }> = ({ text, primaryColor }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 0.9], { extrapolateRight: 'clamp' });
  const translateY = interpolate(frame, [0, 20], [-12, 0], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top: 52,
        right: 44,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '100px',
        padding: '10px 22px',
        opacity,
        transform: `translateY(${translateY}px)`,
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: primaryColor,
          boxShadow: `0 0 10px ${primaryColor}`,
        }}
      />
      <span
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.88)',
          letterSpacing: '1px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {text}
      </span>
    </div>
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
