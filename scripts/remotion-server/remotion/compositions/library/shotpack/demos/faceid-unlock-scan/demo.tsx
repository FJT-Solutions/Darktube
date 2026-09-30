// faceid-unlock-scan —— Lock-screen Face ID scan unlock: a scan beam sweeps over the face → ring progress fills → checkmark →
// lock screen fades out, home-screen icons stagger in (mobile / screen)
// Phone fades in → lock screen (large clock + date + centered face outline and scan ring) → the beam sweeps up and down inside the ring 3 times,
// the scan ring's arc fills in sync → on completion the checkmark pops out and the ring flashes → lock screen scales and fades out → home screen (small clock + icon
// grid) staggers into view → settles into breathing. The face is pure vector line art, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const FACEID_UNLOCK_SCAN_DURATION = 200; // 6.7s @ 30fps

// Timeline (200f)
const PHONE_IN = 4;
const LOCK_IN = 14;      // lock-screen elements reveal
const SCAN_START = 38;   // scan beam starts
const RING_IN = 44;      // scan ring reveals
const RING_FILL = 44;    // ring arc fills
const RING_END = 102;
const CHECK = 104;       // checkmark pops out
const UNLOCK = 128;      // lock screen fades out, home screen reveals
const HOLD = 164;

const RING_R = 78;

export const FaceIdUnlockScan: React.FC = () => {
  const f = useCurrentFrame();

  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 60;

  // Lock-screen elements reveal
  const lockIn = interpolate(f, [LOCK_IN, LOCK_IN + 16], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });

  // Beam: sweeps up and down inside the scan ring, 18f cycle, 3 passes (f38–92)
  const sweep = (f - SCAN_START) % 18;
  const beamY = interpolate(sweep, [0, 18], [216, 318], CL);
  const beamOn = f >= SCAN_START && f < SCAN_START + 54 ? 1 : 0;

  // Scan ring arc fills
  const fillProg = interpolate(f, [RING_FILL, RING_END], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const ringIn = interpolate(f, [RING_IN - 6, RING_IN + 8], [0, 1], CL);
  const C = 2 * Math.PI * RING_R;

  // Checkmark
  const checkSpring = spring({ frame: Math.max(0, f - CHECK), fps: 30, config: { damping: 11, stiffness: 190 } });
  const checkIn = interpolate(f, [CHECK, CHECK + 8], [0, 1], CL);

  // Unlock: lock screen scales and fades out, home-screen icons stagger in
  const unlock = interpolate(f, [UNLOCK, UNLOCK + 30], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const homeIn = (i: number) =>
    interpolate(f, [UNLOCK + i * 3, UNLOCK + i * 3 + 16], [0, 1], {
      easing: Easing.out(Easing.cubic), ...CL,
    });

  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  const APPS = 8;

  return (
    <AbsoluteFill style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: `translate(-50%, -50%) translateY(${phoneY}px) scale(${breathe})`, opacity: phoneIn,
        }}
      >
        <Phone width={350}>
          <div style={{ position: 'absolute', inset: 0, background: '#0e0e12', color: '#fff', overflow: 'hidden' }}>
            {/* Home-screen layer (reveals after unlock) */}
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - (1 - unlock) }}>
              <div style={{ marginTop: 76, textAlign: 'center', opacity: unlock }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>9:41</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, margin: '120px 30px 0', justifyContent: 'center' }}>
                {Array.from({ length: APPS }).map((_, i) => (
                  <div key={i} style={{ width: 54, height: 54, borderRadius: 15, background: i % 2 ? '#2a2a33' : '#33333d', opacity: homeIn(i) }} />
                ))}
              </div>
            </div>

            {/* Lock-screen layer */}
            <div
              style={{
                position: 'absolute', inset: 0, background: '#0e0e12',
                opacity: 1 - unlock, transform: `scale(${1 + unlock * 0.06})`, zIndex: 5,
              }}
            >
              {/* Large clock + date */}
              <div style={{ marginTop: 96, textAlign: 'center', opacity: lockIn, transform: `translateY(${(1 - lockIn) * 10}px)` }}>
                <div style={{ fontSize: 58, fontWeight: 200, letterSpacing: 2 }}>9:41</div>
                <div style={{ fontSize: 14, color: '#9a9aa6', marginTop: 2 }}>Tuesday, August 11</div>
              </div>

              {/* Scan area: face + scan ring + beam */}
              <div style={{ position: 'relative', width: 200, height: 200, margin: '26px auto 0', opacity: ringIn }}>
                {/* Scan ring (track + progress arc) */}
                <svg viewBox="0 0 200 200" width={200} height={200}>
                  <circle cx={100} cy={100} r={RING_R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={2.5} />
                  <circle
                    cx={100} cy={100} r={RING_R} fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth={2.5}
                    strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - fillProg)}
                    transform="rotate(-90 100 100)"
                  />
                </svg>

                {/* Face line art (pure vector) */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', width: 96, height: 118 }}>
                    {/* Head outline */}
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50% / 48%', border: '2px solid rgba(255,255,255,0.85)' }} />
                    {/* Left eye */}
                    <div style={{ position: 'absolute', left: 22, top: 46, width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.9)' }} />
                    {/* Right eye */}
                    <div style={{ position: 'absolute', right: 22, top: 46, width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.9)' }} />
                    {/* Mouth */}
                    <div style={{ position: 'absolute', left: 30, top: 84, width: 36, height: 16, borderRadius: '0 0 24px 24px', borderBottom: '2px solid rgba(255,255,255,0.85)' }} />
                  </div>
                </div>

                {/* Beam: horizontal line sweeping up and down */}
                {f >= SCAN_START && f < SCAN_START + 56 && (
                  <div
                    style={{
                      position: 'absolute', left: 12, right: 12, height: 2, top: beamY,
                      background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.9), rgba(255,255,255,0))',
                      opacity: beamOn,
                    }}
                  />
                )}

                {/* Completion checkmark */}
                {f >= CHECK && (
                  <div
                    style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: checkIn, transform: `scale(${checkSpring})`,
                    }}
                  >
                    <svg viewBox="0 0 40 40" width={56} height={56}>
                      <circle cx={20} cy={20} r={19} fill="#4ade80" />
                      <path d="M 12 21 l 6 6 l 11 -13" stroke="#0e0e12" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Lock-screen label */}
              <div style={{ textAlign: 'center', marginTop: 26, fontSize: 13, color: '#9a9aa6', opacity: lockIn * (1 - unlock) }}>
                {f >= CHECK ? 'Unlocked' : 'Face ID'}
              </div>
            </div>
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
