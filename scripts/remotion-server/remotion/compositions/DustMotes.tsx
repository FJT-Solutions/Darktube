import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

// ─── Deterministic RNG ──────────────────────────────────────────────────────
function createRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DustMotes: React.FC<{
  count?: number;
  color?: string;
}> = ({ count = 35, color = '#FFFFFF' }) => {
  const frame = useCurrentFrame();

  const motes = React.useMemo(() => {
    const r = createRng(314159);
    return Array.from({ length: count }, () => ({
      x: r() * 100, // %
      y: r() * 100, // %
      size: 1.5 + r() * 3.5,
      driftX: (r() - 0.5) * 0.15,
      driftY: -0.1 - r() * 0.2,
      wobbleFreq: 0.03 + r() * 0.05,
      opacity: 0.2 + r() * 0.45,
    }));
  }, [count]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 36, overflow: 'hidden' }}>
      {motes.map((m, idx) => {
        const curX = m.x + frame * m.driftX + Math.sin(frame * m.wobbleFreq + idx) * 3;
        const curY = (m.y + frame * m.driftY + 100) % 100;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${(curX % 100 + 100) % 100}%`,
              top: `${curY}%`,
              width: `${m.size}px`,
              height: `${m.size}px`,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: m.opacity,
              boxShadow: `0 0 4px ${color}`,
              filter: 'blur(0.5px)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
