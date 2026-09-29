import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';
import { loopT } from '../../../lib/motion';

export const InfiniteZoomComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#818CF8',
  accentColor = '#FFFFFF',
  format = 'vertical',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  // Duração de um ciclo completo do portal em segundos
  const LOOP_DURATION = 3.0;
  const loopTime = loopT(time, LOOP_DURATION);
  const loopProgress = loopTime / LOOP_DURATION; // 0.0 -> 1.0 sem costura

  // Multiplicador de escala exponencial (2^progress)
  // Cada camada tem um offset fixo no espaço logarítmico
  const layers = [0, 1, 2, 3].map((layerIndex) => {
    // Escala varia de 0.125 a 8.0 ciclicamente
    const layerProgress = (loopProgress + layerIndex * 0.25) % 1.0;
    const scale = Math.pow(4, layerProgress * 2 - 1);
    const opacity = Math.sin(Math.PI * layerProgress);
    return { layerIndex, scale, opacity };
  });

  const activeScene = scenes[Math.floor(time / 5) % Math.max(1, scenes.length)] || scenes[0] || ({} as SceneSegment);
  const text = activeScene.captionText || '';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#020307',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* Centro do Portal Hypnótico */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {layers.map(({ layerIndex, scale, opacity }) => (
          <div
            key={layerIndex}
            style={{
              position: 'absolute',
              width: '720px',
              height: '720px',
              borderRadius: '50%',
              border: `2px solid ${primaryColor}`,
              boxShadow: `0 0 50px ${primaryColor}44, inset 0 0 30px ${primaryColor}22`,
              transform: `scale(${scale}) rotate(${time * 15 + layerIndex * 45}deg)`,
              opacity: Math.max(0, Math.min(1, opacity)),
              pointerEvents: 'none',
            }}
          >
            {activeScene.imageUrl && (
              <div
                style={{
                  position: 'absolute',
                  inset: '20px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  opacity: 0.35,
                }}
              >
                <Img
                  src={activeScene.imageUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}
          </div>
        ))}

        {/* Glow Central Infinito */}
        <div
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            backgroundColor: primaryColor,
            filter: 'blur(45px)',
            opacity: 0.6,
          }}
        />
      </AbsoluteFill>

      {/* Legenda de Alto Impacto Flutuante */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '120px 40px',
        }}
      >
        <div
          style={{
            background: 'rgba(5, 7, 15, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '32px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '900px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
          }}
        >
          <p
            style={{
              fontSize: '44px',
              fontWeight: 900,
              color: accentColor,
              margin: 0,
              lineHeight: 1.25,
              textShadow: '0 2px 10px rgba(0,0,0,0.7)',
            }}
          >
            {text}
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
