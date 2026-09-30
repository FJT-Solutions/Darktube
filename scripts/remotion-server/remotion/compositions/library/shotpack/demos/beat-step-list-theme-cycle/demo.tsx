// beat-step-list-theme-cycle (bear 22.3–24.6s)
// Dark-field adjective list steps on each beat: each beat the list shifts up a row + the selected pill jumps to the next row and changes color
// (green→purple→red), while the whole field background changes in sync (dark brown→dark purple→dark navy).
// Within a single beat the three channels — row, color, field — snap together, ~0.6s per beat.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

const FONT = 'Helvetica, Arial, sans-serif';
const ROW_H = 150;
const WORDS = ['modern', 'playful', 'expressive', 'seamless', 'intuitive'];

// Beat points: ~0.6s per beat = 18 frames
const BEAT_LEN = 18;
const FIRST_BEAT = 30; // 1s of still setup before the first beat
const N_BEATS = 3;

// Per-beat (pill color / field bg) — initial state + three beats
const THEMES = [
  { pill: '#d8d8d4', bg: '#241a12', ink: '#2a2018' }, // modern: grey-white pill / dark brown field
  { pill: '#4fae62', bg: '#1e2416', ink: '#173015' }, // playful: green
  { pill: '#8e6fd8', bg: '#221a33', ink: '#2a2144' }, // expressive: purple
  { pill: '#d64d55', bg: '#141c2e', ink: '#1a2440' }, // seamless: red / dark navy
];

// In-beat snap: completes within 5 frames, ease-out + slight overshoot
const snap = (t: number) => interpolate(t, [0, 1], [0, 1], {
  easing: (x) => 1 - Math.pow(1 - x, 3.2),
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});

export const BeatStepListThemeCycle: React.FC = () => {
  const frame = useCurrentFrame();

  // Current beat index and in-beat progress (the snap only occupies the first 6 frames of a beat)
  const raw = (frame - FIRST_BEAT) / BEAT_LEN;
  const beat = Math.min(N_BEATS, Math.max(0, Math.floor(raw) + 1)); // beats triggered so far
  const beatStartFrame = FIRST_BEAT + (beat - 1) * BEAT_LEN;
  const tInBeat = beat === 0 ? 1 : snap((frame - beatStartFrame) / 6);

  // Continuous step: whole beats + interpolation within the first 6 frames of a beat
  const step = beat === 0 ? 0 : (beat - 1) + tInBeat;

  // Three channels — 1) list shifts up a row
  const listY = -step * ROW_H;

  // 2) pill recolor (hard snap at beat head, with a bit of cross-fade)
  const themePrev = THEMES[Math.max(0, beat - 1)];
  const themeNow = THEMES[beat];
  const mixT = beat === 0 ? 1 : tInBeat;
  const mix = (a: string, b: string, t: number) => {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
  };
  const pillColor = mix(themePrev.pill, themeNow.pill, mixT);
  const bgColor = mix(themePrev.bg, themeNow.bg, mixT);

  // Pill squash-pop on each beat landing
  const pop = beat === 0 ? 1 : interpolate(tInBeat, [0, 0.6, 1], [1.12, 0.97, 1]);

  // Selected-row text invert: pill is fixed on the center row of the viewport, selected word = WORDS[beat]
  const selectedIdx = beat;

  return (
    <AbsoluteFill style={{ background: bgColor, fontFamily: FONT, justifyContent: 'center' }}>
      {/* fixed center pill (the list scrolls beneath it, so visually the "pill jumps to the next row") */}
      <div style={{
        position: 'absolute', left: '50%', top: 540 - ROW_H / 2 + 10,
        width: 900, height: ROW_H - 20, transform: `translateX(-50%) scale(${pop})`,
        background: pillColor, borderRadius: 999,
        boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
      }} />
      {/* word list */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 540 - ROW_H / 2,
        transform: `translateY(${listY}px)`,
      }}>
        {WORDS.map((w, i) => {
          const isSel = i === selectedIdx;
          return (
            <div key={w} style={{
              height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 92, fontWeight: 800, letterSpacing: -1.5,
                color: isSel ? (beat === 0 ? '#2a2018' : '#ffffff') : 'rgba(255,255,255,0.34)',
                position: 'relative', zIndex: 2,
              }}>{w}</span>
            </div>
          );
        })}
      </div>
      {/* viewport top/bottom feathering */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 300, background: `linear-gradient(${bgColor}, transparent)`, zIndex: 3 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: `linear-gradient(transparent, ${bgColor})`, zIndex: 3 }} />
    </AbsoluteFill>
  );
};
