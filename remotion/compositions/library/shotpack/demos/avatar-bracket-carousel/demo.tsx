// avatar-bracket-carousel — Bracket Carousel focus-frame avatar rotation (motion-lab final cut ported to native Remotion)
// a "Your ___ teammates" fill-in-the-blank layout: the corner focus frame locks onto the current avatar,
// the avatar queue rotates vertically with a spring, entering the frame it enlarges and sharpens, leaving
// it shrinks and fades, the role label swaps in sync, and the text on both sides stays put.
// Design coordinates 480×270 (DesignStage scales proportionally), parameter table values calibrated to this coordinate system.
import React from 'react';
import { DesignStage, E, seg, useT } from '../../_fixtures/Motion';

export const AVATAR_BRACKET_CAROUSEL_DURATION = 156; // 5200ms @30fps

const ACCENT = '#3b82f6';

// avatar backgrounds follow a neutral gray gradient (only to tell queue items apart), the accent color stays on the focus frame
const AV = [
  { c: '#4a4d59', e: '🎨', role: 'Designer' },
  { c: '#5b6070', e: '💬', role: 'Support' },
  { c: '#6d7383', e: '📊', role: 'Analyst' },
  { c: '#828796', e: '✍️', role: 'Writer' },
];

// corner paths of the focus frame (92×92 viewBox)
const CORNERS = ['M4,26 L4,4 L26,4', 'M66,4 L88,4 L88,26', 'M88,66 L88,88 L66,88', 'M26,88 L4,88 L4,66'];

const STEP = 76;
const SWITCHES = [0.24, 0.46, 0.68]; // three switch start times

export const AvatarBracketCarousel: React.FC = () => {
  const t = useT();

  // three switches: 0.24 / 0.46 / 0.68, spring feel
  let pos = 0;
  SWITCHES.forEach((s0) => {
    pos += seg(t, s0, s0 + 0.14, (k) => E.spring(k, 0.25));
  });

  // bracket breathes at the switch moments
  let breath = 0;
  SWITCHES.forEach((s0) => {
    breath += Math.sin(seg(t, s0, s0 + 0.1) * Math.PI);
  });

  return (
    <DesignStage bg="#0b0c12">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#0b0c12',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          fontFamily: '-apple-system,system-ui,sans-serif',
        }}
      >
        <div style={{ color: '#eef1f8', fontWeight: 800, fontSize: 34, letterSpacing: -0.5 }}>Your</div>

        {/* center focus frame + avatar queue */}
        <div style={{ position: 'relative', width: 92, height: 92, flex: 'none' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }}>
            {AV.map((a, k) => {
              const d = Math.abs(k - pos);
              const sc = Math.max(0.5, 1 - d * 0.38);
              const op = Math.max(0, 1 - d * 0.62);
              return (
                <div
                  key={k}
                  style={{
                    position: 'absolute',
                    left: -29,
                    top: -29,
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    background: a.c,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    boxShadow: '0 6px 18px rgba(0,0,0,.4)',
                    transform: `translateY(${(k - pos) * STEP}px) scale(${sc})`,
                    opacity: op * seg(t, 0.02 + k * 0.03, 0.12 + k * 0.03),
                    filter: `blur(${Math.min(3, d * 2.4)}px)`,
                  }}
                >
                  {a.e}
                </div>
              );
            })}
          </div>

          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 3,
              transform: `scale(${1 + Math.min(1, breath) * 0.07})`,
            }}
          >
            <svg width={92} height={92} viewBox="0 0 92 92">
              {CORNERS.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={ACCENT} strokeWidth={4} strokeLinecap="round" />
              ))}
            </svg>
          </div>

          {/* role labels (only opacity follows the focus position, positions don't move) */}
          {AV.map((a, k) => (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%,64px)',
                color: '#8f97b3',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 1,
                opacity: Math.max(0, 1 - Math.abs(k - pos) * 2.2),
              }}
            >
              {a.role}
            </div>
          ))}
        </div>

        <div style={{ color: '#eef1f8', fontWeight: 800, fontSize: 34, letterSpacing: -0.5 }}>teammates</div>
      </div>
    </DesignStage>
  );
};
