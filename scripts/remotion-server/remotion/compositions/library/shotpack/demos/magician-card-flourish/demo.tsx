// magician-card-flourish v6 — batch 15 (no screenshots; the user's notes are the whole truth):
// User notes (verbatim) "the light needs a bit of glow, 0.8s is enough; the cross star should feel more
// optically real, right now it looks too cheap-CG; when the card first comes out it should launch like
// it was fired — starts slow, then decelerates while arcing"
// ① light segment 1.5s→0.8s (24f), thicker glow (three soft halo layers);
// ② cross-star reworked for optical realism: equal-width bars replaced by diffraction spikes
//    (radial-gradient wedges — thinner and exponentially fainter with distance), three-layer stacking
//    (white thin core / blue mid / wide pale outer approximating dispersion),
//    slower rotation (~40° over 24f; real star-burst rotation is a lens effect, faster reads as fake);
// ③ launch exit: slow-in → burst → decelerating arc (takeoff first squeezes out slowly under power,
//    then a hard acceleration fires it, and the whole arc decelerates into the centered hard stop).
// Everything else from v5 kept: fly-out from deep center + 13 spins + 94% freeze + sheen sweep. Total 141 frames.
import React, { useId } from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { G } from '../../_fixtures/Fixtures';

const CARD_W = 380;
const CARD_H = 540;
// Diagonal axis (along the card's own diagonal, normalized)
const AX = CARD_W / Math.hypot(CARD_W, CARD_H);
const AY = CARD_H / Math.hypot(CARD_W, CARD_H);

// —— timeline (30fps / 126 frames) ——
// v9.6 (batch 18): light 0.5s→0.3s (9f)
const TAKEOFF = 9;               // card takes off only after the 0.3s (9f) opening light
const FLASH_END = 12;            // flash tail fully gone (collapse drags ~3 frames)
const FLIGHT = 50;               // flight length in frames
const LAND = TAKEOFF + FLIGHT;   // f=53 hard freeze
const SHEEN_START = LAND + 8;    // sheen starts 8 frames after the freeze settles
const SHEEN_DUR = 26;            // sheen duration (one-shot)
const TURNS = 13;                // total spins in flight (integer → exactly facing camera at the freeze)
const FINAL_SCALE = 1.88;        // final state: card height 540×1.88≈1015 ≈ 94% of frame height (1080)

