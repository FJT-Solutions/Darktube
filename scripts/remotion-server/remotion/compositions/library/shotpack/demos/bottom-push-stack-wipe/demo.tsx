// bottom-push-stack-wipe — slack-promo 22–27s
// Chapter-change technique: the new scene, background color included, is pushed up
// from the bottom edge as a full screen, shoving the old scene off-frame —
// three chapters pushed in a row (three saturated background colors; each chapter
// pins a grayscale window card at center that rides along with its background).
// Push-in uses a heavy ease-out (fast in, slow stop).
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Card, G } from '../../_fixtures/Fixtures';

const H = 1080;

// Chapter definitions: background color + card seed. Chapter 0 is the opening grayscale scene.
const CHAPTERS = [
  { color: G.bg, label: 0 },
  { color: '#2bac76', label: 1 }, // green
  { color: '#36c5f0', label: 2 }, // blue
  { color: '#e01e5a', label: 3 }, // pink
];

// Start frame of each chapter's push-in; each push takes ~32 frames, then holds
const PUSH_STARTS = [18, 55, 92];
const PUSH_DUR = 30;

const heavyEaseOut = Easing.bezier(0.12, 0.9, 0.2, 1); // fast in, slow stop

const ChapterScene: React.FC<{ chapter: number }> = ({ chapter }) => {
  const c = CHAPTERS[chapter];
  return (
    <AbsoluteFill style={{ background: c.color, justifyContent: 'center', alignItems: 'center' }}>
      {/* Soft decorative bars on the background color, making it readable that the background is moving too */}
      {chapter > 0 && (
        <>
          <div style={{ position: 'absolute', top: 90, left: 120, width: 500, height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.28)' }} />
          <div style={{ position: 'absolute', bottom: 110, right: 140, width: 340, height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.22)' }} />
          <div style={{ position: 'absolute', top: 160, right: 220, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
        </>
      )}
      {/* Grayscale window card pinned at center */}
      <div style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.28)', borderRadius: 18 }}>
        <div style={{ width: 860, background: '#f2f2f0', borderRadius: '18px 18px 0 0', height: 52, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', boxSizing: 'border-box', border: `2px solid ${G.border}`, borderBottom: 'none' }}>
          {['#e0605a', '#e8b93e', '#67bb5a'].map((dot, i) => (
            <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: dot }} />
          ))}
          <div style={{ marginLeft: 18, height: 14, width: 220, background: G.bar, borderRadius: 7 }} />
        </div>
        <Card w={860} h={430} seed={chapter + 2} style={{ borderRadius: '0 0 18px 18px', padding: 34 }} />
      </div>
    </AbsoluteFill>
  );
};

export const BottomPushStackWipe: React.FC = () => {
  const frame = useCurrentFrame();
  // Push-in progress for each chapter
  const progress = PUSH_STARTS.map((s) =>
    interpolate(frame, [s, s + PUSH_DUR], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: heavyEaseOut,
    })
  );
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: G.bg }}>
      {CHAPTERS.map((_, i) => {
        // Chapter i's offset = its own push-in progress + the push-out from the following chapter
        const pushedIn = i === 0 ? 1 : progress[i - 1]; // its own entry
        const pushedOut = i < CHAPTERS.length - 1 ? progress[i] : 0; // pushed out by the next chapter
        const y = (1 - pushedIn) * H - pushedOut * H;
        if (y <= -H || y >= H) return null;
        return (
          <AbsoluteFill key={i} style={{ transform: `translateY(${y}px)` }}>
            <ChapterScene chapter={i} />
            {/* Seam shadow on the top edge during push-in, reinforcing the physical "shove-out" feel */}
            {i > 0 && (
              <div style={{ position: 'absolute', top: -40, left: 0, right: 0, height: 40, background: 'linear-gradient(to top, rgba(0,0,0,0.30), rgba(0,0,0,0))', opacity: pushedIn < 1 ? 1 : 0 }} />
            )}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
