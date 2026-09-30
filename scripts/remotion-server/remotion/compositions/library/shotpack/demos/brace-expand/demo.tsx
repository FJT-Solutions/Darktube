// brace-expand — Brace Expand Reveal curtain-draw braces (motion-lab final ported to native Remotion)
// A pair of touching curly braces first appear small in the center, then slide apart left/right with an overshoot (outBack ~8%)
// while scaling up to title size; the text is revealed between them like a curtain drawn open (clip width strictly bound to the brace gap),
// and the letter-spacing relaxes slightly after they settle.
// Design coordinates 480×270 (DesignStage scaled proportionally); parameter values are calibrated in this coordinate system.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const BRACE_EXPAND_DURATION = 114; // 3800ms @30fps

const FONT = '-apple-system,system-ui,sans-serif';
const HALF = 148; // braces' final half-gap

// Single curly brace: x is the current horizontal offset (negative left, positive right), sc the synchronized scale
const Brace: React.FC<{ ch: string; x: number; sc: number; on: number }> = ({ ch, x, sc, on }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      fontWeight: 800,
      fontSize: 44,
      fontFamily: FONT,
      color: '#fff',
      transform: `translate(-50%,-50%) translateX(${x}px) scale(${sc})`,
      opacity: on,
    }}
  >
    {ch}
  </div>
);

export const BraceExpand: React.FC = () => {
  const t = useT();
  const on = t >= 0.07 ? 1 : 0; // appears on its own first (small size, ~2 frames before moving)
  const ex = seg(t, 0.13, 0.34, E.outBack); // spring open: ~8% overshoot then rebound
  const sc = lerp(ex, 0.6, 1); // font size scales up to title level in sync
  const x = HALF * ex * sc;
  // Letter-spacing relaxes slightly after settling
  const ls = lerp(seg(t, 0.42, 0.62, E.inOutQuad), 1, 2.6);
  return (
    <DesignStage bg="#0a0b10">
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }}>
        {/* Text reveal width strictly bound to the brace gap (curtain feel, not typing) */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: 'translate(-50%,-50%)',
            overflow: 'hidden',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: Math.max(0, x * 2 - 34),
            opacity: on,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 38,
              fontFamily: FONT,
              color: '#fff',
              whiteSpace: 'nowrap',
              letterSpacing: `${ls}px`,
              transform: `scale(${sc})`,
            }}
          >
            Your title
          </div>
        </div>
        <Brace ch="{" x={-x} sc={sc} on={on} />
        <Brace ch="}" x={x} sc={sc} on={on} />
      </div>
    </DesignStage>
  );
};