// Card front: grayscale poster card
const CardFace: React.FC = () => (
  <div style={{
    width: CARD_W, height: CARD_H, borderRadius: 22, background: G.card,
    border: `2px solid ${G.border}`, boxSizing: 'border-box', padding: 26,
    display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden',
  }}>
    <div style={{ height: 26, width: '62%', background: G.bar, borderRadius: 13 }} />
    <div style={{ height: 12, width: '84%', background: G.line, borderRadius: 6 }} />
    <div style={{
      flex: 1, borderRadius: 14, background: `linear-gradient(145deg, #e6e6e4, ${G.bar})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 110, height: 110, borderRadius: 55, background: G.mid, opacity: 0.55 }} />
    </div>
    <div style={{ height: 12, width: '74%', background: G.line, borderRadius: 6 }} />
    <div style={{ height: 12, width: '52%', background: G.line, borderRadius: 6 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: G.mid }} />
      <div style={{ height: 11, width: 90, background: G.line, borderRadius: 5 }} />
      <div style={{ marginLeft: 'auto', width: 58, height: 24, borderRadius: 12, background: G.ink, opacity: 0.75 }} />
    </div>
  </div>
);

// Card back: dark-gray diagonal pattern
const CardBack: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 22, background: '#3c3c40',
    border: '2px solid #55555a', boxSizing: 'border-box', overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', inset: 0,
      background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0 14px, transparent 14px 28px)',
    }} />
    <div style={{
      position: 'absolute', inset: 34, borderRadius: 12, border: '2px solid rgba(255,255,255,0.16)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 72, height: 72, borderRadius: 36, border: '3px solid rgba(255,255,255,0.22)' }} />
    </div>
  </div>
);

// —— opening flash (v8, batch 17): based on the user's reference image IMG_2505 ——
// Reference features (real lens-flare star bursts, distilled from close inspection):
// ① X-shaped diagonal star burst (4 needle beams at 45°), not an orthogonal + shape;
// ② beams extremely thin (needle-like), one diagonal axis noticeably longer, nearly spanning the frame;
// ③ core tiny and blazing bright (blown-out white point), glow halo very restrained (small radius before fading to black);
// ④ cyan-blue (upper star cyan / lower star blue in the reference; take a cyan-blue midpoint);
// ⑤ pure black background, beam edges clean and sharp (real diffraction, no wide blurry outer layer).
// Duration 0.5s: brighten (f0–4) → full burst with micro-flicker (f4–10) → collapse (f10–15).
const SpawnFlash: React.FC<{ f: number }> = ({ f }) => {
  // Gradient IDs generated per instance so multiple instances in one scene never cross-reference (useId's «:» is invalid in url(), so strip it)
  // hooks must run before any conditional return
  const SPIKE_ID = `mcf-needle-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (f > FLASH_END) return null;
  const grow = interpolate(f, [0, 2.5], [0.2, 1], {
    extrapolateRight: 'clamp', easing: Easing.out(Easing.quad),
  });
  const shrink = interpolate(f, [6, TAKEOFF, FLASH_END], [1, 0.3, 0.05], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad),
  });
  const s = grow * shrink;
  // Brightness micro-flicker (subtle jitter at real light-source level)
  const flicker = 0.94 + 0.06 * (0.5 + 0.5 * Math.sin(f * 1.9) * Math.sin(f * 0.83 + 1.7));
  const opacity = interpolate(f, [0, 2, 6, FLASH_END], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  }) * flicker;
  // v9: user note "the opening light's rays must rotate 90 degrees" — the star burst dynamically rotates 90° during the flash
  const rot = interpolate(f, [0, FLASH_END], [0, 90], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  // Needle beams: extremely thin wedges (narrow base, tip to zero) + exponential brightness falloff — matched to the reference
  // v9 (batch 18): user note "the opening light's rays must rotate 90 degrees" — whole set rotated 90°: long axis -38°→52° (steep, near-vertical), short axis 52°→142°
  const needle = (deg: number, len: number, w0: number, op: number) => (
    <g key={`${deg}-${len}`} transform={`rotate(${deg})`} opacity={op}>
      <path d={`M 0 ${-w0 / 2} L ${len} 0 L 0 ${w0 / 2} Z`} fill={`url(#${SPIKE_ID})`} />
      <path d={`M 0 ${-w0 / 2} L ${len} 0 L 0 ${w0 / 2} Z`} fill={`url(#${SPIKE_ID})`} transform="scale(-1,1)" />
    </g>
  );
  return (
    <div style={{
      position: 'absolute', left: 960, top: 540, width: 0, height: 0,
      transform: `scale(${s})`, opacity, pointerEvents: 'none',
    }}>
      {/* v9.6 center rework (matching user reference ②): not a white orb —
          a tiny blown-out hot spot + blue glow + a ring of radiating small rays (short spikes) */}
      <div style={{
        position: 'absolute', left: -13, top: -13, width: 26, height: 26, borderRadius: 13,
        background: 'radial-gradient(circle, #ffffff 0%, rgba(225,245,255,0.95) 45%, rgba(140,215,255,0) 80%)',
        filter: 'blur(0.6px)',
      }} />
      <div style={{
        position: 'absolute', left: -70, top: -70, width: 140, height: 140, borderRadius: 70,
        background: 'radial-gradient(circle, rgba(90,175,255,0.75) 0%, rgba(50,130,245,0.35) 45%, rgba(40,110,235,0) 75%)',
        filter: 'blur(4px)',
      }} />
      {/* radiating small rays: a ring of short spikes around the core (the starburst detail at the reference center) */}
      <svg width={260} height={260} viewBox="-130 -130 260 260" style={{
        position: 'absolute', left: -130, top: -130, transform: `rotate(${-rot * 0.6}deg)`,
      }}>
        {[15, 52, 88, 123, 160, 197, 231, 268, 305, 341].map((deg, i) => {
          const ln = 46 + ((i * 37) % 3) * 16;
          return (
            <g key={deg} transform={`rotate(${deg})`} opacity={0.75}>
              <path d={`M 8 -1.1 L ${ln} 0 L 8 1.1 Z`} fill="rgba(150,210,255,0.85)" filter="blur(0.8px)" />
            </g>
          );
        })}
      </svg>
      {/* X-shaped diagonal needle star burst — IMG_2505 reproduction notes: beams bright and saturated throughout
          (cyan-blue all the way, dying only at the very tips), each beam wrapped in a same-color glow */}
      <svg width={3200} height={3200} viewBox="-1600 -1600 3200 3200" style={{
        position: 'absolute', left: -1600, top: -1600, transform: `rotate(${rot}deg)`,
      }}>
        <defs>
          {/* v9.6: purer blue (the reference beam is saturated blue; white only flashes at the base) */}
          <linearGradient id={SPIKE_ID} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#eaf6ff" stopOpacity="1" />
            <stop offset="0.05" stopColor="#8cc8ff" stopOpacity="0.95" />
            <stop offset="0.3" stopColor="#3f9bff" stopOpacity="0.88" />
            <stop offset="0.62" stopColor="#2277f2" stopOpacity="0.6" />
            <stop offset="0.88" stopColor="#1b64e0" stopOpacity="0.25" />
            <stop offset="1" stopColor="#1a5fd8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* long diagonal axis: glow envelope (wide, blurred, same-color) + bright main beam + blown-out thin core */}
        <g filter="blur(7px)" opacity={0.75}>
          {needle(-38, 826, 26, 1)}
        </g>
        <g filter="blur(1.8px)">
          {needle(-38, 840, 8, 1)}
        </g>
        {needle(-38, 819, 3, 1)}
        {/* short diagonal axis: same three layers */}
        <g filter="blur(5px)" opacity={0.75}>
          {needle(52, 413, 20, 1)}
        </g>
        <g filter="blur(1.5px)">
          {needle(52, 420, 6.5, 1)}
        </g>
        {needle(52, 410, 2.6, 1)}
      </svg>
    </div>
  );
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  // Hard freeze: takes off at f=TAKEOFF after the flash; time freezes on arrival (f=LAND) — everything computed from tEff
  const tEff = Math.min(1, Math.max(0, (f - TAKEOFF) / FLIGHT));
  const airborne = f >= TAKEOFF;

  // —— spin (v7): user note "as the card nears the camera, its spin speed decays with the shrinking distance"
  // first 40% of the travel near-constant and very fast, then angular speed keeps decaying with tEff (easeOut power 2.4),
  // spinP(1)=1 guarantees whole turns — still exactly face-on to the camera at the freeze
  const spinP = tEff < 0.4
    ? tEff * 1.55
    : 0.62 + 0.38 * (1 - Math.pow(1 - (tEff - 0.4) / 0.6, 2.4));
  const theta = TURNS * 360 * Math.min(1, spinP);

  // —— trajectory: from deep 3D distance at frame center (tiny) → arcing toward camera → near-full-frame freeze at center ——
  // v6 launch curve (user note "starts slow when fired, then decelerates while arcing"):
  // slow-in (first 14% slowly pushes out 6% of the travel under power) → slope jump = the launch kick →
  // arc segment easeOut(cubic) decelerates all the way to center
  const tp = tEff < 0.14
    ? 0.06 * (tEff / 0.14) * (tEff / 0.14)
    : 0.06 + 0.94 * (1 - Math.pow(1 - (tEff - 0.14) / 0.86, 3));
  const arc = Math.sin(tp * Math.PI);
  const cx = 960 + arc * 360;
  const cy = 540 - arc * 250;
  // Depth: true perspective scale=F/(F+z)×FINAL_SCALE, z pushed from extremely far down to 0 —
  // final card height ≈94% of frame height (nearly touching the top and bottom edges)
  const FOCAL = 900;
  const z = interpolate(tp, [0, 1], [14000, 0]);
  const scale = FINAL_SCALE * (FOCAL / (FOCAL + z)); // 0.11 → 1.88, no overshoot

  // Back-face determination
  const facingBack = Math.cos((theta * Math.PI) / 180) < 0;

  // —— post-freeze sheen sweep: a diagonal highlight band sweeps left→right across the card (one-shot) ——
  const sheenP = interpolate(f, [SHEEN_START, SHEEN_START + SHEEN_DUR], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const sheenVisible = f >= SHEEN_START && f <= SHEEN_START + SHEEN_DUR;
  // The whole card brightens slightly as the sheen passes (single sine arch), so the "overall gloss" reads to the eye
  const sheenLift = sheenVisible ? 0.07 * Math.sin(sheenP * Math.PI) : 0;

  return (
    <div style={{ width: 1920, height: 1080, background: '#000000', position: 'relative', overflow: 'hidden' }}>
      {/* —— card: after the flash it flies out from center through pure black space —— */}
      <div style={{
        position: 'absolute', left: cx - CARD_W / 2, top: cy - CARD_H / 2,
        width: CARD_W, height: CARD_H,
        transform: `scale(${scale})`,
        transformOrigin: '50% 50%',
        opacity: airborne ? 1 : 0,
      }}>
        <div style={{
          width: '100%', height: '100%',
          transform: `perspective(1300px) rotate3d(${AX}, ${AY}, 0, ${theta}deg)`,
          transformOrigin: '50% 50%',
          position: 'relative',
          borderRadius: 22,
          filter: sheenLift > 0 ? `brightness(${1 + sheenLift})` : undefined,
        }}>
          <CardFace />
          <div style={{ opacity: facingBack ? 1 : 0, position: 'absolute', inset: 0 }}>
            <CardBack />
          </div>
          {/* dynamic side light during rotation (pinned to the card face, not ambient); freezes with theta after the freeze */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 22, pointerEvents: 'none',
            background: `linear-gradient(${115 + Math.sin((theta * Math.PI) / 180) * 30}deg, rgba(255,255,255,0) 30%, rgba(255,255,255,${0.14 + 0.14 * Math.abs(Math.sin((theta * Math.PI) / 180))}) 50%, rgba(255,255,255,0) 70%)`,
            mixBlendMode: 'screen',
          }} />
          {/* one-shot post-freeze sheen sweep: diagonal highlight band left→right across the whole card */}
          {sheenVisible && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden',
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute', top: '-45%', bottom: '-45%',
                left: `${-70 + sheenP * 215}%`, width: '42%',
                background: 'linear-gradient(100deg, rgba(200,200,205,0) 0%, rgba(225,225,230,0.5) 34%, rgba(255,255,255,0.9) 50%, rgba(225,225,230,0.5) 66%, rgba(200,200,205,0) 100%)',
                transform: 'rotate(16deg)',
                mixBlendMode: 'overlay',
              }} />
              {/* overlay a screen layer to brighten, making the highlight band pop on gray areas */}
              <div style={{
                position: 'absolute', top: '-45%', bottom: '-45%',
                left: `${-70 + sheenP * 215}%`, width: '26%',
                background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 45%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.45) 55%, rgba(255,255,255,0) 100%)',
                transform: 'rotate(16deg)',
                mixBlendMode: 'screen',
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Flash layer kept outside CameraMotionBlur (sampling would shred the rotating needle beams into streak ghosts)
const FlashLayer: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <SpawnFlash f={f} />
    </div>
  );
};

export const MagicianCardFlourish: React.FC = () => (
  <>
    <CameraMotionBlur shutterAngle={150} samples={7}>
      <Scene />
    </CameraMotionBlur>
    <FlashLayer />
  </>
);
