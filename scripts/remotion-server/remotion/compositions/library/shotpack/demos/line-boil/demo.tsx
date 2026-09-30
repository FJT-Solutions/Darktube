// Line boil — hand-drawn animation line boil texture: in the "boil segment" the static line art
// trembles slightly frame by frame, like the jitter of hand-drawn frame-by-frame inking. SVG filter feTurbulence(baseFrequency
// 0.015, numOctaves 2, seed = Math.floor(f/3) stepped every 3 frames) + feDisplacementMap
// scale=8 (the original 3–6 was boosted for perceptibility) applied to the "ALIVE" headline and the outlined card layer.
// The structure reads through "contrast": stillness first (clean version) → boil → unmask back to stillness; precedent: feTurbulence
// must be removed entirely at the end (no filter or SVG def is rendered outside the boil segment),
// frame-identical from 105f on, true stillness ≥35f.
// Keyframes: 0–35 fully still (boil off) → 35–105 boiling (boil on, seed changes every 3 frames)
// → 105 unmask → 105–140 true stillness (boil off).
import React, { useId } from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { G, TitleBlock } from '../../_fixtures/Fixtures';

const BOIL_START = 35;
const BOIL_END = 105;
const BOIL_SCALE = 8; // original 3–6 boosted for perceptibility; bump to 12 if QA can't see it

const CornerTag: React.FC<{ text: string; opacity: number }> = ({ text, opacity }) => (
  <div
    style={{
      position: 'absolute',
      right: 72,
      bottom: 56,
      padding: '10px 22px',
      border: `3px solid ${G.ink}`,
      borderRadius: 999,
      color: G.ink,
      background: G.bg,
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontWeight: 700,
      fontSize: 30,
      letterSpacing: 2,
      opacity,
    }}
  >
    {text}
  </div>
);

export const LineBoil: React.FC = () => {
  const f = useCurrentFrame();
  // Filter ID generated per instance so multiple instances on stage don't cross-reference (useId's «:» is illegal in url(), so it's sanitized)
  const boilId = `boil-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const boiling = f >= BOIL_START && f < BOIL_END;
  // seed stepped every 3 frames → 8~10Hz hand-drawn tremble; frame-deterministic, no random source
  const seed = Math.floor(f / 3);

  // Corner tag: boil on only fades in/out during the boil segment; boil off is complementary.
  // All transitions finish before 105f → 105–140 frame-identical
  const onOp = interpolate(f, [35, 40, 100, 105], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const offOp = 1 - onOp;

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      {/* Filter def rendered only during the boil segment — unmounting removes the whole SVG def, so the ending is naturally true stillness */}
      {boiling && (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            <filter id={boilId} x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency={0.015}
                numOctaves={2}
                seed={seed}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={BOIL_SCALE}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      )}

      {/* Technique label: kept outside the filter layer as a static reference */}
      <div style={{ position: 'absolute', left: 120, top: 96 }}>
        <TitleBlock text="LINE BOIL" size={54} />
      </div>

      {/* The whole boiled layer: headline + outlined card */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 56,
          filter: boiling ? `url(#${boilId})` : undefined,
        }}
      >
        <div
          style={{
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 800,
            fontSize: 170,
            color: G.ink,
            letterSpacing: 4,
            lineHeight: 1,
          }}
        >
          ALIVE
        </div>
        {/* Outlined card: transparent background, 3px ink outline, 520×300 rounded frame + a few gray lines */}
        <div
          style={{
            width: 520,
            height: 300,
            border: `3px solid ${G.ink}`,
            borderRadius: 20,
            boxSizing: 'border-box',
            padding: '36px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: 26,
          }}
        >
          <div style={{ height: 16, width: '62%', background: G.mid, borderRadius: 8 }} />
          <div style={{ height: 12, width: '88%', background: G.bar, borderRadius: 6 }} />
          <div style={{ height: 12, width: '74%', background: G.bar, borderRadius: 6 }} />
          <div style={{ height: 12, width: '81%', background: G.bar, borderRadius: 6 }} />
          <div style={{ marginTop: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 30, height: 30, borderRadius: 15, border: `3px solid ${G.ink}`, boxSizing: 'border-box' }} />
            <div style={{ height: 12, width: 120, background: G.mid, borderRadius: 6 }} />
          </div>
        </div>
      </div>

      {/* Status tag: boil on during the boil segment, boil off during stillness */}
      <CornerTag text="boil on" opacity={onOp} />
      <CornerTag text="boil off" opacity={offOp} />
    </div>
  );
};
