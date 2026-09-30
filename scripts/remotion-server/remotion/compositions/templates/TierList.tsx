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

// ─── Sparkle Burst for S-Tier ───────────────────────────────────────────────
const SparkleTierBurst: React.FC<{ frame: number; primaryColor: string }> = ({
  frame,
  primaryColor,
}) => {
  const sparkles = React.useMemo(() => {
    const r = createRng(77218);
    return Array.from({ length: 24 }, (_, i) => ({
      x: 10 + r() * 80,
      y: 10 + r() * 80,
      delay: r() * 50,
      size: 4 + r() * 8,
    }));
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {sparkles.map((s, idx) => {
        const localFrame = (frame + s.delay) % 45;
        const opacity = Math.sin((localFrame / 45) * Math.PI);
        const scale = 0.5 + opacity * 0.9;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              backgroundColor: '#FDE047',
              borderRadius: '50%',
              boxShadow: `0 0 10px #FDE047, 0 0 20px ${primaryColor}`,
              opacity,
              transform: `scale(${scale})`,
            }}
          />
        );
      })}
    </div>
  );
};

export interface TierDef {
  grade: string;
  name: string;
  color: string;
  bgGrad: string;
  items: string[];
}

export interface TierListSingleProps {
  scene: SceneSegment;
  sceneIndex: number;
  totalScenes: number;
  primaryColor?: string;
  accentColor?: string;
  format?: 'vertical' | 'horizontal';
  showWatermark?: boolean;
  watermarkText?: string;
}

