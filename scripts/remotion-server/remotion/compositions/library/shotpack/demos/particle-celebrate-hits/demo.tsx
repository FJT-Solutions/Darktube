// confetti-crossfire — twin cannons cross-fire from both sides
// The central large KPI card scales into place (f0–14); at reveal frame f16, cannons at the
// bottom-left and bottom-right each fire 50 rectangular confetti pieces:
// closed-form trajectories (initial velocity ~18px/f + 55° spread + gravity + decay 0.9 as a
// closed-form displacement), flipping 8–15° per frame,
// mostly grayscale plus 1/3 amber. All confetti falls off-screen before ~f100 (conditionally
// unmounted on out-of-bounds), leaving true stillness ≥55f.
// Frame determinism: a sin-hash pseudo-random derives each piece's initial velocity/angle/flip
// rate; the trajectory is a pure function of age.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, TitleBlock } from '../../_fixtures/Fixtures';

const AMBER = '#b45309';
const FIRE = 16; // reveal frame = firing frame
const DECAY = 0.9;
const GRAV = 1.5; // px/f² (effective gravity; with decay the terminal fall speed = GRAV/(1-d) = 15px/f)

const frac = (x: number) => x - Math.floor(x);
const rnd = (i: number, salt: number) => frac(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453);

// closed-form decay trajectory: v ×0.9 each frame → displacement = v0·(1-d^age)/(1-d); the gravity term also accumulates along the decay sequence
const decaySum = (age: number) => (1 - Math.pow(DECAY, age)) / (1 - DECAY);

type Confetto = {
  vx: number; vy: number; w: number; h: number;
  spin: number; phase: number; amber: boolean; shade: string;
};

const makeGun = (originDeg: number, saltBase: number): Confetto[] =>
  Array.from({ length: 50 }).map((_, i) => {
    const ang = ((originDeg + (rnd(i, saltBase) - 0.5) * 55) * Math.PI) / 180;
    // with decay 0.9 the total displacement from initial velocity is only 10×v0 (velocity halves
    // every 6.6f), so 18px/f covers only 180px and is imperceptible
    // → crank it to 70–95px/f: the steepest piece peaks at y≈390 (upper third of the frame),
    // the barrage crosses the central card, and everything exits by ~f96
    const speed = 70 + rnd(i, saltBase + 1) * 25;
    const grays = ['#6d6d6b', '#8f8f8d', '#4a4a48', '#b0b0ae'];
    return {
      vx: Math.cos(ang) * speed,
      vy: -Math.sin(ang) * speed, // screen y is down-positive, so fire diagonally upward
      w: 14 + rnd(i, saltBase + 2) * 12,
      h: 8 + rnd(i, saltBase + 3) * 8,
      spin: 8 + rnd(i, saltBase + 4) * 7, // 8–15°/f
      phase: rnd(i, saltBase + 5) * 360,
      amber: rnd(i, saltBase + 6) < 1 / 3,
      shade: grays[Math.floor(rnd(i, saltBase + 7) * 4)],
    };
  });

const LEFT_GUN = makeGun(60, 3);   // bottom-left cannon aims 60° (angled to upper-right)
const RIGHT_GUN = makeGun(120, 9); // bottom-right cannon aims 120° (angled to upper-left)
const LEFT_POS = { x: 140, y: 1040 };
const RIGHT_POS = { x: 1780, y: 1040 };

export const ConfettiCrossfire: React.FC = () => {
  const frame = useCurrentFrame();
  const age = frame - FIRE;

  // KPI card scale settles in
  const cardScale = interpolate(frame, [0, 14], [0.6, 1], {
    easing: Easing.out(Easing.back(1.8)),
    extrapolateRight: 'clamp',
  });
  const cardOp = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  const renderGun = (gun: Confetto[], origin: { x: number; y: number }, keyBase: string) =>
    gun.map((c, i) => {
      if (age <= 0) return null;
      const s = decaySum(age);
      const x = origin.x + c.vx * s;
      // gravity: velocity +GRAV each frame then uniformly decayed → the displacement sum
      // approximates GRAV·(age - s·d)/(1-d);
      // instead use the exact series sum: g displacement = GRAV · Σ_{k=1..age} (1-d^k)/(1-d)
      // = GRAV·(age-(d-d^{age+1})/(1-d))/(1-d)
      const gDisp = (GRAV * (age - (DECAY - Math.pow(DECAY, age + 1)) / (1 - DECAY))) / (1 - DECAY);
      const y = origin.y + c.vy * s + gDisp;
      // unmount once off-screen (left/right also clipped)
      if (y > 1140 || x < -80 || x > 2000) return null;
      const rot = c.phase + c.spin * age;
      return (
        <div
          key={`${keyBase}${i}`}
          style={{
            position: 'absolute', left: x, top: y, width: c.w, height: c.h,
            background: c.amber ? AMBER : c.shade,
            borderRadius: 2,
            // rotateX creates a flip-card 3D rotation (width unchanged, height squashed), plus a planar rotate
            transform: `rotate(${rot}deg) rotateX(${rot * 2.3}deg)`,
          }}
        />
      );
    });

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 110, width: '100%', textAlign: 'center' }}>
        <TitleBlock text="CONFETTI CROSSFIRE" size={72} />
      </div>

      {/* central KPI card */}
      <div style={{
        position: 'absolute', left: 660, top: 400, width: 600, height: 320,
        background: G.card, border: `2px solid ${G.border}`, borderRadius: 16,
        boxSizing: 'border-box', padding: 36, boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${cardScale})`, opacity: cardOp,
      }}>
        <div style={{ height: 14, width: 220, background: G.bar, borderRadius: 7 }} />
        <div style={{
          fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 800, fontSize: 150,
          color: AMBER, letterSpacing: -3, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
        }}>
          98.5%
        </div>
        <div style={{ height: 10, width: 150, background: G.line, borderRadius: 5 }} />
      </div>

      {renderGun(LEFT_GUN, LEFT_POS, 'L')}
      {renderGun(RIGHT_GUN, RIGHT_POS, 'R')}
    </div>
  );
};
