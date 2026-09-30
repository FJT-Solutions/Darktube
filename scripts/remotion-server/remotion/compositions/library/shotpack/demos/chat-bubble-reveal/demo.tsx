// chat-bubble-reveal —— App chat: bubbles reveal one by one + reactions (mobile / interaction)
// Phone fades in → messages enter one at a time on an iMessage rhythm: the user side types character by character then sends (blue bubble pops out),
// the other side shows a typing indicator before revealing (gray bubble + character by character), with a reaction popping up after a delay →
// after settling, the whole phone breathes on hold. Screen is a vector mockup (light iMessage theme), deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const CHAT_BUBBLE_REVEAL_DURATION = 210; // 7s @ 30fps

// Timeline (210f)
const PHONE_IN = 4; // phone fades in
const B1_START = 22; // message 1 (user): typing
const B1_SEND = 58; // message 1 sends and pops out
const B2_TYPING = 70; // message 2 (other): typing indicator
const B2_REVEAL = 100; // message 2 reveals + character by character
const B2_DONE = 128; // message 2 done
const REACT = 136; // reaction pops out
const B3_START = 148; // message 3 (user) pops out directly
const HOLD = 176; // all settled → breathing

const M1 = 'Are you free for a quick call?';
const M2 = 'Sure, give me 10 minutes — just wrapping up a meeting';
const M3 = 'Great, I’ll send the invite';
const REACT_EMOJI = '👍';

const TypingBubbles: React.FC<{ f: number }> = ({ f }) => {
  const cycle = f % 18;
  const op = (lead: number) =>
    interpolate(
      cycle,
      [0, 4, 8, 12, 18],
      [0.4, lead === 0 ? 1 : 0.4, lead === 1 ? 1 : 0.4, lead === 2 ? 1 : 0.4, 0.4],
      CL,
    );
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 14px',
        borderRadius: 18,
        borderTopLeftRadius: 4,
        background: '#e9e9eb',
        alignSelf: 'flex-start',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{ width: 9, height: 9, borderRadius: '50%', background: '#8e8e93', opacity: op(i) }}
        />
      ))}
    </div>
  );
};

export const ChatBubbleReveal: React.FC = () => {
  const f = useCurrentFrame();

  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0.85, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  const phoneY = (1 - phoneIn) * 20;

  // Message 1: user types (input box) + sends and pops out
  const b1Chars = Math.floor(interpolate(f, [B1_START, B1_SEND - 6], [0, M1.length], CL));
  const b1Typed = M1.slice(0, b1Chars);
  const b1In = interpolate(f, [B1_SEND, B1_SEND + 10], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });

  // Message 2: typing → reveal + character by character
  const b2TypingIn = interpolate(f, [B2_TYPING, B2_TYPING + 6], [0, 1], CL);
  const b2TypingOut = interpolate(f, [B2_REVEAL - 4, B2_REVEAL], [1, 0], CL);
  const b2Chars = Math.floor(interpolate(f, [B2_REVEAL, B2_DONE], [0, M2.length], CL));
  const b2Shown = M2.slice(0, b2Chars);
  const b2In = interpolate(f, [B2_REVEAL, B2_REVEAL + 8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });

  // reaction: pops out after a delay
  const reactIn = interpolate(f, [REACT, REACT + 8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });

  // Message 3: pops out directly
  const b3In = interpolate(f, [B3_START, B3_START + 10], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });

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
          <div style={{ position: 'absolute', inset: 0, background: '#fff', color: '#18181b' }}>
            {/* Header */}
            <div
              style={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderBottom: '1px solid #e9e9ec',
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              <span style={{ color: '#0a7cff' }}>‹</span> Maya · 9:41
            </div>

            {/* Message area */}
            <div
              style={{
                position: 'absolute',
                top: 64,
                bottom: 78,
                left: 0,
                right: 0,
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxSizing: 'border-box',
              }}
            >
              {/* Message 1: user (blue bubble on the right) */}
              {f >= B1_SEND && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div
                    style={{
                      maxWidth: '82%',
                      background: '#0a7cff',
                      color: '#fff',
                      borderRadius: 18,
                      borderTopRightRadius: 4,
                      padding: '10px 14px',
                      fontSize: 14,
                      lineHeight: 1.45,
                      opacity: b1In,
                      transform: `translateY(${(1 - b1In) * 10}px)`,
                    }}
                  >
                    {M1}
                  </div>
                </div>
              )}

              {/* Message 2: other (gray bubble on the left) */}
              {f >= B2_TYPING && f < B2_DONE && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {f >= B2_TYPING && f < B2_REVEAL && (
                    <div style={{ opacity: b2TypingIn * b2TypingOut }}>
                      <TypingBubbles f={f} />
                    </div>
                  )}
                  {f >= B2_REVEAL && (
                    <div
                      style={{
                        maxWidth: '85%',
                        background: '#e9e9eb',
                        color: '#000',
                        borderRadius: 18,
                        borderTopLeftRadius: 4,
                        padding: '10px 14px',
                        fontSize: 14,
                        lineHeight: 1.45,
                        opacity: b2In,
                        transform: `translateY(${(1 - b2In) * 10}px)`,
                      }}
                    >
                      {b2Shown}
                      {f < B2_DONE && (
                        <span
                          style={{
                            display: 'inline-block',
                            width: 2,
                            height: 14,
                            background: '#0a7cff',
                            marginLeft: 2,
                            verticalAlign: '-2px',
                          }}
                        />
                      )}
                    </div>
                  )}
                  {/* reaction */}
                  {f >= REACT && (
                    <div
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: -2,
                        fontSize: 15,
                        opacity: reactIn,
                        transform: `scale(${reactIn})`,
                      }}
                    >
                      {REACT_EMOJI}
                    </div>
                  )}
                </div>
              )}

              {/* Message 3: user */}
              {f >= B3_START && (
                <div
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '82%',
                    background: '#0a7cff',
                    color: '#fff',
                    borderRadius: 18,
                    borderTopRightRadius: 4,
                    padding: '10px 14px',
                    fontSize: 14,
                    lineHeight: 1.45,
                    opacity: b3In,
                    transform: `translateY(${(1 - b3In) * 10}px)`,
                  }}
                >
                  {M3}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 78,
                padding: '12px 16px',
                borderTop: '1px solid #e9e9ec',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 21,
                  background: '#f1f1f4',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 14,
                  color: '#8e8e93',
                  boxSizing: 'border-box',
                }}
              >
                {f >= B1_START && f < B1_SEND - 2 ? b1Typed : ''}
                {f >= B1_START && f < B1_SEND - 2 && Math.sin(f * 0.6) > 0 && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 2,
                      height: 18,
                      background: '#0a7cff',
                      marginLeft: 2,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: '#0a7cff',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  transform: f >= B1_SEND ? 'rotate(-90deg)' : 'rotate(0deg)',
                }}
              >
                ↑
              </div>
            </div>
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
