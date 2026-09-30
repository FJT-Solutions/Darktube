import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';

// ─── Deterministic RNG ──────────────────────────────────────────────────────
function createRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Closed-form spring (pure function of time) ─────────────────────────────
function closedFormSpring(t: number, k = 170, d = 26): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k);
  const z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// ─── Candlelight Flicker Light ──────────────────────────────────────────────
const CandleLightAmbiance: React.FC<{ frame: number }> = ({ frame }) => {
  const flicker = Math.sin(frame * 0.15) * 0.05 + Math.cos(frame * 0.3) * 0.03;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 65% 20%, rgba(245, 158, 11, ${0.18 + flicker}) 0%, transparent 65%)`,
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }}
    />
  );
};

// ─── Procedural Ink Splatters ───────────────────────────────────────────────
const InkSplatters: React.FC<{ frame: number }> = ({ frame }) => {
  const splatters = React.useMemo(() => {
    const r = createRng(192837);
    return Array.from({ length: 5 }, () => ({
      x: 15 + r() * 70,
      y: 15 + r() * 70,
      size: 4 + r() * 12,
      opacity: 0.15 + r() * 0.25,
    }));
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {splatters.map((s, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            backgroundColor: '#1E1B18',
            borderRadius: '50%',
            opacity: s.opacity,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
    </div>
  );
};

// ─── Main BookQuote Composition ─────────────────────────────────────────────
export const BookQuoteComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#D97706', // Warm Amber / Stoic Leather
  accentColor = '#DC2626', // Ribbon Crimson
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'SABEDORIA CLÁSSICA',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const time = frame / fps;

  // Scene timing resolution
  let accumulatedTime = 0;
  let activeSceneIndex = 0;
  let sceneLocalTime = 0;
  let sceneStartFrame = 0;

  for (let i = 0; i < scenes.length; i++) {
    const dur = scenes[i].durationSeconds || 5;
    if (time >= accumulatedTime && time < accumulatedTime + dur) {
      activeSceneIndex = i;
      sceneLocalTime = time - accumulatedTime;
      sceneStartFrame = Math.round(accumulatedTime * fps);
      break;
    }
    accumulatedTime += dur;
  }

  const currentScene = scenes[activeSceneIndex] || scenes[0] || ({} as SceneSegment);
  const dur = currentScene.durationSeconds || 5;
  const isLandscape = format === 'horizontal' || width > height;

  // Page Turn / Drop Dynamics
  const pageSpring = closedFormSpring(sceneLocalTime, 130, 20);
  const ribbonDrop = closedFormSpring(sceneLocalTime - 0.2, 160, 18);

  const quoteText = currentScene.captionText || 'Você tem poder sobre a sua mente, não sobre os acontecimentos externos. Perceba isso, e você encontrará a sua força.';
  const author = currentScene.letteringLines?.[0]?.text || 'Marco Aurélio — Meditações';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0D0E12',
        overflow: 'hidden',
        perspective: '1200px',
        fontFamily: "'Playfair Display', Georgia, 'Cinzel', serif",
      }}
    >
      {/* ── 1. Warm Candlelit Dark Background ── */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, #1E1B18 0%, #08080A 80%)',
        }}
      />

      <CandleLightAmbiance frame={frame} />

      {/* ── 2. The Tome Book Page Card ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isLandscape ? '0 90px' : '0 24px',
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: isLandscape ? '68%' : '90%',
            maxWidth: '820px',
            backgroundColor: '#F7F3E9', // Genuine parchment paper tone
            color: '#1C1917',
            borderRadius: '12px',
            boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 25px rgba(0,0,0,0.5)',
            padding: isLandscape ? '44px 52px' : '36px 30px',
            transform: `perspective(1200px) rotateY(${(1 - pageSpring) * -16}deg) translateY(${(1 - pageSpring) * 60}px) scale(${0.95 + pageSpring * 0.05})`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Bookmark Ribbon */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: '48px',
              width: '28px',
              height: `${Math.min(180, ribbonDrop * 180)}px`,
              backgroundColor: accentColor,
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)',
              zIndex: 10,
            }}
          />

          <InkSplatters frame={frame} />

          {/* Chapter / Book Header */}
          <div
            style={{
              textAlign: 'center',
              borderBottom: '1px solid rgba(28,25,23,0.15)',
              paddingBottom: '16px',
            }}
          >
            <span
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '12px',
                fontWeight: 900,
                letterSpacing: '3px',
                color: '#78716C',
                textTransform: 'uppercase',
              }}
            >
              LIVRO IV • CITAÇÃO FILOSÓFICA
            </span>
          </div>

          {/* Giant Decorative Opening Quote */}
          <div
            style={{
              fontSize: '110px',
              lineHeight: 0.6,
              color: primaryColor,
              opacity: 0.35,
              marginTop: '20px',
              marginBottom: '-20px',
            }}
          >
            “
          </div>

          {/* Quote Body */}
          <p
            style={{
              fontSize: isLandscape ? '32px' : '28px',
              lineHeight: 1.45,
              fontWeight: 700,
              fontStyle: 'italic',
              margin: '0 0 24px 0',
              textAlign: 'justify',
            }}
          >
            {quoteText}
          </p>

          {/* Author Attribution */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid rgba(28,25,23,0.15)',
              paddingTop: '16px',
            }}
          >
            <div style={{ width: '32px', height: '1.5px', backgroundColor: primaryColor }} />
            <span
              style={{
                fontSize: '18px',
                fontWeight: 900,
                color: '#1C1917',
                fontFamily: 'Montserrat, sans-serif',
                letterSpacing: '1px',
              }}
            >
              {author}
            </span>
          </div>
        </div>
      </AbsoluteFill>

      {/* ── 3. Brand Watermark ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '16px' : '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.45)',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '2px',
            fontFamily: 'Montserrat, sans-serif',
            zIndex: 40,
          }}
        >
          {watermarkText}
        </div>
      )}
    </AbsoluteFill>
  );
};
