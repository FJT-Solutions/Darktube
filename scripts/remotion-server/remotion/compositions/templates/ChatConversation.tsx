import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface ChatMessage {
  text: string;
  sender: 'left' | 'right';
  senderName?: string;
  avatarUrl?: string;
  imageUrl?: string;
  emoji?: string;
  isVoice?: boolean;
  durationSeconds?: number;
  words?: Array<{ word: string; startInSeconds: number; endInSeconds: number }>;
}

export interface ChatConversationProps extends RemotionShortProps {
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
        alignItems: 'center',
        gap: '4px',
        padding: '10px 16px',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: '18px 18px 18px 4px',
        width: 'fit-content',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0.35 + Math.sin(frame * 0.3 + i * 1.1) * 0.45,
            transform: `translateY(${Math.sin(frame * 0.3 + i * 1.1) * 3}px)`,
          }}
        />
      ))}
    </div>
  );
};

// ─── Voice Message Waveform ─────────────────────────────────────────────────
const VoiceWaveform: React.FC<{
  progress: number;
  color: string;
}> = ({ progress, color }) => {
  const bars = [8, 14, 22, 12, 18, 24, 16, 10, 20, 15, 25, 12, 18, 8, 14, 22, 10, 16];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '6px 0' }}>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '12px solid #FFFFFF',
          borderTop: '7px solid transparent',
          borderBottom: '7px solid transparent',
          marginRight: '12px',
          opacity: 0.9,
        }}
      />
      {bars.map((height, i) => (
        <div
          key={i}
          style={{
            width: '3px',
            height: `${height}px`,
            borderRadius: '2px',
            backgroundColor: i / bars.length < progress ? color : 'rgba(255,255,255,0.25)',
            transition: 'background-color 0.1s',
          }}
        />
      ))}
      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginLeft: '10px', fontFamily: 'monospace' }}>
        0:{String(Math.floor(progress * 15)).padStart(2, '0')}
      </span>
    </div>
  );
};

// ─── Read Receipt Checks ────────────────────────────────────────────────────
const ReadReceipt: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ display: 'inline-flex', gap: '1px', marginLeft: '6px', verticalAlign: 'middle' }}>
    <svg width="15" height="10" viewBox="0 0 16 10">
      <path d="M1 5 L4 8 L10 2" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 5 L8 8 L14 2" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

