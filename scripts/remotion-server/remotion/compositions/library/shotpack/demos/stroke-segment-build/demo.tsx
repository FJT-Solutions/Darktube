// stroke-segment-build — broken strokes form the word (Alien style)
// "SHIP" is split into 16 disconnected thick segments, lit up one by one in a shuffled order.
// The first 70% (11 segments) don't read as a word; the last 3 segments make it suddenly legible at their landing frame;
// the word gives a subtle scale pulse at the last segment's landing frame (1→1.06→1).
// Each segment enters: opacity 0→1 + 12px slide along the stroke direction (out easing), 6f.
// f0–14 empty hold; last segment lands at f104, pulses until f112, true stillness ≥38f (150f total).
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, TitleBlock } from '../../_fixtures/Fixtures';

// "SHIP" hand-drawn stroke segments. Coordinate system: each letter 200 wide, 320 tall, letter spacing 60.
// Segment = {x1,y1,x2,y2}, stroke width 44, butt caps (reads more disconnected).
type Seg = { x1: number; y1: number; x2: number; y2: number };

const K = 200; // letter width
const H = 320; // letter height
const ADV = K + 60;

// S: 4 segments (top bar, upper-left stem, middle bar, lower-right stem + bottom bar — 5 would also work; keep 4)
// H: 3 segments (left stem, right stem, middle bar)
// I: 3 segments (top bar, center stem, bottom bar)
// P: 4 segments (left stem, top bar, right short stem, middle bar) — 14 total; S split into 2 more to reach 16
const SEGS: Seg[] = [
  // S (x offset 0) — 6 segments
  { x1: 30, y1: 22, x2: 185, y2: 22 },     // 0 top bar
  { x1: 22, y1: 44, x2: 22, y2: 130 },     // 1 upper-left stem
  { x1: 30, y1: 152, x2: 175, y2: 152 },   // 2 middle bar
  { x1: 178, y1: 174, x2: 178, y2: 276 },  // 3 lower-right stem
  { x1: 15, y1: 298, x2: 170, y2: 298 },   // 4 bottom bar
  { x1: 22, y1: 240, x2: 22, y2: 276 },    // 5 lower-left short stem (S tail hook)
  // H (x offset ADV) — 3 segments
  { x1: ADV + 22, y1: 22, x2: ADV + 22, y2: 298 },   // 6 left stem
  { x1: ADV + 178, y1: 22, x2: ADV + 178, y2: 298 }, // 7 right stem
  { x1: ADV + 44, y1: 160, x2: ADV + 156, y2: 160 }, // 8 middle bar
  // I (x offset ADV*2) — 3 segments
  { x1: ADV * 2 + 40, y1: 22, x2: ADV * 2 + 160, y2: 22 },   // 9 top bar
  { x1: ADV * 2 + 100, y1: 44, x2: ADV * 2 + 100, y2: 276 }, // 10 center stem
  { x1: ADV * 2 + 40, y1: 298, x2: ADV * 2 + 160, y2: 298 }, // 11 bottom bar
  // P (x offset ADV*3) — 4 segments
  { x1: ADV * 3 + 22, y1: 22, x2: ADV * 3 + 22, y2: 298 },   // 12 left stem
  { x1: ADV * 3 + 44, y1: 22, x2: ADV * 3 + 165, y2: 22 },   // 13 top bar
  { x1: ADV * 3 + 178, y1: 44, x2: ADV * 3 + 178, y2: 140 }, // 14 right short stem
  { x1: ADV * 3 + 44, y1: 162, x2: ADV * 3 + 165, y2: 162 }, // 15 middle bar
];

// Shuffled lighting order: deliberately scrambled — the first 13 segments jump across letters (unreadable),
// the last 3 (8 middle bar / 10 I stem / 12 P left stem) complete legibility the instant they land.
const ORDER = [3, 9, 6, 15, 1, 11, 14, 4, 0, 7, 13, 2, 5, 8, 10, 12];

const FIRST = 14; // first segment's start frame
const STEP = 6; // segment interval
const SEG_IN = 6; // per-segment entrance duration
const LAST_LAND = FIRST + 15 * STEP + SEG_IN; // = 110, last segment lands
const PULSE_END = LAST_LAND + 8;

const WORD_W = ADV * 3 + K; // 980
const OX = (1920 - WORD_W) / 2;
const OY = (1080 - H) / 2 + 20;

export const StrokeSegmentBuild: React.FC = () => {
  const frame = useCurrentFrame();

  // last segment lands: whole word pulses 1 → 1.06 → 1 (8f)
  const pulse = interpolate(
    frame,
    [LAST_LAND, LAST_LAND + 3, PULSE_END],
    [1, 1.06, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <div style={{ width: 1920, height: 1080, background: G.ink, overflow: 'hidden', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 110,
          width: '100%',
          textAlign: 'center',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: 800,
          fontSize: 44,
          color: G.mid,
          letterSpacing: 2,
        }}
      >
        STROKE SEGMENT BUILD
      </div>
      <svg
        width={1920}
        height={1080}
        style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${pulse})`, transformOrigin: '50% 55%' }}
      >
        {SEGS.map((seg, i) => {
          const rank = ORDER.indexOf(i);
          const start = FIRST + rank * STEP;
          if (frame < start) return null; // segments not yet started aren't rendered
          const t = interpolate(frame, [start, start + SEG_IN], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          // slides in 12px along the stroke direction
          const dx = seg.x2 - seg.x1;
          const dy = seg.y2 - seg.y1;
          const len = Math.hypot(dx, dy) || 1;
          const slide = 12 * (1 - t);
          const ox = (-dx / len) * slide;
          const oy = (-dy / len) * slide;
          return (
            <line
              key={i}
              x1={OX + seg.x1 + ox}
              y1={OY + seg.y1 + oy}
              x2={OX + seg.x2 + ox}
              y2={OY + seg.y2 + oy}
              stroke={G.panel}
              strokeWidth={44}
              strokeLinecap="butt"
              opacity={t}
            />
          );
        })}
      </svg>
    </div>
  );
};
