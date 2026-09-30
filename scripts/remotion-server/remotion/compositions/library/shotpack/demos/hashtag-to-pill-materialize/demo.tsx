// hashtag-to-pill-materialize (bear-app 18–21.5s remake, frame-matched against the source)
// Measured source timing (25fps, frame-by-frame):
//  1) Typing "#music" centered on white: geometric sans-serif (Futura feel), medium-gray ink,
//     solid red caret that stays lit (no blink), human typing rhythm
//  2) Materialize = a 1-frame hard cut: text + caret → wide light-gray borderless pill +
//     gray beamed eighth-note icon + "music" (same font size, # replaced by the icon)
//  3) Pause ~0.6s → smooth shrink as a whole (→~0.55x) and shift left onto the page's tag slot (~0.55s, easeInOut)
//  4) Another 1-frame hard cut reveals the finished note page: cream background, dark-green headline
//     "My favorite bands", pill switched to sage green, three lines of body text —
//     the source has no "pill flies in and slides into a card" segment (batch 8's flight was fabricated, removed)
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';

const FONT = "Futura, 'Century Gothic', 'Avenir Next', 'Trebuchet MS', sans-serif";

const C = {
  bgWhite: '#fcfcfb',
  bgCream: '#f4f1e5',
  ink: '#454543',
  cursor: '#e0453f',
  pillGray: '#e9e9e7',
  pillTextGray: '#4b4b49',
  iconGray: '#7e7e7c',
  pillSage: '#d5e0cf',
  iconSage: '#5c7a63',
  titleGreen: '#2d5c47',
  pillSageText: '#3f5e4c',
  body: '#4c4b43',
};

// ---- mulberry32 (only for human-typing jitter in the rhythm, deterministic) ----
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEXT = '#music';
// Typing start & per-character interval (frames), 4–8 frames with jitter to mimic the source's human rhythm
const TYPE_START = 8;
const rand = mulberry32(20260717);
const TYPE_AT: number[] = (() => {
  const at: number[] = [];
  let f = TYPE_START;
  for (let i = 0; i < TEXT.length; i++) {
    at.push(f);
    f += 4 + Math.floor(rand() * 3); // 4–6 frames (source ~6 chars/sec)
  }
  return at;
})();

// ---- Timeline (30fps, 132 frames total, aligned with source 18–21.5s) ----
const MORPH = 48;       // 1-frame hard-cut materialize (hold ~0.5s after typing, source 0.45s)
const MOVE_START = 66;  // pill starts shrinking + moving left (0.6s after morph, same as source)
const MOVE_END = 80;    // lands in slot (0.47s, source ~0.45s)
const REVEAL = 83;      // 1-frame hard cut reveals the finished page, then stillness to close

// ---- Geometry (1920x1080, scaled proportionally from measured 1280x720 source pixels) ----
const FS = 132;                       // typing/pill font size (scaled from source glyph height)
const HERO = { x: 960, y: 540 };      // large pill center
const PILL_W = 740, PILL_H = 236;     // measured 493x157 @720p ×1.5
const END_SCALE = 0.554;              // landing scale (source 273/493)
const SLOT = { x: 361, y: 473 };      // tag slot center (compromise between the source pill landing (244.5,317.5)×1.5 and the reveal spot)

// Gray beamed eighth-note icon (source uses a beamed double note, not ♪)
const NoteIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'block' }}>
    <ellipse cx="11" cy="39" rx="7.2" ry="5.6" fill={color} transform="rotate(-18 11 39)" />
    <ellipse cx="35" cy="35" rx="7.2" ry="5.6" fill={color} transform="rotate(-18 35 35)" />
    <rect x="15.4" y="12.5" width="3" height="27" fill={color} />
    <rect x="39.4" y="8.5" width="3" height="27" fill={color} />
    <polygon points="15.4,12.5 42.4,8.5 42.4,16.5 15.4,20.5" fill={color} />
  </svg>
);

// Pill (drawn at large font size, scaled via transform so the text stays the same size before/after materializing)
const Pill: React.FC<{ bg: string; iconColor: string; textColor: string }> = ({ bg, iconColor, textColor }) => (
  <div style={{
    width: PILL_W, height: PILL_H, borderRadius: PILL_H / 2, background: bg,
    display: 'flex', alignItems: 'center', paddingLeft: 96, boxSizing: 'border-box', gap: 66,
  }}>
    <NoteIcon size={104} color={iconColor} />
    <span style={{ fontSize: FS, fontWeight: 500, color: textColor, letterSpacing: 2 }}>music</span>
  </div>
);

export const HashtagToPillMaterialize: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- Typing ----
  const typedCount = TYPE_AT.filter((t) => frame >= t).length;
  const typed = TEXT.slice(0, typedCount);

  // ---- Shrink + shift left ----
  const moveT = interpolate(frame, [MOVE_START, MOVE_END], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.5, 0, 0.25, 1),
  });
  const px = interpolate(moveT, [0, 1], [HERO.x, SLOT.x]);
  const py = interpolate(moveT, [0, 1], [HERO.y, SLOT.y]);
  const ps = interpolate(moveT, [0, 1], [1, END_SCALE]);
  // Slight settle at the moment of materializing (source is nearly a hard cut; just 3 frames 1.03→1 to avoid stiffness)
  const settle = interpolate(frame, [MORPH, MORPH + 3], [1.03, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad),
  });

  const revealed = frame >= REVEAL;

  return (
    <AbsoluteFill style={{ background: revealed ? C.bgCream : C.bgWhite, fontFamily: FONT }}>
      {/* Finished page (hard-cut reveal, then fully still) */}
      {revealed && (
        <>
          <div style={{
            position: 'absolute', left: 160, top: 168,
            fontSize: 122, fontWeight: 700, color: C.titleGreen, letterSpacing: 0.5,
          }}>
            My favorite bands
          </div>
          <div style={{
            position: 'absolute', left: 152, top: 618,
            fontSize: 70, fontWeight: 500, color: C.body, lineHeight: 1.33, letterSpacing: 0.3,
          }}>
            I want to share a few of my favorite bands<br />
            and the song that I always listen when driving<br />
            to home. Welcome. Bring headphones.
          </div>
        </>
      )}

      {/* Typing layer: text + always-lit red caret (source caret doesn't blink); disappears entirely on the materialize frame */}
      {frame < MORPH && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: FS, fontWeight: 500, color: C.ink, letterSpacing: 2, whiteSpace: 'pre' }}>
              {typed}
            </span>
            <span style={{
              display: 'inline-block', width: 7, height: 150,
              background: C.cursor, marginLeft: 8, borderRadius: 2,
            }} />
          </div>
        </AbsoluteFill>
      )}

      {/* Pill layer: appears via 1-frame hard cut → hold → shrink + shift into slot → sage green on the reveal frame */}
      {frame >= MORPH && (
        <div style={{
          position: 'absolute', left: 0, top: 0,
          // origin must be 0 0: translate first moves the origin to the target center, then scale rotates around it;
          // otherwise the default 50% 50% would drift the center by (1-s)*half-width on landing
          transformOrigin: '0 0',
          transform: `translate(${px}px, ${py}px) scale(${ps * settle})`,
        }}>
          <div style={{ transform: 'translate(-50%, -50%)' }}>
            {revealed
              ? <Pill bg={C.pillSage} iconColor={C.iconSage} textColor={C.pillSageText} />
              : <Pill bg={C.pillGray} iconColor={C.iconGray} textColor={C.pillTextGray} />}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
