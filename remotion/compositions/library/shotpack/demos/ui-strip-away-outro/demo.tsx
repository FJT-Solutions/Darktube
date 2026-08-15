// ui-strip-away-outro — framer-ai 33–36.5s
// In a full-screen grayscale "editor", the cursor clicks a highlighted Publish button → the UI strips away layer by layer in a staggered evaporation
// (each layer fades with a slight offset, from the perimeter to the center) → a black frame with only the button left → the button fades out and hands off to a wordmark.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from 'remotion';
import { G, Card } from '../../_fixtures/Fixtures';

const CLICK = 34; // click moment
// Evaporation layers (delayed after the click, perimeter goes first)
const STRIP = {
  sidebar: CLICK + 4,
  leftPanel: CLICK + 8,
  canvasCards: CLICK + 12,
  topbarEnds: CLICK + 16,
  canvasBg: CLICK + 20,
  toolbarShell: CLICK + 24,
};
const STRIP_DUR = 14;
const BTN_FADE = CLICK + 52;
const LOGO_IN = CLICK + 62;

// A layer's evaporation progress → {opacity, offset}
const useStrip = (frame: number, start: number, dx: number, dy: number) => {
  const p = interpolate(frame, [start, start + STRIP_DUR], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad), // accelerate on exit
  });
  return {
    opacity: 1 - p,
    transform: `translate(${dx * p}px, ${dy * p}px)`,
  };
};

