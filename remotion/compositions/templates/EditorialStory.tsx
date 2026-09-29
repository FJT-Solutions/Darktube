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

export const EditorialStoryComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#00F0FF',
  accentColor = '#FFFFFF',
  format = 'vertical',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  // Encontrar cena ativa
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

  // Física suave para animações editoriais
  const enterSpring = closedFormSpring(sceneLocalTime, 90, 18);
  const barWidth = closedFormSpring(Math.max(0, sceneLocalTime - 0.2), 120, 22);

  // Movimento de câmera cinematográfico (Ken Burns contínuo e elegante)
  const scale = 1.04 + (sceneLocalTime / dur) * 0.08;
  const panY = (sceneLocalTime / dur) * -25;

  const text = currentScene.captionText || '';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#05070B',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, 'Cinzel', serif",
      }}
    >
      {/* Imagem de Fundo Cinematográfica com Parallax Suave */}
      {currentScene.imageUrl ? (
        <AbsoluteFill style={{ filter: 'contrast(1.25) saturate(1.15) brightness(0.65)' }}>
          <Img
            src={currentScene.imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale}) translateY(${panY}px)`,
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, #151F30 0%, #05070B 80%)',
          }}
        />
      )}

      {/* Vinheta Escura de Filme 35mm */}
      <AbsoluteFill
        style={{
          boxShadow: 'inset 0 0 160px rgba(0, 0, 0, 0.85)',
          background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Linhas Horizontais de Cinema (Aspect Ratio Widescreen Mask se desejado) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: '#000000',
          zIndex: 10,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: '#000000',
          zIndex: 10,
        }}
      />

      {/* Conteúdo Editorial */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '100px 50px',
          zIndex: 5,
        }}
      >
        {/* Tag de Capítulo / Tópico */}
        <div
          style={{
            transform: `translateY(${(1 - enterSpring) * 20}px)`,
            opacity: enterSpring,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: primaryColor,
              boxShadow: `0 0 12px ${primaryColor}`,
            }}
          />
          <span
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '4px',
              color: primaryColor,
              textTransform: 'uppercase',
            }}
          >
            PARTE {activeSceneIndex + 1}
          </span>
        </div>

        {/* Linha Divisória Neon Animada */}
        <div
          style={{
            width: `${barWidth * 160}px`,
            height: '4px',
            backgroundColor: primaryColor,
            boxShadow: `0 0 18px ${primaryColor}`,
            marginBottom: '28px',
            borderRadius: '2px',
          }}
        />

        {/* Tipografia de Alto Impacto Editorial */}
        <h1
          style={{
            fontSize: '52px',
            fontWeight: 900,
            lineHeight: 1.2,
            color: accentColor,
            margin: 0,
            textShadow: '0 4px 20px rgba(0,0,0,0.85)',
            transform: `translateY(${(1 - enterSpring) * 35}px)`,
            opacity: enterSpring,
          }}
        >
          {text}
        </h1>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
