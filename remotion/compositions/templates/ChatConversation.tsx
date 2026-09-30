import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ─── Deterministic RNG ──────────────────────────────────────────────────────
function createRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ChatMessage {
  text: string;
  sender: 'left' | 'right';
  emoji?: string;
  isVoice?: boolean;
}

export interface ChatConversationProps {
  messages?: ChatMessage[];
  leftName?: string;
  rightName?: string;
  leftAvatar?: string;
  rightAvatar?: string;
  headline?: string;
  appStyle?: 'imessage' | 'whatsapp' | 'dark';
  primaryColor?: string;
  format?: 'vertical' | 'horizontal';
}

// ─── Typing Indicator ───────────────────────────────────────────────────────
const TypingIndicator: React.FC<{
  frame: number;
  color: string;
  visible: boolean;
}> = ({ frame, color, visible }) => {
  if (!visible) return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        gap: '4px',
        padding: '12px 18px',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: '20px 20px 20px 4px',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0.3 + Math.sin(frame * 0.25 + i * 1.2) * 0.4,
            transform: `translateY(${Math.sin(frame * 0.25 + i * 1.2) * 3}px)`,
          }}
        />
      ))}
    </div>
  );
};

// ─── Voice Message Waveform ─────────────────────────────────────────────────
const VoiceWaveform: React.FC<{
  frame: number;
  progress: number;
  color: string;
}> = ({ frame, progress, color }) => {
  const rng = createRng(5555);
  const bars = Array.from({ length: 24 }, (_, i) => ({
    height: 4 + rng() * 20,
    active: i / 24 < progress,
  }));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '8px 0' }}>
      {/* Play button */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '10px solid #FFFFFF',
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          marginRight: '10px',
          opacity: 0.8,
        }}
      />
      {bars.map((bar, i) => (
        <div
          key={i}
          style={{
            width: '3px',
            height: `${bar.height}px`,
            borderRadius: '2px',
            backgroundColor: bar.active ? color : 'rgba(255,255,255,0.2)',
            transition: 'background-color 0.1s',
          }}
        />
      ))}
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginLeft: '8px' }}>
        0:{String(Math.floor(progress * 15)).padStart(2, '0')}
      </span>
    </div>
  );
};

// ─── Read Receipt ───────────────────────────────────────────────────────────
const ReadReceipt: React.FC<{
  status: 'sent' | 'delivered' | 'read';
  color: string;
}> = ({ status, color }) => {
  const checkColor = status === 'read' ? color : 'rgba(255,255,255,0.35)';

  return (
    <div style={{ display: 'flex', gap: '1px', marginTop: '3px', justifyContent: 'flex-end' }}>
      <svg width="16" height="10" viewBox="0 0 16 10">
        <path d="M1 5 L4 8 L10 2" fill="none" stroke={checkColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {status !== 'sent' && (
          <path d="M5 5 L8 8 L14 2" fill="none" stroke={checkColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
};

// ─── Emoji Reaction Float ───────────────────────────────────────────────────
const EmojiReaction: React.FC<{
  emoji: string;
  frame: number;
  startFrame: number;
}> = ({ emoji, frame, startFrame }) => {
  const elapsed = frame - startFrame;
  if (elapsed < 0 || elapsed > 40) return null;

  const progress = elapsed / 40;
  const y = -progress * 60;
  const scale = Math.sin(progress * Math.PI);
  const opacity = 1 - progress;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        right: '10px',
        transform: `translateY(${y}px) scale(${0.5 + scale * 0.8})`,
        opacity,
        fontSize: '28px',
        pointerEvents: 'none',
      }}
    >
      {emoji}
    </div>
  );
};

// ─── Chat Bubble ────────────────────────────────────────────────────────────
const ChatBubble: React.FC<{
  message: ChatMessage;
  enterProgress: number;
  frame: number;
  messageFrame: number;
  isLast: boolean;
  primaryColor: string;
  appStyle: string;
}> = ({ message, enterProgress, frame, messageFrame, isLast, primaryColor, appStyle }) => {
  const isRight = message.sender === 'right';

  // Bubble colors based on app style
  const bubbleColors = {
    imessage: isRight ? '#007AFF' : '#333333',
    whatsapp: isRight ? '#005C4B' : '#202C33',
    dark: isRight ? primaryColor + 'CC' : 'rgba(255,255,255,0.1)',
  };
  const bubbleColor = bubbleColors[appStyle as keyof typeof bubbleColors] || bubbleColors.dark;

  // Voice message progress
  const voiceProgress = message.isVoice
    ? interpolate(frame - messageFrame, [0, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  // Typewriter for text content
  const typeChars = Math.min(
    message.text.length,
    Math.floor((frame - messageFrame) * 1.2)
  );
  const visibleText = message.text.substring(0, typeChars);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isRight ? 'flex-end' : 'flex-start',
        padding: '3px 16px',
        transform: `translateY(${(1 - enterProgress) * 20}px) scale(${0.9 + enterProgress * 0.1})`,
        opacity: enterProgress,
        position: 'relative',
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          backgroundColor: bubbleColor,
          borderRadius: isRight
            ? '18px 18px 4px 18px'
            : '18px 18px 18px 4px',
          padding: message.isVoice ? '10px 16px' : '10px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
      >
        {message.isVoice ? (
          <VoiceWaveform frame={frame} progress={voiceProgress} color={primaryColor} />
        ) : (
          <p style={{
            margin: 0,
            fontSize: '16px',
            lineHeight: 1.45,
            color: '#FFFFFF',
            wordBreak: 'break-word',
          }}>
            {visibleText}
            {typeChars < message.text.length && frame % 12 < 7 && (
              <span style={{ opacity: 0.5 }}>▌</span>
            )}
          </p>
        )}

        {/* Time stamp */}
        <div style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.45)',
          textAlign: 'right',
          marginTop: '4px',
        }}>
          {Math.floor(messageFrame / 30) % 12 + 1}:{String(messageFrame % 60).padStart(2, '0')} PM
        </div>

        {/* Read receipt for right-side messages */}
        {isRight && typeChars >= message.text.length && (
          <ReadReceipt status="read" color="#53BDEB" />
        )}

        {/* Emoji reaction */}
        {message.emoji && typeChars >= message.text.length && (
          <EmojiReaction emoji={message.emoji} frame={frame} startFrame={messageFrame + message.text.length} />
        )}
      </div>
    </div>
  );
};

