// scramble — Scramble Decode garble-lock (motion-lab final ported to native Remotion)
// Each character first flickers rapidly through random glyphs (seed-driven, reproducible), then locks into the real character
// one by one left to right; the instant it locks, a highlight glow flashes. A completely different feel from typewriter's sequential
// typing — a hacker/decryption vibe. Design coordinates 480×270 (DesignStage scaled proportionally); parameter values are calibrated in this coordinate system.
import React from 'react';
import { DesignStage, rand, seg, useT } from '../../_fixtures/Motion';

export const SCRAMBLE_DURATION = 96; // 3200ms @30fps

const TEXT = 'TEMPLATE MOTION DEMO';
const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\';
const CHARS = [...TEXT];

export const Scramble: React.FC = () => {
  const t = useT();
  const frame = Math.floor(t * 96);
  return (
    <DesignStage bg="#07080c">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#07080c',
          fontFamily: '"SF Mono",Menlo,monospace',
          fontSize: 34,
          letterSpacing: 2,
        }}
      >
        {CHARS.map((ch, i) => {
          let content: string = ch;
          let color = '#3d4560';
          let textShadow = 'none';
          if (ch !== ' ') {
            // Lock timing: left-to-right base stagger + slight seeded jitter
            const lockAt = 0.25 + (i / CHARS.length) * 0.6 + rand(i * 7) * 0.06;
            if (t < 0.06) {
              content = ' '; // brief blank at the start
            } else if (t < lockAt) {
              // Fast glyph flicker: a new random character every 2 frames
              content = POOL[Math.floor(rand(i * 131 + Math.floor(frame / 2)) * POOL.length)];
            } else {
              // Locks to the real character; a highlight glow flashes at the lock instant then settles
              const flash = 1 - seg(t, lockAt, lockAt + 0.1);
              color = flash > 0.4 ? '#dff3ff' : '#e8eaf0';
              textShadow = `0 0 ${flash * 18}px rgba(120,200,255,${flash})`;
            }
          }
          return (
            <span
              key={i}
              style={{ minWidth: '0.62em', textAlign: 'center', color, textShadow }}
            >
              {content === ' ' ? ' ' : content}
            </span>
          );
        })}
      </div>
    </DesignStage>
  );
};
