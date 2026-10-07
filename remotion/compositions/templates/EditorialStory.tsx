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

// ─── 1. Cinematic Light Leak Overlay ────────────────────────────────────────
const CinematicLightLeak: React.FC<{ frame: number; primaryColor: string }> = ({
  frame,
  primaryColor,
}) => {
  const leakX = Math.sin(frame * 0.04) * 30 + 70; // %
  const leakY = Math.cos(frame * 0.035) * 25 + 30; // %
  const leakIntensity = 0.35 + Math.sin(frame * 0.08) * 0.15;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: leakIntensity }}>
      <div
        style={{
          position: 'absolute',
          left: `${leakX}%`,
          top: `${leakY}%`,
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor}66 0%, #F59E0B33 40%, transparent 75%)`,
          filter: 'blur(60px)',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </AbsoluteFill>
  );
};

// ─── 2. Timeline Ticks (Documentary Ruler) ───────────────────────────────────
const DocumentaryTimelineTicks: React.FC<{ frame: number; totalTicks?: number }> = ({
  frame,
  totalTicks = 24,
}) => {
  const scrollY = (frame * 0.8) % 40;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '28px',
        width: '32px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        pointerEvents: 'none',
        zIndex: 25,
        opacity: 0.45,
        transform: `translateY(${scrollY}px)`,
      }}
    >
      {Array.from({ length: totalTicks }, (_, i) => {
        const isMajor = i % 4 === 0;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: isMajor ? '18px' : '8px',
                height: '1.5px',
                backgroundColor: isMajor ? '#F59E0B' : 'rgba(255,255,255,0.4)',
              }}
            />
            {isMajor && (
              <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#94A3B8' }}>
                {String(i * 10).padStart(3, '0')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── 3. Procedural Clapperboard Intro ────────────────────────────────────────
const ProceduralClapperboard: React.FC<{
  sceneLocalTime: number;
  chapterNumber: number;
}> = ({ sceneLocalTime, chapterNumber }) => {
  if (sceneLocalTime > 1.2) return null;

  const t = sceneLocalTime / 0.8;
  const clapSpring = closedFormSpring(t, 220, 24);
  const opacity = interpolate(sceneLocalTime, [0.8, 1.2], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `rgba(0,0,0,${opacity * 0.92})`,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '320px',
          border: '2px solid #FFFFFF',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#111827',
          boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
          transform: `scale(${0.9 + clapSpring * 0.1})`,
        }}
      >
        {/* Top Stripes Bar */}
        <div
          style={{
            height: '36px',
            backgroundImage:
              'repeating-linear-gradient(45deg, #FFFFFF, #FFFFFF 20px, #000000 20px, #000000 40px)',
            borderBottom: '2px solid #FFFFFF',
          }}
        />
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '2px', fontWeight: 800 }}>
            DARKTUBE ARCHIVES // SCENE REEL
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '1px' }}>
            CHAPTER {String(chapterNumber).padStart(2, '0')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#F59E0B', fontFamily: 'monospace' }}>
            <span>TAKE 01</span>
            <span>FPS: 24</span>
            <span>SYNC: OK</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export interface EditorialStorySingleProps {
  scene: SceneSegment;
  sceneIndex: number;
  totalScenes: number;
  primaryColor?: string;
  accentColor?: string;
  format?: 'vertical' | 'horizontal';
  showWatermark?: boolean;
  watermarkText?: string;
}

// ─── Single Editorial Story Scene View ───────────────────────────────────────
export const EditorialStorySceneSingle: React.FC<EditorialStorySingleProps> = ({
  scene,
  sceneIndex,
  totalScenes,
  primaryColor = '#00F0FF',
  accentColor = '#FFFFFF',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'DARKTUBE EDITORIAL',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const dur = scene.durationSeconds || 10;
  const totalFrames = Math.max(30, Math.round(dur * fps));
  const sceneLocalTime = frame / fps;
  const isLandscape = format === 'horizontal' || width > height;

  // Spring & Easing Physics
  const enterSpring = closedFormSpring(sceneLocalTime, 110, 20);
  const wipeProgress = interpolate(sceneLocalTime, [0.3, 1.3], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Camera Motion (Subtle Multi-layer Parallax)
  const backScale = 1.05 + (sceneLocalTime / dur) * 0.08;
  const backPanY = (sceneLocalTime / dur) * -20;
  const forePanY = (sceneLocalTime / dur) * -35;

  // Dynamic Vignette modulation
  const vignetteBreath = 0.75 + Math.sin(frame * 0.05) * 0.1;

  const quote = scene.headline || (scene as any).title || scene.captionText || 'A história que tentaram apagar dos livros oficiais.';
  const chapterNumber = sceneIndex + 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#04060A',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, 'Cinzel', serif",
      }}
    >
      {/* ── 1. Clapperboard Intro on Chapter start ── */}
      <ProceduralClapperboard sceneLocalTime={sceneLocalTime} chapterNumber={chapterNumber} />

      {/* ── 2. Background Layer with Ken Burns Parallax ── */}
      {scene.imageUrl ? (
        <AbsoluteFill style={{ filter: 'contrast(1.22) saturate(1.1) brightness(0.6)' }}>
          <Img
            src={scene.imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${backScale}) translateY(${backPanY}px)`,
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse at 50% 35%, #151F30 0%, #04060A 85%)',
          }}
        />
      )}


      {/* ── 3. Depth-of-Field Blur Simulation ── */}
      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 140px rgba(0, 0, 0, ${vignetteBreath})`,
          background: 'radial-gradient(circle, transparent 45%, rgba(0,0,0,0.85) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── 4. Cinematic Light Leak Overlay ── */}
      <CinematicLightLeak frame={frame} primaryColor={primaryColor} />

      {/* ── 5. Documentary Timeline Ticks ── */}
      <DocumentaryTimelineTicks frame={frame} />

      {/* ── 6. Cinematic Widescreen Letterbox Bars ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: isLandscape ? '45px' : '70px',
          backgroundColor: '#000000',
          zIndex: 35,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: isLandscape ? '45px' : '70px',
          backgroundColor: '#000000',
          zIndex: 35,
        }}
      />

      {/* ── 7. Chapter Badge Flip Counter ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '65px' : '95px',
          left: '70px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 40,
        }}
      >
        <span
          style={{
            backgroundColor: primaryColor,
            color: '#000000',
            fontWeight: 900,
            fontSize: '12px',
            padding: '3px 10px',
            borderRadius: '4px',
            letterSpacing: '1px',
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          PARTE {chapterNumber}/{totalScenes}
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '2px',
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          {scene.badgeText || (scene as any).badge || 'DOSSIÊ CONFIDENCIAL'}
        </span>
      </div>

      {/* ── 8. Editorial Typography & Quote Presentation ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: isLandscape ? '0 120px 0 100px' : '0 50px 0 70px',
          transform: `translateY(${forePanY}px)`,
          zIndex: 30,
        }}
      >
        {/* Giant Decorative Quote Mark */}
        <div
          style={{
            fontSize: isLandscape ? '120px' : '150px',
            lineHeight: 0.8,
            color: primaryColor,
            opacity: 0.35,
            fontFamily: 'Georgia, serif',
            transform: `translateY(${(1 - enterSpring) * 20}px)`,
            marginBottom: '-20px',
          }}
        >
          “
        </div>

        {/* Mask Wipe Reveal Headline */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <h1
            style={{
              margin: 0,
              fontSize: isLandscape ? '44px' : '40px',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 1.25,
              textShadow: '0 4px 25px rgba(0,0,0,0.95)',
              clipPath: `polygon(0 0, ${wipeProgress}% 0, ${wipeProgress}% 100%, 0 100%)`,
            }}
          >
            {quote}
          </h1>
        </div>

        {/* Neon Accent Underline Bar */}
        <div
          style={{
            width: `${Math.min(100, wipeProgress)}%`,
            maxWidth: '340px',
            height: '4px',
            backgroundColor: primaryColor,
            marginTop: '20px',
            boxShadow: `0 0 14px ${primaryColor}`,
            borderRadius: '2px',
          }}
        />

        {/* Author / Source attribution */}
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: enterSpring,
            transform: `translateY(${(1 - enterSpring) * 20}px)`,
          }}
        >
          <div style={{ width: '20px', height: '1px', backgroundColor: 'rgba(255,255,255,0.4)' }} />
          <span
            style={{
              color: '#94A3B8',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '13px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}
          >
            DOCUMENTO OFICIAL • REGISTRO #{200 + chapterNumber * 37}
          </span>
        </div>
      </AbsoluteFill>

      {/* ── Word-Level Synchronized Karaoke Subtitles (Floating above bottom letterbox) ── */}
      <div style={{ position: 'absolute', bottom: isLandscape ? '55px' : '85px', left: 0, right: 0, zIndex: 45 }}>
        <CaptionLayer
          scene={scene}
          captionStyle="box"
          primaryColor={primaryColor}
          accentColor="#FFE600"
          format={format}
        />
      </div>

      {/* ── 9. Brand Watermark in Bottom Bar ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '12px' : '24px',
            right: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            fontFamily: 'Montserrat, sans-serif',
            letterSpacing: '2px',
            fontWeight: 800,
            zIndex: 40,
          }}
        >
          <span style={{ color: primaryColor }}>■</span>
          <span>{watermarkText}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Multi-Scene / Composition Wrapper ───────────────────────────────────────
export const EditorialStoryComposition: React.FC<RemotionShortProps> = (props) => {
  const { fps } = useVideoConfig();
  const scenes = props.scenes;

  if (!scenes || scenes.length === 0) {
    const fallbackScene: SceneSegment = {
      headline: (props as any).headline || 'O MANUSCRITO QUE DESAFIOU O IMPÉRIO',
      captionText: (props as any).subheadline || 'Guardado sob sigilo absoluto por mais de três séculos.',
      durationSeconds: 10,
    } as any;
    return (
      <EditorialStorySceneSingle
        scene={fallbackScene}
        sceneIndex={0}
        totalScenes={1}
        primaryColor={props.primaryColor || '#00F0FF'}
        accentColor={props.accentColor || '#FFFFFF'}
        format={props.format || 'vertical'}
        showWatermark={props.showWatermark}
        watermarkText={props.watermarkText || 'DARKTUBE EDITORIAL'}
      />
    );
  }

  let accumulatedFrames = 0;
  const totalCount = scenes.length;

  return (
    <AbsoluteFill style={{ backgroundColor: '#04060A' }}>
      {scenes.map((scene, idx) => {
        const durSeconds = scene.durationSeconds || 10;
        const durFrames = Math.max(30, Math.round(durSeconds * fps));
        const fromFrame = accumulatedFrames;
        accumulatedFrames += durFrames;

        return (
          <Sequence
            key={`editorial_seq_${idx}_${scene.headline || scene.captionText?.slice(0, 10)}`}
            from={fromFrame}
            durationInFrames={durFrames}
          >
            <EditorialStorySceneSingle
              scene={scene}
              sceneIndex={idx}
              totalScenes={totalCount}
              primaryColor={props.primaryColor || '#00F0FF'}
              accentColor={props.accentColor || '#FFFFFF'}
              format={props.format || 'vertical'}
              showWatermark={props.showWatermark}
              watermarkText={props.watermarkText || 'DARKTUBE EDITORIAL'}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const EditorialStory = EditorialStoryComposition;
