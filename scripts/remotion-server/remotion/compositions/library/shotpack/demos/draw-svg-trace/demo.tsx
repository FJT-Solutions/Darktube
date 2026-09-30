// stroke-grow outline annotation (draw-svg-trace) — DrawSVG's signature entrance/exit.
// the 560×380 card area at the center stays empty while a G.ink 4px stroke runs one full lap along the
// rounded-rect outline, "drawing" it out (rect pathLength=1, dasharray=1, dashoffset 1→0);
// a 0.045-long 6px-thick short dash rides at the head as the "pen tip" running ahead. At the moment the
// outline closes it flashes once, darker and thicker, the card content fades in over 8f, and the stroke
// fades out in favor of the card's own border; then a short version of the stroke-grow runs under the title
// underline (second usage).
// Keyframes: 0–8 empty hold → 8–48 outline stroke-grow 40f (inOut cubic) →
// 48–56 flash to black and thicker (48–50 up, 50–56 back) + content fade-in 8f →
// 54–64 stroke fades out / own border fades in → 68–86 short underline grow → 90–140 true stillness 50f.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, TitleBlock } from '../../_fixtures/Fixtures';

const CW = 560;
const CH = 380;
const CX = (1920 - CW) / 2; // 680
const CY = (1080 - CH) / 2; // 350
const PEN = 0.045; // pen-tip dash length (fraction of the full loop)

export const DrawSvgTrace: React.FC = () => {
  const frame = useCurrentFrame();

  // outline stroke progress: 8–48, 40f, inOut cubic
  const p = interpolate(frame, [8, 48], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  // close flash: 48–50 surge to peak, 50–56 fall back. Peak = pure black + thickening 4→8px
  const flashUp = interpolate(frame, [48, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const flashDown = interpolate(frame, [50, 56], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const flash = frame < 50 ? flashUp : flashDown;
  const strokeW = 4 + flash * 4;
  const strokeColor = flash > 0.5 ? '#000000' : G.ink;

  // content fade-in: 48–56 (8f)
  const contentOp = interpolate(frame, [48, 56], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  // stroke fades out / card's own border fades in: 54–64
  const traceOp = interpolate(frame, [54, 64], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const borderOp = 1 - traceOp;

  // pen tip: short dash covering [p-PEN, p], visible only during the stroke phase
  const penOp = p > 0.02 && p < 0.985 ? 1 : 0;

  // second usage: short underline grow under the title 68–86 (18f, out cubic)
  const up = interpolate(frame, [68, 86], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const upenOp = up > 0.03 && up < 0.97 ? 1 : 0;
  const UW = 300; // underline length

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 120, top: 96 }}>
        <TitleBlock text="DRAW SVG TRACE" size={54} />
      </div>

      {/* card content (hand-built grayscale blocks: title bar/underline slot/text rows/avatar row), fades in 8f after closing */}
      <div
        style={{
          position: 'absolute',
          left: CX,
          top: CY,
          width: CW,
          height: CH,
          borderRadius: 14,
          background: G.card,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          padding: 32,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          opacity: contentOp,
        }}
      >
        <div style={{ height: 24, width: 340, background: G.bar, borderRadius: 10 }} />
        {/* underline placeholder: drawn by the SVG below, leaving a 6px gap here */}
        <div style={{ height: 6 }} />
        <div style={{ height: 13, width: '86%', background: G.line, borderRadius: 6 }} />
        <div style={{ height: 13, width: '72%', background: G.line, borderRadius: 6 }} />
        <div style={{ height: 13, width: '60%', background: G.line, borderRadius: 6 }} />
        <div style={{ marginTop: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 17, background: G.mid }} />
          <div style={{ height: 12, width: 96, background: G.line, borderRadius: 6 }} />
        </div>
      </div>

      {/* card's own border: takes over as the stroke fades out */}
      <div
        style={{
          position: 'absolute',
          left: CX,
          top: CY,
          width: CW,
          height: CH,
          borderRadius: 14,
          border: `2px solid ${G.border}`,
          boxSizing: 'border-box',
          opacity: borderOp,
        }}
      />

      {/* stroke-grow layer: main line 4px + pen tip 6px short dash */}
      {traceOp > 0.001 && (
        <svg
          width={CW}
          height={CH}
          style={{ position: 'absolute', left: CX, top: CY, overflow: 'visible', opacity: traceOp }}
        >
          <rect
            x={1}
            y={1}
            width={CW - 2}
            height={CH - 2}
            rx={14}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeW}
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - p}
            strokeLinecap="round"
          />
          {penOp > 0 && (
            <rect
              x={1}
              y={1}
              width={CW - 2}
              height={CH - 2}
              rx={14}
              fill="none"
              stroke={G.ink}
              strokeWidth={7}
              pathLength={1}
              strokeDasharray={`${PEN} ${1 - PEN}`}
              strokeDashoffset={PEN - p}
              strokeLinecap="round"
            />
          )}
        </svg>
      )}

      {/* second usage: short stroke-grow for the title underline (stays once drawn) */}
      {up > 0.001 && (
        <svg
          width={UW}
          height={8}
          style={{ position: 'absolute', left: CX + 32, top: CY + 32 + 24 + 10, overflow: 'visible' }}
        >
          <line
            x1={0}
            y1={4}
            x2={UW}
            y2={4}
            stroke={G.ink}
            strokeWidth={4}
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - up}
            strokeLinecap="round"
          />
          {upenOp > 0 && (
            <line
              x1={0}
              y1={4}
              x2={UW}
              y2={4}
              stroke={G.ink}
              strokeWidth={7}
              pathLength={1}
              strokeDasharray={`${PEN * 2} ${1 - PEN * 2}`}
              strokeDashoffset={PEN * 2 - up}
              strokeLinecap="round"
            />
          )}
        </svg>
      )}
    </div>
  );
};
