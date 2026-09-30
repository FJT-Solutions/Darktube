// Landing impact kit (impact-burst-kit) — a combined variant of shockwave-ring + particle-burst.
// The landing frame of the main card slamming down simultaneously triggers: a shockwave ring expansion + 14-particle radial burst + a shake,
// and on the frame the shockwave front sweeps over the neighboring left/right cards (computed by radius-distance = 3f after landing) those cards get
// pushed outward and spring back — "the wave hits the neighbors" is the evidence that the two vocabulary terms weld together.
// Keyframes: 0–14 side cards hold on stage while the main card hovers at scale 1.8 / y -120 → 14–20 main card slams down in 6f with acceleration →
// 20 landing frame: ring 80→900px (14f out-cubic, op .75→0) + 14 particles scatter 160–340px (22f)
//   + 4f shake at 6px decay + main card 6f squash-and-bounce → 23 ring front passes the neighbor cards (center distance 460px):
//   neighbors pushed outward 30px + rotate ±3° damped oscillation bounce-back (clamped to 0 within 40f) → 63–140 fully static (77f).
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card, TitleBlock } from '../../_fixtures/Fixtures';

// Pseudo-random (frame-deterministic)
const h = (n: number): number => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const CW = 400;
const CH = 280;
const GAP = 60;
const X_L = (1920 - (CW * 3 + GAP * 2)) / 2; // 300
const Y = (1080 - CH) / 2; // 400
const CX = 960; // main card center
const CY = Y + CH / 2; // 540

const IMPACT = 20; // landing frame
// Shockwave: 80→900px over 14f out-cubic. The frame the front reaches the neighbor's center distance of 460px:
// (460-80)/820=0.463 → 1-(1-p)^3 → p≈0.19 → t≈2.6f → take 3f after landing = frame 23
const HIT_NEIGHBOR = IMPACT + 3;

// 14 particles: mixed squares/circles, angles biased upward, scatter 160–340px with decelerating shrink-and-fade
const PARTICLES = Array.from({ length: 14 }).map((_, i) => ({
  angle: -Math.PI / 2 + (h(i + 1) - 0.5) * Math.PI * 1.7, // upper hemisphere dominant
  dist: 160 + h(i + 40) * 180,
  size: 8 + h(i + 80) * 10,
  square: i % 2 === 0,
}));

// Neighbor-card push-out damped oscillation envelope: jumps to 1 instantly at t=0, then cosine-decays back, clamped to 0 after 40f to keep true stillness
const pushEnv = (f: number): number => {
  const t = f - HIT_NEIGHBOR;
  if (t < 0 || t >= 40) return 0;
  return Math.cos(t * 0.5) * Math.exp(-t / 8);
};

export const ImpactBurstKit: React.FC = () => {
  const frame = useCurrentFrame();

  // ── Main card slam: 14–20f scale 1.8→1 / y -120→0, accelerating entrance
  const dropP = interpolate(frame, [14, IMPACT], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const mainScale = interpolate(dropP, [0, 1], [1.8, 1]);
  const mainDy = interpolate(dropP, [0, 1], [-120, 0]);
  // 6f squash-and-bounce after landing (squash & stretch)
  const sq = interpolate(frame, [IMPACT, IMPACT + 3, IMPACT + 6], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const mainSx = mainScale * (1 + 0.07 * sq);
  const mainSy = mainScale * (1 - 0.1 * sq);

  // ── ① Shockwave ring: radius 80→900 over 14f, opacity 0.75→0
  const ringP = interpolate(frame, [IMPACT, IMPACT + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const ringR = interpolate(ringP, [0, 1], [80, 900]);
  const ringOp = frame >= IMPACT && frame < IMPACT + 14 ? 0.75 * (1 - ringP) : 0;

  // ── ② Particles: 22f from landing, decelerating scatter + shrink + fade
  const pT = interpolate(frame, [IMPACT, IMPACT + 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const particlesAlive = frame >= IMPACT && frame < IMPACT + 22;

  // ── ③ Neighbor cards pushed outward 30px + rotate ±3°, damped bounce-back
  const env = pushEnv(frame);
  const pushX = 30 * env;
  const pushRot = 3 * env;

  // ── ④ Shake: 4f from landing, 6px decay (h pseudo-random direction, frame-deterministic)
  let shakeX = 0;
  let shakeY = 0;
  if (frame >= IMPACT && frame < IMPACT + 4) {
    const amp = 6 * (1 - (frame - IMPACT) / 4);
    shakeX = (h(frame * 3.7) - 0.5) * 2 * amp;
    shakeY = (h(frame * 7.1 + 13) - 0.5) * 2 * amp;
  }

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${shakeX}px, ${shakeY}px)` }}>
        <div style={{ position: 'absolute', left: 120, top: 96 }}>
          <TitleBlock text="IMPACT BURST KIT" size={54} />
        </div>

        {/* Left neighbor card: pushed away by the shockwave, then bounces back */}
        <div
          style={{
            position: 'absolute',
            left: X_L,
            top: Y,
            transform: `translateX(${-pushX}px) rotate(${-pushRot}deg)`,
          }}
        >
          <Card w={CW} h={CH} seed={2} />
        </div>

        {/* Right neighbor card */}
        <div
          style={{
            position: 'absolute',
            left: X_L + (CW + GAP) * 2,
            top: Y,
            transform: `translateX(${pushX}px) rotate(${pushRot}deg)`,
          }}
        >
          <Card w={CW} h={CH} seed={4} />
        </div>

        {/* Main card: slam + landing squash-and-bounce */}
        <div
          style={{
            position: 'absolute',
            left: X_L + CW + GAP,
            top: Y + mainDy,
            transform: `scale(${mainSx}, ${mainSy})`,
            transformOrigin: '50% 100%',
          }}
        >
          <Card w={CW} h={CH} seed={7} style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.16)' }} />
        </div>

        {/* ② Particle burst (drawn above the cards) */}
        {particlesAlive &&
          PARTICLES.map((p, i) => {
            const px = CX + Math.cos(p.angle) * p.dist * pT;
            const py = CY + Math.sin(p.angle) * p.dist * pT;
            const s = p.size * (1 - pT);
            if (s < 0.5) return null;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: px - s / 2,
                  top: py - s / 2,
                  width: s,
                  height: s,
                  background: G.ink,
                  borderRadius: p.square ? 2 : '50%',
                  opacity: 1 - pT * pT,
                }}
              />
            );
          })}

        {/* ① Shockwave ring (top layer, sweeping over the neighbor cards) */}
        {ringOp > 0 && (
          <div
            style={{
              position: 'absolute',
              left: CX - ringR,
              top: CY - ringR,
              width: ringR * 2,
              height: ringR * 2,
              border: `3px solid ${G.ink}`,
              borderRadius: '50%',
              opacity: ringOp,
              boxSizing: 'border-box',
            }}
          />
        )}
      </div>
    </div>
  );
};
