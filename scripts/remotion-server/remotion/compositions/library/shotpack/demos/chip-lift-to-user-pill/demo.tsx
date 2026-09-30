// chip-lift-to-user-pill — Chip Lift: the selected chip grows into a name pill (motion-lab final ported to native Remotion)
// The target chip in the grid first inverts to black-on-white in a 3-frame hard cut; the other chips stagger-fade out
// and shrink to 0.9 by their distance from it;
// the black chip keeps its left edge anchored and grows rightward into a pill, typing out the name
// character-by-character and lighting a green dot, then draws a 1px connector line
// to a circular badge, closing with per-word darkening captions.
// Design coordinates 480×270 (DesignStage scales uniformly); 440×240 fixed canvas centered.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const CHIP_LIFT_TO_USER_PILL_DURATION = 150; // 5000ms @30fps

// ---- Shared constants for this card (light-gray Swiss-minimal palette / fonts; BG/DIM/h2r from the same batch in motion-lab/fx/b09.js) ----
const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
const BG = '#F1F1F3'; // page light gray
const INK = '#0B0B0C'; // pure black
const TXT = '#111111'; // body black
const DIM = '#C9C9CE'; // light gray placeholder text
const LINE = '#E6E6EA'; // stroke

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const h2r = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// Color interpolation: mix(p,'#C9C9CE','#111')
const mix = (p: number, a: string, b: string) => {
  const A = h2r(a), B = h2r(b), q = clamp01(p);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * q)},${Math.round(A[1] + (B[1] - A[1]) * q)},${Math.round(A[2] + (B[2] - A[2]) * q)})`;
};

// ---- Grid parameters (identical to effect.js) ----
const COLS = 4, ROWS = 3, CW = 40, CH = 24, GX = 10, GY = 9, GX0 = 8, GY0 = 70;
const TC = 1, TR = 1; // target chip column/row
const LABELS = ['JD', 'MK', 'CD', 'RL', 'AV', 'TP', 'KN', 'BW', 'CE', 'HR', 'LM', 'DQ'];
// Target chip top-left coordinates (left edge anchored, stays put while growing)
const TX = GX0 + TC * (CW + GX); // 58
const TY = GY0 + TR * (CH + GY); // 103
// Other chips: position + Manhattan distance to the target (for the staggered fade-out)
const OTHERS = Array.from({ length: ROWS * COLS }, (_, i) => {
  const r = Math.floor(i / COLS), c = i % COLS;
  return {
    x: GX0 + c * (CW + GX),
    y: GY0 + r * (CH + GY),
    label: LABELS[i],
    dist: Math.abs(c - TC) + Math.abs(r - TR),
    isT: c === TC && r === TR,
  };
}).filter((o) => !o.isT);

const PW0 = CW, PW1 = 190; // pill growth start/end widths
const NAME_CHARS = 'Casey Doe'.split(''); // name typed character-by-character inside the pill

// End captions (per-word darken pattern, using only the show + inn states)
const CAP_WORDS = 'Starting with Casey'.split(' ');
const CAP_ST = 0.78 / CAP_WORDS.length;
const CAP_WIN = CAP_ST * 1.5;

// Badge size (white circle + four-point star)
const BADGE_SIZE = 26;
const BADGE_SVG = Number((BADGE_SIZE * 0.52).toFixed(1)); // 13.5

export const ChipLiftToUserPill: React.FC = () => {
  const t = useT();

  // A: invert hard cut (3-frame feel): progress stair-stepped to 0 / 0.5 / 1 → hard-cut feel
  const a = seg(t, 0.04, 0.085, E.linear);
  const aq = a < 0.34 ? 0 : a < 0.67 ? 0.5 : 1;

  // C: pill grows from the left edge + per-character typing + green dot
  const g = seg(t, 0.26, 0.44, E.outCubic);
  const w = lerp(g, PW0, PW1);
  const dq = seg(g, 0.85, 1, E.outBack);

  // D: connector line → badge → captions
  const cw = seg(t, 0.47, 0.57, E.outQuad);
  const bp = seg(t, 0.56, 0.63, E.outCubic);
  const capShow = seg(t, 0.6, 0.66);
  const capInn = seg(t, 0.6, 0.92);

  return (
    <DesignStage bg={BG}>
      {/* Page + 440×240 fixed canvas (centered) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: BG,
          overflow: 'hidden',
          fontFamily: SANS,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 440, height: 240, margin: '-120px 0 0 -220px' }}>
          {/* B: other chips — staggered fade-out by Manhattan distance to the target + scale .9 */}
          {OTHERS.map((o, i) => {
            const d0 = 0.10 + o.dist * 0.022;
            const p = seg(t, d0, d0 + 0.075, E.outQuad);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: o.x,
                  top: o.y,
                  width: CW,
                  height: CH,
                  borderRadius: CH / 2,
                  background: '#fff',
                  border: `1px solid ${LINE}`,
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                  opacity: 1 - p,
                  transform: `scale(${lerp(p, 1, 0.9)})`,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: CW,
                    height: CH,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    font: `600 10.5px/1 ${SANS}`,
                    letterSpacing: '.6px',
                    color: TXT,
                  }}
                >
                  {o.label}
                </div>
              </div>
            );
          })}

          {/* Target chip (topmost): invert hard cut → anchored left edge grows rightward into a pill */}
          <div
            style={{
              position: 'absolute',
              left: TX,
              top: TY,
              width: w,
              height: CH,
              borderRadius: CH / 2,
              background: mix(aq, '#ffffff', INK),
              border: `1px solid ${mix(aq, LINE, INK)}`,
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,.04)',
            }}
          >
            {/* Original abbreviation label: fades out with growth after inverting */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: CW,
                height: CH,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                font: `600 10.5px/1 ${SANS}`,
                letterSpacing: '.6px',
                color: mix(aq, TXT, '#ffffff'),
                opacity: 1 - clamp01(g * 5),
              }}
            >
              CD
            </div>
            {/* Name typed character-by-character (stagger runs on growth progress g) */}
            <div
              style={{
                position: 'absolute',
                left: 13,
                top: 0,
                height: CH,
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {NAME_CHARS.map((ch, i) => {
                const p = seg(g, 0.18 + i * 0.062, 0.18 + i * 0.062 + 0.05, E.outQuad);
                return (
                  <span
                    key={i}
                    style={{
                      font: `600 11px/1 ${SANS}`,
                      color: '#fff',
                      opacity: p,
                      whiteSpace: 'pre',
                      letterSpacing: '.2px',
                      transform: `translateY(${lerp(p, 2, 0)}px)`,
                      display: 'inline-block',
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
            {/* Online green dot: pops in with outBack, pinned just inside the pill's right edge */}
            <div
              style={{
                position: 'absolute',
                top: (CH - 7) / 2,
                left: w - 15,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#35D07F',
                boxShadow: '0 0 8px rgba(53,208,127,.6)',
                opacity: clamp01(dq * 2),
                transform: `scale(${dq})`,
              }}
            />
          </div>

          {/* 1px connector line: from the pill's right edge to the badge */}
          <div
            style={{
              position: 'absolute',
              left: TX + PW1,
              top: TY + CH / 2,
              height: 1,
              width: `${(cw * 90).toFixed(1)}px`,
              background: TXT,
            }}
          />

          {/* AI badge (white circle + four-point star) */}
          <div
            style={{
              position: 'absolute',
              width: BADGE_SIZE,
              height: BADGE_SIZE,
              borderRadius: '50%',
              background: '#fff',
              border: `1px solid ${LINE}`,
              boxSizing: 'border-box',
              boxShadow: '0 2px 10px rgba(0,0,0,.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              left: TX + PW1 + 90 - 2,
              top: TY + CH / 2 - 13,
              opacity: bp,
              transform: `scale(${lerp(bp, 0.8, 1)})`,
            }}
          >
            <svg width={BADGE_SVG} height={BADGE_SVG} viewBox="0 0 24 24">
              <path d="M12 0.8 L14.3 9.7 L23.2 12 L14.3 14.3 L12 23.2 L9.7 14.3 L0.8 12 L9.7 9.7 Z" fill={TXT} />
            </svg>
          </div>

          {/* End captions: per-word darken (light-gray placeholder → black); whole-line opacity fades in with show */}
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              alignItems: 'baseline',
              whiteSpace: 'nowrap',
              left: TX + PW1 - 18,
              top: TY + CH + 34,
              opacity: capShow,
            }}
          >
            {CAP_WORDS.map((wd, i) => {
              const q = clamp01((capInn - i * CAP_ST) / CAP_WIN);
              return (
                <span
                  key={i}
                  style={{
                    font: `600 13px/1.25 ${SANS}`,
                    color: mix(q, DIM, TXT),
                    letterSpacing: (-0.03 * (1 - q)).toFixed(4) + 'em',
                    marginRight: i === CAP_WORDS.length - 1 ? 0 : 4.5,
                  }}
                >
                  {wd}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </DesignStage>
  );
};
