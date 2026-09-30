// assemble-then-type-flyin — Assemble + Type Fly-in text landing in 3D after assembly (motion-lab final ported to native Remotion)
// On an empty dark grid page, text-less component skeletons (frames, cards, dividers, color blocks) first fly in from all directions to fit into place;
// then the text at each location flies in character by character from 3D space — each character carries its own large rotateX/Y/Z rotation and depth offset,
// rotating down onto its target position, headline first then small labels; once everything has landed, the page is complete.
// Content is a neutral placeholder template; the accent color can be replaced per project. Design coordinates 480×270 (DesignStage scales proportionally).
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const ASSEMBLE_THEN_TYPE_FLYIN_DURATION = 156; // 5200ms @30fps

const MONO2 = "'SF Mono',Menlo,Consolas,monospace";
const SERIF2 = "Georgia,'Times New Roman',serif";

/* ---- Component skeletons (all text-less): from=fly-in start offset, rot=starting rotation, ft=take-off time ---- */
type Shell = { from: [number, number]; rot: number; ft: number };
const SH: Record<string, Shell> = {
  urlPill: { from: [0, -60], rot: 0, ft: 0.04 },
  topLine: { from: [80, -40], rot: 4, ft: 0.07 },
  mark: { from: [-140, -30], rot: -8, ft: 0.1 },
  card: { from: [220, 30], rot: 6, ft: 0.13 },
  cta: { from: [-70, 120], rot: -4, ft: 0.17 },
  social: { from: [130, 60], rot: 5, ft: 0.2 },
};

/* ---- Text blocks (per-character 3D fly-in): within a segment i marks italics; start=this block's first-character take-off time ---- */
type TSeg = { s: string; i?: boolean };
type Block = { x: number; y: number; font: string; color: string; ls: number; start: number; segs: TSeg[]; dy?: number };
// Large text lands first (from 0.34), small labels later. dy is a baseline compensation: 29px Georgia under transform scaling
// renders with a 0.5px baseline rounding difference vs the original DPR=4 screenshot, corrected with translateY (top gets snapped to whole pixels).
const BLOCKS: Block[] = [
  { x: 22, y: 64, font: `400 29px ${SERIF2}`, color: '#f2f3f6', ls: 0.3, start: 0.34, segs: [{ s: 'The headline for' }], dy: -0.5 },
  { x: 22, y: 100, font: `400 29px ${SERIF2}`, color: '#f2f3f6', ls: 0.3, start: 0.4, segs: [{ s: 'your product here', i: true }], dy: -0.5 },
  { x: 41, y: 35, font: `400 13px ${SERIF2}`, color: '#eceef2', ls: 0, start: 0.47, segs: [{ s: 'Acme ' }, { s: 'Studio', i: true }] },
  { x: 316, y: 96, font: `italic 400 36px ${SERIF2}`, color: '#f4f5f8', ls: 0, start: 0.5, segs: [{ s: 'sample', i: true }] },
  { x: 34, y: 172, font: `600 7.5px ${MONO2}`, color: '#e8e9ee', ls: 1.5, start: 0.58, segs: [{ s: 'GET STARTED' }] },
  { x: 122, y: 173, font: `500 7.5px ${MONO2}`, color: '#6a707c', ls: 1.5, start: 0.62, segs: [{ s: 'DOCS' }] },
  { x: 24, y: 14, font: `500 7px ${MONO2}`, color: '#8d93a0', ls: 1, start: 0.64, segs: [{ s: 'app.example.com' }], dy: 0.5 },
  { x: 306, y: 61, font: `500 6.5px ${MONO2}`, color: '#7c828e', ls: 1.5, start: 0.66, segs: [{ s: 'WORK' }] },
  { x: 432, y: 61, font: `500 6.5px ${MONO2}`, color: '#565b66', ls: 1.5, start: 0.68, segs: [{ s: '04 / 08' }] },
  { x: 306, y: 164, font: `500 6px ${MONO2}`, color: '#6a707c', ls: 1.5, start: 0.7, segs: [{ s: 'KINETIC TYPE · 04' }] },
  { x: 22, y: 143, font: `500 6.5px ${MONO2}`, color: '#565b66', ls: 1.5, start: 0.72, segs: [{ s: 'H1 · UI-SERIF / GEORGIA' }] },
  { x: 18, y: 246, font: `500 6.5px ${MONO2}`, color: '#4c515c', ls: 1.5, start: 0.74, segs: [{ s: 'A PRODUCT OF ACME · ACME LABS, INC.' }] },
  { x: 369, y: 242, font: `600 7.5px ${MONO2}`, color: '#c9cdd6', ls: 1.5, start: 0.76, segs: [{ s: '@USERNAME' }] },
];

