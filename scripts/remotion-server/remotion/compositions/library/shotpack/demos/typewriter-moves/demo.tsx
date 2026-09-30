// terminal-typewriter — terminal typewriter trigger
// A dark terminal window centered; "$ acme deploy --prod" is typed out character by character (2f/char, frame-deterministic
// substring), with a block cursor blinking in a 12f square wave → rests 12f after typing → on the enter frame: the whole scene
// pushes in over 6f with Easing.in(cubic), scale 1→3.2 driving toward the command line (blur added on the last 2f) hard-cutting to
// FakeDashboard A full-screen, settling 1.06→1 over 4f. Ends with ≥40f of true stillness.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';

const CMD = 'acme deploy --prod';

// Timeline (30fps, 145f total)
const T = {
  typeStart: 10,                       // starts typing
  typeEnd: 10 + CMD.length * 2,        // 46: 18 chars × 2f
  enter: 58,                           // enter after a 12f rest
  pushEnd: 64,                         // 6f push ends, hard-cut frame
  settleEnd: 68,                       // dashboard settles 1.06→1 over 4f
  total: 145,                          // true stillness from f68, 77f
};

// Terminal window geometry
const TW = 1100;
const TH = 620;
const TL = (1920 - TW) / 2; // 410
const TT = (1080 - TH) / 2; // 230
const TITLEBAR = 52;
const PAD = 34;
// Command-line baseline (push-in focus): center of the second text line below the title bar
const FOCUS_X = 960;
const FOCUS_Y = TT + TITLEBAR + PAD + 92; // ≈ 408

const TerminalWindow: React.FC<{ chars: number; cursorOn: boolean }> = ({ chars, cursorOn }) => (
  <div style={{
    width: TW, height: TH, background: '#1e1e1c', borderRadius: 14,
    boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
    overflow: 'hidden', boxSizing: 'border-box',
  }}>
    {/* Title bar: three-dot window controls (grayscale) */}
    <div style={{
      height: TITLEBAR, background: '#2a2a28', borderBottom: '1px solid #3a3a38',
      display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px',
      boxSizing: 'border-box',
    }}>
      {['#6a6a68', '#8f8f8d', '#b5b5b3'].map((c, i) => (
        <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
      ))}
      <div style={{ margin: '0 auto', height: 10, width: 200, background: '#4a4a48', borderRadius: 5 }} />
      <div style={{ width: 72 }} />
    </div>
    {/* Content area */}
    <div style={{
      padding: PAD, fontFamily: 'Menlo, Consolas, monospace', fontSize: 40,
      color: '#d8d8d6', lineHeight: 1.5,
    }}>
      {/* One line of history output as context */}
      <div style={{ color: '#7a7a78', fontSize: 32, marginBottom: 18 }}>~/acme-app (main)</div>
      <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'pre' }}>
        <span style={{ color: '#9f9f9d' }}>{'$ '}</span>
        <span>{CMD.substring(0, chars)}</span>
        <span style={{
          display: 'inline-block', width: 24, height: 48, marginLeft: 4,
          background: '#d8d8d6', opacity: cursorOn ? 1 : 0,
        }} />
      </div>
    </div>
  </div>
);

export const TerminalTypewriter: React.FC = () => {
  const frame = useCurrentFrame();

  // Frame-deterministic typing: 2f/char
  const chars = Math.min(CMD.length, Math.max(0, Math.floor((frame - T.typeStart) / 2)));

  // Block cursor blinks in a 12f square wave throughout
  const cursorOn = frame % 12 < 6;

  // Enter push-in: whole scene scale 1→3.2 over 6f Easing.in(cubic), driving toward the command line
  const pushScale = interpolate(frame, [T.enter, T.pushEnd], [1, 3.2], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  // Motion blur on the last 2f (f62–f64); after the hard cut the veil is removed = conditional mount
  const pushBlur = interpolate(frame, [T.pushEnd - 2, T.pushEnd], [0, 10], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Hard cut: from f64 the terminal scene unmounts entirely and the dashboard mounts
  const cut = frame >= T.pushEnd;

  // Dashboard settle: 1.06→1 over 4f
  const dashScale = interpolate(frame, [T.pushEnd, T.settleEnd], [1.06, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      {!cut ? (
        <div style={{
          width: 1920, height: 1080,
          transform: `scale(${pushScale})`,
          transformOrigin: `${FOCUS_X}px ${FOCUS_Y}px`,
          ...(pushBlur > 0 ? { filter: `blur(${pushBlur}px)` } : {}),
        }}>
          <div style={{ position: 'absolute', left: TL, top: TT }}>
            <TerminalWindow chars={chars} cursorOn={cursorOn} />
          </div>
        </div>
      ) : (
        <div style={{
          width: 1920, height: 1080,
          transform: `scale(${dashScale})`,
          transformOrigin: '960px 540px',
        }}>
          <FakeDashboard variant="A" />
        </div>
      )}
    </div>
  );
};
