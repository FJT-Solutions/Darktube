// countdown-arc-scatter — Countdown Arc dial numerals sweeping by (motion-lab final ported to native Remotion)
// White dial: equal-size dark numerals sit tangent along one large arc; the whole dial sweeps ~96° and decelerates to a hard stop
// (numerals fade in/out at the arc's two ends per their position angle), and a short tick line returns upright in sync;
// "5" stops at the arc top and settles into the title's first character,
// "min / to / install" blur-fade in word by word, and at the end the whole word shifts to the accent color (keeping the final two letters dyed).
// Design coordinates 480×270 (DesignStage scaled proportionally); parameter values are calibrated in this coordinate system.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const COUNTDOWN_ARC_SCATTER_DURATION = 33; // 1100ms @30fps

const INK = '#17181c';
const ACCENT_RGB = [59, 130, 246]; // #3b82f6
const R0 = 150; // arc radius
const SP = 24; // angular spacing between adjacent numerals
// i=6 is "5"; on settle its angle goes to zero, stopping at the arc top
const NUMS = [45, 35, 28, 22, 17, 10, 5, 4, 3];
// "5"'s settle target point (relative to pivot)
const TARGET = { x: -148, y: -30 };

// Glyph style shared by numerals and title
const NUM_FONT: React.CSSProperties = {
  color: INK,
  fontWeight: 600,
  fontSize: 40,
  letterSpacing: '-0.5px',
  whiteSpace: 'nowrap',
};

// Per-word blur fade-in windows: min → to → install
const WORDS: { text: string; mr: number; win: [number, number] }[] = [
  { text: 'min', mr: 11, win: [0.54, 0.68] },
  { text: 'to', mr: 11, win: [0.62, 0.78] },
  { text: 'install', mr: 0, win: [0.7, 0.9] },
];

const mix = (k: number, a: number, b: number) => Math.round(lerp(k, a, b));

export const CountdownArcScatter: React.FC = () => {
  const t = useT();
  // Whole dial sweep: +96° → 0°, outCubic decelerate to a hard stop
  const rot = lerp(seg(t, 0, 0.52, E.outCubic), 96, 0);
  const hand = seg(t, 0.52, 0.7, E.inOutCubic); // "5" settle translation
  const out = seg(t, 0.5, 0.7, E.inQuad); // other numerals fade out in place
  // At the end the whole word (final two letters dyed) shifts from #17181c → ACCENT
  const bl = seg(t, 0.84, 0.98);
  return (
    <DesignStage bg="#fff">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#fff',
          overflow: 'hidden',
          fontFamily: '-apple-system,system-ui,sans-serif',
        }}
      >
        {/* pivot: all elements are positioned relative to it */}
        <div style={{ position: 'absolute', left: '50%', top: '58%', width: 0, height: 0 }}>
          {NUMS.map((n, i) => {
            const is5 = n === 5;
            const pa = (i - 6) * SP + rot; // current position angle
            const rad = (pa * Math.PI) / 180;
            let x = Math.sin(rad) * R0;
            let y = -Math.cos(rad) * R0;
            let rSelf = pa; // tangent layout: rotates with the position angle
            let op = Math.max(0, Math.min(1, (70 - Math.abs(pa)) / 22)); // fade in/out at the arc ends
            if (is5) {
              x = lerp(hand, x, TARGET.x);
              y = lerp(hand, y, TARGET.y);
              rSelf *= 1 - hand;
            } else {
              op *= 1 - out;
            }
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  ...NUM_FONT,
                  opacity: op,
                  transform: `translate(-50%,-50%) translate(${x}px,${y}px) rotate(${rSelf}deg)`,
                  // "5" is not blurred; the other numerals blur in sync with their fade-out
                  filter: is5 ? undefined : `blur(${out * 3}px)`,
                }}
              >
                {n}
              </div>
            );
          })}
          {/* Short tick pointer (dark thin line, returns upright as the dial rotates) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              transform: `rotate(${rot * 0.35}deg)`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: -1.5,
                top: -101,
                width: 3,
                height: 26,
                borderRadius: 2,
                background: INK,
                opacity: 1 - out,
              }}
            />
          </div>
          {/* Title (positioned relative to pivot, neutral placeholder copy); "5" lands at its left end */}
          <div
            style={{
              position: 'absolute',
              left: -124,
              top: -30,
              transform: 'translateY(-50%)',
              ...NUM_FONT,
            }}
          >
            {WORDS.map(({ text, mr, win }, k) => {
              const p = seg(t, win[0], win[1], E.outCubic);
              const isLast = k === WORDS.length - 1;
              return (
                <span
                  key={k}
                  style={{
                    display: 'inline-block',
                    marginRight: mr || undefined,
                    opacity: p,
                    filter: `blur(${(1 - p) * 6}px)`,
                    color: isLast
                      ? `rgb(${mix(bl, 23, ACCENT_RGB[0])},${mix(bl, 24, ACCENT_RGB[1])},${mix(bl, 28, ACCENT_RGB[2])})`
                      : undefined,
                  }}
                >
                  {text}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </DesignStage>
  );
};