// Per-character random fly-in params: k is the global character index (accumulated across blocks, matching effect.js's charSeed)
type CharP = { dx: number; dy: number; dz: number; rx: number; ry: number; rz: number };
let charSeed = 0;
const CHAR_PARAMS: CharP[][][] = BLOCKS.map((b) =>
  b.segs.map((sg) =>
    Array.from(sg.s, () => {
      const k = charSeed++;
      return {
        dx: (rand(k) - 0.5) * 340,
        dy: (rand(k + 50) - 0.5) * 260,
        dz: -120 - rand(k + 99) * 300,
        rx: (rand(k + 7) - 0.5) * 340,
        ry: (rand(k + 13) - 0.5) * 380,
        rz: (rand(k + 23) - 0.5) * 240,
      };
    })
  )
);

export const AssembleThenTypeFlyin: React.FC = () => {
  const t = useT();

  // Phase one: skeletons fly in from all directions (no text) — outBack bounce-back + motion-residual blur
  const shell = ({ from, rot, ft }: Shell): React.CSSProperties => {
    const a = seg(t, ft, ft + 0.14, E.outBack);
    const sp = a > 0 && a < 0.97 ? 1 - a : 0;
    return {
      position: 'absolute',
      opacity: t >= ft ? Math.min(1, seg(t, ft, ft + 0.05) * 1.5) : 0,
      transform: `translate(${lerp(a, from[0], 0)}px,${lerp(a, from[1], 0)}px) rotate(${lerp(a, rot, 0)}deg)`,
      filter: sp > 0.03 ? `blur(${sp * 2}px)` : 'none',
    };
  };

  return (
    <DesignStage bg="#0a0b0e">
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#101116,#0c0d11)' }}>
        {/* Base grid */}
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
        {/* Top bar url pill + short line on the right */}
        <div style={{ ...shell(SH.urlPill), left: 18, top: 11, width: 78, height: 14, border: '1px solid #2a2c33', borderRadius: 9 }} />
        <div style={{ ...shell(SH.topLine), right: 18, top: 16, width: 52, height: 5, background: '#1d1f26', borderRadius: 2 }} />
        {/* Logo dot matrix */}
        <div style={{ ...shell(SH.mark), left: 24, top: 37, width: 10, height: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#e8e9ee',
                left: (i % 2) * 6,
                top: (i >> 1) * 6,
              }}
            />
          ))}
        </div>
        {/* Right module card (with dividers and thumbnail blocks, no text) */}
        <div
          style={{
            ...shell(SH.card),
            left: 296,
            top: 52,
            width: 162,
            height: 150,
            background: '#121319',
            border: '1px solid #23252d',
            borderRadius: 5,
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: 24, width: '100%', height: 1, background: '#1e2028' }} />
          <div style={{ position: 'absolute', left: 0, top: 104, width: '100%', height: 1, background: '#1e2028' }} />
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ position: 'absolute', left: 10 + i * 30, top: 124, width: 24, height: 16, background: '#1a1c23', borderRadius: 2 }}
            />
          ))}
        </div>
        {/* CTA pill skeleton */}
        <div style={{ ...shell(SH.cta), left: 22, top: 166, width: 74, height: 24, border: '1px solid #3a3d46', borderRadius: 12 }} />
        {/* Social x square */}
        <div style={{ ...shell(SH.social), left: 352, top: 241, width: 11, height: 11, border: '1px solid #3a3d46', borderRadius: 2 }} />

        {/* Phase two: text lands character by character with 3D rotation (spacing auto-adapts to block length, ensuring everything lands before t≈0.95) */}
        {BLOCKS.map((b, bi) => {
          const n = CHAR_PARAMS[bi].reduce((acc, sgp) => acc + sgp.length, 0);
          const step = Math.min(0.012, Math.max(0.002, (0.94 - b.start - 0.13) / n));
          let ci = 0; // character index within the block (accumulated across segments, determines each character's staggered take-off)
          return (
            <div
              key={bi}
              style={{
                position: 'absolute',
                left: b.x,
                top: b.y,
                font: b.font,
                color: b.color,
                letterSpacing: b.ls,
                whiteSpace: 'nowrap',
                transform: b.dy ? `translateY(${b.dy}px)` : undefined,
              }}
            >
              {b.segs.map((sg, si) => (
                <span key={si} style={sg.i ? { fontStyle: 'italic' } : undefined}>
                  {Array.from(sg.s, (ch, k) => {
                    const c = CHAR_PARAMS[bi][si][k];
                    const ft = b.start + ci++ * step;
                    const a = seg(t, ft, ft + 0.13, E.outCubic);
                    return (
                      <span
                        key={k}
                        style={{
                          display: 'inline-block',
                          opacity: a > 0 ? Math.min(1, a * 1.8) : 0,
                          transform:
                            a >= 1
                              ? 'none'
                              : `perspective(600px) translate3d(${lerp(a, c.dx, 0)}px,${lerp(a, c.dy, 0)}px,${lerp(a, c.dz, 0)}px) ` +
                                `rotateX(${lerp(a, c.rx, 0)}deg) rotateY(${lerp(a, c.ry, 0)}deg) rotateZ(${lerp(a, c.rz, 0)}deg)`,
                        }}
                      >
                        {ch === ' ' ? '\u00a0' : ch}
                      </span>
                    );
                  })}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </DesignStage>
  );
};
