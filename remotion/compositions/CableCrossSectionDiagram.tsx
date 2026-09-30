import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';

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

interface CableLayer {
  name: string;
  desc: string;
  r: number;
  color: string;
  stroke: string;
  thickness: string;
}

export interface CableCrossSectionProps {
  primaryColor?: string;
  format?: 'vertical' | 'horizontal';
  headline?: string;
  subheadline?: string;
  depthMeters?: number;
  pressureAtm?: number;
}

// ─── Photon Particles (traveling through fiber optic core) ──────────────────
const PhotonParticles: React.FC<{
  frame: number;
  primaryColor: string;
  coreR: number;
}> = ({ frame, primaryColor, coreR }) => {
  const rng = createRng(2718);
  const photons = Array.from({ length: 8 }, (_, i) => {
    const baseAngle = rng() * Math.PI * 2;
    const speed = 0.08 + rng() * 0.06;
    const orbR = 5 + rng() * (coreR - 10);
    const angle = baseAngle + frame * speed;
    const x = Math.cos(angle) * orbR;
    const y = Math.sin(angle) * orbR;
    const size = 2 + rng() * 2.5;
    const pulse = 0.5 + Math.sin(frame * 0.2 + i * 1.5) * 0.5;

    return { x, y, size, pulse, i };
  });

  return (
    <>
      {photons.map((p) => (
        <circle
          key={p.i}
          cx={p.x}
          cy={p.y}
          r={p.size}
          fill="#FFFFFF"
          opacity={0.4 + p.pulse * 0.6}
          filter="url(#photon-glow)"
        />
      ))}
      {/* Photon trails */}
      {photons.slice(0, 4).map((p) => {
        const trailAngle = Math.atan2(p.y, p.x) - 0.3;
        const tx = Math.cos(trailAngle) * Math.hypot(p.x, p.y);
        const ty = Math.sin(trailAngle) * Math.hypot(p.x, p.y);
        return (
          <line
            key={`trail-${p.i}`}
            x1={p.x}
            y1={p.y}
            x2={tx}
            y2={ty}
            stroke={primaryColor}
            strokeWidth="1.5"
            opacity={0.3 + p.pulse * 0.3}
            filter="url(#photon-glow)"
          />
        );
      })}
    </>
  );
};

