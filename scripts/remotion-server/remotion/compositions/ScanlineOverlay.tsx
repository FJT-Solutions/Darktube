import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

export const ScanlineOverlay: React.FC<{
  lineSpacing?: number; // default: 4px
  opacity?: number;     // default: 0.35
  flicker?: boolean;    // default: true
  curvature?: boolean;  // default: true
}> = ({ lineSpacing = 4, opacity = 0.35, flicker = true, curvature = true }) => {
  const frame = useCurrentFrame();

  const flickerAlpha = flicker ? 0.9 + Math.sin(frame * 0.4) * 0.1 : 1.0;
  const currentOpacity = opacity * flickerAlpha;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 38,
        overflow: 'hidden',
      }}
    >
      {/* Horizontal CRT Scanlines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, ${currentOpacity * 1.5}) 50%)`,
          backgroundSize: `100% ${lineSpacing}px`,
        }}
      />

      {/* Moving Hum Bar (Roll bar) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${(frame * 2) % 100}%`,
          height: '180px',
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.03), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* CRT Curvature / Phosphor Vignette */}
      {curvature && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 120px rgba(0, 0, 0, 0.85)',
          }}
        />
      )}
    </AbsoluteFill>
  );
};
