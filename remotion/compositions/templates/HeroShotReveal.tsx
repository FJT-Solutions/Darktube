import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';
import { closedFormSpring } from '../../../lib/motion';

export const HeroShotRevealComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#8B5CF6',
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

  // Física do Hero Shot (Snap elástico inicial seguido de desaceleração infinita)
  const springP = closedFormSpring(sceneLocalTime, 130, 24);

  // Rotações 2.5D de Câmera (Hero Shot Reveal)
  const rotX = (1 - springP) * 12; // De 12° para 0°
  const rotY = (1 - springP) * -8 + (sceneLocalTime / dur) * 3; // Leve varredura Y
  const scale = 0.88 + springP * 0.14 + (sceneLocalTime / dur) * 0.03;
  const translateY = (1 - springP) * 60;

  // Varredura de Spotlight luminoso
  const sweepX = (sceneLocalTime / dur) * 160 - 30; // De -30% para 130%

  const text = currentScene.captionText || '';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#04060A',
        overflow: 'hidden',
        perspective: '1200px',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* Background Dinâmico com Aura de Glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 45%, ${primaryColor}26 0%, transparent 65%)`,
        }}
      />

      {/* Grid Tecnológico Sutil */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.7,
        }}
      />

      {/* HERO CONTAINER COM CÂMERA 2.5D */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale}) translateY(${translateY}px)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Card Hero com a Imagem Central */}
        <div
          style={{
            width: '84%',
            maxWidth: '820px',
            height: '58%',
            maxHeight: '1100px',
            borderRadius: '36px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: `0 35px 80px -15px rgba(0, 0, 0, 0.85), 0 0 50px ${primaryColor}33`,
            border: '2px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          {currentScene.imageUrl ? (
            <Img
              src={currentScene.imageUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${1.05 + (sceneLocalTime / dur) * 0.05})`,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #1E1B4B, #0F172A)',
              }}
            />
          )}

          {/* Varredura de Spotlight Holográfico */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${sweepX}%`,
              width: '120px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
              transform: 'skewX(-20deg)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Headline de Destaque com Recoil Elástico */}
        <div
          style={{
            marginTop: '44px',
            padding: '0 40px',
            textAlign: 'center',
            maxWidth: '900px',
            transform: `translateZ(50px)`, // Projeta para fora no espaço 3D
          }}
        >
          <p
            style={{
              fontSize: '44px',
              fontWeight: 800,
              lineHeight: 1.25,
              color: accentColor,
              margin: 0,
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.9)',
            }}
          >
            {text}
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
