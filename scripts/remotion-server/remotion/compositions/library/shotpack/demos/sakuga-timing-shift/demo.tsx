// sakuga-timing-shift — from "on threes" to "on ones" (animation-timing switch)
// 0–48f: driven at q = floor(f/3)*3, the card stutter-moves from left to right (10fps flip-book feel),
// each step ≈74px + rotate wobble = the "on threes" bluntness; after the 48f switch it runs on raw f continuously,
// 48–75f smooth dash to the center (out-poly(4) high initial speed + motion stretch scaleX + ghost trail),
// overshoots 36px then rebounds into place over 3f. The "on 3s"/"on 1s" badge top-left switches per segment with line-boil
// (boil freezes after f=108). Ends with true stillness ≥40f.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card, TitleBlock } from '../../_fixtures/Fixtures';

const W = 1920;
const CARD_W = 420;
const CARD_H = 260;
const CARD_Y = (1080 - CARD_H) / 2; // 410

const X_LEFT = 120;
const X_RIGHT = 1380; // card left edge, right stopping point
const X_CENTER = (W - CARD_W) / 2; // 750, center landing
const OVERSHOOT = 36;

const SWITCH = 48; // beat-switch frame
const ARRIVE = 70; // dash reaches overshoot point
const SETTLE = 75; // rebound settle complete

// Segment 1: on threes. Position is linear but only sampled at q = floor(f/3)*3.
const pos1 = (t: number): number =>
  interpolate(t, [0, SWITCH], [X_LEFT, X_RIGHT], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// Segment 2: on ones. out-poly(4) high-speed dash → overshoot → 3f rebound.
const pos2 = (t: number): number =>
  interpolate(t, [SWITCH, ARRIVE, SETTLE], [X_RIGHT, X_CENTER - OVERSHOOT, X_CENTER], {
    easing: Easing.out(Easing.poly(4)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const SakugaTimingShift: React.FC = () => {
  const f = useCurrentFrame();
  const onThrees = f < SWITCH;

  // ---- card position ----
  const q = Math.floor(f / 3) * 3; // on-threes driver frame
  const x = onThrees ? pos1(q) : pos2(f);

  // Stutter-segment rotate wobble (frozen at q, one pose per step)
  const rot = onThrees
    ? Math.sin(q * 0.7) * 5
    : interpolate(f, [SWITCH, SWITCH + 8], [Math.sin(SWITCH * 0.7) * 5, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });

  // Dash speed (position delta, frame-time decoupled) → motion stretch
  const v = onThrees ? 0 : Math.abs(pos2(f) - pos2(f - 1));
  const sFac = Math.min(v / 55, 1);
  const stretchX = 1 + 0.35 * sFac; // peak ≈1.35, horizontal smear
  const stretchY = 1 - 0.12 * sFac;

  // Landing hard-stop rebound: 72–78f scaleX squashes then returns to 1
  const sqX = interpolate(f, [SETTLE - 3, SETTLE, SETTLE + 3], [1, 0.9, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sqY = interpolate(f, [SETTLE - 3, SETTLE, SETTLE + 3], [1, 1.07, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dash ghost trail: only mounted in segment 2 at high speed (conditional mount, no opacity-0 shell left)
  const ghosts =
    !onThrees && f > SWITCH + 1 && f < ARRIVE + 2 && sFac > 0.15
      ? [
          { xg: pos2(f - 2), op: 0.28 * sFac },
          { xg: pos2(f - 4), op: 0.13 * sFac },
        ]
      : [];

  // ---- badge "on 3s" / "on 1s", line-boil, freezes after f=108 ----
  const h = (n: number) => {
    const s = Math.sin(n * 127.3) * 43758.5453;
    return s - Math.floor(s);
  };
  const qb = Math.min(Math.floor(f / 4) * 4, 108); // boil driver frame, frozen after 108
  const bx = (h(qb + 1) - 0.5) * 7;
  const by = (h(qb + 2) - 0.5) * 7;
  const brot = (h(qb + 3) - 0.5) * 3;
  // Badge pops at the switch moment
  const pop = interpolate(f, [SWITCH, SWITCH + 3, SWITCH + 9], [1, 1.35, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleOp = interpolate(f, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 90, width: '100%', textAlign: 'center', opacity: titleOp }}>
        <TitleBlock text="SAKUGA TIMING SHIFT" size={64} />
      </div>

      {/* rail baseline + center landing dashed slot */}
      <div
        style={{
          position: 'absolute',
          left: 100,
          right: 100,
          top: CARD_Y + CARD_H + 24,
          height: 3,
          background: G.line,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: X_CENTER,
          top: CARD_Y,
          width: CARD_W,
          height: CARD_H,
          border: `3px dashed ${G.bar}`,
          borderRadius: 14,
          boxSizing: 'border-box',
        }}
      />

      {/* dash ghost trail */}
      {ghosts.map((g, i) => (
        <div
          key={`ghost-${i}`}
          style={{ position: 'absolute', left: 0, top: CARD_Y, opacity: g.op, transform: `translateX(${g.xg}px)` }}
        >
          <Card w={CARD_W} h={CARD_H} seed={4} />
        </div>
      ))}

      {/* main card */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: CARD_Y,
          transform: `translateX(${x}px) rotate(${rot}deg) scaleX(${stretchX * sqX}) scaleY(${stretchY * sqY})`,
          transformOrigin: '50% 50%',
        }}
      >
        <Card w={CARD_W} h={CARD_H} seed={4} />
      </div>

      {/* badge: on 3s / on 1s */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 160,
          transform: `translate(${bx}px, ${by}px) rotate(${brot}deg) scale(${pop})`,
          transformOrigin: '0% 50%',
          fontFamily: 'Courier New, monospace',
          fontWeight: 700,
          fontSize: 84,
          color: G.ink,
          borderBottom: `6px solid ${G.ink}`,
          paddingBottom: 6,
        }}
      >
        {onThrees ? 'on 3s' : 'on 1s'}
      </div>
    </div>
  );
};
