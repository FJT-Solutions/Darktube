// letterspace-materialize v3 — revised per batch 11 user notes (superhuman screenshots, 4 of them):
// ① wider glyph proportions: v2 was tall (60x100); the final-state screenshot shows letter height ≈50 / width ≈58 (aspect ≈1.15),
//    v3 redraws all skeleton glyphs into a 78x64 view box (type area 58x54), upright slightly wide + thin strokes + wide letter-spacing;
// ② all letters start and finish at the same time: v2's per-letter stagger (PER/jitter) is gone, every character starts on the same frame,
//    and pathLength normalization makes letters of different stroke lengths finish on the same frame (the parallel half-drawn state of the whole row in screenshots 2/3).
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

// Upright, slightly wide, thin skeleton glyphs in a 78x64 view box (sub-stroke order = draw order)
const GLYPHS: Record<string, string> = {
  S: 'M 62 13 C 51 4, 18 3, 15 15 C 12 26, 29 29, 39 31 C 50 33, 66 37, 63 48 C 60 59, 21 61, 11 50',
  U: 'M 12 5 L 12 40 C 12 59, 66 59, 66 40 L 66 5',
  P: 'M 12 59 L 12 5 L 44 5 C 64 5, 64 32, 44 32 L 12 32',
  E: 'M 62 5 L 12 5 L 12 59 L 62 59 M 12 31 L 56 31',
  R: 'M 12 59 L 12 5 L 44 5 C 64 5, 64 31, 44 31 L 12 31 M 42 31 L 64 59',
  H: 'M 12 5 L 12 59 M 66 5 L 66 59 M 12 31 L 66 31',
  M: 'M 8 59 L 8 6 L 39 38 L 70 6 L 70 59',
  A: 'M 7 59 L 39 5 L 71 59 M 17 41 L 61 41',
  N: 'M 12 59 L 12 5 L 66 59 L 66 5',
};

const WORD = 'SUPERHUMAN';
const START = 16;   // all characters start drawing on the same frame (no stagger)
const DUR = 52;     // frames for all characters to finish (pathLength normalized → all finish on the same frame)

export const LetterspaceMaterialize: React.FC = () => {
  const frame = useCurrentFrame();

  // all characters share one progress value: start and finish together
  const p = interpolate(frame, [START, START + DUR], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // easeInOut: slow start → even middle → slow finish (handwritten feel)
  const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  // slight brighten-and-settle the instant drawing finishes (crystallized finish) — happens on the same frame for every character
  const doneGlow = interpolate(frame, [START + DUR, START + DUR + 8], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const glowAmt = p >= 1 ? doneGlow : p > 0.7 ? (p - 0.7) / 0.3 : 0;

  const letters = WORD.split('').map((ch, li) => (
    <svg key={li} width={78} height={64} viewBox="0 0 78 64"
      style={{ overflow: 'visible', display: 'block' }}>
      {p > 0 && (
        <path
          d={GLYPHS[ch]}
          fill="none"
          stroke="#f4f2f8"
          strokeWidth={5.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - e}
          style={{
            filter: `drop-shadow(0 0 ${6 + glowAmt * 10}px rgba(240,235,255,${0.35 + glowAmt * 0.35}))`,
          }}
        />
      )}
    </svg>
  ));

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(178deg, #2c2a55 0%, #3d3465 30%, #241f40 58%, #0e0c1e 100%)',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* dusk horizon light band (mountain silhouette / evening glow approximation) */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 470, height: 170,
        background: 'linear-gradient(180deg, rgba(232,150,170,0) 0%, rgba(226,140,165,0.20) 45%, rgba(120,100,170,0.12) 75%, rgba(0,0,0,0) 100%)',
        filter: 'blur(20px)',
      }} />
      <div style={{
        position: 'absolute', right: 130, top: 330, width: 560, height: 200,
        background: 'radial-gradient(ellipse at center, rgba(216,120,160,0.16) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(26px)',
      }} />
      {/* wide-letter-spacing wordmark: all characters drawn in parallel, continuous */}
      <div style={{ display: 'flex', gap: 34, alignItems: 'center' }}>
        {letters}
      </div>
    </AbsoluteFill>
  );
};
