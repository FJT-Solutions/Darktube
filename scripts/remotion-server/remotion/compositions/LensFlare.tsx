import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const LensFlare: React.FC<{
  x?: number; // 0 a 100 percentage
  y?: number; // 0 a 100 percentage
  color?: string;
  intensity?: number;
}> = ({ x = 65, y = 30, color = '#38BDF8', intensity = 0.85 }) => {
  const frame = useCurrentFrame();

  // Subtle breathing oscillation
  const pulse = Math.sin(frame * 0.08) * 0.08;
  const currentIntensity = intensity * (1 + pulse);

  // Anamorphic horizontal streak
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 38,
        overflow: 'hidden',
        mixBlendMode: 'screen',
      }}
    >
      {/* Central Hotspot Burst */}
      <div
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: `radial-gradient(circle, #FFFFFF 0%, ${color} 45%, transparent 75%)`,
          filter: 'blur(16px)',
          opacity: currentIntensity,
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Anamorphic Horizontal Streak */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${y}%`,
          height: '3px',
          background: `linear-gradient(90deg, transparent 0%, ${color} 40%, #FFFFFF 50%, ${color} 60%, transparent 100%)`,
          opacity: currentIntensity * 0.9,
          filter: 'blur(1px)',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Secondary Reflection Halo */}
      <div
        style={{
          position: 'absolute',
          left: `${100 - x}%`,
          top: `${100 - y}%`,
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          border: `1.5px solid ${color}44`,
          background: `radial-gradient(circle, ${color}11 0%, transparent 70%)`,
          filter: 'blur(8px)',
          opacity: currentIntensity * 0.5,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </AbsoluteFill>
  );
};
