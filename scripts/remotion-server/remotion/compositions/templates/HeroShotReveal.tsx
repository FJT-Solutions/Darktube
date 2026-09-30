import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
  Easing,
  Sequence,
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

// ─── 1. Particle Burst System ───────────────────────────────────────────────
interface BurstParticle {
  angle: number;
  speed: number;
  size: number;
  color: string;
  delay: number;
  rotationSpeed: number;
}

const ParticleBurst: React.FC<{
  frame: number;
  revealFrame: number;
  primaryColor: string;
  accentColor: string;
}> = ({ frame, revealFrame, primaryColor, accentColor }) => {
  const elapsed = frame - revealFrame;
  if (elapsed < 0 || elapsed > 75) return null;

  const rng = createRng(998244353);
  const particles: BurstParticle[] = React.useMemo(() => {
    const r = createRng(88102);
    return Array.from({ length: 18 }, (_, i) => ({
      angle: (i / 18) * Math.PI * 2 + (r() - 0.5) * 0.3,
      speed: 120 + r() * 420,
      size: 4 + r() * 8,
      color: r() > 0.4 ? primaryColor : r() > 0.2 ? accentColor : '#FACC15',
      delay: r() * 5,
      rotationSpeed: (r() - 0.5) * 12,
    }));
  }, [primaryColor, accentColor]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p, idx) => {
        const pElapsed = elapsed - p.delay;
        if (pElapsed < 0) return null;
        const t = pElapsed / 60;
        const progress = closedFormSpring(t, 90, 18);
        const distance = p.speed * progress;
        const gravity = progress * progress * 80;
        const x = Math.cos(p.angle) * distance;
        const y = Math.sin(p.angle) * distance + gravity;
        const opacity = Math.max(0, 1 - progress * 1.2);
        const scale = (1 - progress * 0.4) * (p.size / 6);
        const rot = pElapsed * p.rotationSpeed;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: '46%',
              left: '50%',
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: idx % 3 === 0 ? '50%' : '2px',
              backgroundColor: p.color,
              boxShadow: `0 0 12px ${p.color}`,
              opacity,
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ─── 2. Halo Breathing Rings ────────────────────────────────────────────────
const HaloBreathingRings: React.FC<{
  frame: number;
  primaryColor: string;
  isRevealed: boolean;
}> = ({ frame, primaryColor, isRevealed }) => {
  const breath = Math.sin(frame * 0.07) * 0.08;
  const pulse = Math.cos(frame * 0.05) * 10;

  return (
    <div
      style={{
        position: 'absolute',
        top: '44%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '760px',
        height: '760px',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {[0, 1, 2].map((ringIdx) => {
        const ringScale = 0.85 + ringIdx * 0.28 + breath * (ringIdx + 1);
        const ringOpacity = isRevealed
          ? (0.28 - ringIdx * 0.08) * (0.8 + Math.sin(frame * 0.09 + ringIdx) * 0.2)
          : 0.05;

        return (
          <div
            key={ringIdx}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: `2px solid ${primaryColor}`,
              boxShadow: `0 0 ${40 + pulse * 2}px ${primaryColor}44, inset 0 0 ${20 + pulse}px ${primaryColor}22`,
              transform: `scale(${ringScale}) rotate(${frame * (0.2 * (ringIdx % 2 === 0 ? 1 : -1))}deg)`,
              opacity: ringOpacity,
              transition: 'opacity 0.6s ease',
            }}
          />
        );
      })}
    </div>
  );
};

// ─── 3. Fragmentation Assembly Shards ───────────────────────────────────────
const FragmentAssembly: React.FC<{
  progress: number;
  frame: number;
  primaryColor: string;
}> = ({ progress, frame, primaryColor }) => {
  // Dispersed shards gathering into the main frame
  if (progress >= 0.98) return null;

  const shards = [
    { x: -280, y: -220, rot: -45, scale: 0.4 },
    { x: 290, y: -200, rot: 50, scale: 0.5 },
    { x: -320, y: 190, rot: -30, scale: 0.45 },
    { x: 310, y: 210, rot: 40, scale: 0.55 },
    { x: 0, y: -340, rot: -15, scale: 0.6 },
    { x: 0, y: 350, rot: 25, scale: 0.5 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {shards.map((s, idx) => {
        const shardProgress = Math.min(1, progress * 1.25);
        const currentX = s.x * (1 - shardProgress);
        const currentY = s.y * (1 - shardProgress);
        const currentRot = s.rot * (1 - shardProgress) + Math.sin(frame * 0.2 + idx) * 3;
        const currentScale = s.scale + shardProgress * (1 - s.scale);
        const opacity = Math.max(0, (1 - shardProgress) * 0.85);

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: '30%',
              left: '25%',
              width: '50%',
              height: '40%',
              border: `1.5px solid ${primaryColor}88`,
              backgroundColor: 'rgba(15,23,42,0.65)',
              boxShadow: `0 0 15px ${primaryColor}30`,
              transform: `translate(${currentX}px, ${currentY}px) rotate(${currentRot}deg) scale(${currentScale})`,
              opacity,
              borderRadius: '24px',
            }}
          />
        );
      })}
    </div>
  );
};

