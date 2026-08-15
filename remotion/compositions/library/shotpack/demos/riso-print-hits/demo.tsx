// Registration beat pump (riso-beat-pump) — a rhythmic combination of beat-punch-in (beat-sync punch push) × riso-misregistration-hit
// (misregistration). Beat frames [30,54,78,102] (one beat every 24f); on every hit frame:
// ① the whole frame's scale snaps to 1.08 for a single frame (no fade-in), decaying back to 1 within 14f via exp(-t/3);
// ② the title splits into G.mid/G.ink two-color plates with multiply misregistration; the initial offset escalates per beat 4/7/11/16px
//    (each plate opposite → 8/14/22/32px total separation), converging to registration via a 12f decaying cosine oscillation;
// ③ the corresponding beat tick dot below flashes dark and stays lit. Structure: 0–29f hold; 30–115f four beats; 116–139f true stillness.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { G, Card, TitleBlock } from '../../_fixtures/Fixtures';

const HITS = [30, 54, 78, 102]; // beat hit frames
const AMP = [4, 7, 11, 16]; // per-beat per-plate initial misregistration (px), escalating each beat
const PUMP_WIN = 14; // scale pump window: exactly back to 1 after 14f (guarantees true stillness at the end)
const SPLIT_WIN = 12; // misregistration window: exactly back to 0 after 12f (residual <0.4px, hard-cut to registration)

// Single-color plate in the same typeface as TitleBlock (misregistration needs a color-adjustable copy)
const Plate: React.FC<{ color: string; dx: number; dy: number }> = ({ color, dx, dy }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `translate(${dx}px, ${dy}px)`,
      mixBlendMode: 'multiply',
    }}
  >
    <div
      style={{
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontWeight: 800,
        fontSize: 160,
        color,
        letterSpacing: -1,
        whiteSpace: 'nowrap',
      }}
    >
      ON THE BEAT
    </div>
  </div>
);

export const RisoBeatPump: React.FC = () => {
  const frame = useCurrentFrame();

  // Find the most recent hit beat (24f interval > 14f window, so only one beat is ever active)
  let beatIdx = -1;
  for (let i = 0; i < HITS.length; i++) {
    if (frame >= HITS[i]) beatIdx = i;
  }
  const t = beatIdx >= 0 ? frame - HITS[beatIdx] : Infinity;

  // ① Whole-frame pump: hits 1.08 on the hit frame (t=0 is full value, no fade-in), decays exponentially back to 1
  const pump = t < PUMP_WIN ? 1 + 0.08 * Math.exp(-t / 3) : 1;

  // ② Title misregistration: decaying cosine oscillation (6f period, jitters twice), exactly 0 outside the window = registered
  const split = t < SPLIT_WIN;
  const m = split ? Math.cos((2 * Math.PI * t) / 6) * Math.exp(-t / 3) : 0;
  const dx = beatIdx >= 0 ? AMP[beatIdx] * m : 0;
  const dy = dx * 0.45; // small y offset, reads more like an unaligned plate

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: G.bg,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Whole-frame container: the scale pump applies to all content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${pump})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Title area: solid type / two-plate misregistration switch exclusively */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 660 }}>
          {!split && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TitleBlock text="ON THE BEAT" size={160} />
            </div>
          )}
          {split && (
            <>
              <Plate color={G.mid} dx={-dx} dy={dy} />
              <Plate color={G.ink} dx={dx} dy={-dy} />
            </>
          )}
        </div>

        {/* Row of 3 small cards at the bottom */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 660,
            display: 'flex',
            justifyContent: 'center',
            gap: 44,
          }}
        >
          <Card w={330} h={200} seed={2} />
          <Card w={330} h={200} seed={5} />
          <Card w={330} h={200} seed={8} />
        </div>

        {/* Beat ticks: flash dark on hit (8f scale pulse 1.8→1) and stay dark */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 950,
            display: 'flex',
            justifyContent: 'center',
            gap: 60,
          }}
        >
          {HITS.map((hit, i) => {
            const dt = frame - hit;
            const on = dt >= 0;
            const s = on && dt < 8 ? 1 + 0.8 * (1 - dt / 8) : 1;
            return (
              <div
                key={i}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  background: on ? G.ink : G.bar,
                  transform: `scale(${s})`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
