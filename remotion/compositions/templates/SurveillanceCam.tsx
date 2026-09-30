import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Img,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';
import { CaptionLayer } from '../CaptionLayer';

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

export interface SurveillanceCamProps {
  headline?: string;
  subheadline?: string;
  cameraId?: string;
  location?: string;
  coordinates?: string;
  timestamp?: string;
  alertLevel?: 'NORMAL' | 'WARNING' | 'CRITICAL';
  nightVision?: boolean;
  primaryColor?: string;
  format?: 'vertical' | 'horizontal';
  imageUrl?: string;
  scene?: SceneSegment;
  sceneIndex?: number;
  scenes?: Array<SceneSegment & {
    cameraId?: string;
    location?: string;
    coordinates?: string;
    alertLevel?: 'NORMAL' | 'WARNING' | 'CRITICAL';
    nightVision?: boolean;
    subheadline?: string;
  }>;
}

// ─── Timecode Display ───────────────────────────────────────────────────────
const Timecode: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const totalSeconds = frame / fps;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = frame % fps;
  const pad = (n: number, d = 2) => String(n).padStart(d, '0');

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}:{pad(frames)}
    </span>
  );
};

// ─── Scan Lines ─────────────────────────────────────────────────────────────
const ScanLines: React.FC<{ opacity: number }> = ({ opacity }) => (
  <AbsoluteFill
    style={{
      backgroundImage:
        'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
      opacity,
      pointerEvents: 'none',
      zIndex: 50,
    }}
  />
);

