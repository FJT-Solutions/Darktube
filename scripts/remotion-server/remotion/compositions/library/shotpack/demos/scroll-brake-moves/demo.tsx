// combo: long-list hard brake × reticle lock (brake-reticle-lock)
// The changelog list rushes upward at high speed (accelerating sprint → 9f hard deceleration with
// a 30px overshoot bounce-back); on the hard-brake frame (BRAKE=59), four L-shaped corner brackets
// fly in from all four sides off-screen in the same frame, back-out overshooting into a lock on
// the four corners of the stopped row; the row highlights in sync while a small tag pops out on
// its right.
// The combo's linchpin: the corner lock frame and the list brake frame must resonate on the same
// frame (both jump at f=59); staggering them degrades the effect.
// Keyframes: 0–12 initial rest → 12–50 accelerating sprint (blur during the fast segment) →
// 50–59 hard deceleration with overshoot → 59 hard brake + corners fly in → 59–72 lock
// bounce-back/highlight/tag → 75–150 true stillness, 75f.
// Frame-deterministic, no randomness.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';

const SCROLL_START = 12;
const BRAKE = 59;
const DUR = 150;

const PITCH = 156; // row height 120 + gap 36
const ROW_H = 120;
const TARGET_ROW = 30;
const FINAL_SCROLL = TARGET_ROW * PITCH - 480; // the stopped row's top lands at screen y=480
const LIST_X = 360;
const LIST_W = 1200;

// scroll position: 12–50 accelerating sprint (sin-in, ever faster) → 50–59 hard deceleration
// overshooting by 30px → 59–63 bounce-back to rest. Frame 59 is the hard-brake frame (first stop
// / reversal).
const scrollAt = (f: number): number => {
  if (f <= SCROLL_START) return 0;
  if (f <= 50) {
    return interpolate(f, [SCROLL_START, 50], [0, FINAL_SCROLL - 430], {
      easing: Easing.in(Easing.sin),
    });
  }
  if (f <= BRAKE) {
    return interpolate(f, [50, BRAKE], [FINAL_SCROLL - 430, FINAL_SCROLL + 30], {
      easing: Easing.out(Easing.cubic),
    });
  }
  return interpolate(f, [BRAKE, BRAKE + 4], [FINAL_SCROLL + 30, FINAL_SCROLL], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
};

// one changelog row: icon block + title bar + date bar at the end, widths derived from the row index (frame-deterministic)
const Row: React.FC<{ i: number; highlight: number }> = ({ i, highlight }) => (
  <div
    style={{
      position: 'absolute',
      top: i * PITCH,
      left: 0,
      width: LIST_W,
      height: ROW_H,
      background: highlight > 0 ? '#ffffff' : G.card,
      border: `${highlight > 0 ? 3 : 2}px solid ${highlight > 0 ? G.ink : G.border}`,
      borderRadius: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      padding: '0 28px',
      boxSizing: 'border-box',
      boxShadow: highlight > 0 ? `0 10px 34px rgba(0,0,0,${0.2 * highlight})` : 'none',
    }}
  >
    <div style={{ width: 44, height: 44, borderRadius: 10, background: G.mid }} />
    <div style={{ height: 14, width: `${28 + ((i * 31) % 34)}%`, background: G.bar, borderRadius: 7 }} />
    <div style={{ height: 10, width: `${12 + ((i * 17) % 18)}%`, background: G.line, borderRadius: 5 }} />
    <div style={{ marginLeft: 'auto', height: 12, width: 120, background: G.line, borderRadius: 6 }} />
  </div>
);

// L-shaped corner bracket: a right angle of two thick edges
const Corner: React.FC<{ flip: [number, number]; style: React.CSSProperties }> = ({ flip, style }) => (
  <div style={{ position: 'absolute', width: 46, height: 46, transform: `scale(${flip[0]}, ${flip[1]})`, ...style }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 46, height: 8, background: G.ink, borderRadius: 3 }} />
    <div style={{ position: 'absolute', left: 0, top: 0, width: 8, height: 46, background: G.ink, borderRadius: 3 }} />
  </div>
);

