import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
  Sequence,
  Audio,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';
import { CaptionLayer } from '../CaptionLayer';

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

// ─── 1. Starfield Warp Particles (Traveling towards camera) ─────────────────
interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
}

const StarfieldWarp: React.FC<{ frame: number; primaryColor: string }> = ({
  frame,
  primaryColor,
}) => {
  const stars: Star[] = React.useMemo(() => {
    const r = createRng(88291);
    return Array.from({ length: 64 }, () => ({
      x: (r() - 0.5) * 1400,
      y: (r() - 0.5) * 1400,
      z: r() * 1000,
      size: 2 + r() * 4,
      color: r() > 0.4 ? primaryColor : '#FFFFFF',
    }));
  }, [primaryColor]);

  const speed = 12;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {stars.map((s, idx) => {
        const curZ = ((s.z - frame * speed) % 1000 + 1000) % 1000;
        const depthFactor = 1 - curZ / 1000;
        const scale = depthFactor * 3.5;
        const projX = (s.x / (curZ + 100)) * 600;
        const projY = (s.y / (curZ + 100)) * 600;
        const opacity = depthFactor * 0.85;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: `${s.size}px`,
              height: `${s.size}px`,
              borderRadius: '50%',
              backgroundColor: s.color,
              boxShadow: `0 0 8px ${s.color}`,
              opacity,
              transform: `translate(-50%, -50%) translate(${projX}px, ${projY}px) scale(${scale})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ─── 2. Perspective Tunnel Lines ────────────────────────────────────────────
const TunnelPerspectiveLines: React.FC<{ frame: number; primaryColor: string }> = ({
  frame,
  primaryColor,
}) => {
  const lineCount = 12;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: lineCount }, (_, i) => {
          const baseAngle = (i / lineCount) * Math.PI * 2 + frame * 0.005;
          const length = 1200;
          const x2 = Math.cos(baseAngle) * length;
          const y2 = Math.sin(baseAngle) * length;

          return (
            <line
              key={i}
              x1="50%"
              y1="50%"
              x2={`calc(50% + ${x2}px)`}
              y2={`calc(50% + ${y2}px)`}
              stroke={primaryColor}
              strokeWidth="1.5"
              strokeDasharray="8 12"
              opacity="0.25"
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// ─── 3. Text Orbit in 3D Space ──────────────────────────────────────────────
const OrbitingKeywords: React.FC<{
  words: string[];
  frame: number;
  primaryColor: string;
}> = ({ words, frame, primaryColor }) => {
  const radius = 300;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        pointerEvents: 'none',
        transformStyle: 'preserve-3d',
      }}
    >
      {words.map((w, idx) => {
        const angle = (idx / words.length) * Math.PI * 2 + frame * 0.03;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * 180;
        const y = Math.sin(angle * 2) * 40;
        const scale = interpolate(z, [-180, 180], [0.75, 1.25]);
        const opacity = interpolate(z, [-180, 180], [0.4, 1]);

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) scale(${scale})`,
              color: '#FFFFFF',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 900,
              fontSize: '16px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              textShadow: `0 0 12px ${primaryColor}`,
              opacity,
              whiteSpace: 'nowrap',
            }}
          >
            {w}
          </div>
        );
      })}
    </div>
  );
};

export interface InfiniteZoomSingleProps {
  scene: SceneSegment;
  sceneIndex: number;
  totalScenes: number;
  primaryColor?: string;
  accentColor?: string;
  format?: 'vertical' | 'horizontal';
  showWatermark?: boolean;
  watermarkText?: string;
}

