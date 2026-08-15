// aurora-bloom-bg-flip — Aurora Bloom aurora-rise background flip (motion-lab final ported to native Remotion)
// A soft-focus purple-orange blob rises from the bottom of the light-gray background; the whole base color then darkens to near-black within 0.35s and the blob compresses into an afterglow;
// the copy blurs out in sync → the next line blurs in (accent color → white), with a gap between lines instead of a cross-fade.
// The copy is neutral placeholder; the purple-orange of the blob/text is this effect's own light color (the DEEPP constant), swappable as a whole group for project colors on delivery.
// Design coordinates 480×270 (DesignStage scales proportionally); param table values are calibrated in this coordinate system.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const AURORA_BLOOM_BG_FLIP_DURATION = 156; // 5200ms @30fps

// RGB triplet interpolation → CSS color (effect.js's file-level shared mix, inlined here)
const mix = (a: number[], b: number[], k: number) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
const DEEPP = [124, 92, 255]; // the effect's own light color (deep purple)
const WHITE = [245, 245, 250];
const LIGHT = [236, 236, 236]; // light-field base color
const DARK = [10, 10, 18]; // dark-field base color

// Placeholder copy (word count/length close to the original; the per-word staggered rhythm depends on this)
const WA = 'For many years'.split(' ');
const WB = 'everything changed'.split(' ');

const FONT = '600 26px -apple-system,system-ui,sans-serif';

export const AuroraBloomBgFlip: React.FC = () => {
  const t = useT();
  // Blob rises + scales up
  const rise = seg(t, 0.04, 0.62, E.outCubic);
  const flip = seg(t, 0.63, 0.7, E.inOutQuad); // quick darkening, deliberately only ~0.35s

  return (
    <DesignStage bg={mix(LIGHT, DARK, flip)}>
      {/* Soft-focus blob group: whole-group translateY rise + scale up, compressed into an afterglow after the flip */}
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          transform: `translateY(${lerp(rise, 32, -6)}%) scale(${lerp(rise, 1, 1.25)})`,
          opacity: lerp(flip, 1, 0.4),
        }}
      >
        {/* Purple main blob */}
        <div
          style={{
            position: 'absolute',
            borderRadius: '50%',
            filter: 'blur(60px)',
            left: '8%',
            bottom: '-45%',
            width: '90%',
            height: '85%',
            background: 'radial-gradient(circle,rgba(107,79,224,.85) 0%,rgba(107,79,224,0) 68%)',
          }}
        />
        {/* Orange core: slow horizontal drift */}
        <div
          style={{
            position: 'absolute',
            borderRadius: '50%',
            filter: 'blur(60px)',
            left: '32%',
            bottom: '-32%',
            width: '44%',
            height: '46%',
            background: 'radial-gradient(circle,rgba(217,122,74,.9) 0%,rgba(217,122,74,0) 66%)',
            transform: `translateX(${Math.sin(t * Math.PI * 2.2) * 8}%)`,
          }}
        />
        {/* White blending edge: faded out in the dark field */}
        <div
          style={{
            position: 'absolute',
            borderRadius: '50%',
            filter: 'blur(60px)',
            left: '-12%',
            bottom: '-40%',
            width: '64%',
            height: '60%',
            background: 'radial-gradient(circle,rgba(255,255,255,.8) 0%,rgba(255,255,255,0) 62%)',
            opacity: 1 - flip,
          }}
        />
      </div>
      {/* Copy line: flex-centered, each sentence absolutely positioned (centered at the same point, not taking up layout) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: FONT,
        }}
      >
        {/* Copy A: word-by-word blur-out during the blob rise */}
        <div style={{ position: 'absolute' }}>
          {WA.map((w, i) => {
            const out = seg(t, 0.46 + i * 0.04, 0.56 + i * 0.04, E.inQuad);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  margin: '0 .18em',
                  color: '#1a1a1a',
                  opacity: 1 - out,
                  filter: `blur(${out * 8}px)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        {/* Copy B after the gap: word-by-word blur-in + purple→white color settle */}
        <div style={{ position: 'absolute' }}>
          {WB.map((w, i) => {
            const d0 = 0.76 + i * 0.06;
            const a = seg(t, d0, d0 + 0.11, E.outQuint);
            const c = seg(t, d0 + 0.1, d0 + 0.26, E.outQuad);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  margin: '0 .18em',
                  opacity: a,
                  filter: `blur(${(1 - a) * 8}px)`,
                  color: mix(DEEPP, WHITE, c),
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </DesignStage>
  );
};