export const BrakeReticleLock: React.FC = () => {
  const f = useCurrentFrame();
  const scroll = scrollAt(f);

  // speed-based blur: derived from adjacent-frame displacement, fully blurred during the sprint, sharp the moment it stops
  const v = Math.abs(scroll - scrollAt(Math.max(0, f - 1)));
  const blur = Math.min(v * 0.12, 24);

  // from the hard-brake frame: highlight 0→1 (6f), tag pops at 63f
  const highlight = interpolate(f, [BRAKE, BRAKE + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // corners: fly in from all four sides on the same hard-brake frame, back-out overshoot into lock (59–68f)
  const lockT = interpolate(f, [BRAKE, BRAKE + 9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(2.4)),
  });
  const fly = 1 - lockT; // 1=off-screen 0=locked in place

  // stopped row's screen coordinates (top=480 after settling)
  const rowTop = TARGET_ROW * PITCH - scroll;
  const GAP = 10; // lock position: brackets extend 10px outside the corners
  const rect = { x: LIST_X - GAP, y: rowTop - GAP, w: LIST_W + GAP * 2, h: ROW_H + GAP * 2 };

  const corners: Array<{ x: number; y: number; fromX: number; fromY: number; flip: [number, number] }> = [
    { x: rect.x - 23, y: rect.y - 23, fromX: -620, fromY: -320, flip: [1, 1] },
    { x: rect.x + rect.w - 23, y: rect.y - 23, fromX: 620, fromY: -320, flip: [-1, 1] },
    { x: rect.x - 23, y: rect.y + rect.h - 23, fromX: -620, fromY: 320, flip: [1, -1] },
    { x: rect.x + rect.w - 23, y: rect.y + rect.h - 23, fromX: 620, fromY: 320, flip: [-1, -1] },
  ];

  // small tag: pops from the row's right side at 63f (overshoot)
  const tagT = interpolate(f, [BRAKE + 4, BRAKE + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(2.6)),
  });

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      {/* top bar (doesn't scroll) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 72, background: G.panel, borderBottom: `2px solid ${G.line}`, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 20, boxSizing: 'border-box', zIndex: 3 }}>
        <div style={{ height: 18, width: 220, background: G.bar, borderRadius: 9 }} />
        <div style={{ marginLeft: 'auto', width: 36, height: 36, borderRadius: 18, background: G.mid }} />
      </div>

      {/* changelog list: rushes upward as a whole, blurred during the fast segment */}
      <div style={{ position: 'absolute', left: LIST_X, top: 0, width: LIST_W, height: 1080, filter: blur > 0.5 ? `blur(${blur}px)` : 'none' }}>
        <div style={{ position: 'absolute', top: -scroll, left: 0, width: LIST_W, height: 40 * PITCH }}>
          {Array.from({ length: 38 }).map((_, i) => (
            <Row key={i} i={i} highlight={i === TARGET_ROW ? highlight : 0} />
          ))}
        </div>
      </div>

      {/* reticle corners: mounted on the same hard-brake frame (the combo's linchpin: resonating with the stop) */}
      {f >= BRAKE &&
        corners.map((c, i) => (
          <Corner
            key={i}
            flip={c.flip}
            style={{ left: c.x + c.fromX * fly, top: c.y + c.fromY * fly, opacity: Math.min(1, lockT * 3 + 0.35) }}
          />
        ))}

      {/* side tag pop-out */}
      {f >= BRAKE + 4 && (
        <div
          style={{
            position: 'absolute',
            left: rect.x + rect.w + 28,
            top: rect.y + rect.h / 2 - 27,
            transform: `scale(${tagT})`,
            transformOrigin: 'left center',
            padding: '12px 26px',
            borderRadius: 27,
            background: G.ink,
            color: '#ffffff',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: 0.5,
          }}
        >
          v2.41
        </div>
      )}
    </div>
  );
};
