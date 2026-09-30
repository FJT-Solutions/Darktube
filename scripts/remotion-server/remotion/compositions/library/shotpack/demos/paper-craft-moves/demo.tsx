// masking-tape-slap — masking tape slaps down
// a Card drifts lightly into place, then hovers with a slight sway (±1.5° sine + 5px up/down float);
// two semi-transparent paper tapes slap onto the opposite corners from off-screen one after the other
// (scale 1.45→1 + rotate overshoot + a one-frame squash). After the first slap the sway halves,
// after the second slap the card stops swaying on that very frame, the shadow thins instantly, and the
// whole card sinks 2px — the instant of "pinned down" is the star.
// Frame determinism: everything derived from frame, no randomness. True stillness for 54f after f86.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card, TitleBlock } from '../../_fixtures/Fixtures';

const CARD_W = 560;
const CARD_H = 350;
const CX = (1920 - CARD_W) / 2;
const CY = (1080 - CARD_H) / 2 + 40;

const FLOAT_START = 12; // 12f empty hold at the start
const FLOAT_END = 38;
const SLAP1 = 58;
const SLAP2 = 82;
const APPROACH = 6; // frames for the tape to swoop from off-screen onto the card
const FREEZE = 2; // frames for the sway to settle to zero after the slap

// hover sway amplitude envelope: rises after landing → halves after the first tape slaps → freezes on the second slap (handled by the outer layer)
const amp = (f: number): number => {
  const rise = interpolate(f, [FLOAT_END, FLOAT_END + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const damp = interpolate(f, [SLAP1, SLAP1 + 4], [1, 0.45], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return rise * damp;
};

const rawRot = (f: number): number => amp(f) * 1.5 * Math.sin((f - FLOAT_END) * 0.16);
const rawBob = (f: number): number => amp(f) * 5 * Math.sin((f - FLOAT_END) * 0.11);

// from the second slap (SLAP2), the sway is pinned to 0 within 2f
const frozen = (f: number, raw: (x: number) => number): number =>
  f <= SLAP2
    ? raw(f)
    : interpolate(f, [SLAP2, SLAP2 + FREEZE], [raw(SLAP2), 0], {
        extrapolateRight: 'clamp',
      });

const Tape: React.FC<{
  frame: number;
  land: number;
  cx: number; // tape center point (world coordinates)
  cy: number;
  rot: number; // resting angle
  fromX: number; // off-screen approach offset
  fromY: number;
}> = ({ frame, land, cx, cy, rot, fromX, fromY }) => {
  if (frame < land - APPROACH) return null; // conditional unmount: truly absent before the slap

  const t = interpolate(frame, [land - APPROACH, land], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(t, [0, 1], [1.45, 1]);
  const dx = fromX * (1 - t);
  const dy = fromY * (1 - t);
  const opacity = interpolate(frame, [land - APPROACH, land - APPROACH + 2], [0, 0.85], {
    extrapolateRight: 'clamp',
  });
  // rotate overshoot: undershoots 16° on the way in → overshoots 7° at landing → returns to normal within 4f
  const r = interpolate(frame, [land - APPROACH, land, land + 4], [rot - 16, rot + 7, rot], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // one-frame squash: scaleY 0.72 at the landing frame, 0.9 the next, then recovers
  const sy = frame === land ? 0.72 : frame === land + 1 ? 0.9 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: cx - 160,
        top: cy - 34,
        width: 320,
        height: 68,
        transform: `translate(${dx}px, ${dy}px) rotate(${r}deg) scale(${scale}) scaleY(${sy})`,
        transformOrigin: '50% 50%',
        opacity,
        background:
          'linear-gradient(90deg, rgba(214,212,206,0.95) 0%, rgba(226,224,218,0.95) 30%, rgba(212,210,204,0.95) 60%, rgba(222,220,214,0.95) 100%)',
        // torn edge: jagged ends
        clipPath:
          'polygon(0% 8%, 2.5% 0%, 97% 3%, 100% 12%, 98.2% 30%, 100% 52%, 98% 74%, 100% 90%, 96.5% 100%, 3% 97%, 0% 88%, 1.8% 64%, 0% 42%, 2% 22%)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }}
    />
  );
};

export const MaskingTapeSlap: React.FC = () => {
  const frame = useCurrentFrame();

  // card drifts in: eases down from -120px above
  const floatY = interpolate(frame, [FLOAT_START, FLOAT_END], [-120, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const floatOp = interpolate(frame, [FLOAT_START, FLOAT_START + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rot = frozen(frame, rawRot);
  const bob = frozen(frame, rawBob);

  // pinned down: 2px sink + shadow thins instantly
  const sink = interpolate(frame, [SLAP2, SLAP2 + FREEZE], [0, 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shOff = interpolate(frame, [SLAP2, SLAP2 + FREEZE], [16, 3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shBlur = interpolate(frame, [SLAP2, SLAP2 + FREEZE], [34, 8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shAlpha = interpolate(frame, [SLAP2, SLAP2 + FREEZE], [0.22, 0.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 110, width: '100%', textAlign: 'center' }}>
        <TitleBlock text="MASKING TAPE SLAP" size={72} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: CX,
          top: CY,
          transform: `translateY(${floatY + bob + sink}px) rotate(${rot}deg)`,
          transformOrigin: '50% 50%',
          opacity: floatOp,
        }}
      >
        <Card
          w={CARD_W}
          h={CARD_H}
          seed={3}
          style={{ boxShadow: `0 ${shOff}px ${shBlur}px rgba(0,0,0,${shAlpha})` }}
        />
      </div>

      {/* two tapes pinned to the card's opposite corners (world coordinates, the card sways slightly beneath them) */}
      <Tape frame={frame} land={SLAP1} cx={CX + 55} cy={CY + 40} rot={-45} fromX={-170} fromY={-130} />
      <Tape frame={frame} land={SLAP2} cx={CX + CARD_W - 55} cy={CY + CARD_H - 40} rot={-45} fromX={170} fromY={130} />
    </div>
  );
};
