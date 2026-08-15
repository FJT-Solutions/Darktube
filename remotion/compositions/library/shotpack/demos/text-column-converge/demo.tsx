// text-column-converge — rework of raycast-teams (measured from source footage at 28–36s):
// measured on the original (1280 wide): NEW left edge pinned at x=412, feature word right edge pinned at x=867,
// both words sit at equal margins from the screen edges (412 vs 413), and the gap never shrinks during rotation;
// the only convergence happens after the word switches to RAYCAST — ~1.2s of continuous ease-in-out sliding
// (left edge 412→554 / right edge 867→725), with "NEW RAYCAST" locking centered on the screen midline;
// ~0.6s after it settles, italic "COMING 2026" snaps in below almost as a hard cut.
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';

// Word rotation table: uneven dwell (machine rhythm), always pinned to the right edge, no gap contraction
const STEPS: { word: string; dur: number }[] = [
  { word: 'LAUNCHER DESIGN', dur: 16 },
  { word: 'COMPACT MODE', dur: 12 },
  { word: 'HOTKEY RECORDER', dur: 9 },
  { word: 'HOTKEY TYPES', dur: 8 },
  { word: 'VOICE FEATURES', dur: 7 },
  { word: 'SETTINGS DESIGN', dur: 8 },
  { word: 'AI CHAT', dur: 10 },
  { word: 'FILE SEARCH', dur: 12 },
  { word: 'RAYCAST', dur: 999 }, // last word: triggers the one and only convergence after it settles
];

const START = 8; // opening blackout stillness

// Convert from the original 1280-wide to 1920-wide (×1.5)
const NEW_LEFT_EDGE = 618; // 412×1.5: NEW left edge (= left screen margin)
const WORD_RIGHT_EDGE = 1302; // 868×1.5: feature word right edge (= right screen margin, 1920-1302=618 symmetric)

const FS = 42; // original glyph height is small (cap ~20px at 720p → ~30px at 1080p → font size ~42)
const LSP = 3; // letterSpacing
// Convergence endpoint computed from this font's actual advance (monospace watch: 0.6em + letterSpacing),
// so "NEW RAYCAST" interlocks with exactly one space and centers the whole line at 960 without overlap
const ADV = 0.6 * FS + LSP; // per-character advance
const LINE_W = 11 * ADV; // "NEW RAYCAST" is 11 characters total
const MERGED_LEFT = 960 - LINE_W / 2; // NEW left edge after convergence
const MERGED_RIGHT = 960 + LINE_W / 2; // RAYCAST right edge after convergence
const CONVERGE_DUR = 36; // convergence duration: original ~1.2s ≈ 36 frames
const CONVERGE_DELAY = 10; // RAYCAST rests 10 frames after settling before converging (original 32.4→32.7s)
const SUB_DELAY = 18; // ~0.6s after convergence locks, the italic small text appears

export const TextColumnConverge: React.FC = () => {
  const f = useCurrentFrame();
  const t = f - START;

  // Locate the current step
  let acc = 0;
  let idx = 0;
  let stepStart = 0;
  for (let i = 0; i < STEPS.length; i++) {
    if (t >= acc) { idx = i; stepStart = acc; }
    acc += STEPS[i].dur;
  }
  const cur = STEPS[idx];
  const isLast = idx === STEPS.length - 1;
  const local = t - stepStart;

  // The one and only convergence: after RAYCAST rests CONVERGE_DELAY frames, a continuous ease-in-out slide
  const cvT = isLast ? local - CONVERGE_DELAY : -1;
  const cv = interpolate(cvT, [0, CONVERGE_DUR], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  // NEW left edge: 618 → 831; feature word right edge: 1302 → 1088
  const newLeft = interpolate(cv, [0, 1], [NEW_LEFT_EDGE, MERGED_LEFT]);
  const wordRight = interpolate(cv, [0, 1], [WORD_RIGHT_EDGE, MERGED_RIGHT]);

  const converged = cv >= 1;

  // Italic small text: SUB_DELAY frames after convergence locks, near-hard cut (4-frame quick fade-in, no motion)
  const subT = converged ? cvT - CONVERGE_DUR - SUB_DELAY : -1;
  const subOp = interpolate(subT, [0, 4], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const visible = t >= 0;

  const font: React.CSSProperties = {
    fontFamily: '"SF Mono", Menlo, monospace',
    fontWeight: 500,
    fontSize: FS,
    letterSpacing: 3,
    color: '#f2f2f4',
    whiteSpace: 'nowrap',
    lineHeight: 1,
  };

  return (
    <AbsoluteFill style={{ background: '#050506', overflow: 'hidden' }}>
      {visible && (
        <div style={{ position: 'absolute', inset: 0 }}>
          {/* NEW: left-edge anchored (pinned to left screen margin during rotation) */}
          <div style={{
            ...font, position: 'absolute',
            left: newLeft, top: 519,
          }}>
            NEW
          </div>
          {/* Feature word: right-edge anchored (words change length but the right edge stays fixed) */}
          <div style={{
            ...font, position: 'absolute',
            right: 1920 - wordRight, top: 519,
          }}>
            {cur.word}
          </div>

          {/* Italic small text: appears right below the whole line after convergence, sharing the line's left edge */}
          <div style={{
            ...font,
            fontStyle: 'italic',
            color: '#d8d8dc',
            position: 'absolute',
            left: MERGED_LEFT, top: 519 + FS + 14,
            opacity: subOp,
          }}>
            COMING 2026
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
