// Bullet-time freeze orbit (bullet-time-freeze-orbit) — The Matrix bullet time.
// 5 chart bars grow staggered inside a central 900×560 panel (driven by the animation clock effFrame).
// Keyframes: 0–20 hold to read the scene; 20–45 bars grow normally; 45–105 the clock locks (bars completely frozen),
// while under camera perspective(1600px) rotateY goes 0→55° (45–72) → apex hover (72–82) → back to 0 (82–105),
// with scale 1→1.12→1 + translateX sway in sync to enhance the orbiting feel; 105–120 the clock resumes and bars finish growing;
// 118–128 number labels appear; 128–150 fully still to close.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, TitleBlock } from '../../_fixtures/Fixtures';

const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const PANEL_W = 900;
const PANEL_H = 560;
const BAR_COUNT = 5;

export const BulletTimeFreezeOrbit: React.FC = () => {
  const frame = useCurrentFrame();

  // ── Bullet-time clock: runs normally 0–45, frozen 45–105, resumes from 105 ──
  const effFrame =
    frame < 45 ? frame : frame < 105 ? 45 : 45 + (frame - 105);

  // ── Camera orbit during the frozen interval (driven by the real frame) ──
  const rotY =
    frame < 72
      ? interpolate(frame, [45, 72], [0, 55], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.inOut(Easing.cubic),
        })
      : frame < 82
        ? 55 // apex hover 10f
        : interpolate(frame, [82, 105], [55, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.inOut(Easing.cubic),
          });
  const orbitT = rotY / 55; // 0→1→0, reused for scale / translateX
  const scale = 1 + 0.12 * orbitT;
  const tx = -170 * Math.sin(orbitT * Math.PI * 0.5) - 60 * orbitT; // orbiting lateral sway
  const ty = -24 * orbitT;

  // ── Bars: staggered growth, all driven by effFrame (frozen = still) ──
  const chartW = PANEL_W - 140;
  const chartH = PANEL_H - 190;
  const barW = 92;
  const gap = (chartW - BAR_COUNT * barW) / (BAR_COUNT - 1);
  const bars = Array.from({ length: BAR_COUNT }).map((_, i) => {
    const full = chartH * (0.42 + h(i + 1) * 0.55); // target height
    const start = 20 + i * 4;
    const end = 48 + i * 3; // staggered within the 20–60f range
    const p = interpolate(effFrame, [start, end], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    const value = Math.round((full / chartH) * 100); // label matches the bar height

    return { hNow: full * p, full, value, done: p >= 1 };
  });

  // ── Recovery segment: number labels appear (118–128), then all still ──
  const labelOp = interpolate(frame, [118, 128], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Freeze cue: a FREEZE badge shows during the freeze to help read the technique
  const freezeOp = interpolate(frame, [45, 52, 98, 105], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: G.bg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ position: 'absolute', top: 56, left: 72 }}>
        <TitleBlock text="BULLET TIME" size={44} />
      </div>

      {/* Freeze badge */}
      <div
        style={{
          position: 'absolute',
          top: 62,
          right: 84,
          opacity: freezeOp,
          background: G.ink,
          color: G.card,
          fontWeight: 800,
          fontSize: 30,
          letterSpacing: 4,
          padding: '12px 26px',
          borderRadius: 10,
        }}
      >
        FREEZE
      </div>

      {/* 3D stage */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: 1600,
        }}
      >
        <div
          style={{
            width: PANEL_W,
            height: PANEL_H,
            background: G.card,
            border: `2px solid ${G.border}`,
            borderRadius: 18,
            boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
            boxSizing: 'border-box',
            padding: '44px 70px',
            transform: `translateX(${tx}px) translateY(${ty}px) rotateY(${rotY}deg) scale(${scale})`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Panel title bar */}
          <div
            style={{
              height: 20,
              width: 260,
              background: G.bar,
              borderRadius: 10,
              marginBottom: 14,
            }}
          />
          <div
            style={{
              height: 12,
              width: 170,
              background: G.line,
              borderRadius: 6,
              marginBottom: 30,
            }}
          />

          {/* Chart area: horizontal tick lines + bars */}
          <div style={{ position: 'relative', width: chartW, height: chartH }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: (chartH / 4) * i,
                  height: 2,
                  background: G.line,
                }}
              />
            ))}
            {/* Baseline */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 3,
                background: G.mid,
              }}
            />
            {bars.map((b, i) => (
              <div key={i}>
                <div
                  style={{
                    position: 'absolute',
                    left: i * (barW + gap),
                    bottom: 3,
                    width: barW,
                    height: b.hNow,
                    background: i % 2 === 0 ? G.bar : G.mid,
                    borderRadius: '8px 8px 0 0',
                  }}
                />
                {/* Number labels: appear during the recovery segment */}
                <div
                  style={{
                    position: 'absolute',
                    left: i * (barW + gap),
                    bottom: 3 + b.full + 14 - 10 * (1 - labelOp),
                    width: barW,
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: 28,
                    color: G.ink,
                    opacity: labelOp,
                  }}
                >
                  {b.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
