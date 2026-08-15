// title-demote-to-label — a large title demoted into a section label
// Source: perplexity-promo 16–18.5s. A centered headline develops and holds a beat, then shrinks to ~0.3x
// and moves to the top-left corner as a small section label, while the content area (grayscale skeleton blocks) grows beneath it.
// Additional variant (framer text-selection-title): the title enters with a text-selection blue highlight block that is later removed.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';

const FONT = 'Helvetica, Arial, sans-serif';
const SEL = 'rgba(58, 128, 236, 0.35)';

// Content skeleton blocks: grow in sequence with t
const Skeleton: React.FC<{ t: number }> = ({ t }) => {
  const blocks = [
    { w: 1500, h: 26 },
    { w: 1280, h: 26 },
    { w: 1420, h: 26 },
    { w: 760, h: 26 },
    { w: 1500, h: 300, card: true },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
      {blocks.map((b, i) => {
        const bt = interpolate(t, [i * 0.16, i * 0.16 + 0.3], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        return (
          <div
            key={i}
            style={{
              width: b.w * (0.35 + 0.65 * bt),
              height: b.h,
              background: b.card ? G.card : G.line,
              border: b.card ? `2px solid ${G.border}` : 'none',
              borderRadius: b.card ? 16 : 13,
              opacity: bt,
              transform: `translateY(${(1 - bt) * 28}px)`,
              boxSizing: 'border-box',
            }}
          />
        );
      })}
    </div>
  );
};

// A full "develop → (optional highlight) → demote → content grow" scene
const DemoteScene: React.FC<{
  frame: number;
  title: string;
  withSelection: boolean;
}> = ({ frame, title, withSelection }) => {
  // Timeline (local frames)
  const REVEAL = 0; // frames 0–12 develop
  const SEL_ON = 14; // highlight sweeps in 14–24
  const SEL_OFF = 32; // highlight removed 32–40
  const DEMOTE = withSelection ? 44 : 32; // demote begins
  const DEMOTE_END = DEMOTE + 20;
  const GROW = DEMOTE + 12;

  // Develop: blur + fade-in
  const rev = interpolate(frame, [REVEAL, REVEAL + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Demote tween: scale 1 -> 0.3, center -> top-left
  const dem = interpolate(frame, [DEMOTE, DEMOTE_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const scale = interpolate(dem, [0, 1], [1, 0.3]);
  // Tween left/top: starts centered (converted from the outer flex layout), ends at the top-left corner
  const x = interpolate(dem, [0, 1], [960, 150]);
  const y = interpolate(dem, [0, 1], [480, 110]);

  // Highlight block: sweeps in from the left to cover the text, then removes from the left
  let selLeft = 0;
  let selWidth = 0;
  if (withSelection) {
    const on = interpolate(frame, [SEL_ON, SEL_ON + 10], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.quad),
    });
    const off = interpolate(frame, [SEL_OFF, SEL_OFF + 8], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.quad),
    });
    selLeft = off * 100;
    selWidth = Math.max(0, on * 100 - selLeft);
  }

  const growT = interpolate(frame, [GROW, GROW + 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: G.bg }}>
      {/* Content skeleton area */}
      <div style={{ position: 'absolute', left: 150, top: 210 }}>
        <Skeleton t={growT} />
      </div>
      {/* Title: transform-origin left-center, position tweened */}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `translate(${-(1 - dem) * 50}%, -50%) scale(${scale})`,
          transformOrigin: 'left center',
          opacity: rev,
          filter: `blur(${(1 - rev) * 12}px)`,
        }}
      >
        <div
          style={{
            position: 'relative',
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 128,
            color: G.ink,
            letterSpacing: -2,
            whiteSpace: 'nowrap',
            padding: '10px 18px',
          }}
        >
          {withSelection && selWidth > 0 && (
            <div
              style={{
                position: 'absolute',
                left: `${selLeft}%`,
                top: 8,
                width: `${selWidth}%`,
                height: 'calc(100% - 16px)',
                background: SEL,
                borderRadius: 6,
              }}
            />
          )}
          <span style={{ position: 'relative' }}>{title}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const TitleDemoteToLabel: React.FC = () => {
  const frame = useCurrentFrame();
  const SPLIT = 92; // variant A duration

  if (frame < SPLIT) {
    return <DemoteScene frame={frame} title="Running Subagents" withSelection={false} />;
  }
  // Variant B: text-selection highlight entrance
  const f = frame - SPLIT;
  // White-flash transition 3f
  const flash = interpolate(f, [0, 4], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill>
      <DemoteScene frame={f} title="Select the Answer" withSelection={true} />
      <AbsoluteFill style={{ background: '#fff', opacity: flash, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
