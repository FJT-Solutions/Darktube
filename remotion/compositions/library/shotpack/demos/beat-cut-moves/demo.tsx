import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';

// beat-cut-accelerando: six different compositions hard-cut full-screen at decreasing intervals of 16→12→8→6→4 frames,
// accelerating toward the end, then the last cut slams to a still back on the main screen and finishes with a slow 1→1.06 push-in.
// True hard cuts: whichever interval frame falls in, that view renders — no transitions whatsoever.

// A view = FakeDashboard variant + scale + focus point (the point on screen to be pushed to center)
type View = { variant: 'A' | 'B'; scale: number; cx: number; cy: number };

const VIEWS: View[] = [
  { variant: 'A', scale: 1, cx: 960, cy: 540 },    // v0 wide shot (establishing)
  { variant: 'A', scale: 1.8, cx: 1070, cy: 576 }, // v1 card area
  { variant: 'A', scale: 2.6, cx: 600, cy: 340 },  // v2 single-card close-up
  { variant: 'B', scale: 1, cx: 960, cy: 540 },    // v3 list-page wide shot
  { variant: 'B', scale: 1.9, cx: 1070, cy: 500 }, // v4 list-row area
  { variant: 'B', scale: 2.8, cx: 1070, cy: 290 }, // v5 single-row close-up
];

// Each segment's start frame: 49f establishing, then intervals 16→12→8→6→4, final segment (back to main screen) holds 35f
// 0–48 v0 | 49–64 v1 | 65–76 v2 | 77–84 v3 | 85–90 v4 | 91–94 v5 | 95–129 still
const CUTS = [0, 49, 65, 77, 85, 91, 95];
const FINAL = 95; // the last cut: slams to a still back on the main screen

const ViewShot: React.FC<{ view: View; extraScale?: number }> = ({ view, extraScale = 1 }) => {
  const s = view.scale * extraScale;
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        transformOrigin: `${view.cx}px ${view.cy}px`,
        transform: `translate(${960 - view.cx}px, ${540 - view.cy}px) scale(${s})`,
      }}
    >
      <FakeDashboard variant={view.variant} />
    </div>
  );
};

export const BeatCutAccelerando: React.FC = () => {
  const frame = useCurrentFrame();

  // Which interval we're in now (final segment = main screen v0)
  let seg = 0;
  for (let i = 0; i < CUTS.length; i++) {
    if (frame >= CUTS[i]) seg = i;
  }
  const isFinal = seg === CUTS.length - 1;
  const view = isFinal ? VIEWS[0] : VIEWS[seg];

  // Final segment slow push-in: scale 1 → 1.06, ease-out, still after 22f of pushing (ending stillness ≥15f)
  const push = isFinal
    ? interpolate(frame, [FINAL, FINAL + 20], [1, 1.06], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      })
    : 1;

  // 1f brightness pop (~+5%) on each hard cut to simulate a shutter
  const isCutFrame = CUTS.some((c, i) => i > 0 && frame === c);
  const flash = isCutFrame ? 1.05 : 1;

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, filter: `brightness(${flash})` }}>
        <ViewShot view={view} extraScale={push} />
      </div>
      {/* an extra paper-thin white flash on cut frames so it's perceptible to the eye */}
      {isCutFrame && (
        <AbsoluteFill style={{ background: '#ffffff', opacity: 0.06 }} />
      )}
    </AbsoluteFill>
  );
};
