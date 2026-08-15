// fracture — Fracture Reassemble shard convergence (motion-lab final converted to native Remotion)
// 5×5 tiles converge from random 3D-space shard states (±large offsets + random rotation on all three axes + transparency) into a full poster,
// seating in a ripple from the center outward by Manhattan distance; after the hold, all shards spin away off-frame accelerating outward from the center.
// Forward = opening, reversed = transition. Design coordinates 480×270 (scaled up evenly by DesignStage), parameters calibrated in this coordinate system.
import React from 'react';
import { DesignStage, E, rand, seg, useT } from '../../_fixtures/Motion';

export const FRACTURE_DURATION = 156; // 5200ms @30fps

const N = 5;
const ACCENT_HUE = 218; // template accent hue, replaceable per project
const HUES = [ACCENT_HUE, ACCENT_HUE + 8, ACCENT_HUE - 8, ACCENT_HUE + 4, ACCENT_HUE - 4];

// tile parameter table: position/gradient + random entrance shard state + exit direction (seeds identical to effect.js)
const TILES = Array.from({ length: N * N }, (_, seed) => {
  const r = Math.floor(seed / N);
  const c = seed % N;
  const hue = HUES[(r * 3 + c * 5) % HUES.length];
  // exit direction: away from frame center (center tile gets a random angle), guaranteeing everything flies off-screen
  const ang =
    r === 2 && c === 2
      ? rand(seed + 300) * Math.PI * 2
      : Math.atan2(r - 2 + (rand(seed + 310) - 0.5) * 0.8, c - 2 + (rand(seed + 320) - 0.5) * 0.8);
  return {
    left: `${c * 20}%`,
    top: `${r * 20}%`,
    background: `linear-gradient(${135 + r * 20}deg, hsl(${hue},14%,${38 + ((r + c) % 3) * 14}%), hsl(${hue},20%,${22 + ((r * c) % 4) * 10}%))`,
    dx: (rand(seed) - 0.5) * 900,
    dy: (rand(seed + 50) - 0.5) * 600,
    dz: (rand(seed + 100) - 0.3) * 700,
    rx: (rand(seed + 150) - 0.5) * 360,
    ry: (rand(seed + 200) - 0.5) * 360,
    rz: (rand(seed + 250) - 0.5) * 360,
    exX: Math.cos(ang) * (620 + rand(seed + 330) * 260),
    exY: Math.sin(ang) * (470 + rand(seed + 340) * 220),
    exR: (rand(seed + 350) - 0.5) * 300,
    delay: (Math.abs(r - 2) + Math.abs(c - 2)) * 0.045,
  };
});

export const Fracture: React.FC = () => {
  const t = useT();
  return (
    <DesignStage bg="#0b0b10">
      <div style={{ position: 'absolute', inset: 0, perspective: 900, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 380,
            height: 230,
            margin: '-115px 0 0 -190px',
            transformStyle: 'preserve-3d',
          }}
        >
          {TILES.map((tl, i) => {
            const tin = seg(t, tl.delay, tl.delay + 0.34, E.inOutCubic);
            // exit window tightened: the latest corner tile takes off at 0.79 and clears by 0.97 (the old 0.85 takeoff left it still on-screen at t=1)
            const tout = seg(t, 0.70 + tl.delay * 0.5, 0.70 + tl.delay * 0.5 + 0.18, E.inCubic);
            const inv = 1 - tin; // entrance: shard state → seated
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: tl.left,
                  top: tl.top,
                  width: '19.2%',
                  height: '19%',
                  borderRadius: 3,
                  background: tl.background,
                  transform: `translate3d(${tl.dx * inv + tl.exX * tout}px,${tl.dy * inv + tl.exY * tout}px,${tl.dz * inv}px)
          rotateX(${tl.rx * inv}deg) rotateY(${tl.ry * inv}deg) rotateZ(${tl.rz * inv + tl.exR * tout}deg)`,
                  opacity: Math.min(1, tin * 2.5), // exit doesn't fade; the solid tile flies off-frame
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: 8,
            opacity: seg(t, 0.42, 0.52) - seg(t, 0.7, 0.78),
            textShadow: '0 2px 30px rgba(0,0,0,.8)',
          }}
        >
          REASSEMBLE
        </div>
      </div>
    </DesignStage>
  );
};
