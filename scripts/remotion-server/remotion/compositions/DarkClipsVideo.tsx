import React from 'react';
import { AbsoluteFill, Video, Img, interpolate, useCurrentFrame } from 'remotion';
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
    paddingTop = 100,
  } = profileHeader;

  // ── 2. Headline Defaults ──
  const {
    mainText = 'MEU AMIGO: "COMPREI UM MIC NOVO, MANO."',
    subText = 'O DESGRAÇADO ENTRANDO NA CALL:',
    fontFamily = 'Montserrat, Inter, "Helvetica Neue", sans-serif',
    fontSize = 42,
    primaryColor = '#FACC15', // Viral Yellow
    secondaryColor = '#FFFFFF',
    textAlign = 'center',
    uppercase = true,
    textShadow = true,
  } = headline;

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
    text: footerText = 'Sigam a melhor página de vídeos virais!',
    fontSize: footerFontSize = 26,
    color: footerColor = '#9CA3AF',
  } = footer;

  // Subtle entrance animation
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000', opacity, overflow: 'hidden' }}>
      
      {/* ── Background Layer ── */}
      {bgType === 'blur' && videoUrl ? (
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
        {/* ── Profile Header ── */}
        {showHeader && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: textAlign === 'center' ? 'center' : 'flex-start',
              gap: 18,
              paddingTop: `${paddingTop}px`,
              paddingBottom: 24,
              zIndex: 10,
            }}
          >
            {avatarUrl ? (
              <Img
                src={avatarUrl}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  backgroundColor: '#27272a',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  fontWeight: 900,
                  color: '#ffffff',
                }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: textAlign === 'center' ? 'flex-start' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    color: '#FFFFFF',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {name}
                </span>

                {/* Verified Badges */}
                {badgeType === 'blue' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ shrink: 0 }}>
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

                {badgeType === 'gold' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ shrink: 0 }}>
                    <path
                      d="M9 12L11 14L15 10M12 3L14.5 4.5L17.5 4.5L18.5 7.5L21 9L20.5 12L21 15L18.5 16.5L17.5 19.5L14.5 19.5L12 21L9.5 19.5L6.5 19.5L5.5 16.5L3 15L3.5 12L3 9L5.5 7.5L6.5 4.5L9.5 4.5L12 3Z"
                      fill="#EAB308"
                      stroke="#CA8A04"
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
                    fontWeight: 500,
                    color: '#9CA3AF',
                    marginTop: -2,
                  }}
                >
                  {handle.startsWith('@') ? handle : `@${handle}`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Headline Block ── */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            textAlign: textAlign as any,
            marginTop: showHeader ? 12 : `${paddingTop}px`,
            padding: '0 20px',
            zIndex: 10,
          }}
        >
          {mainText && (
            <h1
              style={{
                margin: 0,
                fontSize: `${fontSize}px`,
                fontWeight: 900,
                color: primaryColor,
                lineHeight: 1.25,
                textTransform: uppercase ? 'uppercase' : 'none',
                textShadow: textShadow ? '0 4px 16px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)' : 'none',
                letterSpacing: '-0.01em',
              }}
            >
              {mainText}
            </h1>
          )}

          {subText && (
            <h2
              style={{
                margin: 0,
                fontSize: `${Math.round(fontSize * 0.9)}px`,
                fontWeight: 800,
                color: secondaryColor,
                lineHeight: 1.25,
                textTransform: uppercase ? 'uppercase' : 'none',
                textShadow: textShadow ? '0 4px 16px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)' : 'none',
              }}
            >
              {subText}
            </h2>
          )}
        </div>

        {/* ── Video Player Container ── */}
        {videoUrl && (
          <div
            style={{
              position: 'absolute',
              top: `${yOffset}%`,
              transform: 'translateY(-50%)',
              width: `${scale}%`,
              borderRadius: `${borderRadius}px`,
              overflow: 'hidden',
              boxShadow: hasShadow ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.1)' : 'none',
              backgroundColor: '#09090b',
              aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '4:3' ? '4/3' : aspectRatio === '1:1' ? '1/1' : 'auto',
              maxHeight: '58%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
            }}
          >
            <Video
              src={videoUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {/* ── Footer / CTA Layer ── */}
        {showFooter && footerText && (
          <div
            style={{
              position: 'absolute',
              bottom: 80,
              width: '100%',
              textAlign: 'center',
              padding: '0 40px',
              zIndex: 10,
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