// ─── Dimension Line (technical measurement arrows) ──────────────────────────
const DimensionLine: React.FC<{
  x1: number; y1: number;
  x2: number; y2: number;
  label: string;
  opacity: number;
  color: string;
}> = ({ x1, y1, x2, y2, label, opacity, color }) => {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const perpX = Math.cos(angle + Math.PI / 2) * 6;
  const perpY = Math.sin(angle + Math.PI / 2) * 6;

  return (
    <g opacity={opacity}>
      {/* Main line */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" strokeDasharray="4 2" />
      {/* End ticks */}
      <line x1={x1 - perpX} y1={y1 - perpY} x2={x1 + perpX} y2={y1 + perpY} stroke={color} strokeWidth="1.5" />
      <line x1={x2 - perpX} y1={y2 - perpY} x2={x2 + perpX} y2={y2 + perpY} stroke={color} strokeWidth="1.5" />
      {/* Label */}
      <text x={midX} y={midY - 8} textAnchor="middle" fill={color} fontSize="10" fontWeight="700" fontFamily="'Courier New', monospace">
        {label}
      </text>
    </g>
  );
};

// ─── Bubble Particles (deep sea background) ─────────────────────────────────
const DeepSeaBubbles: React.FC<{ frame: number; opacity: number }> = ({ frame, opacity }) => {
  const rng = createRng(1618);
  const bubbles = Array.from({ length: 18 }, (_, i) => {
    const x = rng() * 100;
    const baseY = rng() * 100;
    const speed = 0.15 + rng() * 0.3;
    const size = 2 + rng() * 5;
    const wobbleFreq = 0.02 + rng() * 0.03;
    const wobbleAmp = 5 + rng() * 10;
    const y = (baseY + frame * speed) % 110 - 5;
    const xWobble = Math.sin(frame * wobbleFreq + i * 2) * wobbleAmp;
    const op = Math.sin((y / 110) * Math.PI) * (0.15 + rng() * 0.2);

    return { x: x + xWobble / 10, y: 100 - y, size, op, i };
  });

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity }}>
      {bubbles.map((b) => (
        <div
          key={b.i}
          style={{
            position: 'absolute',
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            borderRadius: '50%',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            opacity: b.op,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ─── Pressure Gauge ─────────────────────────────────────────────────────────
const PressureGauge: React.FC<{
  pressure: number;
  progress: number;
  primaryColor: string;
}> = ({ pressure, progress, primaryColor }) => {
  const gaugeAngle = -135 + progress * 270 * (pressure / 600);
  const r = 32;
  const cx = 40;
  const cy = 40;

  // Arc path for the gauge background
  const arcPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = {
      x: cx + radius * Math.cos((startAngle * Math.PI) / 180),
      y: cy + radius * Math.sin((startAngle * Math.PI) / 180),
    };
    const end = {
      x: cx + radius * Math.cos((endAngle * Math.PI) / 180),
      y: cy + radius * Math.sin((endAngle * Math.PI) / 180),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Needle endpoint
  const needleAngle = (gaugeAngle * Math.PI) / 180;
  const needleX = cx + (r - 4) * Math.cos(needleAngle);
  const needleY = cy + (r - 4) * Math.sin(needleAngle);

  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      {/* Gauge track */}
      <path d={arcPath(-225, 45, r)} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" strokeLinecap="round" />
      {/* Gauge fill */}
      <path d={arcPath(-225, -225 + progress * 270 * (pressure / 600), r)} fill="none" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="3" fill="#FFFFFF" />
      {/* Value */}
      <text x={cx} y={cy + 18} textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="800" fontFamily="'Courier New', monospace">
        {Math.round(pressure * progress)} ATM
      </text>
    </svg>
  );
};

/**
 * CableCrossSectionDiagram V2 — Motor Ultra de Diagrama Técnico
 *
 * Estilo Kurzgesagt / Sci-Tech documentário premium.
 * Inclui: explosão radial de camadas, linhas de cota técnicas,
 * fótons viajantes no núcleo, perspectiva 2.5D, pulso sísmico,
 * labels typewriter, glow throughput, deep sea background com bolhas,
 * hachura técnica, e indicador de pressão com spring.
 */
export const CableCrossSectionDiagram: React.FC<CableCrossSectionProps> = ({
  primaryColor = '#00F0FF',
  format = 'vertical',
  headline = 'COMO UM CABO RESISTE AO OCEANO',
  subheadline = 'ANATOMIA DE ENGENHARIA // RAIO X',
  depthMeters = 4500,
  pressureAtm = 450,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = format === 'vertical';

  // ── 1. Master entry spring ──
  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 85 } });
  const masterScale = interpolate(enter, [0, 1], [0.85, 1.0]);

  // ── 2. Rotation + 2.5D perspective ──
  const rot = frame * 0.15;
  const perspectiveSkewX = Math.sin(frame * 0.01) * 3;
  const perspectiveSkewY = Math.cos(frame * 0.008) * 2;

  // ── 3. Laser pulse (fiber throughput) ──
  const laserPulse = (Math.sin(frame * 0.25) + 1) / 2;
  const glowIntensity = interpolate(frame, [0, 60, 120], [3, 8, 12], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });

  // ── 4. Seismic wobble ──
  const seismicActive = frame > 50 && frame < 70;
  const seismicWobble = seismicActive
    ? Math.sin(frame * 2.5) * 4 * Math.exp(-(frame - 50) * 0.15)
    : Math.sin(frame * 0.08) * 0.5;

  // ── 5. Exploded view progress ──
  const explodeProgress = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });

  // ── 6. Typewriter labels ──
  const labelStartFrame = 40;

  // ── 7. Pressure gauge ──
  const gaugeEnter = spring({
    frame: Math.max(0, frame - 25),
    fps,
    config: { damping: 18, stiffness: 90 },
  });

  // ── 8. Depth indicator ──
  const depthCount = Math.round(
    interpolate(frame, [20, 60], [0, depthMeters], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  // ── 9. Title entrance ──
  const titleEnter = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  // Camadas do cabo
  const layers: CableLayer[] = [
    { name: '1. JAQUETA DE POLIETILENO', desc: 'Resistência a pressão abissal e mordidas de tubarão', r: 160, color: '#1E293B', stroke: '#475569', thickness: '12mm' },
    { name: '2. BLINDAGEM DE FIOS DE AÇO', desc: 'Sustenta tensão mecânica de 50 toneladas', r: 130, color: '#334155', stroke: '#94A3B8', thickness: '8mm' },
    { name: '3. TUBO DE COBRE CONDUTOR', desc: 'Conduz 10.000V DC para repetidores no leito marinho', r: 95, color: '#B45309', stroke: '#F59E0B', thickness: '6mm' },
    { name: '4. GEL BLOQUEADOR DE ÁGUA', desc: 'Gel tixotrópico que veda infiltrações salinas', r: 65, color: '#0369A1', stroke: '#38BDF8', thickness: '4mm' },
    { name: '5. NÚCLEO DE FIBRAS ÓPTICAS', desc: '12 a 24 pares de vidro puro transportando fótons', r: 35, color: '#0F172A', stroke: primaryColor, thickness: '2mm' },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#020610',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── DEEP SEA BACKGROUND ── */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 120%, #0A1628 0%, #020610 60%)',
        }}
      />

      {/* Bubble particles */}
      <DeepSeaBubbles frame={frame} opacity={enter} />

      {/* ── Engineering Grid ── */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.1 }}>
        <defs>
          <pattern id="diag-grid-v2" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#38BDF8" strokeWidth="0.5" />
          </pattern>
          <pattern id="diag-grid-fine" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#38BDF8" strokeWidth="0.2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diag-grid-v2)" />
        <rect width="100%" height="100%" fill="url(#diag-grid-fine)" opacity="0.5" />
      </svg>

      {/* ── TITLE BLOCK ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '100px' : '45px',
          textAlign: 'center',
          zIndex: 10,
          transform: `translateY(${(1 - titleEnter) * 30}px)`,
          opacity: titleEnter,
        }}
      >
        <div style={{
          color: primaryColor,
          fontSize: '14px',
          fontWeight: 800,
          letterSpacing: '3px',
          textTransform: 'uppercase',
        }}>
          {subheadline}
        </div>
        <h2 style={{
          fontSize: isVertical ? '34px' : '28px',
          fontWeight: 900,
          color: '#FFFFFF',
          margin: '6px 0 0 0',
          textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}>
          {headline}
        </h2>
        {/* Depth counter */}
        <div style={{
          marginTop: '12px',
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          fontSize: '13px',
          fontFamily: "'Courier New', monospace",
        }}>
          <span style={{ color: '#38BDF8' }}>
            PROFUNDIDADE: <span style={{ color: '#FFFFFF', fontWeight: 800 }}>{depthCount.toLocaleString()}m</span>
          </span>
          <span style={{ color: '#475569' }}>|</span>
          <span style={{ color: '#38BDF8' }}>
            PRESSÃO: <span style={{ color: '#FFFFFF', fontWeight: 800 }}>{Math.round(pressureAtm * gaugeEnter)} ATM</span>
          </span>
        </div>
      </div>

      {/* ── CENTRAL SVG CROSS-SECTION ── */}
      <div
        style={{
          transform: `scale(${masterScale}) translate(${seismicWobble}px, 0)`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: isVertical ? '-60px' : '10px',
        }}
      >
        <svg width="440" height="440" viewBox="-220 -220 440 440">
          <defs>
            {/* Laser glow filter */}
            <filter id="laser-glow-v2" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={glowIntensity} />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Photon glow filter */}
            <filter id="photon-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Cross-hatch pattern */}
            <pattern id="crosshatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform={`rotate(${45 + rot * 0.1})`}>
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* 2.5D perspective transform */}
          <g transform={`rotate(${rot}) skewX(${perspectiveSkewX}) skewY(${perspectiveSkewY})`}>
            {/* Concentric circles with exploded view */}
            {layers.map((layer, idx) => {
              const layerSpring = spring({
                frame: Math.max(0, frame - idx * 8),
                fps,
                config: { damping: 14, stiffness: 90 },
              });

              // Exploded view: outer layers move outward
              const explodeOffset = explodeProgress * (4 - idx) * 12;
              const r = layer.r * layerSpring + explodeOffset;

              // Seismic deformation
              const deform = seismicActive
                ? Math.sin(frame * 3 + idx * 0.5) * 2 * Math.exp(-(frame - 50) * 0.12)
                : 0;

              return (
                <React.Fragment key={idx}>
                  {/* Main circle */}
                  <circle
                    r={r + deform}
                    fill={layer.color}
                    stroke={layer.stroke}
                    strokeWidth={idx === 4 ? '3' : '2'}
                    filter={idx === 4 ? 'url(#laser-glow-v2)' : undefined}
                    opacity={layerSpring}
                  />
                  {/* Cross-hatch fill for middle layers */}
                  {idx > 0 && idx < 4 && (
                    <circle
                      r={r + deform}
                      fill="url(#crosshatch)"
                      opacity={layerSpring * 0.5}
                    />
                  )}
                  {/* Inner glow ring */}
                  {idx === 4 && (
                    <circle
                      r={r + deform + 4}
                      fill="none"
                      stroke={primaryColor}
                      strokeWidth="1"
                      opacity={0.3 + laserPulse * 0.4}
                      filter="url(#photon-glow)"
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* Photon particles in fiber core */}
            <PhotonParticles frame={frame} primaryColor={primaryColor} coreR={35} />

            {/* Fiber optic individual strands */}
            {[-12, 0, 12].map((x, xi) =>
              [-12, 0, 12].map((y, yi) => {
                if (Math.hypot(x, y) > 20) return null;
                const strandPulse = Math.sin(frame * 0.3 + xi * 2 + yi * 3);
                return (
                  <circle
                    key={`strand-${xi}-${yi}`}
                    cx={x}
                    cy={y}
                    r={3.2}
                    fill="#FFFFFF"
                    filter="url(#laser-glow-v2)"
                    opacity={0.5 + laserPulse * 0.3 + strandPulse * 0.15}
                  />
                );
              })
            )}
          </g>

          {/* ── DIMENSION LINES (outside the rotating group) ── */}
          {explodeProgress > 0.5 && (
            <>
              <DimensionLine
                x1={-175} y1={-175} x2={-175} y2={175}
                label={`Ø ${layers[0].thickness}`}
                opacity={(explodeProgress - 0.5) * 2}
                color="rgba(255,255,255,0.5)"
              />
              <DimensionLine
                x1={175} y1={-100} x2={175} y2={100}
                label={`Ø ${layers[2].thickness}`}
                opacity={(explodeProgress - 0.5) * 2}
                color="#F59E0B"
              />
              <DimensionLine
                x1={-50} y1={200} x2={50} y2={200}
                label={`Ø ${layers[4].thickness}`}
                opacity={(explodeProgress - 0.5) * 2}
                color={primaryColor}
              />
            </>
          )}
        </svg>
      </div>

      {/* ── PRESSURE GAUGE ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '260px' : '140px',
          right: isVertical ? '30px' : '40px',
          opacity: gaugeEnter,
          transform: `scale(${gaugeEnter})`,
        }}
      >
        <PressureGauge pressure={pressureAtm} progress={gaugeEnter} primaryColor={primaryColor} />
      </div>

      {/* ── LEGEND with typewriter labels ── */}
      <div
        style={{
          position: 'absolute',
          bottom: isVertical ? '120px' : '40px',
          width: isVertical ? '88%' : '750px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 10,
        }}
      >
        {layers.map((l, i) => {
          const itemEnter = spring({
            frame: Math.max(0, frame - 15 - i * 6),
            fps,
            config: { damping: 15, stiffness: 100 },
          });

          // Typewriter for label name
          const labelFrame = Math.max(0, frame - labelStartFrame - i * 10);
          const typeChars = Math.min(l.name.length, Math.floor(labelFrame * 1.5));
          const visibleName = l.name.substring(0, typeChars);
          const labelCursor = typeChars < l.name.length && labelFrame > 0 && frame % 12 < 7;

          // Throughput glow for active layer
          const isActive = i === Math.floor((frame / 30) % layers.length);

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                backgroundColor: isActive
                  ? 'rgba(15, 23, 42, 0.9)'
                  : 'rgba(15, 23, 42, 0.65)',
                border: `1px solid ${isActive ? l.stroke + '44' : 'rgba(255, 255, 255, 0.08)'}`,
                padding: '10px 16px',
                borderRadius: '12px',
                transform: `translateX(${(1 - itemEnter) * 40}px)`,
                opacity: itemEnter,
                boxShadow: isActive ? `0 0 20px ${l.stroke}22` : 'none',
              }}
            >
              {/* Dot with pulse */}
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: l.stroke,
                  boxShadow: `0 0 ${isActive ? 16 : 8}px ${l.stroke}`,
                  transform: `scale(${isActive ? 1.2 : 1})`,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 800, fontFamily: "'Courier New', monospace" }}>
                  {visibleName}
                  {labelCursor && (
                    <span style={{ color: primaryColor, marginLeft: '2px' }}>▌</span>
                  )}
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: '12px',
                  opacity: typeChars >= l.name.length ? 1 : 0,
                }}>
                  {l.desc}
                </div>
              </div>
              {/* Thickness badge */}
              <div style={{
                fontSize: '11px',
                color: l.stroke,
                fontWeight: 700,
                fontFamily: "'Courier New', monospace",
                opacity: typeChars >= l.name.length ? 0.8 : 0,
                padding: '2px 8px',
                border: `1px solid ${l.stroke}33`,
                borderRadius: '6px',
              }}>
                {l.thickness}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SEISMIC INDICATOR ── */}
      {seismicActive && (
        <div
          style={{
            position: 'absolute',
            top: isVertical ? '200px' : '100px',
            left: isVertical ? '30px' : '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: Math.exp(-(frame - 50) * 0.08),
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              boxShadow: '0 0 12px #EF4444',
            }}
          />
          <span style={{
            fontSize: '12px',
            fontWeight: 800,
            color: '#EF4444',
            letterSpacing: '2px',
            fontFamily: "'Courier New', monospace",
          }}>
            ⚠ SEISMIC EVENT DETECTED
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
