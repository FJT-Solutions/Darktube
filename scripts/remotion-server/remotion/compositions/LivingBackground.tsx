import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { LivingBgType } from '../types';

interface LivingBackgroundProps {
  type?: LivingBgType;
  baseColor?: string;
  accentColor?: string;
  theme?: 'dark' | 'light' | 'duolingo' | 'neon';
}

export const LivingBackground: React.FC<LivingBackgroundProps> = ({
  type = 'dot-grid',
  baseColor = '#0F172A',
  accentColor = '#EAB308',
}) => {
  const frame = useCurrentFrame();

  // Layer 4 Animation calculations
  const dotOffset = (frame * 1.5) % 40;
  const pulseScale = 1 + Math.sin(frame * 0.04) * 0.08;
  const waveFloat = Math.sin(frame * 0.03) * 15;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: baseColor,
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* CAMADA 2: Gradiente Radial Sutil Central (18-25% opacidade) */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '120%',
          height: '120%',
          background: `radial-gradient(circle at 50% 45%, ${accentColor}33 0%, rgba(255,255,255,0.04) 40%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* CAMADA 3: Noise Fractal / Textura Sutil */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      />

      {/* CAMADA 4: Elemento Vivo Variável por Cena */}
      {type === 'dot-grid' && (
        <div
          style={{
            position: 'absolute',
            top: -40,
            left: 0,
            width: '100%',
            height: 'calc(100% + 80px)',
            backgroundImage: `radial-gradient(circle, ${accentColor} 1.8px, transparent 1.8px)`,
            backgroundSize: '36px 36px',
            opacity: 0.12,
            transform: `translateY(${-dotOffset}px)`,
          }}
        />
      )}

      {type === 'concentric-rings' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '800px',
            height: '800px',
            transform: `translate(-50%, -50%) scale(${pulseScale})`,
            pointerEvents: 'none',
          }}
        >
          {[200, 380, 560, 740].map((size, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: size,
                height: size,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                border: `2px dashed ${accentColor}`,
                opacity: 0.08 + idx * 0.03,
              }}
            />
          ))}
        </div>
      )}

      {type === 'floating-symbols' && (
        <div style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
          {['$', '%', '★', '⚡', '▲', '◆'].map((sym, idx) => {
            const symX = (idx * 180 + 80) % 900;
            const symY = (idx * 280 + 150) % 1600;
            const driftY = Math.sin((frame + idx * 25) * 0.025) * 20;
            const driftRot = Math.cos((frame + idx * 30) * 0.02) * 15;

            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: symX,
                  top: symY + driftY,
                  fontSize: 70 + (idx % 3) * 25,
                  fontWeight: 900,
                  color: accentColor,
                  opacity: 0.07,
                  filter: 'blur(5px)',
                  transform: `rotate(${driftRot}deg)`,
                  userSelect: 'none',
                }}
              >
                {sym}
              </div>
            );
          })}
        </div>
      )}

      {type === 'ambient-particles' && (
        <div style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
          {[...Array(12)].map((_, idx) => {
            const posX = (idx * 137.5) % 1000;
            const posY = (1920 - ((frame * (1.2 + (idx % 3) * 0.5) + idx * 160) % 2000));
            const opacity = interpolate(
              posY,
              [0, 300, 1600, 1920],
              [0, 0.25, 0.25, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );

            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: posX,
                  top: posY,
                  width: 8 + (idx % 3) * 6,
                  height: 8 + (idx % 3) * 6,
                  borderRadius: '50%',
                  backgroundColor: accentColor,
                  boxShadow: `0 0 16px ${accentColor}`,
                  opacity: opacity * 0.6,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Vinheta cinematográfica suave nas bordas */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          boxShadow: 'inset 0 0 140px rgba(0,0,0,0.65)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
