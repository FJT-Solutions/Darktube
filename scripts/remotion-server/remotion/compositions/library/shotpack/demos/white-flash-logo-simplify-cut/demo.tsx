// white-flash-logo-simplify-cut — White Flash Simplify dimension-drop cut
// (motion-lab final translated to native Remotion)
// The liquid-textured color wordmark holds still, then the frame flashes white in
// 0.2s (a one-frame subtle blur overlays the flash moment for an overexposure
// feel), immediately followed by the flat gradient wordmark fading in from the
// white background + scale 0.96→1 hold.
// One white flash completes the dimension-drop from "liquid texture → flat wordmark".
// Design coords 480×270 (DesignStage scales up uniformly); parameter table values are calibrated to this coordinate system.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const WHITE_FLASH_LOGO_SIMPLIFY_CUT_DURATION = 108; // 3600ms @30fps

// File-level shared values this effect depends on (three flat-wordmark gradient colors + placeholder wordmark)
const GRAD_A = '#7b3df0';
const GRAD_B = '#5a6cf5';
const GRAD_C = '#22c4e8';
const WORDMARK = 'BRAND';

export const WhiteFlashLogoSimplifyCut: React.FC = () => {
  const t = useT();
  // Liquid layer: slowly flowing gradient during the hold + subtle highlight shift
  const flow = t * 100;
  // Give the color layer one frame of overexposure blur at the flash moment
  const flashK = seg(t, 0.34, 0.42, E.inQuad);
  const blurPulse = Math.sin(seg(t, 0.34, 0.46) * Math.PI);
  // Flat logo: opacity 0→1 + scale 0.96→1, cubic ease-out
  const lk = seg(t, 0.48, 0.74, E.outCubic);
  return (
    <DesignStage bg="#08070c">
      <div style={{ position: 'absolute', inset: 0, background: '#08070c', overflow: 'hidden' }}>
        {/* Color liquid wordmark layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: `900 62px/1 -apple-system,'Helvetica Neue',sans-serif`,
            letterSpacing: 6,
            background: 'linear-gradient(105deg,#ff5fa2 0%,#ff9d4d 22%,#ffe45c 38%,#4de3c1 58%,#4d9bff 76%,#a05cff 100%)',
            backgroundSize: '320% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: 'none',
            backgroundPosition: `${flow}% 0`,
            filter: `blur(${blurPulse * 5}px) brightness(${1 + blurPulse * 1.2})`,
          }}
        >
          {WORDMARK}
        </div>
        {/* Liquid highlight sweep layer (soft light bar above the letterforms) */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 220,
            height: 120,
            margin: '-60px 0 0 -110px',
            background: 'radial-gradient(closest-side,rgba(255,255,255,.28),transparent 70%)',
            filter: 'blur(6px)',
            mixBlendMode: 'screen',
            pointerEvents: 'none',
            transform: `translateX(${lerp(t, -30, 30)}px)`,
            opacity: 1 - flashK,
          }}
        />
        {/* White full-screen layer: ease-in, holds after the flash */}
        <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: flashK }} />
        {/* Flat gradient wordmark layer (gradient colors in GRAD_* at the top) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: lk,
            transform: `scale(${lerp(lk, 0.96, 1)})`,
          }}
        >
          <div
            style={{
              font: `800 58px/1 -apple-system,'Helvetica Neue',sans-serif`,
              letterSpacing: 8,
              background: `linear-gradient(92deg,${GRAD_A} 0%,${GRAD_B} 45%,${GRAD_C} 100%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {WORDMARK}
          </div>
        </div>
      </div>
    </DesignStage>
  );
};
