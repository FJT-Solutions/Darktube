import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
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

// ─── VHS Tracking Lines ────────────────────────────────────────────────────
const TrackingLines: React.FC<{ frame: number }> = ({ frame }) => {
  const rng = createRng(frame * 13 + 777);
  // Tracking distortion appears periodically
  const cycle = frame % 120;
  if (cycle > 15 && cycle < 100) return null;

  const lineCount = 3 + Math.floor(rng() * 5);
  const lines = Array.from({ length: lineCount }, (_, i) => {
    const y = 70 + rng() * 25; // Bottom portion of screen
    const height = 1 + rng() * 4;
    const offset = (rng() - 0.5) * 20;
    return { y, height, offset, op: 0.4 + rng() * 0.5 };
  });

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 40 }}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${l.y}%`,
            left: 0,
            right: 0,
            height: `${l.height}px`,
            backgroundColor: 'rgba(255,255,255,0.7)',
            transform: `translateX(${l.offset}px)`,
            opacity: l.op,
            mixBlendMode: 'screen',
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ─── Head Switching Noise ───────────────────────────────────────────────────
const HeadSwitchNoise: React.FC<{ frame: number }> = ({ frame }) => {
  const rng = createRng(frame * 31);
  const active = rng() > 0.85; // ~15% chance per frame
  if (!active) return null;

  const height = 4 + rng() * 12;
  const offset = (rng() - 0.5) * 30;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `${height}px`,
        backgroundColor: 'rgba(255,255,255,0.15)',
        transform: `translateX(${offset}px)`,
        zIndex: 42,
        pointerEvents: 'none',
      }}
    />
  );
};

// ─── RGB Split (Chromatic Aberration) ────────────────────────────────────────
const RGBSplit: React.FC<{
  frame: number;
  children: React.ReactNode;
}> = ({ frame, children }) => {
  const rng = createRng(frame * 19);
  // Subtle constant split + occasional larger glitch
  const glitchActive = rng() > 0.92;
  const baseOffset = 1.5;
  const glitchOffset = glitchActive ? 3 + rng() * 8 : 0;
  const offset = baseOffset + glitchOffset;
  const wobble = Math.sin(frame * 0.1) * 0.5;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Red channel */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateX(${-offset - wobble}px)`,
          mixBlendMode: 'screen',
          opacity: 0.7,
          filter: 'url(#vhs-red)',
        }}
      >
        {children}
      </div>
      {/* Green channel (base) */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {children}
      </div>
      {/* Blue channel */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateX(${offset + wobble}px)`,
          mixBlendMode: 'screen',
          opacity: 0.7,
          filter: 'url(#vhs-blue)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ─── VHS Date Overlay ───────────────────────────────────────────────────────
const VHSDateOverlay: React.FC<{
  date: string;
  frame: number;
  position: 'top-right' | 'bottom-right';
  isVertical: boolean;
}> = ({ date, frame, position, isVertical }) => {
  const blink = frame % 50 < 40;
  const posStyle = position === 'top-right'
    ? { top: isVertical ? '70px' : '30px', right: '30px' }
    : { bottom: isVertical ? '70px' : '30px', right: '30px' };

  return (
    <div
      style={{
        position: 'absolute',
        ...posStyle,
        fontFamily: "'VCR OSD Mono', 'Courier New', monospace",
        fontSize: '18px',
        color: '#FFFFFF',
        letterSpacing: '2px',
        textShadow: '2px 2px 0px rgba(255,0,0,0.5), -1px -1px 0px rgba(0,0,255,0.3)',
        opacity: blink ? 0.95 : 0.4,
        zIndex: 45,
      }}
    >
      {date}
    </div>
  );
};

// ─── Tape Counter ───────────────────────────────────────────────────────────
const TapeCounter: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const count = Math.floor(frame / fps * 30); // Simulates tape counter speed
  const padded = String(count).padStart(5, '0');

  return (
    <div
      style={{
        fontFamily: "'VCR OSD Mono', 'Courier New', monospace",
        fontSize: '14px',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: '3px',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {padded}
    </div>
  );
};

// ─── Film Grain Heavy ───────────────────────────────────────────────────────
const HeavyGrain: React.FC<{ frame: number }> = ({ frame }) => {
  // Using SVG noise filter for procedural grain
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 48, mixBlendMode: 'overlay' }}>
      <svg width="100%" height="100%">
        <defs>
          <filter id="vhs-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
              seed={frame % 60}
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#vhs-grain)" opacity="0.12" />
      </svg>
    </AbsoluteFill>
  );
};

// ─── Horizontal Warp ────────────────────────────────────────────────────────
const HorizontalWarp: React.FC<{ frame: number }> = ({ frame }) => {
  const rng = createRng(frame * 23);
  const active = rng() > 0.94;
  if (!active) return null;

  const y = rng() * 100;
  const height = 10 + rng() * 40;
  const shift = (rng() - 0.5) * 15;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}%`,
        left: 0,
        right: 0,
        height: `${height}px`,
        transform: `translateX(${shift}px) scaleY(${0.9 + rng() * 0.2})`,
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 43,
        pointerEvents: 'none',
      }}
    />
  );
};

/**
 * VHSNoir — Motor de Estética VHS / Fita Retrô
 *
 * Para: Horror, nostalgia, mistério, darkwave, 80s/90s.
 * Inclui: RGB split (chromatic aberration), tracking lines,
 * film grain pesado, date overlay estilo camcorder, color bleed,
 * flicker de luminosidade, head switching noise, warping horizontal,
 * Play/Pause/Rewind HUD, tape counter.
 */
