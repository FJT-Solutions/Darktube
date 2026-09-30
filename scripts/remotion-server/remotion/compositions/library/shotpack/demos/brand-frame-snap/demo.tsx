// brand-frame-snap —— figma-devmode 0:28–0:32 (brand-frame-snap) + 0:43–0:47 (frame-color-flip)
// A thick brand-color frame appears before the content and wraps the full screen → a grayscale "screen-recording window" drops into place inside the frame →
// hold one beat → the whole frame hard-swaps blue→green on the same frame while the window content switches layouts on the same frame.
// One borderColor handles chapter navigation / status cue / brand exposure.
import React from 'react';
import { useCurrentFrame, spring, interpolate } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';

const FPS = 30;
const FIGMA_BLUE = '#3E7BFA';
const DEV_GREEN = '#1BC47D';
const FLIP_FRAME = 78; // same-frame hard color-flip moment

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const BrandFrameSnap: React.FC = () => {
  const f = useCurrentFrame();
  const mode: 'design' | 'dev' = f < FLIP_FRAME ? 'design' : 'dev';
  const frameColor = mode === 'design' ? FIGMA_BLUE : DEV_GREEN;

  // 1) The frame appears first: thickness grows from 0 to 44px (ease-out, first 18 frames)
  const frameGrow = easeOut(clamp01(f / 18));
  const frameW = 44 * frameGrow;

  // 2) The window drops into place inside the frame: from below + slightly shrunk, springing in (from frame 14)
  const drop = spring({ frame: f - 14, fps: FPS, config: { damping: 16, stiffness: 110, mass: 1 } });
  const winY = interpolate(drop, [0, 1], [560, 0]);
  const winS = interpolate(drop, [0, 1], [0.82, 1]);
  const winO = interpolate(drop, [0, 0.25], [0, 1], { extrapolateRight: 'clamp' });

  // 3) On the color-flip moment, a 2-frame white flash pulse + a slight frame-thickness bounce to emphasize the "gear shift"
  const sinceFlip = f - FLIP_FRAME;
  const flash = sinceFlip >= 0 && sinceFlip < 3 ? 0.55 - sinceFlip * 0.18 : 0;
  const snapPulse = sinceFlip >= 0 ? Math.exp(-sinceFlip * 0.22) * Math.cos(sinceFlip * 0.9) * 10 : 0;

  // Mode label
  const label = mode === 'design' ? 'DESIGN' : 'DEV MODE';

  return (
    <div style={{ width: 1920, height: 1080, background: '#161618', position: 'relative', overflow: 'hidden' }}>
      {/* Content area inside the frame */}
      <div style={{
        position: 'absolute', inset: frameW + snapPulse, background: G.bg,
        overflow: 'hidden', borderRadius: 8,
      }}>
        {/* Screen-recording window (window card with title bar) drops into place */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 1560, height: 830,
          transform: `translate(-50%, -50%) translateY(${winY}px) scale(${winS})`,
          opacity: winO,
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
          border: `2px solid ${G.border}`, background: G.panel,
        }}>
          {/* Window title bar */}
          <div style={{
            height: 52, background: '#e9e9e7', borderBottom: `2px solid ${G.line}`,
            display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', boxSizing: 'border-box',
          }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: G.bar }} />
            ))}
            <div style={{ marginLeft: 18, height: 12, width: 260, background: G.line, borderRadius: 6 }} />
            {/* Mode badge: swaps color and text on the same frame as the frame */}
            <div style={{
              marginLeft: 'auto', background: frameColor, color: '#fff',
              fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 800, fontSize: 15,
              letterSpacing: 1.5, padding: '6px 16px', borderRadius: 8,
              opacity: winO,
            }}>
              {label}
            </div>
          </div>
          {/* Window content: layout A→B swapped on the same frame as the color flip */}
          <div style={{ transform: 'scale(0.81)', transformOrigin: '0 0', width: 1920, height: 1080 }}>
            <FakeDashboard variant={mode === 'design' ? 'A' : 'B'} />
          </div>
        </div>
      </div>

      {/* Brand-color frame: 4 solid strips instead of a border, so the flip is a pure background hard-swap on the same frame */}
      {([
        { left: 0, top: 0, right: 0, height: frameW + snapPulse },
        { left: 0, bottom: 0, right: 0, height: frameW + snapPulse },
        { left: 0, top: 0, bottom: 0, width: frameW + snapPulse },
        { right: 0, top: 0, bottom: 0, width: frameW + snapPulse },
      ] as React.CSSProperties[]).map((pos, i) => (
        <div key={i} style={{ position: 'absolute', background: frameColor, ...pos }} />
      ))}

      {/* Mode corner badge on the frame (top-left, embedded in the frame band) */}
      <div style={{
        position: 'absolute', left: 70, top: 0, height: frameW + snapPulse,
        display: 'flex', alignItems: 'center',
        fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 800,
        fontSize: 22, letterSpacing: 3, color: '#ffffff',
        opacity: frameGrow,
      }}>
        {label}
      </div>

      {/* Color-flip white flash pulse */}
      {flash > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: '#ffffff', opacity: flash }} />
      )}
    </div>
  );
};
