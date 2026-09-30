// logo-sting-button — closing button shot (button ending)
// The previous shot fades to black → a black frame → the LOGO enters and holds (the viewer thinks it's over) → a hard cut to a 12f UI close-up easter egg →
// then a hard cut back to the LOGO frozen on black. Rhythm is everything: the easter-egg beat is as brief as a blink. The ending holds true stillness for ≥40f.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';

// Timeline (30fps, 142f total)
const T = {
  shotAEnd: 24,     // 0–24f previous shot (B), f14–24 dims to pure black
  darkenStart: 14,
  blackEnd: 30,     // 24–30f black frame, 6f
  logoInEnd: 40,    // 30–40f LOGO entrance, 10f
  holdEnd: 70,      // 40–70f holds for 30f (the viewer thinks it's over)
  eggEnd: 82,       // 70–82f easter-egg hard cut, 12f
  total: 142,       // 82–142f LOGO on black in true stillness, 60f
};

const LogoLockup: React.FC<{ opacity: number; scale: number }> = ({ opacity, scale }) => (
  <div style={{
    width: 1920, height: 1080, background: '#000',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 44,
      opacity, transform: `scale(${scale})`,
    }}>
      <div style={{
        width: 120, height: 120, borderRadius: 28, background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* A small black mark inside the square so the plain white block doesn't look too empty */}
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#000' }} />
      </div>
      <div style={{
        fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 800,
        fontSize: 90, color: '#fff', letterSpacing: 2,
      }}>
        ACME
      </div>
    </div>
  </div>
);

export const LogoStingButton: React.FC = () => {
  const frame = useCurrentFrame();

  // --- Segment 1: previous shot (FakeDashboard B) dims to black ---
  if (frame < T.shotAEnd) {
    const dark = interpolate(frame, [T.darkenStart, T.shotAEnd - 1], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: Easing.in(Easing.cubic),
    });
    return (
      <div style={{ width: 1920, height: 1080, background: '#000', position: 'relative', overflow: 'hidden' }}>
        <FakeDashboard variant="B" />
        <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: dark }} />
      </div>
    );
  }

  // --- Segment 2: black frame, 6f ---
  if (frame < T.blackEnd) {
    return <div style={{ width: 1920, height: 1080, background: '#000' }} />;
  }

  // --- Segment 4: easter-egg hard cut, 12f (variant A button area cropped at 2.4x + a corner dot tick flashing for 2f) ---
  if (frame >= T.holdEnd && frame < T.eggEnd) {
    const egg = frame - T.holdEnd; // 0..11
    // Tick dot: lit for 2f during frames 4–5, like a blink
    const tickOn = egg >= 4 && egg < 6;
    return (
      <div style={{ width: 1920, height: 1080, background: '#ececea', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          // 2.4x zoom: pans the "button row" at the bottom of the first card (avatar circle + text bars) to the center of the frame
          // Original coordinates (839, 531) (avatar circle + text bars at the bottom of the 2nd-column card) → screen center (960, 540)
          // Selecting that column's card pushes the dark sidebar on the left fully out of frame, making the close-up cleaner
          transform: 'translate(-1054px, -734px) scale(2.4)', transformOrigin: '0 0',
        }}>
          <FakeDashboard variant="A" />
        </div>
        {tickOn && (
          <div style={{
            position: 'absolute', right: 90, bottom: 80,
            width: 56, height: 56, borderRadius: 28, background: '#2f2f2f',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff' }} />
          </div>
        )}
      </div>
    );
  }

  // --- Segment 3 + 5: LOGO on black (entrance → hold → frozen ending after the easter egg, true stillness) ---
  const opacity = interpolate(frame, [T.blackEnd, T.logoInEnd], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const scale = interpolate(frame, [T.blackEnd, T.logoInEnd], [0.96, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return <LogoLockup opacity={opacity} scale={scale} />;
};
