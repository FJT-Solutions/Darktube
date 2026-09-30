// icon-flip-bloom-logo — the icon flips and flattens along the Y axis into a vertical line, then blooms into a flower-shaped mark + wordmark sweeps out
// Source: perplexity-promo 88–91.5s. The smiley-laptop icon wiggles twice in anticipation →
// flips flat along the Y axis into a vertical line (motion trails/blur) → blooms into a flower-shaped mark past the thinnest point (petals opening) →
// the wordmark sweeps out from the right of the mark segment by segment with directional blur (characters going from blurry to sharp).
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from 'remotion';
import { G } from '../../_fixtures/Fixtures';

const FONT = 'Helvetica, Arial, sans-serif';
const INK = '#20808d'; // the flower mark uses a touch of teal, the rest is grayscale

const SmileLaptop: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <rect x={7} y={6} width={26} height={20} rx={3.5} fill="#fff" stroke={G.ink} strokeWidth={3} />
    <circle cx={15.5} cy={13.5} r={2} fill={G.ink} />
    <circle cx={24.5} cy={13.5} r={2} fill={G.ink} />
    <path d="M14 18.5 Q20 23.5 26 18.5" stroke={G.ink} strokeWidth={2.8} fill="none" strokeLinecap="round" />
    <path d="M3.5 31.5 L36.5 31.5" stroke={G.ink} strokeWidth={3.6} strokeLinecap="round" />
  </svg>
);

// 5-petal abstract flower mark, bloom: 0 (closed vertical line) → 1 (fully open)
const FlowerMark: React.FC<{ size: number; bloom: number }> = ({ size, bloom }) => {
  const petals = 5;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100">
      {Array.from({ length: petals }).map((_, i) => {
        // Spread from vertical (-90°) to both sides into an even distribution
        const finalAngle = -90 + (i - (petals - 1) / 2) * (360 / petals);
        const angle = interpolate(bloom, [0, 1], [-90, finalAngle]);
        const len = interpolate(bloom, [0, 1], [20, 38]);
        const wid = interpolate(bloom, [0, 1], [3, 15]);
        return (
          <ellipse
            key={i}
            cx={0}
            cy={-len / 2}
            rx={wid / 2}
            ry={len / 2}
            fill={INK}
            opacity={0.92}
            transform={`rotate(${angle + 90})`}
          />
        );
      })}
      <circle r={interpolate(bloom, [0, 1], [2, 9])} fill={G.ink} />
    </svg>
  );
};

const WORD = 'perplexity';

export const IconFlipBloomLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ---- Timeline ----
  // 0–10: icon appears (fade in with a slight pop)
  // 12–34: anticipation — tilts and wiggles twice to charge up
  // 34–46: flips flat along the Y axis into a vertical line (scaleX -> 0.04, with motion trails)
  // 46–62: blooms into the flower past the thinnest point (bloom 0->1 with overshoot)
  // 64–100: mark shifts left to make room + wordmark sweeps in character by character with directional blur
  const FLIP_START = 34;
  const FLIP_MID = 46;
  const BLOOM_END = 62;
  const WORD_START = 66;

  // Entrance
  const inT = spring({ frame, fps, config: { damping: 13, stiffness: 140, mass: 0.8 } });

  // Anticipation: two tilting wobbles with increasing amplitude (-10° / +14°), then a final press in the opposite direction to charge up
  const wobble =
    interpolate(frame, [12, 18, 24, 30, FLIP_START], [0, -12, 14, -18, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.sin),
    });

  // First half of the flip: scaleX 1 -> 0.04 (accelerating in), with motion trails
  const flipIn = interpolate(frame, [FLIP_START, FLIP_MID], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const iconScaleX = interpolate(flipIn, [0, 1], [1, 0.04]);

  // Bloom: spring overshoot
  const bloomSpring = spring({
    frame: frame - FLIP_MID,
    fps,
    config: { damping: 11, stiffness: 130, mass: 0.9 },
  });
  const bloom = frame < FLIP_MID ? 0 : bloomSpring;
  // The mark expands from the vertical-line thickness: scaleX 0.04 -> 1
  const markScaleX = interpolate(bloom, [0, 1], [0.04, 1]);

  // Mark shifts left to make room (as the wordmark appears)
  const shift = interpolate(frame, [WORD_START - 2, WORD_START + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const markX = interpolate(shift, [0, 1], [0, -420]);

  const showIcon = frame < FLIP_MID;

  // Motion-trail frames (draw 2 ghost copies during the flip)
  const ghosts = frame >= FLIP_START && frame < FLIP_MID ? [0.12, 0.24] : [];

  return (
    <AbsoluteFill style={{ background: G.bg, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 1920, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Icon / mark container */}
        <div
          style={{
            position: 'absolute',
            left: 960 + markX,
            top: 200,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {showIcon ? (
            <>
              {ghosts.map((g, i) => {
                const gs = Math.min(1, iconScaleX + g);
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) scaleX(${gs})`,
                      opacity: 0.22 - i * 0.08,
                      filter: 'blur(6px)',
                    }}
                  >
                    <SmileLaptop size={340} />
                  </div>
                );
              })}
              <div
                style={{
                  transform: `scale(${inT}) rotate(${wobble}deg) scaleX(${iconScaleX})`,
                  transformOrigin: 'center 78%',
                  filter: flipIn > 0.3 ? `blur(${flipIn * 5}px)` : 'none',
                  opacity: inT,
                }}
              >
                <SmileLaptop size={340} />
              </div>
            </>
          ) : (
            <div style={{ transform: `scaleX(${markScaleX})` }}>
              <FlowerMark size={340} bloom={bloom} />
            </div>
          )}
        </div>

        {/* Wordmark: swept in character by character with directional blur */}
        <div
          style={{
            position: 'absolute',
            left: 960 + markX + 230,
            top: 200,
            transform: 'translateY(-50%)',
            display: 'flex',
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 150,
            color: G.ink,
            letterSpacing: 2,
          }}
        >
          {WORD.split('').map((ch, i) => {
            const cT = interpolate(frame, [WORD_START + i * 2.2, WORD_START + i * 2.2 + 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.out(Easing.cubic),
            });
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  opacity: cT,
                  transform: `translateX(${(1 - cT) * -70}px)`,
                  filter: `blur(${(1 - cT) * 16}px)`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
