import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';

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

// ─── Main LoopEngineering Composition ───────────────────────────────────────
export const LoopEngineeringComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#EC4899', // Radiant Pink
  accentColor = '#8B5CF6',  // Cyber Purple
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'PERFECT SATISFYING LOOP',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const time = frame / fps;

  // Perfect 4.0-second seamless loop math
  const LOOP_DURATION = 4.0;
  const loopT = (time % LOOP_DURATION) / LOOP_DURATION; // 0.0 -> 1.0
  const loopAngle = loopT * 360;

  // Concentric Mandala Rings
  const ringCount = 8;
  const colorShift = (frame * 1.5) % 360;

  // Scale Breathing
  const breathe = Math.sin(loopT * Math.PI * 2) * 0.12;

  const currentScene = scenes[0] || ({} as SceneSegment);
  const caption = currentScene.captionText || 'GEOMETRIA HIPNÓTICA EM LOOP PERFEITO';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#040308',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Hypnotic Ambient Radial Glow ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 50%, hsl(${colorShift}, 75%, 20%) 0%, #040308 75%)
          `,
        }}
      />

      {/* ── 2. Satisfying Rotating Mandala Rings ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${1 + breathe})`,
        }}
      >
        <svg width="600" height="600" viewBox="0 0 600 600">
          {Array.from({ length: ringCount }, (_, i) => {
            const radius = 40 + i * 32;
            const rot = (i % 2 === 0 ? 1 : -1) * loopAngle * (1 + i * 0.2);
            const strokeColor = `hsl(${(colorShift + i * 25) % 360}, 85%, 65%)`;

            return (
              <g key={i} transform={`rotate(${rot} 300 300)`}>
                <circle
                  cx="300"
                  cy="300"
                  r={radius}
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeDasharray={`${12 + i * 4} ${8 + i * 2}`}
                  fill="none"
                  opacity={0.8}
                />
                {/* Orbiting Satellite Dots on each ring */}
                <circle
                  cx={300 + radius}
                  cy="300"
                  r="5"
                  fill="#FFFFFF"
                  style={{ filter: `drop-shadow(0 0 8px ${strokeColor})` }}
                />
              </g>
            );
          })}

          {/* Central Pulsing Sacred Geometry Core */}
          <polygon
            points="300,260 335,280 335,320 300,340 265,320 265,280"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            transform={`rotate(${-loopAngle * 2} 300 300)`}
          />
          <circle cx="300" cy="300" r="14" fill="#FFFFFF" style={{ filter: 'drop-shadow(0 0 12px #FFFFFF)' }} />
        </svg>
      </AbsoluteFill>

      {/* ── 3. Bottom Caption Overlay ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '820px',
          textAlign: 'center',
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '4px 16px',
            borderRadius: '999px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '12px',
            letterSpacing: '2px',
            marginBottom: '10px',
          }}
        >
          SEAMLESS ASMR
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 900,
            color: '#FFFFFF',
            textShadow: '0 0 20px rgba(236, 72, 153, 0.6)',
          }}
        >
          {caption}
        </h2>
      </div>

      {/* ── 4. Brand Watermark ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            top: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.6)',
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
