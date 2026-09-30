// timeline-travel — horizontal timeline travel (Kingsman-style)
// The camera accelerates along the horizontal tick axis as v1.0/v2.0/v3.0/Today sweep past,
// and as each tick passes, its Card springs up from the tick line with overshoot + a brief hold
// while the camera keeps moving;
// the last tick hard-stops in 4f plus a 1.28× push-in. The world layer only moves translateX/scale.
// f0–12 initial stillness; true stillness from f118, ≥42f (160f total).
import React from 'react';
import { useCurrentFrame, interpolate, Easing, spring } from 'remotion';
import { G, Card, TitleBlock } from '../../_fixtures/Fixtures';

const W = 1920;
const AXIS_Y = 700;
const TICK_GAP = 1400; // tick spacing (world coordinates)
const TICKS = [
  { label: 'v1.0', x: 960 },
  { label: 'v2.0', x: 960 + TICK_GAP },
  { label: 'v3.0', x: 960 + TICK_GAP * 2 },
  { label: 'Today', x: 960 + TICK_GAP * 3 },
];
const WORLD_W = 960 + TICK_GAP * 3 + 960;

const TRAVEL_START = 12;
const TRAVEL_END = 104; // hard-stop frame
const ZOOM_END = 114;

// camera X: in-out but slow first then fast (poly(3) in dominant, hard ease-out at the end)
// built from two segments: 0–0.82 acceleration (Easing.in(poly(2.2))), 0.82–1 hard-brake
const camXAt = (f: number): number => {
  const total = TICKS[3].x - 960; // world distance to travel
  const t = interpolate(f, [TRAVEL_START, TRAVEL_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // accelerate → cruise → hard brake: segmented easing, gentle start over the first 15%,
  // near-constant acceleration through the middle, hard close over the last 12%
  const eased = interpolate(t, [0, 0.15, 0.88, 1], [0, 0.055, 0.9, 1], {
    easing: Easing.inOut(Easing.quad),
  });
  return eased * total;
};

// each card's pop frame: the moment the camera center sweeps past that tick (precomputed
// numerically to avoid per-frame inversion)
// found by inverting camXAt: the frame where camX == tick.x - 960
const popFrameOf = (tickX: number): number => {
  for (let f = TRAVEL_START; f <= TRAVEL_END; f++) {
    if (camXAt(f) >= tickX - 960) return f;
  }
  return TRAVEL_END;
};

const CARD_W = 360;
const CARD_H = 240;

const TickStop: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const tick = TICKS[i];
  const pop = popFrameOf(tick.x) - 6; // start popping 6f early so it stands just as the camera sweeps past
  const s = spring({
    frame: frame - pop,
    fps: 30,
    config: { damping: 11, stiffness: 160, mass: 0.9 }, // noticeable overshoot
    durationInFrames: 26,
  });
  const appeared = frame >= pop;

  return (
    <div style={{ position: 'absolute', left: tick.x, top: 0 }}>
      {/* vertical tick line */}
      <div style={{ position: 'absolute', left: -3, top: AXIS_Y - 28, width: 6, height: 56, background: G.ink, borderRadius: 3 }} />
      {/* tick label */}
      <div style={{ position: 'absolute', left: -80, top: AXIS_Y + 44, width: 160, textAlign: 'center', fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 800, fontSize: 40, color: G.ink }}>
        {tick.label}
      </div>
      {/* card pops from the tick line: scaleY 0→1 about the bottom edge (with overshoot), plus a rise */}
      {appeared && (
        <div
          style={{
            position: 'absolute',
            left: -CARD_W / 2,
            top: AXIS_Y - 36 - CARD_H,
            transform: `scaleY(${s}) scaleX(${0.6 + 0.4 * s})`,
            transformOrigin: '50% 100%',
            opacity: Math.min(1, s * 2),
          }}
        >
          <Card w={CARD_W} h={CARD_H} seed={i + 2} />
        </div>
      )}
    </div>
  );
};

export const TimelineTravel: React.FC = () => {
  const frame = useCurrentFrame();
  const camX = camXAt(frame);

  // after the hard stop, push in on the last tick: scale 1 → 1.28, centered on the Today tick
  const zoom = interpolate(frame, [TRAVEL_END, ZOOM_END], [1, 1.28], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: W, height: 1080, background: G.bg, overflow: 'hidden', position: 'relative' }}>
      {/* push-in layer: scales about a point slightly below center (where the last tick lands) */}
      <div style={{ width: W, height: 1080, transform: `scale(${zoom})`, transformOrigin: '50% 62%' }}>
        {/* world layer: the only container that translates */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: WORLD_W, height: 1080, transform: `translateX(${-camX}px)` }}>
          {/* main axis line */}
          <div style={{ position: 'absolute', left: 200, top: AXIS_Y - 3, width: WORLD_W - 400, height: 6, background: G.bar, borderRadius: 3 }} />
          {/* secondary ticks (small dots, boost the sense of speed) */}
          {Array.from({ length: 22 }).map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: 960 + i * (TICK_GAP / 5) - 2, top: AXIS_Y - 12, width: 4, height: 24, background: G.bar, borderRadius: 2 }} />
          ))}
          {TICKS.map((_, i) => (
            <TickStop key={i} i={i} frame={frame} />
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 90, width: '100%', textAlign: 'center' }}>
        <TitleBlock text="TIMELINE TRAVEL" size={64} />
      </div>
    </div>
  );
};
