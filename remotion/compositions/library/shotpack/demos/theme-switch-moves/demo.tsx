// Combination: command palette × light/dark sweep (palette-theme-ripple)
// FakeDashboard still → full-screen dim + blur → ⌘K panel drops in → simulated "dark" input
// (gray-block characters pop in one by one) → on the Enter frame the panel shrinks over 5f
// into a single bright dot → the dark sweep boundary expands outward **from that bright dot**
// (clip-path circle expansion + bright edge ring), sweeping the whole UI into the dark version → true stillness.
// Combination linchpin: the sweep origin must be the panel's collapse point (960,470);
// the collapse-end frame = the sweep-start frame (RIPPLE=73) — starting anywhere else breaks the causality.
// Keyframes: 0–15 light stillness → 15–22 dim + blur → 22–30 panel drop (overshoot) →
// 38–62 per-character input d/a/r/k → 68 Enter → 68–73 panel shrinks to a bright dot → 73–95 sweep
// expands → 95–170 dark true stillness (75f). Dark version is a local DarkDashboard hand-inverted from the G palette.
// Frame-deterministic, no randomness.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';

const DIM_START = 15;
const PANEL_IN = 22;
const TYPE_FRAMES = [38, 46, 54, 62]; // d a r k
const ENTER = 68;
const RIPPLE = 73; // panel collapse-end frame = sweep-start frame (combination linchpin)
const RIPPLE_END = 95;
const ORIGIN = { x: 960, y: 470 }; // panel center = collapse point = sweep circle center
const MAX_R = 1250;

// Dark version hand-inverted from the G palette
const D = {
  bg: '#1a1a1c', panel: '#232325', line: '#3a3a38', bar: '#6f6f6d',
  ink: '#e8e8e6', mid: '#7a7a78', card: '#262628', border: '#454543',
  side: '#0e0e10', sideBar: '#555553',
};

const DarkCard: React.FC<{ seed: number }> = ({ seed }) => {
  const titleW = 45 + ((seed * 37) % 40);
  const lines = 2 + (seed % 3);
  return (
    <div style={{ width: '100%', height: '100%', background: D.card, border: `2px solid ${D.border}`, borderRadius: 14, padding: 18, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ height: 16, width: `${titleW}%`, background: D.bar, borderRadius: 8 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ height: 10, width: `${88 - i * 14 - (seed % 5) * 3}%`, background: D.line, borderRadius: 5 }} />
      ))}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ width: 26, height: 26, borderRadius: 13, background: D.mid }} />
        <div style={{ height: 10, width: 64, background: D.line, borderRadius: 5 }} />
      </div>
    </div>
  );
};

// Dark version pixel-identical to FakeDashboard variant A — the sweep reads as "skinning the same UI"
const DarkDashboard: React.FC = () => (
  <div style={{ width: 1920, height: 1080, background: D.bg, display: 'flex' }}>
    <div style={{ width: 220, background: D.side, padding: '28px 22px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#8a8a88' }} />
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ height: 12, width: `${60 + ((i * 29) % 35)}%`, background: D.sideBar, borderRadius: 6 }} />
      ))}
    </div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 72, background: D.panel, borderBottom: `2px solid ${D.line}`, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 20, boxSizing: 'border-box' }}>
        <div style={{ height: 18, width: 180, background: D.bar, borderRadius: 9 }} />
        <div style={{ marginLeft: 'auto', height: 36, width: 320, background: D.card, border: `2px solid ${D.line}`, borderRadius: 18, boxSizing: 'border-box' }} />
        <div style={{ width: 36, height: 36, borderRadius: 18, background: D.mid }} />
      </div>
      <div style={{ flex: 1, padding: 36, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '1fr', gap: 28, boxSizing: 'border-box' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <DarkCard key={i} seed={i + 1} />
        ))}
      </div>
    </div>
  </div>
);

