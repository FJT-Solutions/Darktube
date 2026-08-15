// app-transition-showcase —— In-app transitions chained: push / zoom / morph (mobile / transition)
// Phone fades in → each of the three transitions takes about 58f: ① push (list → detail, new screen slides in from the right) ② zoom
// (detail → form, whole screen scales up in the transition) ③ morph (form → completion card, content transforms in place) →
// settles into breathing. The screens are grayscale vector pages, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const APP_TRANSITION_SHOWCASE_DURATION = 222; // 7.4s @ 30fps

// Timeline (222f)
const PHONE_IN = 4;
const PUSH_IN = 24;       // ① push: list → detail (48f)
const PUSH_END = 72;
const ZOOM_IN = 88;       // ② zoom: detail → form (48f)
const ZOOM_END = 136;
const MORPH_IN = 152;     // ③ morph: form → completion card (44f)
const MORPH_END = 196;
const HOLD = 196;         // settled → breathing

export const AppTransitionShowcase: React.FC = () => {
  const f = useCurrentFrame();
  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0.85, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 20;

  // ① push: new screen translateX 100%→0, old screen 0→-30% at the same speed
  const pushIn = interpolate(f, [PUSH_IN, PUSH_IN + 40], [0, 1], { easing: Easing.out(Easing.cubic), ...CL });
  // ② zoom: detail screen scales 1→1.4 and fades out, form screen scales up from 0.85 to 1 and fades in
  const zoomIn = interpolate(f, [ZOOM_IN, ZOOM_IN + 40], [0, 1], { easing: Easing.out(Easing.cubic), ...CL });
  // ③ morph: form content morphs in place into the completion card (card size/radius transition + content swap)
  const morphIn = interpolate(f, [MORPH_IN, MORPH_IN + 36], [0, 1], { easing: Easing.out(Easing.cubic), ...CL });

  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  const listRows = [70, 150, 110, 130]; // list row widths

  return (
    <AbsoluteFill style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translateY(${phoneY}px) scale(${breathe})`, opacity: phoneIn }}>
        <Phone width={350}>
          <div style={{ position: 'absolute', inset: 0, background: '#f4f4f2', color: '#18181b', overflow: 'hidden' }}>
            {/* Screen A: list (base screen, pushed away during push) */}
            <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-pushIn * 30}%)`, opacity: f < ZOOM_IN ? 1 : 0 }}>
              <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: 17, fontWeight: 800 }}>Projects</div>
              <div style={{ padding: '6px 16px' }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 14, padding: '12px', marginBottom: 10, boxShadow: '0 3px 10px rgba(0,0,0,0.04)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: i % 2 ? '#d9d9de' : '#cfcfd4', flexShrink: 0 }} />
                    <div style={{ width: listRows[i], height: 10, borderRadius: 5, background: '#e6e6ea' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Screen B: detail (slides in during push → scales up and fades out during zoom) */}
            <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - pushIn) * 100}%) scale(${1 + (1 - zoomIn) * 0.4})`, opacity: pushIn * (1 - zoomIn) }}>
              <div style={{ height: 160, background: '#26262b' }} />
              <div style={{ margin: '-24px 16px 0' }}>
                <div style={{ background: '#fff', borderRadius: 18, padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>Project detail</div>
                  <div style={{ width: '90%', height: 10, borderRadius: 5, background: '#e6e6ea', marginTop: 12 }} />
                  <div style={{ width: '70%', height: 10, borderRadius: 5, background: '#e6e6ea', marginTop: 8 }} />
                  <div style={{ width: '80%', height: 10, borderRadius: 5, background: '#e6e6ea', marginTop: 8 }} />
                </div>
              </div>
            </div>

            {/* Screen C: form (zooms in → morphs into the completion card) */}
            <div style={{ position: 'absolute', inset: 0, transform: `scale(${0.85 + 0.15 * zoomIn})`, opacity: zoomIn * (1 - morphIn) }}>
              <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: 17, fontWeight: 800 }}>Edit</div>
              <div style={{ margin: '10px 16px 0' }}>
                {[0, 1].map((i) => (
                  <div key={i} style={{ height: 54, borderRadius: 12, border: '1.5px solid #d8d8dc', background: '#fff', marginBottom: 12, padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 14, color: '#8a8a92' }}>Field {i + 1}</div>
                ))}
                <div style={{ height: 54, borderRadius: 12, background: '#18181b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>Save</div>
              </div>
            </div>

            {/* Screen D: completion card (morphs in place from the form) */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: morphIn, transform: `scale(${morphIn})` }}>
              <div style={{ width: 280, borderRadius: 22, background: '#fff', padding: '30px 24px', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#26262b', color: '#fff', fontSize: 30, lineHeight: '64px', margin: '0 auto 16px' }}>✓</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>Changes saved</div>
                <div style={{ fontSize: 13, color: '#8a8a92', marginTop: 8 }}>Project updated successfully</div>
              </div>
            </div>
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
