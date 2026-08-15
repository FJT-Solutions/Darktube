// overhead-tabletop-drop | god's-eye view glide down to a desktop
// Three "page cards" laid flat with rotateX(62°) form a tabletop card array inside perspective(1600px).
// 0–55f the camera glides sideways (only translateX moves, ease-in-out); 55–85f it plunges in:
// rotateX 62→0 + world scale 1→2.0 (2% overshoot) + translateX -650→0 all run together,
// the middle card lining up to land as a full-screen dashboard in front view. All animation ends at f=93, with 52f of true stillness at the end.
// Card 996×560 (spec 900→996 so FakeDashboard's 0.5185 scale fits perfectly and the
// 16:9 landing aligns precisely), 140px apart.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { FakeDashboard, Card, G } from '../../_fixtures/Fixtures';

const CARD_W = 996;
const CARD_H = 560;
const GAP = 140;
const PITCH = CARD_W + GAP; // 1136
const INNER = CARD_H / 1080; // 0.5185: FakeDashboard scaled down fills the card exactly

const PAN_END = 55;
const DROP_END = 85;

// Single "page card": white rounded card whose content is scaled by INNER to fill it
const PageCard: React.FC<{ x: number; children: React.ReactNode }> = ({ x, children }) => (
  <div
    style={{
      position: 'absolute',
      left: x - CARD_W / 2,
      top: -CARD_H / 2,
      width: CARD_W,
      height: CARD_H,
      background: G.card,
      border: `2px solid ${G.border}`,
      borderRadius: 14,
      overflow: 'hidden',
      boxSizing: 'border-box',
      boxShadow: '0 24px 48px rgba(0,0,0,0.22)',
      backfaceVisibility: 'hidden',
      transform: 'translateZ(4px)',
    }}
  >
    <div style={{ width: 1920, height: 1080, transform: `scale(${INNER})`, transformOrigin: '0 0' }}>
      {children}
    </div>
  </div>
);

export const OverheadTabletopDrop: React.FC = () => {
  const f = useCurrentFrame();

  // 0–55f side glide: only translateX moves, ease-in-out
  const panX = interpolate(f, [0, PAN_END], [700, -650], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 55–85f plunge: angle / scale / offset run together, out-cubic + 2% overshoot
  const drop = interpolate(f, [PAN_END, DROP_END], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rotX = interpolate(f, [PAN_END, DROP_END, DROP_END + 4, DROP_END + 8], [62, -1.8, 0.6, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(f, [PAN_END, DROP_END, DROP_END + 7], [1, 2.04, 2.0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dropX = interpolate(drop, [0, 1], [panX, 0]); // the drop segment pulls -650 back to 0

  const tx = f <= PAN_END ? panX : dropX;

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, perspective: 1600, perspectiveOrigin: '50% 42%' }}>
        {/* World origin = screen center; first in-plane scale, then rotateX, then translateX */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            transform: `translateX(${tx}px) rotateX(${rotX}deg) scale(${scale})`,
          }}
        >
          {/* Tabletop: light gray base + grid lines giving the side-glide segment motion reference */}
          <div
            style={{
              position: 'absolute',
              left: -2800,
              top: -760,
              width: 5600,
              height: 1520,
              background: '#e6e6e4',
              backgroundImage: `repeating-linear-gradient(90deg, ${G.line} 0px, ${G.line} 2px, transparent 2px, transparent 160px), repeating-linear-gradient(0deg, ${G.line} 0px, ${G.line} 2px, transparent 2px, transparent 160px)`,
              backfaceVisibility: 'hidden',
            }}
          />
          <PageCard x={-PITCH}>
            <FakeDashboard variant="B" />
          </PageCard>
          {/* Target page: lands filling the screen */}
          <PageCard x={0}>
            <FakeDashboard variant="A" />
          </PageCard>
          <PageCard x={PITCH}>
            <div
              style={{
                width: 1920,
                height: 1080,
                background: G.panel,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Card w={760} h={520} seed={4} />
            </div>
          </PageCard>
        </div>
      </div>
    </AbsoluteFill>
  );
};
