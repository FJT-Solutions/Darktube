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

export const EmberParticles: React.FC<{
  count?: number;
  primaryColor?: string; // e.g. #F97316 (Orange/Ember)
  speedMultiplier?: number;
}> = ({ count = 38, primaryColor = '#F97316', speedMultiplier = 1.0 }) => {
  const frame = useCurrentFrame();

  const embers = React.useMemo(() => {
    const r = createRng(998244);
    return Array.from({ length: count }, () => ({
      x: r() * 100, // %
      yInitial: r() * 1200,
      size: 2.5 + r() * 5.5,
      speed: (1.8 + r() * 3.2) * speedMultiplier,
      wobbleFreq: 0.04 + r() * 0.06,
      wobbleAmp: 15 + r() * 25,
      color: r() > 0.4 ? primaryColor : r() > 0.2 ? '#EF4444' : '#FACC15',
    }));
  }, [count, primaryColor, speedMultiplier]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 35, overflow: 'hidden' }}>
      {embers.map((e, idx) => {
        const riseDist = (frame * e.speed) % 1300;
        const currentY = (e.yInitial - riseDist + 1300) % 1300;
        const currentX = e.x + Math.sin(frame * e.wobbleFreq + idx) * (e.wobbleAmp * 0.08);
        const opacity = Math.sin((currentY / 1300) * Math.PI) * 0.85;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${currentX}%`,
              top: `${currentY}px`,
              width: `${e.size}px`,
              height: `${e.size}px`,
              borderRadius: '50%',
              backgroundColor: e.color,
              boxShadow: `0 0 10px ${e.color}, 0 0 20px ${e.color}`,
              opacity,
              filter: 'blur(0.4px)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
