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

export type WeatherType = 'rain' | 'snow' | 'fog';

export const WeatherOverlay: React.FC<{
  type?: WeatherType;
  intensity?: number; // 0.0 a 1.0 (default: 0.7)
  wind?: number;      // -10 a 10 (default: 3)
}> = ({ type = 'rain', intensity = 0.7, wind = 3 }) => {
  const frame = useCurrentFrame();

  // Generate particles based on weather type
  const particles = React.useMemo(() => {
    const r = createRng(54321);
    const count = type === 'rain' ? Math.round(70 * intensity) : Math.round(50 * intensity);
    return Array.from({ length: count }, () => ({
      x: r() * 100, // %
      yInitial: r() * 100, // %
      speed: type === 'rain' ? 24 + r() * 18 : 3 + r() * 5,
      length: type === 'rain' ? 20 + r() * 25 : 3 + r() * 5,
      opacity: 0.2 + r() * 0.5,
      wobble: (r() - 0.5) * 4,
    }));
  }, [type, intensity]);

  if (type === 'fog') {
    return (
      <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 35, overflow: 'hidden' }}>
        {[0, 1, 2].map((idx) => {
          const fogX = Math.sin(frame * 0.015 + idx * 2) * 80;
          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                inset: '-20%',
                background: `radial-gradient(ellipse at ${50 + fogX * 0.1}% ${40 + idx * 20}%, rgba(255,255,255,0.08) 0%, transparent 65%)`,
                filter: 'blur(40px)',
                mixBlendMode: 'screen',
              }}
            />
          );
        })}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 35, overflow: 'hidden' }}>
      {particles.map((p, idx) => {
        const fallDist = (frame * p.speed) % 1200;
        const currentY = (p.yInitial * 12 + fallDist) % 1200;
        const currentX = (p.x + (currentY / 1200) * wind * 5 + Math.sin(frame * 0.05 + idx) * p.wobble) % 100;

        if (type === 'rain') {
          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `${currentX}%`,
                top: `${currentY}px`,
                width: '1.5px',
                height: `${p.length}px`,
                backgroundColor: 'rgba(255, 255, 255, 0.65)',
                transform: `rotate(${wind * 2.5}deg)`,
                opacity: p.opacity,
                filter: 'blur(0.5px)',
              }}
            />
          );
        }

        // Snow Flakes
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${currentX}%`,
              top: `${currentY}px`,
              width: `${p.length}px`,
              height: `${p.length}px`,
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              opacity: p.opacity,
              boxShadow: '0 0 6px rgba(255,255,255,0.8)',
              filter: 'blur(0.8px)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
