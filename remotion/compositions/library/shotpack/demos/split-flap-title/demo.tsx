import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';

// split-flap-flip: airport split-flap display. Each character is a dark flap cell (top/bottom halves);
// each cell flips through 3 garbled intermediate states then clicks to a stop on the target character, cascading left→right 4f apart like a wave.
// Beat: 0–21 build-up (whole row of garbled characters held still) → cascade flips start at 22 → all stopped by 78 → still to 140.

const TEXT = 'SHIP FASTER';
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&';
const START = 22; // cascade start frame
const STAGGER = 4; // cascade delay between characters
const FLIP = 5; // duration of a single flap
const NFLIP = 3; // 3 flips per character (2 garbled intermediate states + 1 landing on the target)
const CELL_W = 118;
const CELL_H = 156;

// Seeded sine hash (no Math.random)
const rnd = (a: number) => {
  const x = Math.sin(a * 127.3) * 43758.5453;
  return x - Math.floor(x);
};
const garble = (i: number, k: number) =>
  CHARSET[Math.floor(rnd(i * 7.13 + k * 3.71 + 1) * CHARSET.length)];

const FLAP_BG = '#262624';
const FLAP_INK = '#f4f4f2';

// Half cell: top/bottom halves each overflow hidden; the full glyph inside is offset by half a cell to expose the matching half
const Half: React.FC<{ ch: string; part: 'top' | 'bottom' }> = ({ ch, part }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: part === 'top' ? 0 : CELL_H / 2,
      width: CELL_W,
      height: CELL_H / 2,
      overflow: 'hidden',
      background: FLAP_BG,
      borderRadius: part === 'top' ? '10px 10px 0 0' : '0 0 10px 10px',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: part === 'top' ? 0 : -CELL_H / 2,
        width: CELL_W,
        height: CELL_H,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontWeight: 800,
        fontSize: 100,
        color: FLAP_INK,
      }}
    >
      {ch}
    </div>
  </div>
);

const FlapCell: React.FC<{ target: string; i: number; frame: number }> = ({
  target,
  i,
  frame,
}) => {
  // This cell's character sequence: 2 garbled → 1 garbled → target (the initial state is also garbled, visible during build-up)
  const seq = [garble(i, 0), garble(i, 1), garble(i, 2), target];
  const local = frame - (START + i * STAGGER);
  const done = local >= NFLIP * FLIP;

  // Settle click: the whole cell dips and rebounds (1px is imperceptible; scaled to 6px so the "click" reads)
  const clickY = done
    ? interpolate(local, [15, 17, 19, 22], [0, 6, -1.5, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.quad),
      })
    : 0;

  let topCh = seq[0];
  let bottomCh = seq[0];
  let flap: React.ReactNode = null;

  if (done) {
    topCh = target;
    bottomCh = target;
  } else if (local > 0) {
    const k = Math.min(NFLIP - 1, Math.floor(local / FLIP));
    const from = seq[k];
    const to = seq[k + 1];
    const p = Easing.in(Easing.quad)((local - k * FLIP) / FLIP); // gravity feel: falls faster over time
    topCh = to; // top half static: once the flap opens, the next character's top half is exposed
    bottomCh = from; // bottom half static: keeps the old character until the active leaf covers it
    if (p < 0.5) {
      // First half: the old character's top leaf drops 0→-90
      const deg = p * 2 * 90;
      flap = (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `rotateX(${-deg}deg)`,
            transformOrigin: `center ${CELL_H / 2}px`,
            backfaceVisibility: 'hidden',
            filter: `brightness(${1 - p * 2 * 0.45})`,
            zIndex: 2,
          }}
        >
          <Half ch={from} part="top" />
        </div>
      );
    } else {
      // Second half: the new character's bottom leaf slaps 90→0 over the old bottom half
      const deg = 90 - (p - 0.5) * 2 * 90;
      flap = (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `rotateX(${deg}deg)`,
            transformOrigin: `center ${CELL_H / 2}px`,
            backfaceVisibility: 'hidden',
            filter: `brightness(${0.55 + (p - 0.5) * 2 * 0.45})`,
            zIndex: 2,
          }}
        >
          <Half ch={to} part="bottom" />
        </div>
      );
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: CELL_W,
        height: CELL_H,
        transform: `translateY(${clickY}px)`,
        perspective: 420,
        borderRadius: 10,
        boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
      }}
    >
      <Half ch={topCh} part="top" />
      <Half ch={bottomCh} part="bottom" />
      {flap}
      {/* Center hinge line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: CELL_H / 2 - 2,
          width: CELL_W,
          height: 4,
          background: '#141412',
          zIndex: 3,
        }}
      />
    </div>
  );
};

export const SplitFlapFlip: React.FC = () => {
  const frame = useCurrentFrame();
  let letterIdx = 0;
  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      {/* Dimmed fake background page to highlight the flap board */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.3, filter: 'saturate(0.8)' }}>
        <FakeDashboard variant="A" />
      </div>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {TEXT.split('').map((ch, idx) => {
            if (ch === ' ') {
              return <div key={idx} style={{ width: 52 }} />;
            }
            const i = letterIdx++;
            return <FlapCell key={idx} target={ch} i={i} frame={frame} />;
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
