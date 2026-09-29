import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';
import { closedFormSpring } from '../../../lib/motion';

export const MapJourneyComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#38BDF8',
  accentColor = '#FFFFFF',
  format = 'vertical',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  let accumulatedTime = 0;
  let activeSceneIndex = 0;
  let sceneLocalTime = 0;

  for (let i = 0; i < scenes.length; i++) {
    const dur = scenes[i].durationSeconds || 5;
    if (time >= accumulatedTime && time < accumulatedTime + dur) {
      activeSceneIndex = i;
      sceneLocalTime = time - accumulatedTime;
      break;
    }
    accumulatedTime += dur;
  }

  const currentScene = scenes[activeSceneIndex] || scenes[0] || ({} as SceneSegment);
  const dur = currentScene.durationSeconds || 5;

  // Progresso do trajeto da rota (0.0 -> 1.0)
  const routeProgress = Math.min(1, Math.max(0, sceneLocalTime / (dur * 0.8)));

  // Coordenadas Bézier da jornada (Ponto A -> Ponto B)
  const startX = 240;
  const startY = 1200;
  const endX = 840;
  const endY = 600;
  const controlX = 400;
  const controlY = 750;

  // Ponto atual ao longo da curva quadrática
  const t = routeProgress;
  const currentX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
  const currentY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;

  const text = currentScene.captionText || '';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#080E1A',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* Background Cartográfico Noturno */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, #0F172A 0%, #020617 100%)',
        }}
      />

      {/* Grid de Coordenadas Geográficas */}
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: 0.15,
        }}
      >
        <defs>
          <pattern id="grid-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#38BDF8" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      {/* Trajeto Vetorial da Rota */}
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          zIndex: 5,
        }}
      >
        {/* Linha Guia Completa */}
        <path
          d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
          fill="none"
          stroke="rgba(56, 189, 248, 0.25)"
          strokeWidth="6"
          strokeDasharray="12 12"
        />

        {/* Linha Iluminada Animada */}
        <path
          d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
          fill="none"
          stroke={primaryColor}
          strokeWidth="6"
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - routeProgress)}
          style={{ filter: `drop-shadow(0 0 12px ${primaryColor})` }}
        />

        {/* Marcador do Ponto de Partida (A) */}
        <circle cx={startX} cy={startY} r="14" fill="#38BDF8" />
        <circle cx={startX} cy={startY} r="26" fill="none" stroke="#38BDF8" strokeWidth="2" opacity="0.6" />

        {/* Marcador do Destino (B) */}
        <circle cx={endX} cy={endY} r="14" fill="#F43F5E" />
        <circle cx={endX} cy={endY} r="26" fill="none" stroke="#F43F5E" strokeWidth="2" opacity="0.6" />
      </svg>

      {/* Ícone de Pulso no Ponto Atual */}
      <div
        style={{
          position: 'absolute',
          left: `${currentX}px`,
          top: `${currentY}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            boxShadow: `0 0 25px ${primaryColor}`,
          }}
        />
      </div>

      {/* Card com Legenda Inferior */}
      <div
        style={{
          position: 'absolute',
          bottom: '120px',
          left: '50px',
          right: '50px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '28px',
          padding: '36px',
          zIndex: 20,
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ color: primaryColor, fontSize: '20px', fontWeight: 800, letterSpacing: '3px', marginBottom: '12px' }}>
          ROTA ESTRATÉGICA
        </div>
        <p style={{ margin: 0, fontSize: '38px', fontWeight: 800, color: accentColor, lineHeight: 1.25 }}>
          {text}
        </p>
      </div>
    </AbsoluteFill>
  );
};