export const PaletteThemeRipple: React.FC = () => {
  const f = useCurrentFrame();

  // Dim + blur: active during the panel phase; after the sweep the light layer is unmounted
  const dim = interpolate(f, [DIM_START, DIM_START + 7], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Panel drop (back-out overshoot)
  const panelT = interpolate(f, [PANEL_IN, PANEL_IN + 8], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.9)),
  });
  // Shrinks to a point over 5f after Enter (ease-in, faster as it shrinks)
  const shrink = interpolate(f, [ENTER, RIPPLE], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const panelMounted = f >= PANEL_IN && f < RIPPLE;
  const panelScale = f < ENTER ? panelT : shrink;
  const panelDropY = f < ENTER ? interpolate(panelT, [0, 1], [-120, 0]) : 0;

  // Per-character input: each gray block pops in within 4f
  const charScale = (i: number) =>
    interpolate(f, [TYPE_FRAMES[i], TYPE_FRAMES[i] + 4], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: Easing.out(Easing.back(2.2)),
    });
  const typedCount = TYPE_FRAMES.filter((t) => f >= t).length;

  // Sweep: circle expands from the collapse point (ease-out, fast-then-slow) with a bright ring at the edge
  const r = interpolate(f, [RIPPLE, RIPPLE_END], [12, MAX_R], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const rippling = f >= RIPPLE && f < RIPPLE_END;
  const done = f >= RIPPLE_END;
  const ringOpacity = interpolate(f, [RIPPLE, RIPPLE_END], [0.95, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Bright dot: highlight core ±3f around the collapse (pins "collapse point = sweep origin" for the viewer)
  const dotOn = f >= ENTER + 2 && f < RIPPLE + 3;

  return (
    <div style={{ width: 1920, height: 1080, background: D.bg, position: 'relative', overflow: 'hidden' }}>
      {/* Light layer: conditionally unmounted after the sweep (true stillness) */}
      {!done && (
        <div style={{ position: 'absolute', inset: 0, filter: dim > 0 ? `brightness(${1 - dim * 0.45}) blur(${dim * 6}px)` : 'none' }}>
          <FakeDashboard variant="A" />
        </div>
      )}

      {/* Dark layer: revealed by a circular clip from the collapse point; full-bleed with no clip once done */}
      {(rippling || done) && (
        <div style={{ position: 'absolute', inset: 0, clipPath: done ? 'none' : `circle(${r}px at ${ORIGIN.x}px ${ORIGIN.y}px)` }}>
          <DarkDashboard />
        </div>
      )}

      {/* Sweep bright edge ring */}
      {rippling && (
        <div
          style={{
            position: 'absolute',
            left: ORIGIN.x - r,
            top: ORIGIN.y - r,
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            border: '5px solid rgba(255,255,255,0.9)',
            opacity: ringOpacity,
            boxShadow: '0 0 40px rgba(255,255,255,0.5), inset 0 0 30px rgba(255,255,255,0.35)',
          }}
        />
      )}

      {/* Collapse bright dot */}
      {dotOn && (
        <div
          style={{
            position: 'absolute',
            left: ORIGIN.x - 11,
            top: ORIGIN.y - 11,
            width: 22,
            height: 22,
            borderRadius: 11,
            background: '#ffffff',
            boxShadow: '0 0 46px 14px rgba(255,255,255,0.85)',
          }}
        />
      )}

      {/* ⌘K command palette */}
      {panelMounted && (
        <div
          style={{
            position: 'absolute',
            left: ORIGIN.x - 340,
            top: ORIGIN.y - 130 + panelDropY,
            width: 680,
            height: 260,
            transform: `scale(${Math.max(panelScale, 0.001)})`,
            transformOrigin: 'center center',
            background: G.card,
            border: `2px solid ${G.border}`,
            borderRadius: 18,
            boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
            padding: 24,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Input row: ⌘K badge + per-character gray blocks */}
          <div style={{ height: 62, border: `2px solid ${G.line}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px', boxSizing: 'border-box' }}>
            <div style={{ padding: '6px 12px', borderRadius: 8, background: G.side, color: '#fff', fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 800, fontSize: 22 }}>⌘K</div>
            {TYPE_FRAMES.map((_, i) => (
              <div key={i} style={{ width: 30, height: 30, borderRadius: 6, background: G.ink, transform: `scale(${charScale(i)})` }} />
            ))}
            {/* Caret: deterministic blink (flips every 8f) */}
            <div style={{ width: 4, height: 34, background: G.ink, opacity: Math.floor(f / 8) % 2 === 0 ? 1 : 0 }} />
          </div>
          {/* Result rows: first row darkens once input completes to indicate selection */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 44, borderRadius: 10, background: i === 0 && typedCount === 4 ? G.line : G.panel, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', boxSizing: 'border-box' }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: G.mid }} />
              <div style={{ height: 12, width: `${34 + i * 16}%`, background: G.bar, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
