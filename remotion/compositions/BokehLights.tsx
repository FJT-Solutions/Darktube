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

export const BokehLights: React.FC<{
  count?: number;
  primaryColor?: string;
  accentColor?: string;
}> = ({ count = 16, primaryColor = '#F59E0B', accentColor = '#3B82F6' }) => {
  const frame = useCurrentFrame();

  const circles = React.useMemo(() => {
    const r = createRng(128374);
    return Array.from({ length: count }, () => ({
      x: r() * 100, // %
      y: r() * 100, // %
      size: 60 + r() * 140,
      color: r() > 0.5 ? primaryColor : accentColor,
      blur: 25 + r() * 35,
      speedX: (r() - 0.5) * 0.3,
      speedY: (r() - 0.5) * 0.25,
      opacity: 0.12 + r() * 0.18,
    }));
  }, [count, primaryColor, accentColor]);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 35,
        overflow: 'hidden',
        mixBlendMode: 'screen',
      }}
    >
      {circles.map((c, idx) => {
        const curX = c.x + Math.sin(frame * 0.02 + idx) * 12 + frame * c.speedX;
        const curY = c.y + Math.cos(frame * 0.025 + idx) * 10 + frame * c.speedY;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${(curX % 100 + 100) % 100}%`,
              top: `${(curY % 100 + 100) % 100}%`,
              width: `${c.size}px`,
              height: `${c.size}px`,
              borderRadius: '50%',
              backgroundColor: c.color,
              filter: `blur(${c.blur}px)`,
              opacity: c.opacity,
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
