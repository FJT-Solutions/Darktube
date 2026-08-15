// vertical-word-roll-blur-cycle — Word Roll vertical word roller (motion-lab final ported to native Remotion)
// The second half of the tagline cycles Apps→Teams→Data→Everyone on a vertical roller: the center word is crisp and colored,
// neighboring rows are light gray with vertical blur (roller depth of field); each step uses outQuint fast-then-slow with a slight overshoot,
// and at the settle moment the center word is dyed from gray into the accent color.
// Design coordinates 480×270 (DesignStage scaled proportionally); parameter values are calibrated in this coordinate system.
import React from 'react';
import { DesignStage, E, seg, useT } from '../../_fixtures/Motion';

export const VERTICAL_WORD_ROLL_BLUR_CYCLE_DURATION = 150; // 5000ms @30fps

const ROW = 44;
const WORDS = ['Apps', 'Teams', 'Data', 'Everyone'];
// 3 word changes, 0.11 each (≈0.55s)
const STEPS = [0.16, 0.36, 0.56];

const ACCENT = '#4B4BF5';
const ACCENT_DIM = '#B9B9BE';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
// Mix hex colors by k (equivalent to the original effect.js mixHex)
const mixHex = (a: string, b: string, k: number) => {
  k = clamp01(k);
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

export const VerticalWordRollBlurCycle: React.FC = () => {
  const t = useT();

  // Roller progress p: per step 0.7·outQuint + 0.3·outBack (fast then very slow + slight overshoot rebound)
  let p = 0;
  for (const s of STEPS) {
    const u = seg(t, s, s + 0.11);
    p += 0.7 * E.outQuint(u) + 0.3 * E.outBack(u);
  }

  return (
    <DesignStage bg="#F7F7FA">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system,system-ui,sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            // Whole group fades out at the end
            opacity: 1 - seg(t, 0.9, 0.985) * 0.999,
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: '#0B0B0C',
              letterSpacing: -0.5,
            }}
          >
            Built for
          </div>
          {/* Three-row-tall masked window the roller column slides inside; the center row = the second row */}
          <div style={{ position: 'relative', height: ROW * 3, width: 190, overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translateY(${ROW - p * ROW}px)`,
              }}
            >
              {WORDS.map((w, i) => {
                const d = Math.abs(i - p);
                // Directional blur for neighboring rows: within 1 row of center linear 0→3px, farther 3→5px
                const blur = d < 1 ? 3 * d : 3 + 2 * Math.min(d - 1, 1);
                const op = d < 1 ? 1 - 0.65 * d : Math.max(0.1, 0.35 - 0.23 * (d - 1));
                return (
                  <div
                    key={w}
                    style={{
                      height: ROW,
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: 30,
                      fontWeight: 800,
                      letterSpacing: -0.5,
                      filter: `blur(${blur.toFixed(2)}px)`,
                      opacity: op,
                      // Settle dye: center word gray→accent color (smaller d = more color)
                      color: mixHex(ACCENT_DIM, ACCENT, clamp01(1 - d * 2.4)),
                    }}
                  >
                    {w}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DesignStage>
  );
};
