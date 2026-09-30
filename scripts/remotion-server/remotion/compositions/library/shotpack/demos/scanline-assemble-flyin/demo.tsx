// scanline-assemble-flyin — Scanline Assemble scan-assembled component fly-in (motion-lab final ported to native Remotion)
// The page opens as an empty dark grid; a bright scan line sweeps from top to bottom. Once the line passes each block's landing spot, that component flies in from
// off-screen in all directions (top-left logo from the left, right module card from the right, H1 from the lower-left, CTA from below, footer socials from the bottom sides),
// with slight overshoot and motion-trail blur; the instant it snaps into place a thin bright edge flashes. When the full page has been scanned, assembly is exactly complete.
// Page content is a neutral placeholder template; the accent color can be replaced per project. Design coordinates 480×270 (DesignStage scales proportionally).
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const SCANLINE_ASSEMBLE_FLYIN_DURATION = 138; // 4600ms @30fps

const MONO = "'SF Mono',Menlo,Consolas,monospace";
const SERIF = "Georgia,'Times New Roman',serif";
const ACCENT = '#9fb6e8'; // template accent color, replaceable per project
const A_RGB = '159,182,232';

/* ---- Per-component fly-in plan: y = scan landing point (for triggering), from = off-screen start offset, rot = starting rotation ---- */
type Plan = { key: string; y: number; from: [number, number]; rot: number; ft: number };
const PLAN: Plan[] = (() => {
  const ps: Plan[] = [
    { key: 'topbar', y: 30, from: [0, -70], rot: 0, ft: 0 },
    { key: 'logo', y: 53, from: [-160, -30], rot: -6, ft: 0 },
    { key: 'module', y: 100, from: [230, 40], rot: 5, ft: 0 },
    { key: 'h1', y: 148, from: [-260, 60], rot: -4, ft: 0 },
    { key: 'cta', y: 192, from: [-60, 130], rot: 3, ft: 0 },
    { key: 'footer', y: 257, from: [-140, 70], rot: 2, ft: 0 },
    { key: 'social', y: 262, from: [150, 70], rot: -3, ft: 0 },
  ];
  // Trigger time: when the scan line (0.05→0.72 vertical sweep -30→300) reaches the component's landing y, clamped in order to a minimum interval
  let prev = -1;
  for (const pl of ps) {
    pl.ft = Math.max(0.05 + ((pl.y + 30) / 330) * 0.67 - 0.02, prev + 0.045);
    prev = pl.ft;
  }
  return ps;
})();
const FT: Record<string, number> = Object.fromEntries(PLAN.map((pl) => [pl.key, pl.ft]));

