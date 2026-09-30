import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// ─────────────────────────────────────────────────────────────────────────────
// 1. GRÁFICO DE LINHA ANIMADO (Data Visualization & Finanças)
// ─────────────────────────────────────────────────────────────────────────────
export interface LineChartProps {
  data?: number[];
  labels?: string[];
  title?: string;
  currency?: string;
  color?: string;
  isVertical?: boolean;
}

export const AnimatedLineChart: React.FC<LineChartProps> = ({
  data = [120, 240, 180, 390, 520, 480, 780, 950, 1240],
  labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'],
  title = 'RECEITA ANUAL ACUMULADA',
  currency = 'R$',
  color = '#10B981',
  isVertical = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;

  const svgWidth = isVertical ? 800 : 700;
  const svgHeight = isVertical ? 420 : 340;
  const padX = 60;
  const padY = 50;
  const graphW = svgWidth - padX * 2;
  const graphH = svgHeight - padY * 2;

  // Gerar coordenadas dos pontos
  const points = data.map((val, i) => {
    const x = padX + (i / (data.length - 1)) * graphW;
    const y = svgHeight - padY - ((val - minVal) / range) * graphH;
    return { x, y, val };
  });

  // Criar SVG Path
  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  // Criar área preenchida com gradiente
  const areaD = `${pathD} L ${points[points.length - 1].x},${svgHeight - padY} L ${points[0].x},${svgHeight - padY} Z`;

  // Comprimento da linha para efeito strokeDashoffset
  const pathLength = 1500;
  const strokeDashoffset = interpolate(progress, [0, 1], [pathLength, 0]);

  // Valor atual interpolado
  const currentValIndex = Math.min(
    Math.floor(progress * (data.length - 1)),
    data.length - 1
  );
  const currentVal = Math.round(interpolate(progress, [0, 1], [data[0], data[data.length - 1]]));

  return (
    <div
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'none',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 24,
        padding: isVertical ? '32px 28px' : '24px 28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        width: svgWidth + 50,
        fontFamily: 'Inter, Montserrat, sans-serif',
      }}
    >
      {/* Header do Gráfico */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
            {title}
          </span>
          <div style={{ fontSize: isVertical ? 46 : 38, fontWeight: 900, color: '#FFFFFF', marginTop: 4 }}>
            {currency} {currentVal.toLocaleString('pt-BR')}
          </div>
        </div>
        <div
          style={{
            backgroundColor: `${color}22`,
            border: `1px solid ${color}66`,
            color,
            borderRadius: 100,
            padding: '6px 16px',
            fontSize: 16,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ▲ +{Math.round(((data[data.length - 1] - data[0]) / (data[0] || 1)) * 100)}%
        </div>
      </div>

      {/* SVG Canvas do Gráfico */}
      <svg width={svgWidth} height={svgHeight} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Linhas de Grade de Fundo */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line
            key={i}
            x1={padX}
            y1={padY + pct * graphH}
            x2={svgWidth - padX}
            y2={padY + pct * graphH}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="4 4"
          />
        ))}

        {/* Área preenchida com gradiente */}
        <path d={areaD} fill="url(#lineGrad)" opacity={interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' })} />

        {/* Linha Principal Animada */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          strokeDashoffset={strokeDashoffset}
        />

        {/* Pontos de dados */}
        {points.map((pt, i) => {
          const ptProgress = spring({
            frame: Math.max(0, frame - i * 3),
            fps,
            config: { damping: 12, stiffness: 120 },
          });
          return (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={6 * ptProgress}
                fill="#FFFFFF"
                stroke={color}
                strokeWidth="3"
                style={{ filter: `drop-shadow(0 0 8px ${color})` }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. BARRAS COMPARATIVAS ANIMADAS (Bar Chart)
// ─────────────────────────────────────────────────────────────────────────────
export interface BarChartProps {
  items?: Array<{ label: string; value: number; color?: string }>;
  title?: string;
  isVertical?: boolean;
}

export const AnimatedBarChart: React.FC<BarChartProps> = ({
  items = [
    { label: 'Estratégia Tradicional', value: 35, color: '#64748B' },
    { label: 'Automação com IA', value: 88, color: '#3B82F6' },
    { label: 'DarkTube Engine', value: 145, color: '#EAB308' },
  ],
  title = 'COMPARATIVO DE EFICIÊNCIA',
  isVertical = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const maxVal = Math.max(...items.map((it) => it.value), 1);

  return (
    <div
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 24,
        padding: isVertical ? '32px 28px' : '24px 28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        width: isVertical ? 820 : 650,
        fontFamily: 'Inter, Montserrat, sans-serif',
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 20 }}>
        {title}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map((item, i) => {
          const itemProgress = spring({
            frame: Math.max(0, frame - i * 6),
            fps,
            config: { damping: 14, stiffness: 90 },
          });

          const pct = Math.round((item.value / maxVal) * 100);
          const currentWidth = interpolate(itemProgress, [0, 1], [0, pct]);

          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>{item.label}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: item.color || '#EAB308' }}>
                  {Math.round(itemProgress * item.value)} pts
                </span>
              </div>
              <div style={{ width: '100%', height: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 100, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${currentWidth}%`,
                    height: '100%',
                    backgroundColor: item.color || '#EAB308',
                    borderRadius: 100,
                    boxShadow: `0 0 16px ${item.color || '#EAB308'}66`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. MAPA DE ROTAS ANIMADO (Map & Route Tracker)
// ─────────────────────────────────────────────────────────────────────────────
export interface MapRouteProps {
  origin?: string;
  destination?: string;
  label?: string;
  isVertical?: boolean;
}

export const AnimatedMapRoute: React.FC<MapRouteProps> = ({
  origin = 'São Paulo',
  destination = 'Nova York',
  label = 'EXPANSÃO GLOBAL DE MERCADO',
  isVertical = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 70 },
  });

  const width = isVertical ? 820 : 680;
  const height = isVertical ? 380 : 300;

  const startX = 140;
  const startY = height - 70;
  const endX = width - 140;
  const endY = 80;
  const controlX = width / 2;
  const controlY = 20;

  const curveD = `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`;
  const pathLen = 800;
  const strokeOffset = interpolate(progress, [0, 1], [pathLen, 0]);

  // Posição da aeronave/marcador sobre a curva quadrática
  const t = progress;
  const curX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
  const curY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;

  return (
    <div
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 24,
        padding: '24px 28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        width,
        fontFamily: 'Inter, Montserrat, sans-serif',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 12 }}>
        {label}
      </div>

      <svg width={width - 56} height={height} style={{ overflow: 'visible' }}>
        {/* Curva pontilhada de trajetória */}
        <path
          d={curveD}
          fill="none"
          stroke="#EAB308"
          strokeWidth="3"
          strokeDasharray="8 6"
          strokeDashoffset={strokeOffset}
          style={{ filter: 'drop-shadow(0 0 10px rgba(234,179,8,0.5))' }}
        />

        {/* Ponto Origem */}
        <circle cx={startX} cy={startY} r="8" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
        <text x={startX - 10} y={startY + 26} fill="#FFFFFF" fontSize="16" fontWeight="800" textAnchor="middle">
          {origin}
        </text>

        {/* Ponto Destino */}
        <circle cx={endX} cy={endY} r="8" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
        <text x={endX + 10} y={endY + 26} fill="#FFFFFF" fontSize="16" fontWeight="800" textAnchor="middle">
          {destination}
        </text>

        {/* Marcador em movimento */}
        <g transform={`translate(${curX}, ${curY})`}>
          <circle r="14" fill="#EAB308" opacity="0.3" style={{ filter: 'blur(4px)' }} />
          <circle r="8" fill="#FFFFFF" stroke="#EAB308" strokeWidth="3" />
        </g>
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. LOWER THIRD ELEGANTE (Documentários & YouTube 16:9)
// ─────────────────────────────────────────────────────────────────────────────
export interface LowerThirdProps {
  name: string;
  role: string;
  company?: string;
  primaryColor?: string;
}

export const DocumentaryLowerThird: React.FC<LowerThirdProps> = ({
  name,
  role,
  company,
  primaryColor = '#EAB308',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  const barWidth = interpolate(enter, [0, 0.4], [0, 6], { extrapolateRight: 'clamp' });
  const textX = interpolate(enter, [0.2, 1], [-40, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(enter, [0.2, 0.8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: 80,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        zIndex: 50,
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* Barra de Acento */}
      <div
        style={{
          width: barWidth,
          height: 64,
          backgroundColor: primaryColor,
          borderRadius: 4,
          boxShadow: `0 0 16px ${primaryColor}aa`,
        }}
      />

      {/* Conteúdo de Texto */}
      <div
        style={{
          backgroundColor: 'rgba(10, 15, 30, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '0 16px 16px 0',
          padding: '14px 28px',
          transform: `translateX(${textX}px)`,
          opacity,
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.5px' }}>
          {name}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: primaryColor, marginTop: 2 }}>
          {role} {company ? `• ${company}` : ''}
        </div>
      </div>
    </div>
  );
};
