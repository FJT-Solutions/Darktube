// terminal-3d — Terminal 3D command execution narrative flow (converted from the motion-lab final to native Remotion)
// Several generic desktop-style terminal windows are scattered at different positions and angles in 3D space, and the camera flies
// between them (pulling back slightly along the way); at each window a typewriter types out a command and spits out results line by
// line, forming a command execution narrative. Design coordinates 480×270 (DesignStage scales up uniformly); parameter values are calibrated in this coordinate system.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const TERMINAL_3D_DURATION = 180; // 6000ms @30fps

// Rasterization compensation factor: inside the 3D subtree Chrome samples text at layout size, so after DesignStage's 4x
// upscale small monospace glyphs get blurry. Model the whole 3D scene at ×K and cancel it with an outer scale(1/K) —
// perspective projection is self-similar under uniform scaling (p·x/(p-z) scales proportionally), so the picture geometry matches
// effect.js pixel for pixel, and only the text rasterization resolution rises to match the original (captured at 4x device scale).
const K = 4;

// Keyframe accumulator: starts at base and advances toward to within each segment [at0,at1] (helper shared at the effect source-file level)
type Vec = Record<string, number>;
const acc = (t: number, base: Vec, kfs: { at: number[]; to: Vec }[], keys: string[], ease: (x: number) => number) => {
  const out: Vec = {};
  for (const k of keys) out[k] = base[k];
  let prev = base;
  for (const kf of kfs) {
    const u = seg(t, kf.at[0], kf.at[1], ease);
    for (const k of keys) out[k] += u * (kf.to[k] - prev[k]);
    prev = kf.to;
  }
  return out;
};

// Three terminal windows: 3D pose + title + command + output lines (values are 480×270 design coordinates)
const DATA = [
  {
    pose: { x: -300, y: -34, z: -110, ry: 24 },
    title: '~/workspace — zsh',
    cmd: '$ git status -sb',
    out: ['## main...origin/main', ' M src/timeline.ts', ' M src/camera.ts', '?? fx/b01.js'],
  },
  {
    pose: { x: 96, y: 62, z: 90, ry: -16 },
    title: 'dev server',
    cmd: '$ npm run dev',
    out: ['vite v5.2.0  ready in 312 ms', '➜  local:   http://localhost:3000', '➜  network: 192.0.2.10:3000', 'watching 148 modules'],
  },
  {
    pose: { x: 402, y: -74, z: -60, ry: -32 },
    title: 'logs',
    cmd: '$ tail -f server.log',
    out: ['12:04:11 GET /api/render 200 41ms', '12:04:12 POST /api/queue 201 88ms', '12:04:14 worker#3 frame 240/270', '12:04:15 done → out/final.mp4'],
  },
];

// Step timing: each window's [fly start, fly end]; TYPE is each window's typing start
const STEP = [[0, 0.02], [0.30, 0.44], [0.64, 0.78]];
const TYPE = [0.05, 0.47, 0.81];
const PK = ['x', 'y', 'z', 'ry'];

