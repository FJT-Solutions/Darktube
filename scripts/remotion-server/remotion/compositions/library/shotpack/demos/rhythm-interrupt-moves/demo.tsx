// Three-stage jump-cut punch-in (jump-cut-punch-in) — rhythm editing | Godard jump cut / documentary punch-in.
// FakeDashboard A keeps a fixed composition, transform-origin pinned to the center of the middle card in row 2
// (1070px, 817px). Three zero-tween hard cuts step up in scale: deliberately no interpolate at all,
// the switch frame lands in one frame. Each jump-cut frame stacks a 2f full-screen brightness 0.92 darkening pulse as the tick.
// Key frames: 0–34 scale 1.0 hold → frame 35 straight jump to 1.6 (35–36 darkening pulse) → hold →
// frame 70 straight jump to 2.6 (70–71 darkening pulse) → 72–134 full stillness (63f ≥45f).
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { G, FakeDashboard, TitleBlock } from '../../_fixtures/Fixtures';

// Target card (middle card in row 2 of the 3×2 grid) geometry:
// sidebar 220 + padding 36; card width (1920-220-72-56)/3 = 524.67, card height (1080-72-72-28)/2 = 454
const CARD_L = 220 + 36 + 524.67 + 28; // ≈808.67
const CARD_T = 72 + 36 + 454 + 28; // 590
const CARD_W = 524.67;
const CARD_H = 454;
const ORIGIN_X = CARD_L + CARD_W / 2; // ≈1071
const ORIGIN_Y = CARD_T + CARD_H / 2; // 817

// Three hard cuts: zero tween, one frame in place at frame 35 / frame 70
const scaleAt = (f: number): number => (f < 35 ? 1.0 : f < 70 ? 1.6 : 2.6);

// 2f darkening pulse on jump-cut frames (full-screen brightness 0.92)
const pulseAt = (f: number): number =>
  (f >= 35 && f <= 36) || (f >= 70 && f <= 71) ? 0.92 : 1;

export const JumpCutPunchIn: React.FC = () => {
  const frame = useCurrentFrame();
  const s = scaleAt(frame);
  const b = pulseAt(frame);

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: G.bg,
        position: 'relative',
        overflow: 'hidden',
        filter: `brightness(${b})`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${s})`,
          transformOrigin: `${ORIGIN_X}px ${ORIGIN_Y}px`,
        }}
      >
        <FakeDashboard variant="A" />
        {/* target card marker: scales with the composition, marks the punch-in landing point */}
        <div
          style={{
            position: 'absolute',
            left: CARD_L - 10,
            top: CARD_T - 10,
            width: CARD_W + 20,
            height: CARD_H + 20,
            border: `3px dashed ${G.mid}`,
            borderRadius: 20,
            boxSizing: 'border-box',
          }}
        />
      </div>
      {/* label doesn't scale, fixed to the top-left */}
      <div style={{ position: 'absolute', left: 260, top: 20 }}>
        <TitleBlock text="JUMP CUT PUNCH-IN" size={54} />
      </div>
    </div>
  );
};
