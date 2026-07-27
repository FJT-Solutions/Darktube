import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { RemotionShortProps, SceneSegment } from '../types';

// ─────────────────────────────────────────────
// MAIN COMPOSITION
// ─────────────────────────────────────────────
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

  // Calcular frame de início de cada cena
  const sceneStartFrames = scenes.reduce<number[]>((acc, scene, i) => {
    const prev = i === 0 ? 0 : acc[i - 1] + Math.round((scenes[i - 1].durationSeconds || 5) * fps);
    acc.push(prev);
    return acc;
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', fontFamily: 'Montserrat, Inter, sans-serif' }}>

      {/* ── CENAS ── */}
      {scenes.map((scene, i) => {
        const startFrame = sceneStartFrames[i];
        const durationFrames = Math.round((scene.durationSeconds || 5) * fps);

        return (
          <Sequence key={i} from={startFrame} durationInFrames={durationFrames + 8}>
            <SceneLayer
              scene={scene}
              sceneIndex={i}
              totalScenes={scenes.length}
              durationFrames={durationFrames}
              captionStyle={captionStyle}
              primaryColor={primaryColor}
              accentColor={accentColor}
              fps={fps}
            />
          </Sequence>
        );
      })}

      {/* ── WATERMARK GLOBAL ── */}
      {showWatermark && (
        <WatermarkOverlay text={watermarkText} primaryColor={primaryColor} />
      )}

      {/* ── MÚSICA DE FUNDO ── */}
      {backgroundMusicUrl && (
        <Audio src={backgroundMusicUrl} volume={0.12} />
      )}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────
// CENA INDIVIDUAL
// ─────────────────────────────────────────────
const SceneLayer: React.FC<{
  scene: SceneSegment;
  sceneIndex: number;
  totalScenes: number;
  durationFrames: number;
  captionStyle: string;
  primaryColor: string;
  accentColor: string;
  fps: number;
}> = ({ scene, sceneIndex, durationFrames, captionStyle, primaryColor, accentColor, fps }) => {
  const frame = useCurrentFrame();

  // Fade-in da cena
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  // Fade-out da cena (últimos 10 frames)
  const fadeOut = interpolate(frame, [durationFrames - 10, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Imagem/Fundo com animação Ken Burns */}
      {scene.imageUrl ? (
        <KenBurnsImage
          imgUrl={scene.imageUrl}
          durationFrames={durationFrames}
          animationStyle={scene.animationStyle || 'kenburns-right'}
          sceneIndex={sceneIndex}
        />
      ) : (
        <AbsoluteFill
          style={{ background: 'linear-gradient(135deg, #0f0f23 0%, #1a0a2e 50%, #16213e 100%)' }}
        />
      )}

      {/* Vignette cinematográfica */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Barra inferior escurecida para legenda */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 45%)',
          pointerEvents: 'none',
        }}
      />

      {/* Legendas */}
      <CaptionLayer
        scene={scene}
        captionStyle={captionStyle}
        primaryColor={primaryColor}
        accentColor={accentColor}
        durationFrames={durationFrames}
        fps={fps}
      />

      {/* Áudio da narração desta cena */}
      {scene.audioUrl && <Audio src={scene.audioUrl} />}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────
// KEN BURNS — Variações por estilo
// ─────────────────────────────────────────────
const KenBurnsImage: React.FC<{
  imgUrl: string;
  durationFrames: number;
  animationStyle: string;
  sceneIndex: number;
}> = ({ imgUrl, durationFrames, animationStyle }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: 'clamp' });

  let transform = '';

  switch (animationStyle) {
    case 'kenburns-right':
      // Zoom + pan direita
      transform = `scale(${1 + progress * 0.12}) translateX(${progress * 2}%)`;
      break;
    case 'kenburns-left':
      // Zoom + pan esquerda
      transform = `scale(${1 + progress * 0.12}) translateX(${-progress * 2}%)`;
      break;
    case 'zoom-punch':
      // Zoom dramático rápido no início depois sutil
      const punchScale = interpolate(frame, [0, 8, durationFrames], [1.18, 1.05, 1.0], {
        extrapolateRight: 'clamp',
      });
      transform = `scale(${punchScale})`;
      break;
    case 'parallax-up':
      // Pan para cima + zoom leve
      transform = `scale(${1 + progress * 0.08}) translateY(${3 - progress * 6}%)`;
      break;
    case 'zoom-out':
      // Zoom out — começa grande, diminui
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

// ─────────────────────────────────────────────
// LEGENDAS — 3 estilos
// ─────────────────────────────────────────────
const CaptionLayer: React.FC<{
  scene: SceneSegment;
  captionStyle: string;
  primaryColor: string;
  accentColor: string;
  durationFrames: number;
  fps: number;
}> = ({ scene, captionStyle, primaryColor, accentColor, durationFrames, fps }) => {
  const frame = useCurrentFrame();
  const currentTimeInScene = frame / fps;

  const words = scene.words || [];
  const captionText = scene.captionText || '';

  if (captionStyle === 'pop') {
    // ── POP: cada palavra aparece e desaparece individualmente ──
    const currentWord = words.find(
      (w) => currentTimeInScene >= w.startInSeconds && currentTimeInScene < w.endInSeconds
    );

    if (!currentWord) return null;

    return (
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: '18%',
          pointerEvents: 'none',
        }}
      >
        <PopWord word={currentWord.word} primaryColor={primaryColor} fps={fps} />
      </AbsoluteFill>
    );
  }

  if (captionStyle === 'karaoke') {
    // ── KARAOKE: todas palavras visíveis, atual destacada ──
    if (words.length === 0) return null;

    return (
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: '16%',
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
            const isActive =
              currentTimeInScene >= w.startInSeconds && currentTimeInScene < w.endInSeconds;
            const isPast = currentTimeInScene >= w.endInSeconds;

            return (
              <KaraokeWord
                key={i}
                word={w.word}
                isActive={isActive}
                isPast={isPast}
                primaryColor={primaryColor}
                accentColor={accentColor}
                fps={fps}
              />
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ── SUBTITLE: texto completo da cena ──
  const subtitleOpacity = interpolate(frame, [0, 8, durationFrames - 8, durationFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: '12%',
        paddingLeft: '6%',
        paddingRight: '6%',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          opacity: subtitleOpacity,
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '20px 32px',
          border: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center',
          fontSize: '52px',
          fontWeight: 800,
          color: accentColor,
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

// ─────────────────────────────────────────────
// POP WORD — spring bounce por palavra
// ─────────────────────────────────────────────
const PopWord: React.FC<{ word: string; primaryColor: string; fps: number }> = ({
  word, primaryColor, fps,
}) => {
  const frame = useCurrentFrame();

  const pop = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 250, mass: 0.6 },
  });

  return (
    <div
      style={{
        transform: `scale(${pop})`,
        color: '#ffffff',
        fontSize: '80px',
        fontWeight: 900,
        textTransform: 'uppercase',
        textAlign: 'center',
        padding: '14px 32px',
        background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}88)`,
        borderRadius: '20px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 20px ${primaryColor}44`,
        letterSpacing: '2px',
        textShadow: '0 3px 12px rgba(0,0,0,0.9)',
        maxWidth: '90%',
        wordBreak: 'break-word',
      }}
    >
      {word}
    </div>
  );
};

// ─────────────────────────────────────────────
// KARAOKE WORD — palavra com destaque progressivo
// ─────────────────────────────────────────────
const KaraokeWord: React.FC<{
  word: string;
  isActive: boolean;
  isPast: boolean;
  primaryColor: string;
  accentColor: string;
  fps: number;
}> = ({ word, isActive, isPast, primaryColor, accentColor }) => {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '68px',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        transition: 'all 0.1s ease',
        color: isActive ? primaryColor : isPast ? `${accentColor}99` : `${accentColor}55`,
        transform: isActive ? 'scale(1.12)' : 'scale(1)',
        textShadow: isActive
          ? `0 0 20px ${primaryColor}88, 0 3px 12px rgba(0,0,0,0.9)`
          : '0 2px 6px rgba(0,0,0,0.8)',
        filter: isActive ? 'brightness(1.2)' : 'none',
      }}
    >
      {word}
    </span>
  );
};

// ─────────────────────────────────────────────
// WATERMARK
// ─────────────────────────────────────────────
const WatermarkOverlay: React.FC<{ text: string; primaryColor: string }> = ({ text, primaryColor }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 0.85], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top: 52,
        right: 44,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '100px',
        padding: '10px 22px',
        opacity,
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: primaryColor,
          boxShadow: `0 0 8px ${primaryColor}`,
        }}
      />
      <span
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: '1px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {text}
      </span>
    </div>
  );
};