export const VHSNoirComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#FF0040',
  accentColor = '#FFFFFF',
  format = 'vertical',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const isVertical = format === 'vertical';

  // Find active scene
  let accumulatedTime = 0;
  let activeSceneIndex = 0;
  let sceneLocalTime = 0;

  for (let i = 0; i < scenes.length; i++) {
    const dur = scenes[i].durationSeconds || 5;
    if (time >= accumulatedTime && time < accumulatedTime + dur) {
      activeSceneIndex = i;
      sceneLocalTime = time - accumulatedTime;
      break;
    }
    accumulatedTime += dur;
  }

  const currentScene = scenes[activeSceneIndex] || scenes[0] || ({} as SceneSegment);
  const dur = currentScene.durationSeconds || 5;

  // ── Luminosity flicker ──
  const rng = createRng(frame * 7 + 42);
  const flickerBase = 0.85 + rng() * 0.15;
  const heavyFlicker = rng() > 0.95 ? 0.6 + rng() * 0.3 : flickerBase;

  // ── Color bleed (warm VHS color shift) ──
  const colorTemp = `sepia(${0.15 + Math.sin(frame * 0.05) * 0.05}) saturate(${1.1 + Math.sin(frame * 0.03) * 0.15}) contrast(${1.05 + Math.sin(frame * 0.07) * 0.05})`;

  // ── Ken Burns slow drift ──
  const scale = 1.05 + (sceneLocalTime / dur) * 0.06;
  const panX = Math.sin(sceneLocalTime * 0.3) * 8;
  const panY = (sceneLocalTime / dur) * -15;

  // ── Text entrance ──
  const textEnter = spring({
    frame: Math.max(0, Math.floor(sceneLocalTime * fps) - 8),
    fps,
    config: { damping: 16, stiffness: 100 },
  });

  const text = currentScene.captionText || '';

  // Generate VHS date
  const vhsDate = `JAN.15.1997  ${String(Math.floor(time / 3600)).padStart(2, '0')}:${String(Math.floor((time % 3600) / 60)).padStart(2, '0')}`;

  // ── Play icon state ──
  const isPlaying = true;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0A0A0A',
        overflow: 'hidden',
        fontFamily: "'VCR OSD Mono', 'Courier New', monospace",
      }}
    >
      {/* SVG filters for channel separation */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="vhs-red">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
          </filter>
          <filter id="vhs-blue">
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />
          </filter>
        </defs>
      </svg>

      {/* ── MAIN CONTENT with RGB Split ── */}
      <AbsoluteFill style={{ filter: colorTemp, opacity: heavyFlicker }}>
        {/* Background Image with Ken Burns */}
        {currentScene.imageUrl ? (
          <AbsoluteFill style={{ filter: 'brightness(0.55) contrast(1.3)' }}>
            <Img
              src={currentScene.imageUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
              }}
            />
          </AbsoluteFill>
        ) : (
          <AbsoluteFill
            style={{
              background: 'radial-gradient(ellipse at 50% 40%, #1A0A0A 0%, #0A0A0A 80%)',
            }}
          />
        )}

        {/* Dark vignette — heavy for VHS */}
        <AbsoluteFill
          style={{
            boxShadow: 'inset 0 0 200px rgba(0, 0, 0, 0.9)',
            background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.8) 100%)',
          }}
        />

        {/* ── TEXT CONTENT ── */}
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: isVertical ? '120px 40px' : '80px 50px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              transform: `translateY(${(1 - textEnter) * 25}px)`,
              opacity: textEnter,
            }}
          >
            {/* Distorted caption with VHS aesthetic */}
            <h1
              style={{
                fontSize: isVertical ? '44px' : '38px',
                fontWeight: 900,
                lineHeight: 1.2,
                color: accentColor,
                margin: 0,
                textShadow: `
                  3px 0 ${primaryColor},
                  -2px 0 rgba(0, 100, 255, 0.6),
                  0 0 20px rgba(255, 255, 255, 0.15)
                `,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {text}
            </h1>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ── VHS OVERLAYS ── */}
      <TrackingLines frame={frame} />
      <HeadSwitchNoise frame={frame} />
      <HorizontalWarp frame={frame} />
      <HeavyGrain frame={frame} />

      {/* ── Scan lines (subtle) ── */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.08) 1px, rgba(0,0,0,0.08) 2px)',
          pointerEvents: 'none',
          zIndex: 46,
        }}
      />

      {/* ── VHS DATE OVERLAY ── */}
      <VHSDateOverlay
        date={vhsDate}
        frame={frame}
        position="bottom-right"
        isVertical={isVertical}
      />

      {/* ── PLAY INDICATOR ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '65px' : '28px',
          left: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 50,
        }}
      >
        {/* Play triangle */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '12px solid #FFFFFF',
            borderTop: '7px solid transparent',
            borderBottom: '7px solid transparent',
            opacity: 0.7,
          }}
        />
        <span style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '14px',
          letterSpacing: '3px',
        }}>
          PLAY
        </span>
      </div>

      {/* ── TAPE COUNTER ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '65px' : '28px',
          right: '28px',
          zIndex: 50,
        }}
      >
        <TapeCounter frame={frame} fps={fps} />
      </div>

      {/* ── SP/LP Mode indicator ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '95px' : '50px',
          left: '28px',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '12px',
          letterSpacing: '2px',
          zIndex: 50,
        }}
      >
        SP
      </div>
    </AbsoluteFill>
  );
};
