// line-unfold-panel —— unfold a panel from a single line (Jarvis/FUI motif)
// Dark background. Entrance in two beats: a 3px thin line draws out from the center to both sides very fast (5f) → once at full width it opens up
// vertically into a Card panel (9f, ease-out) → content fades in with a delay.
// After a still display it exits in reverse: flattens back to a line (7f) → the line shrinks to a dot → the dot extinguishes, like an old CRT powering off.
// f0–12 empty static hold; entrance f12–34; panel held until f78; exit f78–98; final stillness ≥42f (140f).
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card } from '../../_fixtures/Fixtures';

const PANEL_W = 760;
const PANEL_H = 460;
const CX = 960;
const CY = 540;

// —— entrance timeline ——
const T0 = 12; // lighting start
const LINE_END = T0 + 5; // line draw-out done f17
const UNFOLD_END = LINE_END + 9; // panel unfold done f26
const CONTENT_END = UNFOLD_END + 8; // content fade-in done f34

// —— exit timeline ——
const OUT0 = 78; // flatten starts
const COLLAPSE_END = OUT0 + 7; // flattened to a line f85
const SHRINK_END = COLLAPSE_END + 6; // line shrunk to a dot f91
const OFF = SHRINK_END + 4; // dot extinguishes f95

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const LineUnfoldPanel: React.FC = () => {
  const frame = useCurrentFrame();

  // Entrance: scaleX (line draw-out) fast in, hard stop; stays 1 after entry
  const inSX = interpolate(frame, [T0, LINE_END], [0.004, 1], {
    easing: Easing.out(Easing.poly(4)),
    ...clamp,
  });
  // Entrance: scaleY (vertical unfold); held at 3px during the line phase
  const inSY = interpolate(frame, [LINE_END, UNFOLD_END], [3 / PANEL_H, 1], {
    easing: Easing.out(Easing.cubic),
    ...clamp,
  });
  // Content fade-in (starts only once the panel is over half unfolded)
  const contentOp = interpolate(frame, [UNFOLD_END - 3, CONTENT_END], [0, 1], {
    easing: Easing.out(Easing.quad),
    ...clamp,
  });

  // Exit: first collapse Y back to a line, then shrink X back to a dot
  const outSY = interpolate(frame, [OUT0, COLLAPSE_END], [1, 3 / PANEL_H], {
    easing: Easing.in(Easing.cubic),
    ...clamp,
  });
  const outSX = interpolate(frame, [COLLAPSE_END, SHRINK_END], [1, 0.004], {
    easing: Easing.in(Easing.poly(4)),
    ...clamp,
  });
  // Content withdraws before the flattening
  const contentOutOp = interpolate(frame, [OUT0 - 4, OUT0 + 2], [1, 0], clamp);

  const sx = frame < OUT0 ? inSX : outSX;
  const sy = frame < OUT0 ? inSY : outSY;

  // Final dot extinguish: opacity drops fast. After f >= OFF the whole element is conditionally unmounted → true stillness
  const dotOp = interpolate(frame, [SHRINK_END, OFF], [1, 0], {
    easing: Easing.in(Easing.quad),
    ...clamp,
  });

  const alive = frame >= T0 && frame < OFF;
  // Panel phase (sy large enough) shows card content; line/dot phases show a glowing bar
  const isPanel = sy > 0.15;

  return (
    <div style={{ width: 1920, height: 1080, background: '#1c1c1b', overflow: 'hidden', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 120,
          width: '100%',
          textAlign: 'center',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: 800,
          fontSize: 52,
          color: G.mid,
          letterSpacing: 2,
        }}
      >
        LINE UNFOLD PANEL
      </div>
      {alive && (
        <div
          style={{
            position: 'absolute',
            left: CX - PANEL_W / 2,
            top: CY - PANEL_H / 2,
            width: PANEL_W,
            height: PANEL_H,
            transform: `scaleX(${sx}) scaleY(${sy})`,
            transformOrigin: '50% 50%',
            opacity: dotOp,
          }}
        >
          {isPanel ? (
            <>
              <Card w={PANEL_W} h={PANEL_H} seed={3} style={{ border: `2px solid ${G.mid}`, boxShadow: '0 0 40px rgba(255,255,255,0.18)' }} />
              {/* Content layer fades in/out independently: a dark plate covers it to simulate "content not yet lit" */}
              <div
                style={{
                  position: 'absolute',
                  inset: 2,
                  borderRadius: 12,
                  background: G.card,
                  opacity: 1 - Math.min(contentOp, contentOutOp),
                }}
              />
            </>
          ) : (
            // Line/dot phase: a white glowing bar fills the whole box (squashed into a line by the scale)
            <div style={{ width: '100%', height: '100%', background: '#ffffff', boxShadow: '0 0 60px rgba(255,255,255,0.9)', borderRadius: 2 }} />
          )}
        </div>
      )}
    </div>
  );
};
