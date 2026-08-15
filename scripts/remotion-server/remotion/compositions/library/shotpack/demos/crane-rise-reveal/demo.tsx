// Crane-rise reveal (crane-rise-reveal) — crane shot.
// World = FakeDashboard(B), a five-row list. Camera transform-origin top-left; linkage formula:
// translate = screen center - aim point * scale (the aim point always lands at screen center).
// Frames 0–20 hold on the bottom-row close-up (scale 3.2, aimed at the row-5 icon + bar);
// frames 20–120 scale 3.2→1 with aim point (520,958)→(960,540), Easing.out(quad) decelerating rise;
// each time the view's top edge crosses a row's top edge, that row pulses a dark beat (4f rise, 18f fall) reading as "inrush"; frames 120–150 full-frame true stillness.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';

const HOLD = 20; // opening close-up hold
const MOVE_END = 120; // camera move ends; true stillness from here on
const ease = Easing.out(Easing.quad);

// FakeDashboard(B) row geometry: sidebar 220 + content padding 36, header 72, 5 rows gap 20
const ROW_LEFT = 220 + 36;
const ROW_W = 1920 - ROW_LEFT - 36;
const ROW_H = (1080 - 72 - 72 - 4 * 20) / 5; // 171.2
const rowTop = (i: number) => 72 + 36 + i * (ROW_H + 20);

const F0 = { x: 520, y: rowTop(4) + ROW_H / 2 }; // start aim: bottom-most row (icon + title-bar area)
const F1 = { x: 960, y: 540 }; // end aim: center of the whole page
const S0 = 3.2;

const camAt = (frame: number) => {
  const p = Math.min(1, Math.max(0, (frame - HOLD) / (MOVE_END - HOLD)));
  const e = ease(p);
  const s = S0 + (1 - S0) * e;
  const fx = F0.x + (F1.x - F0.x) * e;
  const fy = F0.y + (F1.y - F0.y) * e;
  return { s, tx: 960 - fx * s, ty: 540 - fy * s, visTop: fy - 540 / s };
};

// Pulse trigger frame per row: when the view's top edge first crosses that row's top edge (the bottom row is already in frame at the start → triggers as soon as the move begins)
const triggers = Array.from({ length: 5 }, (_, i) => {
  for (let f = HOLD; f <= MOVE_END; f++) {
    if (camAt(f).visTop <= rowTop(i) + 1) return f;
  }
  return MOVE_END;
});

export const CraneRiseReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { s, tx, ty } = camAt(frame);

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: G.bg,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 1920,
          height: 1080,
          transformOrigin: '0 0',
          transform: `translate(${tx}px, ${ty}px) scale(${s})`,
        }}
      >
        <FakeDashboard variant="B" />
        {triggers.map((t, i) => {
          const op = interpolate(frame, [t, t + 4, t + 22], [0, 0.22, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          if (op <= 0.001) return null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: ROW_LEFT,
                top: rowTop(i),
                width: ROW_W,
                height: ROW_H,
                borderRadius: 14,
                background: G.ink,
                opacity: op,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