// ─── Static Burst ───────────────────────────────────────────────────────────
const StaticBurst: React.FC<{ frame: number; seed: number }> = ({ frame, seed }) => {
  const rng = createRng(seed + frame);
  // Trigger burst every ~80 frames for ~4 frames
  const burstCycle = frame % 83;
  if (burstCycle > 4) return null;

  const lines = Array.from({ length: 30 }, (_, i) => ({
    y: rng() * 100,
    width: 20 + rng() * 80,
    x: rng() * 100,
    height: 1 + rng() * 3,
    opacity: 0.3 + rng() * 0.5,
  }));

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 55 }}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${l.x}%`,
            top: `${l.y}%`,
            width: `${l.width}%`,
            height: `${l.height}px`,
            backgroundColor: 'rgba(255,255,255,0.6)',
            opacity: l.opacity,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ─── Target Lock Animation ──────────────────────────────────────────────────
const TargetLock: React.FC<{
  frame: number;
  fps: number;
  x: string;
  y: string;
  size: number;
  color: string;
}> = ({ frame, fps, x, y, size, color }) => {
  const lockFrame = Math.max(0, frame - 25);
  const lockSpring = spring({
    frame: lockFrame,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const lockSize = size + (1 - lockSpring) * 80;
  const cornerLen = lockSize * 0.25;
  const pulse = Math.sin(frame * 0.15) * 0.15;

  if (lockFrame <= 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: `${lockSize}px`,
        height: `${lockSize}px`,
        transform: 'translate(-50%, -50%)',
        opacity: lockSpring * (0.85 + pulse),
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      {/* Corner brackets */}
      {[
        { top: 0, left: 0, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
        { top: 0, right: 0, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
        { bottom: 0, left: 0, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
        { bottom: 0, right: 0, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` },
      ].map((style, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${cornerLen}px`,
            height: `${cornerLen}px`,
            ...style,
          } as React.CSSProperties}
        />
      ))}
      {/* Center crosshair */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}>
        <div style={{ width: '12px', height: '1px', backgroundColor: color, opacity: 0.6 }} />
        <div style={{ width: '1px', height: '12px', backgroundColor: color, opacity: 0.6, marginTop: '-6px', marginLeft: '5.5px' }} />
      </div>
    </div>
  );
};

// ─── HUD Data Readout ───────────────────────────────────────────────────────
const HUDReadout: React.FC<{
  label: string;
  value: string;
  color: string;
  opacity: number;
  frame: number;
}> = ({ label, value, color, opacity, frame }) => {
  // Typewriter for value
  const chars = Math.min(value.length, Math.floor(frame * 0.8));
  const visible = value.substring(0, chars);

  return (
    <div style={{ opacity, marginBottom: '4px' }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '2px' }}>
        {label}
      </span>
      <div style={{ color, fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {visible}
        {chars < value.length && frame % 10 < 6 && (
          <span style={{ color }}>_</span>
        )}
      </div>
    </div>
  );
};

/**
 * SurveillanceCam — Motor de Câmera de Vigilância / CCTV
 *
 * Para: True crime, mistério, conspirações, vigilância.
 * Inclui: HUD militar com GPS, timecode running, PTZ movement,
 * scan-lines com interferência, crosshair/mira, night-vision,
 * REC piscante, static bursts, target lock, video corruption.
 */
export const SurveillanceCamSceneSingle: React.FC<SurveillanceCamProps> = ({
  headline: initialHeadline = 'SUBJECT IDENTIFIED',
  subheadline: initialSubheadline = 'Movimento detectado no perímetro norte',
  cameraId = 'CAM-07-BRAVO',
  location = 'SETOR 7G // PERÍMETRO NORTE',
  coordinates = '23°32\'S 46°38\'W',
  timestamp = '2026-09-29',
  alertLevel = 'WARNING',
  nightVision = false,
  primaryColor = '#00FF41',
  format = 'vertical',
  imageUrl,
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = format === 'vertical';

  const headline = scene?.headline || (scene as any)?.title || initialHeadline;
  const subheadline = (scene as any)?.subheadline || (scene ? '' : initialSubheadline);
  const rawImage = scene?.imageUrl || (scene as any)?.mediaUrl || imageUrl;

  // Alert colors
  const alertColors = {
    NORMAL: '#00FF41',
    WARNING: '#FFB800',
    CRITICAL: '#FF0040',
  };
  const alertColor = alertColors[alertLevel] || primaryColor;
  const nvColor = nightVision ? '#00FF41' : alertColor;

  // ── PTZ Camera Movement ──
  const ptzX = Math.sin(frame * 0.012) * 15;
  const ptzY = Math.cos(frame * 0.008) * 8;
  const ptzZoom = 1 + Math.sin(frame * 0.005) * 0.03;

  // ── REC blink ──
  const recBlink = frame % 40 < 28;

  // ── Boot sequence ──
  const bootProgress = spring({
    frame,
    fps,
    config: { damping: 30, stiffness: 60 },
  });

  // ── HUD entrance cascade ──
  const hudEntries = [0, 5, 10, 15, 20].map((delay) =>
    spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 20, stiffness: 100 } })
  );

  // ── Alert pulse ──
  const alertPulse = alertLevel === 'CRITICAL'
    ? 0.6 + Math.sin(frame * 0.4) * 0.4
    : alertLevel === 'WARNING'
      ? 0.8 + Math.sin(frame * 0.2) * 0.2
      : 1;

  // ── Headline entrance ──
  const headlineEnter = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  // ── Signal strength ──
  const signalStrength = 3 + Math.floor(Math.sin(frame * 0.05) * 1.5);

  // ── Interference flicker ──
  const rng = createRng(frame * 7);
  const interferenceOpacity = rng() > 0.97 ? 0.15 + rng() * 0.3 : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: nightVision ? '#001a00' : '#0A0A0A',
        overflow: 'hidden',
        fontFamily: "'Courier New', 'Consolas', monospace",
        // Night vision tint
        filter: nightVision ? 'sepia(0.3) hue-rotate(70deg) saturate(1.5)' : 'none',
      }}
    >
      {/* ── Background Surveillance Footage / Still ── */}
      {rawImage && (
        <AbsoluteFill style={{ overflow: 'hidden', zIndex: 1 }}>
          <Img
            src={rawImage}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: nightVision
                ? 'grayscale(100%) brightness(1.1) contrast(1.3)'
                : 'grayscale(60%) contrast(1.2) brightness(0.75)',
              opacity: 0.65,
              transform: `scale(${ptzZoom * 1.05}) translate(${ptzX * 0.5}px, ${ptzY * 0.5}px)`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* ── PTZ Camera Layer ── */}
      <AbsoluteFill
        style={{
          transform: `translate(${ptzX}px, ${ptzY}px) scale(${ptzZoom})`,
          opacity: bootProgress,
          zIndex: 4,
        }}
      >
        {/* Dark vignette */}
        <AbsoluteFill
          style={{
            background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.7) 100%)',
            zIndex: 5,
          }}
        />

        {/* Content area - headline centered in top third */}
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: isVertical ? '140px' : '60px',
            paddingLeft: '30px',
            paddingRight: '30px',
            zIndex: 8,
          }}
        >
          <div
            style={{
              transform: `translateY(${(1 - headlineEnter) * 30}px)`,
              opacity: headlineEnter,
              textAlign: 'center',
            }}
          >
            {/* Alert badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                border: `1.5px solid ${alertColor}`,
                borderRadius: '4px',
                marginBottom: '16px',
                opacity: alertPulse,
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: alertColor,
                  boxShadow: `0 0 8px ${alertColor}`,
                }}
              />
              <span style={{ color: alertColor, fontSize: '13px', fontWeight: 800, letterSpacing: '3px' }}>
                {alertLevel}
              </span>
            </div>

            <h2
              style={{
                fontSize: isVertical ? '34px' : '28px',
                fontWeight: 900,
                color: '#FFFFFF',
                margin: '0 0 10px 0',
                letterSpacing: '2px',
                textShadow: `0 0 20px ${alertColor}66, 0 2px 4px rgba(0,0,0,0.9)`,
                textTransform: 'uppercase',
              }}
            >
              {headline}
            </h2>

            {subheadline ? (
              <p
                style={{
                  fontSize: isVertical ? '18px' : '16px',
                  color: 'rgba(255,255,255,0.75)',
                  margin: 0,
                  maxWidth: '600px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                }}
              >
                {subheadline}
              </p>
            ) : null}
          </div>
        </AbsoluteFill>

        {/* Target Lock */}
        <TargetLock
          frame={frame}
          fps={fps}
          x="50%"
          y="48%"
          size={isVertical ? 200 : 180}
          color={alertColor}
        />
      </AbsoluteFill>

      {/* ── SCAN LINES ── */}
      <ScanLines opacity={0.35} />

      {/* ── STATIC BURSTS ── */}
      <StaticBurst frame={frame} seed={4242} />

      {/* ── Interference flash ── */}
      <AbsoluteFill
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          opacity: interferenceOpacity,
          pointerEvents: 'none',
          zIndex: 52,
        }}
      />

      {/* ── TOP HUD BAR ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '50px' : '20px',
          left: '24px',
          right: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 60,
          opacity: bootProgress,
        }}
      >
        {/* Left: Camera ID + Location */}
        <div style={{ opacity: hudEntries[0] }}>
          <div style={{ color: nvColor, fontSize: '14px', fontWeight: 800, letterSpacing: '2px' }}>
            {cameraId}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', marginTop: '4px', letterSpacing: '1px' }}>
            {location}
          </div>
        </div>

        {/* Right: REC indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: hudEntries[1] }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#FF0040',
              boxShadow: recBlink ? '0 0 12px #FF0040' : 'none',
              opacity: recBlink ? 1 : 0.3,
            }}
          />
          <span style={{ color: '#FF0040', fontSize: '14px', fontWeight: 800, letterSpacing: '3px' }}>
            REC
          </span>
        </div>
      </div>

      {/* ── BOTTOM HUD BAR ── */}
      <div
        style={{
          position: 'absolute',
          bottom: isVertical ? '50px' : '25px',
          left: '24px',
          right: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          zIndex: 60,
          opacity: bootProgress,
        }}
      >
        {/* Left: Data readouts */}
        <div style={{ opacity: hudEntries[2] }}>
          <HUDReadout label="DATE //" value={timestamp} color="rgba(255,255,255,0.7)" opacity={1} frame={frame} />
          <HUDReadout label="COORD //" value={coordinates} color={nvColor} opacity={1} frame={Math.max(0, frame - 10)} />
        </div>

        {/* Center: Timecode */}
        <div
          style={{
            color: nvColor,
            fontSize: '16px',
            fontWeight: 800,
            letterSpacing: '2px',
            opacity: hudEntries[3],
            textAlign: 'center',
          }}
        >
          <Timecode frame={frame} fps={fps} />
        </div>

        {/* Right: Signal + FPS */}
        <div style={{ textAlign: 'right', opacity: hudEntries[4] }}>
          {/* Signal bars */}
          <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', justifyContent: 'flex-end', marginBottom: '4px' }}>
            {[1, 2, 3, 4, 5].map((bar) => (
              <div
                key={bar}
                style={{
                  width: '3px',
                  height: `${bar * 4}px`,
                  backgroundColor: bar <= signalStrength ? nvColor : 'rgba(255,255,255,0.15)',
                  borderRadius: '1px',
                }}
              />
            ))}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '1px' }}>
            {fps}FPS // H.265
          </div>
        </div>
      </div>

      {/* ── CROSSHAIR CENTER ── */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 15,
          opacity: bootProgress * 0.4,
          pointerEvents: 'none',
        }}
      >
        {/* Horizontal line */}
        <div style={{ width: '40px', height: '1px', backgroundColor: nvColor, position: 'absolute', left: '-20px', top: '0' }} />
        {/* Vertical line */}
        <div style={{ width: '1px', height: '40px', backgroundColor: nvColor, position: 'absolute', left: '0', top: '-20px' }} />
        {/* Center dot */}
        <div
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: nvColor,
            position: 'absolute',
            left: '-2px',
            top: '-2px',
            boxShadow: `0 0 6px ${nvColor}`,
          }}
        />
      </div>

      {/* ── WORD-LEVEL SYNCHRONIZED KARAOKE CAPTIONS ── */}
      {scene && (
        <CaptionLayer
          scene={scene}
          captionStyle="pop"
          primaryColor={alertColor}
          accentColor="#FFFFFF"
          format={format}
        />
      )}

      {/* ── BORDER FRAME ── */}
      <div
        style={{
          position: 'absolute',
          inset: isVertical ? '40px 16px' : '12px 16px',
          border: `1px solid ${nvColor}22`,
          borderRadius: '4px',
          pointerEvents: 'none',
          zIndex: 55,
          opacity: bootProgress,
        }}
      />

      {/* ── CORNER DECORATIONS ── */}
      {[
        { top: isVertical ? '40px' : '12px', left: '16px' },
        { top: isVertical ? '40px' : '12px', right: '16px' },
        { bottom: isVertical ? '40px' : '12px', left: '16px' },
        { bottom: isVertical ? '40px' : '12px', right: '16px' },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            ...pos,
            width: '20px',
            height: '20px',
            borderTop: i < 2 ? `2px solid ${nvColor}44` : 'none',
            borderBottom: i >= 2 ? `2px solid ${nvColor}44` : 'none',
            borderLeft: i % 2 === 0 ? `2px solid ${nvColor}44` : 'none',
            borderRight: i % 2 === 1 ? `2px solid ${nvColor}44` : 'none',
            zIndex: 56,
            pointerEvents: 'none',
            opacity: bootProgress,
          } as React.CSSProperties}
        />
      ))}
    </AbsoluteFill>
  );
};

// ─── Main Multi-Scene SurveillanceCam Composition ───────────────────────────
export const SurveillanceCamScene: React.FC<SurveillanceCamProps & RemotionShortProps> = (props) => {
  const { fps } = useVideoConfig();
  const scenes = props.scenes;

  if (!scenes || scenes.length === 0) {
    return <SurveillanceCamSceneSingle {...props} />;
  }

  let accumulatedFrames = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0A0A' }}>
      {scenes.map((scene, idx) => {
        const durSeconds = scene.durationSeconds || 5;
        const durFrames = Math.max(30, Math.round(durSeconds * fps));
        const fromFrame = accumulatedFrames;
        accumulatedFrames += durFrames;

        const camNum = String(idx + 1).padStart(2, '0');
        const sectors = [
          'SETOR 01 // PERÍMETRO EXTERNO',
          'SETOR 02 // SALA DE SERVIDORES',
          'SETOR 03 // DOCAS DE CARGA',
          'SETOR 04 // SUBTERRÂNEO NÍVEL 4',
          'SETOR 05 // TERMINAL DE CONTROLE',
          'SETOR 06 // CABINE PRINCIPAL'
        ];
        const alertSequence: Array<'NORMAL' | 'WARNING' | 'CRITICAL'> = [
          'WARNING', 'CRITICAL', 'WARNING', 'CRITICAL', 'NORMAL', 'CRITICAL'
        ];

        const sceneAlert = (scene as any).alertLevel || alertSequence[idx % alertSequence.length];
        const sceneNightVision = (scene as any).nightVision ?? (idx % 2 === 1);
        const sceneCamId = (scene as any).cameraId || `CAM-${camNum}-SEC`;
        const sceneLocation = (scene as any).location || sectors[idx % sectors.length];
        const sceneCoords = (scene as any).coordinates || `23°${31 + idx}'S 46°${37 + idx}'W`;

        return (
          <Sequence
            key={`surveillance_seq_${idx}_${scene.captionText?.slice(0, 10) || ''}`}
            from={fromFrame}
            durationInFrames={durFrames}
          >
            <SurveillanceCamSceneSingle
              {...props}
              scene={scene}
              sceneIndex={idx}
              headline={scene.headline || (scene as any).title || props.headline || `INCIDENTE DETECTADO #${idx + 1}`}
              subheadline={(scene as any).subheadline || ''}
              cameraId={sceneCamId}
              location={sceneLocation}
              coordinates={sceneCoords}
              alertLevel={sceneAlert}
              nightVision={sceneNightVision}
              imageUrl={scene.imageUrl || (scene as any).mediaUrl || props.imageUrl}
              primaryColor={props.primaryColor || '#00FF41'}
              format={props.format || 'vertical'}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const SurveillanceCam = SurveillanceCamScene;
