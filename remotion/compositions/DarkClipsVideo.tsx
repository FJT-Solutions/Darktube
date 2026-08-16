import React from 'react';
import { AbsoluteFill, Video, useCurrentFrame } from 'remotion';
import { DarkClipsVideoProps } from '../types';

export const DarkClipsVideoComposition: React.FC<DarkClipsVideoProps> = ({
  videoUrl,
  profileHeader = {},
  headline = {},
  videoPlacement = {},
  background = {},
  watermark = {},
  footer = {},
  arrows = {},
  arrowsList,
}) => {
  const frame = useCurrentFrame();

  // ── 1. Profile Header Defaults ──
  const {
    avatarUrl = '',
    name = 'Dark Clips',
    handle = '@darkclips',
    badgeType = 'blue',
    showHeader = true,
    paddingTop = 90,
    textAlign: headerTextAlign = 'left',
    scale: headerScale = 100,
    avatarSize = 76,
    fontSize: headerFontSize = 32,
  } = profileHeader;

  const headerMultiplier = (headerScale || 100) / 100;
  const currentAvatarSize = Math.round((avatarSize || 76) * headerMultiplier);
  const currentNameSize = Math.round((headerFontSize || 32) * headerMultiplier);
  const currentHandleSize = Math.max(14, Math.round(currentNameSize * 0.75));
  const currentBadgeSize = Math.max(16, Math.round(26 * headerMultiplier));

  // ── 2. Headline Defaults ──
  const {
    mainText = 'QUANDO VOCÊ ACHA QUE FINALIZOU O CÓDIGO:',
    subText = 'O BUG SURGINDO NO PRIMEIRO TESTE:',
    showMainText = true,
    showSubText = true,
    fontFamily = 'Montserrat, Inter, "Helvetica Neue", sans-serif',
    fontSize = 42,
    primaryColor = '#FACC15', // Viral Yellow
    secondaryColor = '#FFFFFF',
    textAlign = 'center',
    mainTextAlign,
    subTextAlign,
    uppercase = true,
    mainTextUppercase,
    subTextUppercase,
    textShadow = true,
    mainTextYOffset = 17,
    subTextYOffset = 25,
  } = headline;

  const isMainUpper = typeof mainTextUppercase === 'boolean' ? mainTextUppercase : (uppercase ?? true);
  const isSubUpper = typeof subTextUppercase === 'boolean' ? subTextUppercase : (uppercase ?? true);

  const activeMainAlign = mainTextAlign || textAlign || 'center';
  const activeSubAlign = subTextAlign || textAlign || 'center';

  // ── 3. Video Placement Defaults ──
  const {
    yOffset = 52, // Percentage from top
    scale = 92, // Width percentage
    borderRadius = 24,
    hasShadow = true,
    aspectRatio = 'auto',
  } = videoPlacement;

  // ── 4. Background Defaults ──
  const {
    type: bgType = 'black',
    blurIntensity = 25,
    overlayOpacity = 60,
    customColor = '#000000',
  } = background;

  // ── 5. Watermark Defaults ──
  const {
    enabled: watermarkEnabled = false,
    type: watermarkType = 'text',
    shape: watermarkShape = 'circle',
    text: watermarkText = '@darkclips',
    imageUrl: watermarkImageUrl = '',
    position: watermarkPosition = 'bottom-right',
    xOffset: watermarkX = 85,
    yOffset: watermarkY = 92,
    opacity: watermarkOpacity = 70,
    fontSize: watermarkFontSize = 22,
    imageSize: watermarkImageSize = 44,
    scale: watermarkScale = 100,
    color: watermarkColor = '#FFFFFF',
    hasShadow: watermarkHasShadow = true,
    borderWidth: watermarkBorderWidth = 2,
    borderColor: watermarkBorderColor = 'rgba(255, 255, 255, 0.4)',
  } = watermark;

  // ── 6. Footer Defaults ──
  const {
    showFooter = false,
    text: footerText = 'Sigam a página para os melhores vídeos!',
    fontSize: footerFontSize = 26,
    color: footerColor = '#9CA3AF',
    yOffset: footerYOffset = 92,
    textAlign: footerTextAlign = 'center',
    scale: footerScale = 100,
  } = footer;

  // ── 7. Animated Callout Arrows Defaults ──
  const {
    enabled: arrowsEnabled = false,
    direction: arrowsDirection = 'right',
    style: arrowsStyle = 'trail',
    count: arrowsCount = 2,
    xOffset: arrowsX = 82,
    yOffset: arrowsY = 65,
    color: arrowsColor = '#FE2C55',
    size: arrowsSize = 42,
    scale: arrowsScale = 100,
    text: arrowsText = '',
    textColor: arrowsTextColor = '#FFFFFF',
  } = arrows;

  const rotationDegrees =
    arrowsDirection === 'right'
      ? 0
      : arrowsDirection === 'left'
      ? 180
      : arrowsDirection === 'up'
      ? -90
      : arrowsDirection === 'down'
      ? 90
      : arrowsDirection === 'down-right'
      ? 45
      : arrowsDirection === 'up-right'
      ? -45
      : 0;

  const arrowEffectiveSize = Math.round(arrowsSize * ((arrowsScale || 100) / 100));
  const bounceCycle = (frame % 30) / 30;
  const bounceDelta = Math.sin(bounceCycle * Math.PI * 2) * 14;
  const pulseScale = 1 + Math.sin(bounceCycle * Math.PI * 2) * 0.15;

  const hasVideo = !!(videoUrl && videoUrl.trim().length > 0);
  const isLightBg = bgType === 'white';

  // Smart Contrast for Header and Subtitles
  const authorNameColor = isLightBg ? '#09090b' : '#FFFFFF';
  const authorHandleColor = isLightBg ? '#52525b' : '#9CA3AF';
  const authorShadow = isLightBg ? 'none' : '0 2px 8px rgba(0,0,0,0.8)';

  // If background is white and subtitle is white (#ffffff), automatically adapt to dark slate
  const computedSecondaryColor =
    isLightBg && (secondaryColor === '#FFFFFF' || secondaryColor.toLowerCase() === '#ffffff')
      ? '#09090b'
      : secondaryColor;

  const computedMainShadow = isLightBg
    ? 'none'
    : textShadow
    ? '0 4px 16px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.9)'
    : 'none';

  const computedSubShadow = isLightBg
    ? 'none'
    : textShadow
    ? '0 4px 16px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.9)'
    : 'none';

  return (
    <AbsoluteFill style={{ backgroundColor: isLightBg ? '#ffffff' : '#000000', opacity: 1, overflow: 'hidden' }}>
      
      {/* ── Background Layer ── */}
      {bgType === 'blur' ? (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          {hasVideo ? (
            <Video
              src={videoUrl}
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: `blur(${blurIntensity}px) brightness(0.6)`,
                transform: 'scale(1.25)',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'radial-gradient(circle at 50% 50%, #3730a3 0%, #1e1b4b 40%, #09090b 100%)',
                filter: `blur(${blurIntensity}px)`,
                transform: 'scale(1.2)',
              }}
            />
          )}
          <AbsoluteFill
            style={{
              backgroundColor: `rgba(0, 0, 0, ${overlayOpacity / 100})`,
            }}
          />
        </AbsoluteFill>
      ) : bgType === 'white' ? (
        <AbsoluteFill style={{ backgroundColor: '#ffffff' }} />
      ) : bgType === 'neon' ? (
        <AbsoluteFill
          style={{
            background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #311042 100%)',
          }}
        />
      ) : bgType === 'zinc' ? (
        <AbsoluteFill
          style={{
            background: 'linear-gradient(180deg, #18181b 0%, #27272a 100%)',
          }}
        />
      ) : bgType === 'gradient' ? (
        <AbsoluteFill
          style={{
            background: 'linear-gradient(180deg, #09090b 0%, #18181b 50%, #09090b 100%)',
          }}
        />
      ) : bgType === 'color' ? (
        <AbsoluteFill style={{ backgroundColor: customColor }} />
      ) : (
        <AbsoluteFill style={{ backgroundColor: '#000000' }} />
      )}

      {/* ── Content Container (1080x1920 Vertical Canvas) ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0 40px',
          boxSizing: 'border-box',
          fontFamily,
        }}
      >
        {/* ── 1. Profile Header Layer (Alinhamento & Escala Independentes) ── */}
        {showHeader && (
          <div
            style={{
              position: 'absolute',
              top: `${paddingTop}px`,
              left: '5%',
              width: '90%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: headerTextAlign === 'center' ? 'center' : headerTextAlign === 'right' ? 'flex-end' : 'flex-start',
              gap: Math.round(18 * headerMultiplier),
              zIndex: 20,
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{
                  width: currentAvatarSize,
                  height: currentAvatarSize,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: isLightBg ? '2px solid rgba(0, 0, 0, 0.15)' : '2px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: isLightBg ? '0 4px 12px rgba(0,0,0,0.1)' : '0 6px 16px rgba(0,0,0,0.6)',
                }}
              />
            ) : (
              <div
                style={{
                  width: currentAvatarSize,
                  height: currentAvatarSize,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: Math.round(currentAvatarSize * 0.45),
                  fontWeight: 900,
                  color: '#ffffff',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.6)',
                }}
              >
                {(name || 'D').charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: headerTextAlign === 'right' ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(8 * headerMultiplier) }}>
                <span
                  style={{
                    fontSize: `${currentNameSize}px`,
                    fontWeight: 800,
                    color: authorNameColor,
                    letterSpacing: '-0.02em',
                    textShadow: authorShadow,
                  }}
                >
                  {name || 'Dark Clips'}
                </span>

                {/* Selo de Verificado Padrão Instagram (Azul) */}
                {badgeType === 'blue' && (
                  <svg width={currentBadgeSize} height={currentBadgeSize} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path
                      d="M9 12L11 14L15 10M12 3L14.5 4.5L17.5 4.5L18.5 7.5L21 9L20.5 12L21 15L18.5 16.5L17.5 19.5L14.5 19.5L12 21L9.5 19.5L6.5 19.5L5.5 16.5L3 15L3.5 12L3 9L5.5 7.5L6.5 4.5L9.5 4.5L12 3Z"
                      fill="#38BDF8"
                      stroke="#0284C7"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              {handle && (
                <span
                  style={{
                    fontSize: `${currentHandleSize}px`,
                    fontWeight: 600,
                    color: authorHandleColor,
                    marginTop: -2,
                    textShadow: authorShadow,
                  }}
                >
                  {handle.startsWith('@') ? handle : `@${handle}`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── 2. Independent Main Text Layer (Setup / Título) ── */}
        {showMainText && mainText && (
          <div
            style={{
              position: 'absolute',
              top: `${mainTextYOffset}%`,
              left: '5%',
              width: '90%',
              textAlign: activeMainAlign as any,
              zIndex: 20,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: `${fontSize}px`,
                fontWeight: 900,
                color: primaryColor,
                lineHeight: 1.25,
                textTransform: isMainUpper ? 'uppercase' : 'none',
                textShadow: computedMainShadow,
                letterSpacing: '-0.01em',
              }}
            >
              {mainText}
            </h1>
          </div>
        )}

        {/* ── 3. Independent Sub Text Layer (Subtítulo / Punchline) ── */}
        {showSubText && subText && (
          <div
            style={{
              position: 'absolute',
              top: `${subTextYOffset}%`,
              left: '5%',
              width: '90%',
              textAlign: activeSubAlign as any,
              zIndex: 20,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: `${Math.round(fontSize * 0.88)}px`,
                fontWeight: 800,
                color: computedSecondaryColor,
                lineHeight: 1.25,
                textTransform: isSubUpper ? 'uppercase' : 'none',
                textShadow: computedSubShadow,
              }}
            >
              {subText}
            </h2>
          </div>
        )}

        {/* ── 4. Video Player & High-Fidelity Mockup Container ── */}
        <div
          style={{
            position: 'absolute',
            top: `${yOffset}%`,
            transform: 'translateY(-50%)',
            width: `${scale}%`,
            borderRadius: `${borderRadius}px`,
            overflow: 'hidden',
            boxShadow: isLightBg
              ? '0 20px 45px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.08)'
              : hasShadow
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255,255,255,0.15)'
              : 'none',
            backgroundColor: '#09090b',
            aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '4:3' ? '4/3' : aspectRatio === '1:1' ? '1/1' : '16/9',
            maxHeight: '58%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          {hasVideo ? (
            <Video
              src={videoUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            /* Visual Mockup Template when no video is selected */
            <div
              style={{
                width: '100%',
                minHeight: 360,
                background: 'linear-gradient(145deg, #18181b 0%, #09090b 60%, #1e1b4b 100%)',
                border: '2px dashed rgba(255, 255, 255, 0.15)',
                borderRadius: `${borderRadius}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                padding: '40px 20px',
                boxSizing: 'border-box',
              }}
            >
              {/* Background ambient glow */}
              <div
                style={{
                  position: 'absolute',
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, rgba(0,0,0,0) 70%)',
                  top: '20%',
                  left: '35%',
                }}
              />

              {/* Play Badge Icon */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.9)',
                  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  zIndex: 2,
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              </div>

              {/* Labels */}
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '0.02em',
                  zIndex: 2,
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                }}
              >
                Área do Vídeo Enquadrado
              </span>

              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#94a3b8',
                  marginTop: 6,
                  zIndex: 2,
                }}
              >
                Escala: {scale}% · Curvatura: {borderRadius}px
              </span>

              {/* Simulated timeline bar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 20,
                  right: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '45%',
                      height: '100%',
                      backgroundColor: '#ef4444',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#cbd5e1',
                    fontFamily: 'monospace',
                  }}
                >
                  00:15 / 00:15 HD
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── 5. Watermark Layer (Marca d'água do Canal) ── */}
        {watermarkEnabled && (
          <div
            style={{
              position: 'absolute',
              ...(watermarkPosition === 'custom'
                ? { top: `${watermarkY}%`, left: `${watermarkX}%`, transform: 'translate(-50%, -50%)' }
                : watermarkPosition === 'top-left'
                ? { top: '3%', left: '5%' }
                : watermarkPosition === 'top-right'
                ? { top: '3%', right: '5%' }
                : watermarkPosition === 'bottom-left'
                ? { bottom: '3%', left: '5%' }
                : watermarkPosition === 'center'
                ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
                : { bottom: '3%', right: '5%' }),
              opacity: (watermarkOpacity || 70) / 100,
              zIndex: 35,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* 1. MODO COMBINADO: LOGO + TEXTO / @ARROBA */}
            {watermarkType === 'both' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 14px 4px 6px',
                  borderRadius: '9999px',
                  backgroundColor: isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(8px)',
                  border: isLightBg ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.2)',
                  boxShadow: watermarkHasShadow ? '0 4px 14px rgba(0,0,0,0.6)' : 'none',
                }}
              >
                <div
                  style={{
                    width: `${Math.round((watermarkImageSize || 40) * ((watermarkScale || 100) / 100))}px`,
                    height: `${Math.round((watermarkImageSize || 40) * ((watermarkScale || 100) / 100))}px`,
                    borderRadius: watermarkShape === 'circle' ? '9999px' : watermarkShape === 'rounded' ? '8px' : '2px',
                    overflow: 'hidden',
                    border: `${watermarkBorderWidth || 2}px solid ${watermarkBorderColor || 'rgba(255,255,255,0.6)'}`,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <img
                    src={watermarkImageUrl || avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}
                    alt="Logo"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: `${Math.round((watermarkFontSize || 20) * ((watermarkScale || 100) / 100))}px`,
                    fontWeight: 800,
                    color: isLightBg && (watermarkColor === '#FFFFFF' || watermarkColor === '#ffffff') ? '#09090b' : watermarkColor,
                    letterSpacing: '0.03em',
                    whiteSpace: 'nowrap',
                    textShadow: watermarkHasShadow ? '0 2px 8px rgba(0,0,0,0.9)' : 'none',
                  }}
                >
                  {watermarkText || handle || '@darkclips'}
                </span>
              </div>
            )}

            {/* 2. MODO APENAS LOGO / IMAGEM COM MOLDURA CIRCULAR / PERSONALIZADA */}
            {watermarkType === 'image' && (
              <div
                style={{
                  width: `${Math.round((watermarkImageSize || 54) * ((watermarkScale || 100) / 100))}px`,
                  height: `${Math.round((watermarkImageSize || 54) * ((watermarkScale || 100) / 100))}px`,
                  borderRadius: watermarkShape === 'circle' ? '9999px' : watermarkShape === 'rounded' ? '14px' : '4px',
                  overflow: 'hidden',
                  border: `${watermarkBorderWidth || 2}px solid ${watermarkBorderColor || 'rgba(255,255,255,0.6)'}`,
                  boxShadow: watermarkHasShadow ? '0 4px 16px rgba(0,0,0,0.7)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
              >
                <img
                  src={watermarkImageUrl || avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}
                  alt="Marca d'água"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}

            {/* 3. MODO APENAS TEXTO / @ARROBA */}
            {watermarkType === 'text' && (
              <span
                style={{
                  fontSize: `${Math.round((watermarkFontSize || 22) * ((watermarkScale || 100) / 100))}px`,
                  fontWeight: 800,
                  color: isLightBg && watermarkPosition !== 'custom' && (watermarkColor === '#FFFFFF' || watermarkColor === '#ffffff') ? '#09090b' : watermarkColor,
                  letterSpacing: '0.04em',
                  textShadow: watermarkHasShadow ? '0 2px 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)' : 'none',
                  backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.35)',
                  padding: '5px 12px',
                  borderRadius: 10,
                  backdropFilter: 'blur(6px)',
                  border: isLightBg ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {watermarkText || '@darkclips'}
              </span>
            )}
          </div>
        )}

        {/* ── 6. Footer / CTA Layer ── */}
        {showFooter && footerText && (
          <div
            style={{
              position: 'absolute',
              top: `${footerYOffset}%`,
              left: '5%',
              width: '90%',
              textAlign: footerTextAlign as any,
              transform: 'translateY(-50%)',
              zIndex: 25,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: `${Math.round(footerFontSize * ((footerScale || 100) / 100))}px`,
                fontWeight: 700,
                color: footerColor,
                textShadow: isLightBg ? 'none' : '0 2px 8px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.8)',
                letterSpacing: '0.01em',
                lineHeight: 1.25,
              }}
            >
              {footerText}
            </p>
          </div>
        )}

        {/* ── 7. Animated Callout Arrows Layers (Multiple Containers Support) ── */}
        {(arrowsList && arrowsList.length > 0
          ? arrowsList.filter((item) => item && item.enabled !== false)
          : arrows && arrows.enabled !== false
          ? [arrows]
          : []
        ).map((container, cIdx) => {
          const {
            direction: cDir = 'right',
            style: cStyle = 'trail',
            count: cCount = 2,
            xOffset: cX = 82,
            yOffset: cY = 65,
            color: cColor = '#FE2C55',
            size: cSize = 42,
            scale: cScale = 100,
            text: cText = '',
            textColor: cTextColor = '#FFFFFF',
          } = container;

          const cRotation =
            cDir === 'right'
              ? 0
              : cDir === 'left'
              ? 180
              : cDir === 'up'
              ? -90
              : cDir === 'down'
              ? 90
              : cDir === 'down-right'
              ? 45
              : cDir === 'up-right'
              ? -45
              : 0;

          const cEffectiveSize = Math.round(cSize * ((cScale || 100) / 100));
          const cBounceCycle = (frame % 30) / 30;
          const cBounceDelta = Math.sin(cBounceCycle * Math.PI * 2) * 14;
          const cPulseScale = 1 + Math.sin(cBounceCycle * Math.PI * 2) * 0.15;

          return (
            <div
              key={container.id || `arrow-c-${cIdx}`}
              style={{
                position: 'absolute',
                top: `${cY}%`,
                left: `${cX}%`,
                transform: `translate(-50%, -50%) ${
                  cStyle === 'bounce'
                    ? cDir === 'right'
                      ? `translateX(${cBounceDelta}px)`
                      : cDir === 'left'
                      ? `translateX(${-cBounceDelta}px)`
                      : cDir === 'down' || cDir === 'down-right'
                      ? `translateY(${cBounceDelta}px)`
                      : `translateY(${-cBounceDelta}px)`
                    : cStyle === 'pulse'
                    ? `scale(${cPulseScale})`
                    : ''
                }`,
                display: 'flex',
                flexDirection: cDir === 'up' || cDir === 'down' ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                zIndex: 28,
                pointerEvents: 'none',
                filter: isLightBg
                  ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))'
                  : `drop-shadow(0 4px 12px rgba(0,0,0,0.95)) drop-shadow(0 0 8px ${cColor}80)`,
              }}
            >
              {/* Optional Callout Action Text */}
              {cText && (
                <span
                  style={{
                    fontSize: `${Math.round(cEffectiveSize * 0.58)}px`,
                    fontWeight: 900,
                    color: cTextColor || '#FFFFFF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.8)',
                    marginRight: cDir === 'right' || cDir === 'down-right' ? '4px' : '0px',
                    marginLeft: cDir === 'left' ? '4px' : '0px',
                  }}
                >
                  {cText}
                </span>
              )}

              {/* Arrows Sequence (1 to 5 items) */}
              {Array.from({ length: Math.max(1, Math.min(5, cCount || 2)) }).map((_, idx) => {
                let arrowOpacity = 1;
                if (cStyle === 'trail') {
                  const trailPhase = (frame + idx * 7) % 24;
                  arrowOpacity = 0.35 + (trailPhase / 24) * 0.65;
                }

                return (
                  <div
                    key={idx}
                    style={{
                      transform: `rotate(${cRotation}deg)`,
                      opacity: arrowOpacity,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width={cEffectiveSize}
                      height={cEffectiveSize}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={cColor}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                );
              })}
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
