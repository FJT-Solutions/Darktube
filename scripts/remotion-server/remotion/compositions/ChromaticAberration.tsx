import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

export const ChromaticAberration: React.FC<{
  intensity?: number; // 1 a 10 (padrão: 3)
  direction?: 'horizontal' | 'radial';
}> = ({ intensity = 3, direction = 'horizontal' }) => {
  const frame = useCurrentFrame();

  // Subtle organic tremor
  const jitter = Math.sin(frame * 0.5) * (intensity * 0.4);
  const currentOffset = intensity + jitter;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 39,
        overflow: 'hidden',
        mixBlendMode: 'screen',
      }}
    >
      {/* Red Shift Layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'inherit',
          transform: `translateX(${currentOffset}px)`,
          filter: 'drop-shadow(0 0 4px rgba(255, 0, 0, 0.45))',
          pointerEvents: 'none',
        }}
      />
      {/* Cyan / Blue Shift Layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'inherit',
          transform: `translateX(${-currentOffset}px)`,
          filter: 'drop-shadow(0 0 4px rgba(0, 255, 255, 0.45))',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
