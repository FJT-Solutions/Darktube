// Letter drop physics (letter-drop-physics) — FallingLetterAnimation.
// "GRAVITY"'s 7 characters are each absolutely positioned; character i starts falling at frame 10+i*5:
// ① gravity-accelerated drop y = D*(t/24)^2, 720px down to the baseline (the floor line is visible);
// ② after landing, 2 decaying bounces (heights 30% / 9%, parabolic 4u(1-u) segments),
//    rotating to a small seed-hash ±6° tilt at the landing instant and holding it;
// ③ at frame 110 one beat: 6f ease-out snaps everything back in line (rotate→0, offset→0, scale 1.06→1),
//    ending with true stillness at frames 116–150 (≥25f).
import React from 'react';
import { useCurrentFrame, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';

// Deterministic pseudo-random
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const WORD = 'GRAVITY';
const SLOT_W = 150; // per-character slot width
const FONT = 140;
const WORD_W = WORD.length * SLOT_W; // 1050
const LEFT = (1920 - WORD_W) / 2; // 435
const REST_TOP = 452; // character's top after settling
const FLOOR_Y = REST_TOP + 152; // floor line (visual baseline)

const DROP = 720; // drop distance
const T_FALL = 24; // frames to reach the baseline
const T_B1 = 16; // first bounce duration (height 30%)
const T_B2 = 8; // second bounce duration (height 9%)
const SNAP = 110; // the snap-back beat
const SNAP_DUR = 6;

const easeOutCubic = Easing.out(Easing.cubic);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Per-character vertical offset (relative to baseline, negative = above)
const dropY = (t: number): number => {
  if (t <= 0) return -DROP;
  if (t < T_FALL) return -DROP + DROP * (t / T_FALL) ** 2; // gravity acceleration
  if (t < T_FALL + T_B1) {
    const u = (t - T_FALL) / T_B1;
    return -DROP * 0.3 * 4 * u * (1 - u); // bounce 1: 30%
  }
  if (t < T_FALL + T_B1 + T_B2) {
    const u = (t - T_FALL - T_B1) / T_B2;
    return -DROP * 0.09 * 4 * u * (1 - u); // bounce 2: 9%
  }
  return 0;
};

export const LetterDropPhysics: React.FC = () => {
  const frame = useCurrentFrame();
  // Snap-back progress starting at frame 110
  const snap = easeOutCubic(clamp01((frame - SNAP) / SNAP_DUR));

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, overflow: 'hidden', position: 'relative' }}>
      {/* Floor line: the visual baseline where characters land */}
      <div style={{ position: 'absolute', left: LEFT - 60, top: FLOOR_Y, width: WORD_W + 120, height: 6, background: G.bar, borderRadius: 3 }} />

      {WORD.split('').map((ch, i) => {
        const start = 10 + i * 5;
        const t = frame - start;
        const y = dropY(t);
        // Tilts to a small seed angle (±6°) at the landing instant; 0 before landing
        const tiltTarget = (h(i + 1) - 0.5) * 12;
        const landP = clamp01((t - T_FALL) / 6);
        const restJitter = (h(i + 11) - 0.5) * 10; // ±5px vertical offset after settling
        // Snap beat: tilt and offset zero out in unison, scale 1.06→1 pulse
        const rot = tiltTarget * landP * (1 - snap);
        const jitter = restJitter * landP * (1 - snap);
        const scale = frame < SNAP ? 1 : 1 + 0.06 * (1 - snap);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: LEFT + i * SLOT_W,
              top: REST_TOP,
              width: SLOT_W,
              height: FONT,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              transform: `translateY(${y + jitter}px) rotate(${rot}deg) scale(${scale})`,
              transformOrigin: '50% 100%',
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontWeight: 800,
              fontSize: FONT,
              lineHeight: 1,
              color: G.ink,
            }}
          >
            {ch}
          </div>
        );
      })}
    </div>
  );
};
