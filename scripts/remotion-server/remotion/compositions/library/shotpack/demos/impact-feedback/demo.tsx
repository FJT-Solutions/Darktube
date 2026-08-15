import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FakeDashboard, Card, TitleBlock, G } from '../../_fixtures/Fixtures';

// anime-impact anime impact frames [combination]: the 3 frames where crash-zoom slams to a stop on the target card,
// the entire frame inverts to a black-and-white negative + hand-drawn radial speed lines + red/cyan channels ±8px color split —
// the pixels got punched, and on the 4th frame everything is stripped away back to a clean close-up + a 6px decaying screen shake.
// Beat: 0–24 wide establishing hold → 24–30 crash push (6f ease-in to 2.4x) →
//       30–32 impact frames (3f negative/speed lines/RGB split, new form each frame) →
//       33 onward restore clean close-up + decaying shake → ~45–120 still hold on the card.

const ZOOM_START = 24;
const ZOOM_END = 30; // slam-stop frame
const IMPACT_LEN = 3; // impact frames last 3f (30/31/32)
const RECOVER = ZOOM_END + IMPACT_LEN; // 33: restore clean close-up

// Target card: covers grid cell 2 in the 3x2 grid (column 2, row 1)
const CARD = { x: 808, y: 108, w: 524, h: 454 };
const CX = CARD.x + CARD.w / 2; // 1070
const CY = CARD.y + CARD.h / 2; // 335
const SCALE_END = 2.4;

// seed sine hash (Math.random forbidden)
const rnd = (i: number) => {
  const s = Math.sin(i * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

// Hand-drawn radial speed lines: 30 pointed wedges from the card's rim pointing outside the frame, phase swaps the form each frame
const SpeedLines: React.FC<{ phase: number }> = ({ phase }) => {
  const cx = 960;
  const cy = 540;
  const R_OUT = 1300; // beyond the frame diagonal (~1101)
  const polys = Array.from({ length: 30 }).map((_, i) => {
    const k = i * 13 + phase * 101;
    const ang = ((i + 0.5) / 30) * Math.PI * 2 + (rnd(k) - 0.5) * 0.22;
    const r0 = 300 + rnd(k + 1) * 220; // inner end length random (around the card rim)
    const halfW = (7 + rnd(k + 2) * 16) / R_OUT; // outer-end 7–23px wedge width
    const ax = cx + Math.cos(ang) * r0;
    const ay = cy + Math.sin(ang) * r0;
    const b1x = cx + Math.cos(ang - halfW) * R_OUT;
    const b1y = cy + Math.sin(ang - halfW) * R_OUT;
    const b2x = cx + Math.cos(ang + halfW) * R_OUT;
    const b2y = cy + Math.sin(ang + halfW) * R_OUT;
    return `${ax},${ay} ${b1x},${b1y} ${b2x},${b2y}`;
  });
  return (
    <svg
      viewBox="0 0 1920 1080"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      {polys.map((pts, i) => (
        <polygon key={i} points={pts} fill={i % 4 === 0 ? '#111111' : '#f5f5f5'} />
      ))}
    </svg>
  );
};

// Target card overlay + wide base
const Scene: React.FC = () => (
  <>
    <FakeDashboard variant="A" />
    <div style={{ position: 'absolute', left: CARD.x, top: CARD.y }}>
      <Card
        w={CARD.w}
        h={CARD.h}
        seed={9}
        style={{ boxShadow: '0 10px 36px rgba(0,0,0,0.18)', border: `3px solid ${G.ink}` }}
      />
      <div style={{ position: 'absolute', left: 24, bottom: 96 }}>
        <TitleBlock text="IMPACT" size={92} />
      </div>
    </div>
  </>
);

export const AnimeImpact: React.FC = () => {
  const frame = useCurrentFrame();

  // Crash push: 6f ease-in slamming to 2.4x, pushing the card center to the frame center
  const p = interpolate(frame, [ZOOM_START, ZOOM_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const scale = 1 + p * (SCALE_END - 1);
  const tx = (960 - CX) * p;
  const ty = (540 - CY) * p;

  const impact = frame >= ZOOM_END && frame < RECOVER;
  const phase = impact ? frame - ZOOM_END : 0; // new speed-line form each frame

  // Shake after the slam-stop: starts at 6px, exponential decay, dried up after ~12f → true stillness
  const since = frame - RECOVER;
  const env = since >= 0 ? 6 * Math.exp(-since / 2.2) : 0;
  const shakeX = env * Math.sin(since * 3.7);
  const shakeY = env * 0.7 * Math.sin(since * 5.1 + 0.9);

  const zoomStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
    transformOrigin: `${CX}px ${CY}px`,
  };

  return (
    <AbsoluteFill style={{ background: impact ? '#131315' : G.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${shakeX}px, ${shakeY}px)` }}>
        {/* Main layer: entire frame as a black-and-white negative during the impact frames */}
        <div style={{ ...zoomStyle, filter: impact ? 'invert(1) grayscale(1)' : 'none' }}>
          <Scene />
        </div>
        {/* RGB split: red/cyan dual-layer negative copies, screen blend, ±8px offset (jittering with phase) */}
        {impact && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                mixBlendMode: 'screen',
                transform: `translate(-8px, ${phase % 2 === 0 ? 4 : -4}px)`,
              }}
            >
              <div style={{ ...zoomStyle, filter: 'invert(1) grayscale(1)' }}>
                <Scene />
              </div>
              <div style={{ position: 'absolute', inset: 0, background: '#ff0033', mixBlendMode: 'multiply' }} />
            </div>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                mixBlendMode: 'screen',
                transform: `translate(8px, ${phase % 2 === 0 ? -4 : 4}px)`,
              }}
            >
              <div style={{ ...zoomStyle, filter: 'invert(1) grayscale(1)' }}>
                <Scene />
              </div>
              <div style={{ position: 'absolute', inset: 0, background: '#00e5ff', mixBlendMode: 'multiply' }} />
            </div>
            {/* Hand-drawn radial speed lines: new form each frame */}
            <SpeedLines phase={phase} />
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};
