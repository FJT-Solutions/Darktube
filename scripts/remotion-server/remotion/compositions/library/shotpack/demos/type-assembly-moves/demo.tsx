// Letterform drift assembly (letterform-drift-assembly) — a Stranger Things-style title entrance.
// The title "ASSEMBLE" splits into 9 characters, each drifting in slowly from a different direction (a seeded random vector h(i),
// magnitude ±260–360px) with blur 8px + opacity 0.35, settling in staggered order (delay i×3f, 45f travel, Easing.out(cubic)).
// The instant each character locks in, it gets one "darkening pulse": glyph color G.ink→#000→G.ink + stroke 0→3px→0 (8f) —
// on a white background, darkening is used instead of glow (library precedent). Once fully assembled, the whole word does a
// scale 1→1.04→1 settling breath (precedent: 1.02 was too weak, bumped to 1.04).
// Keyframes: 0–24 characters depart staggered → char i drifts in over [i*3, i*3+45] →
// lock frame i*3+45 starts an 8f darkening pulse (last char 69–77) → 80–104 whole-word breath →
// 104–150 full stillness (46f, no per-frame filters).
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, TitleBlock } from '../../_fixtures/Fixtures';

const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const WORD = 'ASSEMBLE';
const TRAVEL = 45; // frames per character's drift-in travel
const STAG = 3; // stagger interval

export const LetterformDriftAssembly: React.FC = () => {
  const frame = useCurrentFrame();
  const chars = WORD.split('');
  const lastLock = (chars.length - 1) * STAG + TRAVEL; // 69

  // Whole-word settling breath: 80–92 scale to 1.04, 92–104 settle back, then constant 1 → frame-deterministic
  const breath =
    frame < 92
      ? interpolate(frame, [80, 92], [1, 1.04], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.inOut(Easing.cubic),
        })
      : interpolate(frame, [92, 104], [1.04, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.inOut(Easing.cubic),
        });

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 120, top: 96 }}>
        <TitleBlock text="LETTERFORM DRIFT ASSEMBLY" size={54} />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${breath})`,
        }}
      >
        {chars.map((c, i) => {
          const start = i * STAG;
          const lock = start + TRAVEL;
          // Drift-in progress
          const p = interpolate(frame, [start, lock], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });
          // Seeded starting vector: direction h(i), magnitude 260–360px
          const ang = h(i + 1) * Math.PI * 2;
          const mag = 260 + h(i + 101) * 100;
          const dx = Math.cos(ang) * mag * (1 - p);
          const dy = Math.sin(ang) * mag * (1 - p);
          const blur = 8 * (1 - p);
          const op = interpolate(p, [0, 1], [0.35, 1]);
          // Lock darkening pulse: lock→lock+8, triangular wave 0→1→0
          const pulse =
            frame <= lock || frame >= lock + 8
              ? 0
              : frame < lock + 4
                ? (frame - lock) / 4
                : (lock + 8 - frame) / 4;
          const shade = Math.round(47 * (1 - pulse)); // #2f(47)→#00
          const color = `rgb(${shade},${shade},${shade})`;
          const strokeW = 3 * pulse;
          return (
            <span
              key={i}
              style={{
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontWeight: 800,
                fontSize: 140,
                letterSpacing: 8,
                color,
                display: 'inline-block',
                transform: `translate(${dx}px, ${dy}px)`,
                opacity: op,
                filter: blur > 0.01 ? `blur(${blur}px)` : undefined,
                WebkitTextStroke: strokeW > 0.01 ? `${strokeW}px #000` : undefined,
              }}
            >
              {c}
            </span>
          );
        })}
      </div>
    </div>
  );
};