// ─── Chat Bubble Component With Word Karaoke Sync ───────────────────────────
const ChatBubble: React.FC<{
  message: ChatMessage;
  enterProgress: number;
  frame: number;
  messageStartFrame: number;
  fps: number;
  primaryColor: string;
  appStyle: string;
  isLast: boolean;
}> = ({
  message,
  enterProgress,
  frame,
  messageStartFrame,
  fps,
  primaryColor,
  appStyle,
}) => {
  const isRight = message.sender === 'right';
  const elapsedSeconds = Math.max(0, (frame - messageStartFrame) / fps);

  // Bubble colors
  const bubbleColors = {
    imessage: isRight ? '#0A84FF' : '#2C2C2E',
    whatsapp: isRight ? '#005C4B' : '#202C33',
    dark: isRight ? `${primaryColor}CC` : 'rgba(255,255,255,0.12)',
  };
  const bubbleColor = bubbleColors[appStyle as keyof typeof bubbleColors] || bubbleColors.dark;

  // Active word index from phonetics/words if present
  let activeWordIdx = -1;
  if (message.words && message.words.length > 0) {
    activeWordIdx = message.words.findIndex(
      (w) => elapsedSeconds >= w.startInSeconds && elapsedSeconds <= w.endInSeconds
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isRight ? 'flex-end' : 'flex-start',
        padding: '4px 16px',
        transform: `translateY(${(1 - enterProgress) * 24}px) scale(${0.92 + enterProgress * 0.08})`,
        opacity: enterProgress,
        position: 'relative',
      }}
    >
      {/* Sender label */}
      {message.senderName && (
        <span
          style={{
            fontSize: '11px',
            color: isRight ? primaryColor : 'rgba(255,255,255,0.5)',
            marginBottom: '3px',
            marginLeft: isRight ? '0' : '8px',
            marginRight: isRight ? '8px' : '0',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {message.senderName}
        </span>
      )}

      {/* Bubble container */}
      <div
        style={{
          maxWidth: '82%',
          backgroundColor: bubbleColor,
          borderRadius: isRight ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '12px 16px',
          boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
        }}
      >
        {/* Attached image if present */}
        {message.imageUrl && (
          <div
            style={{
              marginBottom: '8px',
              borderRadius: '12px',
              overflow: 'hidden',
              maxHeight: '180px',
            }}
          >
            <Img
              src={message.imageUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* Voice message waveform or text */}
        {message.isVoice ? (
          <VoiceWaveform
            progress={interpolate(elapsedSeconds, [0, message.durationSeconds || 7], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}
            color={primaryColor}
          />
        ) : message.words && message.words.length > 0 ? (
          /* Synchronized Karaoke Word Highlighting */
          <p
            style={{
              margin: 0,
              fontSize: '17px',
              lineHeight: 1.45,
              color: '#FFFFFF',
              fontWeight: 500,
            }}
          >
            {message.words.map((w, wIdx) => {
              const isPast = elapsedSeconds > w.endInSeconds;
              const isCurrent = wIdx === activeWordIdx;

              return (
                <span
                  key={wIdx}
                  style={{
                    color: isCurrent ? '#FFE600' : isPast ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                    fontWeight: isCurrent ? 800 : 500,
                    textShadow: isCurrent ? '0 0 12px rgba(255,230,0,0.6)' : 'none',
                    backgroundColor: isCurrent ? 'rgba(255,230,0,0.18)' : 'transparent',
                    padding: isCurrent ? '1px 3px' : '0',
                    borderRadius: '3px',
                    transition: 'color 0.1s, text-shadow 0.1s',
                  }}
                >
                  {w.word}{' '}
                </span>
              );
            })}
          </p>
        ) : (
          /* Standard text */
          <p
            style={{
              margin: 0,
              fontSize: '17px',
              lineHeight: 1.45,
              color: '#FFFFFF',
              fontWeight: 500,
            }}
          >
            {message.text}
          </p>
        )}

        {/* Timestamp & read receipts */}
        <div
          style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'right',
            marginTop: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <span>{Math.floor(messageStartFrame / 30) % 12 + 1}:{String(messageStartFrame % 60).padStart(2, '0')}</span>
          {isRight && <ReadReceipt color={appStyle === 'whatsapp' ? '#53BDEB' : primaryColor} />}
        </div>
      </div>
    </div>
  );
};

// ─── Main Chat Conversation Component ───────────────────────────────────────
export const ChatConversationScene: React.FC<ChatConversationProps> = ({
  messages: initialMessages,
  scenes,
  leftName = 'Agente Alpha',
  rightName = 'Comando Central',
  leftAvatar = '🕵️',
  rightAvatar = '🛰️',
  headline = 'COMUNICAÇÃO CRIPTOGRAFADA',
  appStyle = 'dark',
  primaryColor = '#00F0FF',
  format = 'vertical',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isVertical = format === 'vertical';

  // Build messages list: if `scenes` provided, map each scene to a chat dialogue turn
  let activeMessages: ChatMessage[] = [];
  if (scenes && scenes.length > 0) {
    activeMessages = scenes.map((s, idx) => {
      const isRight = idx % 2 !== 0;
      return {
        text: s.captionText || s.headline || '',
        sender: isRight ? 'right' : 'left',
        senderName: isRight ? rightName : (s.headline || leftName),
        imageUrl: s.imageUrl,
        durationSeconds: s.durationSeconds || 5,
        words: (s as any).words,
      };
    });
  } else if (initialMessages && initialMessages.length > 0) {
    activeMessages = initialMessages;
  } else {
    activeMessages = [
      { text: 'Localizamos os dados no servidor primário.', sender: 'left', senderName: leftName },
      { text: 'Copiem todos os registros imediatamente.', sender: 'right', senderName: rightName },
      { text: 'A extração foi interceptada. Precisamos de extração agora.', sender: 'left', senderName: leftName },
    ];
  }

  // Calculate start frames for each message based on durationSeconds
  const messageTimings: Array<{ startFrame: number; durationFrames: number; msg: ChatMessage }> = [];
  let currentAccum = 0;
  activeMessages.forEach((msg) => {
    const durSec = msg.durationSeconds || 5;
    const durFrames = Math.max(30, Math.round(durSec * fps));
    messageTimings.push({
      startFrame: currentAccum,
      durationFrames: durFrames,
      msg,
    });
    currentAccum += durFrames;
  });

  // Determine which messages are revealed by the current frame
  const visibleMessages = messageTimings.filter((t) => frame >= t.startFrame);
  const currentTurn = messageTimings.find((t) => frame >= t.startFrame && frame < t.startFrame + t.durationFrames)
    || messageTimings[messageTimings.length - 1];

  // Header entrance spring
  const headerEnter = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  // Typing indicator logic: show for the first 20 frames of each message
  const isTyping = currentTurn && (frame - currentTurn.startFrame) < Math.min(22, currentTurn.durationFrames * 0.15);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: appStyle === 'whatsapp' ? '#0B141A' : '#0B0D13',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── Background subtle gradient & grid ── */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, rgba(0, 240, 255, 0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── PHONE TOP STATUS BAR (Clock, Signal, Battery) ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: isVertical ? '48px' : '30px',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#FFFFFF',
          fontSize: '13px',
          fontWeight: 600,
          zIndex: 30,
          opacity: 0.85,
        }}
      >
        <span>09:41</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', letterSpacing: '1px' }}>5G</span>
          <div style={{ width: '18px', height: '10px', border: '1px solid #FFFFFF', borderRadius: '3px', padding: '1px' }}>
            <div style={{ width: '80%', height: '100%', backgroundColor: '#FFFFFF', borderRadius: '1px' }} />
          </div>
        </div>
      </div>

      {/* ── APP CHAT HEADER ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '44px' : '25px',
          left: 0,
          right: 0,
          padding: '12px 20px',
          backgroundColor: 'rgba(15, 18, 26, 0.94)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          zIndex: 25,
          transform: `translateY(${(1 - headerEnter) * -60}px)`,
          opacity: headerEnter,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Back icon */}
        <div style={{ color: primaryColor, fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>‹</div>

        {/* Contact Avatar */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: `${primaryColor}22`,
              border: `1.5px solid ${primaryColor}55`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            {leftAvatar}
          </div>
          {/* Online status indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              border: '2px solid #0B0D13',
              boxShadow: '0 0 8px #10B981',
            }}
          />
        </div>

        {/* Contact info & encrypted status */}
        <div style={{ flex: 1 }}>
          <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 700, letterSpacing: '0.3px' }}>
            {leftName}
          </div>
          <div style={{ color: '#10B981', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>●</span>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Canal Criptografado E2E</span>
          </div>
        </div>

        {/* Top badge */}
        <div
          style={{
            backgroundColor: `${primaryColor}1A`,
            border: `1px solid ${primaryColor}44`,
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '10px',
            color: primaryColor,
            fontWeight: 700,
            letterSpacing: '1px',
          }}
        >
          {headline.slice(0, 16).toUpperCase()}
        </div>
      </div>

      {/* ── MESSAGES FEED (Scrolls dynamically) ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '135px' : '90px',
          bottom: isVertical ? '90px' : '65px',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          overflow: 'hidden',
          paddingBottom: '16px',
        }}
      >
        {visibleMessages.map(({ startFrame, durationFrames, msg }, i) => {
          const enterProgress = spring({
            frame: Math.max(0, frame - startFrame),
            fps,
            config: { damping: 15, stiffness: 150 },
          });

          return (
            <ChatBubble
              key={i}
              message={msg}
              enterProgress={enterProgress}
              frame={frame}
              messageStartFrame={startFrame}
              fps={fps}
              primaryColor={primaryColor}
              appStyle={appStyle}
              isLast={i === visibleMessages.length - 1}
            />
          );
        })}

        {/* Real-time typing indicator */}
        {isTyping && currentTurn && (
          <div
            style={{
              padding: '4px 20px',
              display: 'flex',
              justifyContent: currentTurn.msg.sender === 'right' ? 'flex-end' : 'flex-start',
            }}
          >
            <TypingIndicator frame={frame} color={primaryColor} visible={true} />
          </div>
        )}
      </div>

      {/* ── BOTTOM PHONE INPUT BAR ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: isVertical ? '12px 16px 36px' : '10px 16px 14px',
          backgroundColor: 'rgba(15, 18, 26, 0.96)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 25,
          opacity: headerEnter,
        }}
      >
        <div style={{ fontSize: '20px', opacity: 0.6, color: '#FFFFFF' }}>＋</div>
        <div
          style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderRadius: '20px',
            padding: '10px 16px',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          Mensagem criptografada...
        </div>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 12px ${primaryColor}66`,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '8px solid #000000',
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

export const ChatConversation = ChatConversationScene;
