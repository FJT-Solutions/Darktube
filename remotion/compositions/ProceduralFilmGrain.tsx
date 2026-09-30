import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

/**
 * Procedural Film Grain & Analog Grit Layer (Anti-Slop Standard)
 * Baseado nas técnicas de Johnny Harris e nos padrões do repositório post32_anti_slop_guidelines.
 * 
 * Elimina o visual "digital estéril / sintético de IA", adicionando textura analógica
 * de película 35mm com cadência stop-motion determinística a 12/24fps (sem Math.random).
 */
export const ProceduralFilmGrain: React.FC<{
  opacity?: number;      // 0.03 a 0.12 (padrão: 0.055)
  cadenceFps?: number;   // 12 ou 24 (padrão: 12 para stop-motion)
  vignette?: boolean;
}> = ({ opacity = 0.055, cadenceFps = 12, vignette = true }) => {
  const frame = useCurrentFrame();

  // Quantização de frame para cadência analógica de cinema (12fps)
  const step = Math.max(1, Math.round(30 / cadenceFps));
  const grainStep = Math.floor(frame / step);

  // Semente determinística Mulberry32 baseada no step
  const seed = (grainStep * 1973) % 999;
  const baseFreq = 0.65 + ((seed % 10) * 0.02);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 40,
        overflow: 'hidden',
      }}
    >
      {/* ── FILTRO SVG DE TURBULÊNCIA E RUÍDO ── */}
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity,
          mixBlendMode: 'overlay',
        }}
      >
        <filter id={`grain-filter-${seed}`} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={baseFreq}
            numOctaves="3"
            stitchTiles="stitch"
            seed={seed}
          />
          <feColorMatrix
            type="matrix"
            values="
              0 0 0 0 0.8
              0 0 0 0 0.8
              0 0 0 0 0.8
              0 0 0 1 0"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-filter-${seed})`} />
      </svg>

      {/* ── VINHETA ANALÓGICA DE BORDAS ESCURAS ── */}
      {vignette && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.45) 85%, rgba(0, 0, 0, 0.8) 100%)',
            mixBlendMode: 'multiply',
          }}
        />
      )}
    </AbsoluteFill>
  );
};
