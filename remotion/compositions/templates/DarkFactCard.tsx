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

// ─── Danger / Creepiness Meter SVG ──────────────────────────────────────────
const DangerMeter: React.FC<{ dangerLevel: number; springP: number }> = ({
  dangerLevel,
  springP,
}) => {
  const bars = 10;
  const activeBars = Math.round(dangerLevel * Math.min(1, springP));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: '#94A3B8' }}>
        <span style={{ letterSpacing: '1px' }}>NÍVEL DE AMEAÇA</span>
        <span style={{ color: activeBars > 7 ? '#EF4444' : '#F59E0B' }}>{activeBars}/10</span>
      </div>
      <div style={{ display: 'flex', gap: '4px', height: '8px' }}>
        {Array.from({ length: bars }, (_, i) => {
          const isActive = i < activeBars;
          const color = i < 4 ? '#22C55E' : i < 7 ? '#F59E0B' : '#EF4444';
          return (
            <div
              key={i}
              style={{
                flex: 1,
                borderRadius: '2px',
                backgroundColor: isActive ? color : 'rgba(255,255,255,0.1)',
                boxShadow: isActive ? `0 0 8px ${color}` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// ─── Floating Spooky Fog Particles ──────────────────────────────────────────
const SpookyFogOverlay: React.FC<{ frame: number; primaryColor: string }> = ({
  frame,
  primaryColor,
}) => {
  const blobs = React.useMemo(() => {
    const r = createRng(66219);
    return Array.from({ length: 6 }, (_, i) => ({
      x: 10 + r() * 80,
      y: 20 + r() * 60,
      radius: 140 + r() * 180,
    }));
  }, []);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {blobs.map((b, idx) => {
        const curX = b.x + Math.sin(frame * 0.02 + idx) * 8;
        const curY = b.y + Math.cos(frame * 0.025 + idx) * 8;
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${curX}%`,
              top: `${curY}%`,
              width: `${b.radius * 2}px`,
              height: `${b.radius * 2}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${primaryColor}22 0%, transparent 70%)`,
              filter: 'blur(35px)',
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export interface DarkFactCardSingleProps {
  scene: SceneSegment;
  sceneIndex: number;
  totalScenes: number;
  primaryColor?: string;
  accentColor?: string;
  format?: 'vertical' | 'horizontal';
  showWatermark?: boolean;
  watermarkText?: string;
}

// ─── Single Fact Card Scene View ────────────────────────────────────────────
export const DarkFactCardSceneSingle: React.FC<DarkFactCardSingleProps> = ({
  scene,
  sceneIndex,
  totalScenes,
  primaryColor = '#DC2626', // Blood Crimson Red
  accentColor = '#FACC15',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'ARQUIVO CONFIDENCIAL',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const dur = scene.durationSeconds || 10;
  const totalFrames = Math.max(30, Math.round(dur * fps));
  const sceneLocalTime = frame / fps;
  const isLandscape = format === 'horizontal' || width > height;

  // Card Animation Dynamics
  const enterSpring = closedFormSpring(sceneLocalTime, 140, 20);
  const cardScale = 0.94 + enterSpring * 0.06;
  const cardTranslateY = (1 - enterSpring) * 60;

  // Fact Text & Metadata
  const factNumber = String(sceneIndex + 1).padStart(2, '0');
  const factHeadline = scene.headline || (scene as any).title || (scene.letteringLines?.[0]?.text) || 'FATO REVELADO';
  const factText = scene.captionText || 'Arquivo secreto desclassificado das operações submarinas.';
  const words = scene.words || [];
  const dangerLevel = typeof (scene as any).dangerLevel === 'number' ? (scene as any).dangerLevel : 8;

  // Background subtle zoom
  const bgScale = interpolate(frame, [0, totalFrames], [1.02, 1.14], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#04060A',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── Background Image / Atmosphere ── */}
      {scene.imageUrl ? (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <Img
            src={scene.imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${bgScale})`,
              filter: 'brightness(0.28) contrast(1.15) saturate(1.1)',
            }}
          />
        </AbsoluteFill>
      ) : null}

      {/* ── Spooky Fog and Deep Gradient ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 35%, ${primaryColor}26 0%, transparent 65%),
            radial-gradient(circle at 20% 80%, #0B1120 0%, #04060A 100%)
          `,
          opacity: scene.imageUrl ? 0.8 : 1,
        }}
      />

      <SpookyFogOverlay frame={frame} primaryColor={primaryColor} />

      {/* Screen Vignette Border */}
      <AbsoluteFill
        style={{
          boxShadow: 'inset 0 0 120px rgba(0,0,0,0.9)',
          pointerEvents: 'none',
        }}
      />

      {/* Audio narration */}
      {scene.audioUrl && <Audio src={scene.audioUrl} />}

      {/* ── Top Header Category Badge ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '24px' : '54px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '840px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '999px',
            backgroundColor: 'rgba(220, 38, 38, 0.18)',
            border: `1.5px solid ${primaryColor}`,
            color: '#F87171',
            fontWeight: 900,
            fontSize: '13px',
            letterSpacing: '2px',
          }}
        >
          <span>👁️</span>
          <span>FATO OBSCURO #{factNumber}/{totalScenes}</span>
        </div>

        <div style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 800, letterSpacing: '1px' }}>
          {scene.badgeText || (scene as any).badge || 'CLASSIFICADO // NÍVEL 5'}
        </div>
      </div>

      {/* ── Central Fact Card Container ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isLandscape ? '0 80px' : '0 24px',
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: isLandscape ? '70%' : '90%',
            maxWidth: '840px',
            borderRadius: '32px',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            border: '2px solid rgba(255,255,255,0.1)',
            boxShadow: `0 25px 70px rgba(0,0,0,0.92), 0 0 40px ${primaryColor}26`,
            padding: isLandscape ? '36px 40px' : '32px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            transform: `translateY(${cardTranslateY}px) scale(${cardScale})`,
            opacity: enterSpring,
            backdropFilter: 'blur(16px)',
            position: 'relative',
          }}
        >
          {/* Top of Card: Threat Spotlight */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '18px',
                backgroundColor: 'rgba(220, 38, 38, 0.22)',
                border: `1.5px solid ${primaryColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
                boxShadow: `0 0 20px ${primaryColor}44`,
              }}
            >
              ⚠️
            </div>
            <div>
              <span style={{ fontSize: '13px', color: '#EF4444', fontWeight: 900, letterSpacing: '1.5px' }}>
                ALERTA CONFIDENCIAL
              </span>
              <h3 style={{ margin: 0, fontSize: '22px', color: '#FFFFFF', fontWeight: 800 }}>
                {factHeadline}
              </h3>
            </div>
          </div>

          {/* Main Fact Text with Word-by-word Highlight inside Card */}
          <div style={{ minHeight: '110px' }}>
            {words.length > 0 ? (
              <p style={{ margin: 0, fontSize: isLandscape ? '28px' : '25px', lineHeight: 1.45, fontWeight: 700 }}>
                {words.map((w, wIdx) => {
                  const isWordActive = sceneLocalTime >= w.startInSeconds && sceneLocalTime <= w.endInSeconds;
                  const isPassed = sceneLocalTime > w.endInSeconds;

                  return (
                    <span
                      key={wIdx}
                      style={{
                        color: isWordActive ? '#FACC15' : isPassed ? '#FFFFFF' : '#64748B',
                        backgroundColor: isWordActive ? 'rgba(250, 204, 21, 0.2)' : 'transparent',
                        padding: isWordActive ? '2px 4px' : '0',
                        borderRadius: '4px',
                        fontWeight: isWordActive ? 900 : 700,
                        marginRight: '6px',
                        display: 'inline-block',
                        transform: isWordActive ? 'scale(1.08)' : 'none',
                        transition: 'none',
                      }}
                    >
                      {w.word}
                    </span>
                  );
                })}
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: isLandscape ? '28px' : '25px',
                  lineHeight: 1.45,
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}
              >
                {factText}
              </p>
            )}
          </div>

          {/* Danger Meter Indicator */}
          <DangerMeter dangerLevel={dangerLevel} springP={enterSpring} />

          {/* Footer Citation */}
          <div
            style={{
              paddingTop: '14px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              color: '#64748B',
            }}
          >
            <span>Fonte: Registro de Inteligência #{1000 + sceneIndex * 147}</span>
            <span style={{ color: '#FACC15', fontWeight: 800 }}>VERIFICADO ✓</span>
          </div>
        </div>
      </AbsoluteFill>

      {/* ── Word-Level Synchronized Karaoke Subtitles (Floating bottom) ── */}
      <div style={{ position: 'absolute', bottom: isLandscape ? '35px' : '55px', left: 0, right: 0, zIndex: 45 }}>
        <CaptionLayer
          scene={scene}
          captionStyle="pop"
          primaryColor={primaryColor}
          accentColor="#FFE600"
          format={format}
        />
      </div>

      {/* ── Watermark Footer ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '12px' : '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#64748B',
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '1px',
            zIndex: 50,
          }}
        >
          <span style={{ color: primaryColor }}>●</span>
          <span>{watermarkText}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Multi-Scene / Composition Wrapper ───────────────────────────────────────
export const DarkFactCardComposition: React.FC<RemotionShortProps> = (props) => {
  const { fps } = useVideoConfig();
  const scenes = props.scenes;

  if (!scenes || scenes.length === 0) {
    const fallbackScene: SceneSegment = {
      headline: props.headline || 'O VÁCUO DO ESPAÇO PROFUNDO',
      captionText: props.subheadline || 'A cada segundo, buracos negros supermassivos devoram sistemas inteiros em silêncio.',
      durationSeconds: 10,
    } as any;
    return (
      <DarkFactCardSceneSingle
        scene={fallbackScene}
        sceneIndex={0}
        totalScenes={1}
        primaryColor={props.primaryColor || '#DC2626'}
        accentColor={props.accentColor || '#FACC15'}
        format={props.format || 'vertical'}
        showWatermark={props.showWatermark}
        watermarkText={props.watermarkText || 'ARQUIVO CONFIDENCIAL'}
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
            key={`darkfact_seq_${idx}_${scene.headline || scene.captionText?.slice(0, 10)}`}
            from={fromFrame}
            durationInFrames={durFrames}
          >
            <DarkFactCardSceneSingle
              scene={scene}
              sceneIndex={idx}
              totalScenes={totalCount}
              primaryColor={props.primaryColor || '#DC2626'}
              accentColor={props.accentColor || '#FACC15'}
              format={props.format || 'vertical'}
              showWatermark={props.showWatermark}
              watermarkText={props.watermarkText || 'ARQUIVO CONFIDENCIAL'}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const DarkFactCard = DarkFactCardComposition;
