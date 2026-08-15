---
name: word-relay-geometry
summary: Three benefit words each carry a dedicated geometry relay — dashed large circle self-rotating and shrinking → three solid circles growing in sequence via trim (phase offset 0.06) → a metal sheen sweeps and the last beat settles into pure white; old words shrink to 0.86 and fade out, new words reveal outline→fill
use: Three-point benefit statements (faster/better/stronger); brand-value segments; mid-section progression needing "one word one world"
duration: ~6.0s (180f@30fps: three segments at 0.36 time windows each, 0.04 overlap between segments)
energy: Medium-high (three beats advancing + continuous geometry motion + background particles, no still frames)
---

## Intent
A three-point benefit statement is easiest done as three title cards hard-cut together.
The relay approach gives each word a geometry **that belongs only to it**: the dashed
circle is "spinning" (fast), the three interlocking circles are "meshing" (good), the
metal sheen is "hard material" (strong) — the geometry itself argues for the adjective.
The third word gets promoted (sheen sweep + settle white) because it's the conclusion.
20 dust motes drifting upward in the background stitch the three beats into one
continuous space; otherwise it's still three cards.

## Core Motion
- Three segment windows with overlap: `[0, 0.36] / [0.32, 0.68] / [0.64, 1.0]` — each
  segment's entrance window 0.07 (≈13f, outCubic), exit window 0.05 (≈9f, inQuad,
  landing at segment end), the 0.04 overlap is a handoff rather than a hard cut; the
  last segment has no exit (closes at film end)
- Each word double-layer text (56px/800): `outline` layer `-webkit-text-stroke:1px #6a7186`
  + transparent fill, `fill` layer pure white — **stroke arrives first, fill reveals after**
- The first two words' fill wipes in horizontally:
  `fill.clipPath = inset(-20% (1-fillp)·100% -20% 0)`,
  `fillp = seg(t, t0+0.06, t0+0.18, E.inOutCubic)`, while outline opacity
  drops to 0.25 (`1 - fillp·0.75`, leaving a hint of stroke as ghosting)
- First word's dashed circle (r=100, `stroke-dasharray:5 7`): `scale(lerp(grow,0.4,1))`
  grows 0.4→1 while `rotate(-90 + t·30)` — **rotation driven by the whole film's t**,
  so it keeps spinning through its segment rather than stopping; second word's three
  solid circles (r=62, x-axis -110/0/110) use SVG trim: `pathLength=1` + `dasharray=1`
  + `dashoffset` 1→0, delayed `d = 0/0.06/0.12` growing in sequence, trim reversing
  back down at exit
- Stronger's sheen: `linear-gradient(100deg, …#fff 50%…)` + `background-size:280%`
  + `background-clip:text`, `backgroundPosition` sweeping 100%→0%
  (window t0+0.08→+0.26, inOutCubic), then `white = seg(t0+0.27, t0+0.34)`
  swaps the sheen for a pure-white fill plus an 18px white glow
- Exits uniformly `scale(lerp(tout, 1, 0.86))` shrink-and-fade (**shrinking, not
  enlarging**, reads as "leaving the stage" rather than "bursting out of frame");
  background 20 dust motes `y = (1 - ((t·sp + ph) % 1))·110 - 5` (%), speeds
  `sp = 0.5 + rand·0.8` each different

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Three segment windows | 0.36 each (≈65f), 0.04 overlap (≈7f) | ~2s per word is the "read the word + see the geometry" floor; overlap <0.02 reads as a hard cut, >0.08 the two words on screen fight |
| Entrance/exit windows | entrance 0.07 outCubic / exit 0.05 inQuad | Exit shorter than entrance is right (departure must be decisive); an out-curve exit reads as "reluctant to leave" |
| outline→fill | window 0.12 (≈22f) inOutCubic, outline keeps 0.25 | Keeping a hint of stroke as ghosting is the texture source; dropping to 0 flattens the character; window >0.25 the wipe is slow like a loading bar |
| Dashed circle | r=100, `dash 5 7`, scale 0.4→1, self-rotation `t·30`° | Rotation bound to the whole film's t never stops — that's the evidence of "fast"; scale start >0.7 loses the "growing out" |
| trim growth | `pathLength=1` + dashoffset 1→0, phase offset 0.06 | The phase offset is what makes "interlocking in sequence"; growing together reads as three independent circles; window 0.12 converging in sync with fill |
| Sheen sweep | `100deg` gradient, `background-size:280%`, position 100%→0% | 280% keeps the white band a short slice of the word width (=metal highlight); at 100% the whole word brightens together, not a sweep |
| Settle white | `seg(t0+0.27, t0+0.34)` ≈13f + 18px glow | This is the film's only "conclusion" treatment; without it the three words are peers and the third point has no landing |
| Font size/palette | 56px/800, stroke `#6a7186`, geometry `#565e78`, bg `#07080c`, 20 dust motes | Geometry one notch darker than the stroke is the hierarchy; geometry brighter than the text steals the lead; dust is the glue stitching the three beats into one space, >40 motes reads as snow |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- **The three words must be a syntactically parallel three-point set (demo: single
  comparative words, 6–8 letters)**: segment windows are evenly divided, and when word
  lengths differ widely the geometry (circle radii, spacing) is hard-coded coordinates —
  long words poke out of the dashed circle or press onto the interlocking circles;
  swapping the word list requires adjusting `CIRC_R` and the x offsets in sync
- `-webkit-text-stroke` is a prefixed property: only Chromium/WebKit support it; under
  Firefox the stroke layer is fully transparent (the word disappears). Remotion renders
  via Chromium, so no issue, but be aware in preview environments
- SVG trim's `pathLength=1` normalization has partial support for `<circle>` on some
  older browsers; the degraded behavior is the circle drawing all at once (losing the
  growth feel) — verify one frame on the target renderer when porting
- Exit trim is "entrance trim minus exit seg" directly subtracted: if the two windows
  sit too close (segment length <0.2), the shrink starts before growth finishes and
  the circle only draws a short arc
- The sheen layer and fill layer are two stacked DOM elements: the swap relies on
  opacity crossing; if the `white` window and `sh` window overlap insufficiently,
  1–2 frames of both semi-transparent (character grays)
- The third word's promotion happens exactly once: sheen on all three words leaves no
  conclusion feel (P4 move-dedup spirit); on sound, the three entrances are three
  rhythm points and the third word's settle-white deserves a dedicated heavy hit,
  layering discipline per sound-design.md

## Reference Implementation
demos/typography/word-relay-geometry/
(WordRelayGeometry.tsx)
