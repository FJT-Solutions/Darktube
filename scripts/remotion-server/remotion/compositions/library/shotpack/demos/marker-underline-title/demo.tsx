// marker-underline-title — after a white-background headline settles, a marker underline
// strokes from left to right below the italic "new" (varying weight / rounded tips / slight tilt / rough edges).
// Benchmarked against notion-ai.mp4 2.3–3.6s. Overlaps with the in-library draw-svg-trace, so this version focuses on marker texture.
import React, { useId } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Marker stroke: a slightly tilted center axis + tapering outline, generated once as a polygon
const buildStroke = (len: number, seed: number) => {
  const rand = mulberry32(seed);
  const N = 40;
  const top: string[] = [];
  const bot: string[] = [];
  // Pre-generate slight wobble offsets (low frequency) and roughness (high frequency)
  const wob = Array.from({ length: N + 1 }, () => rand() - 0.5);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = t * len;
    // Center axis: follows the italic upward tilt (low left, high right, per screenshot) + gentle wave
    const mid = 19 - t * 9 + Math.sin(t * Math.PI * 1.6 + 0.4) * 2.6 + wob[i] * 1.6;
    // Width: thin start → full middle → sharp tail, plus high-frequency roughness
    const wBase = 14 + Math.sin(t * Math.PI) * 6 - Math.max(0, t - 0.86) * 46;
    const w = Math.max(2.2, wBase + wob[i] * 3);
    top.push(`${x.toFixed(1)},${(mid - w / 2).toFixed(1)}`);
    bot.push(`${x.toFixed(1)},${(mid + w / 2).toFixed(1)}`);
  }
  return `M${top.join('L')}L${bot.reverse().join('L')}Z`;
};

export const MarkerUnderlineTitle: React.FC = () => {
  const frame = useCurrentFrame();
  // clipPath ID is generated per instance so multiple instances on screen don't collide (useId's «:» is illegal in url(), so it's sanitized)
  const revealId = `reveal-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const LEN = 252;

  // Headline settles: the block springs in from 30px below (ease-out) within 24 frames
  const enter = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const eo = 1 - Math.pow(1 - enter, 3);
  const titleY = (1 - eo) * 36;
  const titleOp = Math.min(1, enter * 1.6);

  // Underline: draws left to right over 10 frames (one notch faster) after the headline settles and rests a beat, ease-out
  const draw = interpolate(frame, [32, 42], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const drawE = 1 - Math.pow(1 - draw, 2.2);
  const path = buildStroke(LEN, 77);

  return (
    <AbsoluteFill style={{ background: '#f4f4f2', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        opacity: titleOp, transform: `translateY(${titleY}px)`,
        fontFamily: '-apple-system, "Helvetica Neue", Arial, sans-serif',
        fontWeight: 700, fontSize: 118, color: '#191919',
        textAlign: 'center', lineHeight: 1.12, letterSpacing: '-0.02em',
      }}>
        <div>
          Meet the{' '}
          <span style={{ fontStyle: 'italic', position: 'relative', display: 'inline-block' }}>
            new
            {/* Marker underline: clip reveals left to right, preserving the stroke's own weight variation */}
            <svg
              width={LEN} height={44} viewBox={`0 0 ${LEN} 44`}
              style={{ position: 'absolute', left: -12, bottom: -20, overflow: 'visible' }}
            >
              <defs>
                <clipPath id={revealId}>
                  <rect x={0} y={-20} width={drawE * (LEN + 6)} height={60} />
                </clipPath>
              </defs>
              {draw > 0 && (
                <path d={path} fill="#111111" clipPath={`url(#${revealId})`} />
              )}
            </svg>
          </span>
        </div>
        <div>Notion AI</div>
      </div>
    </AbsoluteFill>
  );
};
