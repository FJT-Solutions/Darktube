import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';

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

// ─── Closed-form spring (pure function of time) ─────────────────────────────
function closedFormSpring(t: number, k = 170, d = 26): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k);
  const z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// ─── Floating Emoji Reaction Particles ──────────────────────────────────────
interface FloatingEmoji {
  emoji: string;
  x: number;
  delay: number;
  speed: number;
  wobbleFreq: number;
  size: number;
}

const FloatingReactionEmojis: React.FC<{
  frame: number;
  sceneLocalTime: number;
}> = ({ frame, sceneLocalTime }) => {
  const emojis: FloatingEmoji[] = React.useMemo(() => {
    const r = createRng(44189);
    const pool = ['💀', '😱', '👀', '🔥', '🚩', '🍿', '🤯', '🤦‍♂️'];
    return Array.from({ length: 14 }, (_, i) => ({
      emoji: pool[Math.floor(r() * pool.length)],
      x: 10 + r() * 80, // %
      delay: r() * 4,
      speed: 40 + r() * 70,
      wobbleFreq: 0.05 + r() * 0.1,
      size: 28 + r() * 20,
    }));
  }, []);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {emojis.map((item, idx) => {
        const elapsed = sceneLocalTime - item.delay;
        if (elapsed < 0) return null;
        const yOffset = (elapsed * item.speed) % 1100;
        const currentY = 1000 - yOffset;
        const currentX = item.x + Math.sin(frame * item.wobbleFreq + idx) * 4;
        const opacity = interpolate(currentY, [0, 200, 700, 1000], [0, 0.9, 0.9, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${currentX}%`,
              top: `${currentY}px`,
              fontSize: `${item.size}px`,
              opacity,
              transform: `scale(${0.8 + Math.sin(frame * 0.1 + idx) * 0.2})`,
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
            }}
          >
            {item.emoji}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ─── Upvote Counter with Odometre Roll ──────────────────────────────────────
const RedditUpvoteCounter: React.FC<{
  baseCount: number;
  sceneLocalTime: number;
}> = ({ baseCount, sceneLocalTime }) => {
  const springP = closedFormSpring(sceneLocalTime, 90, 16);
  const currentCount = Math.floor(baseCount + springP * 1420);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 8px',
        backgroundColor: '#1A1A1B',
        borderRadius: '12px',
        border: '1px solid #343536',
        minWidth: '54px',
        gap: '4px',
      }}
    >
      {/* Upvote Arrow SVG */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 4L4 13H9V20H15V13H20L12 4Z"
          fill="#FF4500"
          style={{
            transform: `scale(${1 + Math.sin(sceneLocalTime * 12) * 0.1})`,
            transformOrigin: 'center',
          }}
        />
      </svg>
      <span
        style={{
          fontFamily: 'Montserrat, Inter, sans-serif',
          fontWeight: 800,
          fontSize: '18px',
          color: '#FF4500',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {(currentCount / 1000).toFixed(1)}k
      </span>
      {/* Downvote Arrow */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" opacity="0.3">
        <path d="M12 20L20 11H15V4H9V11H4L12 20Z" fill="#818384" />
      </svg>
    </div>
  );
};

// ─── Reddit Award Badges ────────────────────────────────────────────────────
const RedditAwards: React.FC<{ frame: number; startDelay: number }> = ({ frame, startDelay }) => {
  const awards = [
    { icon: '🥇', bg: '#F59E0B', label: 'Gold', count: 12 },
    { icon: '🥈', bg: '#9CA3AF', label: 'Silver', count: 28 },
    { icon: '🔥', bg: '#EF4444', label: 'Wholesome', count: 45 },
    { icon: '💎', bg: '#06B6D4', label: 'Platinum', count: 5 },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {awards.map((award, i) => {
        const itemElapsed = (frame - startDelay - i * 6) / 30;
        const popSpring = closedFormSpring(itemElapsed, 240, 18);
        if (itemElapsed <= 0) return null;

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#272729',
              borderRadius: '999px',
              padding: '3px 8px',
              border: `1px solid ${award.bg}44`,
              transform: `scale(${popSpring})`,
            }}
          >
            <span style={{ fontSize: '14px' }}>{award.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#D7DADC' }}>
              {award.count}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Expandable Comment Thread ──────────────────────────────────────────────
const RedditCommentBlock: React.FC<{
  author: string;
  timeAgo: string;
  content: string;
  upvotes: string;
  accentColor: string;
  frame: number;
  delayFrames: number;
}> = ({ author, timeAgo, content, upvotes, accentColor, frame, delayFrames }) => {
  const elapsed = (frame - delayFrames) / 30;
  if (elapsed <= 0) return null;
  const springP = closedFormSpring(elapsed, 160, 22);

  return (
    <div
      style={{
        marginTop: '16px',
        padding: '16px 20px',
        backgroundColor: '#1E1E20',
        borderRadius: '16px',
        borderLeft: `4px solid ${accentColor}`,
        borderTop: '1px solid #2D2D30',
        borderRight: '1px solid #2D2D30',
        borderBottom: '1px solid #2D2D30',
        transform: `translateY(${(1 - springP) * 30}px) scale(${0.95 + springP * 0.05})`,
        opacity: springP,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 900,
            color: '#FFFFFF',
          }}
        >
          {author[0].toUpperCase()}
        </div>
        <span style={{ fontWeight: 700, color: '#D7DADC' }}>u/{author}</span>
        <span style={{ color: '#818384', fontSize: '12px' }}>• {timeAgo}</span>
        <span
          style={{
            marginLeft: 'auto',
            backgroundColor: '#FF450022',
            color: '#FF4500',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '999px',
            fontWeight: 800,
          }}
        >
          TOP COMMENT
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '17px', color: '#EAEDEF', lineHeight: 1.45, fontWeight: 500 }}>
        {content}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: '#818384' }}>
        <span>▲ {upvotes}</span>
        <span>💬 Reply</span>
        <span>⚡ Share</span>
      </div>
    </div>
  );
};

// ─── Main RedditStory Composition ───────────────────────────────────────────
export const RedditStoryComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#FF4500',
  accentColor = '#FFB000',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'r/DarkStories',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const time = frame / fps;

  // Scene timing resolution
  let accumulatedTime = 0;
  let activeSceneIndex = 0;
  let sceneLocalTime = 0;
  let sceneStartFrame = 0;

  for (let i = 0; i < scenes.length; i++) {
    const dur = scenes[i].durationSeconds || 5;
    if (time >= accumulatedTime && time < accumulatedTime + dur) {
      activeSceneIndex = i;
      sceneLocalTime = time - accumulatedTime;
      sceneStartFrame = Math.round(accumulatedTime * fps);
      break;
    }
    accumulatedTime += dur;
  }

  const currentScene = scenes[activeSceneIndex] || scenes[0] || ({} as SceneSegment);
  const dur = currentScene.durationSeconds || 5;
  const isLandscape = format === 'horizontal' || width > height;

  // Springs & Motion
  const cardEnter = closedFormSpring(sceneLocalTime, 140, 20);
  const scrollProg = Math.min(1, sceneLocalTime / dur);

  // Auto-scroll mechanics: text container moves upwards smoothly
  const textScrollY = scrollProg > 0.4 ? (scrollProg - 0.4) * -120 : 0;

  // Paragraph extraction
  const caption = currentScene.captionText || 'Eu descobri um segredo de família que ninguém jamais deveria saber...';
  const words = currentScene.words || [];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0E1113',
        overflow: 'hidden',
        fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif',
      }}
    >
      {/* ── 1. Dynamic Ambient Background ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 25%, ${primaryColor}22 0%, transparent 65%),
            radial-gradient(circle at 80% 80%, #1A1A1B 0%, #0E1113 100%)
          `,
        }}
      />

      {/* Subtle Reddit Grid lines */}
      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '100% 32px',
          opacity: 0.7,
        }}
      />

      {/* Floating Emojis Reaction stream */}
      <FloatingReactionEmojis frame={frame} sceneLocalTime={sceneLocalTime} />

      {/* ── 2. Top Subreddit Bar ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '24px' : '48px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: isLandscape ? '70%' : '90%',
          maxWidth: '880px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Reddit Snoo Logo Avatar */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 16px ${primaryColor}66`,
            }}
          >
            <span style={{ fontSize: '24px' }}>🤖</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#FFFFFF', fontWeight: 900, fontSize: '18px' }}>
                r/Confissões
              </span>
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: '#272729',
                  color: '#FF4500',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 800,
                }}
              >
                JOIN
              </span>
            </div>
            <span style={{ color: '#818384', fontSize: '13px' }}>
              Posted by u/anônimo_misterioso • 4h ago
            </span>
          </div>
        </div>

        {/* Top Right Action button */}
        <div
          style={{
            backgroundColor: '#272729',
            padding: '8px 16px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#D7DADC',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🔔</span> Notificações
        </div>
      </div>

      {/* ── 3. Main Reddit Post Card ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isLandscape ? '0 100px' : '0 24px',
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: isLandscape ? '70%' : '92%',
            maxWidth: '880px',
            backgroundColor: '#1A1A1B',
            borderRadius: '24px',
            border: '1px solid #343536',
            boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 35px rgba(255,69,0,0.12)',
            padding: isLandscape ? '28px' : '26px 20px',
            display: 'flex',
            gap: '16px',
            transform: `translateY(${(1 - cardEnter) * 50}px) scale(${0.96 + cardEnter * 0.04})`,
            opacity: cardEnter,
            position: 'relative',
          }}
        >
          {/* Left Column: Upvote Bar */}
          <RedditUpvoteCounter baseCount={14200} sceneLocalTime={sceneLocalTime} />

          {/* Right Column: Title, Content, Awards & Threads */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
            {/* Awards row */}
            <RedditAwards frame={frame} startDelay={sceneStartFrame + 5} />

            {/* Post Title */}
            <h1
              style={{
                margin: 0,
                fontSize: isLandscape ? '28px' : '26px',
                fontWeight: 800,
                color: '#D7DADC',
                lineHeight: 1.3,
              }}
            >
              {currentScene.letteringLines?.[0]?.text || 'Descobri a verdade que estavam escondendo de todos.'}
            </h1>

            {/* Post Body with Karaoke or Paragraph Highlight */}
            <div
              style={{
                transform: `translateY(${textScrollY}px)`,
                transition: 'none',
              }}
            >
              {words.length > 0 ? (
                <p style={{ margin: 0, fontSize: isLandscape ? '22px' : '20px', lineHeight: 1.55 }}>
                  {words.map((w, wIdx) => {
                    const isWordActive = time >= w.startInSeconds && time <= w.endInSeconds;
                    const isPassed = time > w.endInSeconds;

                    return (
                      <span
                        key={wIdx}
                        style={{
                          color: isWordActive ? '#FFFFFF' : isPassed ? '#D7DADC' : '#818384',
                          backgroundColor: isWordActive ? `${primaryColor}44` : 'transparent',
                          padding: isWordActive ? '2px 4px' : '0',
                          borderRadius: '4px',
                          fontWeight: isWordActive ? 800 : 500,
                          marginRight: '6px',
                          display: 'inline-block',
                          transform: isWordActive ? 'scale(1.05)' : 'none',
                          transition: 'none',
                        }}
                      >
                        {w.word}
                      </span>
                    );
                  })}
                </p>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: isLandscape ? '22px' : '20px',
                    lineHeight: 1.5,
                    color: '#EAEDEF',
                    fontWeight: 500,
                  }}
                >
                  {caption}
                </p>
              )}

              {/* Expandable Comment */}
              <RedditCommentBlock
                author="detetive_da_net"
                timeAgo="2h ago"
                content="Isso faz total sentido com o que aconteceu há 3 anos atrás... ninguém quis acreditar!"
                upvotes="4.8k"
                accentColor={accentColor}
                frame={frame}
                delayFrames={sceneStartFrame + 25}
              />
            </div>

            {/* Post Footer Action Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                paddingTop: '12px',
                borderTop: '1px solid #272729',
                color: '#818384',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              <span>💬 1.4k Comentários</span>
              <span>⚡ Compartilhar</span>
              <span>⭐ Salvar</span>
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* ── 4. Brand Watermark ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '20px' : '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            backgroundColor: 'rgba(26,26,27,0.85)',
            border: '1px solid #343536',
            borderRadius: '999px',
            color: '#818384',
            fontSize: '14px',
            fontWeight: 700,
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ color: primaryColor }}>●</span>
          <span>{watermarkText}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
