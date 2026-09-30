// carousel-3d — 3D Carousel ring gallery (motion-lab final cut ported to native Remotion)
// 8 cards arranged in a ring via sin/cos, rotating as a whole ring at constant speed; each card only
// revolves around Y and billboards to face outward, with two mirrored layers (front/back) plus
// backface-visibility:hidden, so the cards always stay upright and never flip at any moment;
// the camera stays fixed throughout (slight top-down close shot), recipe angle=i*360/n+frame*speed.
// Design coordinates 480×270 (DesignStage scales proportionally), parameter table values calibrated to this coordinate system.
import React from 'react';
import { DesignStage, useT } from '../../_fixtures/Motion';

export const CAROUSEL_3D_DURATION = 168; // 5600ms @30fps

const N = 8;
const RADIUS = 190;
const ICONS = ['◆', '●', '▲', '■', '✦', '◗', '⬢', '◉'];

export const Carousel3D: React.FC = () => {
  const t = useT();
  const spin = t * 360; // the whole ring revolves exactly one lap, so it can loop
  return (
    <DesignStage bg="#0a0b10">
      {/* 3D scene: perspective 950px + radial-gradient night sky */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          perspective: '950px',
          background: 'radial-gradient(ellipse at 50% 55%,#131120 0%,#0a0b10 75%)',
        }}
      >
        {/* camera fixed throughout: slight top-down close shot, no pull-back, no angle change */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            transform: 'translateZ(-90px) rotateX(-8deg) translateY(-10px)',
          }}
        >
          {/* ring carrier: the only per-frame variable, the whole ring rotates around Y at constant speed */}
          <div
            style={{
              position: 'absolute',
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              transform: `rotateY(${spin}deg)`,
            }}
          >
            {Array.from({ length: N }, (_, i) => {
              const hue = 200 + i * 22;
              // two mirrored layers with same-facing texture + backface-visibility:hidden:
              // from both outside and inside the ring, it's the same upright, non-mirrored card
              const faceStyle: React.CSSProperties = {
                position: 'absolute',
                inset: 0,
                borderRadius: 9,
                boxSizing: 'border-box',
                padding: 10,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                background: `linear-gradient(160deg,hsl(${hue},60%,42%),hsl(${hue + 28},70%,20%))`,
                border: `1px solid hsla(${hue},80%,75%,.5)`,
                boxShadow: `0 12px 34px rgba(0,0,0,.5), inset 0 1px 0 hsla(${hue},80%,85%,.35)`,
                fontFamily: '-apple-system,system-ui,sans-serif',
                color: '#f2f5fb',
              };
              const face = (
                <>
                  <div style={{ fontSize: 24 }}>{ICONS[i]}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, marginTop: 34 }}>
                    CARD 0{i + 1}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      height: 4,
                      width: '70%',
                      borderRadius: 2,
                      background: 'rgba(255,255,255,.4)',
                    }}
                  />
                  <div
                    style={{
                      marginTop: 4,
                      height: 4,
                      width: '45%',
                      borderRadius: 2,
                      background: 'rgba(255,255,255,.22)',
                    }}
                  />
                </>
              );
              return (
                // card container only handles ring positioning (revolve around Y + billboard facing outward),
                // never rotates around X/Z, so the card stays upright forever
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: -46,
                    top: -62,
                    width: 92,
                    height: 124,
                    transformStyle: 'preserve-3d',
                    transform: `rotateY(${(i * 360) / N}deg) translateZ(${RADIUS}px)`,
                  }}
                >
                  <div style={faceStyle}>{face}</div>
                  <div style={{ ...faceStyle, transform: 'rotateY(180deg)' }}>{face}</div>
                </div>
              );
            })}
          </div>
          {/* ground reflection disc */}
          <div
            style={{
              position: 'absolute',
              left: -230,
              top: 70,
              width: 460,
              height: 460,
              borderRadius: '50%',
              transform: 'rotateX(90deg)',
              background: 'radial-gradient(circle,rgba(110,140,255,.14) 0%,transparent 62%)',
            }}
          />
        </div>
      </div>
    </DesignStage>
  );
};
