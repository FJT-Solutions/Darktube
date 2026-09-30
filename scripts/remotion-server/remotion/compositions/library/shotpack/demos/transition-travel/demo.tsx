import React, { useId } from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';

// letterform-zoom (transition): a new page shows through the giant "DASH" letterforms'
// counters as the camera zooms hard into the triangular counter of the letter A; the
// instant the hole fills the screen, the new page takes over and leftover strokes slide
// off-frame. Structure: FakeDashboard B sits full-screen underneath (slight dolly); the
// "beige plate" on top uses an SVG <mask> (white base + black text) to punch a hole at
// the letterform — B shows through the hole; the whole plate group scales exponentially
// 1→28 (60f, slow for the first 20f, steep for the last 40f) with transform-origin aimed
// at the center of A's counter. Once scale crosses the threshold, the plate exits fast
// (mask removed) and B takes over full-screen.

const FS = 560; // title font size
// A counter (triangular hole) center: estimated from Helvetica Bold metrics —
// "DASH" total width ≈ 2.833em, centered start x≈167, A spans 571–975 → counter center x≈773;
// baseline y=741 (cap centered), counter center ≈ 0.42em above the baseline → y≈508.
const ORIGIN = { x: 773, y: 508 };
const BASELINE = 741;
const ZOOM_MAX = 28;

const titleFont: React.CSSProperties = {
  fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
  fontWeight: 900,
  fontSize: FS,
};

export const LetterformZoom: React.FC = () => {
  const frame = useCurrentFrame();
  // Mask ID generated per instance so multiple instances don't collide (useId's «:» is invalid in url(), needs sanitizing)
  const cutId = `lfz-cut-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // 0–25f establish hold; 25–85f zoom in. Slow-start bezier layered over an exponential scale = slow first, steep later
  const t = interpolate(frame, [25, 85], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.6, 0, 0.85, 0.5),
  });
  const scale = Math.pow(ZOOM_MAX, t); // exponential advance: an equal-ratio "passing through" speed feel

  // scale crosses the threshold (hole already fills the mid-frame) → leftover plate strokes fly out while the plate exits (mask removed)
  const plateOpacity = interpolate(scale, [15, 24], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Speed blur: the intended visual blur rises with the zoom; CSS filter gets scaled up by
  // transform, so divide by scale to compensate
  const visBlur = interpolate(t, [0, 0.45, 1], [0, 1.5, 16], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blurCss = visBlur / scale;

  // New page slight dolly: nudged along 1→1.1 during the zoom, then settles back to 1 within 25f after takeover (recovery)
  const bScale =
    frame < 85
      ? interpolate(t, [0, 1], [1, 1.1])
      : interpolate(frame, [85, 110], [1.1, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      {/* New page: shows only through the counters first, full-screen after takeover (110–140f stillness to finish) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${bScale})`,
          transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`,
        }}
      >
        <FakeDashboard variant="B" />
      </div>

      {/* Beige plate (letterforms punched out) + letter outline + subtitle bars: the whole group zooms exponentially, then flies off-frame */}
      {plateOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`,
            opacity: plateOpacity,
            filter: blurCss > 0.02 ? `blur(${blurCss}px)` : undefined,
          }}
        >
          <svg
            width={1920}
            height={1080}
            viewBox="0 0 1920 1080"
            style={{ position: 'absolute', inset: 0, display: 'block' }}
          >
            <defs>
              <mask id={cutId}>
                <rect width={1920} height={1080} fill="#fff" />
                <text
                  x={960}
                  y={BASELINE}
                  textAnchor="middle"
                  fill="#000"
                  style={titleFont}
                >
                  DASH
                </text>
              </mask>
            </defs>
            <rect width={1920} height={1080} fill={G.bg} mask={`url(#${cutId})`} />
            {/* Thin letter outline: keeps the hole's silhouette legible against the beige */}
            <text
              x={960}
              y={BASELINE}
              textAnchor="middle"
              fill="none"
              stroke={G.ink}
              strokeWidth={3}
              opacity={0.3}
              style={titleFont}
            >
              DASH
            </text>
          </svg>
          {/* Subtitle gray bars: flung off-frame with the plate, reinforcing the "page remnant" feel */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 812,
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <div style={{ width: 240, height: 16, background: G.bar, borderRadius: 8 }} />
            <div style={{ width: 130, height: 16, background: G.line, borderRadius: 8 }} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
