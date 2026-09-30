// comic-panel-split — comic panel split
// FakeDashboard A (with a KPI number block) full-screen for 20f → hard-cuts into 3 diagonal comic panels
// (12° diagonal edges, 10px white seams + ink outlines), each popping in 2f apart (3f scale 1.06→1
// + darkening pulse). The three panels = three camera setups on the same page: wide 1x / card close-up 1.9x /
// number close-up 2.6x. Hold 18f, each panel slowly creeping closer to stay alive → the third panel's diagonal
// frame expands 12f out-cubic, swallowing the screen as the next shot's close-up. From 57f the overlay is unmounted
// (close-up straight out, panel structure and seams all removed), 57–150f true stillness 93f ≥ 40f. Frame-deterministic, no random source.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';

const SPLIT = 20;              // full-screen A ends, panels begin
const POP = 3;                 // each panel pops in over 3f
const STAGGER = 2;             // 2f stagger between panels
const HOLD_END = 45;           // 27f of popping + 18f hold
const EXPAND_END = 57;         // third panel's 12f expansion ends
// 57–150 true stillness, 93f

// diagonal edges at 12°: tan(12°)×1080 ≈ 230, top edge shifted right of bottom edge by 230
// seams 10px (horizontal half-width 5px)
// seam 1: top 750 / bottom 520; seam 2: top 1405 / bottom 1175
const outCubic = Easing.out(Easing.cubic);

// page = FakeDashboard A + a KPI number block inside the top-left card (anchors the "number close-up")
const PageA: React.FC = () => (
  <div style={{ width: 1920, height: 1080, position: 'relative' }}>
    <FakeDashboard variant="A" />
    <div style={{
      position: 'absolute', left: 328, top: 320, width: 380, height: 160,
      background: G.card, borderRadius: 12, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 800, fontSize: 96, color: G.ink, letterSpacing: -2, lineHeight: 1 }}>
        1,284
      </div>
      <div style={{ height: 10, width: 150, background: G.mid, borderRadius: 5 }} />
    </div>
  </div>
);

type PanelSpec = {
  clip: (f: number) => string; // clip-path polygon
  centroidX: number;           // pop-in scale origin
  originX: number; originY: number; // content transform origin (focal point)
  baseScale: number;           // camera magnification
  tx: number; ty: number;      // offset moving the focal point to the panel center
  z: number;
};

export const ComicPanelSplit: React.FC = () => {
  const frame = useCurrentFrame();

  // ===== overlay unmounted: once the expansion completes the close-up renders straight out, panel structure / seams all removed =====
  if (frame >= EXPAND_END) {
    return (
      <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
        <div style={{
          width: 1920, height: 1080,
          transform: 'translate(442px, 140px) scale(2.6)',
          transformOrigin: '518px 400px',
        }}>
          <PageA />
        </div>
      </AbsoluteFill>
    );
  }

  // ===== phase 1: full-screen A =====
  if (frame < SPLIT) {
    return (
      <AbsoluteFill style={{ background: G.bg }}>
        <PageA />
      </AbsoluteFill>
    );
  }

  // ===== phases 2/3: panels + third-panel expansion =====
  // slight push-in during the hold (27–45f linear, very slow)
  const push = interpolate(frame, [SPLIT + 2 * STAGGER + POP, HOLD_END], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // third-panel expansion progress (spreading with out-cubic)
  const ex = interpolate(frame, [HOLD_END, EXPAND_END], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: outCubic,
  });

  // third-panel left diagonal (= seam 2's screen-swallowing path)
  const e3Top = 1410 + ex * (-60 - 1410);    // 1410 → -60
  const e3Bot = 1180 + ex * (-290 - 1180);   // 1180 → -290

  const panels: PanelSpec[] = [
    { // wide 1x
      clip: () => 'polygon(0px 0px, 745px 0px, 515px 1080px, 0px 1080px)',
      centroidX: 315, originX: 960, originY: 540,
      baseScale: 1 + push * 0.03, tx: 0, ty: 0, z: 1,
    },
    { // card close-up 1.9x (mid-top card)
      clip: () => 'polygon(755px 0px, 1400px 0px, 1170px 1080px, 525px 1080px)',
      centroidX: 962, originX: 1070, originY: 371,
      baseScale: 1.9 + push * 0.055, tx: -108, ty: 169, z: 1,
    },
    { // number close-up 2.6x (KPI block); on expansion the focal point moves from panel center to screen center
      clip: () => `polygon(${e3Top}px 0px, 1920px 0px, 1920px 1080px, ${e3Bot}px 1080px)`,
      centroidX: 1607, originX: 518, originY: 400,
      // the push increment fades out during the expansion; scale converges back to 2.6 (exactly matching the unmounted frame)
      baseScale: 2.6 + push * 0.08 * (1 - ex), tx: 1089 + ex * (442 - 1089), ty: 140, z: 3,
    },
  ];

  // seam opacity: seam 1 appears as panel 2 pops in and fades out linearly before being swallowed in the expansion;
  // seam 2 appears as panel 3 pops in and fades out linearly over the last 4f of the expansion (linear for the dissolve)
  const seam1O = Math.min(
    interpolate(frame, [SPLIT + STAGGER, SPLIT + STAGGER + 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(frame, [HOLD_END, HOLD_END + 3], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );
  const seam2O = Math.min(
    interpolate(frame, [SPLIT + 2 * STAGGER, SPLIT + 2 * STAGGER + 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(frame, [EXPAND_END - 4, EXPAND_END], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );

  return (
    <AbsoluteFill style={{ background: '#ffffff' }}>
      {panels.map((p, i) => {
        const start = SPLIT + i * STAGGER;
        if (frame < start) return null; // not rendered until it pops in
        // pop-in: 3f scale 1.06→1 + darkening pulse
        const pop = interpolate(frame, [start, start + POP], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: outCubic,
        });
        const popScale = 1.06 - 0.06 * pop;
        const pulse = 0.3 * (1 - pop);
        return (
          <div key={i} style={{
            position: 'absolute', inset: 0, zIndex: p.z,
            clipPath: p.clip(frame),
            transform: `scale(${popScale})`,
            transformOrigin: `${p.centroidX}px 540px`,
          }}>
            <div style={{
              width: 1920, height: 1080,
              transform: `translate(${p.tx}px, ${p.ty}px) scale(${p.baseScale})`,
              transformOrigin: `${p.originX}px ${p.originY}px`,
            }}>
              <PageA />
            </div>
            {pulse > 0.005 && (
              <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${pulse})` }} />
            )}
          </div>
        );
      })}
      {/* diagonal seams: white seam linchpin + ink outline (dark 16 underneath, white 10 on top → 3px ink edge on each side) */}
      {(seam1O > 0.005 || seam2O > 0.005) && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}>
          {seam1O > 0.005 && (
            <g opacity={seam1O}>
              <line x1={750} y1={-10} x2={520} y2={1090} stroke="#2f2f2f" strokeWidth={16} />
              <line x1={750} y1={-10} x2={520} y2={1090} stroke="#ffffff" strokeWidth={10} />
            </g>
          )}
          {seam2O > 0.005 && (
            <g opacity={seam2O}>
              <line x1={e3Top - 5} y1={-10} x2={e3Bot - 5} y2={1090} stroke="#2f2f2f" strokeWidth={16} />
              <line x1={e3Top - 5} y1={-10} x2={e3Bot - 5} y2={1090} stroke="#ffffff" strokeWidth={10} />
            </g>
          )}
        </svg>
      )}
    </AbsoluteFill>
  );
};
