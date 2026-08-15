---
name: outline-word-fill
summary: An outlined word (1px gray stroke, 500 weight) slams in from 3.2x scale with rapid deceleration; a dashed large circle then shrinks from 2.8x around the word and slowly self-rotates; horizontal dashed lines extend inward from the frame edges; the stroke brightens slightly first, then the solid white ignites within 0.6 frames, a one-frame flash and freezes
use: Heavy-hammer beats for single-word value props/slogans; "nail" shots on beat points; emphasis frames in deep-background brand films
duration: ~2.5s (75f@30fps, a short single beat)
energy: High (3.2x contraction + instant ignition, short high impact)
---

## Intent
Nailing a word down isn't about a slow fade-in but **two settlements**: first the giant
outlined character contracts rapidly into place (the size settlement), then the stroke
goes solid white within one frame (the material settlement). The ~1.5s of dashed-circle
shrink and horizontal-dash extension in between is the "aiming" process — technical
drawing vocabulary that makes the ignition read as "confirm." The fill **must be
instantaneous**: a slow-scan fill turns the nail into a slow prettifying animation.

## Core Motion
- Outlined character rapid decelerated shrink: `zoom = seg(t, 0.05, 0.19, E.outCubic)`
  (~4f→14f, only 10f), `scale(lerp(zoom, 3.2, 1))`; in parallel `born = seg(t, 0.05, 0.14)`
  fades in — **the shrink window is only 10f**, fast enough to be nearly an impact
- Double-layer text: `outline` (`color:transparent` + `-webkit-text-stroke:1px #565b63`)
  stacked with `solid` (pure white, initial opacity 0), 48px / **500 weight**
  (medium weight, not a title's 800 — outlined text too heavy blurs into a block)
- Dashed large circle (SVG r=88, `dasharray:6 8`): appears via `cin = seg(0.16, 0.3)`,
  shrinks `shrink = seg(0.16, 0.76, E.outCubic)` from 2.8x to 1 —
  **the 45f shrink window spans most of the film**, the slowest curve in the piece;
  simultaneously `rotate(t·18)` spins slowly throughout
- Left/right horizontal dashed lines (`dasharray:5 7`): `ext = seg(0.5, 0.72, E.outCubic)`,
  x2 advances from ±240 inward by 144 (frame edge → circle edge), opacity synced to ext;
  then **instant fill** `pop = seg(t, 0.742, 0.762)` — window only 0.02 (~0.6 frames),
  solid and outline opacities hard-cross, visually a hard cut
- One-frame fleeting glow: `flash = pop · (1 - seg(0.762, 0.86, E.outQuad))`,
  `0 0 flash·16px rgba(255,255,255,.45)`, decaying within ~7f then freezing pure white
- Stroke preheat: `bright = seg(0.66, 0.73, E.outQuad)`, gray 86→145 — brightens one
  notch before ignition, giving that 0.6-frame hard cut a "charging" prelude;
  14 static dust specks underneath (motionless, random positions + 0.06–0.2 opacity)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Shrink | `scale 3.2 → 1`, window 10f, outCubic | 3.2x is the "retreat from in front of the face" amount; <2x reads as an ordinary zoom; window >20f becomes a slow zoom and all impact is lost |
| Font weight/size | 48px / **500** / `letter-spacing:.5px`, ~30% of frame width | 700+ on outlined text makes the 1px stroke enclose a big void, reading as balloon letters; 500 is the outlined-text sweet spot |
| Stroke | `1px #565b63`, preheated to gray 145 before ignition | The 1px thin stroke is "blueprint" vocabulary; 2px+ becomes graffiti; deleting the preheat notch makes the hard cut feel unmotivated |
| Dashed circle | r=88, `dash 6 8`, scale 2.8→1 (45f), self-rotation `t·18`° | The 45f slow shrink is the film's "breath," contrasting the 10f text shrink; compressing the window to 20f collides the two |
| Horizontal dashes | `dash 5 7`, from ±240 inward 144, window 0.5→0.72 | Inward endpoint must stop at the circle edge (not inside); extending full width reads as a crosshair, overdone |
| Instant fill | `seg(0.742, 0.762)` (≈0.6f) | **This is the card's whole point**: any slow-scan form (>3f) demotes the nail to a prettifying animation |
| Glow | peak 16px, `rgba(255,255,255,.45)`, decays in 7f | Fleeting reads as "ignition"; sustained glow reads as glowing-font styling and instantly cheapens it |
| Dust | 14 specks, static | Static is correct (this card is only 2.5s; moving dust steals attention); >25 specks and the noise floor gets dirty |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- **Only suitable for a single short word (demo `Faster`, 6 letters)**: font size and
  dashed-circle radius are a hard-coded coordinate pair — longer text pokes through the
  circle and the horizontal-dash endpoint lands on the text; switching to two words or
  four Chinese characters requires adjusting `font-size` / `r` / inward distance together
- `-webkit-text-stroke` is a prefixed property, effective only in Chromium/WebKit;
  under Firefox the outline layer is fully transparent (the word doesn't exist until
  0.742). Remotion renders via Chromium, so no issue
- The instant-fill window `0.02` is under one frame at 75f: this is **intentional**
  (the hard cut is the point), but if the card is stretched to 150f+, that 0.02 becomes
  a visible 3-frame gradient — stretching duration requires scaling the window back
  proportionally
- The second timestamps in window comments (4.83→5.15s etc.) are residue from the
  original film's timeline, unrelated to this card's 0–2.5s t — don't be misled when
  reading the code
- Deep-background only: `#050505` background + white stroke + glow is the entire effect;
  on light backgrounds the outlined text is nearly invisible, requiring a full rework
- Sound-critical: the ignition frame must have one short heavy hit (metal/switch/
  low-frequency impact) — half of this card's "nail" feel; layering discipline per
  sound-design.md; division of labor with word-relay-geometry: that card is a three-word
  relay (this card is its first segment spun off + upgraded), don't place both in one film

## Reference Implementation
demos/typography/outline-word-fill/
(OutlineWordFill.tsx)
