// basic-3d-scene — Impress 3D Steps spatial stepping (converted from the motion-lab final to native Remotion)
// An impress.js-style presentation: cards are scattered around 3D space (different xyz + rotation + scale), and the camera flies to
// each Step in turn, matching its pose for viewing; the core recipe is camera = stepTransform.inverse(),
// with non-current steps semi-transparent + blurred for enter/exit.
// Design coordinates 480×270 (DesignStage scales up uniformly); parameter values are calibrated in this coordinate system.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const BASIC_3D_SCENE_DURATION = 180; // 6000ms @30fps

// Each step: position + pose + scale (the camera takes its inverse)
const POSES = [
  { x: 0,   y: 0,   z: 0,    rx: 0, ry: 0,   rz: 0,  s: 1,   hue: 215, tt: 'STEP 01',  sub: 'Position the idea' },
  { x: 520, y: -60, z: -180, rx: 0, ry: -40, rz: 0,  s: 1,   hue: 265, tt: 'STEP 02',  sub: 'Rotate the view' },
  { x: 160, y: 300, z: -520, rx: 0, ry: 0,   rz: 90, s: 1,   hue: 165, tt: 'STEP 03',  sub: 'Spin the frame' },
  { x: 220, y: 90,  z: -260, rx: 0, ry: 0,   rz: 0,  s: 3.1, hue: 25,  tt: 'OVERVIEW', sub: 'See everything' },
];

// Flight schedule: 0 stays at step0, then three flights
const FLY_AT = [0.22, 0.48, 0.76];
const FLY = 0.16;

export const Basic3DScene: React.FC = () => {
  const t = useT();

  // activeFloat = sum of completed flight progress → which step pair the camera is between
  let af = 0;
  const cam = { ...POSES[0] };
  for (let i = 0; i < FLY_AT.length; i++) {
    const f = seg(t, FLY_AT[i], FLY_AT[i] + FLY, E.inOutCubic);
    af += f;
    const p = POSES[i + 1];
    cam.x = lerp(f, cam.x, p.x); cam.y = lerp(f, cam.y, p.y); cam.z = lerp(f, cam.z, p.z);
    cam.rx = lerp(f, cam.rx, p.rx); cam.ry = lerp(f, cam.ry, p.ry); cam.rz = lerp(f, cam.rz, p.rz);
    cam.s = lerp(f, cam.s, p.s);
  }
  // overview segment progress (all cards light up during it)
  const over = seg(t, FLY_AT[2], FLY_AT[2] + FLY);

  return (
    <DesignStage bg="#0a0b10">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at 50% 40%,#141828 0%,#0a0b10 70%)',
          perspective: '1000px',
        }}
      >
        {/* world: camera = inverse scene transform — inverse translate first, then inverse rotate, then 1/scale */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            transform: `scale(${1 / cam.s})
              rotateZ(${-cam.rz}deg) rotateY(${-cam.ry}deg) rotateX(${-cam.rx}deg)
              translate3d(${-cam.x}px,${-cam.y}px,${-cam.z}px)`,
          }}
        >
          {POSES.map((p, i) => {
            const last = i === POSES.length - 1;
            // enter/exit: farther from the current viewpoint, darker and blurrier (all light up during overview)
            const d = Math.min(1, Math.abs(af - i));
            const focus = Math.max(1 - d, over);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: last ? -160 : -110,
                  top: last ? -100 : -70,
                  width: last ? 320 : 220,
                  height: last ? 200 : 140,
                  boxSizing: 'border-box',
                  borderRadius: 10,
                  padding: '18px 20px',
                  willChange: 'opacity,filter',
                  background: `linear-gradient(150deg,hsl(${p.hue},45%,16%),hsl(${p.hue},55%,9%))`,
                  border: `1px solid hsl(${p.hue},60%,34%)`,
                  boxShadow: `0 18px 50px rgba(0,0,0,.55), inset 0 1px 0 hsla(${p.hue},70%,70%,.25)`,
                  transform: `translate3d(${p.x}px,${p.y}px,${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s / (last ? 2.2 : 1)})`,
                  fontFamily: '-apple-system,system-ui,sans-serif',
                  color: '#eef1f8',
                  opacity: 0.28 + focus * 0.72,
                  filter: `blur(${(1 - focus) * 3.5}px)`,
                }}
              >
                <div style={{ fontSize: 11, letterSpacing: 3, color: `hsl(${p.hue},80%,68%)`, fontWeight: 700 }}>
                  {p.tt}
                </div>
                <div style={{ fontSize: last ? 26 : 21, fontWeight: 800, marginTop: 8 }}>{p.sub}</div>
                <div style={{ marginTop: 12, height: 5, width: '56%', borderRadius: 3, background: `hsl(${p.hue},70%,45%)` }} />
                <div style={{ marginTop: 7, height: 5, width: '34%', borderRadius: 3, background: `hsla(${p.hue},50%,60%,.4)` }} />
              </div>
            );
          })}
        </div>
      </div>
    </DesignStage>
  );
};
