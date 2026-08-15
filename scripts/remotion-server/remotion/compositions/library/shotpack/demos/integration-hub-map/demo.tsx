// integration-hub-map v5 — batch 14 single-point rhythm fix:
// user feedback (verbatim) "The motion is right, but the flip should be fast, slowing down near the end as it completes"
// → rotateY 0→180° changed to a fast flip with a decelerating tail: strong ease-out (cubic), ~80% of the angle
//   covered in the first ~40% of the time, an obvious slow, soft landing at the tail; still one continuous
//   motion with no segmented pauses
//   (precedent: "uniform" = no pause, not literal linear — the user personally corrected this to fast-flip-with-slow-tail).
//   The 90° edge moment moves up to ~f28 accordingly, with the white-hot burst peak shifted forward to match. Everything else kept.
// — The following is the v3 note (structure carried over):
// ① The opening is not "turning by an angle" — the whole page rotateY-flips 180° to its back,
//    revealing a new page (double-sided card: front = the old close-up page, back = the new hub page righted),
//    and when it reaches the edge (~90°) a white-hot burst floods the frame (matches screenshots 3/4).
// ② Once the five icon light-pipes connect there's a "conveying" feel: a bright pulse keeps flowing along the
//    pipe direction (icon → hub) in a continuous loop until the end.
// Motion structure vs screenshots: S1 close-up front view readable → S2 mid-flip + pull-back + bloom rising →
// S3/S4 edge white-hot burst + icons surfacing → S5/S6 new page righted, pipes connected → S7/S8 steady flow.
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rand = mulberry32(20260718);
const NOISE: number[] = Array.from({ length: 200 }, () => rand());

const FONT = '"Avenir Next", "Helvetica Neue", Helvetica, sans-serif';

// ---------- Hub panel (Enterprise MQLs, content matches screenshot 1/7) ----------
const LIST: { icon: string; title: string; sub: string }[] = [
  { icon: '#4a9fd8', title: 'Q3 Enterprise Deal', sub: 'Revenue · Pipeline · Q3 Quota' },
  { icon: '#4a9fd8', title: 'Major Enterprise Account - UK', sub: 'Revenue · MQL · International' },
  { icon: '#34a853', title: 'Enterprise Pitch Deck', sub: 'Open in GDrive' },
  { icon: '#a259ff', title: 'MQL Lead Form Design', sub: 'Figma File · Last Edited' },
  { icon: '#f2c744', title: 'Enterprise Sales', sub: 'ClickUp Space' },
  { icon: '#9a9a98', title: 'Enterprise Closed Archive', sub: 'Archived · In Enterprise Sales' },
  { icon: '#c8c8c6', title: 'Open Enterprise Lead - Follow up', sub: 'In Progress · In Enterprise Sales · Yesterday' },
];

