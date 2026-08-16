import React from 'react';
import { AbsoluteFill, Video, useCurrentFrame } from 'remotion';
import { DarkClipsVideoProps } from '../types';

export const DarkClipsVideoComposition: React.FC<DarkClipsVideoProps> = ({
  videoUrl,
  profileHeader = {},
  headline = {},
  videoPlacement = {},
  background = {},
  footer = {},
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
  } = profileHeader;

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
    textShadow = true,
    mainTextYOffset = 17,
    subTextYOffset = 25,
  } = headline;

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

  // ── 5. Footer Defaults ──
  const {
    showFooter = false,
    text: footerText = 'Sigam a página para os melhores vídeos!',
    fontSize: footerFontSize = 26,
    color: footerColor = '#9CA3AF',
  } = footer;

  const hasVideo = !!(videoUrl && videoUrl.trim().length > 0);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000', opacity: 1, overflow: 'hidden' }}>
      
      {/* ── Background Layer ── */}
      {bgType === 'blur' && hasVideo ? (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
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
          <AbsoluteFill
            style={{
              backgroundColor: `rgba(0, 0, 0, ${overlayOpacity / 100})`,
            }}
          />
        </AbsoluteFill>
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
        {/* ── 1. Profile Header Layer (Alinhamento Independente) ── */}
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
              gap: 18,
              zIndex: 20,
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.6)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 34,
                  fontWeight: 900,
                  color: '#ffffff',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.6)',
                }}
              >
                {(name || 'D').charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: headerTextAlign === 'right' ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: '#FFFFFF',
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  }}
                >
                  {name || 'Dark Clips'}
                </span>

                {/* Selo de Verificado Padrão Instagram (Azul) */}
                {badgeType === 'blue' && (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
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
                    fontSize: 24,
                    fontWeight: 600,
                    color: '#9CA3AF',
                    marginTop: -2,
                    textShadow: '0 2px 6px rgba(0,0,0,0.8)',
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
                textTransform: uppercase ? 'uppercase' : 'none',
                textShadow: textShadow ? '0 4px 16px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.9)' : 'none',
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
                color: secondaryColor,
                lineHeight: 1.25,
                textTransform: uppercase ? 'uppercase' : 'none',
                textShadow: textShadow ? '0 4px 16px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.9)' : 'none',
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
            boxShadow: hasShadow ? '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255,255,255,0.15)' : 'none',
            backgroundColor: '#09090b',
            aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '4:3' ? '4/3' : aspectRatio === '1:1' ? '1/1' : 'auto',
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
                objectFit: 'contain',
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

        {/* ── 5. Footer / CTA Layer ── */}
        {showFooter && footerText && (
          <div
            style={{
              position: 'absolute',
              bottom: 80,
              width: '100%',
              textAlign: 'center',
              padding: '0 40px',
              zIndex: 20,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: `${footerFontSize}px`,
                fontWeight: 600,
                color: footerColor,
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              }}
            >
              {footerText}
            </p>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
