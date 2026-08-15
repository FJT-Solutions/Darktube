// Font-weight pump (font-weight-pump) — the headline stroke thickens on each beat and springs back, like text dancing to a kick drum.
// One beat every 20f: hits at frames 30/50/70/90/110. On each hit -webkit-text-stroke jumps 0→10px,
// then rebounds to 0 over 10f with power decay (1-t/10)^0.8; fontWeight steps discretely 400→900 in the hit window
// (env>0.15), which combined with the continuous stroke decay reads as "continuously thickening." Beats 3 and 5 (frames 70/110) are accents,
// adding a scaleX 1→1.08 with the same decay (transform scale doesn't reflow layout). The 5 beat dots at the bottom serve as beat reference.
// Structure: 0–29f still hold; 30–119f five-beat pulses; 120–139f true-stillness ending (20f, 110+10=120 with no residue).
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { G } from '../../_fixtures/Fixtures';

const BEATS = [30, 50, 70, 90, 110];
const ACCENTS = new Set([2, 4]); // beats 3 and 5 are accents
const DECAY = 10; // decay frame count

// Power-decay envelope over 10f after a hit: t=0 → 1, t>=10 → exactly 0 (guarantees true stillness at the end)
const envAt = (frame: number, beat: number) => {
  const t = frame - beat;
  if (t < 0 || t >= DECAY) return 0;
  return Math.pow(1 - t / DECAY, 0.8);
};

export const FontWeightPump: React.FC = () => {
  const frame = useCurrentFrame();

  // Only one beat can be active at a time (beat spacing 20f > decay 10f); take the max envelope and its beat index
  let env = 0;
  let activeBeat = -1;
  BEATS.forEach((b, i) => {
    const e = envAt(frame, b);
    if (e > env) {
      env = e;
      activeBeat = i;
    }
  });

  const strokeW = 10 * env; // stroke weight continuously decays
  const weight = env > 0.15 ? 900 : 400; // discrete font-weight jump in the hit window
  const accent = activeBeat >= 0 && ACCENTS.has(activeBeat);
  const scaleX = accent ? 1 + 0.08 * env : 1; // accent beats widen one notch

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: G.bg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Helvetica, Arial, sans-serif',
      }}
    >
      {/* Fixed-width centered container; transform scale doesn't reflow layout */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: 150,
            fontWeight: weight,
            color: G.ink,
            letterSpacing: 6,
            whiteSpace: 'nowrap',
            WebkitTextStroke: `${strokeW}px ${G.ink}`,
            transform: `scaleX(${scaleX})`,
            transformOrigin: 'center center',
          }}
        >
          PUMP IT UP
        </div>
      </div>

      {/* Bottom beat dots: 5 of them; the dot for the hit beat flashes ink and scales up */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 130,
          width: 1920,
          display: 'flex',
          justifyContent: 'center',
          gap: 56,
        }}
      >
        {BEATS.map((b, i) => {
          const e = envAt(frame, b);
          const dotOpacity = e > 0.02 ? Math.min(1, 0.3 + e * 1.2) : 0;
          const dotScale = 1 + 0.8 * e;
          return (
            <div
              key={i}
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                background: G.line,
                position: 'relative',
                transform: `scale(${dotScale})`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 13,
                  background: G.ink,
                  opacity: dotOpacity,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
