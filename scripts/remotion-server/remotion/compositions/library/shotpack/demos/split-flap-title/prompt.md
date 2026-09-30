---
name: split-flap-title
summary: Airport split-flap display title — each character is a mechanical flip cell split into top/bottom halves, flipping through 2 scrambled characters with a click to land on the target, cascading left-to-right as a wave
use: Opening/chapter hero titles; countdown, release date, data-announcement copy; beats needing "mechanical announcement" gravitas
duration: ~4.7s (140f: ≥20f scrambled stillness to establish + cascading flips + ≥15f settled stillness)
energy: Medium (sustained mechanical motion, not an instantaneous impact)
tags: opening
---

## Intent
The third of the three text techniques: letterpress (paper-title-card) is ink pressing
onto paper — "whisper"; typewriter (document-typewriter-reveal) is a document being
written — "narration"; the flip is a station board's "announcement" — mechanical
gravitas. Choose the flip for countdown/departure vibes (version releases, deadlines),
data-announcement vibes (metric reveals), or to give a title retro mechanical texture.
It is naturally a monospace deep-background grid, which within the library's
paper-and-ink aesthetic reads as "a mechanical display screen placed on paper" — the
contrasting block itself is the sight to see, so dim and desaturate the background
product footage to yield to it.

## Core Motion
- Each character is a deep-background flip cell (top/bottom halves with overflow hidden
  + center hinge line); the character sequence is fixed at 2 scrambled → 1 scrambled →
  target (initial state scrambled, visible during the establishment segment)
- A single flip is 5f in two parts: first half, the old character's top leaf rotateX
  0→-90 drops (Easing.in gravity feel + brightness dims to 0.55); second half, the new
  character's bottom leaf 90→0 slams down (brightens back)
- Each cell flips 3 times; 4f stagger between characters, cascading left-to-right as a wave
- Settle click: the whole cell sinks 6px and bounces back (sink → overshoot -1.5px → zero)
- Beat: ≥20f of still full-row scramble at the start to establish, ≥15f stillness after
  everything settles at the end
- Scramble uses a seed sine hash (fractional part of sin(i·127.3)·43758), Math.random forbidden

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Single flip | 5f, p through Easing.in(quad); <0.5 the old character's top leaf drops 0→-90, ≥0.5 the new character's bottom leaf slams 90→0 | Easing.in is the gravity source — accelerating falls read as mechanical blades; uniform speed reads as a fake electronic flip |
| Flip count | 3 per cell (2 scrambled mid-states + 1 settle) | Fewer than 2 reads no "searching" process; more than 4 drags the rhythm and the scramble steals the show |
| Cascade | 4f stagger left→right; ~36f wavefront across 10 characters | 4f is the wave feel sweet spot — too dense and the whole row flips together with no wave, too sparse and tail characters wait too long |
| Settle click | after landing, local 15→22f: translateY 0→6→-1.5→0, Easing.out(quad) | 6px is the perceptible floor (4px imperceptible, case law); this is the visual body of the "click" — removing it leaves only sliding |
| Brightness | drop leaf 1→0.55, slam leaf 0.55→1 | The brightness difference is the leaf "turning over the hinge" depth cue — read more by the eye than rotateX itself |
| Flip cell | 118×156, perspective 420, radius 10, 4px #141412 center hinge line | The hinge line pins the rotation axis (breaks the illusion otherwise); perspective too large exaggerates leaf perspective distortion |
| Palette and font | cell bg #262624 / character #f4f4f2, Helvetica 800 100px; spaces 52px, cell gap 12 | Deep background + light characters is the split-flap ID; monospace cell layout, don't squeeze proportional fonts into cells |
| Beat | establish 0–21f still → cascade from 22f → ≥15f still after all settle | The establishment segment lets the viewer first recognize "this is a split-flap board"; flipping immediately reads as a fault flicker |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- Sound-critical: each cell's settle slap is half the effect, production must add it —
  cascade settling is naturally a string of rhythm points; start with
  `assets/audio/sfx/ui/switch-click-quick.mp3` or `sfx/mech/gear-lock-metallic.mp3`
  (closer to mechanical flipping), or `sfx/text/typewriter-hit-single.mp3`; layering
  discipline per sound-design.md (same element same sound, foley equal to action
  length, alternating dual samples on rapid repeats to avoid machine-gun feel)
- The 6px sink-bounce is the perceptible floor: if invisible to the eye, follow the
  perceptibility case law and increase amplitude — don't retune the curve instead of
  the amplitude
- ≤1 split-flap text per film: the mechanical announcement register is too attention-
  grabbing; repetition devalues it (P4 move-dedup spirit); when mixed with letterpress/
  typewriter in one film, reserve it for the heaviest title

## Reference Implementation
demos/typography/split-flap-title/
(SplitFlapFlip.tsx)
