// chat-to-preview-morph —— App chat → result preview morph (mobile / transition)
// Phone fades in → the chat pane above compresses from 55% to 25% of the height (chat content fades out in sync),
// the result preview below grows from 45% to 75% (content fades in + rises into place), with an Apple-grade ease
// (bezier 0.16,1,0.3,1) → after settling, the whole phone breathes on hold. The screen is a vector mockup, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const CHAT_TO_PREVIEW_MORPH_DURATION = 180; // 6s @ 30fps

const APPLE_EASE = Easing.bezier(0.16, 1, 0.3, 1);

// Timeline (180f)
const PHONE_IN = 4; // phone fades in
const MORPH_START = 20; // morph starts (chat 55% → 25%)
const MORPH_END = 108; // morph ends
const HOLD = 140; // settled → breathing

const CHAT_LINES = [
  { from: 'user', w: 120 },
  { from: 'ai', w: 150 },
  { from: 'user', w: 90 },
  { from: 'ai', w: 160 },
];

export const ChatToPreviewMorph: React.FC = () => {
  const f = useCurrentFrame();

  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0.85, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  const phoneY = (1 - phoneIn) * 20;

  // Chat ratio 0.55 → 0.25, Apple ease
  const ratio = interpolate(f, [MORPH_START, MORPH_END], [0.55, 0.25], {
    easing: APPLE_EASE,
    ...CL,
  });
  // Chat content fades out as it compresses (starting at ratio < 0.38)
  const chatFade = interpolate(f, [MORPH_START + 30, MORPH_END - 10], [1, 0], {
    easing: Easing.in(Easing.quad),
    ...CL,
  });
  // Preview content fades in + rises into place
  const previewIn = interpolate(f, [MORPH_START + 8, MORPH_END], [0, 1], {
    easing: APPLE_EASE,
    ...CL,
  });
  const previewY = (1 - previewIn) * 40;

  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  return (
    <AbsoluteFill
      style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translateY(${phoneY}px) scale(${breathe})`,
          opacity: phoneIn,
        }}
      >
        <Phone width={350}>
          <div style={{ position: 'absolute', inset: 0, background: '#f4f4f2', overflow: 'hidden' }}>
            {/* Split-screen container (chat on top + preview below) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Chat pane */}
              <div
                style={{
                  height: `${ratio * 100}%`,
                  background: '#26262b',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    height: 52,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '0 18px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: '#4a4a52',
                    }}
                  />
                  <div style={{ width: 90, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.4)' }} />
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    opacity: chatFade,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                >
                  {CHAT_LINES.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: c.from === 'user' ? 'flex-end' : 'flex-start',
                        height: 34,
                        width: c.w,
                        borderRadius: 12,
                        background: c.from === 'user' ? '#1c6fe0' : 'rgba(255,255,255,0.16)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 3, background: '#0a7cff', flexShrink: 0 }} />

              {/* Preview pane */}
              <div
                style={{
                  height: `${(1 - ratio) * 100}%`,
                  background: '#fff',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  padding: '20px 18px',
                  opacity: previewIn,
                  transform: `translateY(${previewY}px)`,
                }}
              >
                {/* Preview content: result card */}
                <div style={{ width: 44, height: 10, borderRadius: 5, background: '#0a7cff' }} />
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: '#18181b',
                    marginTop: 14,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Summary ready
                </div>
                <div
                  style={{
                    marginTop: 8,
                    width: '86%',
                    height: 10,
                    borderRadius: 5,
                    background: '#e6e6ea',
                  }}
                />
                <div
                  style={{
                    marginTop: 6,
                    width: '72%',
                    height: 10,
                    borderRadius: 5,
                    background: '#e6e6ea',
                  }}
                />
                {/* 2×2 data cards */}
                <div
                  style={{
                    marginTop: 20,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                  }}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        background: '#f6f6f4',
                        borderRadius: 14,
                        padding: 14,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div style={{ width: 40, height: 18, borderRadius: 5, background: '#cfcfd4' }} />
                      <div
                        style={{
                          width: 58,
                          height: 8,
                          borderRadius: 4,
                          background: '#e2e2e6',
                          marginTop: 8,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 18,
                    height: 44,
                    borderRadius: 12,
                    background: '#18181b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Open full report
                </div>
              </div>
            </div>
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
