---
name: vertical-word-roll-blur-cycle
summary: The trailing word of a sentence becomes a vertical wheel, 3 word swaps at 0.55s each (outQuint seven-tenths + outBack three-tenths, fast-then-very-slow with a micro overshoot), adjacent rows get vertical blur and gray scaling by distance, and the center word tints from gray to the accent color the instant it settles
use: Sentence-stem value props like "Built for ___" plus audience/object enumerations; a clean beat in light-background brand films
duration: ~5.0s (150f@30fps: stillness → 3 word swaps → whole group fades out at tail)
energy: Medium (steady three beats, no peaks)
---

## Intent
The best way to swap a sentence's trailing word is a wheel rather than a fade:
a wheel inherently has **direction** (flipping up the page), so the viewer knows
"there's another one coming." This card's two identity markers are the adjacent rows'
**vertical blur** (wheel depth of field, simulating a mechanical drum's defocus) and the
**tint on landing** (gray→accent, "this is the answer"). The stem `Built for` stays
rock-still throughout — the eye is pinned on the wheel, and if the stem shifts, the
enumeration feel dissolves.

## Core Motion
- Position value `p` accumulates over 3 segment windows: `STEPS = [0.16, 0.36, 0.56]`,
  each window 0.11 (≈16f, ~0.55s), with 0.09 stillness between segments for the viewer
  to read
- Each segment's easing is a **mixed curve**: `0.7·E.outQuint(u) + 0.3·E.outBack(u)` —
  outQuint gives the "fast-then-very-slow" mechanical deceleration, the outBack three-
  tenths gives the landing's micro-overshoot settle-back
- reel positioned `translateY(ROW - p·ROW)`, ROW=44px, mask height `ROW·3`=132px
  (three rows visible) — the center row is always the mask's second row
- Distance-driven three channels, `d = |i - p|`:
  - blur: `d<1` → `3d`; `d≥1` → `3 + 2·min(d-1,1)` (max 5px)
  - opacity: `d<1` → `1 - 0.65d`; otherwise `max(0.1, 0.35 - 0.23(d-1))`
  - color: `mixHex(ACCENT_DIM, ACCENT, clamp01(1 - 2.4d))` — **past d>0.42 it's
    entirely the dark tone**, so only the truly settled instant is accent; mid-scroll
    everything stays gray
- Ending `seg(t, 0.9, 0.985)` fades the whole group (stem + wheel) out, leaving no
  residue for the next shot

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Word list | 4 words (Apps→Teams→Data→Everyone), 3 swaps | The last word is the conclusion (the widest one), the first three are examples; >5 words the viewer starts counting, <3 words there's no "enumeration" to read |
| Beat points | `[0.16, 0.36, 0.56]`, window 0.11 (≈16f) | 0.09 (≈13f) stillness between segments is for reading — an unreadable beat is a swap that didn't happen; window >0.18 leaves old and new sharing the screen too long |
| Easing recipe | `0.7·outQuint + 0.3·outBack` | outQuint is the mechanical deceleration source; the outBack three-tenths gives the landing a "click"; pure outQuint reads as an electronic-screen slide |
| Row height/window | ROW 44px, mask `44×3`px, word width 190px | Three visible rows make it a drum (one row reads as a fade); the hard-coded 190px width keeps it from crowding the stem — longer words must widen it in sync |
| Adjacent-row blur | adjacent 3px, farthest 5px, **vertical axis only** | Blur is the "drum depth of field" ID — removing it degrades to word-tray sliding; >8px adjacent rows blur into gray bars you can't read as text |
| Landing tint | `1 - 2.4d` mapping ACCENT_DIM→ACCENT | Coefficient 2.4 confines the tint to the landing instant; <1.5 tints mid-scroll and the "answer" feel dissolves |
| Font size/weight | stem and wheel both 30px/800, `letter-spacing:-.5px` | Must be identical — a wheel word bigger than the stem reads as two elements, not one sentence |
| Tail fade | `seg(t, 0.9, 0.985)` whole group | After the last word lands, ~40f stillness then fade; not holding wastes the enumeration |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- **Mask width hard-coded at 190px**: when swapping the word list, the longest word
  (demo `Everyone`) must fit or it gets cropped; conversely all-short words leave a
  large blank on the right and the sentence's center of gravity shifts left — swapping
  the list requires re-measuring the width once
- Word-length variance shouldn't be too large: mask width is fixed (this card doesn't
  do adaptive width — that's pill-chip-slot-cycle-handled's job), and with variance >2x
  the short words look stranded in the frame
- The stem must be pinned: the demo uses `flex + gap:14px` because the constant mask
  width never pushes the stem — once you switch to an adaptive-width wheel, you must
  switch to absolute-positioning anchored at the left end, or the stem swings with word width
- `p` **accumulates** over three segment windows, so the windows must not overlap:
  overlap makes p cross an entire row within one frame — the wheel "skips a step"
- Division of labor with pill-chip-slot-cycle-handled: that card is a dark capsule +
  adaptive width pushing things apart (word as badge); this card is a bare-word wheel
  (word as sentence constituent) — keep only one per film
- Sound: each landing is a rhythm point, pair with a light mechanical/switch sound;
  rapid three-in-a-row needs alternating dual samples to avoid machine-gun feel,
  layering discipline per sound-design.md

## Reference Implementation
demos/typography/vertical-word-roll-blur-cycle/
(VerticalWordRollBlurCycle.tsx)