export const UiStripAwayOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background: editor gray → black (dims to black as the canvasBg layer evaporates)
  const bgDark = interpolate(frame, [STRIP.canvasBg, STRIP.canvasBg + STRIP_DUR + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

  const sidebar = useStrip(frame, STRIP.sidebar, -140, 0);
  const leftPanel = useStrip(frame, STRIP.leftPanel, -90, 20);
  const topLeft = useStrip(frame, STRIP.topbarEnds, -80, -60);
  const topRight = useStrip(frame, STRIP.topbarEnds, 80, -60);
  const toolbarShell = useStrip(frame, STRIP.toolbarShell, 0, -50);
  const canvasFrame = useStrip(frame, STRIP.canvasBg, 0, 40);

  // Canvas cards evaporate in a stagger
  const cardStrip = (i: number) => useStripStatic(frame, STRIP.canvasCards + i * 3, (i % 2 ? 70 : -70), 50 + i * 10);

  // Button: click pulse + final fade out
  const press = spring({ frame: frame - CLICK, fps, config: { damping: 12, stiffness: 220 } });
  const pressScale = frame < CLICK ? 1 : 1 - 0.12 * Math.sin(Math.min(1, press) * Math.PI);
  const btnOp = interpolate(frame, [BTN_FADE, BTN_FADE + 12], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // During evaporation the button slides from the toolbar to the center of the screen, alone on the black frame
  const btnCenter = interpolate(frame, [STRIP.toolbarShell, STRIP.toolbarShell + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const btnX = 1560 + (960 - 88 - 1560) * btnCenter;
  const btnY = 30 + (540 - 30 - 30) * btnCenter;
  const btnScale = 1 + 0.5 * btnCenter;

  // Wordmark takes over
  const logoP = spring({ frame: frame - LOGO_IN, fps, config: { damping: 14, stiffness: 90 } });

  // Cursor moves toward the button
  const curX = interpolate(frame, [4, CLICK - 2], [820, 1636], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad),
  });
  const curY = interpolate(frame, [4, CLICK - 2], [640, 64], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad),
  });
  const curOp = interpolate(frame, [CLICK + 6, CLICK + 16], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: '#111110', overflow: 'hidden' }}>
      {/* Editor gray background (as an evaporable layer) */}
      <AbsoluteFill style={{ background: G.bg, opacity: 1 - bgDark }} />

      {/* Left sidebar (layers panel) */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 240, background: G.side, padding: '90px 24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 20, ...sidebar }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ height: 13, width: `${55 + ((i * 31) % 40)}%`, background: G.sideBar, borderRadius: 6 }} />
        ))}
      </div>

      {/* Right properties panel */}
      <div style={{ position: 'absolute', right: 0, top: 60, bottom: 0, width: 300, background: G.panel, borderLeft: `2px solid ${G.line}`, padding: 28, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 18, ...leftPanel }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <React.Fragment key={i}>
            <div style={{ height: 12, width: '45%', background: G.bar, borderRadius: 6 }} />
            <div style={{ height: 34, background: '#fff', border: `2px solid ${G.line}`, borderRadius: 8, boxSizing: 'border-box' }} />
          </React.Fragment>
        ))}
      </div>

      {/* Top toolbar left half (logo + tool chips) */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 760, height: 60, background: G.panel, borderBottom: `2px solid ${G.line}`, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', boxSizing: 'border-box', ...topLeft }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: G.mid }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ width: 30, height: 30, borderRadius: 8, background: G.line }} />
        ))}
      </div>
      {/* Top toolbar middle (title) */}
      <div style={{ position: 'absolute', left: 760, top: 0, right: 400, height: 60, background: G.panel, borderBottom: `2px solid ${G.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', ...toolbarShell }}>
        <div style={{ height: 14, width: 220, background: G.bar, borderRadius: 7 }} />
      </div>
      {/* Top toolbar right section base (Invite dummy button; Publish is rendered separately on top) */}
      <div style={{ position: 'absolute', right: 0, top: 0, width: 400, height: 60, background: G.panel, borderBottom: `2px solid ${G.line}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 14, padding: '0 24px', boxSizing: 'border-box', ...topRight }}>
        <div style={{ height: 36, width: 100, borderRadius: 18, border: `2px solid ${G.bar}`, boxSizing: 'border-box' }} />
      </div>

      {/* Canvas area: one browser-style large card + two small cards */}
      <div style={{ position: 'absolute', left: 320, top: 130, width: 1180, height: 850, ...canvasFrame }}>
        <div style={{ position: 'absolute', inset: 0, background: G.card, border: `2px solid ${G.border}`, borderRadius: 18, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ height: 46, borderBottom: `2px solid ${G.line}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: G.line }} />
            ))}
            <div style={{ marginLeft: 16, height: 20, width: 380, background: G.bg, borderRadius: 10 }} />
          </div>
        </div>
        {[0, 1, 2, 3].map((i) => {
          const s = cardStrip(i);
          return (
            <div key={i} style={{ position: 'absolute', left: 70 + (i % 2) * 560, top: 120 + Math.floor(i / 2) * 340, ...s }}>
              <Card w={480} h={280} seed={i + 2} />
            </div>
          );
        })}
      </div>

      {/* Publish button (highlighted layer, exits last) */}
      <div
        style={{
          position: 'absolute',
          left: btnX,
          top: btnY,
          width: 176,
          height: 44,
          opacity: btnOp,
          transform: `scale(${pressScale})`,
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: 176 * btnScale,
            height: 44 * btnScale,
            marginLeft: -((176 * btnScale - 176) / 2),
            marginTop: -((44 * btnScale - 44) / 2),
            borderRadius: 22 * btnScale,
            background: '#f2f2f0',
            boxShadow: `0 0 ${30 + 40 * btnCenter}px rgba(255,255,255,${0.25 + 0.3 * btnCenter * bgDark})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 700,
            fontSize: 20 * btnScale,
            color: '#161615',
          }}
        >
          Publish
        </div>
      </div>

      {/* Wordmark takes over */}
      {frame >= LOGO_IN && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              opacity: logoP,
              transform: `scale(${0.86 + 0.14 * logoP})`,
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontWeight: 800,
              fontSize: 110,
              letterSpacing: 6,
              color: '#f2f2f0',
            }}
          >
            WORDMARK
          </div>
        </AbsoluteFill>
      )}

      {/* Cursor */}
      <svg width={40} height={44} viewBox="0 0 20 22" style={{ position: 'absolute', left: curX, top: curY, opacity: curOp, zIndex: 40 }}>
        <path d="M2 1 L2 17 L6.5 13.2 L9.4 20 L12.4 18.7 L9.5 12 L15 11.6 Z" fill={G.ink} stroke="#fff" strokeWidth="1.4" />
      </svg>
    </AbsoluteFill>
  );
};

// Static version outside the hook rules (for use inside map)
const useStripStatic = (frame: number, start: number, dx: number, dy: number) => {
  const p = interpolate(frame, [start, start + STRIP_DUR], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });
  return {
    opacity: 1 - p,
    transform: `translate(${dx * p}px, ${dy * p}px)`,
  };
};
