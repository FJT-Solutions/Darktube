import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img } from 'remotion';

interface IllustrativeSceneProps {
  subjectImageUrl?: string; // Recorte PNG transparente
  bgImageUrl?: string;      // Imagem opcional de fundo ou card
  headlineText?: string;
  badgeText?: string;
  badgeColor?: string;
  primaryColor?: string;
  exitDirection?: 'left' | 'right' | 'up' | 'down';
}

export const IllustrativeScene: React.FC<IllustrativeSceneProps> = ({
  subjectImageUrl,
  bgImageUrl,
  headlineText,
  badgeText,
  badgeColor = '#EF4444',
  primaryColor = '#EAB308',
  exitDirection = 'right',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 1. Entrada Elástica do Personagem / Sujeito
  const subjectEnter = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.9 },
  });

  const subjectScale = interpolate(subjectEnter, [0, 1], [0.85, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subjectY = interpolate(subjectEnter, [0, 1], [140, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subjectBlur = interpolate(subjectEnter, [0, 1], [10, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Micro-animação de Respiração / Float sutil
  const breathingFloat = Math.sin(frame * 0.035) * 6;
  const breathingScale = 1 + Math.sin(frame * 0.025) * 0.012;

  // 2. Entrada do Badge Cinético (Delay de 8 frames para stagger)
  const badgeEnter = spring({
    frame: frame - 8,
    fps,
    config: { damping: 10, stiffness: 130 }, // Bouncy Pixar/CapCut
  });

  const badgeScale = interpolate(badgeEnter, [0, 0.7, 1], [0, 1.25, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const badgeFloat = Math.cos(frame * 0.04) * 6;

  // 3. Entrada do Card / Headline de Apoio (Delay de 3 frames)
  const headlineEnter = spring({
    frame: frame - 3,
    fps,
    config: { damping: 14, mass: 0.8 },
  });
  const headlineY = interpolate(headlineEnter, [0, 1], [-40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 4. Quadruple Exit
  const exitStartFrame = Math.max(0, durationInFrames - 12);
  const isExiting = frame >= exitStartFrame;
  const exitProgress = isExiting
    ? interpolate(frame, [exitStartFrame, durationInFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  const exitBlur = exitProgress * 20;
  const exitOpacity = 1 - exitProgress;
  const exitScale = 1 - exitProgress * 0.08;

  let exitX = 0;
  let exitY = 0;
  if (exitDirection === 'left') exitX = -exitProgress * 1200;
  else if (exitDirection === 'right') exitX = exitProgress * 1200;
  else if (exitDirection === 'up') exitY = -exitProgress * 900;
  else if (exitDirection === 'down') exitY = exitProgress * 900;

  const activeImage = subjectImageUrl || bgImageUrl;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '160px 40px 0px 40px',
        zIndex: 5,
        transform: `translate(${exitX}px, ${exitY}px) scale(${exitScale})`,
        filter: `blur(${exitBlur}px)`,
        opacity: exitOpacity,
        overflow: 'hidden',
      }}
    >
      {/* Top Headline / Card de Apoio com Safe Area */}
      {headlineText && (
        <div
          style={{
            transform: `translateY(${headlineY}px)`,
            opacity: headlineEnter > 0.05 ? 1 : 0,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            border: '3px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '24px',
            padding: '18px 40px',
            boxShadow: '0 10px 0 rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(16px)',
            maxWidth: '900px',
            textAlign: 'center',
            zIndex: 30,
          }}
        >
          <span
            style={{
              fontFamily: "'Nunito', 'Montserrat', sans-serif",
              fontSize: '46px',
              fontWeight: 900,
              color: '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: '-1px',
            }}
          >
            {headlineText}
          </span>
        </div>
      )}

      {/* Centro/Base: Personagem 2.5D Recortado com Fade Suave na Base */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingBottom: '0px',
        }}
      >
        {/* Sombra de Contato e Glow de Fundo */}
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '600px',
            height: '180px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            filter: 'blur(30px)',
            zIndex: 1,
          }}
        />

        {/* Personagem com Máscara de Gradiente Inferior para evitar corte seco */}
        {activeImage ? (
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              transform: `translateY(${subjectY + breathingFloat}px) scale(${subjectScale * breathingScale})`,
              filter: `blur(${subjectBlur}px) drop-shadow(0 20px 40px rgba(0,0,0,0.6))`,
              maxWidth: '950px',
              maxHeight: '1200px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              // MÁSCARA INTELIGENTE: Suaviza a base do personagem eliminando a linha reta de corte
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 72%, rgba(0,0,0,0.85) 84%, rgba(0,0,0,0.2) 96%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 0%, black 72%, rgba(0,0,0,0.85) 84%, rgba(0,0,0,0.2) 96%, transparent 100%)',
            }}
          >
            <Img
              src={activeImage}
              style={{
                maxWidth: '100%',
                maxHeight: '1150px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '400px',
              height: '500px',
              backgroundColor: `${primaryColor}20`,
              border: `4px dashed ${primaryColor}`,
              borderRadius: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '100px',
            }}
          >
            <span style={{ fontSize: '80px' }}>⚡</span>
          </div>
        )}

        {/* Badge Cinético Bouncing Flutuante */}
        {badgeText && (
          <div
            style={{
              position: 'absolute',
              top: '28%',
              right: '6%',
              zIndex: 25,
              transform: `scale(${badgeScale}) translateY(${badgeFloat}px) rotate(-6deg)`,
              backgroundColor: badgeColor,
              border: '4px solid #FFFFFF',
              borderRadius: '999px',
              padding: '14px 30px',
              boxShadow: '0 10px 0 rgba(0, 0, 0, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span
              style={{
                fontFamily: "'Nunito', 'Fredoka', 'Montserrat', sans-serif",
                fontSize: '38px',
                fontWeight: 900,
                color: '#FFFFFF',
                textTransform: 'uppercase',
                letterSpacing: '-1px',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {badgeText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