// ─── 4. Specular Reflection Floor ───────────────────────────────────────────
const SpecularFloor: React.FC<{
  imageUrl?: string;
  primaryColor: string;
  springP: number;
  rotX: number;
}> = ({ primaryColor, springP, rotX }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '62%',
        left: '50%',
        width: '90%',
        maxWidth: '860px',
        height: '380px',
        transform: `translateX(-50%) perspective(1200px) rotateX(${Math.max(45, 75 - rotX * 0.5)}deg)`,
        transformOrigin: 'top center',
        opacity: springP * 0.45,
        pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 0%, ${primaryColor}55 0%, ${primaryColor}18 50%, transparent 80%)`,
      }}
    />
  );
};

// ─── 5. Floating Badge with Spring Recoil ────────────────────────────────────
const FloatingHeroBadge: React.FC<{
  text: string;
  badgeColor?: string;
  frame: number;
  revealFrame: number;
}> = ({ text, badgeColor = '#FACC15', frame, revealFrame }) => {
  const elapsed = Math.max(0, frame - revealFrame - 10);
  const t = elapsed / 30;
  const enterSpring = closedFormSpring(t, 210, 20);
  const floatWobble = Math.sin(frame * 0.12) * 5;
  const rotWobble = Math.cos(frame * 0.08) * 3;

  if (elapsed === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '6%',
        right: '6%',
        padding: '12px 24px',
        borderRadius: '999px',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        border: `2px solid ${badgeColor}`,
        boxShadow: `0 8px 30px rgba(0,0,0,0.6), 0 0 25px ${badgeColor}66`,
        color: '#FFFFFF',
        fontFamily: 'Montserrat, Inter, sans-serif',
        fontWeight: 900,
        fontSize: '22px',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transform: `translateY(${floatWobble}px) rotate(${rotWobble}deg) scale(${enterSpring})`,
        transformOrigin: 'top right',
        zIndex: 50,
      }}
    >
      <span style={{ color: badgeColor, fontSize: '26px' }}>✦</span>
      <span>{text}</span>
    </div>
  );
};


// ─── Single HeroShot Scene (isolated within Sequence) ────────────────────────
const HeroShotSceneSingle: React.FC<{
  scene: SceneSegment;
  sceneIndex: number;
  primaryColor: string;
  accentColor: string;
  format: string;
  showWatermark: boolean;
  watermarkText: string;
}> = ({
  scene,
  sceneIndex,
  primaryColor,
  accentColor,
  format,
  showWatermark,
  watermarkText,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const time = frame / fps;
  const dur = scene.durationSeconds || 5;
  const durFrames = Math.max(30, Math.round(dur * fps));
  const isLandscape = format === 'horizontal' || width > height;

  // Keyframe Physics
  const enterSpring = closedFormSpring(time, 145, 22);
  const revealProgress = Math.min(1, enterSpring);

  // Parallax & 3D Tilt Mechanics
  const mouseMockPanX = Math.sin(frame * 0.04) * 4;
  const mouseMockPanY = Math.cos(frame * 0.035) * 3;
  const rotX = (1 - enterSpring) * 18 + mouseMockPanY;
  const rotY = (1 - enterSpring) * -14 + (time / dur) * 5 + mouseMockPanX;
  const cardScale = isLandscape
    ? 0.85 + enterSpring * 0.15 + (time / dur) * 0.02
    : 0.82 + enterSpring * 0.18 + (time / dur) * 0.025;
  const translateY = (1 - enterSpring) * 90;

  // Dynamic Border Glow Loop (Rotating angle)
  const borderAngle = (frame * 3.5) % 360;

  // Shimmer Reveal Flash traveling across
  const shimmerPos = interpolate(time, [0.15, 0.95], [-40, 140], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dynamic Shadow based on tilt
  const shadowX = -rotY * 4;
  const shadowY = 35 + rotX * 3;
  const shadowBlur = 60 + (1 - enterSpring) * 30;

  const captionText = scene.captionText || '';
  const badgeText = scene.badgeText || (scene.letteringLines?.[0]?.badge) || 'EXCLUSIVE REVEAL';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#030509',
        overflow: 'hidden',
        perspective: '1400px',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Environmental Glow Backdrop ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 42%, ${primaryColor}38 0%, ${accentColor}18 45%, #030509 85%)`,
          opacity: 0.75 + Math.sin(frame * 0.06) * 0.15,
        }}
      />

      {/* ── 2. Atmospheric Grid with Depth ── */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          opacity: 0.6,
          transform: `perspective(1000px) rotateX(25deg) translateY(${frame * 0.4 % 48}px)`,
          transformOrigin: 'center center',
        }}
      />

      {/* ── 3. Halo Breathing Concentric Rings ── */}
      <HaloBreathingRings
        frame={frame}
        primaryColor={primaryColor}
        isRevealed={enterSpring > 0.4}
      />

      {/* ── 4. Specular Floor Reflection ── */}
      <SpecularFloor
        imageUrl={scene.imageUrl}
        primaryColor={primaryColor}
        springP={enterSpring}
        rotX={rotX}
      />

      {/* ── 5. Particle Burst on Reveal Moment ── */}
      <ParticleBurst
        frame={frame}
        revealFrame={3}
        primaryColor={primaryColor}
        accentColor={accentColor}
      />

      {/* ── 6. Central Hero Card Assembly ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `perspective(1400px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${cardScale}) translateY(${translateY}px)`,
          transformStyle: 'preserve-3d',
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: isLandscape ? '68%' : '84%',
            maxWidth: isLandscape ? '1180px' : '840px',
            height: isLandscape ? '66%' : '60%',
            maxHeight: isLandscape ? '760px' : '1150px',
            borderRadius: '40px',
            position: 'relative',
            boxShadow: `${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, 0.9), 0 0 65px ${primaryColor}40`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Border Glow Loop Gradient */}
          <div
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: '43px',
              background: `conic-gradient(from ${borderAngle}deg, ${primaryColor}, ${accentColor}, transparent 45%, ${primaryColor})`,
              zIndex: 1,
              opacity: enterSpring,
            }}
          />

          {/* Inner Card Wrapper */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '40px',
              backgroundColor: '#0A0F1D',
              overflow: 'hidden',
              zIndex: 2,
            }}
          >
            {/* Shard Assembly on entry */}
            <FragmentAssembly
              progress={revealProgress}
              frame={frame}
              primaryColor={primaryColor}
            />

            {/* Main Visual or Dynamic Artwork */}
            {scene.imageUrl ? (
              <Img
                key={scene.imageUrl}
                src={scene.imageUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: `scale(${1.08 - (time / dur) * 0.06})`,
                  filter: `contrast(1.08) brightness(${0.9 + enterSpring * 0.15})`,
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, ${primaryColor}33 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {/* Fallback procedural emblem */}
                <svg width="220" height="220" viewBox="0 0 200 200">
                  <polygon
                    points="100,20 180,65 180,155 100,195 20,65"
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth="3"
                    strokeDasharray="8 4"
                    transform={`rotate(${frame * 0.6} 100 100)`}
                  />
                  <polygon
                    points="100,45 155,75 155,140 100,170 45,140 45,75"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="2"
                    transform={`rotate(${frame * -0.9} 100 100)`}
                  />
                </svg>
              </div>
            )}

            {/* Diagonal Shimmer Flash Light Sweep */}
            <div
              style={{
                position: 'absolute',
                top: '-40%',
                left: `${shimmerPos}%`,
                width: '120px',
                height: '180%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                transform: 'rotate(25deg)',
                pointerEvents: 'none',
                zIndex: 4,
              }}
            />

            {/* Gradient Scrim for Typography Legibility */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(5,8,22,0.95) 0%, rgba(5,8,22,0.45) 50%, transparent 80%)',
                zIndex: 5,
              }}
            />

            {/* Floating Cyber Badge */}
            {badgeText && (
              <FloatingHeroBadge
                text={badgeText}
                badgeColor={accentColor}
                frame={frame}
                revealFrame={3}
              />
            )}

            {/* Dynamic Typography Layout */}
            <div
              style={{
                position: 'absolute',
                bottom: isLandscape ? '28px' : '36px',
                left: isLandscape ? '32px' : '40px',
                right: isLandscape ? '32px' : '40px',
                zIndex: 10,
              }}
            >
              {scene.letteringLines && scene.letteringLines.length > 0 ? (
                scene.letteringLines.map((line, idx) => {
                  const lineSpring = closedFormSpring(time - idx * 0.12, 160, 20);
                  return (
                    <div
                      key={idx}
                      style={{
                        fontSize: isLandscape ? '38px' : '46px',
                        fontWeight: 900,
                        color: line.isHighlight ? (line.highlightColor || primaryColor) : '#FFFFFF',
                        lineHeight: 1.15,
                        textTransform: 'uppercase',
                        letterSpacing: '-0.5px',
                        textShadow: '0 4px 18px rgba(0,0,0,0.85)',
                        transform: `translateY(${(1 - lineSpring) * 35}px)`,
                        opacity: lineSpring,
                      }}
                    >
                      {line.text}
                    </div>
                  );
                })
              ) : scene.headline ? (
                <div
                  style={{
                    fontSize: isLandscape ? '36px' : '48px',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    lineHeight: 1.15,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.5px',
                    textShadow: '0 4px 20px rgba(0,0,0,0.95)',
                    opacity: enterSpring,
                    transform: `translateY(${(1 - enterSpring) * 25}px)`,
                  }}
                >
                  {scene.headline}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: isLandscape ? '34px' : '42px',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    lineHeight: 1.2,
                    textTransform: 'uppercase',
                    textShadow: '0 4px 20px rgba(0,0,0,0.9)',
                    opacity: enterSpring,
                    transform: `translateY(${(1 - enterSpring) * 25}px)`,
                  }}
                >
                  {captionText || 'CINEMATIC HERO SHOT'}
                </div>
              )}
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* ── Word-synced Karaoke Subtitles (Viral Grade 10 Standard) ── */}
      <CaptionLayer
        scene={scene}
        primaryColor={primaryColor}
        accentColor={accentColor}
        format={format}
        localFrame={frame}
        durationFrames={durFrames}
      />

      {/* ── 7. Top & Bottom Cinematographic Accents ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            top: '38px',
            left: '42px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 40,
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: primaryColor,
              boxShadow: `0 0 10px ${primaryColor}`,
            }}
          />
          <span
            style={{
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '2.5px',
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase',
            }}
          >
            {watermarkText}
          </span>
        </div>
      )}

      {/* Subtle Frame Jitter on Trauma/Impact */}
      <div
        style={{
          position: 'absolute',
          bottom: '25px',
          right: '35px',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'monospace',
          letterSpacing: '1px',
          zIndex: 40,
        }}
      >
        HERO_ENGINE // V2.0.4
      </div>
    </AbsoluteFill>
  );
};

// ─── Main HeroShotReveal Multi-Scene Composition ─────────────────────────────
export const HeroShotRevealComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#8B5CF6',
  accentColor = '#06B6D4',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'DarkTube HeroShot',
}) => {
  const { fps } = useVideoConfig();

  const safeScenes = scenes.length > 0 ? scenes : [{
    index: 0,
    captionText: 'CINEMATIC HERO SHOT REVEAL',
    durationSeconds: 5,
  }];

  let accumulatedFrames = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#030509' }}>
      {safeScenes.map((scene, idx) => {
        const durSeconds = scene.durationSeconds || 5;
        const durFrames = Math.max(30, Math.round(durSeconds * fps));
        const fromFrame = accumulatedFrames;
        accumulatedFrames += durFrames;

        return (
          <Sequence
            key={`${idx}_${scene.imageUrl || scene.captionText?.slice(0, 10) || ''}`}
            from={fromFrame}
            durationInFrames={durFrames}
          >
            <HeroShotSceneSingle
              scene={scene}
              sceneIndex={idx}
              primaryColor={primaryColor}
              accentColor={accentColor}
              format={format}
              showWatermark={showWatermark}
              watermarkText={watermarkText}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
