// scan-bracket-sweep — Scan Bracket viewfinder-bracket scanning light band (motion-lab final ported to native Remotion)
// A skeleton document pops to the center of the frame; black L-shaped viewfinder brackets drop into the four corners (offset inward 8px), then a 2.5px
// solid black line with an 80px dark-gray→transparent trail sweeps back and forth across the document 5 times — slow at both ends, fast in the middle, the trail always pointing
// opposite to the direction of travel — while the document itself stays perfectly still. Design coordinates 480×270 (DesignStage scales proportionally).
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const SCAN_BRACKET_SWEEP_DURATION = 150; // 5000ms @30fps

// —— b09 batch shared values (from motion-lab/fx/b09.js, inlined per rules, not exported) ——
const BG = '#F1F1F3'; // page light gray
const INK = '#0B0B0C'; // pure black
const LINE = '#E6E6EA'; // stroke
const SKEL = '#DEDEE3'; // skeleton gray

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const inOutSin = (x: number) => 0.5 - Math.cos(Math.PI * clamp01(x)) / 2;

// Document geometry: a 300×178 skeleton document centered in a 440×240 fixed canvas
const DW = 300;
const DH = 178;
const DX = (440 - DW) / 2;
const DY = (240 - DH) / 2;

// Skeleton column params (identical to effect.js mkDoc: 4 columns × 7 rows, same rand seeds for per-item reproduction)
const COLS = 4;
const COL_W = (DW - 28 - (COLS - 1) * 10) / COLS;
const SKEL_COLS = Array.from({ length: COLS }, (_, c) => ({
  x: 14 + c * (COL_W + 10),
  rows: Array.from({ length: 7 }, (_, r) => ({
    top: 58 + r * 13,
    w: Number((COL_W * (0.55 + rand(c * 13 + r * 7) * 0.45)).toFixed(1)),
  })),
}));

// Four-corner viewfinder brackets: 2px black borders on the two L sides, pulled in from an 8px outward offset on landing
const CS = 34;
const CB = `2px solid ${INK}`;
const CORNERS: { pos: React.CSSProperties; dx: number; dy: number }[] = [
  { pos: { left: -7, top: -7, borderLeft: CB, borderTop: CB }, dx: 1, dy: 1 },
  { pos: { right: -7, top: -7, borderRight: CB, borderTop: CB }, dx: -1, dy: 1 },
  { pos: { right: -7, bottom: -7, borderRight: CB, borderBottom: CB }, dx: -1, dy: -1 },
  { pos: { left: -7, bottom: -7, borderLeft: CB, borderBottom: CB }, dx: 1, dy: -1 },
];

const PASSES = 5;

export const ScanBracketSweep: React.FC = () => {
  const t = useT();

  // Document pops in: scale 0.86→1 + quick fade in
  const dp = seg(t, 0, 0.11, E.outCubic);

  // Scan back-and-forth: 5 passes, each pass leaves a 12% pause at the end, slow at both ends and fast in the middle (inOutSine)
  const sp = seg(t, 0.17, 0.95, E.linear);
  const raw = sp * PASSES;
  const pi = Math.min(PASSES - 1, Math.floor(raw));
  const local = clamp01((raw - pi) / 0.88);
  const dir = pi % 2 === 0 ? 1 : -1;
  const prog = inOutSin(local);
  const y = dir > 0 ? prog * DH : DH - prog * DH;
  // Light band overall fade in (0.16–0.2) / fade out (0.93–0.99)
  const clipOp = Number((seg(t, 0.16, 0.2) * (1 - seg(t, 0.93, 0.99))).toFixed(3));

  return (
    <DesignStage bg={BG}>
      {/* 440×240 fixed canvas (mkSheet), centered in the 480×270 design coordinates */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 440,
          height: 240,
          margin: '-120px 0 0 -220px',
        }}
      >
        {/* Holder: shared positioning container for document + light band + brackets */}
        <div style={{ position: 'absolute', left: DX, top: DY, width: DW, height: DH }}>
          {/* Skeleton document card (the captured page used content-box: the 1px border grows beyond 300×178) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: DW,
              height: DH,
              boxSizing: 'content-box',
              background: '#fff',
              border: `1px solid ${LINE}`,
              borderRadius: 10,
              boxShadow: '0 8px 26px rgba(0,0,0,.06)',
              overflow: 'hidden',
              transformOrigin: '50% 50%',
              transform: `scale(${lerp(dp, 0.86, 1)})`,
              opacity: clamp01(dp * 3),
            }}
          >
            <div style={{ position: 'absolute', left: 0, top: 0, right: 0 }}>
              {/* Title bar + subtitle bar */}
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  top: 12,
                  width: Math.round(DW * 0.34),
                  height: 7,
                  borderRadius: 3,
                  background: INK,
                  opacity: 0.85,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  top: 25,
                  width: Math.round(DW * 0.2),
                  height: 5,
                  borderRadius: 3,
                  background: SKEL,
                }}
              />
              {/* 4 skeleton columns: column header + 7 rows of random-width placeholder bars */}
              {SKEL_COLS.map((col, c) => (
                <React.Fragment key={c}>
                  <div
                    style={{
                      position: 'absolute',
                      left: col.x,
                      top: 44,
                      width: Number((COL_W * 0.72).toFixed(1)),
                      height: 6,
                      borderRadius: 3,
                      background: '#9A9AA2',
                    }}
                  />
                  {col.rows.map((row, r) => (
                    <div
                      key={r}
                      style={{
                        position: 'absolute',
                        left: col.x,
                        top: row.top,
                        width: row.w,
                        height: 5,
                        borderRadius: 2.5,
                        background: SKEL,
                      }}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Scan light band (clipped inside the document's rounded corners): 2.5px solid black line + 82px gradient trail pointing opposite to travel */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: DW,
              height: DH,
              borderRadius: 10,
              overflow: 'hidden',
              pointerEvents: 'none',
              opacity: clipOp,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: 0,
                transform: `translateY(${y.toFixed(2)}px)`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 82,
                  top: dir > 0 ? -82 : 2.5,
                  background:
                    dir > 0
                      ? 'linear-gradient(180deg,rgba(20,20,22,0),rgba(20,20,22,.5))'
                      : 'linear-gradient(180deg,rgba(20,20,22,.5),rgba(20,20,22,0))',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  height: 2.5,
                  background: INK,
                }}
              />
            </div>
          </div>

          {/* Four-corner viewfinder brackets: staggered landing, pulled inward 8px (original page content-box, so the 2px arms sit outside 34×34) */}
          {CORNERS.map((c, i) => {
            const p = seg(t, 0.08 + i * 0.022, 0.08 + i * 0.022 + 0.055, E.outCubic);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: CS,
                  height: CS,
                  boxSizing: 'content-box',
                  opacity: p,
                  transform: `translate(${(1 - p) * 8 * c.dx}px,${(1 - p) * 8 * c.dy}px)`,
                  ...c.pos,
                }}
              />
            );
          })}
        </div>
      </div>
    </DesignStage>
  );
};
