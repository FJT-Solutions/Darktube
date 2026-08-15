// Ghost copies (smear-multiples) — multiple smear-frame afterimages.
// While the card sweeps sideways at speed, it trails 4 "countable" translucent full copies (each samples the
// position at current frame minus k*2 frames, evaluated from the same interpolation function, naturally
// frame-deterministic), unlike the continuous blur of motion blur. Ghosts are only visible when the body
// speed >25px/f (speed = position delta between adjacent frames).
// Key frames: 0–25 hold in left slot → 25–37 sweep 900px (inOut cubic, with 3% overshoot) →
// 35–38 ghosts lag-converge to 0 into the body + opacity to zero → 37–43 overshoot rebound → 43–130 full stillness.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card, TitleBlock } from '../../_fixtures/Fixtures';

const X0 = 240; // left slot card left edge
const X1 = 1140; // right slot card left edge (900px sweep)
const OVER = 27; // 3% overshoot
const Y = 380; // card top edge (vertically centered 1080-320)

// Body position: 25–37 high-speed sweep to the overshoot point, 37–43 rebound into place, then constant → frame-deterministic
const posAt = (f: number): number =>
  f < 37
    ? interpolate(f, [25, 37], [X0, X1 + OVER], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      })
    : interpolate(f, [37, 43], [X1 + OVER, X1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      });

const Slot: React.FC<{ x: number }> = ({ x }) => (
  <div
    style={{
      position: 'absolute',
      left: x - 20,
      top: Y - 20,
      width: 520,
      height: 360,
      border: `3px dashed ${G.bar}`,
      borderRadius: 20,
      boxSizing: 'border-box',
    }}
  />
);

export const SmearMultiples: React.FC = () => {
  const frame = useCurrentFrame();
  const bodyX = posAt(frame);
  // Body speed = position delta between adjacent frames; render ghosts only above 25px/f
  const speed = Math.abs(posAt(frame) - posAt(frame - 1));
  const speedGate = interpolate(speed, [25, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Landing converge: over frames 35–38 the ghosts lag-converge to 0 (position slides toward the body) + opacity to zero
  const cv = interpolate(frame, [35, 38], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const convergeFade = frame >= 35 ? 1 - cv : 0;

  const ghostOps = [0.45, 0.3, 0.18, 0.09];

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 120, top: 96 }}>
        <TitleBlock text="SMEAR MULTIPLES" size={54} />
      </div>
      <Slot x={X0} />
      <Slot x={X1} />
      {/* 4 ghosts: the k-th samples position at frame - k*2; during converge it shrinks to 0 via lag factor (1-cv) */}
      {ghostOps.map((baseOp, i) => {
        const k = i + 1;
        const gx = posAt(frame - k * 2 * (1 - cv));
        const op = baseOp * Math.max(speedGate, convergeFade);
        if (op <= 0.001) return null;
        return (
          <div key={k} style={{ position: 'absolute', left: gx, top: Y, opacity: op }}>
            <Card w={480} h={320} seed={5} />
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: bodyX, top: Y }}>
        <Card w={480} h={320} seed={5} />
      </div>
    </div>
  );
};
