// list-reveal — List Reveal menu items finding their slots one by one (motion-lab final cut ported to native Remotion)
// vertical menu list items enter one by one, scaling into their slots (outBack with a slight overshoot),
// while the whole list container drifts upward slowly and linearly throughout — the "overall drift"
// and "per-item entrance" are two separate motion layers superimposed.
// Design coordinates 480×270 (DesignStage scales proportionally), parameter table values calibrated to this coordinate system.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const LIST_REVEAL_DURATION = 108; // 3600ms @30fps

const LABELS = ['Dashboard', 'Projects', 'Analytics', 'Messages', 'Settings', 'Sign out'];
const HUES = [225, 250, 275, 300, 210, 340];

export const ListReveal: React.FC = () => {
  const t = useT();
  return (
    <DesignStage bg="#0a0b10">
      {/* centering container: flex centers the list both vertically and horizontally */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#0a0b10',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* overall drift layer: slow linear upward drift throughout */}
        <div
          style={{
            position: 'relative',
            width: 240,
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
            // -0.5px: in the original video the browser's flex centering lands on an integer
            // (list height 255 → top 7.0), while Remotion renders it at 7.5; this compensates
            // half a design pixel to align with the original
            transform: `translateY(${lerp(t, 16, -16) - 0.5}px)`,
          }}
        >
          {LABELS.map((s, i) => {
            // per-item entrance: outBack with a slight overshoot into its slot
            const p = seg(t, 0.06 + i * 0.09, 0.06 + i * 0.09 + 0.24, E.outBack);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '9px 13px',
                  borderRadius: 10,
                  background: '#161a26',
                  border: '1px solid #262c40',
                  opacity: Math.min(1, p * 2.2),
                  transform: `scale(${0.78 + Math.max(0, p) * 0.22}) translateY(${lerp(Math.max(0, p), 14, 0)}px)`,
                }}
              >
                <div
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: 5,
                    flex: 'none',
                    background: `linear-gradient(140deg,hsl(${HUES[i]},75%,64%),hsl(${HUES[i]},70%,46%))`,
                  }}
                />
                <div
                  style={{
                    fontFamily: '-apple-system,sans-serif',
                    fontWeight: 500,
                    fontSize: 13,
                    lineHeight: 1,
                    color: '#c6cde2',
                  }}
                >
                  {s}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DesignStage>
  );
};