// ─── Single Infinite Zoom Scene View ─────────────────────────────────────────
export const InfiniteZoomSceneSingle: React.FC<InfiniteZoomSingleProps> = ({
  scene,
  sceneIndex,
  totalScenes,
  primaryColor = '#818CF8', // Futuristic Indigo
  accentColor = '#EC4899',  // Vibrant Pink
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'INFINITE PORTAL',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const dur = scene.durationSeconds || 10;
  const time = frame / fps;
  const isLandscape = format === 'horizontal' || width > height;

  // Seamless Exponential Portal Loop
  const LOOP_DURATION = 3.5;
  const loopProgress = (time % LOOP_DURATION) / LOOP_DURATION;

  // 6 Concentric Rings with logarithmic scale progression
  const rings = [0, 1, 2, 3, 4, 5].map((index) => {
    const prog = (loopProgress + index * (1 / 6)) % 1;
    const scale = Math.pow(10, prog * 2.2 - 1.1);
    const opacity = Math.sin(Math.PI * prog);
    const hueShift = (index * 45 + frame * 0.8) % 360;
    return { index, scale, opacity, hueShift, prog };
  });

  // Center Gravity Vortex breathing
  const vortexPulse = Math.sin(frame * 0.12) * 15;
  const vortexRot = frame * 1.5;

  // Keywords orbiting
  const rawKeywords = (scene as any).keywords || (scene.letteringLines ? scene.letteringLines.map(l => l.text) : null);
  const keywords = rawKeywords && rawKeywords.length > 0 ? rawKeywords : ['SINGULARIDADE', 'FRACTAL', 'HORIZONTE', 'DIMENSÃO'];

  const caption = scene.headline || (scene as any).title || scene.captionText || 'VIAJANDO ALÉM DOS LIMITES CONHECIDOS';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#020308',
        overflow: 'hidden',
        perspective: '1200px',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Cosmic Background & Deep Singularity ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 50%, #1E1B4B 0%, #060913 60%, #020308 100%)
          `,
        }}
      />

      {/* Perspective Tunnel Grid Lines */}
      <TunnelPerspectiveLines frame={frame} primaryColor={primaryColor} />

      {/* Starfield Particles traveling toward viewer */}
      <StarfieldWarp frame={frame} primaryColor={primaryColor} />


      {/* ── 2. Concentric Portal Rings & Fractal Shards ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
        }}
      >
        {rings.map(({ index, scale, opacity, hueShift }) => {
          const ringColor = `hsl(${hueShift}, 85%, 65%)`;

          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                width: isLandscape ? '650px' : '550px',
                height: isLandscape ? '650px' : '550px',
                borderRadius: index % 2 === 0 ? '50%' : '30%',
                border: `2px solid ${ringColor}`,
                boxShadow: `0 0 40px ${ringColor}66, inset 0 0 25px ${ringColor}33`,
                transform: `scale(${scale}) rotate(${vortexRot + index * 30}deg)`,
                opacity: Math.max(0, Math.min(1, opacity)),
                pointerEvents: 'none',
              }}
            >
              {/* Picture-in-Picture artwork layer */}
              {scene.imageUrl && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '16px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    opacity: 0.35,
                  }}
                >
                  <Img
                    src={scene.imageUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: `rotate(${-vortexRot}deg)`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Center Gravitational Vortex Core */}
        <div
          style={{
            width: `${140 + vortexPulse}px`,
            height: `${140 + vortexPulse}px`,
            borderRadius: '50%',
            backgroundColor: '#000000',
            border: `3px solid ${primaryColor}`,
            boxShadow: `0 0 50px ${primaryColor}, inset 0 0 30px ${accentColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 0 35px #FFFFFF',
              transform: `scale(${0.8 + Math.sin(frame * 0.2) * 0.2})`,
            }}
          />
        </div>

        {/* Orbiting 3D Keywords */}
        <OrbitingKeywords words={keywords} frame={frame} primaryColor={primaryColor} />
      </AbsoluteFill>

      {/* ── 3. Chromatic Aberration Vignette (RGB split illusion) ── */}
      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 100px rgba(0,0,0,0.9), inset 0 0 30px ${accentColor}33`,
          pointerEvents: 'none',
          zIndex: 40,
        }}
      />

      {/* ── 4. Cinematic Caption Overlay ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '24px' : '52px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'inline-block',
          padding: '6px 18px',
          borderRadius: '999px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          border: `1.5px solid ${primaryColor}`,
          color: '#FFFFFF',
          fontSize: '12px',
          fontWeight: 900,
          letterSpacing: '2.5px',
          textTransform: 'uppercase',
          backdropFilter: 'blur(8px)',
          zIndex: 50,
        }}
      >
        PORTAL VÓRTICE • ETAPA {sceneIndex + 1}/{totalScenes}
      </div>

      {/* ── Word-Level Synchronized Karaoke Subtitles ── */}
      <div style={{ position: 'absolute', bottom: isLandscape ? '45px' : '75px', left: 0, right: 0, zIndex: 45 }}>
        <CaptionLayer
          scene={scene}
          captionStyle="pop"
          primaryColor={primaryColor}
          accentColor="#FFE600"
          format={format}
        />
      </div>

      {/* ── 5. Brand Watermark ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '14px' : '22px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#94A3B8',
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '2px',
            zIndex: 50,
          }}
        >
          <span style={{ color: primaryColor }}>✦</span>
          <span>{watermarkText}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Multi-Scene / Composition Wrapper ───────────────────────────────────────
export const InfiniteZoomComposition: React.FC<RemotionShortProps> = (props) => {
  const { fps } = useVideoConfig();
  const scenes = props.scenes;

  if (!scenes || scenes.length === 0) {
    const fallbackScene: SceneSegment = {
      headline: (props as any).headline || 'A SINGULARIDADE DO TEMPO',
      captionText: (props as any).subheadline || 'Mergulhando pelas camadas cósmicas do hiperespaço.',
      durationSeconds: 10,
    } as any;
    return (
      <InfiniteZoomSceneSingle
        scene={fallbackScene}
        sceneIndex={0}
        totalScenes={1}
        primaryColor={props.primaryColor || '#818CF8'}
        accentColor={props.accentColor || '#EC4899'}
        format={props.format || 'vertical'}
        showWatermark={props.showWatermark}
        watermarkText={props.watermarkText || 'INFINITE PORTAL'}
      />
    );
  }

  let accumulatedFrames = 0;
  const totalCount = scenes.length;

  return (
    <AbsoluteFill style={{ backgroundColor: '#020308' }}>
      {scenes.map((scene, idx) => {
        const durSeconds = scene.durationSeconds || 10;
        const durFrames = Math.max(30, Math.round(durSeconds * fps));
        const fromFrame = accumulatedFrames;
        accumulatedFrames += durFrames;

        return (
          <Sequence
            key={`zoom_seq_${idx}_${scene.headline || scene.captionText?.slice(0, 10)}`}
            from={fromFrame}
            durationInFrames={durFrames}
          >
            <InfiniteZoomSceneSingle
              scene={scene}
              sceneIndex={idx}
              totalScenes={totalCount}
              primaryColor={props.primaryColor || '#818CF8'}
              accentColor={props.accentColor || '#EC4899'}
              format={props.format || 'vertical'}
              showWatermark={props.showWatermark}
              watermarkText={props.watermarkText || 'INFINITE PORTAL'}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const InfiniteZoom = InfiniteZoomComposition;
