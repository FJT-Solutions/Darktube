// neon-triple-marquee — clickup-30 61–64.5s
// Three rows of huge neon-outlined words BETTER/FASTER/STRONGER fill the screen,
// odd and even rows scrolling in opposite directions at constant speed endlessly (marquee allows linear motion),
// the three rows pulsing in brightness in turn (while one row is bright the others dim), and the whole group fades out at the end.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

// Single-row marquee: copies are absolutely positioned at fixed unitW intervals, and the translate takes the modulo → seamless wrap-around.
const MarqueeRow: React.FC<{
  word: string;
  color: string;
  dir: 1 | -1;
  speed: number; // px/frame
  frame: number;
  y: number;
  fontSize: number;
  brightness: number; // 0..1 pulse brightness
}> = ({ word, color, dir, speed, frame, y, fontSize, brightness }) => {
  // Estimate the width per character (as an upper bound) so slots >= actual text width and copies never overlap
  const est = word.length * fontSize * 0.92;
  const unitW = est + fontSize * 1.3; // inter-word gap (including the separator dot)
  const copies = Math.ceil(1920 / unitW) + 3;
  const offsetRaw = (frame * speed) % unitW;
  const offset = dir === 1 ? -unitW * 1.5 + offsetRaw : -unitW * 0.5 - offsetRaw;

  const strokeW = 5 + brightness * 3;

  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: 0,
        width: '100%',
        height: fontSize * 1.1,
        overflow: 'visible',
        transform: `translateX(${offset}px)`,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize,
        letterSpacing: 4,
        lineHeight: 1,
        color: 'transparent',
        WebkitTextStroke: `${strokeW}px ${color}`,
        opacity: 0.35 + brightness * 0.65,
        filter: `drop-shadow(0 0 ${8 + brightness * 22}px ${color}) drop-shadow(0 0 ${
          20 + brightness * 50
        }px ${color})`,
      }}
    >
      {Array.from({ length: copies }).map((_, i) => (
        <span
          key={i}
          style={{ position: 'absolute', left: i * unitW, top: 0, whiteSpace: 'nowrap' }}
        >
          {word}
          <span style={{ display: 'inline-block', transform: `translateX(${fontSize * 0.4}px)` }}>
            {'•'}
          </span>
        </span>
      ))}
    </div>
  );
};

export const NeonTripleMarquee: React.FC = () => {
  const f = useCurrentFrame();

  // The three rows pulse in turn: period 45 frames, each row takes 1/3 of the phase, with a soft cosine pulse
  const pulse = (idx: number) => {
    const period = 45;
    const phase = (((f - idx * (period / 3)) % period) + period) % period;
    const t = phase / period;
    if (t < 1 / 3) return 0.5 - 0.5 * Math.cos(t * 3 * Math.PI * 2);
    return 0;
  };

  // Fade in on entry + the whole group fades out at the end
  const groupOpacity = interpolate(f, [0, 10, 128, 148], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rows: { word: string; color: string; dir: 1 | -1; speed: number }[] = [
    { word: 'BETTER', color: '#4d9fff', dir: 1, speed: 14 },
    { word: 'FASTER', color: '#ff4dd2', dir: -1, speed: 17 },
    { word: 'STRONGER', color: '#ffb347', dir: 1, speed: 14 },
  ];

  return (
    <AbsoluteFill style={{ background: '#050308', overflow: 'hidden' }}>
      <div style={{ opacity: groupOpacity, position: 'absolute', inset: 0 }}>
        {rows.map((r, i) => (
          <MarqueeRow
            key={r.word}
            word={r.word}
            color={r.color}
            dir={r.dir}
            speed={r.speed}
            frame={f}
            y={40 + i * 350}
            fontSize={300}
            brightness={pulse(i)}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
