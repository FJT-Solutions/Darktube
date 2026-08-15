// pill-chip-slot-cycle-handled — Chip Slot Cycle pill roller squeezes text apart (motion-lab final ported to native Remotion)
// White-background sentence "Your [chip] Handled": the word inside a dark pill rolls vertically (Sales→Workflow→Admin→Reports),
// gray ghost items peek above and below, the pill width smoothly follows word length, and the side text is naturally pushed apart and pulled back together.
// Design coordinates 480×270 (DesignStage scaled proportionally); parameter values are calibrated in this coordinate system.
import React, { useLayoutEffect, useRef, useState } from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const PILL_CHIP_SLOT_CYCLE_HANDLED_DURATION = 150; // 5000ms @30fps

const WORDS = [
  { w: 'Sales', e: '⚡' },
  { w: 'Workflow', e: '📈' },
  { w: 'Admin', e: '⚙️' },
  { w: 'Reports', e: '📄' },
];
const FONT = '700 22px -apple-system,system-ui,sans-serif';
// Fallback word widths (estimate used before the original effect.js mounts: char count × 13, plus 74 of pill padding);
// replaced on the first frame by useLayoutEffect offsetWidth measurements, pixel-identical to the original render
const FALLBACK_WIDTHS = WORDS.map((o) => o.w.length * 13 + 74);

// Static text on both sides ("Your" / "Handled")
const SIDE: React.CSSProperties = {
  color: '#15171d',
  fontWeight: 800,
  fontSize: 30,
  letterSpacing: -0.5,
  flex: 'none',
};

export const PillChipSlotCycleHandled: React.FC = () => {
  const t = useT();

  // Measure widths the same way as the original effect.js: hidden spans measure each word's offsetWidth (+74 pill padding),
  // measured once on first layout; before that, use the fallback estimate to avoid a first-frame flicker
  const measRef = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState<number[]>(FALLBACK_WIDTHS);
  useLayoutEffect(() => {
    const spans = measRef.current?.children;
    if (!spans) return;
    setWidths(
      WORDS.map((o, i) => ((spans[i] as HTMLElement).offsetWidth || o.w.length * 13) + 74),
    );
  }, []);

  // Three switches: 0.25 / 0.47 / 0.69, each advancing one slot with 0.12 inOutCubic
  let pos = 0;
  for (const s0 of [0.25, 0.47, 0.69]) pos += seg(t, s0, s0 + 0.12, E.inOutCubic);
  const ci = Math.min(WORDS.length - 1, Math.floor(pos));
  const frac = pos - ci;
  // Pill width interpolates current→next word, smoothly pushing the side text apart
  const chipW = lerp(frac, widths[ci], widths[Math.min(ci + 1, WORDS.length - 1)]);

  // Ghost items: the previous/next neighbors of the current word, shifting slightly with the roll and returning to base opacity on settle
  const near = Math.round(pos);
  const roll = (pos - near) * 48 * 0.5;
  const settle = 1 - Math.min(1, Math.abs(pos - near) * 3);
  const ghost = (top: number): React.CSSProperties => ({
    position: 'absolute',
    left: '50%',
    top,
    font: FONT,
    color: '#15171d',
    whiteSpace: 'nowrap',
    transform: `translateX(-50%) translateY(${-roll}px)`,
    opacity: 0.13 * (0.4 + settle * 0.6),
  });

  return (
    <DesignStage bg="#fbfbfd">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system,system-ui,sans-serif',
        }}
      >
        {/* Hidden measuring spans (equivalent to the meas in the original setup; not displayed/layout-affecting) */}
        <div ref={measRef} style={{ position: 'absolute', visibility: 'hidden' }}>
          {WORDS.map((o) => (
            <span key={o.w} style={{ whiteSpace: 'nowrap', font: FONT }}>
              {o.w}
            </span>
          ))}
        </div>
        <div style={SIDE}>Your</div>
        <div style={{ position: 'relative', flex: 'none' }}>
          {/* Dark pill: a 4-row word column rolling inside overflow hidden */}
          <div
            style={{
              position: 'relative',
              height: 48,
              width: chipW,
              margin: '0 14px',
              flex: 'none',
              borderRadius: 99,
              background: '#1a1c24',
              boxShadow: '0 8px 24px rgba(20,22,40,.22)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                transform: `translateY(${-pos * 48}px)`,
              }}
            >
              {WORDS.map(({ w, e }) => (
                <div
                  key={w}
                  style={{
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    paddingLeft: 18,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{e}</span>
                  <span style={{ font: FONT, color: '#fff' }}>{w}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Gray ghost items above and below the pill */}
          <div style={ghost(-38)}>{near > 0 ? WORDS[near - 1].w : ''}</div>
          <div style={ghost(58)}>{near < WORDS.length - 1 ? WORDS[near + 1].w : ''}</div>
        </div>
        <div style={SIDE}>Handled</div>
      </div>
    </DesignStage>
  );
};