const HubPanel: React.FC<{ glow: number }> = ({ glow }) => (
  <div
    style={{
      width: 820,
      height: 520,
      background: '#fbfbfa',
      borderRadius: 14,
      padding: '26px 30px',
      boxSizing: 'border-box',
      fontFamily: FONT,
      boxShadow: `0 0 ${40 + glow * 110}px rgba(255,255,255,${0.3 + glow * 0.55}), 0 0 ${130 + glow * 140}px rgba(215,150,255,${0.22 + glow * 0.35})`,
      display: 'flex',
      gap: 26,
      overflow: 'hidden',
    }}
  >
    <div style={{ flex: 2 }}>
      <div style={{ fontSize: 27, fontWeight: 600, color: '#2f2f38' }}>Enterprise MQLs</div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        {['All', 'Tasks', 'Docs', 'Whiteboards', 'Dashboards', 'Files', 'Chat', 'People'].map((t, i) => (
          <div key={t} style={{ fontSize: 12, color: i === 0 ? '#5b55c8' : '#98989f', fontWeight: i === 0 ? 700 : 400 }}>
            {t}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#8b8b92', marginTop: 14 }}>Recent</div>
      {LIST.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'center', marginTop: 13.5 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: it.icon, opacity: 0.85 }} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#3c3c44' }}>{it.title}</div>
            <div style={{ fontSize: 11, color: '#a2a2a8', marginTop: 1 }}>{it.sub}</div>
          </div>
        </div>
      ))}
    </div>
    <div style={{ flex: 1, borderLeft: '1px solid #e7e7e5', paddingLeft: 22 }}>
      <div
        style={{
          height: 30,
          width: 168,
          border: '1.5px solid #cacac8',
          borderRadius: 8,
          marginTop: 4,
          fontSize: 12,
          color: '#6a6a70',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        + Add Location Filter
      </div>
      <div style={{ fontSize: 10.5, color: '#adadb2', marginTop: 24, letterSpacing: 1 }}>QUICK FILTERS</div>
      {['Assigned to Me', 'Created by Me'].map((t) => (
        <div key={t} style={{ fontSize: 13.5, color: '#55555c', marginTop: 11 }}>{t}</div>
      ))}
      <div style={{ fontSize: 10.5, color: '#adadb2', marginTop: 24, letterSpacing: 1 }}>TASK FILTERS</div>
      {['Open', 'Closed', 'Archived'].map((t) => (
        <div key={t} style={{ fontSize: 13.5, color: '#55555c', marginTop: 11 }}>{t}</div>
      ))}
    </div>
  </div>
);

// ---------- Old page before the flip (front): a different page; the hub page only appears after flipping ----------
const FrontPanel: React.FC<{ glow: number }> = ({ glow }) => (
  <div
    style={{
      width: 820,
      height: 520,
      background: '#fbfbfa',
      borderRadius: 14,
      padding: '30px 34px',
      boxSizing: 'border-box',
      fontFamily: FONT,
      boxShadow: `0 0 ${40 + glow * 110}px rgba(255,255,255,${0.3 + glow * 0.55})`,
      overflow: 'hidden',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: '#4a9fd8', opacity: 0.9 }} />
      <div style={{ fontSize: 26, fontWeight: 600, color: '#2f2f38' }}>Q3 Enterprise Deal</div>
    </div>
    <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
      {['Revenue', 'Pipeline', 'Q3 Quota'].map((t) => (
        <div
          key={t}
          style={{
            fontSize: 11.5,
            color: '#6a6a70',
            background: '#efeff0',
            borderRadius: 6,
            padding: '3px 10px',
          }}
        >
          {t}
        </div>
      ))}
    </div>
    <div style={{ height: 1, background: '#e8e8e6', marginTop: 18 }} />
    {/* Document gray-bar paragraphs */}
    {[420, 700, 660, 540, 0, 690, 630, 380, 0, 580, 640, 460].map((w, i) =>
      w === 0 ? (
        <div key={i} style={{ height: 14 }} />
      ) : (
        <div
          key={i}
          style={{
            width: w,
            height: 13,
            borderRadius: 6,
            background: i % 5 === 0 ? '#d7d7db' : '#e6e6e9',
            marginTop: 13,
          }}
        />
      ),
    )}
  </div>
);

// ---------- Brand icon tiles ----------
const Tile: React.FC<{ kind: string; on: number }> = ({ kind, on }) => {
  const glyph = (() => {
    switch (kind) {
      case 'figma':
        return (
          <svg width={46} height={46} viewBox="0 0 46 46">
            <circle cx={16} cy={9} r={7} fill="#f24e1e" />
            <circle cx={30} cy={9} r={7} fill="#ff7262" />
            <circle cx={16} cy={23} r={7} fill="#a259ff" />
            <circle cx={30} cy={23} r={7} fill="#1abcfe" />
            <circle cx={16} cy={37} r={7} fill="#0acf83" />
          </svg>
        );
      case 'github':
        return <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#24292f' }} />;
      case 'salesforce':
        return (
          <svg width={56} height={40} viewBox="0 0 56 40">
            <ellipse cx={22} cy={22} rx={14} ry={11} fill="#00a1e0" />
            <ellipse cx={36} cy={18} rx={13} ry={10} fill="#00a1e0" />
            <ellipse cx={30} cy={26} rx={16} ry={10} fill="#00a1e0" />
          </svg>
        );
      case 'gdrive':
        return (
          <svg width={48} height={42} viewBox="0 0 48 42">
            <path d="M16 2 L32 2 L48 30 L40 42 L8 42 L0 30 Z" fill="none" />
            <path d="M16 2 L32 2 L20 24 L4 24 Z" fill="#34a853" transform="translate(2,2)" />
            <path d="M32 2 L46 28 L30 28 L18 6 Z" fill="#fbbc04" transform="translate(0,2)" />
            <path d="M6 28 L42 28 L36 38 L12 38 Z" fill="#4285f4" />
          </svg>
        );
      default: // dropbox
        return (
          <svg width={48} height={42} viewBox="0 0 48 42">
            <path d="M12 0 L24 8 L12 16 L0 8 Z" fill="#0061ff" />
            <path d="M36 0 L48 8 L36 16 L24 8 Z" fill="#0061ff" />
            <path d="M12 18 L24 26 L12 34 L0 26 Z" fill="#0061ff" />
            <path d="M36 18 L48 26 L36 34 L24 26 Z" fill="#0061ff" />
          </svg>
        );
    }
  })();
  return (
    <div
      style={{
        width: 112,
        height: 112,
        borderRadius: 26,
        background: '#fdfdfd',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: `0 0 ${16 + on * 46}px rgba(255,255,255,${0.2 + on * 0.55})`,
        transform: `scale(${0.9 + on * 0.1})`,
      }}
    >
      {glyph}
    </div>
  );
};

// ---------- Light pipes (rainbow-gradient neon tubes) ----------
type Pipe = { kind: string; icon: [number, number]; path: string; len: number; tIcon: number; tPipe: number };
const PIPES: Pipe[] = [
  { kind: 'figma', icon: [452, 262], path: 'M 452 322 L 452 440 Q 452 480 492 480 L 552 480', len: 300, tIcon: 52, tPipe: 62 },
  { kind: 'github', icon: [252, 612], path: 'M 316 612 L 552 612', len: 240, tIcon: 52, tPipe: 62 },
  { kind: 'salesforce', icon: [992, 178], path: 'M 992 240 L 992 332', len: 92, tIcon: 52, tPipe: 62 },
  { kind: 'gdrive', icon: [1512, 272], path: 'M 1512 332 L 1512 440 Q 1512 480 1472 480 L 1372 480', len: 290, tIcon: 52, tPipe: 62 },
  { kind: 'dropbox', icon: [1702, 618], path: 'M 1640 618 L 1372 618', len: 270, tIcon: 52, tPipe: 62 },
];
const GROW = 9; // v8 (batch 17): user feedback "After the flip, the 5 apps appear simultaneously, then connect simultaneously" — two-beat scheme: all five icons appear on the same frame (tIcon all 52), all five pipes connect on the same frame (tPipe all 62)

// ---------- Background neon rectangle outlines ----------
const RECTS = Array.from({ length: 9 }, (_, i) => ({
  x: [150, 660, 1740, 250, 1150, 700, 1660, 90, 1330][i],
  y: [255, 355, 545, 850, 935, 985, 830, 555, 760][i],
  w: 90 + NOISE[i * 3] * 160,
  h: 60 + NOISE[i * 3 + 1] * 70,
  hue: [265, 285, 300, 255, 275, 210, 320, 240, 40][i],
  ph: NOISE[i * 3 + 2] * Math.PI * 2,
}));

export const IntegrationHubMap: React.FC = () => {
  const frame = useCurrentFrame();
  // Filter/gradient IDs are generated per instance so co-occurring instances don't cross-reference (useId's «:» is illegal in url(), so it must be sanitized)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  // --- Camera/panel path: close-up front view of the old page → full 180° flip (to the back = new page) + pull back to settle ---
  const zoom = interpolate(frame, [0, 14, 58, 96], [2.05, 1.95, 1.1, 1.0], {
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  // v6 (batch 15): user feedback "flip twice as fast" — the flip window f14–84 (70 frames)
  // compressed by half to f14–49 (35 frames), keeping the fast-flip-with-decelerating-tail curve shape;
  // the 90° edge correspondingly moves up to ~f21.2 (easeOut=0.5 → t≈0.206).
  const rotY = interpolate(frame, [14, 49], [0, 180], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const panX = interpolate(frame, [0, 18, 55, 96], [130, 120, 30, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const panY = interpolate(frame, [0, 18, 55, 96], [120, 110, 30, 25], {
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  // v6: user feedback "no long halo in the middle, just a flash as it reaches mid-flip" —
  // the long halo plateau is removed; instead a 2-frame pulse flashes and recedes at the 90° edge moment (~f21)
  const bloom = interpolate(frame, [19, 21, 23, 27], [0, 1, 0.25, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const noise = NOISE[Math.min(frame, NOISE.length - 1)];

  // Breathing after everything is connected
  const allOn = Math.max(...PIPES.map((p) => p.tPipe)) + GROW;
  const breathe = frame > allOn ? 0.5 + 0.5 * Math.sin((frame - allOn) * 0.16) : 0;
  const panelGlow = bloom * 1.1 + breathe * 0.2;

  // Overall visibility of the star-map elements (icons/pipes/rectangles)
  const mapIn = interpolate(frame, [34, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#08070c' }}>
      {/* Dark purple background noise */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(90,50,140,0.25), transparent 62%), radial-gradient(ellipse at 18% 78%, rgba(140,50,120,0.12), transparent 50%)',
        }}
      />

      {/* Background neon rectangle outlines */}
      {RECTS.map((r, i) => {
        const on = interpolate(frame, [36 + i * 4, 52 + i * 4], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const settle = frame > 100 ? 0.55 : 1;
        const flick = 0.65 + 0.35 * Math.sin(frame * 0.11 + r.ph);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              borderRadius: 12,
              border: `2.5px solid hsla(${r.hue} 90% 70% / ${0.75 * on * flick * settle})`,
              boxShadow: `0 0 18px hsla(${r.hue} 90% 65% / ${0.55 * on * flick * settle}), inset 0 0 14px hsla(${r.hue} 90% 65% / ${0.3 * on * flick * settle})`,
            }}
          />
        );
      })}

      {/* Light-pipe layer */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: mapIn }}>
        <defs>
          {/* One userSpaceOnUse gradient per pipe (along the pipe's start/end points); the rainbow spreads along the pipe direction.
              objectBoundingBox gives zero width or height on purely horizontal/vertical lines, disabling paint, so user coordinates are required. */}
          {PIPES.map((p, i) => {
            const nums = p.path.match(/-?[\d.]+/g)!.map(Number);
            const [x1, y1] = [nums[0], nums[1]];
            const [x2, y2] = [nums[nums.length - 2], nums[nums.length - 1]];
            return (
              <linearGradient key={i} id={`rainbow-${uid}-${i}`} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
                <stop offset="0%" stopColor="#ffe14d" />
                <stop offset="28%" stopColor="#ff8a5a" />
                <stop offset="52%" stopColor="#ff5ad0" />
                <stop offset="76%" stopColor="#b46bff" />
                <stop offset="100%" stopColor="#5ad0ff" />
              </linearGradient>
            );
          })}
          {/* userSpaceOnUse: purely horizontal/vertical pipes have a zero bbox, so a percentage filter region would
              collapse to 0 and the whole pipe would fail to render (github/salesforce/dropbox would vanish) */}
          <filter id={`pipeGlow-${uid}`} filterUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
            <feGaussianBlur stdDeviation="8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {PIPES.map((p, i) => {
          const grow = interpolate(frame, [p.tPipe, p.tPipe + GROW], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.quad),
          });
          if (grow <= 0) return null;
          const dashOn = p.len * grow;
          const pulse = frame > allOn ? 0.78 + 0.22 * Math.sin((frame - allOn) * 0.16 + i) : 1;
          // Conveying feel: bright pulses keep flowing along the pipe direction (icon → hub) in a continuous loop
          const flowOffset = -((frame - p.tPipe) * 4.6 + i * 37);
          const flowIn = interpolate(frame, [p.tPipe + GROW, p.tPipe + GROW + 8], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <g key={i} filter={`url(#pipeGlow-${uid})`}>
              <path
                d={p.path}
                fill="none"
                stroke={`url(#rainbow-${uid}-${i})`}
                strokeWidth={17}
                strokeLinecap="round"
                strokeDasharray={`${dashOn} ${p.len + 60}`}
                opacity={0.92 * pulse}
              />
              <path
                d={p.path}
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={`${dashOn} ${p.len + 60}`}
                opacity={0.85 * pulse}
              />
              {grow >= 1 && flowIn > 0 && (
                <>
                  {/* Flow stream: consecutive bright pulse segments travel along the pipe (spacing 46, segment length 20) */}
                  <path
                    d={p.path}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={11}
                    strokeLinecap="round"
                    strokeDasharray="18 56"
                    strokeDashoffset={flowOffset}
                    opacity={0.95 * flowIn}
                  />
                  {/* Soft glow halo of the flow stream */}
                  <path
                    d={p.path}
                    fill="none"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth={24}
                    strokeLinecap="round"
                    strokeDasharray="18 56"
                    strokeDashoffset={flowOffset}
                    opacity={0.55 * flowIn}
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Icon tiles */}
      {PIPES.map((p, i) => {
        const appear = interpolate(frame, [p.tIcon, p.tIcon + 12], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        const on = interpolate(frame, [p.tPipe, p.tPipe + 10], [0.15, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        if (appear <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.icon[0] - 56,
              top: p.icon[1] - 56,
              opacity: appear,
              transform: `translateY(${(1 - appear) * 24}px)`,
            }}
          >
            <Tile kind={p.kind} on={on * (frame > allOn ? 0.8 + 0.2 * breathe : 1)} />
          </div>
        );
      })}

      {/* Hub panel: the double-sided card flips 180° as a whole (front old page → back new hub page) */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1500 }}>
        <div
          style={{
            transform: `translate(${panX}px, ${panY}px) rotateY(${rotY}deg) scale(${zoom})`,
            position: 'relative',
            transformStyle: 'preserve-3d',
            width: 820,
            height: 520,
          }}
        >
          {/* Front: the old page before the flip */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
            }}
          >
            <FrontPanel glow={panelGlow} />
          </div>
          {/* Back: the new hub page revealed after righting (pre-rotated 180° so it faces the camera without mirroring when the flip completes) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <HubPanel glow={panelGlow} />
          </div>
          {/* Panel overexposure veil: covers white during the burst */}
          <div
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: 18,
              background: '#ffffff',
              opacity: Math.min(0.96, bloom * 1.05),
              filter: 'blur(5px)',
              pointerEvents: 'none',
              transform: rotY > 90 ? 'rotateY(180deg) translateZ(1px)' : 'translateZ(1px)',
              backfaceVisibility: 'hidden',
            }}
          />
        </div>
      </AbsoluteFill>

      {/* Full-screen white-hot glare (S3/S4): white core + magenta/pink wings + cyan-blue blotches */}
      {bloom > 0.02 && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              left: 300,
              top: 60,
              width: 1100,
              height: 900,
              background:
                'radial-gradient(closest-side, rgba(255,255,255,0.98), rgba(255,235,255,0.75) 42%, rgba(255,120,230,0.4) 68%, transparent 88%)',
              filter: 'blur(26px)',
              opacity: Math.min(1, bloom * (0.94 + 0.06 * noise)),
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 1150,
              top: 150,
              width: 700,
              height: 620,
              background: 'radial-gradient(closest-side, rgba(255,90,208,0.85), rgba(200,70,255,0.4) 60%, transparent 85%)',
              filter: 'blur(34px)',
              opacity: bloom * 0.9,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 40,
              top: 480,
              width: 620,
              height: 520,
              background: 'radial-gradient(closest-side, rgba(140,210,255,0.8), rgba(90,120,255,0.35) 60%, transparent 85%)',
              filter: 'blur(30px)',
              opacity: bloom * 0.85,
            }}
          />
          {/* Horizontal purple-white streak (S2 left-side light trail) */}
          <div
            style={{
              position: 'absolute',
              left: 30,
              top: 700,
              width: 420,
              height: 46,
              borderRadius: 23,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(170,90,255,0.8), transparent)',
              filter: 'blur(14px)',
              opacity: interpolate(frame, [20, 34, 70, 92], [0, 0.9, 0.5, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
