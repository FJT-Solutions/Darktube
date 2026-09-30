// tap-ripple-zoom —— App chat: tapping an AI bubble → ripple waves + screen focus zoom (mobile / interaction)
// Phone fades in → touch point presses the AI bubble → ripple rings expand and fade out + bubble scales down on press →
// whole phone focus-zooms in (spring, damping 15 / stiffness 80 / mass 1, scale 1→2.75) →
// settles into breathing. Touch point is a vector dot + double ripple rings, no Lottie. Deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const TAP_RIPPLE_ZOOM_DURATION = 150; // 5s @ 30fps

// Timeline (150f)
const PHONE_IN = 4;          // phone fades in
const TOUCH_START = 30;      // touch point appears, moving toward the bubble
const TOUCH_AT_BUBBLE = 44;  // touch point lands on the bubble (press begins)
const CLICK = 52;            // tap: ripple + press peak + zoom starts
const ZOOM_SETTLE = 120;     // zoom settles → breathing hold

export const TapRippleZoom: React.FC = () => {
  const f = useCurrentFrame();

  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0.85, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 20;

  // zoom: after the tap, spring pulls in toward the bubble area (2.75x), drifting down to bring the bubble (upper part of the screen) into focus
  const zoomSpring = spring({
    frame: Math.max(0, f - CLICK), fps: 30,
    config: { damping: 15, mass: 1, stiffness: 80 },
  });
  const zoomScale = interpolate(zoomSpring, [0, 1], [1, 2.75]);
  const zoomY = interpolate(zoomSpring, [0, 1], [0, 189]);

  // Press: 0→1→0 (bubble scales at the touch point)
  const press =
    interpolate(f, [CLICK, CLICK + 3], [0, 1], CL) -
    interpolate(f, [CLICK + 5, CLICK + 8], [0, 1], CL);

  // Ripple: two rings expand after CLICK (r 0→70, opacity 0.7→0)
  const rippleR = interpolate(f, [CLICK, CLICK + 22], [0, 70], CL);
  const rippleO = interpolate(f, [CLICK, CLICK + 22], [0.7, 0], CL);
  const rippleR2 = interpolate(f, [CLICK + 8, CLICK + 30], [0, 90], CL);
  const rippleO2 = interpolate(f, [CLICK + 8, CLICK + 30], [0.5, 0], CL);

  // Touch point movement (on-screen, over the AI bubble): f30–44 moves in, then stays at the bubble center
  const touchX = interpolate(f, [TOUCH_START, TOUCH_AT_BUBBLE], [200, 163], CL);
  const touchY = interpolate(f, [TOUCH_START, TOUCH_AT_BUBBLE], [290, 220], CL);
  const touchIn = interpolate(f, [TOUCH_START, TOUCH_START + 6], [0, 1], CL);
  const touchOut = interpolate(f, [CLICK + 10, CLICK + 16], [1, 0], CL);

  const breathe = f < ZOOM_SETTLE ? 1 : 1 + 0.008 * Math.sin(((f - ZOOM_SETTLE) / 48) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: `translate(-50%, -50%) translateY(${phoneY}px) scale(${zoomScale * breathe}) translateY(${zoomY}px)`,
          opacity: phoneIn,
        }}
      >
        <Phone width={350}>
          <div style={{ position: 'absolute', inset: 0, background: '#0a0a15', color: '#fff' }}>
            {/* Chat header */}
            <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#3a3a4a,#1c1c28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>T</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Team Sync</div>
                <div style={{ fontSize: 11, color: '#00d9ff' }}>online</div>
              </div>
            </div>

            {/* Message area: history + target AI bubble (high zIndex, serves as the visual focus after zoom) */}
            <div style={{ position: 'absolute', top: 64, bottom: 76, left: 0, right: 0, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10, boxSizing: 'border-box' }}>
              <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: '#1c6fe0', borderRadius: 18, borderTopRightRadius: 4, padding: '10px 14px', fontSize: 13.5 }}>Can we review the week's hours?</div>
              <div style={{ alignSelf: 'flex-start', maxWidth: '78%', background: '#1c1c28', borderRadius: 18, borderTopLeftRadius: 4, padding: '10px 14px', fontSize: 13.5, color: 'rgba(255,255,255,0.92)' }}>Sure — ask away.</div>
              <div
                style={{
                  alignSelf: 'flex-start', maxWidth: '82%', background: '#1c1c28',
                  borderRadius: 18, borderTopLeftRadius: 4, padding: '10px 14px', fontSize: 13.5,
                  color: 'rgba(255,255,255,0.92)', transform: `scale(${1 - press * 0.04})`,
                  border: press > 0 ? '1px solid rgba(0,217,255,0.6)' : '1px solid transparent',
                }}
              >
                The team logged 142 hours total across 8 members this week.
              </div>
            </div>

            {/* Input bar placeholder (hidden so it doesn't cover the focus after zoom) */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 76, borderTop: '1px solid rgba(255,255,255,0.08)' }} />
          </div>

          {/* Touch point + ripple */}
          {f >= TOUCH_START && (
            <div
              style={{
                position: 'absolute', left: touchX, top: touchY, width: 24, height: 24,
                marginLeft: -12, marginTop: -12, borderRadius: '50%', zIndex: 20,
                background: 'rgba(255,255,255,0.9)',
                boxShadow: '0 0 0 3px rgba(45,212,191,0.5)',
                transform: `scale(${1 - press * 0.3})`, opacity: touchIn * touchOut,
              }}
            />
          )}
          {f >= CLICK && (
            <>
              <div style={{ position: 'absolute', left: touchX, top: touchY, width: rippleR * 2, height: rippleR * 2, marginLeft: -rippleR, marginTop: -rippleR, borderRadius: '50%', border: '2px solid rgba(45,212,191,0.8)', opacity: rippleO, zIndex: 19 }} />
              <div style={{ position: 'absolute', left: touchX, top: touchY, width: rippleR2 * 2, height: rippleR2 * 2, marginLeft: -rippleR2, marginTop: -rippleR2, borderRadius: '50%', border: '1.5px solid rgba(45,212,191,0.5)', opacity: rippleO2, zIndex: 19 }} />
            </>
          )}
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