export const ScanlineAssembleFlyin: React.FC = () => {
  const t = useT();

  // Scan line vertical sweep + fade in/out at both ends
  const ly = lerp(seg(t, 0.05, 0.72), -30, 300);
  const lineOpacity = seg(t, 0.03, 0.08) * (1 - seg(t, 0.72, 0.77));

  // Component fly-in style: outBack overshoot snap + motion-trail blur (sharp on landing)
  const fly = ({ from, rot, ft }: Plan): React.CSSProperties => {
    const a = seg(t, ft, ft + 0.15, E.outBack);
    const vis = t >= ft ? 1 : 0;
    const speed = a > 0 && a < 0.97 ? 1 - a : 0;
    return {
      position: 'absolute',
      opacity: vis * Math.min(1, seg(t, ft, ft + 0.06) * 1.4),
      transform: `translate(${lerp(a, from[0], 0)}px,${lerp(a, from[1], 0)}px) rotate(${lerp(a, rot, 0)}deg)`,
      filter: speed > 0.03 ? `blur(${speed * 2.2}px)` : 'none',
    };
  };
  // Thin bright edge flash on landing (inner layer inset:-3px border)
  const flash = (ft: number): React.CSSProperties => ({
    position: 'absolute',
    inset: -3,
    border: `1px solid rgba(${A_RGB},.9)`,
    borderRadius: 4,
    opacity: seg(t, ft + 0.11, ft + 0.15) * (1 - seg(t, ft + 0.15, ft + 0.26)),
    pointerEvents: 'none',
  });

  // Count of landed components (a≥0.99 counts as snapped in place)
  const placed = PLAN.reduce((acc, pl) => acc + (seg(t, pl.ft, pl.ft + 0.15, E.outBack) >= 0.99 ? 1 : 0), 0);
  const done = seg(t, 0.8, 0.86);

  return (
    <DesignStage bg="#0a0b0e">
      {/* Page background gradient: original CSS was #101116→#0c0d11; after the sample's x264 near-black quantization it measures
          rgb(15,17,20)→rgb(10,12,16), so #0f1114→#0a0c10 is used per reference-frame calibration */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#0f1114,#0a0c10)' }}>
        {/* Empty page base: dark grid (the only visible thing before components fly in) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            background:
              'repeating-linear-gradient(0deg,transparent 0 23px,rgba(255,255,255,.025) 23px 24px),' +
              'repeating-linear-gradient(90deg,transparent 0 23px,rgba(255,255,255,.025) 23px 24px)',
          }}
        />
        {/* Top bar (url pill + status) — the whole group drops in from above */}
        <div style={{ ...fly(PLAN[0]), left: 0, top: 0, width: 480, height: 30 }}>
          <div style={{ position: 'absolute', left: 18, top: 11, padding: '3px 10px', border: '1px solid #2a2c33', borderRadius: 9, font: `500 7px ${MONO}`, color: '#8d93a0', letterSpacing: 1 }}>app.example.com</div>
          <div style={{ position: 'absolute', right: 18, top: 14, font: `500 7px ${MONO}`, color: '#565b66', letterSpacing: 1.5 }}>200 OK · TLS</div>
          <div style={flash(FT.topbar)} />
        </div>
        {/* Logo: dot-matrix mark + serif wordmark — flies in from the left */}
        <div style={{ ...fly(PLAN[1]), left: 24, top: 35, width: 100, height: 18 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ position: 'absolute', width: 4, height: 4, borderRadius: '50%', background: '#e8e9ee', left: (i % 2) * 6, top: 2 + (i >> 1) * 6 }} />
          ))}
          <div style={{ position: 'absolute', left: 17, top: 0, font: `400 13px ${SERIF}`, color: '#eceef2' }}>
            Acme <i>Studio</i>
          </div>
          <div style={flash(FT.logo)} />
        </div>
        {/* H1 two lines + footnote — flies in from the lower-left */}
        <div style={{ ...fly(PLAN[3]), left: 22, top: 64, width: 242, height: 84 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, font: `400 29px ${SERIF}`, color: '#f2f3f6', letterSpacing: 0.3 }}>The headline for</div>
          <div style={{ position: 'absolute', left: 0, top: 36, font: `italic 400 29px ${SERIF}`, color: '#f2f3f6', letterSpacing: 0.3 }}>your product here</div>
          <div style={{ position: 'absolute', left: 1, top: 79, font: `500 6.5px ${MONO}`, color: '#565b66', letterSpacing: 1.5 }}>H1 · UI-SERIF / GEORGIA</div>
          <div style={flash(FT.h1)} />
        </div>
        {/* CTA row — flies in from below */}
        <div style={{ ...fly(PLAN[4]), left: 22, top: 166, width: 136, height: 26 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, padding: '6px 13px', border: '1px solid #3a3d46', borderRadius: 12, font: `600 7.5px ${MONO}`, color: '#e8e9ee', letterSpacing: 1.5 }}>GET STARTED</div>
          <div style={{ position: 'absolute', left: 100, top: 7, font: `500 7.5px ${MONO}`, color: '#6a707c', letterSpacing: 1.5 }}>DOCS</div>
          <div style={flash(FT.cta)} />
        </div>
        {/* Right module card — flies in from the right */}
        {/* The captured page used content-box: 162×150 plus a 1px border (164×152 total); boxSizing added to match geometry */}
        <div style={{ ...fly(PLAN[2]), left: 296, top: 52, width: 162, height: 150, boxSizing: 'content-box', background: '#121319', border: '1px solid #23252d', borderRadius: 5 }}>
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
          <div style={flash(FT.module)} />
        </div>
        {/* Footer — flies in from the lower-left */}
        <div style={{ ...fly(PLAN[5]), left: 18, top: 243, width: 220, height: 14 }}>
          <div style={{ position: 'absolute', left: 0, top: 3, font: `500 6.5px ${MONO}`, color: '#4c515c', letterSpacing: 1.5 }}>A PRODUCT OF ACME · ACME LABS, INC.</div>
          <div style={flash(FT.footer)} />
        </div>
        {/* Social chip — flies in from the lower-right */}
        <div style={{ ...fly(PLAN[6]), left: 352, top: 239, width: 108, height: 16 }}>
          {/* Also content-box: 11×11 plus a 1px border (13×13 total) */}
          <div style={{ position: 'absolute', left: 0, top: 2, width: 11, height: 11, boxSizing: 'content-box', border: '1px solid #3a3d46', borderRadius: 2, font: `600 7px ${MONO}`, color: '#c9cdd6', textAlign: 'center', lineHeight: '11px' }}>x</div>
          <div style={{ position: 'absolute', left: 17, top: 3, font: `600 7.5px ${MONO}`, color: '#c9cdd6', letterSpacing: 1.5 }}>@USERNAME</div>
          <div style={flash(FT.social)} />
        </div>
      </div>

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

      {/* ---- Top status line: BUILD count → ASSEMBLY · COMPLETE ---- */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 14,
          transform: 'translateX(-50%)',
          font: `600 7px ${MONO}`,
          letterSpacing: 2,
          color: done >= 1 ? ACCENT : '#8d93a0',
          opacity: seg(t, 0.02, 0.07),
          zIndex: 60,
        }}
      >
        {done >= 1 ? 'ASSEMBLY · COMPLETE' : `BUILD · 0${placed}/0${PLAN.length}`}
      </div>
    </DesignStage>
  );
};
