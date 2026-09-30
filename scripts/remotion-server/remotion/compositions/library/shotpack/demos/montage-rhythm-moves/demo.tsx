// Domino cascade entry (domino-cascade) — Rube Goldberg / OK Go music video.
// Three-stage momentum chain, each stage's startFrame = the previous stage's impact frame:
// ① frames 36–51 the title "CHAIN REACTION" falls from off-screen top with ease-in(cubic) slamming into the upper half,
//    impact frame 51 shakes the full frame vertically for one beat (4f decay);
// ② from frame 51 the 4 cards below are jolted one by one (every 5f) up 60px on a parabola and fall back (12f),
//    the last card lands at frame 78 = the second impact (another beat of shake + the last card tilts left 3° giving horizontal momentum);
// ③ frames 78–100 the dark sidebar on the left is pushed in horizontally, Easing.out(cubic) with overshoot bounce-back; frames 100–150 full true stillness.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card, TitleBlock } from '../../_fixtures/Fixtures';

const easeInCubic = Easing.in(Easing.cubic);
const easeOutCubic = Easing.out(Easing.cubic);

// — key frames —
const TITLE_START = 36; // fall starts (first 36f hold to read the set)
const IMPACT_1 = 51; // title lands = first impact
const CARD_STAGGER = 5;
const CARD_DUR = 12;
const IMPACT_2 = IMPACT_1 + 3 * CARD_STAGGER + CARD_DUR; // 78, last card lands
const SIDE_END = IMPACT_2 + 14; // 92 sidebar in place (overshoot point)
const SIDE_SETTLE = SIDE_END + 8; // 100 rebound done, true stillness after

// Impact shake: one beat, decays to zero within 4f
const shake = (f: number, at: number, amp: number) => {
  if (f < at || f > at + 4) return 0;
  const seq = [amp, -amp * 0.6, amp * 0.3, -amp * 0.12, 0];
  return seq[f - at];
};

// Card row geometry: content centered at 1080 (leaving room for the 240 sidebar on the left)
const CARD_W = 340;
const CARD_H = 220;
const GAP = 40;
const ROW_W = 4 * CARD_W + 3 * GAP; // 1480
const ROW_LEFT = 1080 - ROW_W / 2; // 340
const CARD_TOP = 700; // card bottom at 920, resting on the floor line

export const DominoCascade: React.FC = () => {
  const frame = useCurrentFrame();

  // ① Title slam: off-screen top → upper half, ease-in acceleration reads as "slam"
  const titleTop = interpolate(frame, [TITLE_START, IMPACT_1], [-260, 240], {
    easing: easeInCubic,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Full-frame vertical shake on both impacts
  const shakeY = shake(frame, IMPACT_1, 10) + shake(frame, IMPACT_2, 6);

  // ② Card bounce: parabola 4t(1-t), staggered every 5f
  const cardDy = (i: number) => {
    const s = IMPACT_1 + i * CARD_STAGGER;
    const t = Math.min(1, Math.max(0, (frame - s) / CARD_DUR));
    return -60 * 4 * t * (1 - t);
  };
  // Last card tilts left 3° when it lands (the visible origin of the horizontal momentum), then rights itself
  const lastCardRot = interpolate(
    frame,
    [IMPACT_2 - 9, IMPACT_2, SIDE_END],
    [0, -3, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // ③ Sidebar pushed in horizontally: slides in with initial speed + overshoot bounce-back
  let sideX: number;
  if (frame < IMPACT_2) {
    sideX = -260;
  } else if (frame < SIDE_END) {
    const t = (frame - IMPACT_2) / (SIDE_END - IMPACT_2);
    sideX = -260 + 272 * easeOutCubic(t); // pushes to +12 (~5% overshoot)
  } else if (frame < SIDE_SETTLE) {
    const t = (frame - SIDE_END) / (SIDE_SETTLE - SIDE_END);
    sideX = 12 * (1 - Easing.inOut(Easing.quad)(t));
  } else {
    sideX = 0;
  }

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, overflow: 'hidden', position: 'relative' }}>
      {/* full-frame shake container */}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${shakeY}px)` }}>
        {/* floor line: card landing point */}
        <div style={{ position: 'absolute', left: ROW_LEFT - 30, top: 928, width: ROW_W + 60, height: 6, background: G.bar, borderRadius: 3 }} />

        {/* ① title slamming down */}
        <div style={{ position: 'absolute', left: 240, width: 1680, top: titleTop, display: 'flex', justifyContent: 'center' }}>
          <TitleBlock text="CHAIN REACTION" size={120} />
        </div>

        {/* ② the 4 cards bounced up by the shake */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: ROW_LEFT + i * (CARD_W + GAP),
              top: CARD_TOP,
              transform: `translateY(${cardDy(i)}px)${i === 3 ? ` rotate(${lastCardRot}deg)` : ''}`,
              transformOrigin: '50% 100%',
            }}
          >
            <Card w={CARD_W} h={CARD_H} seed={i + 2} />
          </div>
        ))}

        {/* ③ sidebar pushed in */}
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: 240, height: 1080,
            background: G.side, transform: `translateX(${sideX}px)`,
            padding: '32px 24px', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', gap: 22,
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#777775' }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 13, width: `${58 + ((i * 31) % 38)}%`, background: G.sideBar, borderRadius: 6 }} />
          ))}
        </div>
      </div>
    </div>
  );
};
