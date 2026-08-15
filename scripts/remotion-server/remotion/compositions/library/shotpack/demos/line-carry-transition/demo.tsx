// line-carry-transition — line-relay pan transition (Catch Me If You Can graphic relay)
// World is 3840 wide (A left half / B right half). 0–24f the 6px ink progress bar
// under card A fills; 24–34f the bar's end extends into a horizontal line bursting
// past the card's right edge; 34–94f the camera pans left 1920px
// (Easing.inOut(cubic), 60f) while the line extends at the same speed, the pen tip
// staying to the right of frame; 94–112f the line turns right angles to enclose a
// 560×330 card frame (one path evolving throughout, growing via dashoffset);
// 112–124f once the frame closes, card B's content fades in over 12f. 124–160f true stillness 36f ≥ 35f.
// Frame-deterministic, no randomness; the pen-tip ink spot conditionally unmounts from f118 (wrapper-removal precedent).
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card, TitleBlock } from '../../_fixtures/Fixtures';

// ---- World geometry (one polyline: progress bar + horizontal line + right angles + rectangle) ----
// M 400,705 → 2600,705 (progress 560 + burst 1640) → up 2600,375 → right 3160,375
// → down 3160,705 → back left 2600,705 to close. Total 2200+330+560+330+560 = 3980.
const PATH = 'M 400 705 L 2600 705 L 2600 375 L 3160 375 L 3160 705 L 2600 705';
const SEGS: Array<[number, number, number, number, number]> = [
  [400, 705, 2600, 705, 2200],
  [2600, 705, 2600, 375, 330],
  [2600, 375, 3160, 375, 560],
  [3160, 375, 3160, 705, 330],
  [3160, 705, 2600, 705, 560],
];
const TOTAL = 3980;

// Pen tip coords: point along the polyline by the length already drawn
const tipAt = (drawn: number): [number, number] => {
  let d = Math.max(0, Math.min(drawn, TOTAL));
  for (const [x1, y1, x2, y2, len] of SEGS) {
    if (d <= len) {
      const t = d / len;
      return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
    }
    d -= len;
  }
  return [2600, 705];
};

export const LineCarryTransition: React.FC = () => {
  const frame = useCurrentFrame();

  // Camera: pans left 1920px over 34–94f, inOut cubic
  const cam = interpolate(frame, [34, 94], [0, 1920], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Drawn length: relayed in stages (progress bar → burst out → camera-speed sync → close the frame)
  let drawn: number;
  if (frame < 24) {
    drawn = interpolate(frame, [0, 24], [0, 560], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (frame < 34) {
    drawn = interpolate(frame, [24, 34], [560, 1100], {
      extrapolateRight: 'clamp',
    });
  } else if (frame < 94) {
    drawn = 1100 + cam; // extends at the same speed as the camera, tip held right of frame
  } else {
    drawn = interpolate(frame, [94, 112], [3020, TOTAL], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  // Card B content: fades in over 12f after the frame closes (112f)
  const contentOpacity = interpolate(frame, [112, 124], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Pen-tip ink spot: follows the line throughout, fades linearly 112–118f, conditionally unmounted from f118
  const tipMounted = frame < 118;
  const tipOpacity = interpolate(frame, [112, 118], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const [tx, ty] = tipAt(drawn);

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      {/* World container: 3840 wide, the pan = camera following the line */}
      <div
        style={{
          position: 'absolute',
          width: 3840,
          height: 1080,
          transform: `translateX(${-cam}px)`,
        }}
      >
        {/* B half-world's slightly lighter backdrop sells the "new world" */}
        <div style={{ position: 'absolute', left: 1920, top: 0, width: 1920, height: 1080, background: G.panel }} />

        {/* Scene A: title + card + progress bar track (the ink fill is the path itself) */}
        <div style={{ position: 'absolute', left: 400, top: 250 }}>
          <TitleBlock text="Scene A" size={56} />
        </div>
        <Card w={560} h={330} seed={2} style={{ position: 'absolute', left: 400, top: 350 }} />
        <div style={{ position: 'absolute', left: 400, top: 702, width: 560, height: 6, borderRadius: 3, background: G.line }} />

        {/* One line evolving throughout: grows via dasharray/dashoffset */}
        <svg width={3840} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <path
            d={PATH}
            fill="none"
            stroke={G.ink}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={TOTAL}
            strokeDashoffset={TOTAL - drawn}
          />
          {tipMounted && <circle cx={tx} cy={ty} r={11} fill={G.ink} opacity={tipOpacity} />}
        </svg>

        {/* Scene B: the frame (2600,375–3160,705) drawn by the line, content fading in */}
        <div
          style={{
            position: 'absolute',
            left: 2600,
            top: 375,
            width: 560,
            height: 330,
            boxSizing: 'border-box',
            padding: 26,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            opacity: contentOpacity,
          }}
        >
          <div style={{ height: 18, width: '58%', background: G.bar, borderRadius: 9 }} />
          <div style={{ height: 11, width: '86%', background: G.line, borderRadius: 5 }} />
          <div style={{ height: 11, width: '72%', background: G.line, borderRadius: 5 }} />
          <div style={{ height: 11, width: '64%', background: G.line, borderRadius: 5 }} />
          <div style={{ marginTop: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 30, height: 30, borderRadius: 15, background: G.mid }} />
            <div style={{ height: 11, width: 90, background: G.line, borderRadius: 5 }} />
          </div>
        </div>
        <div style={{ position: 'absolute', left: 2600, top: 275, opacity: contentOpacity }}>
          <TitleBlock text="Scene B" size={56} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
