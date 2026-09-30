// cloner-depth-echo — clone column
// a single main card instantly "xeroxes" into 7 clones arranged equidistantly along the Z axis (spacing 120px,
// opacity 100%→20% falloff, whole team viewed at 8° rotateY), popping out staggered over 12f; hold 25f;
// all clones accelerate back into the main body and merge (10f ease-in), and at the moment of merging the main body pops to 1.08x.
// Close: true stillness after f120 for 40f. Everything derived from frame.
import React from 'react';
import { useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { G, Card, TitleBlock } from '../../_fixtures/Fixtures';

const FPS = 30;
const N = 7; // clone count
const GAP_Z = 120;

const SPREAD_START = 18; // spread start frame
const HOLD_END = 18 + 12 + 25; // f55: hold ends
const MERGE_DUR = 10; // merge-back duration

export const ClonerDepthEcho: React.FC = () => {
  const frame = useCurrentFrame();

  // merge-back progress (all in sync, ease-in accelerating)
  const merge = interpolate(frame, [HOLD_END, HOLD_END + MERGE_DUR], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // main body pops at the moment of merging
  const popS = spring({
    frame: frame - (HOLD_END + MERGE_DUR),
    fps: FPS,
    config: { damping: 11, stiffness: 200, mass: 0.7 },
    durationInFrames: 18,
  });
  const heroScale = frame >= HOLD_END + MERGE_DUR ? 1 + 0.08 * Math.sin(popS * Math.PI) : 1;

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 100, width: '100%', textAlign: 'center' }}>
        <TitleBlock text="CLONER DEPTH ECHO" size={72} />
      </div>

      <div style={{ position: 'absolute', inset: 0, perspective: 1600, perspectiveOrigin: '58% 46%' }}>
        <div
          style={{
            position: 'absolute',
            left: 960 - 260,
            top: 540 - 170 + 40,
            transformStyle: 'preserve-3d',
            transform: 'rotateY(16deg)',
          }}
        >
          {/* clone queue: rendered back-to-front for correct occlusion */}
          {Array.from({ length: N }, (_, k) => N - k).map((idx) => {
            // idx 1..N, larger idx means further back
            const spread = spring({
              frame: frame - SPREAD_START - (idx - 1) * 1.6,
              fps: FPS,
              config: { damping: 14, stiffness: 160, mass: 0.8 },
              durationInFrames: 16,
            });
            const p = spread * (1 - merge);
            const z = -GAP_Z * idx * p;
            // diagonal offset makes the column visible (like viewing a column from the side)
            const dx = 64 * idx * p;
            const dy = -34 * idx * p;
            const op = (1 - (idx / N) * 0.8) * spread * (1 - merge);
            if (op <= 0.005) return null;
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, ${z.toFixed(2)}px)`,
                  opacity: op,
                }}
              >
                <Card w={520} h={340} seed={3} />
              </div>
            );
          })}
          {/* main body */}
          <div style={{ position: 'absolute', transform: `translateZ(0px) scale(${heroScale.toFixed(4)})` }}>
            <Card w={520} h={340} seed={3} style={{ boxShadow: '0 10px 36px rgba(31,28,23,0.22)' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
