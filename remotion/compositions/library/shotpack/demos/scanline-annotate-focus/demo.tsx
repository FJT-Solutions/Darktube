// scanline-annotate-focus — Scanline Annotate scan-analysis framing annotation (motion-lab final ported to native Remotion)
// A bright scan line sweeps down the page; as it passes, camera viewfinder frames pop up in sequence: four corner brackets quickly converge from about 1.75×
// size onto the target block (slight overshoot at the moment of alignment, then settling), followed by a small monospace annotation beside it.
// The top status line counts 00/06→06/06 in sync, then switches to ANALYSIS · COMPLETE when the scan finishes.
// Page content is a neutral placeholder template; both annotation text and accent color can be replaced per project. Design coordinates 480×270 (DesignStage scales proportionally).
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const SCANLINE_ANNOTATE_FOCUS_DURATION = 138; // 4600ms @30fps

const MONO = "'SF Mono',Menlo,Consolas,monospace";
const SERIF = "Georgia,'Times New Roman',serif";
const ACCENT = '#9fb6e8'; // template accent color, replaceable per project
const A_RGB = '159,182,232';

/* ---- Analysis targets (bbox manually tuned with margin): ft = viewfinder trigger time, derived from scan order ---- */
type Target = { x: number; y: number; w: number; h: number; label: string; lx: number; ly: number; ft: number };
const TARGETS: Target[] = (() => {
  const ts: Target[] = [
    { x: 18, y: 30, w: 108, h: 22, label: 'LOGO · MARK + WORDMARK', lx: 132, ly: 38, ft: 0 },
    { x: 292, y: 48, w: 170, h: 158, label: 'MODULE · KINETIC TYPE', lx: 292, ly: 36, ft: 0 },
    { x: 18, y: 58, w: 242, h: 78, label: 'H1 · SERIF DISPLAY', lx: 266, ly: 92, ft: 0 },
    { x: 18, y: 160, w: 136, h: 32, label: 'CTA · PRIMARY + GHOST', lx: 160, ly: 172, ft: 0 },
    { x: 14, y: 240, w: 224, h: 18, label: 'FOOTER · LEGAL', lx: 242, ly: 246, ft: 0 },
    { x: 348, y: 235, w: 116, h: 23, label: 'SOCIAL · BRAND VOICE', lx: 348, ly: 224, ft: 0 },
  ];
  // Trigger time: when the scan line (0.06→0.66 vertical sweep -30→300) passes the bbox's lower edge
  const rawT = (tg: Target) => 0.06 + ((tg.y + tg.h + 30) / 330) * 0.6;
  let prev = -1;
  for (const tg of [...ts].sort((a, b) => a.y + a.h - (b.y + b.h))) {
    tg.ft = Math.max(rawT(tg), prev + 0.05); // clamp to a minimum interval in order
    prev = tg.ft;
  }
  return ts;
})();

// Viewfinder four-corner brackets: two borders per corner facing outward
// Note the boxSizing content-box: the captured page has 9×9 content + 1.5px outward border (outer frame 10.5);
// the Remotion template's global border-box would pull the border inward, shortening the bracket arms and shifting the right/bottom corners inward.
const C_BORDER = '1.5px solid #f2f3f5';
const CORNERS: React.CSSProperties[] = [
  { left: 0, top: 0, borderTop: C_BORDER, borderLeft: C_BORDER },
  { right: 0, top: 0, borderTop: C_BORDER, borderRight: C_BORDER },
  { left: 0, bottom: 0, borderBottom: C_BORDER, borderLeft: C_BORDER },
  { right: 0, bottom: 0, borderBottom: C_BORDER, borderRight: C_BORDER },
];

