import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';
import { track, swapAlpha, closedFormSpring } from '../../../lib/motion';

export const UIMotionMorphComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#3B82F6',
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

  // ── CICLO DE MORPHING CONTÍNUO (Twoclipping Pattern) ──
  // Estágio 0 (0.0s -> 0.8s): Botão Pill estreito (width: 260px, height: 72px)
  // Estágio 1 (0.8s -> 2.2s): Input de busca/comando expandido (width: 680px, height: 84px)
  // Estágio 2 (2.2s -> 3.6s): Card de Feature completo (width: 780px, height: 480px, radius: 32px)
  // Estágio 3 (3.6s -> dur): Badge de sucesso com checkmark
  const morphWidth = track(sceneLocalTime, [
    [0.0, 320],
    [0.6, 680],
    [2.0, 780],
  ]);

  const morphHeight = track(sceneLocalTime, [
    [0.0, 80],
    [0.6, 88],
    [2.0, 460],
  ]);

  const morphRadius = track(sceneLocalTime, [
    [0.0, 40],
    [0.6, 24],
    [2.0, 32],
  ]);

  // Alpha das camadas internas usando swapAlpha sem sobreposições estranhas
  const alphaStage1 = swapAlpha(sceneLocalTime, 0.0, 0.7);
  const alphaStage2 = swapAlpha(sceneLocalTime, 0.7, 2.1);
  const alphaStage3 = sceneLocalTime >= 2.0 ? closedFormSpring(sceneLocalTime - 2.0, 160, 24) : 0;

  const text = currentScene.captionText || '';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#030712',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Background com Gradiente Fluido */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 50% 30%, #1E1B4B 0%, #030712 70%)',
        }}
      />

      {/* Grid Tecnológico */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* CONTAINER CENTRAL ÚNICO (One Shape Never Cut) */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <div
          style={{
            width: `${morphWidth}px`,
            height: `${morphHeight}px`,
            borderRadius: `${morphRadius}px`,
            backgroundColor: 'rgba(17, 24, 39, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(255, 255, 255, 0.14)',
            boxShadow: `0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px ${primaryColor}22`,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'box-shadow 0.2s ease',
          }}
        >
          {/* ESTÁGIO 1: Pill Inicial com Ícone Pulsante */}
          {alphaStage1 > 0 && (
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                opacity: alphaStage1,
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 12px #10B981',
                }}
              />
              <span style={{ fontSize: '26px', fontWeight: 700, color: '#F9FAFB' }}>
                Inicializando...
              </span>
            </div>
          )}

          {/* ESTÁGIO 2: Campo de Comando / Processamento */}
          {alphaStage2 > 0 && (
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '90%',
                opacity: alphaStage2,
              }}
            >
              <span style={{ fontSize: '26px', fontWeight: 600, color: '#9CA3AF' }}>
                Processando modelo cognitivo...
              </span>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  border: '3px solid rgba(255,255,255,0.2)',
                  borderTopColor: primaryColor,
                  borderRadius: '50%',
                  transform: `rotate(${sceneLocalTime * 720}deg)`,
                }}
              />
            </div>
          )}

          {/* ESTÁGIO 3: Card Expandido com Imagem e Headline */}
          {alphaStage3 > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                opacity: alphaStage3,
              }}
            >
              {currentScene.imageUrl && (
                <div
                  style={{
                    width: '100%',
                    height: '220px',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    marginBottom: '24px',
                  }}
                >
                  <Img
                    src={currentScene.imageUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
              <h3
                style={{
                  fontSize: '34px',
                  fontWeight: 800,
                  color: accentColor,
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {text}
              </h3>
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
