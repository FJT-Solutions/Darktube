// Center-match iris cut (match-cut × iris-reveal combo):
// Frames 0–30: scene A (list panel) holds; the 44px round avatar in row 2 pulses
// twice plus expanding halo rings cueing "look here";
// Frames 30–75: scene B bursts open from 22px to 2100px via clip-path: circle(r at CX CY) (Easing.inOut(cubic)),
//   scene B is a dark donut-chart page whose ring radius grows from 22px to 170px in
//   sync — "catching" the avatar's circle before the iris fills the full screen;
// Frames 45–100: the ring's stroke sweeps to 78%, the large center number counting up
//   as it emerges; frames 100–140 all properties hold still (≥35f).
// Linchpin: the two scenes' circles must be strictly concentric — CX/CY are hardcoded
// constants for the FakeDashboard B row-2 avatar's screen coords.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';

// Center of the 44px avatar on the left of row 2 in FakeDashboard variant B (hand-derived from the fixture layout)
const CX = 308;
const CY = 384.8;

export const CircleMatchIris: React.FC = () => {
  const f = useCurrentFrame();

  // ---- Scene A: avatar pulse (frames 0–30, two breaths) ----
  const pulseT = Math.min(f, 30) / 30;
  const scale = f < 30 ? 1 + 0.45 * Math.abs(Math.sin(pulseT * Math.PI * 2)) : 1;
  // Two expanding halo rings
  const waves = [0, 14].map((start) => {
    const p = interpolate(f, [start, start + 16], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    return { r: 22 + p * 40, o: f < start + 16 ? 0.85 * (1 - p) : 0 };
  });

  // ---- Iris: scene B bursts from the same center ----
  const irisR = interpolate(f, [30, 75], [22, 2100], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // ---- Scene B ring: radius grows from 22 to 170, "catching" the avatar's circle ----
  const ringR = interpolate(f, [30, 70], [22, 170], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const ringW = interpolate(f, [30, 70], [12, 40], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // Stroke sweeps to 78%
  const sweep = interpolate(f, [45, 100], [0, 0.78], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const circ = 2 * Math.PI * ringR;
  const num = Math.round(sweep * 100);
  const numOpacity = interpolate(f, [68, 88], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const furnitureOpacity = interpolate(f, [60, 85], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: G.bg }}>
      {/* ===== Scene A: list panel ===== */}
      <FakeDashboard variant="B" />
      {/* White patch covers the fixture's rounded square, then the true round avatar sits on top */}
      <div style={{ position: 'absolute', left: CX - 23, top: CY - 23, width: 46, height: 46, background: G.card }} />
      <div style={{
        position: 'absolute', left: CX - 22, top: CY - 22, width: 44, height: 44,
        borderRadius: 22, background: G.mid, border: `3px solid ${G.ink}`,
        boxSizing: 'border-box', transform: `scale(${scale})`,
      }} />
      {/* Pulsing expanding halo rings */}
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
        {waves.map((w, i) => (
          <circle key={i} cx={CX} cy={CY} r={w.r} fill="none" stroke={G.ink} strokeWidth={4} opacity={w.o} />
        ))}
      </svg>

      {/* ===== Scene B: dark donut-chart page, growing out of the same center via the iris ===== */}
      {f >= 30 && (
        <div style={{
          position: 'absolute', left: 0, top: 0, width: 1920, height: 1080,
          background: G.ink,
          clipPath: `circle(${irisR}px at ${CX}px ${CY}px)`,
        }}>
          {/* Donut: center exactly at the avatar's center */}
          <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
            {/* Base track */}
            <circle cx={CX} cy={CY} r={ringR} fill="none" stroke="#5a5a58" strokeWidth={ringW} />
            {/* Sweep arc, starting from the top */}
            <circle
              cx={CX} cy={CY} r={ringR} fill="none" stroke="#ececea"
              strokeWidth={ringW} strokeLinecap="round"
              strokeDasharray={`${sweep * circ} ${circ}`}
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          </svg>
          {/* Large center number */}
          <div style={{
            position: 'absolute', left: CX - 150, top: CY - 80, width: 300, height: 160,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: numOpacity,
          }}>
            <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 800, fontSize: 96, color: '#f2f2f0', letterSpacing: -2 }}>
              {num}%
            </div>
            <div style={{ marginTop: 6, height: 12, width: 130, background: '#6a6a68', borderRadius: 6 }} />
          </div>
          {/* Right-side page furniture: title + stat bars, proving this is a full page */}
          <div style={{ position: 'absolute', left: 680, top: 260, opacity: furnitureOpacity, display: 'flex', flexDirection: 'column', gap: 30 }}>
            <div style={{ height: 34, width: 520, background: '#c2c2c0', borderRadius: 10 }} />
            <div style={{ height: 16, width: 780, background: '#5a5a58', borderRadius: 8 }} />
            <div style={{ height: 16, width: 640, background: '#5a5a58', borderRadius: 8 }} />
            <div style={{ height: 16, width: 700, background: '#5a5a58', borderRadius: 8 }} />
            <div style={{ display: 'flex', gap: 28, marginTop: 24 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 240, height: 150, background: '#454543', border: '2px solid #5a5a58', borderRadius: 14, padding: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ height: 12, width: `${55 + i * 12}%`, background: '#8f8f8d', borderRadius: 6 }} />
                  <div style={{ height: 30, width: '45%', background: '#c2c2c0', borderRadius: 8, marginTop: 'auto' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
