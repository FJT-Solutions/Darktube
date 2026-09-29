import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';
import { closedFormSpring, track, createRng } from '../../../lib/motion';

export const DataStoryViralComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#EAB308',
  accentColor = '#FFFFFF',
  format = 'vertical',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  // Calcula qual cena está ativa com base no tempo cumulativo
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

  // Closed form spring para entrada suave
  const enterProgress = closedFormSpring(sceneLocalTime, 140, 22);

  // Extrair números ou percentuais da legenda (ex: "+140%", "10x", "500k", "85%")
  const text = currentScene.captionText || '';
  const matchPercent = text.match(/([+]?\d+[\.,]?\d*[%xXkKMmB]?)/);
  const highlightedMetric = matchPercent ? matchPercent[0] : '+85%';

  // Barra de progresso animada
  const barProgress = closedFormSpring(Math.max(0, sceneLocalTime - 0.4), 110, 20);

  // Confetes procedurais usando Mulberry32 determinístico
  const rng = createRng(42 + activeSceneIndex);
  const confettiPieces = Array.from({ length: 28 }).map((_, i) => ({
    x: rng() * 100,
    y: (rng() * 100 + sceneLocalTime * (30 + rng() * 40)) % 110 - 10,
    r: rng() * 360 + sceneLocalTime * 180,
    size: 8 + rng() * 14,
    color: ['#FACC15', '#38BDF8', '#4ADE80', '#F43F5E', '#A855F7'][Math.floor(rng() * 5)],
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: '#090D16', overflow: 'hidden', fontFamily: 'Montserrat, Inter, sans-serif' }}>
      {/* Background Cinematográfico com Imagem do Usuário */}
      {currentScene.imageUrl && (
        <AbsoluteFill style={{ filter: 'brightness(0.35) contrast(1.2)' }}>
          <Img
            src={currentScene.imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${1 + sceneLocalTime * 0.04})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Grid Mesh de Fundo Futurista */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 40%, rgba(234, 179, 8, 0.15) 0%, transparent 60%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 48px 48px, 48px 48px',
        }}
      />

      {/* Confetes animados no clímax */}
      {sceneLocalTime > 0.3 && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {confettiPieces.map((p, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size * 0.6}px`,
                backgroundColor: p.color,
                borderRadius: '2px',
                transform: `rotate(${p.r}deg)`,
                opacity: 0.85,
              }}
            />
          ))}
        </AbsoluteFill>
      )}

      {/* Container Central com Card Holográfico */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 40px',
        }}
      >
        {/* Badge Flutuante "+X%" */}
        <div
          style={{
            transform: `scale(${enterProgress}) translateY(${(1 - enterProgress) * 40}px)`,
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(0, 0, 0, 0.6))',
            border: '2px solid rgba(234, 179, 8, 0.8)',
            boxShadow: '0 0 40px rgba(234, 179, 8, 0.4), inset 0 0 20px rgba(234, 179, 8, 0.2)',
            borderRadius: '999px',
            padding: '12px 36px',
            fontSize: '36px',
            fontWeight: 900,
            color: '#FACC15',
            letterSpacing: '2px',
            marginBottom: '32px',
            textTransform: 'uppercase',
          }}
        >
          {highlightedMetric}
        </div>

        {/* Card de Métricas Glassmorphism */}
        <div
          style={{
            width: '90%',
            maxWidth: '860px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '32px',
            padding: '48px 40px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            transform: `scale(${0.92 + enterProgress * 0.08})`,
            opacity: enterProgress,
          }}
        >
          {/* Legenda Dinâmica */}
          <h2
            style={{
              fontSize: '44px',
              fontWeight: 800,
              lineHeight: 1.25,
              color: accentColor,
              textAlign: 'center',
              marginBottom: '36px',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            {text}
          </h2>

          {/* Barra de Progresso com Glow */}
          <div
            style={{
              width: '100%',
              height: '24px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
              position: 'relative',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, barProgress * 88)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #EAB308, #F59E0B, #10B981)',
                boxShadow: '0 0 25px #EAB308',
                borderRadius: '999px',
                transition: 'width 0.1s linear',
              }}
            />
          </div>

          {/* Três Métricas Comparativas */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '24px',
            }}
          >
            <div>
              <div style={{ color: '#94A3B8', fontSize: '20px', fontWeight: 600 }}>ANTERIOR</div>
              <div style={{ color: '#F1F5F9', fontSize: '32px', fontWeight: 800 }}>1.2x</div>
            </div>
            <div>
              <div style={{ color: '#94A3B8', fontSize: '20px', fontWeight: 600 }}>ATUAL</div>
              <div style={{ color: '#10B981', fontSize: '32px', fontWeight: 800 }}>
                {(1.2 + barProgress * 3.8).toFixed(1)}x
              </div>
            </div>
            <div>
              <div style={{ color: '#94A3B8', fontSize: '20px', fontWeight: 600 }}>CRESCIMENTO</div>
              <div style={{ color: '#FACC15', fontSize: '32px', fontWeight: 800 }}>
                +{Math.round(barProgress * 316)}%
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