export const Terminal3D: React.FC = () => {
  const t = useT();

  // Camera pose = keyframe accumulation (two flights, inOutCubic)
  const v = acc(t, DATA[0].pose, [
    { at: STEP[1], to: DATA[1].pose },
    { at: STEP[2], to: DATA[2].pose },
  ], PK, E.inOutCubic);
  // Pull back during flights: one sine hump per transition
  let pull = 0;
  for (let i = 1; i < 3; i++) {
    const u = seg(t, STEP[i][0], STEP[i][1]);
    pull += Math.sin(u * Math.PI) * 210;
  }

  return (
    <DesignStage bg="#07080e">
      {/* Inverse-scale wrapper: shrinks the ×K-modeled scene back to design coordinates (see the K comment) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 480 * K,
          height: 270 * K,
          transform: `scale(${1 / K})`,
          transformOrigin: 'top left',
        }}
      >
        {/* scene: perspective container + deep-space gradient background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(120% 90% at 50% 0%,#141826,#07080e 70%)',
            perspective: `${900 * K}px`,
            overflow: 'hidden',
            WebkitFontSmoothing: 'antialiased', // original captures are grayscale-smooth, avoid strokes rendering too thick
          }}
        >
          {/* world: the camera inverse-transform carrier — pull back/push in first, then invert rotation, then invert translation */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transformStyle: 'preserve-3d',
              transform: `translateZ(${(300 - pull) * K}px) rotateY(${-v.ry}deg) translate3d(${-v.x * K}px,${-v.y * K}px,${-v.z * K}px)`,
            }}
          >
            {DATA.map((d, i) => {
              const p = d.pose;
              // Defocus: farther from the current camera x, darker and blurrier
              const focus = 1 - Math.min(1, Math.abs(v.x - p.x) / 420);
              // Typewriter: command lights up character by character, cursor blinks, output lines slide in one by one
              const ty = seg(t, TYPE[i], TYPE[i] + 0.09);
              const n = Math.floor(ty * d.cmd.length + 0.0001);
              const caretOp = ty >= 1
                ? (Math.floor(t * 26) % 2 ? 0.15 : 0.9)
                : (Math.floor(t * 40) % 2 ? 0.35 : 1);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 300 * K,
                    height: 176 * K,
                    margin: `${-88 * K}px 0 0 ${-150 * K}px`,
                    borderRadius: 9 * K,
                    background: '#0e1017',
                    overflow: 'hidden',
                    boxShadow: `0 ${24 * K}px ${60 * K}px rgba(0,0,0,.7),inset 0 0 0 ${K}px #2a3040`,
                    transform: `translate3d(${p.x * K}px,${p.y * K}px,${p.z * K}px) rotateY(${p.ry}deg)`,
                    opacity: 0.34 + focus * 0.66,
                    filter: `blur(${(1 - focus) * 2.2 * K}px) brightness(${0.7 + focus * 0.3})`,
                  }}
                >
                  {/* Title bar: red/yellow/green dots + centered title */}
                  <div
                    style={{
                      position: 'absolute', left: 0, top: 0, width: '100%', height: 22 * K,
                      background: 'linear-gradient(180deg,#242a38,#1b202b)', borderBottom: `${K}px solid #2c3242`,
                    }}
                  >
                    {['#ff6058', '#ffbd2e', '#28ca42'].map((c, k) => (
                      <div
                        key={c}
                        style={{
                          position: 'absolute', left: (9 + k * 13) * K, top: 8 * K, width: 7 * K, height: 7 * K,
                          borderRadius: '50%', background: c,
                        }}
                      />
                    ))}
                    <div
                      style={{
                        position: 'absolute', left: 0, top: 0, width: '100%', height: 22 * K, textAlign: 'center',
                        font: `600 ${8 * K}px/${22 * K}px Courier,monospace`, color: '#77809b',
                      }}
                    >
                      {d.title}
                    </div>
                  </div>
                  {/* Command line: per-character opacity + trailing cursor */}
                  <div
                    style={{
                      position: 'absolute', left: 12 * K, top: 32 * K,
                      font: `600 ${9.5 * K}px/1 Courier,monospace`, color: '#9dffcf', whiteSpace: 'pre',
                    }}
                  >
                    {Array.from(d.cmd, (ch, c) => (
                      // Spaces become nbsp to match effect.js's textContent handling
                      <span key={c} style={{ opacity: c < n ? 1 : 0 }}>{ch === ' ' ? ' ' : ch}</span>
                    ))}
                    <span
                      style={{
                        color: '#9dffcf',
                        opacity: caretOp,
                        display: 'inline-block',
                        transform: `translateX(${(d.cmd.length - n) * -0.1 * K}px)`,
                      }}
                    >
                      ▌
                    </span>
                  </div>
                  {/* Output lines: after the command finishes, lines stagger-fade in + slide left into place */}
                  {d.out.map((o, k) => {
                    const ou = seg(t, TYPE[i] + 0.10 + k * 0.022, TYPE[i] + 0.145 + k * 0.022, E.outCubic);
                    return (
                      <div
                        key={k}
                        style={{
                          position: 'absolute', left: 12 * K, top: (52 + k * 16) * K,
                          font: `500 ${9 * K}px/1 Courier,monospace`,
                          color: k === 0 ? '#c9d3ea' : '#7f8aa6',
                          whiteSpace: 'pre',
                          opacity: ou,
                          transform: `translateX(${lerp(ou, -7, 0) * K}px)`,
                        }}
                      >
                        {o}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DesignStage>
  );
};
