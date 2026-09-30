// glass-pill-dictation-typing — Glass Pill Dictation voice dictation in a glass capsule (motion-lab final ported to native Remotion)
// On a pure-black background, one fixed-width glass capsule: pops in at ~1.25x then eases down into place;
// inside, an accent-colored light (ACCENT variable, purple by default) is graded from dark on the left
// to bright on the right; the caret appears first, then the placeholder text types out
// "Speak or type here" while the light gradually fades with typing progress, settling into a neutral dark glass bar;
// on the right is a rounded-square outline holding a vertical-bar waveform icon — the quietest beat of the whole shot.
// Design coordinates 480×270 (DesignStage scales uniformly); parameter values are calibrated in this coordinate system.
import React, { useLayoutEffect, useRef, useState } from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const GLASS_PILL_DICTATION_TYPING_DURATION = 50; // 1650ms @30fps

// Template accent: replace this single variable with the project brand color (shared by the inner light and the outer glow)
const ACCENT_RGB = '146,126,212';
const UI = '-apple-system,system-ui,"Segoe UI",sans-serif';
const PH = 46; // capsule height
const ICON = 30; // right-side waveform icon square size
const BASE = [13, 7, 10, 6, 9]; // base bar heights (dictation icon, taller on the left)
const TEXT = 'Speak or type here'; // placeholder, length matched to the source (19→18 chars), typing rhythm unchanged

export const GlassPillDictationTyping: React.FC = () => {
  const t = useT();

  // Fixed width: the source capsule is about 2x the full-sentence text width and doesn't stretch with the words — measure the full width once on mount
  const measRef = useRef<HTMLDivElement>(null);
  const [textW, setTextW] = useState(180); // fallback estimate, overwritten by the useLayoutEffect measurement (before the first frame draws)
  useLayoutEffect(() => {
    if (measRef.current) setTextW(measRef.current.offsetWidth);
  }, []);
  const PW = Math.round(textW + 168);

  // Entrance: appears fast slightly enlarged (~1.25x), eases down into place within ~0.45s
  const s = lerp(seg(t, 0, 0.22, E.outCubic), 1.25, 1);
  // Typing: caret leads (~t0.03), characters fill in at a steady pace from t0.06→0.73, then hold at the tail
  const n = Math.floor(seg(t, 0.06, 0.73) * TEXT.length + 1e-6);
  const caretO = seg(t, 0.025, 0.045) * (1 - seg(t, 0.75, 0.8));
  // Accent light fades out with typing progress; also trims a bit of excess border brightness
  const g = 1 - seg(t, 0.08, 0.76, E.inOutQuad);

  return (
    <DesignStage bg="#000">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          overflow: 'hidden',
          // Shadow grading: the source's x264 encoded the outer glow's dark tail (1–2 levels of gray)
          // to pure 0, so this render's glow tail reads one level brighter and trails further.
          // contrast(1.008) is equivalent to subtracting ~1 level at the black end
          // (255*0.008/2≈1) while leaving midtones alone, calibrated against comparison frames (f1 0.9205→0.9844).
          filter: 'contrast(1.008)',
        }}
      >
        {/* Centering via translateX: when PW is odd the center lands on a .5 half-pixel; left/flex would
            be rounded by layout and drift 0.5 design px; the transform matrix doesn't snap, so it aligns
            pixel-perfectly with the source center */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: (270 - PH) / 2,
            height: PH,
            width: PW,
            borderRadius: PH / 2,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px 0 16px',
            overflow: 'hidden',
            background: '#0d0d13',
            willChange: 'transform,opacity',
            opacity: seg(t, 0, 0.025),
            transform: `translateX(${(480 - PW) / 2}px) scale(${s})`,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,${0.16 + 0.1 * g}), inset 0 14px 22px rgba(255,255,255,${0.03 + 0.04 * g}), 0 0 ${26 * g}px rgba(${ACCENT_RGB},${0.28 * g})`,
          }}
        >
          {/* Embedded accent light: dark-to-bright gradient that fades with typing progress (source light is inside the capsule, no outer halo) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: g,
              background: `linear-gradient(90deg,rgba(${ACCENT_RGB},0) 0%,rgba(${ACCENT_RGB},.35) 42%,rgba(${ACCENT_RGB},.95) 100%)`,
            }}
          />
          <div
            style={{
              position: 'relative',
              font: `400 21px ${UI}`,
              color: '#f4f4f5',
              whiteSpace: 'pre',
              letterSpacing: 0.3,
              flex: 'none',
            }}
          >
            {TEXT.slice(0, n)}
          </div>
          <div
            style={{
              position: 'relative',
              width: 2,
              height: 23,
              borderRadius: 1,
              background: '#eaeaec',
              marginLeft: 2,
              flex: 'none',
              opacity: caretO,
            }}
          />
          <div
            style={{
              position: 'relative',
              marginLeft: 'auto',
              width: ICON,
              height: ICON,
              borderRadius: 9,
              boxSizing: 'border-box',
              border: '1.5px solid rgba(255,255,255,.5)',
              background: 'rgba(255,255,255,.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            {/* Waveform bars breathe slightly (source is almost still, just a micro-motion) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2.2, height: '100%' }}>
              {BASE.map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 1.5,
                    borderRadius: 1.5,
                    background: '#ececee',
                    height: h + 1.6 * Math.sin(t * 18 + i * 1.7),
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        {/* Hidden measuring bar: same font and tracking as the body text, measures the full sentence width once to set the capsule's fixed width */}
        <div
          ref={measRef}
          style={{
            position: 'absolute',
            visibility: 'hidden',
            whiteSpace: 'pre',
            font: `400 21px ${UI}`,
            letterSpacing: 0.3,
            top: -999,
          }}
        >
          {TEXT}
        </div>
      </div>
    </DesignStage>
  );
};
