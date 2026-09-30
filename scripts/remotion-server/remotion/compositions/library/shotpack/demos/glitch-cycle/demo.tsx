// glitch-cycle — Glitch Cycle scrolled garbled-text carousel (motion-lab final ported to native Remotion)
// Status phrases cycle in place; each phrase is garbled at both ends with occasional slight jitter in the middle
// (glitch probability keyframes [1,0,0,0.1,0,0,1]; the last phrase ends at 0 so the t=1 frame stays clean),
// and each switch comes with RGB split and positional jitter; a thin progress bar at the bottom fills evenly with t.
// Design coordinates 480×270 (DesignStage scaled proportionally); parameter values are calibrated in this coordinate system.
import React from 'react';
import { DesignStage, lerp, rand, useT } from '../../_fixtures/Motion';

export const GLITCH_CYCLE_DURATION = 168; // 5600ms @30fps

const PHRASES = ['INITIALIZING', 'LOADING ASSETS', 'COMPILING SHADERS', 'READY TO SHIP'];
const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&<>/\\';
// Glitch probability keyframes [1,0,0,0.1,0,0,1] (last phrase ends at 0 so the t=1 frame stays clean)
const KF = [1, 0, 0, 0.1, 0, 0, 1];
const KF_LAST = [1, 0, 0, 0.1, 0, 0, 0];
const MAXCH = Math.max(...PHRASES.map((p) => p.length));

// Keyframe polyline sampling: p∈[0,1] maps to linear interpolation within the kf segments
const glitchAt = (kf: number[], p: number) => {
  const segs = kf.length - 1;
  const x = Math.min(segs - 1e-6, Math.max(0, p * segs));
  const i = Math.floor(x);
  return lerp(x - i, kf[i], kf[i + 1]);
};

export const GlitchCycle: React.FC = () => {
  const t = useT();
  const N = PHRASES.length;
  const slot = Math.min(N - 1, Math.floor(t * N));
  const p = t * N - slot; // in-phrase progress 0..1
  const text = PHRASES[slot];
  const g = glitchAt(slot === N - 1 ? KF_LAST : KF, p);
  const frame = Math.floor(t * 168);
  const bucket = Math.floor(frame / 2); // garbled byte stream: new batch of random characters every 2 frames
  // Whole-line jitter + RGB split, intensity follows the glitch probability
  const jx = (rand(bucket * 5 + slot) - 0.5) * g * 10;
  const jy = (rand(bucket * 9 + slot + 40) - 0.5) * g * 4;
  return (
    <DesignStage bg="#0a0b10">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0b10',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: '"SF Mono",Menlo,monospace',
            fontSize: 26,
            letterSpacing: 3,
            color: '#dfe6f5',
            transform: `translate(${jx}px,${jy}px)`,
            textShadow:
              g > 0.04
                ? `${g * 3}px 0 rgba(255,60,90,${g * 0.8}), ${-g * 3}px 0 rgba(60,220,255,${g * 0.8})`
                : 'none',
          }}
        >
          {Array.from({ length: MAXCH }, (_, i) => {
            const ch = i < text.length ? text[i] : ' ';
            let content = ch;
            let color: string | undefined;
            if (ch !== ' ') {
              // Roll glitch per character by seed: hit shows garbled text + color change, miss shows the real character
              const hit = rand(i * 31 + bucket * 17 + slot * 97) < g;
              if (hit) {
                content = POOL[Math.floor(rand(i * 131 + bucket * 7 + slot * 13) * POOL.length)];
                color = rand(i + bucket) > 0.5 ? '#6c8cff' : '#4a5270';
              } else {
                color = '#dfe6f5';
              }
            }
            return (
              <span key={i} style={{ minWidth: '0.66em', textAlign: 'center', color }}>
                {content}
              </span>
            );
          })}
        </div>
      </div>
      {/* Thin progress bar at bottom: fills evenly with t */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '63%',
          width: 120,
          height: 2,
          marginLeft: -60,
          background: '#232840',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '100%', width: `${t * 100}%`, background: '#6c8cff' }} />
      </div>
    </DesignStage>
  );
};
