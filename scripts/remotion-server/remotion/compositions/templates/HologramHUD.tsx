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

// ─── Radar Sweep Beam SVG ───────────────────────────────────────────────────
const RadarSweepBeam: React.FC<{ frame: number; primaryColor: string }> = ({
  frame,
  primaryColor,
}) => {
  const angle = (frame * 3.5) % 360;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '420px',
        height: '420px',
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        border: `1.5px dashed ${primaryColor}44`,
        pointerEvents: 'none',
      }}
    >
      {/* Concentric distance rings */}
      <div
        style={{
          position: 'absolute',
          inset: '60px',
          borderRadius: '50%',
          border: `1px solid ${primaryColor}33`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '120px',
          borderRadius: '50%',
          border: `1px solid ${primaryColor}22`,
        }}
      />

      {/* Sweep cone gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `conic-gradient(from ${angle}deg, ${primaryColor}55 0deg, transparent 65deg)`,
        }}
      />
    </div>
  );
};

// ─── Rotating 3D Wireframe Polyhedron ───────────────────────────────────────
const Wireframe3DCore: React.FC<{ frame: number; primaryColor: string }> = ({
  frame,
  primaryColor,
}) => {
  const rotX = frame * 0.8;
  const rotY = frame * 1.2;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
        transformStyle: 'preserve-3d',
        width: '160px',
        height: '160px',
        pointerEvents: 'none',
      }}
    >
      {/* Front Face */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `2px solid ${primaryColor}`,
          transform: 'translateZ(80px)',
          boxShadow: `0 0 15px ${primaryColor}44`,
        }}
      />
      {/* Back Face */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `2px solid ${primaryColor}`,
          transform: 'translateZ(-80px)',
          boxShadow: `0 0 15px ${primaryColor}44`,
        }}
      />
      {/* Left Face */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `2px solid ${primaryColor}`,
          transform: 'rotateY(90deg) translateZ(80px)',
        }}
      />
      {/* Right Face */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `2px solid ${primaryColor}`,
          transform: 'rotateY(-90deg) translateZ(80px)',
        }}
      />
      {/* Top Face */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `2px solid ${primaryColor}`,
          transform: 'rotateX(90deg) translateZ(80px)',
        }}
      />
      {/* Bottom Face */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `2px solid ${primaryColor}`,
          transform: 'rotateX(-90deg) translateZ(80px)',
        }}
      />
    </div>
  );
};

// ─── Main HologramHUD Composition ───────────────────────────────────────────
export const HologramHUDComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#06B6D4', // Sci-Fi Cyan
  accentColor = '#3B82F6',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'HOLOGRAM OS // MARK-IV',
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

  // HUD Activation Spring
  const bootSpring = closedFormSpring(sceneLocalTime, 160, 22);

  // Dynamic telemetry data
  const altitude = Math.floor(42000 + Math.sin(frame * 0.05) * 850);
  const syncRate = Math.min(100, Math.floor(bootSpring * 98.4));

  const caption = currentScene.captionText || 'SISTEMA HOLOGRÁFICO DE RECONHECIMENTO EM TEMPO REAL';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#020611',
        overflow: 'hidden',
        fontFamily: 'monospace',
      }}
    >
      {/* ── 1. Sci-Fi Hex / Grid Backdrop ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 50%, ${primaryColor}22 0%, #030B1C 60%, #020611 100%)
          `,
        }}
      />

      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── 2. Holographic Radar Sweep & 3D Core ── */}
      <RadarSweepBeam frame={frame} primaryColor={primaryColor} />
      <Wireframe3DCore frame={frame} primaryColor={primaryColor} />

      {/* ── 3. Crosshairs & Coordinate Callouts ── */}
      {/* Center Target Lock */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '60px',
          height: '60px',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, width: '12px', height: '2px', backgroundColor: primaryColor }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '2px', height: '12px', backgroundColor: primaryColor }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '12px', height: '2px', backgroundColor: primaryColor }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '2px', height: '12px', backgroundColor: primaryColor }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '12px', height: '2px', backgroundColor: primaryColor }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '2px', height: '12px', backgroundColor: primaryColor }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '2px', backgroundColor: primaryColor }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '2px', height: '12px', backgroundColor: primaryColor }} />
      </div>

      {/* ── 4. Telemetry Glass Cards ── */}
      {/* Top Left Card */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '30px' : '60px',
          left: '36px',
          padding: '14px 20px',
          borderRadius: '12px',
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          border: `1px solid ${primaryColor}44`,
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          fontSize: '12px',
          color: primaryColor,
          transform: `translateX(${(1 - bootSpring) * -40}px)`,
          opacity: bootSpring,
        }}
      >
        <span style={{ fontWeight: 900 }}>TELEMETRY STATUS</span>
        <span style={{ color: '#FFFFFF' }}>ALT: {altitude} M</span>
        <span style={{ color: '#FFFFFF' }}>SYNC: {syncRate}%</span>
      </div>

      {/* Top Right Card */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '30px' : '60px',
          right: '36px',
          padding: '14px 20px',
          borderRadius: '12px',
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          border: `1px solid ${primaryColor}44`,
          backdropFilter: 'blur(8px)',
          textAlign: 'right',
          fontSize: '12px',
          color: primaryColor,
          transform: `translateX(${(1 - bootSpring) * 40}px)`,
          opacity: bootSpring,
        }}
      >
        <span style={{ fontWeight: 900 }}>AI TARGETING SYSTEM</span>
        <div style={{ color: '#10B981', fontWeight: 800 }}>LOCK: CONFIRMED</div>
        <div style={{ color: '#94A3B8' }}>FPS: 30.00 STABLE</div>
      </div>

      {/* ── 5. Main Center Caption Box ── */}
      <div
        style={{
          position: 'absolute',
          bottom: isLandscape ? '40px' : '90px',
          left: '50%',
          transform: `translateX(-50%) translateY(${(1 - bootSpring) * 30}px)`,
          width: '88%',
          maxWidth: '820px',
          padding: '24px 30px',
          borderRadius: '18px',
          backgroundColor: 'rgba(2, 6, 17, 0.88)',
          border: `1.5px solid ${primaryColor}`,
          boxShadow: `0 15px 40px rgba(0,0,0,0.8), 0 0 30px ${primaryColor}33`,
          backdropFilter: 'blur(12px)',
          textAlign: 'center',
          opacity: bootSpring,
          zIndex: 40,
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: primaryColor,
            fontWeight: 900,
            letterSpacing: '2px',
            marginBottom: '8px',
          }}
        >
          // HOLOGRAM READOUT //
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: isLandscape ? '30px' : '26px',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.3,
            textShadow: `0 0 14px ${primaryColor}`,
          }}
        >
          {caption}
        </h2>
      </div>

      {/* ── 6. Brand Watermark ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(6, 182, 212, 0.6)',
            fontSize: '12px',
            letterSpacing: '2px',
            fontWeight: 800,
            zIndex: 50,
          }}
        >
          {watermarkText}
        </div>
      )}
    </AbsoluteFill>
  );
};
