import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// ─────────────────────────────────────────────────────────────────────────────
// FinancialCounterOverlay — Contador Programático R$ 0 → R$ 1.000 + Sparkline SVG + Ticker
// Reproduz com precisão matemática o Teste #1 (crescimento de números + desenho de vetor + ticker)
// ─────────────────────────────────────────────────────────────────────────────
export const FinancialCounterOverlay: React.FC<{
  targetValue?: number;
  label?: string;
  currency?: string;
  durationFrames?: number;
  color?: string;
}> = ({
  targetValue = 1000,
  label = 'FATURAMENTO ACUMULADO',
  currency = 'R$',
  durationFrames = 150,
  color = '#00C853',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Contagem numérica interpolada (smooth ease-out)
  const rawProgress = interpolate(frame, [10, Math.max(20, durationFrames - 15)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Curva de desaceleração suave (power2.out)
  const progress = 1 - Math.pow(1 - rawProgress, 2.5);

  const currentValue = Math.floor(progress * targetValue);
  const formattedVal = currentValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // 2. Animação de desenho do Sparkline SVG (stroke-dashoffset)
  const pathLength = 600;
  const strokeDashoffset = pathLength * (1 - progress);

  // 3. Ticker financeiro rodapé (loop infinito continuo)
  const tickerItems = [
    { name: 'IBOV', val: '129.650', change: '+1.32%', green: true },
    { name: 'IFIX', val: '3.217', change: '+0.81%', green: true },
    { name: 'DÓLAR', val: '5,21', change: '-0.15%', green: false },
    { name: 'EURO', val: '5,64', change: '-0.32%', green: false },
    { name: 'CDI', val: '10,65%', change: '0.00pp', green: true },
    { name: 'SELIC', val: '10,75%', change: '0.00pp', green: true },
    { name: 'IPCA', val: '0,46%', change: '-0.12pp', green: false },
    { name: 'OURO', val: 'R$ 389,42', change: '+0.78%', green: true },
    { name: 'BTC', val: 'R$ 350.542', change: '+2.11%', green: true },
    { name: 'SPX', val: '5.320', change: '-0.47%', green: false },
    { name: 'NDX', val: '18.532', change: '+0.68%', green: true },
    { name: 'GOLD', val: '2.376,41', change: '+0.55%', green: true },
  ];

  const tickerX = (frame * 1.8) % 1200;

  // Entrada em fade/scale da interface
  const entryOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const slowPushIn = interpolate(frame, [0, durationFrames], [1, 1.05], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: entryOpacity,
        transform: `scale(${slowPushIn})`,
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── Label Superior ── */}
      <div
        style={{
          fontSize: '22px',
          fontWeight: 800,
          color: '#FFFFFF',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          marginBottom: '24px',
          opacity: 0.9,
          textShadow: '0 2px 10px rgba(0,0,0,0.8)',
        }}
      >
        {label}
      </div>

      {/* ── Contador Hero Number "R$ 1.000,00" ── */}
      <div
        style={{
          fontSize: '110px',
          fontWeight: 900,
          fontStyle: 'italic',
          color,
          fontFamily: 'Playfair Display, Georgia, serif',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginBottom: '28px',
          textShadow: `0 0 35px ${color}55, 0 4px 20px rgba(0,0,0,0.9)`,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {currency} {formattedVal}
      </div>

      {/* ── Regra horizontal + Sparkline SVG desenhado dinamicamente ── */}
      <div style={{ width: '680px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Linha guia de base */}
        <div
          style={{
            width: '100%',
            height: '1px',
            backgroundColor: `${color}44`,
            marginBottom: '16px',
            transform: `scaleX(${interpolate(frame, [5, 25], [0, 1], { extrapolateRight: 'clamp' })})`,
            transformOrigin: 'center',
          }}
        />

        {/* Sparkline SVG */}
        <svg width="680" height="90" viewBox="0 0 680 90" style={{ overflow: 'visible' }}>
          <path
            d="M 10,80 Q 120,75 220,55 T 420,40 T 580,22 T 670,8"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={pathLength}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: `drop-shadow(0 0 12px ${color})`,
            }}
          />
          {/* Ponto brilhante na ponta do gráfico */}
          {progress > 0.05 && (
            <circle
              cx={10 + progress * 660}
              cy={80 - Math.pow(progress, 0.8) * 72}
              r="6"
              fill="#FFFFFF"
              style={{
                filter: `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px #FFFFFF)`,
              }}
            />
          )}
        </svg>
      </div>

      {/* ── Ticker Financeiro contínuo no rodapé ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: 0,
          right: 0,
          height: '36px',
          overflow: 'hidden',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(10, 10, 15, 0.92)',
        }}
      >
        <div
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            transform: `translateX(-${tickerX}px)`,
            gap: '32px',
          }}
        >
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontFamily: 'monospace' }}>
              <span style={{ color: '#AAAAAA', fontWeight: 700 }}>{item.name}</span>
              <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{item.val}</span>
              <span style={{ color: item.green ? '#00C853' : '#FF3D00', fontSize: '11px' }}>{item.change}</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CodeTerminalOverlay — Editor de código 3D futurista com digitação linha a linha
// Reproduz com precisão matemática o Teste #2 (Terminal 3D + cursor piscante)
// ─────────────────────────────────────────────────────────────────────────────
export const CodeTerminalOverlay: React.FC<{
  codeLines?: string[];
  durationFrames?: number;
  primaryColor?: string;
}> = ({
  codeLines = [
    'import { animate } from "@remotion/animation";',
    'export const renderPipeline = async (scene) => {',
    '  const timeline = new MotionTimeline({ fps: 30 });',
    '  await timeline.syncAudio(scene.audioUrl);',
    '  timeline.applyStyle(scene.animationStyle);',
    '  return timeline.exportHighPrecision();',
    '};',
  ],
  durationFrames = 150,
  primaryColor = '#00E0FF',
}) => {
  const frame = useCurrentFrame();

  // Rotação orbital suave 3D da janela
  const rotY = interpolate(frame, [0, durationFrames], [-8, 8], { extrapolateRight: 'clamp' });
  const rotX = interpolate(frame, [0, durationFrames], [6, -4], { extrapolateRight: 'clamp' });

  // Cursor piscando a cada 16 frames
  const cursorBlink = Math.floor(frame / 16) % 2 === 0;

  // Caracteres revelados gradualmente por linha
  const charsRevealed = Math.floor(frame * 1.8);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1000px',
      }}
    >
      <div
        style={{
          width: '780px',
          height: '460px',
          backgroundColor: 'rgba(17, 17, 24, 0.95)',
          borderRadius: '16px',
          border: `1px solid ${primaryColor}66`,
          boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 30px ${primaryColor}22, inset 0 0 20px ${primaryColor}11`,
          transform: `rotateY(${rotY}deg) rotateX(${rotX}deg)`,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Fira Code, JetBrains Mono, monospace',
          color: '#E2E8F0',
          fontSize: '16px',
          lineHeight: 1.7,
        }}
      >
        {/* Header do Terminal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FF5F56' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27C93F' }} />
          <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '12px' }}>darktube-core.ts — 3D Remotion Engine</span>
        </div>

        {/* Linhas de código animadas */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {codeLines.map((line, idx) => {
            const lineStartChar = idx * 35;
            const visibleChars = Math.max(0, Math.min(line.length, charsRevealed - lineStartChar));
            const textToShow = line.substring(0, visibleChars);
            const isCurrentLine = visibleChars > 0 && visibleChars < line.length || (charsRevealed >= lineStartChar && charsRevealed < lineStartChar + 35);

            return (
              <div key={idx} style={{ display: 'flex', gap: '16px' }}>
                <span style={{ color: '#475569', width: '24px', textAlign: 'right', userSelect: 'none' }}>{idx + 1}</span>
                <span>
                  <span style={{ color: idx === 0 || idx === 1 ? primaryColor : idx === 3 || idx === 4 ? '#A78BFA' : '#F1F5F9' }}>
                    {textToShow}
                  </span>
                  {isCurrentLine && cursorBlink && (
                    <span style={{ backgroundColor: primaryColor, color: '#000', paddingLeft: '2px', paddingRight: '2px', marginLeft: '2px' }}> </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
