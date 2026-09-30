// notification-banner-drop —— Top notification banner drops in with a spring → tapping expands it into a conversation page (mobile / interaction)
// Phone fades in → inbox conversation list staggers into view → white notification banner springs down from the top (with overshoot), its content lines reveal →
// finger taps the banner → banner scales up and fades out + conversation page slides in from the top (spring), message bubbles float up staggered → settles into breathing.
// Vector mockup, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const NOTIFICATION_BANNER_DROP_DURATION = 210; // 7s @ 30fps

// Timeline (210f)
const PHONE_IN = 4;
const INBOX_IN = 16;
const BANNER_IN = 40;   // banner drops in with spring
const FINGER_IN = 92;
const CLICK = 104;      // tap banner
const EXPAND = 104;     // expand: banner scales up and fades out + conversation page slides in
const MSG_IN = 128;     // message bubbles stagger
const HOLD = 184;       // settled → breathing

const MSGS = [
  { me: false, w: 168, t: 'Hey! Send the deck over?' },
  { me: true, w: 132, t: 'On it — sharing now' },
  { me: false, w: 96, t: 'Got it, thanks' },
  { me: true, w: 150, t: 'See you at 3pm' },
];

export const NotificationBannerDrop: React.FC = () => {
  const f = useCurrentFrame();

  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 60;

  // Inbox rows stagger in
  const rowIn = (i: number) =>
    interpolate(f, [INBOX_IN + i * 4, INBOX_IN + i * 4 + 14], [0, 1], {
      easing: Easing.out(Easing.cubic), ...CL,
    });

  // Banner drop: spring (damping 13 / stiffness 150), translateY -140→0
  const drop = spring({ frame: Math.max(0, f - BANNER_IN), fps: 30, config: { damping: 13, stiffness: 150 } });
  const bannerY = (1 - drop) * -140;
  const bannerIn = interpolate(f, [BANNER_IN, BANNER_IN + 8], [0, 1], CL);
  // Banner content lines reveal
  const bannerLine = interpolate(f, [BANNER_IN + 10, BANNER_IN + 22], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });

  // Finger
  const fingerIn = interpolate(f, [FINGER_IN, FINGER_IN + 6], [0, 1], CL);
  const fingerX = interpolate(f, [FINGER_IN, FINGER_IN + 10], [320, 195], { easing: Easing.out(Easing.cubic), ...CL });
  const fingerY = interpolate(f, [FINGER_IN, FINGER_IN + 10], [620, 134], { easing: Easing.out(Easing.cubic), ...CL });
  const press =
    interpolate(f, [CLICK, CLICK + 3], [0, 1], CL) -
    interpolate(f, [CLICK + 4, CLICK + 7], [0, 1], CL);
  const fingerOut = interpolate(f, [CLICK + 6, CLICK + 12], [1, 0], CL);

  // Expand: banner scales up from the top center + fades out; conversation page slides in from the top
  const sheetSpring = spring({ frame: Math.max(0, f - (EXPAND + 8)), fps: 30, config: { damping: 16, stiffness: 110 } });
  const sheetY = (1 - sheetSpring) * -46;
  const bannerScale = interpolate(f, [EXPAND, EXPAND + 44], [1, 5.2], { easing: Easing.out(Easing.cubic), ...CL });
  const bannerFade = interpolate(f, [EXPAND + 26, EXPAND + 48], [1, 0], CL);
  const inboxDim = interpolate(f, [EXPAND, EXPAND + 14], [0, 1], CL);

  // Message bubbles float up staggered
  const msgIn = (i: number) =>
    interpolate(f, [MSG_IN + i * 7, MSG_IN + i * 7 + 14], [0, 1], {
      easing: Easing.out(Easing.cubic), ...CL,
    });

  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  const inboxRows = [
    { name: 'Design Guild', w: 110 },
    { name: 'Ollie Woods', w: 140 },
    { name: 'Finance Bot', w: 90 },
  ];

  return (
    <AbsoluteFill style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: `translate(-50%, -50%) translateY(${phoneY}px) scale(${breathe})`, opacity: phoneIn,
        }}
      >
        <Phone width={350}>
          <div style={{ position: 'absolute', inset: 0, background: '#0e0e12', color: '#fff', overflow: 'hidden' }}>
            {/* Inbox (dims when the conversation page opens) */}
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - inboxDim }}>
              <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontSize: 20, fontWeight: 800 }}>
                Inbox
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#33333d' }} />
              </div>
              <div style={{ margin: '6px 16px 0' }}>
                {inboxRows.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, background: '#1a1a21',
                      borderRadius: 14, padding: 12, marginBottom: 8,
                      opacity: rowIn(i), transform: `translateY(${(1 - rowIn(i)) * 10}px)`,
                    }}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: i % 2 ? '#2c2c36' : '#24242d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
                      {r.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                      <div style={{ width: r.w, height: 8, borderRadius: 4, background: '#2c2c36', marginTop: 7 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification banner */}
            {f >= BANNER_IN && (
              <div
                style={{
                  position: 'absolute', left: 14, right: 14, top: 96, height: 76, borderRadius: 18,
                  background: '#fff', color: '#18181b', boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
                  opacity: bannerIn * bannerFade,
                  transform: `translateY(${bannerY}px) scale(${bannerScale})`,
                  transformOrigin: 'top center', zIndex: 10,
                }}
              >
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1c1c24', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>
                    T
                  </div>
                  <div style={{ flex: 1, opacity: bannerLine, transform: `translateY(${(1 - bannerLine) * 8}px)` }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800 }}>Team Sync</div>
                    <div style={{ fontSize: 12.5, color: '#8a8a92', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Lena: Let's meet at 3pm — send the deck?
                    </div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d64545', opacity: bannerLine }} />
                </div>
              </div>
            )}

            {/* Expanded conversation page (slides in from the top while the banner scales up and fades out) */}
            {f >= EXPAND && (
              <div
                style={{
                  position: 'absolute', inset: 0, background: '#0e0e12', zIndex: 12,
                  opacity: sheetSpring, transform: `translateY(${sheetY}px)`,
                }}
              >
                <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', borderBottom: '1px solid #24242d' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#33333d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                    ‹
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Team Sync</div>
                    <div style={{ fontSize: 11, color: '#4ade80' }}>● online</div>
                  </div>
                </div>
                <div style={{ padding: '18px 16px 76px' }}>
                  {MSGS.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex', justifyContent: m.me ? 'flex-end' : 'flex-start', marginBottom: 10,
                        opacity: msgIn(i), transform: `translateY(${(1 - msgIn(i)) * 14}px)`,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '78%', padding: '10px 14px', borderRadius: 18,
                          borderTopRightRadius: m.me ? 4 : 18, borderTopLeftRadius: m.me ? 18 : 4,
                          background: m.me ? '#3a3a46' : '#1c1c24',
                          fontSize: 13.5, color: 'rgba(255,255,255,0.92)',
                        }}
                      >
                        {m.t}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Bottom input bar */}
                <div
                  style={{
                    position: 'absolute', left: 16, right: 16, bottom: 16, height: 52, borderRadius: 26,
                    background: '#1c1c24', display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 0 18px',
                    opacity: msgIn(3),
                  }}
                >
                  <div style={{ flex: 1, fontSize: 13.5, color: '#8a8a92' }}>Message…</div>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', color: '#0e0e12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>↑</div>
                </div>
              </div>
            )}
          </div>

          {/* Finger */}
          {f >= FINGER_IN && (
            <div
              style={{
                position: 'absolute', left: fingerX, top: fingerY, width: 24, height: 24,
                marginLeft: -12, marginTop: -12, borderRadius: '50%', zIndex: 30,
                background: 'rgba(255,255,255,0.92)',
                boxShadow: '0 0 0 3px rgba(45,212,191,0.5)',
                transform: `scale(${1 - press * 0.3})`, opacity: fingerIn * fingerOut,
              }}
            />
          )}
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
