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
    config: { damping: 13, mass: 0.9 },
  });

  const subjectScale = interpolate(subjectEnter, [0, 1], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subjectY = interpolate(subjectEnter, [0, 1], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subjectBlur = interpolate(subjectEnter, [0, 1], [12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Micro-animação de Respiração / Float contínuo
  const breathingFloat = Math.sin(frame * 0.035) * 8;
  const breathingScale = 1 + Math.sin(frame * 0.025) * 0.015;

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

  // 3. Entrada do Card / Headline de Apoio (Delay de 4 frames)
  const headlineEnter = spring({
    frame: frame - 4,
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
        padding: '120px 40px 100px 40px',
        zIndex: 5,
        transform: `translate(${exitX}px, ${exitY}px) scale(${exitScale})`,
        filter: `blur(${exitBlur}px)`,
        opacity: exitOpacity,
      }}
    >
      {/* Top Headline / Card de Apoio */}
      {headlineText && (
        <div
          style={{
            transform: `translateY(${headlineY}px)`,
            opacity: headlineEnter > 0.05 ? 1 : 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '3px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '24px',
            padding: '16px 36px',
            // Sombra Cartoon Sólida
            boxShadow: '0 8px 0 rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(12px)',
            maxWidth: '850px',
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontFamily: "'Nunito', 'Montserrat', sans-serif",
              fontSize: '44px',
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

      {/* Centro: Personagem 2.5D Recortado + Sombra de Contato */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Sombra de Contato Cartoon Elíptica */}
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            width: '420px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            transform: `scale(${1 + Math.sin(frame * 0.035) * 0.08})`,
            filter: 'blur(8px)',
            zIndex: 1,
          }}
        />

        {/* Imagem do Personagem Recortado */}
        {activeImage ? (
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              transform: `translateY(${subjectY + breathingFloat}px) scale(${subjectScale * breathingScale})`,
              filter: `blur(${subjectBlur}px) drop-shadow(0 14px 28px rgba(0,0,0,0.4))`,
              maxWidth: '850px',
              maxHeight: '1050px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Img
              src={activeImage}
              style={{
                maxWidth: '100%',
                maxHeight: '1000px',
                objectFit: 'contain',
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
            }}
          >
            <span style={{ fontSize: '80px' }}>⚡</span>
          </div>
        )}

        {/* Badge Cinético Bouncing Flutuante (ex: +350%, 🔥 ALERTA, 💰 $1M) */}
        {badgeText && (
          <div
            style={{
              position: 'absolute',
              top: '22%',
              right: '8%',
              zIndex: 20,
              transform: `scale(${badgeScale}) translateY(${badgeFloat}px) rotate(-6deg)`,
              backgroundColor: badgeColor,
              border: '4px solid #FFFFFF',
              borderRadius: '999px',
              padding: '14px 28px',
              boxShadow: '0 10px 0 rgba(0, 0, 0, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span
              style={{
                fontFamily: "'Nunito', 'Fredoka', 'Montserrat', sans-serif",
                fontSize: '36px',
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
