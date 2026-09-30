import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
import { WORLD_CONTINENTS_PATH, STRATEGIC_REGIONS } from './worldMapData';

export interface GeoPoint {
  name: string;
  country: string;
  lng: number; // -180 to 180
  lat: number; // -90 to 90
}

export interface CableRoute {
  id: string;
  name: string;
  origin: GeoPoint;
  destination: GeoPoint;
  lengthKm: number;
  capacityTbps: number;
  depthMeters: number;
  color?: string;
  owner?: string;
}

export type CameraPreset =
  | 'global-atlantic'
  | 'atlantic-cable'
  | 'pacific-chokepoint'
  | 'europe-asia'
  | 'overview';

export interface CinematicWorldMapSceneProps {
  cameraPreset?: CameraPreset;
  activeCable?: CableRoute;
  allCables?: CableRoute[];
  highlightCountry?: string;
  headline?: string;
  subheadline?: string;
  metricBadge?: string;
  primaryColor?: string;
  format?: 'vertical' | 'horizontal';
  durationFrames?: number;
}

// Projection helper: transforms [lng, lat] to SVG coordinate space [0..2000, 0..1000]
export function projectGeo(lng: number, lat: number, w = 2000, h = 1000): [number, number] {
  const x = ((lng + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return [x, y];
}

// Standard geopolitical submarine cables
export const SUBSEA_CABLES: Record<string, CableRoute> = {
  ellalink: {
    id: 'ellalink',
    name: 'Cabo EllaLink (Brasil ➔ Europa)',
    origin: { name: 'Fortaleza', country: 'BR', lng: -38.5, lat: -3.7 },
    destination: { name: 'Sines / Lisboa', country: 'PT', lng: -8.9, lat: 38.0 },
    lengthKm: 6000,
    capacityTbps: 100,
    depthMeters: 4500,
    color: '#00F0FF',
    owner: 'Consórcio EllaLink',
  },
  dunant: {
    id: 'dunant',
    name: 'Cabo Dunant (EUA ➔ França)',
    origin: { name: 'Virginia Beach', country: 'US', lng: -76.0, lat: 36.8 },
    destination: { name: 'Saint-Hilaire', country: 'FR', lng: -1.9, lat: 46.7 },
    lengthKm: 6600,
    capacityTbps: 250,
    depthMeters: 4300,
    color: '#EAB308',
    owner: 'Google Subsea Infra',
  },
  twoafrica: {
    id: 'twoafrica',
    name: 'Cabo 2Africa (Circunavegação África)',
    origin: { name: 'Suez / Mar Vermelho', country: 'EG', lng: 32.5, lat: 29.9 },
    destination: { name: 'Cidade do Cabo', country: 'ZA', lng: 18.4, lat: -33.9 },
    lengthKm: 45000,
    capacityTbps: 180,
    depthMeters: 5100,
    color: '#10B981',
    owner: 'Meta & Telecom Global',
  },
  pacific_faster: {
    id: 'pacific_faster',
    name: 'Cabo FASTER (Taiwan / Japão ➔ EUA)',
    origin: { name: 'Taipei', country: 'TW', lng: 121.5, lat: 25.0 },
    destination: { name: 'Oregon / Califórnia', country: 'US', lng: -124.0, lat: 42.0 },
    lengthKm: 11600,
    capacityTbps: 60,
    depthMeters: 6200,
    color: '#EC4899',
    owner: 'Google & KDDI',
  },
};

export const CinematicWorldMapScene: React.FC<CinematicWorldMapSceneProps> = ({
  cameraPreset = 'atlantic-cable',
  activeCable = SUBSEA_CABLES.ellalink,
  allCables = [SUBSEA_CABLES.ellalink, SUBSEA_CABLES.dunant],
  highlightCountry = 'Brazil',
  headline = 'A GUERRA INVISÍVEL DOS CABOS SUBMARINOS',
  subheadline = '99% de todo o tráfego da internet mundial cruza o fundo dos oceanos.',
  metricBadge = '100 TBPS // 4.500M DE PROFUNDIDADE',
  primaryColor = '#00F0FF',
  format = 'vertical',
  durationFrames = 150,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Progress 0.0 -> 1.0 throughout the scene
  const progress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Snappy enter spring
  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  // Calculate coordinates for active cable
  const [origX, origY] = projectGeo(activeCable.origin.lng, activeCable.origin.lat);
  const [destX, destY] = projectGeo(activeCable.destination.lng, activeCable.destination.lat);

  // Great-circle curve calculation for 2D equirectangular map:
  // Control point is arched upwards towards the pole to simulate spherical great circle arc
  const midX = (origX + destX) / 2;
  const midY = (origY + destY) / 2;
  const dist = Math.hypot(destX - origX, destY - origY);
  const curveOffset = Math.min(180, Math.max(70, dist * 0.28));
  const ctrlX = midX;
  const ctrlY = midY - curveOffset;

  const cablePathD = `M ${origX.toFixed(1)},${origY.toFixed(1)} Q ${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${destX.toFixed(1)},${destY.toFixed(1)}`;

  // Animated draw of active cable line
  const cableDrawProgress = interpolate(progress, [0.08, 0.65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });

  const pathLength = dist * 1.35;
  const strokeDashoffset = pathLength * (1 - cableDrawProgress);

  // Moving photon packet along the curve
  const t = cableDrawProgress;
  const packetX = (1 - t) * (1 - t) * origX + 2 * (1 - t) * t * ctrlX + t * t * destX;
  const packetY = (1 - t) * (1 - t) * origY + 2 * (1 - t) * t * ctrlY + t * t * destY;

  // Camera viewport setup [viewBox: x, y, width, height]
  // In vertical 9:16 format, the visible aspect ratio is 1080/1920 = 0.5625
  const isVertical = format === 'vertical';

  let startViewBox = { x: 500, y: 150, w: 1000, h: 700 };
  let targetViewBox = { x: 650, y: 220, w: 600, h: 450 };

  if (cameraPreset === 'atlantic-cable') {
    // Zoom into Atlantic corridor between South America and Western Europe
    startViewBox = { x: 520, y: 180, w: 850, h: 650 };
    targetViewBox = { x: 680, y: 240, w: 480, h: 360 };
  } else if (cameraPreset === 'pacific-chokepoint') {
    // Focus on East Asia / Taiwan / Pacific
    startViewBox = { x: 1200, y: 200, w: 800, h: 600 };
    targetViewBox = { x: 1400, y: 280, w: 450, h: 340 };
  } else if (cameraPreset === 'global-atlantic') {
    // Wide overview
    startViewBox = { x: 350, y: 100, w: 1200, h: 800 };
    targetViewBox = { x: 550, y: 180, w: 900, h: 600 };
  }

  // Camera interpolation with smooth ease-in-out
  const camProgress = interpolate(progress, [0, 1], [0, 1], {
    easing: Easing.bezier(0.2, 0.8, 0.2, 1),
  });

  const curCamX = interpolate(camProgress, [0, 1], [startViewBox.x, targetViewBox.x]);
  const curCamY = interpolate(camProgress, [0, 1], [startViewBox.y, targetViewBox.y]);
  const curCamW = interpolate(camProgress, [0, 1], [startViewBox.w, targetViewBox.w]);
  const curCamH = interpolate(camProgress, [0, 1], [startViewBox.h, targetViewBox.h]);

  // Sonar radar pulse timing (loops every 35 frames)
  const pulsePhase = (frame % 35) / 35;
  const pulseRadius = interpolate(pulsePhase, [0, 1], [6, 38]);
  const pulseOpacity = interpolate(pulsePhase, [0, 0.7, 1], [0.9, 0.4, 0]);

  // Live dynamic latitude/longitude telemetry counter
  const liveLng = interpolate(cableDrawProgress, [0, 1], [activeCable.origin.lng, activeCable.destination.lng]).toFixed(2);
  const liveLat = interpolate(cableDrawProgress, [0, 1], [activeCable.origin.lat, activeCable.destination.lat]).toFixed(2);
  const liveDepth = Math.round(interpolate(cableDrawProgress, [0, 0.5, 1], [50, activeCable.depthMeters, 40]));
  const liveTbps = (interpolate(cableDrawProgress, [0, 1], [0, activeCable.capacityTbps])).toFixed(1);

  // Laser scan line traversing map vertically
  const scanLineY = interpolate(frame % 90, [0, 90], [curCamY, curCamY + curCamH]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#040712',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Montserrat', -apple-system, sans-serif",
      }}
    >
      {/* ── CAMADA 1: FUNDO CARTOGRÁFICO COM OCEAN BATHYMETRY ── */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 45%, #0B1528 0%, #040712 100%)',
        }}
      />

      {/* ── CAMADA 2: MAPA VETORIAL MUNDIAL COM CÂMERA DINÂMICA (VIEWBOX ANIMADO) ── */}
      <svg
        viewBox={`${curCamX} ${curCamY} ${curCamW} ${curCamH}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 5,
        }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Brilho neon para rota de cabo */}
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Graticule pattern */}
          <pattern id="graticule" width="166.6" height="166.6" patternUnits="userSpaceOnUse">
            <path d="M 166.6 0 L 0 0 0 166.6" fill="none" stroke="rgba(56, 189, 248, 0.07)" strokeWidth="1" strokeDasharray="3 3" />
          </pattern>
        </defs>

        {/* Grade Geográfica Lat/Long */}
        <rect x="0" y="0" width="2000" height="1000" fill="url(#graticule)" />

        {/* Linha do Equador e Meridiano de Greenwich */}
        <line x1="0" y1="500" x2="2000" y2="500" stroke="rgba(56, 189, 248, 0.16)" strokeWidth="1" strokeDasharray="6 4" />
        <line x1="1000" y1="0" x2="1000" y2="1000" stroke="rgba(56, 189, 248, 0.16)" strokeWidth="1" strokeDasharray="6 4" />

        {/* Linha de Varredura Laser Tática */}
        <line
          x1={curCamX}
          y1={scanLineY}
          x2={curCamX + curCamW}
          y2={scanLineY}
          stroke={primaryColor}
          strokeWidth="1.2"
          opacity="0.35"
        />

        {/* Continentes Mundiais (Vetor Fiel de Alta Definição) */}
        <path
          d={WORLD_CONTINENTS_PATH}
          fill="#131F38"
          stroke="rgba(56, 189, 248, 0.4)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.85))',
          }}
        />

        {/* Destaque do País Estratégico (se houver, ex: Brasil) */}
        {highlightCountry && STRATEGIC_REGIONS[highlightCountry] && (
          <path
            d={STRATEGIC_REGIONS[highlightCountry]}
            fill="rgba(56, 189, 248, 0.22)"
            stroke={primaryColor}
            strokeWidth="2.2"
            style={{
              filter: `drop-shadow(0 0 16px ${primaryColor}88)`,
            }}
          />
        )}

        {/* Cabos Submarinos Secundários de Fundo */}
        {allCables
          .filter((c) => c.id !== activeCable.id)
          .map((c) => {
            const [x1, y1] = projectGeo(c.origin.lng, c.origin.lat);
            const [x2, y2] = projectGeo(c.destination.lng, c.destination.lat);
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2 - 80;
            return (
              <path
                key={c.id}
                d={`M ${x1},${y1} Q ${mx},${my} ${x2},${y2}`}
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
            );
          })}

        {/* ── CABO SUBMARINO PRINCIPAL ATIVO ── */}
        {/* Sombra de profundidade abissal */}
        <path
          d={cablePathD}
          fill="none"
          stroke="rgba(0, 0, 0, 0.7)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Linha guia pontilhada */}
        <path
          d={cablePathD}
          fill="none"
          stroke="rgba(56, 189, 248, 0.25)"
          strokeWidth="3"
          strokeDasharray="6 6"
        />

        {/* Linha de Fibra Óptica Iluminada Animada */}
        <path
          d={cablePathD}
          fill="none"
          stroke={activeCable.color || primaryColor}
          strokeWidth="4.5"
          strokeDasharray={pathLength}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter="url(#neon-glow)"
        />

        {/* Ponto / Estação de Origem (Landing Station A) */}
        <g transform={`translate(${origX}, ${origY})`}>
          {/* Pulso Sonar Radar */}
          <circle r={pulseRadius} fill="none" stroke={primaryColor} strokeWidth="2" opacity={pulseOpacity} />
          <circle r="9" fill={primaryColor} />
          <circle r="4" fill="#FFFFFF" />
          <text
            x="-16"
            y="-16"
            fill="#FFFFFF"
            fontSize="14"
            fontWeight="900"
            letterSpacing="1"
            style={{ textShadow: '0 2px 8px #000' }}
          >
            {activeCable.origin.name.toUpperCase()} [{activeCable.origin.country}]
          </text>
        </g>

        {/* Ponto / Estação de Destino (Landing Station B) */}
        <g transform={`translate(${destX}, ${destY})`}>
          {cableDrawProgress > 0.85 && (
            <circle r={pulseRadius} fill="none" stroke="#F43F5E" strokeWidth="2" opacity={pulseOpacity} />
          )}
          <circle r="9" fill="#F43F5E" />
          <circle r="4" fill="#FFFFFF" />
          <text
            x="16"
            y="-14"
            fill="#FFFFFF"
            fontSize="14"
            fontWeight="900"
            letterSpacing="1"
            style={{ textShadow: '0 2px 8px #000' }}
          >
            {activeCable.destination.name.toUpperCase()} [{activeCable.destination.country}]
          </text>
        </g>

        {/* Fóton de Dados em Trânsito (Moving Packet) */}
        {cableDrawProgress > 0.05 && cableDrawProgress < 0.98 && (
          <g transform={`translate(${packetX}, ${packetY})`}>
            <circle r="16" fill={activeCable.color || primaryColor} opacity="0.35" style={{ filter: 'blur(4px)' }} />
            <circle r="8" fill="#FFFFFF" stroke={activeCable.color || primaryColor} strokeWidth="3" />
          </g>
        )}
      </svg>

      {/* ── CAMADA 3: VINHETA CINEMATOGRÁFICA DE PROFUNDIDADE ── */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(2, 4, 10, 0.75) 80%, rgba(2, 4, 10, 0.98) 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* ── CAMADA 4: TACTICAL HUD (JOHNNY HARRIS / VOX STYLE) ── */}
      {/* Top Left: Military Geopolitical Telemetry */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '90px' : '50px',
          left: isVertical ? '48px' : '60px',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontFamily: "'Courier New', Courier, monospace",
          color: '#38BDF8',
          textShadow: '0 2px 10px rgba(0,0,0,0.9)',
          opacity: enterSpring,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 800, letterSpacing: '2px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 12px #10B981',
              display: 'inline-block',
            }}
          />
          SUBSEA FIBER INTEL // DEFCON 1
        </div>
        <div style={{ fontSize: isVertical ? '18px' : '15px', fontWeight: 700, color: '#E2E8F0' }}>
          CABO: <span style={{ color: primaryColor }}>{activeCable.name.toUpperCase()}</span>
        </div>
        <div style={{ fontSize: isVertical ? '16px' : '14px', color: 'rgba(255,255,255,0.75)' }}>
          COORD: {liveLat}°, {liveLng}° | PROF: <span style={{ color: '#F43F5E' }}>-{liveDepth}M</span> | TAXA: {liveTbps} TBPS
        </div>
      </div>

      {/* Top Right: Status Badge */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '90px' : '50px',
          right: isVertical ? '48px' : '60px',
          zIndex: 30,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          padding: '10px 20px',
          borderRadius: '12px',
          color: primaryColor,
          fontSize: isVertical ? '16px' : '14px',
          fontWeight: 800,
          letterSpacing: '2px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
          opacity: enterSpring,
        }}
      >
        ENLACE ATIVO [99.8%]
      </div>

      {/* Bottom Center / Lower Third: Strategic Narrative Card */}
      <div
        style={{
          position: 'absolute',
          bottom: isVertical ? '140px' : '60px',
          left: isVertical ? '40px' : '80px',
          right: isVertical ? '40px' : '80px',
          backgroundColor: 'rgba(7, 12, 26, 0.92)',
          backdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '24px',
          padding: isVertical ? '32px 36px' : '26px 36px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 240, 255, 0.15)',
          zIndex: 35,
          opacity: enterSpring,
          transform: `translateY(${(1 - enterSpring) * 30}px)`,
        }}
      >
        {/* Metric Pill Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: `${primaryColor}22`,
              border: `1px solid ${primaryColor}66`,
              padding: '6px 14px',
              borderRadius: '999px',
              color: primaryColor,
              fontSize: isVertical ? '16px' : '14px',
              fontWeight: 800,
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            ROTA TRANSATLÂNTICA
          </div>
          <div
            style={{
              color: '#F43F5E',
              fontSize: isVertical ? '18px' : '15px',
              fontWeight: 900,
              letterSpacing: '1px',
            }}
          >
            {metricBadge}
          </div>
        </div>

        {/* Headline */}
        <h2
          style={{
            margin: '0 0 10px 0',
            fontSize: isVertical ? '38px' : '30px',
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.15,
            letterSpacing: '-0.5px',
            textTransform: 'uppercase',
          }}
        >
          {headline}
        </h2>

        {/* Subheadline / Narrative fact */}
        <p
          style={{
            margin: 0,
            fontSize: isVertical ? '22px' : '18px',
            fontWeight: 500,
            color: 'rgba(226, 232, 240, 0.88)',
            lineHeight: 1.35,
          }}
        >
          {subheadline}
        </p>
      </div>
    </AbsoluteFill>
  );
};
