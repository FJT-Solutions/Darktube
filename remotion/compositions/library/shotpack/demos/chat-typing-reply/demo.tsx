// chat-typing-reply —— App chat: typing → thinking → reply (mobile / interaction)
// Phone fades in → user types character by character in the input box (caret blinks) → on send the user bubble pops out →
// AI "thinking" dots cycle and blink → AI reply reveals character by character (with its own caret) → after settling, the whole phone breathes on hold.
// Screen is a vector mockup (dark chat theme), deterministic rendering, no randomness.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const CHAT_TYPING_REPLY_DURATION = 210; // 7s @ 30fps

// Timeline (210f)
const PHONE_IN = 4; // phone fades in
const HISTORY = 30; // chat history (user line + AI line) in place
const TYPE_START = 34; // user starts typing
const TYPE_END = 76; // typing done
const SEND = 84; // send: user bubble pops out
const THINK_START = 96; // AI thinking (three dots cycling)
const THINK_END = 138; // thinking ends, reply begins
const REPLY_START = 144; // AI reply reveals character by character
const REPLY_END = 186; // reply done
const HOLD = 192; // all settled → breathing

const USER_TEXT = 'How much time did the team work this week?';
const AI_TEXT = 'The team logged 142 hours total across 8 members this week.';

const ThinkingDots: React.FC<{ f: number }> = ({ f }) => {
  const cycle = (f - THINK_START) % 18;
  const op = (lead: number) =>
    interpolate(
      cycle,
      [0, 4, 8, 12, 18],
      [0.35, lead === 0 ? 1 : 0.35, lead === 1 ? 1 : 0.35, lead === 2 ? 1 : 0.35, 0.35],
      CL,
    );
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '12px 16px',
        borderRadius: 18,
        borderTopLeftRadius: 4,
        background: '#1c1c28',
        alignSelf: 'flex-start',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#00d9ff',
            opacity: op(i),
          }}
        />
      ))}
    </div>
  );
};

export const ChatTypingReply: React.FC = () => {
  const f = useCurrentFrame();

  // Phone fades in + lightly settles
  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0.85, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  const phoneY = (1 - phoneIn) * 20;

  // History messages stagger in (f8–24)
  const histIn = (i: number) =>
    interpolate(f, [HISTORY - 22 + i * 7, HISTORY - 12 + i * 7], [0, 1], {
      easing: Easing.out(Easing.cubic),
      ...CL,
    });

  // User typing: character by character in the input + caret
  const chars = Math.floor(interpolate(f, [TYPE_START, TYPE_END], [0, USER_TEXT.length], CL));
  const typed = USER_TEXT.slice(0, chars);
  const caretOn = f >= TYPE_START && f < SEND && Math.sin(f * 0.6) > 0;

  // Send: user bubble pops out
  const userBubble = interpolate(f, [SEND, SEND + 10], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  const sendGlow = interpolate(f, [SEND, SEND + 3, SEND + 6], [0, 1, 0], CL);

  // AI thinking indicator
  const showThinking = f >= THINK_START && f < REPLY_START;
  const thinkingIn = interpolate(f, [THINK_START, THINK_START + 6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  const thinkingOut = interpolate(f, [REPLY_START - 4, REPLY_START], [1, 0], CL);

  // AI reply reveals character by character
  const replyChars = Math.floor(
    interpolate(f, [REPLY_START, REPLY_END], [0, AI_TEXT.length], CL),
  );
  const replyShown = AI_TEXT.slice(0, replyChars);
  const replyIn = interpolate(f, [REPLY_START, REPLY_START + 8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  const replyCaret = f >= REPLY_START && f < REPLY_END && Math.sin(f * 0.6) > 0;

  // After settling, the whole phone breathes
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
          <div style={{ position: 'absolute', inset: 0, background: '#0a0a15', color: '#fff' }}>
            {/* Chat header */}
            <div
              style={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#3a3a4a,#1c1c28)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  T
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Team Sync</div>
                  <div style={{ fontSize: 11, color: '#00d9ff' }}>online</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#8a8a96' }}>Mon 9:41</div>
            </div>

            {/* Message list */}
            <div
              style={{
                position: 'absolute',
                top: 64,
                bottom: 76,
                left: 0,
                right: 0,
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                boxSizing: 'border-box',
              }}
            >
              {/* History: user line */}
              <div
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '78%',
                  background: '#1c6fe0',
                  borderRadius: 18,
                  borderTopRightRadius: 4,
                  padding: '10px 14px',
                  fontSize: 13.5,
                  lineHeight: 1.45,
                  opacity: histIn(0),
                  transform: `translateY(${(1 - histIn(0)) * 12}px)`,
                }}
              >
                Can we review the week's hours?
              </div>
              {/* History: AI line */}
              <div
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '78%',
                  background: '#1c1c28',
                  borderRadius: 18,
                  borderTopLeftRadius: 4,
                  padding: '10px 14px',
                  fontSize: 13.5,
                  lineHeight: 1.45,
                  color: 'rgba(255,255,255,0.92)',
                  opacity: histIn(1),
                  transform: `translateY(${(1 - histIn(1)) * 12}px)`,
                }}
              >
                Sure — ask away.
              </div>

              {/* New user message */}
              {f >= SEND && (
                <div
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '78%',
                    background: '#1c6fe0',
                    borderRadius: 18,
                    borderTopRightRadius: 4,
                    padding: '10px 14px',
                    fontSize: 13.5,
                    lineHeight: 1.45,
                    opacity: userBubble,
                    transform: `translateY(${(1 - userBubble) * 10}px)`,
                    boxShadow: `0 0 ${14 * sendGlow}px rgba(28,111,224,${0.5 * sendGlow})`,
                  }}
                >
                  {USER_TEXT}
                </div>
              )}

              {/* AI thinking */}
              {showThinking && <ThinkingDots f={f} />}

              {/* AI reply reveals character by character */}
              {f >= REPLY_START && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '82%',
                    background: '#1c1c28',
                    borderRadius: 18,
                    borderTopLeftRadius: 4,
                    padding: '10px 14px',
                    fontSize: 13.5,
                    lineHeight: 1.45,
                    color: 'rgba(255,255,255,0.92)',
                    opacity: replyIn * thinkingOut,
                    transform: `translateY(${(1 - replyIn) * 8}px)`,
                  }}
                >
                  {replyShown}
                  {replyCaret && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: 7,
                        height: 13,
                        background: '#00d9ff',
                        marginLeft: 2,
                        verticalAlign: '-2px',
                      }}
                    />
                  )}
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
                height: 76,
                padding: '12px 16px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 22,
                  background: '#1c1c28',
                  padding: '0 18px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 13.5,
                  color: 'rgba(255,255,255,0.85)',
                  boxSizing: 'border-box',
                }}
              >
                {f >= TYPE_START && f < SEND ? typed : ''}
                {caretOn && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 2,
                      height: 18,
                      background: '#00d9ff',
                      marginLeft: 2,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: f >= SEND ? '#0f7e5a' : '#1c6fe0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                {f >= SEND ? '✓' : '↑'}
              </div>
            </div>
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