/**
 * ChatConversation — Motor de Conversa de Chat
 *
 * Para: Storytime, drama, conversa de WhatsApp/iMessage.
 * Inclui: chat bubbles com typing indicator, delivered/read receipts,
 * emoji reactions flutuantes, voice message waveform,
 * typewriter text reveal, online status dot, timestamps,
 * dark/imessage/whatsapp styles.
 */
export const ChatConversationScene: React.FC<ChatConversationProps> = ({
  messages = [
    { text: 'Você não vai acreditar no que eu descobri...', sender: 'left' },
    { text: 'O quê? Me conta agora', sender: 'right' },
    { text: 'Achei os documentos que provam tudo. Está tudo aqui.', sender: 'left', emoji: '😱' },
    { text: 'Isso muda TUDO. Precisamos agir rápido.', sender: 'right' },
    { text: '', sender: 'left', isVoice: true },
  ],
  leftName = 'Informante',
  rightName = 'Você',
  headline = 'Conversa Interceptada',
  appStyle = 'dark',
  primaryColor = '#00F0FF',
  format = 'vertical',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = format === 'vertical';

  // ── Header entrance ──
  const headerEnter = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  // ── Message timing ──
  const framesPerMessage = 35;

  // ── Find which messages are visible and which is "typing" ──
  const visibleCount = Math.floor(frame / framesPerMessage) + 1;
  const isTyping = visibleCount <= messages.length && frame % framesPerMessage < framesPerMessage * 0.3;
  const nextSender = messages[visibleCount - 1]?.sender || 'left';

  // ── Online status pulse ──
  const onlinePulse = 0.7 + Math.sin(frame * 0.15) * 0.3;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: appStyle === 'whatsapp' ? '#0B141A' : '#0A0A0F',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── Background pattern ── */}
      {appStyle === 'whatsapp' && (
        <AbsoluteFill
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0L60 30L30 60L0 30Z\' fill=\'none\' stroke=\'%23ffffff06\' stroke-width=\'1\'/%3E%3C/svg%3E")',
            opacity: 0.5,
          }}
        />
      )}

      {/* ── CHAT HEADER ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: isVertical ? '55px 20px 16px' : '15px 20px 12px',
          backgroundColor: 'rgba(15, 15, 20, 0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          zIndex: 20,
          transform: `translateY(${(1 - headerEnter) * -60}px)`,
          opacity: headerEnter,
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Back arrow */}
        <div style={{ color: primaryColor, fontSize: '22px', opacity: 0.7 }}>‹</div>

        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            👤
          </div>
          {/* Online dot */}
          <div
            style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              border: '2px solid #0A0A0F',
              boxShadow: `0 0 ${6 + onlinePulse * 4}px #10B981`,
              opacity: onlinePulse,
            }}
          />
        </div>

        <div>
          <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 700 }}>
            {leftName}
          </div>
          <div style={{ color: '#10B981', fontSize: '12px', opacity: 0.8 }}>
            online agora
          </div>
        </div>
      </div>

      {/* ── CHAT HEADLINE BADGE ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '130px' : '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 15,
          opacity: headerEnter,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '6px 16px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '1px',
          }}
        >
          {headline.toUpperCase()}
        </div>
      </div>

      {/* ── MESSAGES AREA ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '165px' : '100px',
          bottom: isVertical ? '100px' : '60px',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          overflow: 'hidden',
          padding: '10px 0',
        }}
      >
        {messages.slice(0, visibleCount).map((msg, i) => {
          const msgStartFrame = i * framesPerMessage;
          const enterP = spring({
            frame: Math.max(0, frame - msgStartFrame),
            fps,
            config: { damping: 14, stiffness: 140 },
          });

          return (
            <ChatBubble
              key={i}
              message={msg}
              enterProgress={enterP}
              frame={frame}
              messageFrame={msgStartFrame}
              isLast={i === visibleCount - 1}
              primaryColor={primaryColor}
              appStyle={appStyle}
            />
          );
        })}

        {/* Typing indicator */}
        <div
          style={{
            padding: '3px 16px',
            display: 'flex',
            justifyContent: nextSender === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          <TypingIndicator
            frame={frame}
            color="rgba(255,255,255,0.5)"
            visible={isTyping && visibleCount <= messages.length}
          />
        </div>
      </div>

      {/* ── INPUT BAR ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: isVertical ? '12px 16px 40px' : '10px 16px 14px',
          backgroundColor: 'rgba(15, 15, 20, 0.95)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 20,
          opacity: headerEnter,
        }}
      >
        <div style={{ fontSize: '22px', opacity: 0.5 }}>＋</div>
        <div
          style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: '20px',
            padding: '10px 16px',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          Mensagem...
        </div>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.7,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '8px solid #FFFFFF',
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              marginLeft: '2px',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
