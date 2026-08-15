// blur-slide — Blur Slide word-by-word entrance (motion-lab final ported to native Remotion)
// The title enters word by word: y 40→0 + blur 10→0 + opacity 0→1, with a very short inter-word stagger (~1 frame),
// easeOutCubic — a "pro text reveal" where the y/blur/opacity channels converge in sync with the same easing; the subtitle then follows the same way.
// Design coordinates 480×270 (DesignStage scaled proportionally); parameter values are calibrated in this coordinate system.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const BLUR_SLIDE_DURATION = 114; // 3800ms @30fps

// Placeholder copy: word count and lengths match the original; keep 4 words / 5 words when swapping to preserve the stagger rhythm
const H1_WORDS = 'Your headline goes here'.split(' ');
const H2_WORDS = 'Short supporting subtitle for placeholders'.split(' ');

// Per-line word-by-word rendering: tLine is the line's normalized progress, gap the inter-word stagger, dy the entrance offset
const Line: React.FC<{
  words: string[];
  tLine: number;
  gap: number;
  dy: number;
  style: React.CSSProperties;
}> = ({ words, tLine, gap, dy, style }) => (
  <div style={{ display: 'flex', gap: '0.32em', ...style }}>
    {words.map((w, i) => {
      const p = seg(tLine, i * gap, i * gap + 0.32, E.outCubic);
      return (
        <span
          key={i}
          style={{
            opacity: p,
            transform: `translateY(${lerp(p, dy, 0)}px)`,
            filter: `blur(${(1 - p) * 10}px)`,
          }}
        >
          {w}
        </span>
      );
    })}
  </div>
);

export const BlurSlide: React.FC = () => {
  const t = useT();
  return (
    <DesignStage bg="#0a0b10">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          overflow: 'hidden',
        }}
      >
        {/* Main title enters first; the subtitle follows in a later time window */}
        <Line
          words={H1_WORDS}
          tLine={seg(t, 0.06, 0.62)}
          gap={0.055}
          dy={40}
          style={{
            fontWeight: 800,
            fontSize: 34,
            lineHeight: 1.15,
            fontFamily: '-apple-system,sans-serif',
            color: '#eef1fa',
            letterSpacing: '-0.5px',
          }}
        />
        <Line
          words={H2_WORDS}
          tLine={seg(t, 0.34, 0.9)}
          gap={0.04}
          dy={26}
          style={{
            fontWeight: 400,
            fontSize: 14,
            lineHeight: 1.4,
            fontFamily: '-apple-system,sans-serif',
            color: '#7d86a3',
          }}
        />
      </div>
    </DesignStage>
  );
};
