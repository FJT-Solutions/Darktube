import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface CtaBannerProps {
  title: string;
  subtitle?: string;
  accent?: string;
  position?: 'bottom' | 'center' | 'top';
}

// Faixa de CTA animada com fundo transparente: entra deslizando, pulsa a barra de destaque e sai suave.
export const CtaBanner: React.FC<CtaBannerProps> = ({ title, subtitle, accent = '#FFC800', position = 'bottom' }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pulse = 1 + 0.04 * Math.sin((frame / fps) * Math.PI * 4);
  const unit = width / 1080;
  const justify = position === 'top' ? 'flex-start' : position === 'center' ? 'center' : 'flex-end';
  const pad = position === 'bottom' ? 360 * unit : position === 'top' ? 220 * unit : 0;
  return (
    <AbsoluteFill style={{ justifyContent: justify, alignItems: 'center', paddingBottom: position === 'bottom' ? pad : 0, paddingTop: position === 'top' ? pad : 0 }}>
      <div
        style={{
          display: 'flex',
          width: 900 * unit,
          background: 'rgba(15,15,15,0.86)',
          borderRadius: 40 * unit,
          overflow: 'hidden',
          opacity: enter * exit,
          transform: `translateY(${(1 - enter) * 120 * unit}px) scale(${pulse})`,
          boxShadow: `0 ${10 * unit}px ${40 * unit}px rgba(0,0,0,0.45)`,
          fontFamily: 'Montserrat, Arial, sans-serif',
        }}
      >
        <div style={{ width: 28 * unit, background: accent }} />
        <div style={{ padding: `${36 * unit}px ${50 * unit}px` }}>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 92 * unit, lineHeight: 1.05 }}>{title}</div>
          {subtitle ? <div style={{ color: accent, fontWeight: 700, fontSize: 48 * unit, marginTop: 14 * unit }}>{subtitle}</div> : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
