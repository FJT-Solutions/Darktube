import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Img,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';
import { CaptionLayer } from '../CaptionLayer';

export interface VHSNoirProps extends RemotionShortProps {
  timestamp?: string;
  scene?: SceneSegment;
  sceneIndex?: number;
}

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

// ─── Fast Film Grain (Optimized for Software Rasterizer) ──────────────────
const FastFilmGrain: React.FC<{ frame: number }> = ({ frame }) => {
  const shiftX = (frame * 19) % 100;
  const shiftY = (frame * 31) % 100;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 48,
        opacity: 0.12,
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.6) 1px, transparent 1px)',
        backgroundSize: '4px 4px, 3px 3px',
        backgroundPosition: `${shiftX}px ${shiftY}px, ${-shiftX}px ${-shiftY}px`,
        mixBlendMode: 'overlay',
      }}
    />
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
 * film grain rápido, date overlay estilo camcorder, color bleed,
 * flicker de luminosidade, head switching noise, warping horizontal,
 * Play/Pause/Rewind HUD, tape counter, karaoke captions.
 */
export const VHSNoirSceneSingle: React.FC<VHSNoirProps> = ({
  scene,
  sceneIndex = 0,
  primaryColor = '#FF0040',
  accentColor = '#FFFFFF',
  format = 'vertical',
  timestamp,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isVertical = format === 'vertical';

  const durSec = scene?.durationSeconds || 5;
  const durFrames = Math.max(30, Math.round(durSec * fps));
  const progress = Math.min(1, Math.max(0, frame / durFrames));

  // ── Luminosity flicker ──
  const rng = createRng(frame * 7 + 42 + sceneIndex * 13);
  const flickerBase = 0.85 + rng() * 0.15;
  const heavyFlicker = rng() > 0.95 ? 0.6 + rng() * 0.3 : flickerBase;

  // ── Color bleed (warm VHS color shift) ──
  const colorTemp = `sepia(${0.15 + Math.sin(frame * 0.05) * 0.05}) saturate(${1.1 + Math.sin(frame * 0.03) * 0.15}) contrast(${1.05 + Math.sin(frame * 0.07) * 0.05})`;

  // ── Ken Burns slow drift ──
  const scale = 1.05 + progress * 0.07;
  const panX = Math.sin((frame / fps) * 0.25) * 8;
  const panY = progress * -15;

  // ── Text entrance ──
  const textEnter = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 16, stiffness: 100 },
  });

  const headline = scene?.headline || (scene as any)?.title || '';
  const vhsDate = timestamp || (scene as any)?.timestamp || `JAN.15.1997  03:${String(42 + sceneIndex * 2).padStart(2, '0')}`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0A0A0A',
        overflow: 'hidden',
        fontFamily: "'VCR OSD Mono', 'Courier New', monospace",
      }}
    >
      {/* ── MAIN CONTENT with RGB Split ── */}
      <AbsoluteFill style={{ filter: colorTemp, opacity: heavyFlicker }}>
        {/* Background Image with Ken Burns */}
        {scene?.imageUrl ? (
          <AbsoluteFill style={{ filter: 'brightness(0.6) contrast(1.25)' }}>
            <Img
              src={scene.imageUrl}
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

        {/* Headline Badge if provided */}
        {headline && (
          <div
            style={{
              position: 'absolute',
              top: isVertical ? '130px' : '65px',
              left: '25px',
              right: '25px',
              textAlign: 'center',
              zIndex: 20,
              transform: `translateY(${(1 - textEnter) * 20}px)`,
              opacity: textEnter,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                backgroundColor: 'rgba(0,0,0,0.7)',
                border: `1.5px solid ${primaryColor}`,
                padding: '6px 18px',
                color: '#FFFFFF',
                fontSize: isVertical ? '15px' : '13px',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                boxShadow: `0 0 15px ${primaryColor}55`,
              }}
            >
              {headline}
            </span>
          </div>
        )}
      </AbsoluteFill>

      {/* ── VHS OVERLAYS ── */}
      <TrackingLines frame={frame} />
      <HeadSwitchNoise frame={frame} />
      <HorizontalWarp frame={frame} />
      <FastFilmGrain frame={frame} />

      {/* ── Scan lines (subtle) ── */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.08) 1px, rgba(0,0,0,0.08) 2px)',
          pointerEvents: 'none',
          zIndex: 46,
        }}
      />

      {/* ── WORD-LEVEL SYNCHRONIZED KARAOKE CAPTIONS ── */}
      {scene && (
        <CaptionLayer
          scene={scene}
          captionStyle="retro"
          primaryColor={primaryColor}
          accentColor={accentColor}
          format={format}
        />
      )}

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

export const VHSNoirComposition: React.FC<VHSNoirProps> = (props) => {
  const { fps } = useVideoConfig();
  const scenes = props.scenes;

  if (!scenes || scenes.length === 0) {
    return <VHSNoirSceneSingle {...props} />;
  }

  let accumulatedFrames = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0A0A' }}>
      {scenes.map((scene, idx) => {
        const durSeconds = scene.durationSeconds || 5;
        const durFrames = Math.max(30, Math.round(durSeconds * fps));
        const fromFrame = accumulatedFrames;
        accumulatedFrames += durFrames;

        return (
          <Sequence
            key={`vhs_seq_${idx}_${scene.captionText?.slice(0, 10) || ''}`}
            from={fromFrame}
            durationInFrames={durFrames}
          >
            <VHSNoirSceneSingle
              {...props}
              scene={scene}
              sceneIndex={idx}
              primaryColor={props.primaryColor || '#FF0040'}
              accentColor={props.accentColor || '#FFFFFF'}
              format={props.format || 'vertical'}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const VHSNoir = VHSNoirComposition;
