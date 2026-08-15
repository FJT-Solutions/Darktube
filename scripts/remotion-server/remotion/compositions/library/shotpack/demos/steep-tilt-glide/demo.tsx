// steep-tilt-glide v5 (batch 14 #2). User feedback (verbatim):
// "The angle is wrong — look at this shot's angle in the original; also the camera is fixed, but the page
// itself moves in the lateral direction of its 3D space"
// Two fixes: ① angle calibrated frame by frame against the original (steep rotateY with the right edge near, left edge far,
// top edge tilting up to the right, vanishing point lower-left of center); ② motion model changed to "object moves, camera doesn't":
// perspective / perspectiveOrigin / rotateY / rotateZ all stay at one constant throughout,
// and the only thing that moves is the page itself sliding laterally along its 3D plane (local X axis) via translateX.
// v4's float-and-settle (FloatWrap same-shape soft shadow) is kept.
import React, { useId } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';

const FONT = 'Helvetica, Arial, sans-serif';
const INK = '#2f2f36';

const easeFall = Easing.bezier(0.5, 0.05, 0.6, 1); // accelerating settle, soft landing at the end

/* Float + same-shape soft shadow (GrazeFaceTour FloatWrap pattern) */
const FloatWrap: React.FC<{ h: number; children: React.ReactNode }> = ({ h, children }) => (
  <div style={{ position: 'relative' }}>
    {h > 2 && (
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translate(${h * 0.24}px, ${h * 0.46}px) scale(${1 + h * 0.0009})`,
        filter: `blur(${5 + h * 0.075}px) brightness(0.35) saturate(0.4)`,
        opacity: Math.min(0.38, 0.15 + h * 0.0016),
        pointerEvents: 'none',
      }}>{children}</div>
    )}
    <div style={{ transform: `translate(${-h * 0.34}px, ${-h * 0.8}px)` }}>{children}</div>
  </div>
);

/* land = the moment the settle completes (0..1); before that, accelerates down from height H */
const liftOf = (t: number, land: number, H = 230) => {
  const FALL = 0.32;
  const p = Math.min(1, Math.max(0, (t - (land - FALL)) / FALL));
  return (1 - easeFall(p)) * H;
};

/* ClickUp color logo (approximation of the stacked double-V shape) */
const CULogo: React.FC<{ size: number }> = ({ size }) => {
  // Gradient IDs are generated per instance so multiple instances on the same stage don't cross-reference (useId's «:» is invalid in url(), so it must be sanitized)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`cu1-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8930fd" />
          <stop offset="1" stopColor="#49ccf9" />
        </linearGradient>
        <linearGradient id={`cu2-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff02f0" />
          <stop offset="1" stopColor="#ffc800" />
        </linearGradient>
      </defs>
      <path d="M 14 62 L 50 30 L 86 62" fill="none" stroke={`url(#cu1-${uid})`} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 22 84 L 50 62 L 78 84" fill="none" stroke={`url(#cu2-${uid})`} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* Dropbox blue four-diamond glyph (the icon inside the rounded gray tile in the main area of the original at f45/f60) */
const DropboxGlyph: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    {[[50, 8, 27, 22], [50, 8, 73, 22], [50, 36, 27, 50], [50, 36, 73, 50]].map(() => null)}
    <g fill="#0061fe">
      <path d="M 27 10 L 50 25 L 27 40 L 4 25 Z" />
      <path d="M 73 10 L 96 25 L 73 40 L 50 25 Z" />
      <path d="M 27 40 L 50 55 L 27 70 L 4 55 Z" />
      <path d="M 73 40 L 96 55 L 73 70 L 50 55 Z" />
      <path d="M 27 74 L 50 89 L 73 74 L 50 62 Z" />
    </g>
  </svg>
);

/* Page: width 6200 — left section = ClickUp3.0 top bar + sidebar (all three user screenshots live here),
   right section = the Dropbox tile, big W glyph, and Product Management list that slide in later in the original */
const PW = 6200;
const PH = 2400;

const Panel: React.FC<{ shade: number; t?: number }> = ({ shade, t = 1 }) => (
  <div style={{
    width: PW, height: PH, background: '#f4f4f6', borderRadius: 64,
    position: 'relative', overflow: 'hidden',
    boxShadow: '0 0 220px rgba(220,210,255,0.35)',
    fontFamily: FONT,
  }}>
    {/* Top tab bar (spans the page; text floats and settles) */}
    <div style={{
      position: 'absolute', top: 0, left: 0, width: PW, height: 230,
      borderBottom: '4px solid #dcdce2', display: 'flex', alignItems: 'center', paddingLeft: 130,
    }}>
      <FloatWrap h={liftOf(t, 0.3)}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width={58} height={58} viewBox="0 0 40 40" style={{ marginRight: 34 }}>
            {[[4, 4], [23, 4], [4, 23], [23, 23]].map(([x, y], i) => (
              <rect key={i} x={x} y={y} width={13} height={13} rx={3} fill="none" stroke="#4a4a52" strokeWidth={3.5} />
            ))}
          </svg>
          <div style={{ fontSize: 66, color: INK, fontWeight: 500 }}>Product analytics</div>
        </div>
      </FloatWrap>
      <FloatWrap h={liftOf(t, 0.42, 280)}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: '#4147f5', marginLeft: 150, flexShrink: 0 }} />
          <div style={{ fontSize: 165, color: '#26262c', fontWeight: 550, marginLeft: 110, letterSpacing: 1, whiteSpace: 'nowrap' }}>ClickUp 3.0</div>
        </div>
      </FloatWrap>
      {/* Dimmer tabs extending the top bar to the right (aligning with clickup04's Widget brainstorm / Design system tabs) */}
      {[['Widget brainstorm', 3050], ['Design system', 3900], ['Design', 4650]].map(([tb, x]) => (
        <div key={tb as string} style={{ position: 'absolute', left: x as number, top: 88, fontSize: 58, color: '#8d8d96' }}>{tb}</div>
      ))}
    </div>
    {/* ClickUp logo row */}
    <div style={{ position: 'absolute', left: 120, top: 560 }}>
      <FloatWrap h={liftOf(t, 0.54, 250)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <CULogo size={104} />
          <div style={{ fontSize: 92, fontWeight: 800, color: '#222228', letterSpacing: -1 }}>ClickUp</div>
        </div>
      </FloatWrap>
    </div>
    {/* Main-area rounded gray tile: Dropbox icon + dropdown chevron (original f45–f60) */}
    <div style={{ position: 'absolute', left: 1330, top: 440 }}>
      <FloatWrap h={liftOf(t, 0.62, 260)}>
        <div style={{
          width: 620, height: 350, background: '#ebebef', borderRadius: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60,
        }}>
          <div style={{
            width: 210, height: 210, background: '#fdfdfe', borderRadius: 44,
            boxShadow: '0 6px 60px rgba(180,180,200,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DropboxGlyph size={130} />
          </div>
          <svg width={90} height={90} viewBox="0 0 40 40">
            <path d="M 10 15 L 20 26 L 30 15" fill="none" stroke="#6a6a74" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </FloatWrap>
    </div>
    {/* Home wide pill (thin purple-outlined bar spanning the panel) */}
    <div style={{ position: 'absolute', left: 110, top: 830, width: 2900 }}>
      <FloatWrap h={liftOf(t, 0.68, 260)}>
        <div style={{
          width: 2900, height: 168,
          borderRadius: 34, border: '3.5px solid rgba(118,108,238,0.75)',
          background: 'rgba(122,110,240,0.09)', display: 'flex', alignItems: 'center',
          gap: 40, paddingLeft: 56, boxSizing: 'border-box',
        }}>
          <svg width={66} height={66} viewBox="0 0 40 40">
            <path d="M 6 20 L 20 7 L 34 20 M 11 17 V 33 H 29 V 17" fill="none" stroke="#5a5ad2" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 70, color: '#5353cf', fontWeight: 550 }}>Home</div>
        </div>
      </FloatWrap>
    </div>
    {/* Inbox row */}
    <div style={{ position: 'absolute', left: 166, top: 1070 }}>
      <FloatWrap h={liftOf(t, 0.8, 240)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <svg width={64} height={64} viewBox="0 0 40 40">
            <path d="M 20 5 C 13 5 10 10 10 16 V 24 L 6 30 H 34 L 30 24 V 16 C 30 10 27 5 20 5 Z M 16 33 C 16 36 24 36 24 33"
              fill="none" stroke="#3a3a42" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 70, color: INK }}>Inbox</div>
        </div>
      </FloatWrap>
    </div>
    {/* More sidebar rows */}
    {['Docs', 'Dashboards'].map((tb, i) => (
      <div key={tb} style={{ position: 'absolute', left: 166, top: 1310 + i * 240 }}>
        <FloatWrap h={liftOf(t, 0.86 + i * 0.06, 230)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <div style={{ width: 58, height: 58, border: '6px solid #8f8f98', borderRadius: 14 }} />
            <div style={{ fontSize: 70, color: INK }}>{tb}</div>
          </div>
        </FloatWrap>
      </div>
    ))}
    {/* Main-area carousel left arrow (the "<" in the original's f60 midground) */}
    <div style={{ position: 'absolute', left: 2440, top: 1060 }}>
      <svg width={120} height={120} viewBox="0 0 40 40">
        <path d="M 26 6 L 12 20 L 26 34" fill="none" stroke="#2c2c33" strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    {/* Big W glyph (the large letter fragment sliding in at the top right mid-way through the original) */}
    <div style={{ position: 'absolute', left: 3050, top: 300, fontSize: 430, fontWeight: 700, color: '#26262c', letterSpacing: -6 }}>W</div>
    {/* Main-area white rounded card group (pale white tiles at bottom right) */}
    {[[2620, 620, 640, 380], [2740, 1360, 720, 420], [2620, 1900, 560, 330]].map(([x, y, w, h], i) => (
      <div key={i} style={{
        position: 'absolute', left: x, top: y, width: w, height: h,
        background: '#fbfbfd', borderRadius: 56, boxShadow: '0 6px 60px rgba(190,190,205,0.3)',
      }} />
    ))}
    {/* — Right section: Product Management list (the full-bleed white page at the end of the original) — */}
    <div style={{
      position: 'absolute', left: 3560, top: 230, width: PW - 3560, height: PH - 230,
      background: '#fbfbfd',
    }}>
      <div style={{ position: 'absolute', left: 220, top: 200, fontSize: 150, fontWeight: 750, color: '#232329', letterSpacing: -2, whiteSpace: 'nowrap' }}>Product Management</div>
      {/* List / Board tabs */}
      <div style={{ position: 'absolute', left: 240, top: 480, display: 'flex', gap: 110, alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 26, background: '#ececf1',
          borderRadius: 22, padding: '20px 40px',
        }}>
          <svg width={56} height={56} viewBox="0 0 40 40">
            {[9, 20, 31].map((y) => (
              <g key={y}>
                <rect x={5} y={y - 1.6} width={4} height={4} fill="#3a3a42" />
                <rect x={14} y={y - 1.4} width={20} height={3.4} rx={1.6} fill="#3a3a42" />
              </g>
            ))}
          </svg>
          <div style={{ fontSize: 62, fontWeight: 600, color: '#2c2c33' }}>List</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <svg width={56} height={56} viewBox="0 0 40 40">
            <rect x={5} y={7} width={12} height={26} rx={3} fill="none" stroke="#3a3a42" strokeWidth={3} />
            <rect x={23} y={7} width={12} height={18} rx={3} fill="none" stroke="#3a3a42" strokeWidth={3} />
          </svg>
          <div style={{ fontSize: 62, fontWeight: 500, color: '#2c2c33' }}>Board</div>
        </div>
        <div style={{ fontSize: 56, color: '#9a9aa4', marginLeft: -40 }}>11</div>
      </div>
      <div style={{ position: 'absolute', left: 900, top: 620, width: 1500, height: 3, background: '#e4e4ea' }} />
      {/* IN PROGRESS chip */}
      <div style={{
        position: 'absolute', left: 240, top: 850, background: '#fce4f5', color: '#c93bb0',
        fontSize: 46, fontWeight: 650, letterSpacing: 2, padding: '14px 30px', borderRadius: 14,
      }}>IN PROGRESS</div>
      <div style={{ position: 'absolute', left: 244, top: 1030, fontSize: 44, fontWeight: 600, color: '#8f8f98', letterSpacing: 1 }}>TASK NAME</div>
      {/* Task rows */}
      {[['New Feature Launch', '#3a3a42'], ['Roadmap Q3', '#55555e'], ['User Testing', '#83838d'], ['Bug Triage', '#b3b3bc']].map(([name, col], i) => (
        <div key={name as string} style={{ position: 'absolute', left: 280, top: 1180 + i * 210, display: 'flex', alignItems: 'center', gap: 56 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#e33bc6' }} />
          <div style={{ fontSize: 64, fontWeight: 550, color: col as string, whiteSpace: 'nowrap' }}>{name}</div>
        </div>
      ))}
    </div>
    {/* Brightness: black veil over the panel (lifted as progress advances) */}
    <div style={{ position: 'absolute', inset: 0, background: '#050409', opacity: shade }} />
    {/* Extra shadow on the left edge (darker at the start, fading with the brightness) */}
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(90deg, rgba(5,4,9,0.9), rgba(5,4,9,0) 42%)',
      opacity: Math.min(1, shade * 1.6),
    }} />
  </div>
);

/* Fixed camera + page sliding laterally along its own plane.
 * Camera constants (calibrated frame by frame against the original): perspective 1150, origin 24% 62%,
 * rotateY(-38°) (right edge near, left edge far, top edge tilting up to the right) + rotateZ(-2°).
 * lx = the page's local X translation (its own lateral direction), the only quantity that moves throughout */
// v7 (batch 16): user feedback "change it to 60 degrees" — rotY -53 → -60 (exact value)
const CAM = { persp: 1100, origin: '30% 58%', rotY: -60, rotZ: -2, left: '40%', top: '15%', scale: 0.62 };

const PanelLayer: React.FC<{ lx: number; shade: number; opacity: number; t: number }> = ({ lx, shade, opacity, t }) => (
  <AbsoluteFill style={{ opacity }}>
    <AbsoluteFill style={{ perspective: CAM.persp, perspectiveOrigin: CAM.origin }}>
      <div style={{
        position: 'absolute', left: CAM.left, top: CAM.top,
        transform: `rotateY(${CAM.rotY}deg) rotateZ(${CAM.rotZ}deg)`, transformOrigin: 'left top',
      }}>
        {/* The page moves laterally within its 3D plane (local X axis) */}
        <div style={{ transform: `scale(${CAM.scale}) translateX(${lx}px)`, transformOrigin: 'left top' }}>
          <Panel shade={shade} t={t} />
        </div>
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

export const SteepTiltGlide: React.FC = () => {
  const frame = useCurrentFrame();

  // Page glide (object moves, camera doesn't): local X from +140 → -2680, starts gentle then nearly constant speed,
  // never fully dead-stops at the end (the bezier's tail slope never reaches zero)
  const glide = Easing.bezier(0.3, 0.12, 0.72, 0.9);
  const lxAt = (f: number) => {
    const p = interpolate(f, [0, 120], [0, 1], { easing: glide, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return interpolate(p, [0, 1], [60, -4100]);
  };

  const lx = lxAt(frame);
  // Panel black veil: dark at first → fully bright at ~1.4s (aligned to the original's pacing)
  const shade = interpolate(frame, [0, 18, 44], [0.7, 0.4, 0], { extrapolateRight: 'clamp' });
  // Ghost intensity ∝ glide speed (trail = the local position at an earlier moment, re-projected under the same fixed camera)
  const speed = Math.abs(lxAt(frame - 1) - lxAt(frame + 1)) / 2;
  const g1 = Math.min(0.42, speed * 0.03);
  const g2 = Math.min(0.22, speed * 0.016);
  // Text float-and-settle progress (kept from v4)
  const drop = interpolate(frame, [4, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Purple glow emerges with the brightness
  const glow = interpolate(frame, [14, 70], [0.15, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#060409' }}>
      {/* Left purple glow */}
      <AbsoluteFill style={{
        opacity: glow,
        background: 'radial-gradient(ellipse 40% 50% at 20% 66%, rgba(118,58,190,0.30), transparent 70%)',
      }} />
      {/* Ghosts (drawn first, behind the main body; position = the page's local offset at an earlier moment) */}
      {g2 > 0.02 && <PanelLayer lx={lxAt(frame - 5)} shade={shade} opacity={g2} t={drop} />}
      {g1 > 0.02 && <PanelLayer lx={lxAt(frame - 2.5)} shade={shade} opacity={g1} t={drop} />}
      {/* Main body */}
      <PanelLayer lx={lx} shade={shade} opacity={1} t={drop} />
      {/* Vignette */}
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse 105% 95% at 55% 42%, transparent 60%, rgba(3,2,8,0.25) 85%, rgba(2,1,6,0.5) 100%)',
        pointerEvents: 'none',
      }} />
    </AbsoluteFill>
  );
};
