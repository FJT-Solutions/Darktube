// doc-park-left-pill-deal — Doc Park doc parked left + conclusion slowly dealt (motion-lab final cut ported to native Remotion)
// when the scan ends, the document does not fade out: it slides left until only about 35% width remains
// and shrinks slightly to 0.92; on the right, three white outlined pills are slowly dealt at the narration
// pace (outBack pop-in). After each pill lands, a word-by-word darkening caption runs beneath it,
// and the whole line fades out before the next pill arrives; the document on the left keeps auto-scrolling
// extremely slowly throughout to maintain the "being read" feel.
// Design coordinates 480×270 (DesignStage scales proportionally), with a 440×240 fixed-size canvas centered in the layout.
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const DOC_PARK_LEFT_PILL_DEAL_DURATION = 174; // 5800ms @30fps

// ---- shared quantities for this card (light-gray Swiss-minimal palette / font, consistent with effect.js) ----
const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
const BG = '#F1F1F3'; // page light gray
const INK = '#0B0B0C'; // pure black
const TXT = '#111111'; // body black
const DIM = '#C9C9CE'; // light gray placeholder text
const LINE = '#E6E6EA'; // stroke
const SKEL = '#DEDEE3'; // skeleton gray

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const h2r = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// color interpolation: mix(p,'#C9C9CE','#111')
const mix = (p: number, a: string, b: string) => {
  const A = h2r(a), B = h2r(b), q = clamp01(p);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * q)},${Math.round(A[1] + (B[1] - A[1]) * q)},${Math.round(A[2] + (B[2] - A[2]) * q)})`;
};

// simple linear placeholder icons (pure SVG, zero dependencies)
const Icon: React.FC<{ k: 'leaf' | 'bowl' | 'wrap'; size: number }> = ({ k, size }) => (
  <div style={{ width: size, height: size, flex: '0 0 auto', color: TXT }}>
    <svg width={size} height={size} viewBox="0 0 16 16">
      {k === 'leaf' && (
        <>
          <path d="M3 13c0-6 5-10 10-10 0 6-4 10-10 10Z" fill="none" stroke="#111" strokeWidth={1.3} />
          <path d="M3 13 13 3" stroke="#111" strokeWidth={1.3} />
        </>
      )}
      {k === 'bowl' && (
        <>
          <path d="M2 7h12c0 4-2.6 6-6 6S2 11 2 7Z" fill="none" stroke="#111" strokeWidth={1.3} />
          <path d="M6 4.5V2M9.5 4.5V2" stroke="#111" strokeWidth={1.3} />
        </>
      )}
      {k === 'wrap' && (
        <>
          <circle cx={8} cy={8} r={5.6} fill="none" stroke="#111" strokeWidth={1.3} />
          <path d="M4.4 6.2h7.2M4.4 9.8h7.2" stroke="#111" strokeWidth={1.3} />
        </>
      )}
    </svg>
  </div>
);

// word-by-word darkening caption (uniform syntax for this series): light gray placeholder → words darken to black one by one → fade back to light gray → whole line to zero
// innP: entrance darkening progress; outP: exit progress (when >0, overrides color and whole-line opacity); showV: base line opacity
const Caption: React.FC<{
  text: string;
  left: number;
  top: number;
  size: number;
  showV: number;
  innP: number;
  outP: number;
}> = ({ text, left, top, size, showV, innP, outP }) => {
  const words = text.split(' ');
  const n = words.length;
  const st = 0.78 / n, win = st * 1.5; // entrance word stagger
  const stw = 0.55 / n;                // exit word stagger
  const rowOpacity = outP > 0 ? clamp01(1 - (outP - 0.7) / 0.3) : showV;
  return (
    <div
      style={{
        position: 'absolute',
        display: 'flex',
        alignItems: 'baseline',
        whiteSpace: 'nowrap',
        left,
        top,
        opacity: rowOpacity,
      }}
    >
      {words.map((w, i) => {
        const q = clamp01((innP - i * st) / win);
        let color = mix(q, DIM, TXT);
        if (outP > 0) {
          const p = clamp01((outP - i * stw) / (stw * 1.4));
          color = mix(1 - p, DIM, TXT);
        }
        return (
          <span
            key={i}
            style={{
              font: `600 ${size}px/1.25 ${SANS}`,
              color,
              letterSpacing: (-0.03 * (1 - q)).toFixed(4) + 'em',
              marginRight: i === n - 1 ? 0 : 4.5,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ---- document skeleton (multi-column list placeholders) params: exactly consistent with effect.js mkDoc(DW,DH,3) ----
const DW = 250, DH = 190, COLS = 3;
const COL_W = (DW - 28 - (COLS - 1) * 10) / COLS;
const DOC_COLS = Array.from({ length: COLS }, (_, c) => {
  const x = 14 + c * (COL_W + 10);
  return {
    x,
    headW: (COL_W * 0.72).toFixed(1),
    rows: Array.from({ length: 7 }, (_, r) => (COL_W * (0.55 + rand(c * 13 + r * 7) * 0.45)).toFixed(1)),
  };
});

const ITEMS: { n: string; ic: 'leaf' | 'bowl' | 'wrap'; cap: string }[] = [
  { n: 'Quick Start', ic: 'leaf', cap: 'Start matches their preference' },
  { n: 'Bundle Plan', ic: 'bowl', cap: 'Plan fits their weekday usage' },
  { n: 'Starter Kit', ic: 'wrap', cap: 'Kit is their top repeat item' },
];
const PX = 214, PY = 54, PH = 34, PG = 14;
const T0 = [0.26, 0.48, 0.70]; // deal start times for the three pills

export const DocParkLeftPillDeal: React.FC = () => {
  const t = useT();
  // document parked left: slides out leaving only ~35% width + shrinks to 0.92
  const park = seg(t, 0.06, 0.24, E.inOutCubic);
  // extremely slow auto-scroll (returns to a whole number of periods at t=1, so the frame is stable)
  const scrollY = (-((t * 3) % 1) * 40).toFixed(2);
  return (
    <DesignStage bg={BG}>
      {/* page + 440×240 fixed-size canvas (centered) */}
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
          {/* left document pane: parked left + shrunk, origin pinned at the left-edge midpoint */}
          <div
            style={{
              position: 'absolute',
              left: 34,
              top: (240 - DH) / 2,
              width: DW,
              height: DH,
              transformOrigin: '0% 50%',
              transform: `translateX(${lerp(park, 0, -55)}%) scale(${lerp(park, 1, 0.92)})`,
            }}
          >
            {/* document card: white background + border + skeleton bars (3 columns × 7 rows, widths from rand) */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: DW,
                height: DH,
                background: '#fff',
                border: `1px solid ${LINE}`,
                borderRadius: 10,
                boxShadow: '0 8px 26px rgba(0,0,0,.06)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  right: 0,
                  height: DH + 60,
                  transform: `translateY(${scrollY}px)`,
                }}
              >
                <div style={{ position: 'absolute', left: 14, top: 12, width: Math.round(DW * 0.34), height: 7, borderRadius: 3, background: INK, opacity: 0.85 }} />
                <div style={{ position: 'absolute', left: 14, top: 25, width: Math.round(DW * 0.2), height: 5, borderRadius: 3, background: SKEL }} />
                {DOC_COLS.map(({ x, headW, rows }, c) => (
                  <React.Fragment key={c}>
                    <div style={{ position: 'absolute', left: x, top: 44, width: `${headW}px`, height: 6, borderRadius: 3, background: '#9A9AA2' }} />
                    {rows.map((ww, r) => (
                      <div key={r} style={{ position: 'absolute', left: x, top: 58 + r * 13, width: `${ww}px`, height: 5, borderRadius: 2.5, background: SKEL }} />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* three pills + word-by-word captions on the right, dealt slowly at the T0 rhythm */}
          {ITEMS.map((it, k) => {
            const f = T0[k];
            const o = seg(t, f, f + 0.035, E.outQuad);
            const b = seg(t, f, f + 0.062, E.outBack);
            // caption: darkens from +3 frames after landing, fades out before the next pill enters
            const cs = f + 0.05, ce = k < 2 ? T0[k + 1] - 0.03 : 0.98;
            const showV = seg(t, cs, cs + 0.02);
            const innP = seg(t, cs, cs + (ce - cs) * 0.7);
            const outP = seg(t, ce - 0.05, ce, E.outQuad);
            return (
              <React.Fragment key={k}>
                <div
                  style={{
                    position: 'absolute',
                    left: PX,
                    top: PY + k * (PH + PG),
                    width: 172,
                    height: PH,
                    borderRadius: PH / 2,
                    background: '#fff',
                    border: `1px solid ${LINE}`,
                    boxSizing: 'border-box',
                    boxShadow: '0 4px 14px rgba(0,0,0,.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '0 14px',
                    opacity: o,
                    transform: `translateY(${lerp(b, 14, 0).toFixed(2)}px) scale(${lerp(b, 0.94, 1).toFixed(4)})`,
                  }}
                >
                  <Icon k={it.ic} size={16} />
                  <div style={{ font: `600 12.5px/1 ${SANS}`, color: TXT, letterSpacing: '-.01em' }}>{it.n}</div>
                </div>
                <Caption
                  text={it.cap}
                  left={PX + 4}
                  top={PY + k * (PH + PG) + PH + 7}
                  size={11}
                  showV={showV}
                  innP={innP}
                  outP={outP}
                />
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </DesignStage>
  );
};
