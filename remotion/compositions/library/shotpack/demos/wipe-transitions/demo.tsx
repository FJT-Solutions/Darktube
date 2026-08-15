// blinds-slice — staggered vertical-blind wipe
// FakeDashboard A → B. 12 vertical strips of 160px, left to right with delay = column × 2f,
// each strip completes its flip in 10f: inside a strip, A's scaleX 1→0 (origin left
// edge) and B's scaleX 0→1 (origin right edge) share the same progress p
// (Easing.in(cubic)); the seam between them is always at x+160(1-p), so there's no
// mathematical gap. A bright seam line (soft glow + dark outline + white core)
// sweeps along with the wave.
// Wave 20–52f; from 52f the wrapper is removed (full-page B renders directly, all
// strip structure and seam lines unmount), 52–150f true stillness 98f ≥ 40f. Frame-deterministic, no random source.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';

const STRIPS = 12;
const W = 160; // strip width, 12×160 = 1920
const WAVE_START = 20;
const STAGGER = 2; // column × 2f
const FLIP = 10; // each strip completes its flip in 10f
const WAVE_END = WAVE_START + (STRIPS - 1) * STAGGER + FLIP; // 52

// A page's slice inside a strip: outer 160-wide crop, inner full-page 1920 aligned with negative margin
const Slice: React.FC<{ x: number; variant: 'A' | 'B' }> = ({ x, variant }) => (
  <div style={{ width: 1920, height: 1080, marginLeft: -x }}>
    <FakeDashboard variant={variant} />
  </div>
);

export const BlindsSlice: React.FC = () => {
  const frame = useCurrentFrame();

  // Wrapper removal: once the wave completes all strip structure unmounts and B renders full-page directly
  if (frame >= WAVE_END) {
    return (
      <AbsoluteFill style={{ background: '#ececea' }}>
        <FakeDashboard variant="B" />
      </AbsoluteFill>
    );
  }

  const seams: { x: number; opacity: number }[] = [];

  const strips = Array.from({ length: STRIPS }).map((_, i) => {
    const x = i * W;
    const start = WAVE_START + i * STAGGER;
    const end = start + FLIP;

    // Not started: pure A slice; completed: pure B slice
    if (frame < start) {
      return (
        <div key={i} style={{ position: 'absolute', left: x, top: 0, width: W, height: 1080, overflow: 'hidden' }}>
          <Slice x={x} variant="A" />
        </div>
      );
    }
    if (frame >= end) {
      return (
        <div key={i} style={{ position: 'absolute', left: x, top: 0, width: W, height: 1080, overflow: 'hidden' }}>
          <Slice x={x} variant="B" />
        </div>
      );
    }

    // Flipping: A and B share the same progress p — A's width 160(1-p) sits left,
    // B's width 160p sits right, the junction is always x+160(1-p), no gap
    const p = interpolate(frame, [start, end], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.cubic),
    });

    // Seam bright line: 2f linear fade in/out on each side
    const seamOpacity = Math.min(
      interpolate(frame, [start, start + 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      interpolate(frame, [end - 2, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    );
    seams.push({ x: x + W * (1 - p), opacity: seamOpacity });

    return (
      <div key={i} style={{ position: 'absolute', left: x, top: 0, width: W, height: 1080, overflow: 'hidden' }}>
        {/* A: shrinks toward the left edge */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: `scaleX(${1 - p})`, transformOrigin: '0% 50%' }}>
          <Slice x={x} variant="A" />
        </div>
        {/* B: expands from the right edge */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: `scaleX(${p})`, transformOrigin: '100% 50%' }}>
          <Slice x={x} variant="B" />
        </div>
      </div>
    );
  });

  return (
    <AbsoluteFill style={{ background: '#ececea' }}>
      {strips}
      {/* Seam bright line: white-background precedent — pure brightening is invisible, so soft glow + dark outline + white core in three layers */}
      {seams.length > 0 && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {seams.map((s, i) => (
            <g key={i} opacity={s.opacity}>
              <line x1={s.x} y1={0} x2={s.x} y2={1080} stroke="rgba(255,255,255,0.45)" strokeWidth={16} />
              <line x1={s.x} y1={0} x2={s.x} y2={1080} stroke="rgba(0,0,0,0.55)" strokeWidth={6} />
              <line x1={s.x} y1={0} x2={s.x} y2={1080} stroke="rgba(255,255,255,0.95)" strokeWidth={3} />
            </g>
          ))}
        </svg>
      )}
    </AbsoluteFill>
  );
};
