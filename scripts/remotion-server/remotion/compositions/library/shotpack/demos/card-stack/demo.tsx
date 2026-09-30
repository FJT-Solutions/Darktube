// card-stack — Card Stack 3D fan-out (motion-lab final ported to native Remotion)
// 8 cards spring in from below the screen (staggered 3 frames), stack into a deck, then fan out: each card gets
// (i-3.5)*8° rotation + horizontal offset + receding z, forming a 3D fan. The entrance animation and the fan's
// final-state offsets are layered and stacked separately.
// Design coordinates 480×270 (DesignStage scales up uniformly); parameter-table values are calibrated to this system.
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const CARD_STACK_DURATION = 126; // 4200ms @30fps

const N = 8;
const HUES = [222, 238, 254, 270, 286, 302, 318, 334];
const GLYPHS = ['◆', '●', '▲', '■', '✦', '◐', '◇', '○'];

export const CardStack: React.FC = () => {
  const t = useT();
  return (
    <DesignStage bg="#0a0b10">
      {/* 3D scene container: perspective 900px so cards can recede via translateZ for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#0a0b10',
          perspective: '900px',
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: N }, (_, i) => {
          const hue = HUES[i];
          // Entrance: springs in from below the screen, staggered 3 frames (0.033/card)
          const inT = seg(t, 0.02 + i * 0.033, 0.02 + i * 0.033 + 0.3);
          const y = lerp(E.spring(inT, 0.3), 300, 0);
          // Fan-out: unfolds in one go after all cards land (static final offset × unfold progress)
          const fan = seg(t, 0.55, 0.8, E.inOutCubic);
          const k = i - (N - 1) / 2;
          const rot = k * 8 * fan;
          const tx = k * 34 * fan;
          const tz = -10 * Math.abs(k) * fan;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 110,
                height: 150,
                // The original capture used content-box: the 1px border expands outward, so the card actually occupies 112×152
                boxSizing: 'content-box',
                margin: '-85px 0 0 -55px',
                borderRadius: 12,
                transformOrigin: '50% 130%',
                background: `linear-gradient(165deg,hsl(${hue},45%,26%),hsl(${hue},55%,14%))`,
                border: `1px solid hsla(${hue},60%,60%,.35)`,
                boxShadow: '0 12px 34px rgba(0,0,0,.5)',
                transform: `translate3d(${tx}px,${y}px,${tz}px) rotate(${rot}deg)`,
                opacity: Math.min(1, inT * 4),
                zIndex: 20 - Math.abs(k * 2),
              }}
            >
              {/* Card-face decoration: two info bars (widths use rand's deterministic randomness, seeds matching the source) + centered glyph */}
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 14,
                  width: 40 + rand(i) * 40,
                  height: 8,
                  borderRadius: 4,
                  background: `hsla(${hue},70%,70%,.8)`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 30,
                  width: 26 + rand(i + 9) * 30,
                  height: 6,
                  borderRadius: 3,
                  background: `hsla(${hue},40%,60%,.4)`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '62%',
                  transform: 'translate(-50%,-50%)',
                  fontSize: 30,
                  color: `hsla(${hue},80%,75%,.9)`,
                }}
              >
                {GLYPHS[i]}
              </div>
            </div>
          );
        })}
      </div>
    </DesignStage>
  );
};
