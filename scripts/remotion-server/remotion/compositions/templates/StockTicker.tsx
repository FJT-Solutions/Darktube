import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';

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

// ─── Closed-form spring (pure function of time) ─────────────────────────────
function closedFormSpring(t: number, k = 170, d = 26): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k);
  const z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// ─── Procedural Candlestick Chart ───────────────────────────────────────────
interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
}

const CandlestickChart: React.FC<{
  frame: number;
  springProg: number;
}> = ({ frame, springProg }) => {
  const candles: Candle[] = React.useMemo(() => {
    const r = createRng(48291);
    let prev = 160;
    return Array.from({ length: 18 }, () => {
      const delta = (r() - 0.45) * 45;
      const next = Math.max(50, Math.min(260, prev + delta));
      const high = Math.min(280, Math.max(prev, next) + r() * 25);
      const low = Math.max(20, Math.min(prev, next) - r() * 25);
      const candle = { open: prev, close: next, high, low };
      prev = next;
      return candle;
    });
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '240px' }}>
      <svg width="100%" height="240" viewBox="0 0 600 240">
        {/* Horizontal Price Grid Lines */}
        {[60, 120, 180].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="600"
            y2={y}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 4"
          />
        ))}

        {/* Candlestick bars */}
        {candles.map((c, i) => {
          const isGreen = c.close >= c.open;
          const color = isGreen ? '#10B981' : '#EF4444';
          const x = 30 + i * 30;
          const bodyTop = 240 - Math.max(c.open, c.close);
          const bodyH = Math.max(4, Math.abs(c.close - c.open));
          const wickTop = 240 - c.high;
          const wickBottom = 240 - c.low;

          return (
            <g key={i} opacity={Math.min(1, springProg * (i + 1) * 0.15)}>
              {/* Wick */}
              <line x1={x} y1={wickTop} x2={x} y2={wickBottom} stroke={color} strokeWidth="1.5" />
              {/* Body */}
              <rect
                x={x - 8}
                y={bodyTop}
                width="16"
                height={bodyH}
                fill={color}
                rx="2"
                style={{ filter: `drop-shadow(0 0 6px ${color})` }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─── Running Ticker Tape Bar ────────────────────────────────────────────────
const RunningTickerTape: React.FC<{ frame: number }> = ({ frame }) => {
  const items = [
    { sym: 'BTC', price: '$68,420', chg: '+4.8%', up: true },
    { sym: 'ETH', price: '$3,890', chg: '+2.1%', up: true },
    { sym: 'SOL', price: '$182', chg: '-1.4%', up: false },
    { sym: 'NVDA', price: '$134', chg: '+6.2%', up: true },
    { sym: 'SPY', price: '$560', chg: '+0.5%', up: true },
  ];

  const scrollX = (frame * 2.5) % 800;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '42px',
        backgroundColor: '#0F172A',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        zIndex: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '32px',
          transform: `translateX(${-scrollX}px)`,
          transition: 'none',
        }}
      >
        {[...items, ...items, ...items].map((it, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '13px', fontWeight: 800 }}>
            <span style={{ color: '#FFFFFF' }}>{it.sym}</span>
            <span style={{ color: '#94A3B8' }}>{it.price}</span>
            <span style={{ color: it.up ? '#10B981' : '#EF4444' }}>{it.chg}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main StockTicker Composition ───────────────────────────────────────────
export const StockTickerComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#10B981', // Bullish Green
  accentColor = '#EF4444',  // Bearish Red
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'MARKET WATCH 24/7',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const time = frame / fps;

  // Scene timing resolution
  let accumulatedTime = 0;
  let activeSceneIndex = 0;
  let sceneLocalTime = 0;
  let sceneStartFrame = 0;

  for (let i = 0; i < scenes.length; i++) {
    const dur = scenes[i].durationSeconds || 5;
    if (time >= accumulatedTime && time < accumulatedTime + dur) {
      activeSceneIndex = i;
      sceneLocalTime = time - accumulatedTime;
      sceneStartFrame = Math.round(accumulatedTime * fps);
      break;
    }
    accumulatedTime += dur;
  }

  const currentScene = scenes[activeSceneIndex] || scenes[0] || ({} as SceneSegment);
  const dur = currentScene.durationSeconds || 5;
  const isLandscape = format === 'horizontal' || width > height;

  // Card Spring
  const cardSpring = closedFormSpring(sceneLocalTime, 140, 20);

  // Price Odometre
  const basePrice = 64280;
  const priceSpring = closedFormSpring(sceneLocalTime - 0.2, 120, 18);
  const currentPrice = (basePrice + priceSpring * 4150).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const headline = currentScene.letteringLines?.[0]?.text || 'RALI HISTÓRICO: NOVA MÁXIMA';
  const subtitle = currentScene.captionText || 'Fluxo institucional recorde impulsiona rompimento de resistência.';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#06090E',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Top Ticker Tape Stream ── */}
      <RunningTickerTape frame={frame} />

      {/* Ambient Radial Gradient */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 30%, ${primaryColor}22 0%, transparent 65%),
            radial-gradient(circle at 80% 80%, #0F172A 0%, #06090E 100%)
          `,
        }}
      />

      {/* ── 2. Main Financial Terminal Card ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isLandscape ? '0 90px' : '0 24px',
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: isLandscape ? '70%' : '92%',
            maxWidth: '840px',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            border: `2px solid ${primaryColor}66`,
            borderRadius: '28px',
            boxShadow: `0 25px 70px rgba(0,0,0,0.9), 0 0 35px ${primaryColor}22`,
            padding: isLandscape ? '36px 40px' : '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            transform: `translateY(${(1 - cardSpring) * 45}px) scale(${0.96 + cardSpring * 0.04})`,
            opacity: cardSpring,
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Asset Info Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#F7931A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  color: '#FFFFFF',
                  fontWeight: 900,
                }}
              >
                ₿
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', color: '#FFFFFF', fontWeight: 900 }}>
                  BTC / USD
                </h2>
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>Bitcoin Spot Index</span>
              </div>
            </div>

            {/* Target Hit Tag */}
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1.5px solid #10B981',
                color: '#10B981',
                padding: '4px 14px',
                borderRadius: '999px',
                fontWeight: 800,
                fontSize: '12px',
              }}
            >
              ALVO ATINGIDO 🎯
            </div>
          </div>

          {/* Large Price Counter */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
            <div
              style={{
                fontSize: isLandscape ? '56px' : '46px',
                fontWeight: 900,
                color: '#FFFFFF',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-1px',
              }}
            >
              ${currentPrice}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: primaryColor }}>
              ▲ +6.45%
            </div>
          </div>

          {/* Candlestick Chart */}
          <CandlestickChart frame={frame} springProg={cardSpring} />

          {/* Headline & Subtitle */}
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '20px', color: '#FFFFFF', fontWeight: 800 }}>
              {headline}
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8', lineHeight: 1.4 }}>
              {subtitle}
            </p>
          </div>
        </div>
      </AbsoluteFill>

      {/* ── 3. Brand Watermark ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '16px' : '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#64748B',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '2px',
            zIndex: 40,
          }}
        >
          {watermarkText}
        </div>
      )}
    </AbsoluteFill>
  );
};
