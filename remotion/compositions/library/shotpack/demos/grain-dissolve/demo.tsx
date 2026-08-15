// grain-dissolve — Grain Dissolve → Condense: text disintegrates into grain and condenses (motion-lab final converted to native Remotion)
// The clean line of text "{ ACME. Now Live }" first bursts into boiling grain noise (outline faintly visible, with a white glow),
// while a selection frame with 45° hatch fill and pixel-block corner handles appears; after the noise boils for about half the sequence, the selection frame disappears,
// the noise cloud quickly condenses into a larger grainy short wordmark (placeholder word "ACME"), with the displacement decaying to zero and the glow peaking then falling back,
// settling into a clear glowing wordmark. Corner HUD brackets/dots and center-line dashes on the left and right remain on screen throughout.
// Filter chain: feTurbulence seed per frame + bidirectional displacement scale animation; the final word runs through the same filter before it is removed.
// Design coordinates 480×270 (DesignStage scales up proportionally), SVG viewBox 640×360 fills the full frame.
import React, { useId } from 'react';
import { E, DesignStage, seg, useT } from '../../_fixtures/Motion';

export const GRAIN_DISSOLVE_DURATION = 60; // 2000ms @30fps

// Selection frame geometry (viewBox coordinates)
const BX = 128;
const BY = 148;
const BW = 384;
const BH = 62;

// 45° hatch: one line every 34 starting at bx-bh, bottom-right → top-left
const HATCH_XS: number[] = [];
for (let x = BX - BH; x < BX + BW; x += 34) HATCH_XS.push(x);

// Corner pixel checkerboard handles (two offset 5×5 blocks)
const Handle: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x - 5},${y - 5})`} fill="#cfd2d8">
    <rect width={5} height={5} />
    <rect x={5} y={5} width={5} height={5} />
  </g>
);

// HUD corner bracket + dot (sx/sy control orientation)
const Corner: React.FC<{ x: number; y: number; sx: number; sy: number }> = ({ x, y, sx, sy }) => (
  <>
    <path
      d={`M${x + 14 * sx} ${y}H${x}V${y + 14 * sy}`}
      fill="none"
      stroke="#3a3a40"
      strokeWidth={1.5}
    />
    <circle cx={x + 34 * sx} cy={y + 28 * sy} r={1.6} fill="#8b8d94" />
  </>
);

export const GrainDissolve: React.FC = () => {
  const t = useT();
  // Filter/clipPath IDs are generated per instance so multiple instances in one Composition don't cross-reference
  // (useId's «:» is invalid inside CSS url(), so it is scrubbed to plain alphanumerics)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const fid = `gd-${uid}`;
  const cid = `gd-${uid}-clip`;
  const burst = seg(t, 0.13, 0.28, E.outCubic); // clean text → grain
  const cond = seg(t, 0.60, 0.71, E.inOutCubic); // full-line noise cloud → short wordmark noise cloud
  const lock = seg(t, 0.68, 0.90, E.outCubic); // displacement decays and locks in
  const settle = seg(t, 0.88, 1, E.outCubic); // glow falls back
  // White glow: faint during the grain phase, peaks during condensation, then falls back to a soft glow after locking
  const glow = burst * 0.3 + cond * 0.7 - settle * 0.45;
  return (
    <DesignStage bg="#0a0a0c">
      <svg
        viewBox="0 0 640 360"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#0a0a0c' }}
      >
        <defs>
          <filter id={fid} x="-40%" y="-150%" width="180%" height="400%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={0.9 + burst * 0.4}
              numOctaves={2}
              seed={Math.floor(t * 46)}
              result="n"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="n"
              scale={burst * 52 * (1 - lock)}
              xChannelSelector="R"
              yChannelSelector="G"
              result="d"
            />
            <feGaussianBlur in="d" stdDeviation={burst * 1.1 * (1 - lock)} />
          </filter>
        </defs>
        {/* Corner HUD brackets + dots + center-line dashes on the left and right (persistent throughout) */}
        <g>
          <Corner x={88} y={96} sx={1} sy={1} />
          <Corner x={552} y={96} sx={-1} sy={1} />
          <Corner x={88} y={264} sx={1} sy={-1} />
          <Corner x={552} y={264} sx={-1} sy={-1} />
          <line x1={52} y1={180} x2={76} y2={180} stroke="#4a4a50" strokeWidth={1.5} strokeDasharray="4 3" />
          <line x1={564} y1={180} x2={588} y2={180} stroke="#4a4a50" strokeWidth={1.5} strokeDasharray="4 3" />
        </g>
        {/* Selection frame: appears as the text turns to grain, removed before condensing */}
        <g opacity={burst * (1 - seg(t, 0.55, 0.64))}>
          <clipPath id={cid}>
            <rect x={BX} y={BY} width={BW} height={BH} />
          </clipPath>
          <g clipPath={`url(#${cid})`}>
            {HATCH_XS.map((x) => (
              <line key={x} x1={x} y1={BY + BH} x2={x + BH} y2={BY} stroke="#2c2c31" strokeWidth={1} />
            ))}
          </g>
          <rect x={BX} y={BY} width={BW} height={BH} fill="none" stroke="#55565c" strokeWidth={1} />
          <Handle x={BX} y={BY} />
          <Handle x={BX + BW} y={BY} />
          <Handle x={BX} y={BY + BH} />
          <Handle x={BX + BW} y={BY + BH} />
        </g>
        {/* Text group: the full-line text and the final wordmark share the same filter chain + white glow */}
        <g
          style={{
            filter: `url(#${fid}) drop-shadow(0 0 ${4 + glow * 20}px rgba(255,255,255,${Math.max(0, glow) * 0.9}))`,
          }}
        >
          <text
            x={320}
            y={191}
            textAnchor="middle"
            opacity={1 - cond}
            style={{
              fill: '#eceef2',
              font: "500 33px Inter,'Helvetica Neue',system-ui,sans-serif",
              letterSpacing: '2.5px',
            }}
          >
            {'{ ACME. Now Live }'}
          </text>
          <text
            x={320}
            y={198}
            textAnchor="middle"
            opacity={cond}
            style={{
              fill: '#fff',
              font: "800 54px Inter,'Helvetica Neue',system-ui,sans-serif",
              letterSpacing: '4px',
            }}
          >
            ACME
          </text>
        </g>
      </svg>
    </DesignStage>
  );
};