// ─── Single TierList Scene View ─────────────────────────────────────────────
export const TierListSceneSingle: React.FC<TierListSingleProps> = ({
  scene,
  sceneIndex,
  totalScenes,
  primaryColor = '#FF0055',
  accentColor = '#FACC15',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'DARK TIER LIST',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const dur = scene.durationSeconds || 10;
  const totalFrames = Math.max(30, Math.round(dur * fps));
  const sceneLocalTime = frame / fps;
  const isLandscape = format === 'horizontal' || width > height;

  // Grade definitions
  const tiers: TierDef[] = [
    { grade: 'S', name: 'DEUS', color: '#EF4444', bgGrad: 'rgba(239, 68, 68, 0.22)', items: ['Elite Absoluta'] },
    { grade: 'A', name: 'EXCELENTE', color: '#F97316', bgGrad: 'rgba(249, 115, 22, 0.16)', items: ['Altíssimo Nível'] },
    { grade: 'B', name: 'BOM', color: '#FACC15', bgGrad: 'rgba(250, 204, 21, 0.14)', items: ['Consistente'] },
    { grade: 'C', name: 'MÉDIO', color: '#22C55E', bgGrad: 'rgba(34, 197, 94, 0.12)', items: ['Aceitável'] },
    { grade: 'D', name: 'LIXO', color: '#3B82F6', bgGrad: 'rgba(59, 130, 246, 0.12)', items: ['Descartável'] },
  ];

  // Resolve target tier for this scene (default: alternate or read from props)
  const targetGrade = (scene as any).targetTier || (scene as any).tier || (sceneIndex === 0 ? 'S' : sceneIndex === 1 ? 'A' : sceneIndex === 2 ? 'S' : 'B');
  const targetTierIndex = Math.max(0, tiers.findIndex((t) => t.grade === targetGrade));

  const itemName = scene.headline || (scene as any).title || (scene.letteringLines?.[0]?.text) || 'ITEM EM ANÁLISE';

  // Item drop spring: starts at 0.5s into the scene
  const dropSpring = closedFormSpring(sceneLocalTime - 0.5, 150, 20);

  // Background subtle zoom
  const bgScale = interpolate(frame, [0, totalFrames], [1.02, 1.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#090C15',
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
              filter: 'brightness(0.3) saturate(1.2) contrast(1.1)',
            }}
          />
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 50% 20%, #151D30 0%, #080B14 85%)',
          opacity: scene.imageUrl ? 0.75 : 1,
        }}
      />

      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.6,
        }}
      />

      {/* Audio narration */}
      {scene.audioUrl && <Audio src={scene.audioUrl} />}

      {/* ── Top Header ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '24px' : '52px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '880px',
          textAlign: 'center',
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '5px 16px',
            borderRadius: '999px',
            backgroundColor: '#1E293B',
            border: '1.5px solid #334155',
            color: '#FACC15',
            fontWeight: 800,
            fontSize: '13px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          TIER LIST OFICIAL • #{sceneIndex + 1}/{totalScenes}
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: isLandscape ? '32px' : '30px',
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
          }}
        >
          {scene.badgeText || (scene as any).badge || 'CLASSIFICANDO AGORA'}
        </h1>
      </div>

      {/* ── Tier Rows Board ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '120px' : '150px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '880px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 30,
        }}
      >
        {tiers.map((tier, idx) => {
          const isTargetTier = idx === targetTierIndex;
          const rowDelay = idx * 0.05;
          const rowSpring = closedFormSpring(sceneLocalTime - rowDelay, 160, 24);

          return (
            <div
              key={tier.grade}
              style={{
                display: 'flex',
                height: isLandscape ? '64px' : '58px',
                borderRadius: '14px',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                border: `1.5px solid ${isTargetTier && dropSpring >= 0.8 ? tier.color : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isTargetTier && dropSpring >= 0.8 ? `0 0 25px ${tier.color}55` : 'none',
                overflow: 'hidden',
                transform: `translateX(${(1 - rowSpring) * -40}px)`,
                opacity: rowSpring,
                position: 'relative',
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Grade Header Column */}
              <div
                style={{
                  width: '70px',
                  backgroundColor: tier.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#000000',
                  boxShadow: `inset -2px 0 10px rgba(0,0,0,0.3)`,
                }}
              >
                {tier.grade}
              </div>

              {/* Items Area */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 14px',
                  gap: '10px',
                  backgroundColor: tier.bgGrad,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {tier.grade === 'S' && isTargetTier && dropSpring >= 0.8 && (
                  <SparkleTierBurst frame={frame} primaryColor={tier.color} />
                )}

                {/* Pre-existing items */}
                {tier.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#E2E8F0',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    {item}
                  </div>
                ))}

                {/* Placed Target Item with Gravity Drop */}
                {isTargetTier && dropSpring >= 0.8 && (
                  <div
                    style={{
                      padding: '5px 14px',
                      borderRadius: '8px',
                      backgroundColor: tier.color,
                      color: '#000000',
                      fontSize: '14px',
                      fontWeight: 900,
                      boxShadow: `0 0 16px ${tier.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🔥</span>
                    <span>{itemName}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Floating Preview Card Stage (Before Landing) ── */}
      {dropSpring < 0.8 && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '60px' : '150px',
            left: '50%',
            transform: `translateX(-50%) translateY(${dropSpring * -160}px) scale(${1 - dropSpring * 0.25})`,
            padding: '16px 32px',
            borderRadius: '20px',
            backgroundColor: '#0F172A',
            border: `2.5px solid ${accentColor}`,
            boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 35px rgba(250, 204, 21, 0.45)',
            color: '#FFFFFF',
            fontSize: '22px',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 60,
          }}
        >
          <span>🎯</span>
          <span>{itemName}</span>
        </div>
      )}

      {/* ── Word-Level Synchronized Karaoke Subtitles ── */}
      <div style={{ position: 'absolute', bottom: isLandscape ? '40px' : '65px', left: 0, right: 0, zIndex: 45 }}>
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
            bottom: isLandscape ? '12px' : '22px',
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
export const TierListComposition: React.FC<RemotionShortProps> = (props) => {
  const { fps } = useVideoConfig();
  const scenes = props.scenes;

  if (!scenes || scenes.length === 0) {
    const fallbackScene: SceneSegment = {
      headline: props.headline || 'INTELIGÊNCIA ARTIFICIAL GERAL',
      captionText: props.subheadline || 'Atingindo o nível cognitivo supremo que transforma toda a civilização humana.',
      durationSeconds: 10,
      targetTier: 'S',
    } as any;
    return (
      <TierListSceneSingle
        scene={fallbackScene}
        sceneIndex={0}
        totalScenes={1}
        primaryColor={props.primaryColor || '#FF0055'}
        accentColor={props.accentColor || '#FACC15'}
        format={props.format || 'vertical'}
        showWatermark={props.showWatermark}
        watermarkText={props.watermarkText || 'DARK TIER LIST'}
      />
    );
  }

  let accumulatedFrames = 0;
  const totalCount = scenes.length;

  return (
    <AbsoluteFill style={{ backgroundColor: '#090C15' }}>
      {scenes.map((scene, idx) => {
        const durSeconds = scene.durationSeconds || 10;
        const durFrames = Math.max(30, Math.round(durSeconds * fps));
        const fromFrame = accumulatedFrames;
        accumulatedFrames += durFrames;

        return (
          <Sequence
            key={`tier_seq_${idx}_${scene.headline || scene.captionText?.slice(0, 10)}`}
            from={fromFrame}
            durationInFrames={durFrames}
          >
            <TierListSceneSingle
              scene={scene}
              sceneIndex={idx}
              totalScenes={totalCount}
              primaryColor={props.primaryColor || '#FF0055'}
              accentColor={props.accentColor || '#FACC15'}
              format={props.format || 'vertical'}
              showWatermark={props.showWatermark}
              watermarkText={props.watermarkText || 'DARK TIER LIST'}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const TierList = TierListComposition;
