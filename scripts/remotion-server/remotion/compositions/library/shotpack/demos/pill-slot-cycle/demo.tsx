// pill-slot-cycle — in-sentence word-slot cycling: a fixed stem + a slot-machine pill that rolls one notch at the sentence end
// Source: notion-ai 4.5–8.5s. The old pill flies up and fades out while the new pill slides in from below with motion blur;
// after 6 swaps the pill disappears and the sentence settles into "One AI tool to do it all."
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';

const FONT = 'Helvetica, Arial, sans-serif';

const PILLS = [
  { label: 'Ask a question', icon: '?' },
  { label: 'Find in Drive', icon: '▲' },
  { label: 'Find in Slack', icon: '#' },
  { label: 'Summarize', icon: '≡' },
  { label: 'Improve writing', icon: '✎' },
  { label: 'Draft an agenda', icon: '☰' },
];

const BEAT = 21; // ~0.7s @30fps
const INTRO = 12; // stem entrance
const CYCLES = PILLS.length;

const Pill: React.FC<{ label: string; icon: string; style?: React.CSSProperties }> = ({
  label,
  icon,
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 16,
      padding: '14px 36px 14px 24px',
      borderRadius: 999,
      background: '#fff',
      border: `3px solid ${G.border}`,
      boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 64,
      color: G.ink,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    <span
      style={{
        width: 58,
        height: 58,
        borderRadius: 14,
        background: G.bg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 38,
        color: G.mid,
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
    {label}
  </div>
);

export const PillSlotCycle: React.FC = () => {
  const frame = useCurrentFrame();

  // Stem entrance: ease-out rise and fade-in
  const stemT = interpolate(frame, [0, INTRO], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const cycleStart = INTRO;
  const cycleEnd = cycleStart + CYCLES * BEAT;

  // Which pill beat we're currently on
  const rel = frame - cycleStart;
  const idx = Math.min(Math.floor(rel / BEAT), CYCLES - 1);
  const beatFrame = rel - idx * BEAT;

  const SWAP = 8; // each beat completes its swap within the first 8f

  // Finale: the pill flies up and disappears, "do it all." slides in from below and settles
  const isFinale = frame >= cycleEnd;
  const finT = interpolate(frame, [cycleEnd, cycleEnd + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.4)),
  });

  // Slot content rendering
  let slot: React.ReactNode = null;
  if (!isFinale && rel >= 0) {
    const incoming = PILLS[idx];
    const outgoing = idx > 0 ? PILLS[idx - 1] : null;

    // New pill: slides in from +120px below with blur, ease-out
    const inT = interpolate(beatFrame, [0, SWAP], [0, 1], {
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    const inY = interpolate(inT, [0, 1], [120, 0]);
    const inBlur = interpolate(inT, [0, 0.7, 1], [14, 4, 0]);

    // Old pill: flies up -120px accelerating and fades out
    const outT = interpolate(beatFrame, [0, SWAP - 1], [0, 1], {
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.cubic),
    });
    const outY = interpolate(outT, [0, 1], [0, -130]);

    slot = (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Invisible placeholder holding the slot width (current pill) */}
        <Pill label={incoming.label} icon={incoming.icon} style={{ visibility: 'hidden' }} />
        {outgoing && outT < 1 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translateY(${outY}px)`,
              opacity: 1 - outT,
              filter: `blur(${outT * 10}px)`,
            }}
          >
            <Pill label={outgoing.label} icon={outgoing.icon} />
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translateY(${inY}px)`,
            opacity: idx === 0 ? inT : Math.min(1, inT * 1.6),
            filter: `blur(${inBlur}px)`,
          }}
        >
          <Pill label={incoming.label} icon={incoming.icon} />
        </div>
      </div>
    );
  } else if (isFinale) {
    // The last pill flies up and exits (first 8f), then "do it all." settles in
    const lastOutT = interpolate(frame, [cycleEnd, cycleEnd + 7], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.cubic),
    });
    slot = (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <span
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 96,
            color: G.ink,
            letterSpacing: -1,
            display: 'inline-block',
            opacity: finT,
            transform: `translateY(${(1 - finT) * 90}px)`,
            filter: `blur(${(1 - finT) * 8}px)`,
            whiteSpace: 'nowrap',
          }}
        >
          do it all.
        </span>
        {lastOutT < 1 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: -8,
              transform: `translateY(${-130 * lastOutT}px)`,
              opacity: 1 - lastOutT,
              filter: `blur(${lastOutT * 10}px)`,
            }}
          >
            <Pill label={PILLS[CYCLES - 1].label} icon={PILLS[CYCLES - 1].icon} />
          </div>
        )}
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ background: G.bg }}>
      {/* Stem fixed in place: the whole line is anchored at its left end and never re-centers with the pill width */}
      <div
        style={{
          position: 'absolute',
          left: 300,
          top: 540,
          transform: `translateY(calc(-50% + ${(1 - stemT) * 50}px))`,
          display: 'flex',
          alignItems: 'center',
          gap: 36,
          opacity: stemT,
        }}
      >
        <span
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 96,
            color: G.ink,
            letterSpacing: -1,
            whiteSpace: 'nowrap',
          }}
        >
          One AI tool to
        </span>
        {slot}
      </div>
    </AbsoluteFill>
  );
};