export const ScanlineAnnotateFocus: React.FC = () => {
  const t = useT();

  // Scan line vertical sweep + fade in/out at both ends
  const ly = lerp(seg(t, 0.06, 0.66), -30, 300);
  const lineOpacity = seg(t, 0.04, 0.09) * (1 - seg(t, 0.66, 0.71));

  // Count of triggered viewfinders (a>0 means popped up)
  const fired = TARGETS.reduce((acc, tg) => acc + (seg(t, tg.ft, tg.ft + 0.11, E.outCubic) > 0 ? 1 : 0), 0);
  const done = seg(t, 0.74, 0.8);

  return (
    <DesignStage bg="#0a0b0e">
      {/* ---- Neutral placeholder page (static base) ---- */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#101116,#0c0d11)' }}>
        {/* Top bar (url pill + status) — measured 0.5px taller than the original sample (subpixel baseline rounding);
            fractional top values get swallowed by rounding, so translateY compensates instead (transform isn't pixel-rounded) */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 480, height: 30, transform: 'translateY(0.5px)' }}>
          <div style={{ position: 'absolute', left: 18, top: 11, padding: '3px 10px', border: '1px solid #2a2c33', borderRadius: 9, font: `500 7px ${MONO}`, color: '#8d93a0', letterSpacing: 1 }}>app.example.com</div>
          <div style={{ position: 'absolute', right: 18, top: 14, font: `500 7px ${MONO}`, color: '#565b66', letterSpacing: 1.5 }}>200 OK · TLS</div>
        </div>
        {/* Logo: dot-matrix mark + serif wordmark */}
        <div style={{ position: 'absolute', left: 24, top: 35, width: 100, height: 18 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ position: 'absolute', width: 4, height: 4, borderRadius: '50%', background: '#e8e9ee', left: (i % 2) * 6, top: 2 + (i >> 1) * 6 }} />
          ))}
          <div style={{ position: 'absolute', left: 17, top: 0, font: `400 13px ${SERIF}`, color: '#eceef2' }}>
            Acme <i>Studio</i>
          </div>
        </div>
        {/* H1 two lines + footnote */}
        <div style={{ position: 'absolute', left: 22, top: 64, width: 242, height: 84 }}>
          {/* Two 29px serif lines measure 0.5px lower than the original sample (line-box rounding); translateY compensates (fractional top gets swallowed) */}
          <div style={{ position: 'absolute', left: 0, top: 0, font: `400 29px ${SERIF}`, color: '#f2f3f6', letterSpacing: 0.3, transform: 'translateY(-0.5px)' }}>The headline for</div>
          <div style={{ position: 'absolute', left: 0, top: 36, font: `italic 400 29px ${SERIF}`, color: '#f2f3f6', letterSpacing: 0.3, transform: 'translateY(-0.5px)' }}>your product here</div>
          <div style={{ position: 'absolute', left: 1, top: 79, font: `500 6.5px ${MONO}`, color: '#565b66', letterSpacing: 1.5 }}>H1 · UI-SERIF / GEORGIA</div>
        </div>
        {/* CTA row */}
        <div style={{ position: 'absolute', left: 22, top: 166, width: 136, height: 26 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, padding: '6px 13px', border: '1px solid #3a3d46', borderRadius: 12, font: `600 7.5px ${MONO}`, color: '#e8e9ee', letterSpacing: 1.5 }}>GET STARTED</div>
          <div style={{ position: 'absolute', left: 100, top: 7, font: `500 7.5px ${MONO}`, color: '#6a707c', letterSpacing: 1.5 }}>DOCS</div>
        </div>
        {/* Right module card (boxSizing content-box: the captured page's border grows outward, keeping the content box at 162×150) */}
        <div style={{ position: 'absolute', left: 296, top: 52, width: 162, height: 150, boxSizing: 'content-box', background: '#121319', border: '1px solid #23252d', borderRadius: 5 }}>
          <div style={{ position: 'absolute', left: 10, top: 9, font: `500 6.5px ${MONO}`, color: '#7c828e', letterSpacing: 1.5 }}>WORK</div>
          <div style={{ position: 'absolute', right: 10, top: 9, font: `500 6.5px ${MONO}`, color: '#565b66', letterSpacing: 1.5 }}>04 / 08</div>
          <div style={{ position: 'absolute', left: 0, top: 24, width: '100%', height: 1, background: '#1e2028' }} />
          <div style={{ position: 'absolute', left: 0, top: 44, width: '100%', textAlign: 'center', font: `italic 400 36px ${SERIF}`, color: '#f4f5f8' }}>sample</div>
          <div style={{ position: 'absolute', left: 0, top: 104, width: '100%', height: 1, background: '#1e2028' }} />
          <div style={{ position: 'absolute', left: 10, top: 112, font: `500 6px ${MONO}`, color: '#6a707c', letterSpacing: 1.5 }}>KINETIC TYPE · 04</div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ position: 'absolute', left: 10 + i * 30, top: 124, width: 24, height: 16, background: '#1a1c23', borderRadius: 2 }} />
          ))}
          <div style={{ position: 'absolute', right: 8, top: 129, font: `500 6px ${MONO}`, color: '#565b66' }}>00:30</div>
        </div>
        {/* Footer + social chip */}
        <div style={{ position: 'absolute', left: 18, top: 243, width: 220, height: 14 }}>
          <div style={{ position: 'absolute', left: 0, top: 3, font: `500 6.5px ${MONO}`, color: '#4c515c', letterSpacing: 1.5 }}>A PRODUCT OF ACME · ACME LABS, INC.</div>
        </div>
        <div style={{ position: 'absolute', left: 352, top: 239, width: 108, height: 16 }}>
          {/* boxSizing content-box: the captured page has 11×11 content + 1px outward border */}
          <div style={{ position: 'absolute', left: 0, top: 2, width: 11, height: 11, boxSizing: 'content-box', border: '1px solid #3a3d46', borderRadius: 2, font: `600 7px ${MONO}`, color: '#c9cdd6', textAlign: 'center', lineHeight: '11px' }}>x</div>
          <div style={{ position: 'absolute', left: 17, top: 3, font: `600 7.5px ${MONO}`, color: '#c9cdd6', letterSpacing: 1.5 }}>@USERNAME</div>
        </div>
      </div>

      {/* ---- Viewfinder + annotation (triggered in scan order) ---- */}
      {TARGETS.map((tg, i) => {
        const a = seg(t, tg.ft, tg.ft + 0.11, E.outCubic); // pop-up progress
        const s = lerp(E.outBack(seg(t, tg.ft, tg.ft + 0.13)), 1.75, 1); // 1.75× converge + overshoot settling
        const fillO = 0.07 * seg(t, tg.ft + 0.04, tg.ft + 0.09) * (1 - seg(t, tg.ft + 0.09, tg.ft + 0.22)); // white micro-flash at the alignment moment
        const la = seg(t, tg.ft + 0.05, tg.ft + 0.16, E.outCubic); // annotation fades in and shifts up
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: tg.x,
                top: tg.y,
                width: tg.w,
                height: tg.h,
                opacity: Math.min(1, a * 1.6),
                transform: `scale(${a > 0 ? s : 1.75})`,
              }}
            >
              {CORNERS.map((c, k) => (
                <div key={k} style={{ position: 'absolute', width: 9, height: 9, boxSizing: 'content-box', ...c }} />
              ))}
              <div style={{ position: 'absolute', inset: 1, background: '#fff', opacity: fillO }} />
            </div>
            <div
              style={{
                position: 'absolute',
                left: tg.lx,
                top: tg.ly,
                font: `500 6.5px ${MONO}`,
                color: '#b8bdc7',
                letterSpacing: 1.5,
                whiteSpace: 'nowrap',
                opacity: la,
                transform: `translateY(${lerp(la, 4, 0)}px)`,
              }}
            >
              {tg.label}
            </div>
          </React.Fragment>
        );
      })}

      {/* ---- Scan line (gradient trail + bright core) ---- */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: 40,
          background: `linear-gradient(180deg,transparent,rgba(${A_RGB},.07) 55%,rgba(${A_RGB},.02) 96%,transparent)`,
          transform: `translateY(${ly - 40}px)`,
          opacity: lineOpacity,
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: 1.5,
            background: 'rgba(238,244,255,.9)',
            boxShadow: `0 0 7px ${ACCENT},0 0 18px rgba(${A_RGB},.35)`,
          }}
        />
      </div>

      {/* ---- Top status line: SCAN count → ANALYSIS · COMPLETE ---- */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 14,
          transform: 'translateX(-50%)',
          font: `600 7px ${MONO}`,
          letterSpacing: 2,
          color: done >= 1 ? ACCENT : '#8d93a0',
          opacity: seg(t, 0.03, 0.08),
        }}
      >
        {done >= 1 ? 'ANALYSIS · COMPLETE' : `SCAN · 0${fired}/0${TARGETS.length}`}
      </div>
    </DesignStage>
  );
};
